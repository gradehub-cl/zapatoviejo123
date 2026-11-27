// Fechas de compañeros: 3 cuentas con la misma fecha y hora la sugieren a las
// demás en la Agenda y en el editor. Nunca se llena ni se pisa sola, y usarla
// no cuenta como un voto más. Solo cuentas y ramos sintéticos.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {PGlite}=require('@electric-sql/pglite');
const raiz=path.join(__dirname,'..'),read=f=>fs.readFileSync(path.join(raiz,f),'utf8');
let ok=0;const chk=(nombre,cond)=>{assert.ok(cond,nombre);console.log('  OK   '+nombre);ok++;};

// ─── SQL: umbral de 3 en PostgreSQL real ───
const db=new PGlite(),u=i=>`00000000-0000-0000-0000-${String(i).padStart(12,'0')}`;
const q=async(sql,args=[])=>(await db.query(sql,args)).rows;
const soy=async i=>{await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[u(i)]);await db.exec('set role authenticated');};
const enDias=d=>{const x=new Date();x.setDate(x.getDate()+d);return x.toISOString().slice(0,10);};
const FECHA=enDias(10),OTRA=enDias(12);
const ramo=(key,cat,fecha,hora,origen='usuario')=>({id:'r',nombre:'Curso sintético',origen:{tenant:'uc',ramoKey:key},
  categorias:[{nombre:cat,peso:100,fecha,hora,fechaOrigen:origen,horaOrigen:origen,notas:[]}]});

