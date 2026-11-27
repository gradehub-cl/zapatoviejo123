
function correoValido(correo){return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo);}
function estadoCambioCorreo(mensaje,esError){
  const aviso=document.getElementById('s-account-email-status');
  const input=document.getElementById('s-account-email');
  if(aviso){aviso.textContent=mensaje||'';aviso.hidden=!mensaje;aviso.style.color=esError?'var(--red)':'var(--fg2)';}
  if(input){if(esError)input.setAttribute('aria-invalid','true');else input.removeAttribute('aria-invalid');}
}
// La confirmación al REGISTRARSE está apagada, pero la del cambio de correo no:
// en producción Supabase deja la dirección nueva como `new_email` pendiente y
// manda un enlace (comprobado el 2026-11-23). Antes eso se leía como fallo y la
// app decía «inténtalo más tarde»: cada reintento mandaba otro correo y, al
// abrir uno, el correo cambiaba sin que la app lo hubiera dicho. Si algún día
// se apaga esa confirmación, el cambio llega aplicado y sale el primer aviso.
async function cambiarCorreoCuenta(){
  const input=document.getElementById('s-account-email');
  const btn=document.getElementById('s-account-email-save');
  const correo=(input&&input.value||'').trim().toLowerCase();
  estadoCambioCorreo('',false);
  if(!correoValido(correo)){
    estadoCambioCorreo('Ingresa un correo electrónico válido.',true);
    if(input)input.focus();
    return false;
  }
  if(currentUser&&correo===String(currentUser.email||'').toLowerCase()){
    estadoCambioCorreo('Ese ya es el correo de acceso de tu cuenta.',true);
    if(input)input.focus();
    return false;
  }
  if(!supabaseClient||!supabaseClient.auth||!currentUser){
    estadoCambioCorreo('Necesitas iniciar sesión para cambiar tu correo.',true);
    return false;
  }
  const original=btn?btn.textContent:'';
  const usuario=currentUser;
  if(btn){btn.disabled=true;btn.textContent='Guardando…';}
  try{
    const {data,error}=await supabaseClient.auth.updateUser({email:correo});
    // La respuesta pertenece a la visita que pidió el cambio, incluso si se
    // salió y se volvió a entrar con el mismo id mientras estaba en vuelo.
    if(currentUser!==usuario)return false;
    if(error)throw error;
    const correoGuardado=String(data&&data.user&&data.user.email||'').trim().toLowerCase();
    const correoPendiente=String(data&&data.user&&data.user.new_email||'').trim().toLowerCase();
    if(correoGuardado!==correo&&correoPendiente===correo){
      currentUser=data.user;
      estadoCambioCorreo('Te mandamos un enlace a '+correo+' para confirmar el cambio. Hasta que lo abras, sigues entrando con tu correo actual.',false);
      return true;
    }
    if(correoGuardado!==correo){
      estadoCambioCorreo('No pudimos actualizar el correo al tiro. Sigue usando tu correo actual e inténtalo más tarde.',true);
      return false;
    }
    currentUser=data.user;
    estadoCambioCorreo('Correo actualizado. Desde ahora entra con esta dirección.',false);
    return true;
  }catch(e){
    if(currentUser!==usuario)return false;
    estadoCambioCorreo(traduceAuthError(e,'cambio_correo'),true);
    return false;
  }finally{
    if(btn){btn.disabled=false;btn.textContent=original;}
  }
}

// El proveedor original manda también cuando hay una identidad vinculada.
function cuentaConClave(usuario){
  return !!usuario?.email&&usuario.app_metadata?.provider==='email';
}

// updateUser del cliente compartido lee su sesión desde almacenamiento al tomar
// el lock y vuelve a guardarla al recibir la respuesta. Para esta operación
// usamos el mismo endpoint con el token de la visita que abrió la hoja (#579).
async function peticionClaveCuenta(token,ruta,atributos){
  const respuesta=await fetch(SUPABASE_URL+'/auth/v1/'+ruta,{
    method:atributos?'PUT':'GET',credentials:'omit',cache:'no-store',redirect:'error',
    headers:{apikey:SUPABASE_ANON_KEY,Authorization:'Bearer '+token,'Content-Type':'application/json','X-Supabase-Api-Version':'2024-01-01'},
    ...(atributos?{body:JSON.stringify(atributos)}:{})
  });
  if(!respuesta.ok){
    const datos=await respuesta.json().catch(()=>({}));
    throw {status:respuesta.status,code:datos.error_code||datos.code};
  }
}

