// Pautas de Derecho UACh (src/data/uach-pautas.js): que cada una sume 100, diga
// de qué PDF salió, respete lo que su reglamento exige a toda pauta y que la
// compuerta de la nota de presentación (art. 16) haga lo que dice el artículo.
const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const raiz=__dirname+'/../';
const el=()=>({style:{setProperty(){},removeProperty(){}},classList:{add(){},remove(){},toggle(){},contains(){return false;}},
  addEventListener(){},appendChild(){},setAttribute(){},removeAttribute(){},getAttribute(){return null},
  querySelector(){return null},querySelectorAll(){return []},focus(){},value:'',innerHTML:'',textContent:'',dataset:{}});
const ctx={console,setTimeout(){return 1},clearTimeout(){},
  window:{addEventListener(){},matchMedia:()=>({matches:true,addEventListener(){},addListener(){}})},
  document:{getElementById:el,createElement:el,addEventListener(){},documentElement:el(),body:el(),
    head:{appendChild(){}},querySelector(){return null},querySelectorAll(){return []}},
  localStorage:{getItem(){return null},setItem(){},removeItem(){}},navigator:{},location:{hash:'',pathname:'/'},history:{replaceState(){}}};
vm.createContext(ctx);
for(const f of ['data.js','engine.js','app.js'])vm.runInContext(fs.readFileSync(raiz+f,'utf8'),ctx);
vm.runInContext(fs.readFileSync(raiz+'mallas-uach.js','utf8'),ctx);
const run=s=>vm.runInContext(s,ctx);
run("S.tenant='uach'");

const P=run('PRESETS_UACH'),nombres=Object.keys(P);
const malla=Object.values(run("MALLAS_UACH_EXTRA['UACH-DERECHO']")).flat();
const lineas=fs.readFileSync(raiz+'src/data/uach-pautas.js','utf8').split('\n');
const SIN_EXAMEN=new Set(['Introducción a la Profesión Jurídica','Litigación Penal']);
// Derecho Tributario publica cuatro parciales (dos individuales y dos grupales).
// El art. 13 de 2017 pide al menos dos; el texto refundido de 2025, dos o tres.
// Así lo dice su programa y así se carga.
const MAS_DE_TRES=new Set(['Derecho Tributario']);
assert.equal(nombres.length,23,'las 23 pautas con lista de evaluaciones coherente');
for(const n of nombres){
  const p=P[n],ev=p.evals,examen=ev.find(e=>e[0]==='Examen'),parciales=ev.filter(e=>e!==examen);
  assert.ok(malla.includes(n),n+' es un ramo de la malla de Derecho');
  assert.equal(Math.round(ev.reduce((s,e)=>s+e[1],0)*1e6)/1e6,100,n+' suma 100');
  assert.match(p.periodo,/^202[56]-[12]$/,n+': período del programa');
  // La fuente va en el comentario de cada pauta: URL del PDF.
  const k=lineas.indexOf(`  '${n}':{`);let j=k;
  while(j>0&&/^\s*\/\/ [^─]/.test(lineas[j-1]))j--;
  assert.match(lineas.slice(j,k).join('\n'),/https:\/\/derecho\.uach\.cl\/_wp\/wp-content\/uploads\/\S+\.pdf/,n+': URL del programa');
  const casillas=parciales.reduce((s,e)=>s+(e[2]&&e[2].slots||1),0),npe=parciales.reduce((s,e)=>s+e[1],0);
  // Art. 13: ninguna parcial pesa más de la mitad de la nota de presentación.
  for(const e of parciales)assert.ok(e[1]/(e[2]&&e[2].slots||1)<=npe/2+1e-9,n+': '+e[0]+' no pasa del 50% de la presentación');
  assert.ok(casillas>=2&&(casillas<=3||MAS_DE_TRES.has(n)),n+': dos o tres parciales');
  if(SIN_EXAMEN.has(n)){
    assert.equal(examen,undefined,n+' no tiene examen');
    assert.equal(p.grupos,undefined,n+': sin examen no hay compuerta de presentación');
  }else{
    // El examen pesa 30, 35 o 40 según lo que declara cada programa.
    assert.ok([30,35,40].includes(examen[1]),n+': examen de 30%, 35% o 40%');
    assert.equal(JSON.stringify(p.grupos),JSON.stringify([{nombre:'Presentación a examen',evals:parciales.map(e=>e[0]),min:3.5,cap:'self'}]),n+': compuerta del art. 16 sobre todas las parciales');
    assert.ok(p.reglasDelCurso.includes(run('REGLA_PRESENTACION_UACH'))&&p.reglasDelCurso.includes(run('REGLA_EXAMEN_UACH')),n+': avisa las dos reglas');
  }
  const r=run(`presetRamo(${JSON.stringify(n)},'uach','UACH-DERECHO')`);
  assert.ok(r,n+' se carga');
  assert.equal(r.gates.length,SIN_EXAMEN.has(n)?0:1,n+': la compuerta llega al ramo');
  if(!SIN_EXAMEN.has(n)){
    const ids=parciales.map(e=>r.categorias.find(c=>c.nombre===e[0]).id).join();
    assert.equal(JSON.stringify(r.gates.map(g=>[g.type,g.catIds.join(),g.min,g.cap,g.exacto===true])),JSON.stringify([['group_min',ids,3.5,'self',false]]),n+': sobre las parciales, sin `exacto`');
  }
}
// Los dos programas que se contradicen no se cargan.
assert.equal(run("presetRamo('Historia del Derecho Chileno','uach','UACH-DERECHO')"),null,'suma 110% en su programa');
assert.equal(run("presetRamo('Derecho Probatorio','uach','UACH-DERECHO')"),null,'dice «sesenta por ciento (65%)»');
// Nada de la UACh se cruza con otra universidad.
assert.equal(run("presetRamo('Acto Jurídico','udd',null)"),null);
assert.equal(run("presetRamo('Contratos','uandes',null)"),null);
// Los pesos sobre la final salen de «NPE × parcial»: Sistema Jurídico, 70% × 32/33/35.
assert.equal(JSON.stringify(P['Sistema Jurídico'].evals),JSON.stringify([['Control Parcial 1',22.4],['Control Parcial 2',23.1],['Control Parcial 3',24.5],['Examen',30]]));
assert.equal(JSON.stringify(P['Acto Jurídico'].evals),JSON.stringify([['Prueba I',32.5],['Prueba II',32.5],['Examen',35]]));

