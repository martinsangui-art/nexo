// Cálculos de negocio del objetivo de UDN — funciones puras, sin dependencia
// de React ni de Supabase.

// Ritmo esperado de crecimiento acumulado a esta altura del año: si el
// objetivo anual es 146,53% y estamos en el mes 6 de 12, "deberías" ir por
// 146,53% x 6/12 = 73,26% para llegar a tiempo. Es la misma lógica con la
// que el reporte de Gerencia Comercial pinta el "Crec. Acumulado" en rojo
// aunque el número en sí no esté "mal" — está mal PARA ESTE MES.
export const ritmoEsperadoCrecimiento = (objetivoCrecimientoPct, mesPeriodo) =>
  (objetivoCrecimientoPct * mesPeriodo) / 12;

// mesPeriodo: 1-12, el mes calendario del `periodo` (date) que se está evaluando.
export function clasificarCrecimiento(crecimientoAcumuladoPct, objetivoCrecimientoPct, mesPeriodo) {
  if (crecimientoAcumuladoPct == null || !objetivoCrecimientoPct || !mesPeriodo) return { nivel: "sin_datos", color: "t3" };
  const esperado = ritmoEsperadoCrecimiento(objetivoCrecimientoPct, mesPeriodo);
  if (esperado <= 0) return { nivel: "sin_datos", color: "t3" };
  const ratio = crecimientoAcumuladoPct / esperado;
  if (ratio >= 1) return { nivel: "verde", color: "verde" };
  if (ratio >= 0.85) return { nivel: "ambar", color: "ambar" };
  return { nivel: "rojo", color: "rojo" };
}

// Premio y rescate son binarios en el reporte original (por encima/por
// debajo del umbral) — se agrega una franja "ambar" cerca del límite (10%)
// para dar aviso antes de que se pase de rojo, algo que el PDF no hace pero
// que tiene sentido para un semáforo de seguimiento mes a mes.
export function clasificarPremio(premioPromedioAcumulado, objetivoMin) {
  if (premioPromedioAcumulado == null || !objetivoMin) return { nivel: "sin_datos", color: "t3" };
  if (premioPromedioAcumulado >= objetivoMin) return { nivel: "verde", color: "verde" };
  if (premioPromedioAcumulado >= objetivoMin * 0.9) return { nivel: "ambar", color: "ambar" };
  return { nivel: "rojo", color: "rojo" };
}

export function clasificarRescate(tasaRescateAcumulada, objetivoMax) {
  if (tasaRescateAcumulada == null || objetivoMax == null) return { nivel: "sin_datos", color: "t3" };
  if (tasaRescateAcumulada <= objetivoMax) return { nivel: "verde", color: "verde" };
  if (tasaRescateAcumulada <= objetivoMax * 1.1) return { nivel: "ambar", color: "ambar" };
  return { nivel: "rojo", color: "rojo" };
}

// mes calendario (1-12) a partir de un periodo 'YYYY-MM-DD'.
export const mesDePeriodo = (periodo) => Number(periodo.slice(5, 7));
