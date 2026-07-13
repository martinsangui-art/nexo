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
import { calcularIndicePenetracion, calcularOportunidad, calcularFaltantes, ultimoPeriodo } from "./lib/fuerzaComercial";
import Login from "./components/Login";
import FichaOrganizador from "./components/FichaOrganizador";
import PanelObjetivosUDN from "./components/PanelObjetivosUDN";
import { T, Card, Icon } from "./lib/ui.jsx";
import { alertas, normalizarEspecialista } from "./lib/especialistas.js";
import Sidebar from "./components/Sidebar.jsx";
import Dashboard from "./components/Dashboard.jsx";
import PanelEquipo from "./components/PanelEquipo.jsx";
import PanelOrganizaciones from "./components/PanelOrganizaciones.jsx";
import ModalNuevaOrganizacion from "./components/ModalNuevaOrganizacion.jsx";
import PanelAlertas from "./components/PanelAlertas.jsx";
import PanelMetricas from "./components/PanelMetricas.jsx";
import PanelDetalle from "./components/PanelDetalle.jsx";
import ModalNuevo from "./components/ModalNuevo.jsx";

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

// ─── APP ROOT ─────────────────────────────────────────────────────
export default function App() {
  const { user, loading: authLoading, signOut } = useAuth();
  const { especialistas, loading: espLoading, error: espError, refetch } = useEspecialistas();
  const { contactos: contactosDB, refetch: refetchContactos } = useContactos();
  const { organizadores, loading: orgLoading, error: orgError, agregarOrganizador, refetch: refetchOrganizadores } = useOrganizadores(user?.id);
  const { polizas, refetch: refetchPolizas } = usePolizas();
  const { organizadorCodigos, refetch: refetchOrganizadorCodigos } = useOrganizadorCodigos();
  const { organizadorKpis, refetch: refetchOrganizadorKpis } = useOrganizadorKpis();
  const { objetivos: udnObjetivos, avanceMensual: udnAvanceMensual, loading: udnLoading, error: udnError,
    crearObjetivoAnual, editarObjetivoAnual, guardarAvanceMensual } = useUdnObjetivos(user?.id);
  const [esps,setEsps]=useState([]);
  const [tab,setTab]=useState("dashboard");
  const [selecId,setSelecId]=useState(null);
  const selec = useMemo(()=>esps.find(e=>e.id===selecId)??null,[esps,selecId]);
  const [selecOrg,setSelecOrg]=useState(null);
  const [showN,setShowN]=useState(false);
  const [editarEsp,setEditarEsp]=useState(null);
  const [showOrgN,setShowOrgN]=useState(false);
  const [toast,setToast]=useState(null);
  const [importando,setImportando]=useState(false);
  const [importandoSignos,setImportandoSignos]=useState(false);
  const fileImportRef=useRef(null);
  const fileSignosRef=useRef(null);
  const [whatsappHabilitado, setWhatsappHabilitado] = useState(
    () => localStorage.getItem('nexo-whatsapp-habilitado') === 'true'
  );
  useEffect(() => {
    localStorage.setItem('nexo-whatsapp-habilitado', String(whatsappHabilitado));
  }, [whatsappHabilitado]);

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
        .map(c=>({id:c.id, fecha:c.fecha, tipo:c.canal, nota:c.notas, destacado:c.destacado})),
    }));
    setEsps(conContactosReales.map(normalizarEspecialista));
  },[especialistas,contactosDB]);

  const cntAlertas=useMemo(()=>
    esps.flatMap(e=>alertas(e)).filter(a=>a.p<2).length,[esps]);

  const showToast=(ico,msg,duration=3000)=>{setToast({ico,msg});setTimeout(()=>setToast(null),duration);};
  const showError=(msg)=>showToast("alertCircle",msg,5000);

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
      showError('No se pudo registrar el contacto: ' + error.message);
      return;
    }

    refetchContactos();
  }

  async function togglePinContacto(contactoId, destacadoActual) {
    const { error } = await supabase
      .from('contactos')
      .update({ destacado: !destacadoActual })
      .eq('id', contactoId);

    if (error) {
      console.error('Error al destacar contacto:', error);
      showError('No se pudo actualizar el contacto: ' + error.message);
      return;
    }
    refetchContactos();
  }

  async function guardar(especialistaActualizado) {
    const { id, nombre, zona, activo, organizador_id, es_externo,
      tel, email, notas, estrategia, inconvenientes, plan } = especialistaActualizado;
    // Los inputs de fecha vacíos llegan como "" — se normalizan a null para que
    // coincida con lo que queda persistido en Supabase (evita un ~NaN transitorio
    // en la proyección hasta el próximo refetch, ver PanelDetalle/proyeccion()).
    const planNormalizado = plan && { ...plan, fechaInicio: plan.fechaInicio || null, fechaFin: plan.fechaFin || null };
    const { error } = await supabase
      .from('especialistas')
      .update({
        nombre, zona, activo, organizador_id, es_externo,
        tel, email, notas, estrategia, inconvenientes,
        plan_desc: planNormalizado?.desc,
        plan_fecha_inicio: planNormalizado?.fechaInicio,
        plan_fecha_fin: planNormalizado?.fechaFin,
        plan_polizas_obj: planNormalizado?.polizasObj,
        plan_prima_obj: planNormalizado?.primaObj,
        plan_com_pct: planNormalizado?.comPct,
      })
      .eq('id', id);

    if (error) {
      console.error('Error al guardar cambios:', error);
      showError('No se pudo guardar: ' + error.message);
      return;
    }

    refetch();
  }

  function guardarEdicion(datos) {
    guardar({ ...editarEsp, ...datos, zona: datos.org });
    setEditarEsp(null);
  }

  async function eliminar(especialistaId) {
    const { error } = await supabase
      .from('especialistas')
      .delete()
      .eq('id', especialistaId);

    if (error) {
      console.error('Error al eliminar especialista:', error);
      showError('No se pudo eliminar: ' + error.message);
      return;
    }

    if (selec?.id === especialistaId) setSelecId(null);
    showToast("check", "Especialista eliminado");
    refetch();
  }

  async function agregar(datosNuevoEspecialista) {
    const { data, error } = await supabase
      .from('especialistas')
      .insert([{
        nombre: datosNuevoEspecialista.nombre,
        zona: datosNuevoEspecialista.org,
        activo: true,
        profile_id: user.id,
        organizador_id: datosNuevoEspecialista.organizador_id,
        es_externo: datosNuevoEspecialista.es_externo,
        tel: datosNuevoEspecialista.tel,
        email: datosNuevoEspecialista.email,
        notas: datosNuevoEspecialista.notas,
        plan_desc: datosNuevoEspecialista.plan.desc,
        plan_fecha_inicio: datosNuevoEspecialista.plan.fechaInicio || null,
        plan_fecha_fin: datosNuevoEspecialista.plan.fechaFin || null,
        plan_polizas_obj: datosNuevoEspecialista.plan.polizasObj,
        plan_prima_obj: datosNuevoEspecialista.plan.primaObj,
        plan_com_pct: datosNuevoEspecialista.plan.comPct,
      }])
      .select();

    if (error) {
      console.error('Error al agregar especialista:', error);
      showError('No se pudo guardar: ' + error.message);
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
      showError('No se pudo guardar: ' + error.message);
      return;
    }

    setShowOrgN(false);
    showToast("check",`${datosNuevaOrg.razon_social} agregada`);
  }

  async function crearObjetivoUdn(datos) {
    const { error } = await crearObjetivoAnual(datos);
    if (error) {
      console.error('Error al guardar el objetivo de UDN:', error);
      showError('No se pudo guardar: ' + error.message);
      return;
    }
    showToast("check", `Objetivo ${datos.anio} de ${datos.nombre_udn} guardado`);
  }

  async function editarObjetivoUdn(id, datos) {
    const { error } = await editarObjetivoAnual(id, datos);
    if (error) {
      console.error('Error al editar el objetivo de UDN:', error);
      showError('No se pudo guardar: ' + error.message);
      return;
    }
    showToast("check", `Objetivo ${datos.anio} actualizado`);
  }

  async function guardarAvanceUdn(udnObjetivoId, periodo, datos) {
    const { error } = await guardarAvanceMensual(udnObjetivoId, periodo, datos);
    if (error) {
      console.error('Error al guardar el avance mensual:', error);
      showError('No se pudo guardar: ' + error.message);
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
      const { importarPolizasDesdeExcel } = await import("./lib/importarPolizas");
      const resumen = await importarPolizasDesdeExcel(file, { supabase, profileId: user.id });
      if (resumen.total === 0) {
        showError("El archivo no tiene filas con número de póliza válido.");
        return;
      }
      const orgMsg = resumen.organizadoresCreados.length
        ? ` · ${resumen.organizadoresCreados.length} organización(es) nueva(s): ${resumen.organizadoresCreados.map(o=>o.razonSocial).join(", ")}`
        : "";
      showToast("check", `${resumen.insertadas} de ${resumen.total} pólizas importadas${orgMsg}`);
      if (resumen.organizadoresCreados.length) refetchOrganizadores();
    } catch (err) {
      console.error('Error al importar pólizas:', err);
      showError('No se pudo completar la importación: ' + err.message);
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
      const { importarSignosDesdeArchivos } = await import("./lib/importarSignos");
      const resumen = await importarSignosDesdeArchivos(files, { supabase, profileId: user.id });
      if (resumen.totalPdfs === 0) {
        showError("No se encontró ningún PDF en lo que subiste.");
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
      showError('No se pudo completar la importación: ' + err.message);
    } finally {
      setImportandoSignos(false);
    }
  }

  const verE=e=>{setSelecId(e.id);setSelecOrg(null);};
  const verOrg=o=>{setSelecOrg(o);setSelecId(null);};

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

  const vistaPrincipal = selec
    ? <PanelDetalle esp={selec} onCerrar={()=>setSelecId(null)} onGuardar={guardar} onContacto={agregarContacto} organizadores={organizadores}
        onEditar={()=>setEditarEsp(selec)}
        onEliminar={()=>{
          if(window.confirm(`¿Eliminar a ${selec.nombre}? Se van a borrar también sus contactos registrados. Esta acción no se puede deshacer.`)){
            eliminar(selec.id);
          }
        }}
        whatsappHabilitado={whatsappHabilitado}
        onTogglePin={togglePinContacto}/>
    : vista;

  return <div style={{display:"flex",height:"100vh",
    fontFamily:"'Inter','Segoe UI','Helvetica Neue',Arial,sans-serif",
    background:"var(--bg-gradient)",color:T.t1,overflow:"hidden",position:"relative",zIndex:1}}>
    <Sidebar tab={tab} onTab={t=>{setTab(t);setSelecId(null);setSelecOrg(null);}} cnt={cntAlertas} esps={esps} onSignOut={signOut}
      whatsappHabilitado={whatsappHabilitado} onToggleWhatsapp={()=>setWhatsappHabilitado(v=>!v)}/>
    <div style={{flex:1,display:"flex",overflow:"hidden",minWidth:0}}>
      <div style={{flex:1,overflow:"auto",display:"flex",flexDirection:"column",minWidth:0}}>{vistaPrincipal}</div>
      {selecOrg&&<FichaOrganizador organizador={selecOrg} codigos={selecOrg.codigos||[]}
        kpisOrg={organizadorKpis.filter(k=>k.organizador_id===selecOrg.id)}
        polizasOrg={polizas.filter(p=>p.organizador_id===selecOrg.id)}
        indiceBenchmark={datosPorOrganizador.indiceBenchmark} enFaltantes={selecOrg.enFaltantes}
        onCerrar={()=>setSelecOrg(null)}/>}
    </div>
    {showN&&<ModalNuevo onGuardar={agregar} onCerrar={()=>setShowN(false)} organizadores={organizadores}/>}
    {editarEsp&&<ModalNuevo especialista={editarEsp} onGuardar={guardarEdicion} onCerrar={()=>setEditarEsp(null)} organizadores={organizadores}/>}
    {showOrgN&&<ModalNuevaOrganizacion onGuardar={crearOrganizacion} onCerrar={()=>setShowOrgN(false)}/>}
    <input ref={fileImportRef} type="file" accept=".xlsx,.xls" style={{display:"none"}} onChange={manejarArchivoPolizas}/>
    <input ref={fileSignosRef} type="file" accept=".zip,.pdf" multiple style={{display:"none"}} onChange={manejarArchivoSignos}/>
    {toast&&<Card style={{position:"fixed",bottom:22,right:22,borderRadius:9,padding:"11px 16px",display:"flex",
      alignItems:"center",gap:9,boxShadow:"0 8px 24px rgba(0,0,0,.45)",
      zIndex:500,fontSize:13,color:T.t1,fontWeight:600}}>
      <Icon name={toast.ico} size={18} color={toast.ico==="alertCircle"?T.rojo:T.verde}/>{toast.msg}
    </Card>}
  </div>;
}
