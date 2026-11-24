// Canvas UC · pauta desde el programa del curso. Programas y notas sintéticos.
// El texto imita lo que entrega el plugin: texto plano, títulos con «# » y
// celdas de tabla separadas por tabulación (lo prueba canvas-nativo.test.js).
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const leer=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
const ids=new Map();
function nodo(id){if(ids.has(id))return ids.get(id);const n={isConnected:true,innerHTML:'',outerHTML:'',textContent:'',value:'',disabled:false,
  style:{setProperty(){},removeProperty(){}},classList:{add(){},remove(){},contains(){return false},toggle(){}},
  addEventListener(){},appendChild(){},setAttribute(){},removeAttribute(){},focus(){},querySelectorAll(){return []},dataset:{}};
  ids.set(id,n);return n;}
let programa={},rutas=[],pedidos=[],guardados=0;
const plugin={estado:async()=>({conectado:true}),get:async({path,params})=>{rutas.push(path);pedidos.push({path,params});
  if(path==='courses')return {data:[{id:42,course_code:'MAT1620-2',name:'Curso sintético',term:{name:'2026 Segundo Semestre'}}]};
  if(path==='courses/42')return {data:programa};
  return {data:[]};},
  // Archivos del curso (Lucas, 2026-11-17): nombres sin enlaces y texto por id.
  archivosCurso:async({curso})=>{llamadasArchivos.push(['lista',curso]);return {data:archivosCurso};},
  leerArchivo:async({curso,archivo})=>{llamadasArchivos.push(['leer',archivo]);return textos[archivo]||{texto:''};}};
let archivosCurso=[],textos={},llamadasArchivos=[];
const ctx={console,Intl,window:{addEventListener(){},matchMedia:()=>({matches:false,addEventListener(){},addListener(){}}),
  Capacitor:{isNativePlatform:()=>true,Plugins:{GradeHubCanvas:plugin}}},
  document:{getElementById:nodo,createElement:()=>nodo('nuevo'),addEventListener(){},documentElement:nodo('html'),body:nodo('body'),querySelector:()=>nodo('query'),querySelectorAll:()=>[]},
  localStorage:{getItem(){return null},setItem(){guardados++},removeItem(){}},navigator:{},location:{origin:'',pathname:'/',hash:''},setTimeout,clearTimeout};
vm.createContext(ctx);for(const f of ['data.js','engine.js','app.js'])vm.runInContext(leer(f),ctx,{filename:f});
const run=s=>vm.runInContext(s,ctx);
const json=s=>JSON.parse(run('JSON.stringify('+s+')'));
const leerPrograma=(p,sigla='MAT1620')=>json('pautaDesdeProgramaCanvas('+JSON.stringify(p)+','+JSON.stringify(sigla)+')');

const conTabla=[
  '# Descripción','Curso sintético de prueba. Se exige 75% de asistencia a laboratorios.',
  '# Evaluación','Evaluación\tPonderación','Interrogación 1\t25%','Interrogación 2\t25%','3 Controles 10% c/u','Examen\t20%',
  'Se eximen del examen quienes tengan promedio igual o superior a 5,5.',
  '# Bibliografía','Lectura complementaria 10%'].join('\n');

