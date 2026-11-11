// Microeconomía sí dice qué ocurre con una ausencia justificada. No se modela
// por nombre de ramo: el preset declara reemplazos y traspasos separados, y el
// motor recibe ids de categorías ya resueltos.
const fs=require('fs'),vm=require('vm');
const raiz=__dirname+'/../';
const src=['data.js','engine.js','app.js','render-main.js','render-agenda.js'].map(f=>fs.readFileSync(raiz+f,'utf8')).join('\n');
const renderMain=fs.readFileSync(raiz+'render-main.js','utf8');
const stub={style:{setProperty(){},removeProperty(){}},addEventListener(){},appendChild(){},classList:{add(){},remove(){},contains(){return false;}},value:'',innerHTML:'',textContent:'',focus(){},select(){},setAttribute(){},removeAttribute(){},getAttribute(){return null;},querySelector(){return stub;},querySelectorAll(){return [];},clientWidth:400,dataset:{},click(){}};
const ctx={window:{addEventListener(){},matchMedia:()=>({matches:true,addEventListener(){},addListener(){}})},document:{getElementById:()=>stub,createElement:()=>stub,addEventListener(){},documentElement:{style:{setProperty(){},removeProperty(){}},setAttribute(){},removeAttribute(){},getAttribute(){return null;}},querySelector:()=>stub,querySelectorAll:()=>[],body:stub},localStorage:{getItem(){return null},setItem(){},removeItem(){}},navigator:{},location:{origin:'',pathname:'/',search:'',hash:''},history:{replaceState(){}},setTimeout,clearTimeout,console};
vm.createContext(ctx);vm.runInContext(src,ctx);
const val=n=>vm.runInContext(n,ctx);
let ok=0,fail=0;const chk=(n,c)=>{console.log(`  ${c?'OK  ':'FAIL'} ${n}`);if(c)ok++;else fail++;};
const eq=(n,a,b)=>chk(`${n} (${a})`,typeof a==='number'&&Math.abs(a-b)<.005);
const presetRamo=val('presetRamo'),ramoAvg=val('ramoAvg');
const normalize=val('normalize');
let estadoAusencias=null;try{estadoAusencias=val('estadoAusenciasJustificadas');}catch(e){}
let estadoParaNotaNecesaria=null;try{estadoParaNotaNecesaria=val('estadoParaNotaNecesaria');}catch(e){}
let configurarAusenciaEstudiante=null;try{configurarAusenciaEstudiante=val('configurarAusenciaJustificadaEstudiante');}catch(e){}

function micro(valores={}){
  const r=presetRamo('Introducción a la Microeconomía','fen',null);
  r.nombre='Introducción a la Microeconomía';r.origen={tenant:'fen'};
  r.categorias.forEach(c=>{
    const v=valores[c.nombre];
    const cantidad=Number.isInteger(c.slots)&&c.slots>1?c.slots:1;
    c.notas=v==null?[]:Array.from({length:cantidad},(_,i)=>({id:`${c.id}-${i}`,nombre:`${c.nombre} ${i+1}`,valor:v,peso:1,...(c.slots?{slot:i}:{})}));
  });
  return r;
}
function id(r,n){return r.categorias.find(c=>c.nombre===n).id;}
function ramoConAusencias(){
  return {
    id:'ramo-ausencias',nombre:'Curso con formulario propio',categorias:[
      {id:'i1',nombre:'Interrogación 1',peso:20,notas:[]},
      {id:'i2',nombre:'Interrogación 2',peso:20,notas:[]},
      {id:'i3',nombre:'Interrogación 3',peso:20,notas:[]},
      {id:'ex',nombre:'Examen',peso:30,notas:[{id:'n-ex',nombre:'Examen',valor:7,peso:1}]},
      {id:'ta',nombre:'Tareas',peso:10,notas:[{id:'n-ta',nombre:'Tareas',valor:7,peso:1}]},
    ],gates:[],ausenciasJustificadas:[],
  };
}

