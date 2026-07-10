import { useState, useMemo, useEffect, useRef } from "react";
import { useAuth } from "./hooks/useAuth";
import { useEspecialistas } from "./hooks/useEspecialistas";
import { useContactos } from "./hooks/useContactos";
import { useOrganizadores } from "./hooks/useOrganizadores";
import { usePolizas } from "./hooks/usePolizas";
import { useOrganizadorCodigos } from "./hooks/useOrganizadorCodigos";
import { useOrganizadorKpis } from "./hooks/useOrganizadorKpis";
import { useUdnObjetivos } from "./hooks/useUdnObjetivos";
import { supabase } from "./lib/supabase";
import { importarPolizasDesdeExcel } from "./lib/importarPolizas";
import { importarSignosDesdeArchivos } from "./lib/importarSignos";
import { calcularIndicePenetracion, calcularOportunidad, calcularFaltantes, ultimoPeriodo } from "./lib/fuerzaComercial";
import Login from "./components/Login";
import FichaOrganizador from "./components/FichaOrganizador";
import PanelObjetivosUDN from "./components/PanelObjetivosUDN";
import { T, fmt$, fmtN, fmtD, fmtDc, pct, inic, Barra, Av, Card, Sec, Inp, BtnP, BtnS, Icon, Num } from "./lib/ui.jsx";

/* ═══════════════════════════════════════════════════════════════════
   NEXO v4.1 — Seguimiento Comercial · Federación Patronal Retiro
   Paleta refinada: azul FP elevado + semánticos únicamente
   Tipografía: Inter Variable (instrumento de precisión)
   Elemento signature: línea superior azul en tarjetas clave
═══════════════════════════════════════════════════════════════════ */

// Inyectar Inter desde Google Fonts
if (typeof document !== "undefined" && !document.getElementById("nexo-font")) {
  const link = document.createElement("link");
  link.id = "nexo-font";
  link.rel = "stylesheet";
  link.href = "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Bodoni+Moda:wght@600;700;900&display=swap";
  document.head.appendChild(link);
  // Reset global para que Inter tome efecto
  const style = document.createElement("style");
  style.textContent = `
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Inter', -apple-system, sans-serif !important; }
    /* Grilla de puntos — elemento ambiente sutil */
    body::before {
      content: '';
      position: fixed; inset: 0; z-index: 0; pointer-events: none;
      background-image: radial-gradient(circle, rgba(201,161,94,0.08) 1px, transparent 1px);
      background-size: 28px 28px;
    }
    /* Números tabulares para datos */
    .num { font-variant-numeric: tabular-nums; }
  `;
  document.head.appendChild(style);
}

// ─── HELPERS (especialista-específicos; T/fmt/Card/etc viven en ./lib/ui.jsx) ──
const HOY   = new Date();
const ds    = (d=0) => { const x=new Date(HOY); x.setDate(HOY.getDate()+d); return x.toISOString().slice(0,10); };
const dH    = d => d?Math.ceil((new Date(d)-HOY)/86400000):null;
const dD    = d => {
  if(!d) return 999;
  const hoyDia = new Date(HOY.getFullYear(),HOY.getMonth(),HOY.getDate());
  const f = new Date(d);
  const fDia = new Date(f.getFullYear(),f.getMonth(),f.getDate());
  return Math.max(0,Math.round((hoyDia-fDia)/86400000));
};

// Semáforo: brecha entre % tiempo consumido y % objetivo alcanzado
const sem = e => {
  const {plan,avance} = e;
  if(!plan.fechaFin||!plan.fechaInicio) return {c:T.t3,bg:T.s3,label:"Sin plan",nivel:3};
  const tot = Math.max((new Date(plan.fechaFin)-new Date(plan.fechaInicio))/86400000,1);
  const pas = Math.max(Math.min((HOY-new Date(plan.fechaInicio))/86400000,tot),0);
  const br  = (pas/tot*100) - pct(avance.polizas,plan.polizasObj);
  if(br>30) return {c:T.rojo, bg:T.rojoS, label:"Atrasado",  nivel:0};
  if(br>10) return {c:T.ambar,bg:T.ambarS,label:"En riesgo", nivel:1};
  return          {c:T.verde,bg:T.verdeS,label:"En ritmo",  nivel:2};
};

// Ritmo necesario para cumplir objetivo
const ritmoNecesario = e => {
  const dr = dH(e.plan.fechaFin);
  if(!dr||dr<=0) return null;
  const faltanPol = Math.max(0,e.plan.polizasObj-e.avance.polizas);
  return (faltanPol/dr*7).toFixed(1); // pólizas/semana necesarias
};

// Velocidad actual (pólizas/semana)
const velocidadActual = e => {
  const h = e.historialAvance;
  if(h.length<2) return 0;
  const ultimo = h[h.length-1];
  const penultimo = h[h.length-2];
  const dias = Math.max((new Date(ultimo.fecha)-new Date(penultimo.fecha))/86400000,1);
  return ((ultimo.polizas-penultimo.polizas)/dias*7).toFixed(1);
};

// Proyección al cierre
const proyeccion = e => {
  const dt  = Math.max(Math.ceil((HOY-new Date(e.plan.fechaInicio))/86400000),1);
  const dtp = Math.max(Math.ceil((new Date(e.plan.fechaFin)-new Date(e.plan.fechaInicio))/86400000),1);
  return Math.round(e.avance.polizas/dt*dtp);
};

// Alertas automáticas
const alertas = e => {
  const r=[], s=sem(e), dsc=dD(e.contactos[0]?.fecha), dr=dH(e.plan.fechaFin);
  if(s.label==="Atrasado")           r.push({p:0,ico:"alertCircle",msg:"Muy atrasado — intervención urgente",    c:T.rojo});
  if(dr!==null&&dr<=0)               r.push({p:0,ico:"zap",msg:"Plan vencido — definir renovación",       c:T.rojo});
  if(e.avance.rescates>0)            r.push({p:0,ico:"trendingDown",msg:`${e.avance.rescates} rescate${e.avance.rescates>1?"s":""} en el período`,c:T.rojo});
  if(dsc>14)                         r.push({p:1,ico:"phone",msg:`Sin contacto hace ${dsc} días`,            c:T.ambar});
  if(dr!==null&&dr>0&&dr<=21)        r.push({p:1,ico:"clock", msg:`Cierre en ${dr} días`,                    c:T.ambar});
  if(e.inconvenientes?.trim()&&dsc>5)r.push({p:1,ico:"alertTriangle",msg:"Inconvenientes sin resolver",             c:T.ambar});
  if(s.label==="En riesgo")          r.push({p:1,ico:"alertCircle",msg:"Ritmo por debajo del objetivo",            c:T.ambar});
  if(pct(e.avance.polizas,e.plan.polizasObj)>=100) r.push({p:2,ico:"award",msg:"Objetivo cumplido",         c:T.verde});
  return r.sort((a,b)=>a.p-b.p);
};

// Completa con valores por defecto los campos que la tabla real de Supabase
// (nombre, zona, activo) todavía no tiene, para que el resto de la UI
// (pensada para el shape de DEMO) no rompa al recibir especialistas reales.
const normalizarEspecialista = e => ({
  ...e,
  org: e.org ?? e.zona ?? "",
  tel: e.tel ?? "",
  email: e.email ?? "",
  notas: e.notas ?? "",
  plan: e.plan ?? {desc:"",fechaInicio:null,fechaFin:null,polizasObj:0,primaObj:0,comPct:0},
  avance: e.avance ?? {polizas:0,prima:0,comision:0,rescates:0,ultimaAct:null},
  historialAvance: e.historialAvance ?? [],
  contactos: e.contactos ?? [],
  inconvenientes: e.inconvenientes ?? "",
  estrategia: e.estrategia ?? "",
  mails: e.mails ?? 0,
});