(async()=>{
  console.log('\n=== SQL date_consensus ===');
  await db.exec(read('bin/supabase-stubs.sql'));
  await db.exec('create table public.user_ramos(user_id uuid primary key references auth.users(id) on delete cascade, data jsonb);');
  await db.exec(read('supabase/date_consensus.sql'));
  await db.exec(read('supabase/date_consensus.sql')); // se puede correr de nuevo
  const poner=async(i,ramos)=>{
    await db.exec('reset role');
    await db.query('insert into auth.users(id,email) values($1,$2) on conflict do nothing',[u(i),`sintetico${i}@example.invalid`]);
    await db.query('insert into user_ramos values($1,$2) on conflict (user_id) do update set data=excluded.data',[u(i),JSON.stringify({ramos})]);
  };
  // La función lee una tabla que pg_cron refresca cada 15 minutos: acá el
  // refresco se pide a mano antes de cada lectura.
  const refrescar=async()=>{await db.exec('reset role');await db.exec('select public.date_consensus_refrescar()');};
  const consenso=async(tenant='uc')=>{await refrescar();await soy(9);return q('select * from date_consensus($1)',[tenant]);};
  await poner(1,[ramo('TST101','Prueba 1',FECHA,'10:00')]);
  await poner(2,[ramo('TST101','prueba  1',FECHA,'10:00')]);
  chk('con 2 personas no aparece',(await consenso()).length===0);
  await poner(3,[ramo('TST101','Prueba 1',FECHA,'10:00','catalogo')]);
  chk('una fecha del catálogo no cuenta como persona',(await consenso()).length===0);
  await poner(3,[ramo('TST101','Prueba 1',FECHA,'10:00','consenso')]);
  chk('una fecha usada desde compañeros tampoco cuenta (sin eco)',(await consenso()).length===0);
  await poner(3,[ramo('TST101','PRUEBA 1',FECHA,'10:00')]);
  let filas=await consenso();
  chk('con 3 personas aparece fecha y hora',filas.length===1&&filas[0].fecha===FECHA&&filas[0].hora==='10:00'&&filas[0].fecha_respaldos===3);
  chk('no devuelve quién la puso',!Object.keys(filas[0]).some(k=>/user|email/.test(k)));
  await poner(4,[ramo('TST101','Prueba 1',OTRA,'10:00')]);await poner(5,[ramo('TST101','Prueba 1',OTRA,'10:00')]);await poner(6,[ramo('TST101','Prueba 1',OTRA,'10:00')]);
  chk('empate 3 contra 3: no elige ninguna',(await consenso()).length===0);
  await poner(7,[ramo('TST101','Prueba 1',OTRA,'12:00')]);
  filas=await consenso();
  chk('gana la de más respaldo; la hora solo si 3 coinciden en ella',filas.length===1&&filas[0].fecha===OTRA&&filas[0].fecha_respaldos===4&&filas[0].hora==='10:00');
  // ─── Precalculado: una pasada para todas las universidades ───
  const enFen=r=>({...r,origen:{tenant:'fen',ramoKey:'TST101'}});
  for(const i of [10,11,12])await poner(i,[enFen(ramo('TST101','Prueba 1',FECHA,'09:00'))]);
  await soy(9);
  chk('sin refresco, lo nuevo todavía no aparece',(await q("select * from date_consensus('fen')")).length===0);
  filas=await consenso('fen');
  chk('otra universidad con la misma clave de ramo tiene su propio consenso',filas.length===1&&filas[0].fecha===FECHA&&filas[0].fecha_respaldos===3&&filas[0].hora==='09:00');
  filas=await consenso();
  chk('y no se mezcla con el de la primera',filas.length===1&&filas[0].fecha===OTRA&&filas[0].fecha_respaldos===4);
  await refrescar();await refrescar();await db.exec('reset role');
  chk('refrescar dos veces no duplica filas',(await q('select count(*)::int n from date_consensus_cache'))[0].n===2);
  chk('la tabla no guarda quién votó',!(await q("select column_name c from information_schema.columns where table_name='date_consensus_cache'")).some(f=>/user|email/.test(f.c)));
  await soy(9);
  for(const s of ['select * from date_consensus_cache','select date_consensus_refrescar()','select * from date_consensus_calcular()'])
    await assert.rejects(q(s),/permission denied/);
  chk('con sesión solo se entra por date_consensus: ni la tabla, ni el cálculo, ni el refresco',true);
  await db.exec('reset role');await db.exec("update date_consensus_cache set actualizado_at=now()-interval '2 days'");
  await soy(9);
  chk('si el refresco lleva más de un día sin correr, deja de sugerir',(await q("select * from date_consensus('uc')")).length===0);
  await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub','',false)");await db.exec('set role anon');
  await assert.rejects(q("select * from date_consensus('uc')"),/permission denied/);chk('sin sesión no se puede leer',true);

  // ─── App: sugerencia, nunca relleno ───
  console.log('\n=== App ===');
  const src=['data.js','engine.js','app.js','render-agenda.js'].map(f=>read(f)).join('\n');
  const els={};
  const el=id=>els[id]||(els[id]={id,value:'',dataset:{},hidden:false,disabled:false,replaceWith(){}});
  const stub={style:{setProperty(){},removeProperty(){}},addEventListener(){},appendChild(){},classList:{add(){},remove(){},contains(){return false;}},value:'',innerHTML:'',textContent:'',focus(){},select(){},setAttribute(){},removeAttribute(){},getAttribute(){return null;},querySelector(){return stub;},querySelectorAll(){return [];},clientWidth:400,dataset:{},click(){}};
  const ctx={window:{addEventListener(){},matchMedia:()=>({matches:true,addEventListener(){},addListener(){}})},document:{getElementById:id=>/^m-/.test(id)?el(id):stub,createElement:()=>stub,addEventListener(){},documentElement:{style:{setProperty(){},removeProperty(){}},setAttribute(){},removeAttribute(){},getAttribute(){return null;}},querySelector:()=>stub,querySelectorAll:()=>[],body:stub},localStorage:{getItem(){return null;},setItem(){},removeItem(){}},navigator:{},location:{origin:'',pathname:'/',search:'',hash:''},history:{replaceState(){}},setTimeout,clearTimeout,console};
  vm.createContext(ctx);vm.runInContext(src,ctx);
  const run=c=>vm.runInContext(c,ctx);
  ctx.__filas=[
    {ramo_key:'TST101',categoria_key:'prueba 1',nota_key:null,fecha:FECHA,fecha_respaldos:3,hora:'10:00',hora_respaldos:3},
    {ramo_key:'TST101',categoria_key:'controles',nota_key:'control 2',fecha:OTRA,fecha_respaldos:4,hora:null,hora_respaldos:null},
  ];
  run(`S.tenant='uc';currentUser={id:'u-sintetico'};supabaseClient={rpc:async()=>({data:__filas,error:null})};
    var R={id:'r1',nombre:'Curso sintético',origen:{tenant:'uc',ramoKey:'TST101'},categorias:[
      {id:'c1',nombre:'Prueba 1',peso:50,fecha:null,hora:null,notas:[]},
      {id:'c2',nombre:'Controles',peso:50,slots:2,notas:[{id:'n2',nombre:'Control 2',peso:1,slot:1,fecha:null}]}]};`);
  chk('antes de cargar no hay sugerencia',run('fechaCompartida(R,R.categorias[0],null,R.categorias[0])')===null);
  chk('carga una vez por sesión',await run('cargarFechasCompartidas()')===true);
  const sug=run('fechaCompartida(R,R.categorias[0],null,R.categorias[0])');
  chk('evaluación sin fecha recibe la de compañeros (sin importar mayúsculas)',sug&&sug.fecha===FECHA&&sug.hora==='10:00'&&sug.respaldos===3);
  chk('el texto dice cuántos y cuándo',/^3 compañeros la tienen el \S+ \d+ \S+, 10:00$/.test(run('textoFechaCompartida(fechaCompartida(R,R.categorias[0],null,R.categorias[0]))')));
  chk('una casilla recibe la suya por nombre',run('fechaCompartida(R,R.categorias[1],"Control 2",R.categorias[1].notas[0])').fecha===OTRA);
  chk('nada se llenó solo',run('R.categorias[0].fecha')===null&&run('R.categorias[1].notas[0].fecha')===null);
  chk('si ya tiene fecha, no sugiere',run(`fechaCompartida(R,R.categorias[0],null,{fecha:'${OTRA}'})`)===null);
  chk('si la quitó a propósito, no sugiere',run('fechaCompartida(R,R.categorias[0],null,{fechaQuitada:true})')===null);
  chk('otro ramo no recibe nada',run(`fechaCompartida({origen:{tenant:'uc',ramoKey:'OTRO'}},R.categorias[0],null,null)`)===null);
  chk('el editor muestra el botón Usar',/Usar<\/button>/.test(run(`sugerenciaFechaHTML('m-cat',fechaCompartida(R,R.categorias[0],null,R.categorias[0]))`)));

  // Usar → Guardar: queda como 'consenso', que no es voto.
  run(`usarFechaCompartida('m-cat','${FECHA}','10:00');var C=R.categorias[0];marcarFechaUsuario(C,document.getElementById('m-cat-fecha').value,leerHora('m-cat'));marcarOrigenCompartido(C,'m-cat');`);
  chk('Usar llena los campos y Guardar la deja como consenso',run('C.fecha')===FECHA&&run('C.hora')==='10:00'&&run('C.fechaOrigen')==='consenso'&&run('C.horaOrigen')==='consenso');
  chk('consenso no cuenta como respaldo',run('fechaAportaRespaldo(C)')===false&&run('horaAportaRespaldo(C)')===false);
  chk('consenso sobrevive al guardar y leer',run('normalize(JSON.parse(JSON.stringify({ramos:[R]}))).ramos[0].categorias[0].fechaOrigen')==='consenso');
  run(`document.getElementById('m-cat-fecha').value='${OTRA}';marcarFechaUsuario(C,'${OTRA}',leerHora('m-cat'));marcarOrigenCompartido(C,'m-cat');`);
  chk('si la cambia antes de guardar, es suya y sí cuenta',run('C.fechaOrigen')==='usuario'&&run('fechaAportaRespaldo(C)')===true);

  run(`supabaseClient={rpc:async()=>({data:null,error:{message:'function date_consensus does not exist'}})};currentUser={id:'otra-cuenta'};`);
  chk('sin la función en Supabase, la app sigue sin sugerencias',await run('cargarFechasCompartidas()')===false&&run('fechaCompartida(R,R.categorias[1],"Control 2",R.categorias[1].notas[0])')===null);

  console.log(`\n${ok} OK`);
})().catch(e=>{console.error(e);process.exit(1);});
