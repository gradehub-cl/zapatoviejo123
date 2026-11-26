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
  const base={texto,archivo,recortado:!!programa.recortado,total:lectura.total};
  if(base.recortado)return {...base,estado:'incompleto',filas:[]};
  if(!lectura.evaluationSourceText)return {...base,estado:archivo?'archivo':'sin_seccion',filas:[]};
  // La sigla suele estar fuera de la sección de evaluación: se revisa el texto completo.
  const declarada=texto.match(/\bSIGLA\s*:?\s*([A-Z]{2,6}[A-Z0-9_]{2,10})\b/i)?.[1];
  const otroRamo=sigla&&declarada&&declarada.toUpperCase()!==sigla.toUpperCase();
  if(otroRamo)return {...base,estado:'otro_ramo',filas:[]};
  if(!lectura.filas.length)return {...base,estado:'sin_pesos',filas:[]};
  if(lectura.reasons.includes('duplicate_evaluation_name')||lectura.reasons.includes('invalid_weight_or_name'))return {...base,estado:'revisar',filas:[]};
  if(Math.abs(lectura.total-100)>0.000001)return {...base,estado:'no_suma',filas:[]};
  const filas=lectura.filas.map(f=>{
    const d=f.detalleDetectado||{};
    return {nombre:f.nombre,peso:f.peso,cantidad:Number.isInteger(d.cantidad)&&d.cantidad>1?d.cantidad:null};
  });
  // Conserva la línea original (incluye tabulaciones) para citarla. Las
  // conversiones de tablas solo sirven para reconocer las filas de pesos.
  const originales=texto.split('\n');
  const titulo=l=>l.replace(CANVAS_PROGRAMA_ENCABEZADO,'').trim();
  const esEvaluacion=l=>GH_PROGRAMA_PAUTA.esEncabezadoEvaluacion(titulo(l),{encabezadosAmplios:true});
  const inicio=originales.findIndex(esEvaluacion);
  const leidas=new Set(lectura.evaluationSourceText.split('\n'));
  const seccion=[];
  for(const l of originales.slice(inicio+1)){
    if(CANVAS_PROGRAMA_ENCABEZADO.test(l))break;
    if(!l.trim())continue;
    if(!leidas.has(filaTablaProgramaCanvas(l).trim())&&
       GH_PROGRAMA_PAUTA.esEncabezadoEstructural(l)&&!/^\s*\d/.test(l))break;
    seccion.push(l);
  }
  const lineas=seccion.filter(l=>{
    const fila=filaTablaProgramaCanvas(l).trim();
    return fila&&!GH_PROGRAMA_PAUTA.lineaIgnorable(fila)&&(!lectura.parsedLines.includes(fila)||lectura.complexRuleLines.some(c=>c.line===fila));
  });
  const evidencia=GH_PROGRAMA_PAUTA.reglasDeEvaluacion(lineas,filas,base.recortado);
  if(evidencia.alternativas||originales.filter(esEvaluacion).length>1||
    seccion.some(l=>/\b(?:si|según|segun|alternativa|esquema|reemplaza|exime|criterio)\b/i.test(l)&&/%/.test(l)))
    return {...base,estado:'alternativas',filas:[],revisar:evidencia.revisar};
  const senales=[...new Set(lectura.reasons.map(r=>CANVAS_PROGRAMA_SENALES[r]).filter(Boolean))];
  const reglas=[...evidencia.propuestas,...evidencia.revisar].map(p=>p.cita);
  return {...base,estado:'propuesta',filas,senales,reglas,...evidencia};
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
    .filter(a=>a&&Number.isSafeInteger(a.id)&&['pdf','docx','txt','archivo'].includes(a.tipo)&&!(a.tamano>15*1024*1024))
    .map(a=>({...a,puntaje:puntajeArchivoPrograma(a)}))
    .filter(a=>a.puntaje>0)
    .sort((x,y)=>y.puntaje-x.puntaje||String(x.nombre).localeCompare(String(y.nombre)))
    .slice(0,CANVAS_ARCHIVOS_MAX);
}
async function programaDesdeArchivosCanvas(cursoId,sigla){
  const p=pluginCanvas();if(!p||typeof p.archivosCurso!=='function')return null;
  let lista;
  try{const r=await p.archivosCurso({curso:cursoId});lista=Array.isArray(r&&r.data)?r.data:[];}
  catch(e){return {resultado:{estado:'sin_acceso',filas:[]},archivo:null};}
  const candidatos=archivosProgramaCanvas(lista);
  // Cuántos se revisaron, para que «no lo encontramos» diga algo concreto.
  if(!candidatos.length)return {resultado:{estado:'sin_archivo',filas:[],revisados:lista.length},archivo:null};
  let mejor=null;
  for(const a of candidatos){
    let leido;
    try{leido=await p.leerArchivo({curso:cursoId,archivo:a.id});}catch(e){continue;}
    const texto=String(leido&&leido.texto||'');
    const resultado=texto.trim()?pautaDesdeProgramaCanvas({texto,archivo:false,recortado:!!leido.recortado},sigla):{estado:'escaneado',filas:[]};
    if(resultado.estado==='propuesta')return {resultado,archivo:a.nombre};
    if(!mejor||(!mejor.resultado.texto&&resultado.texto))mejor={resultado,archivo:a.nombre};
  }
  return mejor||{resultado:{estado:'sin_archivo',filas:[]},archivo:null};
}
function mensajeProgramaCanvas(res){
  return {
    incompleto:'Solo recibimos parte del programa. Revisa el texto antes de ingresar sus reglas y porcentajes.',
    alternativas:'El programa presenta alternativas o condiciones que requieren revisión. Comprueba cuál te corresponde.',
    sin_archivo:(res.revisados?'Revisamos '+res.revisados+' archivo'+(res.revisados===1?'':'s')+' del curso en Canvas y ninguno parece el programa.':'Este curso no tiene archivos visibles en Canvas.')+' Escribe las evaluaciones con su porcentaje.',
    sin_acceso:'Canvas no nos dejó ver los archivos de este curso. Escribe las evaluaciones con su porcentaje.',
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
  const usado=pautaProgramaCanvasDraft?.ramoId===r.id&&pautaProgramaCanvasDraft.lectura===d&&!!d;
  let cuerpo;
  if(!d)cuerpo='<div class="pauta-plantillas-opciones"><button type="button" style="min-height:44px;" onclick="leerProgramaCanvas()">Leer el programa de Canvas</button></div>';
  else if(d.cargando)cuerpo='<div class="pauta-plantillas-nota" role="status">Leyendo el programa…</div>';
  else if(d.error)cuerpo='<div class="pauta-plantillas-nota" role="status">'+esc(d.error)+'</div>';
  else if(usado)cuerpo=revisionReglasProgramaHTML(r,d.resultado);
  else if(d.resultado.estado!=='propuesta'){
    cuerpo='<p role="status">'+esc(mensajeProgramaCanvas(d.resultado))+'</p>'+citasPendientesCanvasHTML(d.resultado);
  }
  else{
    const res=d.resultado;
    const filas=res.filas.map(f=>'<li style="display:flex;justify-content:space-between;gap:12px;"><span>'+esc(f.nombre)+(f.cantidad?' · '+f.cantidad+' notas':'')+'</span><span style="font-variant-numeric:tabular-nums;">'+textoPesoCanvas(f.peso)+'</span></li>').join('');
    const avisos=(res.revisar||[]).map(p=>'<li><q>'+esc(p.cita)+'</q> '+esc(p.motivo)+'</li>').join('');
    cuerpo='<ul style="list-style:none;margin:0 0 6px;padding:0;font-size:0.8125rem;line-height:1.6;">'+filas+'</ul>'
      +(avisos?'<details><summary style="min-height:44px">Condiciones para revisar · '+esc((res.senales||[]).join(' · '))+'</summary><ul>'+avisos+'</ul></details>':'')
      +'<div class="pauta-plantillas-opciones"><button type="button" style="min-height:44px;" onclick="usarProgramaCanvas()">Usar estas evaluaciones</button></div>'
      +'<div class="pauta-plantillas-nota">'+(d.archivo?'Sale de «'+esc(d.archivo)+'». ':'')+'Quedan en el editor para revisarlas. Nada cambia hasta que toques Guardar.</div>';
  }
  if(d?.resultado?.texto)cuerpo+='<div class="pauta-plantillas-opciones"><button type="button" style="min-height:44px" onclick="verProgramaCanvas()">Ver programa</button></div>';
  return '<div class="pauta-plantillas" id="m-pauta-programa"><div class="pauta-plantillas-titulo">Programa en Canvas</div>'+cuerpo+'</div>';
}
function repintarProgramaCanvas(){
  const el=document.getElementById('m-pauta-programa');
  if(el)el.outerHTML=canvasProgramaEditorHTML();
}
async function leerProgramaCanvas(){
  const r=(S.ramos||[]).find(x=>x.id===currentRamoId);
  if(!r||!canvasDisponible())return;
  const id=r.id,sigla=siglaRamoCanvas(r),estado=S,usuario=currentUser?.id||null;
  const solicitud={cargando:true};
  const vigente=()=>canvasProgramaRamo.get(id)===solicitud&&S===estado&&(currentUser?.id||null)===usuario&&currentRamoId===id&&S.ramos.includes(r);
  canvasProgramaRamo.set(id,solicitud);repintarProgramaCanvas();
  try{
    const candidatos=(await cursosCanvas()).filter(c=>c.sigla===sigla&&(!r.seccion||Number(r.seccion)===c.seccion));
    const curso=candidatos.length===1?candidatos[0]:null;
    if(!vigente())return;
    if(!curso)canvasProgramaRamo.set(id,{error:candidatos.length?'Hay varias secciones en Canvas. Indica la tuya en el ramo.':'No encontramos este ramo en tu Canvas de este semestre.'});
    else{
      let resultado=pautaDesdeProgramaCanvas(await canvasGet(`courses/${curso.id}`,{'include[]':['syllabus_body']}),sigla),archivo=null;
      // Sin pauta en el campo «programa», se busca entre los archivos del curso.
      if(['vacio','archivo','sin_seccion','sin_pesos'].includes(resultado.estado)){
        let desdeArchivos=null;
        try{desdeArchivos=await programaDesdeArchivosCanvas(curso.id,sigla);}catch(e){}
        if(desdeArchivos&&(desdeArchivos.resultado.estado==='propuesta'||(['vacio','archivo','sin_seccion'].includes(resultado.estado)&&(!resultado.texto||desdeArchivos.resultado.texto)))){
          resultado=desdeArchivos.resultado;archivo=desdeArchivos.archivo;
        }
      }
      if(!vigente())return;
      canvasProgramaRamo.set(id,{resultado,archivo});
      track('canvas_programa',{estado:resultado.estado,evaluaciones:resultado.filas.length,senales:(resultado.senales||[]).length,desde_archivo:!!archivo});
    }
  }catch(e){if(!vigente())return;canvasProgramaRamo.set(id,{error:'No pudimos leer Canvas. Revisa la conexión o el token.'});}
  repintarProgramaCanvas();
}
// Lleva la propuesta al borrador del editor. Una evaluación con el mismo
// nombre conserva su id, sus notas y sus reglas; una con notas o con una regla
// de aprobación que el programa no menciona se queda con su porcentaje, para
// que la persona decida: el lector no conoce esas reglas y no debe borrarlas.
function filasProgramaParaEditor(filas,borrador,ramo){
  const conRegla=new Set();
  ((ramo&&ramo.gates)||[]).forEach(g=>{if(g.catId)conRegla.add(g.catId);(g.catIds||[]).forEach(id=>conRegla.add(id));});
  for(const regla of ramo?.reemplazosOptativos||[]){
    conRegla.add(regla.fuenteId);
    for(const id of [...(regla.destinosIds||[]),...(regla.rendidasIds||[])])conRegla.add(id);
  }
  for(const cat of ramo?.categorias||[]){
    if(cat.dropLowest||ramo.eximicion?.segun?.includes(cat.nombre)||ramo.eximicion?.evaluacion===cat.nombre)conRegla.add(cat.id);
  }
  const usadas=new Set();
  const nuevas=filas.map(f=>{
    const anterior=borrador.find(b=>!usadas.has(b)&&String(b.nombre||'').trim()&&normName(b.nombre)===normName(f.nombre));
    if(anterior)usadas.add(anterior);
    const cantidad=f.cantidad||(anterior&&anterior.cantidad)||null;
    return {id:anterior?anterior.id:null,nombre:f.nombre,peso:f.peso,tieneNotas:!!(anterior&&anterior.tieneNotas),
      varias:!!(f.cantidad||(anterior&&anterior.varias)),cantidad,...(anterior&&anterior.reglas?{reglas:anterior.reglas}:{})};
  });
  return nuevas.concat(borrador.filter(b=>!usadas.has(b)&&(b.tieneNotas||b.reglas?.descarte||b.reglas?.descartePrograma||b.reglas?.min||(b.id&&conRegla.has(b.id)))));
}
function usarProgramaCanvas(){
  const r=(S.ramos||[]).find(x=>x.id===currentRamoId);
  const d=r&&canvasProgramaRamo.get(r.id);
  if(!d||!d.resultado||d.resultado.estado!=='propuesta')return;
  const estadoCanvas=S;
  const aplicar=()=>{
    if(S!==estadoCanvas||currentRamoId!==r.id||!S.ramos.includes(r)||canvasProgramaRamo.get(r.id)!==d)return;
    pautaDraft=filasProgramaParaEditor(d.resultado.filas,pautaDraft,r);
    const citasAnteriores=[eximicionGuardadaCanvas(r)?.ayuda,citaReemplazoCanvas(r)].filter(Boolean);
    const citas=d.resultado.reglas||[];
    // El formato existente atribuye las citas a un único documento. Si la
    // regla vigente necesita la cita anterior, mantenemos esa fuente intacta.
    const conservarFuente=citasAnteriores.some(c=>!citas.some(n=>n.trim()===c.trim()));
    pautaProgramaCanvasDraft={ramoId:r.id,archivo:d.archivo||null,citas,lectura:d,aceptadas:[],citasAnteriores,conservarFuente};

    renderPautaManualModal();
    track('canvas_programa_usado',{evaluaciones:d.resultado.filas.length});
  };
  if(!pautaDraft.some(f=>String(f.nombre||'').trim()))return aplicar();
  showConfirm('Usar el programa de Canvas','Cambia las evaluaciones del editor por las del programa. Las notas que ya tienes se conservan cuando el nombre coincide. Nada se guarda hasta que toques Guardar.',aplicar,{label:'Usar programa',danger:false,focusCancel:true});
}

// Propuesta aditiva para revisión de Lucas: solo nombre del archivo y hasta
// cuatro líneas ya marcadas por el lector. Sin token, URL, id de curso ni texto
// completo. La firma evita atribuir citas de un archivo a otro tras una fusión.
function firmaContenidoProgramaCanvas(d){return hashPautaSugerida(JSON.stringify([d.archivo,d.citas,d.pauta]));}
function crearProgramaCanvas(archivo,citas,r){
  const d={archivo:typeof archivo==='string'?archivo.trim().slice(0,160):null,
    citas:(Array.isArray(citas)?citas:[]).filter(c=>typeof c==='string'&&c.trim()).slice(0,4).map(c=>c.trim().slice(0,220)),
    pauta:firmaPautaSugerida(r)};
  return {...d,firma:firmaContenidoProgramaCanvas(d)};
}
function copiarProgramaCanvas(d){
  if(!d||!(d.archivo===null||typeof d.archivo==='string'&&d.archivo.length<=160)||
    !Array.isArray(d.citas)||d.citas.length>4||d.citas.some(c=>typeof c!=='string'||!c.trim()||c.length>220)||
    !/^[0-9a-f]{16}$/.test(d.pauta)||!/^[0-9a-f]{16}$/.test(d.firma)||firmaContenidoProgramaCanvas(d)!==d.firma)return null;
  return {archivo:d.archivo,citas:[...d.citas],pauta:d.pauta,firma:d.firma};
}

// El texto completo vive únicamente en la lectura del editor. Volver conserva
// las filas y las reglas en borrador, sin reabrir el ramo ni consultar Canvas.
function verProgramaCanvas(){
  if(!canvasDisponible())return;
  const res=canvasProgramaRamo.get(currentRamoId)?.resultado;
  if(!res?.texto)return;
  const contenido=document.getElementById('modal-content');
  contenido.innerHTML='<button type="button" class="settings-back" onclick="renderPautaManualModal();openModal()">Volver</button><h2 class="modal-title">Programa en Canvas</h2>'
    +(res.recortado?'<p>Canvas entregó solo una parte del programa.</p>':'')
    +'<div style="overflow-wrap:anywhere;white-space:pre-wrap;line-height:1.55">'+res.texto.split('\n').map(l=>
      CANVAS_PROGRAMA_ENCABEZADO.test(l)?'<strong>'+esc(l.replace(CANVAS_PROGRAMA_ENCABEZADO,''))+'</strong>':esc(l)).join('\n')+'</div>';
  openModal();
}
function descripcionReglaCanvas(p){
  const n=x=>String(x).replace('.',',');
  switch(p.tipo){
    case 'descarte':return p.nombre+' · '+(p.count===1?'Se descarta la nota más baja.':'Se descartan las '+p.count+' notas más bajas.');
    case 'grupo':return 'Promedio ponderado de '+p.nombre+' y '+p.otra+' · Bajo '+n(p.min)+', la nota final tiene tope '+n(p.cap)+'.';
    case 'minimo':return p.nombre+' · Bajo '+n(p.min)+', la nota final tiene tope '+n(p.cap)+'.';
    case 'eximicion':return 'Te eximes con promedio de presentación desde '+n(p.min)+(p.cadaNota?' y todas las notas desde '+n(p.cadaNota):'')+'.';
    case 'reemplazo':return 'El examen puede reemplazar '+p.nombre+' si sube tu nota final.';
  }
}
function diferenciaReglaCanvas(p,r){
  const fila=pautaDraft.find(f=>f.nombre===p.nombre);
  if(!fila)return 'La evaluación ya no está en el editor.';
  if(pautaDraft.filter(f=>normName(f.nombre)===normName(p.nombre)).length!==1)
    return 'Hay dos evaluaciones con ese nombre. Revisa cuál corresponde.';
  const cat=r.categorias.find(c=>c.id===fila.id);
  if(p.tipo==='descarte'){
    const count=fila.reglas?.descarte||cat?.dropLowest?.count;
    if(count)return 'Tu descarte actual es de '+count+' '+(Number(count)===1?'nota':'notas')+'. Se conserva.';
    if(cat?.dropLowest||fila.reglas?.editoDescarte)return 'Se conserva el descarte que definiste.';
    if(!(fila.varias&&fila.cantidad>p.count))return 'Revisa la cantidad de notas en el editor.';
  }
  if(p.tipo==='grupo'){
    if(!pautaDraft.some(f=>f.nombre===p.otra))return 'La segunda evaluación ya no está en el editor.';
    const otra=diferenciaReglaCanvas({...p,tipo:'minimo',nombre:p.otra},r);
    if(otra)return otra;
  }
  if(p.tipo==='minimo'||p.tipo==='grupo'){
    const gate=(r.gates||[]).find(g=>fila.id&&(g.catId===fila.id||g.catIds?.includes(fila.id)));
    if(gate||fila.reglas?.min||fila.reglas?.tope||fila.reglas?.editoMinimo){
      const min=fila.reglas?.min||gate?.min,cap=fila.reglas?.tope||gate?.cap;
      return 'Se conserva tu requisito'+(min?' de '+String(min).replace('.',','):'')+(cap?', con tope '+(cap==='self'?'del grupo':String(cap).replace('.',',')):'')+'.';
    }
  }
  if(p.tipo==='eximicion'){
    // La eximición que la persona escribió en el editor (guardada o en el
    // borrador) manda sobre la propuesta del programa: nunca quedan dos.
    const borrador=pautaEximicionDraft?.activa?Number(String(pautaEximicionDraft.min||'').replace(',','.')):null;
    const propia=borrador??(r.eximicionPropia?r.eximicionPropia.min:undefined);
    if(propia!==undefined)return 'Se conserva tu eximición'+(Number.isFinite(propia)?' desde '+String(propia).replace('.',','):'')+'.';
  }
  if(p.tipo==='eximicion'||p.tipo==='reemplazo'){
    const original=pautaProgramaCanvasDraft.lectura.resultado.filas;
    if(original.length!==pautaDraft.length||!original.every(o=>pautaDraft.some(f=>f.nombre===o.nombre&&f.peso===o.peso&&(f.cantidad||1)===(o.cantidad||1))))
      return 'Las evaluaciones del editor difieren de las del programa.';
    const def=definicionPresetDelRamo(r);
    if(p.tipo==='eximicion'){
      const ex=r.eximicion||def?.eximicion;
      if(ex)return 'Se conserva tu eximición'+(Number.isFinite(ex.min)?' desde '+String(ex.min).replace('.',','):'')+'.';
      if(pautaDraft.some(f=>f.reglas?.descarte||f.reglas?.descartePrograma)||
        pautaProgramaCanvasDraft.lectura.resultado.propuestas.some(q=>q.tipo==='descarte'))
        return 'El programa debe aclarar si la eximición considera el descarte.';
    }
    if(p.tipo==='reemplazo'&&[p.nombre,p.examen].some(n=>pautaDraft.find(f=>f.nombre===n)?.varias))
      return 'El reemplazo requiere una nota individual en cada evaluación.';
    if(p.tipo==='reemplazo'&&(r.reemplazosOptativos?.length||def?.reemplazosOptativos?.length)){
      const actual=r.reemplazosOptativos?.[0];
      const destinos=r.categorias.filter(c=>actual?.destinosIds?.includes(c.id)).map(c=>c.nombre);
      return 'Se conserva tu fórmula de reemplazo'+(destinos.length?' para '+destinos.join(', '):'')+'.';
    }
  }
  if(pautaProgramaCanvasDraft.conservarFuente)
    return 'Tu regla vigente usa una cita de otro programa. Se conserva esa fuente.';
  return '';
}
function citasPendientesCanvasHTML(res){
  const pendientes=(res.revisar||[]).map(p=>'<li><q>'+esc(p.cita)+'</q> '+esc(p.motivo)+'</li>').join('');
  return pendientes?'<details><summary style="min-height:44px">Para revisar</summary><ul>'+pendientes+'</ul></details>':'';
}
function revisionReglasProgramaHTML(r,res){
  const propuestas=res.propuestas||[],adoptadas=pautaProgramaCanvasDraft.aceptadas.filter(p=>!diferenciaReglaCanvas(p,r));
  const filas=propuestas.map(p=>{
    const diferencia=diferenciaReglaCanvas(p,r);
    return '<li style="margin:12px 0"><strong>'+esc(descripcionReglaCanvas(p))+'</strong><blockquote style="margin:4px 0;color:var(--fg2)">'+esc(p.cita)+'</blockquote>'+
      (diferencia?'<span>'+esc(diferencia)+'</span>':'')+'</li>';
  }).join('');
  return '<p>Evaluaciones en el editor.</p>'+(filas?'<h3>Reglas del programa</h3><ul style="list-style:none;padding:0">'+filas+'</ul>':'')
    +citasPendientesCanvasHTML(res)
    +(adoptadas.length?'<p role="status">Reglas en el editor. Revisa los cambios y toca Guardar.</p>':
      propuestas.some(p=>!diferenciaReglaCanvas(p,r))?'<div class="pauta-plantillas-opciones"><button type="button" style="min-height:44px" onclick="usarReglasProgramaCanvas()">Usar también estas reglas</button></div>':'');
}
function usarReglasProgramaCanvas(){
  const r=S.ramos.find(x=>x.id===currentRamoId),d=pautaProgramaCanvasDraft;
  if(!canvasDisponible()||!r||d?.ramoId!==r.id||d.lectura!==canvasProgramaRamo.get(r.id))return;
  d.aceptadas=d.lectura.resultado.propuestas.filter(p=>!diferenciaReglaCanvas(p,r));
  repintarProgramaCanvas();
}
function eximicionDesdeLineaCanvas(p,cats){
  return {evaluacion:p.nombre,segun:p.segun,min:p.min,ignoraDescartes:false,requierePautaOriginal:true,
    pauta:cats.map(c=>[c.nombre,c.peso,{slots:c.slots||1,dropLowest:c.dropLowest||null}]),
    ...(p.cadaNota?{minimos:[{evaluaciones:p.segun,min:p.cadaNota,cadaNota:true}]}:{}),ayuda:p.cita.trim()};
}
// Una eximición histórica copiada del catálogo sigue su camino original.
// Solo se reconoce la del editor cuando hay una cita íntegra del programa
// firmado y la regla guardada coincide exactamente con lo que declara esa cita.
function igualesReglaCanvas(a,b){
  if(a===b)return true;
  if(!a||!b||typeof a!=='object'||typeof b!=='object'||Array.isArray(a)!==Array.isArray(b))return false;
  const claves=Object.keys(a);
  return claves.length===Object.keys(b).length&&claves.every(k=>Object.hasOwn(b,k)&&igualesReglaCanvas(a[k],b[k]));
}
function eximicionGuardadaCanvas(r){
  const ex=r.eximicion;
  if(!ex?.ayuda||!Array.isArray(ex.pauta)||!r.programaCanvas?.citas?.includes(ex.ayuda))return null;
  const cats=ex.pauta.map(f=>Array.isArray(f)?{nombre:f[0],peso:f[1],slots:f[2]?.slots,dropLowest:f[2]?.dropLowest}:null);
  if(cats.some(c=>!c||typeof c.nombre!=='string'||!Number.isFinite(c.peso)))return null;
  const p=GH_PROGRAMA_PAUTA.reglasDeEvaluacion([ex.ayuda],cats.map(c=>({...c,cantidad:c.slots>1?c.slots:null}))).propuestas[0];
  return p?.tipo==='eximicion'&&igualesReglaCanvas(eximicionDesdeLineaCanvas(p,cats),ex)?ex:null;
}
function reemplazoDesdeLineaCanvas(p,cats){
  const fuente=cats.find(c=>c.nombre===p.examen),destino=cats.find(c=>c.nombre===p.nombre);
  return fuente&&destino?{tipo:'reemplazo',fuenteId:fuente.id,destinosIds:[destino.id],rendidasIds:[destino.id]}:null;
}
function citaReemplazoCanvas(r){
  if(r.reemplazosOptativos?.length!==1||!r.programaCanvas)return null;
  const filas=r.categorias.map(c=>({nombre:c.nombre,cantidad:c.slots}));
  for(const cita of r.programaCanvas.citas){
    const p=GH_PROGRAMA_PAUTA.reglasDeEvaluacion([cita],filas).propuestas[0];
    if(p?.tipo==='reemplazo'&&igualesReglaCanvas(reemplazoDesdeLineaCanvas(p,r.categorias),r.reemplazosOptativos[0]))return cita;
  }
  return null;
}
function guardarReglasProgramaCanvas(r,aceptadas){
  for(const p of aceptadas){
    const cat=r.categorias.find(c=>c.nombre===p.nombre);
    if(!cat)continue;
    if(p.tipo==='descarte'){cat.dropLowest={count:p.count};cat.descarteOrigen='canvas';}
    if(p.tipo==='grupo'){
      const otra=r.categorias.find(c=>c.nombre===p.otra);
      if(otra)(r.gates??=[]).push({type:'group_min',nombre:cat.nombre+' y '+otra.nombre,catIds:[cat.id,otra.id],min:p.min,cap:p.cap,exacto:true,ayuda:p.cita});
    }
    if(p.tipo==='minimo')(r.gates??=[]).push({type:'min_grade_required',catId:cat.id,min:p.min,cap:p.cap,exacto:true,ayuda:p.cita});
    if(p.tipo==='eximicion')r.eximicion=eximicionDesdeLineaCanvas(p,r.categorias);
    if(p.tipo==='reemplazo')r.reemplazosOptativos=[reemplazoDesdeLineaCanvas(p,r.categorias)];
  }
}
