// Dos detalles del barrido del 2026-10-14.
//
// 1. El orden "Fecha" de la Agenda ignoraba la hora: dos pruebas el mismo día
//    salían por puntaje, y "Después" (siguienteEvaluacionAgenda) podía apuntar a
//    la de la tarde estando la de la mañana.
// 2. "X para redondear a 4.0" del promedio general usaba el borde de la regla
//    común (3,95) también en la UAndes (3,945), y con 3,949 decía "0.00".
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

console.log('\n=== Orden "Fecha" con hora ===');
ctx.__ev=JSON.stringify([
  {id:'tarde',fecha:'2026-11-03',hora:'15:00',score:90},
  {id:'manana',fecha:'2026-11-03',hora:'08:30',score:10},
  {id:'antes',fecha:'2026-11-02',hora:null,score:5},
]);
const orden=run(`ordenarAgenda(JSON.parse(__ev),'fecha').map(e=>e.id).join(',')`);
chk('la del día anterior, después la de la mañana y al final la de la tarde', orden==='antes,manana,tarde');

console.log('\n=== Formato del promedio general, sin cambiar notas finales ===');
let toast='';ctx.showToast=m=>{toast=String(m);};
const promedio=(tenant,nota)=>{
  ctx.__ramos=JSON.stringify([{id:'r1',nombre:'Ramo Sintético',color:'#6d5dd3',creditos:null,origen:null,gates:[],
    categorias:[{id:'c',nombre:'Prueba',peso:100,directNota:true,notas:[{id:'n',nombre:'Prueba',valor:nota,peso:1}]}]}]);
  run(`S.tenant='${tenant}';S.onboardingDone=true;S.historial=[];S.ramos=JSON.parse(__ramos);promedioExactoVisible=false;renderHome();`);
  toast='';run(`document.getElementById('home-gpa').onclick()`);
  return toast;
};
chk('UAndes: el promedio general va a la décima',/Promedio redondeado: 3,9/.test(promedio('uandes',3.94)));
chk('regla común: el promedio general va a la décima',/Promedio redondeado: 3,9/.test(promedio('fen',3.94)));
chk('3,95 se muestra 4,0 desde el valor bruto',/Promedio redondeado: 4,0/.test(promedio('fen',3.95)));

console.log(`\n${ok} OK, ${fail} FAIL`);
if(fail)process.exit(1);
