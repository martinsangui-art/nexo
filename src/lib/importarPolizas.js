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
async function resolverOrganizadores(supabase, profileId, filas) {
  const codigos = [...new Set(filas.map(f => f.codigo_org_origen).filter(c => c != null))];
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

// Punto de entrada del importador: recibe un File (input type=file) y hace
// todo el flujo — parsear, resolver/crear organizadores, y upsert a polizas.
// onConflict numero_poliza+profile_id: reimportar el mismo período (o uno
// con overlap) actualiza las filas existentes en vez de romper por duplicado.
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

  let insertadas = 0;
  for (const lote of enLotes(filasListas, TAMANO_LOTE)) {
    const { error } = await supabase
      .from("polizas")
      .upsert(lote, { onConflict: "numero_poliza,profile_id" });
    if (error) throw new Error(`Error al guardar pólizas (lote de ${lote.length}): ${error.message}`);
    insertadas += lote.length;
  }

  return { total: filas.length, insertadas, organizadoresCreados: creados };
}