// La compuerta, con una pauta sintética: presentación 65% y examen 35%.
const nota=(id,valor)=>({id,nombre:id,valor,peso:1});
const ramo=(presentacion,examen)=>({id:'r',nombre:'Ramo UACh sintético',origen:{tenant:'uach'},
  categorias:[{id:'p',nombre:'Parciales',peso:65,directNota:true,notas:presentacion===null?[]:[nota('a',presentacion)]},
    {id:'e',nombre:'Examen',peso:35,directNota:true,notas:examen===null?[]:[nota('b',examen)]}],
  gates:[{type:'group_min',catIds:['p'],min:3.5,cap:'self',nombre:'Presentación a examen'}]});
const con=(p,e,expr)=>{ctx.r=ramo(p,e);run('S.ramos=[r]');return run(expr);};
// Art. 16: con menos de 3,5 no hay examen y la final es la presentación.
assert.equal(con(3.4,7,'notaFinalOficial(ramoAvg(r))'),3.4,'con 3,4 de presentación la final es 3,4 aunque el examen fuera un 7');
assert.equal(con(3.4,7,'notaAprobadaRamo(r,ramoAvg(r))'),false);
assert.equal(con(3.4,7,'gatesActivas(r)[0].nombre'),'Presentación a examen','y lo avisa');
// La presentación se aproxima a la décima: 3,45 es 3,5 y da derecho a examen.
assert.equal(con(3.45,5,'gatesActivas(r).length'),0,'3,45 se aproxima a 3,5');
assert.equal(con(3.45,5,'notaFinalOficial(ramoAvg(r))'),4,'0,65 × 3,45 + 0,35 × 5,0 = 3,99 → 4,0');
assert.equal(con(3.44,7,'gatesActivas(r).length'),1,'3,44 es 3,4: sin derecho a examen');
// Con 3,5 justo, cuenta el promedio ponderado; se aprueba con 4,0.
assert.equal(con(3.5,5,'notaFinalOficial(ramoAvg(r))'),4,'0,65 × 3,5 + 0,35 × 5,0 = 4,025 → 4,0');
assert.equal(con(3.5,5,'notaAprobadaRamo(r,ramoAvg(r))'),true);
assert.equal(con(3.5,4.5,'notaFinalOficial(ramoAvg(r))'),3.9,'0,65 × 3,5 + 0,35 × 4,5 = 3,85 → 3,9: no alcanza');
assert.equal(con(3.5,4.5,'notaAprobadaRamo(r,ramoAvg(r))'),false);
// No hay eximición ni mínimo en el examen: un examen bajo solo pesa su 35%.
assert.equal(con(6,2,'notaFinalOficial(ramoAvg(r))'),4.6,'0,65 × 6,0 + 0,35 × 2,0 = 4,6');
assert.equal(con(6,2,'gatesActivas(r).length'),0);
console.log('OK pautas UACh Derecho: '+nombres.length+' pautas, fuente por pauta, art. 13 y compuerta del art. 16');
