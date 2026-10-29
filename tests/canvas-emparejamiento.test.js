// #673 · Datos sintéticos con forma de Canvas UC; no hay token ni cuentas reales.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const leer=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
const modal={innerHTML:''};
const stub={style:{setProperty(){},removeProperty(){}},classList:{add(){},remove(){},contains(){return false}},
  addEventListener(){},appendChild(){},setAttribute(){},removeAttribute(){},focus(){},querySelectorAll(){return []},
  value:'',innerHTML:'',textContent:'',dataset:{}};
const ctx={console,Intl,window:{addEventListener(){},matchMedia:()=>({matches:false,addEventListener(){},addListener(){}})},
  document:{getElementById:id=>id==='modal-content'?modal:stub,createElement:()=>stub,addEventListener(){},
    documentElement:stub,body:stub,querySelector:()=>stub,querySelectorAll:()=>[]},
  localStorage:{getItem(){return null},setItem(){},removeItem(){}},navigator:{},location:{origin:'',pathname:'/',hash:''},
  setTimeout,clearTimeout};
vm.createContext(ctx);
for(const f of ['data.js','engine.js','app.js'])vm.runInContext(leer(f),ctx,{filename:f});
const run=s=>vm.runInContext(s,ctx);
run(`S.tenant='uc';S.ramos=[
 {id:'a',nombre:'Ramo sintético A',sigla:'TEST100',categorias:[
   {id:'c',nombre:'Controles',notas:[{id:'c1',nombre:'Control 1',fecha:'2026-10-22'},{id:'c2',nombre:'Control 2'},{id:'c3',nombre:'Control 3'}]},
   {id:'i',nombre:'Interrogación 1',notas:[]},{id:'ex',nombre:'Examen',notas:[]}]},
 {id:'b',nombre:'Ramo sintético B',sigla:'TEST200',categorias:[{id:'tb',nombre:'Tarea',notas:[]}]}
];`);
const antes=run('JSON.stringify(S)');
const grupos=[{id:10,name:'Controles'},{id:20,name:'I1'},{id:30,name:'Migrated Quizzes'}];
const tareas=[
  {name:'Entrega semanal',assignment_group_id:10,due_at:'2026-10-25T18:00:00Z'},
  {name:'Otra entrega',assignment_group_id:10,due_at:'2026-10-26T18:00:00Z'},
  {name:'Tercera entrega',assignment_group_id:10,due_at:'2026-10-27T18:00:00Z'},
  {name:'Cuarta entrega',assignment_group_id:10,due_at:'2026-10-28T18:00:00Z'},
  {name:'I1-P1',assignment_group_id:20,due_at:'2026-10-30T18:00:00Z'},
  {name:'I1-P2',assignment_group_id:20,due_at:'2026-10-30T18:00:00Z'},
  {name:'Examen',assignment_group_id:30,due_at:'2026-11-01T18:00:00Z'},
  {name:'Sin fecha',assignment_group_id:10},
  {name:'Ya pasó',assignment_group_id:10,due_at:'2026-09-01T18:00:00Z'}
];
ctx.tareas=tareas;ctx.grupos=grupos;
const resultado=run('resumenFechasCanvas(tareas,S.ramos[0],new Date("2026-10-21T12:00:00Z"),grupos)');
assert.equal(resultado.conteos.total,9);
assert.equal(resultado.conteos.sinFecha,1);
assert.equal(resultado.conteos.pasadas,1);
assert.equal(resultado.conteos.duplicadas,1);
assert.equal(resultado.propuestas.length,6);
assert.equal(JSON.stringify(resultado.propuestas.slice(0,4).map(p=>p.target)),JSON.stringify(['a|c|c2','a|c|c3',null,null]));
assert.ok(resultado.propuestas.some(p=>p.target==='a|i|'));
assert.ok(resultado.propuestas.some(p=>p.target==='a|ex|'));
assert.ok(resultado.propuestas.every(p=>p.ramoId==='a'&&p.origen==='canvas'));
assert.equal(run('JSON.stringify(S)'),antes,'las propuestas no cambian una sola fecha ni nota');
assert.equal(run('fechaChileCanvas("2026-10-16T02:59:00Z")'),'2026-10-15');
console.log('OK Canvas: grupo, primera casilla libre, duplicados, descartes y fecha chilena');

run('icsImportDraft=resumenFechasCanvas(tareas,S.ramos[0],new Date("2026-10-21T12:00:00Z"),grupos).propuestas;renderRevisionIcs()');
assert.match(modal.innerHTML,/Sugerencia de Canvas/);
assert.match(modal.innerHTML,/data-ics-ramo/);
assert.match(modal.innerHTML,/data-ics-evaluacion/);
assert.match(run("opcionesDestinoIcs(null,new Set(),'a')"),/Control 2/);
assert.doesNotMatch(run("opcionesDestinoIcs(null,new Set(),'a')"),/Ramo sintético B|Tarea/);
run("asignarRamoIcs(3,'b')");
assert.equal(run('icsImportDraft[3].ramoId'),'b');
assert.equal(run('icsImportDraft[3].target'),null);
assert.equal(run('JSON.stringify(S)'),antes,'cambiar los selectores no guarda fechas');
console.log('OK revisión: ramo → evaluación, sugerencia editable y nada aplicado sin confirmar');

// Vista sintética opcional para inspección visual a 375 pt; npm test no escribe.
if(process.env.CANVAS_CAPTURE_HTML){
  const modo=process.env.CANVAS_CAPTURE_MODE==='oscuro'?'oscuro':'claro';
  fs.writeFileSync(process.env.CANVAS_CAPTURE_HTML,`<!doctype html><html lang="es" data-modo="${modo}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="styles.css"><style>html{font-size:20px}body{width:375px;height:812px;overflow:hidden;background:var(--bg)}.modal-overlay{position:relative;display:flex;inset:auto;width:375px;height:812px;opacity:1;background:var(--bg)}.modal-sheet{width:375px;max-width:375px;max-height:812px;height:812px;transform:none;box-shadow:none;border-radius:0}#ics-revision-lista{max-height:590px!important}</style></head><body><div class="modal-overlay open"><div class="modal-sheet"><div id="modal-content">${modal.innerHTML}</div></div></div></body></html>`);
}
