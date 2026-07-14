import { useState, useEffect } from "react";
import { T, fmt$, fmtD, fmtDc, pct, Barra, Av, Card, Sec, Inp, BtnP, BtnS, Icon, Num } from "../lib/ui.jsx";
import { ds, dH, sem, ritmoNecesario, velocidadActual, proyeccion, alertas, TIPOS } from "../lib/especialistas.js";
import { Spark, SemTag } from "./Atoms.jsx";

export default function PanelDetalle({esp,onCerrar,onGuardar,onContacto,organizadores,onEditar,onEliminar,whatsappHabilitado,onTogglePin}) {
  const [e,setE]=useState(esp);
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
  const [historialExpandido,setHistorialExpandido]=useState(false);
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
  const abrirWhatsapp=()=>{
    window.open(`https://wa.me/${e.tel.replace(/\D/g,'')}`, '_blank');
    sync({...e,contactos:[{fecha:ds(0),tipo:"whatsapp",nota:"WhatsApp abierto"},...e.contactos]});
    onContacto(e.id,{tipo:"whatsapp",nota:"WhatsApp abierto"});};

  const s=sem(e), pp=pct(e.avance.polizas,e.plan.polizasObj);
  const ppr=pct(e.avance.prima,e.plan.primaObj);
  const dr=dH(e.plan.fechaFin);
  const proy=proyeccion(e);
  const als=alertas(e);
  const vAct=parseFloat(velocidadActual(e));
  const vNec=parseFloat(ritmoNecesario(e)||0);

  const btnAccionStyle = habilitado => ({padding:"8px 16px",border:`1.5px solid ${T.bd2}`,borderRadius:8,
    background:"transparent",color:T.t2,fontSize:13,fontWeight:600,fontFamily:"inherit",
    display:"inline-flex",alignItems:"center",gap:6,
    cursor:habilitado?"pointer":"not-allowed",opacity:habilitado?1:.4});

  const historialCompleto=[...e.historialAvance].reverse();
  const historialAMostrar=historialExpandido?historialCompleto:historialCompleto.slice(0,5);

  const destacados=e.contactos.filter(c=>c.destacado);
  const resto=e.contactos.filter(c=>!c.destacado);
  const renderContacto=(c,esUltimo)=>{
    const t=TIPOS.find(x=>x.id===c.tipo);
    return <div key={c.id} style={{display:"flex",gap:10,padding:"10px 0",alignItems:"flex-start",
      borderBottom:esUltimo?"none":`1px solid ${T.bd}`,
      ...(c.destacado?{borderLeft:"3px solid var(--gold-bright)",paddingLeft:9}:{})}}>
      <div style={{width:32,height:32,borderRadius:7,background:T.s3,flexShrink:0,color:T.azulL,
        display:"flex",alignItems:"center",justifyContent:"center"}}><Icon name={t?.e||"pin"} size={15}/></div>
      <div style={{flex:1,minWidth:0}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:3,alignItems:"center"}}>
          <span style={{fontSize:11,fontWeight:700,color:T.azulL}}>{t?.l||c.tipo}</span>
          <span style={{fontSize:10,color:T.t3}}>{fmtDc(c.fecha)}</span>
        </div>
        <div style={{fontSize:12,color:T.t2,lineHeight:1.5}}>{c.nota}</div>
      </div>
      <button onClick={()=>onTogglePin(c.id,c.destacado)} title={c.destacado?"Quitar destacado":"Destacar"}
        style={{width:18,height:18,flexShrink:0,background:"none",border:"none",cursor:"pointer",padding:0,
          color:c.destacado?"var(--gold-bright)":T.t3,display:"flex",alignItems:"center",justifyContent:"center"}}>
        <Icon name="star" size={15}/>
      </button>
    </div>;
  };

  return <div style={{flex:1,minWidth:0,display:"flex",flexDirection:"column",height:"100vh",overflow:"hidden"}}>

    {/* Volver */}
    <div style={{padding:"14px 18px 0",flexShrink:0}}>
      <button onClick={onCerrar} style={{background:"none",border:"none",color:T.t3,fontSize:12,
        cursor:"pointer",fontFamily:"inherit",display:"inline-flex",alignItems:"center",gap:5,padding:0}}>
        ← Volver
      </button>
    </div>

    {/* Header */}
    <div style={{background:"var(--surface-gradient)",borderBottom:`1px solid ${T.bd}`,padding:"18px 24px 14px",flexShrink:0}}>
      <div style={{maxWidth:680,margin:"0 auto"}}>
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
        <div style={{display:"flex",gap:6,alignItems:"center",flexShrink:0}}>
          {onEditar&&<button onClick={onEditar} title="Editar datos" style={{background:T.s4,border:"none",color:T.t2,width:26,
            height:26,borderRadius:"50%",cursor:"pointer",display:"flex",
            alignItems:"center",justifyContent:"center"}}><Icon name="edit" size={12}/></button>}
          {onEliminar&&<button onClick={onEliminar} title="Eliminar especialista" style={{background:T.s4,border:"none",color:T.rojo,width:26,
            height:26,borderRadius:"50%",cursor:"pointer",display:"flex",
            alignItems:"center",justifyContent:"center"}}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6"/></svg>
          </button>}
          <button onClick={onCerrar} style={{background:T.s4,border:"none",color:T.t2,width:26,
          height:26,borderRadius:"50%",cursor:"pointer",display:"flex",
          alignItems:"center",justifyContent:"center",flexShrink:0}}><Icon name="x" size={13}/></button>
        </div>
      </div>

      {/* 5 KPIs en fila */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:6,marginBottom:10}}>
        {[
          {l:"Pólizas",v:`${e.avance.polizas}/${e.plan.polizasObj}`,p:pp,c:T.azulL},
          {l:"Prima",  v:fmt$(e.avance.prima),p:ppr,c:T.t1},
          {l:"Comisión",v:fmt$(e.avance.comision),p:null,c:T.t1},
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
    </div>

    {/* Barra de acciones de contacto */}
    <div style={{background:"var(--surface-gradient)",borderBottom:`1px solid ${T.bd}`,flexShrink:0}}>
      <div style={{display:"flex",gap:8,padding:"12px 24px",maxWidth:680,margin:"0 auto",flexWrap:"wrap",boxSizing:"border-box",alignItems:"center"}}>
        <BtnP onClick={()=>setSC(!showC)} style={{display:"inline-flex",alignItems:"center",gap:6}}>
          <Icon name="messageCircle" size={14}/> Registrar contacto
        </BtnP>
        <button {...(e.tel?{onClick:()=>window.open(`tel:${e.tel}`)}:{})}
          title={!e.tel?"Sin teléfono cargado":undefined} style={btnAccionStyle(!!e.tel)}>
          <Icon name="phone" size={13}/> Llamar
        </button>
        <button {...(e.email?{onClick:()=>setSM(!showMail)}:{})}
          title={!e.email?"Sin email cargado":undefined} style={btnAccionStyle(!!e.email)}>
          <Icon name="mail" size={13}/> Email
        </button>
        {whatsappHabilitado&&
          <button {...(e.tel?{onClick:abrirWhatsapp}:{})}
            title={!e.tel?"Sin teléfono cargado":undefined} style={btnAccionStyle(!!e.tel)}>
            <Icon name="messageCircle" size={13}/> WhatsApp
          </button>}
      </div>
    </div>

    {/* Contenido */}
    <div style={{flex:1,overflowY:"auto",padding:"14px 24px",maxWidth:680,margin:"0 auto",width:"100%",boxSizing:"border-box"}}>

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

      {/* ── a) PROGRESO ── */}
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
            <div style={{fontSize:14,fontWeight:700,color:s.c}}>{vAct}
              <span style={{fontSize:10,color:T.t3,fontWeight:400}}>/{vNec} nec.</span>
            </div>
          </div>
        </div>
      </Card>

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

      <Card style={{padding:13,marginBottom:10}}>
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

      <div style={{textAlign:"right",fontSize:10,color:T.t3,marginBottom:20}}>
        Última act: {fmtD(e.avance.ultimaAct)}
      </div>

      {/* ── b) PLAN COMERCIAL ── */}
      <Card style={{padding:13,marginBottom:20}}>
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
      </Card>

      {/* ── c) ESTRATEGIA ACORDADA ── */}
      <Card style={{padding:13,marginBottom:20}}>
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

      {/* ── d) HISTORIAL ── */}
      <Card style={{padding:13,marginBottom:20}}>
        <Sec>Evolución semanal</Sec>
        {historialCompleto.length===0
          ?<div style={{textAlign:"center",color:T.t3,padding:"20px 0",fontSize:12}}>Sin historial aún.</div>
          :historialAMostrar.map((h,i)=>{
            const prev=historialCompleto[i+1];
            const dP=prev?h.polizas-prev.polizas:h.polizas;
            const dPr=prev?h.prima-prev.prima:h.prima;
            return <div key={i} style={{paddingBottom:12,marginBottom:12,
              borderBottom:i<historialAMostrar.length-1?`1px solid ${T.bd}`:"none"}}>
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
                  {l:"Prima",v:fmt$(h.prima),d:dPr,c:T.t1,fmt:true},
                  {l:"% obj.",v:`${pct(h.polizas,e.plan.polizasObj)}%`,d:null,c:T.t1},
                ].map(m=><Card key={m.l} style={{borderRadius:7,padding:8,textAlign:"center"}}>
                  <div style={{fontSize:13,fontWeight:900,color:m.c}}>{m.v}</div>
                  {m.d!==null&&m.d!==0&&<div style={{fontSize:9,color:m.d>0?T.verde:T.rojo,fontWeight:700}}>
                    {m.d>0?"+":""}{m.fmt?fmt$(m.d):m.d}</div>}
                  <div style={{fontSize:8,color:T.t3,textTransform:"uppercase",marginTop:2}}>{m.l}</div>
                </Card>)}
              </div>
            </div>;
          })}
        {historialCompleto.length>5&&
          <div style={{textAlign:"center",marginTop:4}}>
            <button onClick={()=>setHistorialExpandido(v=>!v)} style={{background:"none",border:"none",
              color:T.azulL,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
              {historialExpandido?"Ver menos":`Ver historial completo (${historialCompleto.length})`}
            </button>
          </div>}
      </Card>

      {/* ── e) CONTACTOS ── */}
      <Card style={{padding:13,marginBottom:20}}>
        <Sec>Contactos ({e.contactos.length})</Sec>
        {e.contactos.length===0&&<div style={{textAlign:"center",color:T.t3,padding:"16px 0",fontSize:12}}>Sin contactos</div>}
        {destacados.length>0&&<>
          <Sec>Destacados</Sec>
          {destacados.map((c,i)=>renderContacto(c,i===destacados.length-1))}
        </>}
        {destacados.length>0&&resto.length>0&&<div style={{marginTop:12}}><Sec>Todos</Sec></div>}
        {resto.map((c,i)=>renderContacto(c,i===resto.length-1))}
      </Card>

      {/* ── f) FICHA ── */}
      <Card style={{padding:13}}>
        <Sec>Ficha</Sec>
        <div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
            <div style={{fontSize:11,fontWeight:700,color:T.t2,textTransform:"uppercase",letterSpacing:".06em"}}>Organización</div>
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
        </div>
        <div style={{borderTop:`1px solid ${T.bd}`,paddingTop:12,marginTop:12}}>
          <div style={{fontSize:11,fontWeight:700,color:T.t2,textTransform:"uppercase",letterSpacing:".06em",marginBottom:8}}>Datos de contacto</div>
          {[["phone","Teléfono",e.tel],["mail","Email",e.email]].map(([ico,l,v])=>
            <div key={l} style={{display:"flex",justifyContent:"space-between",
              padding:"7px 0",borderBottom:`1px solid ${T.bd}`}}>
              <span style={{fontSize:11,color:T.t3,display:"flex",alignItems:"center",gap:5}}><Icon name={ico} size={11}/>{l}</span>
              <span style={{fontSize:12,fontWeight:600,color:T.t1}}>{v||"—"}</span>
            </div>)}
          {e.notas&&<div style={{fontSize:12,color:T.t2,lineHeight:1.6,marginTop:10}}>{e.notas}</div>}
        </div>
      </Card>
    </div>
  </div>;
}
