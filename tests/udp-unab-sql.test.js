// UDP y UNAB en SQL. Producción tiene los checks y las funciones con la lista
// de cinco universidades; este test reconstruye ese estado (los archivos de
// origen sin 'udp' ni 'unab'), aplica supabase/universidades_udp_unab.sql
// como se haría en producción, dos veces, y comprueba que una cuenta UDP o
// UNAB guarda su perfil, responde encuestas y compara ramos sin sigla.
// PGlite y datos sintéticos.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {PGlite}=require('@electric-sql/pglite');
const leer=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
const db=new PGlite(),q=async(sql,p=[])=>(await db.query(sql,p)).rows;
const u=i=>'00000000-0000-4000-8000-'+String(i).padStart(12,'0');
const FUNCIONES=['admin_crear_encuesta','amigos_username_reservado','clave_curso_comparacion',
  'codigo_universidad_perfil','encuestas_universidad','profesor_contexto',
  'ramo_calificacion_contexto','ramo_resumen_publico','ramos_por_universidad_validos','registrar_discrepancia_nota'];
// Deshace lo que trae el archivo de origen para volver al estado de producción.
const sinNuevas=s=>s
  .replace(/, 'udp'::text, 'unab'::text/g,'')
  .replace(/,'udp','unab'/g,'').replace(/, 'udp', 'unab'/g,'')
  .replace(/\s*when 'udp','u\. diego portales' then return 'udp';\s*when 'unab','u\. andrés bello' then return 'unab';/g,'')
  .replace(/\s*when 'udp' then 'udp'\s*when 'unab' then 'unab'/g,'');
