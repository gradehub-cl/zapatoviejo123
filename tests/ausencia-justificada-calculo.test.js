// Una evaluación marcada como justificada tiene que pesar igual en el promedio,
// en la nota necesaria y en el cierre del ramo. Pautas propias y datos
// sintéticos; las categorías se buscan por nombre, nunca por índice.
const fs=require('fs'),vm=require('vm'),path=require('path');
const root=path.join(__dirname,'..');
const files=['data.js','engine.js','app.js','app-session.js','render-main.js','render-agenda.js'];
const source=files.map(f=>fs.readFileSync(path.join(root,f),'utf8')).join('\n');
function node(){
  let html='';
  const el={style:{setProperty(){},removeProperty(){}},classList:{add(){},remove(){},contains(){return false;}},children:[],value:'',textContent:'',dataset:{},
    addEventListener(){},appendChild(child){this.children.push(child);return child;},setAttribute(){},removeAttribute(){},getAttribute(){return null;},
    querySelector(){return el;},querySelectorAll(){return [];},focus(){},select(){},click(){},remove(){},clientWidth:390};
  Object.defineProperty(el,'innerHTML',{get(){return html;},set(value){html=String(value);el.children=[];}});
  return el;
}
const elements={};const byId=id=>elements[id]||(elements[id]=node());
const ctx={window:{addEventListener(){},matchMedia:()=>({matches:true,addEventListener(){},addListener(){}})},
  document:{getElementById:byId,createElement:node,addEventListener(){},documentElement:node(),querySelector(){return node();},querySelectorAll(){return [];},body:node()},
  localStorage:{getItem(){return null;},setItem(){},removeItem(){}},navigator:{},location:{origin:'',pathname:'/',hash:''},history:{replaceState(){}},setTimeout,clearTimeout,console};
vm.createContext(ctx);vm.runInContext(source,ctx);
const run=code=>vm.runInContext(code,ctx);
let ok=0,fail=0;
const check=(name,condition,detalle)=>{console.log(`  ${condition?'OK  ':'FAIL'} ${name}${condition||detalle===undefined?'':' → '+JSON.stringify(detalle)}`);condition?ok++:fail++;};
const cerca=(a,b)=>typeof a==='number'&&Math.abs(a-b)<0.01;

// Pauta propia: Control, Examen y Trabajo. Las notas se ponen por nombre.
function ramo({tenant='uc',notas={},pesos={},ausencia=null,oficial=null}){
  const def=[['Control',20],['Examen',50],['Trabajo',30]];
  const categorias=def.map(([nombre,peso],i)=>{
    const id=`cat-${nombre.toLowerCase()}`,valor=notas[nombre];
    return {id,nombre,peso:pesos[nombre]??peso,directNota:true,notas:valor==null?[]:[{id:`${id}-nota`,nombre,valor,peso:1}]};
  });
  const id=n=>categorias.find(c=>c.nombre===n).id;
  const r={id:'r-sintetico',nombre:'Curso sintético',color:'#555555',gates:[],categorias};
  if(ausencia){
    const entrada=ausencia.tipo==='rezago'?{desdeId:id(ausencia.desde)}:{desdeId:id(ausencia.desde),haciaId:id(ausencia.hacia)};
    const regla={rezagos:[],reemplazos:[],traspasos:[],[ausencia.tipo+'s']:[entrada]};
    if(oficial)r.reglasAusenciaJustificada=regla;
    else r.reglasAusenciaJustificadaUsuario={declaradaPor:'estudiante',...regla};
    r.ausenciasJustificadas=[id(ausencia.desde)];
  }
  ctx.fixture=r;
  run(`S={...freshState(),tenant:${JSON.stringify(tenant)},ramos:[fixture]};`);
  return r;
}
const avg=()=>run('ramoAvg(S.ramos[0])');
const necesaria=()=>run('notaNecesaria(S.ramos[0],4)');
const cerrado=()=>run('ramoCompletamenteEvaluado(S.ramos[0])');
const traspaso={tipo:'traspaso',desde:'Control',hacia:'Examen'};

// ─── Nota necesaria ──────────────────────────────────────────────────────────
// La UDD tiene examen mínimo de reglamento (efecto «reemplazar»), así que la
// nota necesaria se calcula proyectando notas en lo pendiente. Esa proyección
// le ponía nota al Control justificado y la justificación dejaba de aplicar.

// Traspaso con tope de 75%: Control 40% → Examen 50% queda en 75% y el 15%
// excedente cuenta con 1,0. Trabajo 10% con 6,0.
// 0,10·6 + 0,15·1 + 0,75·x ≥ 3,95  →  x = 4,27 (sin justificar serían 3,72).
ramo({tenant:'uc',pesos:{Control:40,Examen:50,Trabajo:10},notas:{Trabajo:6},ausencia:traspaso});
const referencia=necesaria();
check('UC: con tope, la nota necesaria cuenta el traspaso y el excedente con 1,0',cerca(referencia,4.2667),referencia);
ramo({tenant:'udd',pesos:{Control:40,Examen:50,Trabajo:10},notas:{Trabajo:6},ausencia:traspaso});
check('UDD: la misma pauta pide lo mismo que la UC (4,27, no 3,72)',cerca(necesaria(),4.2667),necesaria());
check('UDD: el promedio actual también cuenta el excedente con 1,0',cerca(avg(),3),avg());

