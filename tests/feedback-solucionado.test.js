// Aviso privado por feedback: solo fixtures inventadas, sin correos ni envíos.
const fs=require('fs'),path=require('path'),vm=require('vm');
const leer=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
let ok=0,fallos=0;
const chk=(n,c)=>{console.log(`  ${c?'OK  ':'FAIL'} ${n}`);c?ok++:fallos++;};
async function rechaza(fn){try{await fn();return false;}catch(e){return true;}}

async function sql(){
  const {PGlite}=await import('@electric-sql/pglite'),db=new PGlite();
  await db.exec(leer('bin/supabase-stubs.sql'));
  const archivo=leer('supabase/user_feedback.sql');await db.exec(archivo);
  const a='11111111-1111-4111-8111-111111111111',b='22222222-2222-4222-8222-222222222222';
  await db.query('insert into auth.users(id) values ($1),($2)',[a,b]);
  const insertar=async usuario=>(await db.query("insert into public.user_feedback(user_id,categoria,mensaje) values ($1,'problema','Reporte sintético') returning id",[usuario])).rows[0].id;
  const primero=await insertar(a),otro=await insertar(b),antiguo=await insertar(a);
  const como=async uid=>{await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[uid||'']);await db.exec('set role authenticated');};
  const leerAvisos=async()=>(await db.query('select * from public.mis_feedback_solucionados()')).rows;
  const resolver=async(id,solucion='Ya se conserva el nombre editado.')=>(await db.query('select admin.resolver_feedback($1,$2) as cambio',[id,solucion])).rows[0].cambio;
  const cerrar=async id=>(await db.query('select public.feedback_solucion_vista($1) as visto',[id])).rows[0].visto;
  console.log('\n=== Feedback: permisos y entrega ===');
  await como(a);
  chk('aplicar el SQL no notifica comentarios antiguos',(await leerAvisos()).length===0);
  chk('un usuario no puede listar la tabla',await rechaza(()=>db.query('select * from public.user_feedback')));
  chk('ni marcar su reporte como solucionado',await rechaza(()=>db.query('update public.user_feedback set solucionado_at=now()')));
  chk('ni ejecutar el helper del SQL Editor',await rechaza(()=>resolver(primero)));
  chk('el envío anterior sigue funcionando',!await rechaza(()=>db.query("insert into public.user_feedback(user_id,categoria,mensaje,universidad) values ($1,'problema','Otro reporte sintético','uc')",[a])));
  chk('no se puede insertar la solución junto al comentario',await rechaza(()=>db.query("insert into public.user_feedback(user_id,categoria,mensaje,solucion) values ($1,'problema','Inventado','falso')",[a])));
  chk('ni insertar a nombre de otra cuenta',await rechaza(()=>db.query("insert into public.user_feedback(user_id,categoria,mensaje) values ($1,'problema','Inventado')",[b])));
  await db.exec('reset role');
  chk('la solución exige un texto breve',await rechaza(()=>resolver(primero,''))&&await rechaza(()=>resolver(primero,'x'.repeat(241)))&&await rechaza(()=>resolver(primero,null)));
  chk('se resuelve una sola vez',await resolver(primero)&&!await resolver(primero,'No se reenvía'));
  await resolver(otro,'Solución de la otra cuenta.');
  await como(a);const avisos=await leerAvisos();
  chk('cada cuenta recibe solo su aviso',avisos.length===1&&avisos[0].feedback_id===primero&&avisos[0].solucion==='Ya se conserva el nombre editado.');
  chk('no devuelve el mensaje original ni identidad',Object.keys(avisos[0]).sort().join()==='feedback_id,solucion,solucionado_at');
  chk('no se puede cerrar el aviso ajeno ni un reporte abierto',!await cerrar(otro)&&!await cerrar(antiguo));
  await como(null);chk('una sesión vacía no recibe ni cierra avisos',(await leerAvisos()).length===0&&!await cerrar(primero));
  await db.exec('reset role; set role anon');
  chk('anon no puede leer ni cerrar avisos',await rechaza(leerAvisos)&&await rechaza(()=>cerrar(primero)));
  await como(a);chk('cerrarlo lo quita en la siguiente lectura',await cerrar(primero)&&(await leerAvisos()).length===0);
  await db.exec('reset role');const antes=(await db.query('select * from public.user_feedback where id=$1',[primero])).rows[0];
  await db.exec(archivo);const despues=(await db.query('select * from public.user_feedback where id=$1',[primero])).rows[0];
  chk('reaplicar conserva el reporte, la solución y la lectura',JSON.stringify(antes)===JSON.stringify(despues));
  chk('un id inexistente no crea avisos',!await resolver('99999999-9999-4999-8999-999999999999'));
  await como(a);await cerrar(primero);await db.exec('reset role');
  chk('cerrar de nuevo no cambia la fecha de lectura',(await db.query('select solucion_vista_at from public.user_feedback where id=$1',[primero])).rows[0].solucion_vista_at.getTime()===antes.solucion_vista_at.getTime());
  await db.query('delete from auth.users where id=$1',[a]);
  chk('borrar la cuenta borra también sus avisos',(await db.query('select count(*)::int as n from public.user_feedback where user_id=$1',[a])).rows[0].n===0);
  await db.close();
}

