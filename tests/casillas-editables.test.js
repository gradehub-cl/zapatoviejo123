// La cantidad de notas de un grupo se edita en la ficha: el programa puede decir
// 2 controles y la sección tomar 4 (Martín, 2026-11-03).
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

console.log('\n=== Cantidad de notas de un grupo ===');
const grupo=notas=>({id:'r1',nombre:'R',color:'#6d5dd3',creditos:6,origen:null,gates:[],categorias:[
  {id:'c1',nombre:'Controles',peso:100,slots:2,directNota:true,notas}]});
const dos=cargar('fen',grupo([nota('a',6,{slot:0}),nota('b',4,{slot:1})]));
chk('el grupo ofrece agregar una nota, sin contador',/agregarCasilla\('c1'\)[^<]*>\+ Agregar nota</.test(dos.html)&&!/Cantidad de notas|sim-meta/.test(dos.html));
chk('con todas las casillas ocupadas no ofrece quitar',!/Quitar la última/.test(dos.html));
run(`agregarCasilla('c1');agregarCasilla('c1');`);
chk('con la última vacía ofrece quitarla',/Quitar la última/.test(juntar(byId('cat-list'))));
chk('sube de 2 a 4',run('S.ramos[0].categorias[0].slots')===4);
chk('las notas y el promedio siguen iguales',cerca(run('ramoAvg(S.ramos[0])'),5));
chk('se dibujan las cuatro',(juntar(byId('cat-list')).match(/<div class="eval-sub/g)||[]).length===4);
run(`setSlotNota('c1',3,'7');cambiarCasillas('c1',-1);`);
chk('no baja de una casilla con nota',run('S.ramos[0].categorias[0].slots')===4);
run(`setSlotNota('c1',3,'');cambiarCasillas('c1',-1);cambiarCasillas('c1',-1);cambiarCasillas('c1',-1);`);
chk('ni de dos casillas',run('S.ramos[0].categorias[0].slots')===2);
chk('una casilla con nombre propio del programa no se cambia',!/Agregar nota|Quitar la última/.test(cargar('fen',{...grupo([]),categorias:[
  {id:'c1',nombre:'Trabajos',peso:100,slots:2,directNota:true,notas:[],nombresCasillas:['Cápsulas','Talleres']}]}).html));

console.log(`\nPASS: ${ok}   FAIL: ${fail}`);
process.exit(fail?1:0);
