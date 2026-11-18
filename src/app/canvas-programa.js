// Canvas UC: proponer la pauta desde el programa del curso (syllabus_body).
// El plugin ya lo entrega como texto plano y con tope; acá nunca se pinta como
// HTML. Los pesos los lee el mismo lector del catálogo (GH_PROGRAMA_PAUTA): si
// el programa no declara pesos que sumen 100, no se propone nada. Lo que el
// lector no sabe modelar (eximición, mínimos, fórmulas) se muestra para que la
// persona lo revise. Nada cambia hasta que toca Guardar en el editor.
const canvasProgramaRamo=new Map();
const CANVAS_PROGRAMA_ENCABEZADO=/^#(?:\s|$)/;
const CANVAS_PORCENTAJE=/^\d{1,3}(?:[.,]\d+)?\s*%$/;
const CANVAS_COLUMNA=/^(?:evaluaci[oó]n(?:es)?|actividad(?:es)?|instrumento|ponderaci[oó]n|porcentaje|peso|nota|fecha|semana|tipo|%)$/i;

// Una fila de tabla llega con celdas separadas por tabulación. El lector espera
// «nombre … 25%», así que se deja el nombre (primera celda) y el único
// porcentaje de la fila. Las filas de encabezado de la tabla se omiten.
function filaTablaProgramaCanvas(linea){
  if(!linea.includes('\t'))return linea;
  const celdas=linea.split('\t').map(c=>c.trim()).filter(Boolean);
  if(celdas.length&&celdas.every(c=>CANVAS_COLUMNA.test(c)))return '';
  const pct=celdas.filter(c=>CANVAS_PORCENTAJE.test(c));
  const nombre=celdas.find(c=>!CANVAS_PORCENTAJE.test(c));
  return pct.length===1&&nombre?nombre+' '+pct[0]:celdas.join(' ');
}
// Si el programa tiene títulos, se lee solo la sección de evaluación: hasta el
// título siguiente, para que la bibliografía no se mezcle con las filas.
function textoEvaluacionProgramaCanvas(texto){
  const lineas=String(texto||'').split('\n');
  const limpia=l=>l.replace(CANVAS_PROGRAMA_ENCABEZADO,'').trim();
  const op={encabezadosAmplios:true};
  const inicio=lineas.findIndex(l=>CANVAS_PROGRAMA_ENCABEZADO.test(l)&&GH_PROGRAMA_PAUTA.esEncabezadoEvaluacion(limpia(l),op));
  let parte=lineas;
  if(inicio>=0){
    const fin=lineas.findIndex((l,i)=>i>inicio&&CANVAS_PROGRAMA_ENCABEZADO.test(l)&&limpia(l));
    parte=lineas.slice(inicio,fin<0?lineas.length:fin);
  }
  return parte.map(l=>CANVAS_PROGRAMA_ENCABEZADO.test(l)?limpia(l):filaTablaProgramaCanvas(l)).filter(l=>l.trim()).join('\n');
}
const CANVAS_PROGRAMA_SENALES={
  attendance_requirement_detected:'Asistencia mínima',
  approval_requirement_detected:'Requisito para aprobar',
  exemption_rule_detected:'Eximición',
  replacement_rule_detected:'Una nota reemplaza a otra',
  minimum_or_cap_rule_detected:'Nota mínima o tope',
  conditional_exam_rule_detected:'Examen con condiciones',
  alternative_final_grade_formula_detected:'Otra fórmula de nota final',
  multiple_final_grade_formulas_detected:'Otra fórmula de nota final',
  aggregate_category_detected:'Una evaluación agrupa varias notas',
  ambiguous_percentage_detected:'Porcentajes dentro de un párrafo',
  conditional_rule_detected:'Una condición',
  relevant_unparsed_line:'Líneas que no pudimos leer',
};
// Resultado: estado y, si hay propuesta, filas con nombre, peso y cantidad de
// notas solo cuando el programa la declara («3 controles 10% c/u»).
function pautaDesdeProgramaCanvas(programa,sigla){
  const texto=String(programa&&programa.texto||'');
  const archivo=!!(programa&&programa.archivo);
  if(!texto.trim())return {estado:archivo?'archivo':'vacio',filas:[]};
  const lectura=GH_PROGRAMA_PAUTA.extraerDeTexto(textoEvaluacionProgramaCanvas(texto),{encabezadosAmplios:true});
  const base={archivo,recortado:!!programa.recortado,total:lectura.total};
  if(!lectura.evaluationSourceText)return {...base,estado:archivo?'archivo':'sin_seccion',filas:[]};
  // La sigla suele estar fuera de la sección de evaluación: se revisa el texto completo.
  const otroRamo=sigla&&GH_PROGRAMA_PAUTA.extraerDeTexto(texto,{courseCode:sigla}).reasons.includes('course_code_mismatch');
  if(otroRamo)return {...base,estado:'otro_ramo',filas:[]};
  if(!lectura.filas.length)return {...base,estado:'sin_pesos',filas:[]};
  if(lectura.reasons.includes('duplicate_evaluation_name')||lectura.reasons.includes('invalid_weight_or_name'))return {...base,estado:'revisar',filas:[]};
  if(Math.abs(lectura.total-100)>0.000001)return {...base,estado:'no_suma',filas:[]};
  const filas=lectura.filas.map(f=>{
    const d=f.detalleDetectado||{};
    return {nombre:f.nombre,peso:f.peso,cantidad:Number.isInteger(d.cantidad)&&d.cantidad>1?d.cantidad:null};
  });
  const senales=[...new Set(lectura.reasons.map(r=>CANVAS_PROGRAMA_SENALES[r]).filter(Boolean))];
  const reglas=lectura.complexRuleLines.map(c=>String(c.line).slice(0,220)).slice(0,4);
  return {...base,estado:'propuesta',filas,senales,reglas};
}
// ─── El programa entre los ARCHIVOS del curso (Lucas, 2026-11-17) ─────────
// En la UC el campo «programa» de Canvas casi siempre viene vacío: el programa
// es un PDF o un Word entre los archivos o en un módulo «Programa». El plugin
// da nombres y tipos (nunca enlaces) y lee un archivo a texto. Se prueban los
// mejores candidatos por nombre y vale el primero que trae una pauta completa.
const CANVAS_ARCHIVOS_MAX=3;
function puntajeArchivoPrograma(a){
  const n=normName(String(a&&a.nombre||'').replace(/[_.-]+/g,' ')),m=normName(a&&a.modulo||'');
  let p=0;
  if(/\b(programa|syllabus|silabo|reglas|condiciones|normativa)\b/.test(n))p+=5;
  if(/\b(programa|syllabus|informacion del curso)\b/.test(m))p+=3;
  if(/\b(clase a clase|calendario|cronograma|fechas|planificacion)\b/.test(n))p+=1;
  // Una pauta de corrección, una guía o un enunciado no es el programa.
  if(/\b(pauta de correccion|solucion|solucionario|ayudantia|guia|enunciado|tarea|control|interrogacion|examen|prueba)\b/.test(n)&&p<5)p-=4;
  return p;
}
function archivosProgramaCanvas(lista){
  return (Array.isArray(lista)?lista:[])
    .filter(a=>a&&Number.isSafeInteger(a.id)&&['pdf','docx','txt'].includes(a.tipo)&&!(a.tamano>15*1024*1024))
    .map(a=>({...a,puntaje:puntajeArchivoPrograma(a)}))
    .filter(a=>a.puntaje>0)
    .sort((x,y)=>y.puntaje-x.puntaje||String(x.nombre).localeCompare(String(y.nombre)))
    .slice(0,CANVAS_ARCHIVOS_MAX);
}
async function programaDesdeArchivosCanvas(cursoId,sigla){
  const p=pluginCanvas();if(!p||typeof p.archivosCurso!=='function')return null;
  const r=await p.archivosCurso({curso:cursoId});
  const candidatos=archivosProgramaCanvas(r&&r.data);
  if(!candidatos.length)return {resultado:{estado:'sin_archivo',filas:[]},archivo:null};
  let mejor=null;
  for(const a of candidatos){
    let leido;
    try{leido=await p.leerArchivo({curso:cursoId,archivo:a.id});}catch(e){continue;}
    const texto=String(leido&&leido.texto||'');
    const resultado=texto.trim()?pautaDesdeProgramaCanvas({texto,archivo:false,recortado:!!leido.recortado},sigla):{estado:'escaneado',filas:[]};
    if(resultado.estado==='propuesta')return {resultado,archivo:a.nombre};
    if(!mejor)mejor={resultado,archivo:a.nombre};
  }
  return mejor||{resultado:{estado:'sin_archivo',filas:[]},archivo:null};
}
function mensajeProgramaCanvas(res){
  return {
    sin_archivo:'No encontramos el programa ni en Canvas ni entre los archivos del curso. Escribe las evaluaciones con su porcentaje.',
    escaneado:'El programa está escaneado como imagen y no se puede leer. Copia los porcentajes del programa.',
    archivo:'El programa está como archivo en Canvas y no pudimos leerlo. Actualiza la app o copia los porcentajes del programa.',
    vacio:'Este curso no tiene el programa escrito en Canvas.',
    sin_seccion:'No encontramos la sección de evaluación en el programa de Canvas.',
    sin_pesos:'El programa de Canvas no trae porcentajes por evaluación.',
    no_suma:'Los porcentajes del programa suman '+String(r2(res.total||0)).replace('.',',')+' %, no 100. Revísalo y escríbelos a mano.',
    revisar:'El programa repite evaluaciones o trae porcentajes que no pudimos leer bien. Escríbelos a mano.',
    otro_ramo:'El programa de Canvas parece ser de otro ramo. Revísalo en Canvas.',
  }[res.estado]||'No pudimos leer el programa.';
}
function canvasProgramaEditorHTML(){
  if(typeof canvasDisponible!=='function'||!canvasDisponible())return '';
  const r=(S.ramos||[]).find(x=>x.id===currentRamoId);
  if(!r||!siglaRamoCanvas(r))return '';
  const d=canvasProgramaRamo.get(r.id);
  let cuerpo;
  if(!d)cuerpo='<div class="pauta-plantillas-opciones"><button type="button" style="min-height:44px;" onclick="leerProgramaCanvas()">Leer el programa de Canvas</button></div>';
  else if(d.cargando)cuerpo='<div class="pauta-plantillas-nota" role="status">Leyendo el programa…</div>';
  else if(d.error)cuerpo='<div class="pauta-plantillas-nota" role="status">'+esc(d.error)+'</div>';
  else if(d.resultado.estado!=='propuesta')cuerpo='<div class="pauta-plantillas-nota" role="status">'+esc(mensajeProgramaCanvas(d.resultado))+'</div>';
  else{
    const res=d.resultado;
    const filas=res.filas.map(f=>'<li style="display:flex;justify-content:space-between;gap:12px;"><span>'+esc(f.nombre)+(f.cantidad?' · '+f.cantidad+' notas':'')+'</span><span style="font-variant-numeric:tabular-nums;">'+textoPesoCanvas(f.peso)+'</span></li>').join('');
    const avisos=res.senales.length?'<div class="pauta-plantillas-nota" role="note"><b>Revisa en el programa, la app no lo aplica:</b> '+esc(res.senales.join(' · '))+'.'
      +(res.reglas.length?'<ul style="margin:4px 0 6px;padding-left:18px;">'+res.reglas.map(l=>'<li>'+esc(l)+'</li>').join('')+'</ul>':'')+'</div>':'';
    cuerpo='<ul style="list-style:none;margin:0 0 6px;padding:0;font-size:0.8125rem;line-height:1.6;">'+filas+'</ul>'+avisos
      +'<div class="pauta-plantillas-opciones"><button type="button" style="min-height:44px;" onclick="usarProgramaCanvas()">Usar estas evaluaciones</button></div>'
      +'<div class="pauta-plantillas-nota">'+(d.archivo?'Sale de «'+esc(d.archivo)+'». ':'')+'Quedan en el editor para revisarlas. Nada cambia hasta que toques Guardar.</div>';
  }
  return '<div class="pauta-plantillas" id="m-pauta-programa"><div class="pauta-plantillas-titulo">Programa en Canvas</div>'+cuerpo+'</div>';
}
function repintarProgramaCanvas(){
  const el=document.getElementById('m-pauta-programa');
  if(el)el.outerHTML=canvasProgramaEditorHTML();
}
async function leerProgramaCanvas(){
  const r=(S.ramos||[]).find(x=>x.id===currentRamoId);
  if(!r||!canvasDisponible())return;
  const id=r.id,sigla=siglaRamoCanvas(r);
  canvasProgramaRamo.set(id,{cargando:true});repintarProgramaCanvas();
  try{
    const curso=(await cursosCanvas()).find(c=>c.sigla===sigla);
    if(!curso)canvasProgramaRamo.set(id,{error:'No encontramos este ramo en tu Canvas de este semestre.'});
    else{
      let resultado=pautaDesdeProgramaCanvas(await canvasGet(`courses/${curso.id}`,{'include[]':['syllabus_body']}),sigla),archivo=null;
      // Sin pauta en el campo «programa», se busca entre los archivos del curso.
      if(resultado.estado!=='propuesta'){
        let desdeArchivos=null;
        try{desdeArchivos=await programaDesdeArchivosCanvas(curso.id,sigla);}catch(e){}
        if(desdeArchivos&&(desdeArchivos.resultado.estado==='propuesta'||['vacio','archivo','sin_seccion'].includes(resultado.estado))){
          resultado=desdeArchivos.resultado;archivo=desdeArchivos.archivo;
        }
      }
      canvasProgramaRamo.set(id,{resultado,archivo});
      track('canvas_programa',{estado:resultado.estado,evaluaciones:resultado.filas.length,senales:(resultado.senales||[]).length,desde_archivo:!!archivo});
    }
  }catch(e){canvasProgramaRamo.set(id,{error:'No pudimos leer Canvas. Revisa la conexión o el token.'});}
  repintarProgramaCanvas();
}
// Lleva la propuesta al borrador del editor. Una evaluación con el mismo
// nombre conserva su id, sus notas y sus reglas; una con notas o con una regla
// de aprobación que el programa no menciona se queda con su porcentaje, para
// que la persona decida: el lector no conoce esas reglas y no debe borrarlas.
function filasProgramaParaEditor(filas,borrador,ramo){
  const conRegla=new Set();
  ((ramo&&ramo.gates)||[]).forEach(g=>{if(g.catId)conRegla.add(g.catId);(g.catIds||[]).forEach(id=>conRegla.add(id));});
  const usadas=new Set();
  const nuevas=filas.map(f=>{
    const anterior=borrador.find(b=>!usadas.has(b)&&String(b.nombre||'').trim()&&normName(b.nombre)===normName(f.nombre));
    if(anterior)usadas.add(anterior);
    const cantidad=f.cantidad||(anterior&&anterior.cantidad)||null;
    return {id:anterior?anterior.id:null,nombre:f.nombre,peso:f.peso,tieneNotas:!!(anterior&&anterior.tieneNotas),
      varias:!!(f.cantidad||(anterior&&anterior.varias)),cantidad,...(anterior&&anterior.reglas?{reglas:anterior.reglas}:{})};
  });
  return nuevas.concat(borrador.filter(b=>!usadas.has(b)&&(b.tieneNotas||(b.id&&conRegla.has(b.id)))));
}
function usarProgramaCanvas(){
  const r=(S.ramos||[]).find(x=>x.id===currentRamoId);
  const d=r&&canvasProgramaRamo.get(r.id);
  if(!d||!d.resultado||d.resultado.estado!=='propuesta')return;
  const aplicar=()=>{
    pautaDraft=filasProgramaParaEditor(d.resultado.filas,pautaDraft,r);
    canvasProgramaRamo.delete(r.id);
    renderPautaManualModal();
    track('canvas_programa_usado',{evaluaciones:d.resultado.filas.length});
  };
  if(!pautaDraft.some(f=>String(f.nombre||'').trim()))return aplicar();
  showConfirm('Usar el programa de Canvas','Cambia las evaluaciones del editor por las del programa. Las notas que ya tienes se conservan cuando el nombre coincide. Nada se guarda hasta que toques Guardar.',aplicar,{label:'Usar programa',danger:false,focusCancel:true});
}
