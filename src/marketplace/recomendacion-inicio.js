
// ─── RECOMENDACIÓN EN INICIO ────────────────────────────────────────────────
//
// La segunda puerta de docs/marketplace-clases.md. Una clase cuyo público
// calza con uno de tus ramos aparece junto a ese ramo en Inicio, con su
// etiqueta de publicidad. Reglas que no se negocian:
//
// - Se decide en el navegador con `seleccionarClaseApoyo`: se descargan los
//   anuncios públicos de tu universidad y se comparan acá con tus ramos y notas.
//   Nada de eso viaja para elegir.
// - Solo en Inicio, nunca en la ficha del ramo, la Agenda ni el ingreso de notas.
// - Se muestra mientras siga calzando, hasta cerrarla con la X. Cerrar oculta
//   solo ese anuncio hasta la medianoche de Chile en todos los dispositivos
//   de la cuenta (Lucas, 2026-10-31). Los demás siguen rotando;
//   al día siguiente pueden aparecer otra vez. El catálogo sigue disponible.
// - No dice "reprobando" ni diagnostica: ofrece apoyo para el ramo.
// - El cierre y el día viven en `gradehub_marketplace_v1`, aparte de
//   gradehub_v1: apagar esto no toca el estado académico.
//
// RECOMENDACIONES_CLASES_ACTIVAS es el interruptor. Apagarlo esconde el banner
// sin tocar el catálogo, que es la puerta abierta a todos.
const RECOMENDACIONES_CLASES_ACTIVAS=true;
const CLAVE_MARKETPLACE='gradehub_marketplace_v1';

