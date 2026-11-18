function confirmarEliminarCuenta(){
  if(!currentUser){showToast('Primero inicia sesión',true);return;}
  const nRamos=(S.ramos||[]).length;
  const nNotas=contarNotas(S.ramos);
  const detalle=nRamos
    ? `Se borran tus ${nRamos} ramo${nRamos!==1?'s':''} con ${nNotas} nota${nNotas!==1?'s':''}, tu perfil y tu cuenta. En este dispositivo y en la nube.`
    : 'Se borra tu cuenta y todo lo asociado, en este dispositivo y en la nube.';
  showConfirm('Eliminar tu cuenta',detalle+'\n\nEsto no se puede deshacer.',()=>{
    // Segunda confirmación: la primera se aprieta sin leer.
    showConfirm('¿Seguro?','No hay forma de recuperar tus notas después de esto.\n\nSi solo quieres empezar de nuevo en este dispositivo, usa «Reiniciar app»: eso conserva tus notas en la nube.',()=>{
      // Esta última no repite el mismo gesto: vuelve a mostrar lo que se pierde,
      // deja Cancelar bajo el foco y mueve la acción destructiva a la izquierda.
      const impacto=nRamos
        ? `Vas a borrar ${nRamos} ramo${nRamos!==1?'s':''} y ${nNotas} nota${nNotas!==1?'s':''}, además de tu perfil y tu cuenta.`
        : 'Vas a borrar tu perfil y tu cuenta.';
      showConfirm('Última confirmación',impacto+'\n\nSe eliminarán de este dispositivo y de la nube. No se puede deshacer.',eliminarCuenta,{label:'Eliminar definitivamente',actionFirst:true,focusCancel:true});
    },{label:'Sí, eliminar mi cuenta'});
  },{label:'Continuar'});
}

// «Entrar con Apple» exige revocar el acceso al borrar la cuenta (App Review
// 5.1.1(v)). En la app se le pide a Apple que confirme y el servidor revoca con
// ese código de un solo uso (functions/apple-revocar.js): no guardamos tokens.
// Si no se puede revocar, la cuenta NO se borra y la persona puede reintentar.
// En la web no hay cómo pedir ese código sin la librería de Apple: se borra
// igual, y GradeHub se puede quitar en Ajustes › Apple ID › Iniciar sesión con Apple.
function cuentaConApple(user){
  if(!user)return false;
  if(Array.isArray(user.identities)&&user.identities.some(i=>i&&i.provider==='apple'))return true;
  const p=user.app_metadata&&user.app_metadata.providers;
  return Array.isArray(p)&&p.includes('apple');
}
function urlRevocarApple(){
  const origen=typeof location!=='undefined'&&location.origin||'';
  return /^https:\/\//.test(origen)?origen+'/apple-revocar':'https://gradehub.cl/apple-revocar';
}
async function revocarAppleAntesDeBorrar(){
  const plugin=window.Capacitor&&window.Capacitor.Plugins&&window.Capacitor.Plugins.AppleSignIn;
  if(!plugin||typeof plugin.authorize!=='function'){showToast('Actualiza la app para eliminar una cuenta que entra con Apple.',true);return false;}
  let credencial;
  try{
    const bytes=crypto.getRandomValues(new Uint8Array(32));
    credencial=await plugin.authorize({nonce:[...bytes].map(b=>b.toString(16).padStart(2,'0')).join('')});
  }catch(e){showToast('Para eliminar tu cuenta, confirma con Apple.',true);return false;}
  const code=credencial&&credencial.authorizationCode;
  if(!code){showToast('Apple no devolvió la confirmación. Intenta de nuevo.',true);return false;}
  try{
    const {data}=await supabaseClient.auth.getSession();
    const token=data&&data.session&&data.session.access_token;
    if(!token)throw new Error('sin sesión');
    const r=await fetch(urlRevocarApple(),{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({code})});
    if(r.ok)return true;
    let motivo='';try{motivo=(await r.json()).error||'';}catch(e){}
    showToast((motivo||'No pudimos desconectar tu Apple ID.')+' Tu cuenta no se borró.',true);
    return false;
  }catch(e){showToast('No pudimos desconectar tu Apple ID. Revisa tu conexión: tu cuenta no se borró.',true);return false;}
}

