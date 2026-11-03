// La Agenda pinta los pendientes con el mismo orden que los widgets y cada fila
// abre su evaluación. Desde el 2026-10-19 (Lucas): "Tus prioridades" va siempre
// arriba, lo de hoy y mañana va en prioridades y no en Pendientes, y Pendientes
// se pliega como "Después".
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
assert.equal(run('pendientesDeAgenda(__ahora)').map(p=>p.tipo).join(','),'recorregir,sin-nota,sin-fecha','lo de hoy sale de Pendientes en la Agenda');
const html=run('agendaPendientesHTML(pendientesDeAgenda(__ahora),__ahora)');
assert.equal((html.match(/class="ag-row"/g)||[]).length,2);
assert.equal((html.match(/class="ag-recorreccion-row"/g)||[]).length,1);
assert.equal((html.match(/aria-label="Pendientes"/g)||[]).length,1);
assert.doesNotMatch(html,/Ver \d+ más/,'con tres no hay nada que plegar');
for(const [id,accion] of [['rec','ver-pendiente'],['pasada','completar-nota'],['sin','agregar-fecha']]){
  assert.match(html,new RegExp(`data-agenda-action="${accion}"[^>]*data-ramo-id="r"[^>]*data-cat-id="${id}"`));
}
assert.match(html,/data-agenda-action="resolver-recorreccion"[^>]*data-cat-id="rec"[^>]*data-nota-id="n-rec"/);
assert.doesNotMatch(html,/Prueba de hoy/,'la de hoy va en prioridades');
assert.match(html,/Fecha pasada sin nota/);
assert.match(html,/Sin fecha/);
assert.doesNotMatch(html,/Prueba futura/,'pasado mañana y después siguen en la cronología');
assert.equal(run('JSON.stringify(S)'),antes,'pintar la lista no guarda ni cambia datos');

ctx.Date=class extends Date{constructor(...args){super(...(args.length?args:[2026,9,7,12]));}static now(){return new Date(2026,9,7,12).getTime();}};
run('renderAgenda()');
// Cada evaluación tiene UNA fila: en prioridades o en Pendientes, no en las dos.
// (El detalle de otra evaluación puede nombrarla como "la siguiente": eso no es
// una fila, por eso se cuentan los nombres de fila y no el texto suelto.)
const filas=nombre=>(stub.innerHTML.match(new RegExp(`class="ag-(priority|row|event|item)-name"[^>]*>${nombre}<`,'g'))||[]).length;
for(const nombre of ['Prueba de hoy','Prueba pasada','Entrega sin fecha']){
  assert.equal(filas(nombre)+((stub.innerHTML.match(new RegExp(`<strong>${nombre}</strong><span>`,'g'))||[]).length),1,`${nombre} tiene una sola fila`);
}
assert.match(stub.innerHTML,/Prueba futura/,'la evaluación posterior a mañana sigue visible');
const pantalla=stub.innerHTML;
assert.ok(pantalla.indexOf('ag-priority-stack')>=0&&pantalla.indexOf('ag-priority-stack')<pantalla.indexOf('aria-label="Pendientes"'),'las prioridades van arriba de Pendientes');
assert.ok(pantalla.indexOf('Prueba de hoy')<pantalla.indexOf('aria-label="Pendientes"'),'lo de hoy está en prioridades');
assert.equal(run('JSON.stringify(S)'),antes,'renderizar Agenda no cambia datos');

run("S.ramos[0].categorias[0].fecha='2026-10-08'");
run('renderAgenda()');
assert.ok(stub.innerHTML.indexOf('Prueba de hoy')>=0&&stub.innerHTML.indexOf('Prueba de hoy')<stub.innerHTML.indexOf('aria-label="Pendientes"'),'lo de mañana también va en prioridades');
assert.equal(filas('Prueba de hoy'),1,'y no se repite en Pendientes');

// Más de cuatro pendientes: tres enteras, la cuarta asomada y "Ver N más".
run(`['a','b','c'].forEach(x=>S.ramos[0].categorias.push({id:'sin-'+x,nombre:'Sin fecha '+x,peso:5,notas:[]}))`);
const largos=run('pendientesDeAgenda(__ahora)').length;
const plegado=run('agendaPendientesHTML(pendientesDeAgenda(__ahora),__ahora)');
assert.match(plegado,new RegExp(`Ver ${largos-3} más`),'se pliega como Después');
assert.equal((plegado.match(/ag-event-fantasma/g)||[]).length,1,'una sola fila asomada');
assert.match(plegado,/<(article|button)[^>]* inert aria-hidden="true" class="ag-event-fantasma/,'la asomada no se toca ni se lee');
run('agendaPendientesAbiertas=true');
const abierto=run('agendaPendientesHTML(pendientesDeAgenda(__ahora),__ahora)');
assert.match(abierto,/Ver menos/);
assert.doesNotMatch(abierto,/ag-event-fantasma/);
run('agendaPendientesAbiertas=false');

let escuchar;
const body={dataset:{},addEventListener(tipo,fn){assert.equal(tipo,'click');escuchar=fn;},contains(){return true;}};
ctx.__body=body;
run(`globalThis.__abierto=null;
  corregirFechaDesdeAgenda=(r,c,n)=>{__abierto=['editar',r,c,n]};
  completarNotaDesdeAgenda=(r,c,n)=>{__abierto=['nota',r,c,n]};
  abrirFechaAgenda=p=>{__abierto=['fecha',p.ramo.id,p.cat.id]};
  resolverRecorreccionAgenda=(r,c,n)=>{__abierto=['enviada',r,c,n]};
  activarAccionesAgenda(__body)`);
function tocar(dataset){
  escuchar({target:{closest(){return {dataset}}},preventDefault(){},stopPropagation(){}});
  return run('__abierto.join(":")');
}
assert.equal(tocar({agendaAction:'ver-pendiente',ramoId:'r',catId:'rec',notaId:'n-rec'}),'editar:r:rec:n-rec');
assert.equal(tocar({agendaAction:'completar-nota',ramoId:'r',catId:'pasada',notaId:''}),'nota:r:pasada:');
assert.equal(tocar({agendaAction:'agregar-fecha',ramoId:'r',catId:'sin',notaId:''}),'fecha:r:sin');
assert.equal(tocar({agendaAction:'resolver-recorreccion',ramoId:'r',catId:'rec',notaId:'n-rec'}),'enviada:r:rec:n-rec');
console.log('OK: pendientes de Agenda conservan orden, destino y datos');
