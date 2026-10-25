// Código de descuento (Lucas, 2026-10-25): «−10% con el código XXX». Contrato
// en PostgreSQL sintético: solo un admin con MFA, sin descuento no hay código,
// el profesor lo lee pero no lo escribe, y quitar el descuento lo quita.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {PGlite}=require('@electric-sql/pglite');
const read=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
const id=n=>`00000000-0000-0000-0000-${String(n).padStart(12,'0')}`;
const ADMIN=id(901),PROF=id(902),AVISO=id(904);
(async()=>{
 const db=new PGlite();
 const q=async(s,p=[])=>(await db.query(s,p)).rows;
 const sesion=(uid,aal='aal2')=>db.query("select set_config('request.jwt.claim.sub',$1,false),set_config('audit.aal',$2,false)",[uid,aal]);
 const falla=async(s,p=[])=>{try{await db.query(s,p);return null;}catch(e){return e.message;}};
 const fila=async()=>(await q('select descuento_gradehub_pct pct,codigo_descuento codigo,estado from tutor_anuncios where id=$1',[AVISO]))[0];
 const poner=async(pct,codigo)=>(await q('select admin_descuento_codigo_anuncio($1,$2,$3) ok',[AVISO,pct,codigo]))[0].ok;
 try{
  await db.exec(read('bin/supabase-stubs.sql'));
  await db.exec(`create function auth.jwt() returns jsonb language sql stable as $$ select jsonb_build_object('aal',coalesce(current_setting('audit.aal',true),'aal1')) $$;
    create table public.user_ramos(user_id uuid);`);
  for(const f of ['clases_particulares','admin_clases','administradores'])await db.exec(read('supabase/'+f+'.sql'));
  for(const uid of [ADMIN,PROF])await q('insert into auth.users(id) values($1)',[uid]);
  await q('insert into admin.administradores(user_id) values($1)',[ADMIN]);
  await q(`insert into tutor_perfiles(user_id,nombre_publico,presentacion,estado,revisado_at)
    values($1,'Profesor sintético','Descripción ficticia de más de veinte caracteres','aprobado',now())`,[PROF]);
  await q(`insert into tutor_anuncios(id,autor_id,tenant,ramos_siglas,modalidad,ubicacion,precio_clp,titulo,descripcion,contacto_tipo,contacto_valor)
    values($1,$2,'uc',array['TEST100'],'individual','online',15000,'Anuncio sintético','Descripción ficticia de más de veinte caracteres','whatsapp','56900000000')`,[AVISO,PROF]);
  assert.equal((await fila()).codigo,null,'ningún anuncio existente tiene código al instalar');

  await sesion(ADMIN,'aal1');
  assert.match(await falla('select admin_descuento_codigo_anuncio($1,10,$2)',[AVISO,'GRADEHUB']),/sin acceso/,'sin MFA, no');
  await sesion(PROF);
  assert.match(await falla('select admin_descuento_codigo_anuncio($1,10,$2)',[AVISO,'GRADEHUB']),/sin acceso/,'el profesor, no');
  await sesion(ADMIN);
  assert.equal(await poner(10,' gradehub '),true);
  assert.deepEqual(await fila(),{pct:10,codigo:'GRADEHUB',estado:'borrador'},'se guarda en mayúsculas y sin tocar el estado');
  assert.equal(await poner(10,'GRADEHUB'),false,'lo mismo de nuevo no hace nada');
  assert.match(await falla('select admin_descuento_codigo_anuncio($1,null,$2)',[AVISO,'GRADEHUB']),/necesita un descuento/);
  assert.match(await falla('select admin_descuento_codigo_anuncio($1,10,$2)',[AVISO,'con espacio']),/sin espacios/);
  assert.match(await falla('select admin_descuento_codigo_anuncio($1,10,$2)',[AVISO,'AB']),/3 a 20/);
  assert.match(await falla('select admin_descuento_codigo_anuncio($1,60,$2)',[AVISO,'GRADEHUB']),/1 a 50/);
  assert.equal(await poner(10,''),true,'vacío quita solo el código');
  assert.deepEqual(await fila(),{pct:10,codigo:null,estado:'borrador'});
  await poner(15,'SALVA15');
  assert.equal((await q('select admin_descuento_anuncio($1,null) ok',[AVISO]))[0].ok,true);
  assert.deepEqual(await fila(),{pct:null,codigo:null,estado:'borrador'},'quitar el descuento desde la RPC anterior también quita el código');
  const log=(await q("select detalle from admin.acciones where accion='descuento_anuncio' order by id"))[0].detalle;
  assert.deepEqual(log,{pct:10,codigo:'GRADEHUB',antes:null,codigo_antes:null},'queda registrado qué se cambió');
  assert.equal((await q('select admin_panel_clases() j'))[0].j[0].anuncios[0].codigo_descuento,null,'el panel trae el código');

  await sesion(PROF);await db.exec('set role authenticated');
  assert.match(await falla('update tutor_anuncios set codigo_descuento=$2 where id=$1',[AVISO,'TRAMPA']),/permission denied/,'el profesor no lo escribe');
  assert.equal((await q('select codigo_descuento from tutor_anuncios where id=$1',[AVISO])).length,1,'pero lo lee');
  await db.exec('reset role');
  assert.equal((await q("select has_column_privilege('anon','public.tutor_anuncios','codigo_descuento','select') v"))[0].v,true,'el catálogo público lo lee');
  assert.equal((await q("select has_function_privilege('anon','public.admin_descuento_codigo_anuncio(uuid,integer,text)','execute') v"))[0].v,false);
  for(const f of ['clases_particulares','administradores'])await db.exec(read('supabase/'+f+'.sql'));
  assert.equal((await q("select has_column_privilege('anon','public.tutor_anuncios','codigo_descuento','select') v"))[0].v,true,'reaplicar el archivo base conserva el permiso de lectura');
  console.log('OK código de descuento SQL: MFA, forma, sin descuento no hay código, permisos y reaplicación');
 }finally{await db.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