async function eliminarCuenta(){
  if(!supabaseClient||!currentUser){showToast('Primero inicia sesión',true);return;}
  if(cuentaConApple(currentUser)&&typeof enAppNativa==='function'&&enAppNativa()){
    if(!await revocarAppleAntesDeBorrar())return;
  }
  showToast('Eliminando tu cuenta…');
  try{
    const {error}=await supabaseClient.rpc('eliminar_mi_cuenta');
    if(error)throw error;
    track('delete_account');
    // Recién acá se limpia lo local: si el borrado en la nube falló, el
    // estudiante conserva sus notas en el dispositivo y puede reintentar.
    // Es la limpieza de cerrar sesión, no una lista propia: la de acá dejaba
    // la base de sincronización (una copia completa de las notas) y, en el
    // iPhone, los widgets, las Actividades y los avisos de la cuenta borrada.
    const uid=currentUser.id;
    // Una subida que estaba esperando ya no tiene cuenta a la que subir.
    if(typeof _syncTimer!=='undefined'){clearTimeout(_syncTimer);_syncTimer=null;}
    await cerrarSesion();
    if(typeof borrarCacheApartada==='function')borrarCacheApartada(uid);
    showToast('Tu cuenta fue eliminada');
    setTimeout(()=>location.reload(),1400);
  }catch(e){
    console.warn('eliminarCuenta:',e);
    showToast('No pudimos eliminar tu cuenta. Escríbenos a gradehub.app@gmail.com',true);
  }
}

function confirmResetApp(){
  const conCuenta=!!currentUser;
  const desc=conCuenta
    ? 'Se borrarán los datos de este dispositivo y cerrarás sesión. Tus notas en la nube se conservan y vuelven al iniciar sesión.'
    : 'Se borrarán todos tus datos y volverás al inicio. Esta acción no se puede deshacer.';
  showConfirm('Reiniciar app',desc,async()=>{
    track('app_reset');
    // Las mismas claves que borra cerrar sesión: la base de sincronización y la
    // copia previa a importar son copias completas de las notas.
    [STORAGE_KEY,CACHE_OWNER_KEY,SYNC_BASE_KEY,CURSO_SIGLAS_KEY,PRE_IMPORT_KEY].forEach(k=>{try{localStorage.removeItem(k);}catch(e){}});
    if(typeof borrarCacheApartada==='function')borrarCacheApartada(conCuenta?currentUser.id:null);
    if(conCuenta){
      if(typeof olvidarCanvasCuenta==='function')await olvidarCanvasCuenta();
      try{await supabaseClient.auth.signOut();}catch(e){}
    }
    location.reload();
  },{label:'Reiniciar'});
}

// El sheet NO se arrastra para cerrarlo. Se probó y se sacó el 2026-09-21:
// varios modales llevan una lista con scroll propio adentro —el simulador, el
// buscador de ramos, las bandejas del agente— y el gesto de recorrer esa lista
// es el mismo que el de cerrar. Se intentó afinarlo dos veces (solo con la
// lista abajo, después solo fuera de la lista) y seguía cerrándose a media
// edición. Un modal que se cierra solo mientras alguien escribe notas le borra
// el trabajo; poder cerrarlo con un gesto no vale eso.
//
// En el teléfono se cierra con el botón o con Escape. Nada más. En computador
// además se puede hacer clic en el fondo: ver `punteroDeMouse` más abajo.
//
// Tres cosas que un modal necesita y que no se ven mirando la pantalla:
//
//   1. Anunciarse por su nombre. La hoja decía aria-label="Ventana", así que un
//      lector de pantalla leía "Ventana, diálogo" en lugar de "Nueva
//      evaluación". El título ya está escrito en el modal; basta apuntarle.
//   2. Devolver el foco al cerrar. Quedaba dentro del modal cerrado, o sea en
//      un elemento invisible: quien navega con teclado tenía que volver a
//      recorrer la página para seguir donde estaba.
//   3. Asociar cada etiqueta con su campo. Se hace acá y no en las 33
//      plantillas: son todas el mismo patrón —una `.modal-label` seguida del
//      campo— y arreglarlo una vez cubre los modales que se escriban después.
