// Transcripción de los programas de Medicina UC recibidos el 2026-11-25.
const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const raiz=__dirname+'/../',ids=new Map();
const elemento=()=>({style:{setProperty(){},removeProperty(){}},classList:{add(){},remove(){},contains(){return false},toggle(){}},addEventListener(){},appendChild(){},setAttribute(){},removeAttribute(){},getAttribute(){return null},querySelectorAll(){return[]},querySelector(){return null},dataset:{},children:[],innerHTML:'',textContent:'',value:''});
const ctx={console,window:{addEventListener(){},matchMedia:()=>({matches:true,addEventListener(){},addListener(){}})},document:{getElementById:id=>{if(!ids.has(id))ids.set(id,elemento());return ids.get(id)},createElement:elemento,addEventListener(){},querySelectorAll(){return[]},querySelector(){return null},body:elemento(),head:elemento(),documentElement:elemento()},localStorage:{getItem(){return null},setItem(){},removeItem(){}},navigator:{},location:{hostname:'localhost',search:'',hash:''},setTimeout(){},clearTimeout(){},setInterval(){}};
vm.createContext(ctx);
for(const f of ['data.js','engine.js','app.js'])vm.runInContext(fs.readFileSync(raiz+f,'utf8'),ctx,{filename:f});
const run=s=>vm.runInContext(s,ctx);
const cerca=(a,b)=>assert.ok(Number.isFinite(a)&&Math.abs(a-b)<1e-9,`${a} ≠ ${b}`);
run("S.tenant='uc';S.carrera='UC-MEDICINA'");

const malla=ctx.mallaDeCarrera('uc','UC-MEDICINA');
const catalogo=ctx.catalogRamos('uc','UC-MEDICINA');
assert.equal(ctx.semestresDeCarrera('uc','UC-MEDICINA'),12);
assert.equal(catalogo.length,47);
assert.equal(new Set(catalogo.map(r=>r.sigla)).size,47);
assert.deepEqual(Array.from(Object.values(malla),ramos=>ramos.reduce(
  (total,nombre)=>total+ctx.creditosDe(nombre,'uc'),0)),[45,40,40,50,45,45,45,50,45,65,60,55]);
const esperados=[
  ['QIM201M',1,10],['FIS119M',1,10],['BIO239M',2,15],['MED104B',2,5],
  ['MED212A',3,15],['MED206A',3,5],['MED306B',5,5],['MED307B',5,5],
  ['MED505B',9,15],['MED603B',11,25],['MED610A',12,5],['MED612A',12,5],
];
const revisarBuscador=()=>{
  for(const [sigla,semestre,creditos] of esperados){
    const fila=ctx.searchCatalog(sigla,'uc','UC-MEDICINA',semestre)[0];
    assert.ok(fila?.propio,sigla);
    assert.deepEqual([fila.sigla,fila.semestre,ctx.creditosDe(fila.nombre,'uc')],[sigla,semestre,creditos]);
  }
};
revisarBuscador();
for(const f of ['mallas-uc.js','cursos-uc.js'])vm.runInContext(fs.readFileSync(raiz+f,'utf8'),ctx,{filename:f});
revisarBuscador();
assert.equal(ctx.searchCatalog('Bioestadística','uc','UC-MEDICINA',2)[0].sigla,'MED104B');
assert.equal(ctx.searchCatalog('BIO230C','uc','UC-BIOLOGIA',3)[0].sigla,'BIO230C');
assert.equal(ctx.searchCatalog('Internado Electivo','uc','UC-FONOAUDIOLOGIA',10)[0].sigla,'FON507');
run("selectedTenant='uc';selectedCarrera='UC-MEDICINA';selectedSem=12;S.careerSemestre=12");
assert.ok(ctx.obRamosActuales().includes('Internado de Profundización'));
assert.ok(ctx.mallaFaltantes().includes('Internado de Profundización'));
run("S.ramos=[{nombre:'Medicina Familiar',sigla:'MED605A'}]");
assert.ok(!ctx.mallaFaltantes().includes('Internado Medicina Familiar'));
assert.ok(ctx.mallaFaltantes().includes('Internado de Profundización'));
run('S.ramos=[]');

