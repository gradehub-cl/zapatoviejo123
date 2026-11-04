// Pautas propias; la fecha de evaluación no implica que ya haya sido rendida.
const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const store=new Map(),writes=[];
const el=()=>({style:{setProperty(){},removeProperty(){}},classList:{add(){},remove(){},contains(){return false}},dataset:{},value:'',innerHTML:'',addEventListener(){},appendChild(){},setAttribute(){},removeAttribute(){},getAttribute(){return null},querySelector(){return null},querySelectorAll(){return[]}}),stub=el();
const ctx={console,window:{addEventListener(){},matchMedia:()=>({matches:true,addEventListener(){}})},document:{getElementById:()=>stub,createElement:el,documentElement:stub,body:stub,addEventListener(){},querySelector(){return null},querySelectorAll(){return[]}},localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>{writes.push(k);store.set(k,v)},removeItem:k=>store.delete(k)},navigator:{},location:{origin:'',pathname:'/',hash:''},setTimeout(){},clearTimeout(){},requestAnimationFrame(){}};
vm.createContext(ctx);for(const f of ['data.js','engine.js','app.js','render-main.js'])vm.runInContext(fs.readFileSync(__dirname+'/../'+f,'utf8'),ctx);
writes.length=0;
const run=s=>vm.runInContext(s,ctx),hoy=new Date(2026,10,3,12);ctx.hoy=hoy;
const nota=(id,fecha,valor=null)=>({id,nombre:id,fecha,valor,peso:1});
const ramo=(id,notas)=>({id,nombre:'Ramo '+id,creditos:10,categorias:[{id:'c-'+id,nombre:'Pruebas',peso:100,directNota:true,slots:3,notas}]});
function preparar(ramos){ctx.ramos=ramos;run("S={tenant:'uc',tipoCuenta:'estudiante',ramos,historial:[]};var currentUser=null");}
const listado=()=>JSON.parse(run('JSON.stringify(recordatoriosNotasFaltantes(hoy).map(e=>({ramo:e.ramo.id,nota:e.nota?.id,fecha:e.fecha})))'));
preparar([ramo('a',[nota('I1','2026-10-20'),nota('I2','2026-11-02'),nota('I3','2026-11-05')])]);
run("currentUser={id:'alumno-sintetico'};recordatoriosProfesorContexto={cuenta:currentUser.id,ramos:new Set(['a'])}");
const lista=()=>JSON.parse(run('JSON.stringify(recordatoriosNotasProfesor(hoy).map(e=>({nota:e.nota?.id,clave:e.clave})))'));
assert.deepEqual(lista().map(e=>e.nota),['I2'],'pasó ayer: no espera siete días');assert.equal(run('recordatoriosNotasFaltantes(hoy).length'),0,'no duplica el recordatorio general');
const original=run('JSON.stringify(S)');run('var itemProfesor=recordatoriosNotasProfesor(hoy)[0]');assert(run('recordatorioNotaHTML(itemProfesor)').includes('Tu profe la usa para ver cómo vas'));run('descartarRecordatorioProfesor(itemProfesor,hoy)');assert.equal(lista().length,0,'no encadena I1 antigua');assert(writes.every(k=>k==='gradehub_recordatorios_profesor_descartados_v1'));assert.equal(run('JSON.stringify(S)'),original,'no escribe S');
run('descartesProfesorSesion.clear()');assert.equal(lista().length,0,'persiste en el dispositivo');ctx.despues=new Date(2026,10,6,12);assert.deepEqual(JSON.parse(run('JSON.stringify(recordatoriosNotasProfesor(despues).map(e=>e.nota.id))')),['I3'],'vuelve con la siguiente evaluación, no cada día');
run("S.ramos[0].categorias[0].notas[1].fecha='2026-11-01'");assert.equal(lista().length,0,'cambiar la fecha de una nota con id no revive el descarte');
run("S.ramos[0].categorias[0].notas[2].valor=5");assert.equal(run('recordatoriosNotasProfesor(despues).length'),0,'con nota no aparece');run("S.tipoCuenta='profesor'");assert.equal(lista().length,0);run("S.tipoCuenta='estudiante'");
run("recordatoriosProfesorContexto={cuenta:currentUser.id,ramos:new Set()}");assert.equal(lista().length,0,'sin conexión no dice tu profe');assert.equal(run('recordatoriosNotasFaltantes(hoy).length'),0,'cerrada no reaparece como aviso general sin conexión');
run("currentUser={id:'otra-cuenta'}");assert.equal(lista().length,0,'otra cuenta no usa conexiones anteriores');assert.equal(run('recordatoriosNotasFaltantes(hoy).length'),1,'descartes de otra cuenta no se heredan');
preparar([ramo('b',[nota('NB','2026-11-01')])]);run("currentUser={id:'alumno-b'};recordatoriosProfesorContexto={cuenta:currentUser.id,ramos:new Set(['b'])}");assert.equal(lista().length,1);
for(const final of [{cierre:{tenant:'uc'}},{notaOficial:5},{avgOverride:5}]){Object.assign(ctx.ramos[0],final);assert.equal(lista().length,0,'ramo cerrado no recuerda al profesor');for(const k of Object.keys(final))delete ctx.ramos[0][k];}
run("S.tipoCuenta='profesor'");assert.equal(lista().length,0);run("S.tipoCuenta='estudiante'");
(async()=>{
 ctx.caja={isConnected:true,querySelectorAll(){return[]}};run("var supabaseClient={rpc:async()=>({error:{code:'PGRST202'}})}");await run('actualizarRecordatoriosProfesorHome(caja,hoy)');assert.equal(run('ramosRecordatorioProfesor().size'),0,'sin RPC no rompe Inicio');
 run("supabaseClient={rpc:()=>new Promise(r=>globalThis.resolver=r)};var pendiente=actualizarRecordatoriosProfesorHome(caja,hoy)");run("currentUser={id:'tercera-cuenta'};resolver({data:[{ramos:['a']}]})");await run('pendiente');assert.equal(run('ramosRecordatorioProfesor().size'),0,'respuesta anterior no pinta otra cuenta');
 console.log('PASS: pasado/futuro/con nota/cerrado/profesor, una por ramo, no duplica, descarte hasta siguiente evaluación, local sin S, sin SQL y respuesta tardía');
})().catch(e=>{console.error(e);process.exitCode=1});
