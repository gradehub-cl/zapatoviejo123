// Dentro de la app iOS la página vive en capacitor://localhost. Las direcciones
// que salen de la app —la URL del calendario suscribible y el destino del correo
// para recuperar la contraseña— se armaban con location.origin, así que salían
// con esa dirección interna: Google Calendar no puede consultarla y Supabase no
// la reconoce como destino. En la web no cambia nada.
// Token y correo sintéticos; el cliente de Supabase es un doble.
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('node:assert/strict');
const leer=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
const fuente=['data.js','engine.js','app.js','app-session.js'].map(leer).join('\n');

function arnes({nativa,origin,pathname}){
  const el=id=>({style:{setProperty(){},removeProperty(){}},classList:{add(){},remove(){},contains(){return false},toggle(){}},addEventListener(){},appendChild(){},setAttribute(){},removeAttribute(){},getAttribute(){return null},querySelector(){return null},querySelectorAll(){return []},focus(){},
    value:id==='auth-user'?'sintetico@ejemplo.test':'',innerHTML:'',textContent:'',dataset:{},disabled:false,hidden:false});
  const destinos=[];
  const window={addEventListener(){},matchMedia:()=>({matches:true,addEventListener(){},addListener(){}})};
  if(nativa)window.Capacitor={isNativePlatform:()=>true,Plugins:{}};
  const ctx={window,document:{getElementById:el,createElement:el,addEventListener(){},documentElement:el(),body:el(),querySelector:()=>null,querySelectorAll:()=>[]},
    localStorage:{getItem(){return null},setItem(){},removeItem(){}},navigator:{},location:{origin,pathname,hash:'',search:''},
    setTimeout:()=>0,clearTimeout(){},console:{...console,warn(){}},URL,URLSearchParams};
  vm.createContext(ctx);vm.runInContext(fuente,ctx);
  ctx.__cliente={rpc:async()=>({data:'token-sintetico',error:null}),
    auth:{resetPasswordForEmail:async(correo,opciones)=>{destinos.push(opciones.redirectTo);return {error:null};}}};
  vm.runInContext(`supabaseClient=__cliente;showToast=()=>{};authError=()=>{};track=()=>{};
    currentUser={id:'u-sintetico',email:'sintetico@ejemplo.test',app_metadata:{provider:'email',providers:['email']}};`,ctx);
  return {run:c=>vm.runInContext(c,ctx),destinos};
}

(async()=>{
  const app=arnes({nativa:true,origin:'capacitor://localhost',pathname:'/'});
  assert.equal(await app.run('pedirFeedCalendario(false)'),'https://gradehub.cl/cal/token-sintetico','en la app, el calendario se suscribe a la web');
  await app.run('forgotPassword()');
  await app.run('recuperarClaveCuenta()');
  assert.deepEqual(app.destinos,['https://gradehub.cl/','https://gradehub.cl/'],'en la app, los dos correos de recuperación vuelven a la web');
  assert.ok(!JSON.stringify(app.destinos).includes('capacitor'),'nada sale con la dirección interna');

  // La web y la versión de prueba conservan su propio origen y su ruta.
  for(const [origin,pathname] of [['https://gradehub.cl','/'],['https://ios.gradehub.pages.dev','/index.html']]){
    const web=arnes({nativa:false,origin,pathname});
    assert.equal(await web.run('pedirFeedCalendario(false)'),origin+'/cal/token-sintetico');
    await web.run('forgotPassword()');
    await web.run('recuperarClaveCuenta()');
    assert.deepEqual(web.destinos,[origin+pathname,origin+pathname],origin+': la web no cambia');
  }
  console.log('OK: en la app, el calendario y la recuperación de clave usan la dirección pública; la web no cambia');
})().catch(e=>{console.error(e);process.exitCode=1;});
