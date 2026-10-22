// Alumnos de ejemplo (decisión de Lucas, 2026-10-22). PostgreSQL en memoria,
// cuentas sintéticas. Prueba que solo un administrador con segundo factor lo
// activa, que el profesor solo ve lo suyo y que no puede activárselo solo.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {PGlite}=require('@electric-sql/pglite');
const leer=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
const u=i=>`00000000-0000-0000-0000-0000000000${String(i).padStart(2,'0')}`;
const PROFE=u(1),OTRO_PROFE=u(2),PENDIENTE=u(3),ADMIN=u(4),ALUMNO=u(5);
const db=new PGlite();
let pruebas=0;
const check=(nombre,cond)=>{assert.ok(cond,nombre);pruebas++;console.log('  OK   '+nombre);};
const q=async(sql,params=[])=>(await db.query(sql,params)).rows;
const soy=(id,aal='aal2')=>db.query("select set_config('request.jwt.claim.sub',$1,false),set_config('audit.aal',$2,false)",[id,aal]);
const falla=async(sql,params=[])=>{try{await db.query(sql,params);return null;}catch(e){return e.message;}};
(async()=>{try{
  await db.exec(leer('bin/supabase-stubs.sql'));
  await db.exec(`create function auth.jwt() returns jsonb language sql stable as $$
    select jsonb_build_object('aal',coalesce(current_setting('audit.aal',true),'aal1')) $$;
    create table public.user_ramos(user_id uuid primary key references auth.users(id) on delete cascade, data jsonb not null default '{}');`);
  for(const f of ['clases_particulares','admin_clases','administradores','curso_posicion','profesor_alumnos','alumnos_ejemplo'])
    await db.exec(leer('supabase/'+f+'.sql'));
  for(const id of [PROFE,OTRO_PROFE,PENDIENTE,ADMIN,ALUMNO])await db.query('insert into auth.users(id) values($1)',[id]);
  await db.query('insert into admin.administradores(user_id) values($1)',[ADMIN]);
  for(const [id,estado] of [[PROFE,'aprobado'],[OTRO_PROFE,'aprobado'],[PENDIENTE,'pendiente']])
    await db.query(`insert into tutor_perfiles(user_id,nombre_publico,presentacion,estado,revisado_at)
      values($1,'Profesor sintético','Presentación ficticia para probar el panel',$2,case when $2='pendiente' then null else now() end)`,[id,estado]);

  console.log('\n=== Por omisión, nadie ===');
  check('las filas que ya existían parten sin alumnos de ejemplo',
    (await q('select count(*)::int n from tutor_perfiles where alumnos_ejemplo'))[0].n===0);
  await soy(PROFE);
  check('el profesor ve su panel real',(await q('select mis_alumnos_ejemplo() v'))[0].v===false);

  console.log('\n=== Solo un administrador con segundo factor lo activa ===');
  await soy(ADMIN,'aal1');
  check('sin segundo factor no puede',!!(await falla('select admin_fijar_alumnos_ejemplo($1,true)',[PROFE])));
  check('ni ver a quién se le activó',!!(await falla('select * from admin_alumnos_ejemplo()')));
  await soy(ADMIN);
  check('con segundo factor lo activa para el profesor que elige',(await q('select admin_fijar_alumnos_ejemplo($1,true) ok',[PROFE]))[0].ok===true);
  check('activarlo de nuevo no cambia nada',(await q('select admin_fijar_alumnos_ejemplo($1,true) ok',[PROFE]))[0].ok===false);
  check('queda registrado quién lo hizo',
    (await q(`select count(*)::int n from admin.acciones where accion='alumnos_ejemplo' and objetivo=$1 and admin_id=$2`,[PROFE,ADMIN]))[0].n===1);
  const lista=(await q('select * from admin_alumnos_ejemplo() id')).map(f=>f.id);
  check('la lista del administrador muestra solo a ese profesor',lista.length===1&&lista[0]===PROFE);
  check('un valor nulo no se acepta',!!(await falla('select admin_fijar_alumnos_ejemplo($1,null)',[PROFE])));

  console.log('\n=== Lo que ve cada profesor ===');
  await soy(PROFE);
  check('el elegido ve su panel con alumnos de ejemplo',(await q('select mis_alumnos_ejemplo() v'))[0].v===true);
  await soy(OTRO_PROFE);
  check('otro profesor sigue con su panel real',(await q('select mis_alumnos_ejemplo() v'))[0].v===false);
  await soy(ADMIN);await q('select admin_fijar_alumnos_ejemplo($1,true)',[PENDIENTE]);
  await soy(PENDIENTE);
  check('un profesor no aprobado no lo ve aunque esté marcado',(await q('select mis_alumnos_ejemplo() v'))[0].v===false);

  console.log('\n=== Nadie más lo toca ===');
  await soy(PROFE);
  check('el profesor no puede activárselo ni apagarlo solo',!!(await falla('select admin_fijar_alumnos_ejemplo($1,false)',[PROFE])));
  await db.exec('set role authenticated');
  check('ni escribir la columna directo',!!(await falla('update tutor_perfiles set alumnos_ejemplo=false where user_id=$1',[PROFE])));
  check('ni leerla directo',!!(await falla('select alumnos_ejemplo from tutor_perfiles where user_id=$1',[PROFE])));
  await db.exec('reset role');
  await soy(ALUMNO);
  check('un estudiante tampoco',!!(await falla('select admin_fijar_alumnos_ejemplo($1,false)',[PROFE])));
  check('anon no puede llamar ninguna',
    !(await q(`select bool_or(has_function_privilege('anon',p.oid,'execute')) a from pg_proc p
      where proname in ('mis_alumnos_ejemplo','admin_alumnos_ejemplo','admin_fijar_alumnos_ejemplo')`))[0].a);
  const funciones=await q(`select prosecdef, proconfig from pg_proc
    where proname in ('mis_alumnos_ejemplo','admin_alumnos_ejemplo','admin_fijar_alumnos_ejemplo')`);
  check('las tres son security definer con search_path fijo',
    funciones.length===3&&funciones.every(f=>f.prosecdef&&(f.proconfig||[]).some(c=>/^search_path=public/.test(c))));

  console.log('\n=== Apagarlo ===');
  await soy(ADMIN);
  check('el administrador lo apaga',(await q('select admin_fijar_alumnos_ejemplo($1,false) ok',[PROFE]))[0].ok===true);
  await soy(PROFE);
  check('y el profesor vuelve a su panel real',(await q('select mis_alumnos_ejemplo() v'))[0].v===false);
  let reaplicar=null;try{await db.exec(leer('supabase/alumnos_ejemplo.sql'));}catch(e){reaplicar=e.message;}
  check('el archivo se puede aplicar dos veces',reaplicar===null);

  console.log(`\nPASS: ${pruebas}   FAIL: 0`);
}catch(e){console.error('  FAIL',e.message);process.exit(1);}
})();
