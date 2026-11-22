// #714. Ejercita el formulario con dos sesiones independientes y respuestas
// diferidas. Los espías también reciben errores deliberadamente contaminados.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const leer=f=>fs.readFileSync(__dirname+'/../src/app-session/'+f+'.js','utf8');
const politicas=leer('cliente-y-politicas');
const politica=politicas.match(/function passwordPolicyError\(password\)\{[\s\S]+?\n\}/)[0];
const actual='ActualDePrueba41',nueva='NuevaDePrueba83';
function nodo(){
  return {value:'',textContent:'',style:{},hidden:false,disabled:false,attrs:{},
    setAttribute(k,v){this.attrs[k]=v;},removeAttribute(k){delete this.attrs[k];},focus(){this.enfocado=true;}};
}
function diferida(){let entregar;const promesa=new Promise(r=>entregar=r);return {entregar,promesa};}
function arnes(){
  const nodos={},capturas=[],peticiones=[],ingresos=[],salidas=[];
  const get=id=>nodos[id]||=nodo(),campo=id=>get('clave-'+id);
  const form={querySelector:s=>get(s.slice(1))};
  nodos['cuenta-clave']=form;
  get('modal').classList={contains:()=>true};
  campo('actual').value=actual;campo('nueva').value=nueva;campo('repetida').value=nueva;
  campo('verificacion').hidden=true;
  const usuario={id:'u1',email:'sintetica@example.test',app_metadata:{provider:'email'}};
  const sesion={user:usuario,access_token:'token-visita'};
  const capturar=(...args)=>capturas.push(args);
  const ctx={currentUser:usuario,_visitaSesion:1,_cerrandoSesion:false,document:{getElementById:get},
    crypto:{randomUUID:()=> 'prueba'},window:{supabase:{}},TypeError,
    SUPABASE_URL:'https://ejemplo.test',SUPABASE_ANON_KEY:'publica',
    localStorage:new Proxy({setItem:capturar,removeItem:capturar},{set(obj,key,val){capturar(key,val);return true;}}),track:capturar,reportarError:capturar,
    registrarErrorArranque:capturar,console:{warn:capturar,error:capturar,log:capturar},
    closeModal:()=>capturar('cerrar'),showToast:capturar,authError:capturar,ponerModoAuth:capturar,showAuthScreen:()=>capturar('login'),
    supabaseClient:{auth:{getSession:async()=>({data:{session:sesion}})},from:capturar}};
  const sim={verificar:async()=>({data:{session:{},user:usuario}}),responder:async()=>({ok:true})};
  ctx.window.supabase.createClient=(_url,_key,{auth})=>{
    assert.equal(auth.persistSession,false);assert.equal(auth.autoRefreshToken,false);assert.equal(auth.detectSessionInUrl,false);
    return {auth:{signInWithPassword:args=>{ingresos.push(args);return sim.verificar();},
      signOut:async({scope})=>salidas.push(scope),dispose:async()=>{}}};
  };
  ctx.fetch=(url,opciones)=>{peticiones.push({url,opciones});return sim.responder();};
  vm.createContext(ctx);vm.runInContext('const PASS_MIN=8;\n'+politica+'\n'+leer('correo-y-clave')+'\n'+leer('oauth-y-recuperacion'),ctx);
  return {ctx,sim,form,nodos,campo,get,ingresos,peticiones,salidas,capturas,enviar:()=>ctx.cambiarClaveCuenta(form)};
}
const rechazo=code=>({ok:false,status:422,json:async()=>({error_code:code,message:actual+nueva})});
function privacidad(k){
  const visibles=Object.values(k.nodos).map(n=>n.textContent);
  const mensajes=JSON.stringify([k.capturas,visibles]);
  assert.ok(!mensajes.includes(actual)&&!mensajes.includes(nueva),'los canales de salida y la UI no reciben las claves');
}
(async()=>{
  let k=arnes();
  k.ctx.passwordPolicyError=()=> 'misma política';
  await k.ctx.submitNewPassword();
  assert.equal(k.get('reset-error').textContent,'misma política');
  assert.equal(await k.enviar(),false);assert.equal(k.campo('nueva-error').textContent,'misma política');
  assert.equal(k.ingresos.length,0);

  for(const [id,valor,esperado] of [['repetida','diferente','no coinciden'],['nueva',actual,'distinta'],['actual','','Escribe']]){
    k=arnes();k.campo(id).value=valor;
    assert.equal(await k.enviar(),false);assert.ok(k.campo(id+'-error').textContent.includes(esperado));assert.equal(k.ingresos.length,0);
  }
  k=arnes();k.sim.verificar=async()=>({error:{code:'invalid_credentials',message:actual+nueva}});
  assert.equal(await k.enviar(),false);assert.match(k.campo('actual-error').textContent,/no coincide/);
  assert.equal(k.campo('actual').attrs['aria-invalid'],'true');assert.equal(k.campo('actual').enfocado,true);
  assert.equal(k.peticiones.length,0);privacidad(k);

  k=arnes();const espera=diferida();k.sim.responder=()=>espera.promesa;
  const primero=k.enviar();assert.equal(await k.enviar(),false);
  espera.entregar({ok:true});assert.equal(await primero,true);
  assert.equal(k.ingresos.length,1);assert.equal(k.ingresos[0].email,k.ctx.currentUser.email);
  assert.equal(k.peticiones.length,1);assert.equal(k.peticiones[0].opciones.headers.Authorization,'Bearer token-visita');
  assert.deepEqual(k.salidas,['local']);assert.equal(k.capturas[0][0],'cerrar');privacidad(k);

  for(const fase of ['verificar','responder'])for(const salida of ['salir','volver','otra-hoja']){
    k=arnes();const inicio=diferida(),fin=diferida();
    k.sim[fase]=()=>{inicio.entregar();return fin.promesa;};
    const envio=k.enviar();await inicio.promesa;
    if(salida==='salir'){k.ctx._visitaSesion++;k.ctx.currentUser=null;}
    if(salida==='volver')k.ctx.currentUser={...k.ctx.currentUser};
    if(salida==='otra-hoja')k.nodos['cuenta-clave']={};
    fin.entregar(fase==='responder'?{ok:true}:{data:{user:{id:'u1'},session:{}}});
    assert.equal(await envio,false);assert.equal(k.capturas.length,0);
    if(fase==='verificar')assert.equal(k.peticiones.length,0);
    privacidad(k);
  }
  // Dispara el cierre real mientras el servidor todavía está procesando el PUT.
  k=arnes();
  const inicio=diferida(),respuesta=diferida(),salir=diferida();
  k.sim.responder=()=>{inicio.entregar();return respuesta.promesa;};
  Object.assign(k.ctx,{respaldoAlDia:async()=>true,olvidarBaseSesion(){},freshState:()=>({}),
    STORAGE_KEY:'gradehub_v1',CACHE_OWNER_KEY:'owner',SYNC_BASE_KEY:'base',CURSO_SIGLAS_KEY:'siglas',PRE_IMPORT_KEY:'import'});
  vm.runInContext(leer('salida-cuenta'),k.ctx);
  k.ctx.respaldoAlDia=async()=>true;k.ctx.supabaseClient.auth.signOut=()=>salir.promesa;
  const cambio=k.enviar();await inicio.promesa;
  const cierre=k.ctx.signOut();await Promise.resolve();
  salir.entregar();await cierre;const antes=k.capturas.length;
  respuesta.entregar({ok:true});assert.equal(await cambio,false);assert.equal(k.capturas.length,antes);privacidad(k);

  for(const [e,mensaje] of [[{status:429},/Espera/],[new TypeError(actual+nueva),/internet/],[{code:'desconocido',message:actual+nueva},/Inténtalo/]]){
    k=arnes();k.sim.responder=async()=>{throw e;};
    assert.equal(await k.enviar(),false);assert.match(k.campo('estado').textContent,mensaje);assert.equal(k.campo('guardar').disabled,false);
    privacidad(k);
  }
  k=arnes();k.ctx.supabaseClient.auth.getSession=async()=>({data:{session:null}});
  assert.equal(await k.enviar(),false);assert.equal(k.ctx.currentUser,null);assert.equal(k.ingresos.length,0);
  assert.deepEqual(k.capturas.map(c=>c[0]),['cerrar','login','login','Tu sesión venció. Vuelve a entrar para cambiar la contraseña.']);privacidad(k);

  k=arnes();k.sim.responder=async()=>k.peticiones.length===1?rechazo('reauthentication_needed'):{ok:true};
  assert.equal(await k.enviar(),false);assert.equal(k.campo('verificacion').hidden,false);
  assert.ok(k.peticiones[1].url.endsWith('/reauthenticate'));assert.equal(await k.enviar(),false);
  k.campo('codigo').value='123456';assert.equal(await k.enviar(),true);
  assert.equal(JSON.parse(k.peticiones[2].opciones.body).nonce,'123456');privacidad(k);
  console.log('OK #714: política compartida, privacidad, clave actual, doble envío, nonce, sesión y respuestas tardías.');
})().catch(e=>{console.error(e);process.exitCode=1;});
