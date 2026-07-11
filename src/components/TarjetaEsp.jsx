import { T, fmt$, pct, Barra, Av, Card, Icon, Num } from "../lib/ui.jsx";
import { sem, alertas, dD, velocidadActual, ritmoNecesario, TIPO_E } from "../lib/especialistas.js";
import { Spark, GaugeRitmo, SemTag } from "./Atoms.jsx";

export default function TarjetaEsp({e,onPress}) {
  const s=sem(e), pp=pct(e.avance.polizas,e.plan.polizasObj);
  const als=alertas(e).filter(a=>a.p<2);
  const dsc=dD(e.contactos[0]?.fecha);
  const vAct=parseFloat(velocidadActual(e));
  const vNec=parseFloat(ritmoNecesario(e)||0);
  return <Card style={{cursor:"pointer",overflow:"hidden",transition:"transform .1s,box-shadow .1s"}}
    onClick={onPress}
    onMouseEnter={ev=>{ev.currentTarget.style.transform="translateY(-2px)";ev.currentTarget.style.boxShadow=`0 8px 24px rgba(0,0,0,.35)`;}}
    onMouseLeave={ev=>{ev.currentTarget.style.transform="translateY(0)";ev.currentTarget.style.boxShadow="none";}}>
    <div style={{height:3,background:s.c}}/>
    <div style={{padding:"14px 16px"}}>
      {/* Header */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
        <div style={{display:"flex",gap:10,alignItems:"center"}}>
          <Av n={e.nombre} color={s.c} size={38}/>
          <div>
            <div style={{fontWeight:800,fontSize:14,color:T.t1}}>{e.nombre}</div>
            <div style={{fontSize:10,color:T.t3,marginTop:1,maxWidth:170,
              overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{e.org}</div>
          </div>
        </div>
        <SemTag e={e} sm/>
      </div>

      {/* Métricas centrales */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12}}>
        {/* Pólizas */}
        <div style={{background:T.s3,borderRadius:8,padding:"10px 12px"}}>
          <div style={{fontSize:9,color:T.t3,textTransform:"uppercase",letterSpacing:".06em",marginBottom:6}}>Pólizas vigentes</div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:6}}>
            <Num style={{fontSize:22,fontWeight:900,color:s.c,letterSpacing:"-1px"}}>{e.avance.polizas}</Num>
            <Num style={{fontSize:11,color:T.t3}}>/ {e.plan.polizasObj}</Num>
          </div>
          <Barra val={pp} tot={100} color={s.c} h={6}/>
          <Num style={{display:"block",fontSize:10,fontWeight:700,color:s.c,marginTop:3}}>{pp}%</Num>
        </div>
        {/* Tendencia + ritmo */}
        <div style={{background:T.s3,borderRadius:8,padding:"10px 12px"}}>
          <div style={{fontSize:9,color:T.t3,textTransform:"uppercase",letterSpacing:".06em",marginBottom:6}}>Tendencia</div>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
            <Spark data={e.historialAvance} color={s.c} w={70} h={26}/>
            <GaugeRitmo actual={vAct} necesario={vNec} color={s.c}/>
          </div>
          <div style={{fontSize:9,color:T.t3}}>
            Vel: <span style={{color:s.c,fontWeight:700}}>{vAct}</span> / nec: {vNec} p/sem
          </div>
        </div>
      </div>

      {/* Prima */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",
        marginBottom:10,padding:"8px 10px",background:T.s3,borderRadius:8}}>
        <div>
          <div style={{fontSize:9,color:T.t3,textTransform:"uppercase",letterSpacing:".06em",marginBottom:2}}>Prima mensual</div>
          <Num style={{display:"block",fontSize:16,fontWeight:900,color:T.verde}}>{fmt$(e.avance.prima)}</Num>
        </div>
        <div style={{textAlign:"right"}}>
          <div style={{fontSize:9,color:T.t3,marginBottom:2}}>obj. {fmt$(e.plan.primaObj)}</div>
          <div style={{fontSize:12,fontWeight:700,color:T.verde}}>{pct(e.avance.prima,e.plan.primaObj)}%</div>
        </div>
      </div>

      {/* Footer: último contacto + alertas */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",
        paddingTop:10,borderTop:`1px solid ${T.bd}`}}>
        <span style={{fontSize:11,color:dsc>7?T.ambar:T.t3,fontWeight:dsc>7?700:400,
          display:"inline-flex",alignItems:"center",gap:4}}>
          {e.contactos[0]?<><Icon name={TIPO_E[e.contactos[0].tipo]||"pin"} size={11}/>{`hace ${dsc}d`}</>:"Sin contactos"}
        </span>
        <span style={{display:"flex",gap:3}}>
          {als.slice(0,3).map((a,i)=><span key={i} title={a.msg}
            style={{display:"inline-flex",background:`${a.c}18`,color:a.c,borderRadius:4,
              padding:"3px 6px",border:`1px solid ${a.c}22`}}><Icon name={a.ico} size={12}/></span>)}
        </span>
      </div>
    </div>
  </Card>;
}
