// En la FEN la nota que la pauta permite eliminar la borra cada estudiante: el
// motor no la saca solo y la ficha avisa cuántas se pueden borrar (Martín,
// 2026-11-03). Las demás universidades siguen con descarte automático.
const fs=require('fs'),vm=require('vm');
const raiz=__dirname+'/../';
const src=['data.js','engine.js','app.js','app-session.js','render-main.js','render-agenda.js']
  .map(f=>fs.readFileSync(raiz+f,'utf8')).join('\n');
function classList(){const c=new Set();return{add(...x){x.forEach(v=>c.add(v));},remove(...x){x.forEach(v=>c.delete(v));},contains(v){return c.has(v);}};}
function el(){let html='';const attrs={};
  const nodo={style:{setProperty(){},removeProperty(){}},classList:classList(),children:[],textContent:'',value:'',dataset:{},
    addEventListener(){},appendChild(h){this.children.push(h);return h;},setAttribute(k,v){attrs[k]=String(v);},removeAttribute(k){delete attrs[k];},getAttribute(k){return attrs[k]||null;},
    querySelector(){return nodo;},querySelectorAll(){return [];},focus(){},select(){},click(){},remove(){},clientWidth:400};
  Object.defineProperty(nodo,'innerHTML',{get(){return html;},set(v){html=String(v);this.children=[];}});
  return nodo;}
const ids={};const byId=id=>ids[id]||(ids[id]=el());
const ctx={window:{addEventListener(){},matchMedia:()=>({matches:true,addEventListener(){},addListener(){}})},
  document:{getElementById:byId,createElement:el,addEventListener(){},documentElement:el(),querySelector(){return el();},querySelectorAll(){return [];},body:el()},
  localStorage:{getItem(){return null;},setItem(){},removeItem(){}},navigator:{},location:{origin:'',pathname:'/',hash:''},history:{replaceState(){}},getComputedStyle:()=>({getPropertyValue:()=>''}),requestAnimationFrame:()=>0,setTimeout,clearTimeout,console};
vm.createContext(ctx);vm.runInContext(src,ctx);
let ok=0,fail=0;const chk=(n,c)=>{console.log(`  ${c?'OK  ':'FAIL'} ${n}`);if(c)ok++;else fail++;};
const run=c=>vm.runInContext(c,ctx);
const cerca=(a,b)=>Math.abs(a-b)<1e-9;
const juntar=n=>(n.innerHTML||'')+(n.children||[]).map(juntar).join('');
const cargar=(tenant,ramo)=>{ctx.__r=JSON.stringify(ramo);
  run(`S=normalize({tenant:'${tenant}',onboardingDone:true,ramos:[JSON.parse(__r)]});currentRamoId=S.ramos[0].id;renderRamo();`);
  return {html:juntar(byId('cat-list')),avg:run('ramoAvg(S.ramos[0])')};};
const nota=(id,valor,extra)=>({id,nombre:id,valor,peso:1,...extra});

console.log('\n=== La nota que permite borrar la pauta ===');
const conDescarte=regla=>({id:'r1',nombre:'R',color:'#6d5dd3',creditos:6,origen:null,gates:[],categorias:[
  {id:'c1',nombre:'Controles',peso:100,directNota:false,dropLowest:regla,notas:[nota('a',7),nota('b',7),nota('c',1)]}]});
const fen=cargar('fen',conDescarte({count:1}));
chk('en la FEN la nota baja sigue contando hasta que la borren',cerca(fen.avg,5));
chk('no la marca como descartada',!/No cuenta/.test(fen.html));
chk('avisa cuántas se pueden borrar bajo el título',/Controles<\/div>\s*<div class="eval-row-weight">Según la pauta, se puede borrar 1 nota</.test(fen.html));
run(`deleteNota('c1','c')`);
chk('al borrarla, el promedio sube',cerca(run('ramoAvg(S.ramos[0])'),7));
chk('la x sale de la pauta',/se pueden borrar 2 notas/.test(cargar('fen',conDescarte({count:2})).html));
chk('un porcentaje se dice como porcentaje',/se puede borrar el 25% de las notas/.test(cargar('fen',conDescarte({fraction:0.25})).html));
const uc=cargar('uc',conDescarte({count:1}));
chk('en otra universidad el descarte sigue siendo automático',cerca(uc.avg,7));
chk('y no lleva el aviso',!/Según la pauta/.test(uc.html));
chk('el campo guardado no cambia',JSON.stringify(run('S.ramos[0].categorias[0].dropLowest'))==='{"count":1}');

console.log(`\nPASS: ${ok}   FAIL: ${fail}`);
process.exit(fail?1:0);
