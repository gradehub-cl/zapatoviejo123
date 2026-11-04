// El paso 4 ofrecía 11 semestres fijos: quien iba en 12° de Medicina no tenía
// cómo decirlo. Ahora la carrera manda: 11, o los que tenga su malla si son
// más. Desde 2026-11-03 el semestre se pregunta en el paso 1, antes de saber la
// carrera, y el paso 5 lo ajusta. Las mallas son sintéticas: esto prueba el
// mecanismo, no el catálogo.
const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const elementos=new Map();
const el=()=>{const e={value:'',innerHTML:'',textContent:'',dataset:{},hijos:[],style:{setProperty(){},removeProperty(){}},classList:{add(){},remove(){},toggle(){},contains(){return false;}},addEventListener(){},setAttribute(){},removeAttribute(){},getAttribute(){return null},querySelector(){return null},querySelectorAll(){return []},focus(){}};
  e.appendChild=h=>e.hijos.push(h);Object.defineProperty(e,'innerHTML',{get(){return ''},set(v){if(v==='')e.hijos=[];}});return e;};
const porId=id=>{if(!elementos.has(id))elementos.set(id,el());return elementos.get(id);};
const ctx={console,window:{addEventListener(){},matchMedia:()=>({matches:true,addEventListener(){},addListener(){}})},
  document:{getElementById:porId,createElement:el,addEventListener(){},documentElement:el(),body:el(),head:{appendChild(){}},querySelector(){return null},querySelectorAll(){return []}},
  localStorage:{getItem(){return null},setItem(){},removeItem(){}},navigator:{},location:{hash:'',pathname:'/'},history:{replaceState(){}},setTimeout(){return 1},clearTimeout(){}};
vm.createContext(ctx);for(const f of ['data.js','engine.js','app.js','app-session.js'])vm.runInContext(fs.readFileSync(__dirname+'/../'+f,'utf8'),ctx);
const run=s=>vm.runInContext(s,ctx);
const malla=n=>Object.fromEntries(Array.from({length:n},(_,i)=>[i+1,['Ramo '+(i+1)]]));
const mallas={DOCE:malla(12),ONCE:malla(11),DIEZ:malla(10)};

// La malla UAndes llega en un archivo diferido; se pide y se usa al llegar.
const scripts=[];ctx.document.head.appendChild=s=>scripts.push(s);
run("selectedTenant='uandes';selectedCarrera=null;selectedSem=1;obSemManual=false;obVerano=false;obSemInvalido=false");
// En el paso 1 no hay carrera: se acepta hasta 14, para no dejar fuera a nadie.
assert.equal(run('semestresOfrecidos()'),14);
run("escribirSemestreOnboarding('12')");
assert.equal(run('selectedSem'),12,'quien va en 12° lo puede decir antes de elegir carrera');
assert.equal(run('obSemInvalido'),false);
run("cargarMallasUC('uandes')");
assert.equal(scripts.length,1,'la malla diferida se pide');
assert.match(scripts[0].src,/mallas-uandes\.js/);
ctx.MALLAS_UANDES_EXTRA=mallas;run('var MALLAS_UANDES_EXTRA=globalThis.MALLAS_UANDES_EXTRA');
scripts[0].onload();
assert.equal(run("semestresDeCarrera('uandes','DOCE')"),12);
assert.equal(run("semestresDeCarrera('uandes','ONCE')"),11);
assert.equal(run("semestresDeCarrera('uandes','DIEZ')"),11,'nunca menos de 11: hay quien se atrasa');
assert.equal(run("semestresDeCarrera('uandes',null)"),11,'carrera sin malla: 11 como antes');

setImmediate(()=>{
// El paso 5 ajusta: lo elegido a mano se conserva si cabe, y se recorta si no.
run("selectedCarrera='DOCE';ajustarSemestreACarrera()");
assert.equal(run('selectedSem'),12,'Medicina de 12: el 12° elegido se queda');
run("selectedCarrera='ONCE';ajustarSemestreACarrera()");
assert.equal(run('selectedSem'),11,'si la carrera es más corta, no queda un semestre que no existe');
// Lo calculado por la generación se recalcula con la carrera.
run(`obSemManual=false;obGeneracion=${new Date().getFullYear()}-8;selectedCarrera='DOCE';ajustarSemestreACarrera()`);
assert.equal(run('selectedSem'),Math.min(12,run(`semestreSegunGeneracion(${new Date().getFullYear()}-8)`)));
// Y el paso 5 lo hace antes de sugerir ramos.
assert.match(fs.readFileSync(__dirname+'/../app.js','utf8'),/if\(obStep===5\)\{[^}]*ajustarSemestreACarrera\(\);prepararObRamos\(\);\}/);

// La promesa "tu malla se carga sola" sigue siendo cierta en todo lo ofrecido.
assert.equal(run("mallaCubreTodoElPaso('DOCE')"),true);
assert.equal(run("mallaCubreTodoElPaso('ONCE')"),true,'las de 11 siguen prometiéndolo, como antes');
assert.equal(run("mallaCubreTodoElPaso('DIEZ')"),false);
console.log('OK: el semestre se ajusta a los que tiene la carrera');
});
