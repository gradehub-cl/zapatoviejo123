// Denunciar y bloquear contenido de usuarios (App Review 1.2).
// SQL: supabase/denuncias_bloqueos.sql. Los bloqueos viven en la cuenta
// (contenido_bloqueos), nunca en gradehub_v1 ni en el dispositivo: valen en la
// web y en la app, y se deshacen en Ajustes → Datos y cuenta.
// Sin ese SQL aplicado nada se filtra y la denuncia ofrece el correo.
const CORREO_DENUNCIAS='gradehub.app@gmail.com';
const MOTIVOS_DENUNCIA={
  ofensivo:'Ofensivo, discriminatorio o acoso',
  enganoso:'Engañoso o posible estafa',
  spam:'Spam o no corresponde a GradeHub',
  datos_personales:'Expone datos personales',
  incorrecto:'Profesor o calificación equivocados',
  otro:'Otro motivo'
};
const MOTIVOS_POR_TIPO={
  anuncio:['ofensivo','enganoso','spam','datos_personales','otro'],
  perfil:['ofensivo','enganoso','spam','datos_personales','otro'],
  opinion:['ofensivo','incorrecto','datos_personales','otro']
};

// ─── Bloqueos de la cuenta ──────────────────────────────────────────────────
// Una lectura por cuenta; bloquear o desbloquear la invalida. Nunca rechaza:
// sin respuesta, no se filtra nada (y Ajustes lo dice).
let bloqueosCuenta={clave:null,promesa:null};
function indiceBloqueos(lista,error=false){
  const filas=Array.isArray(lista)?lista:[];
  return {lista:filas,error,
    anuncios:new Set(filas.flatMap(f=>Array.isArray(f.anuncios)?f.anuncios:[]).map(String)),
    perfiles:new Set(filas.flatMap(f=>Array.isArray(f.perfiles)?f.perfiles:[]).map(String))};
}
function bloqueosVigentes(){
  const uid=typeof currentUser==='undefined'?null:currentUser?.id;
  if(!uid||typeof supabaseClient==='undefined'||!supabaseClient)return Promise.resolve(indiceBloqueos([]));
  if(bloqueosCuenta.clave===uid&&bloqueosCuenta.promesa)return bloqueosCuenta.promesa;
  const ficha={clave:uid,promesa:null};
  ficha.promesa=(async()=>{
    try{
      await null;
      const {data,error}=await supabaseClient.rpc('mis_bloqueos');
      if(error){
        if(sqlClasesDesactualizado(error))return indiceBloqueos([]);
        throw error;
      }
      return indiceBloqueos(data);
    }catch(e){
      // Un error no queda guardado: la próxima lectura vuelve a preguntar.
      if(bloqueosCuenta===ficha)bloqueosCuenta={clave:null,promesa:null};
      return indiceBloqueos([],true);
    }
  })();
  bloqueosCuenta=ficha;
  return ficha.promesa;
}
function olvidarBloqueos(){bloqueosCuenta={clave:null,promesa:null};}
function sinAnunciosBloqueados(anuncios,indice){
  return indice&&indice.anuncios.size?anuncios.filter(a=>!indice.anuncios.has(String(a&&a.id))):anuncios;
}
function sinPerfilesBloqueados(perfiles,indice){
  return indice&&indice.perfiles.size?perfiles.filter(p=>!indice.perfiles.has(String(p&&(p.id||p.directorio_id)))):perfiles;
}
// Lo ya pintado (catálogo, directorio, aviso de Inicio) desaparece al tiro.
function aplicarBloqueosEnPantalla(indice){
  if(typeof catalogoClasesActual!=='undefined')catalogoClasesActual=sinAnunciosBloqueados(catalogoClasesActual,indice);
  if(typeof anunciosRecomendacion!=='undefined'&&Array.isArray(anunciosRecomendacion.lista))
    anunciosRecomendacion.lista=sinAnunciosBloqueados(anunciosRecomendacion.lista,indice);
  if(typeof document==='undefined')return;
  document.querySelectorAll('[data-catalogo-anuncio]').forEach(n=>{if(indice.anuncios.has(n.dataset.catalogoAnuncio))(n.closest('.catalogo-clase-bloque')||n).remove();});
  document.querySelectorAll('aside.clase-apoyo[data-anuncio-id]').forEach(n=>{if(indice.anuncios.has(n.dataset.anuncioId))n.remove();});
  document.querySelectorAll('[data-directorio-perfil]').forEach(n=>{if(indice.perfiles.has(n.dataset.directorioPerfil))n.remove();});
}

