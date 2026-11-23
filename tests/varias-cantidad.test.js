// «Son varias notas» con cantidad: el avance cuenta solo las rendidas y cada
// casilla lleva su fecha. Sin cantidad, sigue como lista abierta.
// (Comentario de una estudiante, 2026-11-17.) Solo datos sintéticos.
const assert=require('node:assert/strict'),fs=require('fs'),vm=require('vm');
const raiz=__dirname+'/../';
const src=['data.js','engine.js','app.js','app-session.js','render-main.js','render-agenda.js'].map(f=>fs.readFileSync(raiz+f,'utf8')).join('\n');
const elementos=new Map();
function el(id){
  if(!elementos.has(id))elementos.set(id,{id,value:'',checked:false,disabled:false,hidden:true,textContent:'',style:{setProperty(){},removeProperty(){}},
    addEventListener(){},appendChild(){},classList:{add(){},remove(){},contains(){return false}},innerHTML:'',focus(){},select(){},
    setAttribute(k,v){this[k]=v;},removeAttribute(k){delete this[k];},getAttribute(){return null},querySelectorAll(){return []},querySelector(){return null},dataset:{},click(){}});
  return elementos.get(id);
}
const ctx={window:{addEventListener(){},matchMedia:()=>({matches:true,addEventListener(){},addListener(){}})},
  document:{getElementById:el,createElement:()=>el('_'+Math.random()),addEventListener(){},documentElement:{style:{setProperty(){},removeProperty(){}},setAttribute(){},removeAttribute(){},getAttribute(){return null}},querySelector:()=>null,querySelectorAll:()=>[],body:el('body')},
  localStorage:{getItem(){return null},setItem(){},removeItem(){}},navigator:{},location:{origin:'',pathname:'',hash:''},setTimeout,clearTimeout,console};
vm.createContext(ctx);vm.runInContext(src,ctx);
const run=c=>vm.runInContext(c,ctx);

// Pauta propia: Controles 30% como lista abierta con dos notas, Prueba 70%.
run(`var __r={id:'r1',nombre:'Ramo sintético',categorias:[
  {id:'ctl',nombre:'Controles',peso:30,directNota:false,notas:[{id:'a',nombre:'Control 1',valor:5,peso:1,fecha:'2026-09-01'},{id:'b',nombre:'Control 2',valor:6,peso:1}]},
  {id:'pr',nombre:'Prueba',peso:70,directNota:true,notas:[]}]};`);
const avance=()=>run('calculoRamo.avanceRamo(__r).pct');
assert.equal(avance(),30,'sin cantidad, dos controles dan por evaluado todo el 30%');

// Leer la cantidad: vacío, inválido, menor que lo que ya hay, válido.
// Esta lista ya tiene dos notas: puede seguir abierta (listaAbiertaPermitida).
const leer=v=>{el('m-cat-cantidad').value=v;el('m-cat-error').hidden=true;return run("leerCantidadVarias(__r.categorias[0],true)");};
el('m-cat-cantidad').value='';assert.equal(run("leerCantidadVarias({notas:[]},false)"),false,'una nueva sin cantidad no se guarda');
assert.equal(leer(''),null,'vacío = no sé todavía');
assert.equal(leer('  '),null);
assert.equal(leer('1'),false);assert.equal(el('m-cat-error').hidden,false,'muestra el error');
assert.equal(leer('abc'),false);
assert.equal(leer('31'),false);
assert.equal(leer('2,5'),false);
run("__r.categorias[0].notas.push({id:'c',nombre:'Control 3',valor:4,peso:1})");
assert.equal(leer('2'),false,'no puede quedar con menos casillas que notas');
assert.match(el('m-cat-error').textContent,/Ya tiene 3 notas/);
assert.equal(leer('5'),5);

// Fijar 5: las tres notas pasan a las casillas 0, 1 y 2, sin perder nada.
const antes=run('JSON.stringify(__r.categorias[0].notas.map(n=>[n.id,n.nombre,n.valor,n.fecha||null]))');
const promedioRamo=run('calculoRamo.ramoAvg(__r)');
run('fijarCantidadVarias(__r,__r.categorias[0],5)');
const c=run('__r.categorias[0]');
assert.equal(c.slots,5);assert.equal(c.directNota,true);
assert.equal(run('JSON.stringify(__r.categorias[0].notas.map(n=>n.slot))'),'[0,1,2]');
assert.equal(run('JSON.stringify(__r.categorias[0].notas.map(n=>[n.id,n.nombre,n.valor,n.fecha||null]))'),antes,'nombre, valor y fecha intactos');
assert.equal(avance(),18,'3 de 5 controles = 18% del 30%');
assert.equal(run('calculoRamo.ramoAvg(__r)'),promedioRamo,'el promedio del ramo no cambia: siguen siendo 5, 6 y 4');
assert.equal(promedioRamo,5,'promedio de 5, 6 y 4 con solo los controles rendidos');