// DEMO: datos mock originales, comentados — reemplazados por useEspecialistas().
// Se dejan acá por si hace falta volver atrás rápido para revisar diseño visual.
/*
const DEMO = [
  {
    id:1, nombre:"Laura Gómez", org:"ORGANIZACION BIGATTON S.A.",
    tel:"11-2345-6789", email:"lgomez@bigatton.com",
    notas:"Primera experiencia. Muy proactiva, buena llegada con los PAS.",
    plan:{desc:"Plan BBca · Jun-Sep 2026",fechaInicio:ds(-45),fechaFin:ds(45),polizasObj:20,primaObj:2000000,comPct:8},
    avance:{polizas:11,prima:1050000,comision:84000,rescates:0,ultimaAct:ds(-3)},
    historialAvance:[
      {fecha:ds(-42),polizas:2,prima:190000},{fecha:ds(-35),polizas:4,prima:380000},
      {fecha:ds(-28),polizas:6,prima:570000},{fecha:ds(-21),polizas:8,prima:760000},
      {fecha:ds(-14),polizas:9,prima:855000},{fecha:ds(-7),polizas:11,prima:1050000},
    ],
    contactos:[
      {fecha:ds(-3),tipo:"whatsapp",nota:"Confirma 2 pólizas en proceso. Reunión el viernes con MIUNA."},
      {fecha:ds(-11),tipo:"llamada",nota:"Consulta Art. 81. Mandé material."},
      {fecha:ds(-18),tipo:"reunion",nota:"Revisión de estrategia. Foco en PAS con cartera > 5 vigentes."},
    ],
    inconvenientes:"Dificultad para explicar beneficio impositivo del Art. 81 a PAS mayores.",
    estrategia:"Foco en PAS con cartera vigente > 5 pólizas. Presentación institucional en agosto.",
    mails:3,
  },
  {
    id:2, nombre:"Marcos Villalba", org:"FRANZINO WALTER ENRIQUE OMAR",
    tel:"11-5678-9012", email:"mvillalba@franzino.com",
    notas:"Red amplia. Experiencia en vida colectivo.",
    plan:{desc:"Plan GBA Sur · May-Ago 2026",fechaInicio:ds(-60),fechaFin:ds(30),polizasObj:30,primaObj:3600000,comPct:9},
    avance:{polizas:8,prima:640000,comision:57600,rescates:2,ultimaAct:ds(-7)},
    historialAvance:[
      {fecha:ds(-56),polizas:1,prima:80000},{fecha:ds(-49),polizas:3,prima:240000},
      {fecha:ds(-42),polizas:4,prima:320000},{fecha:ds(-35),polizas:5,prima:400000},
      {fecha:ds(-28),polizas:6,prima:480000},{fecha:ds(-21),polizas:7,prima:560000},
      {fecha:ds(-14),polizas:8,prima:640000},{fecha:ds(-7),polizas:8,prima:640000},
    ],
    contactos:[
      {fecha:ds(-8),tipo:"email",nota:"2 rescates. PAS con problemas de cobranza. Necesita seguimiento."},
      {fecha:ds(-15),tipo:"llamada",nota:"Resistencia en productores mayores. Acordamos capacitación."},
      {fecha:ds(-22),tipo:"reunion",nota:"Revisión mensual. Ritmo bajo. Se compromete a 4 pólizas antes del 15."},
    ],
    inconvenientes:"2 rescates. Productores con resistencia. Problemas de cobranza reportados.",
    estrategia:"Capacitación semana próxima. Foco en PAS jóvenes 40-50 años.",
    mails:5,
  },
  {
    id:3, nombre:"Sofía Reyes", org:"SALTA S.A.",
    tel:"11-8901-2345", email:"sreyes@salta.com",
    notas:"Especialista senior. Top performer histórica.",
    plan:{desc:"Plan Salta · Jun-Sep 2026",fechaInicio:ds(-30),fechaFin:ds(60),polizasObj:25,primaObj:2500000,comPct:8.5},
    avance:{polizas:10,prima:980000,comision:83300,rescates:0,ultimaAct:ds(-2)},
    historialAvance:[
      {fecha:ds(-28),polizas:2,prima:196000},{fecha:ds(-21),polizas:5,prima:490000},
      {fecha:ds(-14),polizas:7,prima:686000},{fecha:ds(-7),polizas:9,prima:882000},
      {fecha:ds(-2),polizas:10,prima:980000},
    ],
    contactos:[
      {fecha:ds(-3),tipo:"whatsapp",nota:"Cerró 2 pólizas. Pipeline de 6 prospectos calificados."},
      {fecha:ds(-10),tipo:"llamada",nota:"Pidió material PGU vs Renta Vitalicia."},
    ],
    inconvenientes:"",
    estrategia:"En ritmo. Potenciar referidos. Evaluar empresa mediana de la zona.",
    mails:2,
  },
  {
    id:4, nombre:"Diego Palermo", org:"RECAITE ANGEL ARTURO",
    tel:"11-3456-7890", email:"dpalermo@recaite.com",
    notas:"Nueva incorporación. Motivado pero necesita acompañamiento.",
    plan:{desc:"Plan GBA Norte · Jun-Sep 2026",fechaInicio:ds(-20),fechaFin:ds(70),polizasObj:15,primaObj:1500000,comPct:7},
    avance:{polizas:1,prima:95000,comision:6650,rescates:0,ultimaAct:ds(-5)},
    historialAvance:[
      {fecha:ds(-14),polizas:0,prima:0},{fecha:ds(-7),polizas:1,prima:95000},
    ],
    contactos:[
      {fecha:ds(-6),tipo:"llamada",nota:"1 póliza en 3 semanas. Org no lo acompaña. Prioriza otros productos."},
      {fecha:ds(-13),tipo:"whatsapp",nota:"Pide material. Se lo envié."},
    ],
    inconvenientes:"El organizador no lo acompaña. Situación crítica para el plan.",
    estrategia:"Contactar directamente al organizador. Evaluar continuidad.",
    mails:4,
  },
  {
    id:5, nombre:"Ana Castillo", org:"MORETTI NILO ANGEL",
    tel:"11-6789-0123", email:"acastillo@moretti.com",
    notas:"Plan anterior cumplido. Renovando con nuevo esquema.",
    plan:{desc:"Plan Renovación · Jul-Oct 2026",fechaInicio:ds(-5),fechaFin:ds(85),polizasObj:22,primaObj:2200000,comPct:8},
    avance:{polizas:2,prima:195000,comision:15600,rescates:0,ultimaAct:ds(-1)},
    historialAvance:[{fecha:ds(-1),polizas:2,prima:195000}],
    contactos:[{fecha:ds(-2),tipo:"llamada",nota:"Arranque sólido. 5 reuniones agendadas."}],
    inconvenientes:"",
    estrategia:"Presentación grupal a PAS el próximo martes. Aprovechar cartera existente.",
    mails:1,
  },
];
*/

// Los "id" son los valores válidos que acepta el check constraint
// contactos_canal_check en Supabase — deben ir en minúscula sin tilde.
const TIPOS = [{id:"email",e:"mail",l:"Email"},{id:"whatsapp",e:"messageCircle",l:"WhatsApp"},
               {id:"llamada",e:"phone",l:"Llamada"},{id:"presencial",e:"users",l:"Presencial"},
               {id:"video",e:"video",l:"Video"},{id:"agencia",e:"building",l:"Agencia"},
               {id:"oficina",e:"building",l:"Oficina"},{id:"comision",e:"briefcase",l:"Comisión"}];
const TIPO_E = Object.fromEntries(TIPOS.map(t=>[t.id,t.e]));

// ─── ÁTOMOS (especialista-específicos; Barra/Card/Sec/etc en ./lib/ui.jsx) ──
// Sparkline SVG — visualiza tendencia de pólizas
const Spark = ({data,color,w=80,h=28}) => {
  if(!data||data.length<2) return <span style={{fontSize:11,color:T.t3}}>—</span>;
  const vals = data.map(d=>d.polizas);
  const mn=Math.min(...vals), mx=Math.max(...vals);
  const rng = mx-mn||1;
  const pts = vals.map((v,i)=>{
    const x = (i/(vals.length-1))*(w-4)+2;
    const y = h-2-((v-mn)/rng)*(h-4);
    return `${x},${y}`;
  }).join(" ");
  return <svg width={w} height={h} style={{overflow:"visible"}}>
    <polyline points={pts} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"
      style={{filter:`drop-shadow(0 0 3px ${color}88)`}}/>
    <circle cx={pts.split(" ").pop().split(",")[0]} cy={pts.split(" ").pop().split(",")[1]}
      r={2.5} fill={color}/>
  </svg>;
};

// Gauge de velocidad: qué tan cerca está del ritmo necesario
const GaugeRitmo = ({actual,necesario,color}) => {
  if(!necesario||necesario<=0||!actual||isNaN(actual)||isNaN(necesario)) return <span style={{fontSize:10,color:T.t3}}>—</span>;
  const ratio = Math.min(actual/necesario,1.5);
  const deg   = ratio*180;
  const r=22, cx=28, cy=28;
  const arc = (a) => {
    const rad=(a-90)*Math.PI/180;
    return {x:cx+r*Math.cos(rad),y:cy+r*Math.sin(rad)};
  };
  const s=arc(-90), e=arc(-90+Math.min(deg,180));
  const big = deg>180?1:0;
  return <svg width={56} height={32} style={{flexShrink:0}}>
    <path d={`M${s.x},${s.y} A${r},${r} 0 0 1 ${arc(90).x},${arc(90).y}`}
      fill="none" stroke={T.s4} strokeWidth={5} strokeLinecap="round"/>
    <path d={`M${s.x},${s.y} A${r},${r} 0 ${big} 1 ${e.x},${e.y}`}
      fill="none" stroke={color} strokeWidth={5} strokeLinecap="round"
      style={{filter:`drop-shadow(0 0 4px ${color}66)`}}/>
    <text x={cx} y={cy+2} textAnchor="middle" fontSize={8} fill={color} fontWeight={700}>
      {(actual/necesario*100).toFixed(0)}%
    </text>
  </svg>;
};

const SemTag = ({e,sm}) => {
  const s=sem(e);
  return <span style={{display:"inline-flex",alignItems:"center",gap:4,background:s.bg,color:s.c,
    padding:sm?"2px 8px":"4px 11px",borderRadius:20,fontSize:sm?10:12,fontWeight:800,
    border:`1px solid ${s.c}33`,whiteSpace:"nowrap"}}>
    <span style={{width:6,height:6,borderRadius:"50%",background:s.c,display:"inline-block",
      boxShadow:`0 0 5px ${s.c}`}}/>
    {s.label}
  </span>;
};

// ─── SIDEBAR ─────────────────────────────────────────────────────
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

