
// ─── ENTRADA DE PROFESOR ────────────────────────────────────────────────────
// Casi todos los que llegan estudian, así que el onboarding ya no pregunta.
// Quien da clases entra por «Soy profesor particular», al pie del login, o por
// el link gradehub.cl/?dar-clases que se les manda. La intención va en su
// propia clave de localStorage —no en gradehub_v1 ni en la pestaña— porque
// tiene que sobrevivir el viaje a Google. La consume el onboarding.
const CLAVE_ENTRADA_PROFESOR='gradehub_entrada_profesor';
function entradaProfesor(){try{return localStorage.getItem(CLAVE_ENTRADA_PROFESOR)==='1';}catch(e){return false;}}
function guardarEntradaProfesor(si){try{if(si)localStorage.setItem(CLAVE_ENTRADA_PROFESOR,'1');else localStorage.removeItem(CLAVE_ENTRADA_PROFESOR);}catch(e){}}
function consumirEntradaProfesor(){const si=entradaProfesor();guardarEntradaProfesor(false);return si;}
try{
  if(new URLSearchParams(location.search).has('dar-clases')){
    guardarEntradaProfesor(true);
    const url=new URL(location.href);
    url.searchParams.delete('dar-clases');
    history.replaceState(history.state,'',url.pathname+url.search+url.hash);
  }
}catch(e){}
function pintarSubtituloAuth(){
  const sub=document.getElementById('auth-sub'),boton=document.getElementById('auth-dar-clases');
  const profesor=entradaProfesor();
  if(sub)sub.textContent=profesor?'Entra para publicar tus clases particulares.'
    :authMode==='login'?'Tus notas, tu promedio y cuánto te falta para aprobar.':'Guarda tus notas y revísalas desde cualquier dispositivo.';
  if(boton)boton.textContent=profesor?'Soy estudiante':'Soy profesor particular';
}
function alternarEntradaProfesor(){guardarEntradaProfesor(!entradaProfesor());pintarSubtituloAuth();}
function authError(msg,kind){
  // kind: 'error' (default, rojo) | 'info' (neutro, para mensajes tipo "revisa tu correo")
  const el=document.getElementById('auth-error');
  el.textContent=msg||'';
  el.style.display=msg?'block':'none';
  el.style.color=kind==='info'?'var(--fg2)':'var(--red)';
}
function toggleAuthMode(){ponerModoAuth(authMode==='login'?'signup':'login');}
// Un dispositivo que nunca entró casi siempre es alguien nuevo: parte en Crear
// cuenta. Si ya se entró desde acá, en Iniciar sesión. Lo recordado es solo el
// método (ver ultimoMetodoLogin), nunca el correo.
function modoAuthInicial(){return typeof ultimoMetodoLogin==='function'&&ultimoMetodoLogin()?'login':'signup';}
function ponerModoAuth(modo){
  authMode=modo==='signup'?'signup':'login';
  if(typeof resetPasswordVisibility==='function')resetPasswordVisibility();
  const el=id=>document.getElementById(id);
  if(!el('auth-btn'))return;
  pintarSubtituloAuth();
  el('auth-btn').textContent=authMode==='login'?'Iniciar sesión':'Crear cuenta';
  document.getElementById('auth-toggle').textContent=authMode==='login'?'¿No tienes cuenta? Crea una':'¿Ya tienes cuenta? Inicia sesión';
  document.getElementById('auth-pass').setAttribute('autocomplete',authMode==='login'?'current-password':'new-password');
  const confirmWrap=document.getElementById('auth-pass-confirm-wrap');
  confirmWrap.style.display=authMode==='signup'?'block':'none';
  confirmWrap.setAttribute('aria-hidden',authMode==='signup'?'false':'true');
  document.getElementById('auth-pass2').value='';
  // Al iniciar sesión no se anuncia un mínimo: sería mentirle a quien creó su
  // cuenta cuando el mínimo era otro.
  document.getElementById('auth-pass').placeholder=authMode==='login'?'Tu contraseña':PASS_MIN+'+ caracteres, letras y números';
  document.getElementById('auth-fp').style.display=authMode==='login'?'block':'none';
  authError('');
  revisarAuthListo();
}
// Las mismas reglas que submitAuth, sin mostrar errores: solo dicen si tocar
// el botón principal ya puede funcionar.
function formularioAuthListo(){
  const v=id=>(document.getElementById(id)||{}).value||'';
  const p=v('auth-pass');
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v('auth-user').trim())||!p)return false;
  return authMode!=='signup'||(!passwordPolicyError(p)&&p===v('auth-pass2'));
}
// El halo sale solo al pasar de no listo a listo, no en cada tecla.
function revisarAuthListo(){
  const btn=document.getElementById('auth-btn');
  if(!btn)return;
  // Es solo un adorno: si algo falla acá, la pantalla de entrada sigue igual.
  try{
    const listo=formularioAuthListo();
    btn.classList.toggle('auth-listo',listo);
    if(listo)medirLaserAuth();
  }catch(e){}
}
// El trazo se dibuja sobre el borde del botón y se mide en píxeles, para que
// los dos puntos avancen parejo por los lados largos y los cortos.
function medirLaserAuth(){
  const btn=document.getElementById('auth-btn'),svg=document.getElementById('auth-laser');
  if(!btn||!svg||!btn.offsetWidth)return;
  const w=btn.offsetWidth,h=btn.offsetHeight;
  const r=Math.min(parseFloat(getComputedStyle(btn).borderTopLeftRadius)||0,h/2);
  // El trazo va 1 px hacia adentro, para que se vea sobre el borde y no afuera.
  const a=w-2,b=h-2,ri=Math.max(r-1,0);
  const perimetro=2*(a+b)-8*ri+2*Math.PI*ri;
  Object.assign(svg.style,{left:btn.offsetLeft+'px',top:btn.offsetTop+'px',width:w+'px',height:h+'px'});
  svg.setAttribute('viewBox','0 0 '+w+' '+h);
  // Doce capas, de la más larga y delgada a la más corta y gruesa. Cada una
  // se repite a media vuelta (dos puntos) y parte centrada en el mismo lugar.
  const CAPAS=12;
  while(svg.childElementCount<CAPAS)svg.appendChild(document.createElementNS('http://www.w3.org/2000/svg','rect'));
  [...svg.children].forEach((rect,i)=>{
    const t=i/(CAPAS-1);
    [['x',1],['y',1],['width',a],['height',b],['rx',ri],['ry',ri]].forEach(([k,v])=>rect.setAttribute(k,v));
    const largo=perimetro*(.075-.065*t);
    Object.assign(rect.style,{stroke:'color-mix(in srgb,var(--primary),#fff '+Math.round(25+75*t)+'%)',strokeWidth:(.5+2.3*t*t)+'px',opacity:(.1+.12*t).toFixed(3)});
    rect.style.setProperty('--laser-trazo',largo+'px');
    rect.style.setProperty('--laser-hueco',(perimetro/2-largo)+'px');
    rect.style.setProperty('--laser-inicio',(largo/2)+'px');
    rect.style.setProperty('--laser-vuelta',(largo/2-perimetro)+'px');
  });
}
if(typeof window.addEventListener==='function')window.addEventListener('resize',()=>{const b=document.getElementById('auth-btn');if(b&&b.classList.contains('auth-listo'))medirLaserAuth();});
document.addEventListener('input',e=>{if(e.target&&/^auth-(user|pass2?)$/.test(e.target.id))revisarAuthListo();});
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
  ponerModoAuth(modoAuthInicial());
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
