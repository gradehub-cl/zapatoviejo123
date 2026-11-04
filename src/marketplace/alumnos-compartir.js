
// ─── PANEL DE ALUMNOS (decisión de Lucas, 2026-10-08) ───────────────────────
// Un profesor ve las notas de un alumno solo si ese alumno se las comparte, ramo
// por ramo, desde el link del profesor; y deja de verlas cuando el alumno lo
// decide. El SQL (supabase/profesor_alumnos.sql) entrega los ramos tal como el
// alumno los guardó: el promedio lo calcula este navegador con ramoAvg, el mismo
// motor de la app, para que el profesor vea exactamente lo que ve el alumno.
const CLAVE_PROFE_PENDIENTE='gradehub_profe_pendiente';
const URL_PANEL_ALUMNOS='https://gradehub.cl/';

// Misma regla que clave_evaluacion() en SQL: así cada nota encuentra su promedio.
function claveEvaluacionPanel(nombre){
  const s=String(nombre||'').toLowerCase()
    .replace(/[áàäâ]/g,'a').replace(/[éèëê]/g,'e').replace(/[íìïî]/g,'i')
    .replace(/[óòöô]/g,'o').replace(/[úùüû]/g,'u').replace(/ñ/g,'n')
    .replace(/\s+/g,' ').trim();
  return s||null;
}
function codigoProfeValido(codigo){
  const c=String(codigo||'').trim().toUpperCase();
  return /^[A-HJ-NP-Z2-9]{8}$/.test(c)?c:null;
}
function linkAlumnosProfesor(codigo){return `${URL_PANEL_ALUMNOS}?profe=${encodeURIComponent(codigo)}`;}
function mensajeInvitacionAlumnos(){
  return 'Hola, si quieres compartir conmigo las notas de tus ramos en GradeHub, abre este link. Tú eliges los ramos y puedes dejar de compartir cuando quieras.';
}
async function compartirInvitacionAlumnos(link){
  try{
    if(typeof navigator.share==='function'){
      await navigator.share({text:mensajeInvitacionAlumnos(),url:link});
      return 'compartido';
    }
  }catch(e){if(e&&e.name==='AbortError')return 'cancelado';}
  try{
    await navigator.clipboard.writeText(`${mensajeInvitacionAlumnos()}\n${link}`);
    return 'copiado';
  }catch(e){return 'fallo';}
}
function medirInvitacionCompartida(resultado){
  if(resultado==='compartido')track('panel_alumnos_link_compartido');
  if(resultado==='copiado')track('panel_alumnos_link_copiado');
}

// El link se abre antes de iniciar sesión: el código espera acá hasta que haya
// una cuenta con su semestre listo. Solo el código, nunca datos del profesor.
function guardarProfePendiente(codigo){
  const c=codigoProfeValido(codigo);if(!c)return false;
  try{localStorage.setItem(CLAVE_PROFE_PENDIENTE,c);}catch(e){}
  return true;
}
function profePendiente(){try{return codigoProfeValido(localStorage.getItem(CLAVE_PROFE_PENDIENTE));}catch(e){return null;}}
function mostrarContextoInvitacionProfesor(){
  if(typeof document==='undefined')return;
  const visible=!!profePendiente();
  ['auth-invitacion-profesor','ob-invitacion-profesor'].forEach(id=>{
    const el=document.getElementById(id);if(el)el.hidden=!visible;
  });
}
function olvidarProfePendiente(){try{localStorage.removeItem(CLAVE_PROFE_PENDIENTE);}catch(e){}mostrarContextoInvitacionProfesor();}
function capturarProfeDeUrl(){
  if(typeof location==='undefined'||typeof URLSearchParams==='undefined')return null;
  const params=new URLSearchParams(location.search||'');
  if(!params.has('profe'))return null;
  const c=guardarProfePendiente(params.get('profe'))?profePendiente():null;
  if(c){
    track('panel_alumnos_link_abierto');
    try{if(typeof ORIGEN_ENTRADA_KEY==='string')sessionStorage.setItem(ORIGEN_ENTRADA_KEY,'profesor');}catch(e){}
  }
  // Fuera de la barra de direcciones: si la persona comparte la página, no
  // reparte el link de su profesor.
  params.delete('profe');
  try{history.replaceState(null,'',location.pathname+(params.toString()?'?'+params:'')+location.hash);}catch(e){}
  return c;
}

