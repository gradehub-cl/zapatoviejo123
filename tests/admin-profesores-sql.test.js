// Aceptar, rechazar y eliminar profesores desde el panel (Lucas, 2026-10-23).
// PostgreSQL en memoria con cuentas sintéticas. Lo que importa: solo un admin
// verificado decide, eliminar nunca toca la cuenta ni pierde historial, y un
// profesor con alumnos conectados no se elimina.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {PGlite}=require('@electric-sql/pglite');
const read=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
const u=i=>`00000000-0000-0000-0000-0000000003${String(i).padStart(2,'0')}`;
const ADMIN=u(1),PEND=u(2),RECH=u(3),LIMPIO=u(4),CONHIST=u(5),CONALUM=u(6),ALUMNO=u(7);
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
    create table public.user_ramos(user_id uuid);`);
  for(const f of ['clases_particulares','admin_clases','administradores'])await db.exec(read('supabase/'+f+'.sql'));
  for(const id of [ADMIN,PEND,RECH,LIMPIO,CONHIST,CONALUM,ALUMNO])await db.query('insert into auth.users(id) values($1)',[id]);
  await db.query('insert into admin.administradores(user_id) values($1)',[ADMIN]);
  const perfil=(id,estado)=>db.query(`insert into tutor_perfiles(user_id,nombre_publico,presentacion,estado,revisado_at) values($1,'Profe sintético','Presentación ficticia de más de veinte caracteres',$2,case when $2='pendiente' then null else now() end)`,[id,estado]);
  await perfil(PEND,'pendiente');await perfil(RECH,'rechazado');await perfil(LIMPIO,'aprobado');await perfil(CONHIST,'aprobado');await perfil(CONALUM,'aprobado');
  const anuncio=(id,autor,estado,publicado)=>db.query(`insert into tutor_anuncios(id,autor_id,tenant,ramos_siglas,precio_clp,descripcion,contacto_tipo,contacto_valor,titulo,estado,publicado_at)
    values($1,$2,'uc',array['MAT1620'],15000,'Clase sintética de más de veinte caracteres','whatsapp','+56912345678','Clase sintética',$3,$4)`,[id,autor,estado,publicado]);
  await anuncio(u(41),LIMPIO,'borrador',null);
  await anuncio(u(51),CONHIST,'expirado',new Date(Date.now()-864e5*20).toISOString());
  const estado=async id=>((await q('select estado from tutor_perfiles where user_id=$1',[id]))[0]||{}).estado;

  console.log('\n=== Solo un admin verificado ===');
  await sesion(PEND);
  check('un profesor no puede aceptarse solo',/sin acceso/.test(await falla('select admin_revisar_postulacion($1,$2)',[PEND,'aprobado'])));
  await sesion(ADMIN,'aal1');
  check('un admin sin MFA tampoco',/sin acceso/.test(await falla('select admin_eliminar_profesor($1)',[LIMPIO])));
  await sesion(ADMIN);

  console.log('\n=== Aceptar y rechazar ===');
  check('el panel trae la presentación y si tiene historial',(await q('select admin_panel_clases() j'))[0].j.some(p=>p.user_id===CONHIST&&p.tiene_historial===true&&p.presentacion));
  check('aceptar una pendiente',(await q('select admin_revisar_postulacion($1,$2) ok',[PEND,'aprobado']))[0].ok===true&&await estado(PEND)==='aprobado');
  check('aceptar dos veces no hace nada',(await q('select admin_revisar_postulacion($1,$2) ok',[PEND,'aprobado']))[0].ok===false);
  check('rechazar a uno aprobado no se puede (eso es pausar)',(await q('select admin_revisar_postulacion($1,$2) ok',[PEND,'rechazado']))[0].ok===false&&await estado(PEND)==='aprobado');
  check('una rechazada por error se puede aceptar',(await q('select admin_revisar_postulacion($1,$2) ok',[RECH,'aprobado']))[0].ok===true);
  check('un estado inventado no entra',/estado inválido/.test(await falla('select admin_revisar_postulacion($1,$2)',[LIMPIO,'suspendido'])));
  check('queda registro de quién decidió',(await q("select count(*)::int n from admin.acciones where accion='revisar_postulacion' and admin_id=$1",[ADMIN]))[0].n===2);

  console.log('\n=== Eliminar ===');
  check('con campañas publicadas no se elimina',/páusalo/.test(await falla('select admin_eliminar_profesor($1)',[CONHIST]))&&await estado(CONHIST)==='aprobado');
  await db.exec(read('supabase/profesor_alumnos.sql'));
  await db.query(`insert into profesor_alumnos(tutor_id,alumno_id,nombre_visible,ramos) values($1,$2,'Alumno sintético',array['r1'])`,[CONALUM,ALUMNO]);
  check('con alumnos conectados no se elimina',/alumnos conectados/.test(await falla('select admin_eliminar_profesor($1)',[CONALUM])));
  check('y el panel cuenta sus alumnos',(await q('select admin_panel_clases() j'))[0].j.find(p=>p.user_id===CONALUM).alumnos_conectados===1);
  check('sin historial, se elimina',(await q('select admin_eliminar_profesor($1) ok',[LIMPIO]))[0].ok===true&&await estado(LIMPIO)===undefined);
  check('la cuenta sigue intacta',(await q('select count(*)::int n from auth.users where id=$1',[LIMPIO]))[0].n===1);
  check('sus borradores quedan dados de baja, no borrados',(await q('select estado from tutor_anuncios where id=$1',[u(41)]))[0].estado==='eliminado');
  check('eliminar a alguien que ya no está devuelve false',(await q('select admin_eliminar_profesor($1) ok',[LIMPIO]))[0].ok===false);
  await db.exec('reset role');
  check('puede volver a postular',!(await falla(`insert into tutor_perfiles(user_id,nombre_publico,presentacion) values($1,'De nuevo','Presentación ficticia de más de veinte caracteres')`,[LIMPIO])));

  console.log('\n=== Permisos y reaplicar ===');
  check('anon no ejecuta ninguna',!(await q(`select has_function_privilege('anon','public.admin_eliminar_profesor(uuid)','execute') a,has_function_privilege('anon','public.admin_revisar_postulacion(uuid,text)','execute') b`)).some(r=>r.a||r.b));
  check('los helpers internos no se llaman desde afuera',!(await q(`select has_function_privilege('authenticated','admin.profesor_tiene_historial(uuid)','execute') p`))[0].p);
  await db.exec(read('supabase/administradores.sql'));
  check('administradores.sql se puede aplicar de nuevo',(await q("select count(*)::int n from pg_proc where proname in ('admin_revisar_postulacion','admin_eliminar_profesor')"))[0].n===2);
  console.log(`\nPASS: ${pruebas}   FAIL: 0`);
}catch(e){console.error('  FAIL',e.message);process.exit(1);}})();
