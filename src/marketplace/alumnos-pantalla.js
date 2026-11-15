async function renderAlumnosProfesor(raiz,{volver,alumnoId=null,vistaInicial=null}={}){
  // La vista que pidió la barra lateral manda; si no, la que se indicó; si no, el Resumen.
  vistaInicial=(typeof tomarVistaNav==='function'&&tomarVistaNav('alumnos'))||vistaInicial||'resumen';
  const usuario=currentUser,cliente=supabaseClient,version=++versionPanelAlumnos;
  const vigente=()=>currentUser===usuario&&supabaseClient===cliente&&version===versionPanelAlumnos&&raiz.isConnected!==false;
  const cabeceraPantalla=typeof raiz.closest==='function'&&raiz.closest('#screen-alumnos')?.querySelector('.topbar h1');
  if(cabeceraPantalla){cabeceraPantalla.textContent='Alumnos';cabeceraPantalla.parentElement?.classList.remove('pe-alumno-cabecera');}
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
  for(let i=0;i<alumnos.length;i+=4)await Promise.all(alumnos.slice(i,i+4).flatMap(al=>ejemplo?[cargarPreparacionPanel(al,rpc)]:[cargarPreparacionPanel(al,rpc),cargarPercentilesPanel(al,rpc)]));
  if(!vigente())return;
  // Una consulta por ramo distinto, no por alumno. UAI y UAndes pueden usar
  // nombre normalizado cuando no existe sigla, igual que curso_notas.
  const cursos=new Map();
  alumnos.forEach(al=>(al.ramos||[]).forEach(r=>{
    const clave=al.tenant&&claveRamoCurso(r,al.tenant);
    if(clave)cursos.set(claveCurso(al.tenant,clave),null);
  }));
  await Promise.all([...cursos.keys()].map(async k=>{
    const separador=k.indexOf('|'),tenant=k.slice(0,separador),sigla=k.slice(separador+1);
    try{const {data,error}=await rpc('comparacion_ramo_profesor',{p_tenant:tenant,p_sigla:sigla});cursos.set(k,error?{errorCarga:true,sinSQL:error.code==='42883'||error.code==='PGRST202'}:data);}catch(e){cursos.set(k,{errorCarga:true});}
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
        secciones.set(k,{...(error?{errorCarga:true,sinSQL:error.code==='42883'||error.code==='PGRST202'}:data),seccion:Number(seccion)});}catch(e){secciones.set(k,{errorCarga:true,seccion:Number(seccion)});}
    };
    for(let i=0;i<pendientes.length;i+=4)await Promise.all(pendientes.slice(i,i+4).map(una));
  })());
  let porSeccion=alumnos.length>0&&comparaSeccionGuardado();
  if(porSeccion)await cargarSecciones();
  if(!vigente())return;
  const compDe=(al,r)=>comparacionPruebasPanel(al,r,porSeccion?compSeccion(al,r):compGeneral(al,r));
  const compFicha=(al,r)=>porSeccion?compSeccion(al,r):compGeneral(al,r);
  const sinSeccionDe=lista=>lista.filter(al=>(al.ramos||[]).some(r=>!claveSeccion(al,r))).length;
  const link=linkAlumnosProfesor(codigo);
  const seccionLink=invitacionAlumnosHTML({link,codigo,alumnos});
  const estadoLista=estadoListaPanel(),filasIniciales=filasListaPanel(alumnos,new Date());
  const privacidad=`<p class="clase-privacidad" id="alumnos-privacidad">“GradeHub” es el promedio de todos los usuarios con ese ramo, esa categoría o esa prueba, desde 5 personas; “Su sección”, el de los que declararon su misma sección, también desde 5. Nunca ves quiénes son.${ejemplo?' Datos de ejemplo: no corresponden a personas reales. No se guardan en GradeHub; si los exportas, el archivo dirá «ejemplo».':''}</p>`;
  // La franja va siempre arriba y no se cierra: nadie puede confundir estos
  // alumnos con los suyos.
  const franjaEjemplo=ejemplo?`<p class="panel-alumnos-ejemplo" role="note"><b>Ejemplo</b> Alumnos y notas ficticios.</p>`:'';
  raiz.innerHTML='<div class="profesor-hig alumnos-editorial">'+
    franjaEjemplo+
    (alumnos.length?'<label class="panel-solo-pruebas"><input type="checkbox" role="switch" data-solo-pruebas>Solo pruebas</label><p class="clase-privacidad">Filtro de referencia; no cambia la nota oficial. El CSV conserva todas las notas y comparaciones originales.</p><p class="clase-privacidad" data-solo-pruebas-estado></p>':'')+
    // Resumen, Lista, Estadísticas y Ramos (Lucas, 2026-10-22). En pantalla
    // ancha las mismas vistas están en la barra lateral y este control se oculta.
    (alumnos.length?`<nav class="panel-alumnos-vistas${alumnos.length>1?'':' tres-vistas'}" aria-label="Vistas de Alumnos">
      <button type="button" data-panel-vista="resumen" aria-pressed="true">Resumen</button>
      <button type="button" data-panel-vista="lista" aria-pressed="false">Lista</button>
      <button type="button" data-panel-vista="estadisticas" aria-pressed="false">Estadísticas</button>
      ${alumnos.length>1?'<button type="button" data-panel-vista="ramos" aria-pressed="false">Ramos</button>':''}
    </nav>
    <button type="button" class="agent-refresh panel-alumnos-regresar" id="alumnos-regreso" hidden></button>
    <header class="panel-alumnos-cabecera" id="alumnos-cabecera"><h2 id="alumnos-vista-titulo">Resumen</h2></header>
    <div id="alumnos-compara-wrap">${comparaPanelHTML(porSeccion)}</div>
    <section class="panel-alumnos-vista" id="alumnos-vista-resumen" aria-label="Resumen de tus alumnos"></section>
    <section class="panel-alumnos-vista" id="alumnos-vista-lista" aria-label="Lista de alumnos" hidden>
      <div class="est al-lista">
        <div class="al-barra">
          <div class="est-tabs" id="alumnos-pestanas" role="group" aria-label="Filtrar alumnos">${pestanasListaHTML(filasIniciales,estadoLista)}</div>
          <div class="al-acciones">
            ${alumnos.length>1?`<select id="alumnos-ramo" aria-label="Filtrar por ramo">${ramosListaHTML(filasIniciales,estadoLista)}</select>
            <input type="search" class="est-buscar" id="alumnos-buscar" placeholder="Buscar alumno o ramo"
              aria-label="Buscar alumnos por nombre, ramo o sigla" autocomplete="off" autocapitalize="off" spellcheck="false" enterkeyhint="search">`:''}
            <button type="button" class="est-control" id="alumnos-exportar">Exportar a Excel</button>
            <button type="button" class="al-invitar" id="alumnos-ir-invitar">Invitar alumno</button>
          </div>
        </div>
        <div class="est-tarjeta-grande al-tarjeta">
          <div class="al-columnas"><span>Alumnos <span id="alumnos-cuenta" aria-live="polite">${alumnos.length}</span></span><span aria-hidden="true">Ramo</span><span aria-hidden="true">Promedio</span><span aria-hidden="true">Próxima evaluación</span><span aria-hidden="true">Necesita</span></div>
          <div id="alumnos-lista">${filasListaHTML(filasIniciales,ALUMNOS_POR_PAGINA)}</div>
          <button type="button" class="est-mas" id="alumnos-mas"${filasIniciales.length<=ALUMNOS_POR_PAGINA?' hidden':''}>Mostrar 50 más</button>
        </div>
      </div>
    </section>
    <section class="panel-alumnos-vista" id="alumnos-vista-estadisticas" aria-label="Estadísticas de tus alumnos" hidden></section>
    <section class="panel-alumnos-vista" id="alumnos-vista-ramos" aria-label="Ramos de tus alumnos" hidden></section>
    <section class="panel-alumnos-vista" id="alumnos-vista-marcar" aria-label="Marcar evaluaciones" hidden></section>
    <section class="panel-alumnos-vista panel-alumnos-ficha" id="alumnos-vista-ficha" hidden>
      <button type="button" class="agent-refresh panel-alumnos-regresar" id="alumnos-ficha-volver"><span aria-hidden="true">‹</span> Volver a la lista</button>
      <h2 id="alumnos-ficha-titulo"></h2><p class="pe-cabecera-sub" id="alumnos-ficha-subtitulo"></p>
      <div id="alumnos-ficha-compara-wrap" hidden>${comparaPanelHTML(porSeccion)}</div>
      <div id="alumnos-ficha-contenido"></div>
    </section>
    <section class="panel-alumnos-vista panel-alumnos-invitacion" id="alumnos-vista-invitar" hidden>
      <button type="button" class="agent-refresh panel-alumnos-regresar" id="alumnos-invitacion-volver"><span aria-hidden="true">‹</span> Volver a la lista</button>${seccionLink}
    </section>${privacidad}`
      :seccionLink)+
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
  raiz.querySelector('#alumnos-whatsapp')?.addEventListener('click',()=>{if(vigente())track('panel_alumnos_link_compartido',{canal:'whatsapp'});});
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
    ramos:raiz.querySelector('#alumnos-vista-ramos'),marcar:raiz.querySelector('#alumnos-vista-marcar'),ficha,invitar:raiz.querySelector('#alumnos-vista-invitar')};
  const nav=raiz.querySelector('.panel-alumnos-vistas');
  const invitar=raiz.querySelector('#alumnos-ir-invitar');
  const comparaWrap=raiz.querySelector('#alumnos-compara-wrap');
  const avisoPrivacidad=raiz.querySelector('#alumnos-privacidad');
  // Los ramos elegidos en «Por alumno y ramo» duran mientras la pantalla esté
  // abierta: cambiar de vista o de comparación vuelve a pintar y los conserva.
  const estadoEst=estadoEstadisticasPanel();
  const opcionesEst=()=>({seccion:porSeccion,sinSeccion:porSeccion?sinSeccionDe(alumnos):0,soloPruebas:alumnos.some(al=>al.soloPruebasPanel)});
  const repintarEstadisticas=()=>pintarEstadisticasPanel(paneles.estadisticas,estadoEst,opcionesEst());
  const pintarEstadisticas=()=>{estadoEst.datos=datosEstadisticasPanel(alumnos,compDe);if(!estadoEst.datos.hayPercentil)estadoEst.unidad='puntos';repintarEstadisticas();};
  const resumenEstado={ramo:'',orden:'urgencia',dia:0,limite:0};
  const paginaResumen=()=>typeof matchMedia==='function'&&matchMedia('(max-width:600px)').matches?3:6;
  let datosResumen=null,alcanceResumen=null;
  const pintarResumen=(foco='',desplazar=false)=>{
    const ahora=new Date(),hoy=isoOf(ahora.getFullYear(),ahora.getMonth(),ahora.getDate());
    if(datosResumen?.dias[0].fecha!==hoy)
      datosResumen=datosResumenAlumnosPanel(alumnos,datosResumen?filasListaPanel(alumnos,ahora):filasIniciales,ahora);
    alcanceResumen=alcanceResumenAlumnosPanel(datosResumen,resumenEstado);
    paneles.resumen.innerHTML=resumenInicioAlumnosHTML(alcanceResumen,{...resumenEstado,limite:resumenEstado.limite||paginaResumen()});
    if(foco)paneles.resumen.querySelector(foco)?.focus({preventScroll:!desplazar});
  };
  const ramosAbiertos=new Set();
  const pintarRamos=()=>{
    const {seccion,soloPruebas}=opcionesEst();
    const filtros=paneles.ramos.querySelector('[data-ramos-filtros]')?.open||false;
    paneles.ramos.innerHTML=resumenAlumnosPanelHTML(resumenRamosVistaPanel(alumnos,compFicha,{seccion,soloPruebas}),
      {marcar:alumnos.some(al=>al.preparacion?.ramos?.length),seccion,soloPruebas,filtros,abiertos:ramosAbiertos});
  };
  let vista=alumnos,visibles=ALUMNOS_POR_PAGINA,vistaActiva=null,seleccionado=null,botonOrigen=null;
  // Tras un atajo (Ver alumnos en Ramos, una ficha abierta desde Estadísticas)
  // se puede volver a donde se estaba (Salva Ramos, 2026-11-07).
  const NOMBRE_VISTA={resumen:'Resumen',lista:'la lista',estadisticas:'Estadísticas',ramos:'Ramos'};
  let regreso=null,focoRegreso=null;
  const mas=raiz.querySelector('#alumnos-mas');
  // Se filtra en el navegador, con lo que el panel ya bajó.
  const buscar=raiz.querySelector('#alumnos-buscar'),selectorRamo=raiz.querySelector('#alumnos-ramo');
  const filtrar=()=>{
    if(!vigente()||!buscar)return;
    const texto=buscar.value;vista=filtrarAlumnosPanel(alumnos,texto);visibles=ALUMNOS_POR_PAGINA;
    raiz.querySelector('#alumnos-cuenta').textContent=claveEvaluacionPanel(texto)?`${vista.length} de ${alumnos.length}`:String(alumnos.length);
    pintarLista();
  };
  const pintarLista=()=>{
    const todas=filasListaPanel(vista,new Date()),filas=filtrarListaPanel(todas,estadoLista);
    const pestanas=raiz.querySelector('#alumnos-pestanas');if(pestanas)pestanas.innerHTML=pestanasListaHTML(todas,estadoLista);
    const texto=raiz.querySelector('#alumnos-buscar')?.value.trim()||'';
    lista.innerHTML=filas.length?filasListaHTML(filas,visibles)
      :`<p class="profesor-hig-vacio">${texto?`No encontramos alumnos para «${esc(texto)}».`:'Nadie en este grupo.'}</p>`;
    mas.hidden=filas.length<=visibles;
  };
  const enlazarQuitar=()=>fichaContenido.querySelectorAll('[data-quitar-alumno]').forEach(b=>b.addEventListener('click',()=>{if(!vigente()||!puedeSalirFicha())return;showConfirm(`Quitar a ${b.dataset.nombre}`,
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
    if(!puedeSalirFicha())return;
    const al=alumnos.find(x=>x.id===b.dataset.inicioAlumno);
    const r=al&&(al.ramos||[]).find(x=>x.id===b.dataset.inicioRamo);
    if(r)abrirInicioRamo(al,r,()=>{if(vigente())renderAlumnosProfesor(raiz,{volver,alumnoId:al.id});},rpc);
  }));
  let ramoFicha=null,marcarRamo=null;
  let editandoFicha=false;
  const puedeSalirFicha=()=>{if(!editandoFicha&&!(marcarRamo&&filasCambiadasMarcar(marcarRamo).length))return true;showToast('Guarda o cancela las marcas antes de cambiar de alumno, ramo o referencia.',true);return false;};
  const subtituloFicha=al=>`Alumnos · ${TENANTS[al.tenant]?.short||al.tenant||'Universidad no declarada'} · ${(al.ramos||[]).length} ${(al.ramos||[]).length===1?'ramo compartido':'ramos compartidos'}`;
  const pintarFicha=()=>{
    if(!seleccionado)return;
    raiz.querySelector('#alumnos-ficha-titulo').textContent=seleccionado.nombre_visible||'Alumno';
    raiz.querySelector('#alumnos-ficha-subtitulo').textContent=subtituloFicha(seleccionado);
    fichaContenido.innerHTML=contenidoAlumnoEditorialHTML(seleccionado,compFicha,ramoFicha,new Date());
    const pintarRamo=(repintar=true)=>{
      const al=seleccionado,r=(al.ramos||[]).find(r=>r.id===ramoFicha)||(al.ramos||[])[0];
      if(!r)return;ramoFicha=r.id;
      fichaContenido.querySelectorAll('[data-pe-ramo]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.peRamo===String(r.id))));
      const destino=fichaContenido.querySelector('[data-pe-ramo-contenido]');
      if(repintar)destino.innerHTML=ramoAlumnoEditorialHTML(al,r,compFicha(al,r),null,porSeccion,new Date());
      enlazarInicio();enlazarGraficosEvolucion(destino);
      const grupos=destino.querySelector('[data-grupos-parecidos]');
      const mismoRamo=()=>vigente()&&seleccionado===al&&ramoFicha===r.id;
      enlazarPreparacionPanel(destino,al,r,rpc,()=>{if(vigente())pintarFicha();},mismoRamo,{
        alEditar:()=>{editandoFicha=true;if(grupos)grupos.hidden=true;},
        alCancelar:()=>{editandoFicha=false;},
      });
      enlazarGruposParecidos(destino,al,r,rpc,()=>mismoRamo()&&vistaActiva==='ficha'&&!editandoFicha,puedeSalirFicha);
      destino.querySelectorAll('[data-pe-grupo], [data-pe-comparar]').forEach(b=>b.addEventListener('click',async()=>{
        const grupo=b.dataset.peGrupo,quiere=grupo?grupo==='seccion':!porSeccion;
        await cambiarComparacion(quiere);
        const selector=grupo?`[data-pe-grupo="${grupo}"]`:'[data-pe-comparar]';
        if(vigente()&&seleccionado===al)fichaContenido.querySelector(selector)?.focus({preventScroll:true});
      }));
    };
    fichaContenido.querySelectorAll('[data-pe-ramo]').forEach(b=>b.addEventListener('click',()=>{if(!puedeSalirFicha())return;ramoFicha=b.dataset.peRamo;pintarRamo();}));
    const navegacion=fichaContenido.querySelector?.('[data-fap-navegacion]');
    if(navegacion){
      const indice=alumnos.indexOf(seleccionado);
      navegacion.innerHTML=`<div class="fap-paginacion"><span>${indice+1} de ${alumnos.length} alumnos</span><button type="button" data-fap-anterior aria-label="Alumno anterior"${indice===0?' disabled':''}>←</button><button type="button" data-fap-siguiente aria-label="Alumno siguiente"${indice===alumnos.length-1?' disabled':''}>→</button></div>`;
      // Sin «Cambiar alumno»: la lista está a un toque, en Volver (Salva Ramos, 2026-11-07).
      const ir=al=>{if(al&&puedeSalirFicha()){seleccionado=al;ramoFicha=null;pintarFicha();activarVista('ficha');raiz.querySelector('#alumnos-ficha-volver')?.focus?.();}};
      navegacion.querySelector('[data-fap-anterior]')?.addEventListener('click',()=>ir(alumnos[indice-1]));
      navegacion.querySelector('[data-fap-siguiente]')?.addEventListener('click',()=>ir(alumnos[indice+1]));
    }
    pintarRamo(false);enlazarQuitar();
  };
  const activarVista=(nombre,desde=null)=>{
    if(!vigente()||(nombre!=='ficha'&&!puedeSalirFicha()))return;
    if(!paneles[nombre]||(nombre==='ramos'&&alumnos.length<2))nombre='resumen';
    // Otra vista parte arriba: la barra lateral la cambiaba y la página quedaba
    // a media altura, mostrando el medio de algo nuevo.
    if(nombre!==vistaActiva){const caja=typeof raiz.closest==='function'&&raiz.closest('.scroll');if(caja)caja.scrollTop=0;
      regreso=NOMBRE_VISTA[desde]?desde:null;}
    vistaActiva=nombre;
    raiz.querySelector('#alumnos-regreso').hidden=!regreso||['ficha','invitar','marcar'].includes(nombre);
    ['#alumnos-regreso','#alumnos-ficha-volver'].forEach(id=>{raiz.querySelector(id).innerHTML=`<span aria-hidden="true">‹</span> Volver a ${NOMBRE_VISTA[regreso||'lista']}`;});
    const cabecera=cabeceraPantalla;
    if(cabecera){
      cabecera.textContent=nombre==='ficha'?(seleccionado?.nombre_visible||'Alumno'):'Alumnos';
      if(typeof cabecera.parentElement?.classList?.toggle==='function')cabecera.parentElement.classList.toggle('pe-alumno-cabecera',nombre==='ficha');
      if(nombre==='ficha')cabecera.innerHTML=`<span class="pe-cabecera-nombre">${esc(seleccionado?.nombre_visible||'Alumno')}</span><span class="pe-cabecera-sub">${esc(subtituloFicha(seleccionado))}</span>`;
      raiz.querySelector('#alumnos-ficha-titulo').hidden=true;
      raiz.querySelector('#alumnos-ficha-subtitulo').hidden=true;
    }

    Object.entries(paneles).forEach(([clave,panel])=>{panel.hidden=clave!==nombre;});
    nav.hidden=nombre==='ficha'||nombre==='invitar'||nombre==='marcar';
    raiz.querySelector('#alumnos-cabecera').hidden=nav.hidden;
    raiz.querySelector('#alumnos-vista-titulo').textContent=({resumen:'Resumen',lista:'Tus alumnos',estadisticas:'Estadísticas',ramos:'Por ramo'})[nombre]||'';
    // Estadísticas conserva el control general oculto. Ramos y la ficha
    // tienen sus propios controles de comparación.
    comparaWrap.hidden=nombre!=='estadisticas';
    const caja=raiz.querySelector('.alumnos-editorial');if(typeof caja?.classList?.toggle==='function'){caja.classList.toggle('panel-en-estadisticas',nombre==='estadisticas');caja.classList.toggle('panel-en-lista',nombre==='lista'||nombre==='invitar'||nombre==='marcar');caja.classList.toggle('panel-en-ramos',nombre==='ramos');caja.classList.toggle('panel-en-resumen',nombre==='resumen');};
    avisoPrivacidad.hidden=nombre==='invitar'||nombre==='resumen'||nombre==='ramos'||nombre==='marcar';
    nav.querySelectorAll('[data-panel-vista]').forEach(b=>{
      b.setAttribute('aria-pressed',String(b.dataset.panelVista===nombre));
      if(b.dataset.panelVista===nombre&&typeof b.scrollIntoView==='function')b.scrollIntoView({block:'nearest',inline:'nearest'});
    });
    if(nombre==='resumen')pintarResumen();
    if(nombre==='estadisticas')pintarEstadisticas();
    if(nombre==='ramos')pintarRamos();
    if(typeof marcarVistaNav==='function')marcarVistaNav('alumnos',nombre==='ficha'||nombre==='invitar'?'lista':nombre,
      nombre==='ficha'?'ficha:'+seleccionado?.id:nombre==='marcar'&&marcarRamo?'marcar:'+marcarRamo.clave:nombre);
  };
  if(typeof vistasPanelNav!=='undefined')vistasPanelNav.alumnos=v=>{if(vigente())irAVista(v);};
  const abrirFicha=(al,origen)=>{
    if(!vigente())return;
    if(!puedeSalirFicha())return;
    seleccionado=al;botonOrigen=origen||null;ramoFicha=origen?.dataset.alumnoRamo||null;pintarFicha();activarVista('ficha',vistaActiva);
    const regresar=raiz.querySelector('#alumnos-ficha-volver');
    if(typeof regresar.focus==='function')regresar.focus({preventScroll:true});
    const scroll=raiz.closest?.('.scroll');if(scroll)scroll.scrollTop=0;
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
    if(!puedeSalirFicha())return;
    const id=seleccionado&&String(seleccionado.id),destino=regreso||'lista';
    activarVista(destino);seleccionado=null;
    const fila=[...paneles[destino].querySelectorAll('[data-ver-alumno]')].find(b=>b.dataset.verAlumno===id);
    const foco=fila||(botonOrigen?.isConnected!==false?botonOrigen:null)||raiz.querySelector('#alumnos-buscar')||invitar;
    if(typeof foco.focus==='function')foco.focus();
  });
  raiz.querySelector('#alumnos-regreso').addEventListener('click',()=>{
    if(!vigente()||!regreso)return;
    const destino=regreso,selector=focoRegreso;activarVista(destino);
    if(vistaActiva===destino&&selector)paneles[destino].querySelector(selector)?.focus?.();
  });
  // El Resumen y Estadísticas abren la ficha de quien se toque; Ramos lleva a
  // la Lista filtrada por ese ramo.
  const comillas=t=>String(t).replace(/["\\]/g,'\\$&');
  const alTocar=e=>{
    if(!vigente()||!e.target||typeof e.target.closest!=='function')return;
    const ir=e.target.closest('[data-ir-vista]');
    if(ir){focoRegreso=`[data-ir-vista="${comillas(ir.dataset.irVista)}"]`;activarVista(ir.dataset.irVista,vistaActiva);return;}
    const ramo=e.target.closest('[data-ver-ramo]');
    if(ramo&&buscar){focoRegreso=`[data-ver-ramo="${comillas(ramo.dataset.verRamo)}"]`;
      estadoLista.tab='todos';estadoLista.ramo='';if(selectorRamo)selectorRamo.value='';buscar.value=ramo.dataset.verRamo;filtrar();activarVista('lista',vistaActiva);return;}
    const b=e.target.closest('[data-ver-alumno]');if(!b)return;
    const al=alumnos.find(x=>String(x.id)===b.dataset.verAlumno);
    if(al)abrirFicha(al,b);
  };
  paneles.resumen.addEventListener('change',e=>{
    if(!vigente())return;
    const d=e.target.dataset;
    if(d.rasRamo!==undefined){resumenEstado.ramo=e.target.value;resumenEstado.limite=0;pintarResumen('[data-ras-ramo]');}
    if(d.rasOrden!==undefined){resumenEstado.orden=e.target.value;resumenEstado.limite=0;pintarResumen('[data-ras-orden]');}
    if(d.rasDia!==undefined){resumenEstado.dia=Number(e.target.value);pintarResumen('[data-ras-dia]');}
  });
  paneles.resumen.addEventListener('click',e=>{
    if(!vigente()||typeof e.target?.closest!=='function')return;
    const b=e.target.closest('button'),d=b?.dataset||{};
    if(d.rasColumna!==undefined){resumenEstado.dia=Number(d.rasColumna);return pintarResumen(`[data-ras-columna="${resumenEstado.dia}"]`);}
    if(d.rasMas!==undefined){
      const antes=resumenEstado.limite||paginaResumen();resumenEstado.limite=antes+paginaResumen();
      return pintarResumen(`.ras-tarjeta:first-child .ras-lista li:nth-child(${antes+1}) button`,true);
    }
    if(d.rasGrupo!==undefined){
      const grupo=gruposResumenAlumnosPanel(alcanceResumen.dias[resumenEstado.dia].evaluaciones)[Number(d.rasGrupo)];
      if(!grupo)return;
      const modal=document.getElementById('modal-content');
      modal.innerHTML=alumnosDiaResumenHTML(grupo);openModal();
      modal.querySelectorAll('[data-ver-alumno]').forEach(fila=>fila.addEventListener('click',()=>{
        if(!vigente())return;
        const al=alumnos.find(x=>String(x.id)===fila.dataset.verAlumno);
        if(al){closeModal();abrirFicha(al,fila);}
      }));
      return;
    }
    alTocar(e);
  });
  const aplicarSoloPruebas=quiere=>{
    const solo=raiz.querySelector('[data-solo-pruebas]');
    if(solo&&solo.checked!==quiere){solo.checked=quiere;solo.dispatchEvent(new Event('change',{bubbles:true}));}
  };
  const abrirMarcar=clave=>{
    if(!puedeSalirFicha())return;
    marcarRamo=modeloMarcarPanel(alumnos,clave);
    paneles.marcar.innerHTML=marcarRamoHTML(marcarRamo);
    const salir=()=>{marcarRamo=null;paneles.marcar.innerHTML='';activarVista('ramos');};
    enlazarMarcarPanel(paneles.marcar,marcarRamo,{rpc,vigente,alGuardar:salir,alVolver:()=>{
      if(!filasCambiadasMarcar(marcarRamo).length)return salir();
      showConfirm('¿Salir sin guardar?','Se pierden las marcas que cambiaste en este ramo.',salir,{label:'Salir',danger:false,focusCancel:true});
    }});
    activarVista('marcar');
  };
  // Lo que pide la barra o Atrás del navegador: una vista, o la ficha o el
  // marcado de un ramo que guardó la historia («ficha:<id>», «marcar:<clave>»).
  const irAVista=v=>{
    const i=String(v).indexOf(':'),nombre=i<0?String(v):v.slice(0,i),arg=i<0?'':v.slice(i+1);
    if(nombre==='ficha'){const al=alumnos.find(x=>String(x.id)===arg);if(al)return abrirFicha(al);return activarVista('lista');}
    if(nombre==='marcar')return arg&&modeloMarcarPanel(alumnos,arg).filas.length?abrirMarcar(arg):activarVista('ramos');
    activarVista(nombre);
  };
  paneles.ramos.addEventListener('click',async e=>{
    const marcarBoton=vigente()&&e.target?.closest?.('[data-marcar-ramo]');
    if(marcarBoton)return abrirMarcar(marcarBoton.dataset.marcarRamo);
    if(!vigente()||typeof e.target?.closest!=='function')return;
    const abrir=e.target.closest('[data-ramos-abrir]');
    if(abrir){
      const clave=abrir.dataset.ramosAbrir,abierto=!ramosAbiertos.has(clave);
      if(abierto)ramosAbiertos.add(clave);else ramosAbiertos.delete(clave);
      abrir.setAttribute('aria-expanded',String(abierto));
      abrir.closest('[data-ramos-fila]').querySelector('.ramos-detalle').hidden=!abierto;
      return;
    }
    const filtro=e.target.closest('[data-est-comparar], [data-est-solo]');
    if(!filtro)return alTocar(e);
    const {estComparar,estSolo}=filtro.dataset;
    const selector=estComparar?`[data-est-comparar="${estComparar}"]`:`[data-est-solo="${estSolo}"]`;
    if(estComparar){
      if((estComparar==='seccion')===porSeccion)return;
      const controles=[...paneles.ramos.querySelectorAll('[data-est-comparar], [data-est-solo]')];
      controles.forEach(b=>b.disabled=true);
      try{await cambiarComparacion(estComparar==='seccion');}
      finally{controles.forEach(b=>b.disabled=false);}
    }else aplicarSoloPruebas(estSolo==='1');
    if(vigente()&&vistaActiva==='ramos')paneles.ramos.querySelector(selector)?.focus({preventScroll:true});
  });
  // Sección y Solo pruebas siguen usando los controles de siempre, que en esta
  // vista quedan ocultos detrás de Filtros.
  paneles.estadisticas.addEventListener('click',e=>{
    if(!vigente()||!e.target||typeof e.target.closest!=='function')return;
    const accion=tocarEstadisticasPanel(e,estadoEst);
    // «Por completar» filtra la lista de abajo; sin bajar hasta ella parecía
    // que no hacía nada (Salva Ramos, 2026-11-07).
    const porCompletar=e.target.closest('.est-tarjeta-boton');
    if(accion==='pintar'){repintarEstadisticas();
      if(porCompletar){paneles.estadisticas.querySelector('.est-lista')?.scrollIntoView?.({block:'start'});
        paneles.estadisticas.querySelector('.est-tabs [data-est-tab="sin"]')?.focus({preventScroll:true});}
      return;}
    if(accion?.startsWith('comparar:'))return cambiarComparacion(accion==='comparar:seccion');
    if(accion?.startsWith('solo:'))return aplicarSoloPruebas(accion==='solo:1');
    alTocar(e);
  });
  paneles.estadisticas.addEventListener('input',e=>{
    if(!vigente()||e.target?.dataset?.estBuscar===undefined)return;
    estadoEst.texto=e.target.value;estadoEst.vistos=EST_FILAS;
    const filas=paneles.estadisticas.querySelector('#est-filas');if(filas)filas.innerHTML=filasEstadisticasHTML(estadoEst.datos,estadoEst,opcionesEst());
  });
  paneles.estadisticas.addEventListener('keydown',e=>{if(vigente()&&e.key==='Escape'&&estadoEst.filtros){estadoEst.filtros=false;repintarEstadisticas();}});
  lista.addEventListener('click',e=>{
    if(!vigente())return;
    const b=e.target.closest('[data-ver-alumno]');if(!b)return;
    const al=vista.find(x=>String(x.id)===b.dataset.verAlumno);
    if(al)abrirFicha(al,b);
  });
  mas.addEventListener('click',()=>{if(!vigente())return;visibles+=ALUMNOS_POR_PAGINA;pintarLista();});
  if(buscar)buscar.addEventListener('input',filtrar);
  raiz.querySelector('#alumnos-pestanas')?.addEventListener('click',e=>{
    const b=vigente()&&e.target?.closest?.('[data-lista-tab]');if(!b)return;
    estadoLista.tab=b.dataset.listaTab;visibles=ALUMNOS_POR_PAGINA;pintarLista();
    raiz.querySelector(`[data-lista-tab="${estadoLista.tab}"]`)?.focus?.();
  });
  selectorRamo?.addEventListener('change',()=>{if(!vigente())return;estadoLista.ramo=selectorRamo.value;visibles=ALUMNOS_POR_PAGINA;pintarLista();});
  // Cambiar la comparación vuelve a pintar los alumnos y el grupo con lo ya bajado.
  const controles=['#alumnos-compara-wrap','#alumnos-ficha-compara-wrap']
    .map(sel=>raiz.querySelector(`${sel} .panel-alumnos-compara`)).filter(Boolean);
  const botones=controles.flatMap(c=>[...c.querySelectorAll('[data-compara]')]);
  const cambiarComparacion=async quiere=>{
    if(!vigente()||quiere===porSeccion||!puedeSalirFicha())return;
    botones.forEach(x=>{x.disabled=true;});
    fichaContenido.querySelectorAll('[data-pe-grupo], [data-pe-comparar]').forEach(b=>{b.disabled=true;});
    const editar=[...fichaContenido.querySelectorAll('[data-fap-editar], [data-preparacion-auto]')];editar.forEach(b=>b.disabled=true);
    if(quiere)await cargarSecciones();
    if(!vigente())return;
    editar.forEach(b=>b.disabled=false);
    porSeccion=quiere;guardarComparaSeccion(quiere);
    botones.forEach(x=>{x.disabled=false;x.setAttribute('aria-pressed',String((x.dataset.compara==='seccion')===porSeccion));});
    pintarLista();
    if(vistaActiva==='ficha'){
      const abiertos=new Map([...fichaContenido.querySelectorAll('details[data-ramo]')].map(d=>[d.dataset.ramo,d.open]));
      pintarFicha();fichaContenido.querySelectorAll('details[data-ramo]').forEach(d=>{
        if(abiertos.has(d.dataset.ramo))d.open=abiertos.get(d.dataset.ramo);
      });
    }
    if(vistaActiva==='estadisticas')pintarEstadisticas();
    if(vistaActiva==='ramos')pintarRamos();
    track('panel_alumnos_compara',{seccion:quiere});
  };
  botones.forEach(b=>b.addEventListener('click',()=>cambiarComparacion(b.dataset.compara==='seccion')));
  raiz.querySelector('[data-solo-pruebas]')?.addEventListener('change',evento=>{if(!vigente())return;alumnos.forEach(al=>{al.soloPruebasPanel=evento.target.checked;});if(seleccionado)seleccionado.soloPruebasPanel=evento.target.checked;vista=filtrarAlumnosPanel(alumnos,buscar.value);raiz.querySelector('[data-solo-pruebas-estado]').textContent=evento.target.checked?alumnos.flatMap(al=>al.ramos||[]).reduce((s,r)=>s+promedioPruebasPanel(r).sinClasificar,0)+' categorías sin clasificación quedan fuera. Se excluyen también laboratorios, tareas y otros tipos declarados.':'';pintarLista();if(vistaActiva==='ficha')pintarFicha();else activarVista(vistaActiva);});
  const fichaInicial=alumnoId&&alumnos.find(x=>String(x.id)===String(alumnoId));
  if(fichaInicial)abrirFicha(fichaInicial);else irAVista(vistaInicial);
  // Exporta todos los que calzan con la búsqueda, en el orden de la lista: el
  // "Mostrar 50 más" es para no pintar 300 filas, no para recortar la planilla
  // (Salva Ramos pidió el desglose de todos sus alumnos). Antes de crear el
  // archivo, recuerda lo que el profesor aceptó en los términos.
  const exportar=raiz.querySelector('#alumnos-exportar');
  if(exportar)exportar.addEventListener('click',async()=>{
    if(!vigente())return;
    const paraExportar=alumnosDeFilasPanel(filtrarListaPanel(filasListaPanel(vista,new Date()),estadoLista)).map(al=>({...al,soloPruebasPanel:false}));
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
