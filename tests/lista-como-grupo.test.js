// Una lista abierta —varias notas sin cantidad fija, `directNota:false`— se dibuja
// igual que el grupo de casillas (Martín, 2026-11-11). El dato guardado no cambia:
// este test parte de una cuenta que ya tenía notas con nombre, peso y fecha.
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


console.log('\n=== Una lista ya guardada se lee igual con el dibujo nuevo ===');
const lista=notas=>({id:'r1',nombre:'R',color:'#6d5dd3',creditos:6,origen:null,gates:[],categorias:[
  {id:'c1',nombre:'Tareas',peso:100,directNota:false,notas}]});
const guardada=[nota('a',6,{nombre:'Guía de límites',fecha:'2026-09-01'}),nota('b',4,{nombre:'Tarea 2',peso:60}),{id:'c',nombre:'Tarea 3',valor:null,peso:1,fecha:'2026-12-01'}];
const antes=cargar('fen',lista(guardada));
const pesado=(6*1+4*60)/61;
chk('el promedio ponderado no cambia',cerca(antes.avg,pesado));
chk('cada nota sale en su fila con su nombre',(antes.html.match(/<div class="eval-sub/g)||[]).length===3&&/Guía de límites/.test(antes.html)&&/Tarea 2/.test(antes.html));
chk('la ponderación propia se sigue viendo',/60%/.test(antes.html));
chk('la pendiente ofrece anotar la nota en la fila',/data-nota-id="c"[^>]*>\+ Nota</.test(antes.html));
chk('ya no es la tarjeta antigua',!/cat-card|nota-row|add-nota-btn/.test(antes.html)&&/\+ Agregar nota</.test(antes.html));
chk('la última tiene fecha: no se ofrece quitarla',!/Quitar la última/.test(antes.html));
chk('las notas guardadas siguen sin casilla',run('S.ramos[0].categorias[0].notas.every(n=>!Number.isInteger(n.slot))'));

console.log('\n=== Escribir en la fila edita esa nota, no otra ===');
run(`setSlotNota('c1','b','5')`);
const b=()=>run(`JSON.stringify(S.ramos[0].categorias[0].notas.find(n=>n.id==='b'))`);
chk('cambia el número y conserva nombre y peso',JSON.parse(b()).valor===5&&JSON.parse(b()).nombre==='Tarea 2'&&JSON.parse(b()).peso===60);
run(`setSlotNota('c1','b','')`);
chk('vaciarla la deja pendiente, no la borra',JSON.parse(b()).valor===null&&run('S.ramos[0].categorias[0].notas.length')===3);
run(`setSlotNota('c1','no-existe','7')`);
chk('un id desconocido no crea nada',run('S.ramos[0].categorias[0].notas.length')===3);
run(`setSlotNota('c1','b','4')`);
chk('y vuelve al promedio de antes',cerca(run('ramoAvg(S.ramos[0])'),pesado));

console.log('\n=== "+ Agregar nota" suma una fila pendiente ===');
run(`agregarNotaLista('c1')`);
const nueva=()=>JSON.parse(run('JSON.stringify(S.ramos[0].categorias[0].notas[3])'));
chk('se llama como la evaluación en singular, con el número que sigue',nueva().nombre==='Tarea 4'&&nueva().valor===null&&nueva().peso===1);
chk('no mueve el promedio',cerca(run('ramoAvg(S.ramos[0])'),pesado));
chk('vacía y sin fecha, se puede quitar',/Quitar la última/.test(juntar(byId('cat-list'))));
run(`deleteNota('c1',S.ramos[0].categorias[0].notas[3].id);deleteNota('c1','a');agregarNotaLista('c1');`);
chk('no repite un nombre que ya existe',run(`S.ramos[0].categorias[0].notas.map(n=>n.nombre).join('|')`)==='Tarea 2|Tarea 3|Tarea 4');

console.log('\n=== Una lista vacía muestra cómo partir ===');
const vacia=cargar('fen',lista([]));
chk('abierta y con el botón a la vista',/class="eval-group-body open"/.test(vacia.html)&&/\+ Agregar nota</.test(vacia.html));

console.log(`\nPASS: ${ok}   FAIL: ${fail}`);
process.exit(fail?1:0);
