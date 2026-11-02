// Perfil de profesor o empresa (Lucas, 2026-10-23; base de #643). PostgreSQL
// en memoria con cuentas y anuncios sintéticos. Lo que importa: nada es público
// hasta que el profesor lo activa, solo se ve desde un anuncio publicado y
// vigente de un profesor aprobado, nunca sale el user_id, y reaplicar el
// archivo base no le quita al profesor el permiso de editarlo.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {PGlite}=require('@electric-sql/pglite');
const read=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
const u=i=>`00000000-0000-0000-0000-0000000002${String(i).padStart(2,'0')}`;
const PROF=u(1),PEND=u(2),A1=u(11),A2=u(12),A3=u(13),A4=u(14);
let pruebas=0;
const check=(nombre,cond)=>{assert.ok(cond,nombre);pruebas++;console.log('  OK   '+nombre);};
const falla=async(db,sql,params=[])=>{try{await db.query(sql,params);return null;}catch(e){return e.message;}};
(async()=>{try{
  const db=new PGlite();
  await db.exec(read('bin/supabase-stubs.sql'));
  await db.exec(`create function auth.jwt() returns jsonb language sql stable as $$ select '{}'::jsonb $$;
    create table public.user_ramos(user_id uuid);`);
  await db.exec(read('supabase/clases_particulares.sql'));
  await db.exec(read('supabase/perfil_profesor.sql'));
  for(const id of [PROF,PEND])await db.query('insert into auth.users(id) values($1)',[id]);
  await db.query(`insert into tutor_perfiles(user_id,nombre_publico,presentacion,estado,revisado_at)
    values($1,'Academia Sintética','Presentación ficticia para probar el perfil','aprobado',now())`,[PROF]);
  await db.query(`insert into tutor_perfiles(user_id,nombre_publico,presentacion) values($1,'Profe Pendiente','Presentación ficticia para probar el perfil')`,[PEND]);
  const anuncio=async(id,autor,estado,vence)=>db.query(`insert into tutor_anuncios(id,autor_id,tenant,ramos_siglas,precio_clp,descripcion,contacto_tipo,contacto_valor,titulo,estado,revisado_at,pagado_at,publicado_at,vence_at)
    values($1,$2,'uc',array['MAT1620'],15000,'Clase sintética de más de veinte caracteres','whatsapp','+56912345678','Clase sintética',$3,
      case when $3='publicado' then now() end,case when $3='publicado' then now() end,case when $3='publicado' then now()-interval '1 day' end,$4)`,[id,autor,estado,vence]);
  await anuncio(A1,PROF,'publicado',null);
  await anuncio(A2,PROF,'publicado',null);
  await anuncio(A3,PROF,'borrador',null);
  const perfil=async id=>(await db.query('select * from perfil_publico_de_anuncio($1)',[id])).rows;

  console.log('\n=== Nada es público hasta que el profesor lo activa ===');
  check('los perfiles que ya existían parten privados',(await db.query('select perfil_publico from tutor_perfiles where user_id=$1',[PROF])).rows[0].perfil_publico===false);
  check('un anuncio publicado no muestra un perfil privado',(await perfil(A1)).length===0);
  await db.query(`update tutor_perfiles set perfil_publico=true,tipo_perfil='empresa',instagram='academia.sintetica',
    sitio_web='https://ejemplo.cl/academia',universidades=array['uc','fen'],ramos_siglas=array['MAT1620','FIS1514'] where user_id=$1`,[PROF]);
  const visto=await perfil(A1);
  check('activado, se ve desde su anuncio con lo que el profesor llenó',visto.length===1&&visto[0].nombre_publico==='Academia Sintética'
    &&visto[0].tipo_perfil==='empresa'&&visto[0].instagram==='academia.sintetica'&&visto[0].universidades.join()==='uc,fen');
  check('y trae sus otros anuncios publicados, no los borradores',visto[0].anuncios.length===2&&!visto[0].anuncios.includes(A3));
  check('nunca el user_id ni el correo',!Object.keys(visto[0]).some(k=>/user|correo|email|autor/.test(k)));
  check('un borrador no muestra el perfil',(await perfil(A3)).length===0);

  console.log('\n=== Solo profesores aprobados y anuncios vigentes ===');
  await db.query(`update tutor_perfiles set perfil_publico=true where user_id=$1`,[PEND]);
  await anuncio(A4,PEND,'borrador',null);
  check('un profesor pendiente no tiene perfil visible',(await perfil(A4)).length===0);
  await db.query(`update tutor_anuncios set vence_at=now()-interval '1 hour',publicado_at=now()-interval '2 days' where id=$1`,[A2]);
  check('un anuncio vencido no muestra el perfil',(await perfil(A2)).length===0);
  check('ni aparece entre los otros anuncios',(await perfil(A1))[0].anuncios.join()===A1);

  console.log('\n=== Lo que se guarda tiene forma ===');
  const mal=async(campo,valor)=>!!(await falla(db,`update tutor_perfiles set ${campo}=$2 where user_id=$1`,[PROF,valor]));
  check('Instagram sin espacios ni @ al medio',await mal('instagram','no vale con espacios'));
  check('sitio web solo https',await mal('sitio_web','http://ejemplo.cl'));
  check('ni con usuario dentro',await mal('sitio_web','https://alguien@ejemplo.cl'));
  check('universidades solo las del marketplace',await mal('universidades',['uc','harvard']));
  check('siglas con forma de sigla',await mal('ramos_siglas',['mat 1620']));
  check('un tipo inventado no entra',await mal('tipo_perfil','colegio'));

  console.log('\n=== Permisos ===');
  const privs=async()=>(await db.query(`select bool_and(has_column_privilege('authenticated','public.tutor_perfiles',c,'update')) u,
    bool_and(has_column_privilege('authenticated','public.tutor_perfiles',c,'select')) s
    from unnest(array['tipo_perfil','instagram','sitio_web','universidades','ramos_siglas','perfil_publico']) c`)).rows[0];
  check('el profesor lee y edita sus campos nuevos',(await privs()).u&&(await privs()).s);
  check('anon no lee la tabla directo',!(await db.query(`select has_column_privilege('anon','public.tutor_perfiles','instagram','select') p`)).rows[0].p);
  check('pero sí el perfil desde un anuncio',(await db.query(`select has_function_privilege('anon','public.perfil_publico_de_anuncio(uuid)','execute') p`)).rows[0].p);
  await db.exec(read('supabase/clases_particulares.sql'));
  check('reaplicar el archivo base no le quita el permiso de editar (la lección de #559)',(await privs()).u);
  await db.exec(read('supabase/perfil_profesor.sql'));
  check('y el delta se puede aplicar de nuevo',(await perfil(A1)).length===1);
  console.log(`\nPASS: ${pruebas}   FAIL: 0`);
}catch(e){console.error('  FAIL',e.message);process.exit(1);}})();
