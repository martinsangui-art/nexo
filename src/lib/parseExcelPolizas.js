import * as XLSX from "xlsx";

// El Excel real no trae formato de fecha aplicado a las celdas (son "número"
// planas), así que SheetJS no las convierte solo con cellDates — hay que
// interpretar el serial de Excel a mano (época 1899-12-30).
const toISODate = (v) => {
  if (!v && v !== 0) return null;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === "number") {
    return new Date(Date.UTC(1899, 11, 30) + v * 86400000).toISOString().slice(0, 10);
  }
  return null;
};

const numOrNull = (v) => (v === null || v === undefined || v === "" ? null : Number(v));

// Mapea por nombre de columna del header (no por posición) — el Excel real trae
// columnas extra (Sucursal, Sexo, jerarquía SUBPAS/Gerente/Zonal/Representante)
// que no usamos y que no deben romper el parseo si cambian de orden.
//
// Filas sin un número de póliza válido (subtotales, filas en blanco al final,
// etc.) se descartan en vez de dejarlas pasar como NaN: `numero_poliza` es
// NOT NULL en la tabla, y un insert con NaN rompe el batch entero sin decir
// cuál fila lo causó. Se loguean las filas descartadas para poder revisarlas.
export async function parseExcelPolizas(arrayBuffer) {
  const wb = XLSX.read(arrayBuffer, { type: "array", cellDates: true });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const filas = XLSX.utils.sheet_to_json(sheet, { defval: null });

  const descartadas = [];

  const parsed = filas.reduce((acc, fila, i) => {
    const numero_poliza = Number(fila.Poliza);
    if (Number.isNaN(numero_poliza)) {
      // +2: la fila 1 del Excel es el header, y sheet_to_json indexa los
      // datos desde 0 — así el número de fila que se loguea es el real.
      descartadas.push(i + 2);
      return acc;
    }

    const cuitOrg = fila.CUITOrg != null ? String(fila.CUITOrg) : null;
    const cuitPas = fila.CUITPAS != null ? String(fila.CUITPAS) : null;
    acc.push({
      numero_poliza,
      estado: fila.Estado ?? null,
      cuil: fila.CUIL != null ? String(fila.CUIL) : null,
      apellido: fila.Apellido ?? null,
      nombre: fila.Nombre ?? null,
      fecha_emision: toISODate(fila.FechaEmision),
      fecha_inicio_vigencia: toISODate(fila.FechaInicioVigencia),
      plan: fila.Plan ?? null,
      edad_retiro: numOrNull(fila.EdadRetiro),
      tipo_renta: fila.TipoRenta ?? null,
      premio_regular: numOrNull(fila.PremioRegular),
      premio_anualizado: numOrNull(fila.PremioAnualizado),
      forma_cobro: fila.FormaCobro ?? null,
      provincia: fila.Provincia ?? null,
      localidad: fila.Localidad ?? null,
      codigo_org_origen: numOrNull(fila.CodigoOrg),
      codigo_pas: numOrNull(fila.CodigoPAS),
      razon_social_pas: fila.RazonSocialPAS ?? null,
      cuit_pas: cuitPas,
      venta_directa: cuitOrg != null && cuitPas != null && cuitOrg === cuitPas,
      // Campos transitorios: sirven para resolver/crear el organizador en el
      // importador, pero no son columnas de la tabla `polizas`.
      _razonSocialOrg: fila.RazonSocialOrg ?? null,
      _cuitOrg: cuitOrg,
    });
    return acc;
  }, []);

  if (descartadas.length) {
    console.warn(
      `parseExcelPolizas: se descartaron ${descartadas.length} fila(s) sin número de póliza válido (filas de Excel: ${descartadas.join(", ")})`
    );
  }

  // El Excel real trae algunas filas exactamente duplicadas (mismo número de
  // póliza repetido, ej. exportaciones con overlap). Un batch con el mismo
  // numero_poliza dos veces rompe el upsert entero (Postgres: "ON CONFLICT DO
  // UPDATE command cannot affect row a second time") — se deduplica acá, no en
  // el importador, para que loggear/depurar quede en un solo lugar.
  const vistos = new Set();
  const duplicadas = [];
  const sinDuplicados = parsed.filter((fila) => {
    if (vistos.has(fila.numero_poliza)) {
      duplicadas.push(fila.numero_poliza);
      return false;
    }
    vistos.add(fila.numero_poliza);
    return true;
  });

  if (duplicadas.length) {
    console.warn(
      `parseExcelPolizas: se descartaron ${duplicadas.length} fila(s) duplicada(s) (mismo número de póliza repetido: ${duplicadas.join(", ")})`
    );
  }

  return sinDuplicados;
}
