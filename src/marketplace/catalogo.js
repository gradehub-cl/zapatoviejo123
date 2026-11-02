
// ─── CATÁLOGO GENERAL PARA ESTUDIANTES ─────────────────────────────────────
//
// Esta puerta no es una recomendación: todos los estudiantes de la misma
// universidad reciben los mismos anuncios y el filtro trabaja sobre esa lista
// ya descargada. No lee S.ramos ni una nota para ordenar o esconder resultados.
function normalizarBusquedaClase(texto){
  return String(texto||'').toLowerCase().normalize('NFD')
    .replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim();
}

function nombresRamosParaClases(tenant){
  const nombres={};
  const agregar=(sigla,nombre)=>{
    const codigo=siglaAnuncio(sigla),rotulo=String(nombre||'').trim();
    if(codigo&&rotulo&&!nombres[codigo])nombres[codigo]=rotulo;
  };
  // Créditos y cursos UC son fuentes ya cargadas por la app. No se deduce una
  // sigla desde el texto: si GradeHub no conoce el par, el aviso sigue siendo
  // encontrable por su código y por el texto que escribió el profesor.
  const creditos=typeof CREDITOS_POR_TENANT!=='undefined'&&CREDITOS_POR_TENANT[tenant];
  if(creditos)Object.entries(creditos).forEach(([nombre,fila])=>agregar(fila&&fila[1],nombre));
  if(tenant==='uc'&&typeof cursosUcDisponibles==='function')
    cursosUcDisponibles().forEach(fila=>{if(Array.isArray(fila))agregar(fila[0],fila[1]);});
  if(tenant==='uc'&&typeof SIGLAS_UC!=='undefined')
    Object.values(SIGLAS_UC).forEach(tabla=>Object.entries(tabla||{}).forEach(([nombre,sigla])=>agregar(sigla,nombre)));
  return nombres;
}

function prepararCatalogoClases(anuncios,busqueda,nombresPorSigla={}, {ahora=Date.now()}={}){
  const consulta=normalizarBusquedaClase(busqueda),tokens=consulta.split(' ').filter(Boolean);
  return (Array.isArray(anuncios)?anuncios:[]).filter(a=>{
    if(!a||a.estado!=='publicado')return false;
    if(a.vence_at!=null){const vence=Date.parse(a.vence_at);if(!Number.isFinite(vence)||vence<=ahora)return false;}
    const siglas=(Array.isArray(a.ramos_siglas)?a.ramos_siglas:[]).map(siglaAnuncio).filter(Boolean);
    const nombres=siglas.map(s=>nombresPorSigla[s]).filter(Boolean);
    const texto=normalizarBusquedaClase([a.titulo,a.descripcion,...siglas,...nombres].join(' '));
    return !tokens.length||tokens.every(t=>texto.includes(t));
  }).map(a=>{
    const siglas=(Array.isArray(a.ramos_siglas)?a.ramos_siglas:[]).map(siglaAnuncio).filter(Boolean);
    return {...a,ramos_siglas:siglas,nombres_ramos:siglas.map(s=>nombresPorSigla[s]).filter(Boolean)};
  }).sort((a,b)=>{
    const sa=(a.ramos_siglas.slice().sort()[0]||'ZZZ'),sb=(b.ramos_siglas.slice().sort()[0]||'ZZZ');
    if(sa!==sb)return sa<sb?-1:1;
    const va=a.vence_at?Date.parse(a.vence_at):Infinity,vb=b.vence_at?Date.parse(b.vence_at):Infinity;
    if(va!==vb)return va-vb;
    return String(a.titulo||'').localeCompare(String(b.titulo||''),'es');
  });
}

// Los datos de contacto vienen de contenido revisado, pero igual se construyen
// con lista blanca. Nunca se copia una URL arbitraria a href.
function enlaceContactoClase(tipo,valor,mensaje=''){
  const canal=String(tipo||''),dato=String(valor||'').trim();
  if(canal==='whatsapp'){
    const telefono=dato.replace(/\D/g,'');
    if(telefono.length<8||telefono.length>15)return '';
    const texto=String(mensaje||'').trim();
    return `https://wa.me/${telefono}`+(texto?`?text=${encodeURIComponent(texto)}`:'');
  }
  if(canal==='instagram'){
    const usuario=dato.replace(/^@/,'');
    return /^[A-Za-z0-9._]{1,30}$/.test(usuario)?`https://www.instagram.com/${usuario}/`:'';
  }
  // Un link de inscripción (Google Forms, por ejemplo): solo https, sin usuario
  // ni contraseña dentro, y se arma de nuevo con URL para no copiar a href un
  // texto que el navegador interprete de otra forma.
  if(canal==='enlace'){
    let u;try{u=new URL(dato);}catch(e){return '';}
    if(u.protocol!=='https:'||u.username||u.password||!u.hostname.includes('.')||u.href.length>160)return '';
    return u.href;
  }
  if(canal==='email'){
    const correo=dato.toLowerCase();
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo))return '';
    // El `@` NO se codifica: es el separador del destinatario y el RFC 6068 no
    // lo admite escapado. `encodeURIComponent` lo convertía en %40, y con eso
    // hay clientes de correo que no abren el mensaje o lo abren sin destino —
    // justo el enlace del que depende todo el marketplace.
    //
    // Lo demás sí se codifica: un `?` o un `&` en la dirección los leería el
    // cliente como el inicio de los encabezados del mailto (asunto, cuerpo,
    // copia oculta), no como parte del correo.
    return `mailto:${encodeURIComponent(correo).replace(/%40/g,'@')}`;
  }
  return '';
}

