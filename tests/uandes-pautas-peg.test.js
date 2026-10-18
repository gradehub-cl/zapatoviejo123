const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const path=require('path');
const root=process.env.GRADEHUB_ROOT||(process.env.GRADEHUB_APP?path.dirname(process.env.GRADEHUB_APP):path.join(__dirname,'..'));
function sandbox(){
  const store=new Map(),elements=new Map();
  const element=()=>({style:{setProperty(){},removeProperty(){}},classList:{add(){},remove(){},contains(){return false},toggle(){}},addEventListener(){},appendChild(){},setAttribute(){},removeAttribute(){},getAttribute(){return null},querySelectorAll(){return []},querySelector(){return null},focus(){},select(){},value:'',innerHTML:'',textContent:'',dataset:{},clientWidth:375});
  const ctx={console,window:{addEventListener(){},matchMedia:()=>({matches:true,addEventListener(){},addListener(){}})},document:{getElementById:id=>{if(!elements.has(id))elements.set(id,element());return elements.get(id)},createElement:element,addEventListener(){},documentElement:element(),body:element(),querySelector(){return null},querySelectorAll(){return []}},localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k)},navigator:{},location:{origin:'',pathname:'/',hash:''},history:{replaceState(){}},setTimeout(){return 1},clearTimeout(){},requestAnimationFrame(){}};
  vm.createContext(ctx);
  for(const f of ['data.js','engine.js','app.js','app-session.js','render-main.js','render-agenda.js'])vm.runInContext(fs.readFileSync(root+'/'+f,'utf8'),ctx,{filename:f});
  ctx.run=s=>vm.runInContext(s,ctx);return ctx;
}
const note=(id,valor,slot)=>({id,nombre:id,valor,peso:1,...(slot===undefined?{}:{slot})});
const cat=(id,peso,notas=[],extra={})=>({id,nombre:id,peso,notas,directNota:true,...extra});
const course=(id,categorias,extra={})=>({id,nombre:id,categorias,creditos:10,origen:null,gates:[],...extra});

// Pautas PEG UAndes 2026-2: integridad de los datos y que la compuerta del
// art. 27 llegue al ramo. Se busca por nombre, no por índice (AGENTS.md).
const app=sandbox();
app.run("S.tenant='uandes'");
const P=app.run('PRESETS_UANDES');
const nombres=Object.keys(P);
assert.ok(nombres.length>=45,'las pautas PEG están');
for(const n of nombres){
  const ev=P[n].evals;
  assert.equal(Math.round(ev.reduce((s,e)=>s+e[1],0)*1e6)/1e6,100,n+' suma 100');
  const examen=ev.map(e=>e[0]).find(x=>/^examen/i.test(x));
  const g=(P[n].grupos||[])[0];
  if(examen){
    assert.ok(g&&g.exacto===true&&g.min===3&&g.cap==='self',n+': compuerta del art. 27');
    assert.deepEqual(g.evals,ev.map(e=>e[0]).filter(x=>x!==examen),n+': la presentación es todo menos el examen');
  }else assert.equal(g,undefined,n+': sin examen no hay compuerta');
}
// Las que dejan la mitad o más en grupos sin cantidad no se ofrecen.
const sinCargar=nombres.filter(n=>app.run(`presetRamo(${JSON.stringify(n)},'uandes',null)`)===null).sort();
assert.deepEqual(sinCargar,['Arte y Política','Mundo, Trabajo y Redención','Sismología y Vulcanología','Textos de Grandes Científicos'].sort());
assert.ok(app.run("presetsFueraDeMalla('uandes',null)").includes('Los Vicios Capitales'),'se ofrecen en el buscador');

// De punta a punta: ensayos 2,9 y 3,0 (presentación 2,95) y un 7 en el examen.
app.run(`(()=>{const p=presetRamo('Los Vicios Capitales','uandes',null);
  const [ens,ex]=p.categorias;
  ens.notas=[{id:'a',nombre:'Ensayo 1',valor:2.9,peso:1,slot:0},{id:'b',nombre:'Ensayo 2',valor:3.0,peso:1,slot:1}];
  ex.notas=[{id:'c',nombre:'Examen',valor:7,peso:1}];
  globalThis.r={id:'r',nombre:'Los Vicios Capitales',categorias:p.categorias,gates:p.gates,origen:{tenant:'uandes'}};
  S.ramos=[r];})()`);
assert.equal(app.run('r.gates[0].exacto'),true,'la marca llega al ramo');
assert.equal(app.run('notaFinalOficial(ramoAvg(r))'),3.0,'reprueba con la nota de presentación');
assert.equal(app.run('notaAprobadaRamo(r,ramoAvg(r))'),false);
console.log('OK: pautas PEG UAndes íntegras y con la compuerta del art. 27');
