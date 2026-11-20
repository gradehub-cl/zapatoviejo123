let _visitaSesion=0;

// La persona suele consultar al agente en otra app y volver a GradeHub. Al
// regresar, se consulta la bandeja sin obligarla a cerrar sesión ni recargar.
if(typeof document!=='undefined'&&document.addEventListener)document.addEventListener('visibilitychange',()=>{
  if(document.visibilityState==='visible'&&currentUser&&S.onboardingDone
    &&typeof cargarPropuestasPautaAgente==='function')cargarPropuestasPautaAgente().catch(()=>{});
  // La app instalada puede quedar abierta de un día para otro sin recargar.
  if(document.visibilityState==='visible')registrarVisitaDiaria();
});

// Una visita por cuenta y por día (#666, supabase/visitas_diarias.sql), para
// medir activos y quién vuelve sin depender de las sesiones de Supabase. El
// servidor solo guarda la cuenta y la fecha. Este dispositivo anota que ya la
// mandó hoy, fuera de gradehub_v1, para no llamar en cada apertura; si falla,
// se vuelve a intentar la próxima vez.
const VISITA_DIA_KEY='gradehub_visita_dia';
function diaChileVisita(ahora=new Date()){
  try{return new Intl.DateTimeFormat('en-CA',{timeZone:'America/Santiago'}).format(ahora);}catch(e){return null;}
}
async function registrarVisitaDiaria(ahora=new Date()){
  if(!supabaseClient||!currentUser)return false;
  const dia=diaChileVisita(ahora);if(!dia)return false;
  const marca=currentUser.id+'|'+dia;
  try{if(localStorage.getItem(VISITA_DIA_KEY)===marca)return false;}catch(e){}
  try{
    const {error}=await supabaseClient.rpc('registrar_visita');
    if(error)return false;
    try{localStorage.setItem(VISITA_DIA_KEY,marca);}catch(e){}
    return true;
  }catch(e){return false;}
}

let _ultimaLecturaNube=0;
async function loadFromCloud(){
  const {data,error}=await supabaseClient.from('user_ramos').select('data').eq('user_id',currentUser.id).maybeSingle();
  if(error)throw error;
  _ultimaLecturaNube=Date.now();
  return data?data.data:null; // null = la cuenta aún no tiene datos
}
// Lo anotado en otro dispositivo llegaba solo al abrir la app desde cero
// (afterLogin). El celular deja la app en segundo plano por días, y una
// pestaña del computador queda abierta: al volver a ellas se veían las notas
// viejas hasta cerrar la app del todo o editar algo (2026-11-20). Ahora, al
// volver a la pantalla, se trae la nube por el mismo camino que al entrar
// (reconciliarEnSegundoPlano: candado de subidas, fusión sin pérdidas y nada
// con un modal abierto). Como mucho una vez cada 30 segundos, y sin avisos de
// «sin conexión» si no hay red: la copia local sigue sirviendo.
const NUBE_AL_VOLVER_MS=30000;
// Una nota a medio escribir en la fila (sin hoja abierta) se perdería al
// repintar: el valor solo se guarda en `change`. Si hay un campo de texto con
// el foco, se espera a la próxima vuelta.
function escribiendoAhora(){
  const el=typeof document!=='undefined'&&document.activeElement;
  if(!el||!el.tagName)return false;
  const tag=String(el.tagName).toUpperCase();
  return tag==='TEXTAREA'||el.isContentEditable===true||tag==='INPUT'&&!/^(button|checkbox|radio|range|submit|reset|file|color)$/i.test(el.type||'');
}
function traerNubeAlVolver(ahora=Date.now()){
  if(!supabaseClient||!currentUser||!S||!S.onboardingDone)return false;
  if(escribiendoAhora())return false;
  const uid=currentUser.id;
  // Sin base todavía (primera sincronización en curso) lo resuelve afterLogin.
  if(getCacheOwner()!==uid||!leerBaseSync(uid))return false;
  if(ahora-_ultimaLecturaNube<NUBE_AL_VOLVER_MS)return false;
  _ultimaLecturaNube=ahora;
  const visita=_visitaSesion;
  const vigente=()=>visita===_visitaSesion&&!!currentUser&&currentUser.id===uid;
  reconciliarEnSegundoPlano(uid,vigente,{alVolver:true}).catch(()=>{});
  return true;
}
let _syncTimer=null;
function syncToCloud(){
  if(!supabaseClient||!currentUser)return;
  clearTimeout(_syncTimer);
  _syncTimer=setTimeout(()=>{_syncTimer=null;syncNow();},800); // agrupa ediciones rápidas
}
// Si la persona cambia de app o cierra la pestaña antes de esos 800 ms, el
// temporizador no alcanza a correr y la nube se queda sin la última edición.
// Al volver a entrar, afterLogin() carga la nube encima de la copia local y
// esa nota se pierde sin aviso. Cuando la página se esconde, se sube de
// inmediato lo que estaba esperando.
function subirSyncPendiente(){
  if(!_syncTimer)return false;
  clearTimeout(_syncTimer);_syncTimer=null;
  syncNow();
  return true;
}
// Una subida que falló sin red no se reintentaba hasta la próxima edición: la
// nota quedaba solo en el dispositivo aunque la conexión ya hubiera vuelto
// (issue #579, punto 13). Se reintenta al volver la red y al volver a la
// pestaña, por el mismo camino de siempre (subida condicional y fusión).
function reintentarSubida(){
  if(!_syncTimer&&!_subida&&hayCambiosSinSubir())syncNow();
}
if(typeof document!=='undefined'&&typeof document.addEventListener==='function')
  document.addEventListener('visibilitychange',()=>{
    if(document.visibilityState==='hidden')subirSyncPendiente();
    else{reintentarSubida();traerNubeAlVolver();}
  });
if(typeof window!=='undefined'&&typeof window.addEventListener==='function'){
  window.addEventListener('pagehide',subirSyncPendiente);
  window.addEventListener('online',reintentarSubida);
  // Al volver la red, también se trae lo que haya cambiado en otro dispositivo.
  window.addEventListener('online',()=>traerNubeAlVolver());
  // En el computador, volver a la pestaña sin que se haya escondido (otra
  // ventana encima) también cuenta.
  window.addEventListener('focus',()=>traerNubeAlVolver());
}
// Una subida a la vez: si llega otra mientras una va en camino, se repite al
// terminar con el estado de ese momento. Dos subidas cruzadas partirían de la
// misma versión y la segunda chocaría con la primera.
let _subida=null,_otraSubida=false;
async function syncNow(){
  if(!supabaseClient||!currentUser)return false;
  if(_subida){_otraSubida=true;return _subida;}
  _subida=subirConVersion(currentUser.id);
  try{return await _subida;}
  finally{
    _subida=null;
    if(_otraSubida){_otraSubida=false;syncToCloud();}
  }
}
