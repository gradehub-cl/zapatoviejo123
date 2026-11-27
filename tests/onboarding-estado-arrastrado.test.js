// El borrador del onboarding no se arrastra: ni de una universidad a otra, ni
// de una cuenta a otra en el mismo dispositivo.
//
// 1. Elegir UC → «Ingeniería Comercial» → volver y elegir otra universidad
//    dejaba el nombre declarado: el paso 3 se veía sin nada marcado pero
//    «Continuar» seguía activo, y terminaba con la carrera de la otra U y sin
//    malla aunque la nueva sí la tuviera.
// 2. Cerrar sesión no recarga. La cuenta B que entraba después veía el nombre,
//    apellido y carrera de A, y podía heredar sus ramos agregados a mano.
// El nombre que trae Google o Apple para la cuenta que entra se sigue prellenando.
// Datos sintéticos.
const fs=require('fs'),vm=require('vm');
const elementos=new Map();
const el=()=>({value:'',checked:false,hidden:false,innerHTML:'',textContent:'',disabled:false,dataset:{},style:{setProperty(){},removeProperty(){}},classList:{add(){},remove(){},toggle(){},contains(){return true;}},addEventListener(){},removeEventListener(){},appendChild(){},setAttribute(){},removeAttribute(){},getAttribute(){return null;},querySelector(){return null;},querySelectorAll(){return [];},focus(){},remove(){},closest(){return null;}});
const porId=id=>{if(!elementos.has(id))elementos.set(id,el());return elementos.get(id);};
const almacen=new Map();
const ctx={console:{...console,warn(){}},window:{addEventListener(){},matchMedia:()=>({matches:false,addEventListener(){},addListener(){}})},
  document:{getElementById:porId,createElement:el,addEventListener(){},removeEventListener(){},documentElement:el(),body:el(),head:{appendChild(){}},querySelector(){return null;},querySelectorAll(){return [];},visibilityState:'visible'},
  localStorage:{getItem:k=>almacen.has(k)?almacen.get(k):null,setItem:(k,v)=>almacen.set(k,String(v)),removeItem:k=>almacen.delete(k)},
  navigator:{},location:{origin:'',hash:'',pathname:'/',search:'',reload(){}},history:{replaceState(){}},setTimeout(){return 1;},clearTimeout(){},getComputedStyle:()=>({getPropertyValue:()=>''})};
vm.createContext(ctx);
for(const f of ['data.js','engine.js','app.js','app-session.js'])vm.runInContext(fs.readFileSync(__dirname+'/../'+f,'utf8'),ctx);
const run=s=>vm.runInContext(s,ctx);
run(`track=()=>{};showToast=()=>{};supabaseClient={auth:{signOut:async()=>{}}};`);
const valor=id=>porId(id).value;

let ok=0,fail=0;const chk=(n,c)=>{if(c){ok++;console.log('  OK   '+n);}else{fail++;console.log('  FAIL '+n);}};

