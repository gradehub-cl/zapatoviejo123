// Ficha del profesor en Admin (Lucas, 2026-10-23): ocultar el panel de
// alumnos y la nota interna. PostgreSQL en memoria con cuentas sintéticas. Lo
// que importa: ocultar lo cumple el servidor, no borra ningún vínculo, el
// profesor no puede cambiarlo, y la nota solo la ve un admin.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {PGlite}=require('@electric-sql/pglite');
const read=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
const u=i=>`00000000-0000-0000-0000-0000000004${String(i).padStart(2,'0')}`;
const ADMIN=u(1),PROF=u(2),ALUMNO=u(3),OTRO=u(4);
let pruebas=0;
const check=(nombre,cond)=>{assert.ok(cond,nombre);pruebas++;console.log('  OK   '+nombre);};
(async()=>{try{
  const db=new PGlite();
  const q=async(sql,params=[])=>(await db.query(sql,params)).rows;
  const sesion=(id,aal='aal2')=>db.query("select set_config('request.jwt.claim.sub',$1,false),set_config('audit.aal',$2,false)",[id,aal]);
  const falla=async(sql,params=[])=>{try{await db.query(sql,params);return null;}catch(e){return e.message;}};
  await db.exec(read('bin/supabase-stubs.sql'));
  await db.exec(`create function auth.jwt() returns jsonb language sql stable as $$
    select jsonb_build_object('aal',coalesce(current_setting('audit.aal',true),'aal1')) $$;
    create table public.user_ramos(user_id uuid primary key, data jsonb);`);
  for(const f of ['clases_particulares','admin_clases','administradores','profesor_alumnos'])await db.exec(read('supabase/'+f+'.sql'));
  for(const id of [ADMIN,PROF,ALUMNO,OTRO])await db.query('insert into auth.users(id) values($1)',[id]);
  await db.query('insert into admin.administradores(user_id) values($1)',[ADMIN]);
  await db.query(`insert into tutor_perfiles(user_id,nombre_publico,presentacion,estado,revisado_at,codigo_alumnos)
    values($1,'Profe sintético','Presentación ficticia de más de veinte caracteres','aprobado',now(),'DEMQ2345')`,[PROF]);
  await db.query(`insert into user_ramos values($1,'{"tenant":"uc","ramos":[{"id":"r1","nombre":"Ramo sintético"}]}')`,[ALUMNO]);
  await db.query(`insert into user_ramos values($1,'{"tenant":"uc","ramos":[{"id":"r9","nombre":"Ramo sintético"}]}')`,[OTRO]);
  await db.query(`insert into profesor_alumnos(tutor_id,alumno_id,nombre_visible,ramos) values($1,$2,'Alumno sintético',array['r1'])`,[PROF,ALUMNO]);
  const misAlumnos=async()=>{await sesion(PROF);return falla('select * from mis_alumnos()');};

  console.log('\n=== Parte visible: hoy no cambia nada ===');
  check('los profesores parten con el panel visible',(await q('select panel_alumnos from tutor_perfiles where user_id=$1',[PROF]))[0].panel_alumnos===true);
  check('y ve a sus alumnos',(await misAlumnos())===null);

  console.log('\n=== Ocultar lo cumple el servidor ===');
  await sesion(PROF);
  await db.exec('set role authenticated');
  check('el profesor no puede cambiarlo él mismo',/permission denied|permiso/.test(await falla('update tutor_perfiles set panel_alumnos=true where user_id=$1',[PROF])));
  check('pero sí leerlo',(await q('select panel_alumnos from tutor_perfiles where user_id=$1',[PROF])).length===1);
  await db.exec('reset role');
  await sesion(ADMIN,'aal1');
  check('un admin sin MFA no lo oculta',/sin acceso/.test(await falla('select admin_panel_alumnos_profesor($1,false)',[PROF])));
  await sesion(ADMIN);
  check('un admin lo oculta',(await q('select admin_panel_alumnos_profesor($1,false) ok',[PROF]))[0].ok===true);
  check('ocultarlo dos veces no hace nada',(await q('select admin_panel_alumnos_profesor($1,false) ok',[PROF]))[0].ok===false);
  check('oculto, no ve a sus alumnos',/profesor aprobado/.test(await misAlumnos()));
  check('ni obtiene su link',/profesor aprobado/.test(await falla('select codigo_alumnos_profesor()')));
  await sesion(OTRO);
  check('su link no muestra a nadie',(await q("select * from profesor_por_codigo('DEMQ2345')")).length===0);
  check('y nadie nuevo se conecta',!!(await falla(`select compartir_con_profesor('DEMQ2345','Otro sintético',array['r9'])`)));
  check('el vínculo que ya existía sigue ahí',(await q('select count(*)::int n from profesor_alumnos where tutor_id=$1',[PROF]))[0].n===1);
  await sesion(ADMIN);
  await q('select admin_panel_alumnos_profesor($1,true)',[PROF]);
  check('al mostrarlo de nuevo, ve a los mismos alumnos',(await misAlumnos())===null&&(await q('select count(*)::int n from mis_alumnos()'))[0].n===1);

  console.log('\n=== Nota interna ===');
  await sesion(ADMIN);
  check('un admin escribe la nota',(await q("select admin_nota_profesor($1,'Material: 15% de comisión, código GRADEHUB 5%') ok",[PROF]))[0].ok===true);
  const panel=(await q('select admin_panel_clases() j'))[0].j.find(p=>p.user_id===PROF);
  check('el panel trae la nota, el panel de alumnos y los últimos 30 días',panel.nota.includes('15%')&&panel.panel_alumnos===true&&panel.ultimos_30_dias.contactaron===0);
  check('y el historial con quién hizo qué',panel.historial.some(h=>h.accion==='panel_alumnos')&&panel.historial.some(h=>h.accion==='nota_profesor'));
  check('una nota de más de 1000 caracteres no entra',/1000/.test(await falla('select admin_nota_profesor($1,$2)',[PROF,'x'.repeat(1001)])));
  await sesion(PROF);
  check('el profesor no escribe notas',/sin acceso/.test(await falla("select admin_nota_profesor($1,'me pongo nota')",[PROF])));
  await db.exec('set role authenticated');
  check('ni lee la tabla',/permission denied|permiso/.test(await falla('select * from admin.notas_profesor')));
  await db.exec('reset role');
  await sesion(ADMIN);
  check('vaciarla la borra',(await q("select admin_nota_profesor($1,'  ') ok",[PROF]))[0].ok===true&&(await q('select count(*)::int n from admin.notas_profesor'))[0].n===0);
  check('la nota se borra con la cuenta',(await q(`select confdeltype from pg_constraint where conrelid='admin.notas_profesor'::regclass and contype='f' and confrelid='auth.users'::regclass and conkey=array[1::smallint]`))[0].confdeltype==='c');

  console.log('\n=== Reaplicar ===');
  for(const f of ['clases_particulares','administradores','profesor_alumnos'])await db.exec(read('supabase/'+f+'.sql'));
  check('reaplicar los tres no cambia el panel ni el permiso de leerlo',(await q('select panel_alumnos from tutor_perfiles where user_id=$1',[PROF]))[0].panel_alumnos===true
    &&(await q(`select has_column_privilege('authenticated','public.tutor_perfiles','panel_alumnos','select') p`))[0].p
    &&!(await q(`select has_column_privilege('authenticated','public.tutor_perfiles','panel_alumnos','update') p`))[0].p);
  console.log(`\nPASS: ${pruebas}   FAIL: 0`);
}catch(e){console.error('  FAIL',e.message);process.exit(1);}})();