async function cliente(){
  console.log('\n=== Feedback: banner y cambios de sesión ===');
  const nodos=[];
  function nodo(tag){
    const n={tag,children:[],attrs:{},textContent:'',disabled:false,innerHTML:'',listeners:{},
      setAttribute(k,v){this.attrs[k]=v;},addEventListener(k,fn){this.listeners[k]=fn;},
      append(...hijos){hijos.forEach(h=>{h.parent=this;this.children.push(h);});},
      prepend(h){h.parent=this;this.children.unshift(h);},
      remove(){if(this.parent)this.parent.children=this.parent.children.filter(h=>h!==this);this.parent=null;},
      focus(){this.enfocado=true;}};nodos.push(n);return n;
  }
  const inicio=nodo('scroll'),avatar=nodo('button');
  const caja=()=>nodos.find(n=>n.id==='aviso-feedback-solucionado'&&n.parent);
  const documento={createElement:nodo,
    getElementById:id=>id==='user-avatar'?avatar:caja()||null,
    querySelector:s=>s==='#screen-home .scroll'?inicio:s==='#aviso-feedback-solucionado button'?caja()?.children[1]||null:null};
  const llamadas=[],toasts=[];
  const ctx={document:documento,currentUser:{id:'cuenta-a'},showToast:m=>toasts.push(m),supabaseClient:{rpc:async(nombre,args)=>{llamadas.push([nombre,args]);return ctx.respuesta;}}};
  ctx.respuesta={data:[],error:null};vm.createContext(ctx);
  const app=leer('app-session.js');
  vm.runInContext(app.slice(app.indexOf('let _avisosFeedback='),app.indexOf('// Cada entrada y cada salida abren una visita nueva.')),ctx);
  const run=c=>vm.runInContext(c,ctx),cargar=()=>run('cargarAvisosFeedback()');
  ctx.respuesta={error:{code:'PGRST202',message:'No existe la función'}};await cargar();
  chk('sin SQL no muestra un banner ni interrumpe la app',!caja()&&toasts.length===0);
  ctx.respuesta={data:[{feedback_id:'f-a',solucion:'Nombre <b>editado</b> conservado.'}],error:null};await cargar();
  const banner=caja(),boton=banner.children[1];
  chk('presenta el título pedido y el detalle como texto seguro',banner.children[0].children[0].textContent==='Solucionamos tu problema'&&banner.children[0].children[1].textContent==='Nombre <b>editado</b> conservado.'&&!banner.children[0].children[1].innerHTML);
  chk('el cierre tiene nombre accesible y el aviso es no interruptivo',!!boton.attrs['aria-label']&&banner.attrs.role==='status'&&banner.attrs['aria-live']==='polite'&&!boton.enfocado);
  ctx.respuesta={error:{message:'Sin conexión'}};await run("cerrarAvisoFeedback('f-a',document.querySelector('#aviso-feedback-solucionado button'))");
  chk('si falla el cierre conserva el aviso para reintentar',caja()===banner&&!boton.disabled&&toasts.length===1);
  ctx.respuesta={data:true,error:null};await run("cerrarAvisoFeedback('f-a',document.querySelector('#aviso-feedback-solucionado button'))");
  chk('cerrar confirma en servidor antes de quitarlo y devuelve el foco',!caja()&&llamadas.at(-1)[0]==='feedback_solucion_vista'&&llamadas.at(-1)[1].p_feedback_id==='f-a'&&avatar.enfocado);
  let terminar;
  ctx.supabaseClient.rpc=()=>new Promise(r=>terminar=r);const pendiente=cargar();
  run('olvidarAvisosFeedback()');ctx.currentUser={id:'cuenta-b'};
  terminar({data:[{feedback_id:'f-a',solucion:'De otra cuenta'}]});await pendiente;
  chk('una lectura atrasada de A no se muestra en B',!caja());
  const mismaCuenta=cargar();run('olvidarAvisosFeedback()');ctx.currentUser={id:'cuenta-b'};
  terminar({data:[{feedback_id:'f-b',solucion:'Visita anterior'}]});await mismaCuenta;
  chk('salir y volver a la misma cuenta invalida la lectura anterior',!caja());
  ctx.supabaseClient.rpc=async()=>({data:[{feedback_id:'f-b',solucion:'Aviso sintético'}],error:null});await cargar();
  ctx.supabaseClient.rpc=()=>new Promise(r=>terminar=r);
  const cierrePendiente=run("cerrarAvisoFeedback('f-b',document.querySelector('#aviso-feedback-solucionado button'))");
  run('olvidarAvisosFeedback()');ctx.currentUser={id:'cuenta-c'};
  terminar({data:true,error:null});await cierrePendiente;
  chk('un cierre atrasado no repinta ni enfoca controles de otra cuenta',!caja());
  ctx.supabaseClient.rpc=async()=>{throw new Error('Sin red');};await cargar();
  chk('un error de transporte no bloquea la entrada',!caja());
  chk('se limpia al salir, al entrar y al mostrar el login',[/function showAuthScreen\(\)\{/,/async function afterLogin\(\)\{/,/async function cerrarSesion\(\)\{/].every(re=>new RegExp(re.source+'\\s+if\\(typeof olvidarAvisosFeedback').test(app)));
  const css=leer('styles.css');
  chk('el control mantiene 44 px y foco explícito',/\.aviso-feedback-cerrar\{[^}]*min-width:44px;min-height:44px/.test(css)&&/\.aviso-feedback-cerrar:focus-visible\{outline:2px/.test(css));
}

(async()=>{await sql();await cliente();console.log(`\n${ok} OK, ${fallos} FAIL`);process.exit(fallos?1:0);})().catch(e=>{console.error(e);process.exit(1);});
