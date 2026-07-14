import { T, fmt$, pct, BtnP, Card, Num, Barra, Av, Icon } from "../lib/ui.jsx";
import { HOY, sem, dD, velocidadActual, ritmoNecesario, proyeccion, alertas } from "../lib/especialistas.js";
import { Spark, GaugeRitmo, SemTag } from "./Atoms.jsx";

export default function Dashboard({esps,onVer,onNuevo,loadingEsp,errorEsp,oportunidadTotal}) {
  const totP  = esps.reduce((s,e)=>s+e.avance.polizas,0);
  const objP  = esps.reduce((s,e)=>s+e.plan.polizasObj,0);
  const totPr = esps.reduce((s,e)=>s+e.avance.prima,0);
  const objPr = esps.reduce((s,e)=>s+e.plan.primaObj,0);
  const enR   = esps.filter(e=>sem(e).label==="En ritmo").length;
  const atr   = esps.filter(e=>sem(e).label==="Atrasado").length;
  const res   = esps.reduce((s,e)=>s+e.avance.rescates,0);
  const proyG = esps.reduce((s,e)=>s+proyeccion(e),0);
  const todasAl = esps.flatMap(e=>alertas(e).filter(a=>a.p<2).map(a=>({...a,esp:e}))).slice(0,6);

  return <div style={{flex:1,overflowY:"auto",padding:"26px 28px"}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:24}}>
      <div>
        <div style={{fontSize:20,fontWeight:900,color:T.t1,letterSpacing:"-.5px",fontFamily:"var(--font-display)"}}>Dashboard</div>
        <div style={{fontSize:12,color:T.t3,marginTop:3}}>
          {HOY.toLocaleDateString("es-AR",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}
        </div>
      </div>
      <BtnP onClick={onNuevo}>＋ Nuevo especialista</BtnP>
    </div>

    {/* KPI strip */}
    <div style={{display:"grid",gridTemplateColumns:"repeat(6,1fr)",gap:8,marginBottom:20}}>
      {[
        {l:"Pólizas",v:totP,sub:`obj ${objP}`,c:T.t1,   p:pct(totP,objP)},
        {l:"Prima",  v:fmt$(totPr),sub:`obj ${fmt$(objPr)}`,c:T.t1, p:pct(totPr,objPr)},
        {l:"En ritmo",v:enR,sub:`de ${esps.length} esp.`,c:enR>0?T.verde:T.t3,p:null},
        {l:"Atrasados",v:atr,sub:"requieren acción",c:atr>0?T.rojo:T.t3,p:null},
        {l:"Rescates",v:res,sub:"última semana",c:res>0?T.rojo:T.t3,p:null},
        {l:"Oportunidad sin explotar",v:fmt$(oportunidadTotal||0),sub:"fuerza comercial",c:oportunidadTotal>0?T.verde:T.t3,p:null,
          title:"Suma de lo que cada organizador podría generar en prima de retiro si convirtiera su cartera SG+ART al ritmo del mejor organizador del período (índice propio de NEXO, no de FP — ver detalle en su ficha)."},
      ].map(k=>{
        const grande = String(k.v).length>7;
        return <Card key={k.l} title={k.title} style={{padding:"13px 16px",position:"relative",
          border:"1px solid var(--hairline)",cursor:k.title?"help":"default"}}>
        <div style={{fontSize:10,color:T.t3,textTransform:"uppercase",letterSpacing:".07em",marginBottom:8}}>{k.l}</div>
        <Num style={{display:"block",fontSize:grande?16:22,fontWeight:900,color:k.c,
          letterSpacing:grande?"-.3px":"-1px",lineHeight:1}}>{k.v}</Num>
        {k.p!==null&&<div style={{marginTop:7}}>
          <Barra val={k.p} tot={100} color={T.azul} h={4}/>
          <div style={{fontSize:10,color:T.azul,fontWeight:700,marginTop:3}}>{k.p}%</div>
        </div>}
        <div style={{fontSize:10,color:T.t3,marginTop:k.p!==null?0:6}}>{k.sub}</div>
      </Card>;})}
    </div>

    <div style={{display:"grid",gridTemplateColumns:"1fr 340px",gap:16,minWidth:0,overflow:"hidden"}}>
      {/* Tabla principal */}
      <div style={{minWidth:0,overflow:"hidden"}}>
        <div style={{fontSize:11,fontWeight:700,color:T.t3,textTransform:"uppercase",
          letterSpacing:".08em",marginBottom:10}}>Especialistas · progreso del período</div>
        <Card>
          {loadingEsp ? (
            <div style={{padding:24,textAlign:"center",color:T.t3,fontSize:13}}>Cargando especialistas...</div>
          ) : errorEsp ? (
            <div style={{padding:24,textAlign:"center",color:T.rojo,fontSize:13}}>
              Error al cargar especialistas: {errorEsp.message}
            </div>
          ) : esps.length===0 ? (
            <div style={{padding:24,textAlign:"center",color:T.t3,fontSize:13}}>No hay especialistas cargados todavía</div>
          ) : (
          <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",tableLayout:"fixed"}}>
            <thead>
              <tr style={{borderBottom:`1px solid ${T.bd}`}}>
                {["","Especialista","Pólizas","Tendencia","Ritmo","Prima","Estado","Últ. contacto"].map((h,i)=>
                  <th key={i} style={{padding:"9px 12px",textAlign:i>1?"center":"left",
                    fontSize:10,fontWeight:700,color:T.t3,textTransform:"uppercase",
                    letterSpacing:".06em",whiteSpace:"nowrap"}}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {esps.map((e,i)=>{
                const s=sem(e), pp=pct(e.avance.polizas,e.plan.polizasObj);
                const dsc=dD(e.contactos[0]?.fecha);
                const vAct=parseFloat(velocidadActual(e));
                const vNec=parseFloat(ritmoNecesario(e)||0);
                const als=alertas(e).filter(a=>a.p<2);
                return <tr key={e.id} onClick={()=>onVer(e)}
                  style={{borderBottom:i<esps.length-1?`1px solid ${T.bd}`:"none",
                    cursor:"pointer",transition:"background .1s"}}
                  onMouseEnter={ev=>ev.currentTarget.style.background=T.s3}
                  onMouseLeave={ev=>ev.currentTarget.style.background="transparent"}>
                  <td style={{padding:"11px 12px"}}><Av n={e.nombre} color={s.c} size={30}/></td>
                  <td style={{padding:"11px 6px"}}>
                    <div style={{fontWeight:700,fontSize:13,color:T.t1}}>{e.nombre}</div>
                    <div style={{fontSize:10,color:T.t3,marginTop:1,maxWidth:170,overflow:"hidden",
                      textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{e.org}</div>
                  </td>
                  <td style={{padding:"11px 12px",textAlign:"center"}}>
                    <Num style={{display:"block",fontWeight:900,fontSize:15,color:s.c}}>
                      {e.avance.polizas}<span style={{fontSize:10,color:T.t3,fontWeight:400}}>/{e.plan.polizasObj}</span>
                    </Num>
                    <div style={{marginTop:3,width:60,margin:"3px auto 0"}}>
                      <Barra val={pp} tot={100} color={s.c} h={4}/>
                    </div>
                  </td>
                  <td style={{padding:"11px 12px",textAlign:"center"}}>
                    <Spark data={e.historialAvance} color={s.c}/>
                  </td>
                  <td style={{padding:"11px 12px",textAlign:"center"}}>
                    <GaugeRitmo actual={vAct} necesario={vNec} color={s.c}/>
                    <div style={{fontSize:9,color:T.t3,marginTop:1}}>{vAct}/<span style={{color:s.c}}>{vNec}</span> p/sem</div>
                  </td>
                  <td style={{padding:"11px 12px",textAlign:"center",fontSize:12,
                    fontWeight:700,color:T.verde}}>{fmt$(e.avance.prima)}</td>
                  <td style={{padding:"11px 12px",textAlign:"center"}}><SemTag e={e} sm/></td>
                  <td style={{padding:"11px 12px",textAlign:"center"}}>
                    <span style={{fontSize:11,color:dsc>7?T.ambar:T.t3,fontWeight:dsc>7?700:400}}>
                      {e.contactos[0]?`${dsc}d`:"—"}
                    </span>
                    {als.length>0&&<div style={{marginTop:2,display:"flex",justifyContent:"center"}}><Icon name={als[0].ico} color={als[0].c} size={12}/></div>}
                  </td>
                </tr>;
              })}
            </tbody>
          </table></div>
          )}
        </Card>
      </div>

      {/* Panel lateral */}
      <div>
        {/* Proyección */}
        <div style={{fontSize:11,fontWeight:700,color:T.t3,textTransform:"uppercase",
          letterSpacing:".08em",marginBottom:10}}>Proyección al cierre</div>
        <Card style={{padding:16,marginBottom:14}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
            <div>
              <div style={{fontSize:10,color:T.t3,textTransform:"uppercase",letterSpacing:".06em",marginBottom:4}}>
                Ritmo actual → estimación
              </div>
              <Num style={{display:"block",fontSize:32,fontWeight:900,letterSpacing:"-1.5px",
                color:proyG>=objP?T.verde:proyG>=objP*.7?T.ambar:T.rojo}}>
                ~{proyG}
              </Num>
              <div style={{fontSize:11,color:T.t3}}>
                pólizas est. vs <Num style={{color:T.t1,fontWeight:700}}>{objP} obj.</Num>
              </div>
            </div>
            <div style={{textAlign:"center"}}>
              <Num style={{display:"block",fontSize:28,fontWeight:900,
                color:proyG>=objP?T.verde:proyG>=objP*.7?T.ambar:T.rojo}}>
                {pct(proyG,objP)}%
              </Num>
              <div style={{fontSize:9,color:T.t3,textTransform:"uppercase"}}>cumplimiento est.</div>
            </div>
          </div>
          <Barra val={proyG} tot={objP} color={proyG>=objP?T.verde:proyG>=objP*.7?T.ambar:T.rojo} h={8}/>
          <div style={{fontSize:11,color:T.t3,marginTop:8,textAlign:"center",display:"flex",
            alignItems:"center",justifyContent:"center",gap:5}}>
            {proyG>=objP?<><Icon name="check" size={12} color={T.verde}/> El equipo llegaría al objetivo</>
              :<><Icon name="alertTriangle" size={12} color={T.ambar}/> {`Faltan ~${Math.max(0,objP-proyG)} pólizas`}</>}
          </div>
        </Card>

        {/* Alertas rápidas */}
        <div style={{fontSize:11,fontWeight:700,color:T.t3,textTransform:"uppercase",
          letterSpacing:".08em",marginBottom:10}}>Alertas del día</div>
        <Card>
          {todasAl.length===0
            ?<div style={{padding:18,textAlign:"center",color:T.t3,fontSize:12,display:"flex",
                alignItems:"center",justifyContent:"center",gap:6}}><Icon name="check" color={T.verde}/> Sin alertas activas</div>
            :todasAl.map((a,i)=><div key={i} onClick={()=>onVer(a.esp)}
              style={{display:"flex",gap:10,alignItems:"flex-start",padding:"9px 14px",
                borderBottom:i<todasAl.length-1?`1px solid ${T.bd}`:"none",cursor:"pointer"}}
              onMouseEnter={ev=>ev.currentTarget.style.background=T.s3}
              onMouseLeave={ev=>ev.currentTarget.style.background="transparent"}>
              <span style={{flexShrink:0,marginTop:1,color:a.c}}><Icon name={a.ico} size={14}/></span>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:12,fontWeight:700,color:T.t1}}>{a.esp.nombre}</div>
                <div style={{fontSize:11,color:a.c,marginTop:1}}>{a.msg}</div>
              </div>
            </div>)}
        </Card>
      </div>
    </div>
  </div>;
}
