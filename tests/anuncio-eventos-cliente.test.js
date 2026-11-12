// Una exposición/clic real tiene una clave; reintentar transporte la conserva.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const fuente=fs.readFileSync(__dirname+'/../marketplace.js','utf8');
function montar(){
 const timers=new Map(),observers=[],llamadas=[],recibos=new Set();let siguiente=0,perder=true,legado=false;
 const ctx={console:{warn(){}},Intl,esc:s=>String(s),currentUser:{id:'estudiante-sintetico'},
  document:{visibilityState:'visible',getElementById(){return null;},querySelectorAll(){return[];},addEventListener(){},removeEventListener(){}},
  setTimeout(fn,ms){const id=++siguiente;timers.set(id,{fn,ms});return id;},clearTimeout(id){timers.delete(id);},
  IntersectionObserver:class{constructor(cb,options){this.cb=cb;this.options=options;observers.push(this);}observe(){}disconnect(){this.desconectado=true;}},
  supabaseClient:{async rpc(n,p){
   llamadas.push({n,p});
   if(n!=='registrar_evento_anuncio')return {data:true,error:null};
   if(legado)return {data:null,error:{code:'PGRST202',message:'function missing'}};
   const nuevo=!recibos.has(p.p_evento_id);recibos.add(p.p_evento_id);
   if(perder){perder=false;return {data:null,error:{message:'respuesta perdida'}};}
   return {data:nuevo,error:null};
  }}
 };
 vm.createContext(ctx);vm.runInContext(fuente,ctx);
 const run=c=>vm.runInContext(c,ctx);
 run("catalogoClasesActual=[{id:'aviso-sintetico',publicado_at:'2026-11-01T12:00:00Z',ramos_siglas:['TEST100']}]");
 const paso=async()=>{const [id,t]=timers.entries().next().value;timers.delete(id);await t.fn();return t.ms;};
 return {ctx,run,timers,observers,llamadas,recibos,paso,legado:()=>{legado=true;}};
}
(async()=>{
 const m=montar(),{run,llamadas,recibos}=m;
 assert.equal(await run("registrarInteraccionMedida('aviso-sintetico','apertura','TEST100')"),true);
 assert.equal(recibos.size,1);assert.equal(await m.paso(),5000);
 const eventos=()=>llamadas.filter(x=>x.n==='registrar_evento_anuncio');
 assert.equal(eventos().length,2);assert.equal(eventos()[0].p.p_evento_id,eventos()[1].p.p_evento_id);
 assert.equal(recibos.size,1,'respuesta perdida no agrega otro evento');
 await run("registrarInteraccionMedida('aviso-sintetico','apertura','TEST100')");
 assert.equal(recibos.size,2,'otro gesto sí cuenta, sin repetir el cobro');
 assert.equal(llamadas.filter(x=>x.n==='registrar_interaccion_anuncio').length,1);
 assert.deepEqual(Object.keys(eventos()[0].p).sort(),['p_anuncio_id','p_evento_id','p_publicacion','p_ramo_sigla','p_tipo']);
 assert.equal(eventos()[0].p.p_tipo,'clic');
 assert.match(eventos()[0].p.p_evento_id,/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
 assert.equal(eventos()[0].p.p_publicacion,'2026-11-01T12:00:00Z');

 const antiguo=montar();antiguo.legado();
 await antiguo.run("registrarInteraccionMedida('aviso-sintetico','apertura','TEST100')");
 await antiguo.run("registrarInteraccionMedida('aviso-sintetico','apertura','TEST100')");
 assert.equal(antiguo.llamadas.filter(x=>x.n==='registrar_evento_anuncio').length,1);
 assert.equal(antiguo.llamadas.filter(x=>x.n==='registrar_metrica_anuncio').length,2,'sin SQL conserva registro previo');

 const inicio=montar();inicio.run("anunciosRecomendacion.lista=catalogoClasesActual;__banner={isConnected:true};observarRecomendacionClase(__banner,catalogoClasesActual[0],'TEST100')");
 let obs=inicio.observers.at(-1);assert.deepEqual([...obs.options.threshold],[.5]);
 obs.cb([{isIntersecting:true,intersectionRatio:.49}]);assert.equal(inicio.timers.size,0);
 obs.cb([{isIntersecting:true,intersectionRatio:.5}]);assert.equal(await inicio.paso(),1000);
 assert.equal(await inicio.paso(),5000);assert.equal(inicio.recibos.size,1);
 inicio.run("observarRecomendacionClase(__banner,catalogoClasesActual[0],'TEST100')");
 assert.equal(inicio.observers.length,1,'repintar la misma apertura no duplica');
 inicio.run("VISITA_CLASES='otra-apertura';observarRecomendacionClase(__banner,catalogoClasesActual[0],'TEST100')");
 obs=inicio.observers.at(-1);obs.cb([{isIntersecting:true,intersectionRatio:1}]);await inicio.paso();
 assert.equal(inicio.recibos.size,2,'volver a abrir registra otra exposición');
 inicio.run("VISITA_CLASES='oculta';document.visibilityState='hidden';observarRecomendacionClase(__banner,catalogoClasesActual[0],'TEST100')");
 inicio.observers.at(-1).cb([{isIntersecting:true,intersectionRatio:1}]);assert.equal(inicio.timers.size,0);

 const cambio=montar();cambio.ctx.__cambio=async()=>{cambio.ctx.currentUser={id:'otra-cuenta'};return true;};
 cambio.run('registrarInteraccionAnuncio=__cambio');
 assert.equal(await cambio.run("registrarInteraccionMedida('aviso-sintetico','apertura','TEST100')"),null);
 assert.equal(cambio.llamadas.length,0,'cambiar cuenta entre llamadas no atribuye el evento a la nueva');
 const cupo=montar();cupo.ctx.supabaseClient.rpc=async(n,p)=>{cupo.llamadas.push({n,p});return {data:false,error:null};};
 await cupo.run("registrarInteraccionMedida('aviso-sintetico','apertura','TEST100')");
 assert.equal(cupo.timers.size,0,'false por cupo agotado no programa reintentos');
 cupo.run("anunciosRecomendacion.lista=catalogoClasesActual;__banner={isConnected:true};observarRecomendacionClase(__banner,catalogoClasesActual[0],'TEST100')");
 cupo.observers.at(-1).cb([{isIntersecting:true,intersectionRatio:1}]);await cupo.paso();
 assert.equal(cupo.timers.size,0,'false por impresión agotada tampoco reintenta');

 // El reloj falso solo dispara al avanzar; salir antes del segundo cancela.
 for(const lugar of ['inicio','catalogo']){
  const m=montar();m.ctx.supabaseClient.rpc=async(n,p)=>{m.llamadas.push({n,p});if(n==='registrar_evento_anuncio')m.recibos.add(p.p_evento_id);return {data:true,error:null};};
  m.run("__card={dataset:{catalogoAnuncio:'aviso-sintetico'},isConnected:true};__root={querySelectorAll(){return[__card]}};anunciosRecomendacion.lista=catalogoClasesActual");
  const pintar=()=>m.run(lugar==='inicio'?"observarRecomendacionClase(__card,catalogoClasesActual[0],'TEST100')":"observarImpresionesClases(__root,catalogoClasesActual,'')");
  const ver=ratio=>{const obs=m.observers.at(-1);if(!obs.desconectado)obs.cb([{target:m.ctx.__card,isIntersecting:ratio>0,intersectionRatio:ratio}]);};
  pintar();ver(.49);assert.equal(m.timers.size,0,'menos de 50% no programa');
  ver(.5);assert.equal(m.timers.size,1);assert.equal([...m.timers.values()][0].ms,1000);
  ver(0);assert.equal(m.timers.size,0,'salir antes de un segundo cancela '+lugar);assert.equal(m.recibos.size,0);
  ver(1);await m.paso();assert.equal(m.recibos.size,1);
  pintar();ver(1);assert.equal(m.timers.size,0,'repintar no cuenta '+lugar);
  if(lugar==='catalogo'){
   m.run("observarImpresionesClases(__root,catalogoClasesActual,'TEST100')");ver(1);
   assert.equal(m.timers.size,1,'buscar conserva la medición cobrable por canal');await m.paso();
   assert.equal(m.recibos.size,1,'buscar no duplica el total');
   assert.ok(m.llamadas.some(x=>x.n==='registrar_alcance_anuncio'&&x.p.p_canal==='busqueda'),'conserva el canal cobrable de búsqueda');
   // Abre de verdad el catálogo, usando solo datos sintéticos para sus cargas.
   m.run(`abrirDirectorioClases=async()=>false;S={tenant:'sintetico'};
    __input={isConnected:true,value:'',addEventListener(){},focus(){}};
    __root.querySelector=()=>__input;
    document.getElementById=id=>id==='modal-content'?__root:id==='modal'?{classList:{contains:()=>true}}:__input;
    cabeceraCatalogoClasesHTML=()=>'';openModal=()=>{};
    cargarAnunciosClases=async()=>catalogoClasesActual.length?catalogoClasesActual:[{id:'aviso-sintetico',publicado_at:'2026-11-01T12:00:00Z',ramos_siglas:['TEST100']}];
    logosDeAnuncios=async()=>new Map();nombresRamosParaClases=()=>({});__input.setAttribute=()=>{};
    renderCatalogoClases=()=>observarImpresionesClases(__root,catalogoClasesActual);`);
   await m.run('openCatalogoClases()');ver(1);await m.paso();assert.equal(m.recibos.size,2,'volver a entrar al catálogo cuenta');
  }else{
   // Ejecuta showTab real: mismo Inicio, salir a ficha y volver a Inicio.
   const nav=fs.readFileSync(__dirname+'/../src/app/navegacion.js','utf8');
   m.run("PESTANAS=['home','stats'];NAV_TABS=['home','stats'];currentTab='home';currentTabIdx=0;setTabTransforms=()=>{};track=()=>{};renderHome=()=>observarRecomendacionClase(__card,catalogoClasesActual[0],'TEST100')");
   m.run(nav.slice(nav.indexOf('function showTab('),nav.indexOf('// Salir de un ramo')));
   m.run("showTab('home')");assert.equal(m.timers.size,0);
   m.run("showTab('ramo');showTab('home')");ver(1);await m.paso();assert.equal(m.recibos.size,2,'salir a la ficha y volver cuenta');
  }
 }
 const salida=montar();salida.run("anunciosRecomendacion.lista=catalogoClasesActual;__banner={isConnected:true};observarRecomendacionClase(__banner,catalogoClasesActual[0],'TEST100')");
 salida.observers.at(-1).cb([{isIntersecting:true,intersectionRatio:1}]);
 salida.run("cambiarPantallaMedicionAnuncios('ramo');cambiarPantallaMedicionAnuncios('home')");await salida.paso();
 assert.equal(salida.llamadas.length,0,'un temporizador de la visita anterior no cuenta tras volver');
 // Un error de la RPC cobrable no impide contar el gesto/exposición.
 for(const tipo of ['apertura','contacto','impresion']){
  const m=montar();m.ctx.supabaseClient.rpc=async(n,p)=>{m.llamadas.push({n,p});return n==='registrar_evento_anuncio'?{data:true,error:null}:{data:null,error:{message:'falló cobro'}};};
  if(tipo==='impresion'){
   m.run("anunciosRecomendacion.lista=catalogoClasesActual;__banner={isConnected:true};observarRecomendacionClase(__banner,catalogoClasesActual[0],'TEST100')");
   m.observers.at(-1).cb([{isIntersecting:true,intersectionRatio:1}]);await m.paso();
  }else await m.run(`registrarInteraccionMedida('aviso-sintetico','${tipo}','TEST100')`);
  assert.equal(m.llamadas.filter(x=>x.n==='registrar_evento_anuncio').length,1,tipo+' independiente del cobro');
 }
 const tardio=montar();let intentosAlcance=0;
 tardio.ctx.supabaseClient.rpc=async(n,p)=>{
  tardio.llamadas.push({n,p});
  if(n==='registrar_alcance_anuncio'&&++intentosAlcance===1)return {data:null,error:{message:'respuesta perdida'}};
  if(n==='registrar_evento_anuncio'){const nuevo=!tardio.recibos.has(p.p_evento_id);tardio.recibos.add(p.p_evento_id);return {data:nuevo,error:null};}
  return {data:true,error:null};
 };
 tardio.run("__card={dataset:{catalogoAnuncio:'aviso-sintetico'},isConnected:true};__root={querySelectorAll(){return[__card]}};observarImpresionesClases(__root,catalogoClasesActual)");
 tardio.observers.at(-1).cb([{target:tardio.ctx.__card,isIntersecting:true,intersectionRatio:1}]);await tardio.paso();
 assert.equal(tardio.recibos.size,1,'el total no espera al alcance');await tardio.paso();
 const reenvios=tardio.llamadas.filter(x=>x.n==='registrar_evento_anuncio');assert.equal(reenvios.length,2);assert.equal(reenvios[0].p.p_evento_id,reenvios[1].p.p_evento_id);
 assert.equal(tardio.recibos.size,1,'completar el alcance conserva el mismo evento');
 const html=run("cifrasClase({alcance:20,campana:{vistas:20,aperturas:16,contactos:5},eventos:{desde:'2026-11-02T12:00:00Z',cada_vez_desde:'2026-11-12T12:00:00Z',impresion:100,clic:30,contacto:null}},String)");
 assert.match(html,/Desde el 12 de noviembre de 2026/);assert.match(html,/mínimo/);assert.match(html,/no cambian el cobro/);assert.match(html,/<b>—<\/b><small>en total/);
 const filas=JSON.parse(run("JSON.stringify(datosAdminEditorial([{dia:'2026-11-12',vistas:1,aperturas:1,contactos:1,vistas_total:5,aperturas_total:3,contactos_total:2}],null))"));
 assert.deepEqual([filas[0].vistas,filas[0].aperturas,filas[0].contactos],[5,3,2],'admin muestra eventos en el gráfico, no personas');
 assert.equal(JSON.parse(run("JSON.stringify(datosAdminEditorial([{vistas:1,aperturas:1,contactos:1}],null))"))[0].vistas,1,'sin el SQL conserva personas');
 console.log('PASS: nonce por evento, reintentos, cobro único, reapertura, visibilidad, compatibilidad y cambio de cuenta');
})().catch(e=>{console.error(e);process.exitCode=1;});
