// La pauta manual es el camino habitual para ramos sin programa transcrito. La
// ayuda puede ahorrar escritura y aritmética, pero jamás elegir pesos por la
// persona ni reescribir una pauta que ya guardó.
const fs=require('fs'),vm=require('vm');
const raiz=__dirname+'/../';
const src=['data.js','engine.js','app.js','render-main.js','render-agenda.js'].map(f=>fs.readFileSync(raiz+f,'utf8')).join('\n');
const stub={style:{setProperty(){},removeProperty(){}},addEventListener(){},appendChild(){},classList:{add(){},remove(){},contains(){return false;}},value:'',innerHTML:'',textContent:'',focus(){},select(){},setAttribute(){},removeAttribute(){},getAttribute(){return null},querySelector(){return stub},querySelectorAll(){return []},clientWidth:400,dataset:{},click(){}};
const ctx={window:{addEventListener(){},matchMedia:()=>({matches:true,addEventListener(){},addListener(){}})},document:{getElementById:()=>stub,createElement:()=>stub,addEventListener(){},documentElement:{style:{setProperty(){},removeProperty(){}},setAttribute(){},removeAttribute(){},getAttribute(){return null}},querySelector:()=>stub,querySelectorAll:()=>[],body:stub},localStorage:{getItem(){return null},setItem(){},removeItem(){}},navigator:{},location:{origin:'',pathname:'/',hash:''},setTimeout,clearTimeout,console};
vm.createContext(ctx);vm.runInContext(src,ctx);
const val=n=>vm.runInContext(n,ctx);
let ok=0,fail=0;const chk=(n,c)=>{console.log(`  ${c?'OK  ':'FAIL'} ${n}`);if(c)ok++;else fail++;};

console.log('\n=== El porcentaje restante se asigna solo cuando lo eliges ===');
vm.runInContext("pautaDraft=[{id:null,nombre:'Tarea',peso:20,tieneNotas:false,varias:false},{id:null,nombre:'Examen',peso:0,tieneNotas:false,varias:false}];",ctx);
let usarResto=null;try{usarResto=val('usarRestoPauta');}catch(_){}
if(usarResto)usarResto(1);
chk('asigna el resto a la fila explícita, no a una elegida por la app',
  val('pautaDraft[0].peso')===20&&val('pautaDraft[1].peso')===80);

console.log('\n=== Un grupo repetido puede declarar cuántas notas espera ===');
vm.runInContext("S={ramos:[{id:'r',nombre:'Ramo sin preset',categorias:[],gates:[]}]};currentRamoId='r';pautaDraft=[{id:null,nombre:'Tareas',peso:40,tieneNotas:false,varias:true,cantidad:4},{id:null,nombre:'Examen',peso:60,tieneNotas:false,varias:false,cantidad:null}];showToast=function(){};closeModal=function(){};renderRamo=function(){};save=function(){};",ctx);
val('guardarPautaManual')();
const tareas=val("S.ramos[0].categorias.find(c=>c.nombre==='Tareas')");
chk('guardar una cantidad explícita la convierte en casillas fijas',tareas&&tareas.directNota===true&&tareas.slots===4);

console.log('\n=== La ayuda no modifica una pauta existente por sí sola ===');
const examen=val("S.ramos[0].categorias.find(c=>c.nombre==='Examen')");
chk('la otra fila conserva exactamente el peso que escribió la persona',examen&&examen.peso===60&&!('slots' in examen));

vm.runInContext("S={ramos:[{id:'manual',nombre:'Pauta ajustada',categorias:[{id:'t',nombre:'Tareas',peso:35,directNota:false,slots:4,notas:[]},{id:'e',nombre:'Examen',peso:65,directNota:true,notas:[]}],gates:[]}]};currentRamoId='manual';pautaDraft=[{id:'t',nombre:'Tareas',peso:35,tieneNotas:false,varias:true,cantidad:4},{id:'e',nombre:'Examen',peso:65,tieneNotas:false,varias:false,cantidad:null}];",ctx);
val('guardarPautaManual')();
chk('al guardar sin cambios conserva una pauta manual ajustada',
  val("S.ramos[0].categorias.map(c=>c.nombre+':'+c.peso+':'+(c.slots||'')+':'+c.directNota).join('|')")==='Tareas:35:4:true|Examen:65::true');

