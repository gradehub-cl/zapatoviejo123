// La Agenda pinta el mismo orden que los widgets y cada fila abre su evaluación.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const raiz=path.join(__dirname,'..');
const elemento=()=>({style:{setProperty(){},removeProperty(){}},classList:{add(){},remove(){},contains(){return false},toggle(){}},
  addEventListener(){},appendChild(){},setAttribute(){},removeAttribute(){},getAttribute(){return null},
  querySelector(){return null},querySelectorAll(){return []},focus(){},select(){},dataset:{},innerHTML:'',textContent:''});
const stub=elemento();
const ctx={window:{addEventListener(){},matchMedia:()=>({matches:true,addEventListener(){},addListener(){}})},
  document:{getElementById:()=>stub,createElement:elemento,addEventListener(){},documentElement:stub,body:stub,querySelector:()=>stub,querySelectorAll:()=>[]},
  localStorage:{getItem(){return null},setItem(){},removeItem(){}},navigator:{},location:{origin:'',pathname:'/',hash:''},
  setTimeout,clearTimeout,console};
vm.createContext(ctx);
vm.runInContext(['data.js','engine.js','app.js','render-agenda.js'].map(f=>fs.readFileSync(path.join(raiz,f),'utf8')).join('\n'),ctx);
const run=s=>vm.runInContext(s,ctx);
run(`S=normalize({tenant:'uc',ramos:[{id:'r',nombre:'Ramo sintético',color:'#123456',gates:[],categorias:[
  {id:'hoy',nombre:'Prueba de hoy',peso:20,fecha:'2026-10-07',notas:[]},
  {id:'rec',nombre:'Control corregido',peso:20,notas:[{id:'n-rec',nombre:'Control corregido',valor:5.0,peso:1,recorreccionPendiente:true}]},
  {id:'pasada',nombre:'Prueba pasada',peso:20,fecha:'2026-10-05',notas:[]},
  {id:'sin',nombre:'Entrega sin fecha',peso:20,notas:[]},
  {id:'futuro',nombre:'Prueba futura',peso:20,fecha:'2026-10-10',notas:[]}
]}]})`);
const antes=run('JSON.stringify(S)');
const ahora=new Date(2026,9,7,12);
ctx.__ahora=ahora;
const lista=run('pendientes(__ahora)');
assert.equal(lista.map(p=>p.tipo).join(','),'hoy,recorregir,sin-nota,sin-fecha');
const html=run('agendaPendientesHTML(pendientes(__ahora),__ahora)');
assert.equal((html.match(/class="ag-row"/g)||[]).length,4);
assert.equal((html.match(/aria-label="Pendientes"/g)||[]).length,1);
for(const [id,accion] of [['hoy','ver-pendiente'],['rec','ver-pendiente'],['pasada','completar-nota'],['sin','agregar-fecha']]){
  assert.match(html,new RegExp(`data-agenda-action="${accion}"[^>]*data-ramo-id="r"[^>]*data-cat-id="${id}"`));
}
assert.match(html,/Hoy/);
assert.match(html,/Fecha pasada sin nota/);
assert.match(html,/Sin fecha/);
assert.doesNotMatch(html,/Prueba futura/,'pasado mañana y después siguen en la cronología');
assert.equal(run('JSON.stringify(S)'),antes,'pintar la lista no guarda ni cambia datos');

ctx.Date=class extends Date{constructor(...args){super(...(args.length?args:[2026,9,7,12]));}static now(){return new Date(2026,9,7,12).getTime();}};
run('renderAgenda()');
for(const nombre of ['Prueba de hoy','Prueba pasada','Entrega sin fecha']){
  assert.equal(stub.innerHTML.split(nombre).length-1,1,`${nombre} no se duplica en la cronología`);
}
assert.match(stub.innerHTML,/Prueba futura/,'la evaluación posterior a mañana sigue visible');
assert.equal(run('JSON.stringify(S)'),antes,'renderizar Agenda no cambia datos');

run("S.ramos[0].categorias[0].fecha='2026-10-08'");
assert.match(run('agendaPendientesHTML(pendientes(__ahora),__ahora)'),/Mañana/);

let escuchar;
const body={dataset:{},addEventListener(tipo,fn){assert.equal(tipo,'click');escuchar=fn;},contains(){return true;}};
ctx.__body=body;
run(`globalThis.__abierto=null;
  corregirFechaDesdeAgenda=(r,c,n)=>{__abierto=['editar',r,c,n]};
  completarNotaDesdeAgenda=(r,c,n)=>{__abierto=['nota',r,c,n]};
  abrirFechaAgenda=p=>{__abierto=['fecha',p.ramo.id,p.cat.id]};
  activarAccionesAgenda(__body)`);
function tocar(dataset){
  escuchar({target:{closest(){return {dataset}}},preventDefault(){},stopPropagation(){}});
  return run('__abierto.join(":")');
}
assert.equal(tocar({agendaAction:'ver-pendiente',ramoId:'r',catId:'rec',notaId:'n-rec'}),'editar:r:rec:n-rec');
assert.equal(tocar({agendaAction:'completar-nota',ramoId:'r',catId:'pasada',notaId:''}),'nota:r:pasada:');
assert.equal(tocar({agendaAction:'agregar-fecha',ramoId:'r',catId:'sin',notaId:''}),'fecha:r:sin');
console.log('OK: pendientes de Agenda conservan orden, destino y datos');
