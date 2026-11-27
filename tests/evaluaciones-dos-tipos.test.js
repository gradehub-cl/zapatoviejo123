// Dos tipos de evaluación: nota sola o grupo de casillas (Martín, 2026-11-22).
// La lista abierta guardada con 0 o 1 nota se ve como nota sola sin tocar el
// dato, y "varias notas" ya no se crea sin cantidad.
const fs=require('fs'),vm=require('vm');
const raiz=__dirname+'/../';
const src=['data.js','engine.js','app.js','app-session.js','render-main.js','render-agenda.js']
  .map(f=>fs.readFileSync(raiz+f,'utf8')).join('\n');
function classList(){const c=new Set();return{add(...x){x.forEach(v=>c.add(v));},remove(...x){x.forEach(v=>c.delete(v));},contains(v){return c.has(v);},toggle(){}};}
function el(){let html='';const attrs={};
  const nodo={style:{setProperty(){},removeProperty(){}},classList:classList(),children:[],textContent:'',value:'',checked:false,hidden:false,dataset:{},
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
const cerca=(a,b)=>a===b||Math.abs(a-b)<1e-9;
const juntar=n=>(n.innerHTML||'')+(n.children||[]).map(juntar).join('');
const cargar=ramo=>{ctx.__r=JSON.stringify(ramo);
  run(`S=normalize({tenant:'fen',onboardingDone:true,ramos:[JSON.parse(__r)]});currentRamoId=S.ramos[0].id;renderRamo();`);
  return juntar(byId('cat-list'));};
const nota=(id,valor,extra)=>({id,nombre:id,valor,peso:1,...extra});
const ramo=cats=>({id:'r1',nombre:'Ramo de prueba',color:'#6d5dd3',creditos:6,origen:null,gates:[],categorias:cats});
const lista=(id,nombre,peso,notas)=>({id,nombre,peso,directNota:false,notas});

console.log('\n=== Listas guardadas se ven como uno de los dos tipos ===');
const guardado=ramo([lista('s1','Solemne 1',20,[nota('n1',5.1)]),lista('s2','Solemne 2',20,[]),
  lista('ct','Controles',30,[nota('a',6),nota('b',4)]),{id:'ex',nombre:'Examen',peso:30,directNota:true,notas:[]}]);
ctx.__antes=JSON.stringify(guardado);
const html=cargar(guardado);
const avg=run('ramoAvg(S.ramos[0])');
chk('Solemne 1 (lista de una nota) es una fila con su nota',/setDirectNota\('s1'/.test(html)&&!/agregarNotaLista\('s1'\)/.test(html));
chk('Solemne 2 (lista vacía) es una fila con "+ Nota"',/data-cat-id="s2"[^>]*>\+ Nota</.test(html)&&!/agregarNotaLista\('s2'\)/.test(html));
chk('la lista con dos notas sigue como grupo',/agregarNotaLista\('ct'\)/.test(html));
chk('el dato guardado no cambia',run(`S.ramos[0].categorias.filter(c=>c.directNota===false).map(c=>c.id).join()`)==='s1,s2,ct');
run(`setDirectNota('s1','6,0')`);
chk('escribir en la fila edita esa nota, no agrega otra',run(`S.ramos[0].categorias[0].notas.length`)===1&&run(`S.ramos[0].categorias[0].notas[0].valor`)===6);
run(`setDirectNota('s1','5,1')`);
chk('el promedio es el mismo que con la lista',cerca(run('ramoAvg(S.ramos[0])'),avg)&&cerca(avg,run(`ramoAvg(normalize({tenant:'fen',onboardingDone:true,ramos:[JSON.parse(__antes)]}).ramos[0])`)));
chk('el simulador la da por llena',run(`simCatLlena(S.ramos[0].categorias[0])`)===true&&run(`simCatLlena(S.ramos[0].categorias[1])`)===false);
run(`openEditCatModal('s1')`);
chk('su hoja no la marca como varias notas',!/id="m-cat-varias" checked/.test(byId('modal-content').innerHTML));

console.log('\n=== La lista que el programa declara sin cantidad sigue como grupo ===');
run(`PRESETS_FEN['Ramo con tareas']=[['Tareas',40,{lista:true}],['Examen',60]]`);
const programa=cargar({...ramo([lista('t','Tareas',40,[]),{id:'e',nombre:'Examen',peso:60,directNota:true,notas:[]}]),nombre:'Ramo con tareas',origen:{tenant:'fen'}});
chk('Tareas del programa ofrece "+ Agregar nota"',/agregarNotaLista\('t'\)/.test(programa));
chk('y puede quedar sin cantidad',run(`listaAbiertaPermitida(S.ramos[0],S.ramos[0].categorias[0])`)===true);

console.log('\n=== "Varias notas" pide cuántas son ===');
cargar(ramo([]));
const nueva=(cantidad)=>{run(`openAddCatModal()`);byId('m-cat-name').value='Tareas';byId('m-cat-peso-num').value='20';
  byId('m-cat-varias').checked=true;byId('m-cat-cantidad').value=cantidad;return run('confirmAddCat()');};
chk('sin cantidad no se guarda',nueva('')===false&&run('S.ramos[0].categorias.length')===0);
nueva('3');
chk('con cantidad queda un grupo de 3 casillas',run(`(c=>c.directNota===true&&c.slots===3)(S.ramos[0].categorias[0])`));
byId('m-cat-varias').checked=false;byId('m-cat-cantidad').value='';

console.log(`\nPASS: ${ok}   FAIL: ${fail}`);
process.exit(fail?1:0);
