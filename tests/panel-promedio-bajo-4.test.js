// Cinco hipótesis del reporte, con pautas propias y sin datos de estudiantes.
const test=require('node:test');
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const nodo=()=>({style:{setProperty(){},removeProperty(){}},classList:{add(){},remove(){},contains(){return false},toggle(){}},addEventListener(){},appendChild(){},setAttribute(){},removeAttribute(){},getAttribute(){return null},querySelector(){return null},querySelectorAll(){return []},focus(){},remove(){},value:'',innerHTML:'',textContent:'',dataset:{}});
const ids=new Map(),get=id=>{if(!ids.has(id))ids.set(id,nodo());return ids.get(id);};
const ctx={console,setTimeout,clearTimeout,Intl,URL,window:{addEventListener(){},matchMedia:()=>({matches:false,addEventListener(){},addListener(){}})},document:{getElementById:get,createElement:nodo,addEventListener(){},documentElement:nodo(),body:nodo(),querySelector:()=>null,querySelectorAll:()=>[]},localStorage:{getItem(){return null},setItem(){throw Error('El panel no debe guardar notas')},removeItem(){}},navigator:{},location:{origin:'https://example.invalid',pathname:'/',hash:''}};
vm.createContext(ctx);
for(const f of ['data.js','engine.js','app.js','marketplace.js','render-main.js','render-agenda.js'])vm.runInContext(fs.readFileSync(__dirname+'/../'+f,'utf8'),ctx);
const run=s=>vm.runInContext(s,ctx);
run('var supabaseClient=null,currentUser=null;renderDocenteRamo=()=>{};');
const cat=(id,nombre,peso,valor,extra={})=>({id,nombre,peso,directNota:true,notas:valor==null?[]:[{id:'n-'+id,nombre,valor,peso:1}],...extra});
const ramo=(categorias,extra={})=>({id:'r-sintetico',nombre:'Ramo sintético',sigla:'TEST100',origen:null,creditos:10,gates:[],categorias,...extra});
function comparar(r,{tenant='uc',profesor='uc',otros=[],ramosProfesor=[]}={}){
  ctx.__estado={tenant,tipoCuenta:'estudiante',ramos:[r,...otros],historial:[],onboardingDone:true};
  run('S=normalize(JSON.parse(JSON.stringify(__estado)));currentRamoId=S.ramos[0].id;renderRamo();');
  const alumno=run('({raw:ramoAvg(S.ramos[0]),oficial:notaFinalOficial(ramoAvg(S.ramos[0])),texto:fmtPromedio(ramoAvg(S.ramos[0]))})');
  const motivo=get('ramo-min-chip').textContent;
  run("globalThis.al={id:'cuenta-sintetica',nombre_visible:'Estudiante de ejemplo',tenant:S.tenant,ramos:JSON.parse(JSON.stringify(S.ramos))};");
  ctx.__profesor={tenant:profesor,tipoCuenta:'profesor',ramos:ramosProfesor,historial:[]};
  run('S=normalize(JSON.parse(JSON.stringify(__profesor)));');
  const guardado=run('JSON.stringify(S)'),compartido=run('JSON.stringify(al)');
  const panel=run('conRamosAlumnoPanel(al,contexto=>{const r=ramoParaPanel(al.ramos[0]),raw=ramoAvg(r,undefined,contexto);return {raw,oficial:notaFinalOficial(raw),texto:fmtPromedio(raw)};})');
  assert.equal(panel.raw,alumno.raw,'promedio bruto idéntico');assert.equal(panel.oficial,alumno.oficial,'misma nota oficial');assert.equal(panel.texto,alumno.texto,'mismo redondeo mostrado');
  const resumen=run('resumenAlumnosPanel([al],()=>null).find(g=>g.sigla==="TEST100")');
  assert.equal(resumen.promedio,alumno.raw,'el resumen usa el mismo motor');
  const ficha=run('ramoAlumnoEditorialHTML(al,al.ramos[0],null,null,false,new Date(2026,10,3))');
  assert(ficha.includes('Promedio actual</span><strong>'+alumno.texto.replace('.',',')),'cifra de la ficha del profesor');
  const legado=run('alumnosPanelHTML([al],()=>null)');assert(legado.includes(alumno.texto+'<small>promedio</small>'),'cifra de categorías del profesor');
  assert.equal(run('JSON.stringify(S)'),guardado,'no cambia el tenant ni los ramos del profesor');assert.equal(run('JSON.stringify(al)'),compartido,'no cambia los datos compartidos');
  return {alumno,motivo,ficha,legado};
}

