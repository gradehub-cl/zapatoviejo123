// Home vacía #home-ramos antes de redibujarla. Una categoría heredada sin
// `notas` no puede convertir esa lista en una pantalla en blanco: el ramo debe
// seguir visible para que la persona sepa que sus datos no desaparecieron.
const fs=require('fs'),vm=require('vm');
const raiz=__dirname+'/../';
const src=['data.js','engine.js','app.js','app-session.js','render-main.js','render-agenda.js']
  .map(f=>fs.readFileSync(raiz+f,'utf8')).join('\n');

function classList(){const clases=new Set();return{add(...xs){xs.forEach(x=>clases.add(x));},remove(...xs){xs.forEach(x=>clases.delete(x));},contains(x){return clases.has(x);}};}
function el(){
  let html='';const attrs={};
  const nodo={style:{setProperty(){},removeProperty(){}},classList:classList(),children:[],textContent:'',value:'',dataset:{},
    addEventListener(){},appendChild(hijo){this.children.push(hijo);return hijo;},setAttribute(k,v){attrs[k]=String(v);},removeAttribute(k){delete attrs[k];},getAttribute(k){return attrs[k]||null;},
    querySelector(){return nodo;},querySelectorAll(){return [];},closest(){return nodo;},focus(){},select(){},click(){},remove(){},clientWidth:400};
  Object.defineProperty(nodo,'innerHTML',{get(){return html;},set(v){html=String(v);this.children=[];}});
  return nodo;
}
const ids={};const byId=id=>ids[id]||(ids[id]=el());
const ctx={
  window:{addEventListener(){},matchMedia:()=>({matches:true,addEventListener(){},addListener(){}})},
  document:{getElementById:byId,createElement:el,addEventListener(){},documentElement:el(),querySelector(){return el();},querySelectorAll(){return [];},body:el()},
  localStorage:{getItem(){return null;},setItem(){},removeItem(){}},navigator:{},location:{origin:'',pathname:'/',hash:''},history:{replaceState(){}},setTimeout,clearTimeout,console,
};
vm.createContext(ctx);vm.runInContext(src,ctx);
const val=n=>vm.runInContext(n,ctx);
let ok=0,fail=0;const chk=(n,c)=>{console.log(`  ${c?'OK  ':'FAIL'} ${n}`);if(c)ok++;else fail++;};

console.log('\n=== Home conserva la lista ante una categoría incompleta ===');
vm.runInContext(`
  S={...freshState(),tenant:'uc',userName:'Persona Sintética',careerSemestre:2,onboardingDone:true,ramos:[{
    id:'ramo-heredado',nombre:'Ramo heredado',color:'#6d5dd3',categorias:[
      {id:'cat-mal',nombre:'control',peso:100,directNota:true}
    ]
  }]};
`,ctx);

let error=null;try{val('renderHome')();}catch(e){error=e;}
const filas=byId('home-ramos').children;
chk('no cae después de vaciar la lista',error===null);
chk('el ramo sigue visible',filas.length===1&&filas[0].innerHTML.includes('Ramo heredado'));
chk('la evaluación incompleta se presenta sin notas',filas[0]?.innerHTML.includes('1 evaluación'));

// Un ramo cerrado con 4,8 dice «✓ Aprobado» en su ficha, pero Inicio lo contaba
// «en riesgo»: dos pantallas con respuestas distintas (auditoría #1376).
console.log('\n=== Los chips de Inicio no contradicen a la ficha ===');
const ramoSint=(id,notas)=>`{id:'${id}',nombre:'Ramo ${id}',color:'#6d5dd3',categorias:[${notas.map((v,i)=>`{id:'${id}-c${i}',nombre:'Prueba ${i+1}',peso:50,directNota:true,notas:[${v===null?'':`{id:'${id}-n${i}',nombre:'Prueba ${i+1}',valor:${v},peso:1}`}]}`).join(',')}]}`;
vm.runInContext(`
  S={...freshState(),tenant:'uc',userName:'Persona Sintética',careerSemestre:2,onboardingDone:true,ramos:[
    ${ramoSint('cerrado-borde',[4.8,4.8])},${ramoSint('cerrado-alto',[6.0,6.0])},
    ${ramoSint('abierto-borde',[4.5,null])},${ramoSint('cerrado-rojo',[3.0,3.0])}
  ]};
`,ctx);
error=null;try{val('renderHome')();}catch(e){error=e;}
const chips=byId('gpa-tags').innerHTML.replace(/<[^>]+>/g,'|');
chk('cerrado con 4,8 cuenta como aprobado, igual que el cerrado con 6,0',error===null&&/2 aprobados/.test(chips));
chk('«en riesgo» queda para el que todavía tiene algo pendiente',/\|1 en riesgo\|/.test(chips));
chk('el cerrado bajo 4,0 sigue «bajo 4,0»',/\|1 bajo 4,0\|/.test(chips));

console.log(`\nPASS: ${ok}   FAIL: ${fail}`);process.exit(fail?1:0);