// Una casilla ya asignada se respeta y las demás llenan los huecos.
run(`var __r2={id:'r2',nombre:'Otro sintético',categorias:[{id:'t',nombre:'Tareas',peso:100,directNota:false,notas:[
  {id:'x',nombre:'Tarea',valor:5,peso:1,slot:0},{id:'y',nombre:'Tarea',valor:6,peso:1}]}]}`);
run('fijarCantidadVarias(__r2,__r2.categorias[0],3)');
assert.equal(run('JSON.stringify(__r2.categorias[0].notas.map(n=>n.slot))'),'[0,1]');

// Normalizar no deshace la conversión.
const norm=run('normalize({ramos:[JSON.parse(JSON.stringify(__r))]}).ramos[0].categorias[0]');
assert.equal(norm.slots,5);assert.equal(JSON.stringify(norm.notas.map(n=>n.slot)),'[0,1,2]');

// El HTML del editor: la pregunta aparece solo en «varias notas».
// Quien la llama decide si se ve (openEditCatModal) y si puede quedar vacía.
assert.match(run("cantidadVariasHTML({notas:[]},true,false)"),/¿Cuántas son\?/);
assert.doesNotMatch(run("cantidadVariasHTML({notas:[]},true,false)"),/id="m-cat-cantidad-fila" hidden/);
assert.match(run("cantidadVariasHTML({notas:[]},false,false)"),/id="m-cat-cantidad-fila" hidden/);
assert.match(run("cantidadVariasHTML({notas:[]},true,false)"),/placeholder="Ej: 4"/);
assert.match(run("cantidadVariasHTML({notas:[]},true,true)"),/placeholder="No sé todavía"/);

// Una fecha por casilla: solo se escriben las que cambian, y una fila vacía no
// crea notas ni marca fechas quitadas.
run(`var __r3={id:'r3',nombre:'Fechas sintético',categorias:[{id:'k',nombre:'Controles',peso:30,directNota:true,slots:4,notas:[
  {id:'k0',nombre:'Controles 1',valor:5,peso:1,slot:0,fecha:'2026-09-01',fechaOrigen:'usuario'}]}]}`);
run("document.getElementById('m-casilla-0-fecha').value='2026-09-01'");
run("document.getElementById('m-casilla-1-fecha').value='2026-09-15'");
run("document.getElementById('m-casilla-1-hora').value='10:00'");
run("document.getElementById('m-casilla-2-fecha').value=''");
run("document.getElementById('m-casilla-3-fecha').value='2026-10-06'");
run('guardarFechasCasillas(__r3,__r3.categorias[0])');
const k=JSON.parse(run('JSON.stringify(__r3.categorias[0].notas.map(n=>({slot:n.slot,fecha:n.fecha||null,hora:n.hora||null,valor:n.valor??null,quitada:!!n.fechaQuitada})).sort((a,b)=>a.slot-b.slot))'));
assert.deepEqual(k,[
  {slot:0,fecha:'2026-09-01',hora:null,valor:5,quitada:false},
  {slot:1,fecha:'2026-09-15',hora:'10:00',valor:null,quitada:false},
  {slot:3,fecha:'2026-10-06',hora:null,valor:null,quitada:false}],'casillas 1 y 3 nuevas como pendientes; la 2 vacía no se crea');
const ev=JSON.parse(run("JSON.stringify(agendaEvents([__r3]).map(e=>e.fecha))"));
assert.deepEqual(ev,['2026-09-01','2026-09-15','2026-10-06'],'cada control aparece en su día en la Agenda');
// Quitar la fecha de una casilla la quita de la Agenda.
run("document.getElementById('m-casilla-3-fecha').value=''");
run('guardarFechasCasillas(__r3,__r3.categorias[0])');
assert.deepEqual(JSON.parse(run("JSON.stringify(agendaEvents([__r3]).map(e=>e.fecha))")),['2026-09-01','2026-09-15']);
// Filas para una cantidad recién escrita: las notas sin casilla, en su orden.
assert.equal(run(`JSON.stringify(notasPorFilaCasillas({nombre:'Tareas',notas:[{id:'p',nombre:'T1'},{id:'q',nombre:'T2'}]},3).map(n=>n&&n.id))`),'["p","q",null]');
assert.match(run(`fechasCasillasHTML({id:'x'},{nombre:'Tareas',notas:[]},2)`),/Tarea 2/,'mismo nombre que tendrá la casilla');
assert.match(run(`fechasCasillasHTML({id:'x'},{nombre:'X',notas:[{id:'z',nombre:'Nota <b>'}]},2)`),/Nota &lt;b&gt;/);
console.log('OK varias notas con cantidad: lectura, casillas sin perder notas, avance parcial, normalize y una fecha por casilla');
