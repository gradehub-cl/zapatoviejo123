// El rótulo «Tu semestre» del paso de ramos solo aparece si hay ramos debajo.
// Ingeniería UC desde 5.º no trae sugeridos: antes quedaba el rótulo solo.
const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const elementos=new Map();
const el=()=>({value:'',innerHTML:'',textContent:'',dataset:{},style:{setProperty(){},removeProperty(){}},classList:{add(){},remove(){},toggle(){},contains(){return false;}},addEventListener(){},appendChild(){},setAttribute(){},removeAttribute(){},querySelector(){return null},querySelectorAll(){return []},focus(){}});
const porId=id=>{if(!elementos.has(id))elementos.set(id,el());return elementos.get(id);};
const ctx={console,window:{addEventListener(){},matchMedia:()=>({matches:true,addEventListener(){},addListener(){}})},
  document:{getElementById:porId,createElement:el,addEventListener(){},documentElement:el(),body:el(),head:{appendChild(){}},querySelector(){return null},querySelectorAll(){return []}},
  localStorage:{getItem(){return null},setItem(){},removeItem(){}},navigator:{},location:{hash:'',pathname:'/'},history:{replaceState(){}},setTimeout(){return 1},clearTimeout(){}};
vm.createContext(ctx);for(const f of ['data.js','engine.js','app.js','app-session.js'])vm.runInContext(fs.readFileSync(__dirname+'/../'+f,'utf8'),ctx);
const run=s=>vm.runInContext(s,ctx);
const html=()=>porId('ob-course-picker').innerHTML;

run("selectedTenant='uc';selectedCarrera='ING-PC';selectedCarreraNombre='Ingeniería Civil';selectedSem=6;obRamos=[];renderObCoursePicker();");
assert.doesNotMatch(html(),/Tu semestre|Sugeridos para/,'sin sugeridos ni elegidos no queda un rótulo vacío');
assert.match(html(),/id="ob-course-search"/,'el buscador sigue ahí');

run("obRamos=[{nombre:'Ramo de prueba',manual:true,sigla:null,creditos:null}];renderObCoursePicker();");
assert.match(html(),/Tu semestre[\s\S]*Ramo de prueba/,'con un ramo elegido, el rótulo vuelve con el ramo debajo');
assert.match(html(),/<label style="[^"]*min-height:44px/,'la fila del ramo se toca en 44 pt');

run("selectedSem=2;obRamos=[];renderObCoursePicker();");
assert.match(html(),/Sugeridos para 2°/,'con malla para el semestre, los sugeridos se muestran');
console.log('OK: el paso de ramos no deja el rótulo «Tu semestre» vacío');
