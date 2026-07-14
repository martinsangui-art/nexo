import { useState, useMemo } from "react";
import { T, BtnP } from "../lib/ui.jsx";
import { sem, dD } from "../lib/especialistas.js";
import TarjetaEsp from "./TarjetaEsp.jsx";

export default function PanelEquipo({esps,onVer,onNuevo}) {
  const [busq,setBusq]=useState("");
  const [ord,setOrd]=useState("semaforo");
  const lista = useMemo(()=>{
    let arr=esps.filter(e=>
      e.nombre.toLowerCase().includes(busq.toLowerCase())||
      e.org.toLowerCase().includes(busq.toLowerCase()));
    const order={Atrasado:0,"Plan incompleto":1,"En riesgo":2,"En ritmo":3,"Sin plan":4};
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
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))",gap:12}}>
      {lista.map(e=><TarjetaEsp key={e.id} e={e} onPress={()=>onVer(e)}/>)}
    </div>
  </div>;
}
