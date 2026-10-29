
// ─── SERVICE WORKER ──────────────────────────────────────────────────────────
// El SW guarda copias de los archivos para que la app abra al instante y sirva
// sin internet. El costo: después de un deploy el estudiante sigue con la
// versión anterior hasta que el SW nuevo toma el control, y la página que ya
// está abierta conserva el JS viejo aunque eso pase.
//
// Sin aviso, la única forma de ver una versión nueva es recargar DOS veces —
// la primera instala el SW, la segunda sirve los archivos nuevos. Nadie hace
// eso. Por eso acá se detecta el relevo y se ofrece recargar de una.
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
  // Guardado ANTES de registrar: si ya había un controlador, un relevo posterior
  // es una actualización de verdad. En la primera visita no hay ninguno y el
  // relevo es solo la instalación inicial — ahí no hay nada que avisar.
  const habiaControlador = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if(habiaControlador) avisarActualizacion();
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
