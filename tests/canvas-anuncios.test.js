// Anuncios, cuentas y pautas sintéticos. Se prueban lector, hoja y guardado reales.
const assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),vm=require('vm');
const leer=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8'),ids=new Map();let guardados=0;
const nodo=id=>{if(ids.has(id))return ids.get(id);const n={innerHTML:'',value:'',dataset:{},style:{setProperty(){},removeProperty(){}},classList:{add(){},remove(){},toggle(){},contains(){return false}},addEventListener(){},appendChild(){},setAttribute(){},removeAttribute(){},focus(){},querySelectorAll(){return []},isConnected:true};ids.set(id,n);return n;};
let anuncios=[],tareas=[],fallar=false,peticiones=[],metricas=[];
let codigoEventos=null,conectado=true;
const puente={
 estado:async()=>({conectado}),
 get:async({path,params})=>{
  peticiones.push({path,params});
  if(path==='courses')return {data:[{id:42,course_code:'SYN100-2',term:{name:'2026 Segundo Semestre'}}]};
  if(path.endsWith('/assignments'))return {data:tareas};
  if(path==='calendar_events'&&codigoEventos)throw Object.assign(Error('No pudimos leer los eventos'),{code:codigoEventos});
  if(path.endsWith('discussion_topics')){if(fallar)throw Error('No autorizado');return {data:anuncios};}
  return {data:[]};
 }
};
const ctx={console,Intl,window:{addEventListener(){},matchMedia:()=>({matches:false,addEventListener(){},addListener(){}}),Capacitor:{isNativePlatform:()=>true,Plugins:{GradeHubCanvas:puente}}},document:{getElementById:nodo,createElement:()=>nodo('nuevo'),addEventListener(){},documentElement:nodo('html'),body:nodo('body'),querySelector:()=>nodo('query'),querySelectorAll:()=>[]},localStorage:{getItem(){return null},setItem(){guardados++},removeItem(){}},navigator:{},location:{origin:'',pathname:'/',hash:''},setTimeout(){},clearTimeout(){}};
vm.createContext(ctx);for(const f of ['data.js','engine.js','app.js'])vm.runInContext(leer(f),ctx,{filename:f});
const run=s=>vm.runInContext(s,ctx),json=s=>JSON.parse(run('JSON.stringify('+s+')'));
run(`S.tenant='uc';S.tipoCuenta='estudiante';currentUser={id:'00000000-0000-0000-0000-000000000001'};S.ramos=[{id:'r',nombre:'Curso sintético',sigla:'SYN100',seccion:2,categorias:[{id:'i1',nombre:'Interrogación 1',peso:30,notas:[]},{id:'i2',nombre:'Interrogación 2',peso:40,notas:[]},{id:'c',nombre:'Controles',peso:30,slots:3,notas:[{id:'c3',nombre:'Control 3',slot:2,valor:null,peso:1}]}]}];globalThis.r=S.ramos.find(r=>r.id==='r');`);
const anuncio=(texto,title='Fechas del curso',posted_at='2026-11-08T15:00:00Z')=>({title,posted_at,texto});
const leerAnuncio=(a,ahora='2026-11-18T15:00:00Z')=>json('fechasDeAnuncioCanvas('+JSON.stringify(a)+',r,new Date('+JSON.stringify(ahora)+'))');
const antes=run('JSON.stringify(S)');
let p=leerAnuncio(anuncio('Les recuerdo que la I2 es el jueves 20 de noviembre a las 17:30 en B12'));
assert.equal(p.length,1);assert.equal(p[0].target,'r|i2|');assert.equal(p[0].fecha,'2026-11-20');assert.equal(p[0].hora,'17:30');assert.equal(p[0].sala,'B12');
assert.equal(run('JSON.stringify(S)'),antes,'leer es puro');
run("r.categorias.find(c=>c.id==='i2').fecha='2026-11-13'");
p=leerAnuncio(anuncio('La I2 se mueve al 20','Reprogramación del control'));
assert.equal(p[0].estado,'cambio');assert.equal(p[0].fechaAnterior,'2026-11-13');assert.equal(p[0].fecha,'2026-11-20');
assert.equal(leerAnuncio(anuncio('Las notas de la I1 están publicadas')).length,0);
assert.equal(leerAnuncio(anuncio('Las notas de la I1 están publicadas el 20/11')).length,0);
p=leerAnuncio(anuncio('La I1 será el 20/11 a las 10:00 y la I2 será el 25 de noviembre a las 17:30'));
assert.equal(p.length,2);assert.deepEqual(p.map(p=>[p.target,p.fecha,p.hora]),[['r|i1|','2026-11-20','10:00'],['r|i2|','2026-11-25','17:30']]);
assert.equal(leerAnuncio(anuncio('Será el 20/11','I2'))[0].target,'r|i2|','nombre en título');
assert.equal(leerAnuncio(anuncio('Revisa el anuncio.','I2: 20/11'))[0].fecha,'2026-11-20','fecha en título');
assert.equal(leerAnuncio(anuncio('El C3 será el 22/11'))[0].target,'r|c|c3','alias compartido con puntajeCanvas');
assert.equal(leerAnuncio(anuncio('La I1 será el 5 de enero','Fecha','2026-12-28T15:00:00Z'),'2026-12-28T16:00:00Z')[0].fecha,'2027-01-05');
assert.equal(leerAnuncio(anuncio('La I1 será el 4/1','Fecha','2026-12-28T15:00:00Z'),'2026-12-28T16:00:00Z')[0].fecha,'2027-01-04');
assert.equal(leerAnuncio(anuncio('La I1 fue el 20 de diciembre','Fecha','2027-01-02T15:00:00Z'),'2027-01-03T16:00:00Z').length,0,'enero no revive diciembre como futuro');
for(const texto of ['La I1 puede ser el 20 o 21 de noviembre','La I1 será entre el 20 y 22 de noviembre','La I1 será el 31/11','La I1 será el 20/13','La I1 será el 20 de mesdesconocido','La I1 y la I2 serán el 20/11','La I1 será el 20/11 o el 22/11','La I1 será el 20/11 a las 25:30','La I1 no será el 20/11','La I1 será el 20/11/25','La I1 será tentativamente el 20/11','La I1 será del 20 al 21 de noviembre'])assert.equal(leerAnuncio(anuncio(texto)).length,0,texto);
assert.equal(leerAnuncio(anuncio('La I3 será el 20/11','I2')).length,0,'un nombre desconocido no se atribuye al del título');
assert.equal(leerAnuncio(anuncio('La ayudantía será el 20/11','I2')).length,0);
run("r.categorias.push({id:'otra-i2',nombre:'I2',notas:[]})");assert.equal(leerAnuncio(anuncio('La I2 será el 20/11')).length,0,'dos destinos con el mismo alias no se adivinan');run("r.categorias=r.categorias.filter(c=>c.id!=='otra-i2')");
// Una nota puede heredar la fecha de su categoría; cambiarla no mueve las demás.
run("r.categorias.find(c=>c.id==='c').fecha='2026-11-13'");
p=leerAnuncio(anuncio('El C3 se mueve al 20/11 a las 10:00'));
assert.equal(p[0].fechaAnterior,'2026-11-13');ctx.heredadas=p;
assert.equal(run('aplicarPropuestasIcs(heredadas)'),1);
assert.equal(run("r.categorias.find(c=>c.id==='c').fecha"),'2026-11-13');
assert.equal(run("r.categorias.find(c=>c.id==='c').notas.find(n=>n.id==='c3').fecha"),'2026-11-20');
run("delete r.categorias.find(c=>c.id==='c').fecha;delete r.categorias.find(c=>c.id==='c').notas.find(n=>n.id==='c3').fecha;delete r.categorias.find(c=>c.id==='c').notas.find(n=>n.id==='c3').hora");
// Una casilla fija vacía recibe fecha solo al confirmar; su nota sigue pendiente.
run("r.categorias.find(c=>c.id==='i1').notas=[{id:'n-i1',nombre:'Interrogación 1',valor:5.4,peso:1}]");
const promedioAntes=run('ramoAvg(r)');assert.equal(promedioAntes,5.4,'la regresión usa un promedio calculado, no dos valores vacíos');
const notasAntes=run("r.categorias.find(c=>c.id==='c').notas.length");
p=leerAnuncio(anuncio('El C2 será el 24/11'));assert.equal(p.length,1);
assert.equal(run("r.categorias.find(c=>c.id==='c').notas.length"),notasAntes);
ctx.vacias=p;assert.equal(run('aplicarPropuestasIcs(vacias)'),1);
assert.equal(run("r.categorias.find(c=>c.id==='c').notas.find(n=>n.slot===1).valor"),null);
assert.equal(run("r.categorias.find(c=>c.id==='c').notas.find(n=>n.slot===1).fecha"),'2026-11-24');
assert.equal(run('ramoAvg(r)'),promedioAntes);
const destinosPuros=json('destinosAnunciosCanvas(r)');ctx.destinosPuros=destinosPuros;ctx.anuncioPuro=anuncio('La I2 será el 20/11');
const leidoPuro=json('leerFechasAnuncioCanvas(anuncioPuro,destinosPuros,new Date("2026-11-18T15:00:00Z"))');
run("S.tenant='udd'");assert.deepEqual(json('leerFechasAnuncioCanvas(anuncioPuro,destinosPuros,new Date("2026-11-18T15:00:00Z"))'),leidoPuro,'el núcleo no depende de la cuenta ni del catálogo global');run("S.tenant='uc'");
const reciente=anuncio('La I2 será el 25/11','Reprogramación','2026-11-18T14:00:00Z'),viejo=anuncio('La I2 será el 20/11','Fecha antigua','2026-11-08T14:00:00Z');
const incierto=anuncio('La I2 se reprograma, fecha por confirmar','Aviso','2026-11-18T14:00:00Z');
assert.equal(json('propuestasAnunciosCanvas('+JSON.stringify([viejo,incierto])+',r,new Date("2026-11-18T15:00:00Z"))').length,0,'un anuncio reciente incierto no revive el antiguo');
run("r.categorias.find(c=>c.id==='i2').fecha='2026-11-25'");
assert.equal(json('propuestasAnunciosCanvas('+JSON.stringify([viejo,reciente])+',r,new Date("2026-11-18T15:00:00Z"))').length,0,'si la última fecha ya coincide no revive un anuncio anterior');
run("r.categorias.find(c=>c.id==='i2').fecha='2026-11-13'");
p=leerAnuncio(anuncio('La I2 se mueve al 20 a las 17:30 en B12','Reprogramación del control'));
ctx.propuestas=p;run("icsImportDraft=propuestas;contextoFechasCanvas={estado:S,cuenta:currentUser.id};renderRevisionIcs()");
assert.match(nodo('modal-content').innerHTML,/Cambio propuesto: del 13 nov al 20 nov · 17:30/);assert.match(nodo('modal-content').innerHTML,/Reprogramación del control/);assert.match(nodo('modal-content').innerHTML,/del 8 nov/);assert.match(nodo('modal-content').innerHTML,/Sala B12/);
const antesHoja=run('JSON.stringify(S)');run("asignarDestinoIcs(0,'')");assert.equal(run('aplicarPropuestasIcs(icsImportDraft)'),0);assert.equal(run('JSON.stringify(S)'),antesHoja,'descartar no cambia la fecha');run("asignarDestinoIcs(0,'r|i2|')");
assert.equal(run('aplicarPropuestasIcs(icsImportDraft)'),1);assert.equal(run("r.categorias.find(c=>c.id==='i2').fecha"),'2026-11-20');assert.equal(run("r.categorias.find(c=>c.id==='i2').hora"),'17:30');
run("r.categorias.find(c=>c.id==='i2').fecha='2026-11-21'");assert.throws(()=>run('aplicarPropuestasIcs(icsImportDraft)'),/cambió mientras/);assert.equal(run("r.categorias.find(c=>c.id==='i2').fecha"),'2026-11-21');
run("S={...S};");assert.throws(()=>run('aplicarPropuestasIcs(icsImportDraft)'),/Cambió la cuenta/);run('contextoFechasCanvas=null');
ctx.window.Capacitor.isNativePlatform=()=>false;assert.throws(()=>run('aplicarPropuestasIcs(icsImportDraft)'),/no está disponible/);ctx.window.Capacitor.isNativePlatform=()=>true;
// Entrada real «Traer fechas», sin guardar ni métricas de texto/fechas/siglas.
(async()=>{
 run(`S.ramos=[r];r.categorias.find(c=>c.id==='i2').fecha='2026-11-13';delete r.categorias.find(c=>c.id==='i2').hora;openModal=()=>{};closeModal=()=>{};renderAgenda=()=>{};showToast=()=>{};globalThis.syncToCloud=()=>{};`);
 ctx.track=(...a)=>metricas.push(a);
 // El reloj de lectura se fija sin reemplazar el parser de fechas ni el puente.
 const ActualDate=Date;ctx.Date=class extends ActualDate{constructor(...a){super(...(a.length?a:['2026-11-18T15:00:00Z']))}};
 anuncios=[anuncio('La I2 se mueve al 20 a las 17:30 en B12','Reprogramación del control')];tareas=[{name:'I2',due_at:'2026-11-19T13:00:00Z'}];const guardadosAntes=guardados;
 await run('traerFechasCanvas()');
 assert(peticiones.some(p=>p.path==='courses/42/discussion_topics'&&p.params.only_announcements==='true'));
 assert.equal(run('icsImportDraft.length'),1);assert.equal(guardados,guardadosAntes);assert.equal(run("r.categorias.find(c=>c.id==='i2').fecha"),'2026-11-13');
 assert(!/Reprogramaci|SYN100|2026-11-20|B12/.test(JSON.stringify(metricas)),'sin contenido en métricas');
 run('confirmarImportarCalendario()');assert.equal(run("r.categorias.find(c=>c.id==='i2').fecha"),'2026-11-20');assert(guardados>guardadosAntes,'confirmar sí guarda');
 fallar=true;tareas=[{name:'Control 3',due_at:'2026-11-23T13:00:00Z'}];await run('traerFechasCanvas()');assert.match(nodo('modal-content').innerHTML,/No pudimos leer los anuncios/);assert.equal(run('icsImportDraft.length'),1,'las tareas siguen en la hoja sin la ruta nueva');assert.equal(run('icsImportDraft[0].origen'),'canvas');
 assert.equal(run("r.categorias.find(c=>c.id==='i2').fecha"),'2026-11-20','un binario viejo o error de anuncios no cambia lo existente');
 for(const codigo of ['403','401']){
  codigoEventos=codigo;
  await run('traerFechasCanvas()');
  assert.match(nodo('modal-content').innerHTML,/No pudimos leer los eventos del calendario de 1 curso/);
  assert.equal(run('icsImportDraft[0].target'),'r|c|c3','una tarea sigue disponible si falla la consulta de eventos');
 }
 conectado=false;
 for(const codigo of ['401','429']){
  codigoEventos=codigo;peticiones=[];nodo('modal-content').innerHTML='';
  await run('traerFechasCanvas()');
  assert.equal(nodo('modal-content').innerHTML,'','sin revisión si se revocó el token o hay límite temporal');
  assert(!peticiones.some(p=>p.path.endsWith('discussion_topics')),'no sigue consultando Canvas');
 }
 console.log('PASS anuncios Canvas: alias, fechas, cambios revisados, año, ambigüedad, cuenta, persistencia y respaldo');
})().catch(e=>{console.error(e);process.exit(1)});