function leerEstadoMarketplace(){
  try{
    const v=JSON.parse(localStorage.getItem(CLAVE_MARKETPLACE)||'{}');
    return v&&typeof v==='object'&&!Array.isArray(v)?v:{};
  }catch(e){return {};}
}
function guardarEstadoMarketplace(estado){
  try{localStorage.setItem(CLAVE_MARKETPLACE,JSON.stringify(estado));}catch(e){}
}
// Preferencia separada de las notas. Se consulta antes de mostrar publicidad
// y al volver a la app; cada cuenta tiene su propia petición y copia en memoria.
const cierresAnunciosCuenta=new Map();
function cierreAnunciosCuenta(uid=currentUser&&currentUser.id){
  if(!cierresAnunciosCuenta.has(uid))cierresAnunciosCuenta.set(uid,{leido:false,hasta:0,pendiente:0,pedido:null,porAnuncio:{},localPorAnuncio:{},pendientesPorAnuncio:{}});
  return cierresAnunciosCuenta.get(uid);
}
async function sincronizarCierreAnuncios(){
  if(!currentUser||!supabaseClient)return false;
  const uid=currentUser.id,cliente=supabaseClient,c=cierreAnunciosCuenta(uid);
  if(c.pedido)return c.pedido;
  const pendiente=leerEstadoMarketplace().cierrePendiente;
  const hasta=Math.max(c.pendiente,pendiente&&pendiente.uid===uid?pendiente.hasta||0:0);
  c.pedido=Promise.resolve().then(async()=>{
    try{
      if(currentUser?.id!==uid)return false;
      const {data,error}=await cliente.rpc('mi_cierre_anuncios',hasta>Date.now()?{p_hasta:new Date(hasta).toISOString()}:{});
      if(error)throw error;
      const remoto=Date.parse(data);
      if(Number.isFinite(remoto))c.hasta=Math.max(c.hasta,remoto);
      if(c.pendiente===hasta)c.pendiente=0;
      const estado=leerEstadoMarketplace();
      if(hasta&&estado.cierrePendiente?.uid===uid&&estado.cierrePendiente.hasta===hasta){
        delete estado.cierrePendiente;guardarEstadoMarketplace(estado);
      }
      // Los cierres nuevos envían solo el id; la cuenta y el vencimiento los fija SQL.
      const hoy=diaLocalClases();
      if(currentUser?.id!==uid)return false;
      const cola={...(leerEstadoMarketplace().cierresPendientesPorCuenta?.[uid]||{}),...c.pendientesPorAnuncio};
      for(const [id,dia] of Object.entries(cola)){
        if(dia!==hoy)continue;
        if(currentUser?.id!==uid)return false;
        const r=await cliente.rpc('cerrar_anuncio_hoy',{p_anuncio_id:id});if(r.error)throw r.error;
        const vence=Date.parse(r.data);if(Number.isFinite(vence))c.porAnuncio[id]=vence;
        if(c.pendientesPorAnuncio[id]===dia)delete c.pendientesPorAnuncio[id];
        const e=leerEstadoMarketplace();
        if(e.cierresPendientesPorCuenta?.[uid]?.[id]===dia){delete e.cierresPendientesPorCuenta[uid][id];guardarEstadoMarketplace(e);}
      }
      const r=await cliente.rpc('mis_cierres_anuncios');if(r.error)throw r.error;
      for(const fila of Array.isArray(r.data)?r.data:[]){const vence=Date.parse(fila.oculta_hasta);if(Number.isFinite(vence))c.porAnuncio[fila.anuncio_id]=vence;}
      const e=depurarCierresAnuncios( leerEstadoMarketplace());guardarEstadoMarketplace(e);
      return true;
    }catch(e){return false;}
    finally{c.leido=true;c.pedido=null;}
  });
  return c.pedido;
}
function refrescarCierreAnuncios(){
  if(!currentUser||!supabaseClient||(typeof esCuentaProfesor==='function'&&esCuentaProfesor()))return;
  const uid=currentUser.id,c=cierreAnunciosCuenta(uid);
  c.leido=false;
  const contenedor=document.getElementById('home-ramos');
  if(contenedor)pintarRecomendacionClase(contenedor);
}
if(typeof window!=='undefined'&&window.addEventListener){
  window.addEventListener('focus',refrescarCierreAnuncios);
  window.addEventListener('pageshow',refrescarCierreAnuncios);
  window.addEventListener('online',refrescarCierreAnuncios);
  window.addEventListener('storage',e=>{
    if(e.key!==CLAVE_MARKETPLACE)return;
    try{
      const antes=JSON.parse(e.oldValue||'{}'),despues=JSON.parse(e.newValue||'{}');
      // La rotación también escribe esta clave: no repintar por ella o dos
      // pestañas abiertas se pasarían el anuncio de vuelta indefinidamente.
      if(antes?.ocultaHasta!==despues?.ocultaHasta||antes?.cerrada!==despues?.cerrada||JSON.stringify(antes?.cierresPorCuenta)!==JSON.stringify(despues?.cierresPorCuenta))refrescarCierreAnuncios();
    }catch(e){}
  });
  if(typeof document!=='undefined'&&document.addEventListener)
    document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')refrescarCierreAnuncios();});
}
function diaLocalClases(ahora=Date.now()){return hoyChileClase(ahora);}
function depurarCierresAnuncios(estado,ahora=Date.now()){
  const dia=diaLocalClases(ahora),e={...estado};
  for(const clave of ['cierresPorCuenta','cierresPendientesPorCuenta']){
    e[clave]=Object.fromEntries(Object.entries(e[clave]||{}).map(([uid,filas])=>[uid,Object.fromEntries(Object.entries(filas||{}).filter(([,d])=>d===dia))]).filter(([,filas])=>Object.keys(filas).length));
  }
  return e;
}
function anunciosCerradosHoy(estado,ahora=Date.now(),uid=currentUser&&currentUser.id){
  const dia=diaLocalClases(ahora),cerrados=new Set(Object.entries(estado?.cierresPorCuenta?.[uid||'sin-cuenta']||{}).filter(([,d])=>d===dia).map(([id])=>id));
  if(uid)Object.entries(cierreAnunciosCuenta(uid).porAnuncio).forEach(([id,hasta])=>{if(ahora<hasta)cerrados.add(id);});
  if(uid)Object.entries(cierreAnunciosCuenta(uid).localPorAnuncio).forEach(([id,d])=>{if(d===dia)cerrados.add(id);});
  return [...cerrados];
}
// Identificador heredado que se conserva en el estado. El cierre ya no vence
// a las 14:00: tanto mañana como tarde quedan ocultas hasta el día siguiente.
const HORA_TARDE_CLASES=14;
function franjaClases(ahora=Date.now()){
  return diaLocalClases(ahora)+(Number(new Intl.DateTimeFormat('en-GB',{timeZone:'America/Santiago',hour:'2-digit',hourCycle:'h23'}).format(new Date(ahora)))<HORA_TARDE_CLASES?'-manana':'-tarde');
}
// Recibe anuncios, ramos y el estado guardado, consulta los cierres propios
// en memoria y devuelve la
// recomendación de esta apertura (o null) junto con el estado que hay que guardar.
// Una apertura de la app = una carga de la página. Volver a Inicio dentro de la
// misma apertura no cambia el banner; abrir la app de nuevo muestra la
// siguiente de las clases que calzan (pedido de Lucas del 2026-09-30).
const VISITA_CLASES=Date.now().toString(36)+Math.random().toString(36).slice(2);
function recomendacionDelDia(anuncios,ramos,tenant,estado,ahora=Date.now(),visita=VISITA_CLASES){
  const franja=franjaClases(ahora),e=estado||{};
  // Cerrada con la X: escondida hasta `ocultaHasta` (ver descartarRecomendacionClase).
  if(Number.isFinite(e.ocultaHasta)&&ahora<e.ocultaHasta)return {sel:null,estado:e};
  // Los cierres anteriores guardaban una franja (y podían vencer a las 14:00).
  // Se respeta el cierre por todo ese día, también con la versión nueva.
  if(e.cerrada&&typeof e.franja==='string'&&e.franja.slice(0,10)===diaLocalClases(ahora))return {sel:null,estado:e};
  const descartados=anunciosCerradosHoy(e,ahora);
  // Misma apertura: la misma clase, si sigue calzando. Si subiste una nota y
  // dejó de calzar, desaparece en vez de quedarse pegada.
  if(e.visita===visita&&e.anuncioId&&!descartados.includes(e.anuncioId)){
    const sel=seleccionarClaseApoyo((anuncios||[]).filter(a=>a&&a.id===e.anuncioId),ramos,tenant,{ahora,descartados});
    return {sel,estado:e};
  }
  // Apertura nueva: la siguiente en la rotación. `aperturas` cuenta las que ya
  // mostraron algo, así que la primera vez sale la primera.
  const aperturas=Number.isSafeInteger(e.aperturas)&&e.aperturas>=0?e.aperturas:0;
  const sel=seleccionarClaseApoyo(anuncios,ramos,tenant,{ahora,turno:aperturas,descartados});
  // Si no calza ninguna, no se anota nada: una clase publicada más tarde tiene
  // que poder aparecer.
  if(!sel)return {sel:null,estado:e};
  return {sel,estado:{...e,franja,visita,anuncioId:sel.anuncio.id,cerrada:false,aperturas:aperturas+1}};
}

