import { useState } from "react";
import { T, fmt$, fmtN, Card, Sec, Icon, Num } from "../lib/ui.jsx";
import { calcularIndicePenetracion, calcularOportunidad, clasificarIndice } from "../lib/fuerzaComercial";

const BADGE_LABEL = { rojo: "Cartera fuerte, retiro casi nulo", ambar: "Por debajo del benchmark", verde: "Convertido", sin_datos: "Sin datos suficientes" };

function BadgeIndice({ indice, indiceBenchmark }) {
  const { nivel, color } = clasificarIndice(indice, indiceBenchmark);
  const c = T[color];
  return <span style={{display:"inline-flex",alignItems:"center",gap:6,background:`${c}18`,color:c,
    padding:"4px 11px",borderRadius:20,fontSize:12,fontWeight:800,border:`1px solid ${c}33`}}>
    <span style={{width:6,height:6,borderRadius:"50%",background:c,boxShadow:`0 0 5px ${c}`}}/>
    {indice != null ? `Índice ${indice}` : "Sin índice"} · {BADGE_LABEL[nivel]}
  </span>;
}

// El índice no es una métrica de Federación Patronal — es un cálculo interno
// de NEXO (ver fuerzaComercial.js), así que sin esta explicación a la vista
// nadie sabe de dónde sale ni por qué un organizador está "en rojo". Antes
// solo se entendía preguntando; ahora queda documentado en la propia ficha.
function InfoIndice({ indiceBenchmark }) {
  const [abierto, setAbierto] = useState(false);
  return <div style={{marginTop:8}}>
    <button onClick={() => setAbierto(a => !a)} style={{background:"transparent",border:"none",
      color:T.t3,fontSize:11,cursor:"pointer",fontFamily:"inherit",padding:0,textDecoration:"underline",
      textUnderlineOffset:2}}>
      {abierto ? "ocultar" : "ⓘ ¿qué es el índice?"}
    </button>
    {abierto && <Card style={{marginTop:6,fontSize:11,color:T.t2,lineHeight:1.6,borderRadius:7,padding:10}}>
      No es un dato de Federación Patronal — lo calcula NEXO: <b style={{color:T.t1}}>(prima de tus pólizas
      de retiro con este organizador ÷ prima de su cartera Seguros Generales+ART en Signos) × 10.000</b>.
      Mide cuánto convertís esa cartera en venta de retiro. Se compara contra el organizador con mejor
      índice del período{indiceBenchmark ? ` (benchmark actual: ${indiceBenchmark})` : ""}:
      <div style={{marginTop:6}}>
        <div><span style={{color:T.verde,fontWeight:800}}>● Convertido</span> — 90% o más del benchmark.</div>
        <div><span style={{color:T.ambar,fontWeight:800}}>● Por debajo</span> — entre 5% y 90%.</div>
        <div><span style={{color:T.rojo,fontWeight:800}}>● Cartera fuerte, retiro casi nulo</span> — menos del 5%, la mejor oportunidad.</div>
      </div>
    </Card>}
  </div>;
}

// Compara la cartera SG+ART del período más reciente contra la de ~12 meses
// antes (mismo ramo) para mostrar la flecha de variación que pide la spec.
function variacion12Meses(kpisOrg, periodoActual) {
  if (!periodoActual) return null;
  const fechaActual = new Date(periodoActual);
  const fechaHace12 = new Date(Date.UTC(fechaActual.getUTCFullYear() - 1, fechaActual.getUTCMonth(), 1));
  const isoHace12 = fechaHace12.toISOString().slice(0, 10);
  const kpiHace12 = kpisOrg.find((k) => k.ramo === "generales_art" && k.periodo === isoHace12);
  return kpiHace12 ?? null;
}

