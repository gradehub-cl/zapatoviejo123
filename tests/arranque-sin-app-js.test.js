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

  console.log('\n=== Antes del aviso, se reintenta una vez ===');
  // errores_app, 2026-10-26: 13 "app.js no cargó" de 11 cuentas en una semana,
  // casi todas una sola vez, y entraron bien al día siguiente. Una descarga
  // cortada: se pide de nuevo y, si llega, se recarga la página.
  const ESCENARIO_SRC=src;
  async function escenario({marca=null,respuesta='ok',conAppJs=false}={}){
    const pantallas={};
    ['auth','home','stats','agenda','ramo','onboard','reset','app-error'].forEach(id=>{
      pantallas['screen-'+id]={style:{},classList:classList(id==='auth'?['active']:[]),textContent:''};});
    ['bottom-nav','app-error-title','app-error-desc','carga-inicial-detalle'].forEach(id=>{pantallas[id]={style:{},classList:classList(),textContent:''};});
    const guardado=new Map(marca?[['gradehub_reintento_app_js',marca]]:[]);
    const r={pedidos:[],recargas:0,filas:[],guardado,pantallas};
    const c={
      window:{addEventListener(){}},
      document:{getElementById:id=>pantallas[id]||null,addEventListener(){},createElement:()=>stub,documentElement:stub,body:stub,querySelectorAll:()=>[],
        querySelector:sel=>sel==='script[src*="app.js?v="]'?{src:'https://gradehub.cl/app.js?v=abc1234'}
          :sel==='script[src*="app-session.js?v="]'?{src:'https://gradehub.cl/app-session.js?v=abc1234'}:null},
      sessionStorage:{getItem:k=>guardado.has(k)?guardado.get(k):null,setItem:(k,v)=>guardado.set(k,String(v)),removeItem:k=>guardado.delete(k)},
      fetch:async(url,op)=>{r.pedidos.push({url,cache:op&&op.cache});
        if(respuesta==='red')throw new TypeError('Load failed');
        return {ok:respuesta==='ok',text:async()=>'// app.js'};},
      AbortController,localStorage:{getItem(){return null;},setItem(){},removeItem(){}},navigator:{},
      location:{origin:'',pathname:'/',search:'',hash:'',reload(){r.recargas++;}},history:{replaceState(){}},
      setTimeout,clearTimeout,console:{...console,error(){}},
    };
    vm.createContext(c);vm.runInContext(ESCENARIO_SRC,c);
    if(conAppJs)vm.runInContext('function track(){};afterLogin=async()=>{};',c);
    c.__insertar=(t,f)=>r.filas.push({t,f});
    vm.runInContext(`supabaseClient={
      auth:{onAuthStateChange(){},getSession:async()=>({data:{session:{user:{id:'usuario-prueba',email:'persona@example.com'}}}})},
      from:tabla=>({insert:fila=>{__insertar(tabla,fila);return Promise.resolve({error:null});}})
    };`,c);
    await vm.runInContext('boot()',c);
    r.aviso=pantallas['screen-app-error'].classList.contains('active');
    return r;
  }
  const primera=await escenario();
  chk('la primera falla vuelve a pedir el mismo app.js, sin caché',primera.pedidos.length===1&&primera.pedidos[0].url==='https://gradehub.cl/app.js?v=abc1234'&&primera.pedidos[0].cache==='reload');
  chk('si llega, recarga en vez de mostrar el aviso',primera.recargas===1&&!primera.aviso);
  chk('y no registra un error que la persona no vio',!primera.filas.length);
  chk('deja anotado que ya reintentó esta versión',primera.guardado.get('gradehub_reintento_app_js')==='abc1234');
  const segunda=await escenario({marca:'abc1234'});
  chk('si después de recargar vuelve a fallar, no recarga de nuevo',segunda.recargas===0&&segunda.pedidos.length===0);
  chk('muestra el aviso y guarda "app.js no cargó"',segunda.aviso&&segunda.filas.length===1&&/app\.js no cargó/.test(segunda.filas[0].f.mensaje));
  const otraVersion=await escenario({marca:'0000000'});
  chk('una marca de otra versión no impide reintentar',otraVersion.recargas===1);
  const sinRed=await escenario({respuesta:'red'});
  chk('sin red: aviso de siempre, sin recargar',sinRed.recargas===0&&sinRed.aviso&&sinRed.filas.length===1);
  const malo=await escenario({respuesta:'error'});
  chk('con una respuesta de error: aviso de siempre, sin recargar',malo.recargas===0&&malo.aviso&&!malo.guardado.size);

  console.log('\n=== La carga que sigue al reintento ===');
  const despues=await escenario({marca:'abc1234',conAppJs:true});
  chk('abre la app sin aviso',!despues.aviso&&despues.recargas===0);
  chk('anota que el reintento funcionó',despues.filas.length===1&&despues.filas[0].f.donde==='arranque:reintento'&&/cargó al reintentar/.test(despues.filas[0].f.mensaje));
  chk('y libera la pestaña para un próximo corte',!despues.guardado.size);
  const normal=await escenario({conAppJs:true});
  chk('una carga normal no anota nada',!normal.filas.length&&!normal.pedidos.length);

  console.log(`\nPASS: ${ok}   FAIL: ${fail}`);
  process.exit(fail?1:0);
})().catch(e=>{console.error(e);process.exit(1);});
