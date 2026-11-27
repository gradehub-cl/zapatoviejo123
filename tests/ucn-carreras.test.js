// La UCN entra con las tres carreras de la Escuela de Ingeniería en Coquimbo y
// las mallas de mallas-ucn.js. Lo que no puede pasar: que una carrera prometa
// una malla que no está, que la malla traiga casilleros que no son ramos o
// nombres pegados («ÁlgebraI», como vienen en algunos PDF), que el archivo no se
// pida al elegirla, o que el resto de la UCN quede sin poder declararse.
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

// El archivo se pide al elegir la UCN, antes de tener la malla en memoria.
run("cargarMallasUC('ucn')");
assert.equal(scripts.length,1,'pide la malla diferida');
assert.match(scripts[0].src,/^mallas-ucn\.js/);
vm.runInContext(fs.readFileSync(raiz+'mallas-ucn.js','utf8'),ctx);
const MU=run('MALLAS_UCN_EXTRA'),ucn=run('CARRERAS_DECLARABLES.ucn');

assert.ok(run("tenantsVisibles().some(([codigo])=>codigo==='ucn')"),'la UCN se ofrece al elegir universidad');
assert.equal(ucn.length,3,'las tres carreras de Ingeniería en Coquimbo');
assert.ok(ucn.every(c=>/\(Coquimbo\)$/.test(c.n)),'llevan la sede: Antofagasta dicta carreras del mismo nombre');

// Ninguna carrera promete una malla que no existe, y ninguna malla queda huérfana.
for(const c of ucn)assert.ok(MU[c.malla],c.n+' declara '+c.malla+' y no está en mallas-ucn.js');
assert.equal(Object.keys(MU).sort().join(),ucn.map(c=>c.malla).sort().join(),'sin mallas que nadie declara');

for(const [k,m] of Object.entries(MU)){
  assert.ok(m[1]&&m[1].length,k+' tiene ramos en 1°');
  const todos=Object.values(m).flat();
  assert.equal(new Set(todos).size,todos.length,k+' no repite un ramo en dos semestres');
  for(const r of todos){
    assert.doesNotMatch(r,/^(electivo|formaci[oó]n general electiva|pr[aá]ctica profesional)/i,k+': no es un ramo: '+r);
    // Los PDF de una carrera traen los nombres sin espacios; «IoT» es el único legítimo.
    assert.doesNotMatch(r.replace('IoT',''),/[a-záéíóúñ,][A-ZÁÉÍÓÚÑ]/,k+': nombre pegado: '+r);
  }
}
// La formación general es la misma en las tres y va con un solo nombre.
for(const ramo of ['Identidad, Universidad, Equidad y Género','Inglés I','Inglés II','Comunicación Efectiva I','Comunicación Efectiva II','Diálogo, Fe y Cultura','Diálogo, Fe y Ciencia','Ética y Moral Profesional'])
  for(const [k,m] of Object.entries(MU))assert.ok(Object.values(m).flat().includes(ramo),k+' trae '+ramo);

// El cargador encuentra la malla de la carrera y solo en la UCN.
assert.ok(run("mallaDeCarrera('ucn','UCN-COQ-ICI')[2].includes('Mecánica')"),'Industrial 2° trae Mecánica, como el folleto');
assert.equal(run("mallaDeCarrera('ucn','UCN-COQ-ICI')[9]"),undefined,'9° de Industrial son solo electivos: no se inventa');
assert.ok(run("semestresDeCarrera('ucn','UCN-COQ-ICCI')")>=10,'ofrece al menos los 10 semestres de la carrera');
assert.equal(run("mallaDeCarrera('udd','UCN-COQ-ICI')"),null,'no se cruza con otra universidad');
assert.equal(run("mallaDeCarrera('ucn','UDD-DERECHO')"),null);

// La búsqueda por sigla o nombre corto encuentra la carrera.
assert.ok(run("carrerasDeclarables('ucn').some(c=>c.malla==='UCN-COQ-ICI'&&coincideBusquedaCarrera(c,'industrial'))"));
assert.ok(run("carrerasDeclarables('ucn').some(c=>c.malla==='UCN-COQ-ITI'&&coincideBusquedaCarrera(c,'iti'))"));

// El resto de la UCN no queda encerrado: sin lista heredada de la FEN, y una
// universidad vecina sin catálogo sigue sin carreras inventadas.
assert.equal(Object.keys(run("carrerasFor('ucn')")).length,0,'la UCN no hereda carreras de la FEN');
assert.equal(run("carrerasDeclarables('usach').length"),0,'la USACH sigue con registro básico');
console.log('OK UCN: 3 carreras de Coquimbo, '+Object.values(MU).reduce((n,m)=>n+Object.values(m).flat().length,0)+' ramos en malla, carga diferida y sin cruces');
