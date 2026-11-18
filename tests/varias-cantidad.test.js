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
const leer=v=>{el('m-cat-cantidad').value=v;el('m-cat-error').hidden=true;return run("leerCantidadVarias(__r.categorias[0])");};
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
assert.match(run("cantidadVariasHTML({directNota:false,notas:[]})"),/¿Cuántas son\?/);
assert.doesNotMatch(run("cantidadVariasHTML({directNota:false,notas:[]})"),/id="m-cat-cantidad-fila" hidden/);
assert.match(run("cantidadVariasHTML({directNota:true,notas:[]})"),/id="m-cat-cantidad-fila" hidden/);
console.log('OK varias notas con cantidad: lectura, casillas sin perder notas, avance parcial y normalize');
