// Crear cuenta con un correo que ya tiene cuenta. Con la confirmación por correo
// apagada, Supabase responde 422 «User already registered» (producción,
// 2026-11-23). Antes ese error se mostraba en rojo y la persona quedaba en
// Crear cuenta aunque su contraseña fuera la correcta. Datos sintéticos.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const sesion=fs.readFileSync(path.join(__dirname,'../app-session.js'),'utf8');
let fallos=0;
const chk=(nombre,fn)=>{try{fn();console.log('OK: '+nombre);}catch(e){fallos++;console.error('FAIL: '+nombre+' — '+e.message);}};
const YA_REGISTRADO={data:{user:null,session:null},error:{status:422,code:'user_already_exists',message:'User already registered'}};
const CREDENCIALES_MALAS={data:{user:null,session:null},error:{status:400,message:'Invalid login credentials'}};
const ENTRA={data:{user:{id:'cuenta-sintetica'},session:{access_token:'x'}},error:null};
function preparar(modo,{signUp,signIn}){
  const elementos=new Map(),almacen=new Map(),claves=[];
  const el=id=>{
    if(!elementos.has(id))elementos.set(id,{value:'',disabled:false,textContent:'',placeholder:'',style:{},classList:{add(){},remove(){},toggle(){}},setAttribute(){},removeAttribute(){},focus(){}});
    return elementos.get(id);
  };
  el('auth-user').value='cuenta-sintetica@ejemplo.invalid';
  el('auth-btn').textContent=modo==='signup'?'Crear cuenta':'Iniciar sesión';
  let entradas=0,registros=0;
  const auth={
    signUp:async()=>signUp(),
    signInWithPassword:async({password})=>{claves.push(password);return signIn(password);}
  };
  const ctx={window:{supabase:{createClient:()=>({auth,from:()=>({upsert:async()=>({error:null})})})}},
    document:{getElementById:el,querySelector:()=>null,querySelectorAll:()=>[],addEventListener(){}},
    localStorage:{getItem:k=>almacen.get(k)||null,setItem:(k,v)=>almacen.set(k,v),removeItem:k=>almacen.delete(k)},
    location:{},console,setTimeout(){},clearTimeout(){},showToast(){},getComputedStyle:()=>({}),
    entrar:()=>entradas++,registrar:()=>registros++};
  vm.createContext(ctx);vm.runInContext(sesion,ctx);
  vm.runInContext(`authMode='${modo}';afterLogin=async()=>entrar();afterSignup=async()=>registrar();`,ctx);
  return {el,run:s=>vm.runInContext(s,ctx),entradas:()=>entradas,registros:()=>registros,claves};
}
(async()=>{
  // 1. Correo existente + contraseña correcta: entra.
  let h=preparar('signup',{signUp:()=>YA_REGISTRADO,signIn:()=>ENTRA});
  for(const id of ['auth-pass','auth-pass2'])h.el(id).value='Clave1234';
  await h.run('submitAuth()');
  chk('correo existente con su contraseña: entra',()=>{assert.equal(h.entradas(),1);assert.equal(h.registros(),0);});
  chk('y no muestra error',()=>assert.notEqual(h.el('auth-error').style.display,'block'));

  // 2. Correo existente + contraseña que no calza: pasa a Iniciar sesión, aviso neutro.
  h=preparar('signup',{signUp:()=>YA_REGISTRADO,signIn:()=>CREDENCIALES_MALAS});
  for(const id of ['auth-pass','auth-pass2'])h.el(id).value='Otra12345';
  await h.run('submitAuth()');
  const msg=h.run('MSG_VERIFICA');
  chk('si no calza, no entra',()=>assert.equal(h.entradas(),0));
  chk('pasa a Iniciar sesión',()=>assert.equal(h.run('authMode'),'login'));
  chk('el botón queda como Iniciar sesión',()=>assert.equal(h.el('auth-btn').textContent,'Iniciar sesión'));
  chk('muestra el aviso neutro, no en rojo',()=>{assert.equal(h.el('auth-error').textContent,msg);assert.equal(h.el('auth-error').style.color,'var(--fg2)');});
  chk('el aviso orienta a quien creó la cuenta con Google o Apple',()=>assert.match(msg,/Google o Apple/));
  chk('conserva el correo escrito',()=>assert.equal(h.el('auth-user').value,'cuenta-sintetica@ejemplo.invalid'));

  // 3. Un registro nuevo sigue igual.
  h=preparar('signup',{signUp:()=>ENTRA,signIn:()=>CREDENCIALES_MALAS});
  for(const id of ['auth-pass','auth-pass2'])h.el(id).value='Clave1234';
  await h.run('submitAuth()');
  chk('un correo nuevo sigue creando la cuenta',()=>{assert.equal(h.registros(),1);assert.equal(h.claves.length,0);});

  // 4. Otro error del registro no se disfraza.
  h=preparar('signup',{signUp:()=>({data:null,error:{status:0,message:'Failed to fetch'}}),signIn:()=>ENTRA});
  for(const id of ['auth-pass','auth-pass2'])h.el(id).value='Clave1234';
  await h.run('submitAuth()');
  chk('un fallo de red no intenta entrar',()=>{assert.equal(h.entradas(),0);assert.equal(h.claves.length,0);assert.match(h.el('auth-error').textContent,/internet/);});

  // 5. Contraseñas largas: el campo cortaba en 60.
  const larga='Aa1'+'x'.repeat(62);
  h=preparar('login',{signUp:()=>ENTRA,signIn:c=>c.length===60?ENTRA:CREDENCIALES_MALAS});
  h.el('auth-pass').value=larga;
  await h.run('submitAuth()');
  chk('una contraseña de 65 guardada como sus primeros 60 todavía entra',()=>{assert.equal(h.entradas(),1);assert.deepEqual(h.claves.map(c=>c.length),[65,60]);});
  h=preparar('login',{signUp:()=>ENTRA,signIn:()=>CREDENCIALES_MALAS});
  h.el('auth-pass').value='Corta1234';
  await h.run('submitAuth()');
  chk('una contraseña corta incorrecta se intenta una sola vez',()=>{assert.equal(h.entradas(),0);assert.equal(h.claves.length,1);});

  if(fallos)process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1;});
