// Grupos y notas compartidas (supabase/amigos_grupos.sql, amigos_notas.sql)
// sobre PostgreSQL real en memoria. Solo cuentas, ramos y notas sintéticas.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{PGlite}=require('@electric-sql/pglite');
const read=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8'),u=i=>`00000000-0000-4000-8000-${String(i).padStart(12,'0')}`;
const A=u(1),B=u(2),C=u(3),D=u(4),E=u(5);
const db=new PGlite(),q=async(sql,p=[])=>(await db.query(sql,p)).rows;
const sesion=async uid=>{await db.exec('reset role');await q("select set_config('request.jwt.claim.sub',$1,false),set_config('test.aal','aal1',false)",[uid||'']);await db.exec('set role authenticated');};
const uno=async(sql,p)=>{const r=await q(sql,p);return r[0]&&Object.values(r[0])[0];};
let ok=0;const paso=n=>{ok++;console.log('  OK   '+n);};
const ramo=(nombre,sigla,dias,inicio,fin,nota)=>({id:sigla,nombre,sigla,origen:{ramoKey:sigla},horario:[{id:'b'+sigla,dias,inicio,fin,sala:'S1',tipo:'CLAS'}],
  categorias:[{id:'c',nombre:'Control secreto',peso:100,notas:[{id:'n',valor:nota}]}]});
