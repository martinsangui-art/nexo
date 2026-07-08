/* ═══════════════════════════════════════════════════════════════════
   Átomos de diseño compartidos — extraídos de App.jsx para poder
   reutilizarlos en los componentes del módulo Fuerza Comercial.
═══════════════════════════════════════════════════════════════════ */

// ─── TOKENS ──────────────────────────────────────────────────────
export const T = {
  bg:"#070B14",  s1:"#0C1020",  s2:"#111828",  s3:"#172035",  s4:"#1E2840",
  bd:"#1E2D45",  bd2:"#263654",
  azul:"#1A56F0",  azulL:"#4B7BF5",  azulD:"#0D3DB8",  azulS:"rgba(26,86,240,0.11)",
  verde:"#10B981",  verdeS:"rgba(16,185,129,0.11)",
  ambar:"#F59E0B",  ambarS:"rgba(245,158,11,0.11)",
  rojo:"#EF4444",   rojoS:"rgba(239,68,68,0.11)",
  t1:"#EEF2FF",  t2:"#6B82A8",  t3:"#334166",  t4:"#1A2540",
  lineaFP: "2px solid #1A56F0",
};

// ─── HELPERS ─────────────────────────────────────────────────────
export const fmt$  = n => n==null?"—":n>=1e6?`$${(n/1e6).toFixed(1)}M`:n>=1e3?`$${Math.round(n/1e3)}k`:`$${Math.round(n)}`;
export const fmtN  = n => n?.toLocaleString("es-AR") ?? "—";
export const fmtD  = d => d?new Date(d).toLocaleDateString("es-AR",{day:"2-digit",month:"short",year:"2-digit"}):"—";
export const fmtDc = d => d?new Date(d).toLocaleDateString("es-AR",{day:"2-digit",month:"short"}):"—";
export const pct   = (a,b) => b>0?Math.min(Math.round(a/b*100),100):0;
export const inic  = n => (n||"").split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase();

// ─── ÁTOMOS ──────────────────────────────────────────────────────
export const Barra = ({val,tot,color,h=6,animated=true}) => {
  const p = tot>0?Math.min(val/tot*100,100):val;
  return <div style={{background:T.s4,borderRadius:h,height:h,overflow:"hidden"}}>
    <div style={{width:`${p}%`,height:"100%",borderRadius:h,
      background:`linear-gradient(90deg,${color}88,${color})`,
      boxShadow:`0 0 8px ${color}44`,
      transition:animated?"width .6s cubic-bezier(.4,0,.2,1)":"none"}}/>
  </div>;
};

export const Av = ({n,color,size=36}) =>
  <div style={{width:size,height:size,borderRadius:Math.round(size*.25),flexShrink:0,
    background:`${color}18`,border:`1.5px solid ${color}44`,display:"flex",alignItems:"center",
    justifyContent:"center",fontSize:Math.round(size*.3),fontWeight:900,color,letterSpacing:"-.5px"}}>
    {inic(n)}</div>;

export const Card = ({children,style={},sig=false}) =>
  <div style={{background:T.s2,borderRadius:10,border:`1px solid ${T.bd}`,
    fontFamily:"'Inter',-apple-system,sans-serif",
    ...(sig?{borderTop:`2px solid ${T.azul}`}:{}),
    ...style}}>{children}</div>;

export const Sec = ({children,color}) =>
  <div style={{fontSize:10,fontWeight:800,color:color||T.t3,textTransform:"uppercase",
    letterSpacing:".1em",marginBottom:10}}>{children}</div>;

export const Inp = ({value,onChange,type="text",placeholder,style={}}) =>
  <input type={type} value={value??""} placeholder={placeholder} onChange={e=>onChange(e.target.value)}
    style={{width:"100%",padding:"9px 12px",border:`1.5px solid ${T.bd2}`,borderRadius:8,fontSize:14,
      fontFamily:"inherit",outline:"none",boxSizing:"border-box",background:T.s3,color:T.t1,...style}}/>;

export const BtnP = ({children,onClick,color,style={},sm}) =>
  <button onClick={onClick} style={{padding:sm?"7px 13px":"9px 18px",border:"none",borderRadius:8,
    fontFamily:"inherit",fontSize:sm?12:13,fontWeight:700,cursor:"pointer",color:"#fff",
    background:color||`linear-gradient(135deg,${T.azul},${T.azulL})`,
    boxShadow:`0 3px 10px ${(color||T.azul)}44`,whiteSpace:"nowrap",...style}}>
    {children}</button>;

export const BtnS = ({children,onClick,style={}}) =>
  <button onClick={onClick} style={{padding:"8px 16px",border:`1.5px solid ${T.bd2}`,borderRadius:8,
    background:"transparent",color:T.t2,fontSize:13,fontWeight:600,cursor:"pointer",
    fontFamily:"inherit",...style}}>{children}</button>;
