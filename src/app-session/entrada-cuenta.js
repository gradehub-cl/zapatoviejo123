
async function afterSignup(){
  track('signup',typeof consumirOrigenEntrada==='function'?consumirOrigenEntrada():undefined);
  const uid=currentUser?.id;
  if(typeof marcarPrimeraSesionEncuesta==='function')marcarPrimeraSesionEncuesta(uid);
  const aislamiento=uid&&aislarCacheEnRegistro(uid);
  if(!aislamiento){
    try{await supabaseClient.auth.signOut();}catch(e){}
    currentUser=null;
    const error=new Error('No pudimos proteger los ramos guardados en este dispositivo.');
    error.code='CACHE_LOCAL_NO_AISLADA';
    throw error;
  }
  if(aislamiento.propia&&S.onboardingDone&&S.ramos.length){
    const respaldado=await syncNow();await syncProfile();
    showToast(respaldado
      ? '✓ Cuenta creada — tus datos están en la nube'
      : 'Tu cuenta se creó y tus notas siguen en este dispositivo, pero no pudimos respaldarlas. No cierres sesión.',!respaldado);
    enterApp();
    return;
  }
  enterOnboarding();
  if(aislamiento.importable){
    showConfirm('¿Traer datos de este dispositivo?',
      'Hay datos guardados sin una cuenta asociada. Solo se copiarán a esta cuenta si eliges traerlos.',
      ()=>importarCacheSinDueno(uid),{label:'Traer datos',danger:false,focusCancel:true});
  }
}
async function afterLogin(){
  if(typeof olvidarAvisosFeedback==='function')olvidarAvisosFeedback();
  track('login',typeof consumirOrigenEntrada==='function'?consumirOrigenEntrada():undefined);
  registrarVisitaDiaria();
  const uid=currentUser?currentUser.id:null;
  const visita=++_visitaSesion;
  const vigente=()=>visita===_visitaSesion&&!!currentUser&&currentUser.id===uid;
  // Una sesión anterior pudo terminar por vencimiento, sin pasar por signOut.
  // Ninguna de sus propuestas debe asomarse en Inicio de la cuenta nueva.
  if(typeof propuestasPautaAgente!=='undefined')propuestasPautaAgente=[];
  if(typeof propuestasNotasAgente!=='undefined')propuestasNotasAgente=[];
  if(typeof propuestasFechasAgente!=='undefined')propuestasFechasAgente=[];
  if(typeof propuestasRamosAgente!=='undefined')propuestasRamosAgente=[];
  if(typeof renderPropuestasPautaHome==='function')renderPropuestasPautaHome();
  if(uid)restaurarCacheApartada(uid);
  // El aviso de Inicio se pide ya, con la universidad de la copia local, para
  // que llegue junto con las notas. Si la nube trae otra, Inicio lo vuelve a pedir.
  if(uid&&getCacheOwner()===uid&&S&&S.tenant&&typeof cargarAnunciosRecomendacion==='function')
    cargarAnunciosRecomendacion(S.tenant,()=>{});
  // Inicio con la copia local. Si la caché es de esta cuenta y este dispositivo
  // ya se sincronizó con «Sincronización sin pérdidas» (hay base), se entra con
  // lo que hay en el dispositivo y la nube se reconcilia después, sin dejar a la
  // persona esperando un viaje a Supabase detrás de la pantalla de carga. Lo
  // que anote mientras tanto es un cambio local frente a la base y la fusión lo
  // conserva. Sin base no: con una copia antigua sin ids reconciliarAlEntrar
  // manda la nube e ignoraría lo anotado en esa ventana.
  if(uid&&getCacheOwner()===uid&&leerBaseSync(uid)&&S.onboardingDone){
    enterApp();
    cargasAlEntrar();
    reconciliarEnSegundoPlano(uid,vigente)
      .then(()=>{if(vigente())tareasConEstadoAlEntrar();})
      .catch(e=>registrarErrorArranque(e,'reconciliar'));
    return;
  }
  let cloud,ok=true;
  // Solo la lectura remota es recuperable: si falla, la copia local ya fue
  // normalizada al cargar y además está protegida por el dueño de la caché.
  // normalize() y enterApp() quedan fuera a propósito. Si una de ellas falla,
  // continuar con estado o DOM a medias sería peor que detenerse con un aviso.
  try{cloud=await loadFromCloud();}catch(e){ok=false;}
  if(!vigente())return;
  const mismaCache=getCacheOwner()===uid;
  // La copia previa a importar es de quien importó. Si la caché es de otra
  // cuenta (navegador compartido, o una sesión que venció sin cerrarse), se va:
  // con "Deshacer importación" la siguiente persona recibía el nombre y las
  // notas de la otra, y se subían a su cuenta. El typeof es porque la clave vive
  // en app.js y hay tests que cargan solo este bloque.
  if(!mismaCache&&typeof PRE_IMPORT_KEY!=='undefined'){try{localStorage.removeItem(PRE_IMPORT_KEY);}catch(e){}}
  if(ok&&cloud!==null){
    subirTrasEntrar(aplicarNubeAlEntrar(uid,cloud,mismaCache));
  }else if(ok&&mismaCache){
    await respaldarCopiaSinFila();
  }else if(ok){
    // Cuenta realmente nueva, o caché de otra persona en un navegador
    // compartido. Nunca se reutilizan datos cuyo dueño no coincide.
    S=freshState();
    try{localStorage.setItem(STORAGE_KEY,JSON.stringify(S));}catch(e){}
    setCacheOwner(uid);
  }else{
    // Sin red: la caché local sirve, pero SOLO si es de este mismo usuario.
    // Si es de otro (navegador compartido), se descarta para no filtrar sus datos.
    if(mismaCache){
      showToast('Sin conexión · usando tu copia local');
    }else{
      S=freshState();
      try{localStorage.removeItem(STORAGE_KEY);}catch(e){}
      showToast('No pudimos cargar tus datos. Revisa tu conexión.',true);
    }
  }
  if(!vigente())return;
  if(S.onboardingDone)enterApp();else enterOnboarding();
  tareasConEstadoAlEntrar();
  cargasAlEntrar();
}
// Aplica la fila de la nube al entrar. Devuelve qué falta subir: 'local' si
// este dispositivo tenía algo que la nube no, 'corregida' si normalize()
// arregló la estructura de la nube, null si no hay nada.
function aplicarNubeAlEntrar(uid,cloud,mismaCache){
  // La nube puede contener ramos creados con versiones anteriores. Pásalos
  // siempre por normalize(): un ramo sin preset necesita categorias:[] para
  // que el editor de pauta pueda abrirse igual que uno con pauta oficial.
  //
  // La nube YA NO pisa la copia local a ciegas: si este dispositivo tiene
  // algo que no alcanzó a subir (una nota anotada sin conexión), se conserva
  // y se sube. Ver «Sincronización sin pérdidas», más abajo.
  const nube=normalize({...freshState(),...clonarSync(cloud)});
  const {estado,subir}=mismaCache?reconciliarAlEntrar(uid,S,nube,cloud):{estado:nube,subir:false};
  S=estado;
  try{localStorage.setItem(STORAGE_KEY,JSON.stringify(S));}catch(e){}
  // Si normalize() corrigió la estructura de un ramo de la nube (una pauta
  // nuestra mal publicada, evaluaciones repetidas), esa corrección también
  // se sube. Antes solo quedaba en el dispositivo: la nube —que es lo que
  // leen los agentes conectados— seguía con el error hasta la próxima nota.
  // La base queda en la copia tal como estaba, así la subida sale como un
  // cambio de este dispositivo y no como un choque.
  const corregida=firmaEstructuraSync(nube)!==firmaEstructuraSync(cloud);
  guardarBaseSync(uid,corregida?cloud:nube);
  setCacheOwner(uid);
  return subir?'local':corregida?'corregida':null;
}
function subirTrasEntrar(motivo){
  if(motivo==='local'){
    syncNow().then(respaldado=>{
      if(respaldado)showToast('✓ Guardamos en la nube lo que anotaste en este dispositivo');
    }).catch(()=>{});
  }else if(motivo){
    syncNow().catch(()=>{});
  }
}
// `null` significa que la consulta no encontró una fila; NO demuestra que
// esta persona no tenga datos. Si la caché ya tiene el mismo dueño, es la
// única copia conocida: se conserva y se intenta crear el respaldo.
async function respaldarCopiaSinFila(){
  const respaldado=await syncNow();
  showToast(respaldado
    ? 'Recuperamos tu copia local y la respaldamos en la nube'
    : 'Tus notas siguen en este dispositivo, pero no pudimos respaldarlas. No cierres sesión e inténtalo de nuevo con internet.',!respaldado);
}
// La lectura de la nube cuando Inicio ya está en pantalla con la copia local.
// Toma el candado de las subidas (_subida) mientras lee y reconcilia: una
// subida que corriera entremedio movería la base, la lectura llegaría vieja y
// la fusión tomaría por borrada la nota recién subida. Lo que se pide subir en
// ese rato (save, pagehide, online) espera y sale al terminar, con la S ya
// reconciliada.
async function reconciliarEnSegundoPlano(uid,vigente){
  while(_subida){try{await _subida;}catch(e){}}
  if(!vigente())return;
  let resultado=null,pedida=false;
  _subida=(async()=>{
    let cloud;
    try{cloud=await loadFromCloud();}
    catch(e){if(vigente())showToast('Sin conexión · usando tu copia local');return false;}
    if(!vigente())return false;
    // Con un modal abierto no se reemplaza S (ver fusionarConNube).
    if(modalAbiertoSync()){resultado='modal';return false;}
    if(cloud===null){resultado='sinFila';return false;}
    const antes=clonarSync(S);
    resultado=aplicarNubeAlEntrar(uid,cloud,true);
    if(!igualSync(antes,S)){
      repintarTrasFusion();
      // El servidor pudo convertir la cuenta en profesor (ver fusionarSync).
      if(typeof recalcularNavTabs==='function')recalcularNavTabs();
    }
    return true;
  })();
  try{await _subida;}
  finally{_subida=null;if(_otraSubida){_otraSubida=false;pedida=true;}}
  if(resultado==='modal'){
    if(pedida)syncToCloud();
    await new Promise(r=>setTimeout(r,1500));
    return reconciliarEnSegundoPlano(uid,vigente);
  }
  if(resultado==='sinFila')await respaldarCopiaSinFila();
  else subirTrasEntrar(resultado||(pedida?'pedida':null));
}
// Lo que trabaja sobre S: va con el estado ya reconciliado con la nube.
function tareasConEstadoAlEntrar(){
  // No bloquea la entrada: es una lectura de red y la app ya está en pantalla.
  // Si llega con algo, repinta y lo dice — una pauta no aparece en silencio.
  aplicarConsensoAuto().then(n=>{
    if(!n)return;
    renderHome();
    showToast(n===1?'Agregamos una pauta reportada por otros estudiantes':`Agregamos ${n} pautas reportadas por otros estudiantes`);
  }).catch(()=>{});
  // La otra dirección: las pautas que esta persona armó para ramos que el
  // catálogo trae vacíos. No avisa ni pregunta —viaja la pauta, nunca las
  // notas— y no bloquea nada. Va después del consenso a propósito: si una pauta
  // acaba de llegar de otros, no tiene sentido devolvérsela.
  if(typeof aportarPautasAlCatalogo==='function')aportarPautasAlCatalogo().catch(()=>{});
  // Los promedios de la comparación con el curso se renuevan al entrar, no solo
  // al abrir Estadísticas: curso_posicion y universidad_posicion ignoran filas
  // sin actualizar en 30 días (para que no cuenten los ramos borrados o
  // archivados antes del arreglo), y quien usa la app sin abrir Estadísticas
  // quedaba fuera aunque su promedio fuera real. Una vez por visita: la firma
  // de subirNotasCurso evita repetir si nada cambió. Va con el estado ya
  // reconciliado con la nube.
  if(S.onboardingDone&&typeof subirNotasCurso==='function')subirNotasCurso().catch(()=>{});
}
// Lo que se lee de la red al entrar y no depende de S. No bloquea nada.
function cargasAlEntrar(){
  if(typeof cargarAvisosFeedback==='function')cargarAvisosFeedback().catch(()=>{});
  // Si esta persona está aprobada como profesor particular, le aparece una
  // cuarta pestaña. Se pregunta una vez al entrar y no bloquea nada: si el SQL
  // del marketplace todavía no está aplicado, la consulta falla en silencio y
  // la app queda exactamente como antes, con sus tres pestañas.
  if(typeof cargarPerfilProfesor==='function'){
    cargarPerfilProfesor()
      .then(()=>{if(typeof recalcularNavTabs==='function')recalcularNavTabs();})
      .catch(()=>{});
  }
  // Igual para la pestaña de administración: una pregunta, sin bloquear nada.
  if(typeof cargarSoyAdministrador==='function'){
    cargarSoyAdministrador()
      .then(()=>{if(typeof recalcularNavTabs==='function')recalcularNavTabs();})
      .catch(()=>{});
  }
  // Es una bandeja de revisión, no una sincronización del semestre: se lee
  // aparte y nunca bloquea entrar. Si llega una propuesta, Inicio la recuerda
  // para que la persona la aplique o descarte cuando quiera.
  // La bandeja de propuestas es opcional y vive en app.js. El guardia no es
  // ceremonia: un ReferenceError acá revienta afterLogin() entero —o sea el
  // login y la sincronización— por una pantalla accesoria. El .catch cubre la
  // promesa rechazada, no la función que no existe.
  if(S.onboardingDone&&typeof cargarPropuestasPautaAgente==='function'){
    cargarPropuestasPautaAgente().catch(()=>{});
  }
}

// Cada entrada y cada salida abren una visita nueva. Una lectura de la nube que
// vuelve después de cambiar de cuenta, o de salir y volver a entrar, es de la
// visita anterior: aplicarla mostraba los datos de A en la sesión de B y los
// dejaba en su caché (issue #579, punto 2).
