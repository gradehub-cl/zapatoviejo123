// Datos inventados, PostgreSQL real en memoria. Nunca toca Supabase remoto.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {PGlite}=require('@electric-sql/pglite');
const leer=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
const id=n=>`00000000-0000-0000-0000-${String(n).padStart(12,'0')}`;
(async()=>{
 const db=new PGlite(),q=async(s,p=[])=>(await db.query(s,p)).rows;
 const sesion=(n,aal='aal2')=>q("select set_config('request.jwt.claim.sub',$1,false),set_config('audit.aal',$2,false)",[n?id(n):'',aal]);
 try{
  await db.exec(leer('bin/supabase-stubs.sql'));
  await db.exec(`create function auth.jwt() returns jsonb language sql stable as $$ select jsonb_build_object('aal',current_setting('audit.aal',true)) $$; create table public.user_ramos(user_id uuid);`);
  for(const f of ['clases_particulares','admin_clases','administradores','admin_estadisticas'])await db.exec(leer('supabase/'+f+'.sql'));
  for(const n of [1,2,3,4])await q('insert into auth.users(id) values($1)',[id(n)]);
  await q('insert into admin.administradores(user_id) values($1)',[id(1)]);
  await q("insert into tutor_perfiles(user_id,nombre_publico,presentacion,estado,revisado_at) values($1,'Docente inventado','Presentación de prueba suficientemente larga','aprobado',now())",[id(2)]);
  await q(`insert into tutor_anuncios(id,autor_id,tenant,ramos_siglas,modalidad,ubicacion,precio_clp,titulo,descripcion,contacto_tipo,contacto_valor)
   values($1,$2,'uc',array['TEST100'],'individual','online',12000,'Anuncio inventado','Descripción sintética suficientemente larga','whatsapp','56900000000')`,[id(10),id(2)]);
  // Dos publicaciones del mismo anuncio, una antigua y una vigente.
  for(const [n,dias] of [[3,150],[4,0]]){
   await q(`insert into anuncio_alcance(anuncio_id,user_id,publicacion,dia,vence_publicacion) values($1,$2,date_trunc('day',now())-make_interval(days=>$3),(now() at time zone \'America/Santiago\')::date-$3,date_trunc('day',now())-make_interval(days=>$3)+interval '1 day')`,[id(10),id(n),dias]);
   for(const tipo of ['apertura','contacto'])await q(`insert into anuncio_interacciones(anuncio_id,user_id,publicacion,dia,vence_publicacion,tipo) values($1,$2,date_trunc('day',now())-make_interval(days=>$3),(now() at time zone \'America/Santiago\')::date-$3,date_trunc('day',now())-make_interval(days=>$3)+interval '1 day',$4)`,[id(10),id(n),dias,tipo]);
  }
  await q("insert into anuncio_metricas(anuncio_id,dia,tipo,tenant,ramo_sigla,eventos,publicacion) select id,(now() at time zone \'America/Santiago\')::date,'impresion','uc','TEST100',1,medicion_desde from tutor_anuncios where id=$1",[id(10)]);
  const intacto=await q('select to_jsonb(a) a from tutor_anuncios a');
  const sql=leer('supabase/paneles_historial.sql');await db.exec(sql);await db.exec(sql);
  assert.deepEqual(await q('select to_jsonb(a) a from tutor_anuncios a'),intacto,'instalar no altera anuncios');
  for(const [n,aal] of [[0,'aal2'],[1,'aal1'],[2,'aal2'],[3,'aal2']]){
   await sesion(n,aal);await assert.rejects(q('select admin_historial_anuncios(null)'),/sin acceso|segundo factor/);
  }
  await sesion(1);await db.exec('set role authenticated');
  const historial=async()=>(await q('select admin_historial_anuncios(null) h'))[0].h;
  const antes=await historial();assert.equal(antes.length,2,'Inicio incluye más de 90 días');
  assert(antes.every(d=>d.vistas===1&&d.aperturas===1&&d.contactos===1));
  assert(antes.every(d=>!('user_id'in d)),'jamás devuelve cuentas de estudiantes');
  assert.equal((await q('select admin_historial_anuncios(1) h'))[0].h.length,1,'Hoy solo incluye hoy');
  assert.equal((await q('select admin_alcance_diario(null) h'))[0].h.length,151,'serie densa sin límite de 90');
  assert.equal((await q('select admin_alcance_diario(1) h'))[0].h.length,1);
  assert.equal((await q('select admin_alcance_diario(2147483647) h'))[0].h.length,151,'rango enorme no desborda fechas');
  for(const n of [0,-1])await assert.rejects(q('select admin_historial_anuncios($1)',[n]),/rango inválido/);
  await assert.rejects(q('select * from admin.anuncio_historial_diario'),/permission denied/);
  await assert.rejects(q('select limpiar_alcance_anuncios()'),/permission denied/);
  await sesion(3);await assert.rejects(q('select historial_anuncio($1,null)',[id(10)]),/sin acceso/);
  await sesion(2);const propio=(await q('select historial_anuncio($1,null) h',[id(10)]))[0].h;assert.equal(propio.length,2);
  const totales=await q('select * from totales_metricas_anuncio($1)',[id(10)]);
  assert.deepEqual(totales.map(x=>x.vista).sort(),['dia','total'],'totales desde primer evento; no publica el corte por ramo de una persona');
  assert.equal((await q('select * from resumen_metricas_anuncio($1)',[id(10)])).length,0,'desglose fino conserva el umbral');
  await db.exec('reset role');await sesion(1);
  await assert.rejects(q('select limpiar_alcance_anuncios(29)'),/mínimo/);
  await q('select limpiar_alcance_anuncios(90)');
  assert.equal((await q('select count(*)::int n from anuncio_alcance'))[0].n,1,'borra el identificador antiguo como antes');
  assert.deepEqual(await historial(),antes,'archivo y filas aún presentes no se duplican');
  await q('select limpiar_interacciones_anuncios(90)');
  assert.deepEqual(await historial(),antes,'limpiar ambas tablas conserva los agregados');
  await q('select limpiar_alcance_anuncios(90)');await db.exec(sql);
  assert.deepEqual(await historial(),antes,'repetir limpieza e instalación es idempotente');
  assert.deepEqual(await q('select to_jsonb(a) a from tutor_anuncios a'),intacto,'estado, medición, fechas y cobros intactos');
  assert.equal((await q("select has_function_privilege('anon','public.historial_anuncio(uuid,integer)','execute') v"))[0].v,false);
  await q('delete from auth.users where id=$1',[id(2)]);
  assert.equal((await q('select count(*)::int n from admin.anuncio_historial_diario'))[0].n,0,'borrar al profesor elimina también su historial');
  console.log('OK historial privado: rangos, MFA, RLS, propietario, umbrales, retención sin identidades, sin duplicación, reaplicación y borrado');
 }finally{await db.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
