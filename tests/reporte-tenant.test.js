// #720: un tenant enviado desde una pestaña vieja no puede contaminar el
// consenso. Los reportes heredados incompatibles se excluyen sin borrarlos.
// Todo se prueba en PGlite con cuentas y pautas sintéticas.
const fs=require('fs'),path=require('path');
const {PGlite}=require('@electric-sql/pglite');
const raiz=path.join(__dirname,'..');
const J=JSON.stringify;
let ok=0,fail=0;
const chk=(nombre,condicion)=>{
  if(condicion){ok++;console.log('  OK   '+nombre);}
  else{fail++;console.log('  FAIL '+nombre);}
};
const ids={
  a:'00000000-0000-0000-0000-0000000000a1',
  b:'00000000-0000-0000-0000-0000000000b1',
  c:'00000000-0000-0000-0000-0000000000c1',
  perfilErrado:'00000000-0000-0000-0000-0000000000d1',
  estadoErrado:'00000000-0000-0000-0000-0000000000e1',
  derecho:'00000000-0000-0000-0000-0000000000f1',
  sinOnboarding:'00000000-0000-0000-0000-0000000000a2',
};
const estructura=[{nombre:'Control',peso:40},{nombre:'Examen',peso:60}];

(async()=>{
  const db=new PGlite();
  await db.exec(fs.readFileSync(path.join(raiz,'bin/supabase-stubs.sql'),'utf8'));
  await db.exec(`create table public.catalogo_uc(sigla text primary key,nombre text not null,creditos integer,busqueda text not null);
    create table public.user_ramos(user_id uuid primary key references auth.users(id),data jsonb not null);
    create table public.profiles(id uuid primary key references auth.users(id),universidad text);
    create table public.catalog_reports(id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id),
      tenant text not null,carrera text,ramo text not null,ramo_norm text not null,estructura jsonb not null,
      huella text not null,nota text,created_at timestamptz default now());`);
  const sql=fs.readFileSync(path.join(raiz,'supabase/catalog_consensus.sql'),'utf8');
  await db.exec(sql);
  await db.exec(sql);

  const crear=async(id,tenant,universidad,onboardingDone=true)=>{
    await db.query('insert into auth.users(id) values ($1)',[id]);
    await db.query('insert into public.user_ramos(user_id,data) values ($1,$2::jsonb)',
      [id,J({tenant,onboardingDone,ramos:[]})]);
    await db.query('insert into public.profiles(id,universidad) values ($1,$2)',[id,universidad]);
  };
  for(const id of [ids.a,ids.b,ids.c])await crear(id,'fen','U. de Chile · FEN');
  // Caso observado: el perfil dice UAndes, pero el estado y el reporte dicen FEN.
  await crear(ids.perfilErrado,'fen','U. de los Andes');
  await crear(ids.estadoErrado,'uandes','U. de los Andes');
  await crear(ids.derecho,'uc','U. Católica · Ingeniería');
  await crear(ids.sinOnboarding,'fen','U. de Chile · FEN',false);

  const reportar=async(id,tenant)=>{
    await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]);
    await db.query(`select public.submit_catalog_report($1,'IC','Curso sintético','curso sintetico',null,$2::jsonb,'h',null)`,
      [tenant,J(estructura)]);
  };
  const rechazado=async(id,tenant)=>{
    try{await reportar(id,tenant);return false;}catch(e){return /universidad del reporte/.test(e.message);}
  };

  console.log('\n=== El servidor valida el tenant antes de guardar ===');
  chk('rechaza perfil UAndes con reporte FEN',await rechazado(ids.perfilErrado,'fen'));
  chk('rechaza estado UAndes con reporte FEN',await rechazado(ids.estadoErrado,'fen'));
  chk('rechaza cuenta sin onboarding sincronizado',await rechazado(ids.sinOnboarding,'fen'));
  await reportar(ids.a,'fen');
  chk('acepta un reporte FEN consistente',
    (await db.query('select count(*)::int n from public.catalog_reports')).rows[0].n===1);
  await reportar(ids.derecho,'uc');
  chk('el nombre histórico del perfil UC admite Derecho y otras carreras',
    (await db.query("select count(*)::int n from public.catalog_reports where tenant='uc'")).rows[0].n===1);

  console.log('\n=== Los reportes heredados incompatibles no cuentan ===');
  const huella=(await db.query('select public.huella_catalogo($1::jsonb) h',[J(estructura)])).rows[0].h;
  const legado=async(id)=>db.query(`insert into public.catalog_reports
    (user_id,tenant,carrera,ramo,ramo_norm,estructura,huella)
    values ($1,'fen','','Curso sintético','curso sintetico',$2::jsonb,$3)`,[id,J(estructura),huella]);
  await legado(ids.b);
  await legado(ids.perfilErrado);
  await legado(ids.estadoErrado);
  await legado(ids.sinOnboarding);
  const consenso=async()=>(await db.query("select * from public.catalog_consensus('fen')")).rows;
  chk('dos aportes válidos y tres incompatibles no crean consenso',(await consenso()).length===0);
  await legado(ids.c);
  const resultado=await consenso();
  chk('el consenso cuenta solo tres cuentas consistentes',resultado.length===1&&resultado[0].respaldos===3);
  chk('ningún reporte heredado se borra ni se reetiqueta',
    (await db.query("select count(*)::int n from public.catalog_reports where tenant='fen'")).rows[0].n===6);

  console.log(`\nPASS: ${ok}   FAIL: ${fail}`);
  process.exit(fail?1:0);
})().catch(e=>{console.error(e);process.exit(1);});
