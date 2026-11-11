// El reporte de pauta lleva la sección (2026-10-07): en un ramo no coordinado
// cada sección puede tener su propia pauta y hay que poder distinguirlas. Se
// prueba que viaje, que lo ya votado sin sección se reenvíe una sola vez, que
// una app sin el SQL nuevo no pierda el voto ni insista, y que el servidor la
// guarde sin que una app vieja la borre. Datos sintéticos.
const fs=require('fs'),vm=require('vm'),path=require('path');
const raiz=path.join(__dirname,'..');
const src=['data.js','engine.js','app.js'].map(f=>fs.readFileSync(path.join(raiz,f),'utf8')).join('\n');
const nodo={style:{setProperty(){}},classList:{add(){},remove(){},contains(){return false}},addEventListener(){},appendChild(){},setAttribute(){},removeAttribute(){},getAttribute(){return null},querySelector(){return null},querySelectorAll(){return []},dataset:{}};
const ctx={window:{addEventListener(){},matchMedia:()=>({matches:true,addEventListener(){},addListener(){}})},
  document:{getElementById:()=>nodo,createElement:()=>nodo,addEventListener(){},documentElement:nodo,querySelector:()=>nodo,querySelectorAll:()=>[],body:nodo},
  localStorage:{getItem(){return null},setItem(){},removeItem(){}},navigator:{},location:{origin:'',pathname:'/',hash:''},
  setTimeout,clearTimeout,console,syncToCloud(){}};
vm.createContext(ctx);vm.runInContext(src,ctx);
const run=s=>vm.runInContext(s,ctx);
const J=x=>JSON.stringify(x);
let ok=0,fail=0;
const chk=(n,c)=>{if(c){ok++;console.log('  OK   '+n);}else{fail++;console.log('  FAIL '+n);}};
const cats=[{id:'c1',nombre:'Control',peso:40,notas:[]},{id:'c2',nombre:'Examen',peso:60,notas:[]}];
const ramo=(extra={})=>({id:'r1',nombre:'Curso de prueba',sigla:'ABC1234',origen:null,categorias:JSON.parse(J(cats)),gates:[],...extra});
const calls=[];ctx.calls=calls;
// `sinSql` simula la base antes de aplicar el SQL: la firma con p_seccion no existe.
run(`S.tenant='uc';S.carrera='Carrera de prueba';currentUser={id:'u1'};globalThis.sinSql=false;
  supabaseClient={rpc:async(nombre,args)=>{calls.push({nombre,args});
    if(sinSql&&'p_seccion' in args)return {error:{code:'PGRST202',message:'Could not find the function'}};
    return {error:null};}};`);

