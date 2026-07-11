import { useState } from "react";
import { T, Card, Inp, BtnS, BtnP, Icon } from "../lib/ui.jsx";
import { ds } from "../lib/especialistas.js";

export default function ModalNuevo({onGuardar,onCerrar,organizadores}) {
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