async function cambiarClaveCuenta(form){
  const usuario=currentUser,visita=_visitaSesion;
  const vigente=()=>currentUser===usuario&&visita===_visitaSesion&&!_cerrandoSesion&&
    document.getElementById('cuenta-clave')===form&&document.getElementById('modal').classList.contains('open');
  if(!form||!cuentaConClave(usuario)||!vigente())return false;
  const el=id=>form.querySelector('#clave-'+id);
  const boton=el('guardar');
  if(boton.disabled)return false;
  const errorCampo=(id,texto)=>{
    el(id+'-error').textContent=texto;
    el(id).setAttribute('aria-invalid','true');
    el(id).focus();
    return false;
  };
  for(const id of ['actual','nueva','repetida','codigo']){
    el(id+'-error').textContent='';
    el(id).removeAttribute('aria-invalid');
  }
  el('estado').textContent='';
  const actual=el('actual').value,nueva=el('nueva').value;
  if(!actual)return errorCampo('actual','Escribe tu contraseña actual.');
  const politica=passwordPolicyError(nueva);
  if(politica)return errorCampo('nueva',politica);
  if(nueva===actual)return errorCampo('nueva','Elige una contraseña distinta de la actual.');
  if(nueva!==el('repetida').value)return errorCampo('repetida','Las contraseñas no coinciden.');
  const conCodigo=!el('verificacion').hidden;
  const nonce=el('codigo').value.trim();
  if(conCodigo&&!nonce)return errorCampo('codigo','Ingresa el código de verificación.');
  boton.disabled=true;
  boton.textContent='Cambiando…';
  let temporal,verificada=false;
  try{
    const {data,error}=await supabaseClient.auth.getSession();
    if(!vigente())return false;
    if(error)throw error;
    const sesion=data?.session;
    if(!sesion)throw {code:'session_not_found'};
    if(sesion.user.id!==usuario.id)return false;
    // El ingreso de comprobación no puede sobrescribir la sesión de esta u otra pestaña.
    temporal=window.supabase.createClient(SUPABASE_URL,SUPABASE_ANON_KEY,{auth:{
      persistSession:false,autoRefreshToken:false,detectSessionInUrl:false,storageKey:'verificar-'+crypto.randomUUID()
    }});
    const ingreso=await temporal.auth.signInWithPassword({email:usuario.email,password:actual});
    verificada=!!ingreso.data?.session;
    if(!vigente())return false;
    if(ingreso.error)throw ingreso.error;
    if(!verificada||ingreso.data.user?.id!==usuario.id)throw {code:'invalid_credentials'};
    try{
      await peticionClaveCuenta(sesion.access_token,'user',{password:nueva,current_password:actual,...(conCodigo?{nonce}:{})});
    }catch(e){
      if(!vigente())return false;
      if(e?.code!=='reauthentication_needed'||conCodigo)throw e;
      await peticionClaveCuenta(sesion.access_token,'reauthenticate');
      if(!vigente())return false;
      el('verificacion').hidden=false;
      el('estado').textContent='Te enviamos un código. Ingrésalo para confirmar el cambio.';
      el('codigo').focus();
      return false;
    }
    if(!vigente())return false;
    closeModal();
    showToast('Contraseña cambiada. Vuelve a entrar en tus otros dispositivos.');
    return true;
  }catch(e){
    if(!vigente())return false;
    const code=e?.code;
    if(code==='invalid_credentials'||code==='current_password_mismatch')
      return errorCampo('actual','La contraseña actual no coincide. Vuelve a escribirla.');
    if(code==='same_password')return errorCampo('nueva','Elige una contraseña distinta de la actual.');
    if(code==='weak_password')return errorCampo('nueva','Elige una contraseña más segura.');
    if(code==='reauthentication_not_valid'||code==='reauthentication_needed'||code==='otp_expired')
      return errorCampo('codigo','El código venció o no coincide. Revisa el código o vuelve a abrir esta hoja para pedir otro.');
    if(['session_not_found','session_expired','bad_jwt','refresh_token_not_found','refresh_token_already_used'].includes(code)||e?.name==='AuthSessionMissingError'||e?.status===401){
      ++_visitaSesion;
      currentUser=null;
      closeModal();showAuthScreen();ponerModoAuth('login');
      authError('Tu sesión venció. Vuelve a entrar para cambiar la contraseña.');
    }else if(e?.status===429||code==='over_request_rate_limit'){
      el('estado').textContent='Hubo varios intentos. Espera unos minutos y vuelve a probar.';
    }else if(e instanceof TypeError||e?.name==='AuthRetryableFetchError'||e?.status===0){
      el('estado').textContent='No pudimos confirmar el cambio. Revisa tu conexión a internet.';
    }else{
      el('estado').textContent='No pudimos cambiar la contraseña. Inténtalo de nuevo.';
    }
    return false;
  }finally{
    if(vigente()){boton.disabled=false;boton.textContent='Cambiar contraseña';}
    if(temporal){
      // Solo la sesión efímera. El alcance por defecto cerraría también la principal.
      try{if(verificada)await temporal.auth.signOut({scope:'local'});}catch{}
      try{await temporal.auth.dispose();}catch{}
    }
  }
}
