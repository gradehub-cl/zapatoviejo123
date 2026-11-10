// Cambiar la contraseña estando dentro (#714). Antes solo se podía desde el
// correo de recuperación. Se prueba aislado: sin Supabase real ni cuentas de
// personas.
const fs=require('fs'),vm=require('vm');
const raiz=__dirname+'/../';
const sesion=fs.readFileSync(raiz+'app-session.js','utf8');
const app=fs.readFileSync(raiz+'app.js','utf8');
let ok=0,fail=0;
const chk=(nombre,condicion)=>{console.log(`  ${condicion?'OK  ':'FAIL'} ${nombre}`);if(condicion)ok++;else fail++;};

function elemento(valor=''){
  const atributos={};
  return {value:valor,textContent:'',hidden:true,disabled:false,style:{},focused:false,
    setAttribute(k,v){atributos[k]=String(v);},getAttribute(k){return atributos[k]||null;},removeAttribute(k){delete atributos[k];},focus(){this.focused=true;}};
}
function arnes(responder){
  const ids={
    's-account-pass':elemento(''),'s-account-pass2':elemento(''),
    's-account-pass-recover':Object.assign(elemento(),{textContent:'Enviar enlace al correo'}),
    's-account-pass-status':elemento(),'s-account-pass-save':Object.assign(elemento(),{textContent:'Cambiar contraseña'}),
  };
  const llamadas=[];
  const ctx={
    document:{getElementById:id=>ids[id]||null},
    currentUser:{id:'u1',email:'cuenta@ejemplo.test',app_metadata:{provider:'email',providers:['email']}},
    location:{origin:'https://gradehub.example',pathname:'/app/'},
    MSG_VERIFICA:'Ya puedes entrar con ese correo y tu contraseña.',
  };
  ctx.supabaseClient={auth:{updateUser:async args=>{llamadas.push(args);return responder(ctx);},resetPasswordForEmail:async (...args)=>{llamadas.push(args);return responder(ctx);}}};
  vm.createContext(ctx);
  const politica=sesion.slice(sesion.indexOf('const PASS_MIN'),sesion.indexOf('\n',sesion.indexOf('const PASS_MIN')))
    +'\n'+sesion.slice(sesion.indexOf('function passwordPolicyError'),sesion.indexOf('function togglePasswordVisibility'));
  vm.runInContext(politica.replace('const PASS_MIN','var PASS_MIN'),ctx);
  const inicio=sesion.indexOf('function traduceAuthError');
  vm.runInContext(sesion.slice(inicio,sesion.indexOf('async function submitAuth',inicio)),ctx);
  return {ctx,ids,llamadas};
}
const llenar=(kit,a,b)=>{kit.ids['s-account-pass'].value=a;kit.ids['s-account-pass2'].value=b;};
const estado=kit=>kit.ids['s-account-pass-status'].textContent;

