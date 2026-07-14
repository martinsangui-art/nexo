import { useState } from "react";
import { T, fmt$, fmtN, Card, Inp, BtnP, BtnS, Icon } from "../lib/ui.jsx";
import { clasificarCrecimiento, clasificarPremio, clasificarRescate, mesDePeriodo } from "../lib/udnObjetivos";

const NIVEL_LABEL = { verde: "En ritmo", ambar: "Atención", rojo: "Atrasado", sin_datos: "Sin datos" };

const Label = ({ t }) => <label style={{display:"block",fontSize:10,color:T.t3,fontWeight:700,
  textTransform:"uppercase",letterSpacing:".06em",marginBottom:4}}>{t}</label>;

function Semaforo({ titulo, valor, sub, nivel, color }) {
  const c = T[color];
  return <Card style={{padding:"14px 16px"}}>
    <div style={{fontSize:10,color:T.t3,textTransform:"uppercase",letterSpacing:".07em",marginBottom:8}}>{titulo}</div>
    <div style={{fontSize:24,fontWeight:900,color:c,letterSpacing:"-1px",marginBottom:4}}>{valor}</div>
    <div style={{fontSize:11,color:T.t3,marginBottom:8}}>{sub}</div>
    <span style={{display:"inline-flex",alignItems:"center",gap:6,background:`${c}18`,color:c,
      padding:"3px 10px",borderRadius:20,fontSize:11,fontWeight:800,border:`1px solid ${c}33`}}>
      <span style={{width:6,height:6,borderRadius:"50%",background:c,boxShadow:`0 0 5px ${c}`}}/>
      {NIVEL_LABEL[nivel]}
    </span>
  </Card>;
}

const MESES = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

// Línea de tiempo simple (12 meses fijos en X) con 1-2 series — mismo
// espíritu que el gráfico "objetivo vs. real" del PDF de Gerencia
// Comercial, pero renderizado a mano en SVG (como el resto de los gráficos
// de NEXO, ej. el Spark de especialistas) para no sumar una librería nueva.
function GraficoObjetivo({ series, formatY }) {
  const width = 560, height = 190;
  const pad = { l: 46, r: 12, t: 12, b: 22 };
  const w = width - pad.l - pad.r;
  const h = height - pad.t - pad.b;
  const todosY = series.flatMap(s => s.puntos.filter(p => p.y != null).map(p => p.y));

  if (todosY.length === 0) {
    return <div style={{padding:"24px 12px",textAlign:"center",fontSize:12,color:T.t3}}>
      Cargá al menos un mes para ver el gráfico.
    </div>;
  }

  const maxY = Math.max(...todosY) * 1.1 || 1;
  const minY = 0;
  const xFor = (mes) => pad.l + ((mes - 1) / 11) * w;
  const yFor = (val) => pad.t + h - ((val - minY) / (maxY - minY || 1)) * h;

  return <div>
    <svg viewBox={`0 0 ${width} ${height}`} style={{width:"100%",height:"auto",display:"block"}}>
      {[0, 0.5, 1].map(f => {
        const val = minY + (maxY - minY) * f;
        const y = yFor(val);
        return <g key={f}>
          <line x1={pad.l} y1={y} x2={width - pad.r} y2={y} stroke={T.bd} strokeWidth={1}/>
          <text x={pad.l - 6} y={y + 3} textAnchor="end" fontSize="9" fill={T.t3}>{formatY(val)}</text>
        </g>;
      })}
      {[1,3,5,7,9,11].map(m => <text key={m} x={xFor(m)} y={height - 4} textAnchor="middle" fontSize="9" fill={T.t3}>
        {MESES[m-1]}
      </text>)}
      {series.map(s => {
        const pts = s.puntos.filter(p => p.y != null);
        if (pts.length === 0) return null;
        const d = pts.map((p, i) => `${i === 0 ? "M" : "L"}${xFor(p.x)},${yFor(p.y)}`).join(" ");
        return <g key={s.label}>
          <path d={d} fill="none" stroke={s.color} strokeWidth={2} strokeDasharray={s.dashed ? "5,4" : "none"}/>
          {!s.dashed && pts.map(p => <circle key={p.x} cx={xFor(p.x)} cy={yFor(p.y)} r={3} fill={s.color}/>)}
        </g>;
      })}
    </svg>
    <div style={{display:"flex",gap:14,justifyContent:"center",marginTop:4}}>
      {series.map(s => <span key={s.label} style={{display:"flex",alignItems:"center",gap:5,fontSize:10,color:T.t3}}>
        <span style={{width:10,height:s.dashed?0:2,borderTop:`2px ${s.dashed?"dashed":"solid"} ${s.color}`}}/>
        {s.label}
      </span>)}
    </div>
  </div>;
}

