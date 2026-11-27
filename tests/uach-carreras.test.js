// La UACh entra con Derecho y la malla de mallas-uach.js. Lo que no puede pasar:
// que la carrera prometa una malla que no está, que la malla traiga optativos o
// el examen de licenciatura como si fueran ramos, o que el archivo no se pida al
// elegirla.
const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const raiz=__dirname+'/../';
const el=()=>({style:{setProperty(){},removeProperty(){}},classList:{add(){},remove(){},toggle(){},contains(){return false;}},
  addEventListener(){},appendChild(){},setAttribute(){},removeAttribute(){},getAttribute(){return null},
  querySelector(){return null},querySelectorAll(){return []},focus(){},value:'',innerHTML:'',textContent:'',dataset:{}});
const scripts=[];
const ctx={console,setTimeout(){return 1},clearTimeout(){},
  window:{addEventListener(){},matchMedia:()=>({matches:true,addEventListener(){},addListener(){}})},
  document:{getElementById:el,createElement:el,addEventListener(){},documentElement:el(),body:el(),
    head:{appendChild:s=>scripts.push(s)},querySelector(){return null},querySelectorAll(){return []}},
  localStorage:{getItem(){return null},setItem(){},removeItem(){}},navigator:{},location:{hash:'',pathname:'/'},history:{replaceState(){}}};
vm.createContext(ctx);
for(const f of ['data.js','engine.js','app.js','app-session.js'])vm.runInContext(fs.readFileSync(raiz+f,'utf8'),ctx);
const run=s=>vm.runInContext(s,ctx);

// El archivo se pide al elegir la UACh, antes de tener la malla en memoria.
run("cargarMallasUC('uach')");
assert.equal(scripts.length,1,'pide la malla diferida');
assert.match(scripts[0].src,/^mallas-uach\.js/);
vm.runInContext(fs.readFileSync(raiz+'mallas-uach.js','utf8'),ctx);
const MA=run('MALLAS_UACH_EXTRA'),uach=run('CARRERAS_DECLARABLES.uach');

assert.ok(run("tenantsVisibles().some(([codigo])=>codigo==='uach')"),'la UACh se ofrece al elegir universidad');
assert.equal(uach.length,1);
assert.equal(uach[0].n,'Derecho');
assert.equal(Object.keys(MA).join(),uach[0].malla,'una malla, la que declara la carrera');

const m=MA['UACH-DERECHO'],todos=Object.values(m).flat();
assert.equal(Object.keys(m).join(),'1,2,3,4,5,6,7,8,9','nueve semestres con ramos: el 10° es solo el examen de licenciatura');
assert.equal(todos.length,51,'58 casilleros menos 6 optativos y el examen de licenciatura');
assert.equal(new Set(todos).size,todos.length,'sin repetidos');
for(const r of todos)assert.doesNotMatch(r,/^(optativo|examen de licenciatura)|\*/i,'no es un ramo: '+r);
for(const r of ['Educación Física y Salud','Redacción de Contratos','Pasantía Profesional','Teoría del Delito, del Sujeto Responsable y de la Pena'])assert.ok(todos.includes(r),'trae '+r);
assert.ok(m[6].includes('Redacción de Instrumentos Administrativos'),'en 6°, como la página y la malla; su programa dice 7°');

// El cargador encuentra la malla y solo en la UACh.
assert.ok(run("mallaDeCarrera('uach','UACH-DERECHO')[3].includes('Acto Jurídico')"));
assert.equal(run("mallaDeCarrera('pucv','UACH-DERECHO')"),null,'no se cruza con otra universidad');
assert.equal(run("mallaDeCarrera('uach','UDD-DERECHO')"),null,'ni recibe el Derecho de otra');
assert.equal(Object.keys(run("carrerasFor('uach')")).length,0,'la UACh no hereda carreras de la FEN');
console.log('OK UACh: Derecho, '+todos.length+' ramos en 9 semestres, carga diferida y sin cruces');
