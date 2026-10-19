// Una casilla vacía no es una evaluación rendida.
//
// Barrido del 2026-10-14: tocar una casilla y cancelar guarda una nota vacía
// (abrirCasilla la crea antes de abrir la hoja), igual que "Guardada como
// pendiente". agendaEvents contaba esas notas como rendidas: con los dos
// Controles tocados, la evaluación del grupo pasaba a "con nota" y desaparecía
// de la Agenda y de "Próxima evaluación" sin tener ninguna nota.
const fs=require('fs'),vm=require('vm');
const raiz=__dirname+'/../';
const src=['data.js','engine.js','app.js','app-session.js','render-main.js','render-agenda.js']
  .map(f=>fs.readFileSync(raiz+f,'utf8')).join('\n');
function classList(){const c=new Set();return{add(...x){x.forEach(v=>c.add(v));},remove(...x){x.forEach(v=>c.delete(v));},contains(v){return c.has(v);},toggle(){}};}
function el(){let html='';const attrs={};
  const nodo={style:{setProperty(){},removeProperty(){}},classList:classList(),children:[],textContent:'',value:'',dataset:{},
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

const iso=n=>{const d=new Date();d.setHours(0,0,0,0);d.setDate(d.getDate()+n);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
const casilla=(slot,valor=null,fecha=null)=>({id:'n'+slot,nombre:'Control '+(slot+1),valor,peso:1,slot,...(fecha?{fecha}:{})});
const cargar=(cat)=>{
  ctx.__ramos=JSON.stringify([{id:'r1',nombre:'Ramo Sintético',color:'#6d5dd3',creditos:null,origen:null,gates:[],
    categorias:[{id:'ctr',nombre:'Controles',peso:40,fecha:iso(5),...cat}]}]);
  run(`S.tenant='fen';S.onboardingDone=true;S.historial=[];S.ramos=JSON.parse(__ramos);`);
};
const grupo=()=>run(`(agendaEvents().find(e=>e.cat.id==='ctr'&&!e.nota)||null)`);
const estado=()=>{const e=grupo();return e?run(`estadoEventoAgenda(${JSON.stringify({pending:e.pending,fecha:e.fecha})})`):null;};

console.log('\n=== Casillas tocadas y canceladas ===');
cargar({slots:2,directNota:true,notas:[casilla(0),casilla(1)]});
chk('el grupo sigue por venir', estado()==='por_venir');
chk('y es la próxima evaluación de Inicio', (run('nextExam()')||{}).nombre==='Controles');

console.log('\n=== Una rendida y una vacía ===');
cargar({slots:2,directNota:true,notas:[casilla(0,5.5),casilla(1)]});
chk('falta una: sigue pendiente', estado()==='por_venir');

console.log('\n=== Las dos rendidas ===');
cargar({slots:2,directNota:true,notas:[casilla(0,5.5),casilla(1,6.0)]});
chk('con nota', estado()==='con_nota');

console.log('\n=== Dos valores en la misma casilla no cierran el grupo ===');
cargar({slots:2,directNota:true,notas:[casilla(0,5.5),{...casilla(0,6.0),id:'dup'}]});
chk('sigue pendiente', estado()==='por_venir');

console.log('\n=== Evaluación directa guardada como pendiente ===');
cargar({directNota:true,notas:[{id:'p',nombre:'Controles',valor:null,peso:1}]});
chk('sigue por venir', estado()==='por_venir');

console.log('\n=== La fecha del grupo cubre solo las casillas sin fecha propia ===');
cargar({slots:3,directNota:true,notas:[casilla(0,null,iso(2)),casilla(1,5.0),casilla(2,6.0)]});
chk('las dos sin fecha propia ya tienen nota: el grupo está rendido', estado()==='con_nota');
chk('la casilla con fecha propia sigue siendo su propio evento',
  run(`agendaEvents().some(e=>e.nota&&e.nota.id==='n0'&&e.pending)`));

console.log(`\n${ok} OK, ${fail} FAIL`);
if(fail)process.exit(1);