console.log('\n=== Regla declarativa, no condicional por ramo ===');
const def=val('PRESETS_FEN')['Introducción a la Microeconomía'];
const p=micro();
chk('el preset separa reemplazos de traspasos',
  Array.isArray(def.ausenciasJustificadas?.reemplazos)&&def.ausenciasJustificadas.reemplazos.length===4&&
  Array.isArray(def.ausenciasJustificadas?.traspasos)&&def.ausenciasJustificadas.traspasos.length===1);
chk('presetRamo resuelve las reglas a ids de esta pauta',
  p.reglasAusenciaJustificada?.reemplazos?.some(x=>x.desdeId===id(p,'Control 1')&&x.haciaId===id(p,'Solemne'))&&
  p.reglasAusenciaJustificada?.traspasos?.some(x=>x.desdeId===id(p,'Pruebas sorpresa')&&x.haciaId===id(p,'Examen')));
chk('se justifica desde la hoja de la evaluación, sin aviso general ni botón en la ficha',
  /opcionAusenciaHojaHTML\(r,cat\)/.test(fs.readFileSync(__dirname+'/../app.js','utf8'))&&
  !/elegirAusenciaDesdeEvaluacion/.test(renderMain)&&!/ausencias-justificadas-warning/.test(renderMain));

console.log('\n=== Reemplazar una nota y mover un peso son operaciones distintas ===');
const c1=micro({Solemne:6,'Control 2':4,'Control 3':5,'Pruebas sorpresa':4,Examen:2});
const baseC1=ramoAvg(c1);c1.ausenciasJustificadas=[id(c1,'Control 1')];
eq('Control 1 ausente toma la nota de la Solemne antes del promedio',ramoAvg(c1),4.2);
chk('sin declaración el promedio antiguo no cambia',baseC1===4);

const sorpresa=micro({Solemne:6,'Control 1':5,'Control 2':5,'Control 3':5,Examen:5});
sorpresa.ausenciasJustificadas=[id(sorpresa,'Pruebas sorpresa')];
eq('la ausencia en Pruebas sorpresa mueve su 5% al Examen',ramoAvg(sorpresa),5.3);

console.log('\n=== Una corrección desactiva, pero no borra ===');
c1.categorias.find(c=>c.id===id(c1,'Control 1')).notas=[{id:'c1-real',nombre:'Control 1',valor:4,peso:1}];
const estado=estadoAusencias&&estadoAusencias(c1);
chk('si aparece una nota, conserva la declaración y avisa que no aplica',
  c1.ausenciasJustificadas.includes(id(c1,'Control 1'))&&estado?.inactivas?.some(x=>x.desdeId===id(c1,'Control 1')&&x.motivo==='tiene_nota'));
eq('una declaración desactivada no altera el cálculo',ramoAvg(c1),4);

console.log('\n=== Compatibilidad y orden de cálculo ===');
const antigua=micro({Solemne:3.7,'Control 1':3.7,'Control 2':3.7,'Control 3':3.7,'Pruebas sorpresa':3.7,Examen:3.7});
const sinCampo=JSON.parse(JSON.stringify(antigua));delete sinCampo.ausenciasJustificadas;
eq('una cuenta existente sin declaración calcula igual que hoy',ramoAvg(sinCampo),3.7);
const normalizadaAntigua=normalize({tenant:'uc',ramos:[sinCampo]}).ramos[0];
chk('una cuenta anterior sin la regla del estudiante sigue sin regla',normalizadaAntigua.reglasAusenciaJustificadaUsuario===null);
const paraRecuperativo=micro({Solemne:3.7,'Control 2':3.7,'Control 3':3.7,'Pruebas sorpresa':3.7,Examen:3.7});
paraRecuperativo.ausenciasJustificadas=[id(paraRecuperativo,'Control 1')];paraRecuperativo.recuperativoRendido='aprobado';
eq('el reemplazo ocurre antes de aplicar el recuperativo',ramoAvg(paraRecuperativo),4);

console.log('\n=== El estudiante declara la regla que trae su formulario ===');
const declarada=ramoConAusencias();
chk('se puede declarar rezago cuando no existe regla oficial',
  configurarAusenciaEstudiante&&configurarAusenciaEstudiante(declarada,'i1','rezago')===true&&
  declarada.reglasAusenciaJustificadaUsuario?.declaradaPor==='estudiante'&&
  declarada.reglasAusenciaJustificadaUsuario?.rezagos?.some(x=>x.desdeId==='i1')&&
  declarada.ausenciasJustificadas.includes('i1'));
