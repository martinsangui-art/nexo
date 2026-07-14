import { parseSignosArchivos } from "./parseSignosZip";

// Resuelve organizador_id para un código Signos: primero busca en
// organizador_codigos (fuente de verdad, resuelve casos como BAROFFIO con dos
// códigos); si no está, busca por razón social (case-insensitive) por si el
// organizador ya existe pero todavía no tiene código Signos registrado; si
// tampoco, crea el organizador y su código. Solo se llama para reportes tipo
// "organizador" — un reporte "productor" nunca crea un organizador nuevo,
// porque no trae la razón social del organizador dueño, solo su código de
// referencia (ver comentario en parseSignosZip.js).
async function resolverOrganizador(supabase, profileId, codigo, nombre, mapaCodigoOrg, organizadoresPorNombre) {
  if (mapaCodigoOrg.has(codigo)) return { organizadorId: mapaCodigoOrg.get(codigo), creado: false };

  const nombreNorm = nombre.trim().toLowerCase();
  if (organizadoresPorNombre.has(nombreNorm)) {
    const organizadorId = organizadoresPorNombre.get(nombreNorm);
    const { error } = await supabase
      .from("organizador_codigos")
      .insert([{ organizador_id: organizadorId, codigo_signos: codigo, es_principal: false,
        nota: "Código Signos vinculado automáticamente por coincidencia de razón social." }]);
    if (error) throw new Error(`No se pudo vincular el código ${codigo} a "${nombre}": ${error.message}`);
    mapaCodigoOrg.set(codigo, organizadorId);
    return { organizadorId, creado: false };
  }

  const { data: org, error: errOrg } = await supabase
    .from("organizadores")
    .insert([{ profile_id: profileId, razon_social: nombre }])
    .select()
    .single();
  if (errOrg) throw new Error(`No se pudo crear el organizador "${nombre}" (código ${codigo}): ${errOrg.message}`);

  const { error: errCod } = await supabase
    .from("organizador_codigos")
    .insert([{ organizador_id: org.id, codigo_signos: codigo, es_principal: true }]);
  if (errCod) throw new Error(`No se pudo registrar el código ${codigo} para "${nombre}": ${errCod.message}`);

  mapaCodigoOrg.set(codigo, org.id);
  organizadoresPorNombre.set(nombreNorm, org.id);
  return { organizadorId: org.id, creado: true };
}

// Antes de pisar un KPI existente con el upsert, guarda su valor actual en
// kpis_historial — mismo criterio que polizas_historial (ver esa función y
// la migración): prioridad menor acá porque este dato cambia poco y no
// alimenta la evaluación del especialista, pero el costo es el mismo así
// que se guarda igual.
async function guardarHistorialKpis(supabase, importacionId, filasKpi) {
  if (!filasKpi.length) return { nuevas: 0, actualizadas: 0 };

  const organizadorIds = [...new Set(filasKpi.map(f => f.organizador_id))];
  const periodos = [...new Set(filasKpi.map(f => f.periodo))];

  const { data: existentes, error } = await supabase
    .from("organizador_kpis_generales")
    .select("*")
    .in("organizador_id", organizadorIds)
    .in("periodo", periodos);
  if (error) throw new Error(`No se pudo leer el estado anterior de los KPIs (para el historial): ${error.message}`);

  const clave = (organizadorId, periodo, ramo) => `${organizadorId}|${periodo}|${ramo}`;
  const existentesPorClave = new Map(existentes.map(row => [clave(row.organizador_id, row.periodo, row.ramo), row]));

  const filasHistorial = filasKpi.map(f => {
    const anterior = existentesPorClave.get(clave(f.organizador_id, f.periodo, f.ramo));
    return anterior
      ? { importacion_id: importacionId, organizador_id: f.organizador_id, periodo: f.periodo, ramo: f.ramo, tipo_cambio: "actualizada", snapshot: anterior }
      : { importacion_id: importacionId, organizador_id: f.organizador_id, periodo: f.periodo, ramo: f.ramo, tipo_cambio: "nueva", snapshot: null };
  });

  const { error: errInsert } = await supabase.from("kpis_historial").insert(filasHistorial);
  if (errInsert) throw new Error(`No se pudo guardar el historial de KPIs: ${errInsert.message}`);

  return {
    nuevas: filasHistorial.filter(f => f.tipo_cambio === "nueva").length,
    actualizadas: filasHistorial.filter(f => f.tipo_cambio === "actualizada").length,
  };
}

