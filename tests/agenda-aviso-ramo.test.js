// El aviso de un ramo en riesgo sale una vez, en su PRIMERA aparición en la
// Agenda, sea una tarjeta de prioridad o una fila de "Después" (Lucas,
// 2026-10-19). Antes solo lo tenían las filas: un ramo en 3,6 con prueba
// mañana quedaba en prioridades con una línea gris, y otro en 3,9 más lejos
// salía con el recuadro rojo. Pautas escritas acá: es un test de mecanismo.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const raiz=path.join(__dirname,'..');
const el=()=>({style:{setProperty(){},removeProperty(){}},classList:{add(){},remove(){},contains(){return false},toggle(){}},addEventListener(){},appendChild(){},setAttribute(){},removeAttribute(){},getAttribute(){return null},querySelector(){return null},querySelectorAll(){return []},focus(){},select(){},dataset:{},innerHTML:'',textContent:''});
const stub=el();
const ctx={window:{addEventListener(){},matchMedia:()=>({matches:true,addEventListener(){},addListener(){}})},document:{getElementById:()=>stub,createElement:el,addEventListener(){},documentElement:stub,body:stub,querySelector:()=>stub,querySelectorAll:()=>[]},localStorage:{getItem(){return null},setItem(){},removeItem(){}},navigator:{},location:{origin:'',pathname:'/',hash:''},setTimeout,clearTimeout,console};
vm.createContext(ctx);
vm.runInContext(['data.js','engine.js','app.js','render-agenda.js'].map(f=>fs.readFileSync(path.join(raiz,f),'utf8')).join('\n'),ctx);
ctx.Date=class extends Date{constructor(...a){super(...(a.length?a:[2026,9,19,12]));}static now(){return new Date(2026,9,19,12).getTime();}};
const run=s=>vm.runInContext(s,ctx);
// Ramo A: 3,6 con una prueba mañana y el examen en un mes.
// Ramo B: 3,8 con un control en dos semanas y el examen en un mes y medio.
// Ramo C: 6,0, sin riesgo, con una entrega en tres semanas.
run(`S=normalize({tenant:'uc',ramos:[
  {id:'a',nombre:'Ramo A',color:'#33f',gates:[],categorias:[
    {id:'a1',nombre:'Prueba 1',peso:30,fecha:'2026-09-20',notas:[{id:'na1',nombre:'Prueba 1',valor:3.6,peso:1}]},
    {id:'a2',nombre:'Prueba 2',peso:30,fecha:'2026-10-20',notas:[]},
    {id:'a3',nombre:'Examen A',peso:40,fecha:'2026-11-19',notas:[]}]},
  {id:'b',nombre:'Ramo B',color:'#f33',gates:[],categorias:[
    {id:'b1',nombre:'Control 1',peso:30,fecha:'2026-09-25',notas:[{id:'nb1',nombre:'Control 1',valor:3.8,peso:1}]},
    {id:'b2',nombre:'Control 2',peso:30,fecha:'2026-11-02',notas:[]},
    {id:'b3',nombre:'Examen B',peso:40,fecha:'2026-12-03',notas:[]}]},
  {id:'c',nombre:'Ramo C',color:'#3a3',gates:[],categorias:[
    {id:'c1',nombre:'Tarea 1',peso:50,fecha:'2026-09-28',notas:[{id:'nc1',nombre:'Tarea 1',valor:6.0,peso:1}]},
    {id:'c2',nombre:'Entrega final',peso:50,fecha:'2026-11-09',notas:[]}]}
]})`);
run('agendaOrdenActual="fecha";renderAgenda()');
const h=stub.innerHTML;
// Cada aparición (tarjeta o fila) con su aviso, en orden de pantalla.
const apariciones=[];const re=/(ag-priority-name|ag-row-name)">([^<]*)<[\s\S]*?(?=ag-priority-name|ag-row-name|$)/g;let m;
while((m=re.exec(h))){const a=/class="ag-alert (bad|warn)"/.exec(m[0]);apariciones.push({tipo:m[1]==='ag-priority-name'?'tarjeta':'fila',nombre:m[2],aviso:a?a[1]:null});}
const de=n=>apariciones.find(x=>x.nombre===n);
assert.equal(de('Prueba 2').tipo,'tarjeta','la prueba de mañana es una prioridad');
assert.equal(de('Prueba 2').aviso,'bad','y la tarjeta trae el aviso rojo de su ramo');
assert.match(h,/ag-priority-name">Prueba 2<[\s\S]*?Vas 3\.6 · necesitas/,'con cuánto va y cuánto necesita');
assert.equal(de('Examen A').aviso,null,'el aviso de un ramo no se repite en sus otras apariciones');
assert.equal(de('Control 2').aviso,'bad','el otro ramo en riesgo también lo trae en su primera aparición');
assert.equal(de('Examen B').aviso,null,'una sola vez por ramo');
assert.equal(de('Entrega final').aviso,null,'un ramo que va bien no lleva aviso');
assert.doesNotMatch(h,/ag-priority-name">Prueba 2<[^]*?ag-priority-reason">Vas 3\.6/,'la razón de la tarjeta no repite el aviso');
console.log('OK: el aviso del ramo sale una vez, en su primera aparición, también en prioridades');
