// Quien entra por primera vez con su correo de la UAndes (@miuandes.cl) llega
// al paso 2 del onboarding con la UAndes ya marcada. Se puede cambiar, y una
// cuenta que ya existe nunca cambia de universidad por su correo.
const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const elementos=new Map();
const el=()=>({value:'',innerHTML:'',textContent:'',dataset:{},style:{setProperty(){},removeProperty(){}},classList:{add(){},remove(){},toggle(){},contains(){return false;}},addEventListener(){},appendChild(){},setAttribute(){},removeAttribute(){},getAttribute(){return null},querySelector(){return null},querySelectorAll(){return []},focus(){}});
const porId=id=>{if(!elementos.has(id))elementos.set(id,el());return elementos.get(id);};
const ctx={console,window:{addEventListener(){},matchMedia:()=>({matches:true,addEventListener(){},addListener(){}})},
  document:{getElementById:porId,createElement:el,addEventListener(){},documentElement:el(),body:el(),head:{appendChild(){}},querySelector(){return null},querySelectorAll(){return []}},
  localStorage:{getItem(){return null},setItem(){},removeItem(){}},navigator:{},location:{hash:'',pathname:'/'},history:{replaceState(){}},setTimeout(){return 1},clearTimeout(){}};
vm.createContext(ctx);for(const f of ['data.js','engine.js','app.js','app-session.js'])vm.runInContext(fs.readFileSync(__dirname+'/../'+f,'utf8'),ctx);
const run=s=>vm.runInContext(s,ctx);

for(const [correo,esperado] of [
  ['ana@miuandes.cl','uandes'],['  ANA@MiUandes.CL ','uandes'],
  ['ana@uandes.cl',null],                // académicos: no es el dominio de estudiantes
  ['ana@noesmiuandes.cl',null],['ana@miuandes.cl.evil.com',null],['a@miuandes.cl@gmail.com',null],
  ['ana@gmail.com',null],['',null],[null,null],['miuandes.cl',null],
])assert.equal(run(`tenantPorCorreo(${JSON.stringify(correo)})`),esperado,String(correo));

// Primera vez con correo UAndes: paso 1, con la UAndes ya elegida para el paso 2.
run(`currentUser={email:'ana@miuandes.cl',user_metadata:{full_name:'Ana Pérez'}};enterOnboarding();`);
assert.equal(run('selectedTenant'),'uandes');
assert.equal(run('obStep'),1,'no se salta pasos');
assert.equal(run('obStepValid(2)'),true,'el paso 2 ya está completo');
// Se puede cambiar.
run(`obStep=2;selectTenant('uc')`);assert.equal(run('selectedTenant'),'uc');
// Con otro correo, nada viene marcado.
run(`currentUser={email:'ana@gmail.com'};enterOnboarding();`);
assert.equal(run('selectedTenant'),null);
console.log('OK: el correo @miuandes.cl deja la UAndes marcada en el onboarding');
