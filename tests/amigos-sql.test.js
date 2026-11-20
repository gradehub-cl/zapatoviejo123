// Amigos (supabase/amigos.sql) sobre PostgreSQL real en memoria.
// Solo cuentas, nombres, ramos y horarios sintéticos.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{PGlite}=require('@electric-sql/pglite');
const read=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8'),u=i=>`00000000-0000-4000-8000-${String(i).padStart(12,'0')}`;
const A=u(1),B=u(2),C=u(3),D=u(4),ADMIN=u(5),E=u(6);
const db=new PGlite(),q=async(sql,p=[])=>(await db.query(sql,p)).rows;
const sesion=async(uid,aal='aal1')=>{await db.exec('reset role');await q("select set_config('request.jwt.claim.sub',$1,false),set_config('test.aal',$2,false)",[uid||'',aal]);await db.exec('set role authenticated');};
const uno=async(sql,p)=>{const r=await q(sql,p);return r[0]&&Object.values(r[0])[0];};
let ok=0;const paso=n=>{ok++;console.log('  OK   '+n);};
(async()=>{try{
  await db.exec(read('bin/supabase-stubs.sql'));
  await db.exec(`create function auth.jwt() returns jsonb language sql stable as $$ select jsonb_build_object('aal',current_setting('test.aal',true)) $$;
    create table public.profiles(id uuid primary key references auth.users(id) on delete cascade,nombre text,apellido text,universidad text,carrera text);
    create table public.user_ramos(user_id uuid primary key references auth.users(id) on delete cascade,data jsonb);`);
  for(const f of ['clases_particulares','admin_clases','administradores','eliminar_mi_cuenta'])await db.exec(read('supabase/'+f+'.sql'));
  await db.exec(read('supabase/amigos.sql'));
  await db.exec(read('supabase/amigos.sql'));paso('se puede aplicar dos veces');
  for(const id of [A,B,C,D,ADMIN,E])await q('insert into auth.users(id) values($1)',[id]);
  await q('insert into admin.administradores(user_id) values($1)',[ADMIN]);
  for(const [id,n,ap] of [[A,'Ana','Sintética'],[B,'Beto','Ejemplo'],[C,'Carla','Prueba'],[D,'Dani','Ficticio']])
    await q("insert into public.profiles values($1,$2,$3,'uc','Ingeniería de Ejemplo')",[id,n,ap]);
  const ramoB={id:'rb1',nombre:'Curso Sintético',sigla:'SYN101',seccion:2,origen:{tenant:'uc',ramoKey:'SYN101'},
    horario:[{id:'b1',dias:['L','W'],inicio:'08:20',fin:'09:30',sala:'K201',tipo:'CLAS'},{id:'b2',dias:['V'],inicio:'14:00',fin:'15:10',sala:'B12',tipo:'AYU',noVoy:true}],
    categorias:[{id:'c',nombre:'Prueba secreta',peso:100,notas:[{id:'n',valor:6.5}]}]};
  await q('insert into public.user_ramos values($1,$2)',[B,JSON.stringify({tenant:'uc',userName:'Beto',ramos:[ramoB,{id:'rb2',nombre:'Sin horario',origen:{ramoKey:'SYN202'}}],historial:[{id:'h',ramos:[{nombre:'Viejo',avgOverride:4.5}]}]})]);

  // ─── Tablas cerradas: RLS y sin permisos; todo se borra con la cuenta ───
  const tablas=['usernames','amistades','amigos_bloqueos','amigos_ajustes','amigos_denuncias'];
  await sesion(A);
  for(const t of tablas)await assert.rejects(q(`select * from public.${t}`),/permission denied/,t);
  await db.exec('reset role');
  assert.deepEqual((await q(`select relname from pg_class where relname = any($1) and relrowsecurity order by relname`,[tablas])).length,5);
  const fk=await q(`select c.conrelid::regclass::text tabla,a.attname col,c.confdeltype from pg_constraint c join pg_attribute a on a.attrelid=c.conrelid and a.attnum=any(c.conkey)
    where c.contype='f' and c.confrelid='auth.users'::regclass and c.conrelid::regclass::text = any($1) order by 1,2`,[tablas.map(t=>'public.'+t).concat(tablas)]);
  assert.deepEqual(fk.map(f=>`${f.tabla.replace('public.','')}.${f.col}:${f.confdeltype}`),
    ['amigos_ajustes.user_id:c','amigos_bloqueos.bloqueado:c','amigos_bloqueos.user_id:c','amigos_denuncias.denunciado:c','amigos_denuncias.resuelta_por:n','amigos_denuncias.user_id:c',
     'amistades.de:c','amistades.para:c','usernames.user_id:c']);
  paso('tablas sin acceso directo, con RLS y en cascada');
  await sesion(null);await assert.rejects(q('select public.amigos_estado()'),/iniciado sesión/);
  await db.exec('reset role');await db.exec('set role anon');await assert.rejects(q('select public.amigos_estado()'),/permission denied/);
  paso('sin sesión no hay nada');

  // ─── Username ───
  await sesion(A);
  assert.equal((await uno('select public.amigos_estado()')).username,null);
  for(const [txt,esp] of [['ab','invalido'],['.ana','invalido'],['ana..b','invalido'],['a'.repeat(21),'invalido'],['Ana Sin','invalido'],
                          ['admin','reservado'],['soporte.uc','reservado'],['gradehub_cl','reservado'],['uc','invalido'],['puc','reservado'],['el_w3on','no_permitido'],['wn.feo','no_permitido'],['gilberto','disponible'],['penelope.v','disponible'],['maricel_r','disponible'],['vergara','disponible'],['ing.computacion','disponible'],['concha.toro','disponible'],['@Ana.Sint','disponible']])
    assert.equal(await uno('select public.amigos_username_disponible($1)',[txt]),esp,txt);
  assert.equal(await uno('select public.fijar_username($1)',['  @Ana.Sint ']),'ana.sint','normaliza @, espacios y mayúsculas');
  assert.equal(await uno('select public.fijar_username($1)',['ana.sint']),'ana.sint','repetir el mismo no es un cambio');
  await assert.rejects(q('select public.fijar_username($1)',['ana_otra']),/30 días/,'cambiar al tiro no se puede');
  await assert.rejects(q('select public.fijar_username($1)',['administrador']),/reservado/);
  await assert.rejects(q('select public.fijar_username($1)',['putoelquelee']),/no está permitido/);
  await sesion(B);
  assert.equal(await uno('select public.amigos_username_disponible($1)',['ANA.SINT']),'ocupado');
  await assert.rejects(q('select public.fijar_username($1)',['Ana.Sint']),/ocupado/);
  await uno('select public.fijar_username($1)',['beto_ej']);
  await sesion(C);await uno('select public.fijar_username($1)',['carla.p']);
  await sesion(D);await uno('select public.fijar_username($1)',['dani99']);
  await db.exec('reset role');await q("update public.usernames set cambiado_at = now() - interval '31 days' where user_id=$1",[A]);
  await sesion(A);assert.equal(await uno('select public.fijar_username($1)',['ana_s']),'ana_s','después de 30 días sí');
  paso('username: formato, reservados, únicos y cambio cada 30 días');

  // ─── Buscar: solo exacto; sin user_id ni correo ───
  const r=await q('select * from public.buscar_usuario($1)',['@BETO_EJ']);
  assert.deepEqual(r,[{username:'beto_ej',nombre:'Beto',apellido:'Ejemplo',universidad:'uc',relacion:'ninguna'}]);
  assert.equal((await q('select * from public.buscar_usuario($1)',['beto'])).length,0,'no busca por parte del nombre');
  assert.equal((await q('select * from public.buscar_usuario($1)',['ana_s']))[0].relacion,'yo');
  paso('buscar solo por username exacto y sin datos de cuenta');

  // ─── Solicitudes ───
  await sesion(E);await assert.rejects(q('select public.solicitar_amistad($1)',['beto_ej']),/elige tu username/);
  await sesion(A);
  await assert.rejects(q('select public.solicitar_amistad($1)',['nadie.aca']),/no encontramos/);
  await assert.rejects(q('select public.solicitar_amistad($1)',['ana_s']),/a ti/);
  assert.equal(await uno('select public.solicitar_amistad($1)',['beto_ej']),'enviada');
  assert.equal(await uno('select public.solicitar_amistad($1)',['beto_ej']),'enviada','repetir no duplica');
  assert.equal(await uno('select public.solicitar_amistad($1)',['carla.p']),'enviada');
  assert.equal((await q('select * from public.buscar_usuario($1)',['beto_ej']))[0].relacion,'enviada');
  await sesion(B);
  assert.equal((await uno('select public.amigos_estado()')).recibidas,1);
  let mias=await q('select * from public.mis_amistades()');
  assert.equal(mias.length,1);assert.equal(mias[0].estado,'recibida');assert.equal(mias[0].username,'ana_s');
  assert(!Object.keys(mias[0]).some(k=>/user_id|email|^de$|^para$/.test(k)),'sin ids de cuenta');
  assert.equal(mias[0].carrera,null,'una solicitud pendiente no revela la carrera');
  await sesion(C);assert.equal(await uno('select public.responder_amistad($1,false)',[(await q('select id from public.mis_amistades()'))[0].id]),true,'rechazar');
  await sesion(A);assert.deepEqual((await q('select username,estado from public.mis_amistades()')),[{username:'beto_ej',estado:'enviada'}],'rechazar borra sin aviso');
  await sesion(D);assert.equal(await uno('select public.responder_amistad($1,true)',[mias[0].id]),false,'no se responde una solicitud ajena');
  await sesion(B);assert.equal(await uno('select public.responder_amistad($1,true)',[mias[0].id]),true);
  await sesion(A);assert.deepEqual((await q('select username,estado from public.mis_amistades()')),[{username:'beto_ej',estado:'amigos'}]);
  assert.equal((await q('select carrera from public.mis_amistades()'))[0].carrera,'Ingeniería de Ejemplo','entre amigos, sí');
  // Pedir a quien ya me pidió es aceptar.
  await sesion(D);await uno('select public.solicitar_amistad($1)',['ana_s']);
  await sesion(A);assert.equal(await uno('select public.solicitar_amistad($1)',['dani99']),'amigos');
  paso('pedir, rechazar, aceptar y aceptar pidiendo de vuelta');
  // Límite diario.
  await db.exec('reset role');
  const extras=[];for(let i=0;i<31;i++){const id=u(100+i);extras.push(id);await q('insert into auth.users(id) values($1)',[id]);await q("insert into public.usernames(user_id,username) values($1,$2)",[id,'extra'+i]);}
  await sesion(C);for(let i=0;i<30;i++)await uno('select public.solicitar_amistad($1)',['extra'+i]);
  await assert.rejects(q('select public.solicitar_amistad($1)',['extra30']),/demasiadas/);
  await db.exec('reset role');await q('delete from auth.users where id = any($1)',[extras]);
  paso('hasta 30 solicitudes por día');

  // ─── Horario: solo amigos aceptados, solo lo permitido del JSON ───
  await sesion(A);
  let h=await q('select * from public.amigos_horarios()');
  const hb=h.find(x=>x.username==='beto_ej');
  assert.deepEqual(hb.ramos,[
    {nombre:'Curso Sintético',sigla:'SYN101',seccion:2,horario:[{dias:['L','W'],inicio:'08:20',fin:'09:30',sala:'K201',tipo:'CLAS'}]},
    {nombre:'Sin horario',sigla:'SYN202',seccion:null,horario:[]}]);
  assert(!JSON.stringify(h).match(/Prueba secreta|6\.5|categorias|historial|Viejo|noVoy/),'nada de notas, pautas ni historial');
  assert.deepEqual(h.find(x=>x.username==='dani99').ramos,[],'sin user_ramos, lista vacía');
  await sesion(C);assert.equal((await q('select * from public.amigos_horarios()')).length,0,'quien no es amigo no ve nada');
  await sesion(B);assert.equal(await uno('select public.amigos_compartir_horario(false)'),false);
  assert.equal((await uno('select public.amigos_estado()')).comparte_horario,false);
  await sesion(A);assert.equal((await q('select * from public.amigos_horarios()')).some(x=>x.username==='beto_ej'),false,'apagado deja de verse');
  await sesion(B);await uno('select public.amigos_compartir_horario(true)');
  paso('horario solo entre amigos, sin notas, y se puede apagar');

  // ─── Bloquear ───
  await sesion(B);assert.equal(await uno('select public.bloquear_usuario($1)',['ana_s']),true);
  await sesion(A);
  assert.equal((await q('select * from public.mis_amistades()')).some(x=>x.username==='beto_ej'),false,'bloquear borra la amistad');
  assert.equal((await q('select * from public.buscar_usuario($1)',['beto_ej'])).length,0,'quien fue bloqueado no encuentra');
  await assert.rejects(q('select public.solicitar_amistad($1)',['beto_ej']),/no encontramos/);
  await sesion(B);
  assert.equal((await q('select * from public.buscar_usuario($1)',['ana_s'])).length,0,'quien bloqueó tampoco ve');
  assert.deepEqual(await q('select * from public.mis_bloqueados()'),[{username:'ana_s'}]);
  assert.equal(await uno('select public.desbloquear_usuario($1)',['ana_s']),true);
  await sesion(A);assert.equal((await q('select * from public.buscar_usuario($1)',['beto_ej']))[0].relacion,'ninguna','desbloquear no devuelve la amistad');
  paso('bloquear en ambas direcciones y desbloquear');

  // ─── Eliminar ───
  await sesion(A);const conD=(await q('select id from public.mis_amistades() where username=$1',['dani99']))[0].id;
  await sesion(C);assert.equal(await uno('select public.eliminar_amistad($1)',[conD]),false,'no se borra una amistad ajena');
  await sesion(D);assert.equal(await uno('select public.eliminar_amistad($1)',[conD]),true);
  paso('eliminar solo lo propio');

  // ─── Denunciar y admin ───
  await sesion(A);
  await assert.rejects(q("select public.denunciar_usuario($1,'inventado')",['dani99']),/motivo/);
  await assert.rejects(q("select public.denunciar_usuario($1,'otro',$2)",['dani99','x'.repeat(501)]),/500/);
  await assert.rejects(q("select public.denunciar_usuario($1,'otro')",['ana_s']),/a ti/);
  assert.equal(await uno("select public.denunciar_usuario($1,'username_ofensivo','  ')",['dani99']),true);
  await sesion(B);await uno("select public.denunciar_usuario($1,'acoso','Texto sintético')",['dani99']);
  for(const [uid,aal] of [[A,'aal2'],[ADMIN,'aal1']]){await sesion(uid,aal);await assert.rejects(q('select * from public.admin_denuncias_usuarios()'),/sin acceso/);}
  await sesion(ADMIN,'aal2');
  const den=await q('select * from public.admin_denuncias_usuarios()');
  assert.equal(den.length,2);assert.equal(den[0].mismas,2);assert.equal(den[0].detalle,null);
  assert(!Object.keys(den[0]).some(k=>/user_id|denunciado/.test(k)),'el admin no ve quién denunció');
  assert.equal(await uno("select public.admin_resolver_denuncia_usuario($1,'resuelta')",[den[0].id]),2);
  assert.equal((await q('select * from public.admin_denuncias_usuarios()')).length,0);
  await sesion(D);assert.equal((await uno('select public.amigos_estado()')).username,null,'resuelta le quita el username');
  await db.exec('reset role');assert.equal(await uno("select count(*)::int from admin.acciones where accion='resolver_denuncia_usuario'"),1);
  paso('denunciar con límites y revisión de admin con segundo factor');

  // ─── Borrar la cuenta borra todo lo de amigos ───
  await sesion(B);await uno('select public.bloquear_usuario($1)',['carla.p']);await uno('select public.solicitar_amistad($1)',['ana_s']);
  await sesion(B);await q('select public.eliminar_mi_cuenta()');
  await db.exec('reset role');
  for(const [t,c] of [['usernames','user_id'],['amistades','de'],['amistades','para'],['amigos_bloqueos','user_id'],['amigos_ajustes','user_id'],['amigos_denuncias','user_id']])
    assert.equal(await uno(`select count(*)::int from public.${t} where ${c}=$1`,[B]),0,t+'.'+c);
  paso('eliminar la cuenta no deja nada en Amigos');

  console.log(`\nPASS: ${ok}   FAIL: 0`);
}catch(e){console.error(e);console.log('\nPASS: '+ok+'   FAIL: 1');process.exit(1);}})();
