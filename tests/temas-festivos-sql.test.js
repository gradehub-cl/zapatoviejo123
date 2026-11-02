const fs=require('fs'),assert=require('node:assert/strict');
const {PGlite}=require('@electric-sql/pglite');
const leer=f=>fs.readFileSync(__dirname+'/../'+f,'utf8');
const db=new PGlite(),q=async(sql,p=[])=>(await db.query(sql,p)).rows;
const [admin,alumno]=['00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000002'];
async function sesion(uid,aal='aal1'){
  await db.exec('reset role');await q("select set_config('request.jwt.claim.sub',$1,false),set_config('test.aal',$2,false),set_config('test.session','s',false)",[uid,aal]);await db.exec('set role authenticated');
}
const activo=async()=>(await q('select tema_festivo_activo() t'))[0].t;
(async()=>{try{
  await db.exec(leer('bin/supabase-stubs.sql'));
  await db.exec(`create function auth.jwt() returns jsonb language sql stable as $$ select jsonb_build_object('aal',current_setting('test.aal',true),'session_id',current_setting('test.session',true)) $$;
    create table public.profiles(id uuid primary key references auth.users(id),universidad text);
    create table public.user_ramos(user_id uuid primary key references auth.users(id) on delete cascade,data jsonb not null default '{}'::jsonb);`);
  for(const f of ['clases_particulares','admin_clases','administradores'])await db.exec(leer('supabase/'+f+'.sql'));
  await db.exec(leer('supabase/temas_festivos.sql'));
  for(const id of [admin,alumno])await q('insert into auth.users(id) values($1)',[id]);
  await q('insert into admin.administradores(user_id) values($1)',[admin]);

  await db.exec('set role anon');assert.equal(await activo(),null,'parte apagado');
  await sesion(alumno);await assert.rejects(q("select admin_tema_festivo('halloween')"),/sin acceso/);
  await assert.rejects(q('select * from admin.tema_festivo'),/permission denied/);
  await sesion(admin);await assert.rejects(q("select admin_tema_festivo('halloween')"),/sin acceso/,'sin segundo factor no');
  await sesion(admin,'aal2');
  await assert.rejects(q("select admin_tema_festivo('pascua')"),/desconocido/);
  await q("select admin_tema_festivo('halloween')");
  await db.exec('reset role');await db.exec(leer('supabase/temas_festivos.sql'));
  await db.exec('set role anon');assert.equal(await activo(),'halloween','reaplicar no apaga el tema');
  await sesion(admin,'aal2');await q('select admin_tema_festivo(null)');
  await sesion(alumno);assert.equal(await activo(),null);
  console.log('temas-festivos-sql OK');
}catch(e){console.error(e);process.exit(1);}})();
