// La fila de Controles de Dinámica muestra el promedio con las 5 décimas de
// talleres y dice que las incluye. Mientras falte un control, el promedio es el
// de las notas, sin aviso. Datos sintéticos y pauta buscada por nombre.
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
  localStorage:{getItem(){return null;},setItem(){},removeItem(){}},navigator:{},location:{origin:'',pathname:'/',hash:''},history:{replaceState(){}},setTimeout,clearTimeout,console};
vm.createContext(ctx);vm.runInContext(src,ctx);
let ok=0,fail=0;const chk=(n,c)=>{console.log(`  ${c?'OK  ':'FAIL'} ${n}`);if(c)ok++;else fail++;};
const juntar=n=>(n.innerHTML||'')+(n.children||[]).map(juntar).join('');
const pintar=(controles,faltas)=>{ctx.__c=controles;ctx.__f=faltas;
  vm.runInContext(`S=normalize({tenant:'uc',onboardingDone:true,ramos:[]});
    var p=presetRamo('Dinámica','uc','ING-PC',new Date('2026-10-15T12:00:00-03:00'));
    var cats=JSON.parse(JSON.stringify(p.categorias));
    var ctl=cats.find(c=>c.nombre==='Controles');
    ctl.notas=__c.map((v,i)=>({id:'k'+i,nombre:'Control '+(i+1),slot:i,valor:v,peso:1}));
    S.ramos.push({id:'r1',nombre:'Dinámica',color:'#6d5dd3',creditos:10,origen:null,gates:p.gates||[],aporta:p.aporta,categorias:cats,bonus:p.bonus,bonusIngresado:__f==null?null:{talleres:__f}});
    currentRamoId='r1';renderRamo();`,ctx);
  return juntar(byId('cat-list'));};
const fila=html=>{const i=html.indexOf('>Controles<');return html.slice(i,i+900);};

console.log('\n=== Controles con las décimas ===');
let h=fila(pintar([4,4,4],2));
chk('con los 3 controles (4,0) y 2 faltas, la fila muestra 4,5',/>4,5</.test(h));
chk('y dice que incluye 5 décimas',/Incluye 5 décimas de bonificación/.test(h));
h=fila(pintar([6.8,6.8,6.8],0));
chk('6,8 llega al tope: 7,0, con 2 décimas y el tope dicho',/>7,0</.test(h)&&/Incluye 2 décimas de bonificación, con tope de 7,0/.test(h));
h=fila(pintar([4,4],1));
chk('con 2 de 3 controles: 4,0 y sin aviso',/>4,0</.test(h)&&!/Incluye/.test(h));
h=fila(pintar([4,4,4],3));
chk('con 3 faltas: 4,0 y sin aviso',/>4,0</.test(h)&&!/Incluye/.test(h));
h=fila(pintar([4,4,4],null));
chk('sin anotar faltas: 4,0 y sin aviso',/>4,0</.test(h)&&!/Incluye/.test(h));

console.log(`\nPASS: ${ok}   FAIL: ${fail}`);
process.exit(fail?1:0);
