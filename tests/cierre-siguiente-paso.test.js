// Siguiente paso al archivar (solo app; Lucas, 2026-11-23): la hoja propone
// subir de semestre y lleva a la toma de ramos. Datos sintéticos.
const assert=require('assert/strict'),fs=require('fs'),vm=require('vm');
const ids={},store=new Map();let guardados=0;
function el(){return {value:'',innerHTML:'',textContent:'',dataset:{},style:{setProperty(){},removeProperty(){}},classList:{add(){},remove(){},contains(){return false},toggle(){}},addEventListener(){},removeEventListener(){},appendChild(){},setAttribute(){},removeAttribute(){},getAttribute(){return null},querySelectorAll(){return []},querySelector(){return el()},focus(){},select(){}};}
const ctx={console,window:{addEventListener(){},matchMedia:()=>({matches:true,addEventListener(){},addListener(){}})},document:{getElementById:id=>ids[id]||(ids[id]=el()),createElement:el,addEventListener(){},querySelector(){return el()},querySelectorAll(){return []},documentElement:el(),body:el()},localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k)},navigator:{},location:{origin:'',pathname:'/',hash:''},history:{replaceState(){}},setTimeout(){return 1},clearTimeout(){},requestAnimationFrame(){}};
vm.createContext(ctx);for(const f of ['data.js','engine.js','app.js','app-session.js','marketplace.js','render-main.js','render-agenda.js'])vm.runInContext(fs.readFileSync(f,'utf8'),ctx,{filename:f});
const run=s=>vm.runInContext(s,ctx),set=(k,v)=>{ctx.fixture=v;run(k+'=fixture')};
let ok=0;const chk=(n,c)=>{assert.ok(c,n);ok++;console.log('  OK   '+n);};
const cat=(id,peso,nota)=>({id,nombre:id,peso,directNota:true,notas:nota==null?[]:[{id:'n'+id,nombre:id,valor:nota,peso:1}]});
const ramo={id:'a',nombre:'Ramo sintético A',creditos:10,categorias:[cat('Prueba',50,5),cat('Examen',50,5)],gates:[]};
const pendiente={id:'b',nombre:'Ramo sintético B',creditos:10,categorias:[cat('Prueba',50,6),cat('Examen',50,null)],gates:[]};
const abiertos=[];
ctx.save=()=>guardados++;ctx.closeModal=()=>{};ctx.openModal=()=>{};ctx.renderHome=()=>{};ctx.showToast=()=>{};ctx.track=()=>{};
ctx.abrirProximoSemestre=()=>abiertos.push('proximo');ctx.openMallaModal=()=>abiertos.push('malla');ctx.openAddRamoModal=()=>abiertos.push('agregar');
ctx.ofrecerCalificarRamosCerrados=()=>abiertos.push('calificar');
function estado(extra){set('S',{...run('freshState()'),tenant:'uc',carrera:null,careerSemestre:3,ramos:JSON.parse(JSON.stringify([ramo,pendiente])),historial:[],...extra});run("currentUser={id:'u'}");}

console.log('Opciones');
chk('UC: armar el próximo semestre va primero',JSON.stringify(run('opcionesSiguientePaso({conProximo:true,conMalla:true})').map(x=>x[0]))==='["proximo","malla"]');
chk('sin armador ni malla: agregar ramos',JSON.stringify(run('opcionesSiguientePaso({conProximo:false,conMalla:false})').map(x=>x[0]))==='["agregar"]');
chk('sin armador con malla: malla y agregar',JSON.stringify(run('opcionesSiguientePaso({conProximo:false,conMalla:true})').map(x=>x[0]))==='["malla","agregar"]');

console.log('Semestre siguiente');
estado({});
chk('3° → 4°',run('semestreSiguienteCierre(S,false)')===4);
chk('en verano no se sube',run('semestreSiguienteCierre(S,true)')===null);
chk('sin semestre no se propone',run('semestreSiguienteCierre({...S,careerSemestre:null},false)')===null);
chk('no pasa del último semestre de la carrera',run('semestreSiguienteCierre({...S,careerSemestre:semestresDeCarrera(S.tenant,S.carrera)},false)')===null);

console.log('Archivar en la web no cambia');
run('enAppNativa=()=>false');estado({});run('prepararArchivoSemestre()');ids['cierre-oficial-0']=Object.assign(el(),{value:''});ids['cierre-oficial-1']=Object.assign(el(),{value:''});
abiertos.length=0;run('guardarArchivoRevisado()');
chk('web: sigue ofreciendo calificar, sin hoja nueva',abiertos.join()==='calificar'&&!ids['modal-content'].innerHTML.includes('Archivaste'));
chk('web: el semestre de carrera no cambia',run('S.careerSemestre')===3);

console.log('Archivar en la app');
run('enAppNativa=()=>true');estado({});run('prepararArchivoSemestre()');ids['cierre-oficial-0'].value='';ids['cierre-oficial-1'].value='';
abiertos.length=0;run('guardarArchivoRevisado()');
const hoja=ids['modal-content'].innerHTML;
chk('muestra la hoja',hoja.includes('Archivaste')&&hoja.includes('¿Qué sigue?'));
chk('propone 4° semestre, marcado',hoja.includes('Ahora estoy en 4° semestre')&&hoja.includes('id="sp-subir" checked'));
chk('avisa el ramo sin nota final',hoja.includes('Un ramo quedó sin nota final'));
chk('una sola acción principal',(hoja.match(/sp-principal/g)||[]).length===1);
chk('no sube nada antes de elegir',run('S.careerSemestre')===3);
chk('archivó con el semestre de entonces',run('S.historial[0].careerSemestre')===3);

console.log('Elegir');
const antes=guardados;
chk('subir y agregar ramos',run('elegirSiguientePaso("agregar",{siguiente:4,subir:true,copias:S.historial[0].ramos,label:"2026-2"})')===true&&run('S.careerSemestre')===4&&abiertos.join()==='agregar'&&guardados>antes);
chk('elegir dos veces no sube dos veces',run('elegirSiguientePaso("no",{siguiente:4,subir:true,copias:S.historial[0].ramos,label:"2026-2"})')===false&&run('S.careerSemestre')===4);
chk('«Ahora no» ofrece calificar',abiertos.includes('calificar'));
estado({});abiertos.length=0;
chk('casilla desmarcada: no sube',run('elegirSiguientePaso("proximo",{siguiente:4,subir:false,copias:[],label:"2026-2"})')===false&&run('S.careerSemestre')===3&&abiertos.join()==='proximo');

console.log('Próximo semestre después de subir');
estado({ramos:[]});
set('S.historial',[{id:'h',label:'2026-2',careerSemestre:3,ramos:[]}]);
run('S.careerSemestre=4');
chk('ya archivó y subió: el que viene es el 4°',run('proximoSemestreObjetivo(S)')===4);
run('S.careerSemestre=3');
chk('archivó sin subir: el que viene es el 4°',run('proximoSemestreObjetivo(S)')===4);
estado({});
chk('con ramos en curso: el siguiente',run('proximoSemestreObjetivo(S)')===4);

console.log(`\n${ok} OK, 0 FAIL`);
