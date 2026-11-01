// La base de producción ya tiene las tablas con la lista de universidades
// anterior, y `create table if not exists` no la cambia. Este test parte de
// ese estado, vuelve a aplicar los archivos como se hace en producción y
// comprueba que una cuenta UDD puede informar al profesor de su sección,
// responder encuestas y ser público de una. PGlite y datos sintéticos.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {PGlite}=require('@electric-sql/pglite');
const leer=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
const db=new PGlite(),q=async(sql,p=[])=>(await db.query(sql,p)).rows;
const u=i=>'00000000-0000-4000-8000-'+String(i).padStart(12,'0');
async function sesion(uid,aal='aal1'){
  await db.exec('reset role');
  await q("select set_config('request.jwt.claim.sub',$1,false),set_config('test.aal',$2,false),set_config('test.session','s-1',false)",[uid,aal]);
  await db.exec('set role authenticated');
}
// El check como estaba antes de la UDD, con el nombre que le dio Postgres.
async function checkAnterior(tabla,columna,valores){
  await db.exec(`alter table public.${tabla} drop constraint ${tabla}_${columna}_check;
    alter table public.${tabla} add constraint ${tabla}_${columna}_check check (${columna} in (${valores}))`);
}
(async()=>{try{
  await db.exec(leer('bin/supabase-stubs.sql'));
  await db.exec(`create function auth.jwt() returns jsonb language sql stable as $$ select jsonb_build_object('aal',current_setting('test.aal',true),'session_id',current_setting('test.session',true)) $$;
    create table public.profiles(id uuid primary key references auth.users(id),universidad text);
    create table public.user_ramos(user_id uuid primary key references auth.users(id) on delete cascade,data jsonb not null default '{}'::jsonb);`);
  for(const f of ['clases_particulares','admin_clases','administradores','encuestas','profesores'])await db.exec(leer('supabase/'+f+'.sql'));
  const viejas="'uc','fen','uai','uandes'";
  for(const t of ['profesor_aportes','profesor_calificaciones','profesor_ocultos'])await checkAnterior(t,'tenant',viejas);
  await checkAnterior('encuestas','publico',"'todos',"+viejas);
  await checkAnterior('encuesta_respuestas','universidad',viejas);
  for(const f of ['encuestas','profesores'])await db.exec(leer('supabase/'+f+'.sql'));

  const [admin,alumna]=[u(1),u(2)];
  for(const id of [admin,alumna])await q('insert into auth.users(id) values($1)',[id]);
  await q("update auth.users set created_at='2020-01-01'");
  await q('insert into admin.administradores(user_id) values($1)',[admin]);
  await q("insert into profiles values($1,'U. del Desarrollo')",[alumna]);
  const ramo={id:'ramo-udd',nombre:'Lectura Crítica',seccion:3,origen:{tenant:'udd',carrera:'UDD-DERECHO',ramoKey:'lectura critica'},categorias:[]};
  await q('insert into user_ramos(user_id,data) values($1,$2)',[alumna,JSON.stringify({tenant:'udd',ramos:[ramo]})]);

  // Profesor de la sección: antes respondía "no sincronizados" a toda cuenta UDD.
  const periodo=(await q('select profesor_periodo_actual() p'))[0].p;
  await sesion(alumna);
  await q('select profesor_docente_informar($1,$2,$3,$4)',['ramo-udd',3,periodo,'Docente Sintético']);
  assert.equal((await q('select * from profesor_docente_estado($1,$2,$3)',['ramo-udd',3,periodo]))[0].mi_nombre,'Docente Sintético');
  await db.exec('reset role');
  assert.equal((await q('select tenant from profesor_aportes'))[0].tenant,'udd');

  // Encuestas: la UDD es público y responde.
  await sesion(alumna);
  assert.equal((await q('select encuestas_universidad() t'))[0].t,'udd');
  const hoy=(await q("select (now() at time zone 'America/Santiago')::date::text h"))[0].h;
  await sesion(admin,'aal2');
  const id=(await q("select admin_crear_encuesta('Pregunta sintética','una',array['Uno','Dos'],'udd',$1::date,$1::date) id",[hoy]))[0].id;
  await sesion(alumna);
  await q('select responder_encuesta($1,$2)',[id,[2]]);
  await db.exec('reset role');
  assert.equal((await q('select universidad from encuesta_respuestas'))[0].universidad,'udd');
  console.log('OK UDD en SQL: el archivo reaplicado amplía los checks existentes; sección docente y encuestas');
}catch(e){console.error(e);process.exit(1);}})();
