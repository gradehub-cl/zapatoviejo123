// Calendario del grupo (supabase/amigos_calendario.sql) sobre PostgreSQL real
// en memoria. Solo cuentas, salas y pruebas sintéticas.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{PGlite}=require('@electric-sql/pglite');
const read=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8'),u=i=>`00000000-0000-4000-8000-${String(i).padStart(12,'0')}`;
const A=u(1),B=u(2),C=u(3),D=u(4);
const db=new PGlite(),q=async(sql,p=[])=>(await db.query(sql,p)).rows;
const sesion=async uid=>{await db.exec('reset role');await q("select set_config('request.jwt.claim.sub',$1,false),set_config('test.aal','aal1',false)",[uid||'']);await db.exec('set role authenticated');};
const uno=async(sql,p)=>{const r=await q(sql,p);return r[0]&&Object.values(r[0])[0];};
let ok=0;const paso=n=>{ok++;console.log('  OK   '+n);};
const dia=n=>{const d=new Date(Date.now()-3*36e5);d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10);};
(async()=>{try{
  await db.exec(read('bin/supabase-stubs.sql'));
  await db.exec(`create function auth.jwt() returns jsonb language sql stable as $$ select jsonb_build_object('aal',current_setting('test.aal',true)) $$;
    create table public.profiles(id uuid primary key references auth.users(id) on delete cascade,nombre text,apellido text,universidad text,carrera text);
    create table public.user_ramos(user_id uuid primary key references auth.users(id) on delete cascade,data jsonb);`);
  for(const f of ['clases_particulares','admin_clases','administradores','eliminar_mi_cuenta','amigos','amigos_grupos'])await db.exec(read('supabase/'+f+'.sql'));
  await db.exec(read('supabase/amigos_calendario.sql'));await db.exec(read('supabase/amigos_calendario.sql'));
  paso('se aplica dos veces, después de amigos_grupos.sql');
  for(const [id,n,us] of [[A,'Ana','ana_s'],[B,'Beto','beto_ej'],[C,'Carla','carla.p'],[D,'Dani','dani99']]){
    await q('insert into auth.users(id) values($1)',[id]);
    await q("insert into public.profiles values($1,$2,'Sintético','uc','Carrera de Ejemplo')",[id,n]);
    await q('insert into public.usernames(user_id,username) values($1,$2)',[id,us]);
  }
  for(const [x,y] of [[A,B],[A,C]])await q("insert into public.amistades(de,para,estado,aceptada_at) values($1,$2,'aceptada',now())",[x,y]);
  const tablas=['amigos_grupo_reservas','amigos_pruebas'];
  await sesion(A);for(const t of tablas)await assert.rejects(q(`select * from public.${t}`),/permission denied/,t);
  await db.exec('reset role');
  assert.equal((await q('select relname from pg_class where relname = any($1) and relrowsecurity',[tablas])).length,2);
  const fk=await q(`select c.conrelid::regclass::text t,a.attname col,c.confdeltype from pg_constraint c join pg_attribute a on a.attrelid=c.conrelid and a.attnum=any(c.conkey)
    where c.contype='f' and c.confrelid='auth.users'::regclass and c.conrelid::regclass::text = any($1) order by 1,2`,[tablas.concat(tablas.map(t=>'public.'+t))]);
  assert.deepEqual(fk.map(f=>`${f.t.replace('public.','')}.${f.col}:${f.confdeltype}`),['amigos_grupo_reservas.user_id:c','amigos_pruebas.user_id:c']);
  paso('tablas cerradas, con RLS y en cascada');

  await sesion(A);const g=await uno('select public.crear_grupo($1,$2)',['Estudio',['beto_ej','carla.p']]);
  await sesion(B);await uno('select public.responder_grupo($1,true)',[g]);
  await sesion(C);await uno('select public.responder_grupo($1,true)',[g]);

  // ─── Reservas ───
  await sesion(B);
  const r1=await uno("select public.agregar_reserva_grupo($1,$2,$3,'14:00','16:00')",[g,' Sala B-12, Biblioteca ',dia(2)]);
  await assert.rejects(q("select public.agregar_reserva_grupo($1,'Sala',$2,'16:00','14:00')",[g,dia(2)]),/después/);
  await assert.rejects(q("select public.agregar_reserva_grupo($1,'Sala',$2,'10:00','11:00')",[g,dia(-1)]),/60 días/);
  await assert.rejects(q("select public.agregar_reserva_grupo($1,'Sala',$2,'10:00','11:00')",[g,dia(61)]),/60 días/);
  await assert.rejects(q("select public.agregar_reserva_grupo($1,'Sala del wn',$2,'10:00','11:00')",[g,dia(1)]),/no está permitido/);
  await sesion(D);await assert.rejects(q("select public.agregar_reserva_grupo($1,'Sala',$2,'10:00','11:00')",[g,dia(1)]),/no estás/,'quien no está no anota');
  await assert.rejects(q('select * from public.grupo_calendario($1)',[g]),/no estás/,'ni mira');
  await sesion(C);
  let cal=await q('select * from public.grupo_calendario($1)',[g]);
  assert.deepEqual(cal.map(c=>[c.tipo,c.username,c.yo,c.inicio,c.fin,c.titulo]),[['reserva','beto_ej',false,'14:00','16:00','Sala B-12, Biblioteca']]);
  assert.equal(await uno('select public.borrar_reserva_grupo($1)',[r1]),false,'solo quien la anotó la borra');
  paso('reservas: solo miembros, con fecha y hora válidas, filtradas');

  // ─── Pruebas ───
  await sesion(A);
  assert.equal(await uno('select public.amigos_pruebas_estado()'),false,'parte apagado');
  assert.equal(await uno('select public.publicar_mis_pruebas($1)',[JSON.stringify([
    {ramo:'Curso Uno',sigla:'syn101',nombre:'Prueba 1',fecha:dia(3),hora:'10:00',nota:6.5,peso:30},
    {ramo:'Curso Uno',nombre:'Control',fecha:'2026-02-30'},{ramo:'Curso Dos',nombre:'Examen',fecha:dia(90)},{ramo:'',nombre:'x',fecha:dia(1)}])]),2,'fechas imposibles y vacíos se descartan');
  await sesion(C);cal=await q('select * from public.grupo_calendario($1)',[g]);
  assert.deepEqual(cal.map(c=>[c.tipo,c.username,c.titulo,c.detalle,c.inicio]),[['reserva','beto_ej','Sala B-12, Biblioteca',null,'14:00'],['prueba','ana_s','Prueba 1','SYN101','10:00']],
    'solo los próximos 21 días por defecto');
  assert(!JSON.stringify(cal).match(/6\.5|peso|nota/),'nunca notas ni ponderaciones');
  assert.equal((await q('select * from public.grupo_calendario($1,60)',[g])).length,2,'90 días adelante no entra ni pidiendo 60');
  await sesion(A);await uno('select public.dejar_de_compartir_pruebas()');
  await sesion(C);assert.equal((await q('select * from public.grupo_calendario($1)',[g])).filter(c=>c.tipo==='prueba').length,0,'apagar borra lo publicado');
  paso('pruebas: apagadas por defecto, sin notas, validadas y se apagan');

  // ─── Bloqueo, otra U y salir ───
  await sesion(C);await uno('select public.bloquear_usuario($1)',['beto_ej']);
  assert.equal((await q('select * from public.grupo_calendario($1)',[g])).length,0,'un bloqueo oculta sus reservas');
  await uno('select public.desbloquear_usuario($1)',['beto_ej']);
  await db.exec('reset role');await q("update public.profiles set universidad='uai' where id=$1",[B]);
  await sesion(C);assert.equal((await q('select * from public.grupo_calendario($1)',[g])).length,0,'otra U no se ve');
  await db.exec('reset role');await q("update public.profiles set universidad='uc' where id=$1",[B]);
  await sesion(B);await uno('select public.salir_de_grupo($1)',[g]);
  await db.exec('reset role');assert.equal(await uno('select count(*)::int from public.amigos_grupo_reservas where user_id=$1',[B]),0,'salir se lleva sus reservas');
  paso('bloqueos, otra U y salir del grupo');

  // ─── Borrar la cuenta ───
  await sesion(A);await uno("select public.agregar_reserva_grupo($1,'Sala',$2,'10:00','11:00')",[g,dia(1)]);await uno('select public.publicar_mis_pruebas($1)',[JSON.stringify([{ramo:'X',nombre:'P',fecha:dia(2)}])]);
  await q('select public.eliminar_mi_cuenta()');
  await db.exec('reset role');
  for(const t of tablas)assert.equal(await uno(`select count(*)::int from public.${t} where user_id=$1`,[A]),0,t);
  paso('eliminar la cuenta no deja reservas ni pruebas');
  console.log(`\nPASS: ${ok}   FAIL: 0`);
}catch(e){console.error(e);console.log('\nPASS: '+ok+'   FAIL: 1');process.exit(1);}})();
