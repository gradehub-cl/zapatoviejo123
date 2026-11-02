// Medición nueva aislada de cobro/alcance. Datos exclusivamente sintéticos.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {PGlite}=require('@electric-sql/pglite');
const raiz=path.join(__dirname,'..'),leer=f=>fs.readFileSync(path.join(raiz,f),'utf8');
const id=n=>'00000000-0000-0000-0000-'+String(n).padStart(12,'0');
(async()=>{
 const db=new PGlite();const q=async(s,p=[])=>(await db.query(s,p)).rows;
 const sesion=async(n,aal='aal2')=>{await q("select set_config('request.jwt.claim.sub',$1,false),set_config('evento.aal',$2,false)",[n?id(n):'',aal]);};
 try{
  await db.exec(leer('bin/supabase-stubs.sql'));
  await db.exec(`create function auth.jwt() returns jsonb language sql stable as $$select jsonb_build_object('aal',current_setting('evento.aal',true))$$;
    create table user_ramos(user_id uuid references auth.users(id) on delete cascade);`);
  for(const f of ['clases_particulares','admin_clases','administradores','admin_no_cuenta','campanas_gratis'])await db.exec(leer('supabase/'+f+'.sql'));
  for(const n of [1,2,3,4,5])await q('insert into auth.users(id) values($1)',[id(n)]);
  await q('insert into admin.administradores(user_id) values($1)',[id(1)]);
  await q('insert into user_ramos values($1),($2),($3)',[id(1),id(3),id(4)]);
  await q("insert into tutor_perfiles(user_id,nombre_publico,presentacion,estado,revisado_at) values($1,'Profesor ficticio','Presentación sintética para las pruebas','aprobado',now())",[id(2)]);
  await q(`insert into tutor_anuncios(id,autor_id,tenant,ramos_siglas,precio_clp,titulo,descripcion,contacto_tipo,contacto_valor)
    values($1,$2,'uc',array['TEST100'],10000,'Aviso sintético','Descripción de más de veinte caracteres','whatsapp','56900000000')`,[id(10),id(2)]);
  await q('insert into anuncio_campanas(anuncio_id,dias,tope_clp) values($1,10,50000)',[id(10)]);
  await q("update tutor_anuncios set estado='en_revision' where id=$1",[id(10)]);
  await q('select admin.publicar_anuncio($1,0)',[id(10)]);
  const publicacion=(await q('select publicado_at from tutor_anuncios where id=$1',[id(10)]))[0].publicado_at;
  // Cuenta/campaña con vistas existentes ANTES de instalar el SQL nuevo.
  await sesion(4);await q("select registrar_alcance_anuncio($1,'lista')",[id(10)]);
  await q("select registrar_metrica_anuncio($1,'impresion','TEST100')",[id(10)]);
  // Esa vista fue el día anterior a la medición: cuenta una vez en el total.
  await q("update anuncio_alcance set dia=current_date-1,dia_zona='UTC' where user_id=$1",[id(4)]);
  const costoPrevio=await q('select * from costo_campana($1)',[id(10)]);
  const sql=leer('supabase/anuncio_eventos.sql');
  const antes=(await q('select to_jsonb(a) a from tutor_anuncios a'));
  await db.exec(sql);const inicio=(await q('select desde from admin.anuncio_eventos_inicio'))[0].desde;
  await db.exec(sql);assert.deepEqual((await q('select desde from admin.anuncio_eventos_inicio'))[0].desde,inicio);
  assert.deepEqual(await q('select to_jsonb(a) a from tutor_anuncios a'),antes,'instalar/reaplicar no cambia anuncios');
  assert.deepEqual(await q('select * from costo_campana($1)',[id(10)]),costoPrevio,'instalar conserva alcance y cobros históricos');
  await sesion(1);
  const inicial=(await q('select resumen_eventos_anuncio($1) r',[id(10)]))[0].r;
  assert.equal(inicial.impresion,1,'la persona que lo vio antes de medir cuenta una vez, sin atribuirse el agregado viejo');
  const evento=(n,t='impresion',pub=publicacion)=>q('select registrar_evento_anuncio($1,$2,$3,$4,$5) ok',[id(10),t,'TEST100',id(n),pub]).then(x=>x[0].ok);
  const costo=()=>q('select * from costo_campana($1)',[id(10)]).then(r=>r[0]);
  await sesion(0);await assert.rejects(evento(100),/sesión/);
  await db.exec('set role anon');await assert.rejects(evento(100),/permission denied/);await db.exec('reset role');
  for(const n of [1,2,5]){await sesion(n);assert.equal(await evento(100+n),false,'admin, autor y sin ramos no cuentan');}
  await sesion(3);
  assert.equal(await evento(100),false,'sin la vista cobrable previa no registra');
  await q("select registrar_alcance_anuncio($1,'recomendacion')",[id(10)]);
  const cobrable=await costo();
  await db.exec('set role authenticated');
  assert.equal(await evento(100),true);assert.equal(await evento(100),false,'mismo evento no se duplica');
  assert.equal(await evento(101),true,'otra exposición de la misma cuenta sí cuenta');
  await db.exec('reset role');
  await assert.rejects(evento(102,'otro'),/evento inválido/);
  await assert.rejects(q('select registrar_evento_anuncio($1,$2,$3,null,$4)',[id(10),'impresion','TEST100',publicacion]),/evento inválido/);
  assert.deepEqual(await costo(),cobrable,'los eventos no cambian alcance, precio ni cobro');
  assert.equal((await q("select eventos from anuncio_metricas where tipo='impresion'"))[0].eventos,2,'el agregado auxiliar original sigue deduplicado');
  assert.equal(await evento(102,'impresion',new Date('2000-01-01')),false,'no asigna eventos tardíos a otra publicación');
  await assert.rejects(q('select registrar_evento_anuncio($1,$2,$3,$4,$5)',[id(10),'impresion','OTRA100',id(102),publicacion]),/sigla/);
  for(const [tipo,aux]of [['clic','apertura'],['contacto','contacto']]){
   await q('select registrar_interaccion_anuncio($1,$2)',[id(10),aux]);
   const cobro=await costo();assert.equal(await evento(tipo==='clic'?103:105,tipo),true);
   if(tipo==='contacto')await q("update anuncio_eventos_recibos set creado_at=creado_at-interval '1 day' where tipo='contacto'");
   assert.equal(await evento(tipo==='clic'?104:106,tipo),true);assert.deepEqual(await costo(),cobro);
  }
  await sesion(2);
  let resumen=(await q('select resumen_eventos_anuncio($1) r',[id(10)]))[0].r;
  assert.equal(resumen.impresion,null,'el profesor no ve totales menores a 15');
  assert.equal(resumen.clic,null);assert.equal(resumen.contacto,null);assert.ok(resumen.desde);
  await sesion(4);await assert.rejects(q('select resumen_eventos_anuncio($1)',[id(10)]),/sin acceso/);
  await sesion(1,'aal1');await assert.rejects(q('select resumen_eventos_anuncio($1)',[id(10)]),/sin acceso|factor/);
  await sesion(1);resumen=(await q('select resumen_eventos_anuncio($1) r',[id(10)]))[0].r;
  assert.deepEqual([resumen.impresion,resumen.clic,resumen.contacto],[3,2,2],'en total: lo medido más una vez por cada persona de antes');
  assert.ok(!('user_id'in resumen));
  await db.exec('set role authenticated');
  for(const tabla of ['anuncio_eventos_recibos','anuncio_eventos_diarios']){
   await assert.rejects(q('select * from public.'+tabla),/permission denied/);
   await assert.rejects(q('delete from public.'+tabla),/permission denied/);
  }
  await assert.rejects(q('select limpiar_eventos_anuncios()'),/permission denied/);
  await db.exec('reset role');
  await sesion(3);for(let n=110;n<123;n++){
    if((await q("select count(*)::int n from anuncio_eventos_recibos where user_id=$1 and tipo='impresion' and (creado_at at time zone 'America/Santiago')::date=(now() at time zone 'America/Santiago')::date",[id(3)]))[0].n>=4)
      await q("update anuncio_eventos_recibos set creado_at=creado_at-interval '1 day' where user_id=$1 and tipo='impresion'",[id(3)]);
    assert.equal(await evento(n),true);
  }
  await sesion(2);assert.equal((await q('select resumen_eventos_anuncio($1) r',[id(10)]))[0].r.impresion,16);
  // Cupos por día chileno: 4 impresiones, 2 aperturas, 1 contacto.
  await db.exec('begin');await sesion(3);
  const metricasAntes=await q('select * from anuncio_metricas order by tipo'),cobroAntes=await costo();
  for(const [tipo,limite]of [['impresion',4],['clic',2],['contacto',1]]){
    const previos=(await q("select count(*)::int n from anuncio_eventos_recibos where user_id=$1 and tipo=$2 and (creado_at at time zone 'America/Santiago')::date=(now() at time zone 'America/Santiago')::date",[id(3),tipo]))[0].n;
    for(let n=previos;n<limite;n++)assert.equal(await evento(1000+limite*100+n,tipo),true);
    const recibos=await q('select * from anuncio_eventos_recibos order by evento_id'),diarios=await q('select * from anuncio_eventos_diarios order by tipo');
    assert.equal(await evento(9000+limite,tipo),false,`evento ${limite+1} de ${tipo} no suma`);
    assert.deepEqual(await q('select * from anuncio_eventos_recibos order by evento_id'),recibos);
    assert.deepEqual(await q('select * from anuncio_eventos_diarios order by tipo'),diarios);
  }
  await sesion(4);assert.equal(await evento(9200),true,'otra cuenta tiene su cupo');await sesion(3);
  await db.exec("set local time zone 'Pacific/Kiritimati'");assert.equal(await evento(9100),false,'la zona de sesión no evita el cupo chileno');
  // Recibos del día chileno anterior, sin cambiar las fechas del alcance.
  await q("update anuncio_eventos_recibos set creado_at=(((now() at time zone 'America/Santiago')::date-1)::timestamp+interval '12 hours') at time zone 'America/Santiago' where user_id=$1",[id(3)]);
  assert.equal(await evento(9101),true,'al día siguiente de Chile vuelve a sumar');
  assert.equal(await evento(9102,'clic'),true);assert.equal(await evento(9103,'contacto'),true);
  assert.deepEqual(await costo(),cobroAntes);assert.deepEqual(await q('select * from anuncio_metricas order by tipo'),metricasAntes);
  // Los límites de medianoche local incluyen días de 23 y 25 horas.
  for(const [dia,horas]of [['2026-04-04',25],['2026-09-06',23]]){
    const ventana=(await q("select extract(epoch from ((($1::date+1)::timestamp at time zone 'America/Santiago')-($1::date::timestamp at time zone 'America/Santiago')))/3600 horas",[dia]))[0];
    assert.equal(Number(ventana.horas),horas);
  }
  await db.exec('rollback');
  // Pausar o terminar un anuncio que sí tuvo medición no borra sus cifras.
  await sesion(1);
  for(const estado of ['pausado','expirado']){
    await db.exec('begin');
    await q('update tutor_anuncios set estado=$1 where id=$2',[estado,id(10)]);
    assert.equal((await q('select resumen_eventos_anuncio($1) r',[id(10)]))[0].r.impresion,16);
    await db.exec('rollback');
  }
  // Otra campaña terminó antes del SQL: su total cuenta una vez por persona.
  await q(`insert into tutor_anuncios(id,autor_id,tenant,ramos_siglas,precio_clp,titulo,descripcion,contacto_tipo,contacto_valor,estado,publicado_at,medicion_desde,vence_at)
    values($1,$2,'uc',array['TEST100'],10000,'Antiguo sintético','Descripción antigua de prueba suficiente','whatsapp','56900000000','expirado',now()-interval '30 days',now()-interval '30 days',now()-interval '20 days')`,[id(11),id(2)]);
  await q("insert into anuncio_alcance(anuncio_id,user_id,dia,canal,publicacion) select $1,u,current_date-25,'lista',now()-interval '30 days' from unnest(array[$2,$3]::uuid[]) u",[id(11),id(3),id(4)]);
  await q("update anuncio_alcance set publicacion=(select medicion_desde from tutor_anuncios where id=$1) where anuncio_id=$1",[id(11)]);
  const antiguo=(await q('select resumen_eventos_anuncio($1) r',[id(11)]))[0].r;
  assert.deepEqual(antiguo,{anterior:true,desde:null,impresion:2,clic:0,contacto:0});
  // Una app vieja en caché registra a la persona sin el evento: el total no baja de las personas.
  await q(`insert into tutor_anuncios(id,autor_id,tenant,ramos_siglas,precio_clp,titulo,descripcion,contacto_tipo,contacto_valor,estado,publicado_at,medicion_desde,vence_at)
    values($1,$2,'uc',array['TEST100'],10000,'Nuevo sintético','Descripción nueva de prueba suficiente','whatsapp','56900000000','pausado',now(),now(),now()+interval '10 days')`,[id(12),id(2)]);
  await q("insert into anuncio_alcance(anuncio_id,user_id,dia,canal,publicacion) select $1,u,current_date,'lista',(select medicion_desde from tutor_anuncios where id=$1) from unnest(array[$2,$3,$4]::uuid[]) u",[id(12),id(1),id(3),id(4)]);
  const sinEventos=(await q('select resumen_eventos_anuncio($1) r',[id(12)]))[0].r;
  assert.equal(sinEventos.impresion,3,'nunca menos que las personas distintas');assert.equal(sinEventos.anterior,false);
  await q('delete from tutor_anuncios where id=$1',[id(12)]);
  const filas=await q('select * from anuncio_eventos_diarios order by tipo');await db.exec(sql);
  assert.deepEqual(await q('select * from anuncio_eventos_diarios order by tipo'),filas,'reaplicar conserva eventos');
  // Última interacción que agota el tope: completa su evento una sola vez.
  await sesion(4);await q("select registrar_interaccion_anuncio($1,'contacto')",[id(10)]);
  await q('update anuncio_campanas set tope_clp=1000 where anuncio_id=$1',[id(10)]);
  await q("update tutor_anuncios set configuracion_campana_aprobada=jsonb_set(configuracion_campana_aprobada,'{tope_clp}','1000') where id=$1",[id(10)]);
  assert.equal((await q('select campana_visible($1) v',[id(10)]))[0].v,false);
  assert.equal(await evento(200,'contacto'),true);assert.equal(await evento(201,'contacto'),false);
  await q('update anuncio_eventos_recibos set vence_publicacion=now()-interval \'91 days\' where user_id=$1',[id(4)]);
  assert.equal((await q('select limpiar_eventos_anuncios() n'))[0].n,1);
  assert.equal((await q('select count(*)::int n from anuncio_eventos_recibos where user_id=$1',[id(3)]))[0].n,19);
  const anonimos=await q('select * from anuncio_eventos_diarios order by tipo');
  await q('delete from auth.users where id=$1',[id(3)]);
  assert.equal((await q('select count(*)::int n from anuncio_eventos_recibos'))[0].n,0,'borrar cuenta elimina todos sus recibos');
  assert.deepEqual(await q('select * from anuncio_eventos_diarios order by tipo'),anonimos,'solo quedan agregados sin identidad');
  await q('delete from tutor_anuncios where id=$1',[id(10)]);
  assert.equal((await q('select count(*)::int n from anuncio_eventos_diarios'))[0].n,0);
  console.log('PASS: repeticiones idempotentes, cobro intacto, MFA/RLS/privacidad, retención y reaplicación');
 }finally{await db.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
