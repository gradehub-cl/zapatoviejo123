// «Usar «…»» deja declarar una carrera que no está en la lista. Si lo escrito
// es el nombre exacto de una de la lista, no se ofrece: sería la misma carrera
// declarada a mano, sin su malla.
const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const elementos=new Map();
const el=()=>{const e={value:'',innerHTML:'',textContent:'',hijos:[],dataset:{},style:{setProperty(){},removeProperty(){}},classList:{add(){},remove(){},toggle(){},contains(){return false;}},addEventListener(){},appendChild(h){e.hijos.push(h);},setAttribute(){},removeAttribute(){},querySelector(){return null},querySelectorAll(){return []},focus(){}};return e;};
const porId=id=>{if(!elementos.has(id))elementos.set(id,el());return elementos.get(id);};
const ctx={console,window:{addEventListener(){},matchMedia:()=>({matches:true,addEventListener(){},addListener(){}})},
  document:{getElementById:porId,createElement:el,addEventListener(){},documentElement:el(),body:el(),head:{appendChild(){}},querySelector(){return null},querySelectorAll(){return []}},
  localStorage:{getItem(){return null},setItem(){},removeItem(){}},navigator:{},location:{hash:'',pathname:'/'},history:{replaceState(){}},setTimeout(){return 1},clearTimeout(){}};
vm.createContext(ctx);for(const f of ['data.js','engine.js','app.js','app-session.js'])vm.runInContext(fs.readFileSync(__dirname+'/../'+f,'utf8'),ctx);
const run=s=>vm.runInContext(s,ctx);
const opciones=filtro=>{porId('carrera-grid').hijos=[];ctx.__f=filtro;run("selectedTenant='uc';selectedCarrera=null;selectedCarreraNombre='';carreraFiltro=__f;initCarreraGrid();");
  return porId('carrera-grid').hijos.map(b=>b.textContent||b.innerHTML);};
const usar=l=>l.filter(t=>/^Usar «/.test(t));

// Se busca por nombre, no por posición: la lista de carreras cambia.
const exacta=run("carrerasDeclarables('uc').find(c=>c.n==='Ingeniería Civil').n");
let l=opciones('ingenieria civil');
assert.ok(l.includes(exacta),'la carrera de la lista aparece aunque se escriba sin tilde');
assert.deepEqual(usar(l),[],'con el nombre exacto no se ofrece «Usar»');
l=opciones('  Ingeniería Civil ');
assert.deepEqual(usar(l),[],'tampoco con espacios o mayúsculas distintas');

l=opciones('ingenieria civ');
assert.ok(l.includes(exacta));
assert.deepEqual(usar(l),['Usar «ingenieria civ»'],'un texto parcial conserva la salida');
l=opciones('Astronomía de prueba');
assert.deepEqual(l,['Usar «Astronomía de prueba»'],'lo que no está en la lista se puede declarar');

// Ajustes arma la misma lista dentro de openSettings: se revisa la fuente.
const ajustes=fs.readFileSync(__dirname+'/../src/app/ajustes.js','utf8');
assert.match(ajustes,/if\(q&&!vistas\.some\(c=>normName\(c\.n\)===q\)\)\{\s*const b=document\.createElement\('button'\);[\s\S]{0,200}Usar «/,'Ajustes aplica la misma regla');
console.log('OK: «Usar» no duplica una carrera de la lista');
