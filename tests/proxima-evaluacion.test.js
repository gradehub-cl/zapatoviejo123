// "Próxima evaluación" en Inicio tiene que decir lo mismo que la Agenda.
//
// Barrido del 2026-09-29: nextExam() tenía su propia lógica antigua. Solo
// miraba la fecha de la categoría, ignoraba las fechas por casilla (desde el
// 2026-09-12 cada nota de un grupo puede tener la suya, y una casilla solo
// fechada es una nota con valor:null) y daba por rendida una categoría con
// tantas notas como casillas aunque ninguna tuviera valor. Con "Solemne 1" en
// 5 días y los Controles fechados en 2, 9 y 16, Inicio decía "Solemne 1 en 5
// días" y la Agenda ponía primero el Control 1 en 2.
const fs=require('fs'),vm=require('vm');
const raiz=__dirname+'/../';
const src=['data.js','engine.js','app.js','app-session.js','render-main.js','render-agenda.js']
  .map(f=>fs.readFileSync(raiz+f,'utf8')).join('\n');
function classList(){const c=new Set();return{add(...x){x.forEach(v=>c.add(v));},remove(...x){x.forEach(v=>c.delete(v));},contains(v){return c.has(v);},toggle(){}};}
function el(){let html='';const attrs={};
  const nodo={style:{setProperty(k,v){this[k]=v;},removeProperty(k){delete this[k];}},classList:classList(),children:[],textContent:'',value:'',dataset:{},
    addEventListener(){},appendChild(h){this.children.push(h);return h;},setAttribute(k,v){attrs[k]=String(v);},removeAttribute(k){delete attrs[k];},getAttribute(k){return attrs[k]||null;},
    querySelector(){return nodo;},querySelectorAll(){return [];},closest(){return null;},focus(){},select(){},click(){},remove(){},clientWidth:400};
  Object.defineProperty(nodo,'innerHTML',{get(){return html;},set(v){html=String(v);this.children=[];}});
  return nodo;}
const ids={};const byId=id=>ids[id]||(ids[id]=el());
const ctx={window:{addEventListener(){},matchMedia:()=>({matches:true,addEventListener(){},addListener(){}})},
  document:{getElementById:byId,createElement:el,addEventListener(){},documentElement:el(),querySelector(){return el();},querySelectorAll(){return [];},body:el()},
  localStorage:{getItem(){return null;},setItem(){},removeItem(){}},navigator:{},location:{origin:'',pathname:'/',hash:''},history:{replaceState(){}},setTimeout,clearTimeout,console};
vm.createContext(ctx);vm.runInContext(src,ctx);
const run=c=>vm.runInContext(c,ctx);
let ok=0,fail=0;const chk=(n,c)=>{console.log(`  ${c?'OK  ':'FAIL'} ${n}`);if(c)ok++;else fail++;};

// Fechas relativas a hoy, en hora local como las guarda la app (YYYY-MM-DD).
const iso=n=>{const d=new Date();d.setHours(0,0,0,0);d.setDate(d.getDate()+n);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};

// Pauta de ejemplo: una Solemne con fecha de categoría y tres Controles en
// casillas, cada uno con su propia fecha y todavía sin nota. Los nombres de
// casilla son los que escribe la app al fechar una (etiquetaCasilla).
const casilla=(slot,dias,valor=null)=>({id:'n'+slot,nombre:'Control '+(slot+1),valor,peso:1,slot,fecha:iso(dias)});
const cargar=controles=>{
  ctx.__ramos=JSON.stringify([{id:'r1',nombre:'Microeconomía Sintética',color:'#6d5dd3',creditos:null,origen:null,gates:[],
    categorias:[
      {id:'sol1',nombre:'Solemne 1',peso:40,fecha:iso(5),notas:[]},
      {id:'ctr',nombre:'Controles',peso:60,slots:3,directNota:true,notas:controles},
    ]}]);
  run(`S.tenant='fen';S.onboardingDone=true;S.historial=[];S.ramos=JSON.parse(__ramos);`);
};
const proxima=()=>run('nextExam()');
const primeraDeAgenda=()=>run(`(agendaEvents().find(e=>estadoEventoAgenda(e)==='por_venir')||null)`);
const tarjeta=()=>{run('renderHome()');return byId('home-insights').innerHTML;};

