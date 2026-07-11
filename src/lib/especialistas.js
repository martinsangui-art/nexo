import { T, pct } from "./ui.jsx";

// ─── HELPERS (especialista-específicos; T/fmt/Card/etc viven en ./lib/ui.jsx) ──
export const HOY   = new Date();
export const ds    = (d=0) => { const x=new Date(HOY); x.setDate(HOY.getDate()+d); return x.toISOString().slice(0,10); };
export const dH    = d => d?Math.ceil((new Date(d)-HOY)/86400000):null;
export const dD    = d => {
  if(!d) return 999;
  const hoyDia = new Date(HOY.getFullYear(),HOY.getMonth(),HOY.getDate());
  const f = new Date(d);
  const fDia = new Date(f.getFullYear(),f.getMonth(),f.getDate());
  return Math.max(0,Math.round((hoyDia-fDia)/86400000));
};

// Semáforo: brecha entre % tiempo consumido y % objetivo alcanzado
export const sem = e => {
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
export const ritmoNecesario = e => {
  const dr = dH(e.plan.fechaFin);
  if(!dr||dr<=0) return null;
  const faltanPol = Math.max(0,e.plan.polizasObj-e.avance.polizas);
  return (faltanPol/dr*7).toFixed(1); // pólizas/semana necesarias
};

// Velocidad actual (pólizas/semana)
export const velocidadActual = e => {
  const h = e.historialAvance;
  if(h.length<2) return 0;
  const ultimo = h[h.length-1];
  const penultimo = h[h.length-2];
  const dias = Math.max((new Date(ultimo.fecha)-new Date(penultimo.fecha))/86400000,1);
  return ((ultimo.polizas-penultimo.polizas)/dias*7).toFixed(1);
};

// Proyección al cierre
export const proyeccion = e => {
  const dt  = Math.max(Math.ceil((HOY-new Date(e.plan.fechaInicio))/86400000),1);
  const dtp = Math.max(Math.ceil((new Date(e.plan.fechaFin)-new Date(e.plan.fechaInicio))/86400000),1);
  return Math.round(e.avance.polizas/dt*dtp);
};

// Alertas automáticas
export const alertas = e => {
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
export const normalizarEspecialista = e => ({
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

// Los "id" son los valores válidos que acepta el check constraint
// contactos_canal_check en Supabase — deben ir en minúscula sin tilde.
export const TIPOS = [{id:"email",e:"mail",l:"Email"},{id:"whatsapp",e:"messageCircle",l:"WhatsApp"},
               {id:"llamada",e:"phone",l:"Llamada"},{id:"presencial",e:"users",l:"Presencial"},
               {id:"video",e:"video",l:"Video"},{id:"agencia",e:"building",l:"Agencia"},
               {id:"oficina",e:"building",l:"Oficina"},{id:"comision",e:"briefcase",l:"Comisión"}];
export const TIPO_E = Object.fromEntries(TIPOS.map(t=>[t.id,t.e]));
