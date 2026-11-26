// Todo lo que tiene fecha sale al calendario, una vez y con su nombre: el .ics,
// el botón de Google Calendar por control y lo mismo que muestra la Agenda.
// (Comentario de una estudiante, 2026-11-17: «al exportar fechas solo deja
// agregar 1 fecha para ese conjunto de evaluaciones».) Solo datos sintéticos.
const assert=require('node:assert/strict'),fs=require('fs'),vm=require('vm');
const raiz=__dirname+'/../';
const src=['data.js','engine.js','app.js','render-agenda.js'].map(f=>fs.readFileSync(raiz+f,'utf8')).join('\n');
const stub={style:{setProperty(){},removeProperty(){}},addEventListener(){},appendChild(){},classList:{add(){},remove(){},contains(){return false}},value:'',innerHTML:'',textContent:'',focus(){},select(){},setAttribute(){},removeAttribute(){},getAttribute(){return null},querySelectorAll(){return []},querySelector(){return stub},clientWidth:400,dataset:{},click(){}};
const ctx={window:{addEventListener(){},matchMedia:()=>({matches:true,addEventListener(){},addListener(){}})},
  document:{getElementById:()=>stub,createElement:()=>stub,addEventListener(){},documentElement:{style:{setProperty(){},removeProperty(){}},setAttribute(){},removeAttribute(){},getAttribute(){return null}},querySelector:()=>stub,querySelectorAll:()=>[],body:stub},
  localStorage:{getItem(){return null},setItem(){},removeItem(){}},navigator:{},location:{origin:'',pathname:'',hash:''},URLSearchParams,URL,setTimeout,clearTimeout,console};
vm.createContext(ctx);vm.runInContext(src,ctx);
const run=c=>vm.runInContext(c,ctx);
const RAMOS=[{id:'r1',nombre:'Ramo Sintético',categorias:[
  // Casillas: tres con fecha (una ya rendida) y una sin fecha.
  {id:'c1',nombre:'Controles',peso:30,directNota:true,slots:4,notas:[
    {id:'n0',nombre:'Control 1',valor:5,peso:1,slot:0,fecha:'2026-09-01'},
    {id:'n2',nombre:'Control 3',valor:null,peso:1,slot:2,fecha:'2026-11-24',hora:'10:00'},
    {id:'n3',nombre:'Control 4',valor:null,peso:1,slot:3,fecha:'2026-12-01'}]},
  // Lista abierta (sin cantidad) con dos notas fechadas.
  {id:'c2',nombre:'Tareas',peso:20,directNota:false,notas:[
    {id:'t1',nombre:'Tarea 1',valor:6,peso:1,fecha:'2026-09-10'},
    {id:'t2',nombre:'Tarea 2',valor:null,peso:1,fecha:'2026-10-10'}]},
  {id:'c3',nombre:'Examen',peso:50,directNota:true,fecha:'2026-12-10',notas:[]}],gates:[]}];
run('S=S||{};S.ramos='+JSON.stringify(RAMOS));
const esperados=['2026-09-01','2026-09-10','2026-10-10','2026-11-24','2026-12-01','2026-12-10'];
assert.deepEqual(JSON.parse(run('JSON.stringify(agendaEvents().map(e=>e.fecha))')),esperados,'la Agenda muestra cada fecha una vez');

const ics=run('buildICS()');
const eventos=ics.split('BEGIN:VEVENT').slice(1);
assert.equal(eventos.length,6,'el .ics trae los 6 eventos');
const uids=eventos.map(e=>e.match(/UID:(.*)/)[1].trim());
assert.equal(new Set(uids).size,6,'cada evento con UID propio: el calendario no junta controles');
const titulos=eventos.map(e=>e.match(/SUMMARY:(.*)/)[1].trim());
for(const t of ['Control 1','Control 3','Control 4','Tarea 1','Tarea 2','Examen'])
  assert(titulos.some(x=>x.startsWith(t+' ')),'título del evento: '+t);
assert(eventos.some(e=>/DTSTART:20261124T100000/.test(e)),'la hora del control llega al .ics');

// Google Calendar: un botón por control, con su nombre, su día y su peso.
const url=s=>new URL(s);
const g3=url(run("googleCalUrl(S.ramos[0],S.ramos[0].categorias[0],S.ramos[0].categorias[0].notas[1])"));
assert.equal(g3.searchParams.get('text'),'Control 3 — Ramo Sintético');
assert.equal(g3.searchParams.get('dates'),'20261124/20261125');
assert.match(g3.searchParams.get('details'),/Vale 7[,.]5% de Ramo Sintético/,'30% en 4 casillas');
const gt=url(run("googleCalUrl(S.ramos[0],S.ramos[0].categorias[1],S.ramos[0].categorias[1].notas[1])"));
assert.equal(gt.searchParams.get('text'),'Tarea 2 — Ramo Sintético');
assert.match(gt.searchParams.get('details'),/Parte de «Tareas», que vale 20%/,'sin cantidad no inventa el peso de una tarea');
const ge=url(run("googleCalUrl(S.ramos[0],S.ramos[0].categorias[2])"));
assert.equal(ge.searchParams.get('text'),'Examen — Ramo Sintético');assert.match(ge.searchParams.get('details'),/Vale 50%/);
assert.equal(run("googleCalUrl(S.ramos[0],S.ramos[0].categorias[0],{id:'x',slot:1})"),'','un control sin fecha no tiene botón');
console.log('OK exportar todas las fechas: Agenda, .ics con UID propio y Google Calendar por control');
