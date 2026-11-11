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
  let ediciones=[];
  try{
    const {data,error}=await supabaseClient.rpc('mis_anuncios_editados_gradehub');
    if(!error&&Array.isArray(data))ediciones=data.filter(e=>anuncios.some(a=>a.id===e.anuncio_id));
  }catch(e){}
  const ahora=Date.now(),g=gruposPanelClases(anuncios,ahora);
  const conNumeros=[...g.activos,...g.cerrados,...g.sinConfirmar];
  // En su pestaña, «Clases» va en la barra (Lucas, 2026-10-22): sin título
  // grande, la acción principal queda arriba. Abierto como hoja, conserva su
  // título, que la hoja necesita.
  // Misma acción principal que «Invitar alumno» en Alumnos: botón con el acento.
  const crearAnuncio='<button type="button" class="accion-principal" id="clase-nueva">Crear anuncio</button>';
  // Resumen, Anuncios y Perfil (Lucas, 2026-10-22). En pantalla ancha están en
  // la barra lateral y el control de abajo se oculta. El Resumen dice primero
  // lo que pide algo del profesor.
  const enHoja=raiz.id==='modal-content';
  const enDias=a=>diasRestantesAnuncio(a,ahora);
  const porVencer=g.activos.filter(a=>{const d=enDias(a);return d!==null&&d>=0&&d<=3;});
  const devueltos=g.borradores.filter(a=>a.comentario_revision);
  const agotados=g.cerrados.filter(a=>vigenciaAnuncio(a,ahora)==='agotado');
  const pendientesHTML=[
    ...devueltos.map(a=>`<li><span><b>${esc(a.titulo||'Sin título')}</b><small>Devuelto · ${esc(a.comentario_revision)}</small></span><button type="button" class="agent-refresh" data-editar="${esc(a.id)}">Revisar</button></li>`),
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
          enHoja?'<p class="clases-pendiente-vacio">Todavía no tienes anuncios.</p>':'<button type="button" class="accion-principal" data-cr-crear>Crear tu primer anuncio</button>'}
      </section>
      ${g.sinConfirmar.length?'<p class="clase-sin-datos" role="status">No pudimos confirmar qué campañas siguen activas.</p>':''}
      <div id="clases-kpis">${conNumeros.length?'<p class="clase-sin-datos" role="status">Cargando cifras…</p>':''}</div>
    </section>
    <section class="panel-alumnos-vista" data-clases-panel="anuncios" aria-label="Tus anuncios" hidden>
    ${enHoja?'':`<div class="profesor-hig-accion">${crearAnuncio}</div>`}
    <div class="profesor-hig-lista-cabeza"><h2>Tus anuncios</h2><span>${anuncios.length} ${anuncios.length===1?'anuncio':'anuncios'}</span></div>`+
    (anuncios.length?'':'<p class="profesor-hig-vacio">Todavía no tienes anuncios. Crea el primero y guárdalo como borrador hasta que esté listo.</p>')+
    seccionPanelClases('Publicadas',g.activos,pesos,ahora)+
    seccionPanelClases('Programadas',g.programados,pesos,ahora)+
    seccionPanelClases('En revisión',g.revision,pesos,ahora)+
    seccionPanelClases('Borradores',g.borradores,pesos,ahora)+
    (g.borradores.some(a=>a.comentario_revision_error)?'<p class="clase-sin-datos" role="alert">No pudimos cargar los comentarios de revisión. Vuelve a abrir tu espacio para intentarlo de nuevo.</p>':'')+
    seccionPanelClases('Pausadas y terminadas',g.cerrados,pesos,ahora)+
    seccionPanelClases('Estado sin confirmar',g.sinConfirmar,pesos,ahora)+
    '</section><section class="panel-alumnos-vista clases-seccion" data-clases-panel="perfil" aria-label="Tu perfil" hidden><h3>Tu perfil</h3><div id="clases-perfil"></div></section>'+
    salida()+'</div>';
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
    const fila=[...raiz.querySelectorAll('[data-profesor-anuncio]')].find(f=>f.dataset.profesorAnuncio===id);
    if(fila){fila.open=true;mostrarEdicion(id);const summary=fila.querySelector('summary');if(summary){summary.focus();summary.scrollIntoView({block:'start'});}}
  };
  raiz.querySelectorAll('[data-ver-edicion]').forEach(b=>b.addEventListener('click',()=>verAnuncio(b.dataset.verEdicion)));
  raiz.querySelectorAll('[data-cr-ver]').forEach(b=>b.addEventListener('click',()=>verAnuncio(b.dataset.crVer)));
  raiz.querySelector('[data-cr-crear]')?.addEventListener('click',()=>renderBorradorProfesor(raiz,null));
  raiz.querySelectorAll('[data-editar]').forEach(b=>
    b.addEventListener('click',async()=>{await mostrarEdicion(b.dataset.editar);renderBorradorProfesor(raiz,anuncios.find(a=>a.id===b.dataset.editar)||null);}));
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
