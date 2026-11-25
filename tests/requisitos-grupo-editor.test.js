// Requisitos que combinan evaluaciones, escritos a mano en «Editar evaluaciones».
// El motor ya calculaba `group_min` para los programas del catálogo; acá se
// prueba que el editor de la app lo escriba bien y que nadie lo borre de pasada:
// mínimo sobre un grupo ((15·I1+20·I2+30·E)/65 ≥ 4,0) y aprobar por partes
// (si una parte queda bajo 4,0, la final es el promedio de esa parte).
// Ramos y notas sintéticos.
const fs=require('fs'),vm=require('vm');
const raiz=__dirname+'/../';
const src=['data.js','engine.js','app.js','render-main.js','render-agenda.js'].map(f=>fs.readFileSync(raiz+f,'utf8')).join('\n');
const stub={style:{setProperty(){},removeProperty(){}},addEventListener(){},appendChild(){},classList:{add(){},remove(){},contains(){return false;}},value:'',innerHTML:'',textContent:'',focus(){},select(){},setAttribute(){},removeAttribute(){},getAttribute(){return null},querySelector(){return stub},querySelectorAll(){return []},clientWidth:400,dataset:{},click(){}};
const ctx={window:{addEventListener(){},matchMedia:()=>({matches:true,addEventListener(){},addListener(){}})},document:{getElementById:()=>stub,createElement:()=>stub,addEventListener(){},documentElement:{style:{setProperty(){},removeProperty(){}},setAttribute(){},removeAttribute(){},getAttribute(){return null}},querySelector:()=>stub,querySelectorAll:()=>[],body:stub},localStorage:{getItem(){return null},setItem(){},removeItem(){}},navigator:{},location:{origin:'',pathname:'/',hash:''},setTimeout,clearTimeout,console};
vm.createContext(ctx);vm.runInContext(src,ctx);
const val=n=>vm.runInContext(n,ctx);
vm.runInContext('syncToCloud=function(){};track=function(){};renderRamo=function(){};showToast=function(){};',ctx);
const run=c=>vm.runInContext(c,ctx);
let ok=0,fail=0;const chk=(n,c)=>{console.log(`  ${c?'OK  ':'FAIL'} ${n}`);if(c)ok++;else fail++;};
const app=si=>{ctx.window.Capacitor=si?{isNativePlatform:()=>true}:undefined;};
const cerca=(a,b)=>typeof a==='number'&&Math.abs(a-b)<1e-6;

console.log('\n=== Mínimo sobre un grupo: (15·I1 + 20·I2 + 30·E)/65 ≥ 4,0 ===');
app(true);
run(`S={tenant:'uc',ramos:[{id:'r',nombre:'Programación Sintética',categorias:[
  {id:'i1',nombre:'I1',peso:15,directNota:true,notas:[]},{id:'i2',nombre:'I2',peso:20,directNota:true,notas:[]},
  {id:'ex',nombre:'Examen',peso:30,directNota:true,notas:[]},{id:'ta',nombre:'Tareas',peso:35,directNota:true,notas:[]}],gates:[]}]};currentRamoId='r';`);
val('openPautaManualModal')();
chk('en la app la sección parte vacía',Array.isArray(val('pautaRequisitosDraft'))&&val('pautaRequisitosDraft.length')===0);
run(`agregarRequisitoGrupo();const q=pautaRequisitosDraft[0];q.nombre='Pruebas';
  ['I1','I2','Examen'].forEach(n=>marcarEvalRequisito(0,claveFilaPauta(pautaDraft.find(f=>f.nombre===n)),true));`);
val('guardarPautaManual')();
const g=val("S.ramos[0].gates.find(g=>g.type==='group_min')");
chk('guarda un group_min del editor con I1, I2 y Examen',g&&g.origen==='editor'&&JSON.stringify(g.catIds)==='["i1","i2","ex"]'&&g.min===4&&g.cap===3.9&&!g.efecto&&g.nombre==='Pruebas');
run(`S.ramos[0].categorias.forEach(c=>{c.notas=[{id:'n'+c.id,nombre:c.nombre,peso:1,valor:{i1:3,i2:3.5,ex:4.5,ta:7}[c.id]}]});`);
// Promedio 4,95, pero (45+70+135)/65 = 3,85 → 3,8 < 4,0: tope 3,9.
chk('el promedio ponderado del grupo bajo 4,0 topa la final en 3,9',cerca(val('ramoAvg(S.ramos[0])'),3.9));
run(`S.ramos[0].categorias.find(c=>c.id==='ex').notas[0].valor=4.7;`);
// (45+70+141)/65 = 3,94 → 3,9: sigue bajo 4,0.
chk('3,94 todavía no cumple (redondea a 3,9)',cerca(val('ramoAvg(S.ramos[0])'),3.9));
run(`S.ramos[0].categorias.find(c=>c.id==='ex').notas[0].valor=4.8;`);
// (45+70+144)/65 = 3,985 → 4,0: cumple, rige el promedio (5,02).
chk('3,98 cumple y rige el promedio ponderado',cerca(val('ramoAvg(S.ramos[0])'),(45+70+144+245)/100));

console.log('\n=== Volver a abrir conserva lo guardado ===');
val('openPautaManualModal')();
chk('el borrador trae el requisito con sus evaluaciones',val('pautaRequisitosDraft.length')===1&&val("pautaRequisitosDraft[0].claves.join()")==='i1,i2,ex'&&val("pautaRequisitosDraft[0].min")==='4,0');
val('guardarPautaManual')();
chk('guardar sin cambios no duplica el requisito',val("S.ramos[0].gates.filter(g=>g.type==='group_min').length")===1);

