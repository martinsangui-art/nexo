import { T } from "../lib/ui.jsx";
import { sem } from "../lib/especialistas.js";

// ─── ÁTOMOS (especialista-específicos; Barra/Card/Sec/etc en ../lib/ui.jsx) ──
// Sparkline SVG — visualiza tendencia de pólizas
export const Spark = ({data,color,w=80,h=28}) => {
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
export const GaugeRitmo = ({actual,necesario,color}) => {
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

export const SemTag = ({e,sm}) => {
  const s=sem(e);
  return <span style={{display:"inline-flex",alignItems:"center",gap:4,background:s.bg,color:s.c,
    padding:sm?"2px 8px":"4px 11px",borderRadius:20,fontSize:sm?10:12,fontWeight:800,
    border:`1px solid ${s.c}33`,whiteSpace:"nowrap"}}>
    <span style={{width:6,height:6,borderRadius:"50%",background:s.c,display:"inline-block",
      boxShadow:`0 0 5px ${s.c}`}}/>
    {s.label}
  </span>;
};
