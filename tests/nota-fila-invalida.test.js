// Corregir una nota en su fila de la ficha con un texto que no es nota ("75",
// "8", "5 5", "R") la borraba sin aviso: la casilla sin fecha se eliminaba y la
// con fecha o de lista quedaba pendiente, y eso se guardaba y subía. Ahora lo
// guardado no se toca y se avisa qué formato vale. Vaciar a propósito sigue
// dejándola pendiente, salvo al salir de la app con el campo vacío.
// Datos sintéticos.
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
  document:{getElementById:byId,createElement:el,addEventListener(){},documentElement:el(),querySelector(){return el();},querySelectorAll(){return [];},body:el(),activeElement:null},
  localStorage:{getItem(){return null;},setItem(){},removeItem(){}},navigator:{},location:{origin:'',pathname:'/',hash:''},history:{replaceState(){}},getComputedStyle:()=>({getPropertyValue:()=>''}),requestAnimationFrame:()=>0,setTimeout,clearTimeout,console};
vm.createContext(ctx);vm.runInContext(src,ctx);
let ok=0,fail=0;const chk=(n,c)=>{console.log(`  ${c?'OK  ':'FAIL'} ${n}`);if(c)ok++;else fail++;};
const run=c=>vm.runInContext(c,ctx);
// Se cuentan los guardados: un texto inválido no debe guardar ni subir nada.
run(`var __guardados=0;const __save=save;save=function(){__guardados++;return __save.apply(this,arguments);};`);
const cargar=ramo=>{ctx.__r=JSON.stringify(ramo);
  run(`S=normalize({tenant:'fen',onboardingDone:true,ramos:[JSON.parse(__r)]});currentRamoId=S.ramos[0].id;renderRamo();__guardados=0;`);
  byId('toast').textContent='';};
const cat=()=>run('S.ramos[0].categorias[0]');
const notaDe=f=>cat().notas.find(f);
const ramo=categoria=>({id:'r1',nombre:'Ramo sintético',color:'#6d5dd3',creditos:6,origen:null,gates:[],categorias:[categoria]});
const grupo=notas=>ramo({id:'c1',nombre:'Controles',peso:100,slots:3,directNota:true,notas});
const lista=notas=>ramo({id:'c1',nombre:'Tareas',peso:100,directNota:false,notas});
const INVALIDOS=['75','8','5 5','R'];

console.log('\n=== Casilla sin fecha: un texto inválido no la borra ===');
for(const t of INVALIDOS){
  cargar(grupo([{id:'a',nombre:'Control 1',valor:6,peso:1,slot:0},{id:'b',nombre:'Control 2',valor:5.5,peso:1,slot:1}]));
  run(`setSlotNota('c1',1,${JSON.stringify(t)})`);
  const n=notaDe(x=>x.slot===1);
  chk(`"${t}" deja el 5,5 del Control 2`,n&&n.valor===5.5&&n.id==='b');
  chk(`"${t}" no guarda ni sube nada`,run('__guardados')===0);
  chk(`"${t}" avisa qué formato vale`,/No se cambió la nota.*Ej: 5,5/.test(byId('toast').textContent));
}

console.log('\n=== Casilla con fecha: un texto inválido no la deja pendiente ===');
for(const t of INVALIDOS){
  cargar(grupo([{id:'b',nombre:'Control 2',valor:5.5,peso:1,slot:1,fecha:'2026-10-18',fechaOrigen:'usuario'}]));
  run(`setSlotNota('c1',1,${JSON.stringify(t)})`);
  const n=notaDe(x=>x.slot===1);
  chk(`"${t}" deja el 5,5 y la fecha`,n&&n.valor===5.5&&n.fecha==='2026-10-18');
}

console.log('\n=== Lista abierta: un texto inválido no la deja pendiente ===');
for(const t of INVALIDOS){
  cargar(lista([{id:'t1',nombre:'Tarea 1',valor:5.5,peso:1}]));
  run(`setSlotNota('c1','t1',${JSON.stringify(t)})`);
  const n=notaDe(x=>x.id==='t1');
  chk(`"${t}" deja el 5,5 de la Tarea 1`,n&&n.valor===5.5);
}

console.log('\n=== Nota sola: un texto inválido no la toca y ahora avisa ===');
cargar(ramo({id:'c1',nombre:'Examen',peso:100,directNota:true,notas:[{id:'e',nombre:'Examen',valor:5.5,peso:1}]}));
run(`setDirectNota('c1','R')`);
chk('"R" deja el 5,5 del Examen',cat().notas.length===1&&cat().notas[0].valor===5.5);
chk('y avisa sin guardar',run('__guardados')===0&&/Ej: 5,5/.test(byId('toast').textContent));