// La X guarda solo ese id y el día chileno, por cuenta, fuera del estado académico.
function descartarRecomendacionClase(anuncioId,ahora=Date.now()){
  if(!anuncioId)return {vuelveEnLaTarde:false};
  const estado=depurarCierresAnuncios(leerEstadoMarketplace(),ahora),dia=diaLocalClases(ahora),uid=currentUser&&currentUser.id||'sin-cuenta';
  const cierres={...(estado.cierresPorCuenta||{})};cierres[uid]={...(cierres[uid]||{}),[anuncioId]:dia};
  const pendientes={...(estado.cierresPendientesPorCuenta||{})};
  if(uid!=='sin-cuenta'){pendientes[uid]={...(pendientes[uid]||{}),[anuncioId]:dia};const c=cierreAnunciosCuenta(uid);c.localPorAnuncio[anuncioId]=dia;c.pendientesPorAnuncio[anuncioId]=dia;}
  guardarEstadoMarketplace({...estado,cierresPorCuenta:cierres,cierresPendientesPorCuenta:pendientes,anuncioId:null});
  return {vuelveEnLaTarde:false};
}
function textoCierreClase(){return 'Listo, no te mostramos este anuncio por hoy';}

let anunciosRecomendacion={tenant:null,lista:null,pidiendo:false};
// afterLogin la llama antes de que Inicio exista, en paralelo con la lectura de
// las notas: así el aviso suele estar listo en el primer pintado y no aparece
// después empujando los ramos de abajo (eso es lo que mide el CLS). Quien la
// llama mientras el pedido sigue en vuelo queda esperando el mismo resultado.
function cargarAnunciosRecomendacion(tenant,alTerminar){
  if(typeof esCuentaProfesor==='function'&&esCuentaProfesor())return;
  if(anunciosRecomendacion.pidiendo&&anunciosRecomendacion.tenant===tenant){
    anunciosRecomendacion.esperan.push(alTerminar);return;
  }
  const pedido={tenant,lista:null,pidiendo:true,esperan:[alTerminar]};
  anunciosRecomendacion=pedido;
  cargarAnunciosClases(tenant,{propagarError:true}).then(lista=>{
    if(anunciosRecomendacion!==pedido)return;
    anunciosRecomendacion={tenant,lista:Array.isArray(lista)?lista:[],pidiendo:false};
    pedido.esperan.forEach(fn=>fn());
  }).catch(()=>{
    if(anunciosRecomendacion===pedido)anunciosRecomendacion={tenant,lista:null,pidiendo:false};
    // Sin resultado confirmado no se cachea una lista vacía. La siguiente
    // entrada a Inicio vuelve a pedir anuncios sin consumir la recomendación.
  });
}

