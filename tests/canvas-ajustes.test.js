// #648/#673 · El puente solo aparece en iOS UC; datos y token son sintéticos.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const leer=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
const ids=new Map();
function nodo(id){if(ids.has(id))return ids.get(id);const n={isConnected:true,innerHTML:'',textContent:'',value:'',disabled:false,
  style:{setProperty(){},removeProperty(){}},classList:{add(){},remove(){},contains(){return false},toggle(){}},
  addEventListener(){},appendChild(){},setAttribute(){},removeAttribute(){},focus(){},querySelectorAll(){return []},dataset:{}};
  ids.set(id,n);return n;}
let conectado=false,tokenRecibido='',rutas=[],pedidos=[],guardados=0;
// Notas sintéticas: escala 1–7, puntos sobre 7, puntaje sobre 25, sin publicar y no calificables.
const tareasConNota=[
  {id:1,name:'I1',grading_type:'points',points_possible:7,submission:{score:5.5,grade:'5.5',workflow_state:'graded'}},
  {id:2,name:'Control 1',grading_type:'points',points_possible:7,submission:{score:4,grade:'4'}},
  {id:3,name:'Control 2',grading_type:'points',points_possible:7,submission:{score:6.3,grade:'6.3'}},
  {id:4,name:'Tarea 1',grading_type:'points',points_possible:25,submission:{score:18,grade:'18'}},
  {id:5,name:'Encuesta',grading_type:'not_graded',submission:{}},
  {id:6,name:'I2',grading_type:'points',points_possible:7,submission:{workflow_state:'unsubmitted'}},
  {id:7,name:'Quiz práctica',grading_type:'pass_fail',submission:{grade:'complete'}}];
const plugin={estado:async()=>({conectado}),conectar:async({token})=>{tokenRecibido=token;conectado=true},
  desconectar:async()=>{conectado=false},get:async({path,params})=>{rutas.push(path);pedidos.push({path,params});
    if(path==='courses')return {data:[{id:42,course_code:'MAT1620-2',name:'Curso sintético',apply_assignment_group_weights:true,term:{name:'2026 Segundo Semestre'}}]};
    if(path==='calendar_events')return {data:[{id:9,title:'Interrogación 2 [MAT1620-2]',start_at:'2099-11-03T21:30:00Z',all_day:false,context_code:'course_42'},
      {id:10,title:'Clase suspendida',start_at:'2099-11-05T15:00:00Z',all_day:false,context_code:'course_42'}]};
    if(path==='courses/42/assignment_groups')return {data:[{id:12,name:'Controles',group_weight:30},{id:13,name:'Interrogaciones',group_weight:70}]};
    if(params&&params['include[]'])return {data:tareasConNota,grupos:[{id:12,name:'Controles',group_weight:30},{id:13,name:'Interrogaciones',group_weight:70}]};
    return {data:[{name:'I1-P1',due_at:'2099-10-25T18:00:00Z'}]};}};
const ctx={console,Intl,window:{addEventListener(){},matchMedia:()=>({matches:false,addEventListener(){},addListener(){}}),
  Capacitor:{isNativePlatform:()=>true,Plugins:{GradeHubCanvas:plugin}}},
  document:{getElementById:nodo,createElement:()=>nodo('nuevo'),addEventListener(){},documentElement:nodo('html'),body:nodo('body'),querySelector:()=>nodo('query'),querySelectorAll:()=>[]},
  localStorage:{getItem(){return null},setItem(){guardados++},removeItem(){}},navigator:{},location:{origin:'',pathname:'/',hash:''},setTimeout,clearTimeout};
