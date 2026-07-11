import { T, fmt$, BtnS, BtnP, Card, Icon, Num } from "../lib/ui.jsx";

export default function PanelOrganizaciones({organizadoresConDatos,loading,error,onNuevo,onImportar,importando,onImportarSignos,importandoSignos,faltantes,onVer}) {
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
