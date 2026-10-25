// El alcance diario del panel (supabase/admin_estadisticas.sql) con PostgreSQL
// real en memoria y cuentas sintéticas: suma bien por día, rellena los días sin
// nada con cero, no devuelve cuentas ni anuncios y exige admin con segundo factor.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {PGlite}=require('@electric-sql/pglite');
const raiz=path.join(__dirname,'..'),leer=f=>fs.readFileSync(path.join(raiz,f),'utf8');
const db=new PGlite(),uid=n=>`00000000-0000-0000-0000-${String(n).padStart(12,'0')}`;
const q=async(sql,args=[])=>(await db.query(sql,args)).rows;
const login=async(n,aal)=>{
  await db.query("select set_config('request.jwt.claim.sub',$1,false)",[n?uid(n):'']);
  await db.query("select set_config('request.jwt.claim.aal',$1,false)",[aal||'aal1']);
};
(async()=>{try{
  await db.exec(leer('bin/supabase-stubs.sql'));
  // Solo lo que la función lee: las dos tablas de medición y la llave de admin.
  await db.exec(`create table public.anuncio_alcance(anuncio_id uuid, user_id uuid, dia date not null default current_date);
    create table public.anuncio_interacciones(anuncio_id uuid, user_id uuid, tipo text, dia date not null default current_date);
    create function public.administrador_verificado() returns boolean language sql stable as
      $$select auth.uid()='${uid(1)}'::uuid and current_setting('request.jwt.claim.aal',true)='aal2'$$;`);
  const sql=leer('supabase/admin_estadisticas.sql');await db.exec(sql);await db.exec(sql);
  const a1=uid(101),a2=uid(102);
  await db.query(`insert into anuncio_alcance(anuncio_id,user_id,dia) values
    ($1,$3,current_date),($2,$3,current_date),($1,$4,current_date),($1,$5,current_date-2),($1,$4,current_date-40)`,[a1,a2,uid(2),uid(3),uid(4)]);
  await db.query(`insert into anuncio_interacciones(anuncio_id,user_id,tipo,dia) values
    ($1,$2,'apertura',current_date),($1,$3,'apertura',current_date),($1,$2,'contacto',current_date),($1,$4,'apertura',current_date-2)`,[a1,uid(2),uid(3),uid(4)]);

  await login(0);await assert.rejects(q('select public.admin_alcance_diario()'),/segundo factor/,'sin sesión');
  await login(1,'aal1');await assert.rejects(q('select public.admin_alcance_diario()'),/segundo factor/,'admin sin MFA');
  await login(2,'aal2');await assert.rejects(q('select public.admin_alcance_diario()'),/segundo factor/,'no admin con MFA');
  await db.exec('set role anon');await assert.rejects(q('select public.admin_alcance_diario()'),/permission denied/);await db.exec('reset role');

  await login(1,'aal2');
  const filas=(await q('select public.admin_alcance_diario() as f'))[0].f;
  const hoy=(await q('select current_date::text d'))[0].d,antier=(await q('select (current_date-2)::text d'))[0].d;
  assert.equal(filas.length,30,'30 días por defecto, incluido hoy');
  assert.equal(filas[29].dia,hoy,'termina hoy y va de lo antiguo a lo nuevo');
  assert.deepEqual(filas[29],{dia:hoy,vieron:3,abrieron:2,contactaron:1},'suma todos los anuncios del día');
  assert.deepEqual(filas.find(f=>f.dia===antier),{dia:antier,vieron:1,abrieron:1,contactaron:0});
  assert.equal(filas.filter(f=>f.vieron||f.abrieron||f.contactaron).length,2,'un día sin nada vale cero y lo de hace 40 días no entra');
  assert(!JSON.stringify(filas).includes('00000000-'),'solo devuelve totales: ni cuentas ni anuncios');
  assert.equal((await q('select public.admin_alcance_diario(1) as f'))[0].f.length,7,'pide al menos una semana');
  assert.equal((await q('select public.admin_alcance_diario(5000) as f'))[0].f.length,90,'y a lo más 90 días');
  console.log('PASS alcance diario: suma por día, ceros, límites, MFA y solo agregados');
}finally{await db.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
