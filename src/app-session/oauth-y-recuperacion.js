async function signInWithProvider(provider){
  if(!supabaseClient){authError('Falta configurar Supabase.');return;}
  if(provider==='apple'&&intentoAppleEnCurso)return;
  authError('');
  const btn=document.getElementById('btn-'+provider);
  if(provider==='apple'&&btn?.disabled)return;
  const orig=btn?btn.innerHTML:'';
  if(btn){btn.disabled=true;btn.style.opacity='.6';}
  try{
    if(provider==='apple'){
      const anterior=currentUser,cliente=supabaseClient;await confirmarAppleDisponible();
      if(currentUser!==anterior||supabaseClient!==cliente){reactivarBotonesOAuth();return;}
    }
    if(provider==='apple'&&APP_NATIVA){await entrarConAppleNativo();return;}
    if(provider==='apple')guardarEntradaApple(contextoEntradaApple());
    if(APP_NATIVA){
      const {data,error}=await supabaseClient.auth.signInWithOAuth({
        provider,
        options:{redirectTo:VUELTA_NATIVA,skipBrowserRedirect:true}
      });
      if(error)throw error;
      recordarMetodoLogin(provider);
      // El botón vuelve con la sesión (appUrlOpen) o al cerrar la hoja.
      await window.Capacitor.Plugins.Browser.open({url:data.url,presentationStyle:'popover'});
      return;
    }
    const {error}=await supabaseClient.auth.signInWithOAuth({
      provider,
      options:{redirectTo:location.origin+location.pathname}
    });
    if(error)throw error;
    // Se anota ANTES de irse a Google: desde acá la pagina se descarga y no hay
    // vuelta a este codigo si el login sale bien.
    recordarMetodoLogin(provider);
  }catch(e){
    if(provider==='apple')consumirEntradaApple();
    authError(traduceAuthError(e));
    if(btn){btn.disabled=false;btn.style.opacity='';btn.innerHTML=orig;}
  }
}

function reactivarBotonesOAuth(){
  ['google','apple'].forEach(p=>{const b=document.getElementById('btn-'+p);if(b){b.disabled=false;b.style.opacity='';}});
}
// La vuelta de Google en la app nativa. Cerrar la hoja sin terminar no es un
// error: solo reactiva el botón.
async function volverDeOAuthNativo(url){
  if(typeof url!=='string'||!url.startsWith(VUELTA_NATIVA))return false;
  try{await window.Capacitor.Plugins.Browser.close();}catch(e){}
  let code=null;
  try{code=new URL(url).searchParams.get('code');}catch(e){}
  if(!code){
    authError('No pudimos iniciar sesión con Google. Intenta de nuevo.');
    reactivarBotonesOAuth();
    return false;
  }
  try{
    const {data,error}=await supabaseClient.auth.exchangeCodeForSession(code);
    if(error)throw error;
    currentUser=data.user;
    reactivarBotonesOAuth();
    await afterLogin();
    return true;
  }catch(e){
    authError(traduceAuthError(e));
    reactivarBotonesOAuth();
    return false;
  }
}
// El typeof es porque hay tests que cargan solo este tramo del archivo.
if(typeof APP_NATIVA!=='undefined'&&APP_NATIVA&&window.Capacitor.Plugins){
  const {App,Browser}=window.Capacitor.Plugins;
  // La vuelta del login con Google y los enlaces de los widgets llegan por el
  // mismo esquema propio; cada uno reconoce solo lo suyo.
  // Tocar un aviso de evaluación abre el ramo o su simulador.
  const notificaciones=window.Capacitor.Plugins.LocalNotifications;
  if(notificaciones&&typeof notificaciones.addListener==='function')notificaciones.addListener('localNotificationActionPerformed',ev=>{
    const extra=ev&&ev.notification&&ev.notification.extra;
    if(extra&&extra.gradehub==='prueba'&&typeof abrirEnlaceWidget==='function')abrirEnlaceWidget(extra.url);
  });
  if(App)App.addListener('appUrlOpen',ev=>{
    const url=ev&&ev.url;
    if(typeof url==='string'&&url.startsWith(VUELTA_NATIVA))volverDeOAuthNativo(url);
    else if(typeof abrirEnlaceWidget==='function')abrirEnlaceWidget(url);
  });
  // Lo que se respondió en la Actividad en Vivo con la app cerrada.
  if(typeof recogerSensaciones==='function'){
    setTimeout(recogerSensaciones,0);
    if(App)App.addListener('resume',()=>recogerSensaciones());
  }
  if(Browser)Browser.addListener('browserFinished',()=>{if(!currentUser)reactivarBotonesOAuth();});
}

