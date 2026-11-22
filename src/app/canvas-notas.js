// ─── CANVAS UC: NOTAS PUBLICADAS Y PESOS DE REFERENCIA ─────────────────────
// La nota que Canvas ya publicó para ti se PROPONE: nada se escribe hasta que
// apruebas cada fila, nunca va a una casilla que ya tiene nota y no sale del
// iPhone salvo cuando la guardas como nota propia (el sync de siempre).
// Una nota de la escala 1 a 7 se acepta tal cual. Un puntaje o un porcentaje
// se pasa a nota con la exigencia del ramo (Editar ramo; 50 % si no la dice) y
// en la revisión se cambia por fila: 50 %, 60 % u otra (Lucas, 2026-11-17).
// La nota calculada se ve y se puede corregir antes de guardarla.
let canvasNotasDraft=[];

function numeroCanvas(v){return Number.isFinite(v)?String(Math.round(v*100)/100).replace('.',','):'';}
const EXIGENCIA_DEFECTO=50;
// Exigencia en %, entre 1 y 99. Sin dato válido, la de siempre: 50 %.
function exigenciaValida(v){const e=Number(typeof v==='string'?v.replace('%','').replace(',','.').trim():v);return Number.isFinite(e)&&e>=1&&e<=99?Math.round(e*10)/10:null;}
function exigenciaRamo(r){return exigenciaValida(r&&r.exigencia)??EXIGENCIA_DEFECTO;}
// Escala chilena: bajo la exigencia va de 1,0 a 4,0 y desde ahí de 4,0 a 7,0.
// Se aproxima a la décima (3,95 es 4,0), como la calculadora de gradehub.cl.
function notaDesdePuntaje(obtenido,total,exigencia){
  const e=exigenciaValida(exigencia);
  if(e===null||!(total>0)||!Number.isFinite(obtenido)||obtenido<0)return null;
  const p=Math.min(obtenido,total),corte=total*e/100;
  const n=p<corte?1+3*p/corte:4+3*(p-corte)/(total-corte);
  return Math.min(7,Math.max(1,Math.round(n*10+1e-9)/10));
}
// {valor, crudo} o null si no hay nada que proponer (sin publicar, eximida,
// aprobado/reprobado o sin nota).
function notaDesdeCanvas(tarea){
  const s=tarea&&tarea.submission;
  if(!s||s.excused===true)return null;
  const tipo=String(tarea.grading_type||'points');
  if(tipo==='pass_fail'||tipo==='not_graded')return null;
  const score=typeof s.score==='number'&&Number.isFinite(s.score)?s.score:null;
  const grade=String(s.grade==null?'':s.grade).trim();
  if(score===null&&!grade)return null;
  const max=Number(tarea.points_possible);
  const enEscala=v=>Number.isFinite(v)&&v>=1&&v<=7;
  // Esquema de notas de Canvas con nombres numéricos ("5,5"): es la nota.
  if(tipo!=='points'&&tipo!=='percent'&&/^\d(?:[.,]\d{1,2})?$/.test(grade)){
    const v=Number(grade.replace(',','.'));
    if(enEscala(v))return {valor:Math.round(v*100)/100,crudo:grade.replace('.',',')};
  }
  // Puntaje sobre 7: la nota escrita como puntos.
  if(tipo==='points'&&max===7&&score!==null&&enEscala(score))
    return {valor:Math.round(score*100)/100,crudo:numeroCanvas(score)+' de 7'};
  const crudo=tipo==='percent'?(grade||numeroCanvas(score)+'%')
    :tipo==='points'&&score!==null?numeroCanvas(score)+(max>0?' de '+numeroCanvas(max):'')+' pts'
    :grade;
  // Puntaje sobre el total, o porcentaje: se pasa a nota con la exigencia.
  const pct=tipo==='percent'&&/^\d{1,3}(?:[.,]\d+)?\s*%$/.test(grade)?Number(grade.replace('%','').replace(',','.')):null;
  const puntos=score!==null&&max>0&&(tipo==='points'||tipo==='percent')?{obtenido:score,total:max}
    :pct!==null?{obtenido:pct,total:100}:null;
  return crudo?{valor:null,crudo,...(puntos?{puntos}:{})}:null;
}
// Las casillas del ramo, llenas y vacías. Solo las vacías reciben notas; las
// llenas sirven para reconocer que esa nota ya la tienes y no repetirla.
function destinosNotaCanvas(ramo){
  const out=[];
  (ramo.categorias||[]).forEach(cat=>{
    const notas=Array.isArray(cat.notas)?cat.notas:[];
    const slots=Number.isInteger(cat.slots)&&cat.slots>1?cat.slots:1;
    const vacia=n=>!n||n.valor===null||n.valor===undefined;
    if(slots===1){
      const libre=notas.find(vacia);
      const llena=notas.length&&!libre;
      const nota=libre||notas[0]||null;
      out.push({ramo,cat,casilla:null,lleno:!!llena,nombres:[cat.nombre,nota&&nota.nombre].filter(Boolean),etiqueta:cat.nombre});
      return;
    }
    for(let i=0;i<slots;i++){
      const n=notas.find(x=>x.slot===i);
      const etiqueta=etiquetaCasilla(ramo,cat,i);
      out.push({ramo,cat,casilla:i+1,lleno:!vacia(n),nombres:[etiqueta,n&&n.nombre].filter(Boolean),etiqueta});
    }
  });
  return out;
}
function claveNotaCanvas(d){return d.ramo.id+'|'+d.cat.id+'|'+(d.casilla||'');}
function resumenNotasCanvas(tareas,ramo){
  const destinos=destinosNotaCanvas(ramo),usados=new Set(),propuestas=[];
  const conteos={total:Array.isArray(tareas)?tareas.length:0,sinNota:0,yaTienes:0,sinDestino:0};
  const exigencia=exigenciaRamo(ramo);
  for(const tarea of Array.isArray(tareas)?tareas:[]){
    const leida=notaDesdeCanvas(tarea);
    if(!leida){conteos.sinNota++;continue;}
    // Puntos o %: la nota calculada con la exigencia del ramo.
    const calculada=leida.puntos?notaDesdePuntaje(leida.puntos.obtenido,leida.puntos.total,exigencia):null;
    const nota=calculada!==null?{...leida,valor:calculada}:leida;
    const nombre=nombreLimpioCanvas(tarea.name)||String(tarea.name||'').trim();
    const grupo=String(tarea.assignment_group&&tarea.assignment_group.name||'').trim();
    const candidatos=destinos.filter(d=>!usados.has(claveNotaCanvas(d))).map(d=>({d,p:puntajeCanvas(d.nombres,nombre,grupo)}))
      .filter(x=>x.p>0).sort((a,b)=>b.p-a.p||(a.d.lleno-b.d.lleno));
    const mejor=candidatos[0];
    // Calza por nombre con una casilla que ya tiene nota: ya la escribiste.
    if(mejor&&mejor.d.lleno&&mejor.p>=2){usados.add(claveNotaCanvas(mejor.d));conteos.yaTienes++;continue;}
    const libre=candidatos.find(x=>!x.d.lleno);
    const target=libre?claveNotaCanvas(libre.d):null;
    if(target)usados.add(target);
    else if(nota.valor===null){conteos.sinDestino++;continue;}
    else conteos.sinDestino++;
    propuestas.push({titulo:nombre||'Sin nombre',ramoId:ramo.id,target,valor:nota.valor,crudo:nota.crudo,
      ...(calculada!==null?{puntos:leida.puntos,exigencia}:{})});
  }
  return {propuestas,conteos};
}
function opcionesNotaCanvas(ramoId,selected,used){
  const ramo=(S.ramos||[]).find(r=>r.id===ramoId);
  return ['<option value="">No guardar</option>'].concat(ramo?destinosNotaCanvas(ramo).filter(d=>!d.lleno).map(d=>{
    const k=claveNotaCanvas(d);
    return '<option value="'+esc(k)+'"'+(k===selected?' selected':'')+(used.has(k)&&k!==selected?' disabled':'')+'>'+esc(d.etiqueta)+'</option>';
  }):[]).join('');
}
function renderRevisionNotasCanvas(){
  const used=new Set(canvasNotasDraft.map(p=>p.target).filter(Boolean));
  const filas=canvasNotasDraft.map((p,i)=>{
    const ramo=(S.ramos||[]).find(r=>r.id===p.ramoId);
    const valor=p.editado!=null?p.editado:p.valor!=null?String(p.valor).replace('.',','):'';
    return '<section class="canvas-nota" aria-labelledby="cn-titulo-'+i+'">'
      +'<header class="canvas-nota-contexto"><div><h3 id="cn-titulo-'+i+'">'+esc(p.titulo)+'</h3>'
      +(ramo?'<p>'+esc(ramo.nombre)+'</p>':'')+'</div><p class="canvas-nota-origen">'+esc(p.crudo)+' en Canvas</p></header>'
      +(p.valor===null?'<p class="canvas-nota-hint">Escribe una nota entre 1,0 y 7,0 para guardarla.</p>':'')
      +(p.puntos?exigenciaOpcionesHTML(p.exigencia,{id:'cn-exig-'+i,elegir:'exigenciaNotaCanvas('+i+',',etiqueta:'Exigencia de «'+p.titulo+'»'}):'')
      +'<div class="canvas-nota-campos"><div><label for="cn-eval-'+i+'">Evaluación</label><select class="feedback-select" id="cn-eval-'+i+'" data-cn-eval onchange="asignarNotaCanvas('+i+',this.value)">'+opcionesNotaCanvas(p.ramoId,p.target,used)+'</select></div>'
      +'<div><label for="cn-nota-'+i+'">Nota</label><input type="text" id="cn-nota-'+i+'" inputmode="decimal" maxlength="4" autocomplete="off" value="'+esc(valor)+'" placeholder="5,5" oninput="canvasNotasDraft['+i+'].editado=this.value"'+(p.target?'':' disabled')+'/></div></div>'
      +'</section>';
  }).join('');
  document.getElementById('modal-content').innerHTML=[
    '<h2 class="modal-title" id="modal-titulo">Revisa las notas de Canvas</h2>',
    '<p class="canvas-nota-intro">Confirma en qué evaluación va cada nota. Puedes corregirla o elegir «No guardar». Solo se guardan en casillas vacías.</p>',
    '<p id="cn-error" role="alert" hidden class="canvas-aviso es-error"></p>',
    '<div class="canvas-nota-lista">'+filas+'</div>',
    '<div class="modal-btns"><button class="btn-cancel" type="button" onclick="closeModal()">Cancelar</button><button class="btn-confirm" type="button" onclick="confirmarNotasCanvas()">Guardar notas</button></div>'
  ].join('');
}
// 50 % y 60 % a un toque y otra escrita. La usan la revisión de Canvas (por
// fila) y Editar ramo (la del ramo). `elegir` es el comienzo de la llamada que
// recibe la exigencia: «exigenciaNotaCanvas(3,».
function exigenciaOpcionesHTML(actual,{id,elegir,etiqueta='Exigencia',titulo=true}){
  const e=exigenciaValida(actual)??EXIGENCIA_DEFECTO,otra=e!==50&&e!==60;
  const boton=v=>'<button type="button" aria-pressed="'+(e===v)+'" onclick="'+elegir+v+')">'+v+' %</button>';
  return '<div class="exigencia-opciones" role="group" aria-label="'+esc(etiqueta)+'">'+(titulo?'<span class="exigencia-titulo" aria-hidden="true">Exigencia</span>':'')+boton(50)+boton(60)
    +'<label class="exigencia-otra'+(otra?' elegida':'')+'"><span class="sr-solo">Otra exigencia, en porcentaje</span><input type="text" class="exigencia-campo" id="'+esc(id)+'" inputmode="decimal" maxlength="4" autocomplete="off" placeholder="Otra" value="'+(otra?String(e).replace('.',','):'')+'" onchange="'+elegir+'this.value)"></label></div>';
}
// Cambia la exigencia de una fila y vuelve a calcular su nota. Si la persona
// ya había escrito otra nota a mano, la reemplaza: eligió una exigencia nueva.
function exigenciaNotaCanvas(index,valor){
  const p=canvasNotasDraft[index];if(!p||!p.puntos)return;
  const e=exigenciaValida(valor);
  const error=document.getElementById('cn-error');
  if(e===null){if(error){error.textContent='La exigencia es un porcentaje entre 1 y 99, como 55.';error.hidden=false;}return;}
  if(error)error.hidden=true;
  p.exigencia=e;p.valor=notaDesdePuntaje(p.puntos.obtenido,p.puntos.total,e);p.editado=null;
  const hoja=document.querySelector('.modal-sheet');const arriba=hoja?.scrollTop||0;
  renderRevisionNotasCanvas();
  if(hoja)hoja.scrollTop=arriba;
  const campo=document.getElementById('cn-nota-'+index);if(campo&&!campo.disabled)campo.focus({preventScroll:true});
}
function asignarNotaCanvas(index,target){
  const p=canvasNotasDraft[index];if(!p)return;
  const ramo=(S.ramos||[]).find(r=>r.id===p.ramoId);
  const valido=ramo&&destinosNotaCanvas(ramo).some(d=>!d.lleno&&claveNotaCanvas(d)===target);
  p.target=valido?target:null;
  const hoja=document.querySelector('.modal-sheet');const arriba=hoja?.scrollTop||0;
  renderRevisionNotasCanvas();
  if(hoja)hoja.scrollTop=arriba;
  const campo=document.getElementById(p.target?'cn-nota-'+index:'cn-eval-'+index);
  if(campo)campo.focus({preventScroll:true});
}
// Valida todo antes de escribir: una fila con evaluación y sin nota válida
// detiene el guardado en vez de guardarse a medias.
function notasCanvasElegidas(){
  const vistos=new Set(),out=[];
  for(let i=0;i<canvasNotasDraft.length;i++){
    const p=canvasNotasDraft[i];if(!p.target)continue;
    if(vistos.has(p.target))return {error:'Una evaluación no puede recibir dos notas.',i};
    vistos.add(p.target);
    const campo=document.getElementById('cn-nota-'+i);
    const v=parseNota(campo?campo.value:'',S.tenant);
    if(typeof v!=='number'||!Number.isFinite(v)||v<1||v>7)return {error:'Escribe la nota de «'+p.titulo+'» entre 1,0 y 7,0, o elige «No guardar».',i};
    out.push({...p,valor:Math.round(v*100)/100});
  }
  return {elegidas:out};
}
function confirmarNotasCanvas(){
  const r=notasCanvasElegidas(),error=document.getElementById('cn-error');
  if(r.error){
    if(error){error.textContent=r.error;error.hidden=false;}
    const campo=document.getElementById('cn-nota-'+r.i);if(campo)campo.focus();
    return;
  }
  if(!r.elegidas.length){if(error){error.textContent='Elige al menos una evaluación para guardar.';error.hidden=false;}return;}
  let puestas=0;
  for(const p of r.elegidas){
    const ramo=(S.ramos||[]).find(x=>x.id===p.ramoId);
    // Se vuelve a mirar justo antes de escribir: si la casilla ya tiene nota, no se pisa.
    const d=ramo&&destinosNotaCanvas(ramo).find(x=>!x.lleno&&claveNotaCanvas(x)===p.target);
    if(d&&escribirNotaPropuesta(d.cat,{valor:p.valor,casilla:d.casilla},ramo))puestas++;
  }
  if(!puestas){showToast('Esas evaluaciones ya tienen nota',true);return;}
  save();
  canvasNotasDraft=[];
  closeModal();
  if(typeof currentRamoId!=='undefined'&&currentRamoId&&typeof renderRamo==='function')renderRamo();
  else if(typeof renderHome==='function')renderHome();
  track('canvas_notas_guardadas',{notas:puestas,elegidas:r.elegidas.length});
  const lecturaInicio=typeof lecturaCanvasGuardadaInicio==='function'?lecturaCanvasGuardadaInicio():null;
  showToast(lecturaInicio||puestas+' nota'+(puestas===1?' guardada':'s guardadas')+(puestas<r.elegidas.length?'; el resto ya tenía nota':''),puestas<r.elegidas.length);
}
async function traerNotasCanvas(vistaVigente=()=>true){
  if(!canvasDisponible())return;
  avisoCanvas('Buscando tus notas en Canvas…');
  let propuestas=[],ramos=0;const conteos={total:0,sinNota:0,yaTienes:0,sinDestino:0};
  try{
    const cursos=await cursosCanvas();
    for(const c of cursos){
      if(!vistaVigente())return;
      const ramo=(S.ramos||[]).find(r=>siglaRamoCanvas(r)===c.sigla);
      if(!ramo)continue;
      ramos++;
      const r=await pluginCanvas().get({path:`courses/${c.id}/assignments`,params:{'include[]':['submission'],order_by:'due_at',per_page:100}});
      if(!vistaVigente())return;
      if(c.usaPesos)canvasPesosRamo.set(ramo.id,{grupos:r&&r.grupos||[],usaPesos:true});
      const res=resumenNotasCanvas(r&&r.data,ramo);
      propuestas=propuestas.concat(res.propuestas);
      for(const k of Object.keys(conteos))conteos[k]+=res.conteos[k]||0;
    }
  }catch(e){if(vistaVigente())await avisarErrorLecturaCanvas(e,'No pudimos leer tus notas. Revisa la conexión e inténtalo de nuevo.');return;}
  if(!vistaVigente())return;
  track('canvas_notas',{propuestas:propuestas.length,ya_tienes:conteos.yaTienes,sin_destino:conteos.sinDestino});
  if(!propuestas.length){
    avisoCanvas(!ramos?'Ninguno de tus ramos de Canvas está en GradeHub. Agrégalos con «Traer mis ramos».'
      :conteos.yaTienes?'Ya tienes todas las notas que Canvas publicó.':'Canvas no tiene notas publicadas para tus ramos.');
    return;
  }
  avisoCanvas('');
  canvasNotasDraft=propuestas;
  renderRevisionNotasCanvas();
  openModal();
}

