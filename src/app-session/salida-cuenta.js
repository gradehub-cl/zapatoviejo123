function hayCambiosSinSubir(){
  if(!supabaseClient||!currentUser)return false;
  const base=leerBaseSync(currentUser.id);
  if(base)return !igualSync(sinRevSync(S),sinRevSync(base));
  return !!(S.ramos?.length||S.historial?.length||S.onboardingDone);
}
async function respaldoAlDia(){
  if(!hayCambiosSinSubir())return true;
  clearTimeout(_syncTimer);_syncTimer=null;
  return (await syncNow())&&!hayCambiosSinSubir();
}
async function signOut(){
  if(!(await respaldoAlDia())){
    showConfirm('Tienes cambios sin respaldar',
      'Lo último que anotaste no alcanzó a guardarse en la nube. Si cierras sesión ahora, se borra de este dispositivo. Conéctate a internet y vuelve a intentarlo.',
      cerrarSesion,{label:'Cerrar sesión igual',focusCancel:true});
    return;
  }
  await cerrarSesion();
}
async function cerrarSesion(){
  if(typeof olvidarAvisosFeedback==='function')olvidarAvisosFeedback();
  _visitaSesion++;
  try{_cerrandoSesion=true;await supabaseClient.auth.signOut();}catch(e){}
  finally{_cerrandoSesion=false;}
  currentUser=null;closeModal();
  if(typeof borrarResumenWidgets==='function')borrarResumenWidgets();
  if(typeof olvidarSesionAgentes==='function')olvidarSesionAgentes();
  // Las propuestas pertenecen a la cuenta que salió, no al navegador.
  if(typeof propuestasPautaAgente!=='undefined')propuestasPautaAgente=[];
  if(typeof propuestasNotasAgente!=='undefined')propuestasNotasAgente=[];
  if(typeof propuestasFechasAgente!=='undefined')propuestasFechasAgente=[];
  if(typeof propuestasRamosAgente!=='undefined')propuestasRamosAgente=[];
  // Limpiar la caché local: si no, el siguiente que entre en este navegador
  // podría ver los datos de la sesión anterior.
  // La base de la sincronización también: es una copia completa de los datos.
  // Y la copia previa a importar: la siguiente persona podía restaurarla con
  // "Deshacer importación" y quedarse con los datos de esta cuenta.
  try{localStorage.removeItem(STORAGE_KEY);localStorage.removeItem(CACHE_OWNER_KEY);localStorage.removeItem(SYNC_BASE_KEY);localStorage.removeItem(CURSO_SIGLAS_KEY);localStorage.removeItem(PRE_IMPORT_KEY);}catch(e){}
  olvidarBaseSesion();
  if(typeof olvidarUrlCanvasIcs==='function')olvidarUrlCanvasIcs();
  S=freshState();
  // Las pestañas de profesor y admin son de la cuenta que salió, no del navegador.
  if(typeof olvidarSesionMarketplace==='function')olvidarSesionMarketplace();
  if(typeof recalcularNavTabs==='function')recalcularNavTabs();
  authMode='login';
  document.getElementById('auth-user').value='';
  document.getElementById('auth-pass').value='';
  showAuthScreen();
}

// La pantalla de carga de la app (#arranque en index.html) se va recién acá,
// con la pantalla que corresponde ya puesta debajo, sea cual sea el camino.
// Si lo que queda es el login, el logo no desaparece: vuela a su lugar en el
// login mientras el fondo se va, y ahí se cambia por el de verdad. A la app o
// con movimiento reducido, solo se desvanece.
// Los mismos de la transición de #arranque svg en styles.css. Parte quieta y
// frena largo: con una curva que arranca rápido, el logo saltaba arriba.