const RECOMENDACIONES_VISTAS=new Set();
function observarRecomendacionClase(banner,anuncio,sigla){
  const clave=claveMedicionClase(anuncio.id),doc=typeof document==='undefined'?null:document;
  if(typeof IntersectionObserver!=='function'||RECOMENDACIONES_VISTAS.has(clave))return;
  let timer=null,visible=false,registrando=false;
  const registrar=async()=>{
    timer=null;
    if(doc&&doc.visibilityState==='hidden'||!banner.isConnected||!visible||registrando||RECOMENDACIONES_VISTAS.has(clave))return;
    registrando=true;
    const alcance=await registrarAlcanceAnuncio(anuncio.id,'recomendacion');
    const metrica=alcance===null?null:await registrarMetricaAnuncio(anuncio.id,'impresion',sigla);
    registrando=false;
    if(alcance===null||metrica===null){
      if(banner.isConnected&&visible)timer=setTimeout(registrar,5000);
    }else{RECOMENDACIONES_VISTAS.add(clave);obs.disconnect();if(doc&&doc.removeEventListener)doc.removeEventListener('visibilitychange',alCambiarVisibilidad);}
  };
  const obs=new IntersectionObserver(entradas=>{
    const e=entradas[entradas.length-1];
    if(e.isIntersecting&&e.intersectionRatio>=IMPRESION_VISIBLE){
      visible=true;
      if((!doc||doc.visibilityState!=='hidden')&&!timer&&!registrando)timer=setTimeout(registrar,IMPRESION_MS);
    }else{visible=false;if(timer){clearTimeout(timer);timer=null;}}
  },{threshold:[IMPRESION_VISIBLE]});
  const alCambiarVisibilidad=()=>{
    if(timer){clearTimeout(timer);timer=null;}
    if(!banner.isConnected){obs.disconnect();if(doc&&doc.removeEventListener)doc.removeEventListener('visibilitychange',alCambiarVisibilidad);return;}
    if((!doc||doc.visibilityState!=='hidden')&&visible&&!registrando&&!RECOMENDACIONES_VISTAS.has(clave))timer=setTimeout(registrar,IMPRESION_MS);
  };
  if(doc&&doc.addEventListener)doc.addEventListener('visibilitychange',alCambiarVisibilidad);
  obs.observe(banner);
}

