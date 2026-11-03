// Lucas, 2026-11-03: reglas de asistencia que no cambian la nota no se muestran.
// Prueba de catálogo y lectura de una cuenta existente, no de la aritmética del preset.
const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const el=()=>({style:{setProperty(){},removeProperty(){}},classList:{add(){},remove(){},contains(){return false}},value:'',innerHTML:'',dataset:{},addEventListener(){},appendChild(){},setAttribute(){},removeAttribute(){},getAttribute(){return null},querySelector(){return null},querySelectorAll(){return[]},focus(){}});
const stub=el(),ctx={console,setTimeout,clearTimeout,window:{addEventListener(){},matchMedia:()=>({matches:true,addEventListener(){},addListener(){}})},document:{getElementById:()=>stub,createElement:el,addEventListener(){},documentElement:stub,body:stub,querySelector:()=>null,querySelectorAll:()=>[]},localStorage:{getItem(){return null},setItem(){throw Error('Leer las reglas no debe guardar ni migrar datos')},removeItem(){}},navigator:{},location:{origin:'',pathname:'/',hash:''}};
vm.createContext(ctx);for(const f of ['data.js','engine.js','app.js'])vm.runInContext(fs.readFileSync(__dirname+'/../'+f,'utf8'),ctx);
const run=s=>vm.runInContext(s,ctx);
assert.equal(run("(PRESETS_UC['Dinámica'].noCalcula||[]).length"),0,'se retiran los tres avisos de Dinámica, que estaban en noCalcula');
assert(!run("PRESETS_UC['El misterioso caso del curso de ficción policial (Edición especial Santiago Negro)'].reglasDelCurso.join(' ')").includes('último día de clases'));
assert(run("PRESETS_UC['Laboratorio de Dinámica'].noCalcula.join(' ')").includes('nota 1'),'las sanciones que sí afectan la nota se conservan');
assert(run("PRESETS_UC['Laboratorio de Dinámica'].noCalcula.join(' ')").includes('segunda inasistencia reprueba'));
assert(run("PRESETS_UC['Ciudadanía y Derechos humanos: Enfoques interdisciplinarios'].reglasDelCurso[0]").includes('60%'),'no se modifica la primera regla de un preset');
// Cuenta sintética guardada antes de esta limpieza. Las reglas se consultan por
// origen en cada render, no se copian ni se sustituyen las categorías del alumno.
run(`S={tenant:'uc',carrera:'ING-PC',ramos:[],historial:[]};
const p=presetRamo('Dinámica','uc','ING-PC',new Date('2026-11-03T12:00:00Z'));
S.ramos=[{...p,id:'existente',nombre:'Dinámica',origen:{tenant:'uc',carrera:'ING-PC'},pautaHuella:'huella-guardada',bonusIngresado:{talleres:2}}];
S.ramos[0].categorias[0].notas=[{id:'nota-guardada',nombre:'I1 propia',valor:5.2}];
`);
const antes=run('JSON.stringify(S)'),notaAntes=run('ramoAvg(S.ramos[0])');
assert.equal(run('reglasNoCalculadas(S.ramos[0]).length'),0,'el ramo ya agregado deja de mostrar los avisos sin recargarse del preset');
assert.equal(run('S.ramos[0].bonus[0].entrada'),'faltas');
assert.equal(run('S.ramos[0].bonus[0].suma'),0.5);
assert.equal(run('ramoAvg(S.ramos[0])'),notaAntes);
assert.equal(run('JSON.stringify(S)'),antes,'leer no cambia ids, notas, pesos ni bonus ingresados');
run("S.ramos[0].categorias[0].nombre='Evaluación personalizada';S.ramos[0].categorias[0].peso=27;");
const personalizado=run('JSON.stringify(S)');run('reglasNoCalculadas(S.ramos[0]);reglasDelCurso(S.ramos[0])');
assert.equal(run('JSON.stringify(S)'),personalizado,'no se pisa la pauta personalizada');
assert.equal(run("reglasDelCurso({nombre:'Dinámica',origen:null}).length"),0,'un ramo manual no hereda reglas');
console.log('OK: avisos retirados, sanciones y bonus conservados, cuenta existente y pauta personalizada intactas');
