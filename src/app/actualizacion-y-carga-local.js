
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
// No recargamos solos a propósito: el estudiante puede estar escribiendo una
// nota, y perdérsela por una actualización es peor que ver la versión vieja un
// rato más.
function avisarActualizacion(){
  const t=document.getElementById('toast-update');
  if(t){t.classList.add('show');return;}
  const d=document.createElement('div');
  d.id='toast-update';
  d.className='update-toast show';
  d.setAttribute('role','status');
  d.innerHTML=`<span>Hay una versión nueva.</span>`;
  const b=document.createElement('button');
  b.textContent='Actualizar';
  b.onclick=()=>{try{track('sw_update_accept');}catch(e){} location.reload();};
  d.appendChild(b);
  document.body.appendChild(d);
}

if('serviceWorker' in navigator){
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
      // volver a mostrar un aviso que ya dejó de corresponder.
      if(revision!==revisionVersion||controlador!==navigator.serviceWorker.controller)return;
      const version=evento.data?.version;
      if(typeof version!=='string'||!/^[a-f0-9]{7}$/.test(version))return;
      if(version===versionCargada)document.getElementById('toast-update')?.remove();
      else avisarActualizacion();
    };
    try{controlador.postMessage({tipo:'GH_VERSION'},[canal.port2]);}
    catch(e){cerrar();}
  };
  // Guardado ANTES de registrar: si ya había un controlador, un relevo posterior
  // es una actualización de verdad. En la primera visita no hay ninguno y el
  // relevo es solo la instalación inicial — ahí no hay nada que avisar.
  let habiaControlador = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if(habiaControlador) revisarVersionActivada();
    // Después de la primera instalación también puede llegar otra versión
    // sin cerrar la página: solo se omite el primer relevo, no los futuros.
    habiaControlador = !!navigator.serviceWorker.controller;
  });
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => {
        // El aviso de arriba solo podía dispararse durante una carga de página:
        // es `register()` quien hace al navegador comprobar si sw.js cambió. En
        // la app instalada en el teléfono eso casi nunca pasa —se abre desde el
        // ícono, queda en segundo plano y se vuelve a ella sin recargar—, así
        // que alguien podía usar la versión vieja durante días sin que nada se
        // lo dijera. El aviso existía y no llegaba a aparecer nunca.
        //
        // Al volver al primer plano se le pide al navegador que revise. Si hay
        // algo nuevo, el service worker se instala, toma el control y ahí sí
        // salta `controllerchange` con el aviso.
        let ultimaRevision = Date.now();
        document.addEventListener('visibilitychange', () => {
          if(document.visibilityState !== 'visible')return;
          // Con un mínimo entre revisiones: cambiar de app y volver es un gesto
          // constante, y cada revisión es una petición de red.
          if(Date.now() - ultimaRevision < 60000)return;
          ultimaRevision = Date.now();
          reg.update().catch(() => {});
        });
      })
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
