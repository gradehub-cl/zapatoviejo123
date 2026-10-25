// #632 · El registro UAI impide agregar una pauta sin documentar su fuente
// o declarar explícitamente que esa fuente todavía falta.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const raiz=__dirname+'/../';
const ctx={console};vm.createContext(ctx);
vm.runInContext(fs.readFileSync(raiz+'data.js','utf8')+';this.U=PRESETS_UAI;',ctx);
const registro=JSON.parse(fs.readFileSync(raiz+'docs/programas-uai-2026.json','utf8'));
const entradas=new Map(registro.programas.map(p=>[p.nombre_catalogo,p]));
assert.equal(entradas.size,registro.programas.length,'sin nombres repetidos');
assert.deepEqual([...entradas.keys()].sort(),Object.keys(ctx.U).sort(),'toda pauta UAI tiene fuente o falta declarada');
const estados=new Set(['calza','se_corrigio','falta_fuente']);
let verificadas=0,pendientes=0;
for(const [nombre,p] of entradas){
  assert.ok(estados.has(p.estado),`${nombre}: estado conocido`);
  const actual=ctx.U[nombre].evals;
  assert.equal(JSON.stringify(p.evaluaciones),JSON.stringify(actual),
    `${nombre}: nombres, pesos, cantidades y mínimos cotejados con el registro`);
  assert.ok(Math.abs(actual.reduce((s,e)=>s+e[1],0)-100)<1e-6,`${nombre}: suma 100`);
  assert.equal(p.suma_ponderaciones,100,`${nombre}: suma registrada`);
  assert.equal(p.periodo,ctx.U[nombre].periodo,`${nombre}: período`);
  assert.ok(Array.isArray(p.faltantes_y_ambiguedades),`${nombre}: faltantes explícitos`);
  if(p.estado==='falta_fuente'){
    pendientes++;
    assert.equal(p.archivo_fuente,null,`${nombre}: no inventa archivo`);
    assert.deepEqual(p.citas_textuales,[],`${nombre}: no inventa citas`);
    assert.equal(p.confianza,'sin_fuente');
    assert.ok(p.faltantes_y_ambiguedades.length,`${nombre}: explica qué falta`);
  }else{
    verificadas++;
    assert.match(p.archivo_fuente,/^Programa_.*_UAI\.(pdf|docx)$/);
    assert.ok(p.citas_textuales.length>=2,`${nombre}: citas del documento`);
    assert.ok(p.ubicacion,`${nombre}: sección del programa`);
    assert.ok(['alta','media'].includes(p.confianza));
    assert.equal(p.verificado,'2026-10-21');
    const modelo=Object.fromEntries(['eximicion','recuperativo','grupos','ausenciasJustificadas']
      .filter(k=>ctx.U[nombre][k]!=null).map(k=>[k,ctx.U[nombre][k]]));
    assert.equal(JSON.stringify(p.reglas_modeladas),JSON.stringify(modelo),
      `${nombre}: reglas modeladas documentadas`);
    assert.equal(JSON.stringify(p.reglas_no_calculadas),JSON.stringify(ctx.U[nombre].noCalcula||[]),
      `${nombre}: límites del cálculo documentados`);
  }
}
assert.equal(verificadas,6);
assert.equal(pendientes,3);
const civil=ctx.U['Civilización Contemporánea II'].evals.find(e=>e[0]==='Evaluaciones de lectura');
assert.equal(civil.length,2,'el programa contradice 10 y 11; no se inventan casillas');
assert.match(entradas.get('Civilización Contemporánea II').faltantes_y_ambiguedades.join(' '),/10.*11/);
// La corrección del catálogo no puede reescribir en silencio las casillas ni
// las notas que una cuenta anterior ya tenía en su copia local.
const stub={style:{setProperty(){},removeProperty(){}},classList:{add(){},remove(){},contains(){return false}},
  addEventListener(){},appendChild(){},setAttribute(){},removeAttribute(){},querySelectorAll(){return []},value:'',innerHTML:'',textContent:'',dataset:{}};
const app={console,Intl,window:{addEventListener(){},matchMedia:()=>({matches:false,addEventListener(){},addListener(){}})},
  document:{getElementById:()=>stub,createElement:()=>stub,addEventListener(){},documentElement:stub,body:stub,querySelector:()=>stub,querySelectorAll:()=>[]},
  localStorage:{getItem(){return null},setItem(){},removeItem(){}},navigator:{},location:{origin:'',pathname:'/',hash:''},setTimeout,clearTimeout};
vm.createContext(app);
for(const f of ['data.js','engine.js','app.js'])vm.runInContext(fs.readFileSync(raiz+f,'utf8'),app,{filename:f});
const guardado={tenant:'uai',ramos:[{id:'civil',nombre:'Civilización Contemporánea II',
  origen:{tenant:'uai'},pautaHuella:'Evaluaciones de lectura:32.5|Participación en clases:32.5|Ensayo breve escrito en clases:10|Examen:25',
  categorias:[{id:'lectura',nombre:'Evaluaciones de lectura',peso:32.5,slots:10,directNota:true,
    notas:[{id:'n1',nombre:'Lectura 1',slot:0,valor:5.2}]},
    {id:'participacion',nombre:'Participación en clases',peso:32.5,notas:[]},
    {id:'ensayo',nombre:'Ensayo breve escrito en clases',peso:10,notas:[]},
    {id:'examen',nombre:'Examen',peso:25,notas:[]}],gates:[]} ]};
app.__guardado=guardado;
const despues=vm.runInContext('normalize(__guardado).ramos[0]',app);
assert.equal(despues.categorias[0].slots,10,'una cuenta existente conserva sus casillas');
assert.equal(despues.categorias[0].notas[0].valor,5.2,'una cuenta existente conserva su nota');
console.log('OK: 6 programas UAI cotejados, 3 fuentes faltantes y cantidad ambigua sin casillas');
