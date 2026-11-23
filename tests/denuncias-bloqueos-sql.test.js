// Denunciar y bloquear (App Review 1.2) sobre PostgreSQL real en memoria.
// Solo cuentas, perfiles y ramos sintéticos.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{PGlite}=require('@electric-sql/pglite');
const read=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8'),u=i=>`00000000-0000-4000-8000-${String(i).padStart(12,'0')}`;
const PROFE=u(1),PROFE2=u(2),ADMIN=u(3),A=u(4),B=u(5),C=u(6),D=u(7);
const db=new PGlite(),q=async(sql,p=[])=>(await db.query(sql,p)).rows;
const sesion=async(uid,aal='aal1')=>{await db.exec('reset role');await q("select set_config('request.jwt.claim.sub',$1,false),set_config('test.aal',$2,false)",[uid,aal]);await db.exec('set role authenticated');};
const ramo=id=>({id,nombre:'Curso sintético',seccion:1,origen:{tenant:'uc',ramoKey:'TEST101'},categorias:[]});
(async()=>{try{
  await db.exec(read('bin/supabase-stubs.sql'));
  await db.exec(`create function auth.jwt() returns jsonb language sql stable as $$ select jsonb_build_object('aal',current_setting('test.aal',true)) $$;
    create table public.user_ramos(user_id uuid primary key references auth.users(id) on delete cascade,data jsonb);`);
  for(const f of ['clases_particulares','perfil_profesor','admin_clases','administradores','directorio_perfiles','profesores','eliminar_mi_cuenta'])await db.exec(read('supabase/'+f+'.sql'));
  await db.exec(read('supabase/denuncias_bloqueos.sql'));
  await db.exec(read('supabase/denuncias_bloqueos.sql')); // Reaplicable: dos veces seguidas.
  for(const id of [PROFE,PROFE2,ADMIN,A,B,C,D])await q('insert into auth.users(id) values($1)',[id]);
  await q('insert into admin.administradores(user_id) values($1)',[ADMIN]);
  const periodo=(await q('select profesor_periodo_actual() p'))[0].p;
  for(const [id,i] of [[A,1],[B,2],[C,3],[D,4]])await q('insert into user_ramos values($1,$2)',[id,JSON.stringify({tenant:'uc',ramos:[ramo('ramo-'+i)]})]);
  const perfil=async(id,nombre)=>(await q(`insert into tutor_perfiles(user_id,nombre_publico,presentacion,estado,revisado_at,universidades,categorias,etiqueta,color_tarjeta,en_directorio,perfil_publico)
    values($1,$2,'Perfil sintético de una academia de ejemplo','aprobado',now(),array['uc'],array['clases'],'Clases ficticias','#777777',true,true) returning directorio_id`,[id,nombre]))[0].directorio_id;
  const anuncio=async(autor,estado='publicado')=>(await q(`insert into tutor_anuncios(autor_id,tenant,ramos_siglas,modalidad,ubicacion,precio_clp,descripcion,contacto_tipo,contacto_valor,estado,revisado_at,pagado_at,publicado_at,titulo)
    values($1,'uc',array['TEST101'],'individual','online',10000,'Descripción sintética de una clase de ejemplo','whatsapp','+56912345678',$2,now(),now(),now(),'Clase de ejemplo') returning id`,[autor,estado]))[0].id;
  const fichaP=await perfil(PROFE,'Profe Sintético'),fichaP2=await perfil(PROFE2,'Otra Academia');
  const anuncioP=await anuncio(PROFE),anuncioP2=await anuncio(PROFE2),borrador=await anuncio(PROFE,'borrador');

  // Sin acceso directo a las tablas, ni siquiera a lo propio (RLS sin políticas y sin permisos).
  await sesion(A);
  for(const t of ['contenido_denuncias','contenido_bloqueos']){
    await assert.rejects(q(`select * from ${t}`),/permission denied/,t);
    await assert.rejects(q(`insert into ${t}(user_id,autor_id) values($1,$2)`,[A,PROFE]),/permission denied/,t);
  }
  await db.exec('reset role');
  assert.deepEqual((await q("select relname,relrowsecurity from pg_class where relname in ('contenido_denuncias','contenido_bloqueos') order by relname")).map(r=>r.relrowsecurity),[true,true],'RLS activa');
  const fk=await q("select conrelid::regclass::text tabla,a.attname col,confdeltype from pg_constraint c join pg_attribute a on a.attrelid=c.conrelid and a.attnum=any(c.conkey) where c.contype='f' and c.confrelid='auth.users'::regclass and conrelid::regclass::text in ('contenido_denuncias','contenido_bloqueos') order by 1,2");
  assert.deepEqual(fk.map(f=>`${f.tabla}.${f.col}:${f.confdeltype}`),['contenido_bloqueos.autor_id:c','contenido_bloqueos.user_id:c','contenido_denuncias.autor_id:c','contenido_denuncias.resuelta_por:n','contenido_denuncias.user_id:c']);

  // Denunciar un anuncio y una ficha: motivo de la lista, texto opcional y acotado.
  await sesion(A);
  assert.equal((await q("select denunciar_contenido('anuncio',$1,'ofensivo','Texto sintético') ok",[anuncioP]))[0].ok,true);
  assert.equal((await q("select denunciar_contenido('anuncio',$1,'spam') ok",[anuncioP]))[0].ok,true,'repetir actualiza, no duplica');
  await q("select denunciar_contenido('perfil',$1,'enganoso','  ')",[fichaP]);
  await assert.rejects(q("select denunciar_contenido('anuncio',$1,'inventado')",[anuncioP]),/motivo inválido/);
  await assert.rejects(q("select denunciar_contenido('anuncio',$1,'otro',$2)",[anuncioP,'x'.repeat(501)]),/500/);
  await assert.rejects(q("select denunciar_contenido('anuncio',$1,'otro')",[borrador]),/no disponible/,'un borrador no se ve: no se denuncia');
  await assert.rejects(q("select denunciar_contenido('anuncio',$1,'otro')",[u(99)]),/no disponible/);
  await sesion(PROFE);await assert.rejects(q("select denunciar_contenido('perfil',$1,'otro')",[fichaP]),/propio/);
  await db.exec('reset role');
  assert.deepEqual(await q('select tipo,motivo,detalle from contenido_denuncias order by id'),[{tipo:'anuncio',motivo:'spam',detalle:null},{tipo:'perfil',motivo:'enganoso',detalle:null}]);
  // Límite diario por cuenta.
  await q("insert into contenido_denuncias(user_id,tipo,autor_id,motivo) select $1,'perfil',$2,'otro' from generate_series(1,18)",[A,PROFE2]);
  await sesion(A);await assert.rejects(q("select denunciar_contenido('anuncio',$1,'otro')",[anuncioP2]),/demasiadas/);
  await db.exec('reset role');await q("delete from contenido_denuncias where autor_id=$1",[PROFE2]);

  // Opinión de docente: solo la publicada (consenso de 3), sin guardar quién calificó.
  const ctx=i=>['ramo-'+i,1,periodo];
  await sesion(A);await assert.rejects(q("select denunciar_opinion_profesor($1,$2,$3,'ofensivo')",ctx(1)),/no disponible/,'sin consenso no hay opinión pública');
  for(const [id,i] of [[A,1],[B,2],[C,3]]){await sesion(id);await q('select profesor_docente_informar($1,$2,$3,$4)',[...ctx(i),'Docente Sintético Ejemplo']);}
  await sesion(A);assert.equal((await q("select denunciar_opinion_profesor($1,$2,$3,'incorrecto','Otro nombre') ok",ctx(1)))[0].ok,true);
  await sesion(B);await q("select denunciar_opinion_profesor($1,$2,$3,'ofensivo')",ctx(2));
  await sesion(D);await assert.rejects(q("select denunciar_opinion_profesor($1,$2,$3,'ofensivo')",['ramo-9',1,periodo]),/no sincronizados/);

  // Admin: solo con lista y segundo factor; ve el contenido, nunca quién denunció.
  for(const [uid,aal] of [[A,'aal2'],[ADMIN,'aal1']]){await sesion(uid,aal);await assert.rejects(q('select * from admin_denuncias()'),/sin acceso/);}
  await sesion(ADMIN,'aal2');
  let lista=await q('select * from admin_denuncias()');
  assert.equal(lista.length,4);assert(!Object.keys(lista[0]).includes('user_id'),'no expone a quien denuncia');
  const den=t=>lista.find(x=>x.tipo===t);
  assert.equal(den('anuncio').anuncio_titulo,'Clase de ejemplo');assert.equal(den('anuncio').autor_id,PROFE);assert.equal(den('perfil').autor_nombre,'Profe Sintético');
  assert.equal(den('opinion').opinion.docente,'Docente Sintético Ejemplo');assert.equal(den('opinion').mismas,2,'agrupa denuncias del mismo contenido');
  assert.equal(den('opinion').opinion.user_id,undefined);
  assert.equal((await q("select admin_resolver_denuncia($1,'resuelta') n",[den('opinion').id]))[0].n,2,'resuelve todas las del mismo contenido');
  assert.equal((await q("select admin_ocultar_docente_denunciado($1) ok",[den('opinion').id]))[0].ok,true);
  await db.exec('reset role');assert.equal((await q("select count(*)::int n from admin.acciones where accion in ('resolver_denuncia','ocultar_docente')"))[0].n,2);
  await sesion(A);assert.equal((await q('select docente from profesor_calificacion_estado($1,$2,$3)',ctx(1)))[0].docente,null,'el docente oculto deja de publicarse');
  await sesion(ADMIN,'aal2');await assert.rejects(q("select admin_resolver_denuncia($1,'borrada')",[den('anuncio').id]),/estado inválido/);
  assert.equal((await q('select count(*)::int n from admin_denuncias()'))[0].n,2);

  // Bloquear: por anuncio o ficha, sin conocer el uid; afecta solo a quien bloquea.
  await sesion(A);
  await q("select bloquear_autor('anuncio',$1)",[anuncioP]);await q("select bloquear_autor('perfil',$1)",[fichaP]);
  let mios=await q('select * from mis_bloqueos()');
  assert.equal(mios.length,1,'mismo profesor por dos caminos = un bloqueo');
  assert.equal(mios[0].nombre,'Profe Sintético');assert.deepEqual(mios[0].perfiles,[fichaP]);assert.deepEqual(mios[0].anuncios,[anuncioP],'solo anuncios publicados');
  assert(!Object.keys(mios[0]).includes('autor_id'),'nunca el uid del profesor');
  const nuevo=await (async()=>{await db.exec('reset role');return anuncio(PROFE);})();
  await sesion(A);assert.deepEqual((await q('select anuncios from mis_bloqueos()'))[0].anuncios.sort(),[anuncioP,nuevo].sort(),'un anuncio nuevo del bloqueado también queda fuera');
  await sesion(B);assert.deepEqual(await q('select * from mis_bloqueos()'),[],'otra cuenta no ve bloqueos ajenos');
  assert.equal((await q('select desbloquear_autor($1) ok',[mios[0].id]))[0].ok,false,'no deshace un bloqueo ajeno');
  await sesion(PROFE);await assert.rejects(q("select bloquear_autor('perfil',$1)",[fichaP]),/bloquearte/);
  await sesion(A);await q("select bloquear_autor('perfil',$1)",[fichaP2]);
  assert.equal((await q('select desbloquear_autor($1) ok',[mios[0].id]))[0].ok,true);
  assert.deepEqual((await q('select nombre from mis_bloqueos()')).map(x=>x.nombre),['Otra Academia']);
  await q("select bloquear_autor('perfil',$1)",[fichaP]);

  // Borrado de cuenta: se van sus denuncias y bloqueos, como quien denuncia y como profesor.
  await db.exec('reset role');
  const cuenta=async uid=>(await q('select (select count(*) from contenido_denuncias where user_id=$1 or autor_id=$1)::int+(select count(*) from contenido_bloqueos where user_id=$1 or autor_id=$1)::int n',[uid]))[0].n;
  assert(await cuenta(A)>0&&await cuenta(PROFE)>0);
  await sesion(PROFE);await q('select eliminar_mi_cuenta()');
  await db.exec('reset role');assert.equal(await cuenta(PROFE),0,'borrar al profesor borra lo que lo nombra');
  await sesion(A);await q('select eliminar_mi_cuenta()');await db.exec('reset role');
  assert.equal(await cuenta(A),0,'borrar a quien denunció borra sus denuncias y bloqueos');
  await q('delete from auth.users where id=$1',[ADMIN]);
  assert.equal((await q('select count(*)::int n from contenido_denuncias where resuelta_por is null and estado<>$1',['pendiente']))[0].n,(await q("select count(*)::int n from contenido_denuncias where estado<>'pendiente'"))[0].n,'borrar al admin conserva la denuncia resuelta');
  console.log('denuncias-bloqueos-sql OK');
}catch(e){console.error(e);process.exitCode=1;}finally{await db.close();}})();
