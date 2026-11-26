// Entrar sin red con una cuenta cuya copia no está en este dispositivo
// (2026-11-26). Si la lectura de la nube fallaba al entrar y la caché no era
// de esa cuenta (dispositivo nuevo, caché de otra persona, o la vacía que deja
// el aislamiento de Apple), afterLogin() mandaba al onboarding como si la
// cuenta fuera nueva y nunca marcaba el dueño de la caché. Al reabrir con red:
//   A. cuenta existente que hizo el onboarding sin red → ramos duplicados;
//   B. cuenta existente que anotó una nota sin red → la nube la pisaba;
//   C. cuenta nueva sin fila → un estado vacío pisaba todo lo anotado.
// Ahora se detiene en «Sin conexión» con «Reintentar» y no crea un estado
// local que después choque con la nube. Datos sintéticos; cada dispositivo
// carga la app completa con su propio localStorage y comparte una nube falsa.
const fs=require('fs'),vm=require('vm'),path=require('path');
const raiz=path.join(__dirname,'..');
const fuente=['data.js','engine.js','app.js','app-session.js'].map(f=>fs.readFileSync(path.join(raiz,f),'utf8')).join('\n');

let ok=0,fail=0;
const chk=(n,c)=>{if(c){ok++;console.log('  OK   '+n);}else{fail++;console.log('  FAIL '+n);}};

// ── La nube (la misma de sync-sin-perdidas.test.js) ──────────────────────────
function crearNube(){
  const filas=new Map();                      // user_id → data
  // `sesion:false` es el cliente sin sesión: supabase-js manda la llave pública,
  // RLS esconde la fila y nada se puede escribir, pero la lectura no da error.
  const nube={filas,red:true,escrituras:0,sesion:true,ultimo:null};
  const sinRed=()=>{if(!nube.red)throw new TypeError('Failed to fetch');};
  const leerRev=d=>d&&d._rev!=null?String(d._rev):null;
  const cualquiera=()=>new Proxy(function(){},{
    get:(t,k)=>k==='then'?(r=>r({data:null,error:null})):cualquiera(),
    apply:()=>cualquiera(),
  });
  nube.cliente={
    rpc:async()=>({data:null,error:null}),
    auth:{signOut:async()=>{},getSession:async()=>({data:{session:nube.sesion?{user:{id:nube.ultimo}}:null},error:null})},
    from(tabla){
      if(tabla!=='user_ramos')return cualquiera();
      return {
        select:cols=>({eq:(_c,uid)=>({maybeSingle:async()=>{sinRed();nube.lecturas=(nube.lecturas||0)+1;nube.ultimo=uid;
          if(!nube.sesion||!filas.has(uid))return {data:null,error:null};
          // `rev:data->>_rev` (revisarNubeALaVista) trae solo la versión, como texto.
          if(/_rev/.test(cols||''))return {data:{rev:leerRev(filas.get(uid))},error:null};
          return {data:{data:JSON.parse(JSON.stringify(filas.get(uid)))},error:null};}})}),
        upsert:async fila=>{sinRed();nube.escrituras++;filas.set(fila.user_id,JSON.parse(JSON.stringify(fila.data)));return {error:null};},
        insert:async fila=>{sinRed();if(!nube.sesion)return {error:{code:'42501'}};if(filas.has(fila.user_id))return {error:{code:"23505"}};nube.escrituras++;filas.set(fila.user_id,JSON.parse(JSON.stringify(fila.data)));return {error:null};},
        update(valores){
          const filtros=[];
          const q={
            eq(col,val){filtros.push([col,'eq',val]);return q;},
            is(col,val){filtros.push([col,'is',val]);return q;},
            async select(){sinRed();
              const uid=(filtros.find(f=>f[0]==='user_id')||[])[2];
              const actual=filas.get(uid);
              const calza=nube.sesion&&actual!==undefined&&filtros.every(([col,op,val])=>{
                if(col==='user_id')return true;
                const rev=leerRev(actual);
                return op==='is'?rev===null:rev===val;
              });
              if(!calza)return {data:[],error:null};
              nube.escrituras++;filas.set(uid,JSON.parse(JSON.stringify(valores.data)));
              return {data:[{user_id:uid}],error:null};
            },
          };
          return q;
        },
      };
    },
  };
  return nube;
}

// ── Un dispositivo ───────────────────────────────────────────────────────────
function el(){let html='';const n={style:{setProperty(){},removeProperty(){}},classList:{add(){},remove(){},toggle(){},contains(){return false;}},children:[],dataset:{},value:'',textContent:'',
  addEventListener(){},removeEventListener(){},appendChild(h){return h;},setAttribute(){},removeAttribute(){},getAttribute(){return null;},querySelector(){return el();},querySelectorAll(){return [];},focus(){},remove(){},closest(){return null;},src:''};
  Object.defineProperty(n,'innerHTML',{get(){return html;},set(v){html=String(v);}});return n;}
