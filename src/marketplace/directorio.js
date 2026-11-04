// Piezas compartidas por el editor y el directorio. Nunca dependen de notas.
const CATEGORIAS_DIRECTORIO=[['clases','Clases particulares'],['material','Material y apuntes'],['laboratorio','Laboratorios y proyectos'],['otro','Otro']];
const CAMPOS_DIRECTORIO='directorio_id,categorias,etiqueta,color_tarjeta,en_directorio,contacto_tipo,contacto_valor,destacado_hasta';
function colorTarjetaDirectorio(color){return /^#[0-9a-f]{6}$/.test(String(color))?color:'#126b63';}
function luminanciaDirectorio(color){
  const rgb=colorTarjetaDirectorio(color).slice(1).match(/../g).map(x=>parseInt(x,16)/255)
    .map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);
  return rgb.reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0);
}
function textoTarjetaDirectorio(color){
  const l=luminanciaDirectorio(color);
  return (l+.05)/.05>=1.05/(l+.05)?'#000000':'#ffffff';
}
// Misma escala y mínimo público que el rating de docentes universitarios.
// Los perfiles del directorio aún no tienen esa fuente: nunca se cruza por nombre.
function valoracionDirectorioHTML(estado){
  const total=Math.max(0,Number(estado&&estado.total)||0),promedio=estado&&estado.promedio!=null?Number(estado.promedio):NaN;
  if(total<3||!Number.isFinite(promedio)||promedio<1||promedio>5)
    return '<span class="directorio-valoracion directorio-sin-valoraciones">Sin valoraciones</span>';
  const nota=promedio.toFixed(1);
  return `<span class="directorio-valoracion" aria-label="${nota} de 5 estrellas"><span aria-hidden="true">★</span> <strong aria-hidden="true">${nota}</strong></span>`;
}
function tarjetaDirectorioHTML(p,{previa=false,logoURL=''}={}){
  const color=colorTarjetaDirectorio(p.color_tarjeta),texto=textoTarjetaDirectorio(color);
  const tag=previa?'div':'button',id=String(p.id||p.directorio_id||'');
  return `<${tag} ${previa?'':`type="button" data-directorio-perfil="${esc(id)}"`} class="directorio-tarjeta" style="--directorio-color:${color};--directorio-texto:${texto}">
    <span class="directorio-tarjeta-cabeza"><span class="directorio-etiqueta">${esc(p.etiqueta||'Tu etiqueta')}</span>${valoracionDirectorioHTML(p.calificacion)}</span>
    <span class="directorio-identidad"><span class="directorio-textos"><strong class="directorio-nombre">${esc(p.nombre_publico||'Tu nombre público')}</strong>
      <span class="directorio-siglas">${esc((p.ramos_siglas||[]).slice(0,3).join(' · '))}</span></span>
      <span class="directorio-avatar" aria-hidden="true"${p.logo_path?` data-directorio-logo="${esc(p.logo_path)}"`:''}>${logoURL?imgLogoClase(logoURL):esc(String(p.nombre_publico||'P').charAt(0))}</span></span>
  </${tag}>`;
}
async function perfilConDirectorio(p){
  const uid=sesionProfesorClase();
  if(!uid||!p)return p;
  try{
    const {data,error}=await supabaseClient.from('tutor_perfiles').select(CAMPOS_DIRECTORIO).eq('user_id',uid).maybeSingle();
    if(uid!==sesionProfesorClase())return null;
    return !error&&data?{...p,...data,directorioDisponible:true}:{...p,directorioDisponible:false};
  }catch(e){return uid===sesionProfesorClase()?{...p,directorioDisponible:false}:null;}
}

