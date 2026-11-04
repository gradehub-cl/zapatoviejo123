
async function submitAuth(){
  const btn=document.getElementById('auth-btn');
  // Enter llama esta función desde el campo, aunque el botón esté deshabilitado.
  if(btn.disabled)return;
  const email=(document.getElementById('auth-user').value||'').trim().toLowerCase();
  const p=document.getElementById('auth-pass').value;
  const p2=document.getElementById('auth-pass2').value;
  authError('');
  const emailRe=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if(!emailRe.test(email)){authError('Ingresa un correo electrónico válido.');return;}
  // El mínimo se exige SOLO al crear la cuenta. Al iniciar sesión no se valida
  // el largo: quien se registró cuando el mínimo era 6 tiene que poder entrar,
  // y validarlo acá lo dejaría fuera de su propia cuenta con un error engañoso.
  if(!p){authError('Escribe tu contraseña.');return;}
  if(authMode==='signup'){
    const policyError=passwordPolicyError(p);
    if(policyError){authError(policyError);return;}
    if(p!==p2){authError('Las contraseñas no coinciden.');return;}
    // Sin casilla (decisión de Lucas, 2026-11-03): el texto «Al continuar
    // aceptas…» está a la vista sobre este botón, y tocarlo es aceptar. La
    // constancia con fecha y versión se guarda igual, abajo, al crear la cuenta.
  }
  if(!supabaseClient){authError('Falta configurar Supabase (URL y clave) en el código.');return;}

  const orig=btn.textContent;
  btn.disabled=true;btn.textContent='Cargando...';
  try{
    if(authMode==='signup'){
      const {data,error}=await supabaseClient.auth.signUp({email,password:p});
      if(error)throw error;
      if(!data.session){
        // Supabase no dice si el correo ya tenía cuenta: en ese caso responde
        // sin sesión, igual que si hubiera que confirmar el correo. Se intenta
        // entrar con lo mismo que se escribió: quien ya tenía cuenta y puso su
        // contraseña queda adentro, que es lo que esperaba al registrarse. Si
        // no calza, el mismo aviso de siempre, así que no se revela nada: la
        // contraseña correcta ya bastaba para entrar.
        const {data:entrada,error:errorEntrada}=await supabaseClient.auth.signInWithPassword({email,password:p});
        if(errorEntrada||!entrada||!entrada.session){authError(MSG_VERIFICA,'info');btn.disabled=false;btn.textContent=orig;return;}
        recordarMetodoLogin('correo');
        currentUser=entrada.user;
        // Volvió a aceptar los términos en este formulario: se anota, sin que
        // un fallo de esa constancia le impida entrar a su propia cuenta.
        try{await registrarAceptacionLegal();}catch(e){}
        await afterLogin();
        return;
      }
      currentUser=data.user;
      await registrarAceptacionLegal();
      await afterSignup();
    }else{
      const {data,error}=await supabaseClient.auth.signInWithPassword({email,password:p});
      if(error)throw error;
      recordarMetodoLogin('correo');
      currentUser=data.user;await afterLogin();
    }
  }catch(e){
    authError(traduceAuthError(e));
  }finally{
    btn.disabled=false;btn.textContent=orig;
  }
}

// --- ULTIMO METODO USADO PARA ENTRAR ---
// Volver despues de un mes y no acordarse de si se entro con Google o con
// correo termina en un "contrasena incorrecta" que no es tal: la cuenta existe,
// pero se creo por el otro camino.
//
// Se guarda SOLO cual de los dos, nunca el correo: esta pantalla se ve en
// computadores compartidos y de un correo a la vista se deduce quien lo usa.
// Va en su propia clave y no en el estado de la app, porque tiene que seguir
// disponible despues de cerrar sesion, que es justo cuando hace falta.
var CLAVE_ULTIMO_LOGIN='gradehub_ultimo_login';
function recordarMetodoLogin(metodo){
  try{localStorage.setItem(CLAVE_ULTIMO_LOGIN,metodo);}catch(e){/* modo privado */}
}
function ultimoMetodoLogin(){
  try{return localStorage.getItem(CLAVE_ULTIMO_LOGIN);}catch(e){return null;}
}
// La marca se pinta al mostrar la pantalla de auth. Si no hay nada guardado
// -primera vez, o navegador que no deja guardar- simplemente no aparece.
function marcarUltimoLogin(){
  const metodo=ultimoMetodoLogin();
  document.querySelectorAll('.auth-ultimo').forEach(function(e){e.remove();});
  if(!metodo)return;
  // La marca va ENCIMA del metodo, no dentro. Metida en el boton de Google
  // quedaba gris sobre gris —ilegible— y ademas le partia el texto en dos
  // lineas. Arriba se lee en los dos casos y no toca el boton.
  const destino=metodo==='google'
    ? document.getElementById('btn-google')
    : document.querySelector('#screen-auth .ob-card');
  if(!destino||!destino.parentNode)return;
  const marca=document.createElement('div');
  marca.className='auth-ultimo';
  marca.textContent='Lo usaste la última vez';
  destino.parentNode.insertBefore(marca,destino);
}

// Login con Google vía Supabase OAuth. Redirige fuera; al volver, boot() detecta
// la sesión y entra solo (o manda a onboarding si es cuenta nueva).
