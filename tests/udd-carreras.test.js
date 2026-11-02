// La UDD entra con sus carreras oficiales y las mallas de mallas-udd.js. Lo que
// no puede pasar: que una carrera prometa una malla que no está, que la malla
// traiga casilleros que no son ramos, que el archivo no se pida al elegirla o
// que la UDD herede algo de otra universidad.
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

// El archivo se pide al elegir la UDD, antes de tener la malla en memoria.
run("cargarMallasUC('udd')");
assert.equal(scripts.length,1,'pide la malla diferida');
assert.match(scripts[0].src,/^mallas-udd\.js/);
vm.runInContext(fs.readFileSync(raiz+'mallas-udd.js','utf8'),ctx);
const MU=run('MALLAS_UDD_EXTRA'),udd=run('CARRERAS_DECLARABLES.udd');

assert.ok(run("tenantsVisibles().some(([codigo])=>codigo==='udd')"),'la UDD se ofrece al elegir universidad');
assert.ok(udd.length>=39,'trae la lista oficial completa');
assert.equal(new Set(udd.map(c=>c.n)).size,udd.length,'sin nombres repetidos');

// Ninguna carrera promete una malla que no existe, y ninguna malla queda huérfana.
for(const c of udd.filter(c=>c.malla))assert.ok(MU[c.malla],c.n+' declara '+c.malla+' y no está en mallas-udd.js');
const declaradas=new Set(udd.map(c=>c.malla).filter(Boolean));
for(const k of Object.keys(MU))assert.ok(declaradas.has(k),k+' no la declara ninguna carrera');
assert.equal(udd.filter(c=>!c.malla).map(c=>c.n).sort().join(' | '),
  'Bachillerato en Medicina | Doble Título Ingeniería Comercial + Diseño | Ingeniería Civil Plan Común | Medicina',
  'sin malla quedan solo las que no publican una por semestre');

for(const [k,m] of Object.entries(MU)){
  assert.ok(m[1]&&m[1].length,k+' tiene ramos en 1°');
  for(const [s,ramos] of Object.entries(m)){
    assert.equal(new Set(ramos).size,ramos.length,k+' '+s+'° sin repetidos');
    for(const r of ramos){
      assert.doesNotMatch(r,/^(electivo|optativo|minor|major|menci[oó]n|mag[ií]ster|cr[eé]ditos extra|programa complementario|examen de)|\*|\((ingl[eé]s|verano)\)/i,k+': no es un ramo: '+r);
      // Los casilleros dobles de la línea de habilidades son dos asignaturas.
      assert.doesNotMatch(r,/(Oral|Escrita|Lectura Crítica|Pensamiento Crítico) ?\//,k+': casillero doble sin separar: '+r);
    }
  }
}

// El cargador encuentra la malla de la carrera y solo en la UDD.
assert.ok(run("mallaDeCarrera('udd','UDD-INGENIERIA-COMERCIAL')[1].includes('Álgebra')"),'Comercial 1°');
assert.ok(run("mallaDeCarrera('udd','UDD-ENFERMERIA-CONCEPCION')[2].includes('Lectura Crítica')"),'Concepción tiene su propia Enfermería');
assert.ok(run("mallaDeCarrera('udd','UDD-ENFERMERIA-SANTIAGO')[4].includes('Lectura Crítica')"),'y Santiago la suya');
assert.equal(run("mallaDeCarrera('udd','UDD-MEDICINA')"),null,'Medicina no inventa una malla');
assert.equal(run("mallaDeCarrera('uandes','UDD-DERECHO')"),null,'no se cruza con otra universidad');
assert.equal(run("semestresDeCarrera('udd','UDD-DOBLE-GRADO-INGENIERIA-COMERCIAL-DERECHO')"),12,'el doble grado ofrece sus 12 semestres');

// Sin lista heredada, la UDD no recibe las carreras de la FEN.
assert.deepEqual(Object.keys(run("carrerasFor('udd')")),[],'la UDD no hereda carreras de la FEN');
assert.equal(run("carrerasFor('fen')['IC']"),'Ing. Comercial','la FEN conserva las suyas');

// Sin sigla, el ramo se compara por su nombre normalizado, como en UAI y UAndes.
assert.equal(run(`claveRamoCurso({id:'r1',nombre:'Lectura Crítica',origen:{tenant:'udd',carrera:'UDD-DERECHO',ramoKey:'lectura critica'},categorias:[],gates:[]},'udd')`),'lectura critica');
// Que cada carrera UDD termine el onboarding lo prueba onboarding-todos-entran.
console.log('OK: carreras y mallas UDD oficiales, cargadas solo para la UDD');