(async()=>{
  console.log('=== Cambiar de universidad deja el paso 3 sin elegir ===');
  run(`currentUser={id:'sint-1',email:'sint1@example.com',user_metadata:{}};enterOnboarding();`);
  // Una carrera que existe con el mismo nombre en las dos: el caso que engañaba.
  const comun=run(`(()=>{const uc=carrerasDeclarables('uc').map(c=>c.n);return (carrerasDeclarables('fen').find(c=>uc.includes(c.n))||{}).n||null;})()`);
  chk('hay una carrera con el mismo nombre en UC y FEN para probar', !!comun);
  run(`obStep=2;selectTenant('uc');obStep=3;`);
  run(`{const c=carrerasDeclarables('uc').find(c=>c.n===${JSON.stringify(comun)});selectedCarrera=c.malla||null;selectedCarreraNombre=c.n;}`);
  run(`filtrarCarreras('comer');`);porId('ob-carrera-buscar').value='comer';
  chk('en UC el paso 3 queda respondido', run('obStepValid(3)')===true);
  run(`obStep=2;selectTenant('fen');obStep=3;checkOb();`);
  chk('al cambiar a FEN se olvida el código de la carrera', run('selectedCarrera')===null);
  chk('y también el nombre declarado', !run('selectedCarreraNombre'));
  chk('y la búsqueda de carrera', run('carreraFiltro')===''&&valor('ob-carrera-buscar')==='');
  chk('el paso 3 queda sin responder', run('obStepValid(3)')===false);
  chk('y «Continuar» deshabilitado', porId('ob-next').disabled===true);
  // Elegirla de nuevo en FEN sí trae la malla de FEN.
  run(`{const c=carrerasDeclarables('fen').find(c=>c.n===${JSON.stringify(comun)});selectedCarrera=c.malla||null;selectedCarreraNombre=c.n;}`);
  chk('elegirla en FEN trae la malla de FEN', !!run('selectedCarrera')&&run(`selectedCarrera===(carrerasDeclarables('fen').find(c=>c.n===${JSON.stringify(comun)})||{}).malla`));
  // Tocar otra vez la misma universidad no borra lo elegido.
  const antes=run('selectedCarrera');
  run(`obStep=2;selectTenant('fen');obStep=3;`);
  chk('volver a tocar la misma universidad conserva la carrera', run('selectedCarrera')===antes&&run('selectedCarreraNombre')===comun&&run('obStepValid(3)')===true);

  console.log('\n=== Cerrar sesión y entrar con otra cuenta no hereda nada ===');
  run(`currentUser={id:'sint-a',email:'sinta@miuandes.cl',app_metadata:{provider:'email'},user_metadata:{}};enterOnboarding();`);
  porId('ob-name').value='Nombreuno';porId('ob-apellido').value='Apellidouno';
  run(`obGeneracion=2025;obStep=3;{const c=carrerasDeclarables('uandes')[0];selectedCarrera=c.malla||null;selectedCarreraNombre=c.n;}`);
  run(`carreraFiltro='adm';selectedSem=1;obStep=5;prepararObRamos();obRamos.push({nombre:'Electivo sintético de A',manual:true});`);
  chk('A llegó a los ramos con uno manual', run(`obRamos.some(r=>r.manual)`)&&!!run('obRamosKey'));
  await run('cerrarSesion()');
  run(`currentUser={id:'sint-b',email:'sintb@miuandes.cl',app_metadata:{provider:'email'},user_metadata:{}};enterOnboarding();`);
  chk('B no ve el nombre de A', valor('ob-name')==='');
  chk('ni su apellido', valor('ob-apellido')==='');
  chk('ni su carrera', run('selectedCarrera')===null&&!run('selectedCarreraNombre'));
  chk('ni su búsqueda de carrera', run('carreraFiltro')===''&&valor('ob-carrera-buscar')==='');
  chk('ni sus ramos', run('obRamos.length')===0&&run('obRamosKey')==='');
  chk('el paso 3 de B queda sin responder', run('obStepValid(3)')===false);
  chk('B parte en el paso 1', run('obStep')===1);
  // La universidad del correo de B sigue llegando marcada.
  chk('la universidad por correo de B sigue funcionando', run('selectedTenant')==='uandes');
  // Mismo semestre que A: con la misma clave, antes se saltaba el armado y quedaban los de A.
  run(`obGeneracion=2025;selectedSem=1;obStep=3;{const c=carrerasDeclarables('uandes')[0];selectedCarrera=c.malla||null;selectedCarreraNombre=c.n;}obStep=5;prepararObRamos();`);
  chk('aunque B elija la misma carrera, no hereda los ramos manuales de A', !run(`obRamos.some(r=>r.nombre==='Electivo sintético de A')`));
  chk('S no guardó nada de A', !run('S.userName')&&!run('S.carreraNombre'));

  console.log('\n=== El nombre de Google o Apple de la cuenta que entra se sigue prellenando ===');
  porId('ob-name').value='Nombreuno';porId('ob-apellido').value='Apellidouno';
  await run('cerrarSesion()');
  run(`currentUser={id:'sint-c',email:'sintc@gmail.com',app_metadata:{provider:'google'},user_metadata:{full_name:'Persona Sintética Tres',family_name:'Sintética Tres'}};enterOnboarding();`);
  chk('el nombre es el de la cuenta que entra', valor('ob-name')==='Persona');
  chk('y el apellido también', valor('ob-apellido')==='Sintética Tres');
  run(`obStep=1;obGeneracion=2025;actualizarSemestreCalculado();checkOb();`);
  chk('con el nombre prellenado el paso 1 se puede responder', run('obStepValid(1)')===true);
  await run('cerrarSesion()');
  run(`currentUser={id:'sint-d',email:'sintd@example.com',user_metadata:{full_name:'Otrapersona'}};enterOnboarding();`);
  chk('Apple solo con nombre: lo prellena y no deja el apellido anterior', valor('ob-name')==='Otrapersona'&&valor('ob-apellido')==='');

  console.log(`\nPASS: ${ok}   FAIL: ${fail}`);
  process.exit(fail?1:0);
})().catch(e=>{console.error(e);process.exit(1);});
