// Revocar «Entrar con Apple» al borrar la cuenta (App Review 5.1.1(v)).
//
// Apple exige llamar a /auth/revoke con un token DE APPLE. No guardamos tokens:
// al borrar, la app le pide a Apple que confirme (AuthenticationServices) y nos
// manda ese código de un solo uso. Acá se canjea por un token, se comprueba que
// sea del mismo Apple ID de la cuenta con sesión y se revoca. Nada se guarda ni
// se registra: ni el código, ni los tokens, ni el correo.
//
// Secretos SOLO en Cloudflare Pages (nunca en el cliente):
//   APPLE_TEAM_ID  (PH6XQV8L2M) · APPLE_KEY_ID (10 caracteres) · APPLE_P8 (la llave .p8, en PEM)
const SUPABASE_URL='https://lsulsnswzesyekpsvlql.supabase.co';
const SUPABASE_ANON_KEY='sb_publishable_JwBMAOR7iHW-gcRdLMGrYw_eCOISwqA';
const APPLE='https://appleid.apple.com';
// La app nativa autoriza con su bundle; la web no llega acá (ver cuenta-borrado.js).
const CLIENTE_APP='cl.gradehub.app';
const ORIGENES={'capacitor://localhost':true,'https://gradehub.cl':true,'https://ios.gradehub.pages.dev':true};
const ESPERA_MS=8000,MAX_CUERPO=2000;

