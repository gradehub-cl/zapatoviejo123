
function correoValido(correo){return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo);}
function estadoCambioCorreo(mensaje,esError){
  const aviso=document.getElementById('s-account-email-status');
  const input=document.getElementById('s-account-email');
  if(aviso){aviso.textContent=mensaje||'';aviso.hidden=!mensaje;aviso.style.color=esError?'var(--red)':'var(--fg2)';}
  if(input){if(esError)input.setAttribute('aria-invalid','true');else input.removeAttribute('aria-invalid');}
}
// GradeHub tiene las confirmaciones de correo desactivadas mientras usa el SMTP
// limitado de Supabase. El cambio debe llegar aplicado en la respuesta; si no,
// no fingimos que la persona ya puede entrar con la dirección nueva.
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

// Cambiar la contraseña estando dentro (#714). Antes solo se llegaba desde el
// correo de recuperación. Misma política y mismo updateUser que esa pantalla.
// Solo para cuentas que entran con correo: las de Google no tienen contraseña.
function cuentaConClave(u){
  const m=u&&u.app_metadata;
  return !!m&&(Array.isArray(m.providers)?m.providers.includes('email'):m.provider==='email');
}
function estadoCambioClave(mensaje,esError,campo){
  const aviso=document.getElementById('s-account-pass-status');
  if(aviso){aviso.textContent=mensaje||'';aviso.hidden=!mensaje;aviso.style.color=esError?'var(--red)':'var(--fg2)';}
  ['s-account-pass','s-account-pass2'].forEach(id=>{
    const input=document.getElementById(id);
    if(!input)return;
    const invalido=esError&&campo!=='verificacion';
    if(invalido)input.setAttribute('aria-invalid','true');
    else input.removeAttribute('aria-invalid');
  });
}
async function cambiarClaveCuenta(){
  const btn=document.getElementById('s-account-pass-save');
  if(btn&&btn.disabled)return false;
  const recuperar=document.getElementById('s-account-pass-recover');
  if(recuperar&&recuperar.disabled)return false;
  const i1=document.getElementById('s-account-pass'),i2=document.getElementById('s-account-pass2');
  const p1=i1?i1.value:'',p2=i2?i2.value:'';
  estadoCambioClave('',false);
  if(recuperar)recuperar.hidden=true;
  const politica=passwordPolicyError(p1);
  if(politica){estadoCambioClave(politica,true);if(i1)i1.focus();return false;}
  if(p1!==p2){estadoCambioClave('Las contraseñas no coinciden.',true);if(i2)i2.focus();return false;}
  if(!supabaseClient||!supabaseClient.auth||!currentUser){
    estadoCambioClave('Necesitas iniciar sesión para cambiar tu contraseña.',true);
    return false;
  }
  const original=btn?btn.textContent:'';
  const usuario=currentUser;
  if(btn){btn.disabled=true;btn.textContent='Guardando…';}
  try{
    const {error}=await supabaseClient.auth.updateUser({password:p1});
    // La respuesta es de la visita que la pidió: una tardía no puede escribir
    // en la hoja de otra cuenta (#579, punto 15).
    if(currentUser!==usuario)return false;
    if(error)throw error;
    if(i1)i1.value='';
    if(i2)i2.value='';
    estadoCambioClave('Contraseña actualizada. La próxima vez entra con la nueva.',false);
    return true;
  }catch(e){
    if(currentUser!==usuario)return false;
    const requiereVerificacion=e&&['current_password_required','current_password_mismatch','reauthentication_needed'].includes(e.code);
    if(requiereVerificacion){
      estadoCambioClave('Verifica tu cuenta por correo para cambiar la contraseña sin la anterior.',true,'verificacion');
      if(recuperar)recuperar.hidden=false;
    }else estadoCambioClave(traduceAuthError(e),true);
    return false;
  }finally{
    if(btn){btn.disabled=false;btn.textContent=original;}
  }
}

// Si Auth exige otra verificación, se conserva su protección: el enlace abre
// la pantalla PASSWORD_RECOVERY existente, sin pedir la contraseña anterior.
async function recuperarClaveCuenta(){
  const btn=document.getElementById('s-account-pass-recover');
  const guardar=document.getElementById('s-account-pass-save');
  if((btn&&btn.disabled)||(guardar&&guardar.disabled))return false;
  const usuario=currentUser;
  if(!supabaseClient||!supabaseClient.auth||!usuario||!cuentaConClave(usuario)||!correoValido(usuario.email||'')){
    estadoCambioClave('Necesitas iniciar sesión con correo para recuperar tu contraseña.',true,'verificacion');
    return false;
  }
  const original=btn?btn.textContent:'';
  if(btn){btn.disabled=true;btn.textContent='Enviando…';}
  try{
    const {error}=await supabaseClient.auth.resetPasswordForEmail(usuario.email,{redirectTo:location.origin+location.pathname});
    if(currentUser!==usuario)return false;
    if(error)throw error;
    estadoCambioClave('Revisa el correo de acceso de tu cuenta. Desde el enlace podrás elegir una contraseña nueva.',false);
    return true;
  }catch(e){
    if(currentUser!==usuario)return false;
    estadoCambioClave(traduceAuthError(e),true,'verificacion');
    return false;
  }finally{
    if(btn){btn.disabled=false;btn.textContent=original;}
  }
}