// Rampa lineal mes a mes desde 0 hasta el objetivo anual — así se ve la
// misma línea ascendente de "Pólizas objetivo" que en el PDF.
const puntosObjetivoLineal = (valorAnual, valorBase=0) =>
  Array.from({length:12}, (_, i) => ({ x: i+1, y: valorBase + (valorAnual * (i+1)) / 12 }));

// Línea plana (piso o techo, igual todos los meses) — el "Objetivo"
// punteado de premio y rescate en el PDF no cambia mes a mes.
const puntosObjetivoPlano = (valor) =>
  valor == null ? [] : Array.from({length:12}, (_, i) => ({ x: i+1, y: valor }));

const puntosReal = (historial, campo, extra=0) =>
  Array.from({length:12}, (_, i) => {
    const mes = i + 1;
    const h = historial.find(x => mesDePeriodo(x.periodo) === mes);
    return { x: mes, y: h && h[campo] != null ? h[campo] + extra : null };
  });

function FormObjetivoAnual({ anioSugerido, valoresIniciales, onGuardar, onCancelar }) {
  const [f, setF] = useState({
    anio: valoresIniciales?.anio ?? anioSugerido,
    nombre_udn: valoresIniciales?.nombre_udn ?? "",
    polizas_base_diciembre: valoresIniciales?.polizas_base_diciembre ?? "",
    objetivo_polizas_diciembre: valoresIniciales?.objetivo_polizas_diciembre ?? "",
    objetivo_premio_promedio_min: valoresIniciales?.objetivo_premio_promedio_min ?? "",
    objetivo_tasa_rescate_max: valoresIniciales?.objetivo_tasa_rescate_max ?? "",
  });
  const set = (k, v) => setF(x => ({ ...x, [k]: v }));
  const base = Number(f.polizas_base_diciembre) || 0;
  const objetivoTotal = Number(f.objetivo_polizas_diciembre) || 0;
  const incremental = objetivoTotal - base;
  const pctDerivado = base > 0 && incremental > 0 ? ((incremental / base) * 100).toFixed(2) : null;

  return <Card style={{padding:20,maxWidth:480,maxHeight:"90vh",overflowY:"auto"}}>
    <div style={{fontSize:16,fontWeight:900,color:T.t1,marginBottom:4}}>
      {valoresIniciales ? "Editar objetivo anual" : "Objetivo anual de tu UDN"}
    </div>
    <div style={{fontSize:12,color:T.t3,marginBottom:16}}>
      Los objetivos que te impone Gerencia Comercial, fijos para todo el año. Se cargan una vez (y se pueden
      editar después si Gerencia Comercial los revisa).
    </div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
      <div><Label t="Año"/><Inp type="number" value={f.anio} onChange={v=>set("anio",v)}/></div>
      <div><Label t="Nombre UDN"/><Inp value={f.nombre_udn} onChange={v=>set("nombre_udn",v)} placeholder="ej. Bahía Blanca"/></div>
    </div>
    <div style={{marginBottom:10}}>
      <Label t="Pólizas vigentes en diciembre (base)"/>
      <Inp type="number" value={f.polizas_base_diciembre} onChange={v=>set("polizas_base_diciembre",v)}/>
    </div>
    <div style={{marginBottom:10}}>
      <Label t="Objetivo total de pólizas a diciembre"/>
      <Inp type="number" value={f.objetivo_polizas_diciembre} onChange={v=>set("objetivo_polizas_diciembre",v)} placeholder="ej. 1102"/>
      {pctDerivado && <div style={{fontSize:10,color:T.t3,marginTop:4}}>
        Equivale a sumar {fmtN(incremental)} pólizas nuevas ({pctDerivado}% de crecimiento sobre la base)
      </div>}
    </div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16}}>
      <div><Label t="Piso premio promedio ($)"/><Inp type="number" value={f.objetivo_premio_promedio_min} onChange={v=>set("objetivo_premio_promedio_min",v)}/></div>
      <div><Label t="Techo tasa de rescate (%)"/><Inp type="number" value={f.objetivo_tasa_rescate_max} onChange={v=>set("objetivo_tasa_rescate_max",v)}/></div>
    </div>
    <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
      {onCancelar && <BtnS onClick={onCancelar}>Cancelar</BtnS>}
      <BtnP onClick={()=>{
        if(!f.nombre_udn.trim()||!f.anio||!f.polizas_base_diciembre||!f.objetivo_polizas_diciembre) return;
        onGuardar({
          anio: Number(f.anio),
          nombre_udn: f.nombre_udn.trim(),
          polizas_base_diciembre: Number(f.polizas_base_diciembre),
          objetivo_polizas_diciembre: Number(f.objetivo_polizas_diciembre),
          objetivo_premio_promedio_min: f.objetivo_premio_promedio_min ? Number(f.objetivo_premio_promedio_min) : null,
          objetivo_tasa_rescate_max: f.objetivo_tasa_rescate_max ? Number(f.objetivo_tasa_rescate_max) : null,
        });
      }}>{valoresIniciales ? "Guardar cambios" : "Guardar objetivo"}</BtnP>
    </div>
  </Card>;
}

