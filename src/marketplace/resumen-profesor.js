const VISTAS_ANUNCIOS_PROFESOR=[['activas','Activas'],['revision','En revisión'],['historial','Historial']];
const ESTADOS_FILTRO_PROFESOR=[
  ['', 'Todos'],['publicado','Activas','activas'],['programado','Programadas','activas'],
  ['en_revision','En revisión','revision'],['borrador','Borradores','revision'],
  ['pausado','Pausadas','historial'],['expirado','Terminadas','historial'],['agotado','Tope alcanzado','historial'],
];
const filtrosAnunciosProfesor=new WeakMap();

function filasAnunciosProfesor(g,ahora){
  const filas=[];
  for(const [lista,vista] of [[g.activos,'activas'],[g.programados,'activas'],[g.revision,'revision'],
    [g.borradores,'revision'],[g.cerrados,'historial'],[g.sinConfirmar,'historial']]){
    for(const a of lista){
      const cambios=['publicado','pausado'].includes(a.estado)&&['pendiente','rechazada'].includes(a.edicion_propia?.estado);
      filas.push({a,vista,cambios,estado:vigenciaAnuncio(a,ahora),
        texto:normalizarBusquedaClase([a.titulo,...(a.ramos_siglas||[])].join(' '))});
    }
  }
  return filas;
}
function anuncioProfesorEnVista(f,vista){
  return f.vista===vista||(vista==='revision'&&f.cambios);
}
function listaAnunciosProfesorHTML(filas,pesos,ahora,filtro,compras){
  const segmentos=VISTAS_ANUNCIOS_PROFESOR.map(([vista,titulo])=>`<button type="button" data-profesor-seccion="${vista}" aria-pressed="${vista===filtro.vista}">${titulo}</button>`).join('');
  const estados=ESTADOS_FILTRO_PROFESOR.map(([valor,titulo])=>`<option value="${valor}"${valor===filtro.estado?' selected':''}>${titulo}</option>`).join('');
  const lista=filas.map(({a,vista,cambios})=>`<article data-profesor-fila="${esc(a.id)}"${anuncioProfesorEnVista({vista,cambios},filtro.vista)?'':' hidden'}>
    ${vista==='activas'?`<aside class="clase-apoyo" data-profesor-banner="${esc(a.id)}"${filtro.vista==='activas'?'':' hidden'}>${contenidoRecomendacionClase(a,{vistaPrevia:true,enPanelProfesor:true})}</aside>`:''}
    ${filaProfesorClaseHTML(a,pesos,ahora)}
  </article>`).join('');
  return `<div class="adm-lista profesor-anuncios">
    <div class="adm-lista-barra"><nav class="adm-seg" aria-label="Vistas de anuncios">${segmentos}</nav>
      <div class="admin-hig-herramientas" role="search" aria-label="Buscar tus anuncios">
        <label class="admin-hig-busqueda"><span class="adm-oculto">Buscar por título o sigla</span>
          <input type="search" id="profesor-anuncios-buscar" autocomplete="off" placeholder="Buscar por título o sigla" value="${esc(filtro.busqueda)}"></label>
        <label><span class="adm-oculto">Estado del anuncio</span><select id="profesor-anuncios-estado">${estados}</select></label>
      </div>
    </div>
    <p class="admin-hig-nota profesor-anuncios-estado" role="status" aria-atomic="true" data-profesor-cantidad></p>
    ${filas.length&&!filas.some(f=>f.vista==='activas')?`<p class="profesor-hig-vacio" data-profesor-sin-activas hidden>No tienes anuncios activos.${compras?' Puedes crear uno.':''}</p>`:''}
    <p class="profesor-hig-vacio" data-profesor-vacio hidden></p>
    <p class="clase-sin-datos" data-profesor-comentarios role="alert" hidden>No pudimos cargar los comentarios de revisión. Vuelve a abrir tu espacio para intentarlo de nuevo.</p>
    <div class="clase-lista">${lista}</div>
  </div>`;
}
function enlazarAnunciosProfesor(raiz,filas,filtro,compras){
  const porId=new Map(filas.map(f=>[String(f.a.id),f]));
  const filasDOM=[...raiz.querySelectorAll('[data-profesor-fila]')];
  const segmentos=[...raiz.querySelectorAll('[data-profesor-seccion]')];
  const buscar=raiz.querySelector('#profesor-anuncios-buscar'),estado=raiz.querySelector('#profesor-anuncios-estado');
  const cantidad=raiz.querySelector('[data-profesor-cantidad]'),vacio=raiz.querySelector('[data-profesor-vacio]');
  const comentarios=raiz.querySelector('[data-profesor-comentarios]');
  const sinActivas=raiz.querySelector('[data-profesor-sin-activas]');
  const actualizar=()=>{
    const palabras=normalizarBusquedaClase(filtro.busqueda).split(' ').filter(Boolean);
    const visibles=filas.filter(f=>anuncioProfesorEnVista(f,filtro.vista)&&
      (!filtro.estado||f.estado===filtro.estado||(filtro.estado==='en_revision'&&f.cambios))&&palabras.every(p=>f.texto.includes(p)));
    const ids=new Set(visibles.map(f=>String(f.a.id)));
    filasDOM.forEach(el=>{
      el.hidden=!ids.has(el.dataset.profesorFila);
      const banner=el.querySelector('[data-profesor-banner]');
      if(banner)banner.hidden=filtro.vista!=='activas';
    });
    segmentos.forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.profesorSeccion===filtro.vista)));
    if(estado)estado.value=filtro.estado;
    if(cantidad)cantidad.textContent=visibles.length===1?'1 anuncio':`${visibles.length} anuncios`;
    if(sinActivas)sinActivas.hidden=filtro.vista==='activas'||visibles.length===0;
    if(comentarios)comentarios.hidden=!visibles.some(f=>f.a.comentario_revision_error);
    if(vacio){
      vacio.hidden=visibles.length>0;
      vacio.textContent=palabras.length||filtro.estado?'No encontramos anuncios con esta búsqueda o filtro.':
        filtro.vista==='activas'?(compras?'No tienes anuncios activos. Crea uno o revisa el historial.':'No tienes anuncios activos. Puedes revisar el historial.'):
        filtro.vista==='revision'?'No tienes anuncios en revisión ni borradores.':'Todavía no tienes anuncios en el historial.';
    }
    return ids;
  };
  segmentos.forEach(b=>b.addEventListener('click',()=>{
    filtro.vista=b.dataset.profesorSeccion;filtro.estado='';actualizar();
  }));
  buscar?.addEventListener('input',()=>{filtro.busqueda=buscar.value;actualizar();});
  estado?.addEventListener('change',()=>{
    const opcion=ESTADOS_FILTRO_PROFESOR.find(([valor])=>valor===estado.value);
    if(!opcion)return;
    filtro.estado=opcion[0];
    if(opcion[2])filtro.vista=opcion[2];
    actualizar();
  });
  actualizar();
  return id=>{
    const fila=porId.get(String(id));
    if(!fila)return;
    if(!actualizar().has(String(id))){
      filtro.vista=fila.vista;filtro.estado='';filtro.busqueda='';
      if(buscar)buscar.value='';
      actualizar();
    }
  };
}
function cargarLogosAnunciosProfesor(raiz){
  const banners=[...raiz.querySelectorAll('[data-profesor-banner]')];
  const ids=banners.map(b=>b.dataset.profesorBanner);
  // logosDeAnuncios admite hasta cien ids por consulta.
  for(let i=0;i<ids.length;i+=100){
    logosDeAnuncios(ids.slice(i,i+100)).then(logos=>{
      for(const banner of banners.slice(i,i+100)){
        const ruta=logos.get(banner.dataset.profesorBanner);
        if(!ruta)continue;
        const caja=banner.querySelector('.clase-apoyo-logo');
        if(!caja)continue;
        urlFlyerClase(ruta).then(url=>{
          if(url&&caja.isConnected){caja.innerHTML=imgLogoClase(url);caja.hidden=false;}
        }).catch(()=>{});
      }
    }).catch(()=>{});
  }
}

