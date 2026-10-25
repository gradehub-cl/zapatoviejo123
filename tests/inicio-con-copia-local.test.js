// Inicio con la copia local. Con la caché de la misma cuenta y una base de
// sincronización, afterLogin() entra con lo que hay en el dispositivo y lee la
// nube después. Estos casos prueban que esa ventana no pierde nada: cuentas ya
// existentes, dos dispositivos, notas anotadas mientras la nube no responde y
// sin red. La nube falsa es la de sync-sin-perdidas.test.js, con una diferencia:
// las lecturas se pueden retener, y entregan la fila tal como estaba al pedirla
// (como una respuesta que viaja lento).
const fs=require('fs'),vm=require('vm'),path=require('path');
const raiz=path.join(__dirname,'..');
const fuente=['data.js','engine.js','app.js','app-session.js'].map(f=>fs.readFileSync(path.join(raiz,f),'utf8')).join('\n');

let ok=0,fail=0;
const chk=(n,c)=>{if(c){ok++;console.log('  OK   '+n);}else{fail++;console.log('  FAIL '+n);}};
const copia=x=>JSON.parse(JSON.stringify(x));

function crearNube(){
  const filas=new Map();
  const nube={filas,red:true,escrituras:0,retener:false,pendientes:[]};
  nube.soltar=()=>{const p=nube.pendientes;nube.pendientes=[];p.forEach(f=>f());};
  const sinRed=()=>{if(!nube.red)throw new TypeError('Failed to fetch');};
  const leerRev=d=>d&&d._rev!=null?String(d._rev):null;
  const cualquiera=()=>new Proxy(function(){},{
    get:(t,k)=>k==='then'?(r=>r({data:null,error:null})):cualquiera(),
    apply:()=>cualquiera(),
  });
  nube.cliente={
    rpc:async()=>({data:null,error:null}),
    auth:{signOut:async()=>{}},
    from(tabla){
      if(tabla!=='user_ramos')return cualquiera();
      return {
        select:()=>({eq:(_c,uid)=>({maybeSingle:async()=>{sinRed();
          const r={data:filas.has(uid)?{data:copia(filas.get(uid))}:null,error:null};
          if(nube.retener)await new Promise(f=>nube.pendientes.push(f));
          return r;}})}),
        upsert:async fila=>{sinRed();nube.escrituras++;filas.set(fila.user_id,copia(fila.data));return {error:null};},
        update(valores){
          const filtros=[];
          const q={
            eq(col,val){filtros.push([col,'eq',val]);return q;},
            is(col,val){filtros.push([col,'is',val]);return q;},
            async select(){sinRed();
              const uid=(filtros.find(f=>f[0]==='user_id')||[])[2];
              const actual=filas.get(uid);
              const calza=actual!==undefined&&filtros.every(([col,op,val])=>{
                if(col==='user_id')return true;
                const rev=leerRev(actual);
                return op==='is'?rev===null:rev===val;
              });
              if(!calza)return {data:[],error:null};
              nube.escrituras++;filas.set(uid,copia(valores.data));
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

function el(){let html='';const n={style:{setProperty(){},removeProperty(){}},classList:{add(){},remove(){},toggle(){},contains(){return false;}},children:[],dataset:{},value:'',
  addEventListener(){},removeEventListener(){},appendChild(h){return h;},setAttribute(){},removeAttribute(){},getAttribute(){return null;},querySelector(){return el();},querySelectorAll(){return [];},focus(){},remove(){},closest(){return null;},src:''};
  Object.defineProperty(n,'innerHTML',{get(){return html;},set(v){html=String(v);}});return n;}
function dispositivo(nube,almacen=new Map()){
  const ids={},oyentes={};let modalAbierto=false;
  const modal=el();modal.classList.contains=c=>c==='open'&&modalAbierto;ids.modal=modal;
  const ctx={
    window:{addEventListener(t,f){(oyentes[t]=oyentes[t]||[]).push(f);},matchMedia:()=>({matches:false,addEventListener(){},addListener(){}})},
    document:{getElementById:id=>ids[id]||(ids[id]=el()),createElement:el,addEventListener(){},removeEventListener(){},documentElement:el(),querySelector(){return null;},querySelectorAll(){return [];},body:el(),head:{appendChild(){}},visibilityState:'visible'},
    localStorage:{getItem:k=>almacen.has(k)?almacen.get(k):null,setItem:(k,v)=>almacen.set(k,String(v)),removeItem:k=>almacen.delete(k)},
    navigator:{},location:{origin:'',pathname:'/',hash:'',reload(){}},history:{replaceState(){}},
    setTimeout,clearTimeout,console:{...console,warn(){}},getComputedStyle:()=>({getPropertyValue:()=>''}),
    __nube:nube.cliente,__avisos:[],__entradas:0,__pintadas:0,
  };
  vm.createContext(ctx);vm.runInContext(fuente,ctx);
  const run=c=>vm.runInContext(c,ctx);
  run(`showToast=(m)=>__avisos.push(m);enterApp=()=>{__entradas++;};enterOnboarding=()=>{};renderHome=()=>{__pintadas++;};recalcularNavTabs=()=>{};aplicarConsensoAuto=async()=>0;aportarPautasAlCatalogo=async()=>0;`);
  return {run,almacen,setModal:v=>{modalAbierto=v;},disparar:t=>(oyentes[t]||[]).forEach(f=>f()),
    avisos:()=>ctx.__avisos,entradas:()=>ctx.__entradas,pintadas:()=>ctx.__pintadas,
    entrar:uid=>{run(`supabaseClient=__nube;currentUser={id:${JSON.stringify(uid)}};`);return run('afterLogin()');},
    // Como la app: se modifica S y se guarda. save() programa una subida a los
    // 800 ms; se cancela para que el test decida cuándo se pide subir.
    anotar:(catIdx,valor,idNota)=>run(`S.ramos[0].categorias[${catIdx}].notas.push({id:${JSON.stringify(idNota)},nombre:'N',valor:${valor},peso:1});save();clearTimeout(_syncTimer);_syncTimer=null;`),
    notas:()=>run(`S.ramos.map(r=>r.categorias.map(c=>c.notas.map(n=>n.valor)))`),
    subir:()=>run('syncNow()'),
  };
}
const estadoInicial=()=>({onboardingDone:true,tenant:'fen',userName:'Estudiante',careerSemestre:1,historial:[],sortMode:'manual',
  ramos:[{id:'r1',nombre:'Micro',color:'#2563eb',categorias:[{id:'c1',nombre:'Solemne 1',peso:50,notas:[]},{id:'c2',nombre:'Solemne 2',peso:50,notas:[]}],gates:[]}]});
const notasEnNube=(nube,uid='u1')=>{const d=nube.filas.get(uid);return d?d.ramos.map(r=>r.categorias.map(c=>c.notas.map(n=>n.valor))):null;};
const igual=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const esperar=ms=>new Promise(r=>setTimeout(r,ms));
// Una cuenta existente que ya usó este dispositivo con red: caché, dueño, base
// y la nube con versión, como la deja una subida de la app.
async function preparar(nube,uid='u1'){
  nube.filas.set(uid,estadoInicial());
  const d=dispositivo(nube);await d.entrar(uid);await esperar(20);await d.subir();return d;
}
// Otro dispositivo de la misma cuenta anota una nota y la sube.
async function otroDispositivoAnota(nube,catIdx,valor,id){
  const cel=dispositivo(nube);await cel.entrar('u1');await esperar(20);
  cel.anotar(catIdx,valor,id);await cel.subir();
}

(async()=>{
  console.log('=== 1. Inicio se pinta antes de que vuelva la nube ===');
  {
    const nube=crearNube();
    const pc=await preparar(nube);
    nube.retener=true;
    const reabierto=dispositivo(nube,pc.almacen);await reabierto.entrar('u1');
    chk('entra a la app con la lectura todavía en camino',reabierto.entradas()===1&&nube.pendientes.length===1);
    chk('sin aviso de "sin conexión"',!reabierto.avisos().some(m=>/Sin conexión/.test(m)));
    nube.retener=false;nube.soltar();await esperar(20);
    chk('y no vuelve a entrar al reconciliar',reabierto.entradas()===1);
  }

  console.log('\n=== 2. Dos dispositivos: lo del otro llega y se repinta ===');
  {
    const nube=crearNube();
    const pc=await preparar(nube);
    await otroDispositivoAnota(nube,0,6.5,'a');
    nube.retener=true;
    const reabierto=dispositivo(nube,pc.almacen);await reabierto.entrar('u1');
    chk('primero muestra la copia local',igual(reabierto.notas(),[[[],[]]]));
    const pintadas=reabierto.pintadas();
    nube.retener=false;nube.soltar();await esperar(20);
    chk('al volver la nube tiene la nota del otro dispositivo',igual(reabierto.notas(),[[[6.5],[]]]));
    chk('y repinta Inicio',reabierto.pintadas()>pintadas);
    chk('y queda en el disco',JSON.parse(reabierto.almacen.get('gradehub_v1')).ramos[0].categorias[0].notas.length===1);
  }
  {
    // Sin cambios en ningún lado no se repinta: cero movimiento de layout.
    const nube=crearNube();
    const pc=await preparar(nube);
    const reabierto=dispositivo(nube,pc.almacen);await reabierto.entrar('u1');
    const pintadas=reabierto.pintadas(),notas=reabierto.notas();
    await esperar(20);
    chk('si nada cambió, no repinta',reabierto.pintadas()===pintadas&&igual(reabierto.notas(),notas));
  }

  console.log('\n=== 3. Nota anotada en la ventana, nube sin cambios ===');
  {
    const nube=crearNube();
    const pc=await preparar(nube);
    const rev=nube.filas.get('u1')._rev;
    nube.retener=true;
    const reabierto=dispositivo(nube,pc.almacen);await reabierto.entrar('u1');
    reabierto.anotar(0,5.5,'v');
    chk('la nota se guarda en el disco al tiro',JSON.parse(reabierto.almacen.get('gradehub_v1')).ramos[0].categorias[0].notas[0].valor===5.5);
    nube.retener=false;nube.soltar();await esperar(30);
    chk('se sube a la nube',igual(notasEnNube(nube),[[[5.5],[]]]));
    chk('con una versión más, sin choque',nube.filas.get('u1')._rev===rev+1);
    chk('y sigue en pantalla',igual(reabierto.notas(),[[[5.5],[]]]));
  }

  console.log('\n=== 4. Nota anotada en la ventana y otro dispositivo escribió ===');
  {
    const nube=crearNube();
    const pc=await preparar(nube);
    await otroDispositivoAnota(nube,1,4.0,'c');
    nube.retener=true;
    const reabierto=dispositivo(nube,pc.almacen);await reabierto.entrar('u1');
    reabierto.anotar(0,6.0,'w');
    nube.retener=false;nube.soltar();await esperar(30);
    chk('en pantalla quedan las dos notas',igual(reabierto.notas(),[[[6],[4]]]));
    chk('en la nube también, sin duplicar',igual(notasEnNube(nube),[[[6],[4]]]));
  }

  console.log('\n=== 5. Una subida pedida durante la lectura espera a la reconciliación ===');
  {
    // Si la subida corriera mientras la lectura viaja, la base avanzaría y la
    // nube llegaría vieja: la fusión tomaría por borrada la nota recién subida.
    const nube=crearNube();
    const pc=await preparar(nube);
    nube.retener=true;
    const reabierto=dispositivo(nube,pc.almacen);await reabierto.entrar('u1');
    const antes=nube.escrituras;
    reabierto.anotar(1,5.8,'p');reabierto.subir();reabierto.disparar('pagehide');
    await esperar(20);
    chk('no se escribe nada mientras la lectura está en camino',nube.escrituras===antes);
    nube.retener=false;nube.soltar();await esperar(30);
    chk('la nota no se toma por borrada',igual(reabierto.notas(),[[[],[5.8]]]));
    chk('y llega a la nube',igual(notasEnNube(nube),[[[],[5.8]]]));
  }

  console.log('\n=== 6. Sin red ===');
  {
    const nube=crearNube();
    const pc=await preparar(nube);
    nube.red=false;
    const reabierto=dispositivo(nube,pc.almacen);await reabierto.entrar('u1');await esperar(20);
    chk('entra con la copia local',reabierto.entradas()===1&&igual(reabierto.notas(),[[[],[]]]));
    chk('y avisa que está sin conexión',reabierto.avisos().some(m=>/Sin conexión · usando tu copia local/.test(m)));
    reabierto.anotar(0,4.5,'o');await reabierto.subir();
    chk('lo anotado sin red queda en el disco',JSON.parse(reabierto.almacen.get('gradehub_v1')).ramos[0].categorias[0].notas[0].valor===4.5);
    nube.red=true;reabierto.disparar('online');await esperar(30);
    chk('al volver la red se sube',igual(notasEnNube(nube),[[[4.5],[]]]));
  }

  console.log('\n=== 7. Con un modal abierto no se reemplaza el estado ===');
  {
    const nube=crearNube();
    const pc=await preparar(nube);
    await otroDispositivoAnota(nube,0,6.5,'a');
    nube.retener=true;
    const reabierto=dispositivo(nube,pc.almacen);await reabierto.entrar('u1');
    reabierto.setModal(true);
    reabierto.run(`__enModal=S.ramos[0].categorias[1];`);   // el formulario edita este objeto
    nube.retener=false;nube.soltar();await esperar(30);
    chk('mientras el modal está abierto, S sigue siendo la misma',reabierto.run(`S.ramos[0].categorias[1]===__enModal`));
    reabierto.run(`__enModal.notas.push({id:'m',nombre:'N',valor:5.2,peso:1});save();clearTimeout(_syncTimer);_syncTimer=null;`);
    reabierto.setModal(false);
    await esperar(1700);
    chk('al cerrarlo se reconcilia: quedan la del modal y la del otro dispositivo',igual(reabierto.notas(),[[[6.5],[5.2]]]));
    chk('y la nube tiene las dos',igual(notasEnNube(nube),[[[6.5],[5.2]]]));
  }

  console.log('\n=== 8. Sin base o con caché ajena se espera a la nube, como antes ===');
  {
    // Primera apertura con este código: caché de la cuenta pero sin base.
    const nube=crearNube();nube.filas.set('u1',estadoInicial());
    const almacen=new Map([['gradehub_v1',JSON.stringify(estadoInicial())],['gradehub_cache_owner','u1']]);
    nube.retener=true;
    const d=dispositivo(nube,almacen);const entrada=d.entrar('u1');await esperar(10);
    chk('sin base no entra antes de la nube',d.entradas()===0);
    nube.retener=false;nube.soltar();await entrada;
    chk('y entra cuando la nube responde',d.entradas()===1);
  }
  {
    const nube=crearNube();
    const pc=await preparar(nube);
    pc.almacen.set('gradehub_cache_owner','otra-cuenta');
    nube.filas.set('u2',estadoInicial());
    nube.retener=true;
    const d=dispositivo(nube,pc.almacen);const entrada=d.entrar('u2');await esperar(10);
    chk('con caché de otra cuenta no entra antes de la nube',d.entradas()===0);
    nube.retener=false;nube.soltar();await entrada;
    chk('y entra con los datos de la nube',d.entradas()===1&&d.run('getCacheOwner()')==='u2');
  }
  {
    const nube=crearNube();
    const pc=await preparar(nube);
    pc.almacen.set('gradehub_v1',JSON.stringify({...estadoInicial(),onboardingDone:false}));
    nube.retener=true;
    const d=dispositivo(nube,pc.almacen);const entrada=d.entrar('u1');await esperar(10);
    chk('con el onboarding a medias tampoco',d.entradas()===0);
    nube.retener=false;nube.soltar();await entrada;
  }

  console.log('\n=== 9. Si cambia la cuenta durante la lectura, no se aplica nada ===');
  {
    const nube=crearNube();
    const pc=await preparar(nube);
    await otroDispositivoAnota(nube,0,6.5,'a');
    nube.retener=true;
    const reabierto=dispositivo(nube,pc.almacen);await reabierto.entrar('u1');
    reabierto.run(`_visitaSesion++;currentUser={id:'u2'};`);   // salió y entró otra cuenta
    const antes=nube.escrituras;
    nube.retener=false;nube.soltar();await esperar(30);
    chk('la nube de la cuenta anterior no entra en S',igual(reabierto.notas(),[[[],[]]]));
    chk('y no se escribe nada',nube.escrituras===antes);
  }

  console.log(`\n${ok} OK, ${fail} FAIL`);
  if(fail)process.exit(1);
})().catch(e=>{console.error(e);process.exit(1);});
