// El nombre del onboarding llega a los metadatos de Auth («Display name» en el
// panel de Supabase) para quien se registró con correo, sin pisar nunca el
// nombre que ya trae Google, Apple o una copia anterior. Datos sintéticos.
const fs = require('fs'), vm = require('vm');
// Solo la función, desde su fuente: el resto del bloque necesita un navegador.
const fuente = fs.readFileSync(__dirname + '/../src/app-session/perfil-y-legal.js', 'utf8');
const src = fuente.match(/async function copiarNombreAAuth\(\)\{[\s\S]*?\n\}\n/)[0] + 'var supabaseClient=null,currentUser=null,S={};';
const llamada = fs.readFileSync(__dirname + '/../src/app-session/entrada-cuenta.js', 'utf8');
let ok = 0, fail = 0;
const chk = (n, c) => { c ? ok++ : fail++; console.log((c ? '  ✓ ' : '  ✗ ') + n); };
const ctx = { console };
vm.createContext(ctx); vm.runInContext(src, ctx);
const run = c => vm.runInContext(c, ctx);
run(`var _updates=[];
  function cliente(error){return {auth:{updateUser:async p=>{_updates.push(p);return error?{error:{message:'x'}}:{data:{user:{...currentUser,user_metadata:{...(currentUser.user_metadata||{}),...p.data}}},error:null};}}};}`);

(async () => {
  run(`supabaseClient=cliente();currentUser={id:'u-sintetico',user_metadata:{}};S={userName:'  Ana ',userApellido:'Pérez   Soto'};`);
  await run('copiarNombreAAuth()');
  chk('correo sin nombre: sube nombre y apellido', run('_updates.length') === 1 && run('_updates[0].data.full_name') === 'Ana Pérez Soto');
  chk('y la sesión queda con el nombre puesto', run('currentUser.user_metadata.full_name') === 'Ana Pérez Soto');
  await run('copiarNombreAAuth()');
  chk('no lo vuelve a mandar una vez puesto', run('_updates.length') === 1);

  run(`_updates=[];currentUser={id:'u-google',user_metadata:{full_name:'Nombre De Google'}};S={userName:'Otro',userApellido:''};`);
  await run('copiarNombreAAuth()');
  chk('Google o Apple: no pisa el nombre que ya trae', run('_updates.length') === 0);
  run(`currentUser={id:'u-name',user_metadata:{name:'Solo Name'}};`);
  await run('copiarNombreAAuth()');
  chk('tampoco si solo trae «name»', run('_updates.length') === 0);

  run(`currentUser={id:'u-sin',user_metadata:{}};S={userName:'',userApellido:''};`);
  await run('copiarNombreAAuth()');
  chk('sin nombre en el onboarding no manda nada', run('_updates.length') === 0);

  run(`currentUser={id:'u-solo',user_metadata:{}};S={userName:'Ana'};`);
  await run('copiarNombreAAuth()');
  chk('cuenta antigua sin apellido: espera, no fija solo el nombre de pila', run('_updates.length') === 0);
  run(`S.userApellido='Pérez'`);await run('copiarNombreAAuth()');
  chk('cuando agrega el apellido, sube el nombre completo', run('_updates[0].data.full_name') === 'Ana Pérez');

  run(`_updates=[];supabaseClient=cliente(true);currentUser={id:'u-error',user_metadata:{}};S={userName:'Ana',userApellido:'Pérez'};`);
  let lanzo = false; try { await run('copiarNombreAAuth()'); } catch (e) { lanzo = true; }
  chk('un error de Auth no revienta ni cambia la sesión', !lanzo && run('currentUser.user_metadata.full_name') === undefined);

  run(`supabaseClient={auth:{updateUser:async()=>{currentUser={id:'otra',user_metadata:{}};return {data:{user:{id:'u-cambio',user_metadata:{full_name:'Ana'}}},error:null};}}};currentUser={id:'u-cambio',user_metadata:{}};S={userName:'Ana',userApellido:'Pérez'};`);
  await run('copiarNombreAAuth()');
  chk('si cambió la cuenta a mitad de camino, no la reemplaza', run('currentUser.id') === 'otra');

  run(`supabaseClient={from(){return {upsert:async()=>({error:null})}}};currentUser={id:'u-viejo',user_metadata:{}};S={userName:'Ana',userApellido:'Pérez'};`);
  let lanzo2 = false; try { await run('copiarNombreAAuth()'); } catch (e) { lanzo2 = true; }
  chk('un cliente sin auth (tests viejos) no revienta', !lanzo2);

  chk('syncProfile la llama (onboarding y ajustes)', /async function syncProfile\(\)\{[^}]*copiarNombreAAuth\(\)/.test(fuente));
  chk('y también al entrar, para cuentas antiguas', /function tareasConEstadoAlEntrar\(\)\{[\s\S]*?copiarNombreAAuth\(\)/.test(llamada));
  console.log('\nPASS: ' + ok + '   FAIL: ' + fail);
  process.exit(fail ? 1 : 0);
})();
