const assert=require('assert/strict'),fs=require('fs'),vm=require('vm'),{PGlite}=require('@electric-sql/pglite');
const read=f=>fs.readFileSync(f,'utf8'),id=n=>'00000000-0000-0000-0000-'+String(n).padStart(12,'0');
(async()=>{
 const db=new PGlite();await db.exec(read('bin/supabase-stubs.sql'));
 await db.exec(`grant all on storage.objects to authenticated;
 create function auth.jwt() returns jsonb language sql stable as $$select jsonb_build_object('aal',current_setting('test.aal',true))$$;
 create table user_ramos(user_id uuid primary key references auth.users(id),data jsonb);
 create table catalogo_uc(sigla text primary key,nombre text,creditos int,busqueda text);
 create table catalog_reports(id uuid primary key default gen_random_uuid(),user_id uuid references auth.users(id),tenant text,carrera text,ramo text,ramo_norm text,estructura jsonb,huella text,nota text,created_at timestamptz default now());`);
 for(const f of ['clases_particulares','admin_clases','administradores','catalog_consensus','consenso_periodo','pautas_banco'])await db.exec(read('supabase/'+f+'.sql'));
 await db.exec(read('supabase/pautas_banco.sql'));
 for(let i=1;i<=3;i++)await db.query('insert into auth.users(id) values($1)',[id(i)]);
 await db.query('insert into admin.administradores(user_id) values($1)',[id(1)]);
 await db.query(`insert into catalog_reports(user_id,tenant,ramo,ramo_norm,ramo_sigla,estructura,huella,nota,periodo,origen,seccion) values($1,'uc','Ramo sintético','ramo sintetico','SYN100','[{"nombre":"Prueba","peso":60},{"nombre":"Examen","peso":40}]','h','Comentario de prueba','2026-2','explicito',2)`,[id(2)]);
 const sesion=async(uid,aal)=>db.query("select set_config('request.jwt.claim.sub',$1,false),set_config('test.aal',$2,false)",[uid,aal]);
 const buscar=()=>db.query("select admin_pautas_banco('uc','2026-2','SYN100') filas");
 const guardar=(ruta=null,sha=null)=>db.query("select admin_guardar_pauta_banco('uc','SYN100','2026-2','en_disputa','Revisar programa',$1,$2) id",[ruta,sha]);
 await db.exec('set role anon');await assert.rejects(buscar(),/permission denied/);await db.exec('reset role;set role authenticated');
 for(const [u,a] of [[id(2),'aal2'],[id(3),'aal2'],[id(1),'aal1']]){
  await sesion(u,a);await assert.rejects(buscar(),/sin acceso/);await assert.rejects(guardar(),/sin acceso/);
  assert.equal((await db.query('select * from pautas_banco')).rows.length,0);
  await assert.rejects(db.query("insert into storage.objects(bucket_id,name) values('pautas-programas','uc/SYN100/2026-2/prueba.pdf')"),/row-level|permission/);
 }
 await sesion(id(1),'aal2');await guardar();
 const udd=(await db.query("select admin_pautas_banco('udd','2026-2','SPF115') filas")).rows[0].filas;
 assert.equal(udd.length,1);assert.equal(udd[0].sigla,'SPF115');assert.match(udd[0].fuente,/udd\.cl\/wp-content\/uploads\/2025\/06\/spf115\.pdf/);assert.equal(udd[0].periodo_catalogo,null,'subida no inventa vigencia');
 assert(udd[0].faltantes.some(t=>/período/i.test(t)));
 const filas=(await buscar()).rows[0].filas;assert.equal(filas.length,1);assert.equal(filas[0].variantes[0].personas,1);assert.deepEqual(filas[0].variantes[0].comentarios,['Comentario de prueba']);
 assert(!/user_id|email|revisado_por/.test(JSON.stringify(filas)));
 await assert.rejects(db.query("update pautas_banco set nota_interna='trampa'"),/permission denied/);
 const ruta='uc/SYN100/2026-2/prueba.pdf';await db.query("insert into storage.objects(bucket_id,name) values('pautas-programas',$1)",[ruta]);
 await assert.rejects(guardar(ruta,null),/check constraint/);await assert.rejects(guardar('uc/SYN100/2026-2/no-existe.pdf','a'.repeat(64)),/no está guardado/);
 await guardar(ruta,'a'.repeat(64));const fila=(await db.query('select * from pautas_banco')).rows[0];assert.equal(fila.revisado_por,id(1));assert.equal(fila.documento_sha256,'a'.repeat(64));
 await db.exec('reset role');assert.equal((await db.query("select public from storage.buckets where id='pautas-programas'")).rows[0].public,false);
 await db.query('delete from auth.users where id=$1',[id(1)]);assert.equal((await db.query('select revisado_por from pautas_banco')).rows[0].revisado_por,null,'borrar revisor no borra programa');
 // El HTML escapa comentarios y no presenta una pauta sin documento como verificada.
 const ctx={esc:s=>String(s).replaceAll('<','&lt;').replaceAll('>','&gt;')};vm.createContext(ctx);vm.runInContext(read('src/marketplace/admin-pautas.js'),ctx);
 const html=ctx.filaPautaBancoHTML({...filas[0],nombre:'<script>',variantes:[{personas:1,origen:'explicito',seccion:2,estructura:[],comentarios:['<img onerror=x>']}]},0);
 assert(!html.includes('<script>'));assert(html.includes('&lt;img'));assert(html.includes('Fuente documental no registrada'));
 await db.close();console.log('PASS banco: reaplicación, admin+MFA, RLS, Storage privado, hash, FK y HTML');
})().catch(e=>{console.error(e);process.exit(1)});