// ─── Botón y hoja de denuncia ───────────────────────────────────────────────
function puedeDenunciar(){return typeof currentUser!=='undefined'&&!!currentUser;}
function botonDenunciaHTML(tipo,id,nombre){
  if(!puedeDenunciar()||!id)return '';
  return `<button type="button" class="denuncia-abrir" data-denunciar-tipo="${esc(tipo)}" data-denunciar-id="${esc(id)}" data-denunciar-nombre="${esc(nombre||'')}">Denunciar o bloquear</button>`;
}
function vistaDenunciaHTML({tipo,nombre,conVolver}){
  const que={anuncio:'este anuncio',perfil:'este perfil',opinion:'esta calificación'}[tipo];
  const bloquear=tipo!=='opinion';
  return `<section class="denuncia-vista" aria-labelledby="denuncia-titulo">
    ${conVolver?'<div class="directorio-perfil-cabecera"><button type="button" class="clase-accion" data-denuncia-volver>← Volver</button></div>':''}
    <h2 class="modal-title" id="denuncia-titulo" tabindex="-1">Denunciar ${que}</h2>
    ${nombre?`<p class="denuncia-sobre">${esc(nombre)}</p>`:''}
    <form class="denuncia-form" novalidate>
      <fieldset class="denuncia-motivos"><legend>¿Qué pasa?</legend>
        ${MOTIVOS_POR_TIPO[tipo].map(m=>`<label class="denuncia-motivo"><input type="radio" name="denuncia-motivo" value="${m}"><span>${MOTIVOS_DENUNCIA[m]}</span></label>`).join('')}
      </fieldset>
      <label class="modal-label" for="denuncia-detalle">Cuéntanos más <span class="calif-opcional">opcional</span></label>
      <textarea id="denuncia-detalle" class="feedback-message denuncia-detalle" maxlength="500" rows="3" placeholder="Qué viste y dónde" aria-describedby="denuncia-cuenta"></textarea>
      <p class="denuncia-cuenta" id="denuncia-cuenta">0/500</p>
      <p class="calif-error" role="alert"></p>
      <div class="modal-btns"><button type="button" class="btn-cancel" data-denuncia-cancelar>Cancelar</button><button type="submit" class="btn-confirm">Enviar denuncia</button></div>
    </form>
    <p class="denuncia-nota">Una persona del equipo la revisa dentro de 24 horas y nadie más sabe quién denunció. ¿Es urgente? Escríbenos a <a href="mailto:${CORREO_DENUNCIAS}?subject=${encodeURIComponent('Denuncia en GradeHub')}">${CORREO_DENUNCIAS}</a>.</p>
    ${bloquear?`<div class="denuncia-bloqueo"><button type="button" class="denuncia-bloquear" data-denuncia-bloquear>Bloquear${nombre?' a '+esc(nombre):''}</button>
      <p>Dejas de ver sus clases, su perfil y sus anuncios. No se le avisa, y puedes deshacerlo en Ajustes.</p></div>`:''}
  </section>`;
}
function errorDenuncia(error){
  const m=String(error&&error.message||'');
  if(error&&sqlClasesDesactualizado(error))return `Por ahora no podemos recibirla acá. Escríbenos a ${CORREO_DENUNCIAS}.`;
  if(/demasiadas/.test(m))return `Ya enviaste muchas denuncias hoy. Si es urgente, escríbenos a ${CORREO_DENUNCIAS}.`;
  if(/no disponible|no sincronizados/.test(m))return 'Este contenido ya no está publicado.';
  if(/propio/.test(m))return 'No puedes denunciar tu propio contenido.';
  return 'No pudimos enviarla. Revisa tu conexión e intenta de nuevo.';
}
// La hoja se abre encima de lo que se estaba viendo (catálogo, perfil o
// calificación) y Volver lo deja como estaba: filtros, foco y posición.
function abrirDenuncia({tipo,id=null,nombre='',contexto=null,origen=null}){
  if(!MOTIVOS_POR_TIPO[tipo])return;
  if(!puedeDenunciar()||!supabaseClient){showToast('Inicia sesión para denunciar.',true);return;}
  const raiz=document.getElementById('modal-content'),modal=document.getElementById('modal');
  if(!raiz||!modal)return;
  const abierta=modal.classList.contains('open'),uid=currentUser.id;
  const hoja=raiz.closest('.modal-sheet'),scroll=hoja?hoja.scrollTop:0;
  const anteriores=abierta?[...raiz.children].map(n=>[n,n.hidden]):[];
  anteriores.forEach(([n])=>{n.hidden=true;});
  if(!abierta)raiz.innerHTML='';
  raiz.insertAdjacentHTML('beforeend',vistaDenunciaHTML({tipo,nombre,conVolver:abierta}));
  const vista=raiz.lastElementChild,form=vista.querySelector('form'),alerta=form.querySelector('[role=alert]');
  const detalle=form.querySelector('textarea'),enviar=form.querySelector('[type=submit]');
  const vigente=()=>vista.isConnected&&!vista.hidden&&currentUser&&currentUser.id===uid&&modal.classList.contains('open');
  const volver=()=>{
    if(!vista.isConnected)return;
    if(!abierta){closeModal();return;}
    vista.remove();anteriores.forEach(([n,h])=>{n.hidden=h;});
    if(hoja)hoja.scrollTop=scroll;
    if(origen&&origen.isConnected)origen.focus({preventScroll:true});
  };
  vista.querySelector('[data-denuncia-volver]')?.addEventListener('click',volver);
  form.querySelector('[data-denuncia-cancelar]').addEventListener('click',volver);
  detalle.addEventListener('input',()=>{vista.querySelector('.denuncia-cuenta').textContent=[...detalle.value].length+'/500';});
  form.addEventListener('change',()=>{alerta.textContent='';});
  form.addEventListener('submit',async e=>{
    e.preventDefault();
    if(enviar.disabled||!vigente())return;
    const motivo=(form.querySelector('input[name=denuncia-motivo]:checked')||{}).value;
    if(!motivo){alerta.textContent='Elige qué pasa.';form.querySelector('input[name=denuncia-motivo]').focus();return;}
    const texto=detalle.value.replace(/\s+/g,' ').trim().slice(0,500)||null;
    enviar.disabled=true;enviar.textContent='Enviando…';alerta.textContent='';
    try{
      const {data,error}=tipo==='opinion'
        ?await supabaseClient.rpc('denunciar_opinion_profesor',{...contexto,p_motivo:motivo,p_detalle:texto})
        :await supabaseClient.rpc('denunciar_contenido',{p_tipo:tipo,p_id:id,p_motivo:motivo,p_detalle:texto});
      if(!vigente())return;
      if(error||data!==true)throw error||Error('sin confirmación');
      if(typeof track==='function')track('contenido_denunciado',{tipo});
      form.outerHTML=`<div class="denuncia-lista" role="status"><p class="denuncia-gracias">Gracias. Recibimos tu denuncia.</p>
        <div class="modal-btns"><button type="button" class="btn-confirm" data-denuncia-listo>Listo</button></div></div>`;
      vista.querySelector('.denuncia-nota').textContent='Una persona del equipo la revisa dentro de 24 horas y nadie más sabe quién denunció.';
      const listo=vista.querySelector('[data-denuncia-listo]');listo.addEventListener('click',volver);
      if(typeof enfocarEnHoja==='function')enfocarEnHoja(listo);else listo.focus();
    }catch(error){
      if(!form.isConnected)return;
      alerta.textContent=errorDenuncia(error);enviar.disabled=false;enviar.textContent='Enviar denuncia';
    }
  });
  vista.querySelector('[data-denuncia-bloquear]')?.addEventListener('click',()=>{if(vigente())confirmarBloqueo({tipo,id,nombre});});
  if(!abierta)openModal();
  if(hoja)hoja.scrollTop=0;
  const titulo=vista.querySelector('#denuncia-titulo');
  if(typeof enfocarEnHoja==='function')enfocarEnHoja(titulo);else titulo.focus();
}
function confirmarBloqueo({tipo,id,nombre}){
  const quien=nombre||'este profesor';
  showConfirm(`¿Bloquear a ${quien}?`,
    'Dejas de ver sus clases, su perfil y sus anuncios en GradeHub. No se le avisa. Puedes deshacerlo en Ajustes → Datos y cuenta.',
    async()=>{
      const uid=currentUser&&currentUser.id;
      try{
        const {data,error}=await supabaseClient.rpc('bloquear_autor',{p_tipo:tipo,p_id:id});
        if(error||data!==true)throw error||Error('sin confirmación');
        if(!currentUser||currentUser.id!==uid)return;
        olvidarBloqueos();
        const indice=await bloqueosVigentes();
        if(typeof track==='function')track('profesor_bloqueado',{tipo});
        closeModal();
        aplicarBloqueosEnPantalla(indice);
        showToast(`Bloqueaste a ${quien}.`);
      }catch(error){showToast(errorDenuncia(error).replace('Este contenido ya no está publicado.','Ese profesor ya no tiene contenido publicado.'),true);}
    },{label:'Bloquear',danger:true});
}
if(typeof document!=='undefined'&&typeof document.addEventListener==='function')document.addEventListener('click',e=>{
  const b=e.target&&e.target.closest?e.target.closest('[data-denunciar-tipo]'):null;
  if(!b)return;
  e.preventDefault();
  abrirDenuncia({tipo:b.dataset.denunciarTipo,id:b.dataset.denunciarId,nombre:b.dataset.denunciarNombre,origen:b});
});