test('1. Compuertas legítimas: todas sobre 4 no implica cumplir un mínimo de 5',()=>{
const examen=ramo([cat('pr','Pruebas',70,6),cat('ex','Examen',30,4.5)],{gates:[{type:'min_grade_required',catId:'ex',min:5,cap:3.9}]});
const grupo=ramo([cat('i1','Prueba 1',30,4.2),cat('i2','Prueba 2',30,4.6),cat('ex','Examen',40,6)],{gates:[{type:'group_min',nombre:'Pruebas',catIds:['i1','i2'],min:5,cap:3.9}]});
for(const r of [examen,grupo]){
  assert(r.categorias.every(c=>c.notas.every(n=>n.valor>4)));
  const x=comparar(r);assert.equal(x.alumno.oficial,3.9);
  ctx.__motivo=x.motivo;
  const escapado=run('esc(__motivo)');assert(x.ficha.includes(escapado),'la ficha del profesor explica igual que la del alumno');assert(x.legado.includes(escapado),'el detalle de categorías también explica');
  assert(run('alumnosPanelHTML([al],()=>null,new Date(),{soloFilas:true})').includes(escapado),'el motivo está en la fila compacta');
  assert(run('resumenInicioAlumnosHTML(resumenInicioAlumnosPanel([al]))').includes(escapado),'el motivo está en Necesitan atención');
}

});
test('2. Universidad del alumno, incluida una regla institucional diferente',()=>{
const borde=ramo([cat('a','Prueba 1',50,3.892),cat('b','Prueba 2',50,4)]);
assert.equal(comparar(borde,{tenant:'uandes',profesor:'uc'}).alumno.oficial,4);
assert.equal(comparar(borde,{tenant:'uc',profesor:'uandes'}).alumno.oficial,3.9);
const institucional=ramo([cat('pr','Pruebas',70,6),cat('ex','Examen',30,2.9)]);
assert.equal(comparar(institucional,{tenant:'uc',profesor:'udd'}).alumno.oficial,5.1);
assert.equal(comparar(institucional,{tenant:'udd',profesor:'uc'}).alumno.oficial,2.9);
assert.equal(run("(()=>{S.tenant='uc';try{conRamosAlumnoPanel({...al,tenant:'uandes'},()=>{throw Error('prueba')})}catch{}return S.tenant})()"),'uc');

});
test('3. Contexto: laboratorio propio, filtro y ausencia de laboratorio compartido',()=>{
const catedra=ramo([cat('c','Pruebas',100,5)],{aporta:{ramo:'Laboratorio sintético',peso:30,min:4}});
const lab=v=>ramo([cat('l','Laboratorios',100,v)],{id:'lab-'+v,nombre:'Laboratorio sintético',sigla:'LAB100'});
assert.equal(comparar(catedra,{otros:[lab(6)],ramosProfesor:[lab(1)]}).alumno.raw,5.3);
const filtrada=run('filtrarAlumnosPanel([al],"TEST100")[0]');ctx.__filtrada=filtrada;
assert.equal(run('conRamosAlumnoPanel(__filtrada,c=>ramoAvg(ramoParaPanel(__filtrada.ramos[0]),undefined,c))'),5.3,'el filtro conserva todos los ramos compartidos');
// Sin un laboratorio en el estado recibido no se inventa uno ni se usa el del profesor.
assert.equal(comparar(catedra,{ramosProfesor:[lab(1)]}).alumno.raw,5);

});
test('4. Pendientes no son cero; pesos y casillas se conservan',()=>{
const pendientes=ramo([cat('p','Pruebas','60',null,{slots:3,notas:[{id:'hecha',nombre:'Prueba 1',valor:5.5,peso:1,slot:0},{id:'pendiente',nombre:'Prueba 2',valor:null,peso:1,slot:1}]}),cat('ex','Examen','40',null)]);
assert.equal(comparar(pendientes).alumno.raw,5.5);
const pesos=ramo([cat('p','Pruebas','75',4.2),cat('ex','Examen','25',6.2)]);
assert.equal(comparar(pesos).alumno.oficial,4.7);
const dentro=ramo([cat('p','Pruebas',100,null,{directNota:false,notas:[{id:'uno',nombre:'Prueba 1',valor:4.2,peso:'1'},{id:'dos',nombre:'Prueba 2',valor:6.2,peso:'3'}]})]);
assert.equal(comparar(dentro).alumno.oficial,5.7,'pesos de notas como texto tampoco se concatenan');
// Solver y promedio leen el mismo peso, también con un reemplazo de ponderación.
ctx.__peso={id:'n',weight:'75'};ctx.__ov={n:{weight:'25'}};
assert.equal(run('gh_weightOf(__peso,__ov)'),25);assert.equal(ctx.__peso.weight,'75');
ctx.__estructura={id:'final',type:'group',children:[{id:'a',type:'leaf',weight:'75'},{id:'b',type:'leaf',weight:'25'}]};
ctx.__notas={a:4};assert.equal(run('calculateFinalGrade(__estructura,{a:4,b:4}).raw'),4);
assert(Math.abs(run('solveForTarget(__estructura,__notas,4).requiredAverage')-3.8)<1e-5,'el solver respeta los pesos de texto y el borde oficial 3,95');


});
test('5. Borde de redondeo oficial y restauración del contexto',()=>{
for(const [valor,esperada] of [[3.949,3.9],[3.95,4],[4.049,4],[4.05,4.1]])assert.equal(comparar(ramo([cat('p','Nota',100,valor)]),{profesor:'uandes'}).alumno.oficial,esperada);
const sinTope=comparar(ramo([cat('a','Prueba 1',50,4.3),cat('b','Prueba 2',50,4.7)]));assert.equal(sinTope.alumno.oficial,4.5);assert(!sinTope.ficha.includes('repruebas pese al promedio'));
});