// Recuperar contraseña
async function forgotPassword(){
  const email=(document.getElementById('auth-user').value||'').trim().toLowerCase();
  const emailRe=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if(!emailRe.test(email)){authError('Escribe tu correo arriba y vuelve a tocar "¿Olvidaste tu contraseña?".');return;}
  if(!supabaseClient){authError('Falta configurar Supabase.');return;}
  // Un segundo toque mientras va el primero gastaba el límite de correos.
  const boton=document.getElementById('auth-fp');
  if(boton&&boton.disabled)return;
  if(boton)boton.disabled=true;
  try{
    const {error}=await supabaseClient.auth.resetPasswordForEmail(email,{redirectTo:location.origin+location.pathname});
    if(error)throw error;
    authError('');showToast('Te enviamos un correo para recuperar tu contraseña');
  }catch(e){authError(traduceAuthError(e));}
  finally{if(boton)boton.disabled=false;}
}

// Al volver del correo, Supabase dispara PASSWORD_RECOVERY (ver boot()).
// Esta función recibe la nueva contraseña y la guarda.
async function submitNewPassword(){
  const btn=document.getElementById('reset-btn');
  if(btn.disabled)return;
  const p1=document.getElementById('reset-pass').value;
  const p2=document.getElementById('reset-pass2').value;
  const err=document.getElementById('reset-error');
  err.style.display='none';
  const policyError=passwordPolicyError(p1);
  if(policyError){err.textContent=policyError;err.style.display='block';return;}
  if(p1!==p2){err.textContent='Las contraseñas no coinciden.';err.style.display='block';return;}
  if(!supabaseClient){err.textContent='Supabase no está configurado.';err.style.display='block';return;}
  const orig=btn.textContent;
  const usuario=currentUser;
  btn.disabled=true;btn.textContent='Guardando...';
  try{
    const {data,error}=await supabaseClient.auth.updateUser({password:p1});
    if(currentUser!==usuario)return;
    if(error)throw error;
    currentUser=data.user;
    enRecuperacion=false;
    showToast('Contraseña actualizada');
    document.getElementById('screen-reset').classList.remove('active');
    await afterLogin();
  }catch(e){
    if(currentUser!==usuario)return;
    // El mensaje de Supabase viene en inglés ("New password should be different…").
    err.textContent=traduceAuthError(e);err.style.display='block';
  }finally{
    btn.disabled=false;btn.textContent=orig;
  }
}

function showResetScreen(){
  ocultarCargaInicial();
  ['home','stats','agenda','ramo','onboard','auth'].forEach(s=>{const el=document.getElementById('screen-'+s);if(el)el.classList.remove('active');});
  document.getElementById('bottom-nav').style.display='none';
  document.getElementById('screen-reset').classList.add('active');
  setTimeout(()=>{const i=document.getElementById('reset-pass');if(i)i.focus();},100);
}

// Supabase procesa el fragmento antes de que boot() reciba la sesión. Recién
// después se puede borrar: hacerlo antes rompería OAuth y recovery. Una vez
// procesado, dejar access_token/refresh_token en la barra o el historial solo
// aumenta la superficie frente a extensiones, capturas y una futura XSS.
function limpiarFragmentoAuth(){
  const h=location.hash||'';
  if(!/(?:^|[&#])(access_token|refresh_token|type|expires_in|expires_at|token_type)=/.test(h))return;
  try{history.replaceState(null,'',location.pathname+location.search);}catch(e){}
}

// El registro crea un UID nuevo. La caché que ya estaba en este navegador no
// pasa a ser suya por eso: podría pertenecer a otra cuenta o no tener dueño.
