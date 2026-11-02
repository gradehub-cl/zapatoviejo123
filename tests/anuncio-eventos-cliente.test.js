// Una exposición/clic real tiene una clave; reintentar transporte la conserva.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const fuente=fs.readFileSync(__dirname+'/../marketplace.js','utf8');
function montar(){
 const timers=new Map(),observers=[],llamadas=[],recibos=new Set();let siguiente=0,perder=true,legado=false;
 const ctx={console:{warn(){}},Intl,currentUser:{id:'estudiante-sintetico'},
  document:{visibilityState:'visible',getElementById(){return null;},addEventListener(){},removeEventListener(){}},
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
 console.log('PASS: nonce por evento, reintentos, cobro único, reapertura, visibilidad, compatibilidad y cambio de cuenta');
})().catch(e=>{console.error(e);process.exitCode=1;});