let invitacionProfeAbierta=false;
async function revisarInvitacionProfesor(){
  const codigo=profePendiente();
  if(!codigo||invitacionProfeAbierta||!supabaseClient||!currentUser||!S.onboardingDone)return false;
  const uid=currentUser.id;
  invitacionProfeAbierta=true;
  try{
    const {data,error}=await supabaseClient.rpc('profesor_por_codigo',{p_codigo:codigo});
    if(currentUser?.id!==uid)return false;
    if(error){showToast('No pudimos abrir la invitación. Recarga GradeHub para intentarlo de nuevo.',true);return false;}
    const profe=Array.isArray(data)?data[0]:null;
    if(!profe){
      olvidarProfePendiente();
      showToast('Ese link de profesor ya no funciona. Pídele uno nuevo.',true);
      return false;
    }
    // El RPC nuevo solo lee la selección de esta misma persona. Hasta que Lucas
    // aplique el SQL, un servidor anterior sigue usando la hoja de siempre.
    let compartido=null;
    const previo=await supabaseClient.rpc('mi_compartido_profesor',{p_codigo:codigo});
    if(currentUser?.id!==uid)return false;
    if(previo.error){
      if(!['PGRST202','42883'].includes(previo.error.code)){
        showToast('No pudimos revisar lo que ya compartes. Intenta de nuevo.',true);
        return false;
      }
    }else if(previo.data&&Array.isArray(previo.data.ramos))compartido=previo.data;
    abrirHojaInvitacionProfesor(codigo,profe,compartido);
    return true;
  }catch(e){showToast('No pudimos abrir la invitación. Recarga GradeHub para intentarlo de nuevo.',true);return false;}
  finally{invitacionProfeAbierta=false;}
}

function hojaInvitacionProfesorHTML(profe,ramos,nombre,compartido=null){
  const marcados=new Set(compartido?.ramos||[]);
  const filas=ramos.map(r=>{
    const sigla=typeof siglaDeRamo==='function'?siglaDeRamo(r):r.sigla;
    return `<label class="compartir-ramo"><input type="checkbox" value="${esc(r.id)}" data-compartir-ramo${marcados.has(r.id)?' checked':''}>
      <span><b>${esc(r.nombre)}</b>${sigla?`<small>${esc(sigla)}</small>`:''}</span></label>`;
  }).join('');
  return `<div class="compartir-profe">
    <div class="modal-title" id="modal-titulo">${compartido?'Edita lo que compartes con '+esc(profe.nombre_publico):esc(profe.nombre_publico)+' quiere ver tus notas'}</div>
    <p class="compartir-explica">Elige los ramos en que tomas clases con ${esc(profe.nombre_publico)}. Va a ver cada nota de esos ramos y cómo vas comparado con el resto de GradeHub, y puede descargarlas para hacerte seguimiento. Nada más: ni tus otros ramos ni tu correo.</p>
    ${ramos.length?`<div class="compartir-ramos" role="group" aria-label="Ramos que compartes">${filas}</div>`:'<p class="compartir-explica">Primero agrega un ramo para elegir qué compartir.</p>'}
    ${ramos.length?`
    <label class="modal-label" for="compartir-nombre">Cómo quieres aparecer</label>
    <div class="modal-input"><input type="text" id="compartir-nombre" maxlength="60" autocomplete="off" value="${esc(nombre)}"></div>
    <p class="compartir-explica">Puedes dejar de compartir cuando quieras en Ajustes → Datos y cuenta.</p>
    <p class="compartir-error" id="compartir-error" role="alert" hidden></p>`:''}
    <div class="modal-btns">
      <button type="button" class="btn-cancel" id="compartir-no">${compartido?'Cancelar':'Ahora no'}</button>
      ${ramos.length?`<button type="button" class="btn-confirm" id="compartir-si" disabled>${compartido?'Guardar cambios':'Compartir'}</button>`:'<button type="button" class="btn-confirm" id="compartir-agregar">Agregar ramo</button>'}
    </div>
  </div>`;
}

function abrirHojaInvitacionProfesor(codigo,profe,compartido=null){
  const caja=document.getElementById('modal-content');if(!caja)return;
  caja.innerHTML=hojaInvitacionProfesorHTML(profe,S.ramos||[],compartido?.nombre_visible||S.userName||'',compartido);
  openModal();
  track('panel_alumnos_invitacion_mostrada');
  try{if(typeof ORIGEN_ENTRADA_KEY==='string'&&sessionStorage.getItem(ORIGEN_ENTRADA_KEY)==='profesor')sessionStorage.removeItem(ORIGEN_ENTRADA_KEY);}catch(e){}
  const cancelar=caja.querySelector('#compartir-no');
  cancelar.addEventListener('click',()=>{olvidarProfePendiente();closeModal();});
  const agregar=caja.querySelector('#compartir-agregar');
  if(agregar){
    agregar.addEventListener('click',()=>{
      const usuario=currentUser?.id;
      const retomar=()=>{
        if(currentUser?.id===usuario&&profePendiente()===codigo)revisarInvitacionProfesor();
      };
      openAddRamoModal(retomar,retomar);
    });
    return;
  }
  const si=caja.querySelector('#compartir-si'),nombre=caja.querySelector('#compartir-nombre'),aviso=caja.querySelector('#compartir-error');
  const casillas=[...caja.querySelectorAll('[data-compartir-ramo]')];
  const elegidos=()=>casillas.filter(c=>c.checked).map(c=>c.value);
  const actualizar=()=>{si.disabled=!elegidos().length||!nombre.value.trim();};
  casillas.forEach(c=>c.addEventListener('change',actualizar));
  nombre.addEventListener('input',actualizar);
  actualizar();
  si.addEventListener('click',async()=>{
    if(si.disabled)return;
    const ramos=elegidos(),nombreVisible=nombre.value.trim(),uid=currentUser?.id;
    const textoBoton=si.textContent;
    si.disabled=true;nombre.disabled=true;cancelar.disabled=true;
    casillas.forEach(c=>{c.disabled=true;});
    si.textContent=compartido?'Guardando…':'Compartiendo…';
    aviso.hidden=true;
    const r=await compartirConProfesor(codigo,nombreVisible,ramos);
    // La hoja pudo ser reemplazada o la sesión pudo cambiar mientras esperaba.
    if(caja.querySelector('#compartir-si')!==si||currentUser?.id!==uid)return;
    if(r.ok){
      olvidarProfePendiente();closeModal();
      const n=ramos.length;
      showToast(`Listo: ${profe.nombre_publico} ya ve tus notas de ${n} ${n===1?'ramo':'ramos'}.`);
      track('compartir_con_profesor',{ramos:n});
    }else{
      nombre.disabled=false;cancelar.disabled=false;
      casillas.forEach(c=>{c.disabled=false;});
      si.textContent=textoBoton;
      aviso.textContent=r.error;aviso.hidden=false;actualizar();
    }
  });
}

