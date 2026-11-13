// Apple nativo usa nonce de un solo intento; nunca se persiste ni se registra.
const APPLE_ENTRADA_KEY='gradehub_entrada_apple',APPLE_ENTRADA_MAX_MS=15*60*1000;
let intentoAppleEnCurso=false;
async function confirmarAppleDisponible(){
  // Endpoint público de Auth: sin sesión ni datos de la cuenta. Evita redirigir
  // al JSON técnico de /authorize cuando el proveedor todavía está apagado.
  const control=new AbortController(),plazo=setTimeout(()=>control.abort(),8000);
  try{
    const r=await fetch(SUPABASE_URL+'/auth/v1/settings',{headers:{apikey:SUPABASE_ANON_KEY},signal:control.signal});
    if(!r.ok)throw Error();
    const configuracion=await r.json();
    if(configuracion?.external?.apple!==true){const e=new Error('Proveedor no disponible');e.code='provider_disabled';throw e;}
  }catch(e){if(e?.code==='provider_disabled')throw e;const error=new Error('No pudimos comprobar Apple');error.code='APPLE_CONFIGURACION';throw error;}
  finally{clearTimeout(plazo);}
}
function contextoEntradaApple(){
  return {inicio:Date.now(),owner:getCacheOwner(),metodo:ultimoMetodoLogin()};
}
function guardarEntradaApple(contexto){try{sessionStorage.setItem(APPLE_ENTRADA_KEY,JSON.stringify(contexto));}catch(e){}}
function consumirEntradaApple(){
  try{const c=JSON.parse(sessionStorage.getItem(APPLE_ENTRADA_KEY)||'null');sessionStorage.removeItem(APPLE_ENTRADA_KEY);return c;}catch(e){return null;}
}
function esEntradaApple(user,contexto){return user?.app_metadata?.provider==='apple'||!!contexto&&user?.identities?.some(i=>i.provider==='apple');}
function avisarCuentaRelayApple(user,c){
  if(!c||!Number.isFinite(c.inicio)||Date.now()-c.inicio>APPLE_ENTRADA_MAX_MS||c.inicio>Date.now())return false;
  if(!/^[^@]+@privaterelay\.appleid\.com$/i.test(user?.email||''))return false;
  const creada=Date.parse(user.created_at),entrada=Date.parse(user.last_sign_in_at);
  // Supabase no devuelve is_new_user en este flujo. Solo avisar si la creación
  // cae DENTRO de este intento y coincide con su primer acceso, nunca por tener
  // datos vacíos o por usar relay. Sin evidencia de fechas, no inferir creación.
  const otros=user.app_metadata?.providers?.some(p=>p!=='apple');
  if(otros||!Number.isFinite(creada)||!Number.isFinite(entrada)||creada<c.inicio||creada>Date.now()||entrada<creada||entrada-creada>2000)return false;
  return !!(c.owner&&c.owner!==user.id||['google','correo'].includes(c.metodo));
}
function prepararCacheApple(user){
  // Reutiliza el aislamiento existente, también para una cuenta Apple antigua.
  // El respaldo queda bajo el dueño original; no se importa ni fusiona a Apple.
  if(getCacheOwner()===user.id)return;
  if(!aislarCacheEnRegistro(user.id)){
    const e=new Error('No pudimos proteger los ramos de este dispositivo.');e.code='APPLE_CACHE_NO_AISLADA';throw e;
  }
}
function mostrarAvisoCuentaApple(user,c){
  if(currentUser?.id!==user.id||!avisarCuentaRelayApple(user,c))return;
  showConfirm('Entraste con una cuenta nueva',
    'Si ya usabas GradeHub con Google o con tu correo, cierra sesión y entra de esa forma. Tus cuentas no se unieron.',
    ()=>{if(currentUser?.id===user.id)signOut();},{label:'Cerrar sesión',danger:false,focusCancel:true});
}
async function entrarConAppleNativo(){
  if(intentoAppleEnCurso)return;intentoAppleEnCurso=true;
  const anterior=currentUser,c=contextoEntradaApple(),cliente=supabaseClient;let entrante=null;
  const vigente=()=>currentUser===anterior&&supabaseClient===cliente;
  try{
    const plugin=window.Capacitor?.Plugins?.AppleSignIn;
    if(!plugin?.authorize){const e=new Error('Actualiza la app para entrar con Apple.');e.code='APPLE_PLUGIN_NO_DISPONIBLE';throw e;}
    const bytes=crypto.getRandomValues(new Uint8Array(32));
    const nonce=[...bytes].map(b=>b.toString(16).padStart(2,'0')).join('');
    const hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(nonce)))].map(b=>b.toString(16).padStart(2,'0')).join('');
    if(!vigente())return;
    const credential=await plugin.authorize({nonce:hash});if(!vigente())return;
    const {data,error}=await cliente.auth.signInWithIdToken({provider:'apple',token:credential.identityToken,nonce});
    if(!vigente())return;if(error)throw error;
    if(!data?.user){const e=new Error('Apple no devolvió una sesión.');e.code='APPLE_SESION_INVALIDA';throw e;}
    const user=data.user;prepararCacheApple(user);entrante=currentUser=user;recordarMetodoLogin('apple');
    // El nombre solo llega en la primera autorización. No pisa metadatos existentes.
    const nombre=String(credential.fullName||'').trim().slice(0,100);
    if(nombre&&!String(user.user_metadata?.full_name||'').trim()){
      try{
        const r=await cliente.auth.updateUser({data:{full_name:nombre}});
        if(currentUser!==user||supabaseClient!==cliente)return;
        if(!r.error&&r.data?.user?.id===user.id)entrante=currentUser=r.data.user;
      }catch(e){if(currentUser!==user)return;} // No bloquear el acceso por el nombre.
    }
    if(currentUser?.id!==user.id||supabaseClient!==cliente)return;
    await afterLogin();mostrarAvisoCuentaApple(user,c);
  }catch(e){
    if(vigente()||currentUser===entrante&&entrante||e?.code==='APPLE_CACHE_NO_AISLADA'){
      if(e?.code!=='APPLE_CANCELADO'&&String(e?.code)!=='1001')authError(traduceAuthError(e));
      if(e?.code==='APPLE_CACHE_NO_AISLADA'){try{await cliente.auth.signOut({scope:'local'});}catch(_){}currentUser=null;}
    }
  }finally{intentoAppleEnCurso=false;reactivarBotonesOAuth();}
}
