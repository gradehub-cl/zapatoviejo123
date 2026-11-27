// Una lectura válida sin fila NO prueba que la persona no tenga datos. Si la
// caché pertenece a la misma cuenta, es la única copia conocida y el login no
// puede reemplazarla por un estado vacío.
const fs=require('fs'),vm=require('vm');
const raiz=__dirname+'/../';
const sesion=fs.readFileSync(process.env.GRADEHUB_SESSION||raiz+'app-session.js','utf8');
const inicio=sesion.indexOf('async function afterLogin');
const fin=sesion.indexOf('async function syncProfile',inicio);
if(inicio<0||fin<0)throw new Error('No se encontró el bloque de sincronización');

function estadoConNota(nombre='Cálculo I'){
  return {ramos:[{id:'r1',nombre,categorias:[{id:'c1',nombre:'Interrogación',peso:100,notas:[{id:'n1',nombre:'I1',valor:5.8,peso:1}]}]}],
    userName:'Estudiante',careerSemestre:1,carrera:'ING-PC',tenant:'uc',onboardingDone:true,historial:[],sortMode:'manual'};
}
// Cuenta nueva que cerró la app a mitad del onboarding: alcanzó a elegir
// universidad, pero aún no tiene ramos ni historial (ni, por lo tanto, notas).
function onboardingAMedias(extra={}){
  return {ramos:[],userName:'Estudiante',careerSemestre:1,carrera:'ING-PC',tenant:'uc',onboardingDone:false,historial:[],sortMode:'manual',...extra};
}
function arnes({owner='usuario-a',insertError=null,estado=estadoConNota}={}){
  const guardado=new Map([['gradehub_v1',JSON.stringify(estado())],['gradehub_cache_owner',owner]]);
  const avisos=[],subidas=[];let setOwner=0,entro='';
  const ctx={
    STORAGE_KEY:'gradehub_v1',CACHE_OWNER_KEY:'gradehub_cache_owner',
    currentUser:{id:'usuario-a'},S:estado(),
    freshState:()=>({ramos:[],userName:'',careerSemestre:1,carrera:null,tenant:'fen',onboardingDone:false,historial:[],sortMode:'manual'}),
    normalize:x=>x,
    localStorage:{getItem:k=>guardado.get(k)||null,setItem:(k,v)=>guardado.set(k,v),removeItem:k=>guardado.delete(k)},
    getCacheOwner:()=>guardado.get('gradehub_cache_owner')||null,
    setCacheOwner:uid=>{setOwner++;guardado.set('gradehub_cache_owner',uid);},
    restaurarCacheApartada:()=>false,
    supabaseClient:{auth:{getSession:async()=>({data:{session:{user:{id:'usuario-a'}}},error:null})},from:()=>({
      select:()=>({eq:()=>({maybeSingle:async()=>({data:null,error:null})})}),
      insert:async fila=>{subidas.push(fila);return {data:null,error:insertError};}
    })},
    track(){},showToast:(mensaje,error)=>avisos.push({mensaje,error}),
    enterApp:()=>{entro='app';},enterOnboarding:()=>{entro='onboarding';},
    aplicarConsensoAuto:async()=>0,renderHome(){},setTimeout,clearTimeout,console,
  };
  vm.createContext(ctx);vm.runInContext(sesion.slice(inicio,fin),ctx);
  return {ctx,guardado,avisos,subidas,setOwner:()=>setOwner,entro:()=>entro};
}

let ok=0,fail=0;
function chk(nombre,cond){if(cond){ok++;console.log('  OK   '+nombre);}else{fail++;console.log('  FAIL '+nombre);}}
const tieneNota=s=>s&&s.ramos&&s.ramos[0]&&s.ramos[0].categorias[0].notas[0].valor===5.8;

(async()=>{
  console.log('=== Nube sin fila + caché de la misma cuenta ===');
  let kit=arnes();
  await kit.ctx.afterLogin();
  chk('la nota sigue en memoria después del login',tieneNota(kit.ctx.S));
  chk('la nota sigue en gradehub_v1',tieneNota(JSON.parse(kit.guardado.get('gradehub_v1'))));
  chk('la copia local se intenta respaldar en la nube',kit.subidas.length===1&&tieneNota(kit.subidas[0].data));
  chk('entra a la app y no devuelve al onboarding',kit.entro()==='app');

  console.log('\n=== El insert devuelve error sin lanzar ===');
  kit=arnes({insertError:{code:'42501',message:'new row violates row-level security policy'}});
  await kit.ctx.afterLogin();
  chk('el error de Supabase no borra la nota en memoria',tieneNota(kit.ctx.S));
  chk('ni sobrescribe la copia local',tieneNota(JSON.parse(kit.guardado.get('gradehub_v1'))));
  chk('la app reconoce que el respaldo falló',kit.avisos.some(x=>x.error&&/siguen en este dispositivo/i.test(x.mensaje)));
  chk('un insert rechazado no se marca como caché alineada',kit.setOwner()===0);

  console.log('\n=== Vuelve a mitad del onboarding, sin datos (cuenta nueva) ===');
  kit=arnes({estado:onboardingAMedias});
  await kit.ctx.afterLogin();
  chk('no sube un estado vacío a la nube',kit.subidas.length===0);
  chk('no avisa que recuperó una copia',!kit.avisos.some(x=>/Recuperamos tu copia/i.test(x.mensaje)));
  chk('no avisa en rojo que sus notas siguen en el dispositivo',!kit.avisos.some(x=>x.error||/siguen en este dispositivo/i.test(x.mensaje)));
  chk('sigue en el onboarding',kit.entro()==='onboarding');
  chk('conserva lo que alcanzó a elegir',JSON.parse(kit.guardado.get('gradehub_v1')).tenant==='uc'&&kit.ctx.S.tenant==='uc');

  console.log('\n=== Lo mismo, con la subida fallando ===');
  kit=arnes({estado:onboardingAMedias,insertError:{code:'08006',message:'sin red'}});
  await kit.ctx.afterLogin();
  chk('ni intenta subir ni muestra el aviso rojo',kit.subidas.length===0&&kit.avisos.length===0);

  console.log('\n=== Onboarding sin terminar, pero con un ramo local ===');
  kit=arnes({estado:()=>({...estadoConNota(),onboardingDone:false})});
  await kit.ctx.afterLogin();
  chk('con datos reales se respalda como antes',kit.subidas.length===1&&tieneNota(kit.subidas[0].data));
  chk('y avisa que la recuperó',kit.avisos.some(x=>/Recuperamos tu copia/i.test(x.mensaje)));

  console.log('\n=== Onboarding sin terminar, solo con historial ===');
  kit=arnes({estado:()=>onboardingAMedias({historial:[{nombre:'Álgebra',nota:5.5,semestre:'2026-1'}]})});
  await kit.ctx.afterLogin();
  chk('el historial cuenta como dato y se respalda',kit.subidas.length===1&&kit.subidas[0].data.historial.length===1);

  console.log('\n=== Caché de otra cuenta ===');
  kit=arnes({owner:'usuario-b'});
  await kit.ctx.afterLogin();
  chk('los datos de otra persona no se muestran',kit.ctx.S.ramos.length===0);
  chk('la caché ajena se reemplaza por un estado vacío',JSON.parse(kit.guardado.get('gradehub_v1')).ramos.length===0);

  console.log(`\nPASS: ${ok}   FAIL: ${fail}`);
  process.exit(fail?1:0);
})().catch(e=>{console.error(e);process.exit(1);});
