// El paso 4 ofrecía 11 semestres fijos: quien iba en 12° de Medicina no tenía
// cómo decirlo. Ahora ofrece 11, o los que tenga la malla de su carrera si son
// más. Las mallas son sintéticas: esto prueba el mecanismo, no el catálogo.
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

// La malla UAndes llega en un archivo diferido. Al entrar al paso 4 sin ella,
// el paso la pide y se repinta cuando llega: sin eso ofrecía 11 en Medicina.
const scripts=[];ctx.document.head.appendChild=s=>scripts.push(s);
run("selectedTenant='uandes';selectedCarrera='DOCE';selectedSem=1;obStep=4;obRender()");
assert.equal(scripts.length,1,'el paso 4 pide la malla diferida');
assert.match(scripts[0].src,/mallas-uandes\.js/);
ctx.MALLAS_UANDES_EXTRA=mallas;run('var MALLAS_UANDES_EXTRA=globalThis.MALLAS_UANDES_EXTRA');
scripts[0].onload();

assert.equal(run("semestresDeCarrera('uandes','DOCE')"),12);
assert.equal(run("semestresDeCarrera('uandes','ONCE')"),11);
assert.equal(run("semestresDeCarrera('uandes','DIEZ')"),11,'nunca menos de 11: hay quien se atrasa');
assert.equal(run("semestresDeCarrera('uandes',null)"),11,'carrera sin malla: 11 como antes');

// Al llegar la malla, el paso 4 dibuja tantos botones como semestres tiene.
const botones=()=>porId('sem-grid').hijos.map(b=>b.textContent);
setImmediate(()=>{
assert.equal(botones().length,12);assert.equal(botones()[11],'12°');
run("selectedSem=12;selectedCarrera='ONCE';obRender()");
assert.equal(botones().length,11);
assert.equal(run('selectedSem'),11,'si la carrera nueva es más corta, no queda un semestre invisible elegido');

// La promesa "tu malla se carga sola" sigue siendo cierta en todo lo ofrecido.
assert.equal(run("mallaCubreTodoElPaso('DOCE')"),true);
assert.equal(run("mallaCubreTodoElPaso('ONCE')"),true,'las de 11 siguen prometiéndolo, como antes');
assert.equal(run("mallaCubreTodoElPaso('DIEZ')"),false);
console.log('OK: el paso 4 ofrece los semestres que tiene la carrera');
});
