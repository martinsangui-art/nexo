import { useState, useEffect } from "react";
import { T, pct, Icon } from "../lib/ui.jsx";
import { sem } from "../lib/especialistas.js";

const NAV_ITEMS = [
  {id:"dashboard",       label:"Dashboard"},
  {id:"equipo",          label:"Equipo"},
  {id:"organizaciones",  label:"Organizaciones"},
  {id:"objetivos",       label:"Mis Objetivos"},
  {id:"alertas",         label:"Alertas"},
  {id:"metricas",        label:"Métricas"},
];

const NAV_ICON_PATHS = {
  dashboard: <>
    <rect className="stroke-part" x="3.5" y="3.5" width="7" height="17" rx="1.5" strokeWidth="1.6"/>
    <rect className="stroke-part" x="13.5" y="3.5" width="7" height="10" rx="1.5" strokeWidth="1.6"/>
    <circle className="fill-part" cx="17" cy="17.5" r="2.3"/>
  </>,
  equipo: <>
    <circle className="stroke-part" cx="9" cy="7.5" r="3" strokeWidth="1.6"/>
    <path className="stroke-part" d="M4 20c0-3.3 2.2-5.7 5-5.7s5 2.4 5 5.7" strokeWidth="1.6" strokeLinecap="round"/>
    <circle className="fill-part" cx="17.5" cy="9" r="1.8"/>
    <path className="stroke-part" d="M15 20c0-2.6 1.1-4.5 2.5-5.3" strokeWidth="1.6" strokeLinecap="round"/>
  </>,
  organizaciones: <>
    <path className="stroke-part" d="M5 20V6.5L12 3l7 3.5V20" strokeWidth="1.6" strokeLinejoin="round"/>
    <path className="stroke-part" d="M9 20v-5h6v5" strokeWidth="1.6"/>
    <circle className="fill-part" cx="12" cy="10.5" r="1.4"/>
  </>,
  objetivos: <>
    <circle className="stroke-part" cx="12" cy="12" r="8" strokeWidth="1.6"/>
    <circle className="stroke-part" cx="12" cy="12" r="4" strokeWidth="1.4"/>
    <circle className="fill-part" cx="12" cy="12" r="1.6"/>
  </>,
  alertas: <>
    <path className="stroke-part" d="M12 3.5c-3 0-5 2.3-5 5.6 0 4.4-1.5 6-2.3 6.9h14.6c-.8-.9-2.3-2.5-2.3-6.9 0-3.3-2-5.6-5-5.6z" strokeWidth="1.6" strokeLinejoin="round"/>
    <path className="stroke-part" d="M9.7 19a2.3 2.3 0 0 0 4.6 0" strokeWidth="1.6"/>
    <circle className="fill-part" cx="17.5" cy="6" r="1.8"/>
  </>,
  metricas: <>
    <path className="stroke-part" d="M4 19V9M9.3 19V5M14.6 19v-7M19.9 19v-4" strokeWidth="1.7" strokeLinecap="round"/>
    <circle className="fill-part" cx="19.9" cy="6.5" r="1.8"/>
  </>,
};

