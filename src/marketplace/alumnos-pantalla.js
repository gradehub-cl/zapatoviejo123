async function renderAlumnosProfesor(raiz,{volver,alumnoId=null,vistaInicial=null}={}){
  // La vista que pidió la barra lateral manda; si no, la que se indicó; si no, el Resumen.
  vistaInicial=(typeof tomarVistaNav==='function'&&tomarVistaNav('alumnos'))||vistaInicial||'resumen';
  const usuario=currentUser,cliente=supabaseClient,version=++versionPanelAlumnos;
  const vigente=()=>currentUser===usuario&&supabaseClient===cliente&&version===versionPanelAlumnos&&raiz.isConnected!==false;
  raiz.innerHTML='<div class="profesor-hig alumnos-editorial">'+
    '<div class="panel-alumnos-estado" role="status"><h2>Cargando tus alumnos</h2><p>Estamos preparando sus ramos y evaluaciones.</p></div></div>';
  // Con alumnos de ejemplo, lo de los alumnos se responde en memoria. El link
  // de invitación y su renovación siguen siendo los reales del profesor.
  // Se pregunta en paralelo con la carga real, para no sumar una espera.
  let ejemplo=null;
  const rpc=(nombre,args)=>ejemplo?rpcEjemploPanel(ejemplo,nombre,args):supabaseClient.rpc(nombre,args);
  let codigo,alumnos;
  try{
    const [c,reales,datosEjemplo]=await Promise.all([supabaseClient.rpc('codigo_alumnos_profesor'),
      supabaseClient.rpc('mis_alumnos'),ejemploAlumnosDeCuenta()]);
    if(!vigente())return;
    ejemplo=datosEjemplo;
    const a=ejemplo?await rpc('mis_alumnos'):reales;
    if(!vigente())return;
    if(c.error||a.error)throw (c.error||a.error);
    codigo=c.data;alumnos=Array.isArray(a.data)?a.data:[];
  }catch(e){
    if(!vigente())return;
    raiz.innerHTML='<div class="profesor-hig alumnos-editorial">'+
      '<div class="panel-alumnos-estado" role="alert"><h2>No pudimos cargar tus alumnos</h2><p>Inténtalo de nuevo para ver sus ramos y evaluaciones.</p></div>'+
      `<div class="modal-btns"><button type="button" class="accion-principal" id="alumnos-volver">${volver?'Volver':'Reintentar'}</button></div></div>`;
    // En su pestaña no hay a dónde volver: se ofrece intentarlo de nuevo.
    raiz.querySelector('#alumnos-volver').addEventListener('click',()=>{if(vigente())(volver?volver():renderAlumnosProfesor(raiz));});
    return;
  }
  // Una consulta por ramo distinto, no por alumno. UAI y UAndes pueden usar
  // nombre normalizado cuando no existe sigla, igual que curso_notas.
  const cursos=new Map();
  alumnos.forEach(al=>(al.ramos||[]).forEach(r=>{
    const clave=al.tenant&&claveRamoCurso(r,al.tenant);
    if(clave)cursos.set(claveCurso(al.tenant,clave),null);
  }));
  await Promise.all([...cursos.keys()].map(async k=>{
    const separador=k.indexOf('|'),tenant=k.slice(0,separador),sigla=k.slice(separador+1);
    try{const {data,error}=await rpc('comparacion_ramo_profesor',{p_tenant:tenant,p_sigla:sigla});if(!error)cursos.set(k,data);}catch(e){}
  }));
  if(!vigente())return;
  const compGeneral=(al,r)=>cursos.get(claveCurso(al.tenant,claveRamoCurso(r,al.tenant)||''))||null;
  // Por sección se consulta solo al pedirlo (el control o el Excel), una vez
  // por ramo y sección distintos, de a cuatro para no cargar la base.
  const secciones=new Map();
  const claveSeccion=(al,r)=>{const c=al.tenant&&claveRamoCurso(r,al.tenant);return c&&Number.isInteger(r.seccion)?claveCurso(al.tenant,c)+'|'+r.seccion:null;};
  const compSeccion=(al,r)=>{const k=claveSeccion(al,r);if(!k)return SIN_SECCION_PANEL;
    return secciones.get(k)||{seccion:r.seccion,ramo:null,evaluaciones:[],categorias:[]};};
  let cargandoSecciones=null;
  const cargarSecciones=()=>cargandoSecciones||(cargandoSecciones=(async()=>{
    const pendientes=[...new Set(alumnos.flatMap(al=>(al.ramos||[]).map(r=>claveSeccion(al,r)).filter(Boolean)))];
    const una=async k=>{
      const [tenant,sigla,seccion]=k.split('|');
      try{const {data,error}=await rpc('comparacion_ramo_profesor',{p_tenant:tenant,p_sigla:sigla,p_seccion:Number(seccion)});
        if(!error&&data)secciones.set(k,{...data,seccion:Number(seccion)});}catch(e){}
    };
    for(let i=0;i<pendientes.length;i+=4)await Promise.all(pendientes.slice(i,i+4).map(una));
  })());
  let porSeccion=alumnos.length>0&&comparaSeccionGuardado();
  if(porSeccion)await cargarSecciones();
  if(!vigente())return;
  const compDe=(al,r)=>porSeccion?compSeccion(al,r):compGeneral(al,r);
  const sinSeccionDe=lista=>lista.filter(al=>(al.ramos||[]).some(r=>!claveSeccion(al,r))).length;
  const grupoHTML=lista=>lista.length?antesAhoraGrupoHTML(metricasGrupoPanel(lista,compDe),{seccion:porSeccion,sinSeccion:porSeccion?sinSeccionDe(lista):0}):'';
  const link=linkAlumnosProfesor(codigo);
  const mensaje=mensajeInvitacionAlumnos();
  // Sin alumnos, el link es lo primero que se puede hacer. Con alumnos, se ve
  // primero a quiénes están conectados y luego las cifras del grupo.
  const seccionLink=`<section class="panel-alumnos-link${alumnos.length?' al-final':''}">
      <h2>${alumnos.length?'Invitar alumno':'Invita a tu primer alumno'}</h2>
      <p>Mándale este link. Elegirá qué ramos te comparte y podrá dejar de hacerlo cuando quiera.</p>
      <div class="panel-alumnos-url"><span>Link de invitación</span><code id="alumnos-link">${esc(link)}</code></div>
      <p class="panel-alumnos-codigo">Tu código <strong>${esc(codigo)}</strong></p>
      <button type="button" class="accion-principal" id="alumnos-compartir">Compartir invitación</button>
      <button type="button" class="agent-refresh" id="alumnos-copiar">Copiar link</button>
      <p class="panel-alumnos-mensaje"><strong>Mensaje sugerido para WhatsApp</strong><span>${esc(mensaje)}</span></p>
      <div class="panel-alumnos-renovar"><p>Al cambiar el link, el anterior deja de funcionar. Tus alumnos actuales siguen conectados.</p><button type="button" class="agent-refresh" id="alumnos-renovar">Cambiar link</button></div>
      <p class="clase-privacidad">Piloto gratis: por ahora no se cobra.</p>
    </section>`;
  const listaInicial=alumnosPanelHTML(alumnos,compDe,new Date(),{soloFilas:true,limite:ALUMNOS_POR_PAGINA});
  const privacidad=`<p class="clase-privacidad" id="alumnos-privacidad">“GradeHub” es el promedio de todos los usuarios con ese ramo, esa categoría o esa prueba, desde 5 personas; “Su sección”, el de los que declararon su misma sección, también desde 5. Nunca ves quiénes son.${ejemplo?' Datos de ejemplo: no corresponden a personas reales. No se guardan en GradeHub; si los exportas, el archivo dirá «ejemplo».':''}</p>`;
  // La franja va siempre arriba y no se cierra: nadie puede confundir estos
  // alumnos con los suyos.
  const franjaEjemplo=ejemplo?`<p class="panel-alumnos-ejemplo" role="note"><b>Ejemplo</b> Alumnos y notas ficticios.</p>`:'';
  raiz.innerHTML='<div class="profesor-hig alumnos-editorial">'+
    franjaEjemplo+
    // Resumen, Lista, Estadísticas y Ramos (Lucas, 2026-10-22). En pantalla
    // ancha las mismas vistas están en la barra lateral y este control se oculta.
    (alumnos.length?`<nav class="panel-alumnos-vistas${alumnos.length>1?'':' tres-vistas'}" aria-label="Vistas de Alumnos">
      <button type="button" data-panel-vista="resumen" aria-pressed="true">Resumen</button>
      <button type="button" data-panel-vista="lista" aria-pressed="false">Lista</button>
      <button type="button" data-panel-vista="estadisticas" aria-pressed="false">Estadísticas</button>
      ${alumnos.length>1?'<button type="button" data-panel-vista="ramos" aria-pressed="false">Ramos</button>':''}
    </nav>
    <header class="panel-alumnos-cabecera" id="alumnos-cabecera"><h2 id="alumnos-vista-titulo">Resumen</h2></header>
    <div id="alumnos-compara-wrap">${comparaPanelHTML(porSeccion)}</div>
    <section class="panel-alumnos-vista" id="alumnos-vista-resumen" aria-label="Resumen de tus alumnos"></section>
    <section class="panel-alumnos-vista" id="alumnos-vista-lista" aria-label="Lista de alumnos" hidden>
      <div class="profesor-hig-lista-cabeza"><h2>Conectados</h2><span id="alumnos-cuenta" aria-live="polite">${alumnos.length}</span></div>
      <button type="button" class="accion-principal" id="alumnos-ir-invitar">Invitar alumno</button>
      ${alumnos.length>1?`<div class="panel-alumnos-buscar"><input type="search" id="alumnos-buscar" placeholder="Buscar alumnos"
        aria-label="Buscar alumnos por nombre, ramo o sigla" autocomplete="off" autocapitalize="off" spellcheck="false" enterkeyhint="search"></div>`:''}
      <button type="button" class="agent-refresh panel-alumnos-exportar" id="alumnos-exportar">Exportar a Excel</button>
      <div id="alumnos-lista">${listaInicial}</div>
      <button type="button" class="agent-refresh panel-alumnos-mas" id="alumnos-mas"${alumnos.length<=ALUMNOS_POR_PAGINA?' hidden':''}>Mostrar 50 más</button>
    </section>
    <section class="panel-alumnos-vista" id="alumnos-vista-estadisticas" aria-label="Estadísticas de tus alumnos" hidden></section>
    <section class="panel-alumnos-vista" id="alumnos-vista-ramos" aria-label="Ramos de tus alumnos" hidden></section>
    <section class="panel-alumnos-vista panel-alumnos-ficha" id="alumnos-vista-ficha" hidden>
      <button type="button" class="agent-refresh panel-alumnos-regresar" id="alumnos-ficha-volver"><span aria-hidden="true">‹</span> Volver a la lista</button>
      <h2 id="alumnos-ficha-titulo"></h2>
      <div id="alumnos-ficha-compara-wrap">${comparaPanelHTML(porSeccion)}</div>
      <div id="alumnos-ficha-contenido"></div>
    </section>
    <section class="panel-alumnos-vista panel-alumnos-invitacion" id="alumnos-vista-invitar" hidden>
      <button type="button" class="agent-refresh panel-alumnos-regresar" id="alumnos-invitacion-volver"><span aria-hidden="true">‹</span> Volver a la lista</button>${seccionLink}
    </section>${privacidad}`
      :`${seccionLink}<div class="profesor-hig-lista-cabeza"><h2>Conectados</h2><span id="alumnos-cuenta">0</span></div>
        <p class="profesor-hig-vacio">Cuando un alumno abra tu link y acepte, aparece acá con sus notas.</p>`)+
    (volver?'<div class="modal-btns"><button type="button" class="btn-cancel" id="alumnos-volver">Volver</button></div>':'')+'</div>';
  const botonVolver=raiz.querySelector('#alumnos-volver');
  if(botonVolver)botonVolver.addEventListener('click',()=>{if(vigente())volver();});
  const seleccionarLink=()=>{const el=raiz.querySelector('#alumnos-link'),sel=window.getSelection&&window.getSelection();
    if(sel&&el){const rango=document.createRange();rango.selectNodeContents(el);sel.removeAllRanges();sel.addRange(rango);}};
  raiz.querySelector('#alumnos-compartir').addEventListener('click',async()=>{
    if(!vigente())return;
    const resultado=await compartirInvitacionAlumnos(link);
    if(!vigente())return;
    medirInvitacionCompartida(resultado);
    if(resultado==='copiado')showToast('Invitación copiada. Pégala en WhatsApp.');
    if(resultado==='fallo'){seleccionarLink();showToast('No pudimos compartir. Selecciona y copia el link.',true);}
  });
  raiz.querySelector('#alumnos-copiar').addEventListener('click',async()=>{
    if(!vigente())return;
    try{await navigator.clipboard.writeText(link);if(!vigente())return;track('panel_alumnos_link_copiado');showToast('Link copiado.');}
    catch(e){if(!vigente())return;seleccionarLink();showToast('Selecciónalo y cópialo.',true);}
  });
  // Lo que no se deshace se confirma en el diálogo de la app (HIG), con Cancelar a mano.
  const renovar=raiz.querySelector('#alumnos-renovar');
  renovar.addEventListener('click',()=>{if(!vigente())return;showConfirm('Cambiar tu link',
    'El link actual deja de funcionar y tendrás que mandar el nuevo. Los alumnos que ya comparten contigo siguen igual.',async()=>{
      if(!vigente())return;
      renovar.disabled=true;
      try{const {error}=await supabaseClient.rpc('codigo_alumnos_profesor',{p_renovar:true});if(error)throw error;
        if(!vigente())return;
        showToast('Link cambiado.');renderAlumnosProfesor(raiz,{volver,vistaInicial:alumnos.length?'invitar':'lista'});}
      catch(e){if(vigente()){renovar.disabled=false;showToast('No pudimos cambiar el link.',true);}}
    },{label:'Cambiar link',focusCancel:true});});
  if(!alumnos.length){track('panel_alumnos_abierto',{alumnos:0});return;}
  const lista=raiz.querySelector('#alumnos-lista');
  const ficha=raiz.querySelector('#alumnos-vista-ficha');
  const fichaContenido=raiz.querySelector('#alumnos-ficha-contenido');
  const paneles={resumen:raiz.querySelector('#alumnos-vista-resumen'),lista:raiz.querySelector('#alumnos-vista-lista'),
    estadisticas:raiz.querySelector('#alumnos-vista-estadisticas'),
    ramos:raiz.querySelector('#alumnos-vista-ramos'),ficha,invitar:raiz.querySelector('#alumnos-vista-invitar')};
  const nav=raiz.querySelector('.panel-alumnos-vistas');
  const invitar=raiz.querySelector('#alumnos-ir-invitar');
  const comparaWrap=raiz.querySelector('#alumnos-compara-wrap');
  const avisoPrivacidad=raiz.querySelector('#alumnos-privacidad');
  let vista=alumnos,visibles=ALUMNOS_POR_PAGINA,vistaActiva='resumen',seleccionado=null,botonOrigen=null;
  const mas=raiz.querySelector('#alumnos-mas');
  // Se filtra en el navegador, con lo que el panel ya bajó.
  const buscar=raiz.querySelector('#alumnos-buscar');
  const filtrar=()=>{
    if(!vigente()||!buscar)return;
    const texto=buscar.value;vista=filtrarAlumnosPanel(alumnos,texto);visibles=ALUMNOS_POR_PAGINA;
    raiz.querySelector('#alumnos-cuenta').textContent=claveEvaluacionPanel(texto)?`${vista.length} de ${alumnos.length}`:String(alumnos.length);
    pintarLista();
  };
  const pintarLista=()=>{
    lista.innerHTML=vista.length?alumnosPanelHTML(vista,compDe,new Date(),{soloFilas:true,limite:visibles})
      :`<p class="profesor-hig-vacio">No encontramos alumnos para «${esc(raiz.querySelector('#alumnos-buscar')?.value.trim()||'')}».</p>`;
    mas.hidden=vista.length<=visibles;
  };
  const enlazarQuitar=()=>fichaContenido.querySelectorAll('[data-quitar-alumno]').forEach(b=>b.addEventListener('click',()=>{if(!vigente())return;showConfirm(`Quitar a ${b.dataset.nombre}`,
    'Dejas de ver sus notas. Para volver a verlas, tendría que abrir tu link y compartir de nuevo.',async()=>{
      if(!vigente())return;
      b.disabled=true;
      try{const {error}=await rpc('quitar_alumno',{p_id:b.dataset.quitarAlumno});if(error)throw error;
        if(!vigente())return;
        showToast('Lo quitaste de tu lista.');renderAlumnosProfesor(raiz,{volver,vistaInicial:'lista'});}
      catch(e){if(vigente()){b.disabled=false;showToast('No pudimos quitarlo.',true);}}
    },{label:'Quitar',focusCancel:true});}));
  const enlazarInicio=()=>fichaContenido.querySelectorAll('[data-inicio-alumno]').forEach(b=>b.addEventListener('click',()=>{
    if(!vigente())return;
    const al=alumnos.find(x=>x.id===b.dataset.inicioAlumno);
    const r=al&&(al.ramos||[]).find(x=>x.id===b.dataset.inicioRamo);
    if(r)abrirInicioRamo(al,r,()=>{if(vigente())renderAlumnosProfesor(raiz,{volver,alumnoId:al.id});},rpc);
  }));
  const pintarFicha=()=>{
    if(!seleccionado)return;
    raiz.querySelector('#alumnos-ficha-titulo').textContent=seleccionado.nombre_visible||'Alumno';
    fichaContenido.innerHTML=conUniversidadPanel(seleccionado.tenant,()=>contenidoAlumnoPanelHTML(seleccionado,compDe,new Date()));
    enlazarQuitar();enlazarInicio();enlazarGraficosEvolucion(fichaContenido);
  };
  const activarVista=nombre=>{
    if(!vigente())return;
    if(!paneles[nombre]||(nombre==='ramos'&&alumnos.length<2))nombre='resumen';
    // Otra vista parte arriba: la barra lateral la cambiaba y la página quedaba
    // a media altura, mostrando el medio de algo nuevo.
    if(nombre!==vistaActiva){const caja=typeof raiz.closest==='function'&&raiz.closest('.scroll');if(caja)caja.scrollTop=0;}
    vistaActiva=nombre;
    Object.entries(paneles).forEach(([clave,panel])=>{panel.hidden=clave!==nombre;});
    nav.hidden=nombre==='ficha'||nombre==='invitar';
    raiz.querySelector('#alumnos-cabecera').hidden=nav.hidden;
    raiz.querySelector('#alumnos-vista-titulo').textContent=({resumen:'Resumen',lista:'Tus alumnos',estadisticas:'Antes y ahora',ramos:'Por ramo'})[nombre]||'';
    // La comparación solo cambia las cifras de Estadísticas y de la ficha. La
    // ficha tiene su propio control, bajo «‹ Lista» y el nombre (#816).
    comparaWrap.hidden=nombre!=='estadisticas';
    avisoPrivacidad.hidden=nombre==='invitar'||nombre==='resumen';
    nav.querySelectorAll('[data-panel-vista]').forEach(b=>{
      b.setAttribute('aria-pressed',String(b.dataset.panelVista===nombre));
      if(b.dataset.panelVista===nombre&&typeof b.scrollIntoView==='function')b.scrollIntoView({block:'nearest',inline:'nearest'});
    });
    if(nombre==='resumen')paneles.resumen.innerHTML=resumenInicioAlumnosHTML(resumenInicioAlumnosPanel(alumnos));
    if(nombre==='estadisticas')paneles.estadisticas.innerHTML=grupoHTML(alumnos);
    if(nombre==='ramos')paneles.ramos.innerHTML=resumenAlumnosPanelHTML(resumenAlumnosPanel(alumnos,compGeneral));
    if(typeof marcarVistaNav==='function')marcarVistaNav('alumnos',nombre==='ficha'||nombre==='invitar'?'lista':nombre);
  };
  if(typeof vistasPanelNav!=='undefined')vistasPanelNav.alumnos=v=>{if(vigente())activarVista(v);};
  const abrirFicha=(al,origen)=>{
    if(!vigente())return;
    seleccionado=al;botonOrigen=origen||null;pintarFicha();activarVista('ficha');
    const regresar=raiz.querySelector('#alumnos-ficha-volver');
    if(typeof regresar.focus==='function')regresar.focus();
    if(typeof raiz.scrollIntoView==='function')raiz.scrollIntoView({block:'start'});
  };
  nav.querySelectorAll('[data-panel-vista]').forEach(b=>b.addEventListener('click',()=>activarVista(b.dataset.panelVista)));
  invitar.addEventListener('click',()=>{
    if(!vigente())return;
    activarVista('invitar');const compartir=raiz.querySelector('#alumnos-compartir');
    if(typeof compartir.focus==='function')compartir.focus();
  });
  raiz.querySelector('#alumnos-invitacion-volver').addEventListener('click',()=>{
    if(!vigente())return;
    activarVista('lista');if(typeof invitar.focus==='function')invitar.focus();
  });
  raiz.querySelector('#alumnos-ficha-volver').addEventListener('click',()=>{
    if(!vigente())return;
    const id=seleccionado&&String(seleccionado.id);
    activarVista('lista');seleccionado=null;
    const fila=[...lista.querySelectorAll('[data-ver-alumno]')].find(b=>b.dataset.verAlumno===id);
    const foco=fila||(botonOrigen?.isConnected!==false?botonOrigen:null)||raiz.querySelector('#alumnos-buscar')||invitar;
    if(typeof foco.focus==='function')foco.focus();
  });
  // El Resumen y Estadísticas abren la ficha de quien se toque; Ramos lleva a
  // la Lista filtrada por ese ramo.
  const alTocar=e=>{
    if(!vigente()||!e.target||typeof e.target.closest!=='function')return;
    const ir=e.target.closest('[data-ir-vista]');if(ir){activarVista(ir.dataset.irVista);return;}
    const ramo=e.target.closest('[data-ver-ramo]');
    if(ramo&&buscar){buscar.value=ramo.dataset.verRamo;filtrar();activarVista('lista');return;}
    const b=e.target.closest('[data-ver-alumno]');if(!b)return;
    const al=alumnos.find(x=>String(x.id)===b.dataset.verAlumno);
    if(al)abrirFicha(al,b);
  };
  ['resumen','estadisticas','ramos'].forEach(v=>paneles[v].addEventListener('click',alTocar));
  lista.addEventListener('click',e=>{
    if(!vigente())return;
    const b=e.target.closest('[data-ver-alumno]');if(!b)return;
    const al=vista.find(x=>String(x.id)===b.dataset.verAlumno);
    if(al)abrirFicha(al,b);
  });
  mas.addEventListener('click',()=>{if(!vigente())return;visibles+=ALUMNOS_POR_PAGINA;pintarLista();});
  if(buscar)buscar.addEventListener('input',filtrar);
  // Cambiar la comparación vuelve a pintar los alumnos y el grupo con lo ya bajado.
  const controles=['#alumnos-compara-wrap','#alumnos-ficha-compara-wrap']
    .map(sel=>raiz.querySelector(`${sel} .panel-alumnos-compara`)).filter(Boolean);
  const botones=controles.flatMap(c=>[...c.querySelectorAll('[data-compara]')]);
  botones.forEach(b=>b.addEventListener('click',async()=>{
    if(!vigente())return;
    const quiere=b.dataset.compara==='seccion';if(quiere===porSeccion)return;
    botones.forEach(x=>{x.disabled=true;});
    if(quiere)await cargarSecciones();
    if(!vigente())return;
    porSeccion=quiere;guardarComparaSeccion(quiere);
    botones.forEach(x=>{x.disabled=false;x.setAttribute('aria-pressed',String((x.dataset.compara==='seccion')===porSeccion));});
    pintarLista();
    if(vistaActiva==='ficha'){
      const abiertos=new Map([...fichaContenido.querySelectorAll('details[data-ramo]')].map(d=>[d.dataset.ramo,d.open]));
      pintarFicha();fichaContenido.querySelectorAll('details[data-ramo]').forEach(d=>{
        if(abiertos.has(d.dataset.ramo))d.open=abiertos.get(d.dataset.ramo);
      });
    }
    if(vistaActiva==='estadisticas')paneles.estadisticas.innerHTML=grupoHTML(alumnos);
    track('panel_alumnos_compara',{seccion:quiere});
  }));
  const fichaInicial=alumnoId&&alumnos.find(x=>String(x.id)===String(alumnoId));
  if(fichaInicial)abrirFicha(fichaInicial);else activarVista(vistaInicial);
  // Exporta todos los que calzan con la búsqueda, en el orden de la lista: el
  // "Mostrar 50 más" es para no pintar 300 filas, no para recortar la planilla
  // (Salva Ramos pidió el desglose de todos sus alumnos). Antes de crear el
  // archivo, recuerda lo que el profesor aceptó en los términos.
  const exportar=raiz.querySelector('#alumnos-exportar');
  if(exportar)exportar.addEventListener('click',async()=>{
    if(!vigente())return;
    const paraExportar=alumnosOrdenadosPanel(vista).map(({al})=>al);
    if(!paraExportar.length){showToast('No hay alumnos que exportar con esa búsqueda.',true);return;}
    // Las columnas de sección van siempre. Se bajan antes del diálogo: el toque
    // en «Exportar» es el que deja abrir la hoja de compartir del iPhone.
    exportar.disabled=true;await cargarSecciones();
    if(!vigente())return;
    exportar.disabled=false;
    elegirArchivoAlumnosPanel(formato=>{
      const n=paraExportar.length;
      showConfirm(ejemplo?'Exportar ejemplo':'Exportar notas',
        ejemplo?`El archivo trae ${n===1?'1 alumno inventado':`${n} alumnos inventados`}, no notas reales. El nombre del archivo dirá «ejemplo».`:
          `El archivo trae las notas que ${n===1?'te compartió 1 alumno':`te compartieron ${n} alumnos`}. Úsalo solo para apoyarlos: no lo publiques ni se lo pases a nadie, y si alguno deja de compartir, borra sus notas del archivo.`,
        ()=>{if(vigente())exportarAlumnosPanel(paraExportar,compGeneral,compSeccion,formato,!!ejemplo);},{label:'Exportar',danger:false});
    });
  });
  if(ejemplo)track('panel_alumnos_ejemplo');
  else track('panel_alumnos_abierto',{alumnos:alumnos.length});
}

// El link del profesor puede llegar antes de que haya sesión: se guarda el
// código y se ofrece compartir apenas la persona entra con su semestre listo.
capturarProfeDeUrl();
mostrarContextoInvitacionProfesor();