chk('cambiar a acumulación reemplaza el rezago en vez de duplicar la regla',
  configurarAusenciaEstudiante(declarada,'i1','traspaso','ex')===true&&
  !declarada.reglasAusenciaJustificadaUsuario.rezagos.some(x=>x.desdeId==='i1')&&
  declarada.reglasAusenciaJustificadaUsuario.traspasos.some(x=>x.desdeId==='i1'&&x.haciaId==='ex'));
configurarAusenciaEstudiante(declarada,'i1','rezago');
const estadoRezago=estadoAusencias&&estadoAusencias(declarada);
chk('el rezago no mueve peso y sigue pendiente hasta rendirse',
  estadoRezago?.pendientes?.some(x=>x.desdeId==='i1'&&x.tipo==='rezago'&&x.motivo==='espera_rezago')&&
  estadoRezago.estructura.children.find(x=>x.id==='i1')?.weight===20&&
  estadoParaNotaNecesaria(declarada).pendiente>0);
chk('la elección del estudiante conserva ambos caminos',
  /Rendir en rezago/.test(fs.readFileSync(raiz+'app.js','utf8'))&&/Acumular.*porcentaje/s.test(fs.readFileSync(raiz+'app.js','utf8')));

const oficial=ramoConAusencias();
oficial.reglasAusenciaJustificada={traspasos:[{desdeId:'i1',haciaId:'ex'}],reemplazos:[]};
chk('una regla oficial no se puede reemplazar por una declaración del estudiante',
  configurarAusenciaEstudiante&&configurarAusenciaEstudiante(oficial,'i2','rezago')===false&&!oficial.reglasAusenciaJustificadaUsuario);
const yaRendida=ramoConAusencias();
chk('una evaluación que ya tiene nota no se puede declarar como inasistencia',
  configurarAusenciaEstudiante(yaRendida,'ex','rezago')===false&&!yaRendida.reglasAusenciaJustificadaUsuario);

console.log('\n=== La acumulación al examen respeta el tope institucional ===');
const topado=ramoConAusencias();
topado.reglasAusenciaJustificadaUsuario={
  declaradaPor:'estudiante',rezagos:[],reemplazos:[],
  traspasos:[{desdeId:'i1',haciaId:'ex'},{desdeId:'i2',haciaId:'ex'},{desdeId:'i3',haciaId:'ex'}],
};
topado.ausenciasJustificadas=['i1','i2','i3'];
const estadoTopado=estadoAusencias&&estadoAusencias(topado);
eq('tres traspasos dejan 75% en el examen y 15% con nota 1,0',ramoAvg(topado),6.1);
chk('el motor informa el tope y el excedente sin esconderlo',
  estadoTopado?.activas?.some(x=>x.desdeId==='i3'&&x.topePesoDestino===75&&x.pesoExcedente===15)&&
  estadoTopado.estructura.children.find(x=>x.id==='ex')?.weight===75&&
  estadoTopado.estructura.children.some(x=>x.ausenciaExceso===true&&x.weight===15));
chk('con el excedente ya calificado no quedan evaluaciones pendientes',
  estadoParaNotaNecesaria(topado).pendiente===0);

const bajoTope=ramoConAusencias();
bajoTope.reglasAusenciaJustificadaUsuario={declaradaPor:'estudiante',rezagos:[],reemplazos:[],traspasos:[{desdeId:'i1',haciaId:'ex'}]};
bajoTope.ausenciasJustificadas=['i1'];
const estadoBajoTope=estadoAusencias&&estadoAusencias(bajoTope);
chk('bajo 75% se mueve todo el peso y no aparece castigo',
  estadoBajoTope?.activas?.some(x=>x.desdeId==='i1'&&x.pesoAplicado===20&&x.pesoExcedente===0)&&
  !estadoBajoTope.estructura.children.some(x=>x.ausenciaExceso===true));

