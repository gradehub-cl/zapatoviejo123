// ─── ANALYTICS ───────────────────────────────────────────────────────────────
// Google Analytics 4 (el script va en index.html) y PostHog (nube de la Unión
// Europea, servido desde /ds por functions/ds). Si alguno no cargó, esto no
// hace nada.
//
// REGLA: acá NUNCA van datos del usuario. Ni notas, ni nombres de ramos o
// evaluaciones, ni nada que escriba él. Solo conteos, banderas y el tenant.
// Queremos saber si la app se usa, no qué le fue mal a quién.
// tests/analitica.test.js falla si alguien manda una clave prohibida.
function track(event, params){
  try{ if(typeof gtag==='function') gtag('event', event, params||{}); }catch(e){}
  conAnaliticaPropia(ph=>ph.capture(event, params||{}));
}

// PostHog (Lucas, 2026-11-20): GA4 sin cookies no reconoce a la misma persona
// de un día a otro, así que no mide retención ni embudos. PostHog sí, con el
// id de la cuenta como única identidad: nunca correo, nombre ni notas.
//
// La clave phc_ es pública por diseño (va en el navegador, como la
// sb_publishable_). Vacía = PostHog apagado y la app queda igual que antes.
const POSTHOG_KEY='phc_ra6Ep8uC7H76FrnScWUnuj3jiJYThtW3sZKuLDoqbZpF';
// Solo producción y la app: localhost y las vistas previas no ensucian los datos.
function analiticaPropiaActiva(){
  if(!POSTHOG_KEY)return false;
  try{return location.hostname==='gradehub.cl'||(typeof enAppNativa==='function'&&enAppNativa());}
  catch(e){return false;}
}
// En la app con la web adentro el origen es capacitor://; ahí se va a gradehub.cl.
function baseAnaliticaPropia(){
  try{return /^https?:$/.test(location.protocol)?'':'https://gradehub.cl';}catch(e){return 'https://gradehub.cl';}
}
// La URL sale sin query ni hash: ?amigo=usuario, tokens de recuperación de
// clave o de OAuth no tienen nada que hacer en la analítica.
const CLAVES_URL_ANALITICA=['$current_url','$referrer','$initial_referrer','$initial_current_url','$pathname'];
function limpiarEventoAnalitica(ev){
  if(!ev||typeof ev!=='object')return ev;
  const limpiar=o=>{
    if(!o||typeof o!=='object')return;
    CLAVES_URL_ANALITICA.forEach(k=>{if(typeof o[k]==='string')o[k]=o[k].split(/[?#]/)[0];});
    delete o.$ip;
  };
  limpiar(ev.properties);
  if(ev.properties){limpiar(ev.properties.$set);limpiar(ev.properties.$set_once);}
  limpiar(ev.$set);limpiar(ev.$set_once);
  return ev;
}
function configAnaliticaPropia(){
  return {
    api_host:baseAnaliticaPropia()+'/ds',
    ui_host:'https://eu.posthog.com',
    // Nada automático: solo los eventos de track(), que pasan por el test.
    // La captura automática guarda el texto de los botones, y ahí puede haber
    // una nota o el nombre de un ramo.
    autocapture:false,capture_pageview:false,capture_pageleave:false,
    capture_dead_clicks:false,capture_heatmaps:false,rageclick:false,
    capture_exceptions:false,
    // La grabación de sesiones graba la pantalla, o sea las notas: apagada.
    disable_session_recording:true,disable_surveys:true,
    advanced_disable_feature_flags:true,advanced_disable_flags:true,
    disable_external_dependency_loading:true,
    mask_all_text:true,mask_all_element_attributes:true,
    // Perfil solo para cuentas: quien usa la app sin cuenta queda anónimo.
    person_profiles:'identified_only',
    persistence:'localStorage',
    before_send:limpiarEventoAnalitica,
  };
}
const MAX_COLA_ANALITICA=200;
let _analiticaPropia=null,_analiticaPropiaEstado='sin-iniciar',_analiticaPropiaCola=[];
function conAnaliticaPropia(f){
  if(_analiticaPropiaEstado==='lista'){try{f(_analiticaPropia);}catch(e){}return;}
  if(_analiticaPropiaEstado==='falló'||!analiticaPropiaActiva())return;
  if(_analiticaPropiaCola.length<MAX_COLA_ANALITICA)_analiticaPropiaCola.push(f);
}
function iniciarAnaliticaPropia(){
  if(_analiticaPropiaEstado!=='sin-iniciar')return;
  if(!analiticaPropiaActiva()){_analiticaPropiaCola=[];return;}
  _analiticaPropiaEstado='cargando';
  const fallar=()=>{_analiticaPropiaEstado='falló';_analiticaPropiaCola=[];};
  try{
    const s=document.createElement('script');
    s.src=baseAnaliticaPropia()+'/ds/lib.js';s.async=true;
    s.onerror=fallar;
    s.onload=()=>{
      const ph=window.posthog;
      if(!ph||typeof ph.init!=='function')return fallar();
      try{ph.init(POSTHOG_KEY,configAnaliticaPropia());}catch(e){return fallar();}
      _analiticaPropia=ph;_analiticaPropiaEstado='lista';
      _analiticaPropiaCola.splice(0).forEach(f=>{try{f(ph);}catch(e){}});
    };
    document.head.appendChild(s);
  }catch(e){fallar();}
}
// Después de pintar: la analítica nunca compite con abrir la app.
try{
  if(typeof window!=='undefined'&&typeof document!=='undefined'){
    const programar=()=>setTimeout(iniciarAnaliticaPropia,1500);
    if(document.readyState==='complete')programar();
    else window.addEventListener('load',programar,{once:true});
  }
}catch(e){}

// Al entrar con cuenta: el id de Supabase y datos agregados (universidad,
// tipo de cuenta, web o app). Nada que identifique a la persona fuera de acá.
function identificarAnalitica(){
  if(!currentUser||!currentUser.id)return;
  const uid=currentUser.id;
  const props={
    tenant:(typeof S!=='undefined'&&S&&S.tenant)||null,
    tipo_cuenta:(typeof esCuentaProfesor==='function'&&esCuentaProfesor())?'profesor':'estudiante',
    plataforma:(typeof enAppNativa==='function'&&enAppNativa())?'ios':'web',
  };
  conAnaliticaPropia(ph=>{ph.identify(uid);ph.register(props);});
}
// Al cerrar sesión: la siguiente persona en este navegador parte de cero.
function olvidarAnalitica(){
  conAnaliticaPropia(ph=>ph.reset());
}
