// Solo navega. Un link no inicia sesión, cambia una cuenta ni comparte notas.
const PARAMETROS_AUTH_ENLACE=['code','token','token_hash','access_token','refresh_token','type','state','error','error_code','error_description'];
let _enlaceUniversalPendiente=null,_ultimoEnlaceUniversal=null,_sesionEnlacesUniversales=null;
function destinoEnlaceUniversal(valor){
  if(typeof valor!=='string'||valor.length>2048)return null;
  let u;try{u=new URL(valor);}catch(e){return null;}
  if(u.origin!=='https://gradehub.cl'||u.username||u.password)return null;
  // OAuth y recuperación siguen en el navegador, incluso cuando vuelven a /.
  if(u.hash||PARAMETROS_AUTH_ENLACE.some(k=>u.searchParams.has(k))||
    /^\/(?:auth(?:\/|$)|login-callback(?:\/|$)|privacidad(?:\.html)?\/?$|terminos(?:\.html)?\/?$|preguntas(?:\.html)?\/?$|calculadora(?:\.html)?\/?$|cal\/|mcp\/)/.test(u.pathname))return null;
  if(u.pathname==='/'){
    const p=u.searchParams,profe=p.get('profe');
    if(p.getAll('profe').length===1&&!p.has('dar-clases')&&/^[A-HJ-NP-Z2-9]{8}$/i.test(profe||''))return {tipo:'profe',codigo:profe.toUpperCase()};
    if(p.has('dar-clases')&&!p.has('profe')&&p.getAll('dar-clases').length===1)return {tipo:'dar-clases'};
    if(p.get('desde')==='calculadora')return {tipo:'calculadora'};
  }
  return {tipo:'inicio'};
}
function sesionListaParaEnlaceUniversal(){
  return !!(enAppNativa()&&currentUser&&S.onboardingDone&&!enRecuperacion&&
    _sesionEnlacesUniversales?.uid===currentUser.id&&_sesionEnlacesUniversales.visita===_visitaSesion&&
    getCacheOwner()===currentUser.id&&!['auth','onboard','reset','app-error'].some(p=>document.getElementById('screen-'+p)?.classList.contains('active')));
}
function contextoEnlaceUniversal(destino){
  if(destino.tipo==='profe'&&typeof guardarProfePendiente==='function'){
    guardarProfePendiente(destino.codigo);
    mostrarContextoInvitacionProfesor();
  }
  if(destino.tipo==='dar-clases'&&!currentUser&&typeof guardarEntradaProfesor==='function'){
    guardarEntradaProfesor(true);pintarSubtituloAuth();
  }
}
function recibirEnlaceUniversal(url){
  if(!enAppNativa())return false;
  const destino=destinoEnlaceUniversal(url);if(!destino)return false;
  _ultimoEnlaceUniversal=_enlaceUniversalPendiente={destino,uid:currentUser?.id||null};
  contextoEnlaceUniversal(destino);
  if(destino.tipo==='profe'){
    // La misma etapa de la invitación web; nunca el código ni la URL.
    track('panel_alumnos_link_abierto');
    try{sessionStorage.setItem(ORIGEN_ENTRADA_KEY,'profesor');}catch(e){}
  }else if(destino.tipo==='calculadora'&&!currentUser){
    try{sessionStorage.setItem(ORIGEN_ENTRADA_KEY,'calculadora');}catch(e){}
  }
  resolverEnlaceUniversalPendiente();
  return true;
}
function resolverEnlaceUniversalPendiente(){
  if(!_enlaceUniversalPendiente||!sesionListaParaEnlaceUniversal())return null;
  const pedido=_enlaceUniversalPendiente,{destino,uid}=pedido;
  _enlaceUniversalPendiente=null;
  if(uid&&uid!==currentUser.id){
    if(destino.tipo==='profe'&&profePendiente()===destino.codigo)olvidarProfePendiente();
    return null;
  }
  const cuenta=currentUser.id,visita=_visitaSesion;
  const abrir=()=>{
    // Una confirmación de salida puede quedar abierta mientras cambia la cuenta
    // o llega otro link. Nunca se retoma el destino de esa visita anterior.
    if(!sesionListaParaEnlaceUniversal()||cuenta!==currentUser.id||visita!==_visitaSesion||pedido!==_ultimoEnlaceUniversal)return;
    try{
      if(destino.tipo==='profe'){
        contextoEnlaceUniversal(destino);
        revisarInvitacionProfesor().catch(()=>{});
      }else{
        closeModal();
        showTab(destino.tipo==='dar-clases'?'profesor':pestanaInicial()); // Conserva los permisos de esta cuenta.
      }
    }catch(e){showTab(pestanaInicial());}
  };
  if(typeof cambiosSinGuardarNav==='function'&&cambiosSinGuardarNav()){
    showConfirm('¿Salir sin guardar?','Tienes cambios sin guardar. Puedes quedarte para terminarlos o salir para abrir el enlace.',abrir,{label:'Salir',focusCancel:true});
  }else abrir();
  return destino.tipo;
}
// Se llama al pintar la app, DESPUÉS del login/aislamiento de caché y onboarding.
function activarEnlacesUniversales(){
  if(!enAppNativa()||!currentUser||getCacheOwner()!==currentUser.id)return null;
  _sesionEnlacesUniversales={uid:currentUser.id,visita:_visitaSesion};
  return resolverEnlaceUniversalPendiente();
}
if(typeof APP_NATIVA!=='undefined'&&APP_NATIVA&&window.Capacitor?.Plugins?.App){
  const appEnlaces=window.Capacitor.Plugins.App;
  let recibioEvento=false,desdeLanzamiento=null;
  // Capacitor retiene appUrlOpen hasta que exista un listener. getLaunchUrl
  // cubre el arranque en frío; si llegan ambos, esa primera URL se consume una vez.
  try{Promise.resolve(appEnlaces.addListener('appUrlOpen',ev=>{
    recibioEvento=true;
    const duplicado=desdeLanzamiento&&ev?.url===desdeLanzamiento;
    desdeLanzamiento=null;
    if(!duplicado)recibirEnlaceUniversal(ev?.url);
  })).catch(()=>{});}catch(e){}
  if(typeof appEnlaces.getLaunchUrl==='function'){
    try{Promise.resolve(appEnlaces.getLaunchUrl()).then(ev=>{
      if(recibioEvento)return;
      desdeLanzamiento=ev?.url||null;
      recibirEnlaceUniversal(desdeLanzamiento);
    }).catch(()=>{});}catch(e){}
  }
  // Un evento puede llegar antes de marketplace.js, donde vive la invitación.
  document.addEventListener('DOMContentLoaded',()=>{if(_enlaceUniversalPendiente)contextoEnlaceUniversal(_enlaceUniversalPendiente.destino);},{once:true});
}
