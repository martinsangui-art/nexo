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
  t1:"#EEF2FF",  t2:"#6B82A8",  t3:"var(--text-tertiary)",  t4:"#1A2540",
};

// ─── HELPERS ─────────────────────────────────────────────────────
export const fmt$  = n => n==null?"—":n>=1e6?`$${(n/1e6).toFixed(1)}M`:n>=1e3?`$${Math.round(n/1e3)}k`:`$${Math.round(n)}`;
export const fmtN  = n => n?.toLocaleString("es-AR") ?? "—";
export const fmtD  = d => d?new Date(d).toLocaleDateString("es-AR",{day:"2-digit",month:"short",year:"2-digit"}):"—";
export const fmtDc = d => d?new Date(d).toLocaleDateString("es-AR",{day:"2-digit",month:"short"}):"—";
export const pct   = (a,b) => b>0?Math.min(Math.round(a/b*100),100):0;
export const inic  = n => (n||"").split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase();

// ─── ÍCONOS ──────────────────────────────────────────────────────
// Set propio de íconos SVG (trazo, no relleno) para reemplazar los emoji
// que traía la UI original — mismo stroke-width en toda la app para que
// se vean como un sistema y no como pictogramas sueltos.
const ICON_PATHS = {
  check:        "M20 6L9 17l-5-5",
  x:             "M18 6L6 18 M6 6l12 12",
  alertTriangle: "M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z M12 9v4 M12 17h.01",
  alertCircle:   "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z M12 8v4 M12 16h.01",
  phone:         "M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z",
  edit:          "M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z",
  mail:          "M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z M22 6l-10 7L2 6",
  clock:         "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z M12 6v6l4 2",
  trendingDown:  "M23 18l-9.5-9.5-5 5L1 6 M17 18h6v-6",
  pin:           "M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z M12 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
  messageCircle: "M21 11.5a8.38 8.38 0 0 1-8.5 8.4 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.38 8.38 0 0 1 8.4-8.5h.5a8.48 8.48 0 0 1 8 8v.5z",
  award:         "M12 15a7 7 0 1 0 0-14 7 7 0 0 0 0 14z M8.21 13.89L7 23l5-3 5 3-1.21-9.12",
  users:         "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M23 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75",
  link:          "M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71 M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71",
  clipboard:     "M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2 M8 2h8v4H8z",
  barChart:      "M18 20V10 M12 20V4 M6 20v-6",
  trendingUp:    "M23 6l-9.5 9.5-5-5L1 18 M17 6h6v6",
  calendar:      "M3 4h18v18H3z M16 2v4 M8 2v4 M3 10h18",
  fileText:      "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M8 13h8 M8 17h8",
  briefcase:     "M2 7h20v14H2z M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16",
  dollarSign:    "M12 1v22 M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6",
  building:      "M4 2h16v20H4z M9 22v-4h6v4 M8 6h2 M14 6h2 M8 10h2 M14 10h2 M8 14h2 M14 14h2",
  flag:          "M4 22V15 M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z",
  target:        "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M12 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2z",
  video:         "M23 7l-7 5 7 5V7z M1 5h15v14H1z",
  zap:           "M13 2L3 14h9l-1 8 10-12h-9l1-8z",
  star:          "M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 21 12 17.77 5.82 21 7 14.14l-5-4.87 6.91-1.01L12 2z",
  info:          "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z M12 16v-5 M12 8h.01",
  upload:        "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4 M17 8l-5-5-5 5 M12 3v12",
};

export const Icon = ({name,size=14,color="currentColor",strokeWidth=2,style={}}) => {
  const d = ICON_PATHS[name];
  if(!d) return null;
  return <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={color}
    strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"
    style={{flexShrink:0,...style}}>
    <path d={d}/>
  </svg>;
};

// Envuelve valores tabulares (montos, fechas, contadores) con la fuente
// mono del sistema visual — mantiene tabular-nums para que los dígitos
// no "bailen" al cambiar entre valores.
export const Num = ({children,style={}}) =>
  <span style={{fontFamily:"var(--font-mono)",fontVariantNumeric:"tabular-nums",...style}}>{children}</span>;

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

export const Card = ({children,style={},...rest}) =>
  <div {...rest} style={{background:"var(--surface-gradient)",borderRadius:10,
    border:"1px solid var(--hairline)",
    boxShadow:"0 1px 0 rgba(255,255,255,0.05) inset, 0 24px 48px -24px rgba(0,0,0,0.6)",
    fontFamily:"'Inter',-apple-system,sans-serif",
    ...style}}>{children}</div>;

export const Sec = ({children,color}) =>
  <div style={{fontSize:10,fontWeight:800,color:color||T.t3,textTransform:"uppercase",
    letterSpacing:".1em",marginBottom:10}}>{children}</div>;

export const Inp = ({value,onChange,type="text",placeholder,style={}}) =>
  <input type={type} value={value??""} placeholder={placeholder} onChange={e=>onChange(e.target.value)}
    style={{width:"100%",padding:"9px 12px",border:`1.5px solid ${T.bd2}`,borderRadius:8,fontSize:14,
      fontFamily:"inherit",outline:"none",boxSizing:"border-box",background:T.s3,color:T.t1,...style}}/>;

// Sin `color` explícito, este es el botón primario del sistema visual
// (dorado); con `color`, mantiene el estilo de acento anterior para las
// acciones secundarias que ya lo usaban (ej. "Guardar" en verde).
export const BtnP = ({children,onClick,color,style={},sm}) =>
  <button onClick={onClick} style={{padding:sm?"7px 13px":"9px 18px",border:"none",borderRadius:8,
    fontFamily:"inherit",fontSize:sm?12:13,fontWeight:700,cursor:"pointer",
    color:color?"#fff":"#241A0A",
    background:color||"linear-gradient(180deg, var(--gold-bright), var(--gold))",
    boxShadow:color?`0 3px 10px ${color}44`:"0 1px 0 rgba(255,255,255,0.3) inset, 0 4px 20px rgba(201,161,94,0.25)",
    whiteSpace:"nowrap",...style}}>
    {children}</button>;

export const BtnS = ({children,onClick,style={}}) =>
  <button onClick={onClick} style={{padding:"8px 16px",border:`1.5px solid ${T.bd2}`,borderRadius:8,
    background:"transparent",color:T.t2,fontSize:13,fontWeight:600,cursor:"pointer",
    fontFamily:"inherit",...style}}>{children}</button>;
