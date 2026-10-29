
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
  ['s-account-current-pass','s-account-pass','s-account-pass2'].forEach(id=>{
    const input=document.getElementById(id);
    if(!input)return;
    const invalido=esError&&(campo==='actual'?id==='s-account-current-pass':id!=='s-account-current-pass');
    if(invalido)input.setAttribute('aria-invalid','true');
    else input.removeAttribute('aria-invalid');
  });
}
async function cambiarClaveCuenta(){
  const btn=document.getElementById('s-account-pass-save');
  if(btn&&btn.disabled)return false;
  const actual=document.getElementById('s-account-current-pass');
  const i1=document.getElementById('s-account-pass'),i2=document.getElementById('s-account-pass2');
  const pActual=actual?actual.value:'',p1=i1?i1.value:'',p2=i2?i2.value:'';
  estadoCambioClave('',false);
  if(!pActual){estadoCambioClave('Escribe tu contraseña actual para poder cambiarla.',true,'actual');if(actual)actual.focus();return false;}
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
    const {error}=await supabaseClient.auth.updateUser({password:p1,current_password:pActual});
    // La respuesta es de la visita que la pidió: una tardía no puede escribir
    // en la hoja de otra cuenta (#579, punto 15).
    if(currentUser!==usuario)return false;
    if(error)throw error;
    if(actual)actual.value='';
    if(i1)i1.value='';
    if(i2)i2.value='';
    estadoCambioClave('Contraseña actualizada. La próxima vez entra con la nueva.',false);
    return true;
  }catch(e){
    if(currentUser!==usuario)return false;
    const errorActual=e&&(e.code==='current_password_required'||e.code==='current_password_mismatch');
    estadoCambioClave(traduceAuthError(e),true,errorActual?'actual':'nueva');
    if(errorActual&&actual)actual.focus();
    return false;
  }finally{
    if(btn){btn.disabled=false;btn.textContent=original;}
  }
}
