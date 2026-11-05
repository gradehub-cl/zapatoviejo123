// ─── INSTALAR COMO APP ───────────────────────────────────────────────────────
//
// Instalada, GradeHub abre en pantalla completa y con su ícono: se siente una
// app y no una pestaña. El manifest está desde el principio, pero nadie se
// entera de que se puede.
//
// El aviso vive AL PIE de Inicio, no flotando: aparece cuando alguien llega
// hasta abajo, se va con el scroll y nunca tapa un botón ni interrumpe lo que
// estaba haciendo. Y no en la primera visita —a quien recién llega no se le
// pide instalar nada—, sino a partir de la segunda.
//
// Dos caminos porque los navegadores son dos mundos:
//   Android/Chrome dispara `beforeinstallprompt`; se guarda y el botón lo abre.
//   iOS/Safari no tiene API: solo queda decir dónde está el menú Compartir.
const INSTALAR_NO_KEY='gradehub_instalar_no';
const VISITAS_KEY='gradehub_visitas';
let _promptInstalar=null;

function lsLeer(k){try{return localStorage.getItem(k);}catch(e){return null;}}
function lsEscribir(k,v){try{localStorage.setItem(k,v);}catch(e){}}

// La app iOS (Capacitor). app-session.js tiene su propia constante; esta es
// función porque app.js carga antes y no puede declarar el mismo nombre.
function enAppNativa(){
  try{return !!(window.Capacitor&&typeof window.Capacitor.isNativePlatform==='function'&&window.Capacitor.isNativePlatform());}
  catch(e){return false;}
}
// La clase html.app-nativa la pone index.html antes de pintar.
// Vibración, solo en la app (HIG Playing haptics): un toque suave al agregar
// una nota y la advertencia al borrar (pedido de Martín). Además, lo que en iOS
// ya vibra solo: el tic de selección de la ruleta y de los interruptores, y el
// golpe al levantar un ramo para reordenarlo. Nada más: una vibración que se
// repite en todo deja de decir algo.
let _hapticaSeleccion=null;
function vibrar(tipo){
  try{
    const H=enAppNativa()&&window.Capacitor.Plugins&&window.Capacitor.Plugins.Haptics;
    if(!H)return;
    if(tipo==='borrar')H.notification({type:'WARNING'}).catch(()=>{});
    else if(tipo==='levantar')H.impact({style:'MEDIUM'}).catch(()=>{});
    // El generador de selección se prepara una vez y queda listo para cada tic.
    else if(tipo==='seleccion'){
      _hapticaSeleccion=_hapticaSeleccion||Promise.resolve(H.selectionStart());
      _hapticaSeleccion.then(()=>H.selectionChanged()).catch(()=>{});
    }
    else H.impact({style:'LIGHT'}).catch(()=>{});
  }catch(e){}
}
// Un interruptor de iOS hace tic al cambiar; los de la app (.toggle) también.
document.addEventListener('change',e=>{
  const t=e.target;
  if(t&&t.matches&&t.matches('.toggle input[type=checkbox]'))vibrar('seleccion');
});
// Dentro de la app no hay "otra pestaña": un enlace con target=_blank no abría
// nada (Términos, Privacidad, Preguntas, Google Calendar) y navegar la vista web
// a otro sitio la dejaba congelada, como pasaba con Google. Ahí se abre en la
// hoja de Safari; las páginas propias, desde gradehub.cl. Devuelve false si no
// lo manejó (la web, o un mailto: que abre iOS).
function abrirFuera(url){
  if(!enAppNativa())return false;
  let abs;
  try{abs=new URL(url,'https://gradehub.cl/').href;}catch(e){return false;}
  const Browser=window.Capacitor.Plugins&&window.Capacitor.Plugins.Browser;
  if(!/^https?:/.test(abs)||!Browser)return false;
  Browser.open({url:abs,presentationStyle:'popover'}).catch(()=>{});
  return true;
}
if(typeof document!=='undefined'&&document.addEventListener)document.addEventListener('click',e=>{
  const a=e.target&&e.target.closest&&e.target.closest('a[target="_blank"]');
  // El contacto de una clase tiene su propio manejo (mide antes de abrir).
  if(!a||a.hasAttribute('data-contactar'))return;
  if(abrirFuera(a.getAttribute('href')))e.preventDefault();
},true);