export default function Sidebar({tab,onTab,cnt,esps,onSignOut}) {
  const [colapsado,setColapsado]=useState(()=>localStorage.getItem('nexo-sidebar-colapsado')==='true');
  useEffect(()=>{localStorage.setItem('nexo-sidebar-colapsado',String(colapsado));},[colapsado]);

  return <aside style={{width:colapsado?72:210,flexShrink:0,borderRight:`1px solid ${T.bd}`,
    display:"flex",flexDirection:"column",height:"100vh",position:"sticky",top:0,zIndex:100,userSelect:"none",
    transition:"width .2s ease"}}>
    {/* Logo */}
    <div style={{padding:colapsado?"20px 0 16px":"22px 18px 18px",borderBottom:`1px solid ${T.bd}`}}>
      <div style={{display:"flex",alignItems:"center",gap:colapsado?0:10,
        justifyContent:colapsado?"center":"flex-start"}}>
        <div style={{width:32,height:32,borderRadius:9,flexShrink:0,
          border:"1px solid var(--gold-dim)",
          display:"flex",alignItems:"center",justifyContent:"center",color:"var(--gold-bright)",
          boxShadow:"0 0 12px rgba(201,161,94,0.18)"}}><Icon name="link" size={16}/></div>
        {!colapsado&&<div>
          <div style={{fontSize:17,fontWeight:700,color:T.t1,letterSpacing:".2px",fontFamily:"var(--font-display)"}}>NEXO</div>
          <div style={{fontSize:9,color:T.t3,letterSpacing:".14em",textTransform:"uppercase"}}>Retiro · FP</div>
        </div>}
      </div>
      {onSignOut&&!colapsado&&
        <button onClick={onSignOut} style={{marginTop:14,width:"100%",padding:"7px 10px",
          borderRadius:7,border:`1px solid ${T.bd}`,background:"transparent",
          color:T.t2,fontFamily:"inherit",fontSize:11,fontWeight:600,cursor:"pointer"}}>
          Cerrar sesión
        </button>}
    </div>

    {/* Nav */}
    <nav style={{flex:1,padding:colapsado?"8px 0":"8px"}}>
      {NAV_ITEMS.map(it=>{
        const active=tab===it.id;
        return <div key={it.id} className="nav-item-wrap">
          <button onClick={()=>onTab(it.id)} className={`nav-item${active?" active":""}`} style={{
            display:"flex",alignItems:"center",
            justifyContent:colapsado?"center":"flex-start",
            gap:colapsado?0:10,
            width:colapsado?44:"100%",height:colapsado?44:"auto",
            margin:colapsado?"0 auto 4px":"0 0 2px",
            padding:colapsado?0:"9px 11px",borderRadius:7,border:"none",
            background:active?"var(--gold-dim)":"transparent",
            color:active?"var(--gold-bright)":T.t2,fontFamily:"inherit",fontSize:13,
            fontWeight:active?700:400,cursor:"pointer",textAlign:"left",
            transition:"all .12s"}}>
            <svg viewBox="0 0 24 24" fill="none" style={{width:18,height:18,flexShrink:0}}>
              {NAV_ICON_PATHS[it.id]}
            </svg>
            {!colapsado&&it.label}
            {!colapsado&&it.id==="alertas"&&cnt>0&&
              <span style={{marginLeft:"auto",background:T.rojo,color:"#fff",borderRadius:10,
                fontSize:10,fontWeight:900,padding:"1px 6px",boxShadow:`0 0 8px ${T.rojo}88`}}>{cnt}</span>}
          </button>
          {colapsado&&it.id==="alertas"&&cnt>0&&
            <span style={{position:"absolute",top:2,right:10,background:T.rojo,color:"#fff",borderRadius:8,
              fontSize:9,fontWeight:900,padding:"0 4px",lineHeight:"14px",boxShadow:`0 0 8px ${T.rojo}88`,
              pointerEvents:"none"}}>{cnt}</span>}
          {colapsado&&<span className="nav-tooltip">{it.label}</span>}
        </div>;
      })}
    </nav>

    {/* Mini estado del equipo */}
    {!colapsado&&<div style={{padding:"10px 12px",borderTop:`1px solid ${T.bd}`,margin:"0 8px 8px"}}>
      <div style={{fontSize:9,color:T.t3,textTransform:"uppercase",letterSpacing:".1em",marginBottom:8}}>
        Estado del equipo
      </div>
      {esps.map(e=>{
        const s=sem(e);
        return <div key={e.id} style={{display:"flex",alignItems:"center",gap:7,marginBottom:5}}>
          <span style={{width:6,height:6,borderRadius:"50%",flexShrink:0,background:s.c,
            boxShadow:`0 0 5px ${s.c}88`}}/>
          <span style={{fontSize:11,color:T.t2,flex:1,overflow:"hidden",textOverflow:"ellipsis",
            whiteSpace:"nowrap"}}>{e.nombre.split(" ")[0]}</span>
          <span style={{fontSize:11,fontWeight:700,color:s.c}}>
            {pct(e.avance.polizas,e.plan.polizasObj)}%
          </span>
        </div>;
      })}
    </div>}

    {/* Colapsar/expandir */}
    <div style={{padding:"10px 8px",borderTop:`1px solid ${T.bd}`,display:"flex",
      justifyContent:colapsado?"center":"flex-end",flexShrink:0}}>
      <button onClick={()=>setColapsado(c=>!c)} title={colapsado?"Expandir":"Colapsar"} style={{
        width:28,height:28,borderRadius:"50%",border:`1px solid ${T.bd}`,background:"transparent",
        color:T.t2,cursor:"pointer",fontSize:14,display:"flex",alignItems:"center",
        justifyContent:"center",flexShrink:0}}>
        {colapsado?"›":"‹"}
      </button>
    </div>
  </aside>;
}