// La llama renderHome después de pintar los ramos. Si los anuncios todavía no
// llegan, los pide y vuelve a pintar solo el banner cuando llegan.
// La línea bajo el título: formato, lugar y precio, lo que el profesor llenó.
// Los datos que pueden ir bajo el título, en el orden en que se muestran.
function opcionesLineaClase(anuncio){
  const a=anuncio||{},out=[];
  const mod=textoOpcionClase(MODALIDADES_CLASE,a.modalidad,a.modalidad_otra);
  if(mod)out.push({clave:'modalidad',nombre:'Formato',texto:mod});
  const ubi=textoOpcionClase(UBICACIONES_CLASE,a.ubicacion,a.ubicacion_otra);
  if(ubi)out.push({clave:'ubicacion',nombre:'Dónde',texto:ubi});
  detallesClase(a).forEach(d=>out.push({clave:'detalle:'+d.etiqueta.trim(),nombre:d.etiqueta.trim(),texto:d.valor.trim()}));
  return out;
}
function lineaDatosClase(a){
  const elegidas=Array.isArray(a&&a.linea_datos)?a.linea_datos:LINEA_CLASE_POR_OMISION;
  return opcionesLineaClase(a).filter(o=>elegidas.includes(o.clave)).slice(0,MAX_LINEA_CLASE).map(o=>o.texto).join(' · ');
}
// El mismo contenido para el banner de Inicio y para la vista previa que ve el
// profesor al armar su clase: lo que ve uno es exactamente lo que verá el otro.
function contenidoRecomendacionClase(anuncio,{logoUrl='',vistaPrevia=false}={}){
  const a=anuncio||{},linea=lineaDatosClase(a);
  return `<button type="button" class="clase-apoyo-abrir"${vistaPrevia?' tabindex="-1" aria-hidden="true"':''}>
      <span class="clase-apoyo-texto">
        <span class="ca-cabeza"><small>Publicidad · ${etiquetaTipoClase(a)}</small><strong>${esc(a.titulo||(esMaterialClase(a)?'Tu material':'Tu clase'))}</strong></span>
        <span class="ca-pie">${linea||(vistaPrevia&&!esMaterialClase(a))?`<span class="clase-apoyo-datos">${esc(linea||'Formato · Lugar')}</span>`:''}<span class="clase-apoyo-ver">${esMaterialClase(a)?'Ver material':'Ver clase'} ›</span></span>
      </span>
    </button>
    <span class="clase-apoyo-logo" aria-hidden="true"${logoUrl?'':' hidden'}>${logoUrl?imgLogoClase(logoUrl):''}</span>
    <button type="button" class="clase-apoyo-cerrar" aria-label="Ocultar este anuncio por hoy"${vistaPrevia?' tabindex="-1"':''}>
      <svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>
    </button>`;
}