console.log('\n=== El caso del barrido ===');
cargar([casilla(0,2),casilla(1,9),casilla(2,16)]);
let ne=proxima(),ag=primeraDeAgenda();
chk('Inicio elige el Control 1, no la Solemne 1', ne&&ne.cat.id==='ctr'&&ne.nombre==='Control 1');
chk('en 2 días', ne&&ne.daysUntil===2);
chk('la misma evaluación que encabeza la Agenda', ne&&ag&&ag.nota&&ag.nota.id==='n0'&&ne.cat===ag.cat);
chk('conserva lo que usa Inicio (ramo, cat, date, daysUntil)', ne&&ne.ramo.id==='r1'&&typeof (ne.date&&ne.date.getTime)==='function');
let h=tarjeta();
chk('separa evaluación y ramo sin perder ninguno', /insight-title">Control 1</.test(h)&&/insight-meta">Microeconomía Sintética</.test(h));
chk('el plazo destaca «2 días» y conserva su fecha', /home-insight-value"><strong>2 días<\/strong><small>/.test(h));

console.log('\n=== Una casilla ya con nota no es la próxima ===');
cargar([casilla(0,2,6.0),casilla(1,9),casilla(2,16)]);
ne=proxima();
chk('pasa a la Solemne 1 en 5 días', ne&&ne.cat.id==='sol1'&&ne.nombre==='Solemne 1'&&ne.daysUntil===5);
chk('la tarjeta usa el nombre de la categoría', /insight-title">Solemne 1</.test(tarjeta()));

console.log('\n=== Lo vencido y lo rendido no cuentan ===');
cargar([casilla(0,-3),casilla(1,9),casilla(2,16)]);
ctx.__sol=JSON.stringify({id:'s',nombre:'Solemne 1',valor:5.0,peso:1});
run(`S.ramos[0].categorias[0].notas=[JSON.parse(__sol)];`);
ne=proxima();
chk('ni un control de hace 3 días sin nota ni una Solemne ya rendida: Control 2 en 9', ne&&ne.nombre==='Control 2'&&ne.daysUntil===9);
run(`S.ramos[0].categorias.forEach(c=>c.notas.forEach(n=>{n.valor=5;}));`);
chk('con todo rendido no hay próxima', proxima()===null);

console.log('\n=== Una evaluación eximida no aparece ===');
// Regla de eximición escrita acá, no sacada del catálogo: con Controles
// completos y promedio ≥ 5,5 el Examen deja de ser obligatorio.
run(`PRESETS_FEN['Ramo Sintético Eximible']={eximicion:{evaluacion:'Examen',segun:['Controles'],min:5.5,ignoraDescartes:true}};`);
const eximible=nota=>{
  ctx.__ramos=JSON.stringify([{id:'r2',nombre:'Ramo Sintético Eximible',color:'#6d5dd3',creditos:null,origen:{tenant:'fen',carrera:null},gates:[],
    categorias:[
      {id:'ctr2',nombre:'Controles',peso:60,slots:2,directNota:true,notas:[
        {id:'a',nombre:'Control 1',valor:nota,peso:1,slot:0},{id:'b',nombre:'Control 2',valor:nota,peso:1,slot:1}]},
      {id:'ex',nombre:'Examen',peso:40,fecha:iso(1),notas:[]},
    ]}]);
  run(`S.ramos=JSON.parse(__ramos);`);
};
eximible(4.0);
ne=proxima();
chk('sin eximición, el Examen de mañana es la próxima', ne&&ne.cat.id==='ex'&&ne.daysUntil===1);
eximible(6.0);
chk('eximido, el Examen desaparece', run(`categoriaEximida(S.ramos[0],S.ramos[0].categorias[1])`)===true&&proxima()===null);

console.log('\n=== Presentación de Inicio con cuentas existentes ===');
ctx.__ramos=JSON.stringify([{id:'riesgo',nombre:'Física Sintética',color:'#6d5dd3',creditos:10,gates:[],categorias:[
  {id:'evaluado',nombre:'Interrogación 1',peso:80,slots:1,notas:[{id:'i1',nombre:'Interrogación 1',valor:1,peso:1}]},
  {id:'pendiente',nombre:'Examen',peso:20,fecha:iso(2),notas:[]},
]}]);
run(`S.tenant='uc';S.ramos=JSON.parse(__ramos);S.historial=[{label:'2026-1',gpa:5,ramos:[]}];`);
h=tarjeta();
chk('el promedio general usa el semáforo: un 1,0 va en rojo',byId('home-gpa').style['--grade-color']===run('getColor(1)')&&byId('home-gpa').className.startsWith('gpa-num '+run('colorClass(1)')));
chk('se oculta solo la aclaración rutinaria de ponderación',byId('home-gpa-method').style.display==='none');
chk('las notas sin fecha siguen contando y conservan el semáforo del ramo',/gpa-tag-dot bad/.test(byId('gpa-tags').innerHTML));
chk('la comparación con el semestre anterior sigue bajando en rojo',byId('gpa-delta').className==='gpa-delta down'&&/↓/.test(byId('gpa-delta').innerHTML));
chk('Inicio ya no muestra la tarjeta de ramo en riesgo',!/Ramo en riesgo|Ya no alcanza/.test(h));
chk('las tarjetas usan botones nativos para teclado y lector de pantalla',/button type="button" class="insight-card home-academic-row"/.test(h)&&!/role="button"/.test(h));
run(`S.ramos[0].creditos=null;`);tarjeta();
chk('si faltan créditos, se conserva la advertencia de promedio simple',byId('home-gpa-method').style.display==='block'&&/promedio simple/i.test(byId('home-gpa-method').textContent));
const html=fs.readFileSync(raiz+'index.html','utf8');
const posicion=id=>html.indexOf('id="'+id+'"');
// Clases particulares va justo bajo los ramos (Lucas, 2026-11-03).
chk('el orden es listado, clases, situación académica y simulación',posicion('home-ramos')<posicion('home-clases')&&posicion('home-clases')<posicion('home-insights')&&posicion('home-insights')<posicion('sim-global-btn'));

console.log(`\nPASS: ${ok}   FAIL: ${fail}`);
process.exit(fail?1:0);