// Punto de entrada del importador: recibe una FileList/array de archivos
// (.zip y/o .pdf sueltos, indistinto — Signos a veces manda el lote completo
// en un .zip, a veces un .pdf individual por mail) y hace todo el flujo —
// parsear cada PDF, resolver/crear organizadores, snapshotear el estado
// anterior, y upsert a organizador_kpis_generales. Solo los reportes tipo
// "organizador" generan filas de KPIs (ver nota en la migración); los
// reportes tipo "productor" solo sirven para resolver/crear el organizador
// dueño si hiciera falta y para la reconciliación de cobertura (que se
// calcula aparte, con calcularFaltantes).
export async function importarSignosDesdeArchivos(files, { supabase, profileId }) {
  const { reportes, errores: erroresParseo } = await parseSignosArchivos(files);

  if (!reportes.length) {
    return { totalPdfs: 0, kpisImportados: 0, organizadoresCreados: [], codigosCubiertos: [], erroresParseo };
  }

  const { data: codigosExistentes, error: errCodigos } = await supabase
    .from("organizador_codigos")
    .select("codigo_signos, organizador_id");
  if (errCodigos) throw new Error(`No se pudieron leer los códigos de organizador existentes: ${errCodigos.message}`);
  const mapaCodigoOrg = new Map(codigosExistentes.map((c) => [c.codigo_signos, c.organizador_id]));

  const { data: organizadoresExistentes, error: errOrgs } = await supabase
    .from("organizadores")
    .select("id, razon_social");
  if (errOrgs) throw new Error(`No se pudieron leer los organizadores existentes: ${errOrgs.message}`);
  const organizadoresPorNombre = new Map(
    organizadoresExistentes.map((o) => [o.razon_social.trim().toLowerCase(), o.id])
  );

  const organizadoresCreados = [];
  const codigosCubiertos = [];
  const filasKpi = [];
  const avisos = [];

  // Los reportes tipo "organizador" primero: pueden crear organizadores nuevos
  // que un reporte "productor" del mismo lote necesite para resolverse.
  const ordenados = [...reportes].sort((a) => (a.tipo_reporte === "organizador" ? -1 : 1));

  for (const reporte of ordenados) {
    if (reporte.tipo_reporte === "organizador") {
      const { organizadorId, creado } = await resolverOrganizador(
        supabase, profileId, reporte.codigoOrganizador, reporte.nombre, mapaCodigoOrg, organizadoresPorNombre
      );
      if (creado) organizadoresCreados.push({ codigo: reporte.codigoOrganizador, razonSocial: reporte.nombre, organizadorId });
      codigosCubiertos.push(reporte.codigoOrganizador);

      for (const row of reporte.rows) {
        filasKpi.push({
          organizador_id: organizadorId,
          periodo: reporte.periodo,
          ramo: row.ramo,
          tipo_reporte: "organizador",
          productores: row.productores,
          asegurados: row.asegurados,
          polizas: row.polizas,
          certificados: row.certificados,
          prima_anualizada: row.prima_anualizada,
          siniestralidad: row.siniestralidad,
          frecuencia_siniestral: row.frecuencia_siniestral,
          fuente_archivo: reporte.fuente_archivo,
        });
      }
    } else {
      if (mapaCodigoOrg.has(reporte.codigoOrganizador)) {
        codigosCubiertos.push(reporte.codigoOrganizador);
      } else {
        avisos.push(
          `"${reporte.fuente_archivo}": reporte de productor bajo el organizador ${reporte.codigoOrganizador}, ` +
          `pero ese organizador no está registrado (no vino su propio reporte en este lote) — se ignora.`
        );
      }
    }
  }

  const nombresArchivos = Array.from(files).map(f => f.name).join(", ");
  const { data: importacion, error: errImportacion } = await supabase
    .from("importaciones")
    .insert([{ profile_id: profileId, tipo: "signos", archivo: nombresArchivos }])
    .select()
    .single();
  if (errImportacion) throw new Error(`No se pudo registrar la importación: ${errImportacion.message}`);

  const { nuevas, actualizadas } = await guardarHistorialKpis(supabase, importacion.id, filasKpi);

  let kpisImportados = 0;
  if (filasKpi.length) {
    const { error } = await supabase
      .from("organizador_kpis_generales")
      .upsert(filasKpi, { onConflict: "organizador_id,periodo,ramo" });
    if (error) throw new Error(`Error al guardar KPIs de fuerza comercial: ${error.message}`);
    kpisImportados = filasKpi.length;
  }

  // No fatal: el import ya se aplicó, esto es solo metadata de auditoría.
  const { error: errResumen } = await supabase
    .from("importaciones")
    .update({ resumen: { totalPdfs: reportes.length + erroresParseo.length, kpisImportados, nuevas, actualizadas, organizadoresCreados: organizadoresCreados.length } })
    .eq("id", importacion.id);
  if (errResumen) console.warn("No se pudo actualizar el resumen de la importación:", errResumen.message);

  return {
    totalPdfs: reportes.length + erroresParseo.length,
    kpisImportados,
    organizadoresCreados,
    codigosCubiertos,
    erroresParseo,
    avisos,
    importacionId: importacion.id,
  };
}
