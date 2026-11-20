// La firma y el armado de avisos para Apple (supabase/functions/avisos-push/apns.mjs).
// Con una llave generada acá: nunca una real, y sin red.
const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
let ok=0;const chk=(n,c)=>{assert.ok(c,n);ok++;console.log('  OK   '+n);};
(async()=>{try{
  const m=await import(path.join(__dirname,'../supabase/functions/avisos-push/apns.mjs'));
  const par=await crypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},true,['sign','verify']);
  const pk=Buffer.from(await crypto.subtle.exportKey('pkcs8',par.privateKey)).toString('base64');
  const pem=`-----BEGIN PRIVATE KEY-----\n${pk.match(/.{1,64}/g).join('\n')}\n-----END PRIVATE KEY-----`;
  const jwt=await m.jwtApns({teamId:'PH6XQV8L2M',keyId:'ABCDE12345',p8:pem},Date.UTC(2026,10,20)/1);
  const [h,p,f]=jwt.split('.');
  const dec=x=>JSON.parse(Buffer.from(x,'base64url').toString());
  chk('el JWT lleva ES256, el Key ID y el equipo',dec(h).alg==='ES256'&&dec(h).kid==='ABCDE12345'&&dec(p).iss==='PH6XQV8L2M'&&dec(p).iat===Math.floor(Date.UTC(2026,10,20)/1000));
  chk('la firma verifica con la llave pública',await crypto.subtle.verify({name:'ECDSA',hash:'SHA-256'},par.publicKey,Buffer.from(f,'base64url'),new TextEncoder().encode(h+'.'+p)));
  chk('sin llave o con IDs raros no firma',await m.jwtApns({teamId:'x',keyId:'ABCDE12345',p8:pem})===null&&await m.jwtApns({teamId:'PH6XQV8L2M',keyId:'ABCDE12345',p8:'nada'})===null);
  const fila={id:1,token:'a'.repeat(64),titulo:'Solicitud de amistad',cuerpo:'Beto (@beto_ej) quiere ser tu amigo en GradeHub.',enlace:'cl.gradehub.app://amigos'};
  const r=m.pedidoApns(fila,{ahora:0});
  const cuerpo=JSON.parse(r.body);
  chk('va a producción, con el bundle y como alerta',r.url==='https://api.push.apple.com/3/device/'+'a'.repeat(64)&&r.headers['apns-topic']==='cl.gradehub.app'&&r.headers['apns-push-type']==='alert');
  chk('el aviso trae título, texto, sonido y el enlace para abrir Amigos',cuerpo.aps.alert.title==='Solicitud de amistad'&&cuerpo.aps.sound==='default'&&cuerpo.enlace==='cl.gradehub.app://amigos'&&cuerpo.aps['thread-id']==='amigos');
  chk('el sandbox solo si se pide',m.pedidoApns(fila,{sandbox:true}).url.startsWith('https://api.sandbox.push.apple.com/'));
  chk('una fila rara no se manda',m.pedidoApns({...fila,token:'zz'})===null&&m.pedidoApns({...fila,enlace:'https://malo.com'})===null&&m.pedidoApns({...fila,titulo:''})===null);
  chk('se olvida el token solo cuando Apple dice que murió',m.debeOlvidarToken(410,null)&&m.debeOlvidarToken(400,'BadDeviceToken')&&!m.debeOlvidarToken(429,'TooManyRequests')&&!m.debeOlvidarToken(500,null));
  const fuente=fs.readFileSync(path.join(__dirname,'../supabase/functions/avisos-push/index.ts'),'utf8');
  chk('la función exige el secreto del webhook y no registra contenido',/x-avisos-secreto/.test(fuente)&&!/console\.log/.test(fuente));
  console.log(`\nPASS: ${ok}   FAIL: 0`);
}catch(e){console.error(e);console.log('\nPASS: '+ok+'   FAIL: 1');process.exit(1);}})();