(async()=>{
  console.log('\n=== La sección viaja con el voto ===');
  run('S.aportarPautasAutomaticamente=true;S.ramos='+J([ramo({seccion:3})]));
  await run('aportarPautasAlCatalogo()');
  chk('el voto lleva p_seccion',calls.length===1&&calls[0].args.p_seccion===3);
  chk('queda marcada como enviada',run('S.ramos[0].seccionAportada')===3);
  await run('aportarPautasAlCatalogo()');
  chk('no se reenvía sin cambios',calls.length===1);
  run('S.ramos[0].seccion=5');
  await run('aportarPautasAlCatalogo()');
  chk('si cambia de sección, se reenvía con la nueva',calls.length===2&&calls[1].args.p_seccion===5);

  console.log('\n=== Lo votado antes de la sección ===');
  calls.length=0;
  run('S.ramos='+J([ramo({seccion:2})])+';S.ramos[0].consensoAportado=huellaEstructura(estructuraParaConsenso(estructuraDe(S.ramos[0])));');
  await run('aportarPautasAlCatalogo()');
  chk('un voto viejo con sección se reenvía una vez',calls.length===1&&calls[0].args.p_seccion===2);
  await run('aportarPautasAlCatalogo()');
  chk('y solo una',calls.length===1);
  calls.length=0;
  run('S.ramos='+J([ramo()])+';S.ramos[0].consensoAportado=huellaEstructura(estructuraParaConsenso(estructuraDe(S.ramos[0])));');
  await run('aportarPautasAlCatalogo()');
  chk('un voto viejo sin sección no se reenvía',calls.length===0);
  run('S.ramos='+J([ramo({seccion:4,consensoRespaldos:3})])+';S.ramos[0].consensoAportado=huellaEstructura(estructuraParaConsenso(estructuraDe(S.ramos[0])));');
  await run('aportarPautasAlCatalogo()');
  chk('una pauta recibida del consenso sigue sin contar como voto',calls.length===0);

  console.log('\n=== Antes de aplicar el SQL ===');
  calls.length=0;
  run('sinSql=true;S.ramos='+J([ramo({seccion:7})]));
  await run('aportarPautasAlCatalogo()');
  chk('sin SQL no pierde período y origen en un fallback',calls.length===1&&calls[0].nombre==='submit_catalog_report_periodo'&&calls[0].args.p_seccion===7&&calls[0].args.p_periodo&&calls[0].args.p_origen==='automatico');
  chk('no se marca la sección como enviada',run('S.ramos[0].seccionAportada')===undefined);
  await run('aportarPautasAlCatalogo()');
  chk('un nuevo guardado reintenta sin degradar la firma',calls.length===2&&calls.every(c=>c.nombre==='submit_catalog_report_periodo'));

  console.log('\n=== El servidor la guarda ===');
  const {PGlite}=await import('@electric-sql/pglite');
  const db=new PGlite();
  await db.exec(fs.readFileSync(path.join(raiz,'bin/supabase-stubs.sql'),'utf8'));
  await db.exec(`create table public.catalogo_uc(sigla text primary key,nombre text not null,creditos integer,busqueda text not null);
    create table public.user_ramos(user_id uuid primary key references auth.users(id),data jsonb not null);
    create table public.profiles(id uuid primary key references auth.users(id),universidad text);
    create table public.catalog_reports(id uuid primary key default gen_random_uuid(),user_id uuid not null,tenant text not null,
      carrera text,ramo text not null,ramo_norm text not null,estructura jsonb not null,huella text not null,nota text,created_at timestamptz default now());`);
  const sql=fs.readFileSync(path.join(raiz,'supabase/catalog_consensus.sql'),'utf8');
  // La versión anterior de la función, como está hoy en producción.
  await db.exec(`create function public.submit_catalog_report(p_tenant text,p_carrera text,p_ramo text,p_ramo_norm text,
    p_ramo_sigla text,p_estructura jsonb,p_huella text,p_nota text default null) returns void language sql as $$ select $$;`);
  await db.exec(sql);await db.exec(sql);
  const firmas=(await db.query(`select count(*)::int n from pg_proc where proname='submit_catalog_report'`)).rows[0].n;
  chk('reaplicado dos veces deja una sola firma',firmas===1);
  const u='00000000-0000-0000-0000-0000000000a1';
  await db.query(`insert into auth.users(id) values ($1)`,[u]);
  await db.query(`insert into public.user_ramos(user_id,data) values ($1,$2::jsonb)`,[u,J({tenant:'uc',onboardingDone:true,ramos:[]})]);
  await db.query(`insert into public.profiles(id,universidad) values ($1,$2)`,[u,'U. Católica · Ingeniería']);
  await db.query(`select set_config('request.jwt.claim.sub',$1,false)`,[u]);
  const est=J([{nombre:'Control',peso:40},{nombre:'Examen',peso:60}]);
  await db.query(`select public.submit_catalog_report('uc','x','Curso de prueba','curso de prueba','ABC1234',$1::jsonb,'h',null,3)`,[est]);
  chk('guarda la sección',(await db.query('select seccion from public.catalog_reports')).rows[0].seccion===3);
  await db.query(`select public.submit_catalog_report(p_tenant=>'uc',p_carrera=>'x',p_ramo=>'Curso de prueba',p_ramo_norm=>'curso de prueba',
    p_ramo_sigla=>'ABC1234',p_estructura=>$1::jsonb,p_huella=>'h',p_nota=>null)`,[est]);
  const filas=(await db.query('select seccion from public.catalog_reports')).rows;
  chk('una app vieja, sin p_seccion, sigue funcionando y no la borra',filas.length===1&&filas[0].seccion===3);
  let rechazo=false;
  try{await db.query(`select public.submit_catalog_report('uc','x','Curso de prueba','curso de prueba','ABC1234',$1::jsonb,'h',null,1000)`,[est]);}catch(e){rechazo=true;}
  chk('una sección fuera de rango se rechaza',rechazo);
  chk('el consenso no se parte por sección',!/group by[^;]*seccion/i.test(sql.slice(sql.indexOf('function public.catalog_consensus'))));

  console.log(`\nPASS: ${ok}   FAIL: ${fail}`);
  process.exit(fail?1:0);
})().catch(e=>{console.error(e);process.exit(1);});
