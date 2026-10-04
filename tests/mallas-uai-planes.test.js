// Contenido transcrito de los PDF oficiales enlazados en docs/mallas-uai.md.
// Además del plan, se prueba el recorrido real: elegir carrera, sugerir el
// semestre, buscar fuera de la malla y reabrir una cuenta con pauta propia.
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('node:assert/strict');
const root=process.env.GRADEHUB_ROOT||path.join(__dirname,'..');
const element=()=>({style:{setProperty(){},removeProperty(){}},classList:{add(){},remove(){},contains(){return false},toggle(){}},addEventListener(){},appendChild(){},setAttribute(){},removeAttribute(){},getAttribute(){return null},querySelectorAll(){return[]},querySelector(){return null},focus(){},select(){},value:'',innerHTML:'',textContent:'',dataset:{},clientWidth:375});
const elements=new Map();
const ctx={console,window:{addEventListener(){},matchMedia:()=>({matches:true,addEventListener(){},addListener(){}})},document:{getElementById:id=>{if(!elements.has(id))elements.set(id,element());return elements.get(id)},createElement:element,addEventListener(){},documentElement:element(),body:element(),querySelector(){return null},querySelectorAll(){return[]}},localStorage:{getItem(){return null},setItem(){},removeItem(){}},navigator:{},location:{origin:'',pathname:'/',hash:''},history:{replaceState(){}},setTimeout(){return 1},clearTimeout(){},requestAnimationFrame(){}};
vm.createContext(ctx);
for(const f of ['data.js','engine.js','app.js','mallas-uai.js'])vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),ctx,{filename:f});
const run=s=>vm.runInContext(s,ctx),plain=x=>JSON.parse(JSON.stringify(x));
const ADMIN='UAI-INGENIERIA-COMERCIAL-ADMINISTRACION';
const SOC='UAI-DOBLE-TITULO-INGENIERIA-COMERCIAL-SOCIOLOGIA-ECONOMIA';
const DIS='UAI-INGENIERIA-EN-DISENO-VIA-COMERCIAL';
const planes=[
  [ADMIN,'Ingeniería Comercial (Administración de Empresas)',4,'Psicología Social'],
  [SOC,'Doble Título Ingeniería Comercial + Sociología (Economía)',8,'Organización Industrial y Contratos'],
  [DIS,'Ingeniería en Diseño (vía Ingeniería Comercial)',7,'Diseño y Construcción de Interfaces'],
];
for(const [id,nombre,sem,ramo] of planes){
  assert.ok(run('carrerasDeclarables("uai")').some(c=>c.malla===id&&c.n===nombre),nombre+' se puede elegir');
  run(`selectedTenant='uai';selectedCarrera=${JSON.stringify(id)};selectedSem=${sem}`);
  assert.ok(run('obRamosActuales()').includes(ramo),nombre+': sugerencia de su semestre');
  const p=ctx.searchCatalog(ramo,'uai',id,sem).find(r=>r.nombre===ramo);
  assert.ok(p&&p.propio&&p.semestre===sem,'Ramo propio conserva su semestre');
}

const admin=plain(ctx.mallaDeCarrera('uai',ADMIN));
assert.deepEqual(admin[4],['Psicología Social','Organización Industrial','Contabilidad','Marketing','Taller de Expresión Oral I','Deporte IV']);
assert.ok(admin[5].includes('Econometría'));
assert.ok(admin[6].includes('Gestión de Operaciones'));
assert.equal(admin[7],undefined,'Un bloque de especialización no se transforma en cursos');
const economia=plain(ctx.mallaDeCarrera('uai','UAI-INGENIERIA-COMERCIAL'));
assert.ok(economia[4].includes('Econometría I'),'Economía mantiene su plan anterior');
assert.ok(!admin[4].includes('Econometría I'),'No se mezcla Economía en Administración');
assert.ok(!economia[4].includes('Psicología Social'));

const socio=plain(ctx.mallaDeCarrera('uai',SOC));
assert.ok(socio[6].includes('Econometría I'));
assert.ok(socio[9].includes('Econometría II'));
assert.deepEqual(socio[10],['Sociología de las Crisis','Taller Práctico: Resolución de Problemas Basados en Evidencia','Teoría de la Organización']);
assert.deepEqual(socio[12],['Actividad Curricular de Titulación']);
assert.ok(!socio[8].includes('Managerial Economics'),'Sociología-Economía no recibe la malla de Administración');
assert.ok(ctx.mallaDeCarrera('uai','UAI-DOBLE-TITULO-INGENIERIA-COMERCIAL-SOCIOLOGIA')[8].includes('Managerial Economics'));

