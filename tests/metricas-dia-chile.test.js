const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),{PGlite}=require('@electric-sql/pglite');
const leer=f=>fs.readFileSync(__dirname+'/../'+f,'utf8'),id=n=>'00000000-0000-0000-0000-'+String(n).padStart(12,'0');
(async()=>{
 const db=new PGlite(),q=async(s,p=[])=>(await db.query(s,p)).rows;
 try{
  await db.exec(leer('bin/supabase-stubs.sql'));
  await db.exec(`create function auth.jwt() returns jsonb language sql stable as $$select '{"aal":"aal2"}'::jsonb$$;create table user_ramos(user_id uuid);`);
  for(const f of ['clases_particulares','admin_clases','administradores','admin_no_cuenta','campanas_gratis','paneles_historial','anuncio_eventos'])await db.exec(leer('supabase/'+f+'.sql'));
  for(const n of [1,2,3,4,5])await q('insert into auth.users(id) values($1)',[id(n)]);
  await q('insert into admin.administradores(user_id) values($1)',[id(1)]);
  await q("select set_config('request.jwt.claim.sub',$1,false)",[id(1)]);
  await q("insert into tutor_perfiles(user_id,nombre_publico,presentacion,estado,revisado_at) values($1,'Profesor sintético','Presentación suficientemente larga para prueba','aprobado',now())",[id(2)]);
  await q(`insert into tutor_anuncios(id,autor_id,tenant,ramos_siglas,precio_clp,titulo,descripcion,contacto_tipo,contacto_valor,estado,publicado_at,medicion_desde,vence_at)
   values($1,$2,'uc',array['TEST100'],10000,'Aviso de prueba','Descripción ficticia para las métricas','whatsapp','56900000000','pausado','2026-10-01','2026-10-01','2027-03-01')`,[id(10),id(2)]);
  await q("update admin.anuncio_eventos_inicio set desde='2026-11-02T00:30:00Z'");
  for(const [n,zona]of [[3,'UTC'],[4,'America/Santiago']]){
   await q("insert into anuncio_alcance(anuncio_id,user_id,publicacion,dia,dia_zona) values($1,$2,'2026-10-01','2026-11-01',$3)",[id(10),id(n),zona]);
   for(const tipo of ['apertura','contacto'])await q("insert into anuncio_interacciones(anuncio_id,user_id,tipo,publicacion,dia,dia_zona) values($1,$2,$3,'2026-10-01','2026-11-01',$4)",[id(10),id(n),tipo,zona]);
  }
  for(const tipo of ['impresion','clic','contacto'])await q("insert into anuncio_eventos_diarios values($1,'2026-10-01','2026-11-02',$2,2)",[id(10),tipo]);
  const diasAntes=await q('select user_id,dia,dia_zona from anuncio_alcance order by user_id');
  const costoAntes=await q('select * from costo_campana($1)',[id(10)]);
  const patch=leer('supabase/metricas_dia_chile.sql');await db.exec(patch);
  const fecha=(await q('select desde from admin.anuncio_dias_chile_inicio'))[0].desde;await db.exec(patch);
  assert.deepEqual((await q('select desde from admin.anuncio_dias_chile_inicio'))[0].desde,fecha);
  assert.deepEqual(await q('select user_id,dia,dia_zona from anuncio_alcance order by user_id'),diasAntes,'no reinterpreta filas UTC antiguas');
  const resumen=(await q('select resumen_eventos_anuncio($1) r',[id(10)]))[0].r;
  assert.deepEqual([resumen.impresion,resumen.clic,resumen.contacto],[3,3,3],'1 persona UTC anterior + 2 eventos; la fila chilena no se suma doble');
  const nuevo=(await q("insert into anuncio_alcance(anuncio_id,user_id,publicacion) values($1,$2,'2026-10-01') returning dia::text,dia_zona",[id(10),id(5)]))[0];
  const ctx={Intl,console};vm.createContext(ctx);vm.runInContext(leer('marketplace.js'),ctx);
  const run=s=>vm.runInContext(s,ctx);
  assert.equal(nuevo.dia,run('diaMetricasChile()'));assert.equal(nuevo.dia_zona,'America/Santiago');
  // Abril: la hora repetida sigue siendo el mismo día chileno. Septiembre: salta 00:00.
  for(const [instante,dia]of [['2026-04-05T02:30:00Z','2026-04-04'],['2026-04-05T03:30:00Z','2026-04-04'],['2026-04-05T04:30:00Z','2026-04-05'],['2026-09-06T03:30:00Z','2026-09-05'],['2026-09-06T04:30:00Z','2026-09-06']]){
   ctx.instante=instante;
   assert.equal(run('diaMetricasChile(instante)'),dia);
   assert.equal((await q("select ($1::timestamptz at time zone 'America/Santiago')::date::text dia",[instante]))[0].dia,dia);
   assert.equal(run("intervaloPrivado([], '1', Date.parse(instante)).hasta"),dia,'Hoy del panel sigue Chile');
  }
  // La única modificación posterior de personas fue el fixture nuevo, no la migración.
  await q('delete from anuncio_alcance where user_id=$1',[id(5)]);
  assert.deepEqual(await q('select * from costo_campana($1)',[id(10)]),costoAntes);
  for(const [n,creado]of [[100,'2026-11-02T00:40:00Z'],[101,'2026-11-02T20:40:00Z']])await q("insert into anuncio_eventos_recibos(user_id,evento_id,anuncio_id,publicacion,tipo,creado_at) values($1,$2,$3,'2026-10-01','impresion',$4)",[id(4),id(n),id(10),creado]);
  await q("insert into anuncio_eventos_recibos(user_id,evento_id,anuncio_id,publicacion,tipo,creado_at) values($1,$2,$3,'2026-10-01','contacto','2026-11-02T00:40:00Z')",[id(4),id(102),id(10)]);
  const manual=leer('supabase/recalcular_eventos_dia_chile.sql');assert(manual.startsWith('-- sql-produccion: manual'));
  await db.exec(manual);
  const recalculo=(await q('select grupos,filas_antes,filas_despues from admin.eventos_dia_chile_recalculo'))[0];
  assert.deepEqual(recalculo,{grupos:1,filas_antes:1,filas_despues:2});
  const nuevosDias=await q("select dia::text,eventos from anuncio_eventos_diarios where tipo='impresion' order by dia");
  assert.deepEqual(nuevosDias,[{dia:'2026-11-01',eventos:1},{dia:'2026-11-02',eventos:1}]);
  assert.equal((await q("select eventos from anuncio_eventos_diarios where tipo='contacto'"))[0].eventos,2,'grupo parcial no se reconstruye');
  assert.deepEqual((await q('select resumen_eventos_anuncio($1) r',[id(10)]))[0].r,resumen,'reclasificar días no cambia el total');
  await db.exec(manual);assert.deepEqual(await q("select dia::text,eventos from anuncio_eventos_diarios where tipo='impresion' order by dia"),nuevosDias);
  assert.deepEqual(await q('select * from costo_campana($1)',[id(10)]),costoAntes);
  await db.exec('set role authenticated');
  for(const tabla of ['anuncio_dias_chile_inicio','eventos_dia_chile_respaldo','eventos_dia_chile_recalculo'])await assert.rejects(q('select * from admin.'+tabla),/permission denied/);
  console.log('PASS día chileno: UTC antiguo/Chile nuevo, resumen sin duplicados, DST, rangos, cobro, recálculo íntegro/idempotente y acceso');
 }finally{await db.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
