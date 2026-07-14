import { T, fmt$, pct, Barra, Av, Card, Sec, Icon } from "../lib/ui.jsx";
import { sem } from "../lib/especialistas.js";

export default function PanelMetricas({esps,onVer}) {
  const sorted=[...esps].sort((a,b)=>b.avance.polizas-a.avance.polizas);
  const totP=esps.reduce((s,e)=>s+e.avance.polizas,0);
  const objP=esps.reduce((s,e)=>s+e.plan.polizasObj,0);
  const totPr=esps.reduce((s,e)=>s+e.avance.prima,0);
  const objPr=esps.reduce((s,e)=>s+e.plan.primaObj,0);
  const totC=esps.reduce((s,e)=>s+e.avance.comision,0);
  const medals=["#C9A15E","#B8B8C0","#B87333"]; // oro, plata, bronce

  return <div style={{flex:1,overflowY:"auto",padding:"26px 28px"}}>
    <div style={{fontSize:20,fontWeight:900,color:T.t1,letterSpacing:"-.5px",fontFamily:"var(--font-display)",marginBottom:20}}>Métricas del equipo</div>

    {/* Resumen en cards */}
    <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:20}}>
      {[
        {l:"Pólizas totales",v:`${totP} / ${objP}`,sub:`${pct(totP,objP)}% del objetivo`,c:T.azul,bar:[totP,objP]},
        {l:"Prima acumulada",v:fmt$(totPr),sub:`de ${fmt$(objPr)} · ${pct(totPr,objPr)}%`,c:T.azul,bar:[totPr,objPr]},
        {l:"Comisión devengada",v:fmt$(totC),sub:"total del período",c:T.t1,bar:null},
      ].map(k=><Card key={k.l} style={{padding:"16px 18px"}}>
        <div style={{fontSize:10,color:T.t3,textTransform:"uppercase",letterSpacing:".07em",marginBottom:8}}>{k.l}</div>
        <div style={{fontSize:22,fontWeight:900,color:k.c,letterSpacing:"-.5px",marginBottom:6}}>{k.v}</div>
        {k.bar&&<Barra val={k.bar[0]} tot={k.bar[1]} color={k.c} h={6}/>}
        <div style={{fontSize:11,color:T.t3,marginTop:k.bar?4:0}}>{k.sub}</div>
      </Card>)}
    </div>

    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
      {/* Ranking pólizas */}
      <Card style={{padding:18}}>
        <Sec>Ranking · pólizas vigentes</Sec>
        {sorted.map((e,i)=>{
          const s=sem(e), pp=pct(e.avance.polizas,e.plan.polizasObj);
          return <div key={e.id} onClick={()=>onVer(e)}
            style={{display:"flex",alignItems:"center",gap:10,marginBottom:12,cursor:"pointer"}}>
            <div style={{width:20,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,
              color:medals[i]||T.t3,flexShrink:0,fontWeight:700}}>
              {medals[i]?<Icon name="award" size={15} color={medals[i]}/>:i+1}</div>
            <Av n={e.nombre} color={s.c} size={28}/>
            <div style={{flex:1,minWidth:0}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
                <span style={{fontSize:13,color:T.t1,fontWeight:600,overflow:"hidden",
                  textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{e.nombre}</span>
                <span style={{fontSize:13,fontWeight:900,color:s.c,flexShrink:0,marginLeft:8}}>
                  {e.avance.polizas}<span style={{fontSize:10,color:T.t3,fontWeight:400}}>/{e.plan.polizasObj}</span>
                </span>
              </div>
              <Barra val={pp} tot={100} color={s.c} h={5}/>
            </div>
          </div>;
        })}
        <div style={{borderTop:`1px solid ${T.bd}`,paddingTop:12,marginTop:4}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
            <span style={{fontSize:12,color:T.t2}}>Total equipo</span>
            <span style={{fontSize:14,fontWeight:900,color:T.azulL}}>{totP}/{objP} · {pct(totP,objP)}%</span>
          </div>
          <Barra val={totP} tot={objP} color={T.azul} h={7}/>
        </div>
      </Card>

      {/* Ranking prima */}
      <Card style={{padding:18}}>
        <Sec>Ranking · prima mensual</Sec>
        {[...esps].sort((a,b)=>b.avance.prima-a.avance.prima).map(e=>{
          const s=sem(e), pp=pct(e.avance.prima,e.plan.primaObj);
          return <div key={e.id} onClick={()=>onVer(e)}
            style={{display:"flex",alignItems:"center",gap:10,marginBottom:12,cursor:"pointer"}}>
            <Av n={e.nombre} color={s.c} size={28}/>
            <div style={{flex:1,minWidth:0}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
                <span style={{fontSize:13,color:T.t1,fontWeight:600,overflow:"hidden",
                  textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{e.nombre}</span>
                <span style={{fontSize:13,fontWeight:900,color:s.c,flexShrink:0,marginLeft:8}}>
                  {fmt$(e.avance.prima)}
                </span>
              </div>
              <Barra val={pp} tot={100} color={s.c} h={5}/>
            </div>
            <span style={{fontSize:10,color:s.c,fontWeight:700,flexShrink:0,width:30,textAlign:"right"}}>{pp}%</span>
          </div>;
        })}
        <div style={{borderTop:`1px solid ${T.bd}`,paddingTop:12,marginTop:4}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
            <span style={{fontSize:12,color:T.t2}}>Total equipo</span>
            <span style={{fontSize:14,fontWeight:900,color:T.azulL}}>{fmt$(totPr)} · {pct(totPr,objPr)}%</span>
          </div>
          <Barra val={totPr} tot={objPr} color={T.verde} h={7}/>
        </div>
      </Card>
    </div>
  </div>;
}