async function compartirConProfesor(codigo,nombre,ramos){
  const pedir=()=>supabaseClient.rpc('compartir_con_profesor',{p_codigo:codigo,p_nombre:String(nombre||'').trim(),p_ramos:ramos});
  try{
    let {error}=await pedir();
    // Un ramo recién agregado puede no haber subido todavía a la nube, que es
    // donde se revisa que sea tuyo: se sube y se intenta una vez más.
    if(error&&/al menos un ramo/.test(error.message||'')&&typeof syncNow==='function'){
      await syncNow();({error}=await pedir());
    }
    if(!error)return {ok:true};
    const m=error.message||'';
    return {ok:false,error:/nombre/.test(m)?'Escribe con qué nombre quieres aparecer.'
      :/al menos un ramo/.test(m)?'No pudimos guardar tus ramos en la nube. Revisa tu conexión e intenta de nuevo.'
      :/ningún profesor/.test(m)?'Ese link ya no funciona. Pídele uno nuevo a tu profesor.'
      :'No pudimos compartir. Intenta de nuevo.'};
  }catch(e){return {ok:false,error:'No pudimos compartir. Revisa tu conexión e intenta de nuevo.'};}
}

// Ajustes → Datos y cuenta: con quién comparte el alumno, y cómo dejar de hacerlo.
async function pintarCompartidosProfesor(){
  const caja=document.getElementById('s-compartidos');
  if(!caja||!supabaseClient||!currentUser)return;
  let lista;
  try{
    const {data,error}=await supabaseClient.rpc('mis_profesores');
    if(error)throw error;
    lista=Array.isArray(data)?data:[];
  }catch(e){caja.innerHTML='<p class="settings-help">No pudimos cargar con quién compartes. Vuelve a abrir esta sección.</p>';return;}
  if(!caja.isConnected)return;
  if(!lista.length){caja.innerHTML='<p class="settings-help">No compartes tus notas con ningún profesor.</p>';return;}
  const nombreRamo=id=>{const r=(S.ramos||[]).find(x=>x.id===id);return r?r.nombre:null;};
  caja.innerHTML=lista.map(p=>{
    const ramos=(p.ramos||[]).map(nombreRamo).filter(Boolean);
    return `<div class="compartido-fila" data-compartido="${esc(p.id)}">
      <div><b>${esc(p.nombre_publico)}</b><small>${ramos.length?esc(ramos.join(' · ')):'Ramos que ya no tienes'} · como «${esc(p.nombre_visible)}»</small></div>
      <button type="button" class="agent-refresh" data-ver-preparacion="${esc(p.id)}">Ver evaluaciones preparadas</button>
      <button type="button" class="settings-danger-btn" data-dejar="${esc(p.id)}" data-nombre="${esc(p.nombre_publico)}">Dejar de compartir</button>
    </div>`;
  }).join('');
  caja.querySelectorAll('[data-ver-preparacion]').forEach(b=>b.addEventListener('click',()=>verPreparacionCompartida(b.dataset.verPreparacion)));
  // Destructivo: se confirma en el diálogo de la app (HIG), con Cancelar a mano.
  caja.querySelectorAll('[data-dejar]').forEach(b=>b.addEventListener('click',()=>{
    showConfirm(`Dejar de compartir con ${b.dataset.nombre}`,
      'Deja de ver tus notas en este momento. Si quieres volver a compartir, abre su link otra vez.',async()=>{
      b.disabled=true;
      try{
        const {error}=await supabaseClient.rpc('dejar_de_compartir',{p_id:b.dataset.dejar});
        if(error)throw error;
        showToast('Dejaste de compartir tus notas.');
        track('dejar_de_compartir_profesor');
        pintarCompartidosProfesor();
      }catch(e){b.disabled=false;showToast('No pudimos dejar de compartir. Intenta de nuevo.',true);}
    },{label:'Dejar de compartir',focusCancel:true});
  }));
}
