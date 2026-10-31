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
// La misma elegibilidad y una sola meta por ramo, ahora como medidor.
const apariciones=[];const re=/(ag-priority-name|ag-row-name)">([^<]*)<[\s\S]*?(?=ag-priority-name|ag-row-name|$)/g;let m;
while((m=re.exec(h))){const a=/class="ag-need"[^>]*aria-label="([^"]*)"/.exec(m[0]);apariciones.push({tipo:m[1]==='ag-priority-name'?'tarjeta':'fila',nombre:m[2],aviso:a?a[1]:null});}
const de=n=>apariciones.find(x=>x.nombre===n);
const bloque=n=>(new RegExp(`ag-(?:priority|row)-name">${n}<([\\s\\S]*?)(?=ag-(?:priority|row)-name"|$)`).exec(h)||[])[1]||'';
assert.equal(de('Prueba 2').tipo,'tarjeta','la prueba de mañana es una prioridad');
// El medidor representa TODO lo pendiente (4,1), no la nota específica de P2 (4,3).
assert.match(de('Prueba 2').aviso,/Necesitas 4,1 promedio en lo pendiente.*Exigente/);
assert.match(bloque('Prueba 2'),/ag-need-value[^]*?<strong>4,1<\/strong>/);
assert.equal(de('Examen A').aviso,null,'el aviso no se repite en las otras evaluaciones del ramo');
assert.match(de('Control 2').aviso,/Necesitas 4,1 promedio en lo pendiente/);
assert.equal(de('Examen B').aviso,null,'una sola vez por ramo');
assert.equal(de('Entrega final').aviso,null,'un ramo que va bien no lleva aviso');
assert.doesNotMatch(h,/ag-alert|ag-priority-reason/,'sin recuadros de alerta ni explicaciones repetidas');
assert.match(de('Prueba E2').aviso,/5,9.*Muy exigente/);
assert.match(bloque('Prueba E2'),/color:var\(--red\)/,'exigencia alta en rojo');
assert.match(de('Quiz F').aviso,/4,3.*Exigente/,'el quiz muestra la meta del ramo');
assert.match(de('Prueba G2').aviso,/5,4.*Exigente/);
assert.match(bloque('Prueba G2'),/color:var\(--yellow\)/,'usa el mismo semáforo de exigencia que Estadísticas');
assert.match(de('Control D').aviso,/Lo pendiente no alcanza.*Sin salida/);
assert.match(bloque('Control D'),/ag-need-value[^]*?<strong>—<\/strong>/,'imposible no promete una nota alcanzable');
assert.equal(run('medidorRamoAgendaHTML({necesita:null})'),'','sin meta calculable no inventa un medidor');

console.log('\n=== Recomendado no prioriza un ramo imposible ===');
run('agendaOrdenActual="recomendado";renderAgenda()');
const tarjetas=[...stub.innerHTML.matchAll(/ag-priority-name">([^<]*)</g)].map(x=>x[1]);
assert.ok(!tarjetas.includes('Control D'),'el control de mañana del ramo imposible no es prioridad: '+tarjetas.join(', '));
assert.match(stub.innerHTML,/Control D/,'pero sigue en la Agenda');
// El caso reportado (2026-10-22): una prueba de 20% con 70% por rendir, en un
// ramo que va con 3,7 en el 30% rendido. Antes decía «pesa poco» porque 20 <
// 70/3. Regla de Lucas: si esta sola lo deja en 4,0, se dice la nota, pese lo
// que pese; «pesa poco» es solo bajo el 10% del ramo.
const aviso20=run(`(()=>{const cat=(id,nombre,peso,notas,fecha)=>({id,nombre,peso,fecha,notas});
  const ramo={id:'r20',nombre:'Ramo sintético',sigla:'TST200',gates:[],categorias:[
    cat('k1','Prueba 1',30,[{id:'n1',nombre:'Prueba 1',valor:3.7}],'2026-09-20'),
    cat('k2','Prueba 2',20,[],'2026-10-22'),cat('k3','Examen',50,[],'2026-11-28')]};
  const e=withPriority(agendaEvents([ramo]).find(x=>x.cat.id==='k2'));return alertaRamoAgendaHTML(e);})()`);
assert.match(aviso20,/Es importante: si sacas un 4\.\d, estarás aprobando el ramo\./);
assert.doesNotMatch(aviso20,/pesa poco/);
// Una de 8% que sí lo deja en 4,0 dice la nota, aunque pese poco: la regla 1 manda.
const aviso8=run(`(()=>{const cat=(id,nombre,peso,notas,fecha)=>({id,nombre,peso,fecha,notas});
  const ramo={id:'r8',nombre:'Ramo sintético',sigla:'TST208',gates:[],categorias:[
    cat('k1','Prueba 1',30,[{id:'n1',nombre:'Prueba 1',valor:3.9}],'2026-09-20'),
    cat('k2','Quiz',8,[],'2026-10-22'),cat('k3','Examen',62,[],'2026-11-28')]};
  return alertaRamoAgendaHTML(withPriority(agendaEvents([ramo]).find(x=>x.cat.id==='k2')));})()`);
assert.match(aviso8,/Es importante: si sacas un \d\.\d, estarás aprobando el ramo\./,'si la deja en 4,0, se dice la nota aunque pese poco');
// Una de 15% que sola no alcanza no es «pesa poco» (vale 10% o más): sigue el caso general.
const aviso15=run(`(()=>{const cat=(id,nombre,peso,notas,fecha)=>({id,nombre,peso,fecha,notas});
  const ramo={id:'r15',nombre:'Ramo sintético',sigla:'TST215',gates:[],categorias:[
    cat('k1','Prueba 1',40,[{id:'n1',nombre:'Prueba 1',valor:2.5}],'2026-09-20'),
    cat('k2','Control',15,[],'2026-10-22'),cat('k3','Examen',45,[],'2026-11-28')]};
  return alertaRamoAgendaHTML(withPriority(agendaEvents([ramo]).find(x=>x.cat.id==='k2')));})()`);
assert.doesNotMatch(aviso15,/pesa poco/,'15% del ramo no pesa poco');
assert.match(aviso15,/Una buena nota en esta evaluación te ayudará: necesitas un \d\.\d en lo pendiente para aprobar el ramo\./);
assert.doesNotMatch(h+aviso15,/no alcanzas a quedar aprobando/,'ya no se explica que sola no alcanza (Lucas, 2026-10-22)');
console.log('OK: medidor con meta del ramo, elegibilidad y cálculos existentes conservados');