function textoOpcionClase(lista,valor,otra){
  return valor==='otra'?String(otra||'').trim():(new Map(lista).get(valor)||'');
}
function formatoClase(anuncio){
  const a=anuncio||{};
  return [textoOpcionClase(MODALIDADES_CLASE,a.modalidad,a.modalidad_otra),textoOpcionClase(UBICACIONES_CLASE,a.ubicacion,a.ubicacion_otra)]
    .filter(Boolean).join(' · ');
}
// Los detalles que el profesor agregó, ya validados por el servidor. Se vuelven
// a filtrar al mostrarlos: una fila rara no rompe la tarjeta.
function detallesClase(anuncio){
  const d=anuncio&&anuncio.detalles;
  return Array.isArray(d)?d.filter(x=>x&&typeof x.etiqueta==='string'&&typeof x.valor==='string'&&x.etiqueta.trim()&&x.valor.trim())
    .slice(0,MAX_DETALLES_CLASE):[];
}
// El precio de la clase como lo lee el estudiante: $0 es "Gratis".
function esClaseGratis(anuncio){
  return !!anuncio&&anuncio.precio_clp!==null&&anuncio.precio_clp!==''&&Number(anuncio.precio_clp)===0;
}
// Pack y descuento. El precio guardado es SIEMPRE por clase: el pack solo lo
// multiplica, y el descuento por venir de GradeHub lo fija GradeHub al aprobar
// (el profesor no puede escribirlo). Nada de esto toca la medición ni la tarifa.
function preciosClase(a){
  const base=Number(a&&a.precio_clp);
  if(esClaseGratis(a))return {gratis:true};
  if(!a||a.precio_clp===null||a.precio_clp===''||!Number.isFinite(base)||base<=0)return {gratis:false,porClase:null};
  const n=Number.isInteger(a.pack_clases)&&a.pack_clases>=MIN_PACK_CLASES&&a.pack_clases<=MAX_PACK_CLASES?a.pack_clases:null;
  const d=Number.isInteger(a.descuento_gradehub_pct)&&a.descuento_gradehub_pct>=1&&a.descuento_gradehub_pct<=50?a.descuento_gradehub_pct:null;
  const conDescuento=x=>d?Math.round(x*(100-d)/100):x;
  return {gratis:false,pack:n,descuento:d,codigo:d?codigoDescuentoClase(a):null,porClase:base,porClaseFinal:conDescuento(base),
    packTotal:n?base*n:null,packFinal:n?conDescuento(base*n):null};
}
// El código que acompaña al descuento (2026-10-25). Lo fija un admin; acá
// se vuelve a validar porque termina en el texto del anuncio y del WhatsApp.
function codigoDescuentoClase(a){
  const c=a&&typeof a.codigo_descuento==='string'?a.codigo_descuento.trim().toUpperCase():'';
  return /^[A-Z0-9][A-Z0-9_-]{2,19}$/.test(c)?c:null;
}
function textoDescuentoClase(p){
  return p.codigo?`−${p.descuento}% con el código ${p.codigo}`:`−${p.descuento}% por venir de GradeHub`;
}
// Corto, para la línea bajo el título: "4 clases · $11.250 c/u" o "$11.250".
// En un pack se lee el precio por clase y no el total (#664): en la primera
// campaña pagada, el pack de $45.000 casi no se abrió. El total sigue en la
// tarjeta del catálogo, con precioCatalogoHTML.
function precioClase(anuncio){
  const p=preciosClase(anuncio);
  if(p.gratis)return 'Gratis';
  if(p.porClase==null)return pesosClase(anuncio&&anuncio.precio_clp);
  return p.pack?`${p.pack} clases · ${pesosClase(p.porClaseFinal)} c/u`:pesosClase(p.porClaseFinal);
}
// El bloque de precio de la tarjeta. El precio anterior va tachado con texto
// oculto ("antes") para lectores de pantalla, y el descuento en el color de la
// marca: nunca en verde, que en GradeHub significa "aprobado".
function precioCatalogoHTML(a){
  const p=preciosClase(a);
  if(p.gratis)return '<strong>Gratis</strong>';
  if(p.porClase==null)return '';
  const antes=x=>p.descuento?`<del><span class="sr-precio">antes </span>${pesosClase(x)}</del> `:'';
  const chip=p.descuento?`<span class="catalogo-clase-descuento">${esc(textoDescuentoClase(p))}</span>`:'';
  // Un material se compra una vez: sin «por clase» ni pack.
  if(esMaterialClase(a))return `<div class="catalogo-clase-precio"><strong>${antes(p.porClase)}${pesosClase(p.porClaseFinal)}</strong>${chip}</div>`;
  if(p.pack)return `<div class="catalogo-clase-precio"><strong>${antes(p.packTotal)}${pesosClase(p.packFinal)} <small>pack de ${p.pack}</small></strong>${chip}<span class="catalogo-clase-por-clase">${antes(p.porClase)}${pesosClase(p.porClaseFinal)} por clase</span></div>`;
  return `<div class="catalogo-clase-precio"><strong>${antes(p.porClase)}${pesosClase(p.porClaseFinal)} <small>por clase</small></strong>${chip}</div>`;
}
function pesosClase(valor){
  // Nunca un precio negativo. El formulario ya exige entre 1.000 y 500.000, así
  // que un negativo solo puede venir de una fila corrupta o manipulada del
  // servidor — y ahí "$-500" en el catálogo es peor que no mostrar nada.
  const n=Number(valor);
  return new Intl.NumberFormat('es-CL',{style:'currency',currency:'CLP',maximumFractionDigits:0})
    .format(Number.isFinite(n)&&n>0?n:0);
}
// El chat parte escrito, para que el profesor sepa de qué anuncio viene. Nunca
// dice nada de las notas de quien escribe.
function mensajeContactoClase(anuncio){
  const titulo=String(anuncio&&anuncio.titulo||'').trim();
  const que=esMaterialClase(anuncio)?'tu material':'tu clase';
  // El código de descuento no va acá (Lucas, 2026-10-25): lo da el estudiante.
  return (titulo?`Hola, vi ${que} «${titulo}» en GradeHub.`:`Hola, vi ${que} en GradeHub.`)+' ¿Me puedes dar más información?';
}
function textoContactoClase(tipo,anuncio){
  if(tipo==='enlace'&&esMaterialClase(anuncio))return 'Conseguir el material';
  return {whatsapp:'Hablar por WhatsApp',instagram:'Ver Instagram',enlace:'Inscribirme',email:'Enviar correo'}[tipo]||'Contactar';
}