function Sidebar({tab,onTab,cnt,esps,onSignOut}) {
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

// ─── DASHBOARD ───────────────────────────────────────────────────
function Dashboard({esps,onVer,onNuevo,loadingEsp,errorEsp,oportunidadTotal}) {
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
    <div style={{display:"grid",gridTemplateColumns:"repeat(6,1fr)",gap:10,marginBottom:20}}>
      {[
        {l:"Pólizas",v:totP,sub:`obj ${objP}`,c:T.t1,   p:pct(totP,objP)},
        {l:"Prima",  v:fmt$(totPr),sub:`obj ${fmt$(objPr)}`,c:T.verde, p:pct(totPr,objPr)},
        {l:"En ritmo",v:enR,sub:`de ${esps.length} esp.`,c:T.verde,p:null},
        {l:"Atrasados",v:atr,sub:"requieren acción",c:T.rojo,p:null},
        {l:"Rescates",v:res,sub:"última semana",c:res>0?T.rojo:T.t3,p:null},
        {l:"Oportunidad sin explotar",v:fmt$(oportunidadTotal||0),sub:"fuerza comercial",c:oportunidadTotal>0?T.verde:T.t3,p:null,
          title:"Suma de lo que cada organizador podría generar en prima de retiro si convirtiera su cartera SG+ART al ritmo del mejor organizador del período (índice propio de NEXO, no de FP — ver detalle en su ficha)."},
      ].map(k=>{
        const grande = String(k.v).length>7;
        return <Card key={k.l} title={k.title} style={{padding:"16px 18px",position:"relative",
          border:"1px solid var(--hairline)",cursor:k.title?"help":"default"}}>
        <div style={{fontSize:10,color:T.t3,textTransform:"uppercase",letterSpacing:".07em",marginBottom:8}}>{k.l}</div>
        <Num style={{display:"block",fontSize:grande?18:26,fontWeight:900,color:k.c,
          letterSpacing:grande?"-.3px":"-1px",lineHeight:1}}>{k.v}</Num>
        {k.p!==null&&<div style={{marginTop:7}}>
          <Barra val={k.p} tot={100} color={k.c} h={4}/>
          <div style={{fontSize:10,color:k.c,fontWeight:700,marginTop:3}}>{k.p}%</div>
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

// ─── PANEL EQUIPO ────────────────────────────────────────────────
function PanelEquipo({esps,onVer,onNuevo}) {
  const [busq,setBusq]=useState("");
  const [ord,setOrd]=useState("semaforo");
  const lista = useMemo(()=>{
    let arr=esps.filter(e=>
      e.nombre.toLowerCase().includes(busq.toLowerCase())||
      e.org.toLowerCase().includes(busq.toLowerCase()));
    const order={Atrasado:0,"En riesgo":1,"En ritmo":2,"Sin plan":3};
    if(ord==="semaforo") arr=[...arr].sort((a,b)=>(order[sem(a).label]||9)-(order[sem(b).label]||9));
    if(ord==="polizas")  arr=[...arr].sort((a,b)=>b.avance.polizas-a.avance.polizas);
    if(ord==="prima")    arr=[...arr].sort((a,b)=>b.avance.prima-a.avance.prima);
    if(ord==="contacto") arr=[...arr].sort((a,b)=>dD(b.contactos[0]?.fecha)-dD(a.contactos[0]?.fecha));
    return arr;
  },[esps,busq,ord]);

  return <div style={{flex:1,overflowY:"auto",padding:"26px 28px"}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
      <div style={{fontSize:20,fontWeight:900,color:T.t1,letterSpacing:"-.5px",fontFamily:"var(--font-display)"}}>
        Equipo <span style={{fontSize:14,fontWeight:400,color:T.t3}}>({esps.length})</span>
      </div>
      <div style={{display:"flex",gap:8,alignItems:"center"}}>
        <input placeholder="Buscar..." value={busq} onChange={e=>setBusq(e.target.value)}
          style={{padding:"7px 12px",border:`1.5px solid ${T.bd2}`,borderRadius:8,background:T.s3,
            color:T.t1,fontSize:13,fontFamily:"inherit",outline:"none",width:180}}/>
        <select value={ord} onChange={e=>setOrd(e.target.value)}
          style={{padding:"7px 12px",border:`1.5px solid ${T.bd2}`,borderRadius:8,background:T.s3,
            color:T.t1,fontSize:13,fontFamily:"inherit",outline:"none"}}>
          <option value="semaforo">Por estado</option>
          <option value="polizas">Por pólizas</option>
          <option value="prima">Por prima</option>
          <option value="contacto">Sin contacto</option>
        </select>
        <BtnP onClick={onNuevo}>＋ Nuevo</BtnP>
      </div>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(360px,1fr))",gap:12}}>
      {lista.map(e=><TarjetaEsp key={e.id} e={e} onPress={()=>onVer(e)}/>)}
    </div>
  </div>;
}

function TarjetaEsp({e,onPress}) {
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

// ─── ORGANIZACIONES ──────────────────────────────────────────────
function PanelOrganizaciones({organizadoresConDatos,loading,error,onNuevo,onImportar,importando,onImportarSignos,importandoSignos,faltantes,onVer}) {
  return <div style={{flex:1,overflowY:"auto",padding:"26px 28px"}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
      <div style={{fontSize:20,fontWeight:900,color:T.t1,letterSpacing:"-.5px",fontFamily:"var(--font-display)"}}>
        Organizaciones <span style={{fontSize:14,fontWeight:400,color:T.t3}}>({organizadoresConDatos.length})</span>
      </div>
      <div style={{display:"flex",gap:8}}>
        <BtnS onClick={onImportar} style={{display:"inline-flex",alignItems:"center",gap:6,...(importando?{opacity:.6,pointerEvents:"none"}:{})}}>
          <Icon name="upload" size={13}/> {importando?"Importando...":"Importar pólizas (Excel)"}</BtnS>
        <BtnS onClick={onImportarSignos} style={{display:"inline-flex",alignItems:"center",gap:6,...(importandoSignos?{opacity:.6,pointerEvents:"none"}:{})}}>
          <Icon name="upload" size={13}/> {importandoSignos?"Importando...":"Importar Signos (ZIP o PDF)"}</BtnS>
        <BtnP onClick={onNuevo}>＋ Nueva organización</BtnP>
      </div>
    </div>

    {faltantes.length>0 && <Card style={{padding:"12px 16px",marginBottom:16,borderLeft:`3px solid ${T.ambar}`}}>
      <div style={{fontSize:12,fontWeight:800,color:T.ambar,marginBottom:4,display:"flex",alignItems:"center",gap:6}}>
        <Icon name="alertTriangle" size={13}/> {faltantes.length} organizador{faltantes.length>1?"es":""} con pólizas de retiro sin reporte Signos este período
      </div>
      <div style={{fontSize:11,color:T.t2,lineHeight:1.6}}>
        {faltantes.map(f=>f.razonSocial).join(" · ")} — revisar si falta pedir el reporte o si son productores fuera de la estructura habitual.
      </div>
    </Card>}

    {loading ? (
      <Card style={{padding:48,textAlign:"center"}}>
        <div style={{fontSize:13,color:T.t3}}>Cargando organizaciones...</div>
      </Card>
    ) : error ? (
      <Card style={{padding:48,textAlign:"center"}}>
        <div style={{fontSize:13,color:T.rojo}}>Error al cargar organizaciones: {error.message}</div>
      </Card>
    ) : organizadoresConDatos.length===0 ? (
      <Card style={{padding:48,textAlign:"center"}}>
        <div style={{fontSize:13,color:T.t3}}>No hay organizaciones cargadas todavía</div>
      </Card>
    ) : (
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:12}}>
        {organizadoresConDatos.map(o=>
          <Card key={o.id} style={{padding:"14px 16px",cursor:"pointer"}} onClick={()=>onVer(o)}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8}}>
              <div style={{minWidth:0}}>
                <div style={{fontWeight:800,fontSize:14,color:T.t1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{o.razon_social}</div>
                <div style={{fontSize:11,color:T.t3,marginTop:4}}>{o.zona||"Sin zona"}</div>
              </div>
              {o.enFaltantes && <span title="Sin reporte Signos este período" style={{flexShrink:0,color:T.ambar}}><Icon name="alertTriangle" size={13}/></span>}
            </div>
            {o.primaSgArt!=null && <div style={{marginTop:10,paddingTop:10,borderTop:`1px solid ${T.bd}`,
              display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span title="Índice propio de NEXO: prima de retiro ÷ prima SG+ART (Signos) x 10.000. No es un dato de Federación Patronal — ver detalle en la ficha del organizador." style={{fontSize:10,color:T.t3,cursor:"help",borderBottom:`1px dotted ${T.t3}`}}>Índice <Num>{o.indice ?? "—"}</Num></span>
              {o.oportunidad>0 && <Num style={{fontSize:12,fontWeight:800,color:T.verde}}>{fmt$(o.oportunidad)} oport.</Num>}
            </div>}
          </Card>)}
      </div>
    )}
  </div>;
}

function ModalNuevaOrganizacion({onGuardar,onCerrar}) {
  const [razonSocial,setRazonSocial]=useState("");
  const [zona,setZona]=useState("");
  const Label=({t})=><label style={{display:"block",fontSize:10,color:T.t3,fontWeight:700,
    textTransform:"uppercase",letterSpacing:".06em",marginBottom:4}}>{t}</label>;
  return <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.72)",display:"flex",
    alignItems:"center",justifyContent:"center",zIndex:300,backdropFilter:"blur(4px)"}}>
    <Card style={{borderRadius:13,padding:26,width:440,boxShadow:"0 24px 60px rgba(0,0,0,.55)"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
        <div style={{fontSize:17,fontWeight:900,color:T.t1}}>Nueva organización</div>
        <button onClick={onCerrar} style={{background:T.s3,border:"none",color:T.t2,
          width:26,height:26,borderRadius:"50%",cursor:"pointer",display:"flex",
          alignItems:"center",justifyContent:"center"}}><Icon name="x" size={13}/></button>
      </div>
      <div style={{marginBottom:10}}>
        <Label t="Razón social *"/>
        <Inp value={razonSocial} onChange={setRazonSocial}/>
      </div>
      <div style={{marginBottom:10}}>
        <Label t="Zona"/>
        <Inp value={zona} onChange={setZona} placeholder="Opcional"/>
      </div>
      <div style={{display:"flex",gap:8,marginTop:14,justifyContent:"flex-end"}}>
        <BtnS onClick={onCerrar}>Cancelar</BtnS>
        <BtnP onClick={()=>{if(!razonSocial.trim())return;
          onGuardar({razon_social:razonSocial,zona:zona||null});}}>
          Crear organización</BtnP>
      </div>
    </Card>
  </div>;
}

// ─── ALERTAS ─────────────────────────────────────────────────────
function PanelAlertas({esps,onVer}) {
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

// ─── MÉTRICAS ────────────────────────────────────────────────────
function PanelMetricas({esps,onVer}) {
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
        {l:"Prima acumulada",v:fmt$(totPr),sub:`de ${fmt$(objPr)} · ${pct(totPr,objPr)}%`,c:T.verde,bar:[totPr,objPr]},
        {l:"Comisión devengada",v:fmt$(totC),sub:"total del período",c:T.ambar,bar:null},
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
        {[...esps].sort((a,b)=>b.avance.prima-a.avance.prima).map((e,i)=>{
          const s=sem(e), pp=pct(e.avance.prima,e.plan.primaObj);
          return <div key={e.id} onClick={()=>onVer(e)}
            style={{display:"flex",alignItems:"center",gap:10,marginBottom:12,cursor:"pointer"}}>
            <Av n={e.nombre} color={s.c} size={28}/>
            <div style={{flex:1,minWidth:0}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
                <span style={{fontSize:13,color:T.t1,fontWeight:600,overflow:"hidden",
                  textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{e.nombre}</span>
                <span style={{fontSize:13,fontWeight:900,color:T.verde,flexShrink:0,marginLeft:8}}>
                  {fmt$(e.avance.prima)}
                </span>
              </div>
              <Barra val={pp} tot={100} color={T.verde} h={5}/>
            </div>
            <span style={{fontSize:10,color:T.verde,fontWeight:700,flexShrink:0,width:30,textAlign:"right"}}>{pp}%</span>
          </div>;
        })}
        <div style={{borderTop:`1px solid ${T.bd}`,paddingTop:12,marginTop:4}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
            <span style={{fontSize:12,color:T.t2}}>Total equipo</span>
            <span style={{fontSize:14,fontWeight:900,color:T.verde}}>{fmt$(totPr)} · {pct(totPr,objPr)}%</span>
          </div>
          <Barra val={totPr} tot={objPr} color={T.verde} h={7}/>
        </div>
      </Card>
    </div>
  </div>;
}

// ─── PANEL DETALLE (drawer derecho) ──────────────────────────────
function PanelDetalle({esp,onCerrar,onGuardar,onContacto,organizadores}) {
  const [e,setE]=useState(esp);
  const [tab,setT]=useState("avance");
  const [showC,setSC]=useState(false);
  const [fC,setFC]=useState({tipo:"llamada",nota:""});
  const [showI,setSI]=useState(false);
  const [fI,setFI]=useState(esp.inconvenientes||"");
  const [showE,setSE]=useState(false);
  const [fE,setFE]=useState(esp.estrategia||"");
  const [editPlan,setEP]=useState(false);
  const [fP,setFP]=useState({...esp.plan});
  const [showMail,setSM]=useState(false);
  const [fMail,setFM]=useState({asunto:"",cuerpo:""});
  const [showOrg,setSOrg]=useState(false);
  const [fOrgId,setFOrgId]=useState(esp.organizador_id||"");
  const [fExterno,setFExterno]=useState(esp.es_externo||false);
  const [orgErr,setOrgErr]=useState(null);
  useEffect(()=>{setE(esp);setFI(esp.inconvenientes||"");setFE(esp.estrategia||"");setFP({...esp.plan});
    setFOrgId(esp.organizador_id||"");setFExterno(esp.es_externo||false);setOrgErr(null);},[esp]);

  const sync=u=>{setE(u);onGuardar(u);};
  const guardC=()=>{if(!fC.nota.trim())return;
    sync({...e,contactos:[{fecha:ds(0),tipo:fC.tipo,nota:fC.nota},...e.contactos]});
    onContacto(e.id,{tipo:fC.tipo,nota:fC.nota});
    setFC({tipo:"llamada",nota:""});setSC(false);};
  const guardP=()=>{sync({...e,plan:{...fP,polizasObj:Number(fP.polizasObj),
    primaObj:Number(fP.primaObj),comPct:Number(fP.comPct)}});setEP(false);};
  const guardOrg=()=>{
    if(!fExterno && !fOrgId){setOrgErr('Elegí una organización o marcá "Es externo".');return;}
    setOrgErr(null);
    sync({...e,organizador_id:fExterno?null:fOrgId,es_externo:fExterno});
    setSOrg(false);};
  const enviarMail=()=>{
    window.open(`mailto:${e.email}?subject=${encodeURIComponent(fMail.asunto)}&body=${encodeURIComponent(fMail.cuerpo)}`);
    sync({...e,mails:(e.mails||0)+1,contactos:[{fecha:ds(0),tipo:"email",nota:`Mail: "${fMail.asunto}"`},...e.contactos]});
    onContacto(e.id,{tipo:"email",nota:`Mail: "${fMail.asunto}"`});
    setFM({asunto:"",cuerpo:""});setSM(false);};

  const s=sem(e), pp=pct(e.avance.polizas,e.plan.polizasObj);
  const ppr=pct(e.avance.prima,e.plan.primaObj);
  const dr=dH(e.plan.fechaFin);
  const proy=proyeccion(e);
  const als=alertas(e);
  const vAct=parseFloat(velocidadActual(e));
  const vNec=parseFloat(ritmoNecesario(e)||0);

  const TABS=[["avance","barChart","Avance"],["historial","trendingUp","Historial"],
              ["contactos","phone","Contactos"],["estrategia","target","Estrategia"],["plan","clipboard","Plan"]];

  const TA = ({c,children}) =>
    <textarea value={c.val} onChange={ev=>c.set(ev.target.value)} rows={c.rows||3}
      style={{width:"100%",padding:"9px 11px",border:`1.5px solid ${T.bd2}`,borderRadius:8,
        fontSize:13,fontFamily:"inherit",outline:"none",boxSizing:"border-box",
        background:T.s3,color:T.t1,resize:"none",marginBottom:8}}>
      {children}</textarea>;

  return <div style={{width:420,flexShrink:0,minWidth:0,background:"var(--surface-gradient)",borderLeft:`1px solid ${T.bd}`,
    display:"flex",flexDirection:"column",height:"100vh",overflow:"hidden"}}>

    {/* Header */}
    <div style={{background:"var(--surface-gradient)",borderBottom:`1px solid ${T.bd}`,padding:"18px 18px 14px",flexShrink:0}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
        <div style={{display:"flex",gap:10,alignItems:"center",flex:1,minWidth:0}}>
          <Av n={e.nombre} color={s.c} size={40}/>
          <div style={{minWidth:0}}>
            <div style={{fontWeight:900,fontSize:15,color:T.t1,overflow:"hidden",
              textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{e.nombre}</div>
            <div style={{fontSize:10,color:T.t3,marginTop:2,overflow:"hidden",
              textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{e.org}</div>
            <div style={{marginTop:5}}><SemTag e={e}/></div>
          </div>
        </div>
        <button onClick={onCerrar} style={{background:T.s4,border:"none",color:T.t2,width:26,
          height:26,borderRadius:"50%",cursor:"pointer",display:"flex",
          alignItems:"center",justifyContent:"center",flexShrink:0}}><Icon name="x" size={13}/></button>
      </div>

      {/* 5 KPIs en fila */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:6,marginBottom:10}}>
        {[
          {l:"Pólizas",v:`${e.avance.polizas}/${e.plan.polizasObj}`,p:pp,c:T.azulL},
          {l:"Prima",  v:fmt$(e.avance.prima),p:ppr,c:T.verde},
          {l:"Comisión",v:fmt$(e.avance.comision),p:null,c:T.ambar},
          {l:"Quedan", v:dr!==null?(dr>0?`${dr}d`:"Vcdo"):"—",p:null,c:dr!==null&&dr<21?T.ambar:T.t2},
          {l:"Mails",  v:e.mails||0,p:null,c:T.azulL},
        ].map(k=><Card key={k.l} style={{borderRadius:7,padding:"7px 4px",textAlign:"center"}}>
          <div style={{fontSize:12,fontWeight:900,color:k.c,letterSpacing:"-.3px"}}>{k.v}</div>
          {k.p!==null&&<div style={{margin:"2px 0 1px"}}><Barra val={k.p} tot={100} color={k.c} h={3}/></div>}
          <div style={{fontSize:8,color:T.t3,textTransform:"uppercase",letterSpacing:".05em",
            marginTop:k.p!==null?1:3}}>{k.l}</div>
        </Card>)}
      </div>

      {/* Alertas inline */}
      {als.length>0&&<div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
        {als.map((a,i)=><span key={i} title={a.msg}
          style={{fontSize:10,fontWeight:700,color:a.c,background:`${a.c}15`,
            borderRadius:5,padding:"2px 7px",border:`1px solid ${a.c}22`,whiteSpace:"nowrap"}}>
          {a.ico} {a.msg.slice(0,30)}{a.msg.length>30?"…":""}
        </span>)}
      </div>}
    </div>

    {/* Tabs */}
    <div style={{display:"flex",background:"var(--surface-gradient)",borderBottom:`1px solid ${T.bd}`,flexShrink:0}}>
      {TABS.map(([id,ico,l])=><button key={id} onClick={()=>setT(id)} style={{
        flex:1,padding:"9px 2px",border:"none",background:"transparent",display:"flex",
        flexDirection:"column",alignItems:"center",gap:3,
        fontSize:10,fontWeight:tab===id?800:400,cursor:"pointer",fontFamily:"inherit",
        color:tab===id?T.azulL:T.t3,
        borderBottom:tab===id?`2px solid ${T.azulL}`:"2px solid transparent",whiteSpace:"nowrap"}}>
        <Icon name={ico} size={13}/>{l}</button>)}
    </div>

    {/* Acciones rápidas */}
    <div style={{display:"flex",gap:6,padding:"8px 14px",background:"var(--surface-gradient)",
      borderBottom:`1px solid ${T.bd}`,flexShrink:0,flexWrap:"wrap"}}>
      <BtnP onClick={()=>setSC(!showC)} sm>＋ Contacto</BtnP>
      <BtnP onClick={()=>setSM(!showMail)} color={T.azulL} sm style={{display:"inline-flex",alignItems:"center",gap:5}}><Icon name="mail" size={12}/> Mail</BtnP>
    </div>

    {/* Contenido */}
    <div style={{flex:1,overflowY:"auto",padding:"14px"}}>

      {/* ── AVANCE ── */}
      {tab==="avance"&&<div>
        {showC&&<Card style={{padding:13,marginBottom:13}}>
          <Sec>Registrar contacto</Sec>
          <div style={{display:"flex",gap:5,marginBottom:10,flexWrap:"wrap"}}>
            {TIPOS.map(t=><button key={t.id} onClick={()=>setFC(f=>({...f,tipo:t.id}))}
              style={{display:"inline-flex",alignItems:"center",gap:5,padding:"5px 10px",borderRadius:20,cursor:"pointer",fontFamily:"inherit",
                border:`1.5px solid ${fC.tipo===t.id?T.azul:T.bd2}`,
                background:fC.tipo===t.id?T.azulS:"transparent",
                color:fC.tipo===t.id?T.azulL:T.t2,fontSize:11,fontWeight:700}}>
              <Icon name={t.e} size={12}/> {t.l}</button>)}
          </div>
          <textarea value={fC.nota} onChange={ev=>setFC(f=>({...f,nota:ev.target.value}))} rows={3}
            placeholder="¿Qué hablaron? ¿Próximo paso?"
            style={{width:"100%",padding:"9px 11px",border:`1.5px solid ${T.bd2}`,borderRadius:8,
              fontSize:13,fontFamily:"inherit",outline:"none",boxSizing:"border-box",
              background:T.s3,color:T.t1,resize:"none",marginBottom:8}}/>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:7}}>
            <BtnS onClick={()=>setSC(false)}>Cancelar</BtnS>
            <BtnP onClick={guardC} color={T.verde} style={{display:"inline-flex",alignItems:"center",gap:5}}><Icon name="check" size={12}/> Guardar</BtnP>
          </div>
        </Card>}

        {showMail&&<Card style={{padding:13,marginBottom:13}}>
          <Sec>Redactar mail</Sec>
          <div style={{fontSize:11,color:T.azulL,marginBottom:8}}>Para: {e.email}</div>
          <div style={{marginBottom:8}}><label style={{fontSize:10,color:T.t3,fontWeight:700,
            textTransform:"uppercase",letterSpacing:".06em",display:"block",marginBottom:4}}>Asunto</label>
            <Inp value={fMail.asunto} onChange={v=>setFM(f=>({...f,asunto:v}))}
              placeholder="Seguimiento plan comercial"/>
          </div>
          <div style={{marginBottom:8}}><label style={{fontSize:10,color:T.t3,fontWeight:700,
            textTransform:"uppercase",letterSpacing:".06em",display:"block",marginBottom:4}}>Cuerpo</label>
            <textarea value={fMail.cuerpo} onChange={ev=>setFM(f=>({...f,cuerpo:ev.target.value}))} rows={4}
              style={{width:"100%",padding:"9px 11px",border:`1.5px solid ${T.bd2}`,borderRadius:8,
                fontSize:13,fontFamily:"inherit",outline:"none",boxSizing:"border-box",
                background:T.s3,color:T.t1,resize:"none",marginBottom:8}}/>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:7}}>
            <BtnS onClick={()=>setSM(false)}>Cancelar</BtnS>
            <BtnP onClick={enviarMail} color={T.azulL} style={{display:"inline-flex",alignItems:"center",gap:5}}><Icon name="mail" size={13}/> Abrir en mail</BtnP>
          </div>
        </Card>}

        {/* Pólizas — métrica principal con gráfico */}
        <Card style={{padding:13,marginBottom:10}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:10}}>
            <div>
              <Sec>Pólizas vigentes</Sec>
              <div style={{fontSize:40,fontWeight:900,color:T.azulL,letterSpacing:"-2px",lineHeight:1}}>
                {e.avance.polizas}<span style={{fontSize:16,color:T.t3,fontWeight:400}}>/{e.plan.polizasObj}</span>
              </div>
            </div>
            <div style={{textAlign:"right"}}>
              <Spark data={e.historialAvance} color={T.azulL} w={90} h={36}/>
              <div style={{fontSize:10,color:T.t3,marginTop:4}}>tendencia</div>
            </div>
          </div>
          <Barra val={pp} tot={100} color={T.azul} h={10}/>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginTop:10}}>
            <div style={{textAlign:"center"}}>
              <div style={{fontSize:10,color:T.t3,marginBottom:2}}>Faltan</div>
              <div style={{fontSize:14,fontWeight:700,color:T.t1}}>{Math.max(0,e.plan.polizasObj-e.avance.polizas)}</div>
            </div>
            <div style={{textAlign:"center"}}>
              <div style={{fontSize:10,color:T.t3,marginBottom:2}}>Proyección</div>
              <div style={{fontSize:14,fontWeight:700,color:proy>=e.plan.polizasObj?T.verde:T.ambar}}>~{proy}</div>
            </div>
            <div style={{textAlign:"center"}}>
              <div style={{fontSize:10,color:T.t3,marginBottom:2}}>Vel. actual</div>
              <div style={{fontSize:14,fontWeight:700,color:s.c}}>{vAct}<span style={{fontSize:10,color:T.t3}}>/sem</span></div>
            </div>
          </div>
        </Card>

        {/* Prima + Comisión */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10}}>
          {[
            {l:"Prima mensual",v:fmt$(e.avance.prima),o:fmt$(e.plan.primaObj),p:ppr,c:T.verde},
            {l:"Comisión",v:fmt$(e.avance.comision),
              o:fmt$(Math.round(e.avance.prima*e.plan.comPct/100)),p:null,c:T.ambar},
          ].map(k=><Card key={k.l} style={{padding:11}}>
            <Sec>{k.l}</Sec>
            <div style={{fontSize:18,fontWeight:900,color:k.c,marginBottom:k.p!==null?6:2}}>{k.v}</div>
            {k.p!==null&&<Barra val={k.p} tot={100} color={k.c} h={6}/>}
            <div style={{fontSize:10,color:T.t3,marginTop:4}}>
              {k.p!==null?`${k.p}% de ${k.o}`:`Devengada: ${k.o}`}
            </div>
          </Card>)}
        </div>

        {/* Inconvenientes */}
        <Card style={{padding:13}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
            <Sec style={{marginBottom:0}}>Inconvenientes</Sec>
            <button onClick={()=>setSI(!showI)} style={{fontSize:11,color:T.azulL,background:"transparent",
              border:"none",cursor:"pointer",fontFamily:"inherit",fontWeight:700,
              display:"inline-flex",alignItems:"center",gap:4}}>
              {showI?"Cancelar":<><Icon name="edit" size={11}/> Editar</>}</button>
          </div>
          {showI?<div>
            <textarea value={fI} onChange={ev=>setFI(ev.target.value)} rows={3}
              style={{width:"100%",padding:"9px 11px",border:`1.5px solid ${T.bd2}`,borderRadius:8,
                fontSize:13,fontFamily:"inherit",outline:"none",boxSizing:"border-box",
                background:T.s3,color:T.t1,resize:"none",marginBottom:8}}/>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:7}}>
              <BtnS onClick={()=>{setSI(false);setFI(e.inconvenientes||"");}}>Cancelar</BtnS>
              <BtnP onClick={()=>{sync({...e,inconvenientes:fI});setSI(false);}} color={T.verde}>Guardar</BtnP>
            </div>
          </div>:(e.inconvenientes
            ?<div style={{fontSize:13,color:T.t2,lineHeight:1.6,background:T.rojoS,borderRadius:7,
                padding:"9px 11px",borderLeft:`2px solid ${T.rojo}`}}>{e.inconvenientes}</div>
            :<div style={{fontSize:12,color:T.t3,fontStyle:"italic"}}>Sin inconvenientes registrados</div>)}
        </Card>

        <div style={{textAlign:"right",fontSize:10,color:T.t3,marginTop:8}}>
          Última act: {fmtD(e.avance.ultimaAct)}
        </div>
      </div>}

      {/* ── HISTORIAL ── */}
      {tab==="historial"&&<Card style={{padding:13}}>
        <Sec>Evolución semanal</Sec>
        {e.historialAvance.length===0
          ?<div style={{textAlign:"center",color:T.t3,padding:"20px 0",fontSize:12}}>Sin historial aún.</div>
          :[...e.historialAvance].reverse().map((h,i,arr)=>{
            const prev=arr[i+1];
            const dP=prev?h.polizas-prev.polizas:h.polizas;
            const dPr=prev?h.prima-prev.prima:h.prima;
            return <div key={i} style={{paddingBottom:12,marginBottom:12,
              borderBottom:i<arr.length-1?`1px solid ${T.bd}`:"none"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:7}}>
                <span style={{fontSize:11,fontWeight:700,color:T.azulL}}>Import del {fmtDc(h.fecha)}</span>
                {dP>0&&<span style={{fontSize:10,fontWeight:800,color:T.verde,background:T.verdeS,
                  borderRadius:5,padding:"1px 7px"}}>+{dP} póliza{dP>1?"s":""}</span>}
                {dP<0&&<span style={{fontSize:10,fontWeight:800,color:T.rojo,background:T.rojoS,
                  borderRadius:5,padding:"1px 7px"}}>{dP} (rescates)</span>}
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6}}>
                {[
                  {l:"Pólizas",v:h.polizas,d:dP,c:T.azulL},
                  {l:"Prima",v:fmt$(h.prima),d:dPr,c:T.verde,fmt:true},
                  {l:"% obj.",v:`${pct(h.polizas,e.plan.polizasObj)}%`,d:null,c:T.ambar},
                ].map(m=><Card key={m.l} style={{borderRadius:7,padding:8,textAlign:"center"}}>
                  <div style={{fontSize:13,fontWeight:900,color:m.c}}>{m.v}</div>
                  {m.d!==null&&m.d!==0&&<div style={{fontSize:9,color:m.d>0?T.verde:T.rojo,fontWeight:700}}>
                    {m.d>0?"+":""}{m.fmt?fmt$(m.d):m.d}</div>}
                  <div style={{fontSize:8,color:T.t3,textTransform:"uppercase",marginTop:2}}>{m.l}</div>
                </Card>)}
              </div>
            </div>;
          })}
      </Card>}

      {/* ── CONTACTOS ── */}
      {tab==="contactos"&&<Card style={{padding:13}}>
        <Sec>Historial de contactos ({e.contactos.length})</Sec>
        {e.contactos.length===0&&<div style={{textAlign:"center",color:T.t3,padding:"16px 0",fontSize:12}}>Sin contactos</div>}
        {e.contactos.map((c,i)=>{
          const t=TIPOS.find(x=>x.id===c.tipo);
          return <div key={i} style={{display:"flex",gap:10,padding:"10px 0",
            borderBottom:i<e.contactos.length-1?`1px solid ${T.bd}`:"none",alignItems:"flex-start"}}>
            <div style={{width:32,height:32,borderRadius:7,background:T.s3,flexShrink:0,color:T.azulL,
              display:"flex",alignItems:"center",justifyContent:"center"}}><Icon name={t?.e||"pin"} size={15}/></div>
            <div style={{flex:1}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:3,alignItems:"center"}}>
                <span style={{fontSize:11,fontWeight:700,color:T.azulL}}>{t?.l||c.tipo}</span>
                <span style={{fontSize:10,color:T.t3}}>{fmtDc(c.fecha)}</span>
              </div>
              <div style={{fontSize:12,color:T.t2,lineHeight:1.5}}>{c.nota}</div>
            </div>
          </div>;
        })}
      </Card>}

      {/* ── ESTRATEGIA ── */}
      {tab==="estrategia"&&<div>
        <Card style={{padding:13,marginBottom:10}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
            <Sec style={{marginBottom:0}}>Organización</Sec>
            <button onClick={()=>setSOrg(!showOrg)} style={{fontSize:11,color:T.azulL,background:"transparent",
              border:"none",cursor:"pointer",fontFamily:"inherit",fontWeight:700,
              display:"inline-flex",alignItems:"center",gap:4}}>
              {showOrg?"Cancelar":<><Icon name="edit" size={11}/> Editar</>}</button>
          </div>
          {showOrg?<div>
            <select value={fOrgId} disabled={fExterno} onChange={ev=>setFOrgId(ev.target.value)}
              style={{width:"100%",padding:"9px 11px",border:`1.5px solid ${T.bd2}`,borderRadius:8,fontSize:13,
                fontFamily:"inherit",outline:"none",boxSizing:"border-box",background:fExterno?T.s4:T.s3,
                color:fExterno?T.t3:T.t1,opacity:fExterno?.6:1,marginBottom:8}}>
              <option value="">Seleccionar organización...</option>
              {organizadores.map(o=><option key={o.id} value={o.id}>{o.razon_social}</option>)}
            </select>
            <label style={{display:"flex",alignItems:"center",gap:7,marginBottom:8,cursor:"pointer"}}>
              <input type="checkbox" checked={fExterno}
                onChange={ev=>{const v=ev.target.checked;setFExterno(v);if(v)setFOrgId("");}}/>
              <span style={{fontSize:12,color:T.t2}}>Es externo (sin organización)</span>
            </label>
            {orgErr&&<div style={{fontSize:11,color:T.rojo,marginBottom:8}}>{orgErr}</div>}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:7}}>
              <BtnS onClick={()=>{setSOrg(false);setFOrgId(e.organizador_id||"");setFExterno(e.es_externo||false);setOrgErr(null);}}>Cancelar</BtnS>
              <BtnP onClick={guardOrg} color={T.verde} style={{display:"inline-flex",alignItems:"center",gap:5}}><Icon name="check" size={12}/> Guardar</BtnP>
            </div>
          </div>:(e.es_externo
            ?<div style={{fontSize:12,color:T.t2,display:"flex",alignItems:"center",gap:5}}>
              <span style={{width:5,height:5,borderRadius:"50%",background:T.t2,display:"inline-block"}}/>
              Externo (sin organización)</div>
            :<div style={{fontSize:12,color:T.t2}}>
              {organizadores.find(o=>o.id===e.organizador_id)?.razon_social || "Sin asignar"}
            </div>)}
        </Card>
        <Card style={{padding:13,marginBottom:10}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
            <Sec style={{marginBottom:0}}>Estrategia acordada</Sec>
            <button onClick={()=>setSE(!showE)} style={{fontSize:11,color:T.azulL,background:"transparent",
              border:"none",cursor:"pointer",fontFamily:"inherit",fontWeight:700,
              display:"inline-flex",alignItems:"center",gap:4}}>
              {showE?"Cancelar":<><Icon name="edit" size={11}/> Editar</>}</button>
          </div>
          {showE?<div>
            <textarea value={fE} onChange={ev=>setFE(ev.target.value)} rows={5}
              style={{width:"100%",padding:"9px 11px",border:`1.5px solid ${T.bd2}`,borderRadius:8,
                fontSize:13,fontFamily:"inherit",outline:"none",boxSizing:"border-box",
                background:T.s3,color:T.t1,resize:"none",marginBottom:8}}
              placeholder="Estrategia acordada con el especialista..."/>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:7}}>
              <BtnS onClick={()=>{setSE(false);setFE(e.estrategia||"");}}>Cancelar</BtnS>
              <BtnP onClick={()=>{sync({...e,estrategia:fE});setSE(false);}} color={T.verde}>Guardar</BtnP>
            </div>
          </div>:(e.estrategia
            ?<div style={{fontSize:13,color:T.t2,lineHeight:1.7}}>{e.estrategia}</div>
            :<div style={{fontSize:12,color:T.t3,fontStyle:"italic"}}>Sin estrategia definida</div>)}
        </Card>
        <Card style={{padding:13}}>
          <Sec>Datos de contacto</Sec>
          {[["phone","Teléfono",e.tel],["mail","Email",e.email]].map(([ico,l,v])=>
            <div key={l} style={{display:"flex",justifyContent:"space-between",
              padding:"7px 0",borderBottom:`1px solid ${T.bd}`}}>
              <span style={{fontSize:11,color:T.t3,display:"flex",alignItems:"center",gap:5}}><Icon name={ico} size={11}/>{l}</span>
              <span style={{fontSize:12,fontWeight:600,color:T.t1}}>{v||"—"}</span>
            </div>)}
          {e.notas&&<div style={{fontSize:12,color:T.t2,lineHeight:1.6,marginTop:10}}>{e.notas}</div>}
        </Card>
      </div>}

      {/* ── PLAN ── */}
      {tab==="plan"&&<Card style={{padding:13}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
          <Sec style={{marginBottom:0}}>Plan comercial</Sec>
          <button onClick={()=>setEP(!editPlan)} style={{fontSize:11,color:T.azulL,background:"transparent",
            border:"none",cursor:"pointer",fontFamily:"inherit",fontWeight:700,
            display:"inline-flex",alignItems:"center",gap:4}}>
            {editPlan?"Cancelar":<><Icon name="edit" size={11}/> Editar</>}</button>
        </div>
        {editPlan?<div>
          <div style={{marginBottom:8}}><label style={{fontSize:10,color:T.t3,fontWeight:700,textTransform:"uppercase",
            letterSpacing:".06em",display:"block",marginBottom:4}}>Descripción</label>
            <Inp value={fP.desc} onChange={v=>setFP(f=>({...f,desc:v}))}/></div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
            <div><label style={{fontSize:10,color:T.t3,fontWeight:700,textTransform:"uppercase",letterSpacing:".06em",display:"block",marginBottom:4}}>Inicio</label>
              <Inp type="date" value={fP.fechaInicio} onChange={v=>setFP(f=>({...f,fechaInicio:v}))}/></div>
            <div><label style={{fontSize:10,color:T.t3,fontWeight:700,textTransform:"uppercase",letterSpacing:".06em",display:"block",marginBottom:4}}>Fin</label>
              <Inp type="date" value={fP.fechaFin} onChange={v=>setFP(f=>({...f,fechaFin:v}))}/></div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:10}}>
            {[["Obj. pólizas","polizasObj"],["Obj. prima ($)","primaObj"],["Comisión (%)","comPct"]].map(([l,k])=>
              <div key={k}><label style={{fontSize:10,color:T.t3,fontWeight:700,textTransform:"uppercase",
                letterSpacing:".06em",display:"block",marginBottom:4}}>{l}</label>
                <Inp type="number" value={fP[k]} onChange={v=>setFP(f=>({...f,[k]:v}))}/></div>)}
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:7}}>
            <BtnS onClick={()=>setEP(false)}>Cancelar</BtnS>
            <BtnP onClick={guardP} color={T.verde} style={{display:"inline-flex",alignItems:"center",gap:5}}><Icon name="check" size={12}/> Guardar</BtnP>
          </div>
        </div>:<div>
          <div style={{background:T.azulS,borderRadius:8,padding:"9px 11px",marginBottom:12,
            border:`1px solid ${T.azul}22`}}>
            <div style={{fontSize:12,fontWeight:700,color:T.azulL}}>{e.plan.desc||"Sin descripción"}</div>
          </div>
          {[
            ["calendar","Inicio",fmtD(e.plan.fechaInicio)],
            ["flag","Vencimiento",fmtD(e.plan.fechaFin)],
            ["fileText","Objetivo",`${e.plan.polizasObj} pólizas`],
            ["dollarSign","Prima obj.",fmt$(e.plan.primaObj)],
            ["dollarSign","Comisión",`${e.plan.comPct}%`],
            ["clock","Días restantes",dr!==null?(dr>0?`${dr} días`:"Vencido"):"—"],
          ].map(([ico,l,v])=><div key={l} style={{display:"flex",justifyContent:"space-between",
            padding:"7px 0",borderBottom:`1px solid ${T.bd}`}}>
            <span style={{fontSize:11,color:T.t3,display:"flex",alignItems:"center",gap:5}}><Icon name={ico} size={11}/>{l}</span>
            <Num style={{fontSize:12,fontWeight:700,color:T.t1}}>{v}</Num>
          </div>)}
          <Card style={{padding:12,marginTop:12,textAlign:"center"}}>
            <div style={{fontSize:9,color:T.t3,textTransform:"uppercase",letterSpacing:".07em",marginBottom:4}}>
              Proyección al ritmo actual
            </div>
            <div style={{fontSize:24,fontWeight:900,color:proy>=e.plan.polizasObj?T.verde:T.ambar}}>
              ~{proy} pólizas
            </div>
            <div style={{fontSize:11,color:T.t3,marginTop:4,display:"flex",alignItems:"center",
              justifyContent:"center",gap:5}}>
              {proy>=e.plan.polizasObj?<><Icon name="check" size={11} color={T.verde}/> Va a llegar al objetivo</>
                :<><Icon name="alertTriangle" size={11} color={T.ambar}/> {`Falta acelerar — ${e.plan.polizasObj-proy} diferencia`}</>}
            </div>
          </Card>
        </div>}
      </Card>}
    </div>
  </div>;
}

