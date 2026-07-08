// Cálculos de negocio del módulo Fuerza Comercial — funciones puras, sin
// dependencia de React ni de Supabase, para poder testearlas/reusarlas.

// Escala del índice de penetración retiro/SG+ART. Calibrada contra el caso real
// de la spec: FRANZINO (benchmark) tiene primaRetiro=320.458.104 y
// primaSGART=4.808.405.569 → ratio 0.0667 · 10.000 ≈ 667, que es el índice 666
// que la spec usa como ejemplo. Con escala ×1.000 el mismo caso da ≈67, muy
// chico para ser legible como entero — por eso ×10.000.
const ESCALA_INDICE = 10000;

export const calcularIndicePenetracion = (primaRetiro, primaSgArt) =>
  primaSgArt > 0 ? Math.round((primaRetiro / primaSgArt) * ESCALA_INDICE) : null;

// Oportunidad en pesos: cuánta prima de retiro "debería" tener este organizador
// si convirtiera su cartera SG+ART al ritmo del mejor organizador del período
// (el benchmark), menos lo que ya tiene. Nunca negativo — un organizador que ya
// superó al benchmark no resta al ranking, simplemente no aporta oportunidad.
export const calcularOportunidad = (primaSgArt, indiceBenchmark, primaRetiroActual) => {
  if (!primaSgArt || !indiceBenchmark) return 0;
  const potencial = (primaSgArt * indiceBenchmark) / ESCALA_INDICE;
  return Math.max(0, potencial - (primaRetiroActual || 0));
};

// Umbrales del badge de color, relativos al benchmark del período (no
// absolutos): "rojo" = cartera fuerte con retiro nulo o casi nulo, "verde" =
// ya cerca o por encima del mejor organizador, "ámbar" = todo lo demás.
export function clasificarIndice(indice, indiceBenchmark) {
  if (indice == null) return { nivel: "sin_datos", color: "t3" };
  if (!indiceBenchmark || indiceBenchmark <= 0) return { nivel: "sin_datos", color: "t3" };
  if (indice >= indiceBenchmark * 0.9) return { nivel: "verde", color: "verde" };
  if (indice < indiceBenchmark * 0.05) return { nivel: "rojo", color: "rojo" };
  return { nivel: "ambar", color: "ambar" };
}

// Organizadores con pólizas de retiro (codigo_org_origen != 0, resuelto vía
// organizador_codigos) que no tienen ningún reporte Signos —de ellos mismos o
// de un productor bajo su estructura— en el período más reciente presente en
// organizador_kpis_generales. `codigosCubiertos` son los codigo_signos (de
// cualquier tipo de reporte) vistos en el ZIP para ese período.
export function calcularFaltantes({ polizas, organizadorCodigos, codigosCubiertos }) {
  const codigoAOrganizador = new Map(organizadorCodigos.map((c) => [c.codigo_signos, c.organizador_id]));
  const organizadorCubierto = new Set(
    [...codigosCubiertos].map((c) => codigoAOrganizador.get(c)).filter((id) => id != null)
  );

  const porOrganizador = new Map(); // organizador_id -> { razonSocial, primaRetiro }
  for (const p of polizas) {
    if (p.codigo_org_origen === 0 || p.codigo_org_origen == null || p.organizador_id == null) continue;
    if (organizadorCubierto.has(p.organizador_id)) continue;
    if (!porOrganizador.has(p.organizador_id)) {
      porOrganizador.set(p.organizador_id, { organizadorId: p.organizador_id, primaRetiro: 0 });
    }
    porOrganizador.get(p.organizador_id).primaRetiro += Number(p.premio_anualizado) || 0;
  }

  return [...porOrganizador.values()].sort((a, b) => b.primaRetiro - a.primaRetiro);
}

// Último período (más reciente) presente en un array de organizador_kpis_generales.
export function ultimoPeriodo(kpis) {
  if (!kpis.length) return null;
  return kpis.reduce((max, k) => (k.periodo > max ? k.periodo : max), kpis[0].periodo);
}
