// Acceso y borrado reabiertos: solo cuentas y anuncios inventados, PGlite.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {PGlite}=require('@electric-sql/pglite');const read=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
// El delta #1105 va siempre después del Directorio, como en producción.
const sql=read('supabase/directorio_perfiles.sql')+'\n'+read('supabase/ramos_por_universidad.sql'),P='00000000-0000-4000-8000-000000000001',B='00000000-0000-4000-8000-000000000002';
assert.match(sql,/cardinality\(categorias\) between 1 and 4/);assert.match(sql,/between 2 and 28/);assert.match(sql,/\^#\[0-9a-f\]\{6\}\$/);
const salida=sql.split('create or replace function public.directorio_perfiles')[1].split('language sql')[0];assert(!/user_id|correo|email/.test(salida));
assert(!/grant update\s*\([^)]*destacado_hasta/i.test(sql));assert.match(sql,/enable row level security/);
(async()=>{const db=new PGlite();try{
  await db.exec(read('bin/supabase-stubs.sql'));
  await db.exec(`create function auth.jwt() returns jsonb language sql stable as $$select jsonb_build_object('aal',current_setting('test.aal',true))$$;create table user_ramos(user_id uuid);`);
  await db.exec(read('supabase/clases_particulares.sql'));await db.exec(read('supabase/perfil_profesor.sql'));
  await db.exec(read('supabase/admin_clases.sql'));await db.exec(read('supabase/administradores.sql'));
  await db.query('insert into auth.users(id) values($1),($2)',[P,B]);
  await db.query(`insert into tutor_perfiles(user_id,nombre_publico,presentacion,estado,revisado_at,perfil_publico,universidades,tipo_perfil) values($1,'Profe sintética','Presentación ficticia para esta prueba','aprobado',now(),true,array['uc'],'profesor')`,[P]);
  await db.query(`insert into tutor_anuncios(autor_id,tenant,ramos_siglas,modalidad,ubicacion,precio_clp,descripcion,contacto_tipo,contacto_valor,titulo) values($1,'uc',array['SYN101'],'grupal','online',12000,'Anuncio sintético existente para probar compatibilidad','whatsapp','+56912345678','Clase sintética')`,[P]);
  // SQL serializa también -infinity: Node 22 y 24 discrepan al comparar Invalid Date.
  const anuncioAntes=(await db.query('select to_jsonb(a) as documento from tutor_anuncios a order by id')).rows;
  const antes=(await db.query('select * from tutor_perfiles')).rows[0];await db.exec(sql);await db.exec(sql);
  const despues=(await db.query('select * from tutor_perfiles')).rows[0];assert.equal(despues.tipo_perfil,'profesor','reaplicar SQL conserva el tipo guardado');assert.equal(despues.en_directorio,false);assert.equal(despues.perfil_publico,antes.perfil_publico);assert.notEqual(despues.directorio_id,P);
  const sesion=async(uid,rol='authenticated')=>{await db.query("select set_config('request.jwt.claim.sub',$1,false)",[uid]);await db.exec('set role '+rol)};
  const reset=()=>db.exec('reset role');
  await sesion(B);assert.equal((await db.query('select * from directorio_perfiles(\'uc\')')).rows.length,0);assert.equal((await db.query('select nombre_publico from tutor_perfiles')).rows.length,0);await reset();
  await sesion(P);await db.query(`update tutor_perfiles set categorias=array['clases'],etiqueta='Clases STEM',color_tarjeta='#777777',en_directorio=true where user_id=$1`,[P]);
  await db.query("update tutor_perfiles set categorias=array['plataforma'],sitio_web='https://plataforma.example.invalid' where user_id=$1",[P]);
  await reset();await db.exec(sql);await sesion(P);
  assert.deepEqual((await db.query('select categorias,tipo_perfil from tutor_perfiles where user_id=$1',[P])).rows,[{categorias:['plataforma'],tipo_perfil:'profesor'}],'la categoría nueva sobrevive a reaplicar el SQL');
  for(const [col,val] of [['etiqueta','x'],['etiqueta','Dos\nlíneas'],['color_tarjeta','#FFFFFF'],['categorias',['invento']]])await assert.rejects(db.query(`update tutor_perfiles set ${col}=$1 where user_id=$2`,[val,P]));
  await assert.rejects(db.query('update tutor_perfiles set destacado_hasta=now() where user_id=$1',[P]));
  await assert.rejects(db.query('select admin_destacado_perfil($1,now()+interval \'1 day\')',[P]));await reset();
  await sesion(B);let filas=(await db.query('select * from directorio_perfiles(\'uc\')')).rows;assert.equal(filas.length,1);assert.deepEqual(filas[0].categorias,['plataforma']);assert.equal(filas[0].sitio_web,'https://plataforma.example.invalid');assert(!Object.hasOwn(filas[0],'user_id'));assert.equal((await db.query('select * from directorio_perfiles(\'fen\')')).rows.length,0);await reset();
  await db.query(`update tutor_perfiles set estado='suspendido' where user_id=$1`,[P]);await sesion(B);assert.equal((await db.query('select * from directorio_perfiles(\'uc\')')).rows.length,0);await reset();
  await db.query(`update tutor_perfiles set estado='aprobado',contacto_tipo='email',contacto_valor='contacto@example.invalid' where user_id=$1`,[P]);await sesion(B);filas=(await db.query('select * from directorio_perfiles(\'uc\')')).rows;assert.equal(filas[0].contacto_valor,null);
  assert.equal((await db.query('select contacto_directorio_perfil($1,$2) contacto',[filas[0].id,'uc'])).rows[0].contacto.valor,'contacto@example.invalid');
  assert.equal((await db.query('select contacto_directorio_perfil($1,$2) contacto',[filas[0].id,'fen'])).rows[0].contacto,null);await reset();
  await db.exec("insert into admin.administradores(user_id) values('"+B+"');select set_config('test.aal','aal2',false)");await sesion(B);
  assert.equal((await db.query('select admin_destacado_perfil($1,now()+interval \'1 day\') ok',[P])).rows[0].ok,true);assert.equal((await db.query('select * from directorio_perfiles(\'uc\')')).rows[0].destacado,true);await reset();
  assert.deepEqual((await db.query('select to_jsonb(a) as documento from tutor_anuncios a order by id')).rows,anuncioAntes);
  await sesion('', 'anon');await assert.rejects(db.query("select * from directorio_perfiles('uc')"));await reset();
  // Asociación nueva opcional: sin backfill; misma autorización que ramos_siglas.
  assert.equal((await db.query('select ramos_por_universidad from tutor_perfiles where user_id=$1',[P])).rows[0].ramos_por_universidad,null);
  await sesion(P);
  const mapa={uc:['SYN101','REP101'],uai:['UAI101','REP101'],udd:['UDD101']};
  await db.query("update tutor_perfiles set universidades=array['uc','uai','udd'],ramos_por_universidad=$1 where user_id=$2",[JSON.stringify(mapa),P]);
  assert.deepEqual((await db.query('select ramos_siglas from tutor_perfiles where user_id=$1',[P])).rows[0].ramos_siglas,['SYN101','REP101','UAI101','UDD101']);
  await db.query("update tutor_perfiles set ramos_siglas=array['NO-PISAR'] where user_id=$1",[P]);
  assert.equal((await db.query('select ramos_siglas from tutor_perfiles where user_id=$1',[P])).rows[0].ramos_siglas.includes('NO-PISAR'),false);
  for(const m of [[],{otra:['SYN101']},{fen:['SYN101']},{uc:['mat 1']},{uc:[null]},{uc:[42]},{uc:'SYN101'},{uc:Array.from({length:21},(_,i)=>'SYN'+i)}])
    await assert.rejects(db.query('update tutor_perfiles set ramos_por_universidad=$1 where user_id=$2',[JSON.stringify(m),P]),e=>e.code==='23514');
  await assert.rejects(db.query("update tutor_perfiles set universidades=array['uc'] where user_id=$1",[P]),e=>e.code==='23514');
  await reset();await sesion(B);
  assert.equal((await db.query('update tutor_perfiles set ramos_por_universidad=null where user_id=$1 returning nombre_publico',[P])).rows.length,0);
  assert.equal((await db.query('select ramos_por_universidad from tutor_perfiles where user_id=$1',[P])).rows.length,0);
  assert.deepEqual((await db.query("select * from directorio_perfiles('uc')")).rows[0].ramos_por_universidad,mapa);
  const panel=(await db.query('select admin_panel_clases() datos')).rows[0].datos;
  assert.deepEqual(panel.find(p=>p.user_id===P).ramos_por_universidad,mapa,'Admin recibe los grupos por su RPC con MFA');
  await reset();await db.exec(read('supabase/clases_particulares.sql'));await db.exec(read('supabase/perfil_profesor.sql'));await db.exec(sql);await db.exec(sql);
  assert.deepEqual((await db.query('select ramos_por_universidad from tutor_perfiles where user_id=$1',[P])).rows[0].ramos_por_universidad,mapa);
  assert.equal((await db.query("select has_column_privilege('authenticated','tutor_perfiles','ramos_por_universidad','update') ok")).rows[0].ok,true);
  assert.equal((await db.query("select has_column_privilege('anon','tutor_perfiles','ramos_por_universidad','select') ok")).rows[0].ok,false);
  await sesion(P);await db.query("update tutor_perfiles set ramos_por_universidad=null,ramos_siglas=array['LEGACY1'] where user_id=$1",[P]);await reset();await db.exec(read('supabase/perfil_profesor.sql'));
  assert.deepEqual((await db.query('select ramos_siglas,ramos_por_universidad from tutor_perfiles where user_id=$1',[P])).rows[0],{ramos_siglas:['LEGACY1'],ramos_por_universidad:null});
  await db.query('delete from auth.users where id=$1',[P]);assert.equal((await db.query('select * from tutor_perfiles')).rows.length,0);
  console.log('PASS: SQL reaplicable, checks, consentimiento, RLS propia, RPC pública sin uid/correo, admin MFA y cascade');
}finally{await db.close()}})().catch(e=>{console.error(e);process.exitCode=1});