let catalogoClasesActual=[],nombresCatalogoClasesActual={};
// Una clase como la ve el estudiante. `sigla` es el ramo por el que se la
// mostramos, para que un contacto se mida en ese ramo.
// Cerrada muestra lo justo para decidir; "Ver clase" la abre (eso es una
// apertura) y recién ahí aparece el botón de WhatsApp (eso es un contacto).
function tarjetaCatalogoClase(a,{sigla,abierta=false}={}){
  const siglaMetrica=sigla||a.ramos_siglas[0]||'';
    const contacto=enlaceContactoClase(a.contacto_tipo,a.contacto_valor,mensajeContactoClase(a));
    const siglas=a.ramos_siglas.join(' · '),nombres=[...new Set((a.nombres_ramos||[]).map(nombreBaseRamoClase).filter(Boolean))].join(' · ');
    // El flyer va como tarjeta aparte, bajo el anuncio y entero: metido al lado
    // del texto se recortaba y en celular no se veía nada. Aparece al abrir la
    // clase, así el catálogo cerrado no se alarga.
    return `<div class="catalogo-clase-bloque"><article class="catalogo-clase-card" data-catalogo-anuncio="${esc(a.id)}">
      <div class="catalogo-clase-contenido">
        <div class="catalogo-clase-cabeza"><div><small>Publicidad · ${etiquetaTipoClase(a)}</small>
        <h3>${esc(a.titulo||etiquetaTipoClase(a))}</h3></div>${logosCatalogoClases.get(a.id)?`<div class="catalogo-clase-logo" data-logo="${esc(logosCatalogoClases.get(a.id))}"></div>`:''}</div>
        <p class="catalogo-clase-ramos"><strong>${esc(siglas)}</strong>${nombres?`<span>${esc(nombres)}</span>`:''}</p>
        <p class="catalogo-clase-descripcion">${esc(a.descripcion||'')}</p>
        <div class="catalogo-clase-datos"><span>${esc(formatoClase(a))}</span>${precioCatalogoHTML(a)}</div>
        ${abierta?'':`<button type="button" class="catalogo-clase-ver" data-abrir="${esc(a.id)}" data-sigla="${esc(siglaMetrica)}" aria-expanded="false">${esMaterialClase(a)?'Ver material':'Ver clase'}</button>`}
        <div class="catalogo-clase-mas"${abierta?'':' hidden'}>
        ${detallesClase(a).length?`<dl class="catalogo-clase-detalles">${detallesClase(a).map(d=>`<div><dt>${esc(d.etiqueta)}</dt><dd>${esc(d.valor)}</dd></div>`).join('')}</dl>`:''}
        ${contacto?`<a class="catalogo-clase-contacto" href="${esc(contacto)}" ${a.contacto_tipo==='email'?'':'target="_blank" rel="noopener noreferrer"'} data-contactar="${esc(a.id)}" data-sigla="${esc(siglaMetrica)}">${esc(textoContactoClase(a.contacto_tipo,a))}</a>`
          :'<p class="catalogo-clase-sin-contacto">El contacto de esta clase necesita revisión.</p>'}
        <div class="catalogo-clase-perfil" data-perfil="${esc(a.id)}"></div>
        </div>
      </div>
    </article>${a.flyer_path?`<figure class="catalogo-clase-flyer" data-flyer="${esc(a.flyer_path)}"${abierta?'':' hidden'}><span>Cargando flyer…</span></figure>`:''}</div>`;
}

