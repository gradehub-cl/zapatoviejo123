// Calificaciones de profesores sobre PostgreSQL real en memoria. Solo cuentas y ramos sintéticos.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {PGlite}=require('@electric-sql/pglite');
const read=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
const db=new PGlite(),u=i=>`00000000-0000-0000-0000-${String(i).padStart(12,'0')}`;
const q=async(sql,args=[])=>(await db.query(sql,args)).rows;
const soy=async i=>{await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[i?u(i):'']);await db.exec('set role authenticated');};
let periodo;
const ramo=(id,seccion)=>({id,nombre:'Curso sintético',seccion,origen:{tenant:'uc',ramoKey:'TEST101'},categorias:[{nombre:'Control ficticio',peso:100,notas:[{valor:4.7}]}]});
// Cuentas 1-3 y 7 en la sección 1, 4-6 en la 2, 9-11 en la 3; la 8 no tiene ramos.
const seccionDe=i=>i<=3||i===7?1:i<=6?2:i>=9?3:null;
const idDe=i=>'ramo-'+i;
const informar=(i,nombre)=>q('select profesor_docente_informar($1,$2,$3,$4)',[idDe(i),seccionDe(i),periodo,nombre]);
const calificar=(i,estrellas,etiquetas=[],p=periodo)=>q('select profesor_calificar($1,$2,$3,$4,$5)',[idDe(i),seccionDe(i),p,estrellas,etiquetas]);
const estado=async i=>(await q('select * from profesor_calificacion_estado($1,$2,$3)',[idDe(i),seccionDe(i),periodo]))[0];
(async()=>{try{
  await db.exec(read('bin/supabase-stubs.sql'));
  await db.exec('create table public.user_ramos(user_id uuid primary key references auth.users(id) on delete cascade, data jsonb);');
  await db.exec('alter default privileges in schema public grant execute on functions to anon, authenticated;');
  await db.exec(read('supabase/profesores.sql'));
  await db.exec(read('supabase/profesores.sql'));
  periodo=(await q('select profesor_periodo_actual() as p'))[0].p;
  for(let i=1;i<=11;i++){
    await db.query('insert into auth.users(id,email) values($1,$2)',[u(i),`sintetico${i}@example.invalid`]);
    await db.query('insert into user_ramos values($1,$2)',[u(i),JSON.stringify({tenant:'uc',ramos:seccionDe(i)?[ramo(idDe(i),seccionDe(i))]:[]})]);
  }
  const snapshots=await q('select data from user_ramos order by user_id');

  // Sin docente confirmado no se califica.
  await soy(1);
  assert.deepEqual({...await estado(1),etiquetas:null},{docente:null,total:0,promedio:null,etiquetas:null,mi_estrellas:null,mi_etiquetas:null,puede_calificar:false});
  await assert.rejects(calificar(1,5),/profesor sin confirmar/);
  for(const i of [1,2,3]){await soy(i);await informar(i,'María José Pérez');}
  for(const i of [4,5,6]){await soy(i);await informar(i,'Maria Jose Perez');}
  for(const i of [9,10,11]){await soy(i);await informar(i,'Ricardo González');}

  // Una o dos calificaciones no publican promedio ni etiquetas.
  await soy(1);await calificar(1,5,['explica_claro','exigente','explica_claro']);
  let e=await estado(1);
  assert.equal(e.docente,'María José Pérez');assert.equal(e.puede_calificar,true);
  assert.equal(e.total,1);assert.equal(e.promedio,null);assert.deepEqual(e.etiquetas,[]);
  assert.equal(e.mi_estrellas,5);assert.deepEqual(e.mi_etiquetas,['exigente','explica_claro'],'etiquetas sin duplicados');
  await calificar(1,5,['explica_claro','exigente']);assert.equal((await estado(1)).total,1,'repetir no suma votos');
  await soy(2);await calificar(2,4,['explica_claro']);
  assert.equal((await estado(2)).mi_estrellas,4,'cada cuenta ve solo la suya');
  assert.equal((await estado(2)).promedio,null,'dos calificaciones no publican');

  // Validación en el servidor.
  await assert.rejects(calificar(2,6),/calificación inválida/);
  await assert.rejects(calificar(2,0),/calificación inválida/);
  await assert.rejects(calificar(2,3,['explica_claro','exigente','da_feedback','harta_carga']),/etiquetas inválidas/);
  await assert.rejects(calificar(2,3,['es_malo']),/etiquetas inválidas/);
  await assert.rejects(calificar(2,3,[],'2020-1'),/período no vigente/);
  assert.equal((await estado(2)).mi_estrellas,4,'un rechazo no pisa la calificación guardada');

  // Con tres se publica; una etiqueta necesita dos cuentas.
  await soy(3);await calificar(3,3);
  e=await estado(3);
  assert.equal(e.total,3);assert.equal(Number(e.promedio),4);
  assert.deepEqual(e.etiquetas,[{etiqueta:'explica_claro',n:2}]);

  // Junta las secciones del mismo docente en este ramo; otro docente queda aparte.
  await soy(4);await calificar(4,1,['exigente']);
  for(const i of [9,10,11]){await soy(i);await calificar(i,1,['harta_carga']);}
  await soy(1);e=await estado(1);
  assert.equal(e.total,4);assert.equal(Number(e.promedio),3.3);
  assert.deepEqual(e.etiquetas,[{etiqueta:'exigente',n:2},{etiqueta:'explica_claro',n:2}]);
  await soy(9);e=await estado(9);assert.equal(e.docente,'Ricardo González');assert.equal(e.total,3);assert.equal(Number(e.promedio),1);

  // Semestres anteriores del mismo docente también cuentan.
  await db.exec('reset role');
  for(const i of [5,6,7]){
    await db.query("insert into profesor_aportes values($1,'uc','test101',1,'2025-1','María José Pérez')",[u(i)]);
    await db.query("insert into profesor_calificaciones(user_id,tenant,ramo_clave,seccion,periodo,estrellas) values($1,'uc','test101',1,'2025-1',5)",[u(i)]);
  }
  await soy(1);e=await estado(1);assert.equal(e.total,7);assert.equal(Number(e.promedio),4);

  // Acceso: nada directo a la tabla, nada sin sesión, nada fuera del semestre.
  await assert.rejects(q('select * from profesor_calificaciones'),/permission denied/);
  await assert.rejects(q("update profesor_calificaciones set estrellas=1"),/permission denied/);
  await assert.rejects(q('select profesor_docente_publico($1,$2,1,$3)',['uc','test101',periodo]),/permission denied/);
  await soy(8);await assert.rejects(q('select * from profesor_calificacion_estado($1,1,$2)',['ramo-1',periodo]),/no sincronizados/);
  await soy(0);await assert.rejects(estado(1),/sin sesión/);
  await db.exec('reset role; set role anon');
  await assert.rejects(estado(1),/permission denied/);
  await assert.rejects(calificar(1,5),/permission denied/);
  await db.exec('reset role');
  assert.equal((await q("select relrowsecurity from pg_class where oid='public.profesor_calificaciones'::regclass"))[0].relrowsecurity,true);

  // Si el consenso se cae, la sección deja de aportar y nadie califica a ciegas.
  await soy(3);await informar(3,'Otra Persona Distinta');
  e=await estado(3);assert.equal(e.docente,null);assert.equal(e.puede_calificar,false);assert.equal(e.mi_estrellas,3,'la propia se conserva');
  await soy(1);e=await estado(1);assert.equal(e.docente,null);
  await soy(3);await informar(3,'María José Pérez');

  // Borrar la propia; borrar la cuenta borra en cascada.
  await soy(3);await q('select profesor_calificacion_borrar($1,1,$2)',['ramo-3',periodo]);
  e=await estado(3);assert.equal(e.mi_estrellas,null);assert.equal(e.total,6);
  await db.exec('reset role');await db.query('delete from auth.users where id=$1',[u(2)]);
  assert.equal((await q('select count(*)::int n from profesor_calificaciones where user_id=$1',[u(2)]))[0].n,0);

  // Reaplicar conserva; nada toca datos académicos.
  await db.exec(read('supabase/profesores.sql'));
  assert.equal((await q('select count(*)::int n from profesor_calificaciones'))[0].n,8);
  assert.deepEqual(await q('select data from user_ramos where user_id<>$1 order by user_id',[u(2)]),snapshots.filter((_,i)=>i!==1));

  // Las etiquetas de data.js son exactamente las que acepta la tabla.
  const ctx={};vm.createContext(ctx);vm.runInContext(read('data.js')+';this.E=PROFESOR_ETIQUETAS;',ctx);
  const sql=read('supabase/profesores.sql').match(/etiquetas <@ array\[([\s\S]*?)\]/)[1].match(/'([a-z_]+)'/g).map(x=>x.slice(1,-1));
  assert.deepEqual(JSON.parse(JSON.stringify(ctx.E.map(x=>x.id))).sort(),[...sql].sort());

  // Limpieza de #445: aborta con filas, borra si están vacías, no toca lo demás.
  await db.exec("create table public.profesores(id int); insert into public.profesores values(1); create table public.profesor_resenas(id int);");
  await assert.rejects(db.exec(read('supabase/profesores_445_limpieza.sql')),/tiene 1 filas/);
  await db.exec('rollback');
  assert.ok((await q("select to_regclass('public.profesor_resenas') t"))[0].t,'abortar no borra nada');
  await db.exec('delete from public.profesores');
  await db.exec(read('supabase/profesores_445_limpieza.sql'));
  assert.equal((await q("select to_regclass('public.profesores') t"))[0].t,null);
  assert.ok((await q("select to_regclass('public.profesor_calificaciones') t"))[0].t);
  console.log('OK calificaciones SQL: consenso, umbral de 3, etiquetas, secciones y semestres, permisos, cascada y limpieza de #445');
}finally{await db.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
