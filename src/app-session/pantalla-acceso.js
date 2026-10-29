
function authError(msg,kind){
  // kind: 'error' (default, rojo) | 'info' (neutro, para mensajes tipo "revisa tu correo")
  const el=document.getElementById('auth-error');
  el.textContent=msg||'';
  el.style.display=msg?'block':'none';
  el.style.color=kind==='info'?'var(--fg2)':'var(--red)';
}
function toggleAuthMode(){
  authMode=authMode==='login'?'signup':'login';
  resetPasswordVisibility();
  document.getElementById('auth-sub').textContent=authMode==='login'?'Tus notas, tu promedio y cuánto te falta para aprobar.':'Guarda tus notas y revísalas desde cualquier dispositivo.';
  document.getElementById('auth-btn').textContent=authMode==='login'?'Iniciar sesión':'Crear cuenta';
  document.getElementById('auth-toggle').textContent=authMode==='login'?'¿No tienes cuenta? Crea una':'¿Ya tienes cuenta? Inicia sesión';
  document.getElementById('auth-pass').setAttribute('autocomplete',authMode==='login'?'current-password':'new-password');
  const confirmWrap=document.getElementById('auth-pass-confirm-wrap');
  confirmWrap.style.display=authMode==='signup'?'block':'none';
  confirmWrap.setAttribute('aria-hidden',authMode==='signup'?'false':'true');
  document.getElementById('auth-pass2').value='';
  const legalWrap=document.getElementById('auth-legal-accept-wrap');
  const legalAccept=document.getElementById('auth-legal-accept');
  legalWrap.style.display=authMode==='signup'?'block':'none';
  legalWrap.setAttribute('aria-hidden',authMode==='signup'?'false':'true');
  if(authMode!=='signup'&&legalAccept)legalAccept.checked=false;
  // Al iniciar sesión no se anuncia un mínimo: sería mentirle a quien creó su
  // cuenta cuando el mínimo era otro.
  document.getElementById('auth-pass').placeholder=authMode==='login'?'Tu contraseña':PASS_MIN+'+ caracteres, letras y números';
  document.getElementById('auth-fp').style.display=authMode==='login'?'block':'none';
  authError('');
}
let temporizadorCargaInicial=null;
function ocultarCargaInicial(){
  if(temporizadorCargaInicial!==null){clearTimeout(temporizadorCargaInicial);temporizadorCargaInicial=null;}
  const pantalla=document.getElementById('screen-loading');
  if(pantalla)pantalla.classList.remove('active');
}
function prepararCargaInicial(){
  const boton=document.getElementById('carga-inicial-reintentar');
  if(!boton||typeof boton.addEventListener!=='function')return;
  boton.addEventListener('click',()=>location.reload());
  temporizadorCargaInicial=setTimeout(()=>{
    const pantalla=document.getElementById('screen-loading');
    if(!pantalla||!pantalla.classList.contains('active'))return;
    const detalle=document.getElementById('carga-inicial-detalle');
    if(detalle)detalle.textContent='Está tardando más de lo esperado. Revisa tu conexión y recarga.';
    boton.hidden=false;
  },12000);
}
function showAuthScreen(){
  if(typeof olvidarAvisosFeedback==='function')olvidarAvisosFeedback();
  ocultarCargaInicial();
  ['home','stats','agenda','ramo','onboard','reset','app-error'].forEach(s=>{const el=document.getElementById('screen-'+s);if(el)el.classList.remove('active');});
  document.getElementById('bottom-nav').style.display='none';
  // Al cerrar sesión la app viene del carrusel de pestañas. Con `tab-mode` el
  // login se dibuja como capa superpuesta y quedaba corrido hacia abajo; al
  // abrir de cero esa clase no existe y se veía bien (visto en iPhone,
  // 2026-10-06). Se sale del carrusel igual que en showAppErrorScreen.
  const app=document.querySelector('.app');
  if(app)app.classList.remove('tab-mode','dragging');
  try{window.scrollTo(0,0);}catch(e){}
  document.getElementById('screen-auth').classList.add('active');
  marcarUltimoLogin();
  if(typeof mostrarContextoInvitacionProfesor==='function')mostrarContextoInvitacionProfesor();
  // El esqueleto se pinta YA, con el alto definitivo: la RPC tarda cerca de un
  // segundo en producción y, sin esto, los números entraban empujando el botón
  // de Google hacia abajo justo cuando alguien iba a tocarlo.
  pintarEsqueletoEstadisticas();
  cargarEstadisticasPublicas();
}
// "1.240 estudiantes ya llevan sus notas acá". Sale de una RPC pública que
// devuelve solo agregados (supabase/estadisticas_publicas.sql). Con pocas
// cuentas la línea juega en contra —"12 estudiantes" suena a nadie—, así que
// bajo el mínimo no se muestra nada. Si la RPC falla, tampoco: es adorno.
const MINIMO_CUENTAS_PARA_MOSTRAR=100;
const ETIQUETAS_ESTADISTICAS=['estudiantes','ramos','notas'];
function fichaEstadistica(valor,etiqueta){
  const n=Number(valor||0).toLocaleString('es-CL');
  return `<div class="auth-stat"><b data-final="${Number(valor)||0}">${n}</b><span>${etiqueta}</span></div>`;
}
// Las tres etiquetas con un guion en vez del número: mismo alto que el final,
// así nada se mueve cuando llegan los datos. Si la consulta falla o no alcanza
// el mínimo, la banda se esconde y el guion no queda nunca a la vista.
function pintarEsqueletoEstadisticas(){
  const el=document.getElementById('auth-stats');
  if(!el||!supabaseClient)return;
  el.innerHTML=ETIQUETAS_ESTADISTICAS.map(l=>`<div class="auth-stat"><b class="auth-stat-cargando">—</b><span>${l}</span></div>`).join('');
  el.setAttribute('aria-busy','true');
  el.hidden=false;
}
async function cargarEstadisticasPublicas(){
  const el=document.getElementById('auth-stats');
  if(!el||!supabaseClient)return;
  try{
    const {data,error}=await supabaseClient.rpc('estadisticas_publicas');
    if(error||!data||!(data.cuentas>=MINIMO_CUENTAS_PARA_MOSTRAR)){el.hidden=true;el.innerHTML='';return;}
    const n=x=>Number(x||0).toLocaleString('es-CL');
    const tile=fichaEstadistica;
    el.innerHTML=tile(data.cuentas,'estudiantes')+(data.ramos>0?tile(data.ramos,'ramos'):'')+(data.notas>0?tile(data.notas,'notas'):'');
    el.removeAttribute('aria-busy');
    el.hidden=false;
    // Los números suben desde 0 en ~700 ms. Es adorno: con reduced-motion se
    // quedan como están, y el texto final ya estaba pintado por si el rAF no corre.
    if(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
    const t0=performance.now();
    const paso=t=>{
      const p=Math.min(1,(t-t0)/700),e=1-Math.pow(1-p,3);
      el.querySelectorAll('b[data-final]').forEach(b=>{b.textContent=n(Math.round(Number(b.dataset.final)*e));});
      if(p<1)requestAnimationFrame(paso);
    };
    requestAnimationFrame(paso);
  }catch(e){el.hidden=true;el.innerHTML='';}
}
// Una sesión válida que falla al dibujarse no es un error de login. Esta
// pantalla conserva esa distinción: no expone el stack, no cierra la sesión y
// ofrece una acción que sí puede ayudar (cargar la app completa de nuevo).
function showAppErrorScreen(fase){
  ocultarCargaInicial();
  ['auth','home','stats','agenda','ramo','onboard','reset','app-error'].forEach(s=>{const el=document.getElementById('screen-'+s);if(el)el.classList.remove('active');});
  const app=document.querySelector('.app');
  if(app)app.classList.remove('tab-mode','dragging');
  const nav=document.getElementById('bottom-nav');
  if(nav)nav.style.display='none';
  const comprobando=fase==='obtener_sesion';
  const title=document.getElementById('app-error-title');
  const desc=document.getElementById('app-error-desc');
  if(title)title.textContent=comprobando?'No pudimos comprobar tu sesión':'No pudimos abrir GradeHub';
  if(desc)desc.textContent=comprobando
    ?'Parece un problema de conexión. Tus datos no se borraron; recarga para intentarlo de nuevo.'
    :'Tu sesión sigue activa y tus datos no se borraron. Recarga para intentarlo de nuevo.';
  const screen=document.getElementById('screen-app-error');
  if(screen)screen.classList.add('active');
}

// El detalle ayuda a encontrar el punto exacto que falló, pero una excepción
// también podría incluir accidentalmente un dato que venía del estado. Antes
// de mandarla a analítica se quitan correos, números y todos los textos que el
// estudiante pudo haber escrito o recibido en su cuenta.