// ─── Ajustes → Datos y cuenta ───────────────────────────────────────────────
async function pintarBloqueosAjustes(){
  const caja=document.getElementById('s-bloqueos');
  if(!caja||!currentUser)return;
  olvidarBloqueos();
  const indice=await bloqueosVigentes();
  if(!caja.isConnected)return;
  if(indice.error){caja.innerHTML='<p class="settings-help">No pudimos cargar a quiénes bloqueaste. Vuelve a abrir esta sección.</p>';return;}
  if(!indice.lista.length){caja.innerHTML='<p class="settings-help">No has bloqueado a ningún profesor.</p>';return;}
  caja.innerHTML=indice.lista.map(b=>`<div class="compartido-fila">
      <div><b>${esc(b.nombre)}</b><small>Desde el ${esc(new Date(b.creado).toLocaleDateString('es-CL',{day:'numeric',month:'long'}))}</small></div>
      <button type="button" class="agent-refresh" data-desbloquear="${esc(b.id)}" data-nombre="${esc(b.nombre)}">Desbloquear</button>
    </div>`).join('');
  caja.querySelectorAll('[data-desbloquear]').forEach(boton=>boton.addEventListener('click',async()=>{
    if(boton.disabled)return;boton.disabled=true;
    try{
      const {data,error}=await supabaseClient.rpc('desbloquear_autor',{p_bloqueo:Number(boton.dataset.desbloquear)});
      if(error||data!==true)throw error||Error('sin confirmación');
      olvidarBloqueos();
      // Sus anuncios pueden volver a recomendarse: Inicio vuelve a preguntar.
      if(typeof anunciosRecomendacion!=='undefined')anunciosRecomendacion={tenant:null,lista:null,pidiendo:false};
      showToast(`Desbloqueaste a ${boton.dataset.nombre}.`);
      pintarBloqueosAjustes();
    }catch(e){if(boton.isConnected)boton.disabled=false;showToast('No pudimos desbloquear. Intenta de nuevo.',true);}
  }));
}