console.log('\n=== Solo la primera ausencia se reemplaza; el resto queda pendiente ===');
// Pauta sintética. El orden de interrogaciones declara cuál es la primera,
// aunque la persona marque las ausencias en otro orden.
function primeraJustificada(){
  const nota=(id,valor)=>valor==null?[]:[{id:'n-'+id,nombre:id,valor,peso:1}];
  return {id:'orden',nombre:'Curso sintético',categorias:[
    {id:'i1',nombre:'Interrogación 1',peso:20,notas:nota('i1',null)},
    {id:'i2',nombre:'Interrogación 2',peso:20,notas:nota('i2',null)},
    {id:'i3',nombre:'Interrogación 3',peso:20,notas:nota('i3',4)},
    {id:'ex',nombre:'Examen',peso:30,notas:nota('ex',6)},
    {id:'lab',nombre:'Laboratorio',peso:10,notas:nota('lab',5)},
  ],gates:[],ausenciasJustificadas:[],reglasAusenciaJustificada:{
    maxReemplazos:1,excesoReemplazos:'rezago',reemplazos:[
      {desdeId:'i1',haciaId:'ex'},{desdeId:'i2',haciaId:'ex'},{desdeId:'i3',haciaId:'ex'},
    ]}};
}
const sinAusencias=primeraJustificada(),baseSinAusencias=ramoAvg(sinAusencias);
sinAusencias.reglasAusenciaJustificada=null;
eq('sin declaración, el promedio es idéntico al de una cuenta anterior',baseSinAusencias,ramoAvg(sinAusencias));
const dos=primeraJustificada();dos.ausenciasJustificadas=['i2','i1'];
const dosEstado=estadoAusencias(dos);
chk('la primera interrogación toma el examen y la segunda queda en rezago',
  dosEstado.activas.length===1&&dosEstado.activas[0].desdeId==='i1'&&
  dosEstado.pendientes.some(x=>x.desdeId==='i2'&&x.motivo==='espera_rezago')&&
  dosEstado.notas['ausencia-i1']===6&&!('ausencia-i2' in dosEstado.notas));
chk('el rezago mantiene pendiente su 20 % y no inventa una nota',
  dosEstado.estructura.children.find(x=>x.id==='i2').weight===20&&
  estadoParaNotaNecesaria(dos).pendiente>0&&dos.categorias.find(x=>x.id==='i2').notas.length===0);
const una=primeraJustificada();una.categorias[0].notas=[{id:'i1-real',nombre:'I1',valor:5,peso:1}];
una.ausenciasJustificadas=['i2'];
chk('si la primera tiene nota, la siguiente justificada ocupa el reemplazo',
  estadoAusencias(una).activas.some(x=>x.desdeId==='i2')&&
  estadoAusencias(una).notas['ausencia-i2']===6);
const sinExamen=primeraJustificada();sinExamen.categorias.find(x=>x.id==='ex').notas=[];
sinExamen.ausenciasJustificadas=['i1','i2'];
chk('la primera espera el examen sin ceder su turno a la segunda',
  estadoAusencias(sinExamen).pendientes.some(x=>x.desdeId==='i1'&&x.motivo==='falta_destino')&&
  estadoAusencias(sinExamen).pendientes.some(x=>x.desdeId==='i2'&&x.motivo==='espera_rezago'));
const persistida=normalize({tenant:'uc',ramos:[primeraJustificada()]}).ramos[0];
chk('el límite y el rezago sobreviven la normalización de cuentas existentes',
  persistida.reglasAusenciaJustificada.maxReemplazos===1&&
  persistida.reglasAusenciaJustificada.excesoReemplazos==='rezago');
const pCalculoI=presetRamo('Cálculo I','uc','ING-PC',new Date('2026-10-19T12:00:00Z'));
const pCalculoII=presetRamo('Cálculo II','uc','ING-PC',new Date('2026-10-19T12:00:00Z'));
chk('MAT1610 y MAT1620 declaran la misma regla general por ids',
  [pCalculoI,pCalculoII].every(p=>p?.reglasAusenciaJustificada?.maxReemplazos===1&&
    p.reglasAusenciaJustificada.excesoReemplazos==='rezago'&&p.reglasAusenciaJustificada.reemplazos.length===3));

