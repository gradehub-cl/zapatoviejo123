// Revocar «Entrar con Apple» al borrar la cuenta (App Review 5.1.1(v)).
// 1. La función del servidor canjea el código de un solo uso, comprueba que sea
//    del mismo Apple ID de la cuenta con sesión y revoca. No guarda nada.
// 2. La app pide la confirmación a Apple antes de borrar. Si la revocación
//    falla, la cuenta NO se borra.
// Todo sintético: llave generada acá, cuentas, códigos y tokens inventados.
const fs=require('fs'),path=require('path'),vm=require('vm'),{webcrypto}=require('crypto');
const leer=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
let ok=0,fail=0;
const chk=(n,c)=>{if(c){ok++;console.log('  OK   '+n);}else{fail++;console.log('  FAIL '+n);}};
const SUB='000123.sintetico0000000000000000.0101';
const jwt=payload=>['e30',Buffer.from(JSON.stringify(payload)).toString('base64url'),'firma'].join('.');

(async()=>{
  console.log('=== La función del servidor ===');
  const fn=vm.createContext({Response,Request,URLSearchParams,TextEncoder,TextDecoder,AbortController,setTimeout,clearTimeout,
    Uint8Array,JSON,btoa,atob,String,Number,Math,Date,crypto:webcrypto,console});
  vm.runInContext(leer('functions/apple-revocar.js').replace(/^export /gm,''),fn);
  const revocar=vm.runInContext('revocarApple',fn);
  const par=await webcrypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},true,['sign','verify']);
  const pkcs8=Buffer.from(await webcrypto.subtle.exportKey('pkcs8',par.privateKey)).toString('base64');
  const env={APPLE_TEAM_ID:'ABCDE12345',APPLE_KEY_ID:'KEYID67890',APPLE_P8:'-----BEGIN PRIVATE KEY-----\n'+pkcs8.match(/.{1,64}/g).join('\n')+'\n-----END PRIVATE KEY-----'};
  const llamadas=[];
  function pedidor({usuario={identities:[{provider:'apple',identity_data:{sub:SUB}}]},sesion=200,canje=200,subCanje=SUB,revoca=200}={}){
    llamadas.length=0;
    return async(url,o={})=>{
      llamadas.push({url,o});
      if(url.endsWith('/auth/v1/user'))return new Response(JSON.stringify(usuario),{status:sesion});
      if(url.endsWith('/auth/token'))return new Response(JSON.stringify({access_token:'acceso-sintetico',refresh_token:'refresco-sintetico',id_token:jwt({sub:subCanje})}),{status:canje});
      if(url.endsWith('/auth/revoke'))return new Response('',{status:revoca});
      throw new Error('URL inesperada '+url);
    };
  }
  const pedido=({metodo='POST',auth='Bearer '+'a'.repeat(40),cuerpo={code:'c0d1g0.sintetico-123'},origen='capacitor://localhost'}={})=>
    new Request('https://gradehub.cl/apple-revocar',{method:metodo,headers:{...(auth?{Authorization:auth}:{}),...(origen?{Origin:origen}:{}),'Content-Type':'application/json'},
      body:metodo==='POST'?(typeof cuerpo==='string'?cuerpo:JSON.stringify(cuerpo)):undefined});

  let r=await revocar(pedido({metodo:'OPTIONS'}),env,pedidor());
  chk('la app (capacitor://localhost) pasa el preflight',r.status===204&&r.headers.get('Access-Control-Allow-Origin')==='capacitor://localhost');
  r=await revocar(pedido({metodo:'OPTIONS',origen:'https://ejemplo.com'}),env,pedidor());
  chk('otro origen no recibe permiso CORS',!r.headers.get('Access-Control-Allow-Origin'));
  r=await revocar(pedido({auth:null}),env,pedidor());
  chk('sin sesión: 401 y no habla con Apple',r.status===401&&!llamadas.length);
  r=await revocar(pedido({cuerpo:{code:'x'}}),env,pedidor());
  chk('un código con forma rara se rechaza',r.status===400&&!llamadas.length);
  r=await revocar(pedido({cuerpo:'{no es json'}),env,pedidor());
  chk('un cuerpo que no es JSON se rechaza',r.status===400);
  r=await revocar(pedido(),env,pedidor({sesion:401}));
  chk('una sesión inválida no llega a Apple',r.status===401&&!llamadas.some(l=>l.url.includes('appleid')));
  r=await revocar(pedido(),env,pedidor({usuario:{identities:[{provider:'google',identity_data:{sub:'g'}}]}}));
  chk('una cuenta sin Apple no revoca nada',r.status===400&&!llamadas.some(l=>l.url.includes('appleid')));
  r=await revocar(pedido(),{},pedidor());
  chk('sin la llave en el servidor: 503, sin inventar nada',r.status===503&&!llamadas.some(l=>l.url.includes('appleid')));

  r=await revocar(pedido(),env,pedidor());
  const canje=llamadas.find(l=>l.url.endsWith('/auth/token')),revoke=llamadas.find(l=>l.url.endsWith('/auth/revoke'));
  chk('camino feliz: 200 y revoca el refresh token',r.status===200&&!!revoke&&new URLSearchParams(revoke.o.body).get('token')==='refresco-sintetico'
    &&new URLSearchParams(revoke.o.body).get('token_type_hint')==='refresh_token');
  chk('canjea con el bundle de la app y el código recibido',new URLSearchParams(canje.o.body).get('client_id')==='cl.gradehub.app'
    &&new URLSearchParams(canje.o.body).get('code')==='c0d1g0.sintetico-123'&&new URLSearchParams(canje.o.body).get('grant_type')==='authorization_code');
  const secreto=new URLSearchParams(canje.o.body).get('client_secret'),[h,p,f]=secreto.split('.');
  const cab=JSON.parse(Buffer.from(h,'base64url')),claims=JSON.parse(Buffer.from(p,'base64url'));
  chk('client_secret: ES256 con el Key ID',cab.alg==='ES256'&&cab.kid==='KEYID67890');
  chk('client_secret: equipo, Apple, bundle y 5 minutos',claims.iss==='ABCDE12345'&&claims.aud==='https://appleid.apple.com'&&claims.sub==='cl.gradehub.app'&&claims.exp-claims.iat===300);
  chk('client_secret: la firma se verifica con la llave pública',
    await webcrypto.subtle.verify({name:'ECDSA',hash:'SHA-256'},par.publicKey,Buffer.from(f,'base64url'),new TextEncoder().encode(h+'.'+p)));
  chk('la respuesta no devuelve tokens',!(await r.text()).includes('sintetico'));

  r=await revocar(pedido(),env,pedidor({subCanje:'000999.otra.persona'}));
  chk('un código de OTRO Apple ID no revoca nada (403)',r.status===403&&!llamadas.some(l=>l.url.endsWith('/auth/revoke')));
  r=await revocar(pedido(),env,pedidor({canje:400}));
  chk('si Apple no acepta el código: 502',r.status===502&&!llamadas.some(l=>l.url.endsWith('/auth/revoke')));
  r=await revocar(pedido(),env,pedidor({revoca:500}));
  chk('si Apple no revoca: 502',r.status===502);

  console.log('\n=== La app antes de borrar ===');
  const fuente=['data.js','engine.js','app.js','app-session.js'].map(f=>leer(f)).join('\n');
  async function borrar({proveedor='apple',nativa=true,code='c0d1g0.sintetico-123',fetchOk=true,cancela=false}={}){
    const el=()=>({style:{setProperty(){},removeProperty(){}},classList:{add(){},remove(){},contains(){return false},toggle(){}},addEventListener(){},appendChild(){},setAttribute(){},removeAttribute(){},getAttribute(){return null},querySelector(){return null},querySelectorAll(){return []},focus(){},innerHTML:'',textContent:'',value:''});
    const pasos=[];const almacen=new Map();
    const window={addEventListener(){},matchMedia:()=>({matches:true,addEventListener(){},addListener(){}}),
      Capacitor:nativa?{isNativePlatform:()=>true,Plugins:{AppleSignIn:{authorize:async()=>{pasos.push('apple');if(cancela)throw new Error('cancelado');return code?{identityToken:'t',authorizationCode:code}:{identityToken:'t'};}},
        GradeHubWidgets:{guardarResumen:()=>Promise.resolve(),borrarResumen:()=>Promise.resolve(),sincronizarActividades:()=>Promise.resolve()},
        LocalNotifications:{getPending:()=>Promise.resolve({notifications:[]}),cancel:()=>Promise.resolve()}}}:undefined};
    const ctx={window,document:{getElementById:()=>el(),createElement:el,addEventListener(){},documentElement:el(),body:el(),querySelector:()=>null,querySelectorAll:()=>[]},
      localStorage:{getItem:k=>almacen.has(k)?almacen.get(k):null,setItem:(k,v)=>almacen.set(k,String(v)),removeItem:k=>almacen.delete(k)},
      navigator:{},location:{origin:nativa?'capacitor://localhost':'https://gradehub.cl',pathname:'/',hash:'',reload(){}},crypto:webcrypto,
      fetch:async(url,o)=>{pasos.push('servidor:'+url);return {ok:fetchOk,json:async()=>({error:'Apple no revocó el acceso.'})};},
      setTimeout:()=>0,clearTimeout(){},console:{...console,warn(){}},URL};
    vm.createContext(ctx);vm.runInContext(fuente,ctx);
    ctx.__pasos=pasos;ctx.__toasts=[];
    ctx.__cliente={rpc:async n=>{pasos.push('rpc:'+n);return {error:null};},auth:{signOut:async()=>({error:null}),getSession:async()=>({data:{session:{access_token:'b'.repeat(40)}}})}};
    vm.runInContext(`supabaseClient=__cliente;currentUser={id:'u-sintetico',identities:[{provider:'${proveedor}'}],app_metadata:{providers:['${proveedor}']}};
      showToast=(m,e)=>{__toasts.push(m)};showAuthScreen=()=>{};closeModal=()=>{};track=()=>{};S.onboardingDone=true;`,ctx);
    await vm.runInContext('eliminarCuenta()',ctx);
    return {pasos,toasts:ctx.__toasts};
  }
  let b=await borrar();
  chk('en la app: confirma con Apple, revoca y recién ahí borra',
    b.pasos.join(' > ')==='apple > servidor:https://gradehub.cl/apple-revocar > rpc:eliminar_mi_cuenta');
  b=await borrar({fetchOk:false});
  chk('si la revocación falla, la cuenta NO se borra',!b.pasos.includes('rpc:eliminar_mi_cuenta')&&b.toasts.some(t=>/Tu cuenta no se borró/.test(t)));
  b=await borrar({cancela:true});
  chk('si cancela la hoja de Apple, no se borra nada',!b.pasos.some(p=>p.startsWith('servidor')||p.startsWith('rpc')));
  b=await borrar({code:null});
  chk('sin código de Apple, no se borra',!b.pasos.some(p=>p.startsWith('rpc')));
  b=await borrar({proveedor:'google'});
  chk('una cuenta de Google borra como siempre, sin hablar con Apple',b.pasos.join(' > ')==='rpc:eliminar_mi_cuenta');
  b=await borrar({nativa:false});
  chk('en la web, una cuenta de Apple se borra sin la revocación (no hay código)',b.pasos.join(' > ')==='rpc:eliminar_mi_cuenta');

  console.log(`\nPASS: ${ok}   FAIL: ${fail}`);
  process.exit(fail?1:0);
})().catch(e=>{console.error(e);process.exit(1);});