// «Ver perfil» en una clase abierta. Solo existe si el profesor activó su
// perfil; si no, o si falla, la tarjeta queda igual que antes. Se despliega en
// la misma tarjeta: un modal encima reemplazaría el catálogo.
const perfilesDeAnuncio=new Map();
function perfilDeAnuncio(id){
  if(!perfilesDeAnuncio.has(id))perfilesDeAnuncio.set(id,(async()=>{
    try{
      const {data,error}=await supabaseClient.rpc('perfil_publico_de_anuncio',{p_anuncio_id:id});
      return error?null:(Array.isArray(data)?data[0]:data)||null;
    }catch(e){return null;}
  })());
  return perfilesDeAnuncio.get(id);
}
function perfilPublicoHTML(p,anuncioId){
  const tipo=(TIPOS_PERFIL.find(([v])=>v===p.tipo_perfil)||[])[1]||'';
  const unis=(p.universidades||[]).map(t=>(UNIVERSIDADES_PERFIL.find(([v])=>v===t)||[])[1]).filter(Boolean);
  const insta=enlaceContactoClase('instagram',p.instagram),web=enlaceContactoClase('enlace',p.sitio_web);
  const otros=(p.anuncios||[]).filter(id=>id!==anuncioId).map(id=>catalogoClasesActual.find(a=>a.id===id)).filter(Boolean);
  const sinTitulo=(p.anuncios||[]).filter(id=>id!==anuncioId).length-otros.length;
  return `<div class="perfil-publico-cabeza">${p.logo_path?`<div class="catalogo-clase-logo" data-logo="${esc(p.logo_path)}"></div>`:''}
      <div><h4>${esc(p.nombre_publico)}</h4>${tipo?`<span>${esc(tipo)}</span>`:''}</div></div>
    <p class="perfil-publico-texto">${esc(p.presentacion||'')}</p>
    ${unis.length||(p.ramos_siglas||[]).length?`<dl class="catalogo-clase-detalles">${unis.length?`<div><dt>Universidades</dt><dd>${esc(unis.join(', '))}</dd></div>`:''}${(p.ramos_siglas||[]).length?`<div><dt>Ramos</dt><dd>${esc(p.ramos_siglas.join(', '))}</dd></div>`:''}</dl>`:''}
    ${insta||web?`<p class="perfil-publico-links">${insta?`<a href="${esc(insta)}" target="_blank" rel="noopener noreferrer" data-fuera>Instagram</a>`:''}${web?`<a href="${esc(web)}" target="_blank" rel="noopener noreferrer" data-fuera>Sitio web</a>`:''}</p>`:''}
    ${otros.length||sinTitulo>0?`<div class="perfil-publico-otros"><strong>Sus otras clases</strong><ul>${otros.map(a=>`<li><button type="button" data-ir-anuncio="${esc(a.id)}">${esc(a.titulo||'Clase particular')} · ${esc(a.ramos_siglas.join(', '))}</button></li>`).join('')}${sinTitulo>0?`<li>${otros.length?'Y ':''}${sinTitulo} ${sinTitulo===1?'clase publicada más':'clases publicadas más'}</li>`:''}</ul></div>`:''}`;
}
async function mostrarPerfilEnClase(caja){
  if(caja.dataset.cargado)return;caja.dataset.cargado='1';
  const p=await perfilDeAnuncio(caja.dataset.perfil);
  if(!p||!caja.isConnected)return;
  caja.innerHTML=`<button type="button" class="catalogo-clase-ver perfil-publico-abrir" aria-expanded="false">Ver perfil de ${esc(p.nombre_publico)}</button>
    <section class="perfil-publico" aria-label="Perfil de ${esc(p.nombre_publico)}" hidden>${perfilPublicoHTML(p,caja.dataset.perfil)}</section>`;
  const boton=caja.querySelector('.perfil-publico-abrir'),seccion=caja.querySelector('.perfil-publico');
  boton.addEventListener('click',()=>{
    const abrir=seccion.hidden;seccion.hidden=!abrir;boton.setAttribute('aria-expanded',String(abrir));
    boton.textContent=abrir?'Ocultar perfil':'Ver perfil de '+p.nombre_publico;
    if(abrir&&typeof track==='function')track('perfil_profesor_abierto');
  });
  seccion.querySelectorAll('[data-logo]').forEach(async c=>{const url=await urlFlyerClase(c.dataset.logo);if(!c.isConnected)return;if(url)c.innerHTML=imgLogoClase(url,' loading="lazy"');else c.remove();});
  seccion.querySelectorAll('[data-fuera]').forEach(a=>a.addEventListener('click',e=>{
    if(typeof enAppNativa==='function'&&enAppNativa()&&abrirFuera(a.href))e.preventDefault();
  }));
  seccion.querySelectorAll('[data-ir-anuncio]').forEach(b=>b.addEventListener('click',()=>{
    const destino=document.querySelector(`[data-catalogo-anuncio="${CSS.escape(b.dataset.irAnuncio)}"]`);
    if(destino){destino.scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
      const ver=destino.querySelector('[data-abrir]');(ver||destino).focus&&(ver||destino).focus({preventScroll:true});}
  }));
}

