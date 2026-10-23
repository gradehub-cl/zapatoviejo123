// «Nota mínima» y «Simular» se juntaron (Lucas, 2026-10-23): un solo botón, y
// en la hoja del simulador una meta que parte en 4,0 y se ajusta de a 0,1.
// Pautas escritas acá: es un test de mecanismo.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const raiz=path.join(__dirname,'..');
const elementos=new Map();
const el=()=>({style:{setProperty(){},removeProperty(){}},classList:{add(){},remove(){},contains(){return false},toggle(){}},addEventListener(){},
  appendChild(){},setAttribute(){},removeAttribute(){},getAttribute(){return null},querySelector(){return null},querySelectorAll(){return []},
  focus(){},innerHTML:'',textContent:'',value:'',hidden:false,disabled:false,dataset:{}});
const doc={getElementById:id=>{if(!elementos.has(id))elementos.set(id,el());return elementos.get(id);},createElement:el,addEventListener(){},
  documentElement:el(),body:el(),querySelector:()=>null,querySelectorAll:()=>[]};
const ctx={window:{addEventListener(){},matchMedia:()=>({matches:false,addEventListener(){},addListener(){}})},document:doc,
  localStorage:{getItem(){return null},setItem(){},removeItem(){}},navigator:{},location:{origin:'',pathname:'',hash:'',search:''},
  setTimeout,clearTimeout,console,requestAnimationFrame:()=>0,performance:{now:()=>0}};
vm.createContext(ctx);
vm.runInContext(['data.js','engine.js','app.js','render-main.js','render-agenda.js'].map(f=>fs.readFileSync(path.join(raiz,f),'utf8')).join('\n'),ctx);
const run=s=>vm.runInContext(s,ctx);
const ramo=(id,cats)=>({id,nombre:'Ramo sintético',gates:[],categorias:cats.map(([nombre,peso,valor],i)=>({id:id+i,nombre,peso,directNota:true,
  notas:valor==null?[]:[{id:id+'n'+i,nombre,valor,peso:1}]}))});

// 4,5 en la mitad, falta un examen de 50%.
ctx.r=ramo('m',[['Prueba',50,4.5],['Examen',50,null]]);
run('S.ramos=[r];currentRamoId=r.id;openModal=()=>{}');
run('openSimuladorModal()');
assert.equal(run('simMeta'),4,'la meta parte en 4,0: aprobar');
assert.match(doc.getElementById('modal-content').innerHTML,/class="sim-meta" role="group"[\s\S]*aria-label="Bajar la meta"[\s\S]*<output id="sim-meta"[\s\S]*aria-label="Subir la meta"/);
assert.match(doc.getElementById('sim-needed').textContent,/Para el 4,0 necesitas 3,4 en lo que queda/);
run('simCambiarMeta(0.1)');run('simCambiarMeta(0.1)');
assert.equal(run('simMeta'),4.2,'sube de a 0,1');
assert.equal(doc.getElementById('sim-meta').textContent,'4,2');
run('for(let i=0;i<13;i++)simCambiarMeta(0.1)');
assert.equal(run('simMeta'),5.5);
assert.match(doc.getElementById('sim-needed').textContent,/Para el 5,5 necesitas 6,4 en lo que queda/,'la nota necesaria sigue a la meta (5,45 ya redondea a 5,5)');
run('for(let i=0;i<30;i++)simCambiarMeta(0.1)');
assert.equal(run('simMeta'),7,'no pasa de 7,0');
assert.equal(doc.getElementById('sim-meta-mas').disabled,true,'y el + se apaga');
assert.match(doc.getElementById('sim-needed').textContent,/Con esto ya no alcanzas el 7,0/,'una meta imposible no se disfraza de alcanzable');
run('for(let i=0;i<80;i++)simCambiarMeta(-0.1)');
assert.equal(run('simMeta'),1,'no baja de 1,0');
assert.equal(doc.getElementById('sim-meta-menos').disabled,true);
run('openSimuladorModal()');
assert.equal(run('simMeta'),4,'al volver a abrir, la meta vuelve a 4,0: no se guarda');

// Una compuerta activa con tope 3,9 no impide una meta bajo el tope.
ctx.g=ramo('g',[['Prueba',50,2.0],['Examen',50,null]]);
run(`g.gates=[{type:'min_grade_required',catId:'g0',min:3,cap:3.9,nombre:'Prueba'}];S.ramos=[g];currentRamoId=g.id;simState={};simAusencias={}`);
assert.match(run('simNotaNecesaria(simProjectedRamo(g),4)').texto,/Con esto ya no alcanzas el 4,0/,'sobre el tope, no alcanza');
assert.doesNotMatch(run('simNotaNecesaria(simProjectedRamo(g),3.5)').texto,/ya no alcanzas/,'bajo el tope, sí');

// Descarte con cantidad abierta: no se inventa un número (era de la calculadora).
ctx.d={id:'d',nombre:'Ramo sintético',gates:[],categorias:[
  {id:'d0',nombre:'Controles',peso:50,dropLowest:{count:1},notas:[{id:'c1',nombre:'Control 1',valor:3,peso:1}]},
  {id:'d1',nombre:'Examen',peso:50,directNota:true,notas:[]}]};
run('S.ramos=[d];currentRamoId=d.id;simState={};simAusencias={}');
assert.match(run('simNotaNecesaria(simProjectedRamo(d),4)').texto,/No calculamos una nota exacta mientras falte saber cuántas evaluaciones de Controles habrá/);

// La ficha ya no tiene el botón aparte.
assert.doesNotMatch(fs.readFileSync(path.join(raiz,'index.html'),'utf8'),/id="calc-btn"|openCalculadoraModal/);
assert.equal(run('typeof openCalculadoraModal'),'undefined');
console.log('OK simular con meta: parte en 4,0, sube y baja de a 0,1, no se guarda, y cubre lo que hacía «Nota mínima»');
