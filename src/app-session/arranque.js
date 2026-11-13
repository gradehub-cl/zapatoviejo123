const VIAJE_ARRANQUE_MS=500,VIAJE_ARRANQUE_CURVA='cubic-bezier(.45,0,.15,1)';
const RESPIRO_MS=1600; // una respiración: el 1.6s de .arr-arriba en styles.css
function quitarArranque(){
  const a=typeof document!=='undefined'&&document.getElementById&&document.getElementById('arranque');
  if(!a||!a.classList||typeof a.classList.add!=='function')return; // los tests usan elementos de mentira
  // Cuando la app carga rápido, el splash nativo todavía tapa la vista web, que
  // recién se está dibujando: sacarlo de una dejaba un cuadro en blanco, y con
  // su desvanecido quedaba un segundo logo quieto al centro. Se espera a que la
  // web esté en pantalla, se saca el splash (soltarSplash, en index.html) y
  // después se sigue.
  const despues=f=>typeof requestAnimationFrame==='function'?requestAnimationFrame(()=>requestAnimationFrame(f)):f();
  despues(()=>{
    if(typeof soltarSplash==='function')soltarSplash();
    despues(()=>{
      // Cualquier falla del viaje termina en desvanecer: la pantalla se va igual.
      try{if(volarAlLogin(a))return;}catch(e){}
      desvanecer(a);
    });
  });
}
function desvanecer(a){a.classList.add('listo');setTimeout(()=>a.remove(),400);}
function volarAlLogin(a){
  const svg=a.querySelector('svg'),destino=document.querySelector('#screen-auth.active .ob-icon img');
  if(!svg||!destino||matchMedia('(prefers-reduced-motion: reduce)').matches)return false;
  // Sin sesión la app carga tan rápido que el logo subía apenas aparecía
  // (Martín, en su iPhone): se deja terminar la primera respiración, que acaba
  // con las capas juntas. Con sesión ya respiró mientras bajaban los datos.
  const desde=Number(a.dataset&&a.dataset.desde)||0;
  const falta=RESPIRO_MS-(performance.now()-desde);
  setTimeout(()=>{try{if(despegar(a,svg,destino))return;}catch(e){}desvanecer(a);},Math.max(0,falta));
  return true;
}
function despegar(a,svg,destino){
  const r=destino.getBoundingClientRect(),o=svg.getBoundingClientRect();
  if(!r.width||!o.width)return false;
  // El logo del login va dentro del padding del <img>: el destino es esa caja.
  const pad=parseFloat(getComputedStyle(destino).paddingLeft)||0;
  const dx=r.left+r.width/2-(o.left+o.width/2),dy=r.top+r.height/2-(o.top+o.height/2);
  // Las capas vuelven a juntarse desde donde iban, no de golpe.
  a.querySelectorAll('.arr-capa').forEach(c=>{
    const t=getComputedStyle(c).transform;c.style.animation='none';
    if(t&&t!=='none'&&c.animate)c.animate([{transform:t},{transform:'none'}],{duration:VIAJE_ARRANQUE_MS,easing:VIAJE_ARRANQUE_CURVA});
  });
  destino.style.opacity='0';
  a.classList.add('viaje');
  svg.style.transform=`translate(${dx}px,${dy}px) scale(${((r.width-2*pad)/o.width).toFixed(4)})`;
  setTimeout(()=>{destino.style.opacity='';a.remove();},VIAJE_ARRANQUE_MS+20);
  return true;
}
// app.js pesa ~600 KB y es lo que más se corta con una conexión mala: "app.js no
// cargó" llegó 13 veces en una semana, de 11 cuentas, casi todas una sola vez y
// que al día siguiente entraron bien (errores_app, 2026-10-26). Antes de mostrar
// el aviso se pide de nuevo; si llega entero, se recarga la página, que con el
// archivo ya en caché arranca desde cero y no a medias (los scripts que corrieron
// sin app.js quedaron incompletos). Una vez por pestaña y versión: si vuelve a
// fallar, sale el aviso de recargar en vez de una recarga sin fin.
const REINTENTO_APP_JS='gradehub_reintento_app_js';
async function reintentarAppJs(){
  const version=versionDeLaApp();
  try{if(sessionStorage.getItem(REINTENTO_APP_JS)===version)return false;}catch(e){return false;}
  const script=document.querySelector('script[src*="app.js?v="]');
  if(!script||!script.src||typeof fetch!=='function')return false;
  const control=typeof AbortController==='function'?new AbortController():null;
  const plazo=setTimeout(()=>{if(control)control.abort();},15000);
  try{
    const r=await fetch(script.src,control?{cache:'reload',signal:control.signal}:{cache:'reload'});
    if(!r||!r.ok)return false;
    await r.text();
  }catch(e){return false;}
  finally{clearTimeout(plazo);}
  try{sessionStorage.setItem(REINTENTO_APP_JS,version);}catch(e){return false;}
  location.reload();
  return true;
}
async function boot(){
  let recargando=false;
  try{
    if(!supabaseClient){
      // Sin configurar Supabase → funciona en modo local (fallback)
      ocultarCargaInicial();
      document.getElementById('screen-auth').classList.remove('active');
      if(S.onboardingDone)showMainApp();
      else {document.getElementById('screen-onboard').classList.add('active');obIniciar();}
      return;
    }
    prepararCargaInicial();
    // Suscribirse a cambios de auth: el evento PASSWORD_RECOVERY viene cuando
    // el usuario abre el link del correo de "olvidé mi contraseña".
    supabaseClient.auth.onAuthStateChange((event, session)=>{
      if(typeof sesionEncuestasCambio==='function')sesionEncuestasCambio(event,session?.user?.id);
      // Otra pestaña puede salir o cambiar de cuenta, y una sesión puede vencer.
      // Se reinicia la visita para cancelar también las lecturas de la cuenta
      // anterior. La copia local se conserva; no se borra una edición sin subir.
      if(!_cerrandoSesion&&currentUser&&(event==='SIGNED_OUT'||
        (event==='SIGNED_IN'&&session&&session.user.id!==currentUser.id))){
        currentUser=null;closeModal();showAuthScreen();location.reload();return;
      }
      if(event==='PASSWORD_RECOVERY'){
        enRecuperacion=true;
        if(session)currentUser=session.user;
        limpiarFragmentoAuth();
        showResetScreen();
      }
    });
    let session=null;
    try{
      const result=await supabaseClient.auth.getSession();
      session=result&&result.data?result.data.session:null;
    }catch(e){
      registrarErrorArranque(e,'obtener_sesion');
      showAppErrorScreen('obtener_sesion');
      return;
    }
    if(!session){showAuthScreen();return;}

    const entradaApple=consumirEntradaApple();
    if(esEntradaApple(session.user,entradaApple)){
      try{prepararCacheApple(session.user);}catch(e){
        try{await supabaseClient.auth.signOut({scope:'local'});}catch(_){}
        showAuthScreen();authError(traduceAuthError({code:'APPLE_CACHE_NO_AISLADA'}));return;
      }
      if(entradaApple)recordarMetodoLogin('apple');
    }
    currentUser=session.user;
    // Si venimos de un correo de recuperación, se muestra la pantalla de nueva
    // contraseña en vez de entrar directo a la app (ver LLEGA_DE_RECUPERACION).
    limpiarFragmentoAuth();
    if(enRecuperacion){showResetScreen();return;}
    // app.js trae el estado y las pantallas. Si su descarga se cortó (pesa
    // ~600 KB), no hay app que abrir: se pide recargar y se reporta con nombre,
    // en vez de fallar adentro de afterLogin con un error que no dice qué pasó.
    // `track` es una declaración de función de app.js: existe apenas el archivo
    // se leyó, aunque algo falle más abajo.
    if(typeof track!=='function'){
      const aviso=document.getElementById('carga-inicial-detalle');
      if(aviso)aviso.textContent='Terminando de descargar GradeHub…';
      if(await reintentarAppJs()){recargando=true;return;}
      registrarErrorArranque(new Error('app.js no cargó'),'cargar_app');
      showAppErrorScreen('abrir_app');
      return;
    }
    // Llegó tras un reintento: se anota para saber cuántas veces el reintento
    // evitó el aviso, y la pestaña queda libre para reintentar otra vez.
    try{
      if(sessionStorage.getItem(REINTENTO_APP_JS)){
        sessionStorage.removeItem(REINTENTO_APP_JS);
        reportarError(new Error('app.js cargó al reintentar'),'arranque:reintento');
      }
    }catch(e){}
    const detalle=document.getElementById('carga-inicial-detalle');
    if(detalle)detalle.textContent='Preparando tu semestre…';
    try{
      await afterLogin();
      if(esEntradaApple(session.user,entradaApple))mostrarAvisoCuentaApple(session.user,entradaApple);
    }catch(e){
      registrarErrorArranque(e,'abrir_app');
      showAppErrorScreen('abrir_app');
    }
  }finally{
    // Mientras recarga tras el reintento, la pantalla de carga se queda: sacarla
    // mostraba un instante el login. Si la recarga no llega, se va igual.
    if(recargando)setTimeout(quitarArranque,8000);else quitarArranque();
  }
}
