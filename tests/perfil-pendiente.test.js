// El perfil (profiles) que no alcanzó a llegar al terminar el onboarding se
// reintenta en la próxima entrada. supabase-js no lanza: el fallo viene en
// `error`, y antes nadie lo miraba. Un corte de red al apretar el último botón
// dejaba profiles sin universidad ni carrera para siempre (Amigos usa
// profiles.universidad para «misma universidad»). Datos sintéticos.
const fs=require('fs'),vm=require('vm');
const raiz=__dirname+'/../';
const fuente=['data.js','engine.js','app.js','app-session.js'].map(f=>fs.readFileSync(raiz+f,'utf8')).join('\n');

let ok=0,fail=0;
const chk=(n,c)=>{if(c){ok++;console.log('  OK   '+n);}else{fail++;console.log('  FAIL '+n);}};

function el(){const n={style:{setProperty(){},removeProperty(){}},classList:{add(){},remove(){},toggle(){},contains(){return false;}},children:[],dataset:{},value:'',innerHTML:'',addEventListener(){},removeEventListener(){},appendChild(h){return h;},setAttribute(){},removeAttribute(){},getAttribute(){return null;},querySelector(){return null;},querySelectorAll(){return [];},focus(){},remove(){},closest(){return null;}};return n;}
// Un «dispositivo»: el bundle cargado de cero sobre un almacenamiento que
// sobrevive entre aperturas de la app.
function dispositivo(almacen,{storageRoto=false}={}){
  const ids={};
  const ls=storageRoto
    ?{getItem(){throw new Error('bloqueado');},setItem(){throw new Error('bloqueado');},removeItem(){throw new Error('bloqueado');}}
    :{getItem:k=>almacen.has(k)?almacen.get(k):null,setItem:(k,v)=>almacen.set(k,String(v)),removeItem:k=>almacen.delete(k)};
  const ctx={window:{addEventListener(){},matchMedia:()=>({matches:false,addEventListener(){},addListener(){}})},
    document:{getElementById:id=>ids[id]||(ids[id]=el()),createElement:el,addEventListener(){},removeEventListener(){},documentElement:el(),querySelector(){return null;},querySelectorAll(){return [];},body:el(),head:{appendChild(){}},visibilityState:'visible'},
    localStorage:ls,navigator:{},location:{origin:'',pathname:'/',search:'',hash:'',reload(){}},history:{replaceState(){}},
    setTimeout,clearTimeout,console:{...console,warn(){}},getComputedStyle:()=>({getPropertyValue:()=>''}),
    requestAnimationFrame(){return 0;},cancelAnimationFrame(){},matchMedia:()=>({matches:false,addEventListener(){},addListener(){}})};
  vm.createContext(ctx);vm.runInContext(fuente,ctx);
  const run=c=>vm.runInContext(c,ctx);
  run(`var _perfiles=[],_respuesta='ok';
    var __cliente={from:t=>({upsert:async fila=>{
      if(t!=='profiles')return {error:null};
      _perfiles.push(fila);
      if(_respuesta==='lanza')throw new Error('Failed to fetch');
      return _respuesta==='error'?{data:null,error:{code:'PGRST000',message:'sin red'}}:{data:null,error:null};
    }})};
    supabaseClient=__cliente;
    aplicarConsensoAuto=async()=>0;aportarPautasAlCatalogo=async()=>0;subirNotasCurso=async()=>{};renderHome=()=>{};`);
  return {run,
    cuenta:(uid,extra='')=>run(`currentUser={id:${JSON.stringify(uid)},user_metadata:{}};
      S={...freshState(),onboardingDone:true,userName:'Ana',tenant:'uc',carrera:'ING-PC',careerSemestre:3${extra}};`)};
}
const espera=()=>new Promise(r=>setTimeout(r,0));