console.log('\n=== Promedio ponderado de otras sumativas, sin talleres ===');
function sumativasSinteticas(){
  const pesos={c1:10,c2:10,c3:10,i1:20,i2:20,ex:20,ta:10};
  const valores={c1:null,c2:5,c3:7,i1:4,i2:6,ex:5,ta:1};
  const categorias=Object.keys(pesos).map(id=>({id,nombre:id,peso:pesos[id],notas:valores[id]==null?[]:[
    {id:'n-'+id,nombre:id,peso:1,valor:valores[id]}]}));
  const otras=['c1','c2','c3','i1','i2','ex'];
  return {id:'sumativas',nombre:'Curso sintético',categorias,gates:[],ausenciasJustificadas:[],
    reglasAusenciaJustificada:{maxPromedios:1,notaExceso:1,promedios:otras.filter(id=>id!=='ex')
      .map(desdeId=>({desdeId,deIds:otras.filter(id=>id!==desdeId)}))}};
}
const suma= sumativasSinteticas(),antesSuma=ramoAvg(suma);
suma.ausenciasJustificadas=['c1'];
const estadoSuma=estadoAusencias(suma);
eq('Control 1 toma 5,25 de las otras sumativas, sin el taller de nota 1,0',estadoSuma.notas['ausencia-c1'],5.25);
eq('el promedio resultante usa la sustitución antes de ponderar',ramoAvg(suma),4.825);
chk('sin ausencia marcada, el mecanismo no cambia el promedio anterior',
  Math.abs(antesSuma-ramoAvg(sumativasSinteticas()))<1e-9);
const dobleSuma=sumativasSinteticas();dobleSuma.categorias.find(c=>c.id==='c2').notas=[];
dobleSuma.ausenciasJustificadas=['c2','c1'];
const dobleEstado=estadoAusencias(dobleSuma);
eq('la segunda ausencia vale 1,0 y la primera promedia esa nota con las otras',dobleEstado.notas['ausencia-c1'],4.75);
eq('el tope de dos ausencias se refleja en el promedio sin guardar notas ficticias',ramoAvg(dobleSuma),4.375);
chk('la nota 1,0 no entra al estado guardado del estudiante',
  dobleSuma.categorias.find(c=>c.id==='c2').notas.length===0&&dobleEstado.activas.some(x=>x.tipo==='nota_exceso'));
const pIce=presetRamo('Dinámica (ICE1514)','uc','ING-PC',new Date('2026-10-19T12:00:00Z'));
chk('ICE1514 declara promedio, límite y nota de segunda ausencia por ids',
  pIce?.reglasAusenciaJustificada?.promedios?.length===5&&
  pIce.reglasAusenciaJustificada.maxPromedios===1&&pIce.reglasAusenciaJustificada.notaExceso===1);
const iceCategorias=new Map(pIce.categorias.map(c=>[c.id,c.nombre]));
chk('ICE1514 ordena las ausencias por fecha, aunque la pauta agrupe controles antes de interrogaciones',
  pIce.reglasAusenciaJustificada.promedios.map(x=>iceCategorias.get(x.desdeId)).join('|')===
  'Control 1|Interrogación 1|Control 2|Control 3|Interrogación 2');
const ordenCronologico=sumativasSinteticas();
ordenCronologico.categorias.find(c=>c.id==='c1').notas=[{id:'n-c1',nombre:'c1',peso:1,valor:5}];
ordenCronologico.categorias.find(c=>c.id==='c2').notas=[];
ordenCronologico.categorias.find(c=>c.id==='i1').notas=[];
ordenCronologico.reglasAusenciaJustificada.promedios.sort((a,b)=>
  ['c1','i1','c2','c3','i2'].indexOf(a.desdeId)-['c1','i1','c2','c3','i2'].indexOf(b.desdeId));
ordenCronologico.ausenciasJustificadas=['c2','i1'];
const cronologico=estadoAusencias(ordenCronologico);
chk('la primera ausencia por fecha toma el promedio y la segunda 1,0 aunque se marquen al revés',
  cronologico.activas.some(x=>x.desdeId==='i1'&&x.tipo==='promedio')&&
  cronologico.activas.some(x=>x.desdeId==='c2'&&x.tipo==='nota_exceso')&&
  cronologico.notas['ausencia-i1']===5&&cronologico.notas['ausencia-c2']===1);

