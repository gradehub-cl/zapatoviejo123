// El descuento lo fija GradeHub. Contrato real en PostgreSQL sintético:
// MFA, permisos de columna, auditoría, no-op y publicación intacta.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {PGlite}=require('@electric-sql/pglite');
const read=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
const id=n=>`00000000-0000-0000-0000-${String(n).padStart(12,'0')}`;
const ADMIN=id(801),PROF=id(802),ALUMNO=id(803),AVISO=id(804),FALTA=id(805);
(async()=>{
 const db=new PGlite();
 const q=async(s,p=[])=>(await db.query(s,p)).rows;
 const sesion=(uid,aal='aal2')=>db.query("select set_config('request.jwt.claim.sub',$1,false),set_config('audit.aal',$2,false)",[uid,aal]);
 const editar=async pct=>(await q('select public.admin_descuento_anuncio($1,$2) ok',[AVISO,pct]))[0].ok;
 const acciones=()=>q("select admin_id,accion,objetivo,detalle from admin.acciones where accion='descuento_anuncio' order by id");
 const intacto=async()=>{
  const tablas={};
  for(const t of ['public.tutor_anuncios','public.anuncio_campanas','public.anuncio_alcance','public.anuncio_interacciones','public.anuncio_metricas','admin.cobros','admin.anuncio_publicaciones']){
   tablas[t]=await q(t==='public.tutor_anuncios'?"select to_jsonb(a)-'descuento_gradehub_pct' fila from public.tutor_anuncios a order by id":`select to_jsonb(a) fila from ${t} a order by to_jsonb(a)::text`);
  }
  return tablas;
 };
 try{
  await db.exec(read('bin/supabase-stubs.sql'));
  await db.exec(`create function auth.jwt() returns jsonb language sql stable as $$ select jsonb_build_object('aal',coalesce(current_setting('audit.aal',true),'aal1')) $$;
    create table public.user_ramos(user_id uuid);`);
  for(const f of ['clases_particulares','admin_clases','administradores','clases_pack_descuento'])await db.exec(read('supabase/'+f+'.sql'));
  for(const uid of [ADMIN,PROF,ALUMNO])await q('insert into auth.users(id) values($1)',[uid]);
  await q('insert into admin.administradores(user_id) values($1)',[ADMIN]);
  await q("insert into user_ramos values($1)",[ALUMNO]);
  await q(`insert into tutor_perfiles(user_id,nombre_publico,presentacion,estado,revisado_at)
    values($1,'Profesor sintético','Descripción ficticia de más de veinte caracteres','aprobado',now())`,[PROF]);
  await q(`insert into tutor_anuncios(id,autor_id,tenant,ramos_siglas,modalidad,ubicacion,precio_clp,titulo,descripcion,contacto_tipo,contacto_valor)
    values($1,$2,'uc',array['TEST100'],'individual','online',15000,'Anuncio sintético','Descripción ficticia de más de veinte caracteres','whatsapp','56900000000')`,[AVISO,PROF]);
  await q('insert into anuncio_campanas(anuncio_id,dias,tope_clp) values($1,10,50000)',[AVISO]);
  await q("update tutor_anuncios set estado='en_revision' where id=$1",[AVISO]);
  await sesion(ADMIN);await q('select admin_publicar_anuncio($1)',[AVISO]);
  await sesion(ALUMNO);await q("select registrar_alcance_anuncio($1,'lista')",[AVISO]);
  await sesion(ADMIN);const publicado=(await q('select publicado_at from tutor_anuncios where id=$1',[AVISO]))[0].publicado_at;
  await q("select admin_marcar_cobro_publicacion($1,$2,'deuda',1200)",[AVISO,publicado]);
  const antes=await intacto();
  assert.equal((await q('select descuento_gradehub_pct v from tutor_anuncios where id=$1',[AVISO]))[0].v,null,'no altera anuncios existentes al instalar');
  await db.exec('set role anon');
  await assert.rejects(editar(5),/permission denied/,'anon no ejecuta la función');
  await db.exec('reset role');
  await db.exec('set role authenticated');
  for(const [uid,aal] of [['','aal2'],[PROF,'aal2'],[ALUMNO,'aal2'],[ADMIN,'aal1']]){
   await sesion(uid,aal);await assert.rejects(editar(5),/sin acceso/,'solo admin con MFA');
  }
  await sesion(ADMIN);
  assert.equal(await editar(null),false,'quitar cuando ya no tiene es no-op');
  for(const pct of [-2147483648,-1,0,51,2147483647])await assert.rejects(editar(pct),/1 a 50/);
  await assert.rejects(q('select admin_descuento_anuncio($1,$2)',[AVISO,1.5]),/integer/,'el servidor rechaza fracciones');
  assert.equal((await q('select admin_descuento_anuncio($1,5) ok',[FALTA]))[0].ok,false,'no existe');
  assert.equal((await q('select admin_descuento_anuncio(null,null) ok'))[0].ok,false,'la consulta de disponibilidad no cambia nada');
  await db.exec('reset role');
  assert.deepEqual(await acciones(),[],'ni errores ni no-op generan registro');
  await db.exec('set role authenticated');
  for(let pct=1;pct<=50;pct++)assert.equal(await editar(pct),true,'admite todo el rango 1–50');
  assert.equal(await editar(50),false,'no registra dos veces el mismo valor');
  assert.equal(await editar(null),true,'quita el descuento');
  assert.equal(await editar(null),false,'null repetido no cambia');
  await db.exec('reset role');
  const historial=await acciones();
  assert.equal(historial.length,51);
  assert.deepEqual(historial[0],{admin_id:ADMIN,accion:'descuento_anuncio',objetivo:AVISO,detalle:{pct:1,antes:null}});
  assert.deepEqual(historial[49].detalle,{pct:50,antes:49});
  assert.deepEqual(historial[50].detalle,{pct:null,antes:50});
  assert.deepEqual(await intacto(),antes,'solo cambia el descuento: estado, fechas, medición y cobros idénticos');
  await sesion(PROF);await db.exec('set role authenticated');
  assert.equal((await q('select id from tutor_anuncios where id=$1',[AVISO])).length,1,'el profesor sí puede leer su anuncio');
  await assert.rejects(q('update tutor_anuncios set descuento_gradehub_pct=5 where id=$1',[AVISO]),/permission denied/);
  await assert.rejects(q('select admin.descuento_anuncio($1,5)',[AVISO]),/permission denied/,'tampoco accede al helper de SQL Editor');
  await assert.rejects(q('select * from admin.acciones'),/permission denied/,'la auditoría sigue privada');
  await db.exec('reset role');await sesion(ADMIN);await editar(5);
  const datosAntes=await q('select * from tutor_anuncios where id=$1',[AVISO]),logsAntes=await acciones();
  const helperAntes=(await q("select pg_get_functiondef('admin.descuento_anuncio(uuid,integer)'::regprocedure) s"))[0].s;
  for(let i=0;i<2;i++)await db.exec(read('supabase/administradores.sql'));
  assert.deepEqual(await q('select * from tutor_anuncios where id=$1',[AVISO]),datosAntes,'reaplicar no cambia anuncios');
  assert.deepEqual(await acciones(),logsAntes,'ni agrega registros');
  assert.equal((await q("select pg_get_functiondef('admin.descuento_anuncio(uuid,integer)'::regprocedure) s"))[0].s,helperAntes,'el helper del SQL Editor se conserva');
  assert.equal((await q("select has_function_privilege('anon','public.admin_descuento_anuncio(uuid,integer)','execute') v"))[0].v,false);
  assert.equal((await q("select has_function_privilege('authenticated','public.admin_descuento_anuncio(uuid,integer)','execute') v"))[0].v,true);
  assert.equal((await q("select has_column_privilege('authenticated','public.tutor_anuncios','descuento_gradehub_pct','update') v"))[0].v,false);
  await db.exec('set role authenticated');assert.equal(await editar(6),true,'la RPC sigue funcionando después de reaplicar');await db.exec('reset role');
  console.log('OK descuento admin SQL: MFA, rango completo, no-op, auditoría, datos intactos, permisos y reaplicación');
 }finally{await db.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
