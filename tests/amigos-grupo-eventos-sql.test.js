// Novedades del grupo (supabase/amigos_grupo_eventos.sql) sobre PostgreSQL real
// en memoria. Solo cuentas, salas y fechas sintéticas.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{PGlite}=require('@electric-sql/pglite');
const read=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8'),u=i=>`00000000-0000-4000-8000-${String(i).padStart(12,'0')}`;
const A=u(1),B=u(2),C=u(3),D=u(4);
const db=new PGlite(),q=async(sql,p=[])=>(await db.query(sql,p)).rows;
const sesion=async uid=>{await db.exec('reset role');await q("select set_config('request.jwt.claim.sub',$1,false),set_config('test.aal','aal1',false)",[uid||'']);await db.exec('set role authenticated');};
const uno=async(sql,p)=>{const r=await q(sql,p);return r[0]&&Object.values(r[0])[0];};
let ok=0;const paso=n=>{ok++;console.log('  OK   '+n);};
const dia=n=>{const d=new Date(Date.now()-3*36e5);d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10);};
const hilo=async g=>(await q('select tipo,username,yo,datos from public.grupo_novedades($1)',[g]));
(async()=>{try{
  await db.exec(read('bin/supabase-stubs.sql'));
  await db.exec(`create function auth.jwt() returns jsonb language sql stable as $$ select jsonb_build_object('aal',current_setting('test.aal',true)) $$;
    create table public.profiles(id uuid primary key references auth.users(id) on delete cascade,nombre text,apellido text,universidad text,carrera text);
    create table public.user_ramos(user_id uuid primary key references auth.users(id) on delete cascade,data jsonb);`);
  for(const f of ['clases_particulares','admin_clases','administradores','eliminar_mi_cuenta','amigos','amigos_grupos','amigos_calendario'])await db.exec(read('supabase/'+f+'.sql'));
  for(const [id,n,us] of [[A,'Ana','ana_s'],[B,'Beto','beto_ej'],[C,'Carla','carla.p'],[D,'Dani','dani99']]){
    await q('insert into auth.users(id) values($1)',[id]);
    await q("insert into public.profiles values($1,$2,'Sintético','uc','Carrera de Ejemplo')",[id,n]);
    await q('insert into public.usernames(user_id,username) values($1,$2)',[id,us]);
  }
  for(const [x,y] of [[A,B],[A,C],[A,D]])await q("insert into public.amistades(de,para,estado,aceptada_at) values($1,$2,'aceptada',now())",[x,y]);
  // Una sala que ya existía antes de aplicar: entra al hilo al aplicar.
  await sesion(A);const g=await uno('select public.crear_grupo($1,$2)',['Estudio',['beto_ej','carla.p','dani99']]);
  await sesion(B);await uno('select public.responder_grupo($1,true)',[g]);
  const vieja=await uno("select public.agregar_reserva_grupo($1,'Sala vieja',$2,'10:00','11:00')",[g,dia(3)]);
  await db.exec('reset role');
  await db.exec(read('supabase/amigos_grupo_eventos.sql'));await db.exec(read('supabase/amigos_grupo_eventos.sql'));
  assert.equal(await uno("select count(*)::int from public.amigos_grupo_eventos where reserva_id=$1",[vieja]),1,'la sala que ya existía entra una sola vez');
  paso('se aplica dos veces y trae las salas por venir que ya existían');

  await sesion(A);await assert.rejects(q('select * from public.amigos_grupo_eventos'),/permission denied/);
  await db.exec('reset role');
  const fk=await q(`select a.attname col,c.confdeltype from pg_constraint c join pg_attribute a on a.attrelid=c.conrelid and a.attnum=any(c.conkey)
    where c.contype='f' and c.conrelid='public.amigos_grupo_eventos'::regclass order by 1`);
  assert.deepEqual(fk.map(f=>`${f.col}:${f.confdeltype}`),['grupo_id:c','reserva_id:c','user_id:c']);
  paso('tabla cerrada, con RLS y en cascada');

  // ─── Unión y sala ───
  await sesion(C);await uno('select public.responder_grupo($1,true)',[g]);
  await sesion(B);await uno("select public.agregar_reserva_grupo($1,'Sala B-12',$2,'12:10','14:00','4821')",[g,dia(1)]);
  await sesion(A);let h=await hilo(g);
  assert.deepEqual(h.map(e=>[e.tipo,e.username]),[['sala','beto_ej'],['union','carla.p'],['sala','beto_ej']],'lo más nuevo primero');
  assert.equal(h[0].datos.codigo,'4821');assert.equal(h[0].datos.lugar,'Sala B-12');
  paso('quien entra y la sala anotada, con su código, en orden');

  // ─── Fechas ───
  await sesion(B);
  assert.equal(await uno('select public.publicar_mis_pruebas($1)',[JSON.stringify([{ramo:'Curso Uno',sigla:'SYN101',nombre:'Interrogación 2',fecha:dia(5),hora:'18:30',nota:6.5}])]),1);
  await sesion(A);assert.equal((await hilo(g)).filter(e=>e.tipo==='fecha').length,0,'activar «Compartir fechas» no avisa todo de golpe');
  await sesion(B);
  await uno('select public.publicar_mis_pruebas($1)',[JSON.stringify([{ramo:'Curso Uno',sigla:'SYN101',nombre:'Interrogación 2',fecha:dia(5),hora:'18:30'},{ramo:'Curso Uno',sigla:'SYN101',nombre:'Control 3',fecha:dia(6),hora:null}])]);
  await sesion(A);h=await hilo(g);
  const f=h.filter(e=>e.tipo==='fecha');
  assert.equal(f.length,1,'solo la fecha nueva');assert.equal(f[0].datos.nombre,'Control 3');assert.equal(f[0].datos.sigla,'SYN101');
  assert.ok(!JSON.stringify(h).match(/6\.5|nota|peso/),'nunca notas ni ponderaciones');
  await sesion(C);await uno('select public.publicar_mis_pruebas($1)',[JSON.stringify([])]);
  await uno('select public.publicar_mis_pruebas($1)',[JSON.stringify([{ramo:'Curso Uno',sigla:'SYN101',nombre:'Control 3',fecha:dia(6),hora:null}])]);
  await sesion(A);assert.equal((await hilo(g)).filter(e=>e.tipo==='fecha').length,1,'la misma fecha puesta por otra persona no se repite');
  paso('fechas: solo lo nuevo, sin notas, sin repetir');

  // ─── Privacidad ───
  await sesion(B);await uno('select public.dejar_de_compartir_pruebas()');
  await sesion(A);assert.equal((await hilo(g)).filter(e=>e.tipo==='fecha').length,0,'dejar de compartir borra sus fechas');
  await sesion(A);await uno('select public.bloquear_usuario($1)',['beto_ej']);
  assert.equal((await hilo(g)).filter(e=>e.username==='beto_ej').length,0,'un bloqueo oculta lo suyo');
  await uno('select public.desbloquear_usuario($1)',['beto_ej']);
  await sesion(D);await assert.rejects(q('select * from public.grupo_novedades($1)',[g]),/no estás/,'una invitación pendiente no lee el hilo');
  await db.exec('reset role');const rid=(await q("select id from public.amigos_grupo_reservas where lugar='Sala B-12'"))[0].id;
  await sesion(B);await uno('select public.borrar_reserva_grupo($1)',[rid]);
  await sesion(A);assert.equal((await hilo(g)).filter(e=>e.datos&&e.datos.lugar==='Sala B-12').length,0,'borrar la sala la saca del hilo');
  await sesion(C);await uno('select public.salir_de_grupo($1)',[g]);
  await db.exec('reset role');assert.equal(await uno('select count(*)::int from public.amigos_grupo_eventos where user_id=$1',[C]),0,'salir se lleva sus eventos');
  paso('dejar de compartir, bloqueo, invitación, borrar sala y salir');

  // ─── Borrar la cuenta ───
  await sesion(B);await q('select public.eliminar_mi_cuenta()');
  await db.exec('reset role');assert.equal(await uno('select count(*)::int from public.amigos_grupo_eventos where user_id=$1',[B]),0);
  paso('eliminar la cuenta no deja eventos');
  console.log(`\nPASS: ${ok}   FAIL: 0`);
}catch(e){console.error(e);console.log('\nPASS: '+ok+'   FAIL: 1');process.exit(1);}})();