const ramos={'Integrado Ciencias Médicas III':['MED210A',5,4],'Morfología III':['MED213A',15,10],'Bases y Mecanismos de la Enfermedad I':['MED214A',30,9]};
for(const [nombre,[sigla,creditos,filas]] of Object.entries(ramos)){
  const def=run('PRESETS_UC')[nombre],p=ctx.presetRamo(nombre,'uc','UC-MEDICINA');
  assert.equal(def.sigla,sigla);assert.equal(p.creditos,creditos);assert.equal(p.categorias.length,filas);
  cerca(p.categorias.reduce((s,c)=>s+c.peso,0),100);
  assert.equal(ctx.findPresetName(nombre,'uc','UC-MEDICINA'),nombre);
  for(const otra of ['COM','UC-DERECHO',null]){
    assert.equal(ctx.findPresetName(nombre,'uc',otra),null,otra+' no recibe pautas de Medicina');
    assert.equal(ctx.presetRamo(nombre,'uc',otra),null);
  }
  // Una cuenta existente con pauta propia conserva notas y pesos; sin
  // evaluaciones, recibe la pauta vacía del programa.
  const origen={tenant:'uc',carrera:'UC-MEDICINA',ramoKey:sigla};
  const propia=ctx.normalize({tenant:'uc',carrera:'UC-MEDICINA',ramos:[{id:'x',nombre,sigla,origen,gates:[],categorias:[{id:'m',nombre:'Mi evaluación',peso:100,directNota:true,notas:[{id:'n',nombre:'n',valor:5.8,peso:1}]}]}]}).ramos[0];
  assert.deepEqual([propia.categorias.length,propia.categorias[0].id,propia.categorias[0].peso,propia.gates.length],[1,'m',100,0]);
  cerca(ctx.ramoAvg(propia),5.8);
  assert.ok(!ctx.estadoEximicion(propia),'no exime sobre una pauta personalizada');
  const vacio=ctx.normalize({tenant:'uc',carrera:'UC-MEDICINA',ramos:[{id:'v',nombre,sigla,origen,gates:[],categorias:[]}]}).ramos[0];
  assert.equal(vacio.categorias.length,filas);assert.ok(vacio.categorias.every(c=>!c.notas.length));
}
assert.equal(ctx.findPresetName('Cálculo I','uc','UC-MEDICINA'),null,'Medicina no hereda pautas de Ingeniería');
assert.ok(ctx.findPresetName('Cálculo I','uc','COM')&&ctx.findPresetName('Cálculo I','uc','UC-ING-MECANICA'));

const ramo=(nombre,notas)=>{
  const p=ctx.presetRamo(nombre,'uc','UC-MEDICINA');
  const r={id:'r',nombre,origen:{tenant:'uc',carrera:'UC-MEDICINA'},...p};
  r.categorias.forEach(c=>{
    const v=notas(c.nombre);if(v==null)return;
    c.notas=[].concat(v).map((valor,i)=>({id:c.id+i,nombre:'n',valor,peso:1,...(c.slots?{slot:i}:{})}));
  });
  return r;
};
const morfo=(cap,examen)=>ramo('Morfología III',n=>n==='Examen'?examen:cap);
// 55/35/10 y 70/30, con notas distintas por tipo.
const mixto=ramo('Morfología III',n=>n==='Examen'?4.5:n==='Minitest'?[7,5]:n.startsWith('Gymkhana')?5:4);
cerca(ctx.ramoAvg(mixto),.7*(.55*5+.35*4+.10*6)+.3*4.5);
cerca(ctx.ramoAvg(morfo(6,3.9)),3.9);                     // examen reprobatorio
assert.ok(ctx.ramoAvg(morfo(6,4))>=4);
cerca(ctx.ramoAvg(morfo(3.59,7)),3.59);                   // sin derecho a examen, sin aproximar
assert.ok(ctx.ramoAvg(morfo(3.6,7))>=4);
assert.ok(ctx.notaFinalOficial(ramo('Morfología III',n=>n==='Examen'?4:n==='Minitest'?3.5:3.95))<4,'3,9x no aproxima a 4,0');
// A medio semestre, capítulos sin rendir no bajan el promedio.
cerca(ctx.ramoAvg(ramo('Morfología III',n=>n==='Gymkhana Cabeza 1'?3.8:n.startsWith('Global')?5:null)),(9.625*3.8+24.5*5)/34.125);
const ofrece=ctx.estadoEximicion(morfo(5.6));
assert.ok(ofrece.puedeConfirmar&&!ofrece.activa);
assert.ok(!ctx.estadoEximicion(morfo(5.4)).elegible);
cerca(ctx.ramoAvg(Object.assign(morfo(5.6),{eximicionConfirmada:true})),5.6);

const bases=(inter,examen)=>ramo('Bases y Mecanismos de la Enfermedad I',n=>n==='Interrogaciones'?inter:n==='Examen final'?examen:n.startsWith('Minitest y')?[4,6]:n.startsWith('Trabajo')?6:7);
cerca(ctx.ramoAvg(bases([4,5,6,5,5],5)),.7*(.8*(.9*5+.1*5)+.1*6+.1*7)+.3*5);
cerca(ctx.ramoAvg(bases([7,7,7,7,7],3.8)),3.9);
assert.ok(ctx.estadoEximicion(bases([6.5,6.5,6.5,6.5,6.5])).puedeConfirmar);
assert.equal(ctx.estadoEximicion(bases([7,7,7,7,3.9])).razon,'minimo_categoria');
assert.ok(!ctx.estadoEximicion(bases([6,6,6,6,5.9])).elegible);
assert.ok(ctx.estadoEximicion(bases([7,7,7,7])).pendiente);
console.log('OK programas Medicina UC');
