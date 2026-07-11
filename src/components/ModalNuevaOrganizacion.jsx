import { useState } from "react";
import { T, Card, Inp, BtnS, BtnP, Icon } from "../lib/ui.jsx";

export default function ModalNuevaOrganizacion({onGuardar,onCerrar}) {
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