function appYaInstalada(){
  try{
    // La app iOS (Capacitor) ya es la app instalada: ofrecer "Agregar a
    // pantalla de inicio" ahí no tiene sentido. El aviso queda solo para la web.
    if(enAppNativa())return true;
    return !!(navigator.standalone||(window.matchMedia&&window.matchMedia('(display-mode: standalone)').matches));
  }catch(e){return false;}
}
// Safari en iPhone/iPad. El iPad moderno se declara Macintosh, y por eso se
// mira también si la pantalla es táctil. Chrome y Firefox en iOS usan el mismo
// WebKit pero NO ofrecen "Agregar a pantalla de inicio": ahí el aviso mentiría.
function esSafariDeIOS(){
  const ua=navigator.userAgent||'';
  const iOS=/iPad|iPhone|iPod/.test(ua)||(/Macintosh/.test(ua)&&(navigator.maxTouchPoints||0)>1);
  return iOS&&!/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);
}
function contarVisita(){
  const n=Number(lsLeer(VISITAS_KEY)||0)+1;
  lsEscribir(VISITAS_KEY,String(Math.min(n,99)));
  return n;
}
function descartarAvisoInstalar(){
  lsEscribir(INSTALAR_NO_KEY,'1');
  const el=document.getElementById('instalar-aviso');
  if(el){el.hidden=true;el.innerHTML='';}
  track('instalar_descartado');
}
async function instalarApp(){
  if(!_promptInstalar)return;
  const p=_promptInstalar;_promptInstalar=null;
  try{
    p.prompt();
    const r=await p.userChoice;
    track('instalar_respuesta',{resultado:r&&r.outcome==='accepted'?'acepto':'rechazo'});
    if(r&&r.outcome==='accepted')descartarAvisoInstalar();
  }catch(e){}
}
function pintarAvisoInstalar(){
  const el=document.getElementById('instalar-aviso');
  if(!el)return;
  const visitas=Number(lsLeer(VISITAS_KEY)||0);
  if(appYaInstalada()||lsLeer(INSTALAR_NO_KEY)==='1'||visitas<2){el.hidden=true;el.innerHTML='';return;}
  const puede=!!_promptInstalar, iOS=esSafariDeIOS();
  if(!puede&&!iOS){el.hidden=true;el.innerHTML='';return;}
  const icono='<svg class="ic" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="2.5" width="12" height="19" rx="2.5"/><path d="M11 18.5h2"/></svg>';
  const cuerpo=puede
    ? `<div class="instalar-texto">Ábrela desde tu pantalla de inicio, a pantalla completa y sin la barra del navegador.</div>
       <div class="instalar-acciones"><button type="button" class="instalar-si" onclick="instalarApp()">Instalar</button><button type="button" onclick="descartarAvisoInstalar()">Ahora no</button></div>`
    : `<div class="instalar-texto">Toca <b>Compartir</b> abajo y elige <b>Agregar a pantalla de inicio</b>. Se abre a pantalla completa, sin la barra de Safari.</div>
       <div class="instalar-acciones"><button type="button" onclick="descartarAvisoInstalar()">Entendido</button></div>`;
  el.innerHTML=`${icono}<div class="instalar-cuerpo"><div class="instalar-titulo">Ten GradeHub como app</div>${cuerpo}</div>
    <button type="button" class="instalar-cerrar" onclick="descartarAvisoInstalar()" aria-label="No mostrar este aviso">×</button>`;
  el.hidden=false;
  track('instalar_ofrecido',{via:puede?'prompt':'ios'});
}
// El navegador avisa cuando la app cumple los requisitos para instalarse. Se
// guarda el evento (sin `preventDefault` no se puede usar después) y se repinta
// por si el aviso ya estaba en pantalla esperándolo.
window.addEventListener('beforeinstallprompt',e=>{
  e.preventDefault();
  _promptInstalar=e;
  pintarAvisoInstalar();
});
window.addEventListener('appinstalled',()=>{_promptInstalar=null;descartarAvisoInstalar();track('instalar_completado');});

function showMainApp(){
  applyTheme();
  publicarResumenWidgets();
  document.getElementById('screen-onboard').classList.remove('active');
  document.getElementById('bottom-nav').style.display='flex';
  document.querySelector('.app').classList.add('tab-mode');
  renderHome();renderStats();renderAgenda(); // los 3 siempre montados
  // Una cuenta de profesor abre en Clases (#697): sus pestañas se arman antes.
  recalcularNavTabs();
  showTab(pestanaInicial());
  contarVisita();
  pintarAvisoInstalar();
  // Si llegó con el link de un profesor, ahora que hay sesión se le ofrece compartir.
  if(typeof revisarInvitacionProfesor==='function')setTimeout(revisarInvitacionProfesor,600);
  // En una cuenta existente el catálogo puede no haberse pedido nunca: si un
  // ramo UC quedó sin SCT, hay que traerlo incluso sin abrir el buscador. Si ya
  // se cargó durante onboarding, completa de inmediato.
  //
  // Incluye los ramos sin procedencia, y ahí está el caso reportado: durante el
  // onboarding el catálogo todavía no bajó, así que buscar un electivo no
  // encuentra nada y la persona lo escribe a mano. Ese ramo nace sin origen, y
  // mientras esta condición lo excluía no se pedía el archivo, no se completaba
  // nada, y la cuenta entera se quedaba en promedio simple para siempre.
  //
  // Primero se consultan solo las siglas y nombres exactos que faltan en
  // catalogo_uc. El archivo completo queda como respaldo cuando Supabase no
  // está disponible o no puede responder.
  if(S.tenant==='uc'&&(S.ramos||[]).some(r=>(!r.origen||r.origen.tenant==='uc')&&(r.creditos===null||r.creditos===undefined))){
    if(cursosUcExtra())completarCreditosUCTrasCarga();
    else completarCreditosUCPendientes();
  }
}
// Orden izq→der para el deslizar. Es una lista VIVA: la pestaña de profesor solo
// existe para quien está aprobado, así que el carrusel tiene que poder crecer y
// encogerse sin dejar a nadie parado en una pestaña que ya no está.