// Filtros locales sobre el catálogo público; no modifican campañas ni medición.
function filtrarPrecioCatalogoClases(anuncios,{desde='',hasta='',gratis=false,ubicacion='',tipo='',invalido=false}={}){
  const minimo=desde===''?0:Number(desde),maximo=hasta===''?Infinity:Number(hasta);
  const error=!gratis&&(invalido||!Number.isSafeInteger(minimo)||minimo<0||
    !(maximo===Infinity||Number.isSafeInteger(maximo))||maximo<minimo);
  return {error,anuncios:error?[]:anuncios.filter(a=>{
    // Clase o material (2026-10-23). Un anuncio sin tipo es una clase.
    if(tipo&&(esMaterialClase(a)?'material':'clase')!==tipo)return false;
    // Una clase híbrida se dicta online y presencial: calza con los dos filtros.
    if(ubicacion&&a.ubicacion!==ubicacion&&a.ubicacion!=='hibrido')return false;
    if(gratis)return esClaseGratis(a);
    if(desde===''&&hasta==='')return true;
    // Se filtra por lo que paga el estudiante por clase, con el descuento aplicado.
    const precio=Number(preciosClase(a).porClaseFinal??a.precio_clp);
    return a.precio_clp!=null&&a.precio_clp!==''&&Number.isFinite(precio)&&precio>=minimo&&precio<=maximo;
  })};
}
function filtrosCatalogoClases(){
  const desde=document.getElementById('catalogo-desde'),hasta=document.getElementById('catalogo-hasta');
  return {desde:desde.value,hasta:hasta.value,gratis:document.getElementById('catalogo-gratis').checked,
    ubicacion:document.getElementById('catalogo-ubicacion').value,tipo:(document.getElementById('catalogo-tipo')||{}).value||'',
    invalido:desde.validity.badInput||hasta.validity.badInput};
}
function cabeceraCatalogoClasesHTML(){
  return `<div class="catalogo-clases catalogo-redisenado">
    <header class="catalogo-clases-head"><div><p class="catalogo-ceja">CLASES PARTICULARES</p><h1 class="modal-title" id="modal-titulo">Un poco de apoyo. Un gran avance.</h1><p class="catalogo-bajada">Encuentra una clase para ese ramo que necesita un empujón.</p></div><button type="button" class="settings-cerrar" onclick="closeModal()">Cerrar</button></header>
    <div class="catalogo-herramientas"><div class="catalogo-buscador"><label for="catalogo-clases-buscar">Buscar clases</label>
    <div class="catalogo-clases-busqueda"><input id="catalogo-clases-buscar" type="search" autocomplete="off" placeholder="Busca por ramo o sigla" aria-describedby="catalogo-clases-estado"></div></div>
    <label class="catalogo-filtro">Qué buscas<select id="catalogo-tipo"><option value="">Todo</option>${TIPOS_ANUNCIO.map(([v,t])=>`<option value="${v}">${t}</option>`).join('')}</select></label>
    <label class="catalogo-filtro">Modalidad<select id="catalogo-ubicacion"><option value="">Todas</option><option value="online">Online</option><option value="presencial">Presencial</option></select></label>
    <div class="catalogo-precios" role="group" aria-label="Precio por clase en pesos">
      <label class="catalogo-filtro">Desde $<input id="catalogo-desde" type="number" min="0" step="1" inputmode="numeric" placeholder="Sin mínimo" aria-describedby="catalogo-precio-error"></label>
      <label class="catalogo-filtro">Hasta $<input id="catalogo-hasta" type="number" min="0" step="1" inputmode="numeric" placeholder="Sin máximo" aria-describedby="catalogo-precio-error"></label>
      <label class="catalogo-gratis"><input id="catalogo-gratis" type="checkbox">Solo gratis</label>
      <p id="catalogo-precio-error" role="status"></p>
    </div></div>
    <div class="catalogo-lista-cabeza"><h2>Clases en tu universidad</h2><button type="button" id="catalogo-limpiar">Limpiar filtros</button></div>
    <p class="catalogo-clases-estado" id="catalogo-clases-estado" role="status" aria-live="polite">Buscando clases publicadas…</p>
    <div class="catalogo-clases-resultados" id="catalogo-clases-resultados" aria-busy="true"></div>
    <p class="catalogo-privacidad">El catálogo no usa tus notas. Tú eliges qué clase explorar y a quién contactar.</p>
  </div>`;
}
let estadoCargaCatalogo='listo';
function renderCatalogoClases(busqueda=''){
  const raiz=document.getElementById('catalogo-clases-resultados');
  if(!raiz)return;
  const filtros=filtrosCatalogoClases();
  const {anuncios,error}=filtrarPrecioCatalogoClases(prepararCatalogoClases(catalogoClasesActual,busqueda,nombresCatalogoClasesActual),filtros);
  document.getElementById('catalogo-precio-error').textContent=error?'Escribe montos válidos; Hasta debe ser igual o mayor que Desde.':'';
  ['catalogo-desde','catalogo-hasta'].forEach(id=>{const campo=document.getElementById(id);campo.disabled=filtros.gratis;campo.setAttribute('aria-invalid',String(error));});
  const estado=document.getElementById('catalogo-clases-estado');
  if(estadoCargaCatalogo!=='listo'){
    estado.textContent=estadoCargaCatalogo==='cargando'?'Buscando clases publicadas…':'No pudimos cargar las clases. Revisa tu conexión e inténtalo de nuevo.';
    raiz.innerHTML=estadoCargaCatalogo==='error'?'<button type="button" class="catalogo-reintentar">Reintentar</button>':'';
    const reintentar=raiz.querySelector('.catalogo-reintentar');if(reintentar)reintentar.addEventListener('click',openCatalogoClases);
    return;
  }
  if(estado)estado.textContent=anuncios.length
    ?`${anuncios.length} ${(filtros.tipo==='material'?['material encontrado','materiales encontrados']
      :anuncios.some(esMaterialClase)?['resultado','resultados']:['clase encontrada','clases encontradas'])[anuncios.length===1?0:1]}`
    :(busqueda||filtros.desde||filtros.hasta||filtros.gratis||filtros.ubicacion||filtros.tipo?'No encontramos nada con esos filtros. Prueba ampliarlos.':'Todavía no hay clases publicadas en tu universidad.');
  raiz.innerHTML=anuncios.map(a=>tarjetaCatalogoClase(a)).join('');
  activarTarjetasClases(raiz);
  observarImpresionesClases(raiz,anuncios,busqueda);
}