(async()=>{
  console.log('=== Corte de red al terminar el onboarding ===');
  const almacen=new Map();
  let a=dispositivo(almacen);a.cuenta('u-sintetico');
  a.run(`_respuesta='error'`);
  chk('syncProfile reconoce el error que supabase-js no lanza',await a.run('syncProfile()')===false);
  chk('queda la marca de perfil pendiente en una clave aparte',almacen.get('gradehub_perfil_pendiente:u-sintetico')==='1');
  chk('gradehub_v1 no se toca',!almacen.has('gradehub_v1')||!/perfil_pendiente/.test(almacen.get('gradehub_v1')));

  console.log('\n=== Vuelve a abrir la app, con red ===');
  a=dispositivo(almacen);a.cuenta('u-sintetico');
  a.run('tareasConEstadoAlEntrar()');await espera();await espera();
  chk('la entrada reintenta el perfil',a.run('_perfiles.length')===1);
  chk('con la universidad, carrera y semestre del estado',a.run('_perfiles[0].id')==='u-sintetico'&&a.run('_perfiles[0].universidad')==='uc'
    &&a.run('_perfiles[0].carrera')==='ING-PC'&&a.run('_perfiles[0].semestre')===3);
  chk('y la marca se borra al confirmarse',!almacen.has('gradehub_perfil_pendiente:u-sintetico'));

  console.log('\n=== Siguiente entrada, con el perfil ya bien ===');
  a=dispositivo(almacen);a.cuenta('u-sintetico');
  a.run('tareasConEstadoAlEntrar()');await espera();await espera();
  chk('no vuelve a mandar el perfil',a.run('_perfiles.length')===0);

  console.log('\n=== La subida lanza (fetch caído) ===');
  a=dispositivo(almacen);a.cuenta('u-lanza');a.run(`_respuesta='lanza'`);
  let lanzo=false;try{await a.run('syncProfile()');}catch(e){lanzo=true;}
  chk('no revienta hacia afuera',!lanzo);
  chk('y deja la marca',almacen.get('gradehub_perfil_pendiente:u-lanza')==='1');
  a=dispositivo(almacen);a.cuenta('u-lanza');a.run(`_respuesta='error'`);
  a.run('tareasConEstadoAlEntrar()');await espera();await espera();
  chk('si el reintento también falla, la marca sigue para la próxima',a.run('_perfiles.length')===1&&almacen.get('gradehub_perfil_pendiente:u-lanza')==='1');

  console.log('\n=== La marca es por cuenta ===');
  a=dispositivo(almacen);a.cuenta('u-otra');
  a.run('tareasConEstadoAlEntrar()');await espera();await espera();
  chk('otra cuenta en el mismo dispositivo no manda nada',a.run('_perfiles.length')===0);

  console.log('\n=== Primer envío bien ===');
  a=dispositivo(almacen);a.cuenta('u-bien');
  chk('syncProfile devuelve true',await a.run('syncProfile()')===true);
  chk('no deja marca',!almacen.has('gradehub_perfil_pendiente:u-bien'));
  a.run('_perfiles=[];tareasConEstadoAlEntrar()');await espera();await espera();
  chk('y la entrada no lo repite',a.run('_perfiles.length')===0);

  console.log('\n=== Cuenta solo profesor con una marca vieja ===');
  almacen.set('gradehub_perfil_pendiente:u-profe','1');
  a=dispositivo(almacen);a.cuenta('u-profe',`,tipoCuenta:'profesor',tenant:'fen',carrera:null`);
  a.run('tareasConEstadoAlEntrar()');await espera();await espera();
  chk('no publica universidad ni carrera de un profesor',a.run('_perfiles.length')===0);
  chk('y la marca se borra: no hay nada que publicar',!almacen.has('gradehub_perfil_pendiente:u-profe'));

  console.log('\n=== Onboarding sin terminar ===');
  almacen.set('gradehub_perfil_pendiente:u-a-medias','1');
  a=dispositivo(almacen);a.cuenta('u-a-medias',',onboardingDone:false');
  a.run('tareasConEstadoAlEntrar()');await espera();await espera();
  chk('no manda un perfil a medias',a.run('_perfiles.length')===0);

  console.log('\n=== Sin almacenamiento (modo privado) ===');
  a=dispositivo(new Map(),{storageRoto:true});a.cuenta('u-privado');a.run(`_respuesta='error'`);
  await a.run('syncProfile()');
  a.run(`_respuesta='ok';_perfiles=[];tareasConEstadoAlEntrar()`);await espera();await espera();
  chk('la marca vive en memoria y se reintenta en la misma sesión',a.run('_perfiles.length')===1);

  console.log(`\nPASS: ${ok}   FAIL: ${fail}`);
  process.exit(fail?1:0);
})().catch(e=>{console.error(e);process.exit(1);});
