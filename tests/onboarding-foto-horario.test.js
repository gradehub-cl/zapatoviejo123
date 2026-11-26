// #1054: en la app, la foto del horario es la primera opción del paso de ramos.
// Elegirla no carga los ramos premarcados de la malla ni toca los que la cuenta
// ya tenía: abre la misma importación por foto, que revisa antes de agregar.
const fs=require('fs'),vm=require('vm');
const raiz=__dirname+'/../';
const app=process.env.GRADEHUB_APP||raiz+'app.js';
const src=['data.js','engine.js'].map(f=>fs.readFileSync(raiz+f,'utf8'))
  .concat(fs.readFileSync(app,'utf8'),fs.readFileSync(raiz+'render-main.js','utf8'),fs.readFileSync(raiz+'render-agenda.js','utf8')).join('\n');

const stub={style:{setProperty(){},removeProperty(){}},addEventListener(){},appendChild(){},classList:{add(){},remove(){},contains(){return false;}},value:'',innerHTML:'',textContent:'',focus(){},select(){},setAttribute(){},removeAttribute(){},getAttribute(){return null;},querySelectorAll(){return [];},querySelector(){return stub;},clientWidth:400,clientHeight:400,scrollTop:0,dataset:{},click(){},closest(){return stub;},insertBefore(){},removeChild(){},remove(){},getBoundingClientRect(){return {top:0,left:0,width:0,height:0,bottom:0,right:0};},children:[],firstElementChild:null,contains(){return false;}};
const ctx={
  window:{addEventListener(){},matchMedia:()=>({matches:false,addEventListener(){},addListener(){}})},
  document:{getElementById:()=>stub,createElement:()=>stub,addEventListener(){},documentElement:{style:{setProperty(){},removeProperty(){}},setAttribute(){},removeAttribute(){},getAttribute(){return null;}},querySelector:()=>stub,querySelectorAll:()=>[],body:stub},
  localStorage:{getItem(){return null;},setItem(){},removeItem(){}},navigator:{},location:{origin:'',pathname:'/',search:'',hash:''},history:{replaceState(){}},setTimeout,clearTimeout,console,gtag(){},requestAnimationFrame(){return 0;},cancelAnimationFrame(){},matchMedia:()=>({matches:false,addEventListener(){},addListener(){}}),
};
vm.createContext(ctx);vm.runInContext(src,ctx);
const run=s=>vm.runInContext(s,ctx);
let ok=0,fail=0;const chk=(n,c)=>{if(c){ok++;console.log('  OK   '+n);}else{fail++;console.log('  FAIL '+n);}};

// Lo que pasa fuera del paso de ramos se reemplaza: interesa qué se escribe en S.
run(`var _abiertos=[],_resumen=null,_eventos=[];
  obPasoIncompleto=()=>0;enterApp=()=>{};syncProfile=()=>{};registrarDeclaracionEdad=()=>{};save=()=>{};
  track=(e,p)=>_eventos.push({e,p});
  abrirImportarHorarioBuscacursos=()=>_abiertos.push(S.tenant);
  mostrarRamosCargados=(n,o)=>{_resumen=[n,o];};`);
const sinFoto=run('Object.keys(TENANTS).find(t=>!HORARIO_FOTO_POR_TENANT[t])');

console.log('\n=== Solo en la app y donde sabemos leer el horario ===');
run('obTipo="estudiante";selectedTenant="uc";');
chk('en la web no aparece',run('obFotoHorarioHTML()')==='');
ctx.window.Capacitor={isNativePlatform:()=>true,getPlatform:()=>'ios'};
chk('en la app aparece primero, con su texto',/Sube una foto de tu horario/.test(run('obFotoHorarioHTML()')));
chk('FEN también la tiene',run('selectedTenant="fen";obOfreceFotoHorario()')===true);
chk(`sin lector para ${sinFoto} no se ofrece`,!sinFoto||run(`selectedTenant=${JSON.stringify(sinFoto)};obFotoHorarioHTML()`)==='');
chk('el profesor no la ve',run('selectedTenant="uc";obTipo="profesor";obOfreceFotoHorario()')===false);
chk('sin universidad elegida no se ofrece',run('obTipo="estudiante";selectedTenant=null;obOfreceFotoHorario()')===false);

console.log('\n=== Elegir la foto no carga los sugeridos de la malla ===');
run('S.ramos=[];S.tenant=null;selectedTenant="uc";selectedCarrera=null;selectedCarreraNombre="Sintética";selectedSem=1;obRamos=[{nombre:"Ramo Sugerido Uno",manual:false},{nombre:"Ramo Sugerido Dos",manual:false}];_abiertos=[];_eventos=[];_resumen=null;');
run('obSubirFotoHorario()');
chk('la cuenta queda creada en la universidad elegida',run('S.onboardingDone===true&&S.tenant==="uc"'));
chk('no agrega los ramos premarcados',run('S.ramos.length')===0);
chk('abre la importación por foto con la universidad ya puesta',JSON.stringify(run('_abiertos'))==='["uc"]');
chk('analítica distingue el camino sin texto del estudiante',run('JSON.stringify(_eventos.find(x=>x.e==="onboarding_complete").p)')==='{"semestre":1,"carrera":null,"con_malla":false,"ramos":0,"con_foto":true}');
chk('no muestra el resumen antes de tiempo',run('_resumen')===null);
run('closeModal()');
chk('si cancela, ve el resumen de "agrega tu primer ramo"',JSON.stringify(run('_resumen'))==='[0,0]');

console.log('\n=== Al agregar desde la foto, el resumen cuenta lo que quedó ===');
run('_resumen=null;abrirFotoHorarioOnboarding();S.ramos=[{id:"a",nombre:"Ramo Sintético",categorias:[]}];var _despues=alAgregarRamo;_despues();');
chk('cuenta los ramos del semestre',JSON.stringify(run('_resumen'))==='[1,0]');
run('alAgregarRamo=null;alCancelarAgregarRamo=null;');

console.log('\n=== Cuenta existente: lo que ya tenía no se toca ===');
const previo={id:'x1',nombre:'Ramo Previo',color:'#000',categorias:[{nombre:'Prueba',peso:100,notas:[6.1]}],seccion:3};
run(`S.ramos=[${JSON.stringify(previo)}];S.onboardingDone=false;obRamos=[{nombre:"Ramo Sugerido Uno",manual:false}];`);
run('obSubirFotoHorario()');
chk('conserva el ramo, su pauta, su nota y su sección',run('JSON.stringify(S.ramos)')===JSON.stringify([previo]));

console.log('\n=== Sin foto, el camino de siempre ===');
run('S.ramos=[];obRamos=[{nombre:"Ramo Manual Sintético",manual:true}];_abiertos=[];_resumen=null;completeOnboarding();');
chk('agrega lo marcado y muestra el resumen',run('S.ramos.length')===1&&JSON.stringify(run('_resumen'))==='[1,0]'&&run('_abiertos.length')===0);
delete ctx.window.Capacitor;

console.log(`\n${ok} OK, ${fail} FAIL`);
if(fail)process.exit(1);
