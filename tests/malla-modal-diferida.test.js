// "Ver mi malla" mira también las mallas que se cargan aparte (MALLAS_*_EXTRA):
// antes solo veía las de data.js y a la UAI le decía que no tenía malla.
const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const elementos=new Map(),scripts=[],toasts=[];
const el=()=>({value:'',innerHTML:'',textContent:'',dataset:{},style:{setProperty(){},removeProperty(){}},classList:{add(){},remove(){},toggle(){},contains(){return false;}},addEventListener(){},appendChild(){},setAttribute(){},removeAttribute(){},getAttribute(){return null},querySelector(){return null},querySelectorAll(){return []},focus(){}});
const porId=id=>{if(!elementos.has(id))elementos.set(id,el());return elementos.get(id);};
const ctx={console,window:{addEventListener(){},matchMedia:()=>({matches:true,addEventListener(){},addListener(){}})},
  document:{getElementById:porId,createElement:el,addEventListener(){},documentElement:el(),body:el(),head:{appendChild:s=>scripts.push(s)},querySelector:q=>q==='.modal-sheet'?el():null,querySelectorAll(){return []},activeElement:null},
  localStorage:{getItem(){return null},setItem(){},removeItem(){}},navigator:{},location:{hash:'',pathname:'/'},history:{replaceState(){}},setTimeout(){return 1},clearTimeout(){},requestAnimationFrame(){}};
vm.createContext(ctx);for(const f of ['data.js','engine.js','app.js','app-session.js'])vm.runInContext(fs.readFileSync(__dirname+'/../'+f,'utf8'),ctx);
const run=s=>vm.runInContext(s,ctx);
run('showToast=m=>__toast(m)');ctx.__toast=m=>toasts.push(m);
(async()=>{
  run("S.tenant='uai';S.carrera='SINTETICA-UAI';S.carreraNombre='Carrera Sintética';S.careerSemestre=2;S.ramos=[{id:'r1',nombre:'Ramo Ya Tomado',categorias:[],gates:[]}];");
  assert.deepEqual(JSON.parse(run('JSON.stringify(mallaFaltantes())')),[],'sin la malla diferida cargada no inventa ramos');
  run('openMallaModal()');
  assert.equal(scripts.length,1,'pide el archivo de mallas antes de decidir');
  assert.equal(scripts[0].src,'mallas-uai.js');
  assert.equal(toasts.length,0,'no avisa "sin malla" mientras carga');
  run("const MALLAS_UAI_EXTRA={'SINTETICA-UAI':{1:['Ramo Primero'],2:['Ramo Ya Tomado','Ramo Sintético A','Ramo Sintético B']}};");
  scripts[0].onload();await Promise.resolve();await Promise.resolve();
  assert.deepEqual(JSON.parse(run('JSON.stringify(mallaFaltantes())')),['Ramo Sintético A','Ramo Sintético B']);
  assert.equal(toasts.length,0,toasts.join());
  const html=porId('modal-content').innerHTML;
  assert.match(html,/Ramo Sintético A/);assert.match(html,/Ramo Sintético B/);
  assert.match(html,/Carrera Sintética/,'el subtítulo usa la carrera declarada');
  run("S.carrera='OTRA-SINTETICA';");run('openMallaModal()');
  assert.equal(scripts.length,1,'con el archivo ya cargado no lo vuelve a pedir');
  assert.match(toasts.at(-1),/Aún no tenemos la malla/);
  console.log('OK: Ver mi malla usa las mallas diferidas y la carrera declarada');
})().catch(e=>{console.error(e);process.exitCode=1;});
