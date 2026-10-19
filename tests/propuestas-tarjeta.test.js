// La tarjeta de lo que propone un agente dice lo mismo que se va a guardar.
//
// Barrido del 2026-10-14, tres defectos de la ficha del ramo:
// - Las fechas propuestas salían "[object Object] → [object Object]":
//   formatEventDate devuelve {day,mon,dow}, no un texto.
// - La nota que se pisa se buscaba con `slot === casilla`, pero la casilla del
//   agente parte en 1 y `slot` en 0 (#655): para el Control 1 tachaba la nota
//   del Control 2.
// - Una nota propuesta con centésimas (5,14) se mostraba como 5,1 y se guardaba 5,14.
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

ctx.__ramos=JSON.stringify([{id:'r1',nombre:'Ramo Sintético',color:'#6d5dd3',creditos:null,origen:null,gates:[],
  categorias:[
    {id:'ctr',nombre:'Controles',peso:40,slots:2,directNota:true,notas:[
      {id:'a',nombre:'Control 1',valor:6.2,peso:1,slot:0},
      {id:'b',nombre:'Control 2',valor:3.1,peso:1,slot:1,fecha:'2026-10-20'}]},
    {id:'sol',nombre:'Solemne',peso:60,directNota:true,fecha:'2026-11-03',hora:'10:00',notas:[]},
  ]}]);
run(`S.tenant='fen';S.onboardingDone=true;S.historial=[];S.ramos=JSON.parse(__ramos);currentRamoId='r1';
  propuestasNotasAgente=[{id:'pn',ramo:'Ramo Sintético',ramoKey:null,fuente:'correo',notas:[{evaluacion:'Controles',valor:5.14,casilla:1}]}];
  propuestasFechasAgente=[{id:'pf',ramo:'Ramo Sintético',ramoKey:null,fuente:'calendario',fechas:[
    {evaluacion:'Solemne',fecha:'2026-11-10',hora:'12:00',casilla:null},
    {evaluacion:'Controles',fecha:'2026-10-27',hora:null,casilla:2}]}];
  renderRamo();`);
const html=byId('notas-propuestas').innerHTML;
const filas=html.split('prop-fila').slice(1);

console.log('\n=== Notas ===');
chk('la casilla 1 tacha la nota del Control 1 (6.2), no la del 2', /<s>6\.2<\/s> → 5\.14/.test(filas[0]||''));
chk('muestra la nota propuesta con sus centésimas', /5\.14/.test(filas[0]||''));

console.log('\n=== Fechas ===');
chk('nunca "[object Object]"', !/object Object/.test(html));
chk('la de la evaluación: antes y después', /<s>3 nov · 10:00<\/s> → 10 nov · 12:00/.test(filas[1]||''));
chk('la casilla 2 mueve la fecha del Control 2', /<s>20 oct<\/s> → 27 oct/.test(filas[2]||''));

console.log('\n=== Aplicar escribe donde dice la tarjeta ===');
run(`escribirNotaPropuesta(S.ramos[0].categorias[0],{evaluacion:'Controles',valor:5.14,casilla:1},S.ramos[0]);`);
chk('la casilla 1 queda con 5.14 y la 2 intacta',
  run(`JSON.stringify(S.ramos[0].categorias[0].notas.map(n=>[n.slot,n.valor]))`)==='[[0,5.14],[1,3.1]]');
chk('una casilla que no existe no calza', run(`escribirNotaPropuesta(S.ramos[0].categorias[0],{evaluacion:'Controles',valor:5,casilla:3},S.ramos[0])`)===false);

console.log(`\n${ok} OK, ${fail} FAIL`);
if(fail)process.exit(1);
