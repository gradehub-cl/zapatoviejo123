// Si app.js no alcanza a cargar, el arranque igual tiene que mostrar el aviso
// de recargar, no dejar a la persona en el login con la sesión abierta.
//
// errores_app, 2026-10-14: "Can't find variable: track" en la pantalla auth.
// `track` vive en app.js; registrarErrorArranque la llamaba sin mirar, así que
// con app.js cortado reventaba ANTES de showAppErrorScreen, y el error de
// verdad nunca llegaba a errores_app.
const fs=require('fs'),vm=require('vm');
const raiz=__dirname+'/../';
// Sin app.js, a propósito: es lo que pasa cuando su descarga se corta.
const src=['data.js','engine.js','app-session.js'].map(f=>fs.readFileSync(raiz+f,'utf8')).join('\n');

function classList(inicial){
  const c=new Set(inicial||[]);
  return {add(...x){x.forEach(v=>c.add(v));},remove(...x){x.forEach(v=>c.delete(v));},contains(v){return c.has(v);}};
}
const ids={};
['auth','home','stats','agenda','ramo','onboard','reset','app-error'].forEach(id=>{
  ids['screen-'+id]={style:{},classList:classList(id==='auth'?['active']:[]),textContent:''};
});
['bottom-nav','app-error-title','app-error-desc'].forEach(id=>{ids[id]={style:{},classList:classList(),textContent:''};});
const stub={style:{},classList:classList(),addEventListener(){},setAttribute(){},removeAttribute(){},getAttribute(){return null;},querySelector(){return null;},querySelectorAll(){return [];}};
const ctx={
  window:{addEventListener(){}},
  document:{getElementById:id=>ids[id]||null,querySelector:()=>null,querySelectorAll:()=>[],addEventListener(){},createElement:()=>stub,documentElement:stub,body:stub},
  localStorage:{getItem(){return null;},setItem(){},removeItem(){}},navigator:{},
  location:{origin:'',pathname:'/',search:'',hash:'',reload(){}},history:{replaceState(){}},
  setTimeout,clearTimeout,console:{...console,error(){}},
};
vm.createContext(ctx);
let cargo=true;
try{vm.runInContext(src,ctx);}catch(e){cargo=false;console.log('  (no cargó app-session sin app.js: '+e.message+')');}

let ok=0,fail=0;const chk=(n,c)=>{console.log(`  ${c?'OK  ':'FAIL'} ${n}`);if(c)ok++;else fail++;};

(async()=>{
  chk('app-session.js carga aunque falte app.js (así llegó el reporte)',cargo);
  const insertados=[];
  vm.runInContext(`supabaseClient={
    auth:{onAuthStateChange(){},getSession:async()=>({data:{session:{user:{id:'usuario-prueba',email:'persona@example.com'}}}})},
    from:tabla=>({insert:fila=>{__insertar(tabla,fila);return Promise.resolve({error:null});}})
  };`,Object.assign(ctx,{__insertar:(t,f)=>insertados.push({t,f})}));
  let revento=null;
  try{await vm.runInContext('boot()',ctx);}catch(e){revento=e;}

  chk('el arranque no revienta',!revento);
  chk('no deja el login con la sesión abierta',!ids['screen-auth'].classList.contains('active'));
  chk('muestra el aviso de recargar',ids['screen-app-error'].classList.contains('active')&&/sesión sigue activa/.test(ids['app-error-desc'].textContent));
  const fila=(insertados.find(x=>x.t==='errores_app')||{}).f;
  chk('errores_app recibe la causa con nombre: app.js no cargó',!!fila&&fila.donde==='arranque:cargar_app'&&/app\.js no cargó/.test(fila.mensaje));
  chk('y no el de track',!insertados.some(x=>/track/.test(x.f.mensaje||'')));

  console.log(`\nPASS: ${ok}   FAIL: ${fail}`);
  process.exit(fail?1:0);
})().catch(e=>{console.error(e);process.exit(1);});