vm.createContext(ctx);for(const f of ['data.js','engine.js','app.js'])vm.runInContext(leer(f),ctx,{filename:f});
const run=s=>vm.runInContext(s,ctx);
function chk(c,m){assert.ok(c,m)}
// Arreglos del contexto vm: se comparan por contenido, no por prototipo.
const igual=(a,b,m)=>assert.equal(JSON.stringify(a),JSON.stringify(b),m);
(async()=>{
  ctx.currentUser={id:'00000000-0000-0000-0000-000000000001'};
  run("S.tenant='uc';S.tipoCuenta='estudiante';S.ramos=[{id:'r',nombre:'Cálculo II',sigla:'MAT1620',categorias:[{id:'i',nombre:'Interrogación 1',peso:40,notas:[]},{id:'i2',nombre:'Interrogación 2',peso:30,notas:[]},{id:'c',nombre:'Controles',peso:20,slots:3,notas:[{id:'c0',nombre:'Control 1',slot:0,valor:6,peso:1}]},{id:'t',nombre:'Tareas',peso:10,notas:[]}]}];");
  chk(run('canvasDisponible()'),'UC en iOS con plugin ve Canvas');
  ctx.window.Capacitor.isNativePlatform=()=>false;
  chk(!run('canvasDisponible()'),'la web no ve el puente aunque Capacitor exista');
  ctx.window.Capacitor.isNativePlatform=()=>true;
  run("S.tipoCuenta='profesor'");chk(!run('canvasDisponible()'),'profesor sin cuenta de estudiante no ve Canvas');
  run("S.tipoCuenta='estudiante'");
  chk(run("cursosCanvasDelSemestre([{id:42,course_code:'MAT1620-2',term:{name:'2026 Segundo Semestre'}},{id:'../x',course_code:'MAT1610-1',term:{name:'2026 Segundo Semestre'}}],new Date(2026,9,21)).length")===1,'solo rutas con ID numérico seguro');
  await run('pintarCanvasAjustes()');
  chk(/type="password"/.test(nodo('s-canvas').innerHTML),'el campo del token no muestra caracteres');
  const guardadosAntes=guardados;
  const falso='123~'+('A'.repeat(24));nodo('s-canvas-token').value=falso;
  ctx.track=()=>{};
  await run('conectarCanvas()');
  assert.equal(tokenRecibido,falso,'el token solo se entrega al plugin');
  assert.equal(nodo('s-canvas-token').value,'','se vacía el campo al conectar');
  assert.equal(guardados,guardadosAntes,'no se guarda el token en localStorage');
  chk(/Traer fechas/.test(nodo('s-canvas').innerHTML),'Ajustes muestra la acción con conexión');
  const antes=run('JSON.stringify(S)');
  run('openModal=()=>{globalThis.__abierto=true}');
  await run('traerFechasCanvas()');
  assert.deepEqual(rutas,['courses','courses/42/users','courses/42/assignments','calendar_events'],'solo GET a rutas esperadas');
  run('cerrarRevisionDocenciaCanvas()'); // sigue a fechas sin aceptar la sección opcional
  const evPedido=pedidos.find(x=>x.path==='calendar_events').params;
  igual(evPedido['context_codes[]'],['course_42'],'eventos solo del curso, nunca el calendario personal');
  assert.equal(evPedido.type,'event');chk(/^\d{4}-\d{2}-\d{2}$/.test(evPedido.start_date)&&evPedido.end_date>evPedido.start_date,'con rango de fechas');
  assert.equal(run('icsImportDraft.length'),2,'tarea y evento quedan en revisión; «Clase suspendida» no');
  assert.equal(run('icsImportDraft[0].target'),'r|i|','la propone para la evaluación');
  assert.equal(run('icsImportDraft[1].target'),'r|i2|','el evento calza con la I2');
  assert.equal(run('icsImportDraft[1].hora'),'18:30','con la hora de Chile');
  assert.equal(run('JSON.stringify(S)'),antes,'no escribe fechas ni notas antes de confirmar');
  assert.equal(guardados,guardadosAntes,'no persiste nada al traer propuestas');
  chk(run('globalThis.__abierto')===true,'abre la misma hoja de revisión .ics');
  run('closeModal=()=>{};showToast=()=>{};renderRamo=()=>{};renderHome=()=>{};globalThis.syncToCloud=()=>{}');
  run('confirmarImportarCalendario()');
  const i2=run("S.ramos[0].categorias.find(c=>c.id==='i2')");
  assert.equal(i2.fecha,'2099-11-03');assert.equal(i2.hora,'18:30');assert.equal(i2.horaOrigen,'calendario');
  assert.equal(run("S.ramos[0].categorias.find(c=>c.id==='i').hora||null"),null,'la entrega de una tarea no inventa hora de prueba');

  // Notas: escala, puntajes y nada que se escriba sin confirmar.
  const n=x=>run('notaDesdeCanvas('+JSON.stringify(x)+')');
  assert.equal(n({grading_type:'letter_grade',submission:{grade:'6,0'}}).valor,6,'esquema numérico de la UC');
  assert.equal(n({grading_type:'points',points_possible:100,submission:{score:5,grade:'5'}}).valor,null,'5 de 100 puntos no es un 5,0');
  assert.equal(n({grading_type:'points',points_possible:100,submission:{score:5,grade:'5'}}).crudo,'5 de 100 pts');
  assert.equal(n({grading_type:'percent',submission:{score:72,grade:'72%'}}).valor,null,'un porcentaje no se convierte');
  assert.equal(n({grading_type:'gpa_scale',submission:{grade:'8'}}).valor,null,'fuera de la escala 1 a 7');
  assert.equal(n({grading_type:'points',points_possible:7,submission:{score:5.5,excused:true}}),null,'eximida');
  const antesNotas=run('JSON.stringify(S)'),guardadosNotas=guardados;rutas=[];
  await run('traerNotasCanvas()');
  assert.deepEqual(rutas,['courses','courses/42/assignments']);
  igual(pedidos.at(-1).params['include[]'],['submission'],'solo la entrega propia');
  assert.equal(run('JSON.stringify(S)'),antesNotas,'traer notas no escribe nada');
  assert.equal(guardados,guardadosNotas);
  assert.deepEqual(JSON.parse(run('JSON.stringify(canvasNotasDraft.map(p=>[p.titulo,p.target,p.valor]))')),
    [['I1','r|i|',5.5],['Control 2','r|c|2',6.3],['Tarea 1','r|t|',5.3]],'Control 1 ya tenía nota: no se propone; 18 de 25 pts con 50 % es 5,3');
  // Puntaje → nota con exigencia (Lucas, 2026-11-17). Escala chilena, a la décima.
  const nP=(p,t,e)=>run(`notaDesdePuntaje(${p},${t},${e})`);
  assert.equal(nP(12.5,25,50),4,'la exigencia justa es un 4,0');assert.equal(nP(0,25,50),1);assert.equal(nP(25,25,50),7);
  assert.equal(nP(18,25,60),4.9);assert.equal(nP(30,25,50),7,'un bonus sobre el total no pasa de 7,0');
  assert.equal(nP(-1,25,50),null);assert.equal(nP(5,0,50),null,'sin total no hay nota');assert.equal(nP(5,25,0),null,'exigencia fuera de rango');
  assert.equal(nP(39.5,79,50),4,'3,95 se aproxima a 4,0');
  assert.equal(run("exigenciaValida('60 %')"),60);assert.equal(run("exigenciaValida('55,5')"),55.5);assert.equal(run("exigenciaValida('120')"),null);
  assert.equal(run("exigenciaRamo({})"),50,'sin exigencia, 50 %');assert.equal(run("exigenciaRamo({exigencia:60})"),60);
  const pct=JSON.parse(run(`JSON.stringify(notaDesdeCanvas({grading_type:'percent',submission:{grade:'72%'}}))`));
  assert.deepEqual(pct.puntos,{obtenido:72,total:100},'un porcentaje sin puntos se lee como 72 de 100');
  // En la revisión: 60 % recalcula la fila y borra lo escrito a mano.
  run("canvasNotasDraft[2].editado='6,9'");run('exigenciaNotaCanvas(2,60)');
  assert.equal(run('canvasNotasDraft[2].valor'),4.9);assert.equal(run('canvasNotasDraft[2].editado'),null);
  run("exigenciaNotaCanvas(2,'abc')");assert.equal(run('canvasNotasDraft[2].exigencia'),60,'una exigencia inválida no cambia nada');
  run('exigenciaNotaCanvas(2,50)');
  // La exigencia guardada en el ramo manda al traer.
  run("S.ramos[0].exigencia=60");
  assert.equal(JSON.parse(run(`JSON.stringify(resumenNotasCanvas([{id:9,name:'Tarea 1',grading_type:'points',points_possible:25,submission:{score:18}}],S.ramos[0]).propuestas.map(p=>[p.valor,p.exigencia]))`))[0].join(),'4.9,60');
  run("delete S.ramos[0].exigencia");
  nodo('cn-nota-0').value='5,5';nodo('cn-nota-1').value='6,3';nodo('cn-nota-2').value='';
  run('confirmarNotasCanvas()');
  chk(/Tarea 1/.test(nodo('cn-error').textContent),'una fila sin nota detiene el guardado');
  assert.equal(run('JSON.stringify(S)'),antesNotas,'sin guardar a medias');
  run("asignarNotaCanvas(2,'')");
  // Mientras revisaba, escribió la I1 a mano: esa no se pisa.
  run("S.ramos[0].categorias.find(c=>c.id==='i').notas.push({id:'m',nombre:'Interrogación 1',valor:4,peso:1})");
  run('confirmarNotasCanvas()');
  const cats=run('S.ramos[0].categorias');
  igual(cats.find(c=>c.id==='i').notas.map(x=>x.valor),[4],'la nota escrita por la persona no cambia');
  igual(cats.find(c=>c.id==='c').notas.map(x=>[x.slot,x.valor]),[[0,6],[1,6.3]],'Control 2 en su casilla, Control 1 intacto');
  assert.equal(cats.find(c=>c.id==='t').notas.length,0,'el puntaje sin nota no se guardó');

  // Pesos: referencia en el editor, sin tocar la pauta.
  run("currentRamoId='r'");
  const pesos=run('canvasPesosEditorHTML()');
  chk(/Controles/.test(pesos)&&/30 %/.test(pesos)&&/Pesos según Canvas/.test(pesos),'muestra los pesos marcados como de Canvas');
  run('canvasPesosRamo.clear()');
  chk(/Ver pesos en Canvas/.test(run('canvasPesosEditorHTML()')),'sin datos, un botón');
  const pesosAntes=JSON.stringify(cats.map(c=>c.peso));rutas=[];
  await run('verPesosCanvas()');
  assert.deepEqual(rutas,['courses','courses/42/assignment_groups']);
  assert.equal(JSON.stringify(run('S.ramos[0].categorias').map(c=>c.peso)),pesosAntes,'los pesos de Canvas no cambian la pauta');
  if(process.env.CANVAS_SETTINGS_CAPTURE_HTML){
    const modo=process.env.CANVAS_SETTINGS_CAPTURE_MODE==='oscuro'?'oscuro':'claro';
    fs.writeFileSync(process.env.CANVAS_SETTINGS_CAPTURE_HTML,`<!doctype html><html lang="es" data-modo="${modo}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="styles.css"><style>html{font-size:20px}body{width:375px;height:812px;overflow:hidden;background:var(--bg)}.modal-overlay{position:relative;display:flex;inset:auto;width:375px;height:812px;opacity:1;background:var(--bg)}.modal-sheet{width:375px;max-width:375px;max-height:812px;height:812px;transform:none;box-shadow:none;border-radius:0}.settings-content{padding:20px}</style></head><body><div class="modal-overlay open"><div class="modal-sheet"><div class="settings-content"><h1 style="font-size:1.5rem">Calendario</h1><label class="modal-label">Canvas UC</label><p class="settings-help">Trae ramos y fechas. Revisas cada propuesta antes de agregarla.</p><div id="s-canvas">${nodo('s-canvas').innerHTML}</div></div></div></div></body></html>`);
  }
  console.log('OK Canvas Ajustes: solo iOS UC, token en plugin, fechas con hora, notas confirmadas sin pisar y pesos de referencia');
})().catch(e=>{console.error(e);process.exit(1)});
