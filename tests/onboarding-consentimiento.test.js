// Nombre, edad numérica por tipo de cuenta y aceptación se validan por separado.
const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const leer=f=>fs.readFileSync(__dirname+'/../'+f,'utf8'),html=leer('index.html');
const nuevo=()=>({value:'',checked:false,hidden:false,innerHTML:'',textContent:'',dataset:{},style:{setProperty(){},removeProperty(){}},classList:{add(){},remove(){},toggle(){},contains(){return false}},addEventListener(){},appendChild(){},setAttribute(){},removeAttribute(){},getAttribute(){return null},querySelector(){return null},querySelectorAll(){return []},focus(){},select(){}});
const ids=new Map(),el=id=>{if(!ids.has(id))ids.set(id,nuevo());return ids.get(id)};
const ctx={console,setTimeout,clearTimeout,navigator:{},location:{origin:'',pathname:'/',search:'',hash:''},history:{replaceState(){}},
 window:{addEventListener(){},matchMedia:()=>({matches:false,addEventListener(){},addListener(){}})},
 document:{getElementById:el,createElement:nuevo,addEventListener(){},documentElement:nuevo(),body:nuevo(),querySelector(){return null},querySelectorAll(){return []}},
 localStorage:{getItem(){return null},setItem(){},removeItem(){}}};
vm.createContext(ctx);for(const f of ['data.js','engine.js','app.js','app-session.js'])vm.runInContext(leer(f),ctx,{filename:f});
const run=s=>vm.runInContext(s,ctx);
el('ob-name').value='Persona sintética';run("obTipo='estudiante';obEdad=14");
assert.equal(run('obStepValid(1)'),false,'elegir una edad válida no acepta los términos');
el('ob-legal').checked=true;assert.equal(run('obStepValid(1)'),true);
run('obEdad=13');assert.equal(run('obStepValid(1)'),false);
run('obEdad=null');assert.equal(run('obStepValid(1)'),false);
run('obEdad=true');assert.equal(run('obStepValid(1)'),false,'true no reemplaza la edad numérica');
run("obTipo='profesor';obEdad=17");assert.equal(run('obStepValid(1)'),false);
run('obEdad=18');assert.equal(run('obStepValid(1)'),true);
el('ob-legal').checked=false;assert.equal(run('obStepValid(1)'),false,'ser mayor de edad tampoco acepta términos');
const control=html.match(/<input[^>]*id="ob-legal"[^>]*>/)?.[0];
assert(control&&!/\bchecked\b/.test(control),'la aceptación llega desmarcada');
assert(/id="ob-legal"[\s\S]{0,1000}autorizo[\s\S]{0,500}notas y ramos/i.test(html));
assert(/id="ob-edad-ruleta"/.test(html)&&!/id="ob-edad"/.test(html),'se conserva la ruleta de main');
run('var __cargaOcultada=0;ocultarCargaInicial=()=>{__cargaOcultada++};obIniciar=()=>{};currentUser=null');
el('ob-legal').checked=true;run('enterOnboarding()');
assert.equal(el('ob-legal').checked,false,'otra cuenta no hereda la casilla en esta página');
assert.equal(run('__cargaOcultada'),1,'se mantiene la salida de la pantalla de carga');
console.log('Onboarding: ruleta numérica, estudiante 14/profesor 18, aceptación independiente y cambio de cuenta OK');