// Contacto medido e imágenes firmadas de las tarjetas dentro de `raiz`. La
// usan el catálogo y la clase abierta desde la recomendación de Inicio.
function activarTarjetasClases(raiz){
  raiz.querySelectorAll('[data-contactar]').forEach(link=>link.addEventListener('click',async e=>{
    e.preventDefault();
    if(link.dataset.contactando==='true')return;
    link.dataset.contactando='true';link.setAttribute('aria-busy','true');
    // Abrir una pestaña vacía dentro del gesto del usuario evita el bloqueo
    // del navegador después del await. La cerramos si no se confirmó el cobro.
    // En la app iOS no hay pestaña que abrir: se abre al final con abrirFuera.
    const nativa=typeof enAppNativa==='function'&&enAppNativa();
    const ventana=!nativa&&link.target==='_blank'&&typeof window!=='undefined'&&typeof window.open==='function'
      ?window.open('about:blank','_blank'):null;
    if(ventana)ventana.opener=null;
    const cargo=await registrarInteraccionMedida(link.dataset.contactar,'contacto',link.dataset.sigla);
    link.dataset.contactando='false';link.removeAttribute('aria-busy');
    if(cargo===null){
      if(ventana&&!ventana.closed)ventana.close();
      showToast('No pudimos registrar el contacto. Revisa tu conexión e intenta de nuevo.',true);
      return;
    }
    if(ventana&&!ventana.closed)ventana.location.href=link.href;
    else if(!(nativa&&abrirFuera(link.href))&&typeof window!=='undefined')window.location.assign(link.href);
  }));
  raiz.querySelectorAll('[data-abrir]').forEach(boton=>boton.addEventListener('click',()=>{
    const tarjeta=boton.closest('.catalogo-clase-card'),mas=tarjeta&&tarjeta.querySelector('.catalogo-clase-mas');
    if(!mas)return;
    mas.hidden=false;boton.remove();
    const bloque=tarjeta.closest('.catalogo-clase-bloque'),flyer=bloque&&bloque.querySelector('.catalogo-clase-flyer');
    if(flyer)flyer.hidden=false;
    registrarInteraccionMedida(boton.dataset.abrir,'apertura',boton.dataset.sigla);
    const contacto=mas.querySelector('.catalogo-clase-contacto');if(contacto)contacto.focus();
    const perfil=mas.querySelector('[data-perfil]');if(perfil)mostrarPerfilEnClase(perfil);
  }));
  raiz.querySelectorAll('.catalogo-clase-mas:not([hidden]) [data-perfil]').forEach(mostrarPerfilEnClase);
  raiz.querySelectorAll('[data-logo]').forEach(async caja=>{
    const url=await urlFlyerClase(caja.dataset.logo);
    if(!caja.isConnected)return;
    if(url)caja.innerHTML=imgLogoClase(url,' loading="lazy"');else caja.remove();
  });
  raiz.querySelectorAll('[data-flyer]').forEach(async caja=>{
    const url=await urlFlyerClase(caja.dataset.flyer);
    if(!caja.isConnected)return;
    caja.innerHTML=url?`<img src="${esc(url)}" alt="" loading="lazy">`:'';
    if(!url)caja.remove();
  });
}

