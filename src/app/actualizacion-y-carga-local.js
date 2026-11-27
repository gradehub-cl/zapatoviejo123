
// ─── SERVICE WORKER ──────────────────────────────────────────────────────────
// El SW guarda copias de los archivos para que la app abra al instante y sirva
// sin internet. El costo: después de un deploy el estudiante sigue con la
// versión anterior hasta que el SW nuevo toma el control, y la página que ya
// está abierta conserva el JS viejo aunque eso pase.
//
// Un relevo del SW no implica que la página esté vieja: al abrir online el
// HTML y sus scripts ya pueden traer la versión nueva. Se compara el ?v= del
// script que está ejecutándose con la versión del SW que acaba de activarse.
//
// Se actualiza sola, sin botón (Lucas, 2026-11-17: con tantos deploys el
// aviso «Actualizar» molestaba). Nunca a mitad de algo: solo recarga cuando
// no hay un campo con el cursor, un formulario a medias ni una subida a la
// nube pendiente. Y solo en momentos en que nadie pierde el hilo:
// - recién abierta, si todavía no tocó nada (el SW nuevo llega a los segundos);
// - cuando sale de la app o vuelve a ella.
// Si no es seguro, espera a la próxima ocasión; la versión vieja sigue
// funcionando mientras tanto.
let actualizacionPendiente=false,interactuoActualizacion=false;
const cargaActualizacion=Date.now();
function recargaSeguraActualizacion(){
  try{if(typeof cambiosSinGuardarNav==='function'&&cambiosSinGuardarNav())return false;}catch(e){}
  try{if(_syncTimer||_subida)return false;}catch(e){}
  try{if(typeof hayCambiosSinSubir==='function'&&hayCambiosSinSubir())return false;}catch(e){}
  const activo=document.activeElement;
  if(activo&&(activo.isContentEditable||/^(INPUT|TEXTAREA|SELECT)$/.test(activo.tagName||'')))return false;
  return true;
}
function aplicarActualizacion(motivo){
  if(!actualizacionPendiente||!recargaSeguraActualizacion())return false;
  actualizacionPendiente=false;
  try{track('sw_update_auto',{motivo});}catch(e){}
  location.reload();
  return true;
}
function marcarActualizacion(){
  actualizacionPendiente=true;
  if(!interactuoActualizacion&&Date.now()-cargaActualizacion<15000)aplicarActualizacion('al_abrir');
}

if('serviceWorker' in navigator){
  for(const tipo of ['pointerdown','keydown'])
    window.addEventListener(tipo,()=>{interactuoActualizacion=true;},{capture:true,passive:true});
  // El deploy sella este ?v= y el cache del SW con el mismo SHA. Se captura
  // mientras se ejecuta app.js: después currentScript deja de apuntar a él.
  let versionCargada=null;
  try{versionCargada=new URL(document.currentScript.src).searchParams.get('v');}catch(e){}
  let revisionVersion=0;
  const revisarVersionActivada=()=>{
    const revision=++revisionVersion;
    const controlador=navigator.serviceWorker.controller;
    if(!controlador||!/^[a-f0-9]{7}$/.test(versionCargada||'')||typeof MessageChannel==='undefined')return;
    const canal=new MessageChannel();
    const cerrar=()=>{clearTimeout(plazo);canal.port1.close();canal.port2.close();};
    const plazo=setTimeout(cerrar,2000);
    canal.port1.onmessage=evento=>{
      cerrar();
      // Un SW anterior puede responder después de otro relevo. No debe
      // dejar pendiente una recarga que ya dejó de corresponder.
      if(revision!==revisionVersion||controlador!==navigator.serviceWorker.controller)return;
      const version=evento.data?.version;
      if(typeof version!=='string'||!/^[a-f0-9]{7}$/.test(version))return;
      if(version===versionCargada)actualizacionPendiente=false;
      else marcarActualizacion();
    };
    try{controlador.postMessage({tipo:'GH_VERSION'},[canal.port2]);}
    catch(e){cerrar();}
  };
  // Guardado ANTES de registrar: si ya había un controlador, un relevo posterior
  // es una actualización de verdad. En la primera visita no hay ninguno y el
  // relevo es solo la instalación inicial — ahí no hay nada que hacer.
  let habiaControlador = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if(habiaControlador) revisarVersionActivada();
    // Después de la primera instalación también puede llegar otra versión
    // sin cerrar la página: solo se omite el primer relevo, no los futuros.
    habiaControlador = !!navigator.serviceWorker.controller;
  });
  // La app instalada en el teléfono casi nunca recarga: se abre desde el
  // ícono, queda en segundo plano y se vuelve a ella. Por eso, al volver al
  // primer plano se le pide al navegador que revise si sw.js cambió (con un
  // mínimo entre revisiones: cada una es una petición de red).
  let reg=null,ultimaRevision=Date.now();
  document.addEventListener('visibilitychange', () => {
    if(document.visibilityState==='hidden'){
      // Al salir, la subida pendiente arranca en este mismo evento: se
      // reintenta un rato hasta que termine. Si el teléfono congela la
      // página antes, queda para cuando vuelva.
      let intentos=0;
      const probar=()=>{
        if(!actualizacionPendiente||document.visibilityState!=='hidden'||aplicarActualizacion('al_salir')||++intentos>10)return;
        setTimeout(probar,500);
      };
      probar();
      return;
    }
    if(aplicarActualizacion('al_volver'))return;
    if(!reg||Date.now() - ultimaRevision < 60000)return;
    ultimaRevision = Date.now();
    reg.update().catch(() => {});
  });
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(r => {reg=r;ultimaRevision=Date.now();})
      .catch(err => console.warn('SW no registrado:', err));
  });
}

// ─── CARGA DE LA COPIA LOCAL ─────────────────────────────────────────────────
// Va al FINAL del archivo a propósito. Antes corría en la línea ~1000, y
// normalize() alcanza funciones que usan constantes declaradas más abajo
// (`_nombresMalla`, `CREDITOS_POR_TENANT`…): en ese punto están en TDZ, la
// excepción la atrapaba loadData() sin decir nada y la copia local se
// descartaba como si no existiera. Online no se notaba porque la nube vuelve a
// normalizar; sin red, a una persona con datos en caché le aparecía el
// onboarding. Acá abajo ya está declarado todo. tests/carga-local.test.js
// arranca el archivo con un ramo del catálogo guardado y exige que cargue.
const {data:loaded} = loadData();
if(loaded){S={...S,...loaded};}
selectedTenant=S.tenant||'fen';applyTheme();
initSemGrid();renderTenantPick();initCarreraGrid();
