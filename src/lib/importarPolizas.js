import { parseExcelPolizas } from "./parseExcelPolizas";

// Postgres/PostgREST aceptan payloads grandes, pero conviene no mandar todo
// el Excel en un solo request — un archivo semanal grande podría timeoutear
// o superar el límite de tamaño de statement. Se manda en lotes chicos.
const TAMANO_LOTE = 500;

const enLotes = (arr, tam) => {
  const lotes = [];
  for (let i = 0; i < arr.length; i += tam) lotes.push(arr.slice(i, i + tam));
  return lotes;
};

// Resuelve organizador_id para cada codigo_org_origen presente en las filas
// parseadas. Si el código ya está registrado en organizador_codigos, reusa
// ese organizador. Si no existe, crea un organizador nuevo (con la razón
// social que trae el propio Excel) y su entrada en organizador_codigos.
//
// Nota: la resolución es por código Signos, no por razón social — es el
// discriminador confiable (ver comentario en la migración sobre organizadores
// que operan bajo más de un código).
// El código 0 significa "sin organizador asignado" (pólizas de venta directa
// de la compañía o similar — a confirmar con sistemas, ver spec) y nunca debe
// generar un organizador propio: esas filas quedan con organizador_id null.
async function resolverOrganizadores(supabase, profileId, filas) {
  const codigos = [...new Set(filas.map(f => f.codigo_org_origen).filter(c => c != null && c !== 0))];
  const mapa = new Map(); // codigo_signos -> organizador_id
  const creados = [];

  if (codigos.length) {
    const { data: existentes, error } = await supabase
      .from("organizador_codigos")
      .select("codigo_signos, organizador_id")
      .in("codigo_signos", codigos);
    if (error) throw new Error(`No se pudieron leer los códigos de organizador existentes: ${error.message}`);
    for (const row of existentes) mapa.set(row.codigo_signos, row.organizador_id);
  }

  const faltantes = codigos.filter(c => !mapa.has(c));

  for (const codigo of faltantes) {
    const fila = filas.find(f => f.codigo_org_origen === codigo);
    const razonSocial = fila?._razonSocialOrg?.trim() || `Organizador ${codigo}`;

    const { data: org, error: errOrg } = await supabase
      .from("organizadores")
      .insert([{ profile_id: profileId, razon_social: razonSocial }])
      .select()
      .single();
    if (errOrg) throw new Error(`No se pudo crear el organizador "${razonSocial}" (código ${codigo}): ${errOrg.message}`);

    const { error: errCod } = await supabase
      .from("organizador_codigos")
      .insert([{ organizador_id: org.id, codigo_signos: codigo, es_principal: true }]);
    if (errCod) throw new Error(`No se pudo registrar el código ${codigo} para "${razonSocial}": ${errCod.message}`);

    mapa.set(codigo, org.id);
    creados.push({ codigo, razonSocial, organizadorId: org.id });
  }

  return { mapa, creados };
}

// Antes de pisar una póliza existente con el upsert, guarda su valor actual
// en polizas_historial. Es la red de seguridad para reconstruir a mano si
// el Excel viene corrupto: no revierte nada automáticamente, pero el dato
// de "cómo estaba antes" queda guardado y no se pierde con el import.
// Filas realmente nuevas no tienen nada que snapshotear (deshacerlas es
// borrar la fila de `polizas`), pero igual quedan registradas como 'nueva'
// para saber qué trajo cada importación.
async function guardarHistorialPolizas(supabase, importacionId, profileId, filasListas) {
  const numeros = filasListas.map(f => f.numero_poliza);
  const existentesPorNumero = new Map();

  for (const lote of enLotes(numeros, TAMANO_LOTE)) {
    const { data, error } = await supabase
      .from("polizas")
      .select("*")
      .eq("profile_id", profileId)
      .in("numero_poliza", lote);
    if (error) throw new Error(`No se pudo leer el estado anterior de las pólizas (para el historial): ${error.message}`);
    for (const row of data) existentesPorNumero.set(row.numero_poliza, row);
  }

  const filasHistorial = filasListas.map(f => {
    const anterior = existentesPorNumero.get(f.numero_poliza);
    return anterior
      ? { importacion_id: importacionId, numero_poliza: f.numero_poliza, profile_id: profileId, tipo_cambio: "actualizada", snapshot: anterior }
      : { importacion_id: importacionId, numero_poliza: f.numero_poliza, profile_id: profileId, tipo_cambio: "nueva", snapshot: null };
  });

  for (const lote of enLotes(filasHistorial, TAMANO_LOTE)) {
    const { error } = await supabase.from("polizas_historial").insert(lote);
    if (error) throw new Error(`No se pudo guardar el historial de pólizas: ${error.message}`);
  }

  return {
    nuevas: filasHistorial.filter(f => f.tipo_cambio === "nueva").length,
    actualizadas: filasHistorial.filter(f => f.tipo_cambio === "actualizada").length,
  };
}

// Punto de entrada del importador: recibe un File (input type=file) y hace
// todo el flujo — parsear, resolver/crear organizadores, snapshotear el
// estado anterior, y upsert a polizas. onConflict numero_poliza+profile_id:
// reimportar el mismo período (o uno con overlap) actualiza las filas
// existentes en vez de romper por duplicado.
export async function importarPolizasDesdeExcel(file, { supabase, profileId }) {
  const buffer = await file.arrayBuffer();
  const filas = await parseExcelPolizas(buffer);

  if (!filas.length) {
    return { total: 0, insertadas: 0, organizadoresCreados: [] };
  }

  const { creados, mapa } = await resolverOrganizadores(supabase, profileId, filas);

  const filasListas = filas.map(({ _razonSocialOrg, _cuitOrg, ...fila }) => ({
    ...fila,
    profile_id: profileId,
    organizador_id: fila.codigo_org_origen != null ? (mapa.get(fila.codigo_org_origen) ?? null) : null,
  }));

  const { data: importacion, error: errImportacion } = await supabase
    .from("importaciones")
    .insert([{ profile_id: profileId, tipo: "polizas", archivo: file.name }])
    .select()
    .single();
  if (errImportacion) throw new Error(`No se pudo registrar la importación: ${errImportacion.message}`);

  const { nuevas, actualizadas } = await guardarHistorialPolizas(supabase, importacion.id, profileId, filasListas);

  let insertadas = 0;
  for (const lote of enLotes(filasListas, TAMANO_LOTE)) {
    const { error } = await supabase
      .from("polizas")
      .upsert(lote, { onConflict: "numero_poliza,profile_id" });
    if (error) throw new Error(`Error al guardar pólizas (lote de ${lote.length}): ${error.message}`);
    insertadas += lote.length;
  }

  // No fatal: el import ya se aplicó, esto es solo metadata de auditoría.
  const { error: errResumen } = await supabase
    .from("importaciones")
    .update({ resumen: { total: filas.length, insertadas, nuevas, actualizadas, organizadoresCreados: creados.length } })
    .eq("id", importacion.id);
  if (errResumen) console.warn("No se pudo actualizar el resumen de la importación:", errResumen.message);

  return { total: filas.length, insertadas, organizadoresCreados: creados, importacionId: importacion.id };
}
