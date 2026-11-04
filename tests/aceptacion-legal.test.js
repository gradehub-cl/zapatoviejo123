// Desde el 2026-11-03 no hay casilla (decisión de Lucas, para sacar fricción):
// el texto «Al continuar aceptas…» queda a la vista junto a los botones y
// tocarlos es aceptar. Lo que no se negocia es la constancia: fecha y versión
// guardadas al crear la cuenta, sin bloquear cuentas previas.
const fs=require('fs'),path=require('path'),vm=require('vm');
const raiz=path.join(__dirname,'..');
const leer=(archivo,env)=>{
  const ruta=process.env[env]||path.join(raiz,archivo);
  return fs.existsSync(ruta)?fs.readFileSync(ruta,'utf8'):'';
};
let fail=0;
const chk=(nombre,ok)=>{console.log(`  ${ok?'OK  ':'FAIL'} ${nombre}`);if(!ok)fail++;};

const html=leer('index.html','GRADEHUB_INDEX');
const sesion=leer('app-session.js','GRADEHUB_SESSION');
const privacidad=leer('privacidad.html','GRADEHUB_PRIVACIDAD');
const preguntas=leer('preguntas.html','GRADEHUB_PREGUNTAS');
const terminos=leer('terminos.html','GRADEHUB_TERMINOS');
const sql=leer('supabase/aceptacion_legal.sql','GRADEHUB_SQL');

console.log('\n=== Aceptación a la vista al entrar ===');
chk('ya no hay casilla de aceptación',!/id="auth-legal-accept"/.test(html));
const aviso=(html.match(/<p class="auth-legal" id="auth-legal">[\s\S]*?<\/p>/)||[])[0]||'';
const textoAviso=aviso.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();
chk('el aviso enlaza términos y privacidad',/href="\/terminos\.html"/.test(aviso)&&/href="\/privacidad\.html"/.test(aviso));
chk('dice que continuar es aceptar y declara la edad mínima',/Al continuar aceptas/.test(textoAviso)&&/14 años o más/.test(textoAviso));
chk('se lee de una vez',textoAviso.length>0&&textoAviso.length<110);
// Visible siempre, también para quien entra con Google: no va dentro de nada
// que se esconda según el modo, y va junto a los botones de entrar.
chk('no está escondido ni depende del modo',!/<p class="auth-legal"[^>]*(hidden|display:none)/.test(aviso)&&!/auth-legal'\)\.style/.test(sesion));
chk('va junto a los botones de entrar',/id="auth-btn"[\s\S]{0,900}id="auth-legal"/.test(html));
chk('crear cuenta ya no se detiene por una casilla',!/auth-legal-accept/.test(sesion));

console.log('\n=== Constancia compatible con cuentas existentes ===');
chk('la versión legal está declarada una sola vez',
  (sesion.match(/LEGAL_ACCEPTANCE_VERSION/g)||[]).length>=2&&/const LEGAL_ACCEPTANCE_VERSION\s*=\s*'\d{4}-\d{2}-\d{2}'/.test(sesion));
chk('el registro guarda fecha y versión en el perfil antes de abrir la app',
  /async function registrarAceptacionLegal[\s\S]{0,1200}terminos_aceptados_en[\s\S]{0,500}terminos_version/.test(sesion)&&
  /currentUser=data\.user;\s*await registrarAceptacionLegal\(\);\s*await afterSignup\(\)/.test(sesion));
chk('las columnas nuevas son opcionales: no reescriben ni bloquean perfiles previos',
  /add column if not exists terminos_aceptados_en timestamptz/i.test(sql)&&
  /add column if not exists terminos_version text/i.test(sql)&&
  !/not null/i.test(sql));
const boot=(sesion.match(/async function boot\(\)[\s\S]*?(?=\nasync function |\nfunction |\n\/\/)/)||[])[0]||'';
chk('una sesión existente no se redirige por no tener constancia',!/terminos_aceptados|terminos_version|LEGAL_ACCEPTANCE/.test(boot));

console.log('\n=== Lo que se acepta está publicado ===');
const usoLocal=/(notas y ramos|ramos y notas)[\s\S]{0,500}(local|navegador)[\s\S]{0,500}(ordenar|recomendaciones)[\s\S]{0,500}(profesores|profesor)[\s\S]{0,500}(no ven|no recibe|no reciben|no saben)/i;
chk('la privacidad explica el uso local y que profesores no reciben notas',usoLocal.test(privacidad));
chk('las preguntas frecuentes dicen lo mismo sin prometer un selector',usoLocal.test(preguntas)&&!/permiso explícito[\s\S]{0,220}si dices que no/i.test(preguntas));
chk('los términos incorporan el mismo alcance',usoLocal.test(terminos));

async function pruebaDeRegistro(){
  const elementos={};
  const campo=(valor='')=>({value:valor,style:{},setAttribute(){},removeAttribute(){},focus(){}});
  elementos['auth-user']=campo('alguien@ejemplo.cl');
  elementos['auth-pass']=campo('clave123');
  elementos['auth-pass2']=campo('clave123');
  elementos['auth-error']=campo();
  elementos['auth-btn']=campo('Crear cuenta');
  let intentos=0,perfil=null;
  const cliente={
    auth:{signUp:async()=>{intentos++;return {data:{session:{},user:{id:'cuenta-nueva'}},error:null};}},
    from:()=>({upsert:async datos=>{perfil=datos;return {error:null};}}),
  };
  const contexto={
    window:{supabase:{createClient:()=>cliente}},
    document:{getElementById:id=>elementos[id]||campo(),querySelector:()=>null,addEventListener(){}},
    console:{warn(){},log(){}},setTimeout(){},clearTimeout(){},location:{},
  };
  vm.createContext(contexto);
  vm.runInContext(sesion,contexto);
  vm.runInContext("authMode='signup'",contexto);
  vm.runInContext('afterSignup=async()=>{}',contexto);
  await vm.runInContext('submitAuth()',contexto);
  chk('la cuenta nueva guarda su aceptación antes del onboarding',
    intentos===1&&perfil?.id==='cuenta-nueva'&&typeof perfil?.terminos_aceptados_en==='string'&&perfil?.terminos_version===sesion.match(/const LEGAL_ACCEPTANCE_VERSION\s*=\s*'([\d-]+)'/)[1]);
}

// #666: la tabla de visitas diarias empieza a llenarse al mergear #687.
chk('la privacidad dice qué días entras, qué se guarda y por cuánto',
  /Qué días entras/.test(privacidad)&&/solo la cuenta y la fecha/.test(privacidad)&&/13 meses/.test(privacidad));

pruebaDeRegistro().then(()=>{
  if(fail){console.error(`\n${fail} comprobación(es) fallaron.`);process.exit(1);}
  console.log('\nTodo OK.');
});