// Una impresión es una tarjeta que se VIO: al menos la mitad en pantalla
// durante un segundo, como dice docs/marketplace-clases.md. Pintarla fuera de
// la vista no cuenta. Se registra una vez por anuncio mientras el catálogo
// está abierto: buscar y volver a pintar no la suma de nuevo.
//
// El alcance por cuenta se conserva para el cobro; los eventos repetidos
// van por separado, con una clave que se reutiliza si falla la respuesta.
const IMPRESION_VISIBLE=0.5,IMPRESION_MS=1000;
let impresionesCatalogo=new Set(),observadorCatalogo=null,logosCatalogoClases=new Map(),limpiarVisibilidadCatalogo=null;
let eventosCatalogo=new Map();
function observarImpresionesClases(raiz,anuncios,busqueda=''){
  // Si la persona escribió algo, las tarjetas que ve son resultado de buscar.
  const canal=String(busqueda||'').trim()?'busqueda':'lista';
  if(limpiarVisibilidadCatalogo){limpiarVisibilidadCatalogo();limpiarVisibilidadCatalogo=null;}
  if(observadorCatalogo){observadorCatalogo.disconnect();observadorCatalogo=null;}
  if(typeof IntersectionObserver!=='function'||!raiz)return;
  const sigla=new Map((anuncios||[]).map(a=>[a.id,(a.ramos_siglas||[])[0]||'']));
  const eventos=eventosCatalogo;
  const timers=new Map(),visibles=new Set(),tarjetas=new Map();
  const programar=(card,id,demora=IMPRESION_MS)=>{
    if(timers.has(id))return;
    timers.set(id,setTimeout(async()=>{
      timers.delete(id);
      const clave=id+':'+canal;
      if(document.visibilityState==='hidden'||!card.isConnected||!visibles.has(id)||impresionesCatalogo.has(clave))return;
      const usuario=currentUser&&currentUser.id;
      const alcance=await registrarAlcanceAnuncio(id,canal);
      if(!currentUser||currentUser.id!==usuario||eventos!==eventosCatalogo)return;
      if(alcance===null){
        if(card.isConnected&&visibles.has(id))programar(card,id,5000);
        return;
      }
      if(!eventosCatalogo.has(clave))eventosCatalogo.set(clave,nuevoEventoMetricaClase());
      const metrica=await registrarMetricaAnuncio(id,'impresion',sigla.get(id),{eventoId:eventosCatalogo.get(clave)});
      if(metrica===null){
        if(card.isConnected&&visibles.has(id))programar(card,id,5000);
        return;
      }
      impresionesCatalogo.add(clave);
    },demora));
  };
  observadorCatalogo=new IntersectionObserver(entradas=>{
    for(const e of entradas){
      const id=e.target.dataset.catalogoAnuncio;
      if(!id)continue;
      if(e.isIntersecting&&e.intersectionRatio>=IMPRESION_VISIBLE){
        visibles.add(id);
        if(document.visibilityState!=='hidden'&&!impresionesCatalogo.has(id+':'+canal))programar(e.target,id);
      }else{
        visibles.delete(id);
        if(timers.has(id)){clearTimeout(timers.get(id));timers.delete(id);}
      }
    }
  },{threshold:[IMPRESION_VISIBLE]});
  const alCambiarVisibilidad=()=>{
    timers.forEach(clearTimeout);timers.clear();
    if(document.visibilityState==='hidden')return;
    visibles.forEach(id=>{const card=tarjetas.get(id);if(card&&card.isConnected&&!impresionesCatalogo.has(id+':'+canal))programar(card,id);});
  };
  if(document.addEventListener)document.addEventListener('visibilitychange',alCambiarVisibilidad);
  limpiarVisibilidadCatalogo=()=>{
    timers.forEach(clearTimeout);timers.clear();
    if(document.removeEventListener)document.removeEventListener('visibilitychange',alCambiarVisibilidad);
  };
  raiz.querySelectorAll('[data-catalogo-anuncio]').forEach(card=>{tarjetas.set(card.dataset.catalogoAnuncio,card);observadorCatalogo.observe(card);});
}

async function openCatalogoClases(){
  impresionesCatalogo=new Set();
  eventosCatalogo=new Map();
  const raiz=document.getElementById('modal-content');
  if(!raiz)return;
  estadoCargaCatalogo='cargando';catalogoClasesActual=[];nombresCatalogoClasesActual={};logosCatalogoClases=new Map();
  raiz.innerHTML=cabeceraCatalogoClasesHTML();
  openModal();
  const input=raiz.querySelector('#catalogo-clases-buscar');
  const sigueAbierto=()=>input.isConnected&&document.getElementById('catalogo-clases-buscar')===input&&
    document.getElementById('modal').classList.contains('open');
  input.addEventListener('input',()=>renderCatalogoClases(input.value));
  ['catalogo-desde','catalogo-hasta'].forEach(id=>raiz.querySelector('#'+id).addEventListener('input',()=>renderCatalogoClases(input.value)));
  ['catalogo-gratis','catalogo-ubicacion','catalogo-tipo'].forEach(id=>{const el=raiz.querySelector('#'+id);if(el)el.addEventListener('change',()=>renderCatalogoClases(input.value));});
  raiz.querySelector('#catalogo-limpiar').addEventListener('click',()=>{
    ['catalogo-desde','catalogo-hasta','catalogo-ubicacion','catalogo-tipo'].forEach(id=>{const el=raiz.querySelector('#'+id);if(el)el.value='';});
    raiz.querySelector('#catalogo-gratis').checked=false;input.value='';renderCatalogoClases();input.focus();
  });
  const tenant=S.tenant;
  // En UC los nombres del catálogo completo llegan diferidos. Los avisos y sus
  // siglas aparecen al tiro; cuando carga el archivo, se enriquece la búsqueda
  // por nombre sin volver a pedir anuncios ni tocar datos académicos.
  if(tenant==='uc'&&typeof cargarCursosUC==='function'&&typeof cursosUcExtra==='function'&&!cursosUcExtra())
    cargarCursosUC().then(ok=>{if(ok&&sigueAbierto()){nombresCatalogoClasesActual=nombresRamosParaClases(tenant);renderCatalogoClases(input.value);}}).catch(()=>{});
  let anuncios;
  try{anuncios=await cargarAnunciosClases(tenant,{propagarError:true});}
  catch(error){
    if(!sigueAbierto())return;
    estadoCargaCatalogo='error';raiz.querySelector('#catalogo-clases-resultados').setAttribute('aria-busy','false');renderCatalogoClases(input.value);return;
  }
  if(!sigueAbierto())return;
  catalogoClasesActual=anuncios;
  const logos=await logosDeAnuncios(anuncios.map(a=>a.id));
  if(!sigueAbierto())return;
  logosCatalogoClases=logos;estadoCargaCatalogo='listo';
  nombresCatalogoClasesActual=nombresRamosParaClases(tenant);
  const resultados=raiz.querySelector('#catalogo-clases-resultados');if(resultados)resultados.setAttribute('aria-busy','false');
  renderCatalogoClases(input.value);
  input.focus();
}

function payloadMetricaAnuncio(anuncioId,tipo,ramoSigla){
  const evento=String(tipo||'');
  const sigla=siglaAnuncio(ramoSigla);
  if(!METRICAS_ANUNCIO.has(evento)||!anuncioId||!sigla)return null;
  // Lista blanca deliberada. No se agrega user_id, ramos, notas ni device id:
  // auth.uid() autoriza dentro de la RPC y se descarta antes de escribir.
  return {p_anuncio_id:anuncioId,p_tipo:evento,p_ramo_sigla:sigla};
}

