// Políticas reales de Postgres, solo cuentas, archivos y metadatos sintéticos.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{PGlite}=require('@electric-sql/pglite');
const read=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8'),id=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0');
(async()=>{const db=new PGlite(),q=async(s,p=[])=>(await db.query(s,p)).rows;
try{
 await db.exec(read('bin/supabase-stubs.sql'));
 await db.exec(`create function auth.jwt() returns jsonb language sql stable as $$select jsonb_build_object('aal',current_setting('prueba.aal',true))$$;create table user_ramos(user_id uuid);alter table storage.objects add column metadata jsonb;grant usage on schema storage,auth to authenticated;grant select,insert,delete,update on storage.objects to authenticated;`);
 for(const f of ['clases_particulares','admin_clases','administradores','eliminar_mi_cuenta'])await db.exec(read('supabase/'+f+'.sql'));
 for(const n of [1,2,3])await q('insert into auth.users(id) values($1)',[id(n)]);
 await q('insert into admin.administradores(user_id) values($1)',[id(3)]);
 const sql=read('supabase/programas_enviados.sql');await db.exec(sql);await db.exec(sql);
 const sesion=async(n,aal='aal1')=>{await db.exec('reset role');await q("select set_config('request.jwt.claim.sub',$1,false),set_config('prueba.aal',$2,false)",[id(n),aal]);await db.exec('set role authenticated');};
 const archivo=async(n,numero)=>{const ruta=id(n)+'/'+id(numero)+'.pdf';await q("insert into storage.objects(bucket_id,name,owner,metadata) values('programas',$1,$2,'{\"size\":512,\"mimetype\":\"application/pdf\"}')",[ruta,id(n)]);return ruta;};
 const enviar=(ruta,sha='a'.repeat(64),tenant='udd')=>q("select enviar_programa($1,'Carrera sintética','SYN100','Curso sintético','2026-2','ramo-sintetico',$2,512,$3,2,true) r",[tenant,ruta,sha]).then(x=>x[0].r);
 await sesion(1);const ruta=await archivo(1,10);
 await assert.rejects(q("insert into programas_enviados(user_id) values($1)",[id(1)]),/permission denied/);
 await assert.rejects(archivo(2,11),/row-level security/,'no sube en carpeta ajena');
 const primero=await enviar(ruta);assert.equal(primero.id,id(10));assert.equal((await q('select user_id from programas_enviados'))[0].user_id,id(1));
 assert.deepEqual(await enviar(ruta),primero,'respuesta perdida es idempotente');
 await sesion(2);assert.equal((await q('select * from programas_enviados')).length,0);assert.equal((await q("select * from storage.objects where bucket_id='programas'")).length,0,'no ve el PDF de otra persona');
 const propio=await archivo(2,20);assert.deepEqual(await enviar(propio),{duplicado:true},'no crea otra fila del mismo documento');
 await q("delete from storage.objects where name=$1",[propio]);
 assert.equal((await q("select programa_ya_recibido('udd','SYN100','2026-2',$1) ok",['a'.repeat(64)]))[0].ok,true);
 await sesion(3);assert.equal((await q("select * from storage.objects where bucket_id='programas'")).length,0,'admin sin MFA no ve archivos');await assert.rejects(q('select admin_programas_enviados(null)'),/Sin acceso/);
 await sesion(3,'aal2');assert.equal((await q("select * from storage.objects where bucket_id='programas'")).length,1);assert.equal((await q('select admin_programas_enviados(null) r'))[0].r.length,1);
 await q("select admin_revisar_programa($1,'descartado','Falta el período del programa')",[id(10)]);
 await sesion(1);assert.equal((await q("select mis_programas_enviados('ramo-sintetico') r"))[0].r[0].estado,'descartado');
 await assert.rejects(q('select eliminar_mi_cuenta()'),/Borra primero/,'el servidor evita dejar binarios huérfanos');
 // Cinco envíos aceptados al día; un duplicado no consume una fila adicional.
 for(let n=1;n<=4;n++){const r=await archivo(1,30+n);assert.equal((await enviar(r,String(n).repeat(64),'uai')).id,id(30+n));}
 const ruta6=id(1)+'/'+id(50)+'.pdf';await assert.rejects(q("insert into storage.objects(bucket_id,name,owner) values('programas',$1,$2)",[ruta6,id(1)]),/row-level security/);
 await db.exec('reset role');await q("insert into storage.objects(bucket_id,name,owner,metadata) values('programas',$1,$2,'{\"size\":512}')",[ruta6,id(1)]);
 await sesion(1);await assert.rejects(enviar(ruta6,'f'.repeat(64)),/5 programas/);
 await assert.rejects(enviar(id(2)+'/'+id(99)+'.pdf','e'.repeat(64)),/Revisa/);
 // Un día anterior de Chile libera el cupo, sin depender de la zona de sesión.
 await db.exec('reset role');await q("update programas_enviados set created_at=(((now() at time zone 'America/Santiago')::date-1)::timestamp+interval '23 hours') at time zone 'America/Santiago' where user_id=$1",[id(1)]);
 await sesion(1);assert.equal((await enviar(ruta6,'f'.repeat(64))).id,id(50));
 // La API Storage elimina objetos primero; el FK borra todas las filas propias.
 await q("delete from storage.objects where bucket_id='programas'");await q('select eliminar_mi_cuenta()');
 await db.exec('reset role');assert.equal((await q('select * from programas_enviados where user_id=$1',[id(1)])).length,0);
 assert.equal((await q("select * from storage.objects where bucket_id='programas' and name like $1",[id(1)+'/%'])).length,0);
 await sesion(1);await assert.rejects(archivo(1,88),/row-level security/,'token anterior no vuelve a subir después del borrado');
 await db.exec('reset role');await db.exec(sql);assert.equal((await q("select public,file_size_limit,allowed_mime_types from storage.buckets where id='programas'"))[0].public,false);
 await db.exec('set role anon');await assert.rejects(q('select admin_programas_enviados(null)'),/permission denied/);
 console.log('PASS programas SQL: privado, dos usuarios, MFA, UDD, deduplicación, idempotencia, 5/día Chile, grants, cuenta/archivos, token antiguo y reaplicación');
}finally{await db.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