function dispositivo(nube,almacen=new Map()){
  const ids={},oyentes={},boton=el();
  const ctx={
    window:{addEventListener(t,f){(oyentes[t]=oyentes[t]||[]).push(f);},matchMedia:()=>({matches:false,addEventListener(){},addListener(){}})},
    document:{getElementById:id=>ids[id]||(ids[id]=el()),createElement:el,addEventListener(){},removeEventListener(){},documentElement:el(),
      querySelector:s=>s==='#screen-app-error .btn-primary'?boton:null,querySelectorAll(){return [];},body:el(),head:{appendChild(){}},visibilityState:'visible'},
    localStorage:{getItem:k=>almacen.has(k)?almacen.get(k):null,setItem:(k,v)=>almacen.set(k,String(v)),removeItem:k=>almacen.delete(k)},
    navigator:{},location:{origin:'',pathname:'/',hash:'',reload(){}},history:{replaceState(){}},
    setTimeout,clearTimeout,console:{...console,warn(){},error(){}},getComputedStyle:()=>({getPropertyValue:()=>''}),
    __nube:nube.cliente,__avisos:[],__pantalla:[],
  };
  vm.createContext(ctx);vm.runInContext(fuente,ctx);
  const run=c=>vm.runInContext(c,ctx);
  run(`showToast=(m)=>__avisos.push(m);enterApp=()=>__pantalla.push('app');enterOnboarding=()=>__pantalla.push('onboarding');
    const _errorReal=showAppErrorScreen;showAppErrorScreen=f=>{__pantalla.push('error:'+f);_errorReal(f);};
    renderHome=()=>{};aplicarConsensoAuto=async()=>0;aportarPautasAlCatalogo=async()=>0;`);
  return {run,almacen,ids,boton,avisos:ctx.__avisos,pantalla:ctx.__pantalla,disparar:t=>(oyentes[t]||[]).forEach(f=>f()),
    entrar:async uid=>{run(`supabaseClient=__nube;currentUser={id:${JSON.stringify(uid)}};`);await run('afterLogin()');}};
}
const estado=(nombre='Micro',userName='Estudiante')=>({onboardingDone:true,tenant:'fen',userName,careerSemestre:1,historial:[],sortMode:'manual',
  ramos:[{id:'r1',nombre,color:'#2563eb',categorias:[{id:'c1',nombre:'Solemne 1',peso:50,notas:[]},{id:'c2',nombre:'Solemne 2',peso:50,notas:[]}],gates:[]}]});
const conNota=(s,valor,id='n1')=>{s.ramos[0].categorias[0].notas.push({id,nombre:'N',valor,peso:1});return s;};
const onboarding=`S.userName='Estudiante';S.tenant='fen';S.careerSemestre=1;
  S.ramos.push({id:'nuevo1',nombre:'Micro',color:'#000',categorias:[{id:'k1',nombre:'Solemne 1',peso:50,notas:[]},{id:'k2',nombre:'Solemne 2',peso:50,notas:[]}],gates:[]});
  S.onboardingDone=true;save();clearTimeout(_syncTimer);_syncTimer=null;`;
const esperar=ms=>new Promise(r=>setTimeout(r,ms));
const ultima=d=>d.pantalla[d.pantalla.length-1];

