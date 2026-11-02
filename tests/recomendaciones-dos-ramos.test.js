// Escenarios sintéticos del mismo código que pinta Inicio. Sin red ni notas reales.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const handlers={window:{},document:{}},disco={gradehub_v1:'notas sintéticas intactas'};
const el=()=>({style:{setProperty(){},removeProperty(){}},classList:{add(){},remove(){},contains(){return false},toggle(){}},dataset:{},addEventListener(){},appendChild(){},setAttribute(){},removeAttribute(){},querySelector(){return null},querySelectorAll(){return []},value:''});
const escucha=tipo=>(evento,fn)=>{(handlers[tipo][evento]??=[]).push(fn);};
const ctx={console,Intl,setTimeout,clearTimeout,window:{addEventListener:escucha('window'),matchMedia:()=>({matches:false,addEventListener(){},addListener(){}})},document:{addEventListener:escucha('document'),getElementById:el,createElement:el,documentElement:el(),body:el(),querySelector(){return null},querySelectorAll(){return []},visibilityState:'visible'},localStorage:{getItem:k=>disco[k]||null,setItem:(k,v)=>{disco[k]=String(v)},removeItem:k=>{delete disco[k]}},navigator:{},location:{origin:'',pathname:'/',hash:''}};
vm.createContext(ctx);for(const f of ['data.js','engine.js','app.js','app-session.js','marketplace.js'])vm.runInContext(fs.readFileSync(__dirname+'/../'+f,'utf8'),ctx);
const run=s=>vm.runInContext(s,ctx),plain=x=>JSON.parse(JSON.stringify(x));
const t=Date.parse('2026-10-31T12:00:00-03:00');
const ramo=(id,sigla)=>({id,nombre:'Ramo sintético '+id,sigla,origen:{tenant:'uc',ramoKey:sigla},gates:[],categorias:[{id:'i',nombre:'Evaluación 1',peso:50,directNota:true,notas:[{id:'n',valor:4.5,peso:1}]},{id:'e',nombre:'Evaluación 2',peso:50,directNota:true,notas:[]}]});
const ramos=[ramo('r1','TEST100'),ramo('r2','TEST200'),ramo('r3','TEST300'),ramo('r4','TEST400')];
const aviso=(id,sigla,precio=0)=>({id,tenant:'uc',ramos_siglas:[sigla],precio_clp:precio,estado:'publicado',publicado_at:'2026-10-01T00:00:00Z',vence_at:'2026-12-01T00:00:00Z',criterios:{avanceMinimo:0,promedioMenorA:5.5}});
ctx.__r=ramos;ctx.__a=[aviso('a-gratis','TEST100'),aviso('z-pagado','TEST100',10000)];
const seleccionar=(e={},visita='v1',ahora=t,uid='u1')=>{Object.assign(ctx,{__e:e,__v:visita,__t:ahora,__uid:uid});return plain(run("recomendacionesPorRamo(__a,__r,'uc',__e,__t,__v,__uid)"));};
const ids=x=>x.selecciones.map(s=>s.anuncio.id);
const guardadoAntes=JSON.stringify(ramos);
let e={},seq=[];
for(const v of ['v1','v2','v3','v4']){const x=seleccionar(e,v);seq.push(ids(x)[0]);e=x.estado;assert.deepEqual(ids(seleccionar(e,v)),ids(x),'repintar dentro de la misma apertura no rota');}
assert.deepEqual(seq,['z-pagado','a-gratis','z-pagado','a-gratis'],'pagado → gratis → pagado sin tocar X');
ctx.__a.push(aviso('x-pagado','TEST100',20000),aviso('b-gratis','TEST100'));
e={};seq=[];for(let i=0;i<5;i++){const x=seleccionar(e,'v'+i);seq.push(ids(x)[0]);e=x.estado;}
assert.deepEqual(seq,['x-pagado','z-pagado','a-gratis','b-gratis','x-pagado'],'cada aviso tiene un turno, primero los pagados');
ctx.__a=[aviso('p1','TEST100',10000),aviso('g1','TEST100'),aviso('p2','TEST200',10000),aviso('g2','TEST200')];
let x=seleccionar();assert.deepEqual(ids(x),['p1','p2']);
let y=seleccionar(x.estado,'v2');assert.deepEqual(ids(y),['g1','g2'],'dos ramos alternan por separado');
// Cerrar el pagado de r1 no avanza r2, ni vuelve a mostrar r1 inmediatamente.
ctx.__guardar=x.estado;ctx.__ramo=ramos[0];ctx.__ahora=t;run("currentUser={id:'u1'};guardarEstadoMarketplace(__guardar);descartarRecomendacionClase('p1',__ahora,__ramo)");
const cerrado=plain(run('leerEstadoMarketplace()'));
x=seleccionar(cerrado,'v1',t+1);assert.deepEqual(ids(x),['p2']);assert.equal(x.esperaHasta,t+30000);
y=seleccionar(x.estado,'v2',t+10000);assert.equal(y.selecciones.some(s=>s.ramo.id==='r1'),false,'reabrir no salta la pausa');
y=seleccionar(y.estado,'v2',t+29999);assert.equal(y.selecciones.some(s=>s.ramo.id==='r1'),false);
y=seleccionar(y.estado,'v2',t+30000);assert(ids(y).includes('g1'),'al cumplirse la pausa entra el siguiente del mismo ramo');
assert.equal(y.selecciones.find(s=>s.ramo.id==='r2').anuncio.id,'g2','el cierre del otro ramo no consume su turno');
assert.equal(ids(seleccionar(y.estado,'v3',t+60000)).includes('p1'),false,'la X conserva el cierre por todo el día');
const siguienteDia=Date.parse('2026-11-01T00:00:00-03:00');
assert(ids(seleccionar(y.estado,'mañana',siguienteDia)).includes('p1'),'el pagado cerrado puede volver al día siguiente');
assert.deepEqual(ids(seleccionar(y.estado,'otra',t+60000,'u2')),['p1','p2'],'otra cuenta no hereda cierre ni rotación');
// El cierre sincronizado de otro dispositivo tampoco reemplaza de inmediato.
run('cierresAnunciosCuenta.clear()');
x=seleccionar({},'remoto');ctx.__vence=t+3600000;run("cierreAnunciosCuenta('u1').porAnuncio.p1=__vence");
y=seleccionar(x.estado,'remoto',t+1000);assert.deepEqual(ids(y),['p2']);assert.equal(y.esperaHasta,t+31000);
y=seleccionar(y.estado,'remoto',t+31000);assert.deepEqual(ids(y),['g1','p2']);run('cierresAnunciosCuenta.clear()');
// Más de dos ramos: todos participan, aun cuando el orden local no cambia.
ctx.__a=ramos.flatMap((r,i)=>[aviso('p'+i,r.sigla,10000),aviso('g'+i,r.sigla)]);
e={};const pares=[];
for(let i=0;i<4;i++){x=seleccionar(e,'apertura-'+i);assert.equal(x.selecciones.length,2);assert.equal(new Set(x.selecciones.map(s=>s.ramo.id)).size,2);pares.push(x.selecciones.map(s=>s.ramo.id));e=x.estado;}
assert.deepEqual(pares,[['r1','r2'],['r3','r4'],['r1','r2'],['r3','r4']]);
assert.deepEqual(ids(x),['g2','g3'],'cada ramo avanza solo cuando le toca mostrarse');
ctx.__a=ctx.__a.filter(a=>a.ramos_siglas[0]!=='TEST400');e={};const vistos=new Set();for(let i=0;i<3;i++){x=seleccionar(e,'impar'+i);x.selecciones.forEach(s=>vistos.add(s.ramo.id));e=x.estado;}assert.equal(vistos.size,3);
// Nada de datos inventados ni de público más amplio para llenar las dos casillas.
ctx.__a=[{...aviso('no-publicado','TEST100'),estado:'pausado'},aviso('otro-tenant','TEST100')];ctx.__a[1].tenant='uai';assert.equal(seleccionar().selecciones.length,0);
ctx.__a=[aviso('sin-notas','TEST100')];ctx.__r=[ramo('sin','TEST100')];ctx.__r[0].categorias[0].notas=[];assert.equal(seleccionar().selecciones.length,0);
ctx.__r=ramos;ctx.__a=[aviso('solo','TEST100')];assert.equal(seleccionar().selecciones.length,1);
assert.equal(seleccionar({ocultaHasta:t+1000}).selecciones.length,0,'respeta el cierre global heredado');
assert.equal(JSON.stringify(ramos),guardadoAntes);assert.equal(disco.gradehub_v1,'notas sintéticas intactas');
// Disco bloqueado: la preferencia y la pausa siguen vigentes en esta sesión.
ctx.__a=[aviso('p1','TEST100',10000),aviso('g1','TEST100')];x=seleccionar();ctx.__guardar=x.estado;ctx.__ramo=ramos[0];
run("localStorage.setItem=()=>{throw Error('bloqueado')};guardarEstadoMarketplace(__guardar);descartarRecomendacionClase('p1',__ahora,__ramo)");
y=seleccionar(plain(run('leerEstadoMarketplace()')),'v1',t+1000);assert.equal(y.selecciones.length,0);assert.equal(y.esperaHasta,t+30000);
// El cambio de día no acorta una pausa ya iniciada.
ctx.__a=[aviso('p1','TEST100',10000),aviso('g1','TEST100')];
const noche=Date.parse('2026-10-31T23:59:50-03:00');x=seleccionar({},'noche',noche);ctx.__guardar=x.estado;ctx.__ahora=noche;
run("guardarEstadoMarketplace(__guardar);descartarRecomendacionClase('p1',__ahora,__ramo)");
y=seleccionar(plain(run('leerEstadoMarketplace()')),'nueva',siguienteDia);assert.equal(y.selecciones.length,0);assert.equal(y.esperaHasta,noche+30000);
// Una campaña con dos siglas equivalentes no ocupa las dos casillas.
ctx.__a=[{...aviso('doble','TEST100'),ramos_siglas:['TEST100','TEST200']}];assert.equal(seleccionar().selecciones.length,1);
// Volver de segundo plano cambia apertura; el simple foco no lo hace.
run('currentUser=null;supabaseClient=null');let visita=run('VISITA_CLASES');ctx.document.visibilityState='hidden';handlers.document.visibilitychange.forEach(fn=>fn());ctx.document.visibilityState='visible';handlers.document.visibilitychange.forEach(fn=>fn());assert.notEqual(run('VISITA_CLASES'),visita);
visita=run('VISITA_CLASES');handlers.window.focus.forEach(fn=>fn());assert.equal(run('VISITA_CLASES'),visita);
handlers.window.pageshow.forEach(fn=>fn({persisted:true}));assert.equal(run('VISITA_CLASES'),visita,'dos eventos del mismo regreso no saltan dos turnos');
// El temporizador usa la navegación real por pestañas, que no marca
// screen-home.active. Tampoco pinta al cambiar de cuenta o salir de Inicio.
let tarea;ctx.setTimeout=fn=>{tarea=fn;return 1};ctx.clearTimeout=()=>{};
ctx.__contenedor={isConnected:true};ctx.__pintadas=0;
run("pintarRecomendacionClase=()=>{__pintadas++};currentUser={id:'timer'};currentTab='home';programarRecomendacionClase(__contenedor,Date.now()+30000,'timer')");
tarea();assert.equal(ctx.__pintadas,1);
run("programarRecomendacionClase(__contenedor,Date.now()+30000,'timer');currentTab='agenda'");tarea();assert.equal(ctx.__pintadas,1);
run("currentTab='home';programarRecomendacionClase(__contenedor,Date.now()+30000,'timer');currentUser={id:'otra'}");tarea();assert.equal(ctx.__pintadas,1);
console.log('OK: pagado/gratis sin X, dos ramos, rotación par/impar, estabilidad, pausa, cierre remoto y hasta mañana, cuentas aisladas, disco bloqueado, sin tocar notas y regreso desde segundo plano.');
