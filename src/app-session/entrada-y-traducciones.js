function enterOnboarding(){
  ocultarCargaInicial();
  document.getElementById('screen-auth').classList.remove('active');
  document.getElementById('screen-onboard').classList.add('active');
  if(typeof mostrarContextoInvitacionProfesor==='function')mostrarContextoInvitacionProfesor();
  // Si entró con Google, ya sabemos su nombre: no se lo preguntamos en blanco
  const nameInput=document.getElementById('ob-name');
  if(nameInput && !nameInput.value.trim() && currentUser && currentUser.user_metadata){
    const m=currentUser.user_metadata;
    const n=(m.full_name||m.name||'').trim();
    if(n)nameInput.value=n.split(' ')[0];
  }
  obIniciar();
  // Con el correo institucional ya sabemos su universidad: llega marcada en el
  // paso 2, sin saltarlo, para que pueda corregirla. Solo en el onboarding:
  // una cuenta que ya existe nunca cambia de universidad por su correo.
  const porCorreo=tenantPorCorreo(currentUser&&currentUser.email);
  if(porCorreo){selectedTenant=porCorreo;applyTheme();renderTenantPick();checkOb();}
}
// La universidad que corresponde al dominio del correo, o null. Compara el
// dominio completo, no un sufijo: "x@noesmiuandes.cl" no es de la UAndes.
function tenantPorCorreo(correo){
  const texto=String(correo||'').trim().toLowerCase(),arroba=texto.lastIndexOf('@');
  const dominio=arroba>0?texto.slice(arroba+1):'';
  if(!dominio)return null;
  const t=Object.keys(DOMINIOS_CORREO_POR_TENANT).find(k=>DOMINIOS_CORREO_POR_TENANT[k].includes(dominio));
  return t&&TENANTS[t]&&!TENANTS[t].oculto?t:null;
}
function enterApp(){
  ocultarCargaInicial();
  // Si entró por «Soy profesor particular» con una cuenta que ya existía, la
  // intención no se usó: no puede quedar esperando a la próxima cuenta.
  if(typeof guardarEntradaProfesor==='function')guardarEntradaProfesor(false);
  document.getElementById('screen-auth').classList.remove('active');
  document.getElementById('screen-onboard').classList.remove('active');
  showMainApp();
  if(typeof consultarEncuestaAlEntrar==='function')consultarEncuestaAlEntrar().catch(()=>{});
}

function traduceAuthError(e,contexto){
  if(e&&e.code==='CACHE_LOCAL_NO_AISLADA')return 'No pudimos proteger los ramos guardados en este dispositivo. La cuenta se creó, pero no se copiaron. Libera espacio o entra desde otro navegador.';
  if(e?.code==='APPLE_CACHE_NO_AISLADA')return 'No pudimos proteger los ramos guardados en este dispositivo. No se mezclaron con Apple. Libera espacio o entra desde otro navegador.';
  if(e?.code==='APPLE_PLUGIN_NO_DISPONIBLE')return 'Actualiza GradeHub para entrar con Apple desde la app.';
  if(e?.code==='APPLE_CONFIGURACION')return 'No pudimos comprobar si Apple está disponible. Intenta de nuevo o entra con Google o con tu correo.';
  if(e?.code==='APPLE_SESION_INVALIDA'||e?.code==='APPLE_TOKEN_INVALIDO')return 'No pudimos completar el acceso con Apple. Intenta de nuevo.';
  if(e?.code==='APPLE_NO_DISPONIBLE')return 'No pudimos abrir el acceso con Apple. Puedes entrar con Google o con tu correo.';
  const m=((e&&e.message)||'').toLowerCase();
  const code=String((e&&e.code)||'');
  if(code==='provider_disabled'||code==='unsupported_provider'||m.includes('provider is not enabled')||m.includes('unsupported provider'))return 'Ese método de acceso todavía no está disponible. Entra con Google o con tu correo.';
  if(m.includes('nonce')||m.includes('identity token'))return 'No pudimos verificar el acceso con Apple. Vuelve a intentarlo.';
  if(code==='current_password_required')return 'Escribe tu contraseña actual para poder cambiarla.';
  if(code==='current_password_mismatch')return 'La contraseña actual no es correcta.';
  // No confirmar si un correo ya tiene cuenta: esa diferencia permite enumerar
  // usuarios y preparar phishing o credential stuffing. Registro existente y
  // registro aceptado tienen que verse iguales hacia afuera.
  if(m.includes('already')||m.includes('exists'))return contexto==='cambio_correo'
    ?'Ese correo ya está asociado a otra cuenta.'
    :MSG_VERIFICA;
  if(m.includes('invalid login')||m.includes('credentials'))return 'Usuario o contraseña incorrectos.';
  // Sin esto caían en "revisa tu internet": el correo de recuperación tiene un
  // límite por hora y quien lo pedía dos veces creía que no tenía conexión.
  if((e&&e.status===429)||code.includes('rate_limit')||m.includes('rate limit')||m.includes('security purposes'))
    return 'Hiciste varios intentos seguidos. Espera unos minutos y vuelve a intentarlo.';
  if(code==='same_password'||m.includes('different from the old'))return 'La nueva contraseña tiene que ser distinta de la anterior.';
  // Con "Secure password change" encendido en Supabase, una sesión antigua no
  // puede cambiarla. Va antes del caso genérico de 'password', que diría que
  // la contraseña es corta.
  if(code==='reauthentication_needed'||m.includes('reauthentication'))return 'Por seguridad, cierra sesión, vuelve a entrar y cámbiala apenas entres.';
  if(code==='email_address_invalid'||(m.includes('email')&&m.includes('invalid')))return 'Ese correo no es válido. Revísalo e intenta de nuevo.';
  if(m.includes('password'))return 'La contraseña debe tener al menos '+PASS_MIN+' caracteres e incluir letras y números.';
  return 'No se pudo conectar. Revisa tu internet e intenta de nuevo.';
}