console.log('\n=== La web no muestra la sección ni borra lo que hiciste en la app ===');
app(false);
val('openPautaManualModal')();
chk('en la web no hay borrador de requisitos',val('pautaRequisitosDraft')===null);
val('guardarPautaManual')();
chk('guardar en la web conserva el requisito de grupo',val("S.ramos[0].gates.filter(g=>g.type==='group_min'&&g.origen==='editor').length")===1);

console.log('\n=== Quitar una evaluación del grupo solo la saca de ese requisito ===');
app(true);
val('openPautaManualModal')();
run(`pautaDraft=pautaDraft.filter(f=>f.nombre!=='I1');`);
val('guardarPautaManual')();
chk('el requisito queda con I2 y Examen',val("JSON.stringify(S.ramos[0].gates.find(g=>g.type==='group_min').catIds)")==='["i2","ex"]');

console.log('\n=== Aprobar por partes: la final es el promedio de la parte reprobada ===');
run(`S={tenant:'uc',ramos:[{id:'q',nombre:'Química Sintética',categorias:[
  {id:'t1',nombre:'Interrogación 1',peso:30,directNota:true,notas:[{id:'a',nombre:'I1',peso:1,valor:6}]},
  {id:'t2',nombre:'Interrogación 2',peso:30,directNota:true,notas:[{id:'b',nombre:'I2',peso:1,valor:6}]},
  {id:'lab',nombre:'Laboratorio',peso:40,directNota:true,notas:[{id:'c',nombre:'Lab',peso:1,valor:3}]}],gates:[]}]};currentRamoId='q';`);
val('openPautaManualModal')();
run(`agregarRequisitoGrupo();agregarRequisitoGrupo();
  const [teo,pra]=pautaRequisitosDraft;teo.nombre='Parte teórica';pra.nombre='Parte práctica';teo.efecto=pra.efecto='reemplazar';
  ['Interrogación 1','Interrogación 2'].forEach(n=>marcarEvalRequisito(0,claveFilaPauta(pautaDraft.find(f=>f.nombre===n)),true));
  marcarEvalRequisito(1,claveFilaPauta(pautaDraft.find(f=>f.nombre==='Laboratorio')),true);`);
val('guardarPautaManual')();
chk('guarda dos requisitos con efecto reemplazar',val("S.ramos[0].gates.filter(g=>g.type==='group_min'&&g.cap==='self'&&g.efecto==='reemplazar').length")===2);
// Promedio 4,8, pero la práctica tiene 3,0: la final es 3,0.
chk('con la práctica en 3,0 la final es 3,0 (no 4,8)',cerca(val('ramoAvg(S.ramos[0])'),3));
run(`S.ramos[0].categorias.find(c=>c.id==='lab').notas[0].valor=4.5;`);
chk('con ambas partes sobre 4,0 rige el promedio',cerca(val('ramoAvg(S.ramos[0])'),0.3*6+0.3*6+0.4*4.5));

console.log('\n=== Errores y reglas del programa ===');
run(`S.ramos[0].gates.push({type:'group_min',catIds:['t1','t2'],min:4,cap:3.9,nombre:'Del programa'});`);
val('openPautaManualModal')();
chk('el borrador no trae el requisito del programa',val('pautaRequisitosDraft.length')===2);
run(`pautaRequisitosDraft.push({nombre:'Sin evaluaciones',claves:[],min:'4,0',efecto:'tope',tope:'3,9'});`);
const antes=val('JSON.stringify(S.ramos[0].gates)');
val('guardarPautaManual')();
chk('un requisito con nombre y sin evaluaciones no se guarda y avisa',val('JSON.stringify(S.ramos[0].gates)')===antes&&/evaluación/.test(val('pautaDraftError')));
run(`pautaRequisitosDraft.pop();pautaRequisitosDraft[0].min='8';`);
val('guardarPautaManual')();
chk('un mínimo fuera de la escala no se guarda',val('JSON.stringify(S.ramos[0].gates)')===antes&&/mínimo/.test(val('pautaDraftError')));
run(`pautaRequisitosDraft[0].min='4,0';pautaRequisitosDraft.splice(0,2);`);
val('guardarPautaManual')();
chk('quitar los requisitos propios conserva el del programa',val("S.ramos[0].gates.map(g=>g.nombre).join()")==='Del programa');

console.log('\n=== Borrar una evaluación desde la ficha ajusta el requisito ===');
run(`S.ramos[0].gates.push({type:'group_min',catIds:['t1','lab'],min:4,cap:'self',efecto:'reemplazar',nombre:'Mixto',origen:'editor'});
  const r=S.ramos[0];r.categorias=r.categorias.filter(c=>c.id!=='lab');r.gates=reglasEditorVigentes(r.gates,new Set(r.categorias.map(c=>c.id)));`);
chk('el requisito pierde solo la evaluación borrada',val("JSON.stringify(S.ramos[0].gates.find(g=>g.nombre==='Mixto').catIds)")==='["t1"]');
chk('el del programa sigue igual',val("JSON.stringify(S.ramos[0].gates.find(g=>g.nombre==='Del programa').catIds)")==='["t1","t2"]');

console.log(`\nPASS: ${ok}   FAIL: ${fail}`);process.exit(fail?1:0);