function diaDirectorio(ahora=Date.now()){
  return new Intl.DateTimeFormat('en-CA',{timeZone:'America/Santiago',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(ahora));
}
function ordenDiarioDirectorio(perfiles,dia){
  const lista=perfiles.slice().sort((a,b)=>String(a.id).localeCompare(String(b.id)));
  let semilla=2166136261;for(const letra of String(dia))semilla=Math.imul(semilla^letra.charCodeAt(0),16777619)>>>0;
  const azar=()=>{semilla+=0x6d2b79f5;let x=semilla;x=Math.imul(x^x>>>15,x|1);x^=x+Math.imul(x^x>>>7,x|61);return ((x^x>>>14)>>>0)/4294967296;};
  for(let i=lista.length-1;i>0;i--){const j=Math.floor(azar()*(i+1));[lista[i],lista[j]]=[lista[j],lista[i]];}
  return lista;
}
function prepararDirectorio(perfiles,{busqueda='',categoria='',nombres={},ahora=Date.now()}={}){
  const tokens=normalizarBusquedaClase(busqueda).split(' ').filter(Boolean);
  const lista=(Array.isArray(perfiles)?perfiles:[]).filter(p=>{
    if(!p||!p.id||p.en_directorio===false||p.estado&&p.estado!=='aprobado')return false;
    if(categoria&&!(p.categorias||[]).includes(categoria))return false;
    const siglas=(p.ramos_siglas||[]).map(siglaAnuncio);
    const texto=normalizarBusquedaClase([p.nombre_publico,p.etiqueta,...siglas,...siglas.map(s=>nombres[s]||'')].join(' '));
    return tokens.every(t=>texto.includes(t));
  }).map(p=>({...p,destacado:Number.isFinite(Date.parse(p.destacado_hasta))&&Date.parse(p.destacado_hasta)>ahora}));
  return {destacados:lista.filter(p=>p.destacado).sort((a,b)=>String(a.id).localeCompare(String(b.id))),
    normales:ordenDiarioDirectorio(lista.filter(p=>!p.destacado),diaDirectorio(ahora))};
}
function anunciosDestacadosDirectorio(anuncios,busqueda,categoria,nombres,ahora=Date.now()){
  return prepararCatalogoClases(anuncios,busqueda,nombres,{ahora}).filter(a=>Number(a.precio_clp)>0&&
    (!a.publicado_at||Date.parse(a.publicado_at)<=ahora)&&(!categoria||(categoria==='material'?esMaterialClase(a):categoria==='clases'&&!esMaterialClase(a))));
}
function cabeceraDirectorioHTML(){
  return `<div class="catalogo-clases directorio-clases"><header class="catalogo-clases-head"><div><p class="catalogo-ceja">CLASES PARTICULARES</p><h1 id="modal-titulo">Encuentra tu apoyo</h1><p>Clases, apuntes y ayuda para tus ramos.</p></div><button type="button" class="settings-cerrar" data-directorio-cerrar>Cerrar</button></header>
    <label class="directorio-busqueda" for="directorio-buscar">Buscar por ramo, sigla o perfil<input id="directorio-buscar" type="search" autocomplete="off" placeholder="Cálculo, MAT1620, Clases STEM…" aria-describedby="directorio-estado"></label>
    <div class="directorio-filtros" role="group" aria-label="Tipo de apoyo">${[['','Todos'],['clases','Clases'],['material','Material'],['laboratorio','Laboratorios'],['otro','Otro']].map(([v,t])=>`<button type="button" data-directorio-categoria="${v}" aria-pressed="${v===''?'true':'false'}">${t}</button>`).join('')}</div>
    <p id="directorio-estado" class="profesor-info" role="status" aria-live="polite">Buscando perfiles…</p><div id="directorio-resultados" aria-busy="true"></div>
    <p class="catalogo-privacidad">El directorio no usa tus notas ni los ramos de tu cuenta.</p></div>`;
}
let vistaDirectorioVersion=0,limpiarDirectorioActual=null;
// Devuelve false solo si no está instalado el SQL: conserva el catálogo anterior.
async function abrirDirectorioClases(){
  if(!supabaseClient||!currentUser)return false;
  if(limpiarDirectorioActual){limpiarDirectorioActual();limpiarDirectorioActual=null;}
  const version=++vistaDirectorioVersion,uid=currentUser.id,tenant=S.tenant;
  const raiz=document.getElementById('modal-content');if(!raiz)return true;
  const anterior=raiz.innerHTML||'';
  raiz.innerHTML=cabeceraDirectorioHTML();openModal();
  const input=raiz.querySelector('#directorio-buscar'),resultados=raiz.querySelector('#directorio-resultados'),estado=raiz.querySelector('#directorio-estado');
  const vigente=()=>version===vistaDirectorioVersion&&currentUser?.id===uid&&S.tenant===tenant&&input.isConnected&&document.getElementById('directorio-buscar')===input&&document.getElementById('modal').classList.contains('open');
  let categoria='',perfiles=[],anuncios=[],nombres=nombresRamosParaClases(tenant),lista=false;
  const limpiarObservacion=crearObservadorDirectorio();limpiarDirectorioActual=limpiarObservacion;
  const cerrar=()=>{limpiarObservacion();closeModal();};raiz.querySelector('[data-directorio-cerrar]').addEventListener('click',cerrar);
  const pintar=()=>{
    if(!vigente()||!lista)return;
    const grupos=prepararDirectorio(perfiles,{busqueda:input.value,categoria,nombres});
    const pagados=anunciosDestacadosDirectorio(anuncios,input.value,categoria,nombres);
    const n=grupos.destacados.length+grupos.normales.length+pagados.length;
    estado.textContent=n?`${n} ${n===1?'resultado':'resultados'}`:'No encontramos perfiles con estos filtros.';
    resultados.setAttribute('aria-busy','false');
    const tarjetas=p=>p.map(x=>tarjetaDirectorioHTML(x)).join('');
    resultados.innerHTML=`${pagados.length||grupos.destacados.length?`<section class="directorio-seccion"><h2>Destacados</h2><p class="profesor-info">Publicidad · espacios destacados</p><div class="directorio-grilla">${pagados.map(a=>`<div class="directorio-publicidad"><span class="directorio-anuncio-marca">Destacado · Publicidad</span>${tarjetaCatalogoClase(a)}</div>`).join('')}${tarjetas(grupos.destacados)}</div></section>`:''}
      <section class="directorio-seccion"><h2>Directorio</h2>${grupos.normales.length?`<div class="directorio-grilla">${tarjetas(grupos.normales)}</div>`:!perfiles.length?`<div class="directorio-vacio"><p>Todavía no hay perfiles en tu universidad</p><button type="button" class="clase-accion" data-directorio-crear>¿Haces clases o vendes material? Crea tu perfil</button></div>`:grupos.destacados.length?'':'<p class="directorio-vacio">Prueba con otro ramo o tipo de apoyo.</p>'}</section>`;
    resultados.querySelectorAll('[data-directorio-perfil]').forEach(b=>b.addEventListener('click',()=>{
      const p=perfiles.find(p=>p.id===b.dataset.directorioPerfil),hoja=raiz.closest('.modal-sheet'),scroll=hoja?.scrollTop||0;if(p){limpiarObservacion();abrirPerfilDirectorio(p,{raiz,tenant,anuncios,volver:()=>{if(!vigente())return;raiz.querySelector('.directorio-clases').hidden=false;resultados.hidden=false;const detalle=raiz.querySelector('.directorio-perfil-abierto');if(detalle)detalle.remove();pintar();const card=[...resultados.querySelectorAll('[data-directorio-perfil]')].find(b=>b.dataset.directorioPerfil===p.id);card?.focus({preventScroll:true});if(hoja)hoja.scrollTop=scroll;}});}
    }));
    const crear=resultados.querySelector('[data-directorio-crear]');if(crear)crear.addEventListener('click',()=>{limpiarObservacion();openEspacioProfesor();});
    activarTarjetasClases(resultados);cargarLogosDirectorio(resultados);
    observarImpresionesClases(resultados,pagados,input.value);
    limpiarObservacion.observar(resultados,tenant,uid);
  };
  input.addEventListener('input',pintar);
  raiz.querySelectorAll('[data-directorio-categoria]').forEach(b=>b.addEventListener('click',()=>{categoria=b.dataset.directorioCategoria;raiz.querySelectorAll('[data-directorio-categoria]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));pintar();}));
  try{
    const r=await supabaseClient.rpc('directorio_perfiles',{p_tenant:tenant});
    if(!vigente())return true;
    if(r.error&&sqlClasesDesactualizado(r.error)){limpiarObservacion();raiz.innerHTML=anterior;return false;}
    if(r.error||!Array.isArray(r.data))throw r.error||Error('respuesta inválida');
    perfiles=r.data;
    // Los anuncios conservan exactamente su medición y costo actuales.
    try{anuncios=await cargarAnunciosClases(tenant,{propagarError:true});}catch(e){estado.textContent='Los perfiles están disponibles; no pudimos cargar los anuncios.';}
    if(!vigente())return true;
    catalogoClasesActual=anuncios;impresionesCatalogo=new Set();eventosCatalogo=new Map();
    logosCatalogoClases=await logosDeAnuncios(anuncios.map(a=>a.id));if(!vigente())return true;
    lista=true;pintar();
    if(tenant==='uc'&&typeof cargarCursosUC==='function')cargarCursosUC().then(ok=>{if(ok&&vigente()){nombres=nombresRamosParaClases(tenant);pintar();}}).catch(()=>{});
  }catch(e){console.warn('No se pudo cargar el directorio:',e?.code||e?.message||'error');if(vigente()){estado.textContent='No pudimos cargar el directorio. Revisa tu conexión.';resultados.setAttribute('aria-busy','false');resultados.innerHTML='<button type="button" class="clase-accion" data-directorio-reintentar>Reintentar</button>';resultados.querySelector('button').addEventListener('click',()=>{limpiarObservacion();openCatalogoClases();});}}
  return true;
}
async function cargarLogosDirectorio(raiz){
  raiz.querySelectorAll('[data-directorio-logo]').forEach(async caja=>{
    const url=await urlFlyerClase(caja.dataset.directorioLogo);if(caja.isConnected&&url)caja.innerHTML=imgLogoClase(url,' loading="lazy"');
  });
}
function perfilDirectorioHTML(p,anuncios){
  const siglas=p.ramos_siglas||[],otros=(anuncios||[]).filter(a=>(p.anuncios||[]).includes(a.id));
  const insta=enlaceContactoClase('instagram',p.instagram),web=enlaceContactoClase('enlace',p.sitio_web);
  return `<article class="directorio-perfil-abierto"><div class="directorio-perfil-cabecera"><button type="button" class="clase-accion" data-directorio-volver>← Volver al directorio</button><button type="button" class="settings-cerrar" data-directorio-cerrar>Cerrar</button></div>
    ${tarjetaDirectorioHTML(p,{previa:true})}<h2>${esc(p.nombre_publico)}</h2><p class="perfil-publico-texto">${esc(p.presentacion||'')}</p>
    <h3>Ramos</h3><ul class="directorio-ramos">${siglas.map(s=>`<li>${esc(s)}</li>`).join('')}</ul>
    ${p.contacto_tipo?'<button type="button" class="accion-principal" data-directorio-contactar>Contactar</button>':'<p class="profesor-info">Este perfil todavía no tiene un contacto disponible.</p>'}
    <p class="profesor-info" data-directorio-contacto-estado role="status"></p>
    ${insta||web?`<div class="directorio-redes">${insta?`<a href="${esc(insta)}" target="_blank" rel="noopener noreferrer" data-directorio-red>Instagram</a>`:''}${web?`<a href="${esc(web)}" target="_blank" rel="noopener noreferrer" data-directorio-red>Sitio web</a>`:''}</div>`:''}
    <div data-directorio-ver-clases hidden></div>
    ${otros.length?`<section class="directorio-seccion"><h3>Sus anuncios</h3>${otros.map(a=>tarjetaCatalogoClase(a)).join('')}</section>`:''}</article>`;
}
function abrirPerfilDirectorio(p,{raiz,tenant,anuncios,volver}){
  const uid=currentUser?.id,version=vistaDirectorioVersion,resultados=raiz.querySelector('#directorio-resultados');
  resultados.hidden=true;raiz.querySelector('.directorio-clases').hidden=true;raiz.insertAdjacentHTML('beforeend',perfilDirectorioHTML({...p,destacado:Date.parse(p.destacado_hasta)>Date.now()},anuncios));
  const perfil=raiz.querySelector('.directorio-perfil-abierto');
  const vigente=()=>perfil.isConnected&&currentUser?.id===uid&&S.tenant===tenant&&vistaDirectorioVersion===version&&document.getElementById('modal')?.classList.contains('open');
  perfil.querySelector('[data-directorio-volver]').addEventListener('click',volver);
  perfil.querySelector('[data-directorio-cerrar]').addEventListener('click',closeModal);
  cargarLogosDirectorio(perfil);activarTarjetasClases(perfil);
  observarImpresionesClases(perfil,(anuncios||[]).filter(a=>(p.anuncios||[]).includes(a.id)));
  registrarEventoDirectorio(p.id,'apertura',tenant);
  const contacto=perfil.querySelector('[data-directorio-contactar]');if(contacto)contacto.addEventListener('click',async()=>{
    if(contacto.disabled)return;contacto.disabled=true;
    const aviso=perfil.querySelector('[data-directorio-contacto-estado]');
    // La pestaña nace en el gesto. No se descarga correo antes de Contactar.
    const nativa=typeof enAppNativa==='function'&&enAppNativa(),ventana=!nativa&&p.contacto_tipo!=='email'?window.open('about:blank','_blank'):null;if(ventana)ventana.opener=null;
    try{
      const r=await supabaseClient.rpc('contacto_directorio_perfil',{p_perfil:p.id,p_tenant:tenant});
      if(!vigente()){ventana?.close();return;}
      const enlace=!r.error&&r.data&&enlaceContactoClase(r.data.tipo,r.data.valor,'Hola, vi tu perfil en GradeHub. ¿Me das más información?');
      if(!enlace)throw Error('sin contacto');
      registrarEventoDirectorio(p.id,'contacto',tenant);
      if(ventana&&!ventana.closed)ventana.location.href=enlace;
      else if(!(nativa&&typeof abrirFuera==='function'&&abrirFuera(enlace)))window.location.assign(enlace);
    }catch(e){ventana?.close();if(vigente())aviso.textContent='No pudimos abrir el contacto. Vuelve a intentarlo.';}
    finally{if(vigente())contacto.disabled=false;}
  });
  const titulo=perfil.querySelector('h2');titulo.setAttribute('tabindex','-1');titulo.focus({preventScroll:true});const hoja=raiz.closest('.modal-sheet');if(hoja)hoja.scrollTop=0;
}

// Recibos por evento como en anuncios. False es terminal: jamás se reintenta.
const eventosDirectorioPendientes=new Map();
async function registrarEventoDirectorio(perfil,tipo,tenant,{eventoId=nuevoEventoMetricaClase()}={}){
  if(!supabaseClient||!currentUser||!['vista','apertura','contacto'].includes(tipo))return false;
  const uid=currentUser.id,clave=uid+':'+eventoId;
  if(eventosDirectorioPendientes.has(clave))return eventosDirectorioPendientes.get(clave);
  const tarea=(async()=>{try{
    const r=await supabaseClient.rpc('registrar_evento_perfil',{p_perfil:perfil,p_tenant:tenant,p_tipo:tipo,p_evento_id:eventoId});
    if(currentUser?.id!==uid)return false;
    return r.error?null:r.data===true;
  }catch(e){return null;}finally{eventosDirectorioPendientes.delete(clave);}})();
  eventosDirectorioPendientes.set(clave,tarea);return tarea;
}
function crearObservadorDirectorio(){
  let observador=null,timers=new Map(),visibles=new Set();const medidas=new Set();
  const limpiar=()=>{observador?.disconnect();observador=null;timers.forEach(clearTimeout);timers.clear();visibles.clear();document.removeEventListener('visibilitychange',visibilidad);};
  let tenant,uid;
  const medir=card=>{const id=card.dataset.directorioPerfil;if(timers.has(id)||medidas.has(id)||document.visibilityState==='hidden')return;
    timers.set(id,setTimeout(()=>{timers.delete(id);if(card.isConnected&&visibles.has(card)&&document.visibilityState!=='hidden'&&currentUser?.id===uid&&document.getElementById('modal')?.classList.contains('open')){medidas.add(id);registrarEventoDirectorio(id,'vista',tenant);}},IMPRESION_MS));};
  const visibilidad=()=>{timers.forEach(clearTimeout);timers.clear();if(document.visibilityState!=='hidden')visibles.forEach(medir);};
  limpiar.observar=(raiz,t,u)=>{
    limpiar();tenant=t;uid=u;if(typeof IntersectionObserver!=='function')return;
    document.addEventListener('visibilitychange',visibilidad);
    observador=new IntersectionObserver(entradas=>entradas.forEach(e=>{
      const id=e.target.dataset.directorioPerfil;
      if(e.isIntersecting&&e.intersectionRatio>=IMPRESION_VISIBLE){visibles.add(e.target);medir(e.target);}
      else{visibles.delete(e.target);clearTimeout(timers.get(id));timers.delete(id);}
    }),{threshold:[IMPRESION_VISIBLE]});
    raiz.querySelectorAll('[data-directorio-perfil]').forEach(card=>observador.observe(card));
  };
  return limpiar;
}
function metricasDirectorioHTML(m){
  const num=v=>v==null?'—':new Intl.NumberFormat('es-CL').format(v);
  return `<section class="directorio-metricas"><h3>Tu perfil en el directorio</h3><dl>${[['vistas','Vistas'],['aperturas','Aperturas'],['contactos','Contactos']].map(([k,t])=>`<div><dt>${t}</dt><dd>${num(m[k])}</dd></div>`).join('')}</dl>${Object.values(m).some(v=>v===null)?'<p class="profesor-info">Cada cifra aparece desde 15 eventos medidos.</p>':''}</section>`;
}
async function mostrarMetricasDirectorio(caja){
  if(!caja||!supabaseClient||!currentUser)return;
  const uid=currentUser.id;
  try{const {data,error}=await supabaseClient.rpc('resumen_directorio_perfil');if(!error&&data&&caja.isConnected&&currentUser?.id===uid)caja.innerHTML=metricasDirectorioHTML(data);}catch(e){}
}