// ─── Administración (lista + segundo factor) ────────────────────────────────
const TIPOS_DENUNCIA_ADMIN={anuncio:'Anuncio',perfil:'Perfil',opinion:'Calificación de docente'};
function gruposDenunciasAdmin(filas){
  const grupos=new Map();
  for(const f of Array.isArray(filas)?filas:[]){
    const clave=[f.tipo,f.autor_id||'',f.anuncio_id||'',f.opinion?JSON.stringify(f.opinion):''].join('|');
    if(!grupos.has(clave))grupos.set(clave,{...f,motivos:[],detalles:[],total:0});
    const g=grupos.get(clave);
    g.total++;if(!g.motivos.includes(f.motivo))g.motivos.push(f.motivo);if(f.detalle)g.detalles.push(f.detalle);
  }
  return [...grupos.values()];
}
function denunciaAdminHTML(g){
  const o=g.opinion||{};
  const titulo=g.tipo==='anuncio'?(g.anuncio_titulo||'Anuncio sin título'):g.tipo==='perfil'?(g.autor_nombre||'Perfil'):(o.docente||'Docente');
  const contenido=g.tipo==='anuncio'?g.anuncio_descripcion:g.tipo==='perfil'?g.perfil_presentacion
    :`${String(o.tenant||'').toUpperCase()} · ${o.ramo_clave||''} · sección ${o.seccion||'?'} · ${o.periodo||''}`;
  const pausado=g.autor_estado==='suspendido';
  const acciones=[
    g.tipo!=='opinion'&&g.autor_id&&g.autor_estado==='aprobado'?`<button type="button" class="clase-accion" data-denuncia-pausar="${esc(g.id)}" data-autor="${esc(g.autor_id)}">Pausar profesor</button>`:'',
    g.tipo==='opinion'&&!g.docente_oculto?`<button type="button" class="clase-accion" data-denuncia-ocultar="${esc(g.id)}">Ocultar docente</button>`:'',
    `<button type="button" class="btn-confirm" data-denuncia-resolver="${esc(g.id)}" data-estado="resuelta">Marcar resuelta</button>`,
    `<button type="button" class="clase-accion" data-denuncia-resolver="${esc(g.id)}" data-estado="descartada">Descartar</button>`
  ].join('');
  return `<article class="admin-revision denuncia-admin" aria-label="${esc(TIPOS_DENUNCIA_ADMIN[g.tipo]+': '+titulo)}">
    <h4>${esc(TIPOS_DENUNCIA_ADMIN[g.tipo])} · ${esc(titulo)}</h4>
    <p class="clase-card-meta">${g.total} ${g.total===1?'denuncia':'denuncias'} · ${esc(g.motivos.map(m=>MOTIVOS_DENUNCIA[m]||m).join(' · '))} · ${esc(new Date(g.creada).toLocaleString('es-CL',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}))}</p>
    ${contenido?`<p class="admin-revision-descripcion">${esc(contenido)}</p>`:''}
    ${g.detalles.length?`<ul class="denuncia-admin-detalles">${g.detalles.map(d=>`<li>«${esc(d)}»</li>`).join('')}</ul>`:''}
    ${pausado?'<p class="profesor-info">Profesor pausado: sus anuncios ya no se muestran.</p>':''}
    ${g.tipo==='opinion'&&g.docente_oculto?'<p class="profesor-info">Docente oculto en esta universidad.</p>':''}
    ${g.tipo==='opinion'?'<p class="admin-hig-nota">Para excluir los aportes de una cuenta, sigue «Suprimir» en supabase/profesores.sql.</p>':''}
    <div class="admin-revision-acciones">${acciones}</div>
  </article>`;
}
async function pintarDenunciasAdmin(raiz){
  const caja=raiz&&raiz.querySelector('#admin-denuncias');
  if(!caja)return;
  const titulo='<h3>Denuncias</h3>';
  let filas;
  try{
    const {data,error}=await supabaseClient.rpc('admin_denuncias');
    if(!caja.isConnected)return;
    if(error){caja.innerHTML=titulo+`<p class="profesor-info" role="alert">${sqlClasesDesactualizado(error)?'La bandeja estará disponible cuando se aplique supabase/denuncias_bloqueos.sql.':'No pudimos cargar las denuncias. Actualiza para intentar de nuevo.'}</p>`;return;}
    filas=gruposDenunciasAdmin(data);
  }catch(e){if(caja.isConnected)caja.innerHTML=titulo+'<p class="profesor-info" role="alert">No pudimos cargar las denuncias. Actualiza para intentar de nuevo.</p>';return;}
  caja.innerHTML=titulo+(filas.length
    ?`<p class="admin-hig-nota">${filas.length} ${filas.length===1?'contenido denunciado':'contenidos denunciados'} · respóndelas dentro de 24 horas</p><div class="admin-hig-lista">${filas.map(denunciaAdminHTML).join('')}</div>`
    :'<p class="admin-hig-vacio">No hay denuncias pendientes.</p>');
  const llamar=async(boton,rpc,args,ok)=>{
    if(boton.disabled)return false;boton.disabled=true;
    try{
      const {data,error}=await supabaseClient.rpc(rpc,args);
      if(error||data===false||data===0)throw error||Error('sin cambios');
      showToast(ok);return true;
    }catch(e){showToast(e&&e.message&&e.message!=='sin cambios'?e.message:'No se guardó. Actualiza e intenta de nuevo.',true);if(boton.isConnected)boton.disabled=false;return false;}
  };
  // La acción ya se hizo: si cerrar la denuncia falla, queda en la lista y se cierra a mano.
  const resolverSinAviso=async id=>{try{await supabaseClient.rpc('admin_resolver_denuncia',{p_id:Number(id),p_estado:'resuelta'});}catch(e){}};
  caja.querySelectorAll('[data-denuncia-resolver]').forEach(b=>b.addEventListener('click',async()=>{
    if(await llamar(b,'admin_resolver_denuncia',{p_id:Number(b.dataset.denunciaResolver),p_estado:b.dataset.estado},b.dataset.estado==='resuelta'?'Denuncia resuelta':'Denuncia descartada'))pintarDenunciasAdmin(raiz);
  }));
  caja.querySelectorAll('[data-denuncia-pausar]').forEach(b=>b.addEventListener('click',()=>showConfirm('¿Pausar a este profesor?',
    'Todos sus avisos dejan de mostrarse al tiro y la denuncia queda resuelta. No se borra nada y se puede revertir desde Profesores.',
    async()=>{if(await llamar(b,'admin_estado_profesor',{p_user_id:b.dataset.autor,p_estado:'suspendido'},'Profesor pausado')){
      await resolverSinAviso(b.dataset.denunciaPausar);
      pintarDenunciasAdmin(raiz);}},{label:'Pausar',danger:false})));
  caja.querySelectorAll('[data-denuncia-ocultar]').forEach(b=>b.addEventListener('click',()=>showConfirm('¿Ocultar a este docente?',
    'Deja de publicarse su nombre y su calificación en esta universidad y la denuncia queda resuelta. Se revierte desde el SQL Editor.',
    async()=>{if(await llamar(b,'admin_ocultar_docente_denunciado',{p_id:Number(b.dataset.denunciaOcultar)},'Docente oculto')){
      await resolverSinAviso(b.dataset.denunciaOcultar);
      pintarDenunciasAdmin(raiz);}},{label:'Ocultar',danger:true})));
}