(async()=>{try{
  await db.exec(read('bin/supabase-stubs.sql'));
  await db.exec(`create function auth.jwt() returns jsonb language sql stable as $$ select jsonb_build_object('aal',current_setting('test.aal',true)) $$;
    create table public.profiles(id uuid primary key references auth.users(id) on delete cascade,nombre text,apellido text,universidad text,carrera text);
    create table public.user_ramos(user_id uuid primary key references auth.users(id) on delete cascade,data jsonb);`);
  for(const f of ['clases_particulares','admin_clases','administradores','eliminar_mi_cuenta','amigos'])await db.exec(read('supabase/'+f+'.sql'));
  for(let i=0;i<2;i++){await db.exec(read('supabase/amigos_grupos.sql'));await db.exec(read('supabase/amigos_notas.sql'));}
  paso('se aplican dos veces, después de amigos.sql');
  for(const id of [A,B,C,D,E])await q('insert into auth.users(id) values($1)',[id]);
  for(const [id,n,us] of [[A,'Ana','ana_s'],[B,'Beto','beto_ej'],[C,'Carla','carla.p'],[D,'Dani','dani99'],[E,'Eli','eli.e']]){
    await q("insert into public.profiles values($1,$2,'Sintético','uc','Carrera de Ejemplo')",[id,n]);
    await q('insert into public.usernames(user_id,username) values($1,$2)',[id,us]);
  }
  await q('insert into public.user_ramos values($1,$2)',[A,JSON.stringify({ramos:[ramo('Curso Uno','SYN101',['L'],'08:20','09:30',5.5),ramo('Curso Dos','SYN202',['M'],'10:00','11:10',4.2)]})]);
  await q('insert into public.user_ramos values($1,$2)',[B,JSON.stringify({ramos:[ramo('Curso Uno','SYN101',['L'],'08:20','09:30',6.1),ramo('Curso Tres','SYN303',['W'],'14:00','15:10',3.0)]})]);
  await q('insert into public.user_ramos values($1,$2)',[C,JSON.stringify({ramos:[ramo('Curso Dos','SYN202',['M'],'10:00','11:10',6.8)]})]);
  // A es amiga de B, C y D. B y C no son amigos entre ellos. E no es amigo de nadie.
  for(const [x,y] of [[A,B],[A,C],[A,D]])await q("insert into public.amistades(de,para,estado,aceptada_at) values($1,$2,'aceptada',now())",[x,y]);

  const tablas=['amigos_grupos','amigos_grupo_miembros','amigos_notas'];
  await sesion(A);for(const t of tablas)await assert.rejects(q(`select * from public.${t}`),/permission denied/,t);
  await db.exec('reset role');
  assert.equal((await q('select relname from pg_class where relname = any($1) and relrowsecurity',[tablas])).length,3);
  const fk=await q(`select c.conrelid::regclass::text t,a.attname col,c.confdeltype from pg_constraint c join pg_attribute a on a.attrelid=c.conrelid and a.attnum=any(c.conkey)
    where c.contype='f' and c.confrelid='auth.users'::regclass and c.conrelid::regclass::text = any($1) order by 1,2`,[tablas.concat(tablas.map(t=>'public.'+t))]);
  assert.deepEqual(fk.map(f=>`${f.t.replace('public.','')}.${f.col}:${f.confdeltype}`),
    ['amigos_grupo_miembros.invitado_por:n','amigos_grupo_miembros.user_id:c','amigos_grupos.creador:n','amigos_notas.user_id:c']);
  paso('tablas cerradas, con RLS y FK a auth.users');

  // ─── Grupos ───
  await sesion(A);
  await assert.rejects(q('select public.crear_grupo($1,$2)',['  ',[]]),/1 a 40/);
  await assert.rejects(q('select public.crear_grupo($1,$2)',['Estudio',['eli.e']]),/tus amigos/,'solo amigos');
  const g=await uno('select public.crear_grupo($1,$2)',['Estudio Sintético',['beto_ej','carla.p']]);
  assert.equal((await q('select count(*)::int n from public.mis_grupos()'))[0].n,1,'el intento fallido no dejó grupo');
  let mg=(await q('select * from public.mis_grupos()'))[0];
  assert.deepEqual({e:mg.estado,m:mg.miembros,c:mg.soy_creador},{e:'miembro',m:1,c:true});
  await sesion(B);
  mg=(await q('select * from public.mis_grupos()'))[0];
  assert.deepEqual({e:mg.estado,i:mg.invitado_por,n:mg.nombre},{e:'invitado',i:'ana_s',n:'Estudio Sintético'});
  assert.deepEqual(mg.nombres,['Ana'],'antes de unirse ve quiénes están, sin horarios');
  await assert.rejects(q('select * from public.grupo_detalle($1)',[g]),/no estás/,'invitado no ve horarios');
  await assert.rejects(q('select public.invitar_a_grupo($1,$2)',[g,'ana_s']),/no estás/);
  assert.equal(await uno('select public.responder_grupo($1,true)',[g]),true);
  await sesion(C);assert.equal(await uno('select public.responder_grupo($1,true)',[g]),true);
  await sesion(E);await assert.rejects(q('select * from public.grupo_detalle($1)',[g]),/no estás/,'quien no está no ve nada');
  paso('crear, invitar solo a amigos y aceptar');

  await sesion(C);
  let det=await q('select * from public.grupo_detalle($1)',[g]);
  assert.deepEqual(det.map(x=>[x.username,x.estado,x.yo,x.creador]),[['carla.p','miembro',true,false],['ana_s','miembro',false,true],['beto_ej','miembro',false,false]]);
  assert.equal(det[0].ramos,null,'la fila propia va sin ramos');
  assert.deepEqual(det.find(x=>x.username==='beto_ej').ramos.map(r=>r.sigla),['SYN101','SYN303'],'C ve el horario de B sin ser amigos: aceptó el grupo');
  assert(!JSON.stringify(det).match(/Control secreto|6\.1|categorias|user_id/),'nada de notas ni ids');
  await sesion(B);await uno('select public.amigos_compartir_horario(false)');
  await sesion(C);assert.equal((await q('select * from public.grupo_detalle($1)',[g])).find(x=>x.username==='beto_ej').ramos,null,'apagar el horario también vale en grupos');
  await sesion(B);await uno('select public.amigos_compartir_horario(true)');
  paso('el grupo por dentro: miembros y horarios, sin notas');

  // Bloqueos: C bloquea a B. Dejan de verse en el grupo y C no puede invitar a B a otro.
  await sesion(C);await uno('select public.bloquear_usuario($1)',['beto_ej']);
  assert.equal((await q('select * from public.grupo_detalle($1)',[g])).some(x=>x.username==='beto_ej'),false);
  await sesion(B);assert.equal((await q('select * from public.grupo_detalle($1)',[g])).some(x=>x.username==='carla.p'),false,'en ambas direcciones');
  await sesion(A);
  const g2=await uno('select public.crear_grupo($1,$2)',['Otro',['carla.p']]);
  await assert.rejects(q('select public.invitar_a_grupo($1,$2)',[g2,'beto_ej']),/no se puede invitar/,'no se junta a quien bloqueó');
  await sesion(C);await uno('select public.desbloquear_usuario($1)',['beto_ej']);
  paso('un bloqueo separa también dentro de los grupos');

  // Sacar, renombrar, salir y limpieza.
  await sesion(B);await assert.rejects(q('select public.quitar_de_grupo($1,$2)',[g,'carla.p']),/creó/);
  assert.equal(await uno('select public.renombrar_grupo($1,$2)',[g,' Micro I ']),'Micro I');
  await sesion(A);assert.equal(await uno('select public.quitar_de_grupo($1,$2)',[g,'carla.p']),true);
  await sesion(C);assert.equal((await q('select * from public.mis_grupos() where id=$1',[g])).length,0);
  assert.equal(await uno('select public.responder_grupo($1,false)',[g2]),true,'rechazar la invitación');
  await sesion(A);assert.equal(await uno('select public.salir_de_grupo($1)',[g2]),true);
  await db.exec('reset role');assert.equal(await uno('select count(*)::int from public.amigos_grupos where id=$1',[g2]),0,'sin miembros, el grupo se borra');
  paso('sacar, renombrar, salir; sin grupos huérfanos');

  await db.exec('reset role');
  const extra=[];for(let i=0;i<14;i++){const id=u(200+i);extra.push(id);await q('insert into auth.users(id) values($1)',[id]);await q('insert into public.usernames values($1,$2)',[id,'extra'+i]);
    await q("insert into public.amistades(de,para,estado) values($1,$2,'aceptada')",[A,id]);}
  await sesion(A);
  for(let i=0;i<13;i++)await uno('select public.invitar_a_grupo($1,$2)',[g,'extra'+i]);
  await assert.rejects(q('select public.invitar_a_grupo($1,$2)',[g,'extra13']),/15 personas/);
  for(let i=0;i<9;i++)await uno('select public.crear_grupo($1)',['G'+i]);
  await assert.rejects(q('select public.crear_grupo($1)',['G10']),/10 grupos/);
  await db.exec('reset role');await q('delete from auth.users where id = any($1)',[extra]);
  await q('delete from public.amigos_grupos where nombre like $1',['G%']);
  paso('hasta 15 personas por grupo y 10 grupos por persona');

  // ─── Notas ───
  const pub=(ramos)=>uno('select public.publicar_mis_notas($1)',[JSON.stringify(ramos)]);
  await sesion(A);
  assert.equal((await uno('select public.amigos_notas_estado()')).comparte,false,'parte apagado');
  assert.equal((await q('select * from public.amigos_notas()')).length,0);
  await sesion(B);
  assert.equal(await pub([{sigla:'syn101',nombre:'Curso Uno',promedio:6.14,avance:40,nivel:'good'},{sigla:'SYN303',nombre:'Curso Tres',promedio:3,avance:20,nivel:'bad'},
    {sigla:'<script>',promedio:7},{sigla:'SYN999',promedio:99,avance:300,nivel:'morado',extra:'x'}]),3,'lo inválido se descarta');
  await sesion(A);
  assert.equal((await q('select * from public.amigos_notas()')).length,0,'recíproco: si no compartes, no ves');
  await pub([{sigla:'SYN101',nombre:'Curso Uno',promedio:5.5,avance:40,nivel:'good'},{sigla:'SYN202',nombre:'Curso Dos',promedio:4.2,avance:30,nivel:'warn'}]);
  let n=await q('select * from public.amigos_notas()');
  assert.equal(n.length,1,'solo amigos que comparten');
  assert.deepEqual(n[0].ramos,[{sigla:'SYN101',nombre:'Curso Uno',promedio:6.1,avance:40,nivel:'good'}],'solo ramos en común, redondeado');
  const idAB=(await q('select id from public.mis_amistades() where username=$1',['beto_ej']))[0].id;
  assert.equal(n[0].id,idAB);
  await sesion(E);await pub([{sigla:'SYN101',promedio:5}]);assert.equal((await q('select * from public.amigos_notas()')).length,0,'quien no es amigo no ve');
  await db.exec('reset role');await q('update public.amigos_notas set ramos=$2 where user_id=$1',[B,JSON.stringify([{sigla:'SYN999',promedio:6,avance:9,nivel:'good'}])]);
  await sesion(B);assert.deepEqual((await q('select * from public.amigos_notas()'))[0].ramos.map(r=>r.sigla),['SYN101'],'B ve SYN101 de A, no SYN202: no lo toma');
  await sesion(B);assert.equal(await uno('select public.dejar_de_compartir_notas()'),true);
  await sesion(A);assert.equal((await q('select * from public.amigos_notas()')).length,0,'apagar corta al tiro');
  paso('notas: apagadas por defecto, recíprocas, solo ramos en común y validadas');

  // ─── Borrar la cuenta ───
  await sesion(B);await pub([{sigla:'SYN101',promedio:6}]);
  const g3=await uno('select public.crear_grupo($1,$2)',['De Beto',['ana_s']]);
  await q('select public.eliminar_mi_cuenta()');
  await db.exec('reset role');
  assert.equal(await uno('select count(*)::int from public.amigos_notas where user_id=$1',[B]),0);
  assert.equal(await uno('select count(*)::int from public.amigos_grupo_miembros where user_id=$1 or invitado_por=$1',[B]),0);
  assert.equal(await uno('select count(*)::int from public.amigos_grupos where id=$1',[g3]),0,'su grupo sin miembros se va');
  assert.equal(await uno('select count(*)::int from public.amigos_grupos where creador=$1',[B]),0);
  paso('eliminar la cuenta no deja grupos, invitaciones ni notas');

  console.log(`\nPASS: ${ok}   FAIL: 0`);
}catch(e){console.error(e);console.log('\nPASS: '+ok+'   FAIL: 1');process.exit(1);}})();