// Pesos de los grupos de Canvas: solo referencia al armar la pauta. La pauta
// sale del programa oficial; esto no la cambia ni se guarda.
const canvasPesosRamo=new Map();
function textoPesoCanvas(v){return Number.isFinite(Number(v))?String(Math.round(Number(v)*100)/100).replace('.',',')+' %':'—';}
function canvasPesosEditorHTML(){
  if(typeof canvasDisponible!=='function'||!canvasDisponible())return '';
  const r=(S.ramos||[]).find(x=>x.id===currentRamoId);
  if(!r||!siglaRamoCanvas(r))return '';
  const d=canvasPesosRamo.get(r.id);
  let cuerpo;
  if(!d)cuerpo='<div class="pauta-plantillas-opciones"><button type="button" style="min-height:44px;" onclick="verPesosCanvas()">Ver pesos en Canvas</button></div>';
  else if(d.cargando)cuerpo='<div class="pauta-plantillas-nota" role="status">Buscando en Canvas…</div>';
  else if(d.error)cuerpo='<div class="pauta-plantillas-nota" role="status">'+esc(d.error)+'</div>';
  else if(!d.usaPesos||!d.grupos.some(g=>Number(g.group_weight)>0))cuerpo='<div class="pauta-plantillas-nota" role="status">Este curso no usa pesos por grupo en Canvas.</div>';
  else cuerpo='<ul style="list-style:none;margin:0 0 6px;padding:0;font-size:0.8125rem;line-height:1.6;">'
    +d.grupos.filter(g=>Number(g.group_weight)>0).map(g=>'<li style="display:flex;justify-content:space-between;gap:12px;"><span>'+esc(g.name||'Sin nombre')+'</span><span style="font-variant-numeric:tabular-nums;">'+textoPesoCanvas(g.group_weight)+'</span></li>').join('')
    +'</ul><div class="pauta-plantillas-nota">Referencia. Manda el programa del curso: tu pauta no cambia.</div>';
  return '<div class="pauta-plantillas" id="m-pauta-canvas"><div class="pauta-plantillas-titulo">Pesos según Canvas</div>'+cuerpo+'</div>';
}
function repintarPesosCanvas(){
  const el=document.getElementById('m-pauta-canvas');
  if(el)el.outerHTML=canvasPesosEditorHTML();
}
async function verPesosCanvas(){
  const r=(S.ramos||[]).find(x=>x.id===currentRamoId);
  if(!r||!canvasDisponible())return;
  const id=r.id;
  canvasPesosRamo.set(id,{cargando:true});repintarPesosCanvas();
  try{
    const curso=(await cursosCanvas()).find(c=>c.sigla===siglaRamoCanvas(r));
    if(!curso)canvasPesosRamo.set(id,{error:'No encontramos este ramo en tu Canvas de este semestre.'});
    else{
      const grupos=curso.usaPesos?await canvasGet(`courses/${curso.id}/assignment_groups`,{per_page:100}):[];
      canvasPesosRamo.set(id,{grupos:Array.isArray(grupos)?grupos:[],usaPesos:curso.usaPesos});
    }
    track('canvas_pesos',{encontrado:!!curso,usa_pesos:!!(curso&&curso.usaPesos)});
  }catch(e){canvasPesosRamo.set(id,{error:'No pudimos leer Canvas. Revisa la conexión o el token.'});}
  repintarPesosCanvas();
}