(async()=>{
  // Con tabla de ponderaciones: se leen solo las filas de la sección.
  const a=leerPrograma({texto:conTabla,archivo:false,recortado:false});
  assert.equal(a.estado,'propuesta');
  assert.deepEqual(a.filas,[{nombre:'Interrogación 1',peso:25,cantidad:null},{nombre:'Interrogación 2',peso:25,cantidad:null},
    {nombre:'Controles',peso:30,cantidad:3},{nombre:'Examen',peso:20,cantidad:null}],'filas y cantidad declarada; la bibliografía no entra');
  assert.ok(a.senales.includes('Eximición'),'la eximición se marca para revisar');
  assert.ok(a.reglas.some(l=>/eximen/.test(l)),'con la línea del programa');

  // Sin pesos, sin sección, que no suma, PDF y otro ramo: no se propone nada.
  assert.equal(leerPrograma({texto:'# Evaluación\nHabrá dos interrogaciones y un examen final.'}).estado,'sin_pesos');
  assert.equal(leerPrograma({texto:'# Bienvenida\nNos vemos el lunes.'}).estado,'sin_seccion');
  const noSuma=leerPrograma({texto:'# Evaluaciones\nInterrogación 1\t30%\nExamen\t60%'});
  assert.equal(noSuma.estado,'no_suma');assert.equal(noSuma.filas.length,0);
  assert.match(run('mensajeProgramaCanvas('+JSON.stringify(noSuma)+')'),/90 %/);
  assert.equal(leerPrograma({texto:'',archivo:true}).estado,'archivo','programa como archivo adjunto');
  assert.equal(leerPrograma({texto:'Programa del curso: programa.pdf',archivo:true}).estado,'archivo');
  assert.equal(leerPrograma({texto:''}).estado,'vacio');
  assert.equal(leerPrograma({texto:'Sigla: MAT1610\n# Evaluación\nInterrogación\t40%\nExamen\t60%'}).estado,'otro_ramo');
  assert.equal(leerPrograma({texto:'# Ponderaciones\nTareas\t40%\nTareas\t60%'}).estado,'revisar','nombres repetidos');
  assert.equal(leerPrograma({texto:'# Ponderaciones\nInforme\t40%\nPresentación\t60%'}).estado,'propuesta','título más amplio solo para Canvas');
  assert.equal(run("GH_PROGRAMA_PAUTA.esEncabezadoEvaluacion('Ponderaciones')"),false,'el catálogo no cambia');

  // En el editor: propone, no escribe, y conserva notas y reglas.
  ctx.currentUser={id:'00000000-0000-0000-0000-000000000001'};
  run("S.tenant='uc';S.tipoCuenta='estudiante';S.ramos=[{id:'r',nombre:'Cálculo II',sigla:'MAT1620',gates:[{catId:'lab',min:4}],categorias:["
    +"{id:'i',nombre:'Interrogación 1',peso:30,notas:[{id:'n1',nombre:'Interrogación 1',valor:5.2,peso:1}]},"
    +"{id:'c',nombre:'controles',peso:20,slots:3,directNota:true,notas:[{id:'c0',nombre:'Control 1',slot:0,valor:6,peso:1}]},"
    +"{id:'lab',nombre:'Laboratorio',peso:10,notas:[]},{id:'p',nombre:'Participación',peso:40,notas:[]}]}];currentRamoId='r';");
  run('openModal=()=>{};closeModal=()=>{};showToast=()=>{};renderRamo=()=>{};renderHome=()=>{};track=()=>{};globalThis.syncToCloud=()=>{};informarAportePauta=()=>{}');
  run('openPautaManualModal()');
  assert.match(nodo('modal-content').innerHTML,/Leer el programa de Canvas/,'el editor ofrece leer el programa');
  programa={texto:conTabla+'\n<script>alert(1)</script>',archivo:false,recortado:false};
  const antes=run('JSON.stringify(S)'),guardadosAntes=guardados;
  await run('leerProgramaCanvas()');
  assert.deepEqual(rutas,['courses','courses/42']);
  assert.equal(JSON.stringify(pedidos.at(-1).params),JSON.stringify({'include[]':['syllabus_body']}),'solo el programa');
  const html=run('canvasProgramaEditorHTML()');
  assert.match(html,/Interrogación 2/);assert.match(html,/Controles · 3 notas/);assert.match(html,/Eximición/);
  assert.ok(!html.includes('<script>'),'el texto del programa nunca se pinta como HTML');
  assert.equal(run('JSON.stringify(S)'),antes,'leer el programa no cambia el ramo');
  assert.equal(guardados,guardadosAntes);

  let confirmo=0;ctx.__confirmar=()=>{confirmo++};
  run('showConfirm=(t,d,fn)=>{__confirmar();fn()}');
  run('usarProgramaCanvas()');
  assert.equal(confirmo,1,'reemplazar evaluaciones escritas pide confirmación');
  const draft=json('pautaDraft.map(f=>[f.id,f.nombre,f.peso,f.cantidad||null])');
  assert.deepEqual(draft,[['i','Interrogación 1',25,null],[null,'Interrogación 2',25,null],['c','Controles',30,3],[null,'Examen',20,null],['lab','Laboratorio',10,null]],
    'mismo nombre conserva id; Laboratorio tiene una regla y se queda; Participación sin notas sale');
  assert.equal(run('JSON.stringify(S)'),antes,'nada cambia hasta Guardar');

  run('guardarPautaManual()');
  const cats=json('S.ramos[0].categorias');
  assert.deepEqual(cats.map(c=>[c.nombre,c.peso]),[['Interrogación 1',25],['Controles',30],['Laboratorio',10],['Interrogación 2',25],['Examen',20]]);
  assert.deepEqual(cats.find(c=>c.id==='i').notas.map(n=>n.valor),[5.2],'la nota de la I1 sigue');
  assert.deepEqual(cats.find(c=>c.id==='c').notas.map(n=>[n.slot,n.valor]),[[0,6]],'el Control 1 sigue en su casilla');
  assert.equal(cats.find(c=>c.id==='c').slots,3);
  assert.deepEqual(json('S.ramos[0].gates'),[{catId:'lab',min:4}],'la regla del laboratorio no se pierde');

  // Ramo sin evaluaciones: se usa sin preguntar, porque no hay nada que reemplazar.
  run("S.ramos.push({id:'r2',nombre:'Otro',sigla:'MAT1620',categorias:[]});currentRamoId='r2';openPautaManualModal()");
  programa={texto:'# Evaluación\nInforme\t40%\nPresentación\t60%'};
  await run('leerProgramaCanvas()');confirmo=0;run('usarProgramaCanvas()');
  assert.equal(confirmo,0);
  assert.deepEqual(json('pautaDraft.map(f=>[f.nombre,f.peso])'),[['Informe',40],['Presentación',60]]);
  // ─── El programa entre los archivos del curso ─────────────────────────────
  const orden=json('archivosProgramaCanvas('+JSON.stringify([
    {id:1,nombre:'Pauta de corrección I1.pdf',tipo:'pdf'},{id:2,nombre:'Clase a clase.pdf',tipo:'pdf'},
    {id:3,nombre:'PROGRAMA DE CURSO Lunes y Miércoles.docx',tipo:'docx',modulo:'Programa'},{id:4,nombre:'foto programa.png',tipo:'png'},
    {id:5,nombre:'programa_reglas_FIS1514(1).pdf',tipo:'pdf',tamano:20*1024*1024}])+').map(a=>a.id)');
  assert.deepEqual(orden,[3,2],'primero el programa (y su módulo), después el clase a clase; nunca una pauta de corrección, una imagen ni un archivo gigante');
  run("S.ramos.push({id:'r3',nombre:'Sin programa',sigla:'MAT1620',categorias:[]});currentRamoId='r3';openPautaManualModal()");
  programa={texto:'',archivo:true};
  archivosCurso=[{id:2,nombre:'Clase a clase.pdf',tipo:'pdf'},{id:3,nombre:'PROGRAMA DE CURSO.docx',tipo:'docx',modulo:'Programa'}];
  textos={3:{texto:'# Evaluaciones\nEvaluación 1\t20%\nEvaluación 2\t20%\nEvaluación 3\t30%\nExamen final\t30%',recortado:false},2:{texto:'Semana 1: límites'}};
  llamadasArchivos=[];
  await run('leerProgramaCanvas()');
  assert.deepEqual(llamadasArchivos,[['lista',42],['leer',3]],'sin programa en Canvas, lee el mejor archivo y para al encontrar la pauta');
  const deArchivo=run('canvasProgramaEditorHTML()');
  assert.match(deArchivo,/Examen final/);assert.match(deArchivo,/Sale de «PROGRAMA DE CURSO\.docx»/,'dice de qué archivo salió');
  run('usarProgramaCanvas()');
  assert.deepEqual(json('pautaDraft.map(f=>[f.nombre,f.peso])'),[['Evaluación 1',20],['Evaluación 2',20],['Evaluación 3',30],['Examen final',30]]);
  // Un PDF escaneado no tiene texto: se dice, sin inventar.
  run("canvasProgramaRamo.clear()");archivosCurso=[{id:9,nombre:'Programa.pdf',tipo:'pdf'}];textos={9:{texto:''}};
  await run('leerProgramaCanvas()');
  assert.match(run('canvasProgramaEditorHTML()'),/escaneado/);
  // Sin archivos que parezcan programa.
  run("canvasProgramaRamo.clear()");archivosCurso=[{id:8,nombre:'Guía 3.pdf',tipo:'pdf'}];
  await run('leerProgramaCanvas()');
  assert.match(run('canvasProgramaEditorHTML()'),/Revisamos 1 archivo del curso en Canvas y ninguno parece el programa/);
  // Un ítem de módulo sin extensión en el título también se prueba.
  run("canvasProgramaRamo.clear()");archivosCurso=[{id:11,nombre:'Programa del curso',tipo:'archivo',modulo:'Información'}];
  textos={11:{texto:'# Evaluación\nInforme\t40%\nPresentación\t60%'}};llamadasArchivos=[];
  await run('leerProgramaCanvas()');
  assert.deepEqual(llamadasArchivos,[['lista',42],['leer',11]]);assert.match(run('canvasProgramaEditorHTML()'),/Sale de «Programa del curso»/);
  // Sin permiso para ver archivos: se dice así, sin culpar al token.
  run("canvasProgramaRamo.clear()");const listaReal=plugin.archivosCurso;plugin.archivosCurso=async()=>{throw new Error('401')};
  await run('leerProgramaCanvas()');plugin.archivosCurso=listaReal;
  assert.match(run('canvasProgramaEditorHTML()'),/no nos dejó ver los archivos/);
  assert.equal(json('S.ramos.find(r=>r.id===\'r3\').categorias').length,0,'nada se guarda solo');
  // Del puente al borrador, al mismo Guardar y al motor. Cada ramo tiene
  // estructura propia. Abrir la fuente o cancelar nunca cambia la cuenta.
  const fixture=slug=>leer('tests/fixtures/programas-sinteticos/'+slug+'.txt');
  const preparar=async slug=>{
    programa={texto:fixture(slug),recortado:false};
    run("S.ramos=[{id:'motor',sigla:'MAT1620',nombre:'Ramo sintético de reglas',categorias:[],gates:[]}];currentRamoId='motor';globalThis.r=S.ramos.find(x=>x.id===currentRamoId);openPautaManualModal()");
    await run('leerProgramaCanvas()');run('usarProgramaCanvas()');
    const antes=run('JSON.stringify(r)');
    assert.match(run('canvasProgramaEditorHTML()'),/Usar también estas reglas/);
    run('verProgramaCanvas()');assert.match(nodo('modal-content').innerHTML,/Volver/);
    run('renderPautaManualModal();usarReglasProgramaCanvas()');
    assert.equal(run('JSON.stringify(r)'),antes);
  };
  const notas=(nombre,valores)=>run('r.categorias.find(c=>c.nombre==='+JSON.stringify(nombre)+').notas='+
    JSON.stringify(valores.map((valor,slot)=>({id:nombre+slot,nombre:nombre+' '+(slot+1),valor,slot,peso:1}))));
  const recargar=()=>run("S=normalize(JSON.parse(JSON.stringify(S)));globalThis.r=S.ramos.find(x=>x.id==='motor')");
  await preparar('03-eximicion-con-minimos');run('guardarPautaManual()');recargar();
  notas('Controles',[4,5,6]);assert.equal(run('estadoEximicion(r).activa'),true,'eximición exactamente en 5,0');
  assert.equal(run('ramoAvg(r)'),5);
  notas('Controles',[3.9,6,7]);assert.equal(run('estadoEximicion(r).activa'),false,'ninguna nota bajo 4,0');
  await preparar('01-tabla-descarte');run('guardarPautaManual()');recargar();
  notas('Controles',[1,7,7]);notas('Examen',[7]);assert.equal(run('ramoAvg(r)'),7);
  notas('Controles',[1,1,1]);notas('Examen',[1]);assert.equal(run('gpa([r])'),1);
  await preparar('05-minimo-con-tope');run('guardarPautaManual()');recargar();
  notas('Prueba',[3.69]);notas('Examen',[7]);assert.equal(run('ramoAvg(r)'),3.9,'justo bajo el mínimo');
  notas('Prueba',[3.7]);assert(run('ramoAvg(r)')>3.9,'en el mínimo no rige el tope');
  await preparar('07-grupo-ponderado');run('guardarPautaManual()');recargar();
  notas('Proyecto',[3.9]);notas('Prueba',[4]);notas('Examen',[7]);assert.equal(run('ramoAvg(r)'),3.9);
  await preparar('08-reemplazo-optativo');run('guardarPautaManual()');recargar();
  notas('Prueba',[1]);notas('Examen',[7]);assert.equal(run('ramoAvg(r)'),7);
  notas('Prueba',[7]);notas('Examen',[1]);assert.equal(run('ramoAvg(r)'),4.6,'el examen solo reemplaza si mejora');
  await preparar('05-minimo-con-tope');
  run("actualizarReglaPauta(pautaDraft.findIndex(f=>f.nombre==='Prueba'),'min','4,5');actualizarReglaPauta(pautaDraft.findIndex(f=>f.nombre==='Prueba'),'tope','3,5')");
  assert.match(run('canvasProgramaEditorHTML()'),/Se conserva tu requisito de 4,5, con tope 3,5/);
  run('guardarPautaManual()');assert.equal(run('r.gates.length'),1);assert.equal(run('r.gates.find(g=>g.origen==="editor").min'),4.5);
  run('openPautaManualModal()');await run('leerProgramaCanvas()');run('usarProgramaCanvas()');assert.match(run('canvasProgramaEditorHTML()'),/Se conserva tu requisito/);assert.doesNotMatch(run('canvasProgramaEditorHTML()'),/onclick="usarReglasProgramaCanvas\(\)"/);
  run('openPautaManualModal()');assert.equal(run('pautaProgramaCanvasDraft'),null);
  programa={texto:'# Bienvenida\nTexto completo <script>prueba()</script>\n# Evaluación\nPrueba 100%'};
  await run('leerProgramaCanvas()');run('verProgramaCanvas()');
  assert.match(nodo('modal-content').innerHTML,/&lt;script&gt;/);assert.doesNotMatch(nodo('modal-content').innerHTML,/<script>/);
  await preparar('05-minimo-con-tope');
  run("r.gates=[{type:'min_grade_required',catId:'externa',min:4,cap:3.5,origen:'editor'}];guardarPautaManual()");
  assert.match(run('pautaDraftError'),/cambiaron mientras editabas/);
  assert.equal(run('r.categorias.length'),0);
  assert.equal(run('r.gates.find(g=>g.catId==="externa").min'),4);
  // Un corte puede ocultar una segunda fórmula incluso si el prefijo suma 100.
  assert.equal(leerPrograma({texto:fixture('01-tabla-descarte'),recortado:true}).estado,'incompleto');
  const anteriores=llamadasArchivos.length;
  programa={texto:fixture('14-discrecion')};await run('leerProgramaCanvas()');
  assert.match(run('canvasProgramaEditorHTML()'),/criterio del profesor/);
  assert.doesNotMatch(run('canvasProgramaEditorHTML()'),/Usar estas evaluaciones/);
  assert.equal(llamadasArchivos.length,anteriores,'no sustituye un programa ambiguo por otro archivo');
  // Una lectura que termina después de cambiar de cuenta no deja fuente reutilizable.
  const getReal=plugin.get;let resolverPrograma;
  plugin.get=async p=>p.path==='courses/42'?new Promise(resolve=>{resolverPrograma=resolve}):getReal(p);
  const tardia=run('leerProgramaCanvas()');
  while(!resolverPrograma)await new Promise(resolve=>setImmediate(resolve));
  run("S={...S,ramos:[]};currentUser={id:'00000000-0000-0000-0000-000000000002'};canvasProgramaRamo.clear()");
  resolverPrograma({data:{texto:'# Evaluación\nInforme\t100%'}});await tardia;plugin.get=getReal;
  assert.equal(run('canvasProgramaRamo.size'),0,'el resultado de la cuenta anterior se descarta');
  console.log('OK Canvas programa: lee pesos del programa, marca reglas, no inventa y solo guarda con Guardar');
})().catch(e=>{console.error(e);process.exit(1)});