function pintarRecomendacionClase(contenedor){
  if(typeof esCuentaProfesor==='function'&&esCuentaProfesor()){
    if(contenedor)contenedor.querySelectorAll('.clase-apoyo').forEach(b=>b.remove());
    if(contenedor)contenedor.querySelectorAll('.tiene-clase-apoyo').forEach(f=>{f.classList.remove('tiene-clase-apoyo','junto-der','junto-izq');f.style.removeProperty('--info-mitad');});
    return;
  }
  if(!RECOMENDACIONES_CLASES_ACTIVAS||!contenedor||!currentUser||!supabaseClient||!S||!S.tenant)return;
  contenedor.querySelectorAll('.clase-apoyo').forEach(b=>b.remove());
  contenedor.querySelectorAll('.tiene-clase-apoyo').forEach(f=>{f.classList.remove('tiene-clase-apoyo','junto-der','junto-izq');f.style.removeProperty('--info-mitad');});
  const uid=currentUser.id,cierre=cierreAnunciosCuenta(uid);
  if(!cierre.leido){
    sincronizarCierreAnuncios().then(()=>{if(currentUser?.id===uid&&contenedor.isConnected)pintarRecomendacionClase(contenedor);});
    return;
  }
  if(Date.now()<cierre.hasta)return;
  if(anunciosRecomendacion.tenant!==S.tenant||anunciosRecomendacion.lista===null){
    cargarAnunciosRecomendacion(S.tenant,()=>{if(contenedor.isConnected)pintarRecomendacionClase(contenedor);});
    return;
  }
  const {sel,estado}=recomendacionDelDia(anunciosRecomendacion.lista,S.ramos,S.tenant,leerEstadoMarketplace());
  guardarEstadoMarketplace(estado);
  if(!sel)return;
  const fila=[...contenedor.querySelectorAll('.ramo-row')].find(f=>f.dataset.ramoId===String(sel.ramo.id));
  if(!fila)return;
  const {anuncio,ramo}=sel,sigla=siglaRamoParaClases(ramo);
  const banner=document.createElement('aside');
  banner.className='clase-apoyo';
  banner.setAttribute('aria-label','Publicidad: clase particular');
  banner.innerHTML=contenidoRecomendacionClase(anuncio);
  banner.querySelector('.clase-apoyo-abrir').addEventListener('click',()=>{
    registrarInteraccionMedida(anuncio.id,'apertura',sigla);
    abrirClaseRecomendada(anuncio,ramo,sigla);
  });
  banner.querySelector('.clase-apoyo-cerrar').addEventListener('click',async e=>{
    const cierre=descartarRecomendacionClase(anuncio.id);
    fila.classList.remove('tiene-clase-apoyo','junto-der','junto-izq');
    fila.style.removeProperty('--info-mitad');
    banner.remove();
    if(e.detail===0)fila.querySelector('.ramo-name')?.focus({preventScroll:true});
    // Si había una lectura en vuelo, la escritura del cierre va después.
    const pendiente=cierreAnunciosCuenta(uid).pedido;
    if(pendiente)await pendiente;
    if(currentUser?.id!==uid)return;
    const guardado=await sincronizarCierreAnuncios();
    if(currentUser?.id===uid&&typeof showToast==='function')showToast(guardado?textoCierreClase(cierre):'Este anuncio quedó oculto aquí por hoy. No pudimos guardarlo en tus otros dispositivos.',!guardado);
    if(currentUser?.id===uid&&contenedor.isConnected)pintarRecomendacionClase(contenedor);
  });
  // El logo del profesor, si tiene uno aprobado. Llega después: el banner no
  // espera a Storage para aparecer, y sin logo simplemente no se muestra.
  logosDeAnuncios([anuncio.id]).then(async logos=>{
    const ruta=logos.get(anuncio.id),caja=banner.querySelector('.clase-apoyo-logo');
    if(!ruta||!caja)return;
    const url=await urlFlyerClase(ruta);
    if(!url||!banner.isConnected)return;
    caja.innerHTML=imgLogoClase(url);caja.hidden=false;
  }).catch(()=>{});
  fila.classList.add('tiene-clase-apoyo');
  // En el DOM el banner va siempre justo después de su ramo: así se lee en
  // orden y en celular (una columna) queda pegado debajo. En la grilla se
  // ubica aparte, en colocarRecomendacionEnGrilla.
  fila.after(banner);
  alinearRecomendacionConRamo(contenedor,fila,banner,{colocar:true});
  observarRecomendacionClase(banner,anuncio,sigla);
}