// Traspaso sin tope: Control 20% → Examen, que pasa a 70% con 6,0. Trabajo 30%
// pendiente. 0,70·6 = 4,2 ya aprueba: basta el mínimo de la escala.
// Sin justificar pedía 1,9 en el Trabajo.
ramo({tenant:'udd',notas:{Examen:6},ausencia:traspaso});
check('UDD: con el Examen ya rendido, el traspaso deja la nota necesaria en el mínimo',cerca(necesaria(),1),necesaria());
ramo({tenant:'udd',notas:{Examen:6}});
check('UDD: sin justificar, sigue pidiendo 1,9 en Control y Trabajo',cerca(necesaria(),1.9),necesaria());

// Reemplazo del programa: el Control justificado vale la nota del Examen (3,5).
// 0,20·3,5 + 0,50·3,5 + 0,30·x ≥ 3,95  →  x = 5,0 (sin justificar serían 4,4).
ramo({tenant:'udd',notas:{Examen:3.5},ausencia:{tipo:'reemplazo',desde:'Control',hacia:'Examen'},oficial:true});
check('UDD: con reemplazo del programa, el Trabajo necesita 5,0',cerca(necesaria(),5),necesaria());
ramo({tenant:'uc',notas:{Examen:3.5},ausencia:{tipo:'reemplazo',desde:'Control',hacia:'Examen'},oficial:true});
check('UC: el mismo reemplazo pide lo mismo por el otro camino',cerca(necesaria(),5),necesaria());

// Rezago: el Control se rinde después, así que sigue pendiente y se proyecta.
// 0,50·5 + 0,30·5 = 4,0 ya aprueba.
ramo({tenant:'udd',notas:{Examen:5,Trabajo:5},ausencia:{tipo:'rezago',desde:'Control'}});
check('UDD: un rezago sigue siendo una evaluación por rendir',cerca(necesaria(),1),necesaria());

// ─── Cierre del ramo ─────────────────────────────────────────────────────────
// La ficha, Inicio, el Wrapped y calificar profesor preguntan si el ramo está
// cerrado sin pasar el cálculo. El Control justificado no se rinde, así que
// con Examen y Trabajo el ramo está cerrado.
ramo({notas:{Examen:3,Trabajo:5},ausencia:traspaso});
check('promedio con traspaso: 0,7·3 + 0,3·5 = 3,6',cerca(avg(),3.6),avg());
check('traspaso aplicado + notas del resto: el ramo queda cerrado',cerrado()===true);
check('lo mismo al pasar el cálculo, como el recordatorio',run('ramoCompletamenteEvaluado(S.ramos[0],calculoRamoConCompuertas(S.ramos[0]))')===true);
ramo({notas:{Examen:3,Trabajo:5}});
check('sin justificar, el Control pendiente mantiene el ramo abierto',cerrado()===false);
ramo({notas:{Examen:3,Trabajo:5},ausencia:{tipo:'rezago',desde:'Control'}});
check('con rezago, el ramo sigue abierto hasta tener esa nota',cerrado()===false);
ramo({notas:{Control:6,Examen:3,Trabajo:5},ausencia:traspaso});
check('declaración con nota no se aplica: el ramo cierra por sus notas',cerrado()===true&&cerca(avg(),0.2*6+0.5*3+0.3*5),avg());
ramo({notas:{Examen:3},ausencia:traspaso});
check('traspaso aplicado pero Trabajo sin nota: sigue abierto',cerrado()===false);

// Casilla reemplazada por el examen (como las pautas UAI): Controles 3×10%,
// el segundo justificado; Examen 70% con 5,0. Con los otros dos controles el
// ramo está cerrado y el segundo vale 5,0.
function ramoCasillas(notasControles){
  const r={id:'r-casillas',nombre:'Curso sintético con casillas',color:'#555555',gates:[],categorias:[
    {id:'cat-controles',nombre:'Controles',peso:30,slots:3,directNota:false,notas:notasControles.map(([slot,valor])=>({id:`ctl-${slot}`,nombre:`Control ${slot+1}`,valor,peso:1,slot}))},
    {id:'cat-examen',nombre:'Examen',peso:70,directNota:true,notas:[{id:'ex-nota',nombre:'Examen',valor:5,peso:1}]}]};
  r.reglasAusenciaJustificada={reemplazosCasilla:[{desdeId:'cat-controles',desdeSlot:1,haciaId:'cat-examen'}]};
  r.ausenciasJustificadas=['__gh_ausencia_cat-controles_1'];
  ctx.fixture=r;run('S={...freshState(),tenant:"uc",ramos:[fixture]};');
}
ramoCasillas([[0,4],[2,6]]);
check('casilla reemplazada: (4+5+6)/3·0,3 + 5·0,7 = 5,0',cerca(avg(),5),avg());
check('casilla reemplazada + las otras dos con nota: el ramo queda cerrado',cerrado()===true);
ramoCasillas([[0,4]]);
check('casilla reemplazada pero falta otra: sigue abierto',cerrado()===false);

console.log(`\n${ok} OK, ${fail} FAIL`);
if(fail)process.exit(1);
