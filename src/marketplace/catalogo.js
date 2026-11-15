
// ─── CATÁLOGO GENERAL PARA ESTUDIANTES ─────────────────────────────────────
//
// Esta puerta no es una recomendación: todos los estudiantes de la misma
// universidad reciben los mismos anuncios y el filtro trabaja sobre esa lista
// ya descargada. Los anuncios no leen ramos ni notas para ordenar resultados.
// Las siglas de un perfil de Apoyo sí se priorizan localmente por carrera (#1102).
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
  if(tenant==='uc'&&typeof NOMBRES_UC_SOLO_BUSCACURSOS!=='undefined')
    Object.entries(NOMBRES_UC_SOLO_BUSCACURSOS).forEach(([sigla,nombre])=>agregar(sigla,nombre));
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

// La tarjeta del directorio y «Ver perfil» de un anuncio abren la misma ficha.
// La caché queda acotada a la cuenta y universidad que pidió la proyección.
const perfilesDeAnuncio=new Map();
function perfilDeAnuncio(id){
  const uid=typeof currentUser==='undefined'?null:currentUser?.id,tenant=S.tenant,clave=[uid,tenant,id].join(':');
  if(!perfilesDeAnuncio.has(clave))perfilesDeAnuncio.set(clave,(async()=>{
    try{
      let r=uid?await supabaseClient.rpc('perfil_apoyo_de_anuncio',{p_anuncio_id:id,p_tenant:tenant}):await supabaseClient.rpc('perfil_publico_de_anuncio',{p_anuncio_id:id});
      if(r.error&&sqlClasesDesactualizado(r.error))r=await supabaseClient.rpc('perfil_publico_de_anuncio',{p_anuncio_id:id});
      if((typeof currentUser==='undefined'?null:currentUser?.id)!==uid||S.tenant!==tenant)return null;
      const p=r.error?null:(Array.isArray(r.data)?r.data[0]:r.data)||null;
      if(!p)perfilesDeAnuncio.delete(clave);
      return p;
    }catch(e){perfilesDeAnuncio.delete(clave);return null;}
  })());
  return perfilesDeAnuncio.get(clave);
}
function canalesPerfilApoyo(p){
  const canales=[];
  const agregar=(canal,tipo,valor,texto)=>{const enlace=enlaceContactoClase(tipo,valor,'Hola, vi tu perfil en GradeHub. ¿Me das más información?');
    if(enlace)canales.push({canal,texto,enlace});};
  if(p.contacto_tipo==='whatsapp')agregar('whatsapp','whatsapp',p.contacto_valor,'WhatsApp');
  if(p.contacto_tipo==='email')canales.push({canal:'email',texto:'Enviar correo',enlace:null});
  agregar('instagram','instagram',p.contacto_tipo==='instagram'?p.contacto_valor:p.instagram,'Instagram');
  agregar('web','enlace',p.sitio_web,'Sitio web');
  return canales;
}
// Iconos vectoriales locales: sin fuentes, imágenes o solicitudes a terceros.
function iconoCanalPerfil(canal){
  const trazos={
    whatsapp:'<path fill="currentColor" stroke="none" d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.16-.17.2-.35.22-.64.08-.3-.15-1.26-.46-2.39-1.48-.88-.79-1.48-1.76-1.65-2.06-.17-.3-.02-.46.13-.6.13-.14.3-.35.45-.52.15-.18.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.61-.91-2.2-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.21 3.07c.15.2 2.1 3.2 5.08 4.49.71.3 1.26.49 1.7.63.71.22 1.36.19 1.87.12.57-.09 1.76-.72 2-1.41.25-.7.25-1.29.18-1.41-.08-.13-.27-.2-.57-.35ZM12.05 21.79h-.01a9.87 9.87 0 0 1-5.03-1.38l-.36-.21-3.74.98 1-3.65-.24-.37a9.86 9.86 0 0 1-1.51-5.26c0-5.45 4.44-9.89 9.89-9.89 2.64 0 5.12 1.03 6.99 2.9a9.82 9.82 0 0 1 2.89 7c0 5.45-4.44 9.88-9.89 9.88Zm8.41-18.3A11.82 11.82 0 0 0 12.05 0C5.5 0 .16 5.34.16 11.89c0 2.1.55 4.14 1.59 5.95L.06 24l6.3-1.65a11.88 11.88 0 0 0 5.69 1.45h.01c6.55 0 11.89-5.34 11.89-11.9a11.82 11.82 0 0 0-3.49-8.41Z"/>',
    instagram:'<rect x="2.5" y="2.5" width="19" height="19" rx="5.5"/><circle cx="12" cy="12" r="4.2"/><circle cx="17.4" cy="6.6" r="1.2" fill="currentColor" stroke="none"/>',
    web:'<circle cx="12" cy="12" r="9.5"/><path d="M2.5 12h19M12 2.5c2.6 2.6 4 6 4 9.5s-1.4 6.9-4 9.5c-2.6-2.6-4-6-4-9.5s1.4-6.9 4-9.5Z"/>',
    email:'<rect x="2.5" y="4.5" width="19" height="15" rx="2.5"/><path d="m3 7 9 6.5L21 7"/>'
  };
  return `<svg class="perfil-contacto-icono" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${trazos[canal]||''}</svg>`;
}
// Ramos de un perfil (Lucas, 2026-11-11): arriba van las siglas, porque un
// «Cálculo I» de la UC no es el de la UAI; la lista entera, con nombre cuando
// GradeHub lo conoce, queda cerrada hasta abrirla. Solo la universidad de quien mira.
const MAX_RAMOS_PERFIL_VISIBLES=6;
// Nombres por universidad del perfil: catálogo y créditos (nombresRamosParaClases)
// más las pautas cargadas, que traen sigla y nombre (UAI, UDD, UAndes, FEN).
function nombresRamosPerfilPorUni(unis){
  const out={};
  for(const t of unis){
    const nombres={...nombresRamosParaClases(t)};
    const presets=typeof PRESETS_POR_TENANT!=='undefined'&&PRESETS_POR_TENANT[t];
    if(presets)Object.entries(presets).forEach(([nombre,def])=>{
      const sigla=def&&!Array.isArray(def)&&typeof def.sigla==='string'?siglaAnuncio(def.sigla):'';
      if(sigla&&!nombres[sigla])nombres[sigla]=nombre;
    });
    out[t]=nombres;
  }
  return out;
}
// Solo códigos: no lee S, no mira notas y no deduce equivalencias por nombre.
function ramosRelevantesParaVisor(siglas,{cursando=[],historial=[],malla=null}={}){
  const normalizar=s=>typeof s==='string'?s.toUpperCase().replace(/\s/g,''):'';
  const codigos=lista=>[...new Set((Array.isArray(lista)?lista:[]).map(x=>normalizar(typeof x==='string'?x:x?.sigla)).filter(Boolean))];
  const todas=codigos(siglas),respaldo=()=>({mias:todas,otras:[],criterio:'universidad'});
  if(!codigos(malla).length)return respaldo();
  const previos=(Array.isArray(historial)?historial:[]).flatMap(h=>Array.isArray(h?.ramos)?h.ramos:[h]);
  const conocidas=new Set(codigos([...(Array.isArray(cursando)?cursando:[]),...previos]));
  // Lo cursado va primero y la malla completa el resto: un ramo de su malla que
  // aún no toma también es de su carrera, nunca de «Otras carreras».
  const deMalla=new Set(codigos(malla));
  const cursadas=todas.filter(s=>conocidas.has(s));
  const mias=[...cursadas,...todas.filter(s=>!conocidas.has(s)&&deMalla.has(s))];
  if(!mias.length)return respaldo();
  const criterio=cursadas.length?'ramos':'malla';
  const elegidas=new Set(mias);
  return {mias,otras:todas.filter(s=>!elegidas.has(s)),criterio};
}
function perfilPropioApoyo(p){
  if(typeof currentUser==='undefined'||!currentUser?.id)return false;
  const propio=typeof perfilProfesorCache!=='undefined'&&perfilProfesorCache;
  return p.user_id===currentUser.id||!!(propio?.directorio_id&&(p.id||p.directorio_id)===propio.directorio_id);
}
// La malla guarda nombres. Se usan los códigos del catálogo ya disponible,
// nunca el nombre de otra sigla del perfil que coincida en «Cálculo I».
function contextoRamosVisorApoyo(){
  if(typeof S==='undefined'||!S.carrera||typeof mallaDeCarrera!=='function')return {};
  const malla=mallaDeCarrera(S.tenant,S.carrera);
  if(!malla)return {};
  const codigo=r=>r?.sigla||(typeof siglaDeRamo==='function'?siglaDeRamo(r,S.tenant):null);
  const deSuUniversidad=r=>!r?.origen?.tenant||r.origen.tenant===S.tenant;
  return {cursando:(S.ramos||[]).filter(deSuUniversidad).map(codigo),
    historial:(S.historial||[]).filter(h=>!h.tenant||h.tenant===S.tenant).map(h=>({ramos:(h.ramos||[]).filter(deSuUniversidad).map(codigo)})),
    malla:Object.values(malla).flat().map(nombre=>typeof nombre==='string'
      ?(S.tenant==='uc'&&typeof siglaUC==='function'?siglaUC(nombre,S.carrera):null)||codigo({nombre})
      :codigo(nombre)).filter(Boolean)};
}
async function cargarMallaVisorApoyo(){
  if(typeof S!=='undefined'&&S.carrera&&typeof mallaDeCarrera==='function'&&!mallaDeCarrera(S.tenant,S.carrera)&&typeof cargarMallasUC==='function')
    await cargarMallasUC(S.tenant).catch(()=>false); // Archivo público local; ninguna consulta de notas o perfiles.
}
// Misma selección para tarjeta y ficha. Primero conserva el límite por universidad
// de #1099; la vista previa y el dueño omiten ambos filtros.
function seleccionRamosPerfilApoyo(p,{previa=false,nombres=null,visor=typeof S!=='undefined'?S.tenant:null}={}){
  const siglas=[...new Set((p.ramos_siglas||[]).filter(s=>typeof s==='string').map(s=>s.toUpperCase().replace(/\s/g,'')))].filter(Boolean);
  const tenants=p.universidades||[],porUni=nombresRamosPerfilPorUni(tenants),propia=visor&&tenants.includes(visor);
  const nombresVisor=nombres||propia&&porUni[visor]||{};
  if(previa||perfilPropioApoyo(p))return {mias:siglas,otras:[],criterio:'propio'};
  // Con asociación declarada (#1105) manda la lista exacta de su universidad;
  // sin ella, el límite por siglas conocidas de #1099.
  const mapa=p.ramos_por_universidad&&typeof p.ramos_por_universidad==='object'&&!Array.isArray(p.ramos_por_universidad)?p.ramos_por_universidad:null;
  const visibles=mapa?[...new Set((mapa[visor]||[]).filter(s=>typeof s==='string').map(s=>s.toUpperCase().replace(/\s/g,'')))].filter(Boolean)
    :tenants.length>1&&propia?siglas.filter(s=>nombresVisor[s]):siglas;
  return ramosRelevantesParaVisor(visibles,contextoRamosVisorApoyo());
}
function ramosPerfilApoyoHTML(siglas,nombres,unis,tenants=[],visor=null,{previa=false,perfil={},porUniversidad=null}={}){
  if(!siglas.length)return unis.length?`<p class="profesor-info">${esc(unis.join(' · '))}</p>`:'';
  const porUni=nombresRamosPerfilPorUni(tenants),propia=visor&&tenants.includes(visor);
  const nombresVisor=propia?{...porUni[visor],...nombres}:nombres;
  const asociados=porUniversidad&&typeof porUniversidad==='object'&&!Array.isArray(porUniversidad);
  const {mias:visibles,otras,criterio}=seleccionRamosPerfilApoyo({...perfil,ramos_siglas:siglas,universidades:tenants,ramos_por_universidad:asociados?porUniversidad:null},{previa,nombres:nombresVisor,visor});
  if(!visibles.length)return asociados&&criterio!=='propio'?'<p class="profesor-info">No hay ramos asociados a tu universidad.</p>':'';
  const etiquetaUni=propia?(UNIVERSIDADES_PERFIL.find(([v])=>v===visor)||[])[1]:'';
  const nombreDe=s=>nombresVisor[s]||(!asociados&&tenants.map(t=>porUni[t][s]).find(Boolean))||'';
  const carrera=criterio==='ramos'||criterio==='malla';
  const resumen=`${visibles.length} ${visibles.length===1?'ramo':'ramos'}${carrera?' de tu carrera':etiquetaUni&&tenants.length>1?` en la ${etiquetaUni}`:unis.length&&tenants.length===1?` · ${unis.join(', ')}`:''}`;
  const fila=s=>`<li><strong>${esc(s)}</strong>${nombreDe(s)?`<span>${esc(nombreDe(s))}</span>`:''}</li>`;
  const mas=visibles.length>MAX_RAMOS_PERFIL_VISIBLES;
  const lista=asociados&&previa?tenants.filter(t=>(porUniversidad[t]||[]).length).map(t=>`<h4>${esc((UNIVERSIDADES_PERFIL.find(([v])=>v===t)||[])[1]||t)}</h4><ul class="perfil-apoyo-ramos">${porUniversidad[t].map(s=>`<li><strong>${esc(s)}</strong>${porUni[t]?.[s]?`<span>${esc(porUni[t][s])}</span>`:''}</li>`).join('')}</ul>`).join(''):`<ul class="perfil-apoyo-ramos">${visibles.map(fila).join('')}</ul>`;
  return `<section class="perfil-apoyo-seccion perfil-apoyo-ramos-caja"><h3>Ramos</h3><p class="perfil-apoyo-ramos-resumen">${esc(resumen)}</p>
    <ul class="perfil-apoyo-chips">${visibles.slice(0,MAX_RAMOS_PERFIL_VISIBLES).map(s=>`<li>${esc(s)}</li>`).join('')}${mas?`<li class="perfil-apoyo-chip-mas">+${visibles.length-MAX_RAMOS_PERFIL_VISIBLES}</li>`:''}</ul>
    <details class="perfil-apoyo-todos"><summary>Ver ${visibles.length===1?'el ramo':`los ${visibles.length} ramos`}</summary>${lista}${otras.length?`<details class="perfil-apoyo-otras"><summary>Otras carreras (${otras.length})</summary><ul class="perfil-apoyo-ramos">${otras.map(fila).join('')}</ul></details>`:''}</details></section>`;
}
function perfilPublicoHTML(p,anuncioId,nombres=nombresRamosParaClases(S.tenant),{previa=false}={}){
  const tipo=(TIPOS_PERFIL.find(([v])=>v===p.tipo_perfil)||[])[1]||'';
  const unis=(p.universidades||[]).map(t=>(UNIVERSIDADES_PERFIL.find(([v])=>v===t)||[])[1]).filter(Boolean);
  const otros=(p.anuncios||[]).filter(id=>id!==anuncioId).map(id=>catalogoClasesActual.find(a=>a.id===id)).filter(Boolean);
  const sinTitulo=(p.anuncios||[]).filter(id=>id!==anuncioId).length-otros.length;
  const canales=canalesPerfilApoyo(p);
  const color=typeof colorTarjetaDirectorio==='function'?colorTarjetaDirectorio(p.color_tarjeta):'#126b63';
  return `<div class="perfil-apoyo" style="--directorio-color:${color}"><header class="perfil-apoyo-identidad"><div><p class="perfil-apoyo-etiqueta">${esc(p.etiqueta||tipo)}</p><h2>${esc(p.nombre_publico)}</h2>${valoracionDirectorioHTML(p.calificacion)}</div>
      ${p.logo_path?`<div class="catalogo-clase-logo perfil-apoyo-logo" data-directorio-logo="${esc(p.logo_path)}" aria-hidden="true"></div>`:''}</header>
    <p class="perfil-publico-texto">${esc(p.presentacion||'')}</p>
    ${canales.length?`<div class="perfil-apoyo-contactos" aria-label="Contactar a ${esc(p.nombre_publico)}">${canales.map(c=>c.enlace?`<a class="clase-accion perfil-contacto-${c.canal}" href="${esc(c.enlace)}" target="_blank" rel="noopener noreferrer" data-perfil-canal="${c.canal}">${iconoCanalPerfil(c.canal)}<span>${c.texto}</span></a>`:`<button type="button" class="clase-accion perfil-contacto-${c.canal}" data-directorio-contactar data-perfil-canal="${c.canal}">${iconoCanalPerfil(c.canal)}<span>${c.texto}</span></button>`).join('')}</div>`:''}
    <p class="profesor-info" data-directorio-contacto-estado role="status"></p>
    ${ramosPerfilApoyoHTML(p.ramos_siglas||[],nombres,unis,(p.universidades||[]).filter(t=>UNIVERSIDADES_PERFIL.some(([v])=>v===t)),typeof S!=='undefined'?S.tenant:null,{previa,perfil:p,porUniversidad:p.ramos_por_universidad})}
    ${otros.length||sinTitulo>0?`<section class="perfil-publico-otros perfil-apoyo-seccion"><h3>Sus otras clases</h3><ul>${otros.map(a=>`<li><button type="button" data-ir-anuncio="${esc(a.id)}">${esc(a.titulo||'Clase particular')} · ${esc(a.ramos_siglas.join(', '))}</button></li>`).join('')}${sinTitulo>0?`<li>${otros.length?'Y ':''}${sinTitulo} ${sinTitulo===1?'clase publicada más':'clases publicadas más'}</li>`:''}</ul></section>`:''}</div>`;
}
async function mostrarPerfilEnClase(caja){
  if(caja.dataset.cargado)return;caja.dataset.cargado='1';
  const uid=typeof currentUser==='undefined'?null:currentUser?.id,tenant=S.tenant;
  const p=await perfilDeAnuncio(caja.dataset.perfil);
  await cargarMallaVisorApoyo();
  if(!p||!caja.isConnected||(typeof currentUser==='undefined'?null:currentUser?.id)!==uid||S.tenant!==tenant)return;
  caja.innerHTML=`<button type="button" class="catalogo-clase-ver perfil-publico-abrir" aria-haspopup="dialog">Ver perfil de ${esc(p.nombre_publico)}</button>`;
  const boton=caja.querySelector('.perfil-publico-abrir');
  boton.addEventListener('click',()=>{
    abrirPerfilApoyo(p,{raiz:document.getElementById('modal-content'),tenant,anuncioId:caja.dataset.perfil,
      volver:()=>boton.isConnected&&boton.focus({preventScroll:true})});
    if(typeof track==='function')track('perfil_profesor_abierto');
  });
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
    <header class="catalogo-clases-head"><div><p class="catalogo-ceja">APOYO</p><h1 class="modal-title" id="modal-titulo">Un poco de apoyo. Un gran avance.</h1><p class="catalogo-bajada">Encuentra una clase para ese ramo que necesita un empujón.</p></div><button type="button" class="settings-cerrar" onclick="closeModal()">Cerrar</button></header>
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
const impresionesCatalogoEnCurso=new Set();
const vistasPorCatalogo=new WeakMap();
function observarImpresionesClases(raiz,anuncios,busqueda=''){
  // Si la persona escribió algo, las tarjetas que ve son resultado de buscar.
  const canal=String(busqueda||'').trim()?'busqueda':'lista';
  if(limpiarVisibilidadCatalogo){limpiarVisibilidadCatalogo();limpiarVisibilidadCatalogo=null;}
  if(observadorCatalogo){observadorCatalogo.disconnect();observadorCatalogo=null;}
  if(typeof IntersectionObserver!=='function'||!raiz)return;
  const sigla=new Map((anuncios||[]).map(a=>[a.id,(a.ramos_siglas||[])[0]||'']));
  const eventos=eventosCatalogo;
  if(!vistasPorCatalogo.has(eventos))vistasPorCatalogo.set(eventos,new Set());
  const vistas=vistasPorCatalogo.get(eventos);
  const publicaciones=new Map((anuncios||[]).map(a=>[a.id,a.publicado_at]));
  const timers=new Map(),visibles=new Set(),tarjetas=new Map();
  const programar=(card,id,demora=IMPRESION_MS)=>{
    if(timers.has(id))return;
    timers.set(id,setTimeout(async()=>{
      timers.delete(id);
      const clave=id+':'+canal,claveEvento=claveMedicionClase(id);
      if(document.visibilityState==='hidden'||!card.isConnected||!visibles.has(id)||impresionesCatalogo.has(clave))return;
      if(!eventos.has(claveEvento))eventos.set(claveEvento,nuevoEventoMetricaClase());
      const eventoId=eventos.get(claveEvento),medidas=impresionesCatalogo;
      if(impresionesCatalogoEnCurso.has(eventoId))return;
      impresionesCatalogoEnCurso.add(eventoId);
      const usuario=currentUser&&currentUser.id;
      // El alcance conserva su RPC y su cobro. Un fallo no impide el total.
      const alcance=await registrarAlcanceAnuncio(id,canal);
      if(!currentUser||currentUser.id!==usuario||eventos!==eventosCatalogo){impresionesCatalogoEnCurso.delete(eventoId);return;}
      const metrica=vistas.has(claveEvento)?true:await registrarMetricaAnuncio(id,'impresion',sigla.get(id),
        {eventoId,publicacion:publicaciones.get(id),cobroConfirmado:alcance!==null});
      impresionesCatalogoEnCurso.delete(eventoId);
      if(alcance!==null&&metrica!==null)vistas.add(claveEvento);
      if(alcance===null||metrica===null){
        if(card.isConnected&&visibles.has(id))programar(card,id,5000);
        return;
      }
      medidas.add(clave);
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
  if(await abrirDirectorioClases())return;
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
async function registrarMetricaAnuncio(anuncioId,tipo,ramoSigla,{eventoId=nuevoEventoMetricaClase(),publicacion=null,cobroConfirmado=true}={}){
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
    // Compatibilidad: la RPC antigua depende de la fila cobrable confirmada.
    if(!cobroConfirmado)return null;
    const {data,error}=await supabaseClient.rpc('registrar_metrica_anuncio',payload);
    if(error)throw error;
    return data===true;
  }catch(error){console.warn('No se pudo registrar la métrica del anuncio:',error.message||error);return null;}
}

// La interacción cobrable conserva su RPC; el total es independiente de su resultado.
// Un reintento conserva su clave: una respuesta perdida no suma otro evento.
async function registrarInteraccionMedida(anuncioId,tipo,sigla,{reintentos=2,eventoId=nuevoEventoMetricaClase()}={}){
  const usuario=currentUser&&currentUser.id;
  const cargo=await registrarInteraccionAnuncio(anuncioId,tipo);
  if(!currentUser||currentUser.id!==usuario)return null;
  const metrica=await registrarMetricaAnuncio(anuncioId,tipo==='apertura'?'clic':'contacto',sigla,{eventoId,cobroConfirmado:cargo!==null});
  if((metrica===null||cargo===null&&tipo==='apertura')&&reintentos>0)setTimeout(()=>{
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