// ─── MODAL NUEVO ─────────────────────────────────────────────────
function ModalNuevo({onGuardar,onCerrar,organizadores}) {
  const [f,setF]=useState({nombre:"",org:"",tel:"",email:"",notas:"",
    organizadorId:"",esExterno:false,
    plan:{desc:"",fechaInicio:ds(0),fechaFin:"",polizasObj:"",primaObj:"",comPct:""}});
  const [orgErr,setOrgErr]=useState(null);
  const sp=(k,v)=>setF(x=>({...x,plan:{...x.plan,[k]:v}}));
  const si=(k,v)=>setF(x=>({...x,[k]:v}));
  const Label=({t})=><label style={{display:"block",fontSize:10,color:T.t3,fontWeight:700,
    textTransform:"uppercase",letterSpacing:".06em",marginBottom:4}}>{t}</label>;
  return <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.72)",display:"flex",
    alignItems:"center",justifyContent:"center",zIndex:300,backdropFilter:"blur(4px)"}}>
    <Card style={{borderRadius:13,padding:26,width:540,maxHeight:"88vh",
      overflow:"hidden",display:"flex",flexDirection:"column",
      boxShadow:"0 24px 60px rgba(0,0,0,.55)"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
        <div style={{fontSize:17,fontWeight:900,color:T.t1}}>Nuevo especialista</div>
        <button onClick={onCerrar} style={{background:T.s3,border:"none",color:T.t2,
          width:26,height:26,borderRadius:"50%",cursor:"pointer",display:"flex",
          alignItems:"center",justifyContent:"center"}}><Icon name="x" size={13}/></button>
      </div>
      <div style={{overflowY:"auto",flex:1,paddingRight:4}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
          <div><Label t="Nombre completo *"/><Inp value={f.nombre} onChange={v=>si("nombre",v)}/></div>
          <div><Label t="Organización"/><Inp value={f.org} onChange={v=>si("org",v)} placeholder="Tal como figura en el sistema"/></div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
          <div><Label t="Teléfono"/><Inp type="tel" value={f.tel} onChange={v=>si("tel",v)}/></div>
          <div><Label t="Email"/><Inp type="email" value={f.email} onChange={v=>si("email",v)}/></div>
        </div>
        <div style={{marginBottom:10}}><Label t="Notas"/>
          <textarea value={f.notas} onChange={ev=>si("notas",ev.target.value)} rows={2}
            style={{width:"100%",padding:"9px 11px",border:`1.5px solid ${T.bd2}`,borderRadius:8,
              fontSize:13,fontFamily:"inherit",outline:"none",boxSizing:"border-box",
              background:T.s3,color:T.t1,resize:"none"}}
            placeholder="Perfil, experiencia, observaciones..."/>
        </div>
        <div style={{marginBottom:10}}>
          <Label t="Organización real *"/>
          <select value={f.organizadorId} disabled={f.esExterno}
            onChange={ev=>si("organizadorId",ev.target.value)}
            style={{width:"100%",padding:"9px 11px",border:`1.5px solid ${T.bd2}`,borderRadius:8,fontSize:13,
              fontFamily:"inherit",outline:"none",boxSizing:"border-box",background:f.esExterno?T.s4:T.s3,
              color:f.esExterno?T.t3:T.t1,opacity:f.esExterno?.6:1}}>
            <option value="">Seleccionar organización...</option>
            {organizadores.map(o=><option key={o.id} value={o.id}>{o.razon_social}</option>)}
          </select>
          <label style={{display:"flex",alignItems:"center",gap:7,marginTop:8,cursor:"pointer"}}>
            <input type="checkbox" checked={f.esExterno}
              onChange={ev=>{const v=ev.target.checked;si("esExterno",v);if(v)si("organizadorId","");}}/>
            <span style={{fontSize:12,color:T.t2}}>Es externo (sin organización)</span>
          </label>
          {orgErr&&<div style={{fontSize:11,color:T.rojo,marginTop:6}}>{orgErr}</div>}
        </div>
        <div style={{height:1,background:T.bd,margin:"4px 0 14px"}}/>
        <div style={{fontSize:10,fontWeight:800,color:T.azulL,textTransform:"uppercase",
          letterSpacing:".1em",marginBottom:12}}>Plan comercial</div>
        <div style={{marginBottom:10}}><Label t="Descripción"/>
          <Inp value={f.plan.desc} onChange={v=>sp("desc",v)} placeholder="Plan BBca · Jun-Sep 2026"/></div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
          <div><Label t="Fecha inicio"/><Inp type="date" value={f.plan.fechaInicio} onChange={v=>sp("fechaInicio",v)}/></div>
          <div><Label t="Fecha fin"/><Inp type="date" value={f.plan.fechaFin} onChange={v=>sp("fechaFin",v)}/></div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:10}}>
          <div><Label t="Obj. pólizas"/><Inp type="number" value={f.plan.polizasObj} onChange={v=>sp("polizasObj",v)}/></div>
          <div><Label t="Obj. prima ($)"/><Inp type="number" value={f.plan.primaObj} onChange={v=>sp("primaObj",v)}/></div>
          <div><Label t="Comisión (%)"/><Inp type="number" value={f.plan.comPct} onChange={v=>sp("comPct",v)}/></div>
        </div>
      </div>
      <div style={{display:"flex",gap:8,marginTop:14,justifyContent:"flex-end"}}>
        <BtnS onClick={onCerrar}>Cancelar</BtnS>
        <BtnP onClick={()=>{
          if(!f.nombre)return;
          if(!f.esExterno && !f.organizadorId){setOrgErr('Elegí una organización o marcá "Es externo".');return;}
          setOrgErr(null);
          onGuardar({...f,id:Date.now(),inconvenientes:"",
          estrategia:"",mails:0,contactos:[],historialAvance:[],
          avance:{polizas:0,prima:0,comision:0,rescates:0,ultimaAct:null},
          organizador_id:f.esExterno?null:f.organizadorId,
          es_externo:f.esExterno,
          plan:{...f.plan,polizasObj:Number(f.plan.polizasObj)||0,
            primaObj:Number(f.plan.primaObj)||0,comPct:Number(f.plan.comPct)||0}});}}>
          Crear especialista</BtnP>
      </div>
    </Card>
  </div>;
}

