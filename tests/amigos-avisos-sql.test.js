// Avisos push de Amigos (supabase/amigos_avisos.sql) sobre PostgreSQL real en
// memoria. Solo cuentas y tokens sintéticos; acá no se manda nada a Apple.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{PGlite}=require('@electric-sql/pglite');
const read=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8'),u=i=>`00000000-0000-4000-8000-${String(i).padStart(12,'0')}`;
const A=u(1),B=u(2),C=u(3),D=u(4);
const db=new PGlite(),q=async(sql,p=[])=>(await db.query(sql,p)).rows;
const sesion=async uid=>{await db.exec('reset role');await q("select set_config('request.jwt.claim.sub',$1,false),set_config('test.aal','aal1',false)",[uid||'']);await db.exec('set role authenticated');};
const uno=async(sql,p)=>{const r=await q(sql,p);return r[0]&&Object.values(r[0])[0];};
const tok=c=>c.repeat(64);
const cola=async()=>{await db.exec('reset role');return q('select user_id,titulo,cuerpo,enlace from public.avisos_salientes order by id');};
let ok=0;const paso=n=>{ok++;console.log('  OK   '+n);};
const dia=n=>{const d=new Date(Date.now()-3*36e5);d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10);};
(async()=>{try{
  await db.exec(read('bin/supabase-stubs.sql'));
  await db.exec(`create function auth.jwt() returns jsonb language sql stable as $$ select jsonb_build_object('aal',current_setting('test.aal',true)) $$;
    create table public.profiles(id uuid primary key references auth.users(id) on delete cascade,nombre text,apellido text,universidad text,carrera text);
    create table public.user_ramos(user_id uuid primary key references auth.users(id) on delete cascade,data jsonb);`);
  for(const f of ['clases_particulares','admin_clases','administradores','eliminar_mi_cuenta','amigos','amigos_grupos','amigos_calendario'])await db.exec(read('supabase/'+f+'.sql'));
  await db.exec(read('supabase/amigos_avisos.sql'));await db.exec(read('supabase/amigos_avisos.sql'));
  paso('se aplica dos veces, después de los otros SQL de Amigos');
  for(const [id,n,us,uni] of [[A,'Ana Sintética','ana_s','uc'],[B,'Beto','beto_ej','uc'],[C,null,'carla.p','uc'],[D,'Dani','dani99','uai']]){
    await q('insert into auth.users(id) values($1)',[id]);
    await q("insert into public.profiles(id,nombre,universidad) values($1,$2,$3)",[id,n,uni]);
    await q('insert into public.usernames(user_id,username) values($1,$2)',[id,us]);
  }
  const tablas=['push_dispositivos','avisos_salientes'];
  await sesion(A);for(const t of tablas)await assert.rejects(q(`select * from public.${t}`),/permission denied/,t);
  await assert.rejects(q("select public.registrar_dispositivo('no-hex')"),/inválido/);
  assert.equal(await uno('select public.registrar_dispositivo($1)',[tok('a').toUpperCase()]),true,'acepta mayúsculas y las normaliza');
  await sesion(B);await uno('select public.registrar_dispositivo($1)',[tok('b')]);
  await sesion(C);await uno('select public.registrar_dispositivo($1)',[tok('c')]);
  await db.exec('reset role');
  const fk=await q(`select c.conrelid::regclass::text t,a.attname col,c.confdeltype from pg_constraint c join pg_attribute a on a.attrelid=c.conrelid and a.attnum=any(c.conkey)
    where c.contype='f' and c.confrelid='auth.users'::regclass and c.conrelid::regclass::text = any($1) order by 1`,[tablas.concat(tablas.map(t=>'public.'+t))]);
  assert.deepEqual(fk.map(f=>`${f.t.replace('public.','')}.${f.col}:${f.confdeltype}`),['avisos_salientes.user_id:c','push_dispositivos.user_id:c']);
  paso('tablas cerradas, en cascada y tokens validados');

  // Solicitud y aceptación.
  await sesion(B);await uno('select public.solicitar_amistad($1)',['ana_s']);
  let c=await cola();
  assert.deepEqual(c,[{user_id:A,titulo:'Solicitud de amistad',cuerpo:'Beto (@beto_ej) quiere ser tu amigo en GradeHub.',enlace:'cl.gradehub.app://amigos'}]);
  await sesion(A);const id=(await q('select id from public.mis_amistades()'))[0].id;await uno('select public.responder_amistad($1,true)',[id]);
  c=await cola();assert.equal(c.at(-1).user_id,B);assert.equal(c.at(-1).cuerpo,'Ana (@ana_s) aceptó tu solicitud.');assert.equal(c.at(-1).enlace,'cl.gradehub.app://amigo/'+id);
  await sesion(C);await uno('select public.solicitar_amistad($1)',['ana_s']);
  c=await cola();assert.equal(c.at(-1).cuerpo,'@carla.p quiere ser tu amigo en GradeHub.','sin nombre, el username');
  await sesion(D);await assert.rejects(q('select public.solicitar_amistad($1)',['ana_s']),/no encontramos/);
  assert.equal((await cola()).length,3,'otra U no genera avisos');
  paso('solicitud y aceptación avisan, con nombre de pila y username');

  // Grupo y sala.
  await sesion(A);await uno('select public.responder_amistad($1,true)',[(await q("select id from public.mis_amistades() where username='carla.p'"))[0].id]);
  const g=await uno('select public.crear_grupo($1,$2)',['Estudio Micro',['beto_ej','carla.p']]);
  c=await cola();assert(c.some(x=>x.user_id===B&&x.cuerpo==='Ana (@ana_s) te invitó a «Estudio Micro».'));
  await sesion(B);await uno('select public.responder_grupo($1,true)',[g]);
  await sesion(C);await uno('select public.responder_grupo($1,true)',[g]);
  await db.exec('reset role');await q('delete from public.avisos_salientes');
  await sesion(B);await uno("select public.agregar_reserva_grupo($1,'Sala B-12',$2,'14:00','16:00')",[g,dia(1)]);
  c=await cola();
  assert.deepEqual(c.map(x=>x.user_id).sort(),[A,C].sort(),'a los demás miembros, no a quien la anotó');
  assert.equal(c[0].titulo,'Estudio Micro');assert.equal(c[0].cuerpo,'Beto (@beto_ej) reservó Sala B-12, mañana a las 14:00.');
  assert(!JSON.stringify(c).match(/nota|promedio|SYN/),'nunca notas ni ramos');
  paso('invitación a grupo y sala nueva avisan a quien corresponde');

  // Bloqueo: C bloquea a B; la próxima sala de B no le avisa a C.
  await sesion(C);await uno('select public.bloquear_usuario($1)',['beto_ej']);
  await db.exec('reset role');await q('delete from public.avisos_salientes');
  await sesion(B);await uno("select public.agregar_reserva_grupo($1,'Sala 3',$2,'10:00','11:00')",[g,dia(2)]);
  assert.deepEqual((await cola()).map(x=>x.user_id),[A],'un bloqueo corta los avisos');
  paso('los bloqueos también cortan los avisos');

  // Apagar, cambiar de cuenta en el mismo iPhone y el tope de 5.
  await sesion(A);assert.equal(await uno('select public.olvidar_dispositivo($1)',[tok('a')]),true);
  await db.exec('reset role');await q('delete from public.avisos_salientes');
  await sesion(B);await uno("select public.agregar_reserva_grupo($1,'Sala 4',$2,'10:00','11:00')",[g,dia(3)]);
  assert.equal((await cola()).length,0,'sin token, sin avisos');
  await sesion(B);await uno('select public.registrar_dispositivo($1)',[tok('c')]);
  await db.exec('reset role');assert.equal(await uno('select user_id from public.push_dispositivos where token=$1',[tok('c')]),B,'el iPhone pasa a la cuenta que entró');
  await sesion(A);for(const ch of '0123456')await uno('select public.registrar_dispositivo($1)',[tok(ch)]);
  await db.exec('reset role');assert.equal(await uno('select count(*)::int from public.push_dispositivos where user_id=$1',[A]),5,'hasta 5 iPhones');
  // Un fallo al avisar no rompe la acción.
  await q("alter table public.avisos_salientes add constraint prueba_falla check (false) not valid");
  await sesion(B);assert.ok(await uno("select public.agregar_reserva_grupo($1,'Sala 5',$2,'10:00','11:00')",[g,dia(4)]),'la sala se anota igual');
  await db.exec('reset role');await q('alter table public.avisos_salientes drop constraint prueba_falla');
  paso('apagar, cambiar de cuenta, tope de 5 y nunca bloquea la acción');

  await sesion(A);await q('select public.eliminar_mi_cuenta()');
  await db.exec('reset role');for(const t of tablas)assert.equal(await uno(`select count(*)::int from public.${t} where user_id=$1`,[A]),0,t);
  paso('eliminar la cuenta borra sus iPhones y sus avisos');
  console.log(`\nPASS: ${ok}   FAIL: 0`);
}catch(e){console.error(e);console.log('\nPASS: '+ok+'   FAIL: 1');process.exit(1);}})();