async function renderPanelProfesor(raiz,anuncios,{cabecera,salida}){
  const pesos=n=>new Intl.NumberFormat('es-CL',{style:'currency',currency:'CLP',maximumFractionDigits:0}).format(n);
  anuncios=await Promise.all(anuncios.map(async a=>{
    if(a.estado!=='publicado')return a;
    try{
      const {data,error}=await leerCostoCampanaClase(a.id);
      if(error)return sqlClasesDesactualizado(error)?{...a,campana:null}:{...a,campanaError:true};
      return {...a,campana:Array.isArray(data)?data[0]||null:null};
    }catch(e){return {...a,campanaError:true};}
  }));
  if(anuncios.some(a=>a.estado==='borrador')){
    try{
      const {data,error}=await supabaseClient.rpc('comentarios_devolucion_profesor');
      if(error)throw error;
      const comentarios=new Map((Array.isArray(data)?data:[]).map(f=>[f.anuncio_id,f.comentario]));
      anuncios=anuncios.map(a=>a.estado==='borrador'?{...a,comentario_revision:comentarios.get(a.id)||null}:a);
    }catch(e){
      anuncios=anuncios.map(a=>a.estado==='borrador'?{...a,comentario_revision_error:true}:a);
    }
  }
  // Cambios que el profesor envió a revisión sobre un anuncio publicado
  // (profesor_editar_anuncio.sql). Sin el SQL, la consulta falla y no se muestra nada.
  if(anuncios.some(a=>['publicado','pausado'].includes(a.estado))){
    try{
      const {data,error}=await supabaseClient.from('tutor_anuncio_ediciones').select('anuncio_id,datos,estado,comentario,enviada_at');
      if(!error&&Array.isArray(data)){
        const porAnuncio=new Map(data.map(e=>[e.anuncio_id,e]));
        anuncios=anuncios.map(a=>porAnuncio.has(a.id)?{...a,edicion_propia:porAnuncio.get(a.id)}:a);
      }
    }catch(e){}
  }
  let ediciones=[];
  try{
    const {data,error}=await supabaseClient.rpc('mis_anuncios_editados_gradehub');
    if(!error&&Array.isArray(data))ediciones=data.filter(e=>anuncios.some(a=>a.id===e.anuncio_id));
  }catch(e){}
  const ahora=Date.now(),g=gruposPanelClases(anuncios,ahora);
  const filasAnuncios=filasAnunciosProfesor(g,ahora);
  const cuenta=typeof currentUser==='undefined'?null:currentUser?.id;
  const anterior=filtrosAnunciosProfesor.get(raiz);
  const volverAAnuncios=vistaClasesAlVolver==='anuncios';
  const filtro=!volverAAnuncios&&anterior?.cuenta===cuenta?anterior:{
    cuenta,busqueda:'',estado:'',vista:VISTAS_ANUNCIOS_PROFESOR.find(([v])=>filasAnuncios.some(f=>anuncioProfesorEnVista(f,v)))?.[0]||'activas',
  };
  filtrosAnunciosProfesor.set(raiz,filtro);
  const conNumeros=[...g.activos,...g.cerrados,...g.sinConfirmar];
  // En su pestaña, «Clases» va en la barra (Lucas, 2026-10-22): sin título
  // grande, la acción principal queda arriba. Abierto como hoja, conserva su
  // título, que la hoja necesita.
  // Misma acción principal que «Invitar alumno» en Alumnos: botón con el acento.
  // En la app no se crea ni se edita un anuncio: lleva a configurar y pagar la
  // campaña (3.1.1, campanasSeCompranAqui en graficos-profesor.js).
  const compras=campanasSeCompranAqui();
  const crearAnuncio=compras?'<button type="button" class="accion-principal" id="clase-nueva">Crear anuncio</button>':'';
  // Resumen, Anuncios y Perfil (Lucas, 2026-10-22). En pantalla ancha están en
  // la barra lateral y el control de abajo se oculta. El Resumen dice primero
  // lo que pide algo del profesor.
  const enHoja=raiz.id==='modal-content';
  const enDias=a=>diasRestantesAnuncio(a,ahora);
  const porVencer=g.activos.filter(a=>{const d=enDias(a);return d!==null&&d>=0&&d<=3;});
  const devueltos=g.borradores.filter(a=>a.comentario_revision);
  const agotados=g.cerrados.filter(a=>vigenciaAnuncio(a,ahora)==='agotado');
  const pendientesHTML=[
    ...devueltos.map(a=>`<li><span><b>${esc(a.titulo||'Sin título')}</b><small>Devuelto · ${esc(a.comentario_revision)}</small></span>${compras?`<button type="button" class="agent-refresh" data-editar="${esc(a.id)}">Revisar</button>`:''}</li>`),
    ...anuncios.filter(a=>a.edicion_propia&&a.edicion_propia.estado==='rechazada').map(a=>`<li><span><b>${esc(a.titulo||'Sin título')}</b><small>Cambios no aprobados · ${esc(a.edicion_propia.comentario||'')}</small></span>${compras?`<button type="button" class="agent-refresh" data-editar-publicado="${esc(a.id)}">Revisar</button>`:''}</li>`),
    ...porVencer.map(a=>{const d=enDias(a);return `<li><span><b>${esc(a.titulo||'Sin título')}</b><small>${d<=1?'Campaña por vencer · hasta mañana':`Campaña por vencer · ${d} días`}</small></span><button type="button" class="agent-refresh" data-cr-ver="${esc(a.id)}">Ver campaña</button></li>`;}),
    ...agotados.map(a=>`<li><span><b>${esc(a.titulo||'Sin título')}</b><small>Tope alcanzado</small></span><button type="button" class="agent-refresh" data-cr-ver="${esc(a.id)}">Ver campaña</button></li>`),
    ...ediciones.map(e=>{const a=anuncios.find(a=>a.id===e.anuncio_id);const fecha=new Date(e.editado_at).toLocaleDateString('es-CL',{day:'numeric',month:'long',year:'numeric',timeZone:'America/Santiago'});return `<li data-aviso-edicion="${esc(a.id)}"><span><b>${esc(a.titulo||'Sin título')}</b><small>GradeHub editó tu anuncio · ${esc(fecha)}</small></span><button type="button" class="agent-refresh" data-ver-edicion="${esc(a.id)}">Ver anuncio</button></li>`;}),
  ].join('');
  raiz.innerHTML='<div class="profesor-hig">'+
    // «Crear anuncio» vive en Anuncios, donde están los anuncios (Lucas,
    // 2026-10-23). Abierto como hoja, el panel conserva su cabecera con él.
    (enHoja
      ?cabeceraProfesorHTML('Tu conocimiento puede ayudar.','Este es tu espacio para publicar clases y ver cómo les va.',crearAnuncio,'modal-titulo')
      :'')+
    `<nav class="panel-alumnos-vistas tres-vistas" aria-label="Vistas de Clases">
      <button type="button" data-clases-vista="resumen" aria-pressed="true">Resumen</button>
      <button type="button" data-clases-vista="anuncios" aria-pressed="false">Anuncios</button>
      <button type="button" data-clases-vista="perfil" aria-pressed="false">Perfil</button>
    </nav>
    <section class="panel-alumnos-vista cr-panel" data-clases-panel="resumen" aria-label="Resumen de tus clases">
      <section class="cr-pendientes"><h2>Pendientes</h2>
        ${pendientesHTML?`<ul class="clases-pendientes">${pendientesHTML}</ul>`:anuncios.length?'<p class="clases-pendiente-vacio">Nada pendiente de tu parte.</p>':
          enHoja||!compras?'<p class="clases-pendiente-vacio">Todavía no tienes anuncios.</p>':'<button type="button" class="accion-principal" data-cr-crear>Crear tu primer anuncio</button>'}
      </section>
      ${g.sinConfirmar.length?'<p class="clase-sin-datos" role="status">No pudimos confirmar qué campañas siguen activas.</p>':''}
      <div id="clases-kpis">${conNumeros.length?'<p class="clase-sin-datos" role="status">Cargando cifras…</p>':''}</div>
    </section>
    <section class="panel-alumnos-vista" data-clases-panel="anuncios" aria-label="Tus anuncios" hidden>
    ${enHoja||!crearAnuncio?'':`<div class="profesor-hig-accion">${crearAnuncio}</div>`}
    ${listaAnunciosProfesorHTML(filasAnuncios,pesos,ahora,filtro,compras)}`+
    '</section><section class="panel-alumnos-vista clases-seccion" data-clases-panel="perfil" aria-label="Tu perfil" hidden><h3>Tu perfil</h3><div id="clases-perfil"></div></section>'+
    salida()+'</div>';
  const mostrarFilaAnuncio=enlazarAnunciosProfesor(raiz,filasAnuncios,filtro,compras);
  cargarLogosAnunciosProfesor(raiz);
  // Cambiar de vista no vuelve a pedir nada: las tres ya están pintadas.
  const activarVistaClases=v=>{
    if(!['resumen','anuncios','perfil'].includes(v))v='resumen';
    vistaClasesActual=v;
    raiz.querySelectorAll('[data-clases-panel]').forEach(p=>{p.hidden=p.dataset.clasesPanel!==v;});
    raiz.querySelectorAll('[data-clases-vista]').forEach(b=>{if(typeof b.setAttribute==='function')b.setAttribute('aria-pressed',String(b.dataset.clasesVista===v));});
    if(!enHoja&&typeof marcarVistaNav==='function')marcarVistaNav('profesor',v);
  };
  raiz.querySelectorAll('[data-clases-vista]').forEach(b=>b.addEventListener('click',()=>activarVistaClases(b.dataset.clasesVista)));
  if(!enHoja&&typeof vistasPanelNav!=='undefined')vistasPanelNav.profesor=v=>{if(raiz.isConnected!==false)activarVistaClases(v);};
  const alVolver=vistaClasesAlVolver;vistaClasesAlVolver=null;
  activarVistaClases(alVolver||(enHoja?'resumen':((typeof tomarVistaNav==='function'&&tomarVistaNav('profesor'))||vistaClasesActual||'resumen')));
  // Al cambiar el estado se vuelve a pedir la lista: el estado, los números y
  // los botones de cada tarjeta dependen de él, y repintar a mano lo que uno
  // cree que cambió es la forma de que una tarjeta quede mintiendo.
  const repintar=()=>renderEspacioProfesor(raiz,{titulo:!!cabecera('x')});
  const nueva=raiz.querySelector('#clase-nueva');
  if(nueva)nueva.addEventListener('click',()=>renderBorradorProfesor(raiz,null));
  const cajaPerfil=raiz.querySelector('#clases-perfil');
  if(cajaPerfil&&cajaPerfil.isConnected&&typeof cajaPerfil.addEventListener==='function')renderPerfilProfesor(cajaPerfil);
  const porVer=new Map(ediciones.map(e=>[e.anuncio_id,e])),abriendoEdicion=new Set();
  const mostrarEdicion=async id=>{
    const edicion=porVer.get(id),a=anuncios.find(a=>a.id===id);
    if(!edicion||!a||abriendoEdicion.has(id))return;
    const fila=[...raiz.querySelectorAll('[data-profesor-anuncio]')].find(f=>f.dataset.profesorAnuncio===id);
    const detalle=fila&&fila.querySelector('.profesor-hig-detalle');
    if(!detalle)return;
    let preview=detalle.querySelector('[data-edicion-preview]');
    if(!preview){
      // La misma tarjeta abierta del catálogo, sin contacto ni medición.
      preview=document.createElement('section');preview.className='vista-catalogo';preview.setAttribute('data-edicion-preview','');
      preview.innerHTML='<h3>Anuncio actualizado por GradeHub</h3>'+tarjetaCatalogoClase(a,{abierta:true});
      preview.querySelectorAll('a').forEach(a=>{a.removeAttribute('href');a.setAttribute('aria-disabled','true');a.setAttribute('tabindex','-1');});
      detalle.prepend(preview);
      if(a.flyer_path)urlFlyerClase(a.flyer_path).then(url=>{const caja=preview.querySelector('[data-flyer]');if(url&&caja&&caja.isConnected){caja.hidden=false;caja.innerHTML=`<img src="${esc(url)}" alt="Flyer del anuncio">`;}});
    }
    abriendoEdicion.add(id);
    try{
      const {data,error}=await supabaseClient.rpc('marcar_edicion_anuncio_vista',{p_anuncio_id:id,p_accion_id:edicion.accion_id});
      if(error||data!==true)return;
      porVer.delete(id);
      const aviso=[...raiz.querySelectorAll('[data-aviso-edicion]')].find(e=>e.dataset.avisoEdicion===id);
      if(aviso)aviso.remove();
      const pendientes=raiz.querySelector('.clases-pendientes');
      if(pendientes&&!pendientes.children.length)pendientes.innerHTML='<li>Nada pendiente de tu parte.</li>';
    }catch(e){}finally{abriendoEdicion.delete(id);}
  };
  raiz.querySelectorAll('[data-profesor-anuncio]').forEach(f=>f.addEventListener('toggle',()=>{if(f.open)mostrarEdicion(f.dataset.profesorAnuncio);}));
  const verAnuncio=id=>{
    activarVistaClases('anuncios');
    mostrarFilaAnuncio(id);
    const fila=[...raiz.querySelectorAll('[data-profesor-anuncio]')].find(f=>f.dataset.profesorAnuncio===id);
    if(fila){fila.open=true;mostrarEdicion(id);const summary=fila.querySelector('summary');if(summary){summary.focus();summary.scrollIntoView?.({block:'nearest'});}}
  };
  raiz.querySelectorAll('[data-profesor-banner]').forEach(banner=>
    banner.querySelector('.clase-apoyo-abrir')?.addEventListener('click',()=>verAnuncio(banner.dataset.profesorBanner)));
  raiz.querySelectorAll('[data-ver-edicion]').forEach(b=>b.addEventListener('click',()=>verAnuncio(b.dataset.verEdicion)));
  raiz.querySelectorAll('[data-cr-ver]').forEach(b=>b.addEventListener('click',()=>verAnuncio(b.dataset.crVer)));
  raiz.querySelector('[data-cr-crear]')?.addEventListener('click',()=>renderBorradorProfesor(raiz,null));
  raiz.querySelectorAll('[data-editar]').forEach(b=>
    b.addEventListener('click',async()=>{await mostrarEdicion(b.dataset.editar);renderBorradorProfesor(raiz,anuncios.find(a=>a.id===b.dataset.editar)||null);}));
  raiz.querySelectorAll('[data-editar-publicado]').forEach(b=>
    b.addEventListener('click',()=>{
      const a=anuncios.find(a=>a.id===b.dataset.editarPublicado);if(!a)return;
      // El editor parte de lo que ya envió a revisión, si hay algo.
      const e=a.edicion_propia;
      renderBorradorProfesor(raiz,e&&e.datos&&typeof e.datos==='object'?{...a,...e.datos,edicion_estado:e.estado}:a,{propio:true});
    }));
  raiz.querySelectorAll('[data-pausar]').forEach(b=>
    b.addEventListener('click',()=>pausarAnuncioClase(b.dataset.pausar,repintar)));
  // Volver a publicar = volver a borrador y abrirlo: el anuncio pasa por
  // revisión otra vez, y lo natural es revisarlo antes de reenviarlo.
  raiz.querySelectorAll('[data-retomar]').forEach(b=>
    b.addEventListener('click',()=>retomarAnuncioClase(b.dataset.retomar,an=>an?renderBorradorProfesor(raiz,an):repintar())));

  for(const a of g.programados){
    const caja=raiz.querySelector(`[data-metricas="${a.id}"]`);
    if(caja)caja.innerHTML='<p class="clase-sin-datos">Todavía no empieza, así que no hay nada que medir ni que cobrar.</p>';
  }
  for(const a of [...g.revision,...g.borradores]){
    const caja=raiz.querySelector(`[data-metricas="${a.id}"]`);
    if(caja)caja.innerHTML=`<p class="clase-sin-datos">${a.estado==='en_revision'
      ?'Cuando lo aprobemos y empiece a mostrarse, sus números aparecen acá.'
      :'Todavía no se publica, así que no hay nada que medir.'}</p>`;
  }
  conNumeros.forEach(a=>{const caja=raiz.querySelector(`[data-metricas="${a.id}"]`);if(caja)caja.innerHTML='<p class="clase-sin-datos">Cargando…</p>';});

  // Las métricas se piden después de pintar y en paralelo: son dos consultas
  // por anuncio y la lista ya está en pantalla. Si alguna falla, esa tarjeta lo
  // dice y las otras siguen andando.
  const medidas=await Promise.all(conNumeros.map(async a=>{
    const m=await metricasDeAnuncio(a);
    return prepararMetricasClase(a,m);
  }));
  for(const d of medidas){
    const caja=raiz.querySelector(`[data-metricas="${d.a.id}"]`);
    if(!caja||!caja.isConnected)continue;
    const importe=raiz.querySelector(`[data-costo-campana="${d.a.id}"]`);
    if(importe)importe.textContent=d.costo?pesos(d.costo.total):'No disponible';
    if(d.error){caja.innerHTML='<p class="clase-sin-datos" role="alert">No pudimos cargar todas las estadísticas. Vuelve a abrir tu espacio para intentarlo de nuevo.</p>';continue;}
    caja.innerHTML=detalleMetricasClaseHTML(d,pesos,ahora);
  }

  const kpis=raiz.querySelector('#clases-kpis');
  if(kpis&&kpis.isConnected&&typeof kpis.querySelectorAll==='function')
    enlazarResumenProfesorEditorial(kpis,medidas,ahora,{anuncios,ver:verAnuncio});
}