console.log('\n=== Una sola sustitución o traspaso declarado ===');
const pruebaUnica={id:'uai-sintetico',nombre:'Curso sintético',categorias:[
  {id:'p1',nombre:'Prueba 1',peso:25,notas:[]},
  {id:'p2',nombre:'Prueba 2',peso:25,notas:[{id:'n-p2',nombre:'P2',peso:1,valor:5}]},
  {id:'ex',nombre:'Examen',peso:30,notas:[{id:'n-ex',nombre:'Examen',peso:1,valor:6}]},
  {id:'ta',nombre:'Tareas',peso:20,notas:[{id:'n-ta',nombre:'Tareas',peso:1,valor:4}]},
],gates:[],ausenciasJustificadas:['p1'],reglasAusenciaJustificada:{maxTraspasos:1,traspasos:[
  {desdeId:'p1',haciaId:'ex'},{desdeId:'p2',haciaId:'ex'}]}};
const traslado=estadoAusencias(pruebaUnica);
chk('una prueba mueve su 25 % al examen sin superar un tope inventado',
  traslado.activas.length===1&&traslado.estructura.children.find(x=>x.id==='ex').weight===55);
eq('el traspaso usa el promedio de los datos sintéticos',ramoAvg(pruebaUnica),5.35);
pruebaUnica.categorias.find(x=>x.id==='p2').notas=[];pruebaUnica.ausenciasJustificadas.push('p2');
chk('si se justifican dos y el programa describe una, no inventa la segunda',
  estadoAusencias(pruebaUnica).bloqueadas.some(x=>x.desdeId==='p2'&&x.motivo==='sin_regla_para_exceso')&&ramoAvg(pruebaUnica)===null);
const macro=JSON.parse(JSON.stringify(pruebaUnica));
macro.ausenciasJustificadas=['p2'];macro.reglasAusenciaJustificada={maxReemplazos:1,reemplazos:[
  {desdeId:'p1',haciaId:'ex'},{desdeId:'p2',haciaId:'ex'}]};
chk('un reemplazo simple usa la nota del examen sin mover pesos',
  estadoAusencias(macro).notas['ausencia-p2']===6&&
  estadoAusencias(macro).estructura.children.find(x=>x.id==='ex').weight===30);
const uaiMicro=presetRamo('Introducción a la Microeconomía','uai',null,new Date('2026-10-19T12:00:00Z'));
const uaiMacro=presetRamo('Introducción a la Macroeconomía','uai',null,new Date('2026-10-19T12:00:00Z'));
chk('UAI Micro y Macro activan solo los casos que el programa define',
  uaiMicro?.reglasAusenciaJustificada?.maxTraspasos===1&&
  uaiMacro?.reglasAusenciaJustificada?.maxReemplazos===1);

console.log('\n=== Tope declarado y compatibilidad de ramos existentes ===');
const dosPruebas=ramoConAusencias();
const topeSet=val('gh_prepararAusenciasJustificadas')(
  val('ramoToStructure')(dosPruebas),val('gradesOf')(dosPruebas),
  {traspasos:[{desdeId:'i1',haciaId:'ex'},{desdeId:'i2',haciaId:'ex'}]},
  ['i1','i2'],{topePesoDestino:70,requiereResolucion:true});
chk('dos pruebas justificadas dejan el examen justo en el tope sintético de 70 %',
  topeSet.activas.length===2&&topeSet.bloqueadas.length===0&&
  topeSet.estructura.children.find(c=>c.id==='ex').weight===70);
const terceraPrueba=val('gh_prepararAusenciasJustificadas')(
  val('ramoToStructure')(dosPruebas),val('gradesOf')(dosPruebas),
  {traspasos:[{desdeId:'i1',haciaId:'ex'},{desdeId:'i2',haciaId:'ex'},{desdeId:'i3',haciaId:'ex'}]},
  ['i1','i2','i3'],{topePesoDestino:70,requiereResolucion:true});
