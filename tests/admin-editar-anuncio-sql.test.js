// PostgreSQL sintético: edición MFA, lista blanca, integridad y aviso privado.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {PGlite}=require('@electric-sql/pglite');
const read=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
const id=n=>`00000000-0000-0000-0000-${String(n).padStart(12,'0')}`;
const ADMIN=id(901),PROF=id(902),OTRO=id(903),AVISO=id(904),AJENO=id(905),FALTA=id(906);
const campos=['titulo','descripcion','precio_clp','pack_clases','modalidad','modalidad_otra','ubicacion','ubicacion_otra','detalles','linea_datos','contacto_tipo','contacto_valor','ramos_siglas','tenant','criterios','tipo'];
(async()=>{
 const db=new PGlite(),q=async(s,p=[])=>(await db.query(s,p)).rows;
 const sesion=(uid,aal='aal2')=>q("select set_config('request.jwt.claim.sub',$1,false),set_config('audit.aal',$2,false)",[uid,aal]);
 const editar=async(datos,anuncio=AVISO)=>(await q('select admin_editar_anuncio($1,$2) ok',[anuncio,JSON.stringify(datos)]))[0].ok;
 const avisos=()=>q('select * from mis_anuncios_editados_gradehub()');
 const visto=async(anuncio,accion)=>(await q('select marcar_edicion_anuncio_vista($1,$2) ok',[anuncio,accion]))[0].ok;
 const acciones=()=>q("select id,admin_id,accion,objetivo,detalle from admin.acciones where accion='editar_anuncio' order by id");
 const intacto=async()=>{
  const r={};
  r.anuncios=await q('select to_jsonb(a)-$1::text[] fila from tutor_anuncios a order by id',[campos]);
  for(const t of ['public.anuncio_campanas','public.anuncio_alcance','public.anuncio_interacciones','public.anuncio_metricas','admin.cobros','admin.anuncio_publicaciones'])r[t]=await q(`select to_jsonb(a) fila from ${t} a order by to_jsonb(a)::text`);
  return r;
 };
 try{
  await db.exec(read('bin/supabase-stubs.sql'));
  await db.exec(`create function auth.jwt() returns jsonb language sql stable as $$ select jsonb_build_object('aal',coalesce(current_setting('audit.aal',true),'aal1')) $$; create table public.user_ramos(user_id uuid);`);
  for(const f of ['clases_particulares','admin_clases','administradores','clases_pack_descuento'])await db.exec(read('supabase/'+f+'.sql'));
  for(const u of [ADMIN,PROF,OTRO])await q('insert into auth.users(id) values($1)',[u]);
  await q('insert into admin.administradores(user_id) values($1)',[ADMIN]);
  await q('insert into user_ramos values($1)',[OTRO]);
  for(const u of [PROF,OTRO])await q("insert into tutor_perfiles(user_id,nombre_publico,presentacion,estado,revisado_at) values($1,'Profesor sintético','Descripción de prueba completamente ficticia','aprobado',now())",[u]);
  for(const [a,u] of [[AVISO,PROF],[AJENO,OTRO]])await q(`insert into tutor_anuncios(id,autor_id,tenant,ramos_siglas,precio_clp,titulo,descripcion,contacto_tipo,contacto_valor) values($1,$2,'uc',array['TEST100'],15000,'Clase sintética','Descripción de prueba completamente ficticia','whatsapp','56900000000')`,[a,u]);
  await q('insert into anuncio_campanas(anuncio_id,dias,tope_clp) values($1,10,50000)',[AVISO]);
  await q("update tutor_anuncios set estado='en_revision' where id=$1",[AVISO]);
  await sesion(ADMIN);await q('select admin_publicar_anuncio($1)',[AVISO]);
  await q("select admin_descuento_codigo_anuncio($1,5,'PRUEBA')",[AVISO]);
  const publicado=(await q('select publicado_at from tutor_anuncios where id=$1',[AVISO]))[0].publicado_at;
  await q("select admin_marcar_cobro_publicacion($1,$2,'deuda',1200)",[AVISO,publicado]);
  await sesion(OTRO);await q("select registrar_alcance_anuncio($1,'lista')",[AVISO]);
  const antes=await intacto();
  await db.exec('set role anon');await assert.rejects(editar({titulo:'Otra clase'}),/permission denied/);
  await assert.rejects(avisos(),/permission denied/);await assert.rejects(visto(AVISO,1),/permission denied/);
  await db.exec('reset role; set role authenticated');
  for(const [uid,aal] of [['','aal2'],[PROF,'aal2'],[OTRO,'aal2'],[ADMIN,'aal1']]){
   await sesion(uid,aal);await assert.rejects(editar({titulo:'Otra clase'}),/sin acceso/);
  }
  await sesion(ADMIN);
  for(const datos of [null,[],true,'hola'])await assert.rejects(editar(datos),/objeto/);
  for(const k of ['estado','publicado_at','vence_at','autor_id','flyer_path','medicion_desde','detenido_at','descuento_gradehub_pct','codigo_descuento','campana','cobro','inesperado'])await assert.rejects(editar({[k]:null}),/campo no permitido/);
  assert.equal(await editar({},null),false,'probe sin escritura');
  assert.equal(await editar({titulo:'Otra clase'},FALTA),false);
  assert.equal(await editar({}),false);assert.equal(await editar({precio_clp:15000}),false);
  for(const datos of [{contacto_valor:'!'},{precio_clp:-1},{ramos_siglas:[]},{ramos_siglas:['TEST1','TEST2','TEST3']}])await assert.rejects(editar(datos),/check|constraint|cada anuncio/i,'mandan los checks y triggers de la tabla');
  await db.exec('reset role');assert.deepEqual(await acciones(),[],'errores y no-op sin auditoría');
  await db.exec('set role authenticated');await sesion(ADMIN);
  assert.equal(await editar({titulo:'Cálculo con ejercicios',precio_clp:18000}),true);
  assert.equal(await editar({titulo:'Cálculo con ejercicios',precio_clp:18000}),false);
  await db.exec('reset role');
  const log=(await acciones())[0];
  assert.deepEqual({...log,id:0},{id:0,admin_id:ADMIN,accion:'editar_anuncio',objetivo:AVISO,detalle:{titulo:{antes:'Clase sintética',despues:'Cálculo con ejercicios'},precio_clp:{antes:15000,despues:18000}}});
  assert.deepEqual(await intacto(),antes,'estado, fechas, autor, imágenes, descuento, código, campaña, medición y cobros intactos');
  // Todos los campos comerciales admitidos, con tipos reales.
  const datos={titulo:'Nuevo título sintético',descripcion:'Descripción nueva que conserva todos los requisitos',precio_clp:20000,pack_clases:4,modalidad:'otra',modalidad_otra:'Grupos pequeños',ubicacion:'otra',ubicacion_otra:'Biblioteca',detalles:[{etiqueta:'Duración',valor:'90 minutos'}],linea_datos:['precio','detalle:Duración'],contacto_tipo:'whatsapp',contacto_valor:'56911111111',ramos_siglas:['TEST200'],tenant:'fen',criterios:{promedioMenorA:4,avanceMinimo:10},tipo:'clase'};
  assert.equal(await editar(datos),true);
  const guardado=(await q('select * from tutor_anuncios where id=$1',[AVISO]))[0];for(const k of campos)assert.deepEqual(guardado[k],datos[k],k);
  // Cada estado solicitado conserva exactamente su estado y sus fechas.
  for(const estado of ['borrador','en_revision','pausado']){
   await q('update tutor_anuncios set estado=$1 where id=$2',[estado,AVISO]);
   const fijo=await intacto();assert.equal(await editar({titulo:'Corrección '+estado}),true);assert.deepEqual(await intacto(),fijo);
  }
  await q("update tutor_anuncios set estado='eliminado' where id=$1",[AJENO]);await assert.rejects(editar({titulo:'No editable'},AJENO),/no se puede editar/);
  await q("update tutor_anuncios set estado='borrador' where id=$1",[AJENO]);assert.equal(await editar({titulo:'Corrección del otro profesor'},AJENO),true);
  await db.exec('set role authenticated');await sesion(PROF);
  const propios=await avisos();assert.equal(propios.length,1);assert.equal(propios[0].anuncio_id,AVISO);assert.deepEqual(Object.keys(propios[0]).sort(),['accion_id','anuncio_id','editado_at']);
  await assert.rejects(q('select * from admin.acciones'),/permission denied/);
  await assert.rejects(q('select * from admin.ediciones_anuncio_vistas'),/permission denied/);
  assert.equal(await visto(AJENO,propios[0].accion_id),false,'ni marcar anuncios ajenos');
  await sesion(OTRO);assert.equal((await avisos())[0].anuncio_id,AJENO);assert.equal(await visto(AVISO,propios[0].accion_id),false);
  await sesion(ADMIN);assert.equal(await editar({titulo:'Corrección posterior'}),true);
  await sesion(PROF);assert.equal(await visto(AVISO,propios[0].accion_id),true);
  const reciente=(await avisos())[0];assert(reciente.accion_id>propios[0].accion_id,'abrir una edición anterior no tapa la nueva');
  assert.equal(await visto(AVISO,reciente.accion_id),true);assert.deepEqual(await avisos(),[]);
  assert.equal(await visto(AVISO,propios[0].accion_id),true);assert.deepEqual(await avisos(),[],'acuse monotónico');
  await db.exec('reset role');
  const conservado=await intacto(),logs=await acciones();
  for(let i=0;i<2;i++)await db.exec(read('supabase/administradores.sql'));
  assert.deepEqual(await intacto(),conservado);assert.deepEqual(await acciones(),logs);await sesion(PROF);assert.deepEqual(await avisos(),[],'reaplicar conserva acuses');
  const rls=await q("select relrowsecurity ok from pg_class where oid='admin.ediciones_anuncio_vistas'::regclass");assert.equal(rls[0].ok,true);
  await q('delete from auth.users where id=$1',[PROF]);
  assert.deepEqual(await q('select * from admin.ediciones_anuncio_vistas'),[],'el borrado de la cuenta elimina sus acuses');
  console.log('OK edición admin SQL: MFA, whitelist, checks, integridad, auditoría, aviso propio, acuse, reaplicación y borrado');
 }finally{await db.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