(async()=>{
  console.log('=== A. Cuenta existente, dispositivo nuevo, sin red al entrar ===');
  {
    const nube=crearNube();
    nube.filas.set('u1',{...conNota(estado(),6.5),_rev:4});
    const d=dispositivo(nube);nube.red=false;await d.entrar('u1');
    chk('se detiene en «Sin conexión», no en el onboarding',ultima(d)==='error:leer_nube'&&!d.pantalla.includes('onboarding'));
    chk('el botón dice «Reintentar»',d.boton.textContent==='Reintentar');
    chk('el título dice «Sin conexión»',d.ids['app-error-title'].textContent==='Sin conexión');
    chk('no hay ramos en memoria',d.run('S.ramos.length')===0&&d.run('S.onboardingDone')===false);
    chk('la caché no se marca como de esta cuenta',!d.almacen.has('gradehub_cache_owner'));
    const antes=nube.escrituras;nube.red=true;d.disparar('online');await esperar(30);
    chk('al volver la red no sube un estado vacío',nube.escrituras===antes);
    const r=dispositivo(nube,d.almacen);await r.entrar('u1');await esperar(30);
    chk('al reintentar con red entra a la app',ultima(r)==='app');
    chk('con la nota de la nube',JSON.stringify(r.run('S.ramos.map(x=>x.categorias.map(c=>c.notas.map(n=>n.valor)))'))==='[[[6.5],[]]]');
    chk('sin ramos duplicados, ni en el dispositivo ni en la nube',r.run('S.ramos.length')===1&&nube.filas.get('u1').ramos.length===1);
    chk('y ahora la caché sí es de esta cuenta',r.almacen.get('gradehub_cache_owner')==='u1');
  }

  console.log('\n=== B. Cuenta existente con la caché de otra persona, sin red ===');
  {
    const nube=crearNube();
    nube.filas.set('u1',{...estado(),_rev:2});
    const ajena=JSON.stringify(conNota(estado('Ramo de B','Persona B'),4.4));
    const almacen=new Map([['gradehub_v1',ajena],['gradehub_cache_owner','u2']]);
    const d=dispositivo(nube,almacen);nube.red=false;await d.entrar('u1');
    chk('se detiene en «Sin conexión»',ultima(d)==='error:leer_nube');
    chk('no muestra los datos de la otra persona',d.run('S.userName')!=='Persona B'&&d.run('S.ramos.length')===0);
    chk('ni los borra del disco mientras no hay red',almacen.get('gradehub_v1')===ajena&&almacen.get('gradehub_cache_owner')==='u2');
    nube.red=true;
    const r=dispositivo(nube,almacen);await r.entrar('u1');await esperar(30);
    chk('con red entra con lo suyo',ultima(r)==='app'&&r.run('S.ramos.map(x=>x.nombre).join()')==='Micro');
    chk('y nada de la otra persona llega a su nube',!JSON.stringify(nube.filas.get('u1')).includes('Persona B'));
  }

  console.log('\n=== C. Cuenta nueva (sin fila), primer ingreso sin red ===');
  {
    const nube=crearNube();
    const d=dispositivo(nube);nube.red=false;await d.entrar('u1');
    chk('se detiene en «Sin conexión», no en el onboarding',ultima(d)==='error:leer_nube');
    nube.red=true;
    const r=dispositivo(nube,d.almacen);await r.entrar('u1');
    chk('con red pasa al onboarding',ultima(r)==='onboarding');
    chk('con la caché ya marcada como suya',r.almacen.get('gradehub_cache_owner')==='u1');
    r.run(onboarding);
    r.run(`S.ramos[0].categorias[0].notas.push({id:'n59',nombre:'N',valor:5.9,peso:1});save();clearTimeout(_syncTimer);_syncTimer=null;`);
    nube.red=false;await r.run('syncNow()');
    // Se cierra la app sin red; al reabrir con red la nota sigue y sube.
    nube.red=true;
    const r2=dispositivo(nube,r.almacen);await r2.entrar('u1');await esperar(50);
    chk('lo anotado sin red después del onboarding sobrevive al reabrir',JSON.stringify(r2.run('S.ramos'))?.includes('5.9'));
    chk('y llega a la nube',JSON.stringify(nube.filas.get('u1')||{}).includes('5.9'));
  }

  console.log('\n=== D. Apple: la caché aislada (vacía) tampoco sirve sin red ===');
  {
    const nube=crearNube();
    nube.filas.set('u1',{...conNota(estado(),6.1),_rev:3});
    const ajena=JSON.stringify(conNota(estado('Ramo de B','Persona B'),4.4));
    const almacen=new Map([['gradehub_v1',ajena],['gradehub_cache_owner','u2']]);
    const d=dispositivo(nube,almacen);
    d.run(`S=normalize(JSON.parse(localStorage.getItem(STORAGE_KEY)));prepararCacheApple({id:'u1'});`);
    chk('el aislamiento aparta la caché de la otra cuenta',almacen.has('gradehub_v1_respaldo_u2'));
    nube.red=false;await d.entrar('u1');
    chk('sin red se detiene en «Sin conexión», no en el onboarding',ultima(d)==='error:leer_nube');
    nube.red=true;
    const r=dispositivo(nube,almacen);await r.entrar('u1');await esperar(30);
    chk('con red entra con su nota de la nube',ultima(r)==='app'&&JSON.stringify(r.run('S.ramos')).includes('6.1')&&r.run('S.ramos.length')===1);
    chk('la copia apartada de la otra cuenta sigue guardada',almacen.has('gradehub_v1_respaldo_u2'));
  }

  console.log('\n=== Lo que no debe cambiar ===');
  {
    // Copia propia armada: sin red se entra con ella, como siempre.
    const nube=crearNube();
    nube.filas.set('u1',{...estado(),_rev:1});
    const almacen=new Map([['gradehub_v1',JSON.stringify(conNota(estado(),5.5))],['gradehub_cache_owner','u1']]);
    const d=dispositivo(nube,almacen);nube.red=false;await d.entrar('u1');
    chk('con su propia copia entra a la app sin red',ultima(d)==='app');
    chk('con el aviso de siempre',d.avisos.includes('Sin conexión · usando tu copia local'));
    chk('y su nota a la vista',JSON.stringify(d.run('S.ramos')).includes('5.5'));
  }
  {
    // Cuenta nueva con red: onboarding y caché marcada.
    const nube=crearNube();
    const d=dispositivo(nube);await d.entrar('u1');
    chk('cuenta nueva con red pasa al onboarding',ultima(d)==='onboarding'&&d.almacen.get('gradehub_cache_owner')==='u1');
  }
  {
    // Otros errores de arranque mantienen su texto y su botón.
    const d=dispositivo(crearNube());
    d.run(`showAppErrorScreen('abrir_app')`);
    chk('«No pudimos abrir GradeHub» sigue con «Recargar»',d.ids['app-error-title'].textContent==='No pudimos abrir GradeHub'&&d.boton.textContent==='Recargar');
  }

  console.log('\n=== Sesión caída con la app abierta: «sin fila» no es verdad ===');
  // Visto en los registros de Supabase el 2026-11-26: con el token vencido y
  // sin renovar, la app leía y escribía user_ramos con la llave pública. La
  // lectura volvía vacía, subirConVersion borraba la base de sincronización y
  // la subida siguiente fusionaba sin base, donde manda la nube.
  {
    const nube=crearNube();
    nube.filas.set('u1',{...conNota(estado(),6.5),_rev:4});
    const d=dispositivo(nube);await d.entrar('u1');await esperar(30);
    chk('entra y deja su base de sincronización',d.run("revSync(leerBaseSync('u1'))")===4);
    nube.sesion=false;
    d.run("S.ramos[0].categorias[0].notas[0].valor=5.9;save();clearTimeout(_syncTimer);_syncTimer=null;");
    const subio=await d.run('syncNow()');
    chk('sin sesión la subida falla',subio===false);
    chk('y no borra la base de sincronización',d.run("revSync(leerBaseSync('u1'))")===4);
    chk('la nube queda como estaba',nube.filas.get('u1')._rev===4&&nube.filas.get('u1').ramos[0].categorias[0].notas[0].valor===6.5);
    chk('la nota corregida sigue en el dispositivo',d.run('S.ramos[0].categorias[0].notas[0].valor')===5.9);
    nube.sesion=true;d.avisos.length=0;
    const despues=await d.run('syncNow()');
    chk('al volver la sesión, sube',despues===true&&nube.filas.get('u1')._rev===5);
    chk('con la nota corregida, no con la vieja de la nube',nube.filas.get('u1').ramos[0].categorias[0].notas[0].valor===5.9&&d.run('S.ramos[0].categorias[0].notas[0].valor')===5.9);
    chk('y sin fusionar a ciegas',!d.avisos.some(a=>/otro dispositivo/.test(String(a))));
  }

  console.log('\n=== Sesión caída al entrar en un dispositivo nuevo ===');
  {
    const nube=crearNube();
    nube.filas.set('u1',{...conNota(estado(),6.5),_rev:4});
    nube.sesion=false;
    const d=dispositivo(nube);await d.entrar('u1');
    chk('una cuenta con ramos no pasa al onboarding',!d.pantalla.includes('onboarding')&&ultima(d)==='error:leer_nube');
    chk('ni se marca la caché con un estado vacío',!d.almacen.has('gradehub_cache_owner'));
    chk('y no se escribe nada en la nube',nube.filas.get('u1')._rev===4);
    nube.sesion=true;
    const r=dispositivo(nube,d.almacen);await r.entrar('u1');await esperar(30);
    chk('con la sesión de vuelta entra con sus notas',ultima(r)==='app'&&r.run('S.ramos[0].categorias[0].notas[0].valor')===6.5);
  }

  console.log('\n=== Una cuenta de verdad nueva sigue entrando al onboarding ===');
  {
    const nube=crearNube();
    const d=dispositivo(nube);await d.entrar('u9');
    chk('sin fila y con sesión: onboarding',ultima(d)==='onboarding');
    chk('la fila se preguntó dos veces antes de creerlo',nube.lecturas===2);
  }

  console.log(`\nPASS: ${ok}   FAIL: ${fail}`);
  process.exit(fail?1:0);
})().catch(e=>{console.error(e);process.exit(1);});
