// Recado en video del Wrapped: PostgreSQL real en memoria, solo cuentas y
// profes sintéticos. Cada cuenta ve como mucho un video, de un profe que
// calificó bien; quien no calificó lo sabe, y nadie lee archivos ajenos.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {PGlite}=require('@electric-sql/pglite');
const read=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
const db=new PGlite(),u=i=>`00000000-0000-0000-0000-${String(i).padStart(12,'0')}`;
const q=async(sql,args=[])=>(await db.query(sql,args)).rows;
const raiz=async()=>{await db.exec('reset role');};
const soy=async(i,rol='authenticated')=>{await raiz();await db.query("select set_config('request.jwt.claim.sub',$1,false)",[i?u(i):'']);await db.exec(`set role ${rol}`);};
const recado=async(tenant='uc',p)=>(await q('select * from wrapped_recado($1,$2)',[tenant,p]))[0];
(async()=>{try{
  await db.exec(read('bin/supabase-stubs.sql'));
  await db.exec('create table public.user_ramos(user_id uuid primary key references auth.users(id) on delete cascade, data jsonb);');
  await db.exec('alter default privileges in schema public grant execute on functions to anon, authenticated;');
  await db.exec(read('supabase/profesores.sql'));
  // administradores.sql necesita su esquema; acá basta con la llave.
  await db.exec("create or replace function public.administrador_verificado() returns boolean language sql stable as $$ select current_setting('test.admin',true)='si' $$;");
  await db.exec(read('supabase/wrapped_recado.sql'));
  await db.exec(read('supabase/wrapped_recado.sql'));
  const periodo=(await q('select profesor_periodo_actual() as p'))[0].p;
  for(let i=1;i<=6;i++)await q('insert into auth.users(id,email) values($1,$2)',[u(i),`sintetico${i}@example.invalid`]);
  const califico=async(i,ramo,seccion,nombre,estrellas,hace=0)=>{
    await q('insert into profesor_aportes(user_id,tenant,ramo_clave,seccion,periodo,nombre) values($1,$2,$3,$4,$5,$6)',[u(i),'uc',ramo,seccion,periodo,nombre]);
    await q(`insert into profesor_calificaciones(user_id,tenant,ramo_clave,seccion,periodo,estrellas,actualizada) values($1,'uc',$2,$3,$4,$5,now()-make_interval(mins=>$6))`,[u(i),ramo,seccion,periodo,estrellas,hace]);
  };
  await q(`insert into wrapped_videos(tenant,profesor,archivo,poster,subtitulos) values
    ('uc','Profe Sintético Uno','uc/uno.mp4','uc/uno.jpg','uc/uno.vtt'),('uc','Docente Ficticia Dos','uc/dos.mp4',null,null)`);
  await califico(1,'tst101',1,'Profe Sintético Uno',5,10);await califico(1,'tst102',2,'Docente Ficticia Dos',4,0);
  await califico(2,'tst102',2,'Docente Ficticia Dos',3);
  await califico(4,'tst101',1,'Profe Andrés Sintético Uno',4);
  await califico(5,'tst102',3,'Docente Ficticia Dos',5);
  await califico(6,'tst103',1,'Otra Persona Inventada',5);

  await soy(1);let r=await recado('uc',periodo);
  assert.equal(r.hay_videos,true);assert.equal(r.calificaciones,2);
  assert.equal(r.profesor,'Profe Sintético Uno','gana el de más estrellas');assert.equal(r.archivo,'uc/uno.mp4');
  assert.equal(r.poster,'uc/uno.jpg');assert.equal(r.subtitulos,'uc/uno.vtt');assert.equal(r.ramo_clave,'tst101');
  await soy(2);r=await recado('uc',periodo);
  assert.equal(r.calificaciones,1);assert.equal(r.archivo,null,'con 3 estrellas no hay recado');
  await soy(3);r=await recado('uc',periodo);
  assert.equal(r.calificaciones,0,'quien no calificó lo sabe');assert.equal(r.hay_videos,true);assert.equal(r.archivo,null);
  await soy(4);r=await recado('uc',periodo);
  assert.equal(r.archivo,'uc/uno.mp4','con el segundo nombre también coincide');
  await soy(6);r=await recado('uc',periodo);
  assert.equal(r.calificaciones,1);assert.equal(r.archivo,null,'un profe sin video no recibe el de otro');
  await soy(1);r=await recado('fen',periodo);
  assert.equal(r.hay_videos,false,'una universidad sin videos no habla del recado');assert.equal(r.calificaciones,0);
  r=await recado('uc','2020-1');assert.equal(r.calificaciones,0,'otro período aislado');assert.equal(r.archivo,null);
  await assert.rejects(recado('uc','cualquiera'),/período inválido/);
  await soy(0);await assert.rejects(recado('uc',periodo),/sin sesión/);

  // Quien pidió no aparecer no sale, y un video retirado tampoco.
  await raiz();await q("insert into profesor_ocultos(tenant,nombre) values('uc','Docente Ficticia Dos')");
  await soy(5);assert.equal((await recado('uc',periodo)).archivo,null,'profe oculto');
  await raiz();await q("delete from profesor_ocultos");await q("update wrapped_videos set activo=false where archivo='uc/uno.mp4'");
  await soy(1);r=await recado('uc',periodo);assert.equal(r.archivo,'uc/dos.mp4','retirado el primero, queda el de 4 estrellas');
  await raiz();await q("update wrapped_videos set activo=true");

  // Storage: cada archivo lo lee solo a quien le toca, y administración.
  await raiz();await q(`insert into storage.objects(bucket_id,name) values ('wrapped','uc/uno.mp4'),('wrapped','uc/uno.vtt'),('wrapped','uc/dos.mp4'),('otro','uc/uno.mp4')`);
  // En Supabase el rol ya puede leer la tabla; quien filtra es la política.
  await q('grant select on storage.objects to authenticated');
  const visibles=async i=>(await (async()=>{await soy(i);return q("select name from storage.objects where bucket_id='wrapped' order by name");})()).map(x=>x.name).join(',');
  assert.equal(await visibles(1),'uc/uno.mp4,uc/uno.vtt');
  assert.equal(await visibles(2),'');assert.equal(await visibles(3),'');
  assert.equal(await visibles(5),'uc/dos.mp4');
  await soy(3);await db.exec("set test.admin='si'");
  assert.equal((await q("select count(*)::int n from storage.objects where bucket_id='wrapped'"))[0].n,3,'administración ve todo');
  await db.exec("reset test.admin");

  // Sin acceso directo al catálogo ni a la función interna; anon no entra.
  await soy(1);
  await assert.rejects(q('select * from wrapped_videos'),/permission denied/);
  await assert.rejects(q('select * from wrapped_recado_elegido($1,$2,$3)',[u(1),'uc',periodo]),/permission denied/);
  await soy(1,'anon');await assert.rejects(recado('uc',periodo),/permission denied/);
  await raiz();
  const bucket=(await q("select public,file_size_limit from storage.buckets where id='wrapped'"))[0];
  assert.equal(bucket.public,false);assert.equal(Number(bucket.file_size_limit),52428800);
  assert.match(read('supabase/wrapped_recado.sql'),/create table if not exists public\.wrapped_videos/);
  console.log('OK: recado del Wrapped por calificación, sin calificar, ocultos, retirados, Storage y permisos');
}catch(e){console.error(e);process.exitCode=1;}finally{await db.close();}})();