chk('una tercera prueba no supera el 70 % ni recibe una nota inventada',
  terceraPrueba.bloqueadas.some(x=>x.desdeId==='i3'&&x.motivo==='supera_tope')&&
  terceraPrueba.estructura.children.find(c=>c.id==='ex').weight===70&&
  terceraPrueba.estructura.children.find(c=>c.id==='i3').weight===20);
const presetsSinAusencia=[pCalculoI,pCalculoII,pIce,uaiMicro,uaiMacro];
chk('cada preset modificado conserva su promedio cuando no hay ausencia marcada',presetsSinAusencia.every(original=>{
  if(!original)return false;
  const nuevo=JSON.parse(JSON.stringify(original));
  nuevo.categorias.forEach(c=>{c.notas=[{id:'nota-'+c.id,nombre:c.nombre,valor:5,peso:1}];});
  nuevo.ausenciasJustificadas=[];
  const anterior=JSON.parse(JSON.stringify(nuevo));
  delete anterior.reglasAusenciaJustificada;
  const guardado=JSON.stringify(nuevo);
  return ramoAvg(nuevo)===ramoAvg(anterior)&&JSON.stringify(nuevo)===guardado;
}));

console.log('\n=== Sustitución de casillas fijas, sin sustituir el bloque entero ===');
const claveCasilla=val('gh_claveAusenciaCasilla');
const casillas={id:'casillas',nombre:'Pauta sintética',categorias:[
  {id:'ta',nombre:'Talleres',peso:30,slots:3,notas:[
    {id:'ta0',slot:0,nombre:'Taller 1',valor:2,peso:1},
    {id:'ta2',slot:2,nombre:'Taller 3',valor:4,peso:1}]},
  {id:'pr',nombre:'Pruebas',peso:30,slots:3,notas:[
    {id:'pr0',slot:0,nombre:'Prueba 1',valor:5,peso:1},
    {id:'pr1',slot:1,nombre:'Prueba 2',valor:6,peso:1},
    {id:'pr2',slot:2,nombre:'Prueba 3',valor:7,peso:1}]},
  {id:'ex',nombre:'Examen',peso:40,notas:[{id:'ex0',nombre:'Examen',valor:5,peso:1}]},
],gates:[],ausenciasJustificadas:[claveCasilla('ta',1)],reglasAusenciaJustificada:{
  reemplazosCasilla:[{desdeId:'ta',desdeSlot:1,haciaId:'pr',haciaSlot:1}]}};
const casillasAntes=JSON.stringify(casillas);
eq('Taller 2 toma Prueba 2 y los otros talleres conservan sus notas',ramoAvg(casillas),5);
chk('el motor conserva la pauta y las notas guardadas',JSON.stringify(casillas)===casillasAntes);
chk('la hoja ofrece la regla a la casilla correcta, no a todo el bloque',
  val('ausenciaDeEvaluacion')(casillas,casillas.categorias[0],1)?.declarada===true&&
  val('ausenciaDeEvaluacion')(casillas,casillas.categorias[0],0)===null&&
  val('ausenciaDeEvaluacion')(casillas,casillas.categorias[0])===null);
const casillasNormalizadas=normalize({tenant:'uai',ramos:[JSON.parse(casillasAntes)]}).ramos[0];
chk('la declaración por casilla y su regla sobreviven la recarga',
  casillasNormalizadas.ausenciasJustificadas.includes(claveCasilla('ta',1))&&
  casillasNormalizadas.reglasAusenciaJustificada.reemplazosCasilla[0].haciaSlot===1&&
  ramoAvg(casillasNormalizadas)===ramoAvg(casillas));
chk('al cambiar el id de una categoría la declaración conserva su casilla',
  val('traducirIdsCategoria')(claveCasilla('ta',1),{ta:'ta-nueva'})===claveCasilla('ta-nueva',1));
const examenPendiente=JSON.parse(casillasAntes);
examenPendiente.categorias[1].notas=examenPendiente.categorias[1].notas.filter(n=>n.slot!==1);
chk('sin la prueba correspondiente el taller sigue pendiente, sin nota inventada',
  estadoAusencias(examenPendiente).pendientes.some(x=>x.desdeId===claveCasilla('ta',1)&&x.motivo==='falta_destino'));
