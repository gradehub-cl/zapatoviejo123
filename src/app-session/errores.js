function detalleErrorSeguro(error){
  let detalle=String((error&&error.message)||'Error sin mensaje').slice(0,240);
  const privados=[];
  const vistos=new Set();
  const recopilar=(valor,profundidad)=>{
    if(typeof valor==='string'){if(valor.trim().length>1)privados.push(valor);return;}
    if(!valor||typeof valor!=='object'||profundidad>8||vistos.has(valor)||privados.length>=1000)return;
    vistos.add(valor);
    Object.values(valor).forEach(v=>recopilar(v,profundidad+1));
  };
  recopilar(currentUser,0);
  if(typeof S!=='undefined')recopilar(S,0);
  // Se reemplaza la palabra completa, no un pedazo: con la carrera "COM" en el
  // estado, "loop completed" quedaba "loop [dato]pleted", y el mismo error del
  // navegador se partía en dos grupos (errores_app, 2026-10-26). Un dato
  // privado sigue saliendo entero; lo que no se toca es el interior de otra palabra.
  privados.filter(v=>typeof v==='string'&&v.trim().length>1)
    .sort((a,b)=>b.length-a.length)
    .forEach(v=>{
      const literal=v.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
      try{detalle=detalle.replace(new RegExp('(^|[^\\p{L}\\p{N}])'+literal+'(?=$|[^\\p{L}\\p{N}])','giu'),'$1[dato]');}
      catch(e){detalle=detalle.replace(new RegExp(literal,'gi'),'[dato]');}
    });
  return detalle
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,'[correo]')
    .replace(/https?:\/\/\S+/gi,'[url]')
    .replace(/\b\d+(?:[.,]\d+)?\b/g,'[n]')
    .slice(0,100);
}

// ─── Errores: saber cuándo algo se cae ──────────────────────────────────────
// Cada error de JavaScript que nadie atrapó (en la app y en la web) se guarda
// en Supabase, en errores_app (supabase/errores_app.sql). Va saneado igual que
// los del arranque: sin notas, nombres, correos, URL ni números. Solo con
// sesión (la tabla exige user_id), máximo 5 por visita y sin repetir el mismo:
// un error dentro de un bucle no llena la tabla. Si la tabla no existe o no hay
// red, se pierde en silencio: reportar nunca puede romper la app.
const MAX_ERRORES_POR_VISITA=5;
const _erroresEnviados=new Set();
function versionDeLaApp(){
  try{
    const src=(document.querySelector('script[src*="app-session.js?v="]')||{}).src||'';
    const v=(src.match(/[?&]v=([\w-]{1,20})/)||[])[1];
    return v&&v!=='__ASSET_VERSION__'?v:'dev';
  }catch(e){return 'dev';}
}
function reportarError(error,donde){
  try{
    if(!supabaseClient||!currentUser||_erroresEnviados.size>=MAX_ERRORES_POR_VISITA)return false;
    // Sin app.js, todo lo que corre después falla en cadena ("Can't find
    // variable: S" desde visibilitychange, render-main…). La causa ya se guarda
    // una vez como "app.js no cargó"; lo demás solo la repite con otro nombre.
    // `track` es una declaración de función de app.js: existe si el archivo se leyó.
    if(typeof track!=='function'&&donde!=='arranque:cargar_app')return false;
    const original=String((error&&error.message)||'');
    // Avisos del navegador y código que inyectan extensiones: no son nuestros.
    // ResizeObserver avisa que difirió un ciclo de medición, sin romper nada; una
    // billetera de criptomonedas escribe window.ethereum en cada página.
    if(/^ResizeObserver loop /.test(original)||/window\.ethereum\b/.test(original))return false;
    const mensaje=detalleErrorSeguro(error);
    // "Script error." es lo único que deja un script de otro origen: no dice nada.
    if(/^Script error\.?$/i.test(mensaje))return false;
    // __gCrWeb es el script que Chrome para iPhone inyecta en cada página: si
    // falla, no es nuestro (2026-10-16, "Can't find variable: __gCrWeb").
    if(/__gCrWeb/.test(mensaje))return false;
    const tipos=['TypeError','ReferenceError','RangeError','SyntaxError','AbortError','NotAllowedError'];
    const tipo=error&&tipos.includes(error.name)?error.name:'Error';
    const clave=tipo+'|'+mensaje+'|'+donde;
    if(_erroresEnviados.has(clave))return false;
    _erroresEnviados.add(clave);
    const activa=document.querySelector('.screen.active');
    const pantalla=activa&&activa.id?activa.id.replace(/^screen-/,''):(typeof currentTab==='string'?currentTab:'');
    supabaseClient.from('errores_app').insert({
      plataforma:typeof APP_NATIVA!=='undefined'&&APP_NATIVA?'app':'web',
      version:versionDeLaApp(),tipo,mensaje,donde:String(donde||'').slice(0,80),pantalla:String(pantalla).slice(0,20)
    }).then(()=>{},()=>{});
    return true;
  }catch(e){return false;}
}
// Solo el nombre del archivo y la línea: la ruta completa delata el dispositivo.
function dondeDelError(archivo,linea,columna){
  const nombre=String(archivo||'').split('?')[0].split('/').pop()||'?';
  return nombre+(linea?':'+linea+(columna?':'+columna:''):'');
}
// Una promesa rechazada no trae archivo ni línea: se sacan del primer marco del
// stack. Sin esto, "promesa" no distinguía un error nuestro de uno de una
// extensión del navegador ("reading 'M_ID'", 2026-10-14, no está en el repo).
function dondeDeLaPromesa(error){
  const m=String(error&&error.stack||'').match(/([a-z-]+:\/\/[^\s()]+?):(\d+):(\d+)/i);
  if(!m)return 'promesa';
  if(/^(chrome|moz|safari-web)-extension:/i.test(m[1]))return 'promesa · extensión';
  return 'promesa · '+dondeDelError(m[1],m[2],m[3]);
}
if(typeof window!=='undefined'&&typeof window.addEventListener==='function'){
  window.addEventListener('error',e=>{
    // Un <img> o un <script> que no carga también dispara "error", sin mensaje.
    if(!e||!e.message)return;
    if(/^(chrome|moz|safari-web)-extension:/i.test(String(e.filename||'')))return;
    reportarError(e.error||{message:e.message},dondeDelError(e.filename,e.lineno,e.colno));
  });
  window.addEventListener('unhandledrejection',e=>{
    const donde=dondeDeLaPromesa(e&&e.reason);
    // Un error de una extensión del navegador ("reading 'M_ID'") no es nuestro:
    // guardarlo solo ensucia errores_app (2026-10-15).
    if(donde==='promesa · extensión')return;
    reportarError(e&&e.reason,donde);
  });
}

function registrarErrorArranque(error,fase){
  const tiposSeguros=['TypeError','ReferenceError','RangeError','SyntaxError'];
  const tipo=error&&tiposSeguros.includes(error.name)?error.name:'Error';
  const detalle=detalleErrorSeguro(error);
  console.error('GradeHub no pudo completar el arranque ('+fase+'): '+tipo+' · '+detalle);
  // `track` vive en app.js. Si app.js no alcanzó a cargar (una descarga
  // cortada), llamarla reventaba acá: la persona quedaba en el login con la
  // sesión abierta, sin el aviso de recargar, y errores_app solo recibía
  // "Can't find variable: track" en vez del error de verdad (2026-10-14).
  if(typeof track==='function')track('app_boot_error',{fase:fase,tipo:tipo,detalle:detalle});
  reportarError(error,'arranque:'+fase);
}
