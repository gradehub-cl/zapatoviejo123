// Lo que firma y arma un aviso para Apple (APNs). Sin dependencias: corre en la
// función de Supabase (Deno) y en los tests (Node). No guarda nada.

const b64url=bytes=>btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const textoB64url=t=>b64url(new TextEncoder().encode(t));

// La llave .p8 de Apple viene en PEM (PKCS#8), con o sin saltos de línea.
export function derDePem(pem){
  const limpio=String(pem||'').replace(/-----(BEGIN|END) PRIVATE KEY-----/g,'').replace(/\\n/g,'').replace(/\s+/g,'');
  if(!/^[A-Za-z0-9+/=]{100,}$/.test(limpio))return null;
  return Uint8Array.from(atob(limpio),c=>c.charCodeAt(0));
}

// El token de proveedor de APNs: un JWT ES256 firmado con la llave del equipo.
// Apple pide renovarlo entre 20 y 60 minutos; la función lo reusa 50.
export async function jwtApns({teamId,keyId,p8},ahora=Date.now(),cripto=crypto){
  const der=derDePem(p8);
  if(!der||!/^[A-Z0-9]{10}$/.test(teamId||'')||!/^[A-Z0-9]{10}$/.test(keyId||''))return null;
  const llave=await cripto.subtle.importKey('pkcs8',der,{name:'ECDSA',namedCurve:'P-256'},false,['sign']);
  const base=textoB64url(JSON.stringify({alg:'ES256',kid:keyId}))+'.'+textoB64url(JSON.stringify({iss:teamId,iat:Math.floor(ahora/1000)}));
  // WebCrypto entrega la firma como r||s (IEEE P1363), que es lo que pide un JWT.
  const firma=await cripto.subtle.sign({name:'ECDSA',hash:'SHA-256'},llave,new TextEncoder().encode(base));
  return base+'.'+b64url(firma);
}

const ENLACE=/^cl\.gradehub\.app:\/\/[a-z]+(\/[A-Za-z0-9_-]{1,64})?$/;
// Una fila de avisos_salientes → la petición a Apple (sin la autorización).
// Si algo no calza, null: no se manda nada raro.
export function pedidoApns(fila,{bundle='cl.gradehub.app',sandbox=false,ahora=Date.now()}={}){
  if(!fila||!/^[0-9a-f]{64,200}$/.test(fila.token||'')||!ENLACE.test(fila.enlace||''))return null;
  const titulo=String(fila.titulo||'').slice(0,80),cuerpo=String(fila.cuerpo||'').slice(0,200);
  if(!titulo||!cuerpo)return null;
  return {
    url:`https://${sandbox?'api.sandbox.push.apple.com':'api.push.apple.com'}/3/device/${fila.token}`,
    headers:{'apns-topic':bundle,'apns-push-type':'alert','apns-priority':'10',
      // Si el iPhone está apagado más de un día, el aviso ya no sirve.
      'apns-expiration':String(Math.floor(ahora/1000)+86400),'content-type':'application/json'},
    // `thread-id` agrupa los avisos de Amigos en el centro de notificaciones.
    body:JSON.stringify({aps:{alert:{title:titulo,body:cuerpo},sound:'default','thread-id':'amigos'},enlace:fila.enlace}),
  };
}

// Apple dice que el token ya no sirve (app borrada, otro iPhone): se olvida.
export function debeOlvidarToken(status,razon){
  return status===410||(status===400&&['BadDeviceToken','DeviceTokenNotForTopic','Unregistered'].includes(razon));
}