// Abrió la clase o tocó contactar: una vez por persona y anuncio, lo cuenta el
// servidor con la cuenta de la sesión. El Set solo ahorra llamadas repetidas.
const INTERACCION_REGISTRADA=new Set();
const INTERACCION_EN_CURSO=new Map();
function claveMedicionClase(anuncioId){
  const anuncio=catalogoClasesActual.find(a=>a.id===anuncioId)||
    (anunciosRecomendacion.lista||[]).find(a=>a.id===anuncioId);
  return (currentUser&&currentUser.id||'')+':'+anuncioId+':'+(anuncio&&anuncio.publicado_at||'');
}
async function registrarInteraccionAnuncio(anuncioId,tipo){
  const clave=claveMedicionClase(anuncioId)+':'+tipo;
  if(!supabaseClient||!currentUser||!anuncioId||!['apertura','contacto'].includes(tipo))return null;
  if(INTERACCION_REGISTRADA.has(clave))return false;
  if(INTERACCION_EN_CURSO.has(clave))return INTERACCION_EN_CURSO.get(clave);
  const pendiente=(async()=>{
    try{
      const {data,error}=await supabaseClient.rpc('registrar_interaccion_anuncio',{p_anuncio_id:anuncioId,p_tipo:tipo});
      if(error)throw error;
      INTERACCION_REGISTRADA.add(clave);
      return data===true;
    }catch(error){console.warn('No se pudo registrar la interacción:',error.message||error);return null;}
    finally{INTERACCION_EN_CURSO.delete(clave);}
  })();
  INTERACCION_EN_CURSO.set(clave,pendiente);
  return pendiente;
}
function nuevoEventoMetricaClase(){
  if(typeof globalThis.crypto?.randomUUID==='function')return globalThis.crypto.randomUUID();
  // Clave de idempotencia por evento, no un identificador de persona/dispositivo.
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,c=>{
    const n=Math.floor(Math.random()*16);return (c==='x'?n:(n&3)|8).toString(16);
  });
}
let eventosAnuncioDisponibles=true;
async function registrarMetricaAnuncio(anuncioId,tipo,ramoSigla,{eventoId=nuevoEventoMetricaClase(),publicacion=null}={}){
  const payload=payloadMetricaAnuncio(anuncioId,tipo,ramoSigla);
  if(!supabaseClient||!currentUser||!payload)return false;
  try{
    const anuncio=catalogoClasesActual.find(a=>a.id===anuncioId)||(anunciosRecomendacion.lista||[]).find(a=>a.id===anuncioId);
    publicacion=publicacion||anuncio?.publicado_at;
    if(eventosAnuncioDisponibles&&publicacion){
      const r=await supabaseClient.rpc('registrar_evento_anuncio',{...payload,p_evento_id:eventoId,p_publicacion:publicacion});
      if(!r.error)return r.data===true;
      if(!sqlClasesDesactualizado(r.error))throw r.error;
      eventosAnuncioDisponibles=false; // Sin SQL: conserva la medición anterior.
    }
    const {data,error}=await supabaseClient.rpc('registrar_metrica_anuncio',payload);
    if(error)throw error;
    return data===true;
  }catch(error){console.warn('No se pudo registrar la métrica del anuncio:',error.message||error);return null;}
}

// La repetición se registra después de confirmar la interacción única.
// Un reintento conserva su clave: una respuesta perdida no suma otro evento.
async function registrarInteraccionMedida(anuncioId,tipo,sigla,{reintentos=2,eventoId=nuevoEventoMetricaClase()}={}){
  const usuario=currentUser&&currentUser.id;
  const cargo=await registrarInteraccionAnuncio(anuncioId,tipo);
  if(!currentUser||currentUser.id!==usuario)return null;
  if(cargo===null){
    // La apertura ya ocurrió en pantalla y su botón desapareció: reintentarla
    // sin pedir otro clic. Contacto sí requiere un nuevo gesto para navegar.
    if(tipo==='apertura'&&reintentos>0)setTimeout(()=>{
      if(currentUser&&currentUser.id===usuario)registrarInteraccionMedida(anuncioId,tipo,sigla,{reintentos:reintentos-1,eventoId});
    },5000);
    return null;
  }
  const metrica=await registrarMetricaAnuncio(anuncioId,tipo==='apertura'?'clic':'contacto',sigla,{eventoId});
  if(metrica===null&&reintentos>0)setTimeout(()=>{
    if(currentUser&&currentUser.id===usuario)registrarInteraccionMedida(anuncioId,tipo,sigla,{reintentos:reintentos-1,eventoId});
  },5000);
  return cargo;
}

// La RPC aplica el mínimo de quince EVENTOS en el servidor. Esta función no
// replica ni relaja el umbral: si no hay filas, simplemente no hay un corte
// seguro para mostrar todavía.
async function resumenMetricasAnuncio(anuncioId){
  if(!supabaseClient||!currentUser||!anuncioId)return [];
  const {data,error}=await supabaseClient.rpc('resumen_metricas_anuncio',{p_anuncio_id:anuncioId});
  if(error){console.warn('No se pudieron cargar las métricas del anuncio:',error.message||error);return [];}
  return Array.isArray(data)?data:[];
}
