// El token vive en el llavero del iPhone, separado por cuenta de GradeHub. El
// puente manda siempre la cuenta con sesión y descarta respuestas si la cuenta
// o el estado cambiaron mientras Canvas respondía.
function pluginCanvas(){
  const cap=typeof window!=='undefined'&&window.Capacitor;
  const nativo=enAppNativa()&&cap?.Plugins?.GradeHubCanvas;
  const cuenta=typeof currentUser!=='undefined'&&currentUser?.id,estado=S;
  if(!nativo||!cuenta)return null;
  const invocar=async(metodo,args={})=>{
    const respuesta=await nativo[metodo]({...args,cuenta});
    if(currentUser?.id!==cuenta||S!==estado)throw new Error('Cambió la cuenta de GradeHub.');
    return respuesta;
  };
  return {estado:()=>invocar('estado'),conectar:args=>invocar('conectar',args),get:args=>invocar('get',args),desconectar:()=>invocar('desconectar'),
    archivosCurso:args=>invocar('archivosCurso',args),leerArchivo:args=>invocar('leerArchivo',args)};
}
// Al cerrar sesión, borrar la cuenta o reiniciar la app, el token de Canvas
// de esa cuenta sale del llavero (auditoría App Store #1193). Se llama ANTES de
// cerrar la sesión: el plugin necesita la cuenta para saber qué token borrar.
// No espera a Canvas ni falla: es solo borrar del llavero de este iPhone.
async function olvidarCanvasCuenta(){
  try{const p=pluginCanvas();if(p)await p.desconectar();}catch(e){}
  if(typeof lecturaCanvasInicio!=='undefined')lecturaCanvasInicio=null;
  if(typeof entradaNotaInicio!=='undefined')entradaNotaInicio=null;
  if(typeof canvasPesosRamo!=='undefined')canvasPesosRamo.clear();
  if(typeof propuestasDocenciaCanvas!=='undefined')propuestasDocenciaCanvas.clear();
  if(typeof equipoDocenciaCanvas!=='undefined')equipoDocenciaCanvas.clear();
  if(typeof revisionDocenciaCanvas!=='undefined')revisionDocenciaCanvas=null;
  if(typeof canvasProgramaRamo!=='undefined')canvasProgramaRamo.clear();
}
function canvasDisponible(){return !esCuentaProfesor()&&S.tenant==='uc'&&!!pluginCanvas();}
// La sección Canvas de Ajustes y su fila en Perfil: en la app, el conector;
// en la web, el calendario de Canvas (.ics).
function canvasSeccionDisponible(){return canvasDisponible()||(typeof canvasIcsDisponible==='function'&&canvasIcsDisponible());}
const TOKEN_CANVAS_RE=/^[0-9]{1,8}~[A-Za-z0-9]{20,100}$/;
const CODIGO_CANVAS_RE=/^([A-Z]{3,4}[0-9]{3,4}[A-Z]?)-([0-9]{1,3})$/;
function cursosCanvasDelSemestre(cursos,ahora){
  ahora=ahora||new Date();
  const anio=String(ahora.getFullYear()),parte=ahora.getMonth()>=6?'segundo':'primer';
  const conCodigo=(Array.isArray(cursos)?cursos:[]).map(c=>{
    const m=CODIGO_CANVAS_RE.exec(String(c&&c.course_code||'').trim().toUpperCase());
    const id=Number(c&&c.id);
    return m&&Number.isSafeInteger(id)&&id>0
      ?{id,sigla:m[1],seccion:Number(m[2]),nombre:c.name||'',periodo:normName((c.term&&c.term.name)||''),usaPesos:c.apply_assignment_group_weights===true}:null;
  }).filter(Boolean);
  const actuales=conCodigo.filter(c=>c.periodo.includes(anio)&&c.periodo.includes(parte));
  return actuales.length?actuales:conCodigo.filter(c=>c.periodo.includes(anio));
}
function avisoCanvas(texto,error){
  const el=document.querySelector('#modal.open #s-canvas-estado');
  if(el){el.textContent=texto;el.classList.toggle('es-error',!!error);}
  else if(texto)showToast(texto,!!error);
}
function iconoAjustesCanvas(trazo,clase=''){
  return `<svg class="ic ${clase}" viewBox="0 0 24 24" aria-hidden="true">${trazo}</svg>`;
}
const ACCIONES_CANVAS={
  ramos:{titulo:'Traer mis ramos',detalle:'Agrega los que te faltan',icono:'academico',importar:traerRamosCanvas},
  fechas:{titulo:'Traer fechas',detalle:'Tareas, eventos y anuncios',icono:'calendario',importar:traerFechasCanvas},
  notas:{titulo:'Traer notas',detalle:'Calificaciones publicadas',icono:'ficha',importar:traerNotasCanvas}
};
const AVISO_AJUSTES_CANVAS='<p class="canvas-aviso" id="s-canvas-estado" role="status" aria-atomic="true"></p>';
function formularioConexionCanvas(caja,accion){
  caja.innerHTML=`<form class="canvas-token" onsubmit="event.preventDefault();conectarCanvas()">
    <h3 id="s-canvas-titulo">${ACCIONES_CANVAS[accion]?.titulo||'Conectar Canvas'}</h3>
    <p id="s-canvas-ayuda">Para continuar, pega tu token de Canvas UC autorizado para GradeHub.</p>
    <label for="s-canvas-token">Token de acceso</label>
    <input type="password" id="s-canvas-token" autocomplete="off" autocapitalize="none" autocorrect="off" spellcheck="false" enterkeyhint="go"
      placeholder="Pega el token de Canvas" aria-describedby="s-canvas-ayuda s-canvas-privacidad s-canvas-estado"/>
    ${AVISO_AJUSTES_CANVAS}
    <p id="s-canvas-privacidad">El token queda solo en el llavero de este iPhone. Podrás volver a usar Canvas sin pegarlo otra vez.</p>
    <button type="submit" class="btn-confirm canvas-conectar" id="s-canvas-conectar">${accion?'Conectar y continuar':'Conectar Canvas'}</button>
    <button type="button" class="btn-cancel" onclick="this.form.reset();this.form.remove();pintarCanvasAjustes({enfocar:true})">Volver</button>
  </form>`;
  caja.dataset.accionCanvas=accion||'';
  caja.querySelector('#s-canvas-token').focus();
}
async function pintarCanvasAjustes({enfocar=false,accion}={}){
  const caja=document.getElementById('s-canvas');
  const plugin=canvasDisponible()&&pluginCanvas();
  if(!caja||!plugin)return;
  const cuenta=currentUser.id,estado=S;
  const vigente=()=>!!caja.closest('#modal.open')&&currentUser?.id===cuenta&&S===estado;
  let conectado;
  try{conectado=(await plugin.estado()).conectado;}
  catch(e){
    if(!vigente())return;
    caja.innerHTML=`<div class="canvas-aviso es-error" role="status">No pudimos revisar la conexión en este dispositivo.</div>
      <button type="button" class="btn-confirm canvas-conectar">Volver a intentar</button>`;
    const reintento=caja.querySelector('button');
    reintento.onclick=()=>{reintento.disabled=true;pintarCanvasAjustes({enfocar:true,accion});};
    return;
  }
  if(!vigente())return;
  if(!conectado&&accion&&Object.hasOwn(ACCIONES_CANVAS,accion)){formularioConexionCanvas(caja,accion);return;}
  caja.innerHTML=`<div class="canvas-cabecera">
    <span class="canvas-marca">${iconoAjustesCanvas(ICONO_CANVAS)}</span>
    <div><h3 id="s-canvas-titulo" tabindex="-1">${conectado?'Canvas conectado':'Canvas UC'}</h3>
      <p>${conectado?'Acceso guardado en este dispositivo.':'Elige qué quieres traer. Te pediremos el token para conectar Canvas.'}</p></div>
    </div>
    <section class="canvas-importar" aria-labelledby="s-canvas-importar">
      <h4 id="s-canvas-importar">Importar a GradeHub</h4>
      <p>Revisa las propuestas antes de guardarlas.</p>
      <div class="canvas-filas">${Object.entries(ACCIONES_CANVAS).map(([clave,a])=>`
        <button type="button" class="canvas-fila" data-canvas-importar="${clave}">
          ${iconoAjustesCanvas(PERFIL_ICONOS[a.icono],'canvas-fila-icono')}
          <span><strong>${a.titulo}</strong><small>${a.detalle}</small></span>
          ${iconoAjustesCanvas('<path d="m9 6 6 6-6 6"/>','canvas-fila-flecha')}
        </button>`).join('')}</div>
    </section>${AVISO_AJUSTES_CANVAS}
    ${conectado?'<button type="button" class="canvas-desconectar" id="s-canvas-desconectar">Desconectar Canvas</button>':'<button type="button" class="btn-cancel" id="s-canvas-solo-conectar">Solo conectar Canvas</button>'}`;
  for(const boton of caja.querySelectorAll('[data-canvas-importar]')){
    const clave=boton.dataset.canvasImportar;
    boton.onclick=()=>conectado?ejecutarImportacionCanvas(boton,ACCIONES_CANVAS[clave].importar):formularioConexionCanvas(caja,clave);
  }
  const desconectar=caja.querySelector('#s-canvas-desconectar');
  if(desconectar)desconectar.onclick=()=>{if(desconectar.getAttribute('aria-disabled')!=='true')desconectarCanvas();};
  const soloConectar=caja.querySelector('#s-canvas-solo-conectar');
  if(soloConectar)soloConectar.onclick=()=>formularioConexionCanvas(caja,'');
  if(enfocar)caja.querySelector('#s-canvas-titulo').focus({preventScroll:true});
  if(conectado&&accion&&Object.hasOwn(ACCIONES_CANVAS,accion)){
    const boton=caja.querySelector(`[data-canvas-importar="${accion}"]`);
    await ejecutarImportacionCanvas(boton,ACCIONES_CANVAS[accion].importar);
  }
}
async function ejecutarImportacionCanvas(boton,importar){
  if(boton.getAttribute('aria-disabled')==='true')return;
  const caja=boton.closest('#s-canvas'),estado=S,cuenta=currentUser.id;
  const acciones=caja.querySelectorAll('[data-canvas-importar],.canvas-desconectar');
  acciones.forEach(b=>b.setAttribute('aria-disabled','true'));
  boton.setAttribute('data-canvas-buscando','');
  try{await importar(()=>!!boton.closest('#modal.open')&&S===estado&&currentUser?.id===cuenta);}
  finally{
    boton.removeAttribute('data-canvas-buscando');
    acciones.forEach(b=>b.removeAttribute('aria-disabled'));
  }
}
async function estadoConexionCanvas(){
  try{return (await pluginCanvas()?.estado())?.conectado;}
  catch(e){return undefined;}
}
async function avisarErrorLecturaCanvas(error,mensaje){
  const codigo=Number(error?.code);
  if(codigo===429){avisoCanvas('Canvas recibió muchas consultas. Espera un momento y vuelve a intentar.',true);return;}
  if(codigo!==401){avisoCanvas(mensaje,true);return;}
  const caja=document.querySelector('#modal.open #s-canvas');
  const cuenta=currentUser?.id,estado=S;
  const conectado=await estadoConexionCanvas();
  if(cuenta!==currentUser?.id||estado!==S)return;
  if(caja&&!caja.closest?.('#modal.open'))return;
  if(conectado!==false){avisoCanvas(conectado?'Canvas no dio acceso a esos datos.':mensaje,true);return;}
  if(caja)formularioConexionCanvas(caja,caja.querySelector('[data-canvas-buscando]')?.dataset.canvasImportar);
  if(!caja||caja.closest?.('#modal.open'))avisoCanvas('El acceso de Canvas venció o fue revocado. Si tienes un acceso autorizado vigente, vuelve a conectar Canvas.',true);
}
async function falloLecturaOpcionalCanvas(error){
  const codigo=Number(error?.code);
  // Canvas usa 401 tanto para falta de permiso como para una credencial
  // inválida. El puente ya comprobó si sigue vigente antes de retirarla.
  return codigo===429||(codigo===401&&!(await estadoConexionCanvas()));
}
async function conectarCanvas(){
  if(!canvasDisponible())return;
  const campo=document.getElementById('s-canvas-token'),boton=document.getElementById('s-canvas-conectar');
  if(!campo?.closest('#modal.open')||!boton||boton.disabled)return;
  const caja=campo.closest('#s-canvas'),accion=caja.dataset.accionCanvas;
  const cuenta=currentUser.id,estado=S;
  const vigente=()=>!!campo.closest('#modal.open')&&currentUser?.id===cuenta&&S===estado;
  const token=campo.value.trim();
  if(!TOKEN_CANVAS_RE.test(token)){
    campo.setAttribute('aria-invalid','true');
    campo.focus();
    avisoCanvas('Copia el token completo de Canvas, incluido el número, la ~ y lo que sigue.',true);
    return;
  }
  campo.removeAttribute('aria-invalid');
  campo.readOnly=true;
  boton.disabled=true;boton.textContent='Conectando…';
  avisoCanvas('Revisando el token con Canvas…');
  try{
    await pluginCanvas().conectar({token});
    if(typeof lecturaCanvasInicio!=='undefined')lecturaCanvasInicio=null;
    campo.value='';
    if(!vigente())return;
    track('canvas_conectado');
  }catch(e){
    if(!vigente())return;
    campo.readOnly=false;
    boton.disabled=false;boton.textContent=accion?'Conectar y continuar':'Conectar Canvas';
    const codigo=String(e?.code);
    if(codigo==='401'){campo.value='';campo.setAttribute('aria-invalid','true');campo.focus();}
    const mensajes={'401':'Canvas rechazó el token. Pega uno vigente para continuar.','403':'Canvas no autorizó el acceso con esta cuenta.',
      '429':'Canvas recibió muchas consultas. Espera un momento y vuelve a intentar.','0':'No pudimos llegar a Canvas. Revisa tu conexión y vuelve a intentar.'};
    avisoCanvas(mensajes[codigo]||'No pudimos conectar Canvas. Inténtalo de nuevo.',true);
    return;
  }
  await pintarCanvasAjustes({enfocar:true,accion});
}
function desconectarCanvas(){
  if(!canvasDisponible())return;
  const plugin=pluginCanvas(),estado=S,cuenta=currentUser.id;
  const vigente=()=>S===estado&&currentUser?.id===cuenta;
  showConfirm('Desconectar Canvas','Borraremos el token de este iPhone. Tus ramos y fechas no cambian.',async()=>{
    if(!vigente())return;
    try{
      await plugin.desconectar();
      if(!vigente())return;
      if(typeof lecturaCanvasInicio!=='undefined')lecturaCanvasInicio=null;
      if(typeof entradaNotaInicio!=='undefined')entradaNotaInicio=null;
      propuestasDocenciaCanvas.clear();equipoDocenciaCanvas.clear();revisionDocenciaCanvas=null;
      canvasPesosRamo.clear();canvasProgramaRamo.clear();
      track('canvas_desconectado');
      await pintarCanvasAjustes({enfocar:true});
    }catch(e){if(vigente())avisoCanvas('No pudimos desconectar Canvas. Inténtalo de nuevo.',true);}
  },{label:'Desconectar',focusCancel:true});
}
async function canvasGet(path,params){
  if(!canvasDisponible())throw new Error('Canvas no disponible');
  const r=await pluginCanvas().get({path,params:params||{}});
  return r&&r.data;
}
async function cursosCanvas(){
  return cursosCanvasDelSemestre(await canvasGet('courses',{enrollment_state:'active','include[]':['term'],per_page:50}));
}
async function traerRamosCanvas(vistaVigente=()=>true){
  if(!canvasDisponible())return;
  avisoCanvas('Buscando tus ramos en Canvas…');
  const ctx={estado:S,cuenta:currentUser?.id,periodo:semester(),tenant:S.tenant};
  let cursos;
  try{cursos=await cursosCanvas();}
  catch(e){if(vistaVigente())await avisarErrorLecturaCanvas(e,'No pudimos leer tus ramos. Revisa la conexión e inténtalo de nuevo.');return;}
  if(!vistaVigente())return;
  if(!await leerDocenciaCanvas(cursos,ctx)||!vistaVigente())return;
  const tienes=new Set((S.ramos||[]).map(siglaRamoCanvas).filter(Boolean));
  const faltan=cursos.filter(c=>!tienes.has(c.sigla));
  track('canvas_ramos',{encontrados:cursos.length,faltan:faltan.length});
  if(!cursos.length){avisoCanvas('No encontramos ramos de este semestre en Canvas.');return;}
  if(!faltan.length){avisoCanvas('Ya tienes todos esos ramos.');abrirRevisionDocenciaCanvas();return;}
  _horarioTextoPegado=faltan.map(c=>`${c.sigla}-${c.seccion}`).join(', ');
  abrirImportarHorarioBuscacursos(true);
  await reconocerHorarioBuscacursos();
}
// Por qué no hubo propuestas, en palabras: así se entiende un Canvas vacío.
function explicarConteosCanvas(c,ramos){
  if(!ramos)return 'Ninguno de tus ramos de Canvas está en GradeHub. Agrégalos con «Traer mis ramos».';
  if(!c.total)return 'Tus cursos en Canvas no tienen tareas ni eventos con fecha.';
  const partes=[];
  if(c.pasadas)partes.push(c.pasadas+(c.pasadas===1?' ya pasó':' ya pasaron'));
  if(c.sinFecha)partes.push(c.sinFecha+' sin fecha');
  if(c.noEvaluacion)partes.push(c.noEvaluacion+(c.noEvaluacion===1?' no es evaluación':' no son evaluaciones'));
  return 'Revisamos '+c.tareas+' tarea'+(c.tareas===1?'':'s')+' y '+c.eventos+' evento'+(c.eventos===1?'':'s')+(partes.length?': '+partes.join(', ')+'.':', sin fechas nuevas.');
}
function isoMasDiasCanvas(ahora,dias){
  const d=new Date(ahora.getTime()+dias*864e5);
  return fechaChileCanvas(d);
}
async function traerFechasCanvas(vistaVigente=()=>true){
  if(!canvasDisponible())return;
  avisoCanvas('Buscando fechas en Canvas…');
  let propuestas=[],ramos=0,anunciosSinLeer=0,eventosSinLeer=0;
  const estado=S,cuenta=currentUser?.id||null;
  const ctx={estado,cuenta:currentUser?.id,periodo:semester(),tenant:S.tenant};
  // La revisión de sección y equipo reemplaza la vista de Ajustes: después de
  // ella solo se exige la misma cuenta, estado, período y universidad.
  const sigueCuenta=()=>S===estado&&(currentUser?.id||null)===cuenta&&semester()===ctx.periodo&&S.tenant===ctx.tenant;
  const vigente=()=>vistaVigente()&&sigueCuenta();
  const lecturas=[];
  contextoFechasCanvas=null;avisoAnunciosCanvas='';
  const conteos={total:0,tareas:0,eventos:0,sinFecha:0,pasadas:0,duplicadas:0,sinDestino:0,noEvaluacion:0};
  try{
    const cursos=await cursosCanvas(),ahora=new Date();
    if(!await leerDocenciaCanvas(cursos,ctx))return;
    for(const c of cursos){
      if(!vigente())return;
      const ramo=(estado.ramos||[]).find(r=>cursoCanvasParaRamo(r,cursos)?.id===c.id);
      if(!ramo)continue;
      ramos++;
      const tareas=await canvasGet(`courses/${c.id}/assignments`,{bucket:'future',per_page:100});
      // Sin fechas, Canvas devuelve solo los eventos de hoy.
      let eventos=[];
      try{
        eventos=await canvasGet('calendar_events',{'context_codes[]':[`course_${c.id}`],type:'event',
          start_date:fechaChileCanvas(ahora),end_date:isoMasDiasCanvas(ahora,200),per_page:100});
      }catch(error){
        if(!vigente())return;
        if(await falloLecturaOpcionalCanvas(error))throw error;
        eventosSinLeer++;
      }
      if(!vigente())return;
      const r=resumenFechasCanvas(tareas,ramo,ahora,[],eventos);
      let anuncios=[];
      try{anuncios=await canvasGet(`courses/${c.id}/discussion_topics`,{only_announcements:'true',per_page:50});}
      catch(e){
        if(!vigente())return;
        if(await falloLecturaOpcionalCanvas(e))throw e;
        anunciosSinLeer++;
      }
      if(!vigente())return;
      lecturas.push({curso:c,ramo,tareas,eventos,anuncios});
      for(const k of Object.keys(conteos))conteos[k]+=r.conteos[k]||0;
    }
  }catch(e){if(vigente())await avisarErrorLecturaCanvas(e,'No pudimos leer las fechas. Revisa la conexión e inténtalo de nuevo.');return;}
  if(!vigente())return;
  // Guardar la sección puede completar fechas oficiales; las propuestas se
  // vuelven a calcular antes de abrir la revisión, sin reutilizar un destino ya fechado.
  const proponer=ahora=>{
    const cursos=lecturas.map(l=>l.curso);
    return lecturas.filter(l=>S.ramos.includes(l.ramo)&&cursoCanvasParaRamo(l.ramo,cursos)?.id===l.curso.id).flatMap(l=>{
      const r=resumenFechasCanvas(l.tareas,l.ramo,ahora,[],l.eventos);
      const desdeAnuncios=propuestasAnunciosCanvas(l.anuncios,l.ramo,ahora);
      const destinos=destinosAnunciosCanvas(l.ramo);
      const reemplazada=p=>desdeAnuncios.some(a=>a.target===p.target||a.target.endsWith('|')&&p.target?.startsWith(a.target)
        ||puntajeCanvas(destinos.find(t=>claveDestinoIcs(t)===a.target)?.nombres||[],p.titulo,'')===3);
      return r.propuestas.filter(p=>!reemplazada(p)).concat(desdeAnuncios);
    });
  };
  propuestas=proponer(new Date());
  avisoAnunciosCanvas=anunciosSinLeer?'No pudimos leer los anuncios de '+anunciosSinLeer+' curso'+(anunciosSinLeer===1?'':'s')+'.':'';
  const avisoEventos=eventosSinLeer?'No pudimos leer los eventos del calendario de '+eventosSinLeer+' curso'+(eventosSinLeer===1?'':'s')+'.':'';
  const avisos=[avisoEventos,avisoAnunciosCanvas].filter(Boolean).join(' ');
  track('canvas_fechas',{propuestas:propuestas.length,sin_fecha:conteos.sinFecha,pasadas:conteos.pasadas,
    duplicadas:conteos.duplicadas,sin_destino:conteos.sinDestino,eventos:conteos.eventos,no_evaluacion:conteos.noEvaluacion,anuncios:propuestas.filter(p=>p.origen==='canvas-anuncio').length,anuncios_sin_leer:anunciosSinLeer});
  const continuar=()=>{
    if(!sigueCuenta())return;
    propuestas=proponer(new Date());
    if(!propuestas.length){avisoCanvas(avisos?'No encontramos fechas nuevas en los datos disponibles. '+avisos:'Canvas no tiene fechas próximas para tus ramos. '+explicarConteosCanvas(conteos,ramos));return;}
    avisoCanvas('');
    icsImportDraft=propuestas.sort((a,b)=>(a.fecha+(a.hora||'')).localeCompare(b.fecha+(b.hora||''))).slice(0,ICS_IMPORT_MAX_EVENTS);
    contextoFechasCanvas={estado,cuenta,avisos};
    renderRevisionIcs();
    openModal();
  };
  if(!abrirRevisionDocenciaCanvas(S.ramos,continuar))continuar();
}