(async()=>{
  console.log('\n=== Quién ve la opción ===');
  const {ctx}=arnes(()=>({error:null}));
  chk('cuenta con correo y contraseña', ctx.cuentaConClave({app_metadata:{provider:'email',providers:['email']}}));
  chk('cuenta de Google: no tiene contraseña que cambiar', !ctx.cuentaConClave({app_metadata:{provider:'google',providers:['google']}}));
  chk('nació con Google y después sumó correo: no se ofrece', !ctx.cuentaConClave({app_metadata:{provider:'google',providers:['google','email']}}));
  chk('nació con correo y después sumó Google: se ofrece', ctx.cuentaConClave({app_metadata:{provider:'email',providers:['email','google']}}));
  chk('sin metadatos, no se ofrece', !ctx.cuentaConClave({}));
  chk('Ajustes la muestra solo con sesión y cuenta con clave',
    /currentUser&&conClave\?`[\s\S]{0,1600}id="s-account-pass"/.test(app));
  chk('los campos piden contraseña nueva (el llavero sugiere una)', (app.match(/id="s-account-pass2?"[^>]*autocomplete="new-password"/g)||[]).length===2);
  chk('no pide la contraseña actual en Ajustes', !app.includes('s-account-current-pass'));
  chk('la verificación por correo parte oculta', /id="s-account-pass-recover"[^>]*hidden/.test(app));

  console.log('\n=== Validación antes de llamar a Supabase ===');
  let kit=arnes(()=>({error:null}));
  llenar(kit,'corta1','corta1');
  chk('aplica la política de siempre', await kit.ctx.cambiarClaveCuenta()===false&&kit.llamadas.length===0&&/al menos 8/.test(estado(kit))&&kit.ids['s-account-pass'].focused);
  kit=arnes(()=>({error:null}));
  llenar(kit,'clave1234','clave12345');
  chk('las dos tienen que coincidir', await kit.ctx.cambiarClaveCuenta()===false&&kit.llamadas.length===0&&/no coinciden/.test(estado(kit)));
  kit=arnes(()=>({error:null}));
  kit.ctx.currentUser={id:'u3',email:'google@ejemplo.test',app_metadata:{provider:'google',providers:['google','email']}};
  llenar(kit,'clave1234','clave1234');
  chk('cuenta que nació con Google: no llama a Supabase aunque se invoque directo', await kit.ctx.cambiarClaveCuenta()===false&&kit.llamadas.length===0&&/Google/.test(estado(kit)));

  console.log('\n=== Guardar ===');
  kit=arnes(()=>({data:{user:{id:'u1'}},error:null}));
  llenar(kit,'clave1234','clave1234');
  const usuario=kit.ctx.currentUser;
  chk('manda solo contraseña nueva desde la sesión existente', await kit.ctx.cambiarClaveCuenta()===true&&kit.llamadas.length===1&&JSON.stringify(kit.llamadas[0])==='{"password":"clave1234"}');
  chk('lo dice y vacía los campos', /actualizada/i.test(estado(kit))&&kit.ids['s-account-pass'].value===''&&kit.ids['s-account-pass2'].value==='');
  chk('no reemplaza la sesión en memoria', kit.ctx.currentUser===usuario);
  chk('el botón vuelve a quedar disponible', kit.ids['s-account-pass-save'].disabled===false&&kit.ids['s-account-pass-save'].textContent==='Cambiar contraseña');

  console.log('\n=== Errores ===');
  kit=arnes(()=>({error:{code:'same_password',message:'New password should be different from the old password.'}}));
  llenar(kit,'clave1234','clave1234');
  chk('misma contraseña, en español', await kit.ctx.cambiarClaveCuenta()===false&&/distinta de la anterior/.test(estado(kit)));
  kit=arnes(()=>({error:{code:'reauthentication_needed',message:'Password update requires reauthentication.'}}));
  llenar(kit,'clave1234','clave1234');
  chk('sesión antigua: ofrece enlace sin desactivar seguridad', await kit.ctx.cambiarClaveCuenta()===false&&/correo/.test(estado(kit))&&!kit.ids['s-account-pass-recover'].hidden&&!/al menos/.test(estado(kit)));
  kit=arnes(()=>({error:{code:'current_password_required',message:'Current password required when setting new password.'}}));
  llenar(kit,'clave1234','clave1234');
  chk('servidor exige clave anterior: ofrece recuperación, no un campo ausente', await kit.ctx.cambiarClaveCuenta()===false&&/sin la anterior/.test(estado(kit))&&!kit.ids['s-account-pass-recover'].hidden&&kit.ids['s-account-pass'].getAttribute('aria-invalid')===null);
  kit=arnes(()=>({error:{code:'current_password_mismatch',message:'Current password required when setting new password.'}}));
  llenar(kit,'clave1234','clave1234');
  chk('rechazo de verificación: conserva el camino por correo', await kit.ctx.cambiarClaveCuenta()===false&&!kit.ids['s-account-pass-recover'].hidden);

  console.log('\n=== Una respuesta tardía no escribe en otra visita (#579) ===');
  kit=arnes(ctx=>{ctx.currentUser={id:'u2'};return {error:null};});
  llenar(kit,'clave1234','clave1234');
  chk('se descarta', await kit.ctx.cambiarClaveCuenta()===false&&estado(kit)==='');

  console.log('\n=== Recuperación por correo, sin contraseñas en la petición ===');
  kit=arnes(()=>({error:null}));
  llenar(kit,'noSeEnvia123','noSeEnvia123');
  kit.ids['s-account-email']=elemento('destino-no-guardado@ejemplo.test');
  const cuenta=kit.ctx.currentUser;
  chk('envía al correo de la sesión, no al campo editable', await kit.ctx.recuperarClaveCuenta()===true&&JSON.stringify(kit.llamadas[0])===JSON.stringify(['cuenta@ejemplo.test',{redirectTo:'https://gradehub.example/app/'}]));
  chk('no cambia sesión ni claves al pedir el enlace', kit.ctx.currentUser===cuenta&&kit.ids['s-account-pass'].value==='noSeEnvia123'&&/Revisa el correo/.test(estado(kit)));
  kit=arnes(()=>({error:{status:429,code:'over_email_send_rate_limit'}}));
  chk('límite de correo en español y permite reintentar', await kit.ctx.recuperarClaveCuenta()===false&&/Espera unos minutos/.test(estado(kit))&&!kit.ids['s-account-pass-recover'].disabled);
  kit=arnes(()=>Promise.reject(new Error('network')));
  chk('fallo de red no anuncia envío', await kit.ctx.recuperarClaveCuenta()===false&&/internet/.test(estado(kit)));
  kit=arnes(()=>({error:null}));kit.ctx.currentUser=null;
  chk('sin sesión no envía correo', await kit.ctx.recuperarClaveCuenta()===false&&kit.llamadas.length===0);
  kit=arnes(()=>({error:null}));kit.ctx.currentUser.app_metadata={providers:['google']};
  chk('Google sin contraseña no envía correo', await kit.ctx.recuperarClaveCuenta()===false&&kit.llamadas.length===0);
  kit=arnes(c=>{c.currentUser={id:'otra-visita'};return {error:null};});
  chk('respuesta tardía no anuncia envío a otra cuenta', await kit.ctx.recuperarClaveCuenta()===false&&estado(kit)==='');
  let resolver;
  kit=arnes(()=>new Promise(r=>{resolver=r;}));
  const envio=kit.ctx.recuperarClaveCuenta();
  llenar(kit,'clave1234','clave1234');
  chk('doble toque y cambio simultáneo no duplican peticiones', await kit.ctx.recuperarClaveCuenta()===false&&await kit.ctx.cambiarClaveCuenta()===false&&kit.llamadas.length===1);
  resolver({error:null});await envio;
  chk('reactiva el botón al terminar',!kit.ids['s-account-pass-recover'].disabled&&kit.ids['s-account-pass-recover'].textContent==='Enviar enlace al correo');

  console.log(`\nPASS: ${ok}   FAIL: ${fail}`);
  process.exit(fail?1:0);
})().catch(e=>{console.error(e);process.exit(1);});
