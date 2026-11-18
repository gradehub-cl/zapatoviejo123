// Propuesta manual: la demo usa el producto normal sin cobrar a profesores.
// Base completa + RPC reales; todos los usuarios/anuncios son sintéticos.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {PGlite}=require('@electric-sql/pglite');
const leer=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
const id=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0');
(async()=>{
 const db=new PGlite();const q=async(s,p=[])=>(await db.query(s,p)).rows;
 const sesion=async n=>q("select set_config('request.jwt.claim.sub',$1,false)",[id(n)]);
 try{
  await db.exec(leer('bin/supabase-stubs.sql'));
  await db.exec(`create function auth.jwt() returns jsonb language sql stable as $$select '{"aal":"aal2"}'::jsonb$$;
    create table user_ramos(user_id uuid references auth.users(id) on delete cascade);`);
  for(const f of ['clases_particulares','admin_clases','administradores','admin_no_cuenta','campanas_gratis'])await db.exec(leer('supabase/'+f+'.sql'));
  for(const n of [1,2,3,4])await q('insert into auth.users(id) values($1)',[id(n)]);
  await q('insert into admin.administradores(user_id) values($1)',[id(1)]);
  await q('insert into user_ramos values($1),($2)',[id(3),id(4)]);
  await q("insert into tutor_perfiles(user_id,nombre_publico,presentacion,estado,revisado_at) values($1,'Tutor sintético','Presentación sintética del test local','aprobado',now())",[id(2)]);
  await q(`insert into tutor_anuncios(id,autor_id,tenant,ramos_siglas,precio_clp,titulo,descripcion,contacto_tipo,contacto_valor)
    values($1,$2,'uc',array['TEST100'],10000,'Aviso sintético','Descripción sintética de veinte caracteres','whatsapp','56900000000')`,[id(10),id(2)]);
  await q('insert into anuncio_campanas(anuncio_id,dias,tope_clp) values($1,10,50000)',[id(10)]);
  await q("update tutor_anuncios set estado='en_revision' where id=$1",[id(10)]);
  await sesion(1);await q('select admin.publicar_anuncio($1,10000)',[id(10)]);
  for(const f of ['paneles_historial','anuncio_eventos','metricas_dia_chile','anuncio_totales'])await db.exec(leer('supabase/'+f+'.sql'));
  const publicacion=(await q('select publicado_at from tutor_anuncios where id=$1',[id(10)]))[0].publicado_at;
  const funciones=()=>q("select proname,pg_get_functiondef(oid) def from pg_proc where proname in ('costo_campana','cuenta_para_campana','registrar_alcance_anuncio','registrar_interaccion_anuncio','tarifa_campana_clp') order by proname,oid");
  const antes=await funciones(),sql=leer('supabase/cuentas_demo_metricas.sql');
  assert.match(sql,/^-- sql-produccion: manual/m,'no entra a aplicación automática');
  await db.exec(sql);await q('insert into admin.cuentas_excluidas_metricas(user_id) values($1)',[id(3)]);
  await db.exec(sql);assert.deepEqual(await funciones(),antes,'no reemplaza el cobro ni sus registros');
  assert.equal((await q('select count(*)::int n from admin.cuentas_excluidas_metricas'))[0].n,1,'reaplicar conserva la exclusión');
  const costo=()=>q('select * from costo_campana($1)',[id(10)]);
  const total=()=>q('select * from anuncio_eventos_diarios order by tipo');
  let eventoId=100;
  const evento=tipo=>q('select registrar_evento_anuncio($1,$2,$3,$4,$5) ok',[id(10),tipo,'TEST100',id(eventoId++),publicacion]);
  const alcance=canal=>q('select registrar_alcance_anuncio($1,$2) ok',[id(10),canal]);
  const accion=tipo=>q('select registrar_interaccion_anuncio($1,$2) ok',[id(10),tipo]);
  await sesion(3);await db.exec('set role authenticated');
  // RLS sigue mostrando la publicación; excluir de cobro no oculta la app.
  assert.equal((await q('select count(*)::int n from tutor_anuncios where id=$1',[id(10)]))[0].n,1);
  await assert.rejects(q('select * from admin.cuentas_excluidas_metricas'),/permission denied/);
  await assert.rejects(q('insert into admin.cuentas_excluidas_metricas values($1)',[id(4)]),/permission denied/);
  for(const c of ['lista','busqueda','recomendacion'])assert.equal((await alcance(c))[0].ok,false);
  for(const t of ['apertura','contacto'])assert.equal((await accion(t))[0].ok,false);
  for(const t of ['impresion','clic','contacto'])assert.equal((await evento(t))[0].ok,false);
  await db.exec('reset role');
  const inicial=await costo();assert.equal(inicial[0].vistas,0);assert.equal(inicial[0].aperturas,0);assert.equal(inicial[0].contactos,0);
  assert.equal((await q('select count(*)::int n from anuncio_eventos_recibos'))[0].n,0);assert.deepEqual(await total(),[]);
  // Una cuenta normal mantiene tanto la persona/canal cobrable como el total.
  await sesion(4);await db.exec('set role authenticated');
  assert.equal((await alcance('lista'))[0].ok,true);
  assert.equal((await alcance('recomendacion'))[0].ok,true,'se conserva la mejora de canal');
  for(const t of ['apertura','contacto'])assert.equal((await accion(t))[0].ok,true);
  for(const t of ['impresion','clic','contacto'])assert.equal((await evento(t))[0].ok,true);
  await db.exec('reset role');
  const normal=await costo();assert.equal(normal[0].vistas,1);assert.equal(normal[0].aperturas,1);assert.equal(normal[0].contactos,1);assert(normal[0].costo_bruto>inicial[0].costo_bruto);
  const normales=await total();assert.equal(normales.length,3);
  await sesion(3);for(const t of ['impresion','clic','contacto'])assert.equal((await evento(t))[0].ok,false);
  assert.deepEqual(await costo(),normal,'la demo tampoco cambia un cobro ya iniciado');assert.deepEqual(await total(),normales);
  // Reaplicar las funciones base no elimina los triggers de exclusión.
  for(const f of ['clases_particulares','anuncio_eventos','metricas_dia_chile','anuncio_totales'])await db.exec(leer('supabase/'+f+'.sql'));
  assert.equal((await alcance('recomendacion'))[0].ok,false);assert.equal((await accion('apertura'))[0].ok,false);assert.equal((await evento('impresion'))[0].ok,false);
  await db.exec('set role anon');await assert.rejects(q('select * from admin.cuentas_excluidas_metricas'),/permission denied/);await db.exec('reset role');
  assert.equal((await q("select has_function_privilege('authenticated','admin.omitir_metrica_cuenta_demo()','EXECUTE') ok"))[0].ok,false);
  assert.equal((await q("select relrowsecurity rls from pg_class where oid='admin.cuentas_excluidas_metricas'::regclass"))[0].rls,true);
  await q('delete from auth.users where id=$1',[id(3)]);
  assert.equal((await q('select count(*)::int n from admin.cuentas_excluidas_metricas'))[0].n,0,'borrado de Auth elimina también el registro demo');
  console.log('PASS demo: RPC, visibilidad, cero cobro/totales, cuentas normales, permisos, reaplicación y borrado');
 }finally{await db.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