function cabeceras(request){
  const h={'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
  const origen=request.headers.get('Origin')||'';
  if(ORIGENES[origen]){
    h['Access-Control-Allow-Origin']=origen;h['Vary']='Origin';
    h['Access-Control-Allow-Methods']='POST, OPTIONS';h['Access-Control-Allow-Headers']='Authorization, Content-Type';
    h['Access-Control-Max-Age']='600';
  }
  return h;
}
const responder=(request,cuerpo,status)=>new Response(JSON.stringify(cuerpo),{status,headers:cabeceras(request)});

const b64url=bytes=>btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const textoB64url=t=>b64url(new TextEncoder().encode(t));
export function leerPayloadJwt(jwt){
  const partes=String(jwt||'').split('.');
  if(partes.length!==3)return null;
  try{
    const b=partes[1].replace(/-/g,'+').replace(/_/g,'/');
    return JSON.parse(atob(b+'='.repeat((4-b.length%4)%4)));
  }catch{return null;}
}
// La llave .p8 viene en PEM (PKCS#8). Se acepta con o sin saltos de línea.
function derDePem(pem){
  const limpio=String(pem||'').replace(/-----(BEGIN|END) PRIVATE KEY-----/g,'').replace(/\\n/g,'').replace(/\s+/g,'');
  if(!/^[A-Za-z0-9+/=]{100,}$/.test(limpio))return null;
  return Uint8Array.from(atob(limpio),c=>c.charCodeAt(0));
}
// client_secret de Apple: un JWT ES256 que vive 5 minutos. WebCrypto entrega la
// firma ECDSA como r||s (IEEE P1363), que es justo lo que pide un JWT.
export async function secretoCliente(env,ahora=Date.now(),cripto=crypto){
  const der=derDePem(env.APPLE_P8);
  if(!der||!/^[A-Z0-9]{10}$/.test(env.APPLE_TEAM_ID||'')||!/^[A-Z0-9]{10}$/.test(env.APPLE_KEY_ID||''))return null;
  const llave=await cripto.subtle.importKey('pkcs8',der,{name:'ECDSA',namedCurve:'P-256'},false,['sign']);
  const iat=Math.floor(ahora/1000);
  const base=textoB64url(JSON.stringify({alg:'ES256',kid:env.APPLE_KEY_ID}))+'.'+
    textoB64url(JSON.stringify({iss:env.APPLE_TEAM_ID,iat,exp:iat+300,aud:APPLE,sub:CLIENTE_APP}));
  const firma=await cripto.subtle.sign({name:'ECDSA',hash:'SHA-256'},llave,new TextEncoder().encode(base));
  return base+'.'+b64url(firma);
}
// El Apple ID de la cuenta: la identidad «apple» que Supabase ya verificó.
export function subAppleDe(user){
  const id=(user&&Array.isArray(user.identities)?user.identities:[]).find(i=>i&&i.provider==='apple');
  const sub=id&&((id.identity_data&&id.identity_data.sub)||id.id);
  return typeof sub==='string'&&sub?sub:null;
}
const formulario=datos=>new URLSearchParams(datos).toString();

export async function revocarApple(request,env={},pedir=fetch,ahora=Date.now()){
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:cabeceras(request)});
  if(request.method!=='POST')return responder(request,{error:'Método no permitido.'},405);
  const auth=/^Bearer ([A-Za-z0-9._-]{20,4096})$/.exec(request.headers.get('Authorization')||'');
  if(!auth)return responder(request,{error:'Inicia sesión en GradeHub.'},401);
  const corte=new AbortController(),reloj=setTimeout(()=>corte.abort(),ESPERA_MS);
  if(Number(request.headers.get('Content-Length')||0)>MAX_CUERPO){clearTimeout(reloj);return responder(request,{error:'Pedido inválido.'},400);}
  try{
    const crudo=await request.text();
    if(crudo.length>MAX_CUERPO)return responder(request,{error:'Pedido inválido.'},400);
    let code;try{code=JSON.parse(crudo)?.code;}catch{return responder(request,{error:'Pedido inválido.'},400);}
    if(typeof code!=='string'||!/^[A-Za-z0-9._-]{10,512}$/.test(code))return responder(request,{error:'Pedido inválido.'},400);

    const sesion=await pedir(SUPABASE_URL+'/auth/v1/user',{redirect:'manual',signal:corte.signal,headers:{apikey:SUPABASE_ANON_KEY,Authorization:'Bearer '+auth[1]}});
    if(sesion.status!==200){if(sesion.body)await sesion.body.cancel();return responder(request,{error:'Inicia sesión en GradeHub.'},401);}
    const sub=subAppleDe(await sesion.json());
    if(!sub)return responder(request,{error:'Esta cuenta no entra con Apple.'},400);

    const secreto=await secretoCliente(env,ahora);
    if(!secreto)return responder(request,{error:'Falta configurar Apple en el servidor.'},503);

    const canje=await pedir(APPLE+'/auth/token',{method:'POST',redirect:'manual',signal:corte.signal,
      headers:{'Content-Type':'application/x-www-form-urlencoded'},
      body:formulario({client_id:CLIENTE_APP,client_secret:secreto,code,grant_type:'authorization_code'})});
    if(canje.status!==200){if(canje.body)await canje.body.cancel();return responder(request,{error:'Apple no aceptó la confirmación. Intenta de nuevo.'},502);}
    const tokens=await canje.json();
    // El código tiene que ser del mismo Apple ID de esta cuenta, no de otro.
    if(leerPayloadJwt(tokens.id_token)?.sub!==sub)return responder(request,{error:'Confirmaste con otro Apple ID.'},403);
    const token=tokens.refresh_token||tokens.access_token;
    if(typeof token!=='string'||!token)return responder(request,{error:'Apple no devolvió un token.'},502);

    const revocado=await pedir(APPLE+'/auth/revoke',{method:'POST',redirect:'manual',signal:corte.signal,
      headers:{'Content-Type':'application/x-www-form-urlencoded'},
      body:formulario({client_id:CLIENTE_APP,client_secret:secreto,token,token_type_hint:tokens.refresh_token?'refresh_token':'access_token'})});
    if(revocado.body)await revocado.body.cancel();
    if(revocado.status!==200)return responder(request,{error:'Apple no revocó el acceso. Intenta de nuevo.'},502);
    return responder(request,{ok:true},200);
  }catch{return responder(request,{error:'No pudimos hablar con Apple a tiempo. Intenta de nuevo.'},504);}
  finally{clearTimeout(reloj);}
}
export async function onRequest({request,env}){return revocarApple(request,env);}
