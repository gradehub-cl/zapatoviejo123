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
  await q('select admin.publicar_anuncio($1,10000)',[id(10)]);
  const publicacion=(await q('select publicado_at from tutor_anuncios where id=$1',[id(10)]))[0].publicado_at;
  for(const f of ['paneles_historial','anuncio_eventos','metricas_dia_chile'])await db.exec(leer('supabase/'+f+'.sql'));
  const antes=await q('select * from costo_campana($1)',[id(10)]);
  const funciones=await q("select proname,pg_get_functiondef(oid) def from pg_proc where proname in ('costo_campana','cuenta_para_campana','registrar_alcance_anuncio','registrar_interaccion_anuncio','tarifa_campana_clp') order by proname");
  const patch=leer('supabase/anuncio_totales.sql');await db.exec(patch);
  const inicio=(await q('select cada_vez_desde from admin.anuncio_eventos_inicio'))[0];
  await db.exec(patch);assert.deepEqual((await q('select cada_vez_desde from admin.anuncio_eventos_inicio'))[0],inicio,'reaplicar no mueve el hito');
  assert.deepEqual(await q('select * from costo_campana($1)',[id(10)]),antes);
  assert.deepEqual(await q("select proname,pg_get_functiondef(oid) def from pg_proc where proname in ('costo_campana','cuenta_para_campana','registrar_alcance_anuncio','registrar_interaccion_anuncio','tarifa_campana_clp') order by proname"),funciones);
  const evento=(n,t='impresion',pub=publicacion)=>q('select registrar_evento_anuncio($1,$2,$3,$4,$5) ok',[id(10),t,'TEST100',id(n),pub]).then(x=>x[0].ok);
  const contador=t=>q('select coalesce(sum(eventos),0)::int n from anuncio_eventos_diarios where tipo=$1',[t]).then(x=>x[0].n);
  const cobro=async()=>({costo:await q('select * from costo_campana($1)',[id(10)]),alcance:await q("select to_jsonb(a)-'metrica_aux_registrada' fila from anuncio_alcance a order by user_id"),interacciones:await q("select to_jsonb(i)-'metrica_aux_registrada' fila from anuncio_interacciones i order by user_id,tipo")});
  // El total llega antes de una respuesta cobrable: su reintento completa
  // SOLO el agregado auxiliar, nunca repite el evento ni aumenta el costo.
  await db.exec('begin');await sesion(3);assert.equal(await evento(150),true);
  assert.equal((await q("select registrar_alcance_anuncio($1,'lista') ok",[id(10)]))[0].ok,true);
  const antesReintento=await q('select * from costo_campana($1)',[id(10)]);
  assert.equal(await evento(150),false);assert.equal(await contador('impresion'),1);
  assert.equal((await q("select eventos from anuncio_metricas where tipo='impresion'"))[0].eventos,1);
  assert.deepEqual(await q('select * from costo_campana($1)',[id(10)]),antesReintento);
  await db.exec('rollback');
  await q('insert into user_ramos values($1)',[id(2)]);
  await sesion(0);await assert.rejects(evento(100),/sesión/);
  await db.exec('set role anon');await assert.rejects(evento(100),/permission denied/);await db.exec('reset role');
  for(const n of [1,2,5]){await sesion(n);assert.equal(await evento(100+n),false,'admin, autor y sin ramos no cuentan');}
  await sesion(3);await db.exec('set role authenticated');
  for(let n=0;n<5;n++)assert.equal(await evento(200+n),true,'no exige una fila cobrable');
  assert.equal(await evento(200),false,'idempotencia');await db.exec('reset role');
  assert.equal(await contador('impresion'),5,'cinco vistas de la misma persona');
  for(let n=5;n<30;n++)assert.equal(await evento(200+n),true);
  assert.equal(await evento(230),false,'la vista 31 no suma');assert.equal(await contador('impresion'),30);
  for(const [tipo,limite]of [['clic',15],['contacto',10]]){
    for(let n=0;n<limite;n++)assert.equal(await evento(1000+limite*100+n,tipo),true);
    assert.equal(await evento(1000+limite*100+limite,tipo),false);assert.equal(await contador(tipo),limite);
  }
  assert.deepEqual(await q('select * from costo_campana($1)',[id(10)]),antes,'ni siquiera los primeros eventos insertan una persona cobrable');
  await q("select registrar_alcance_anuncio($1,'lista')",[id(10)]);
  // Cambio del fixture, NO del SQL: alcanza el tope de una campaña pagada real.
  await q('update anuncio_campanas set tope_clp=1000 where anuncio_id=$1',[id(10)]);
  await q("update tutor_anuncios set configuracion_campana_aprobada=jsonb_set(configuracion_campana_aprobada,'{tope_clp}','1000') where id=$1",[id(10)]);
  await q("select registrar_interaccion_anuncio($1,'contacto')",[id(10)]);
  assert.equal((await q('select cuenta_para_campana($1,$2) ok',[id(10),id(3)]))[0].ok,false);
  // La marca auxiliar no es cobrable; las personas, canales y demás columnas sí deben quedar idénticas.
  const agotado=await cobro();assert.ok(agotado.costo[0].costo_bruto>=1000);assert.equal(agotado.costo[0].tope_clp,1000);
  await sesion(4);assert.equal(await evento(300),true,'cuenta sin fila cobrable y campaña agotada');
  assert.deepEqual(await cobro(),agotado,'filas cobrables y costo exactamente iguales');
  await q("update tutor_anuncios set estado='pausado' where id=$1",[id(10)]);
  const pausado=await cobro();assert.equal(await evento(301,'clic'),true,'tarjeta ya mostrada con cobro pausado');assert.deepEqual(await cobro(),pausado);
  assert.equal(await evento(302,'impresion',new Date('2000-01-01')),false,'publicación distinta');
  await assert.rejects(q('select registrar_evento_anuncio($1,$2,$3,$4,$5)',[id(10),'impresion','OTRA100',id(303),publicacion]),/sigla/);
  // La sesión puede estar en otra zona; el cupo sigue el día de Chile.
  await sesion(3);await db.exec("set time zone 'Pacific/Kiritimati'");assert.equal(await evento(304),false);
  await q("update anuncio_eventos_recibos set creado_at=(((now() at time zone 'America/Santiago')::date-1)::timestamp+interval '23 hours 59 minutes') at time zone 'America/Santiago' where user_id=$1",[id(3)]);
  assert.equal(await evento(305),true,'un recibo a las 23:59 del día chileno anterior no consume el cupo de hoy');
  for(const [dia,horas]of [['2026-04-04',25],['2026-09-06',23]])assert.equal(Number((await q("select extract(epoch from ((($1::date+1)::timestamp at time zone 'America/Santiago')-($1::date::timestamp at time zone 'America/Santiago')))/3600 horas",[dia]))[0].horas),horas);
  await sesion(2);const prof=(await q('select resumen_eventos_anuncio($1) r',[id(10)]))[0].r;
  assert.equal(prof.impresion,32);assert.equal(prof.clic,16);assert.equal(prof.contacto,null,'privacidad bajo 15');assert.ok(prof.cada_vez_desde);
  await sesion(1);const admin=(await q('select resumen_eventos_anuncio($1) r',[id(10)]))[0].r;assert.equal(admin.contacto,10,'admin sin umbral');
  const dias=(await q('select admin_historial_anuncios(null) r'))[0].r;
  assert.equal(dias.reduce((s,d)=>s+d.vistas_total,0),32);assert.equal(dias.reduce((s,d)=>s+d.aperturas_total,0),16);assert.equal(dias.reduce((s,d)=>s+d.contactos_total,0),10);
  assert.equal(dias.reduce((s,d)=>s+d.vistas,0),1,'las personas se conservan separadas');
  await sesion(2);await assert.rejects(q('select admin_historial_anuncios(null)'),/sin acceso/);
  // Limpieza mantiene los agregados y vence los recibos según la publicación.
  await q("update anuncio_eventos_recibos set vence_publicacion=now()-interval '91 days' where evento_id=$1",[id(300)]);
  const totales=await q('select * from anuncio_eventos_diarios order by tipo,dia');
  assert.equal((await q('select limpiar_eventos_anuncios() n'))[0].n,1);
  assert.deepEqual(await q('select * from anuncio_eventos_diarios order by tipo,dia'),totales);
  await db.exec('set role authenticated');
  for(const tabla of ['anuncio_eventos_recibos','anuncio_eventos_diarios'])await assert.rejects(q('select * from '+tabla),/permission denied/);
  await assert.rejects(q('select limpiar_eventos_anuncios()'),/permission denied/);await db.exec('reset role');
  // Reaplicar las bases revoca/reemplaza funciones: instalar el complemento al final restaura contrato y grants.
  for(const f of ['anuncio_eventos','metricas_dia_chile','anuncio_totales'])await db.exec(leer('supabase/'+f+'.sql'));
  await sesion(4);await db.exec('set role authenticated');assert.equal(await evento(400,'contacto'),true);await db.exec('reset role');
  assert.deepEqual((await q('select cada_vez_desde from admin.anuncio_eventos_inicio'))[0],inicio);
  console.log('PASS totales: 30/15/10, UUID, campaña pagada agotada/pausada, cobro intacto, exclusiones, Chile/DST, privacidad, historial, limpieza, grants y reaplicación');
 }finally{await db.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
