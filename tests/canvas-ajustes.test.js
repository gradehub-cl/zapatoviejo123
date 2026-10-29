// #648/#673 · El puente solo aparece en iOS UC; datos y token son sintéticos.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const leer=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
const ids=new Map();
function nodo(id){if(ids.has(id))return ids.get(id);const n={isConnected:true,innerHTML:'',textContent:'',value:'',disabled:false,
  style:{setProperty(){},removeProperty(){}},classList:{add(){},remove(){},contains(){return false},toggle(){}},
  addEventListener(){},appendChild(){},setAttribute(){},removeAttribute(){},focus(){},querySelectorAll(){return []},dataset:{}};
  ids.set(id,n);return n;}
let conectado=false,tokenRecibido='',rutas=[],guardados=0;
const plugin={estado:async()=>({conectado}),conectar:async({token})=>{tokenRecibido=token;conectado=true},
  desconectar:async()=>{conectado=false},get:async({path})=>{rutas.push(path);return {data:path==='courses'
    ?[{id:42,course_code:'MAT1620-2',name:'Curso sintético',term:{name:'2026 Segundo Semestre'}}]
    :[{name:'I1-P1',due_at:'2099-10-25T18:00:00Z'}]}}};
const ctx={console,Intl,window:{addEventListener(){},matchMedia:()=>({matches:false,addEventListener(){},addListener(){}}),
  Capacitor:{isNativePlatform:()=>true,Plugins:{GradeHubCanvas:plugin}}},
  document:{getElementById:nodo,createElement:()=>nodo('nuevo'),addEventListener(){},documentElement:nodo('html'),body:nodo('body'),querySelector:()=>nodo('query'),querySelectorAll:()=>[]},
  localStorage:{getItem(){return null},setItem(){guardados++},removeItem(){}},navigator:{},location:{origin:'',pathname:'/',hash:''},setTimeout,clearTimeout};
vm.createContext(ctx);for(const f of ['data.js','engine.js','app.js'])vm.runInContext(leer(f),ctx,{filename:f});
const run=s=>vm.runInContext(s,ctx);
function chk(c,m){assert.ok(c,m)}
(async()=>{
  run("S.tenant='uc';S.tipoCuenta='estudiante';S.ramos=[{id:'r',nombre:'Cálculo II',sigla:'MAT1620',categorias:[{id:'i',nombre:'Interrogación 1',peso:100,notas:[]}]}];");
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
  assert.deepEqual(rutas,['courses','courses/42/assignments'],'solo GET a rutas esperadas');
  assert.equal(run('icsImportDraft.length'),1,'la fecha queda en revisión');
  assert.equal(run('icsImportDraft[0].target'),'r|i|','la propone para la evaluación');
  assert.equal(run('JSON.stringify(S)'),antes,'no escribe fechas ni notas antes de confirmar');
  assert.equal(guardados,guardadosAntes,'no persiste nada al traer propuestas');
  chk(run('globalThis.__abierto')===true,'abre la misma hoja de revisión .ics');
  if(process.env.CANVAS_SETTINGS_CAPTURE_HTML){
    const modo=process.env.CANVAS_SETTINGS_CAPTURE_MODE==='oscuro'?'oscuro':'claro';
    fs.writeFileSync(process.env.CANVAS_SETTINGS_CAPTURE_HTML,`<!doctype html><html lang="es" data-modo="${modo}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="styles.css"><style>html{font-size:20px}body{width:375px;height:812px;overflow:hidden;background:var(--bg)}.modal-overlay{position:relative;display:flex;inset:auto;width:375px;height:812px;opacity:1;background:var(--bg)}.modal-sheet{width:375px;max-width:375px;max-height:812px;height:812px;transform:none;box-shadow:none;border-radius:0}.settings-content{padding:20px}</style></head><body><div class="modal-overlay open"><div class="modal-sheet"><div class="settings-content"><h1 style="font-size:1.5rem">Calendario</h1><label class="modal-label">Canvas UC</label><p class="settings-help">Trae ramos y fechas. Revisas cada propuesta antes de agregarla.</p><div id="s-canvas">${nodo('s-canvas').innerHTML}</div></div></div></div></body></html>`);
  }
  console.log('OK Canvas Ajustes: solo iOS UC, token en plugin y fechas revisadas sin persistir');
})().catch(e=>{console.error(e);process.exit(1)});
