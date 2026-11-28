// Universidades de Chile con registro básico. Producción acepta siete códigos
// en profiles; este test parte de ese estado (función y check como estaban el
// 2026-11-26), aplica supabase/universidades_chile.sql dos veces y comprueba
// que una cuenta de la USACH guarda su perfil, que lo de antes sigue igual y
// que la lista del archivo de origen y la del delta son la misma.
// PGlite y datos sintéticos.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {PGlite}=require('@electric-sql/pglite');
const leer=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
const db=new PGlite(),q=async(sql,p=[])=>(await db.query(sql,p)).rows;
const u=i=>'00000000-0000-4000-8000-'+String(i).padStart(12,'0');
const SIETE=['uc','fen','uai','uandes','udd','udp','unab'];
const PRODUCCION=`
create or replace function public.codigo_universidad_perfil(p_valor text)
returns text language plpgsql immutable set search_path='' as $f$
declare valor text:=lower(nullif(btrim(p_valor),''));
begin
 if valor is null then return null; end if;
 case valor
  when 'uc','u. católica · ingeniería','u. católica' then return 'uc';
  when 'fen','u. de chile · fen','u. de chile' then return 'fen';
  when 'uai','u. adolfo ibáñez' then return 'uai';
  when 'uandes','u. de los andes' then return 'uandes';
  when 'udd','u. del desarrollo' then return 'udd'; when 'udp','u. diego portales' then return 'udp'; when 'unab','u. andrés bello' then return 'unab';
  else raise exception 'universidad desconocida: revisar antes de migrar' using errcode='22023';
 end case;
end;
$f$;
alter table public.profiles drop constraint profiles_universidad_tenant_check;
alter table public.profiles add constraint profiles_universidad_tenant_check
 check (universidad is null or universidad = any (array['uc','fen','uai','uandes','udd','udp','unab']));
drop function public.universidades_basicas();`;
const basicas=async()=>(await q('select public.universidades_basicas() l'))[0].l;
const huella=async()=>JSON.stringify(await q(`select md5(p.prosrc) f,(select pg_get_constraintdef(c.oid) from pg_constraint c
  where c.conname='profiles_universidad_tenant_check') c from pg_proc p where p.proname='codigo_universidad_perfil'`));
(async()=>{try{
  await db.exec(leer('bin/supabase-stubs.sql'));
  await db.exec(`create table public.catalogo_uc(sigla text primary key,nombre text,creditos int,busqueda text);
    create table public.user_ramos(user_id uuid primary key references auth.users(id),data jsonb);
    create table public.profiles(id uuid primary key references auth.users(id),universidad text,updated_at timestamptz default now());
    create table public.catalog_reports(id uuid primary key default gen_random_uuid(),user_id uuid references auth.users(id),tenant text,carrera text,ramo text,ramo_norm text,estructura jsonb,huella text,nota text,created_at timestamptz default now());
    grant insert,select on public.profiles to authenticated;`);
  await db.exec(leer('supabase/catalog_consensus.sql'));
  await db.exec(leer('supabase/universidades_reportes.sql'));
  for(let i=1;i<=6;i++)await q('insert into auth.users(id) values($1)',[u(i)]);

  // La lista del archivo de origen: sin repetidos, sin pisar a las siete y con
  // la forma que ya exige user_feedback.universidad.
  const deOrigen=await basicas();
  assert.equal(new Set(deOrigen).size,deOrigen.length,'hay códigos repetidos');
  assert.ok(deOrigen.every(c=>/^[a-z]{2,12}$/.test(c)&&!SIETE.includes(c)),'un código no tiene la forma esperada o repite una de las siete');

  // Estado de producción: una universidad nueva no guarda su perfil.
  await db.exec(PRODUCCION);
  await assert.rejects(q("insert into profiles(id,universidad) values($1,'usach')",[u(1)]),/universidad desconocida/);
  await q("insert into profiles(id,universidad) values($1,'U. de Chile · FEN'),($2,null)",[u(2),u(3)]);

  // El delta, dos veces: la segunda no cambia nada.
  const delta=leer('supabase/universidades_chile.sql');
  await db.exec(delta);
  const primera=await huella();
  await db.exec(delta);
  assert.equal(await huella(),primera,'reaplicar cambió la función o el check');
  assert.deepEqual(await basicas(),deOrigen,'la lista del delta no es la del archivo de origen');

  // Lo de antes sigue igual; lo nuevo entra con su código; lo inventado no.
  assert.deepEqual((await q('select universidad from profiles order by id')).map(r=>r.universidad),['fen',null]);
  await q("insert into profiles(id,universidad) values($1,'usach'),($2,'UNAB')",[u(1),u(4)]);
  assert.deepEqual((await q('select universidad from profiles where id=any($1) order by id',[[u(1),u(4)]])).map(r=>r.universidad),['usach','unab']);
  await assert.rejects(q("insert into profiles(id,universidad) values($1,'harvard')",[u(5)]),/universidad desconocida/);
  await db.exec('alter table public.profiles disable trigger profiles_universidad_codigo');
  await assert.rejects(q("insert into profiles(id,universidad) values($1,'harvard')",[u(5)]),/profiles_universidad_tenant_check/);
  await db.exec('alter table public.profiles enable trigger profiles_universidad_codigo');

  // Con el rol de la app: el check llama a la función, así que necesita permiso.
  await db.exec('set role authenticated');
  await q("insert into profiles(id,universidad) values($1,'pucv')",[u(5)]);
  await db.exec('reset role');

  // Todo lo que la app ofrece cabe en lo que la base acepta. La base se amplía
  // antes que la app, así que acá pueden sobrar códigos, nunca faltar.
  const ofrecidas=Object.keys(vm.runInNewContext(leer('src/data/universidades.js')+';TENANTS'));
  for(const codigo of ofrecidas)
    assert.equal((await q('select public.codigo_universidad_perfil($1) c',[codigo]))[0].c,codigo,'la base no acepta '+codigo);

  // El archivo de origen completo, de nuevo, no deshace el delta.
  await db.exec(leer('supabase/universidades_reportes.sql'));
  assert.equal((await q("select universidad from profiles where id=$1",[u(1)]))[0].universidad,'usach');
  console.log('OK universidades de Chile en SQL: '+deOrigen.length+' códigos de registro básico, delta reaplicable, perfil nuevo y perfiles anteriores');
}catch(e){console.error(e);process.exit(1);}})();
