import { T, Card, Icon } from "../lib/ui.jsx";
import { alertas } from "../lib/especialistas.js";

export default function PanelAlertas({esps,onVer}) {
  const todas=esps.flatMap(e=>alertas(e).map(a=>({...a,esp:e})));
  const grupos=[
    {t:"Urgentes",ico:"alertCircle",items:todas.filter(a=>a.p===0&&a.c===T.rojo)},
    {t:"Rescates",ico:"trendingDown",items:todas.filter(a=>a.ico==="trendingDown")},
    {t:"Sin contacto",ico:"phone",items:todas.filter(a=>a.ico==="phone"||a.ico==="messageCircle")},
    {t:"Inconvenientes",ico:"alertTriangle",items:todas.filter(a=>a.ico==="alertTriangle")},
    {t:"Cierres próximos",ico:"clock",items:todas.filter(a=>a.ico==="clock")},
    {t:"Logros",ico:"award",items:todas.filter(a=>a.p===2)},
  ].filter(g=>g.items.length>0);
  const totalNo=todas.filter(a=>a.p<2).length;

  return <div style={{flex:1,overflowY:"auto",padding:"26px 28px"}}>
    <div style={{marginBottom:22}}>
      <div style={{fontSize:20,fontWeight:900,color:T.t1,letterSpacing:"-.5px",fontFamily:"var(--font-display)"}}>
        {totalNo===0?"Todo en orden":`${totalNo} alerta${totalNo>1?"s":""} activa${totalNo>1?"s":""}`}
      </div>
      <div style={{fontSize:12,color:T.t3,marginTop:3}}>Generadas automáticamente por el estado de cada plan</div>
    </div>
    {grupos.length===0
      ?<Card style={{padding:48,textAlign:"center"}}>
        <div style={{color:T.verde,marginBottom:12,display:"flex",justifyContent:"center"}}><Icon name="check" size={36}/></div>
        <div style={{fontSize:16,fontWeight:700,color:T.t2}}>Sin alertas activas</div>
        <div style={{fontSize:13,color:T.t3,marginTop:6}}>Todos los especialistas están en contacto y en ritmo.</div>
      </Card>
      :<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(380px,1fr))",gap:14}}>
        {grupos.map(g=><div key={g.t}>
          <div style={{fontSize:10,fontWeight:700,color:T.t3,textTransform:"uppercase",
            letterSpacing:".08em",marginBottom:8,display:"flex",alignItems:"center",gap:5}}>
            <Icon name={g.ico} size={11}/> {g.t}</div>
          <Card>
            {g.items.map((a,i)=><div key={i} onClick={()=>onVer(a.esp)}
              style={{display:"flex",gap:12,alignItems:"center",padding:"11px 14px",
                borderBottom:i<g.items.length-1?`1px solid ${T.bd}`:"none",cursor:"pointer"}}
              onMouseEnter={ev=>ev.currentTarget.style.background=T.s3}
              onMouseLeave={ev=>ev.currentTarget.style.background="transparent"}>
              <div style={{width:32,height:32,borderRadius:7,flexShrink:0,background:`${a.c}15`,color:a.c,
                display:"flex",alignItems:"center",justifyContent:"center"}}><Icon name={a.ico} size={15}/></div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontWeight:700,fontSize:13,color:T.t1}}>{a.esp.nombre}</div>
                <div style={{fontSize:11,color:a.c,fontWeight:600,marginTop:1}}>{a.msg}</div>
                <div style={{fontSize:10,color:T.t3,marginTop:1,overflow:"hidden",
                  textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{a.esp.org}</div>
              </div>
              <span style={{color:T.t3,fontSize:14}}>›</span>
            </div>)}
          </Card>
        </div>)}
      </div>}
  </div>;
}
