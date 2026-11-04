// Pautas propias: ninguna ponderación de Derecho actúa como fixture del motor.
const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const stub={style:{setProperty(){},removeProperty(){}},classList:{add(){},remove(){},contains(){return false}},dataset:{},value:'',innerHTML:'',textContent:'',addEventListener(){},appendChild(){},setAttribute(){},removeAttribute(){},getAttribute(){return null},querySelector(){return stub},querySelectorAll(){return[]},focus(){},select(){}};
const memoria=new Map();
const ctx={console,setTimeout,clearTimeout,currentUser:null,supabaseClient:null,window:{addEventListener(){},matchMedia:()=>({matches:true,addEventListener(){}})},document:{getElementById:()=>stub,createElement:()=>stub,documentElement:stub,body:stub,addEventListener(){},querySelector:()=>stub,querySelectorAll:()=>[]},localStorage:{getItem:k=>memoria.get(k)||null,setItem:(k,v)=>memoria.set(k,v)},navigator:{},location:{origin:'',pathname:'/',hash:''}};
vm.createContext(ctx);for(const f of ['data.js','engine.js','app.js','marketplace.js','render-main.js'])vm.runInContext(fs.readFileSync(__dirname+'/../'+f,'utf8'),ctx);
const run=s=>vm.runInContext(s,ctx),json=s=>JSON.parse(run(`JSON.stringify(${s})`));
run(`
const propia={sigla:'SYN909',periodo:'2026-2',creditos:10,coordinado:false,porSeccion:{
  5:{evals:[['Prueba',40,{min:4,cap:3.9}],['Examen',60]],reglasDelCurso:['Solo sección cinco'],noCalcula:['Aviso cinco']},
  6:{evals:[['Trabajo',70],['Examen',30]],reglasDelCurso:['Solo sección seis']}
}};
PRESETS_FEN['Pauta sintética por sección']=propia;
PROFESORES_PROPUESTOS.fen={'2026-2':{SYN909:{4:'Docente sin pauta',5:'Docente Cinco',6:'Docente Seis'}}};
S=normalize({tenant:'fen',carrera:'IC',onboardingDone:true,ramos:[]});
track=()=>{};renderRamo=()=>{};save=()=>{globalThis.guardados=(globalThis.guardados||0)+1};
`);
assert.deepEqual(json('definicionDeSeccion(propia,5).evals'),[['Prueba',40,{min:4,cap:3.9}],['Examen',60]]);
assert.equal(run('definicionDeSeccion(propia,5).creditos'),10);
for(const seccion of ['null','4','undefined']){
 assert.equal(run(`definicionDeSeccion(propia,${seccion}).evals`),undefined);
 assert.equal(run(`definicionDeSeccion(propia,${seccion}).reglasDelCurso`),undefined);
 assert.equal(run(`presetRamo('Pauta sintética por sección','fen','IC',undefined,${seccion})`),null);
}
assert.equal(run(`(()=>{const d={evals:[['A',100]]};return definicionDeSeccion(d,5)===d})()`),true,'coordinadas idénticas, sin copiar');
run(`globalThis.cinco=crearRamoDesdeCatalogo('Pauta sintética por sección','SYN909',5);globalThis.cuatro=crearRamoDesdeCatalogo('Pauta sintética por sección','SYN909',4);globalThis.otra=crearRamoDesdeCatalogo('Pauta sintética por sección','SYN909',null);`);
assert.equal(run('cinco.seccion'),5);assert.equal(run('cinco.categorias.length'),2);assert.equal(run('cinco.gates[0].min'),4);
assert.equal(run('cuatro.creditos'),10);assert.equal(run('cuatro.categorias.length'),0);assert.equal(run('otra.categorias.length'),0);
assert.match(run(`avisoSinPautaSeccion(cuatro.nombre,'fen','IC',4)`),/De la sección 4/);
assert.match(run(`avisoSinPautaSeccion(otra.nombre,'fen','IC',null)`),/sin sección confirmada/);
assert.deepEqual(json("reglasDelPreset(cinco,'reglasDelCurso')"),['Solo sección cinco']);
assert.deepEqual(json("reglasDelPreset(cuatro,'reglasDelCurso')"),[]);
assert.equal(run('definicionPresetDelRamo(cuatro).grupos'),undefined);
run(`cuatro.seccion=6;completarFechasOficiales(cuatro,{tenant:'fen',carrera:'IC'});`);
assert.deepEqual(json('cuatro.categorias.map(c=>c.nombre)'),['Trabajo','Examen']);
assert.equal(run('cuatro.gates.length'),0,'no hereda mínimo de sección cinco');
assert.deepEqual(json("reglasDelPreset(cuatro,'reglasDelCurso')"),['Solo sección seis']);
assert.equal(run('ofertaPautaSeccion(cinco)'),null,'la misma pauta no ofrece reemplazo');
run(`cinco.seccion=6;globalThis.antes=JSON.stringify(cinco);completarFechasOficiales(cinco,{tenant:'fen',carrera:'IC'});`);
assert.equal(run('JSON.stringify(cinco)===antes'),true,'no reemplaza evaluaciones existentes');
assert(run('!!ofertaPautaSeccion(cinco)'),'oferta para evaluaciones sin notas');
run(`showConfirm=(t,d,fn)=>{globalThis.confirmar=fn;globalThis.descripcion=d};confirmarPautaSeccion(cinco.id);`);
assert.match(run('descripcion'),/Reemplaza tus evaluaciones/);
assert.equal(run('JSON.stringify(cinco)===antes'),true,'confirmación obligatoria');
run(`cinco.categorias[0].notas.push({id:'n',valor:5.5});confirmar();`);
assert.equal(run('cinco.categorias[0].nombre'),'Prueba','una nota llegada mientras se confirma bloquea reemplazo');
assert.equal(run('ofertaPautaSeccion(cinco)'),null);
run(`cinco.categorias[0].notas=[];confirmarPautaSeccion(cinco.id);confirmar();`);
assert.equal(run('cinco.categorias[0].nombre'),'Trabajo');
run(`cinco.seccion=5;descartarPautaSeccion(cinco.id);`);
assert.equal(run('ofertaPautaSeccion(cinco)'),null,'se descarta una vez por sección y ramo, fuera de gradehub_v1');
// Una cuenta guardada con un ramo manual no recibe origen ni un preset nuevo.
run(`globalThis.antigua=normalize({tenant:'fen',carrera:'IC',ramos:[{id:'manual',nombre:'Pauta sintética por sección',seccion:5,categorias:[{id:'p',nombre:'Mi evaluación',peso:100,directNota:true,notas:[{id:'m',valor:5.7,peso:1}]}]}]});`);
assert.equal(run('antigua.ramos[0].origen'),null);
assert.equal(run('antigua.ramos[0].categorias[0].nombre'),'Mi evaluación');assert.equal(run('antigua.ramos[0].categorias[0].notas[0].valor'),5.7);
assert.equal(run('ofertaPautaSeccion(antigua.ramos[0])'),null);
run(`globalThis.manualVacio={id:'manual-vacio',nombre:'Pauta sintética por sección',seccion:5,categorias:[]};completarFechasOficiales(manualVacio,{tenant:'fen',carrera:'IC'});`);
assert.equal(run('manualVacio.categorias.length'),2,'poner sección después es una acción explícita también para el ramo vacío');
run(`globalThis.manualConEvaluaciones={id:'manual-evals',nombre:'Pauta sintética por sección',seccion:5,categorias:[{id:'mi',nombre:'Mi prueba',peso:100,notas:[]}]};completarFechasOficiales(manualConEvaluaciones,{tenant:'fen',carrera:'IC'});`);
assert.equal(run('manualConEvaluaciones.origen'),undefined,'elegir sección no atribuye origen a una pauta manual con evaluaciones');
assert(run('!!ofertaPautaSeccion(manualConEvaluaciones)'),'tras elegir sección puede ofrecerla, sin reemplazar la pauta manual');
// Selector nativo y valor desconocido por defecto; elección persistida en el ramo.
run(`S.ramos=[];seccionesElegidasRamo.clear();`);
let html=run(`selectorSeccionRamoHTML('Pauta sintética por sección','fen','IC','SYN909','selector')`);
assert.match(html,/<label for="selector">Sección<\/label>/);assert.match(html,/<select /);assert.match(html,/5 · Docente Cinco/);assert.match(html,/<option value="" selected>Otra \/ no sé/);
run(`elegirSeccionRamo('Pauta%20sint%C3%A9tica%20por%20secci%C3%B3n','fen','IC','SYN909',{id:'selector',value:'5'});globalThis.elegido=crearRamoDesdeCatalogo('Pauta sintética por sección','SYN909');`);
assert.equal(run('elegido.seccion'),5);assert.equal(run('elegido.categorias.length'),2);
assert.match(run(`selectorSeccionRamoHTML('Pauta sintética por sección','fen','IC','SYN909','selector')`),/value="5" selected/);
// Banco: cada sección ve su pauta y sus reportes; la desconocida no hereda.
const filas=[{sigla:'SYN909-5',nombre:'Pauta sintética por sección',pauta:{sigla:'SYN909',coordinado:false,evals:[['Prueba',40],['Examen',60]]},variantes:[]},{sigla:'SYN909',nombre:'Pauta sintética por sección',pauta:null,variantes:[{seccion:5,huella:'a'},{seccion:6,huella:'b'},{seccion:null,huella:'c'}]}];
ctx.filas=filas;
const banco=json("pautasBancoPorSeccion(filas,'fen')");
assert.equal(banco.length,3);assert.deepEqual(banco.find(f=>f.seccion===5).variantes.map(v=>v.huella),['a']);assert.equal(banco.find(f=>f.seccion===6).pauta,null);
// El mismo mecanismo UC no requiere una excepción por carrera.
run(`PRESETS_UC['Curso UC sintético por sección']=propia;S=normalize({tenant:'uc',carrera:'DER',onboardingDone:true,ramos:[]});`);
assert.equal(run("definicionPreset('Curso UC sintético por sección','uc','DER',5).evals.length"),2);
run(`_horarioUCReconocido=[{nombre:'Curso UC sintético por sección',sigla:'SYN909',seccion:5}];_horarioSeccionesUC=[];renderHome=()=>{};showToast=()=>{};document.querySelectorAll=s=>s==='.horario-ramo-check'?[{checked:true,dataset:{i:'0'}}]:[];aplicarHorarioBuscacursos();`);
assert.equal(run('S.ramos[0].seccion'),5);assert.equal(run('S.ramos[0].categorias.length'),2,'el horario usa la misma puerta y no adjunta la sección después del preset');
console.log('PASS pautas por sección: puerta única, alta, reglas aisladas, cambio, confirmación, notas, cuenta existente, selector y banco');