const diseno=plain(ctx.mallaDeCarrera('uai',DIS));
assert.ok(diseno[1].includes('Matemáticas Avanzadas I'));
assert.ok(!diseno[1].includes('Cálculo Diferencial'),'La vía Comercial no recibe el plan común Civil');
assert.ok(ctx.mallaDeCarrera('uai','UAI-INGENIERIA-EN-DISENO')[1].includes('Cálculo Diferencial'));
assert.ok(diseno[4].includes('Del Átomo al Bit'));
assert.deepEqual(diseno[8],['Taller Complejo']);
assert.ok(diseno[6].includes('Taller de Espacios'));
assert.ok(!diseno[7].includes('Taller de Espacios'),'Respeta las columnas 6° y 7° del diagrama');
assert.equal(diseno[9],undefined,'No transforma opciones de magíster en asignaturas');

for(const id of [ADMIN,SOC,DIS]){
  for(const [sem,ramos] of Object.entries(ctx.mallaDeCarrera('uai',id))){
    assert.ok(Number.isInteger(Number(sem))&&Number(sem)>0);
    assert.ok(ramos.length>0&&ramos.every(r=>typeof r==='string'&&r.trim()===r));
    assert.equal(new Set(ramos).size,ramos.length,'No duplica cursos dentro del semestre');
    assert.ok(ramos.every(r=>!/^(electivo|optativo|major|minor|disciplinar|especialización|magíster)\b/i.test(r)),'No inventa cursos a partir de casilleros');
  }
}
const ajeno=ctx.searchCatalog('del atomo al bit','uai','UAI-DERECHO',4).find(r=>r.nombre==='Del Átomo al Bit');
assert.ok(ajeno&&!ajeno.propio&&ajeno.semestre===0,'Toda la UAI encuentra el ramo nuevo sin adoptar un semestre ajeno');
assert.equal(ajeno.sigla,null,'No inventa siglas');
assert.equal(ajeno.tienePreset,false,'La malla no promete una pauta');
assert.equal(ctx.creditosDe('Del Átomo al Bit','uai',DIS),null,'No hereda créditos de otro tenant');
assert.equal(ctx.findPresetName('Del Átomo al Bit','uai',DIS),null);
assert.ok(!ctx.searchCatalog('del atomo al bit','fen','IC',4).some(r=>r.nombre==='Del Átomo al Bit'));

// Nombres específicos en la oferta; los IDs guardados siguen siendo válidos.
for(const [id,nombre] of [
  ['UAI-INGENIERIA-COMERCIAL','Ingeniería Comercial (Economía)'],
  ['UAI-DOBLE-TITULO-INGENIERIA-COMERCIAL-SOCIOLOGIA','Doble Título Ingeniería Comercial + Sociología (Administración de Empresas)'],
  ['UAI-INGENIERIA-EN-DISENO','Ingeniería en Diseño (vía Ingeniería Civil)'],
]){
  assert.ok(run('carrerasDeclarables("uai")').some(c=>c.malla===id&&c.n===nombre));
  const ramo={id:'sintetico',nombre:'Contabilidad',color:'#000000',creditos:null,seccion:3,origen:{tenant:'uai',carrera:id},categorias:[{id:'propia',nombre:'Mi evaluación',peso:100,directNota:true,notas:[{id:'nota',nombre:'Entrega',valor:5.8,peso:1}]}],gates:[]};
  const anterior=plain(ctx.normalize({tenant:'uai',carrera:id,carreraNombre:'Nombre guardado',onboardingDone:true,ramos:[ramo],historial:[]}));
  const guardado=JSON.stringify(anterior);
  ctx.anterior=anterior;
  run('S=normalize(anterior)');
  const despues=plain(run('S'));
  assert.deepEqual(despues,JSON.parse(guardado),'Reabrir no migra carrera, notas, créditos ni pauta personal');
  assert.equal(ctx.ramoAvg(run('S.ramos[0]')),5.8);
}
console.log('UAI: tres planes distintos, sugerencias y búsqueda por universidad; cuentas existentes intactas');