// ─── APP ROOT ─────────────────────────────────────────────────────
export default function App() {
  const { user, loading: authLoading, signOut } = useAuth();
  const { especialistas, loading: espLoading, error: espError, refetch } = useEspecialistas();
  const { contactos: contactosDB, refetch: refetchContactos } = useContactos();
  const { organizadores, loading: orgLoading, error: orgError, agregarOrganizador, refetch: refetchOrganizadores } = useOrganizadores();
  const { polizas, refetch: refetchPolizas } = usePolizas();
  const { organizadorCodigos, refetch: refetchOrganizadorCodigos } = useOrganizadorCodigos();
  const { organizadorKpis, refetch: refetchOrganizadorKpis } = useOrganizadorKpis();
  const { objetivos: udnObjetivos, avanceMensual: udnAvanceMensual, loading: udnLoading, error: udnError,
    crearObjetivoAnual, editarObjetivoAnual, guardarAvanceMensual } = useUdnObjetivos();
  const [esps,setEsps]=useState([]);
  const [tab,setTab]=useState("dashboard");
  const [selec,setSelec]=useState(null);
  const [selecOrg,setSelecOrg]=useState(null);
  const [showN,setShowN]=useState(false);
  const [showOrgN,setShowOrgN]=useState(false);
  const [toast,setToast]=useState(null);
  const [importando,setImportando]=useState(false);
  const [importandoSignos,setImportandoSignos]=useState(false);
  const fileImportRef=useRef(null);
  const fileSignosRef=useRef(null);

  // Cruce Signos ↔ pólizas de retiro (sección 5 de la spec de Fuerza Comercial):
  // índice de penetración, oportunidad en pesos y detección de organizadores
  // sin reporte Signos en el período más reciente.
  const periodoActual = useMemo(()=>ultimoPeriodo(organizadorKpis),[organizadorKpis]);

  const datosPorOrganizador = useMemo(()=>{
    const mapa = new Map();
    for(const o of organizadores) mapa.set(o.id,{primaSgArt:null,primaRetiro:0,indice:null,oportunidad:0,codigos:[]});
    for(const c of organizadorCodigos){
      const e = mapa.get(c.organizador_id);
      if(e) e.codigos.push(c);
    }
    for(const p of polizas){
      if(p.organizador_id==null) continue;
      const e = mapa.get(p.organizador_id);
      if(e) e.primaRetiro += Number(p.premio_anualizado)||0;
    }
    if(periodoActual){
      for(const k of organizadorKpis){
        if(k.periodo!==periodoActual||k.ramo!=="generales_art"||k.tipo_reporte!=="organizador") continue;
        const e = mapa.get(k.organizador_id);
        if(e) e.primaSgArt = k.prima_anualizada;
      }
    }
    let indiceBenchmark = 0;
    for(const e of mapa.values()){
      if(e.primaSgArt>0){
        e.indice = calcularIndicePenetracion(e.primaRetiro,e.primaSgArt);
        if(e.indice>indiceBenchmark) indiceBenchmark = e.indice;
      }
    }
    for(const e of mapa.values()){
      if(e.primaSgArt>0) e.oportunidad = calcularOportunidad(e.primaSgArt,indiceBenchmark,e.primaRetiro);
    }
    return { mapa, indiceBenchmark };
  },[organizadores,organizadorCodigos,organizadorKpis,polizas,periodoActual]);

  const faltantes = useMemo(()=>{
    if(!periodoActual) return [];
    const cubiertos = new Set(organizadorKpis.filter(k=>k.periodo===periodoActual).map(k=>k.organizador_id));
    const codigosCubiertos = organizadorCodigos.filter(c=>cubiertos.has(c.organizador_id)).map(c=>c.codigo_signos);
    return calcularFaltantes({polizas,organizadorCodigos,codigosCubiertos}).map(f=>({
      ...f,
      razonSocial: organizadores.find(o=>o.id===f.organizadorId)?.razon_social || "?",
    }));
  },[polizas,organizadorCodigos,organizadorKpis,organizadores,periodoActual]);

  const faltantesOrgIds = useMemo(()=>new Set(faltantes.map(f=>f.organizadorId)),[faltantes]);

  const organizadoresConDatos = useMemo(()=>{
    const {mapa} = datosPorOrganizador;
    return [...organizadores]
      .map(o=>({...o, ...(mapa.get(o.id)||{}), enFaltantes:faltantesOrgIds.has(o.id)}))
      .sort((a,b)=>(b.oportunidad||0)-(a.oportunidad||0) || a.razon_social.localeCompare(b.razon_social));
  },[organizadores,datosPorOrganizador,faltantesOrgIds]);

  const oportunidadTotal = useMemo(()=>
    [...datosPorOrganizador.mapa.values()].reduce((s,e)=>s+(e.oportunidad||0),0),
  [datosPorOrganizador]);

  useEffect(()=>{
    const conContactosReales = especialistas.map(e=>({
      ...e,
      contactos: contactosDB
        .filter(c=>c.especialista_id===e.id)
        .map(c=>({fecha:c.fecha, tipo:c.canal, nota:c.notas})),
    }));
    setEsps(conContactosReales.map(normalizarEspecialista));
  },[especialistas,contactosDB]);

  const cntAlertas=useMemo(()=>
    esps.flatMap(e=>alertas(e)).filter(a=>a.p<2).length,[esps]);

  const showToast=(ico,msg)=>{setToast({ico,msg});setTimeout(()=>setToast(null),3000);};

  async function agregarContacto(especialistaId, {tipo, nota}) {
    const { error } = await supabase
      .from('contactos')
      .insert([{
        especialista_id: especialistaId,
        canal: tipo,
        notas: nota,
        fecha: new Date().toISOString(),
        profile_id: user.id,
      }]);

    if (error) {
      console.error('Error al registrar contacto:', error);
      alert('No se pudo registrar el contacto: ' + error.message);
      return;
    }

    refetchContactos();
  }

  async function guardar(especialistaActualizado) {
    const { id, nombre, zona, activo, organizador_id, es_externo } = especialistaActualizado;
    const { error } = await supabase
      .from('especialistas')
      .update({ nombre, zona, activo, organizador_id, es_externo })
      .eq('id', id);

    if (error) {
      console.error('Error al guardar cambios:', error);
      alert('No se pudo guardar: ' + error.message);
      return;
    }

    if (selec?.id === id) setSelec(especialistaActualizado);
    refetch();
  }

  async function agregar(datosNuevoEspecialista) {
    const { data, error } = await supabase
      .from('especialistas')
      .insert([{
        nombre: datosNuevoEspecialista.nombre,
        zona: datosNuevoEspecialista.zona,
        activo: true,
        profile_id: user.id,
        organizador_id: datosNuevoEspecialista.organizador_id,
        es_externo: datosNuevoEspecialista.es_externo,
      }])
      .select();

    if (error) {
      console.error('Error al agregar especialista:', error);
      alert('No se pudo guardar: ' + error.message);
      return;
    }

    setShowN(false);
    showToast("check",`${datosNuevoEspecialista.nombre} agregado`);
    refetch();
  }

  async function crearOrganizacion(datosNuevaOrg) {
    const { error } = await agregarOrganizador(datosNuevaOrg);

    if (error) {
      console.error('Error al agregar organización:', error);
      alert('No se pudo guardar: ' + error.message);
      return;
    }

    setShowOrgN(false);
    showToast("check",`${datosNuevaOrg.razon_social} agregada`);
  }

  async function crearObjetivoUdn(datos) {
    const { error } = await crearObjetivoAnual(datos);
    if (error) {
      console.error('Error al guardar el objetivo de UDN:', error);
      alert('No se pudo guardar: ' + error.message);
      return;
    }
    showToast("check", `Objetivo ${datos.anio} de ${datos.nombre_udn} guardado`);
  }

  async function editarObjetivoUdn(id, datos) {
    const { error } = await editarObjetivoAnual(id, datos);
    if (error) {
      console.error('Error al editar el objetivo de UDN:', error);
      alert('No se pudo guardar: ' + error.message);
      return;
    }
    showToast("check", `Objetivo ${datos.anio} actualizado`);
  }

  async function guardarAvanceUdn(udnObjetivoId, periodo, datos) {
    const { error } = await guardarAvanceMensual(udnObjetivoId, periodo, datos);
    if (error) {
      console.error('Error al guardar el avance mensual:', error);
      alert('No se pudo guardar: ' + error.message);
      return;
    }
    showToast("check", `Avance de ${periodo.slice(0,7)} guardado`);
  }

  async function manejarArchivoPolizas(ev) {
    const file = ev.target.files?.[0];
    ev.target.value = ""; // permite reimportar el mismo archivo si hace falta
    if (!file) return;

    setImportando(true);
    try {
      const resumen = await importarPolizasDesdeExcel(file, { supabase, profileId: user.id });
      if (resumen.total === 0) {
        alert("El archivo no tiene filas con número de póliza válido.");
        return;
      }
      const orgMsg = resumen.organizadoresCreados.length
        ? ` · ${resumen.organizadoresCreados.length} organización(es) nueva(s): ${resumen.organizadoresCreados.map(o=>o.razonSocial).join(", ")}`
        : "";
      showToast("check", `${resumen.insertadas} de ${resumen.total} pólizas importadas${orgMsg}`);
      if (resumen.organizadoresCreados.length) refetchOrganizadores();
    } catch (err) {
      console.error('Error al importar pólizas:', err);
      alert('No se pudo completar la importación: ' + err.message);
    } finally {
      setImportando(false);
    }
  }

  async function manejarArchivoSignos(ev) {
    const files = ev.target.files;
    ev.target.value = ""; // permite reimportar los mismos archivos si hace falta
    if (!files || files.length === 0) return;

    setImportandoSignos(true);
    try {
      const resumen = await importarSignosDesdeArchivos(files, { supabase, profileId: user.id });
      if (resumen.totalPdfs === 0) {
        alert("No se encontró ningún PDF en lo que subiste.");
        return;
      }
      const orgMsg = resumen.organizadoresCreados.length
        ? ` · ${resumen.organizadoresCreados.length} organización(es) nueva(s): ${resumen.organizadoresCreados.map(o=>o.razonSocial).join(", ")}`
        : "";
      const erroresMsg = resumen.erroresParseo.length ? ` · ${resumen.erroresParseo.length} PDF no se pudo leer` : "";
      showToast("check", `${resumen.kpisImportados} KPI(s) importados de ${resumen.totalPdfs} PDF(s)${orgMsg}${erroresMsg}`);
      if (resumen.erroresParseo.length) console.warn("PDFs no parseados:", resumen.erroresParseo);
      if (resumen.avisos.length) console.warn("Avisos del importador Signos:", resumen.avisos);
      refetchOrganizadorKpis();
      refetchOrganizadorCodigos();
      if (resumen.organizadoresCreados.length) refetchOrganizadores();
    } catch (err) {
      console.error('Error al importar Signos:', err);
      alert('No se pudo completar la importación: ' + err.message);
    } finally {
      setImportandoSignos(false);
    }
  }

  const verE=e=>{setSelec(e);setSelecOrg(null);};
  const verOrg=o=>{setSelecOrg(o);setSelec(null);};

  if (authLoading) {
    return <div style={{minHeight:"100vh",display:"flex",alignItems:"center",
      justifyContent:"center",background:"var(--bg-gradient)",color:T.t2,fontFamily:"'Inter',sans-serif"}}>
      Cargando...
    </div>;
  }

  if (!user) {
    return <Login />;
  }

  const vista=tab==="dashboard"?<Dashboard esps={esps} onVer={verE} onNuevo={()=>setShowN(true)} loadingEsp={espLoading} errorEsp={espError} oportunidadTotal={oportunidadTotal}/>
    :tab==="equipo"?<PanelEquipo esps={esps} onVer={verE} onNuevo={()=>setShowN(true)}/>
    :tab==="organizaciones"?<PanelOrganizaciones organizadoresConDatos={organizadoresConDatos} loading={orgLoading} error={orgError} onNuevo={()=>setShowOrgN(true)} onImportar={()=>fileImportRef.current?.click()} importando={importando} onImportarSignos={()=>fileSignosRef.current?.click()} importandoSignos={importandoSignos} faltantes={faltantes} onVer={verOrg}/>
    :tab==="objetivos"?<PanelObjetivosUDN objetivos={udnObjetivos} avanceMensual={udnAvanceMensual} loading={udnLoading} error={udnError} onCrearObjetivo={crearObjetivoUdn} onEditarObjetivo={editarObjetivoUdn} onGuardarAvance={guardarAvanceUdn}/>
    :tab==="alertas"?<PanelAlertas esps={esps} onVer={verE}/>
    :<PanelMetricas esps={esps} onVer={verE}/>;

  return <div style={{display:"flex",height:"100vh",
    fontFamily:"'Inter','Segoe UI','Helvetica Neue',Arial,sans-serif",
    background:"var(--bg-gradient)",color:T.t1,overflow:"hidden",position:"relative",zIndex:1}}>
    <Sidebar tab={tab} onTab={t=>{setTab(t);setSelec(null);setSelecOrg(null);}} cnt={cntAlertas} esps={esps} onSignOut={signOut}/>
    <div style={{flex:1,display:"flex",overflow:"hidden",minWidth:0}}>
      <div style={{flex:1,overflow:"auto",display:"flex",flexDirection:"column",minWidth:0}}>{vista}</div>
      {selec&&<PanelDetalle esp={selec} onCerrar={()=>setSelec(null)} onGuardar={guardar} onContacto={agregarContacto} organizadores={organizadores}/>}
      {selecOrg&&<FichaOrganizador organizador={selecOrg} codigos={selecOrg.codigos||[]}
        kpisOrg={organizadorKpis.filter(k=>k.organizador_id===selecOrg.id)}
        polizasOrg={polizas.filter(p=>p.organizador_id===selecOrg.id)}
        indiceBenchmark={datosPorOrganizador.indiceBenchmark} enFaltantes={selecOrg.enFaltantes}
        onCerrar={()=>setSelecOrg(null)}/>}
    </div>
    {showN&&<ModalNuevo onGuardar={agregar} onCerrar={()=>setShowN(false)} organizadores={organizadores}/>}
    {showOrgN&&<ModalNuevaOrganizacion onGuardar={crearOrganizacion} onCerrar={()=>setShowOrgN(false)}/>}
    <input ref={fileImportRef} type="file" accept=".xlsx,.xls" style={{display:"none"}} onChange={manejarArchivoPolizas}/>
    <input ref={fileSignosRef} type="file" accept=".zip,.pdf" multiple style={{display:"none"}} onChange={manejarArchivoSignos}/>
    {toast&&<Card style={{position:"fixed",bottom:22,right:22,borderRadius:9,padding:"11px 16px",display:"flex",
      alignItems:"center",gap:9,boxShadow:"0 8px 24px rgba(0,0,0,.45)",
      zIndex:500,fontSize:13,color:T.t1,fontWeight:600}}>
      <Icon name={toast.ico} size={18} color={T.verde}/>{toast.msg}
    </Card>}
  </div>;
}
