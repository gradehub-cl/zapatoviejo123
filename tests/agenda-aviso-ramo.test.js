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
// Ramo D: 1,5 en el 90% ya rendido: imposible, con un control mañana.
// Ramo E: 2,0 en la mitad, con una prueba en una semana: urgente.
// Ramo F: 3,6 en la mitad; lo próximo es un quiz de 5% (pesa poco).
// Ramo G: 3,0 en el 60%; la próxima pesa 15% de un 40% pendiente (pesa mucho)
//   pero sola no alcanza para quedar en 4,0.
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
    {id:'c2',nombre:'Entrega final',peso:50,fecha:'2026-11-09',notas:[]}]},
  {id:'d',nombre:'Ramo D',color:'#999',gates:[],categorias:[
    {id:'d1',nombre:'Pruebas D',peso:90,fecha:'2026-09-15',notas:[{id:'nd1',nombre:'Pruebas D',valor:1.5,peso:1}]},
    {id:'d2',nombre:'Control D',peso:10,fecha:'2026-10-20',notas:[]}]},
  {id:'f',nombre:'Ramo F',color:'#0aa',gates:[],categorias:[
    {id:'f1',nombre:'Prueba F1',peso:50,fecha:'2026-09-18',notas:[{id:'nf1',nombre:'Prueba F1',valor:3.6,peso:1}]},
    {id:'f2',nombre:'Quiz F',peso:5,fecha:'2026-10-21',notas:[]},
    {id:'f3',nombre:'Examen F',peso:45,fecha:'2026-12-10',notas:[]}]},
  {id:'g',nombre:'Ramo G',color:'#a0a',gates:[],categorias:[
    {id:'g1',nombre:'Prueba G1',peso:60,fecha:'2026-09-16',notas:[{id:'ng1',nombre:'Prueba G1',valor:3.0,peso:1}]},
    {id:'g2',nombre:'Prueba G2',peso:15,fecha:'2026-10-23',notas:[]},
    {id:'g3',nombre:'Examen G',peso:25,fecha:'2026-12-11',notas:[]}]},
  {id:'e',nombre:'Ramo E',color:'#f90',gates:[],categorias:[
    {id:'e1',nombre:'Prueba E1',peso:50,fecha:'2026-09-22',notas:[{id:'ne1',nombre:'Prueba E1',valor:2.0,peso:1}]},
    {id:'e2',nombre:'Prueba E2',peso:50,fecha:'2026-10-26',notas:[]}]}
]})`);
run('agendaOrdenActual="fecha";agendaRestantesAbiertas=true;renderAgenda()');
const h=stub.innerHTML;
// Cada aparición (tarjeta o fila) con su aviso, en orden de pantalla.
const apariciones=[];const re=/(ag-priority-name|ag-row-name)">([^<]*)<[\s\S]*?(?=ag-priority-name|ag-row-name|$)/g;let m;
while((m=re.exec(h))){const a=/class="ag-alert (bad|warn)"/.exec(m[0]);apariciones.push({tipo:m[1]==='ag-priority-name'?'tarjeta':'fila',nombre:m[2],aviso:a?a[1]:null});}
const de=n=>apariciones.find(x=>x.nombre===n);
assert.equal(de('Prueba 2').tipo,'tarjeta','la prueba de mañana es una prioridad');
assert.equal(de('Prueba 2').aviso,'warn','bajo 4,0 pero recuperable: ámbar, no rojo');
// 30% con 3,6 + 30% con X ≥ 3,95 → X = 4,3 en esta evaluación.
assert.match(h,/ag-priority-name">Prueba 2<[\s\S]*?Es importante: si sacas un 4\.3, estarás aprobando el ramo\./,'la nota de esta evaluación para ir aprobando');
assert.equal(de('Examen A').aviso,null,'el aviso de un ramo no se repite en sus otras apariciones');
assert.equal(de('Control 2').aviso,'warn','el otro ramo en riesgo también lo trae en su primera aparición');
assert.equal(de('Examen B').aviso,null,'una sola vez por ramo');
assert.equal(de('Entrega final').aviso,null,'un ramo que va bien no lleva aviso');
assert.doesNotMatch(h,/ag-priority-name">Prueba 2<[^]*?ag-priority-reason">Vas 3\.6/,'la razón de la tarjeta no repite el aviso');
// 50% con 2,0 y queda solo E2: N = X = 5,9. Urgente, en rojo (Lucas).
assert.equal(de('Prueba E2').aviso,'bad','urgente va en rojo');
assert.match(h,/Es urgente: necesitas un 5\.9 para ir aprobando el ramo\./,'sobre 5,0 es urgente');
// El caso de Lucas: un quiz de 5% en un ramo al que le basta 4,3 en lo
// pendiente. Para quedar en 4,0 justo después del quiz haría falta más de 7,0;
// eso no es urgencia: se dice que pesa poco y cuánto necesita en lo pendiente.
const bloque=n=>(new RegExp(`ag-(?:priority|row)-name">${n}<([\\s\\S]*?)(?=ag-(?:priority|row)-name"|$)`).exec(h)||[])[1]||'';
assert.equal(de('Quiz F').aviso,'warn','importante, no urgente');
assert.match(bloque('Quiz F'),/Esta evaluación vale 5% y aún queda 50% por rendir: con un 4\.3 en lo pendiente apruebas el ramo\./);
// Reporte de un usuario (2026-10-22): «pesa poco» en algo de 20%. Es relativo a
// lo pendiente, así que se dicen los números y nunca «pesa poco».
assert.doesNotMatch(h,/pesa poco/,'nunca dice «pesa poco»: depende de cuánto queda');
// G2 pesa 15 de 40 pendientes (≥ un tercio), pero quedar en 4,0 tras ella pide
// 7,75: no alcanza sola. N = (3,95 − 1,8) / 0,4 = 5,4: urgente.
assert.equal(de('Prueba G2').aviso,'bad');
assert.match(bloque('Prueba G2'),/Es urgente: con esta evaluación sola no alcanzas a quedar aprobando; necesitas un 5\.4 en lo pendiente para aprobar el ramo\./);
assert.equal(de('Control D').aviso,'bad','imposible: rojo');
assert.match(h,/No es posible que apruebes este ramo, pero da lo mejor de ti\./);

console.log('\n=== Recomendado no prioriza un ramo imposible ===');
run('agendaOrdenActual="recomendado";renderAgenda()');
const tarjetas=[...stub.innerHTML.matchAll(/ag-priority-name">([^<]*)</g)].map(x=>x[1]);
assert.ok(!tarjetas.includes('Control D'),'el control de mañana del ramo imposible no es prioridad: '+tarjetas.join(', '));
assert.match(stub.innerHTML,/Control D/,'pero sigue en la Agenda');
// El caso reportado: una prueba de 20% con 70% por rendir (20 < 70/3), en un
// ramo que va con 3,7 en el 30% rendido. Antes decía «pesa poco».
const aviso20=run(`(()=>{const cat=(id,nombre,peso,notas,fecha)=>({id,nombre,peso,fecha,notas});
  const ramo={id:'r20',nombre:'Ramo sintético',sigla:'TST200',gates:[],categorias:[
    cat('k1','Prueba 1',30,[{id:'n1',nombre:'Prueba 1',valor:3.7}],'2026-09-20'),
    cat('k2','Prueba 2',20,[],'2026-10-22'),cat('k3','Examen',50,[],'2026-11-28')]};
  const e=withPriority(agendaEvents([ramo]).find(x=>x.cat.id==='k2'));return alertaRamoAgendaHTML(e);})()`);
assert.match(aviso20,/Esta evaluación vale 20% y aún queda 70% por rendir: con un 4\.1 en lo pendiente apruebas el ramo\./);
assert.doesNotMatch(aviso20,/pesa poco/);
console.log('OK: avisos con urgencia sin alarma, una vez por ramo, y Recomendado no prioriza lo imposible');
