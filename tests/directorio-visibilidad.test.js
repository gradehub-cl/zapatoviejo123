// Vistas reales: mitad visible durante un segundo, no solo un render.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const timers=new Map(),llamadas=[],listeners=new Map(),observers=[];let siguiente=0,abierto=true;
const ctx={console,URL,Intl,currentUser:{id:'alumno-sintetico'},supabaseClient:{rpc:async(n,p)=>{llamadas.push({n,p});return {data:false,error:null}}},
 document:{visibilityState:'visible',addEventListener:(k,f)=>listeners.set(k,f),removeEventListener:k=>listeners.delete(k),getElementById:id=>id==='modal'?({classList:{contains:()=>abierto}}):null},
 setTimeout(f,ms){const id=++siguiente;timers.set(id,{f,ms});return id},clearTimeout:id=>timers.delete(id),
 IntersectionObserver:class{constructor(cb,op){this.cb=cb;this.op=op;this.cards=[];observers.push(this)}observe(c){this.cards.push(c)}disconnect(){this.desconectado=true}}};
vm.createContext(ctx);vm.runInContext(fs.readFileSync(path.join(__dirname,'../marketplace.js'),'utf8'),ctx);const run=s=>vm.runInContext(s,ctx);
const card={dataset:{directorioPerfil:'p1'},isConnected:true},otra={dataset:{directorioPerfil:'p2'},isConnected:true};ctx.raiz={querySelectorAll:()=>[card,otra]};
run("globalThis.observar=crearObservadorDirectorio();observar.observar(raiz,'uc','alumno-sintetico')");
const entrada=(card,r)=>observers.at(-1).cb([{target:card,isIntersecting:r>0,intersectionRatio:r}]);
const tick=async()=>{const pendientes=[...timers.values()];timers.clear();for(const t of pendientes)t.f();await new Promise(resolve=>setImmediate(resolve))};
(async()=>{
 assert.deepEqual(Array.from(observers[0].op.threshold),[.5]);entrada(card,.49);assert.equal(timers.size,0);
 entrada(card,.5);assert.equal(timers.size,1);assert.equal([...timers.values()][0].ms,1000);entrada(card,.1);assert.equal(timers.size,0,'salir antes del segundo no mide');
 entrada(card,.8);ctx.document.visibilityState='hidden';listeners.get('visibilitychange')();await tick();assert.equal(llamadas.length,0,'no mide en segundo plano');
 ctx.document.visibilityState='visible';listeners.get('visibilitychange')();await tick();assert.equal(llamadas.length,1);assert.equal(llamadas[0].p.p_tipo,'vista');
 entrada(card,0);entrada(card,1);await tick();assert.equal(llamadas.length,1,'false terminal y una vista por apertura');
 entrada(otra,1);abierto=false;await tick();assert.equal(llamadas.length,1,'modal cerrado no mide');abierto=true;
 run("observar.observar(raiz,'uc','alumno-sintetico')");entrada(card,1);await tick();assert.equal(llamadas.length,1,'buscar/repintar no repite');
 run("observar();globalThis.observar=crearObservadorDirectorio();observar.observar(raiz,'uc','alumno-sintetico')");entrada(card,1);await tick();assert.equal(llamadas.length,2,'otra apertura es otro evento, sujeto a cupo SQL');
 entrada(otra,1);ctx.currentUser={id:'otra-cuenta'};await tick();assert.equal(llamadas.length,2);run('observar()');assert.equal(timers.size,0);assert.equal(listeners.has('visibilitychange'),false);
 console.log('PASS: 50%/1 s, visibilidad, cierre, sesión, repintado, siguiente apertura y false sin reintento');
})().catch(e=>{console.error(e);process.exitCode=1});
