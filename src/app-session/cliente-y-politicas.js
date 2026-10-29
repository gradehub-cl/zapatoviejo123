const PASS_MIN = 8;
// La versión acompaña a cada aceptación para poder saber qué texto leyó alguien
// si cambian los términos o la política. Las cuentas anteriores no la traen y
// siguen entrando: esta constancia se exige solo al crear una cuenta nueva.
const LEGAL_ACCEPTANCE_VERSION = '2026-10-27';

// UN SOLO TEXTO para dos caminos que tienen que verse iguales desde afuera: el
// registro que no devolvió sesión y el correo que YA tenía cuenta. Si difieren,
// mandar un correo al formulario y comparar las dos respuestas dice quién está
// registrado en GradeHub — que es media credencial servida, y con las notas de
// esa persona al otro lado. Por eso es una constante y no dos literales:
// separarlos reabre la enumeración sin que falle nada.
//
// NO PROMETE UN CORREO. La confirmación por correo está desactivada en
// Supabase, así que el registro nuevo entra directo y este aviso queda casi
// siempre para el correo que ya tenía cuenta: mandarlo a esperar un mail que
// nadie despacha lo deja botado sin saberlo. Lo que dice es cierto en los dos
// casos y sigue sin distinguirlos. Si algún día se reactiva la confirmación,
// hay que volver a redactarlo. Lo fija `tests/seguridad.test.js`.
const MSG_VERIFICA = 'Ya puedes entrar con ese correo y tu contraseña.';

// El enlace de la calculadora solo atribuye la entrada en esta pestaña. No se
// mezcla con gradehub_v1 ni se guarda puntaje, nota o identidad en la URL.
const ORIGEN_ENTRADA_KEY='gradehub_origen_entrada';
try{
  if(new URLSearchParams(location.search).get('desde')==='calculadora'){
    sessionStorage.setItem(ORIGEN_ENTRADA_KEY,'calculadora');
    // Limpiar solo este parámetro: si queda en la barra, una recarga lo vuelve
    // a atribuir. Conservar parámetros y fragmentos de OAuth o recuperación.
    const url=new URL(location.href);
    url.searchParams.delete('desde');
    history.replaceState(history.state,'',url.pathname+url.search+url.hash);
  }
}catch(e){}
function consumirOrigenEntrada(){
  try{
    const origen=sessionStorage.getItem(ORIGEN_ENTRADA_KEY);
    sessionStorage.removeItem(ORIGEN_ENTRADA_KEY);
    if(origen==='calculadora'||origen==='profesor')return {origen};
  }catch(e){}
  return undefined;
}

function passwordPolicyError(password){
  if(password.length<PASS_MIN)return 'La contraseña debe tener al menos '+PASS_MIN+' caracteres.';
  if(!/[A-Za-z]/.test(password)||!/\d/.test(password))return 'La contraseña debe incluir al menos una letra y un número.';
  return '';
}

function togglePasswordVisibility(inputId,button){
  const input=document.getElementById(inputId);
  if(!input||!button)return;
  const mostrar=input.type==='password';
  input.type=mostrar?'text':'password';
  button.classList.toggle('is-visible',mostrar);
  button.setAttribute('aria-pressed',mostrar?'true':'false');
  button.setAttribute('aria-label',mostrar?'Ocultar contraseña':'Mostrar contraseña');
  input.focus();
}

function resetPasswordVisibility(){
  ['auth-pass','auth-pass2'].forEach(id=>{
    const input=document.getElementById(id);
    const button=document.querySelector(`[data-password-for="${id}"]`);
    if(input)input.type='password';
    if(button){button.classList.remove('is-visible');button.setAttribute('aria-pressed','false');button.setAttribute('aria-label','Mostrar contraseña');}
  });
}

const SUPABASE_URL      = 'https://lsulsnswzesyekpsvlql.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_JwBMAOR7iHW-gcRdLMGrYw_eCOISwqA';

// auth-js procesa el enlace del correo de recuperación y BORRA el fragmento
// (`location.hash=''`) antes de que boot() reciba la sesión, y avisa
// PASSWORD_RECOVERY recién en un setTimeout. Leer `type=recovery` en boot()
// llegaba tarde: la app entraba directo, showTab('home') escondía la pantalla
// de nueva contraseña y "¿Olvidaste tu contraseña?" nunca dejaba ponerla. Se
// lee acá, antes de crear el cliente.
const LLEGA_DE_RECUPERACION=typeof location!=='undefined'&&/(?:^|[#&])type=recovery(?:&|$)/.test(location.hash||'');
let enRecuperacion=LLEGA_DE_RECUPERACION;
let supabaseClient=null, currentUser=null, authMode='login';
let _cerrandoSesion=false;
// En la app iOS (Capacitor) la página no puede irse a Google. Capacitor manda
// esa navegación a Safari y la vista web quedaba congelada: cancelar el login
// obligaba a cerrar la app. Y la vuelta a `capacitor://localhost` no llega a
// ninguna parte. Ahí Google se abre en una hoja de Safari dentro de la app y
// vuelve por el esquema propio, que tiene que estar en las Redirect URLs de
// Supabase (Authentication → URL Configuration).
//
// Con PKCE: otra app podría reclamar el mismo esquema, así que lo que vuelve es
// un código que solo sirve con el verificador guardado en este dispositivo, no
// la sesión. La web sigue con el flujo de siempre.
const APP_NATIVA=typeof window!=='undefined'&&!!(window.Capacitor&&typeof window.Capacitor.isNativePlatform==='function'&&window.Capacitor.isNativePlatform());
const VUELTA_NATIVA='cl.gradehub.app://login-callback';
try{
  if(window.supabase && SUPABASE_URL.startsWith('http')){
    supabaseClient=window.supabase.createClient(SUPABASE_URL,SUPABASE_ANON_KEY,APP_NATIVA?{auth:{flowType:'pkce'}}:undefined);
  }
}catch(e){console.warn('Supabase no inicializado:',e);}

function freshState(){return{ramos:[],userName:'',careerSemestre:1,carrera:null,tenant:'fen',onboardingDone:false,tipoCuenta:'estudiante',generacion:null,verano:null,historial:[],sortMode:'manual',modo:'sistema',acento:'turquesa',fondo:'neutro',carreraNombre:null};}