export default function FichaOrganizador({ organizador, codigos, kpisOrg, polizasOrg, indiceBenchmark, enFaltantes, onCerrar }) {
  const kpisCombinado = kpisOrg.filter((k) => k.ramo === "generales_art" && k.tipo_reporte === "organizador");
  const periodoActual = kpisCombinado.length
    ? kpisCombinado.reduce((max, k) => (k.periodo > max ? k.periodo : max), kpisCombinado[0].periodo)
    : null;
  const kpiActual = kpisCombinado.find((k) => k.periodo === periodoActual) ?? null;
  const kpiHace12 = variacion12Meses(kpisCombinado, periodoActual);

  const primaRetiro = polizasOrg.reduce((s, p) => s + (Number(p.premio_anualizado) || 0), 0);
  const primaDirecta = polizasOrg.filter((p) => p.venta_directa).reduce((s, p) => s + (Number(p.premio_anualizado) || 0), 0);
  const primaRed = primaRetiro - primaDirecta;
  const indice = kpiActual ? calcularIndicePenetracion(primaRetiro, kpiActual.prima_anualizada) : null;
  const oportunidad = kpiActual ? calcularOportunidad(kpiActual.prima_anualizada, indiceBenchmark, primaRetiro) : 0;

  const Fila = ({ l, v, sub }) => (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "7px 0", borderBottom: `1px solid ${T.bd}` }}>
      <span style={{ fontSize: 11, color: T.t3 }}>{l}</span>
      <span style={{ textAlign: "right" }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: T.t1 }}>{v}</span>
        {sub && <span style={{ fontSize: 10, color: T.t3, marginLeft: 6 }}>{sub}</span>}
      </span>
    </div>
  );

  return <div style={{width:420,flexShrink:0,minWidth:0,background:"var(--surface-gradient)",borderLeft:`1px solid ${T.bd}`,
    display:"flex",flexDirection:"column",height:"100vh",overflow:"hidden"}}>
    <div style={{background:"var(--surface-gradient)",borderBottom:`1px solid ${T.bd}`,padding:"18px 18px 14px",flexShrink:0}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
        <div style={{minWidth:0}}>
          <div style={{fontWeight:900,fontSize:15,color:T.t1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
            {organizador.razon_social}
          </div>
          <div style={{fontSize:10,color:T.t3,marginTop:2}}>{organizador.zona || "Sin zona"}</div>
        </div>
        <button onClick={onCerrar} style={{background:T.s4,border:"none",color:T.t2,width:26,
          height:26,borderRadius:"50%",cursor:"pointer",flexShrink:0,display:"flex",
          alignItems:"center",justifyContent:"center"}}><Icon name="x" size={13}/></button>
      </div>
      <BadgeIndice indice={indice} indiceBenchmark={indiceBenchmark} />
      <InfoIndice indiceBenchmark={indiceBenchmark} />
      {enFaltantes && <div style={{marginTop:8,fontSize:11,fontWeight:700,color:T.ambar,background:T.ambarS,
        borderRadius:6,padding:"6px 10px",border:`1px solid ${T.ambar}33`,display:"flex",alignItems:"center",gap:6}}>
        <Icon name="alertTriangle" size={13}/> Sin reporte Signos este período — datos de fuerza comercial desactualizados
      </div>}
    </div>

    <div style={{flex:1,overflowY:"auto",padding:14}}>
      <Card style={{padding:13,marginBottom:10}}>
        <Sec>Código(s) de sistema</Sec>
        {codigos.length === 0
          ? <div style={{fontSize:12,color:T.t3,fontStyle:"italic"}}>Sin código Signos vinculado</div>
          : <div>
            <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:codigos.length>1?8:0}}>
              {codigos.map((c) => <span key={c.id} style={{fontSize:12,fontWeight:800,color:T.azulL,
                background:T.azulS,borderRadius:6,padding:"3px 9px",display:"inline-flex",alignItems:"center",gap:4}}>
                <Num>{c.codigo_signos}</Num>{c.es_principal && <Icon name="star" size={10} color={T.azulL}/>}</span>)}
            </div>
            {codigos.length > 1 && <div style={{fontSize:11,color:T.t2,lineHeight:1.5}}>
              Unificado — este organizador opera bajo los códigos {codigos.map((c) => c.codigo_signos).join(" y ")}.
            </div>}
          </div>}
      </Card>

      <Card style={{padding:13,marginBottom:10}}>
        <Sec>Cartera SG+ART {periodoActual ? `· ${periodoActual.slice(0,7)}` : ""}</Sec>
        {!kpiActual
          ? <div style={{fontSize:12,color:T.t3,fontStyle:"italic"}}>Sin datos de Signos importados</div>
          : <div>
            <Fila l="Pólizas vigentes" v={fmtN(kpiActual.polizas)} />
            <Fila l="Prima anualizada" v={fmt$(kpiActual.prima_anualizada)}
              sub={kpiHace12 ? (kpiActual.prima_anualizada >= kpiHace12.prima_anualizada
                ? `▲ desde ${fmt$(kpiHace12.prima_anualizada)} (12m)` : `▼ desde ${fmt$(kpiHace12.prima_anualizada)} (12m)`) : null} />
            <Fila l="Productores en su red" v={fmtN(kpiActual.productores)} />
            <Fila l="Siniestralidad" v={kpiActual.siniestralidad != null ? `${kpiActual.siniestralidad}%` : "—"} />
          </div>}
      </Card>

      <Card style={{padding:13,marginBottom:10}}>
        <Sec>Producción de retiro</Sec>
        <Fila l="Pólizas vigentes" v={fmtN(polizasOrg.length)} />
        <Fila l="Prima anualizada" v={fmt$(primaRetiro)} />
        <Fila l="Directa (vendida por el organizador)" v={fmt$(primaDirecta)} />
        <Fila l="Red (vendida por un PAS)" v={fmt$(primaRed)} />
      </Card>

      {oportunidad > 0 && <Card style={{padding:13}}>
        <Sec color={T.verde}>Oportunidad estimada</Sec>
        <div style={{fontSize:22,fontWeight:900,color:T.verde}}>{fmt$(oportunidad)}</div>
        <div style={{fontSize:11,color:T.t3,marginTop:4}}>
          Prima de retiro adicional si convirtiera su cartera SG+ART al ritmo del mejor organizador del período.
        </div>
      </Card>}
    </div>
  </div>;
}
