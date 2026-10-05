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

const ctx=sandbox(),plain=x=>JSON.parse(JSON.stringify(x));
const at=new Date('2026-10-05T12:00:00Z');
const expected={
 'Contabilidad Gerencial':[20,24,24,32],
 'Empresas y Legislación':[30,30,40],
 'Estrategia Competitiva':[10,10,23,23,34],
 'Ética, Economía y Empresa':[20,20,25,35],
 'Marketing Analytics':[40,10,10,20,4,6,10],
};
const defs=ctx.run('PRESETS_UC');
for(const [nombre,pesos] of Object.entries(expected)){
 const p=ctx.presetRamo(nombre,'uc','COM',at),def=defs[nombre];
 assert.ok(p,nombre+' debe estar disponible para Comercial');
 assert.deepEqual(plain(p.categorias.map(c=>c.peso)),pesos);
 assert.equal(p.categorias.reduce((s,c)=>s+c.peso,0),100);
 assert.equal(p.periodo,'2026-2');
 assert.ok(p.categorias.every(c=>!c.notas.length));
 assert.ok(ctx.presetRamo(nombre,'uc','COM',new Date('2027-03-01')).categorias.every(c=>!c.fecha));
 assert.ok(def.reglasDelCurso.some(r=>r.includes('2026-2')));
 // Reading an existing account must preserve its personalized notes and weights.
 const old={id:'guardado',nombre,origen:{tenant:'uc',carrera:'COM'},categorias:[{id:'personal',nombre:'Mi evaluación',peso:100,notas:[{id:'nota',nombre:'Nota',valor:5.8,peso:1}]}],gates:[]};
 const loaded=ctx.normalize({tenant:'uc',carrera:'COM',ramos:[old]}).ramos[0];
 assert.equal(loaded.categorias.length,1);
 assert.equal(loaded.categorias[0].peso,100);
 assert.equal(loaded.categorias[0].notas[0].valor,5.8);
}
const dates={
 'Contabilidad Gerencial':['2026-10-05','2026-11-09','2026-12-12'],
 'Empresas y Legislación':['2026-09-26','2026-11-03','2026-12-02'],
 'Ética, Economía y Empresa':['2026-09-10','2026-10-26','2026-12-14'],
 'Marketing Analytics':['2026-09-30','2026-11-05','2026-12-11','2026-11-24'],
};
for(const [nombre,fechas] of Object.entries(dates)){
 const p=ctx.presetRamo(nombre,'uc','COM',at);
 assert.deepEqual(plain(p.categorias.filter(c=>c.fecha).map(c=>c.fecha)),fechas);
}
const estrategia=ctx.presetRamo('Estrategia Competitiva','uc','COM',at);
assert.ok(estrategia.categorias.every(c=>!c.fecha),'No inventa fechas de Estrategia');
const actividades=estrategia.categorias.find(c=>c.nombre==='Actividades');
assert.equal(actividades.slots,4);
actividades.notas=[1,4,5,6].map((valor,slot)=>({id:'act'+slot,nombre:'Actividad',valor,peso:1,slot}));
const est={id:'est',nombre:'Estrategia Competitiva',categorias:estrategia.categorias,gates:[]};
ctx.est=est;
assert.equal(ctx.run('calculateFinalGrade(ramoToStructure(est),gradesOf(est)).breakdown.find(b=>b.id===est.categorias[1].id).value'),5);
assert.ok(defs['Estrategia Competitiva'].noCalcula.some(r=>r.includes('3,75')));
assert.ok(defs['Contabilidad Gerencial'].noCalcula.some(r=>r.includes('3,8')));
assert.ok(defs['Contabilidad Gerencial'].noCalcula.some(r=>r.includes('puntos')));
const etica=ctx.presetRamo('Ética, Economía y Empresa','uc','COM',at);
assert.equal(etica.categorias.find(c=>c.nombre==='Actividades participativas').slots,5);
assert.equal(defs['Ética, Economía y Empresa'].sigla,'ETI209');
// Bounded transfers cannot be represented safely by unconditional absence rules.
assert.equal(etica.reglasAusenciaJustificada,null);
assert.equal(ctx.presetRamo('Empresas y Legislación','uc','COM',at).reglasAusenciaJustificada,null);
const marketing=ctx.presetRamo('Marketing Analytics','uc','COM',at);
assert.equal(marketing.categorias[0].slots,3);
assert.equal(marketing.gates.length,1);
const m={id:'marketing',nombre:'Marketing Analytics',categorias:marketing.categorias,gates:marketing.gates};
function technical(value){
 m.categorias.forEach(c=>{c.notas=[{id:'nota-'+c.id,nombre:'Nota',valor:/^(Prueba|Examen)/.test(c.nombre)?value:7,peso:1}];});
 return ctx.ramoAvg(m);
}
assert.ok(technical(3.94)<=3.9,'3,94 redondea a 3,9 y reprueba competencias técnicas');
assert.ok(technical(3.96)>4,'3,96 redondea a 4,0 y no reprueba por comparar con 4 crudo');
assert.ok(technical(3.95)>4,'El límite 3,95 sí cumple');
// Renamed exam categories preserve notes on explicit update; unmatchable old
// groups stay at 0%, rather than inventing which regular test a note belongs to.
const old={categorias:[{id:'ex',nombre:'Examen final escrito',peso:30,notas:[{id:'vieja',nombre:'Nota',valor:6,peso:1}]},{id:'group',nombre:'Pruebas y controles',peso:30,notas:[{id:'grupo',nombre:'Nota',valor:5,peso:1}]}]};
ctx.old=old;ctx.newCats=ctx.presetRamo('Contabilidad Gerencial','uc','COM',at).categorias;
ctx.run('fusionarPauta(old,newCats)');
assert.equal(old.categorias.find(c=>c.nombre==='Examen').notas[0].id,'vieja');
assert.equal(old.categorias.find(c=>c.id==='group').peso,0);
assert.equal(old.categorias.find(c=>c.id==='group').notas[0].id,'grupo');
console.log('Programas UC 2026-2: cinco pautas, fechas, descarte, redondeo y conservación de notas verificados');
