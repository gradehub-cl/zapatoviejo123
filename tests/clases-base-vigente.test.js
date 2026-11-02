// Contrato del despliegue: mismas funciones que producción, aun reaplicando el base.
const assert=require('node:assert/strict'),fs=require('node:fs'),{PGlite}=require('@electric-sql/pglite');
const leer=f=>fs.readFileSync(__dirname+'/../'+f,'utf8');
// Consulta de solo lectura a pg_proc en producción durante la revisión de #924.
const esperados={costo_campana:'02328b1099e8b45a44e8e9cf8637ccce',
 limpiar_alcance_anuncios:'b91679afd74141870ee652d4642c7ab5',
 limpiar_interacciones_anuncios:'c58a31b3f87c13a93fd5c30e6bf83e28',
 preparar_publicacion_clase:'786608014571764ae767317c3c830f22',
 totales_metricas_anuncio:'c6fe7bec9dc4fa5034dc77932101742e'};
const orden=[...leer('docs/guia/desplegar.md').split('### Orden del SQL de Clases y sus métricas')[1]
 .matchAll(/^\d+\. `(supabase\/[^`]+\.sql)`/gm)].map(m=>m[1]);
assert(orden.length>=8,'se instala el orden documentado, sin omitir complementos');
for(const nombre of Object.keys(esperados)){
 const definiciones=orden.flatMap(f=>[...leer(f).matchAll(new RegExp('create or replace function public\\.'+nombre+'\\(','g'))]);
 assert.equal(definiciones.length,1,nombre+' tiene una sola definición canónica');
}
const id=n=>'00000000-0000-0000-0000-'+String(n).padStart(12,'0');
(async()=>{
 const db=new PGlite(),q=async(s,p=[])=>(await db.query(s,p)).rows;
 try{
  await db.exec(leer('bin/supabase-stubs.sql'));
  await db.exec(`create function auth.jwt() returns jsonb language sql stable as $$select '{"aal":"aal2"}'::jsonb$$;
   create table user_ramos(user_id uuid);`);
  for(const f of orden)await db.exec(leer(f));
  const versiones=()=>q(`select p.proname,md5(p.prosrc) md5,p.prosecdef,p.provolatile,p.proconfig,p.proacl::text acl
   from pg_proc p join pg_namespace n on n.oid=p.pronamespace
   where n.nspname='public' and p.proname=any($1::text[]) order by p.proname`,[Object.keys(esperados)]);
  const antes=await versiones();
  assert.deepEqual(Object.fromEntries(antes.map(p=>[p.proname,p.md5])),esperados,'los cinco cuerpos coinciden con producción');
  for(const n of [1,2,3])await q('insert into auth.users(id) values($1)',[id(n)]);
  await q('insert into admin.administradores(user_id) values($1)',[id(1)]);
  await q("insert into tutor_perfiles(user_id,nombre_publico,presentacion,estado,revisado_at) values($1,'Profesor sintético','Presentación de prueba suficientemente larga','aprobado',now())",[id(2)]);
  for(const [n,precio]of [[10,0],[11,12000]]){
   await q(`insert into tutor_anuncios(id,autor_id,tenant,ramos_siglas,precio_clp,titulo,descripcion,contacto_tipo,contacto_valor)
    values($1,$2,'uc',array['TEST100'],$3,'Aviso sintético','Descripción ficticia de más de veinte caracteres','whatsapp','56900000000')`,[id(n),id(2),precio]);
   await q('insert into anuncio_campanas(anuncio_id,dias,tope_clp) values($1,10,$2)',[id(n),precio?50000:null]);
   await q("update tutor_anuncios set estado='en_revision' where id=$1",[id(n)]);
   await q('select admin.publicar_anuncio($1,0)',[id(n)]);
  }
  await q("update tutor_anuncios set publicado_at=now()-interval '150 days',vence_at=now()-interval '140 days' where id=$1",[id(10)]);
  await q(`insert into anuncio_alcance(anuncio_id,user_id,publicacion,dia,vence_publicacion)
   select id,$2,medicion_desde,current_date-150,vence_at from tutor_anuncios where id=$1`,[id(10),id(3)]);
  await q(`insert into anuncio_interacciones(anuncio_id,user_id,publicacion,dia,vence_publicacion,tipo)
   select id,$2,medicion_desde,current_date-150,vence_at,'apertura' from tutor_anuncios where id=$1`,[id(10),id(3)]);
  await q(`insert into anuncio_metricas(anuncio_id,dia,tipo,tenant,ramo_sigla,eventos,publicacion)
   select id,current_date-150,'impresion','uc','TEST100',1,medicion_desde from tutor_anuncios where id=$1`,[id(10)]);
  const datos=await q('select to_jsonb(a) a from tutor_anuncios a order by id');
  const costo=()=>q('select * from costo_campana($1)',[id(10)]);
  const costos=()=>q('select a.id,c.* from tutor_anuncios a cross join lateral costo_campana(a.id) c order by a.id');
  const costosAntes=await costos();assert(costosAntes.find(c=>c.id===id(11)).costo_bruto>0,'el pagado conserva su tarifa');
  const costoAntes=await costo();assert.equal(costoAntes[0].costo_bruto,0);
  await db.exec(leer(orden[0]));
  assert.deepEqual(await versiones(),antes,'reaplicar base conserva cuerpos, seguridad, volatilidad, search_path y ACL');
  assert.deepEqual(await q('select to_jsonb(a) a from tutor_anuncios a order by id'),datos,'no cambia campañas existentes');
  assert.deepEqual(await costo(),costoAntes,'la campaña gratis no empieza a cobrar');
  assert.deepEqual(await costos(),costosAntes,'también conserva el costo de anuncios pagados');
  await q("select set_config('request.jwt.claim.sub',$1,false)",[id(2)]);
  assert.deepEqual((await q('select * from totales_metricas_anuncio($1)',[id(10)])).map(x=>x.vista).sort(),['dia','total']);
  await q('select limpiar_alcance_anuncios(90)');await q('select limpiar_interacciones_anuncios(90)');
  assert.equal((await q('select count(*)::int n from anuncio_alcance'))[0].n,0);
  const archivo=(await q('select * from admin.anuncio_historial_diario'))[0];
  assert.deepEqual([archivo.vistas,archivo.aperturas,archivo.contactos],[1,1,0],'limpieza conserva el historial agregado');
  for(const f of orden)await db.exec(leer(f));
  assert.deepEqual(await versiones(),antes,'reaplicar la secuencia completa también conserva las versiones');
  console.log('PASS: orden documentado, md5 de producción, base reaplicable, gratis, umbral, historial y ACL intactos');
 }finally{await db.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