function FormAvanceMensual({ periodoSugerido, avanceExistente, onGuardar, onCancelar }) {
  const base = avanceExistente || {};
  const [f, setF] = useState({
    periodo: periodoSugerido,
    crecimiento_ac_polizas: base.crecimiento_ac_polizas ?? "",
    crecimiento_acumulado_pct: base.crecimiento_acumulado_pct ?? "",
    avance_objetivo_pct: base.avance_objetivo_pct ?? "",
    premio_promedio_acumulado: base.premio_promedio_acumulado ?? "",
    tasa_rescate_acumulada: base.tasa_rescate_acumulada ?? "",
    notas: base.notas ?? "",
  });
  const set = (k, v) => setF(x => ({ ...x, [k]: v }));

  return <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.72)",display:"flex",
    alignItems:"center",justifyContent:"center",zIndex:300,backdropFilter:"blur(4px)"}}>
    <Card style={{borderRadius:13,padding:26,width:460,maxHeight:"90vh",overflowY:"auto",
      boxShadow:"0 24px 60px rgba(0,0,0,.55)"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
        <div style={{fontSize:17,fontWeight:900,color:T.t1}}>Cargar avance — {f.periodo.slice(0,7)}</div>
        <button onClick={onCancelar} style={{background:T.s3,border:"none",color:T.t2,
          width:26,height:26,borderRadius:"50%",cursor:"pointer",display:"flex",
          alignItems:"center",justifyContent:"center"}}><Icon name="x" size={13}/></button>
      </div>
      <div style={{fontSize:11,color:T.t3,marginBottom:16}}>Cargá los números tal cual figuran en el reporte de OBI.</div>

      <div style={{marginBottom:10}}>
        <Label t="Mes"/>
        <input type="month" value={f.periodo.slice(0,7)}
          onChange={e=>set("periodo", `${e.target.value}-01`)}
          style={{width:"100%",padding:"9px 12px",border:`1.5px solid ${T.bd2}`,borderRadius:8,fontSize:14,
            fontFamily:"inherit",outline:"none",boxSizing:"border-box",background:T.s3,color:T.t1}}/>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
        <div><Label t="Crec. ac. pólizas (cant.)"/><Inp type="number" value={f.crecimiento_ac_polizas} onChange={v=>set("crecimiento_ac_polizas",v)}/></div>
        <div><Label t="Crec. acumulado (%)"/><Inp type="number" value={f.crecimiento_acumulado_pct} onChange={v=>set("crecimiento_acumulado_pct",v)}/></div>
      </div>
      <div style={{marginBottom:10}}>
        <Label t="Avance a objetivo (%)"/>
        <Inp type="number" value={f.avance_objetivo_pct} onChange={v=>set("avance_objetivo_pct",v)}/>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
        <div><Label t="Premio promedio acum. ($)"/><Inp type="number" value={f.premio_promedio_acumulado} onChange={v=>set("premio_promedio_acumulado",v)}/></div>
        <div><Label t="Tasa de rescate acum. (%)"/><Inp type="number" value={f.tasa_rescate_acumulada} onChange={v=>set("tasa_rescate_acumulada",v)}/></div>
      </div>
      <div style={{marginBottom:16}}>
        <Label t="Notas (opcional)"/>
        <textarea value={f.notas} onChange={e=>set("notas",e.target.value)} rows={2}
          style={{width:"100%",padding:"9px 12px",border:`1.5px solid ${T.bd2}`,borderRadius:8,fontSize:13,
            fontFamily:"inherit",outline:"none",boxSizing:"border-box",background:T.s3,color:T.t1,resize:"none"}}/>
      </div>
      <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
        <BtnS onClick={onCancelar}>Cancelar</BtnS>
        <BtnP onClick={()=>onGuardar({
          periodo: f.periodo,
          crecimiento_ac_polizas: f.crecimiento_ac_polizas===""?null:Number(f.crecimiento_ac_polizas),
          crecimiento_acumulado_pct: f.crecimiento_acumulado_pct===""?null:Number(f.crecimiento_acumulado_pct),
          avance_objetivo_pct: f.avance_objetivo_pct===""?null:Number(f.avance_objetivo_pct),
          premio_promedio_acumulado: f.premio_promedio_acumulado===""?null:Number(f.premio_promedio_acumulado),
          tasa_rescate_acumulada: f.tasa_rescate_acumulada===""?null:Number(f.tasa_rescate_acumulada),
          notas: f.notas || null,
        })}>Guardar</BtnP>
      </div>
    </Card>
  </div>;
}

export default function PanelObjetivosUDN({ objetivos, avanceMensual, loading, error, onCrearObjetivo, onEditarObjetivo, onGuardarAvance }) {
  const [mostrarForm, setMostrarForm] = useState(false);
  const [mostrarEdicion, setMostrarEdicion] = useState(false);
  const anioActual = new Date().getFullYear();
  const mesActual = new Date().getMonth() + 1;
  const periodoActualISO = `${anioActual}-${String(mesActual).padStart(2,"0")}-01`;

  if (loading) return <div style={{flex:1,overflowY:"auto",padding:"26px 28px"}}>
    <Card style={{padding:48,textAlign:"center"}}><div style={{fontSize:13,color:T.t3}}>Cargando...</div></Card>
  </div>;

  if (error) return <div style={{flex:1,overflowY:"auto",padding:"26px 28px"}}>
    <Card style={{padding:48,textAlign:"center"}}><div style={{fontSize:13,color:T.rojo}}>Error: {error.message}</div></Card>
  </div>;

  const objetivo = objetivos.find(o => o.anio === anioActual) ?? objetivos[0] ?? null;

  if (!objetivo) {
    return <div style={{flex:1,overflowY:"auto",padding:"26px 28px"}}>
      <div style={{fontSize:20,fontWeight:900,color:T.t1,letterSpacing:"-.5px",fontFamily:"var(--font-display)",marginBottom:18}}>Mis Objetivos</div>
      <FormObjetivoAnual anioSugerido={anioActual} onGuardar={onCrearObjetivo}/>
    </div>;
  }

  const historial = avanceMensual.filter(a => a.udn_objetivo_id === objetivo.id); // ya viene ordenado desc por periodo
  const ultimo = historial[0] ?? null;
  const avanceDeEsteMes = historial.find(a => a.periodo === periodoActualISO) ?? null;

  // objetivo_polizas_diciembre es el TOTAL a fin de año (ej. 1102), no un
  // incremento sobre la base — el incremental (para pacing/semáforo, que
  // se compara contra crecimiento_ac_polizas) se deriva acá.
  const incrementalObjetivo = objetivo.objetivo_polizas_diciembre - objetivo.polizas_base_diciembre;
  const semCrecimiento = ultimo ? clasificarCrecimiento(ultimo.crecimiento_ac_polizas, incrementalObjetivo, mesDePeriodo(ultimo.periodo)) : { nivel:"sin_datos", color:"t3" };
  const semPremio = ultimo ? clasificarPremio(ultimo.premio_promedio_acumulado, objetivo.objetivo_premio_promedio_min) : { nivel:"sin_datos", color:"t3" };
  const semRescate = ultimo ? clasificarRescate(ultimo.tasa_rescate_acumulada, objetivo.objetivo_tasa_rescate_max) : { nivel:"sin_datos", color:"t3" };

  return <div style={{flex:1,overflowY:"auto",padding:"26px 28px"}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
      <div style={{fontSize:20,fontWeight:900,color:T.t1,letterSpacing:"-.5px",fontFamily:"var(--font-display)"}}>
        Mis Objetivos <span style={{fontSize:14,fontWeight:400,color:T.t3}}>· {objetivo.nombre_udn} {objetivo.anio}</span>
      </div>
      <div style={{display:"flex",gap:8}}>
        <BtnS onClick={()=>setMostrarEdicion(true)} style={{display:"inline-flex",alignItems:"center",gap:5}}><Icon name="edit" size={12}/> Editar objetivo</BtnS>
        <BtnP onClick={()=>setMostrarForm(true)} style={{display:"inline-flex",alignItems:"center",gap:5}}>
          {avanceDeEsteMes ? <><Icon name="edit" size={12}/> Editar avance del mes</> : "＋ Cargar avance del mes"}
        </BtnP>
      </div>
    </div>
    <div style={{fontSize:11,color:T.t3,marginBottom:18}}>
      Objetivo: llegar a {fmtN(objetivo.objetivo_polizas_diciembre)} pólizas a diciembre {objetivo.anio}
      (+{fmtN(incrementalObjetivo)} sobre la base de {fmtN(objetivo.polizas_base_diciembre)} en dic. {objetivo.anio - 1})
      {objetivo.objetivo_premio_promedio_min ? ` · premio promedio ≥ ${fmt$(objetivo.objetivo_premio_promedio_min)}` : ""}
      {objetivo.objetivo_tasa_rescate_max != null ? ` · rescates ≤ ${objetivo.objetivo_tasa_rescate_max}%` : ""}
    </div>

    {!ultimo ? (
      <Card style={{padding:48,textAlign:"center"}}>
        <div style={{fontSize:13,color:T.t3}}>Todavía no cargaste ningún mes. Arrancá con "＋ Cargar avance del mes".</div>
      </Card>
    ) : <>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:20}}>
        <Semaforo titulo="Crecimiento de pólizas" valor={fmtN(ultimo.crecimiento_ac_polizas)}
          sub={`${ultimo.crecimiento_acumulado_pct ?? "—"}% acumulado · objetivo +${fmtN(incrementalObjetivo)} (${fmtN(objetivo.objetivo_polizas_diciembre)} total)`}
          nivel={semCrecimiento.nivel} color={semCrecimiento.color}/>
        <Semaforo titulo="Premio promedio" valor={fmt$(ultimo.premio_promedio_acumulado)}
          sub={objetivo.objetivo_premio_promedio_min ? `piso ${fmt$(objetivo.objetivo_premio_promedio_min)}` : "sin piso definido"}
          nivel={semPremio.nivel} color={semPremio.color}/>
        <Semaforo titulo="Tasa de rescate" valor={`${ultimo.tasa_rescate_acumulada ?? "—"}%`}
          sub={objetivo.objetivo_tasa_rescate_max!=null ? `techo ${objetivo.objetivo_tasa_rescate_max}%` : "sin techo definido"}
          nivel={semRescate.nivel} color={semRescate.color}/>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:20}}>
        <Card style={{padding:"14px 16px"}}>
          <div style={{fontSize:10,color:T.t3,textTransform:"uppercase",letterSpacing:".07em",marginBottom:6}}>
            Pólizas: objetivo vs. real
          </div>
          <GraficoObjetivo formatY={(v)=>fmtN(Math.round(v))} series={[
            { label:"Objetivo", color:T.ambar, dashed:true,
              puntos: puntosObjetivoLineal(incrementalObjetivo, objetivo.polizas_base_diciembre) },
            { label:"Real", color:T.azul, dashed:false,
              puntos: puntosReal(historial, "crecimiento_ac_polizas", objetivo.polizas_base_diciembre) },
          ]}/>
        </Card>
        <Card style={{padding:"14px 16px"}}>
          <div style={{fontSize:10,color:T.t3,textTransform:"uppercase",letterSpacing:".07em",marginBottom:6}}>
            Premio promedio: piso vs. real
          </div>
          <GraficoObjetivo formatY={(v)=>fmt$(v)} series={[
            { label:"Piso", color:T.ambar, dashed:true, puntos: puntosObjetivoPlano(objetivo.objetivo_premio_promedio_min) },
            { label:"Real", color:T.verde, dashed:false, puntos: puntosReal(historial, "premio_promedio_acumulado") },
          ]}/>
        </Card>
        <Card style={{padding:"14px 16px"}}>
          <div style={{fontSize:10,color:T.t3,textTransform:"uppercase",letterSpacing:".07em",marginBottom:6}}>
            Tasa de rescate: techo vs. real
          </div>
          <GraficoObjetivo formatY={(v)=>`${v.toFixed(1)}%`} series={[
            { label:"Techo", color:T.rojo, dashed:true, puntos: puntosObjetivoPlano(objetivo.objetivo_tasa_rescate_max) },
            { label:"Real", color:T.azulL, dashed:false, puntos: puntosReal(historial, "tasa_rescate_acumulada") },
          ]}/>
        </Card>
      </div>

      <Card style={{padding:0,overflow:"hidden"}}>
        <div style={{padding:"12px 16px",borderBottom:`1px solid ${T.bd}`,fontSize:11,fontWeight:800,
          color:T.t3,textTransform:"uppercase",letterSpacing:".08em"}}>Histórico mensual</div>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead>
              <tr style={{borderBottom:`1px solid ${T.bd}`}}>
                {["Período","Crec. ac.","Crec. %","Avance obj.","Premio prom.","Tasa rescate"].map(h=>
                  <th key={h} style={{textAlign:"left",padding:"8px 12px",fontSize:10,color:T.t3,
                    textTransform:"uppercase",letterSpacing:".06em"}}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {historial.map(h=>
                <tr key={h.id} style={{borderBottom:`1px solid ${T.bd}`}}>
                  <td style={{padding:"9px 12px",fontSize:12,color:T.t1,fontWeight:700}}>{h.periodo.slice(0,7)}</td>
                  <td style={{padding:"9px 12px",fontSize:12,color:T.t2}}>{fmtN(h.crecimiento_ac_polizas)}</td>
                  <td style={{padding:"9px 12px",fontSize:12,color:T.t2}}>{h.crecimiento_acumulado_pct ?? "—"}%</td>
                  <td style={{padding:"9px 12px",fontSize:12,color:T.t2}}>{h.avance_objetivo_pct ?? "—"}%</td>
                  <td style={{padding:"9px 12px",fontSize:12,color:T.t2}}>{fmt$(h.premio_promedio_acumulado)}</td>
                  <td style={{padding:"9px 12px",fontSize:12,color:T.t2}}>{h.tasa_rescate_acumulada ?? "—"}%</td>
                </tr>)}
            </tbody>
          </table>
        </div>
      </Card>
    </>}

    {mostrarForm && <FormAvanceMensual periodoSugerido={periodoActualISO} avanceExistente={avanceDeEsteMes}
      onGuardar={async (datos)=>{ await onGuardarAvance(objetivo.id, datos.periodo, datos); setMostrarForm(false); }}
      onCancelar={()=>setMostrarForm(false)}/>}

    {mostrarEdicion && <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.72)",display:"flex",
      alignItems:"center",justifyContent:"center",zIndex:300,backdropFilter:"blur(4px)"}}>
      <FormObjetivoAnual anioSugerido={objetivo.anio} valoresIniciales={objetivo}
        onGuardar={async (datos)=>{ await onEditarObjetivo(objetivo.id, datos); setMostrarEdicion(false); }}
        onCancelar={()=>setMostrarEdicion(false)}/>
    </div>}
  </div>;
}