async function sesion(uid,aal='aal1'){
  await db.exec('reset role');
  await q("select set_config('request.jwt.claim.sub',$1,false),set_config('test.aal',$2,false),set_config('test.session','s-1',false)",[uid,aal]);
  await db.exec('set role authenticated');
}
async function pendientes(){
  return (await q(`select c.conrelid::regclass::text||'.'||c.conname x from pg_constraint c join pg_namespace n on n.oid=c.connamespace
    where n.nspname='public' and pg_get_constraintdef(c.oid) like '%''udd''::text%' and pg_get_constraintdef(c.oid) not like '%''udp''::text%'
    union all select p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname=any($1) and p.prosrc not like '%''udp''%'`,[FUNCIONES])).map(r=>r.x).sort();
}
(async()=>{try{
  await db.exec(leer('bin/supabase-stubs.sql'));
  await db.exec(`create function auth.jwt() returns jsonb language sql stable as $$ select jsonb_build_object('aal',current_setting('test.aal',true),'session_id',current_setting('test.session',true)) $$;
    create table public.profiles(id uuid primary key references auth.users(id),universidad text,carrera text);
    create table public.user_ramos(user_id uuid primary key references auth.users(id) on delete cascade,data jsonb not null default '{}'::jsonb);
    create table public.catalogo_uc(sigla text primary key,nombre text,creditos int,busqueda text);
    create table public.catalog_reports(id uuid primary key default gen_random_uuid(),user_id uuid references auth.users(id),tenant text,carrera text,ramo text,ramo_norm text,estructura jsonb,huella text,nota text,created_at timestamptz default now());`);
  for(const f of ['clases_particulares','admin_clases','administradores','encuestas','profesores','universidades_reportes',
    'catalog_consensus','consenso_periodo','pautas_banco','discrepancias_nota','ramo_calificaciones','amigos','profesor_alumnos'])
    await db.exec(leer('supabase/'+f+'.sql'));

  // Estado de producción: mismas tablas y funciones, sin 'udp' ni 'unab'.
  await db.exec('reset role');
  for(const r of await q(`select c.conrelid::regclass::text t,c.conname n,pg_get_constraintdef(c.oid) d from pg_constraint c
      join pg_namespace s on s.oid=c.connamespace where s.nspname='public' and pg_get_constraintdef(c.oid) like '%''udp''::text%'`))
    await db.exec(`alter table ${r.t} drop constraint ${r.n}, add constraint ${r.n} ${sinNuevas(r.d)}`);
  for(const r of await q(`select pg_get_functiondef(p.oid) d from pg_proc p join pg_namespace s on s.oid=p.pronamespace
      where s.nspname='public' and p.proname=any($1)`,[FUNCIONES]))
    await db.exec(sinNuevas(r.d));
  const antes=await pendientes();
  assert.ok(antes.includes('profiles.profiles_universidad_tenant_check'),'el estado de producción no acepta UDP en profiles');
  assert.ok(FUNCIONES.filter(f=>f!=='ramos_por_universidad_validos').every(f=>antes.includes(f)),'faltan funciones en el estado anterior: '+antes.join(', '));

  const [admin,udp,unab]=[u(1),u(2),u(3)];
  for(const id of [admin,udp,unab])await q('insert into auth.users(id) values($1)',[id]);
  await assert.rejects(q("insert into profiles(id,universidad) values($1,'udp')",[udp]),/universidad desconocida/);

  // El archivo nuevo, dos veces: la segunda no cambia nada.
  await db.exec(leer('supabase/universidades_udp_unab.sql'));
  assert.deepEqual(await pendientes(),[],'quedó una lista sin udp/unab');
  const huella=async()=>JSON.stringify(await q(`select p.proname,md5(p.prosrc) h from pg_proc p join pg_namespace s on s.oid=p.pronamespace
    where s.nspname='public' and p.proname=any($1) order by 1`,[FUNCIONES]));
  const primera=await huella();
  await db.exec(leer('supabase/universidades_udp_unab.sql'));
  assert.equal(await huella(),primera,'reaplicar cambió funciones');

  // Perfil: el nombre visible o el código, los dos terminan en el código.
  await q("insert into profiles(id,universidad) values($1,'U. Diego Portales'),($2,'unab')",[udp,unab]);
  assert.deepEqual((await q('select universidad from profiles order by id')).map(r=>r.universidad),['udp','unab']);
  assert.equal((await q("select codigo_universidad_perfil('U. Andrés Bello') c"))[0].c,'unab');

  // Ramos sin sigla se comparan por nombre normalizado, como UAI, UAndes y UDD.
  assert.equal((await q(`select clave_curso_comparacion('udp','{"nombre":"Cálculo I"}'::jsonb) c`))[0].c,'CALCULO I');
  assert.equal((await q(`select clave_curso_comparacion('unab','{"nombre":"Cálculo I"}'::jsonb) c`))[0].c,'CALCULO I');

  // Encuestas: la UNAB es público y responde.
  await q('insert into admin.administradores(user_id) values($1)',[admin]);
  await q("update auth.users set created_at='2020-01-01'");
  await q('insert into user_ramos(user_id,data) values($1,$2)',[unab,JSON.stringify({tenant:'unab',ramos:[]})]);
  await sesion(unab);
  assert.equal((await q('select encuestas_universidad() t'))[0].t,'unab');
  const hoy=(await q("select (now() at time zone 'America/Santiago')::date::text h"))[0].h;
  await sesion(admin,'aal2');
  const id=(await q("select admin_crear_encuesta('Pregunta sintética','una',array['Uno','Dos'],'unab',$1::date,$1::date) id",[hoy]))[0].id;
  await sesion(unab);
  await q('select responder_encuesta($1,$2)',[id,[1]]);
  await db.exec('reset role');
  assert.equal((await q('select universidad from encuesta_respuestas'))[0].universidad,'unab');

  // Los nombres de las universidades quedan reservados como usuario.
  assert.equal((await q("select amigos_username_reservado('udp') a"))[0].a,true);
  assert.equal((await q("select amigos_username_reservado('unab') a"))[0].a,true);
  console.log('OK UDP y UNAB en SQL: el archivo amplía checks y funciones de producción, es reaplicable, y perfil, encuestas y comparación aceptan las dos');
}catch(e){console.error(e);process.exit(1);}})();
