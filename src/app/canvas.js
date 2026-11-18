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
  if(typeof canvasPesosRamo!=='undefined')canvasPesosRamo.clear();
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
  const el=document.getElementById('s-canvas-estado');
  if(el){el.textContent=texto;el.classList.toggle('es-error',!!error);}
  else if(texto)showToast(texto,!!error);
}
async function pintarCanvasAjustes(){
  const caja=document.getElementById('s-canvas');
  if(!caja||!canvasDisponible())return;
  let conectado=false;
  try{const r=await pluginCanvas().estado();conectado=!!(r&&r.conectado);}catch(e){}
  if(!caja.isConnected)return;
  caja.innerHTML=conectado?`
    <p class="settings-help" style="margin-top:0;"><b>Canvas conectado.</b> El token queda solo en el llavero de este iPhone. Revisas cada fecha y nota antes de guardarla.</p>
    <div class="settings-data-actions" style="margin-bottom:0;">
      <button type="button" onclick="traerRamosCanvas()">Traer mis ramos</button>
      <button type="button" onclick="traerFechasCanvas()">Traer fechas</button>
      <button type="button" onclick="traerNotasCanvas()">Traer notas</button>
    </div>
    <button type="button" class="settings-reset-btn" style="min-height:44px;margin-top:12px;" onclick="desconectarCanvas()">Desconectar Canvas</button>
    <p class="settings-help" id="s-canvas-estado" role="status" aria-live="polite"></p>`
  :`
    <p class="settings-help" style="margin-top:0;">En Canvas UC abre Cuenta, entra a tu perfil y toca «Nuevo token de acceso». Cópialo y pégalo acá.</p>
    <label class="modal-label" for="s-canvas-token">Token de Canvas</label>
    <div class="modal-input"><input type="password" id="s-canvas-token" autocomplete="off" autocapitalize="none" autocorrect="off" spellcheck="false" placeholder="1234~…"/></div>
    <button type="button" class="btn-confirm" style="min-height:44px;width:100%;" id="s-canvas-conectar" onclick="conectarCanvas()">Conectar Canvas</button>
    <p class="settings-help" id="s-canvas-estado" role="status" aria-live="polite">Solo queda en el llavero de este iPhone. No se sube a tu cuenta de GradeHub.</p>`;
}
async function conectarCanvas(){
  if(!canvasDisponible())return;
  const campo=document.getElementById('s-canvas-token'),boton=document.getElementById('s-canvas-conectar');
  const token=String(campo&&campo.value||'').trim();
  if(!TOKEN_CANVAS_RE.test(token)){avisoCanvas('Copia el token completo de Canvas, incluido el número y la ~.',true);return;}
  if(boton)boton.disabled=true;
  avisoCanvas('Revisando con Canvas…');
  try{
    await pluginCanvas().conectar({token});
    if(campo)campo.value='';
    track('canvas_conectado');
    await pintarCanvasAjustes();
    avisoCanvas('Canvas conectado. Ahora puedes traer tus ramos y fechas.');
  }catch(e){
    if(boton)boton.disabled=false;
    avisoCanvas('No pudimos conectar Canvas. Revisa el token e inténtalo de nuevo.',true);
  }
}
function desconectarCanvas(){
  if(!canvasDisponible())return;
  showConfirm('Desconectar Canvas','Borraremos el token de este iPhone. Tus ramos y fechas no cambian.',async()=>{
    try{await pluginCanvas().desconectar();if(typeof canvasPesosRamo!=='undefined')canvasPesosRamo.clear();track('canvas_desconectado');await pintarCanvasAjustes();}
    catch(e){avisoCanvas('No pudimos desconectar Canvas. Inténtalo de nuevo.',true);}
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
async function traerRamosCanvas(){
  if(!canvasDisponible())return;
  avisoCanvas('Buscando tus ramos en Canvas…');
  let cursos;
  try{cursos=await cursosCanvas();}
  catch(e){avisoCanvas('No pudimos leer Canvas. Revisa la conexión o el token.',true);return;}
  const tienes=new Set((S.ramos||[]).map(siglaRamoCanvas).filter(Boolean));
  const faltan=cursos.filter(c=>!tienes.has(c.sigla));
  track('canvas_ramos',{encontrados:cursos.length,faltan:faltan.length});
  if(!cursos.length){avisoCanvas('No encontramos ramos de este semestre en Canvas.');return;}
  if(!faltan.length){avisoCanvas('Ya tienes todos esos ramos.');return;}
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
async function traerFechasCanvas(){
  if(!canvasDisponible())return;
  avisoCanvas('Buscando fechas en Canvas…');
  let propuestas=[],ramos=0;
  const conteos={total:0,tareas:0,eventos:0,sinFecha:0,pasadas:0,duplicadas:0,sinDestino:0,noEvaluacion:0};
  try{
    const cursos=await cursosCanvas(),ahora=new Date();
    for(const c of cursos){
      const ramo=(S.ramos||[]).find(r=>siglaRamoCanvas(r)===c.sigla);
      if(!ramo)continue;
      ramos++;
      const tareas=await canvasGet(`courses/${c.id}/assignments`,{bucket:'future',per_page:100});
      // Sin fechas, Canvas devuelve solo los eventos de hoy.
      const eventos=await canvasGet('calendar_events',{'context_codes[]':[`course_${c.id}`],type:'event',
        start_date:fechaChileCanvas(ahora),end_date:isoMasDiasCanvas(ahora,200),per_page:100});
      const r=resumenFechasCanvas(tareas,ramo,ahora,[],eventos);
      propuestas=propuestas.concat(r.propuestas);
      for(const k of Object.keys(conteos))conteos[k]+=r.conteos[k]||0;
    }
  }catch(e){avisoCanvas('No pudimos leer las fechas de Canvas. Revisa la conexión o el token.',true);return;}
  track('canvas_fechas',{propuestas:propuestas.length,sin_fecha:conteos.sinFecha,pasadas:conteos.pasadas,
    duplicadas:conteos.duplicadas,sin_destino:conteos.sinDestino,eventos:conteos.eventos,no_evaluacion:conteos.noEvaluacion});
  if(!propuestas.length){avisoCanvas('Canvas no tiene fechas próximas para tus ramos. '+explicarConteosCanvas(conteos,ramos));return;}
  avisoCanvas('');
  icsImportDraft=propuestas.sort((a,b)=>(a.fecha+(a.hora||'')).localeCompare(b.fecha+(b.hora||''))).slice(0,ICS_IMPORT_MAX_EVENTS);
  renderRevisionIcs();
  openModal();
}
