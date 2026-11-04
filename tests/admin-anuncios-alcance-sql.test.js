const fs=require('fs'),assert=require('assert/strict'),{PGlite}=require('@electric-sql/pglite');
const read=f=>fs.readFileSync(__dirname+'/../'+f,'utf8'),id=i=>'00000000-0000-0000-0000-'+String(i).padStart(12,'0');
(async()=>{const db=new PGlite(),q=async(s,p=[])=>(await db.query(s,p)).rows;try{
 await db.exec(read('bin/supabase-stubs.sql'));await db.exec("create function auth.jwt() returns jsonb language sql as $$select jsonb_build_object('aal',current_setting('test.aal',true))$$;create table user_ramos(user_id uuid,data jsonb);");
 for(const f of ['clases_particulares','admin_clases','administradores','admin_estadisticas','visitas_diarias'])await db.exec(read('supabase/'+f+'.sql'));
 for(let i=1;i<=5;i++)await q('insert into auth.users(id) values($1)',[id(i)]);await q('insert into admin.administradores(user_id) values($1)',[id(1)]);
 await q("insert into tutor_perfiles(user_id,nombre_publico,presentacion,estado,revisado_at) values($1,'Profesor sintético','Presentación suficientemente larga de prueba','aprobado',now())",[id(1)]);
 await q("insert into tutor_anuncios(id,autor_id,tenant,ramos_siglas,modalidad,ubicacion,precio_clp,titulo,descripcion,contacto_tipo,contacto_valor,publicado_at) values($1,$2,'uc',array['TST100'],'individual','online',1000,'Aviso sintético','Descripción suficientemente larga de prueba','whatsapp','56900000000',now()-interval '2 days')",[id(10),id(1)]);
 for(let i=2;i<=5;i++){
 await q("insert into visitas_diarias values($1,(now() at time zone 'America/Santiago')::date)",[id(i)]);
 await q('insert into user_ramos values($1,$2)',[id(i),JSON.stringify({tenant:i===5?'uai':'uc',ramos:[{sigla:'TST100'},{sigla:'TST100'}]})]);}
 await q("insert into anuncio_alcance(anuncio_id,user_id,publicacion) select id,$2,medicion_desde from tutor_anuncios where id=$1",[id(10),id(2)]);
 await q("insert into anuncio_interacciones(anuncio_id,user_id,publicacion,tipo) select id,$2,medicion_desde,'apertura' from tutor_anuncios where id=$1",[id(10),id(2)]);
 const sql=read('supabase/admin_anuncios_alcance.sql');await db.exec(sql);await db.exec(sql);
 const sesion=async(i,aal)=>q("select set_config('request.jwt.claim.sub',$1,false),set_config('test.aal',$2,false)",[id(i),aal]);
 await sesion(1,'aal1');await assert.rejects(q('select admin_anuncio_publico($1)',[id(10)]),/segundo factor|sin acceso/);
 await sesion(2,'aal2');await assert.rejects(q('select admin_anuncio_publico($1)',[id(10)]),/sin acceso/);
 await sesion(1,'aal2');await db.exec('set role authenticated');const x=(await q('select admin_anuncio_publico($1) x',[id(10)]))[0].x;
 assert.equal(x.activos,4);assert.equal(x.activos_ramo,3,'mismo ramo dos veces no duplica una persona; otra universidad no cuenta');assert.equal(x.vieron,1);assert.equal(x.abrieron,1);assert.equal(x.contactaron,0);assert(!JSON.stringify(x).includes('user_id'));
 await db.exec('reset role;set role anon');await assert.rejects(q('select admin_anuncio_publico($1)',[id(10)]),/permission denied/);
 console.log('OK admin alcance: campañas, deduplicación, tenant, MFA/anon, solo conteos y reaplicación');
 }finally{await db.close()}})().catch(e=>{console.error(e);process.exitCode=1});