const uaiMat=presetRamo('Matemáticas Avanzadas I','uai',null,new Date('2026-10-19T12:00:00Z'));
const uaiRcd=presetRamo('Razonamiento Cuantitativo con Datos I','uai',null,new Date('2026-10-19T12:00:00Z'));
chk('MAT124 y MAT125 resuelven reglas de casilla desde el preset',
  uaiMat?.reglasAusenciaJustificada?.reemplazosCasilla?.length===9&&
  uaiRcd?.reglasAusenciaJustificada?.reemplazosCasilla?.length===7);
chk('MAT124 y MAT125 también conservan su promedio sin casillas justificadas',[uaiMat,uaiRcd].every(original=>{
  if(!original)return false;
  const nuevo=JSON.parse(JSON.stringify(original));
  nuevo.categorias.forEach(c=>{c.notas=Array.from({length:c.slots||1},(_,slot)=>({
    id:`nota-${c.id}-${slot}`,slot,nombre:c.nombre,valor:5,peso:1}));});
  const viejo=JSON.parse(JSON.stringify(nuevo));delete viejo.reglasAusenciaJustificada;
  return ramoAvg(nuevo)===ramoAvg(viejo);
}));

console.log('\n=== La regla está disponible apenas se agrega el ramo ===');
const alta=vm.runInContext(`(()=>{
  const nombre='Curso sintético con ausencia por casilla';
  PRESETS_POR_TENANT.uai[nombre]={
    evals:[['Talleres',30,{slots:3,slotLabel:'Taller'}],['Pruebas',70,{slots:3,slotLabel:'Prueba'}]],
    ausenciasJustificadas:{reemplazosCasilla:[{desde:'Talleres',desdeSlot:1,hacia:'Pruebas',haciaSlot:1}]}
  };
  save=()=>{};syncProfile=()=>{};registrarDeclaracionEdad=()=>{};
  track=()=>{};enterApp=()=>{};mostrarRamosCargados=()=>{};
  consensoAlAgregar=()=>{};closeModal=()=>{};renderHome=()=>{};showToast=()=>{};
  obPasoIncompleto=()=>0;
  document.getElementById=()=>({value:nombre,classList:{contains:()=>false}});
  const conRegla=r=>{
    const talleres=r?.categorias?.find(c=>c.nombre==='Talleres');
    const prueba=r?.categorias?.find(c=>c.nombre==='Pruebas');
    const regla=r?.reglasAusenciaJustificada?.reemplazosCasilla?.[0];
    const hoja=talleres?opcionAusenciaHojaHTML(r,talleres,{slot:1}):'';
    return regla?.desdeId===talleres?.id&&regla?.haciaId===prueba?.id&&
      regla?.desdeSlot===1&&regla?.haciaSlot===1&&
      hoja.includes('10%')&&!hoja.includes('Aplica a toda la evaluación');
  };
  selectedTenant='uai';selectedCarrera=null;selectedSem=1;
  obTipo='estudiante';obRamos=[{nombre,manual:false}];
  S.ramos=[];completeOnboarding();
  const onboarding=conRegla(S.ramos[0]);
  S.ramos=[];S.tenant='uai';S.carrera=null;
  _mallaList=[nombre];_mallaSel={[nombre]:true};confirmAddMalla();
  const malla=conRegla(S.ramos[0]);
  S.ramos=[];crearRamoDesdeCatalogo(nombre,null);
  const catalogo=conRegla(S.ramos[0]);
  S.ramos=[];
  confirmAddRamo();
  const buscador=conRegla(S.ramos[0]);
  delete PRESETS_POR_TENANT.uai[nombre];
  return {onboarding,malla,catalogo,buscador};
})()`,ctx);
Object.entries(alta).forEach(([ruta,correcta])=>
  chk(`${ruta}: la regla de Taller 2 aparece antes de recargar`,correcta));

console.log(`\nPASS: ${ok}   FAIL: ${fail}`);process.exit(fail?1:0);
