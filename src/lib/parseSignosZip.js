import JSZip from "jszip";
import { getDocument, GlobalWorkerOptions } from "pdfjs-dist/legacy/build/pdf.mjs";
import pdfWorkerUrl from "pdfjs-dist/legacy/build/pdf.worker.mjs?url";

GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

const num = (s) => Number(String(s).replace(/,/g, ""));

async function extraerTexto(arrayBuffer) {
  const doc = await getDocument({ data: new Uint8Array(arrayBuffer), useSystemFonts: true }).promise;
  let full = "";
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    full += "\n" + content.items.map((it) => it.str).join(" ");
  }
  return full;
}

// Layout validado contra los 11 PDFs reales de un lote Signos. Los reportes tipo
// "productor" traen una tabla sin columna "Productores" (tiene sentido: la cartera
// de un productor individual no tiene una red de productores debajo) — por eso las
// dos variantes de regex por sección.
function parsearTextoSignos(text, fuenteArchivo) {
  const tipoMatch = text.match(/SIGNOS (ORGANIZADOR|PRODUCTOR)/);
  if (!tipoMatch) throw new Error(`"${fuenteArchivo}": no se encontró "SIGNOS ORGANIZADOR/PRODUCTOR" en el texto`);
  const tipo_reporte = tipoMatch[1].toLowerCase();

  const cabecera = text.match(/(\d+)\s*-\s*([A-ZÁÉÍÓÚÑ0-9 .,]+?)\s+Período:\s*(\d{2})\s*-\s*(\d{4})/);
  if (!cabecera) throw new Error(`"${fuenteArchivo}": no se encontró la cabecera "<código> - <nombre> Período: MM-AAAA"`);
  const codigo = Number(cabecera[1]);
  const nombre = cabecera[2].trim();
  const periodo = `${cabecera[4]}-${cabecera[3]}-01`;

  // En reportes tipo "productor" la cabecera es el código del productor, no del
  // organizador dueño de la estructura — hay que resolverlo aparte. En reportes
  // tipo "organizador" la cabecera ya es el organizador (auto-referencia).
  const orgRefMatch = text.match(/Organizador\s+(\d+)\s*-/);
  const codigoOrganizador = orgRefMatch ? Number(orgRefMatch[1]) : codigo;

  const esProductor = tipo_reporte === "productor";

  const reGenerales = esProductor
    ? /Cartera Vigente\s+Indicador Asegurados Pólizas Certificados Prima anualizada\s+Valor Actual \([^)]+\)\s+([\d,]+)\s+([\d,]+)\s+([\d,]+)\s+\$([\d,]+)/g
    : /Cartera Vigente\s+Indicador Productores Asegurados Pólizas Certificados Prima anualizada\s+Valor Actual \([^)]+\)\s+([\d,]+)\s+([\d,]+)\s+([\d,]+)\s+([\d,]+)\s+\$([\d,]+)/g;
  const bloquesGenerales = [...text.matchAll(reGenerales)];

  const reArt = esProductor
    ? /Cartera Vigente\s+Indicador Pólizas Cápitas Prima anualizada\s+Valor Actual \([^)]+\)\s+([\d,]+)\s+([\d,]+)\s+\$([\d,]+)/g
    : /Cartera Vigente\s+Indicador Productores Pólizas Cápitas Prima anualizada\s+Valor Actual \([^)]+\)\s+([\d,]+)\s+([\d,]+)\s+([\d,]+)\s+\$([\d,]+)/g;
  const bloqueArt = [...text.matchAll(reArt)];

  // Los 3 bloques de siniestralidad (combinado, generales, art) aparecen en ese
  // orden en el documento — se toman posicionalmente, no por sección con nombre,
  // porque el encabezado "Rendimiento" se repite igual en los 3.
  const reSiniestralidad = /Rendimiento\s+Indicador[^\n]*?Siniestralidad Frecuencia Siniestral\s+Valor Anual \([^)]+\)\s+([^\n]*?)Variación/g;
  const bloquesSiniestralidad = [...text.matchAll(reSiniestralidad)].map((m) => {
    const tokens = m[1].trim().split(/\s+/).filter((t) => t.endsWith("%"));
    const [siniestralidad, frecuencia] = tokens.slice(-2);
    return {
      siniestralidad: siniestralidad ? parseFloat(siniestralidad) : null,
      frecuencia_siniestral: frecuencia ? parseFloat(frecuencia) : null,
    };
  });

  const rows = [];
  if (bloquesGenerales[0]) {
    const m = bloquesGenerales[0];
    rows.push({
      ramo: "generales_art",
      productores: esProductor ? null : num(m[1]),
      asegurados: num(m[esProductor ? 1 : 2]),
      polizas: num(m[esProductor ? 2 : 3]),
      certificados: num(m[esProductor ? 3 : 4]),
      prima_anualizada: num(m[esProductor ? 4 : 5]),
      ...(bloquesSiniestralidad[0] ?? { siniestralidad: null, frecuencia_siniestral: null }),
    });
  }
  if (bloquesGenerales[1]) {
    const m = bloquesGenerales[1];
    rows.push({
      ramo: "generales",
      productores: esProductor ? null : num(m[1]),
      asegurados: num(m[esProductor ? 1 : 2]),
      polizas: num(m[esProductor ? 2 : 3]),
      certificados: num(m[esProductor ? 3 : 4]),
      prima_anualizada: num(m[esProductor ? 4 : 5]),
      ...(bloquesSiniestralidad[1] ?? { siniestralidad: null, frecuencia_siniestral: null }),
    });
  }
  if (bloqueArt[0]) {
    const m = bloqueArt[0];
    rows.push({
      ramo: "art",
      productores: esProductor ? null : num(m[1]),
      asegurados: null,
      polizas: num(m[esProductor ? 1 : 2]),
      certificados: num(m[esProductor ? 2 : 3]),
      prima_anualizada: num(m[esProductor ? 3 : 4]),
      ...(bloquesSiniestralidad[2] ?? { siniestralidad: null, frecuencia_siniestral: null }),
    });
  }

  return { codigo, nombre, codigoOrganizador, periodo, tipo_reporte, fuente_archivo: fuenteArchivo, rows };
}

// Recibe el ArrayBuffer de un .zip con uno o más PDFs "Signos" y devuelve un
// reporte parseado por PDF. Los PDFs que fallan el parseo (layout inesperado)
// no rompen el lote entero: se devuelven aparte en `errores` para mostrarlos
// al usuario y que decida si los sube de nuevo o los ignora.
export async function parseSignosZip(arrayBuffer) {
  const zip = await JSZip.loadAsync(arrayBuffer);
  const archivosPdf = Object.values(zip.files).filter(
    (f) => !f.dir && f.name.toLowerCase().endsWith(".pdf")
  );

  const reportes = [];
  const errores = [];

  for (const archivo of archivosPdf) {
    try {
      const buffer = await archivo.async("arraybuffer");
      const texto = await extraerTexto(buffer);
      reportes.push(parsearTextoSignos(texto, archivo.name));
    } catch (e) {
      errores.push({ archivo: archivo.name, mensaje: e.message });
    }
  }

  return { reportes, errores };
}
