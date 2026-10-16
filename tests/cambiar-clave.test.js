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
    's-account-current-pass':elemento(''),
    's-account-pass':elemento(''),'s-account-pass2':elemento(''),
    's-account-pass-status':elemento(),'s-account-pass-save':Object.assign(elemento(),{textContent:'Cambiar contraseña'}),
  };
  const llamadas=[];
  const ctx={
    document:{getElementById:id=>ids[id]||null},
    currentUser:{id:'u1',email:'cuenta@ejemplo.test',app_metadata:{provider:'email',providers:['email']}},
    MSG_VERIFICA:'Ya puedes entrar con ese correo y tu contraseña.',
  };
  ctx.supabaseClient={auth:{updateUser:async args=>{llamadas.push(args);return responder(ctx);}}};
  vm.createContext(ctx);
  const politica=sesion.slice(sesion.indexOf('const PASS_MIN'),sesion.indexOf('\n',sesion.indexOf('const PASS_MIN')))
    +'\n'+sesion.slice(sesion.indexOf('function passwordPolicyError'),sesion.indexOf('function togglePasswordVisibility'));
  vm.runInContext(politica.replace('const PASS_MIN','var PASS_MIN'),ctx);
  const inicio=sesion.indexOf('function traduceAuthError');
  vm.runInContext(sesion.slice(inicio,sesion.indexOf('async function submitAuth',inicio)),ctx);
  return {ctx,ids,llamadas};
}
const llenar=(kit,a,b,actual='claveAnterior123')=>{kit.ids['s-account-current-pass'].value=actual;kit.ids['s-account-pass'].value=a;kit.ids['s-account-pass2'].value=b;};
const estado=kit=>kit.ids['s-account-pass-status'].textContent;

(async()=>{
  console.log('\n=== Quién ve la opción ===');
  const {ctx}=arnes(()=>({error:null}));
  chk('cuenta con correo y contraseña', ctx.cuentaConClave({app_metadata:{provider:'email',providers:['email']}}));
  chk('cuenta de Google: no tiene contraseña que cambiar', !ctx.cuentaConClave({app_metadata:{provider:'google',providers:['google']}}));
  chk('cuenta con las dos', ctx.cuentaConClave({app_metadata:{provider:'google',providers:['google','email']}}));
  chk('sin metadatos, no se ofrece', !ctx.cuentaConClave({}));
  chk('Ajustes la muestra solo con sesión y cuenta con clave',
    /currentUser&&conClave\?`[\s\S]{0,1600}id="s-account-pass"/.test(app));
  chk('los campos piden contraseña nueva (el llavero sugiere una)', (app.match(/id="s-account-pass2?"[^>]*autocomplete="new-password"/g)||[]).length===2);
  chk('pide contraseña actual con autocompletado correcto', /id="s-account-current-pass"[^>]*autocomplete="current-password"/.test(app));

  console.log('\n=== Validación antes de llamar a Supabase ===');
  let kit=arnes(()=>({error:null}));
  llenar(kit,'clave1234','clave1234','');
  chk('exige la contraseña actual', await kit.ctx.cambiarClaveCuenta()===false&&kit.llamadas.length===0&&/contraseña actual/.test(estado(kit))&&kit.ids['s-account-current-pass'].focused);
  kit=arnes(()=>({error:null}));
  llenar(kit,'corta1','corta1');
  chk('aplica la política de siempre', await kit.ctx.cambiarClaveCuenta()===false&&kit.llamadas.length===0&&/al menos 8/.test(estado(kit))&&kit.ids['s-account-pass'].focused);
  kit=arnes(()=>({error:null}));
  llenar(kit,'clave1234','clave12345');
  chk('las dos tienen que coincidir', await kit.ctx.cambiarClaveCuenta()===false&&kit.llamadas.length===0&&/no coinciden/.test(estado(kit)));

  console.log('\n=== Guardar ===');
  kit=arnes(()=>({data:{user:{id:'u1'}},error:null}));
  llenar(kit,'clave1234','clave1234');
  const usuario=kit.ctx.currentUser;
  chk('manda contraseña nueva y actual', await kit.ctx.cambiarClaveCuenta()===true&&kit.llamadas.length===1&&JSON.stringify(kit.llamadas[0])==='{"password":"clave1234","current_password":"claveAnterior123"}');
  chk('lo dice y vacía los campos', /actualizada/i.test(estado(kit))&&kit.ids['s-account-current-pass'].value===''&&kit.ids['s-account-pass'].value===''&&kit.ids['s-account-pass2'].value==='');
  chk('no reemplaza la sesión en memoria', kit.ctx.currentUser===usuario);
  chk('el botón vuelve a quedar disponible', kit.ids['s-account-pass-save'].disabled===false&&kit.ids['s-account-pass-save'].textContent==='Cambiar contraseña');

  console.log('\n=== Errores ===');
  kit=arnes(()=>({error:{code:'same_password',message:'New password should be different from the old password.'}}));
  llenar(kit,'clave1234','clave1234');
  chk('misma contraseña, en español', await kit.ctx.cambiarClaveCuenta()===false&&/distinta de la anterior/.test(estado(kit)));
  kit=arnes(()=>({error:{code:'reauthentication_needed',message:'Password update requires reauthentication.'}}));
  llenar(kit,'clave1234','clave1234');
  chk('sesión antigua: pide volver a entrar, no dice que es corta', await kit.ctx.cambiarClaveCuenta()===false&&/vuelve a entrar/.test(estado(kit))&&!/al menos/.test(estado(kit)));
  kit=arnes(()=>({error:{code:'current_password_required',message:'Current password required when setting new password.'}}));
  llenar(kit,'clave1234','clave1234');
  chk('contraseña actual requerida: error preciso', await kit.ctx.cambiarClaveCuenta()===false&&/contraseña actual/.test(estado(kit))&&kit.ids['s-account-current-pass'].focused&&!/al menos/.test(estado(kit)));
  kit=arnes(()=>({error:{code:'current_password_mismatch',message:'Current password required when setting new password.'}}));
  llenar(kit,'clave1234','clave1234');
  chk('contraseña actual incorrecta: error preciso', await kit.ctx.cambiarClaveCuenta()===false&&/no es correcta/.test(estado(kit))&&kit.ids['s-account-current-pass'].focused);

  console.log('\n=== Una respuesta tardía no escribe en otra visita (#579) ===');
  kit=arnes(ctx=>{ctx.currentUser={id:'u2'};return {error:null};});
  llenar(kit,'clave1234','clave1234');
  chk('se descarta', await kit.ctx.cambiarClaveCuenta()===false&&estado(kit)==='');

  console.log(`\nPASS: ${ok}   FAIL: ${fail}`);
  process.exit(fail?1:0);
})().catch(e=>{console.error(e);process.exit(1);});
