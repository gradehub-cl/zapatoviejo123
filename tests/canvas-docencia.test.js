// Canvas sintético: lectura, revisión, caché de sesión y registro de profesores.
const assert=require('node:assert/strict'),fs=require('fs'),vm=require('vm'),path=require('path');
const leer=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8'),ids=new Map(),checks=new Map(),almacen=new Map();
let publicaciones=[];
let pedidos=[],personas=[{nombre:'Docente Sintético Uno',rol:'profesor'},{nombre:'Ayudante Sintética Uno',rol:'ayudante'}],metricas=[],sync=0;
const nodo=id=>{if(ids.has(id))return ids.get(id);const n={innerHTML:'',textContent:'',dataset:{},value:'',isConnected:true,style:{setProperty(){},removeProperty(){}},classList:{add(){},remove(){},toggle(){},contains(){return false}},addEventListener(){},appendChild(){},setAttribute(){},removeAttribute(){},focus(){},querySelector(){return null},querySelectorAll(){return []}};ids.set(id,n);return n;};
const plugin={get:async({path,params})=>{pedidos.push({path,params});if(path==='courses')return {data:[{id:42,course_code:'MAT1620-2',term:{name:'2026 Segundo Semestre'}}]};if(path.endsWith('/users'))return {data:personas};return {data:[]}}};
const ctx={console,Intl,window:{addEventListener(){},matchMedia:()=>({matches:false,addEventListener(){},addListener(){}}),Capacitor:{isNativePlatform:()=>true,Plugins:{GradeHubCanvas:plugin}}},document:{getElementById:nodo,createElement:()=>nodo('nuevo'),addEventListener(){},documentElement:nodo('html'),body:nodo('body'),querySelector:s=>checks.get(s)||null,querySelectorAll:()=>[]},localStorage:{getItem:k=>almacen.get(k)||null,setItem:(k,v)=>almacen.set(k,v),removeItem:k=>almacen.delete(k)},sessionStorage:{getItem(){return null},setItem(){},removeItem(){}},navigator:{},location:{origin:'https://ejemplo.invalid',pathname:'/',hash:'',search:''},history:{replaceState(){}},setTimeout(){},clearTimeout(){}};
vm.createContext(ctx);for(const f of ['data.js','engine.js','app.js','app-session.js','marketplace.js','render-main.js','render-agenda.js'])vm.runInContext(leer(f),ctx,{filename:f});
const run=s=>vm.runInContext(s,ctx),json=s=>JSON.parse(run('JSON.stringify('+s+')'));
ctx.track=(...x)=>metricas.push(x);ctx.syncToCloud=()=>sync++;ctx.__cliente={rpc:async(...a)=>{publicaciones.push(a);return {data:null,error:null}}};run('supabaseClient=__cliente');
run(`semester=()=> '2026-2';S={...freshState(),tenant:'uc',onboardingDone:true,tipoCuenta:'estudiante',ramos:[{id:'r',nombre:'Curso sintético Canvas',sigla:'MAT1620',seccion:null,origen:{tenant:'uc',carrera:null},categorias:[{id:'i',nombre:'Interrogación 1',peso:100,directNota:true,notas:[{id:'n',nombre:'I1',valor:5.4,peso:1}]}],gates:[]}]};currentUser={id:'00000000-0000-0000-0000-000000000001'};currentRamoId='r';globalThis.r=S.ramos.find(r=>r.id==='r');openModal=()=>{};closeModal=()=>{};renderRamo=()=>{};showToast=()=>{};showConfirm=(t,m,f)=>f();`);
function seleccionar(){checks.clear();for(const m of nodo('modal-content').innerHTML.matchAll(/data-canvas-(seccion|equipo)="(\d+)"/g))checks.set('[data-canvas-'+m[1]+'="'+m[2]+'"]',{checked:true});}
(async()=>{
 const antes=run('JSON.stringify(S)');await run('traerRamosCanvas()');
 assert.equal(run('r.seccion'),null);assert.equal(run('JSON.stringify(S)'),antes);assert.equal(sync,0,'leer no guarda ni aporta');
 assert.equal(run('revisionDocenciaCanvas.filas.length'),1);assert.equal(run('revisionDocenciaCanvas.filas[0].curso.seccion'),2,'MAT1620-2 propone 2');
 assert.match(nodo('modal-content').innerHTML,/Docente Sintético Uno/);assert.match(nodo('modal-content').innerHTML,/Ayudante Sintética Uno/);
 const usuarios=pedidos.find(p=>p.path==='courses/42/users');assert.deepEqual(Array.from(usuarios.params['enrollment_type[]']),['teacher','ta']);
 run('cerrarRevisionDocenciaCanvas()');assert.equal(run('JSON.stringify(S)'),antes,'Ahora no no guarda');
 run('abrirRevisionDocenciaCanvas()');seleccionar();run('guardarRevisionDocenciaCanvas()');
 assert.equal(run('r.seccion'),2);assert.deepEqual(json('r.categorias'),JSON.parse(antes).ramos[0].categorias,'aceptar sección/equipo no pisa la pauta ni notas');assert.equal(run('ramoAvg(r)'),5.4);
 assert.equal(run('profesorPropuestoRamo(r,contextoDocente(r))'),'Docente Sintético Uno');
 assert.match(run('listaDocenciaCanvasHTML(docenciaCanvasDeRamo(r).personas)'),/Profesor:.*Docente Sintético Uno/);
 assert(!/Docente|Ayudante|MAT1620/.test(JSON.stringify(metricas)),'nombres y siglas no llegan a métricas');
 assert.equal(sync,1);assert.deepEqual(publicaciones,[],'aceptar no informa un profesor ni aporta votos');
 assert(!/Docente Sintético|Ayudante Sintética/.test(almacen.get('gradehub_v1')),'el respaldo no contiene el equipo');
 assert.equal(run('r.docenciaCanvas'),undefined,'ningún campo nuevo en el ramo');
 ctx.__subidas=[];ctx.__nube={from:tabla=>({insert:async fila=>{assert.equal(tabla,'user_ramos');ctx.__subidas.push(JSON.parse(JSON.stringify(fila)));return {error:null}}})};
 run('supabaseClient=__nube;guardarBaseSync(currentUser.id,null)');
 assert.equal(await run('subirConVersion(currentUser.id)'),true);
 const subida=ctx.__subidas.find(f=>f.user_id==='00000000-0000-0000-0000-000000000001').data;
 assert.equal(subida.ramos.find(r=>r.id==='r').seccion,2,'la sección viaja en la subida real');
 assert(!/Docente Sintético|Ayudante Sintética/.test(JSON.stringify(subida)),'ningún nombre de Canvas llega a Supabase');
 run('supabaseClient=__cliente');
 run('globalThis.recargada=normalize(JSON.parse(localStorage.getItem("gradehub_v1")))');assert.equal(run('recargada.ramos.find(r=>r.id==="r").seccion'),2);
 run(`_mostrarJsonManual=t=>globalThis.respaldo=t;exportarDatos();document.getElementById('import-text').value=respaldo;confirmarImportar()`);
 assert.equal(run('S.ramos.find(r=>r.id==="r").seccion'),2,'exportación/importación real');
 assert(!/Docente Sintético|Ayudante Sintética/.test(run('respaldo')),'exportar no filtra nombres del equipo');
 run('r=S.ramos.find(r=>r.id==="r");globalThis.h=normalize({...S,historial:[{id:"h",label:"2026-1",ramos:[r]}]})');assert.equal(run('h.historial.find(h=>h.id==="h").ramos.find(r=>r.id==="r").seccion'),2);
 const remoto=json('r'),local=JSON.parse(JSON.stringify(remoto));local.categorias.find(c=>c.id==='i').notas.find(n=>n.id==='n').valor=6;
 const fusion=run('fusionarObjetoSync')(remoto,local,remoto,'local');assert.equal(fusion.seccion,2);assert.equal(fusion.docenciaCanvas,undefined);
 // Aceptar solo el equipo no llama save ni modifica el JSON.
 run('equipoDocenciaCanvas.clear()');await run('traerRamosCanvas()');seleccionar();
 const sincronizaciones=sync,estadoAntesEquipo=run('JSON.stringify(S)');run('guardarRevisionDocenciaCanvas()');
 assert.equal(sync,sincronizaciones);assert.equal(run('JSON.stringify(S)'),estadoAntesEquipo);assert.equal(run('profesoresCanvasRamo(r)[0]'),'Docente Sintético Uno');
 await run('olvidarCanvasCuenta()');assert.equal(run('docenciaCanvasDeRamo(r)'),null,'olvidar cuenta elimina el equipo de sesión');
 run('r.seccion=5');assert.equal(run('docenciaCanvasDeRamo(r)'),null);const con5=run('JSON.stringify(r)');await run('traerRamosCanvas()');assert.equal(run('JSON.stringify(r)'),con5,'Canvas 2 no toca la sección 5');assert.equal(run('propuestaDocenciaCanvas(r)'),null);
 run('r.seccion=null;propuestasDocenciaCanvas.clear()');personas=[];await run('traerRamosCanvas()');
 assert.equal(run('revisionDocenciaCanvas.filas[0].nueva'),null,'sin profesores visibles no inventa equipo');assert(!/Profesor:|Ayudante:/.test(nodo('modal-content').innerHTML));
 run('cerrarRevisionDocenciaCanvas()');
 // El programa de la sección se identifica sin reemplazar la pauta propia.
 run(`globalThis.def={coordinado:false,reglasPorSeccion:true,sigla:'MAT1620',porSeccion:{2:{evals:[['Prueba sintética',60],['Examen sintético',40]]}}}`);
 assert.equal(run('programaQueCalza(r,def)'),null);run('r.seccion=2');assert.deepEqual(json('programaQueCalza(r,def).secciones'),[2]);
 // La revisión no pisa una sección cambiada a mano mientras estaba abierta.
 personas=[{nombre:'Docente Sintético Dos',rol:'profesor'}];run('r.seccion=null');await run('traerRamosCanvas()');seleccionar();run('r.seccion=5;guardarRevisionDocenciaCanvas()');assert.equal(run('r.seccion'),5);assert.match(nodo('canvas-docencia-error').textContent,/Revisa la sección/);
 run('cerrarRevisionDocenciaCanvas();r.seccion=null');await run('traerRamosCanvas()');seleccionar();run("currentUser={id:'00000000-0000-0000-0000-000000000002'};guardarRevisionDocenciaCanvas()");assert.equal(run('r.seccion'),null);assert.match(nodo('canvas-docencia-error').textContent,/Cambió la cuenta/);
 // Una cuenta anterior no adquiere campos ni cambia notas al normalizar.
 assert.equal(json('normalize(S).ramos.find(r=>r.id==="r")').docenciaCanvas,undefined);assert.equal(run('ramoAvg(normalize(S).ramos.find(r=>r.id==="r"))'),5.4);
 await run('leerDocenciaCanvas([{id:44,sigla:"MAT1620",seccion:2,periodo:"2027 primer semestre"}])');assert(!pedidos.some(p=>p.path==='courses/44/users'),'no lee el equipo de otro período');
 ctx.window.Capacitor.isNativePlatform=()=>false;assert.equal(run('docenciaCanvasDeRamo(r)'),null,'web sin docencia Canvas');
 console.log('PASS Canvas docencia: sección propuesta, conservación, roles, confirmación, sección persistida/sync, equipo solo en sesión y cuentas existentes');
})().catch(e=>{console.error(e);process.exit(1)});