// El editor guardaba una pauta que sumaba 110% sin decir nada: el aviso recién
// salía en la ficha (auditoría #1376). Ahora pregunta antes. No bloquea: el
// programa de Canvas puede dejar la suma sobre 100 (canvas-programa.test.js).
console.log('\n=== Pasarse de 100% no se guarda sin preguntar ===');
vm.runInContext('__pregunta=null;showConfirm=(t,d,fn,o)=>{__pregunta={t,d,fn,o};};',ctx);
const fila=(id,nombre,peso)=>`{id:${id?`'${id}'`:null},nombre:'${nombre}',peso:${peso},tieneNotas:false,varias:false,cantidad:null}`;
const armar=(cats,draft)=>vm.runInContext(`__pregunta=null;S={ramos:[{id:'s',nombre:'Ramo sintético',categorias:[${cats}],gates:[]}]};currentRamoId='s';pautaRequisitosDraft=null;pautaEximicionDraft=null;pautaQuitadas=[];pautaDraftError='';pautaDraft=[${draft}];`,ctx);
const cat=(id,nombre,peso)=>`{id:'${id}',nombre:'${nombre}',peso:${peso},directNota:true,notas:[]}`;
const pesos=()=>val("S.ramos[0].categorias.map(c=>c.nombre+':'+c.peso).join('|')");
const pregunta=()=>val('__pregunta');

armar(`${cat('a','Prueba 1',50)},${cat('b','Examen',50)}`,`${fila('a','Prueba 1',60)},${fila('b','Examen',50)}`);
val('guardarPautaManual')();
chk('subir a 110% no se guarda todavía: pregunta con la cifra',pesos()==='Prueba 1:50|Examen:50'&&pregunta()?.t==='Tus ponderaciones suman 110%'&&/Te pasas por 10%/.test(pregunta().d));
chk('la acción es «Guardar igual», sin pinta de borrar y con el foco en cancelar',pregunta().o.label==='Guardar igual'&&pregunta().o.danger===false&&pregunta().o.focusCancel===true);
pregunta().fn();
chk('si la persona confirma, se guarda tal como lo escribió',pesos()==='Prueba 1:60|Examen:50');

armar('',`${fila(null,'Prueba 1',30)},${fila(null,'Examen',25)}`);
val('guardarPautaManual')();
chk('una pauta que suma 55% se guarda sin preguntar: se completa después',pesos()==='Prueba 1:30|Examen:25'&&pregunta()===null);

armar(`${cat('a','Prueba 1',60)},${cat('b','Examen',50)}`,`${fila('a','Prueba uno',60)},${fila('b','Examen',50)}`);
val('guardarPautaManual')();
chk('una pauta que ya venía en 110% se edita sin preguntar',pesos()==='Prueba uno:60|Examen:50'&&pregunta()===null);
armar(`${cat('a','Prueba 1',60)},${cat('b','Examen',50)}`,`${fila('a','Prueba 1',55)},${fila('b','Examen',50)}`);
val('guardarPautaManual')();
chk('y acercarla al 100% tampoco pregunta',pesos()==='Prueba 1:55|Examen:50'&&pregunta()===null);
armar(`${cat('a','Prueba 1',60)},${cat('b','Examen',50)}`,`${fila('a','Prueba 1',70)},${fila('b','Examen',50)}`);
val('guardarPautaManual')();
chk('alejarla más sí pregunta',pesos()==='Prueba 1:60|Examen:50'&&/Te pasas por 20%/.test(pregunta()?.d||''));

// Cancelar o Escape cerraban el editor y botaban lo escrito sin preguntar
// (auditoría #1376). Con cambios se pregunta; sin cambios se cierra directo.
console.log('\n=== Cancelar con cambios pregunta antes de descartar ===');
vm.runInContext("__cierres=0;closeModal=()=>{__cierres++;};openModal=()=>{};",ctx);
const abrir=()=>vm.runInContext(`__pregunta=null;__cierres=0;S={ramos:[{id:'s',nombre:'Ramo sintético',categorias:[${cat('a','Prueba 1',50)},${cat('b','Examen',50)}],gates:[]}]};currentRamoId='s';openPautaManualModal();`,ctx);
abrir();val('cancelarPautaManual')();
chk('sin cambios, Cancelar cierra sin preguntar',val('__cierres')===1&&pregunta()===null);
abrir();vm.runInContext("actualizarPautaNombre(0,'Prueba uno')",ctx);val('cancelarPautaManual')();
chk('con un nombre cambiado pregunta y no cierra todavía',val('__cierres')===0&&pregunta()?.t==='¿Descartar los cambios?'&&pregunta().o.label==='Descartar'&&pregunta().o.focusCancel===true);
pregunta().fn();
chk('al confirmar se cierra y el ramo queda como estaba',val('__cierres')===1&&pesos()==='Prueba 1:50|Examen:50');
abrir();vm.runInContext("actualizarPautaPeso(1,'40')",ctx);val('cancelarPautaManual')();
chk('un porcentaje cambiado también cuenta',val('__cierres')===0&&pregunta()!==null);
abrir();vm.runInContext("agregarPautaFila()",ctx);val('cancelarPautaManual')();
chk('y una evaluación agregada',val('__cierres')===0&&pregunta()!==null);
chk('Escape pasa por el mismo camino que Cancelar',/pautaManualAbierta\(\)\)cancelarPautaManual\(\);/.test(src)&&/onclick="cancelarPautaManual\(\)">Cancelar/.test(src));

console.log(`\nPASS: ${ok}   FAIL: ${fail}`);process.exit(fail?1:0);
