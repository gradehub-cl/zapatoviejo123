// Apple y Supabase simulados: ningún token ni correo corresponde a una cuenta.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),{webcrypto,createHash}=require('node:crypto');
const raiz=path.join(__dirname,'..'),leer=f=>fs.readFileSync(path.join(raiz,f),'utf8');
function arnes(nativo=true){
 const local=new Map(),sesion=new Map(),ids={},llamadas={oauth:[],idToken:[],plugin:[],nombres:[],errores:[],avisos:[],entradas:0,signOut:0,browser:0};
 const nodo=()=>({style:{setProperty(){},removeProperty(){}},classList:{add(){},remove(){},contains(){return false},toggle(){}},dataset:{},value:'',innerHTML:'',textContent:'',disabled:false,addEventListener(){},appendChild(){},setAttribute(){},removeAttribute(){},getAttribute(){return null},querySelector(){return null},querySelectorAll(){return []},focus(){},remove(){}});
 const el=id=>ids[id]||(ids[id]=nodo());
 const almacen=m=>({getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k)});
 const ctx={AbortController,fetch:async()=>({ok:true,json:async()=>({external:{apple:true}})}),console,crypto:webcrypto,TextEncoder,Uint8Array,setTimeout,clearTimeout,URL,URLSearchParams,location:{origin:'https://ejemplo.invalid',pathname:'/',search:'',hash:''},history:{replaceState(){}},navigator:{},localStorage:almacen(local),sessionStorage:almacen(sesion),window:{addEventListener(){},matchMedia:()=>({matches:false,addEventListener(){},addListener(){}})},document:{getElementById:el,querySelector:()=>null,querySelectorAll:()=>[],documentElement:nodo(),body:nodo(),createElement:nodo,addEventListener(){}}};
 if(nativo)ctx.window.Capacitor={isNativePlatform:()=>true,Plugins:{Browser:{addListener(){},open:async()=>llamadas.browser++},App:{addListener(){}},AppleSignIn:{authorize:async o=>{llamadas.plugin.push(o);return ctx.respuestaPlugin(o)}}}};
 vm.createContext(ctx);for(const f of ['data.js','engine.js','app.js','app-session.js'])vm.runInContext(leer(f),ctx);
 const run=s=>vm.runInContext(s,ctx);run('globalThis.afterLoginReal=afterLogin');const nuevo=()=>({id:'apple-sintetico',email:'relay-sintetico@privaterelay.appleid.com',created_at:new Date().toISOString(),last_sign_in_at:new Date().toISOString(),app_metadata:{provider:'apple',providers:['apple']},user_metadata:{}});
 ctx.respuestaPlugin=async()=>({identityToken:'token-identidad-sintetico',fullName:'Nombre sintético'});ctx.usuario=nuevo();
 const cliente={auth:{signInWithOAuth:async a=>{llamadas.oauth.push(a);return {data:{},error:null}},signInWithIdToken:async a=>{llamadas.idToken.push(a);return {data:{user:ctx.usuario=nuevo()},error:null}},updateUser:async a=>{llamadas.nombres.push(a);return {data:{user:{...ctx.usuario,user_metadata:{...ctx.usuario.user_metadata,...a.data}}}}},signOut:async()=>{llamadas.signOut++;return {error:null}}}};
 ctx.cliente=cliente;ctx.llamadas=llamadas;run("supabaseClient=cliente;authError=m=>{if(m)llamadas.errores.push(m)};afterLogin=async()=>{llamadas.entradas++};showConfirm=(t,d,f)=>llamadas.avisos.push({t,d,f});signOut=async()=>llamadas.signOut++");
 const estado={ramos:[{id:'ramo-ajeno',nombre:'Curso sintético',categorias:[{id:'eva',nombre:'Prueba sintética',peso:100,notas:[{id:'n',valor:5.2,peso:1}]}]}],historial:[],onboardingDone:true,userName:'Cuenta sintética'};
 ctx.estado=estado;run("S=estado;localStorage.setItem(STORAGE_KEY,JSON.stringify(S));localStorage.setItem(CACHE_OWNER_KEY,'otra-cuenta');recordarMetodoLogin('google')");
 return {ctx,run,local,sesion,llamadas,cliente,nuevo,el};
}
(async()=>{
 const w=arnes(false);await w.run("signInWithProvider('apple')");assert.equal(w.llamadas.oauth[0].provider,'apple');assert.equal(w.llamadas.plugin.length,0);assert.equal(w.run('ultimoMetodoLogin()'),'apple');assert.equal(w.run('JSON.parse(sessionStorage.getItem(APPLE_ENTRADA_KEY)).metodo'),'google');
 const a=arnes();const previa=a.local.get('gradehub_v1');await a.run("signInWithProvider('apple')");
 assert.equal(a.llamadas.idToken[0].provider,'apple');assert.equal(a.llamadas.oauth.length,0);assert.equal(a.llamadas.browser,0);
 const crudo=a.llamadas.idToken[0].nonce;assert.match(crudo,/^[a-f0-9]{64}$/);assert.equal(a.llamadas.plugin[0].nonce,createHash('sha256').update(crudo).digest('hex'));assert.notEqual(a.llamadas.plugin[0].nonce,crudo);
 assert.equal(JSON.parse(a.local.get('gradehub_v1_respaldo_otra-cuenta')).data,previa,'otra caché conservada exactamente, bajo su dueño');assert.equal(a.run('S.ramos.length'),0,'no importa notas de otra cuenta');assert.equal(a.llamadas.avisos.length,1);assert.equal(a.llamadas.nombres[0].data.full_name,'Nombre sintético');
 await a.llamadas.avisos[0].f();assert.equal(a.llamadas.signOut,1,'aviso permite cerrar sesión');assert.equal(a.el('btn-apple').disabled,false);
 const real=arnes();real.run("afterLogin=afterLoginReal;loadFromCloud=async()=>null;registrarVisitaDiaria=()=>{};enterOnboarding=()=>llamadas.entradas++;tareasConEstadoAlEntrar=()=>{};cargasAlEntrar=()=>{};track=()=>{};syncNow=async()=>{if(S.ramos.length)throw Error('No subir datos ajenos');return true;}");await real.run("signInWithProvider('apple')");assert.deepEqual(real.llamadas.errores,[],'afterLogin real completa sin errores');assert.equal(real.llamadas.entradas,1,'llega al onboarding');assert.equal(JSON.parse(real.local.get('gradehub_v1_respaldo_otra-cuenta')).data,previa);assert.equal(real.run('S.ramos.length'),0);real.run("currentUser={id:'otra-cuenta'};restaurarCacheApartada('otra-cuenta')");assert.equal(real.run("S.ramos.find(r=>r.id==='ramo-ajeno').categorias[0].notas[0].valor"),5.2,'volver al dueño recupera la nota');
 const propia=arnes();const propiaAntes=propia.local.get('gradehub_v1');propia.cliente.auth.signInWithIdToken=async()=>{propia.ctx.usuario={...propia.nuevo(),id:'otra-cuenta',created_at:'2020-01-01T00:00:00Z'};return {data:{user:propia.ctx.usuario}}};await propia.run("signInWithProvider('apple')");assert.equal(propia.local.get('gradehub_v1'),propiaAntes,'misma cuenta conserva exactamente su caché');assert.equal(propia.llamadas.avisos.length,0);
 const apagado=arnes(false);apagado.ctx.fetch=async()=>({ok:true,json:async()=>({external:{apple:false}})});await apagado.run("signInWithProvider('apple')");assert.equal(apagado.llamadas.oauth.length,0);assert.match(apagado.llamadas.errores[0],/todavía no está disponible/);assert.equal(apagado.el('btn-apple').disabled,false);
 // Una cuenta existente (y un correo visible) no recibe el aviso de cuenta nueva.
 for(const variante of ['existente','nombreExistente','sinNombre','correoVisible']){
  const h=arnes();h.cliente.auth.signInWithIdToken=async()=>{const user=h.nuevo();if(variante==='existente')user.created_at='2020-01-01T00:00:00Z';if(variante==='nombreExistente')user.user_metadata.full_name='Nombre anterior';if(variante==='correoVisible')user.email='cuenta@example.invalid';h.ctx.usuario=user;return {data:{user}}};
  if(variante==='sinNombre')h.ctx.respuestaPlugin=async()=>({identityToken:'token-sintetico'});
  await h.run("signInWithProvider('apple')");if(['existente','correoVisible'].includes(variante))assert.equal(h.llamadas.avisos.length,0);
  assert.equal(h.llamadas.nombres.length,['nombreExistente','sinNombre'].includes(variante)?0:1,'solo guarda nombre nuevo cuando falta full_name');
 }
 for(const code of ['APPLE_CANCELADO','1001']){const h=arnes();h.ctx.respuestaPlugin=async()=>{throw {code}};await h.run("signInWithProvider('apple')");assert.deepEqual(h.llamadas.errores,[]);assert.equal(h.el('btn-apple').disabled,false);assert.equal(h.llamadas.idToken.length,0);}
 const sin=arnes();delete sin.ctx.window.Capacitor.Plugins.AppleSignIn;await sin.run("signInWithProvider('apple')");assert.match(sin.llamadas.errores[0],/Actualiza/);
 // Respuesta tardía del plugin no inicia otra sesión ni revive una cuenta.
 const tarde=arnes();let resolver;tarde.ctx.respuestaPlugin=()=>new Promise(r=>resolver=r);const pendiente=tarde.run("signInWithProvider('apple')");await new Promise(r=>setTimeout(r,10));tarde.run("currentUser={id:'sesion-distinta'}");resolver({identityToken:'token-sintetico'});await pendiente;assert.equal(tarde.llamadas.idToken.length,0);assert.equal(tarde.run('currentUser.id'),'sesion-distinta');
 // Respuestas del canje y del guardado del nombre tampoco reviven otra visita.
 for(const paso of ['canje','nombre']){const h=arnes();let terminar;
  if(paso==='canje')h.cliente.auth.signInWithIdToken=()=>new Promise(r=>terminar=r);else h.cliente.auth.updateUser=()=>new Promise(r=>terminar=r);
  const p=h.run("signInWithProvider('apple')");for(let i=0;i<30&&!terminar;i++)await new Promise(r=>setTimeout(r,2));assert(terminar);h.run("currentUser={id:'otra-visita'}");terminar({data:{user:h.nuevo()}});await p;assert.equal(h.run('currentUser.id'),'otra-visita');assert.equal(h.llamadas.entradas,0);
 }
 // Si falla el respaldo, no reclama la caché ni entra a la cuenta nueva.
 const lleno=arnes();const archivoAnterior=lleno.local.get('gradehub_v1');const set=lleno.ctx.localStorage.setItem;lleno.ctx.localStorage.setItem=(k,v)=>{if(k.startsWith('gradehub_v1_respaldo_'))throw Error('Sin espacio');set(k,v)};await lleno.run("signInWithProvider('apple')");assert.equal(lleno.local.get('gradehub_v1'),archivoAnterior);assert.equal(lleno.run('currentUser'),null);assert.equal(lleno.llamadas.entradas,0);assert.match(lleno.llamadas.errores[0],/No se mezclaron/);
 // La marca se pinta sobre Apple usando la función real.
 const marca=arnes(false);let antes;const padre={insertBefore:(m,d)=>antes={m,d}};marca.el('btn-apple').parentNode=padre;marca.run("recordarMetodoLogin('apple');marcarUltimoLogin()");assert.equal(antes.d,marca.el('btn-apple'));assert.equal(antes.m.textContent,'Lo usaste la última vez');
 assert.match(marca.run("traduceAuthError({code:'provider_disabled'})"),/todavía no está disponible/);
 // La preparación web usa el mismo aislamiento, sin inferir por lista vacía.
 const web=arnes(false);web.run("guardarEntradaApple(contextoEntradaApple());globalThis.c=consumirEntradaApple()");assert.equal(web.sesion.size,0);web.ctx.u=web.nuevo();assert.equal(web.run('avisarCuentaRelayApple(u,c)'),true);web.run("u.created_at='2020-01-01T00:00:00Z'");assert.equal(web.run('avisarCuentaRelayApple(u,c)'),false);web.run('prepararCacheApple(u)');assert.equal(JSON.parse(web.local.get('gradehub_v1_respaldo_otra-cuenta')).data,previa);
 console.log('PASS Apple: web OAuth, nativo ID token/nonce SHA256, cancelar, nombre sin pisar, relay nuevo vs existente, caché ajena intacta, último método y respuesta tardía.');
})().catch(e=>{console.error(e);process.exitCode=1;});
