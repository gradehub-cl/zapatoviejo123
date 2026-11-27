// La participación de Gestión de Personas es una sola nota (Martín, 2026-11-03,
// con quienes tienen el ramo). Quien ya llenó las tres filas decide si acepta la
// pauta, y al aceptar conserva sus notas y su promedio.
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

console.log('\n=== Gestión de Personas: participación en una nota ===');
const preset=run(`presetRamo('Gestión de Personas','fen',null)`);
const nombres=preset.categorias.map(c=>c.nombre);
chk('la pauta nueva trae una sola Participación de 20%',nombres.filter(n=>/^Participación/.test(n)).length===1
  &&preset.categorias.find(c=>c.nombre==='Participación').peso===20);
chk('sigue sumando 100%',cerca(preset.categorias.reduce((s,c)=>s+c.peso,0),100));
const individual=preset.gates.find(g=>g.nombre==='Trabajo individual');
chk('la participación sigue en el requisito individual',individual.catIds.includes(preset.categorias.find(c=>c.nombre==='Participación').id));

// Una cuenta existente: la pauta de antes, con las tres filas llenas.
const filas=[['Casos y ensayos',40,6],['Trabajo en grupo: Propuesta',3,5],['Trabajo en grupo: Experiencia de aprendizaje',18,5.5],
  ['Trabajo en grupo: Informe Final',9,6],['Participación: Asistencia a ayudantías y reuniones',5,7],
  ['Participación: Contribuciones en clases',10,4],['Participación: Asistencia a clases',5,6.5],['Examen Integrativo',10,5]];
const antigua={id:'r1',nombre:'Gestión de Personas',color:'#6d5dd3',creditos:6,origen:{tenant:'fen',carrera:null},
  categorias:filas.map(([nombre,peso,valor],i)=>({id:'v'+i,nombre,peso,directNota:true,notas:[nota('n'+i,valor,{nombre})]})),
  gates:[{type:'group_min',catIds:['v0','v4','v5','v6','v7'],min:4,cap:'self',nombre:'Trabajo individual'},
    {type:'group_min',catIds:['v1','v2','v3'],min:4,cap:'self',nombre:'Trabajo de grupo'}]};
antigua.pautaHuella=filas.map(([n,p])=>`${n}:${p}`).join('|');
// Con las tres filas llenas la corrige normalize() al cargar (ver abajo). Con
// una sola llena se pregunta, y aceptar es decisión de la persona.
const unaLlena={...antigua,categorias:antigua.categorias.map((c,i)=>i===4||i===6?{...c,notas:[]}:c)};
cargar('fen',unaLlena);
const textos=run(`cambioDePauta(S.ramos[0]).cambios`).map(c=>c.nombre);
chk('a medias, al entrar nada cambia solo',run('S.ramos[0].categorias.length')===8);
chk('se le ofrece la pauta nueva',textos.includes('Participación'));
chk('el requisito no aparece como nuevo y retirado a la vez',!textos.some(t=>/Nuevo requisito|Deja de exigirse/.test(t)));
run(`actualizarPauta('r1');renderRamo();`);
const part=run(`S.ramos[0].categorias.find(c=>c.nombre==='Participación')`);
chk('al aceptar, su nota queda en Participación',part.notas.length===1&&part.notas[0].valor===4);
chk('sin evaluaciones sobrantes',!run('S.ramos[0].categorias.some(c=>c.fueraDePauta)'));
const llena=cargar('fen',antigua);
const partLlena=run(`S.ramos[0].categorias.find(c=>c.nombre==='Participación')`);
chk('con las tres llenas, las tres quedan en Participación y se ven',partLlena.notas.length===3&&partLlena.directNota===false&&/Contribuciones en clases/.test(llena.html));
const editada=cargar('fen',{...antigua,categorias:antigua.categorias.map((c,i)=>i?c:{...c,peso:35}).concat({id:'x',nombre:'Extra',peso:5,directNota:true,notas:[]})});
chk('a quien personalizó su pauta no se le ofrece nada',run('cambioDePauta(S.ramos[0])')===null&&editada.avg!==null);


console.log('\n=== Al cargar, la pauta vieja sin editar se corrige sola si el promedio no se mueve ===');
const conFilas=llenas=>({...antigua,categorias:antigua.categorias.map((c,i)=>({...c,
  notas:(i<4||i===7||llenas.includes(i))?c.notas:[]}))});
for(const [caso,llenas,sola] of [['sin notas de participación',[],true],['las tres llenas',[4,5,6],true],['una de tres',[5],false],['dos de tres',[4,6],false]]){
  const ramo=conFilas(llenas);
  const antes=cargar('fen',ramo).avg;
  const r=run(`normalize({tenant:'fen',onboardingDone:true,ramos:[JSON.parse(${JSON.stringify(JSON.stringify(ramo))})]}).ramos[0]`);
  ctx.__n=JSON.stringify(r);run('S.ramos=[JSON.parse(__n)]');
  const una=r.categorias.filter(c=>/^Participación/.test(c.nombre)).length===1;
  chk(`${caso}: ${sola?'pasa a una fila':'se le sigue preguntando'}`,una===sola&&(sola?!run('cambioDePauta(S.ramos[0])'):!!run('cambioDePauta(S.ramos[0])')));
  chk(`${caso}: el promedio no se mueve`,cerca(run('ramoAvg(S.ramos[0])'),antes));
  chk(`${caso}: no queda nada fuera de la pauta`,!r.categorias.some(c=>c.fueraDePauta));
}
const pegada=conFilas([4,5,6]);ctx.__p=JSON.stringify(pegada);
const a=run(`JSON.stringify(normalize({tenant:'fen',onboardingDone:true,ramos:[JSON.parse(__p)]}).ramos[0].categorias.map(c=>[c.id,c.nombre,c.notas.map(n=>n.id)]))`);
const b=run(`JSON.stringify(normalize({tenant:'fen',onboardingDone:true,ramos:[JSON.parse(__p)]}).ramos[0].categorias.map(c=>[c.id,c.nombre,c.notas.map(n=>n.id)]))`);
chk('teléfono y nube la corrigen con los mismos ids',a===b);
chk('el requisito individual sigue mirando la participación',run(`(()=>{const r=normalize({tenant:'fen',onboardingDone:true,ramos:[JSON.parse(__p)]}).ramos[0];const p=r.categorias.find(c=>c.nombre==='Participación');return r.gates.find(g=>g.nombre==='Trabajo individual').catIds.includes(p.id);})()`));
const editadaVieja={...pegada,categorias:pegada.categorias.map((c,i)=>i===7?{...c,peso:15}:i===0?{...c,peso:35}:c)};
ctx.__e=JSON.stringify(editadaVieja);
chk('una pauta vieja que la persona editó no se toca',run(`normalize({tenant:'fen',onboardingDone:true,ramos:[JSON.parse(__e)]}).ramos[0].categorias.length`)===8);

console.log(`\nPASS: ${ok}   FAIL: ${fail}`);
process.exit(fail?1:0);
