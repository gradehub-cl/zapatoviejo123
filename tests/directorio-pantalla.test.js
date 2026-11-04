// El directorio usa solo su catálogo público. Ramos/notas personales prohibidos.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const src=fs.readFileSync(path.join(__dirname,'../marketplace.js'),'utf8');
const llamadas=[],ctx={console,URL,Intl,esc:s=>String(s??'').replace(/</g,'&lt;').replace(/"/g,'&quot;'),currentUser:{id:'cuenta-sintetica'},
 S:{tenant:'uc',get ramos(){throw Error('No leer ramos personales')},get historial(){throw Error('No leer notas')}},
 supabaseClient:{rpc:async(n,p)=>{llamadas.push({n,p});return {data:false,error:null}}}};
vm.createContext(ctx);vm.runInContext(src,ctx);const run=s=>vm.runInContext(s,ctx),plain=x=>JSON.parse(JSON.stringify(x));
const ahora=Date.parse('2026-11-04T12:00:00Z'),perfiles=Array.from({length:10},(_,i)=>({id:'p'+i,nombre_publico:'Profe '+i,
 etiqueta:i===0?'Clases STEM':'Apuntes ficticios',categorias:i===0?['clases','laboratorio']:['material'],ramos_siglas:['SYN101'],
 destacado_hasta:i===1?'2026-11-05T12:00:00Z':i===2?'2026-11-01T12:00:00Z':null,en_directorio:true,estado:'aprobado'}));
ctx.perfiles=perfiles;ctx.ahora=ahora;const prep=op=>plain(run(`prepararDirectorio(perfiles,{ahora,...${JSON.stringify(op||{})}})`));
assert.equal(prep().destacados.length,1);assert(prep().normales.some(p=>p.id==='p2'));
assert.deepEqual(prep(),prep());const manana=prep({ahora:ahora+86400000});assert.notDeepEqual(prep().normales.map(p=>p.id),manana.normales.map(p=>p.id));
const invertido=plain(run('prepararDirectorio(perfiles.slice().reverse(),{ahora})'));assert.deepEqual(invertido,prep(),'orden de llegada no altera semilla');
const copia=JSON.stringify(perfiles);prep({busqueda:'stem'});assert.equal(JSON.stringify(perfiles),copia);
ctx.perfiles=[...perfiles,{...perfiles[0],id:'privado',en_directorio:false},{...perfiles[0],id:'suspendido',estado:'suspendido'}];
assert.equal(prep().normales.length,9);
assert.equal(prep({busqueda:'SYN101'}).normales.length,9);
assert.equal(prep({busqueda:'Cálculo sintético',nombres:{SYN101:'Cálculo sintético'}}).normales.length,9);
assert.deepEqual(prep({busqueda:'clases stem'}).normales.map(p=>p.id),['p0']);
assert.deepEqual(prep({categoria:'laboratorio'}).normales.map(p=>p.id),['p0']);
assert.equal(prep({categoria:'otro'}).normales.length,0);
const anuncios=[{id:'pagado',precio_clp:10000,estado:'publicado',ramos_siglas:['SYN101']},{id:'gratis',precio_clp:0,estado:'publicado',ramos_siglas:['SYN101']},
{id:'vencido',precio_clp:10000,estado:'publicado',ramos_siglas:['SYN101'],vence_at:'2020-01-01'}];
ctx.anuncios=anuncios;assert.deepEqual(plain(run("anunciosDestacadosDirectorio(anuncios,'','',{},ahora).map(a=>a.id)")),['pagado']);
assert(run('cabeceraDirectorioHTML()').includes('type="search"'));
assert(run("perfilDirectorioHTML({...perfiles[0],contacto_tipo:'email'},[])").includes('data-directorio-contactar'));
assert(!run("perfilDirectorioHTML({...perfiles[0],contacto_tipo:'email'},[])").includes('mailto:'));
assert(run('metricasDirectorioHTML({vistas:null,aperturas:17,contactos:null})').includes('—'));
(async()=>{assert.equal(await run("registrarEventoDirectorio('p0','vista','uc')"),false);assert.equal(llamadas.length,1,'false no reintenta');
 assert.deepEqual(Object.keys(llamadas[0].p).sort(),['p_evento_id','p_perfil','p_tenant','p_tipo']);
 let resolver;ctx.supabaseClient.rpc=()=>new Promise(r=>resolver=r);const pendiente=run("registrarEventoDirectorio('p0','apertura','uc')");ctx.currentUser={id:'otra-cuenta'};resolver({data:true,error:null});assert.equal(await pendiente,false);
 console.log('PASS: consentimiento/suspensión, vencimiento, orden diario estable, búsqueda, categorías, sin S, false terminal y sin correo precargado');
})().catch(e=>{console.error(e);process.exitCode=1});
