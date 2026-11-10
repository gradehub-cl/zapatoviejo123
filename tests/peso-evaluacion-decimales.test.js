// La ponderación de una evaluación acepta decimales: abrir una de 33,33% y
// guardar no puede dejarla en 33.
const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const path=require('path');
const root=process.env.GRADEHUB_ROOT||(process.env.GRADEHUB_APP?path.dirname(process.env.GRADEHUB_APP):path.join(__dirname,'..'));
const els=new Map();
const element=()=>({style:{setProperty(){},removeProperty(){}},classList:{add(){},remove(){},contains(){return false},toggle(){}},addEventListener(){},appendChild(){},setAttribute(){},removeAttribute(){},getAttribute(){return null},querySelectorAll(){return []},querySelector(){return null},focus(){},select(){},value:'',innerHTML:'',textContent:'',dataset:{},clientWidth:375});
const store=new Map();
const ctx={console,window:{addEventListener(){},matchMedia:()=>({matches:true,addEventListener(){},addListener(){}})},document:{getElementById:id=>{if(!els.has(id))els.set(id,element());return els.get(id)},createElement:element,addEventListener(){},documentElement:element(),body:element(),querySelector(){return null},querySelectorAll(){return []}},localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k)},navigator:{},location:{origin:'',pathname:'/',hash:''},history:{replaceState(){}},setTimeout(){return 1},clearTimeout(){},requestAnimationFrame(){}};
vm.createContext(ctx);
for(const f of ['data.js','engine.js','app.js'])vm.runInContext(fs.readFileSync(root+'/'+f,'utf8'),ctx,{filename:f});

assert.match(ctx.pesoControlHTML(33.333333),/id="m-cat-peso-num" value="33,33"/);
assert.match(ctx.pesoControlHTML(25),/id="m-cat-peso-num" value="25"/);
for(const [txt,esperado] of [['33,33',33.33],['12.5',12.5],['40',40],['7,125',7.13]]){
  ctx.document.getElementById('m-cat-peso-num').value=txt;
  assert.equal(ctx.readPesoControl(30),esperado,txt);
}
ctx.document.getElementById('m-cat-peso-num').value='';
ctx.document.getElementById('m-cat-peso').value='';
assert.equal(ctx.readPesoControl(33.33),33.33,'vacío conserva el peso guardado');
console.log('peso-evaluacion-decimales OK');
