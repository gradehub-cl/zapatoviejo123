// Biocel permite eximirse con nota de presentación suficiente, pero GradeHub
// no conoce la asistencia de Taller. La app puede comprobar las notas; la parte
// que solo sabe el estudiante se confirma de forma explícita y reversible.
const fs=require('fs'),vm=require('vm');
const raiz=(process.env.GRADEHUB_ROOT||(__dirname+'/..')).replace(/\/$/,'')+'/';
const appPath=process.env.GRADEHUB_APP||raiz+'app.js';
const src=[raiz+'data.js',raiz+'engine.js',appPath,raiz+'app-session.js',raiz+'render-main.js',raiz+'render-agenda.js']
  .map(f=>fs.readFileSync(f,'utf8')).join('\n');

function classList(){const clases=new Set();return{add(...xs){xs.forEach(x=>clases.add(x));},remove(...xs){xs.forEach(x=>clases.delete(x));},toggle(x){clases.has(x)?clases.delete(x):clases.add(x);},contains(x){return clases.has(x);}};}
function el(){let html='';const attrs={};const nodo={style:{setProperty(){},removeProperty(){}},classList:classList(),children:[],textContent:'',value:'',dataset:{},hidden:false,
  addEventListener(){},appendChild(h){this.children.push(h);return h;},setAttribute(k,v){attrs[k]=String(v);},removeAttribute(k){delete attrs[k];},getAttribute(k){return attrs[k]||null;},
  querySelector(){return nodo;},querySelectorAll(){return [];},focus(){},select(){},click(){},remove(){},clientWidth:400,clientHeight:700,scrollIntoView(){}};
  Object.defineProperty(nodo,'innerHTML',{get(){return html;},set(v){html=String(v);this.children=[];}});return nodo;}
const ids={};const byId=id=>ids[id]||(ids[id]=el());
const ctx={
  window:{addEventListener(){},matchMedia:()=>({matches:false,addEventListener(){},addListener(){}})},
  document:{getElementById:byId,createElement:el,addEventListener(){},documentElement:el(),querySelector(){return el();},querySelectorAll(){return [];},body:el()},
  localStorage:{getItem(){return null},setItem(){},removeItem(){}},navigator:{},location:{origin:'',pathname:'/',search:'',hash:''},history:{replaceState(){}},
  getComputedStyle:()=>({getPropertyValue:()=>''}),setTimeout(fn){fn();return 0},clearTimeout(){},requestAnimationFrame(){return 0},cancelAnimationFrame(){},console,gtag(){}
};
vm.createContext(ctx);vm.runInContext(src,ctx);
const run=codigo=>vm.runInContext(codigo,ctx);
// Biología de la Célula no es coordinado (2026-11-09): su programa es el de las
// Cuando el examen está eximido y la regla no le asigna nota (no es «máxima»
// ni se oculta), la fila del examen sigue en la ficha pero el cálculo ya no la
// trae. Antes eso llegaba a nf(undefined) y la ficha entera se caía
// («undefined is not an object (evaluating 'n.toFixed')», errores_app).
let ok=0,fail=0;
function chk(nombre,cond){if(cond){ok++;console.log('  OK   '+nombre);}else{fail++;console.log('  FAIL '+nombre);}}
const preset=run("presetRamo('Ingeniería de Sistemas de Transporte','uc','ING-PC',new Date('2026-11-20T12:00:00-03:00'))");
chk('el preset sintético carga',!!preset&&Array.isArray(preset.categorias));
const ramo={id:'ist',nombre:'Ingeniería de Sistemas de Transporte',color:'#6484b8',origen:{tenant:'uc',carrera:'ING-PC'},categorias:preset.categorias,gates:preset.gates};
const cat=n=>ramo.categorias.find(c=>c.nombre===n);
cat('Controles').notas=[0,1,2,3,4].map(i=>({id:'c'+i,nombre:'c'+i,valor:6,peso:1,slot:i}));
['Meme 1','Meme 2','Meme 3','Meme 4'].forEach((n,i)=>{cat(n).notas=[{id:'m'+i,nombre:n,valor:6,peso:1}];});
cat('Examen').notas=[];
ctx.__ramo=ramo;
run("S={...freshState(),tenant:'uc',ramos:[__ramo]};currentRamoId='ist';save=()=>{};track=()=>{};");
const estado=run('estadoEximicion(__ramo)');
chk('con controles 6,0 queda eximido del examen',estado&&estado.activa===true&&run("categoriaEximida(__ramo,__ramo.categorias.find(c=>c.nombre==='Examen'))")===true);
let error=null;try{run('renderRamo()');}catch(e){error=e;}
chk('la ficha se pinta sin caerse',!error);
if(error)console.log("     "+error.stack.split("\n").filter(l=>/at /.test(l)).slice(0,4).join(" | "));
const ficha=byId('cat-list').children.map(x=>x.innerHTML).join('\n');
chk('el examen eximido sigue visible',/Examen/.test(ficha));
chk('sin «undefined» ni «NaN» en la ficha',!/undefined|NaN/.test(ficha));
const filaExamen=byId('cat-list').children.map(x=>x.innerHTML).find(h=>/Examen/.test(h)&&/exento/.test(h))||'';
chk('el examen dice que está exento y no inventa una nota',/exento\/a/.test(filaExamen)&&/ramo-nota neutral[^>]*>·</.test(filaExamen));
chk('el ramo conserva su promedio sin el examen',Math.abs(run('ramoAvg(__ramo)')-6)<0.005);
console.log(`\n${ok} OK, ${fail} FAIL`);
process.exit(fail?1:0);
