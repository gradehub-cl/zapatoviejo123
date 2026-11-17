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
  return {data:[]};}};
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
  console.log('OK Canvas programa: lee pesos del programa, marca reglas, no inventa y solo guarda con Guardar');
})().catch(e=>{console.error(e);process.exit(1)});