// En la grilla el ramo y su clase se estiran al alto de la fila. El texto de
// los dos queda centrado, y el título de la clase se alinea con el nombre del
// ramo y sus datos con la sigla. Se mide en pantalla porque un nombre de ramo
// puede ocupar una o dos líneas; se vuelve a medir si cambia el tamaño.
// En la grilla de escritorio la clase ocupa UNA casilla junto a su ramo: la
// de la derecha, o la de la izquierda si el ramo está en la última columna.
// Ramo y clase se fijan en su fila y columna, y el resto de los ramos fluye
// alrededor; el ramo queda exactamente donde estaba sin la clase.
//
// Antes se metía el banner antes o después del ramo en el DOM, con las
// columnas contadas una sola vez. Con el ramo en la última columna, meterlo
// antes empujaba al ramo a la fila siguiente, y la clase quedaba lejos de su
// ramo, con el texto encima de otro (pasó el 2026-09-26 con Dinámica en la
// tercera columna). Ahora se recalcula si cambia el ancho.
function columnasGrillaRamos(contenedor){
  try{
    const cs=getComputedStyle(contenedor);
    if(cs.display!=='grid')return 1;
    // Con la grilla dibujada el valor viene en píxeles, una por columna. Sin
    // dibujar (pantalla oculta) viene como la regla escrita: no se adivina.
    const t=String(cs.gridTemplateColumns||'').trim();
    return /^[\d.]+px( [\d.]+px)*$/.test(t)?t.split(' ').length:0;
  }catch(e){return 1;}
}
function colocarRecomendacionEnGrilla(contenedor,fila,banner){
  const columnas=columnasGrillaRamos(contenedor);
  if(!columnas)return;
  const casillas=[...contenedor.children].filter(el=>el!==banner);
  const i=casillas.indexOf(fila);
  const derecha=columnas>1&&i>=0&&i%columnas<columnas-1;
  const enGrilla=columnas>1&&i>=0;
  banner.classList.toggle('en-casilla',enGrilla);
  banner.classList.toggle('a-la-derecha',enGrilla&&derecha);
  banner.classList.toggle('a-la-izquierda',enGrilla&&!derecha);
  fila.classList.toggle('junto-der',enGrilla&&derecha);
  fila.classList.toggle('junto-izq',enGrilla&&!derecha);
  if(!enGrilla){['--ca-fila','--ca-col-ramo','--ca-col-clase'].forEach(v=>{fila.style.removeProperty(v);banner.style.removeProperty(v);});return;}
  const filaGrilla=Math.floor(i/columnas)+1,col=i%columnas+1;
  [fila,banner].forEach(el=>el.style.setProperty('--ca-fila',String(filaGrilla)));
  fila.style.setProperty('--ca-col-ramo',String(col));
  banner.style.setProperty('--ca-col-clase',String(derecha?col+1:col-1));
}

function alinearRecomendacionConRamo(contenedor,fila,banner,{colocar=false}={}){
  let obs=null;
  const medir=()=>{
    if(!banner.isConnected||!fila.isConnected){if(obs)obs.disconnect();return;}
    if(colocar)colocarRecomendacionEnGrilla(contenedor,fila,banner);
    const info=fila.querySelector('.ramo-info');
    if(info)fila.style.setProperty('--info-mitad',(info.offsetHeight/2)+'px');
    const nombre=fila.querySelector('.ramo-name'),meta=fila.querySelector('.ramo-meta');
    const cabeza=banner.querySelector('.ca-cabeza strong'),pie=banner.querySelector('.clase-apoyo-datos');
    banner.style.setProperty('--ajuste-titulo','0px');banner.style.setProperty('--ajuste-datos','0px');
    // En la vista previa del profesor la grilla va achicada: las distancias en
    // pantalla se pasan a las de la tarjeta sin achicar.
    const escala=(fila.offsetWidth&&fila.getBoundingClientRect().width/fila.offsetWidth)||1;
    if(nombre&&cabeza)banner.style.setProperty('--ajuste-titulo',Math.round((nombre.getBoundingClientRect().top-cabeza.getBoundingClientRect().top)/escala)+'px');
    if(meta&&pie)banner.style.setProperty('--ajuste-datos',Math.round((meta.getBoundingClientRect().top-pie.getBoundingClientRect().top)/escala)+'px');
  };
  if(typeof ResizeObserver==='function'){obs=new ResizeObserver(medir);obs.observe(contenedor);}
  requestAnimationFrame(medir);
}

async function abrirClaseRecomendada(anuncio,ramo,sigla){
  const raiz=document.getElementById('modal-content');
  if(!raiz)return;
  logosCatalogoClases=await logosDeAnuncios([anuncio.id]);
  raiz.innerHTML=`<div class="catalogo-clases">
      <div class="catalogo-clases-head"><div><div class="modal-title" id="modal-titulo">${esc(etiquetaTipoClase(anuncio))}</div></div><button type="button" class="settings-cerrar" onclick="closeModal()">Cerrar</button></div>
      <div class="catalogo-clases-resultados">${tarjetaCatalogoClase(anuncio,{sigla,abierta:true})}</div>
      <button type="button" class="btn-cancel clase-apoyo-mas" onclick="openCatalogoClases()">Ver todas las clases</button>
    </div>`;
  activarTarjetasClases(raiz);
  openModal();
}

if(typeof document!=='undefined'){
  const entradaProfesor=document.getElementById('um-profesor');
  if(entradaProfesor)entradaProfesor.addEventListener('click',()=>umGo(openEspacioProfesor));
}
