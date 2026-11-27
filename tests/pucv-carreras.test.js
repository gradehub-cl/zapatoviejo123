// La PUCV entra con Ingeniería Civil y la malla de mallas-pucv.js. Lo que no
// puede pasar: que la carrera prometa una malla que no está, que la malla traiga
// casilleros que no son ramos, que el archivo no se pida al elegirla, o que
// quien estudia otra ingeniería civil de la PUCV caiga en esta por el nombre.
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

// El archivo se pide al elegir la PUCV, antes de tener la malla en memoria.
run("cargarMallasUC('pucv')");
assert.equal(scripts.length,1,'pide la malla diferida');
assert.match(scripts[0].src,/^mallas-pucv\.js/);
vm.runInContext(fs.readFileSync(raiz+'mallas-pucv.js','utf8'),ctx);
const MP=run('MALLAS_PUCV_EXTRA'),pucv=run('CARRERAS_DECLARABLES.pucv');

assert.ok(run("tenantsVisibles().some(([codigo])=>codigo==='pucv')"),'la PUCV se ofrece al elegir universidad');
assert.equal(pucv.length,1);
assert.equal(pucv[0].n,'Ingeniería Civil');
assert.equal(Object.keys(MP).join(),pucv[0].malla,'una malla, la que declara la carrera');

const m=MP['PUCV-INGENIERIA-CIVIL'],todos=Object.values(m).flat();
assert.equal(Object.keys(m).join(),'1,2,3,4,5,6,7,8,9,10,11','los 11 semestres del plan');
assert.equal(todos.length,49,'56 ramos del plan menos 4 electivos y 3 de formación fundamental');
assert.equal(new Set(todos).size,todos.length,'sin repetidos');
for(const r of todos)assert.doesNotMatch(r,/^(electivo|formaci[oó]n fundamental)/i,'no es un ramo: '+r);
for(const r of ['Inglés 1','Inglés 4','Antropología Cristiana','Ética Cristiana','Diseño en Acero'])assert.ok(todos.includes(r),'trae '+r);

// El cargador encuentra la malla y solo en la PUCV.
assert.ok(run("mallaDeCarrera('pucv','PUCV-INGENIERIA-CIVIL')[1].includes('Desafíos en Ingeniería Civil')"));
assert.equal(run("semestresDeCarrera('pucv','PUCV-INGENIERIA-CIVIL')"),11);
assert.equal(run("mallaDeCarrera('ucn','PUCV-INGENIERIA-CIVIL')"),null,'no se cruza con otra universidad');
assert.equal(run("mallaDeCarrera('pucv','UCN-COQ-ICI')"),null);

// Buscar otra ingeniería civil no devuelve esta: el nombre buscado es más largo.
for(const q of ['Ingeniería Civil Industrial','Ingeniería Civil Informática','Ingeniería Civil Química'])
  assert.equal(run(`carrerasDeclarables('pucv').filter(c=>coincideBusquedaCarrera(c,${JSON.stringify(q)})).length`),0,q+' no cae en Ingeniería Civil');
assert.equal(run("carrerasDeclarables('pucv').filter(c=>coincideBusquedaCarrera(c,'obras civiles')).length"),1);
assert.equal(Object.keys(run("carrerasFor('pucv')")).length,0,'la PUCV no hereda carreras de la FEN');
console.log('OK PUCV: Ingeniería Civil, '+todos.length+' ramos en 11 semestres, carga diferida y sin cruces');