console.log('\n=== Con puntaje total, la fila corrige la nota: los puntos no la borran ===');
const conPuntos={id:'p',nombre:'Prueba',valor:4.6,peso:1,slot:0,puntos:{obtenido:38,total:60,exigencia:60}};
cargar(ramo({id:'c1',nombre:'Pruebas',peso:100,slots:2,directNota:true,puntajeTotal:60,notas:[conPuntos]}));
run(`setSlotNota('c1',0,'85')`);
const p=notaDe(x=>x.slot===0);
chk('"85" deja el 4,6 y sus puntos',p&&p.valor===4.6&&p.puntos&&p.puntos.obtenido===38);

console.log('\n=== Vaciar a propósito sigue como antes ===');
cargar(grupo([{id:'b',nombre:'Control 2',valor:5.5,peso:1,slot:1}]));
run(`setSlotNota('c1',1,'')`);
chk('sin fecha: la casilla se quita',!notaDe(x=>x.slot===1)&&run('__guardados')===1);
cargar(grupo([{id:'b',nombre:'Control 2',valor:5.5,peso:1,slot:1,fecha:'2026-10-18'}]));
run(`setSlotNota('c1',1,'')`);
chk('con fecha: queda pendiente',notaDe(x=>x.slot===1)?.valor===null);
cargar(lista([{id:'t1',nombre:'Tarea 1',valor:5.5,peso:1}]));
run(`setSlotNota('c1','t1','')`);
chk('en lista: queda pendiente',notaDe(x=>x.id==='t1')?.valor===null);

console.log('\n=== Una nota válida se guarda ===');
cargar(grupo([{id:'b',nombre:'Control 2',valor:5.5,peso:1,slot:1}]));
run(`setSlotNota('c1',1,'6,2')`);
chk('"6,2" queda como 6,2',notaDe(x=>x.slot===1)?.valor===6.2&&run('__guardados')===1);

console.log('\n=== Salir de la app con el campo vacío no confirma el borrado ===');
// El campo de la fila guarda con onchange al soltarlo, como en la ficha.
const campoFila=(valor,alSoltar)=>{
  const c={value:valor,defaultValue:'5,5',classList:{contains:x=>x==='eval-row-input'},
    blur(){if(ctx.document.activeElement!==c)return;ctx.document.activeElement=null;if(c.value!==c.defaultValue)alSoltar(c.value);}};
  ctx.document.activeElement=c;return c;};
cargar(grupo([{id:'b',nombre:'Control 2',valor:5.5,peso:1,slot:1}]));
campoFila('',v=>{ctx.__v=v;run(`setSlotNota('c1',1,__v)`);});
run('soltarNotaEnCurso()');
chk('el 5,5 sigue y no se guardó nada',notaDe(x=>x.slot===1)?.valor===5.5&&run('__guardados')===0);
cargar(ramo({id:'c1',nombre:'Examen',peso:100,directNota:true,notas:[{id:'e',nombre:'Examen',valor:5.5,peso:1,recorreccionPendiente:true}]}));
campoFila('',v=>{ctx.__v=v;run(`setDirectNota('c1',__v)`);});
run('soltarNotaEnCurso()');
chk('nota sola: sigue el 5,5 con su recorrección',cat().notas[0]?.valor===5.5&&cat().notas[0].recorreccionPendiente===true);
cargar(grupo([{id:'b',nombre:'Control 2',valor:5.5,peso:1,slot:1}]));
campoFila('6,2',v=>{ctx.__v=v;run(`setSlotNota('c1',1,__v)`);});
run('soltarNotaEnCurso()');
chk('con una nota escrita sí se guarda al salir',notaDe(x=>x.slot===1)?.valor===6.2);
cargar(grupo([{id:'b',nombre:'Control 2',valor:5.5,peso:1,slot:1}]));
campoFila('75',v=>{ctx.__v=v;run(`setSlotNota('c1',1,__v)`);});
run('soltarNotaEnCurso()');
chk('con un texto inválido al salir sigue el 5,5',notaDe(x=>x.slot===1)?.valor===5.5);
ctx.document.activeElement=null;

console.log(`\nPASS: ${ok}   FAIL: ${fail}`);
process.exit(fail?1:0);
