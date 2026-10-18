// Panel de alumnos para profesores (decisión de Lucas, 2026-10-08).
// PostgreSQL real en memoria; profesores, alumnos, ramos y notas sintéticos.
// Prueba el consentimiento (solo lo compartido, revocable), que nadie vea el
// user_id del otro, el mínimo de 5 en las comparaciones y el borrado en cascada.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {PGlite}=require('@electric-sql/pglite');
const raiz=path.join(__dirname,'..'),leer=f=>fs.readFileSync(path.join(raiz,f),'utf8');
const db=new PGlite();
const u=i=>`00000000-0000-0000-0000-0000000000${String(i).padStart(2,'0')}`;
const PROFE=u(1),PENDIENTE=u(2),ALUMNA=u(10),OTRO=u(11);
let pruebas=0;
const check=(nombre,cond)=>{assert.ok(cond,nombre);pruebas++;console.log('  OK   '+nombre);};
const q=async(text,params=[])=>(await db.query(text,params)).rows;
const soy=id=>db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]);
const falla=async(text,params=[])=>{try{await db.query(text,params);return null;}catch(e){return e.message;}};
// Un ramo sintético con una nota por evaluación.
const ramo=(id,sigla,notas)=>({id,nombre:'Ramo '+sigla,sigla,color:'#7F77DD',gates:[],
  categorias:[{id:'c-'+id,nombre:'Pruebas',peso:100,notas:notas.map(([nombre,valor],i)=>({id:`n-${id}-${i}`,nombre,valor}))}]});
const guardar=(id,ramos,tenant='uc')=>db.query(
  'insert into public.user_ramos(user_id,data) values($1,$2) on conflict(user_id) do update set data=excluded.data',
  [id,JSON.stringify({tenant,ramos})]);
(async()=>{
try{
  await db.exec(leer('bin/supabase-stubs.sql'));
  // Dependencias de Supabase y de otros archivos. No reproducen su esquema real.
  await db.exec(`create function auth.jwt() returns jsonb language sql stable as $$ select '{}'::jsonb $$;
    create table public.user_ramos(user_id uuid primary key references auth.users(id) on delete cascade, data jsonb not null);`);
  await db.exec(leer('supabase/clases_particulares.sql'));
  await db.exec(leer('supabase/curso_posicion.sql'));
  await db.exec(leer('supabase/profesor_alumnos.sql'));
  for(const id of [PROFE,PENDIENTE,ALUMNA,OTRO,u(20),u(21),u(22),u(23),u(24)])await db.query('insert into auth.users(id) values($1)',[id]);
  await db.query(`insert into tutor_perfiles(user_id,nombre_publico,presentacion,estado,revisado_at)
    values($1,'Academia Sintética','Presentación ficticia para probar el panel','aprobado',now())`,[PROFE]);
  await db.query(`insert into tutor_perfiles(user_id,nombre_publico,presentacion)
    values($1,'Profe Pendiente','Presentación ficticia para probar el panel')`,[PENDIENTE]);

  // La alumna lleva Cálculo II y Física; comparte solo Cálculo II.
  await guardar(ALUMNA,[ramo('r1','MAT1620',[['Interrogación 1',4.2],['Interrogación 2',5.0]]),ramo('r2','FIS1514',[['Control 1',6.0]])]);
  // Otros cuatro con Cálculo II, escribiendo la I1 de distintas formas: con
  // ella son cinco en la I1. La I2 la tienen solo dos más: tres en total.
  const otros=[[u(20),'Interrogacion 1',5.0],[u(21),'interrogación  1',3.0],[u(22),'Interrogación 1',6.0],[u(23),'INTERROGACIÓN 1',4.8]];
  for(const [i,[id,nombre,valor]] of otros.entries())
    await guardar(id,[ramo('x'+id.slice(-2),'MAT1620',i<2?[[nombre,valor],['Interrogación 2',4.0]]:[[nombre,valor]])]);
  // Uno de la FEN con la misma sigla inventada no se mezcla con la UC.
  await guardar(u(24),[ramo('f1','MAT1620',[['Interrogación 1',1.0]])],'fen');
  // Promedios de ramo que cada uno ya subió desde Estadísticas.
  for(const [id,prom] of [[ALUMNA,4.6],[u(20),4.5],[u(21),3.5],[u(22),6.0],[u(23),4.8]])
    await db.query(`insert into curso_notas(user_id,tenant,ramo_sigla,promedio) values($1,'uc','MAT1620',$2)`,[id,prom]);

  console.log('\n=== El código del profesor ===');
  await soy(PENDIENTE);
  check('un profesor no aprobado no tiene link',!!(await falla('select codigo_alumnos_profesor()')));
  await soy(PROFE);
  const codigo=(await q('select codigo_alumnos_profesor() c'))[0].c;
  check('el aprobado recibe un código de 8 letras y números sin ambiguos',/^[A-HJ-NP-Z2-9]{8}$/.test(codigo));
  check('pedirlo otra vez devuelve el mismo',(await q('select codigo_alumnos_profesor() c'))[0].c===codigo);
  const nuevo=(await q('select codigo_alumnos_profesor(true) c'))[0].c;
  check('renovarlo cambia el código',nuevo!==codigo);
  await soy(ALUMNA);
  check('el código viejo deja de servir',(await q('select * from profesor_por_codigo($1)',[codigo])).length===0);
  const perfil=await q('select * from profesor_por_codigo($1)',[nuevo.toLowerCase()+' ']);
  check('el nuevo muestra solo nombre y logo, sin la cuenta del profesor',
    perfil.length===1&&perfil[0].nombre_publico==='Academia Sintética'&&Object.keys(perfil[0]).sort().join()==='logo_path,nombre_publico');
  check('nadie puede leer los códigos de la tabla',
    !(await q(`select has_column_privilege('authenticated','public.tutor_perfiles','codigo_alumnos','select') p`))[0].p);

  console.log('\n=== Compartir es decisión del alumno ===');
  check('sin ramos válidos no se comparte',/elige al menos un ramo/.test(await falla('select compartir_con_profesor($1,$2,$3)',[nuevo,'Cami',['no-existe']])));
  check('sin nombre no se comparte',/nombre/.test(await falla('select compartir_con_profesor($1,$2,$3)',[nuevo,'  ',['r1']])));
  check('un código que no existe no sirve',/ningún profesor/.test(await falla('select compartir_con_profesor($1,$2,$3)',['ZZZZZZZZ','Cami',['r1']])));
  const idCompartido=(await q('select compartir_con_profesor($1,$2,$3) id',[nuevo,'Cami',['r1','ramo-ajeno']]))[0].id;
  check('comparte solo sus propios ramos (el ajeno se descarta)',
    (await q('select ramos from profesor_alumnos where id=$1',[idCompartido]))[0].ramos.join()==='r1');
  await soy(PROFE);
  check('el profesor no puede compartirse a sí mismo',/contigo mismo/.test(await falla('select compartir_con_profesor($1,$2,$3)',[nuevo,'Yo',['r1']])));
  check('la tabla no se lee ni se escribe desde el cliente',
    !(await q(`select has_table_privilege('authenticated','public.profesor_alumnos','select') s,
               has_table_privilege('authenticated','public.profesor_alumnos','insert') i`)).some(f=>f.s||f.i));

  console.log('\n=== Lo que ve el profesor ===');
  const alumnos=await q('select * from mis_alumnos()');
  check('ve a su alumna con el nombre que ella eligió',alumnos.length===1&&alumnos[0].nombre_visible==='Cami');
  check('no recibe su user_id ni su correo',Object.keys(alumnos[0]).sort().join()==='desde,id,inicio,nombre_visible,ramos,tenant');

  console.log('\n=== Cuándo empezó contigo (#697) ===');
  check('por omisión no hay fecha de inicio: se usa cuándo compartió',alumnos[0].inicio===null);
  check('el profesor la corrige',(await q("select fijar_inicio_alumno($1,'2026-08-20') ok",[alumnos[0].id]))[0].ok===true
    &&String((await q('select inicio::text i from mis_alumnos()'))[0].i)==='2026-08-20');
  check('no puede ser futura',/futura/.test(await falla("select fijar_inicio_alumno($1,current_date+1)",[alumnos[0].id])));
  check('null vuelve a cuándo compartió',(await q('select fijar_inicio_alumno($1,null) ok',[alumnos[0].id]))[0].ok===true
    &&(await q('select inicio from mis_alumnos()'))[0].inicio===null);
  await soy(OTRO);
  check('otra cuenta no puede tocarla',!!(await falla("select fijar_inicio_alumno($1,'2026-08-01')",[alumnos[0].id])));
  await soy(PROFE);
  check('recibe solo el ramo compartido, completo para calcular con ramoAvg',
    alumnos[0].ramos.length===1&&alumnos[0].ramos[0].sigla==='MAT1620'&&alumnos[0].ramos[0].categorias[0].notas.length===2);
  await soy(PENDIENTE);
  check('un profesor no aprobado no ve alumnos',!!(await falla('select * from mis_alumnos()')));
  await soy(OTRO);
  check('cualquier otra cuenta tampoco',!!(await falla('select * from mis_alumnos()')));

  console.log('\n=== Comparación con GradeHub ===');
  await soy(PROFE);
  const comp=(await q(`select comparacion_ramo_profesor('uc','mat1620') c`))[0].c;
  check('el promedio del ramo, desde 5 personas',comp.ramo&&Number(comp.ramo.promedio)===4.7&&comp.ramo.personas===5);
  const i1=comp.evaluaciones.find(e=>e.clave==='interrogacion 1');
  check('junta la misma prueba escrita distinto: 5 personas en la I1',i1&&i1.personas===5&&Number(i1.promedio)===4.6);
  check('la I2 tiene 3 personas y no aparece',!comp.evaluaciones.some(e=>e.clave==='interrogacion 2'));
  check('la FEN no se mezcla con la UC',comp.evaluaciones.every(e=>e.personas<=5));
  // Las cinco tienen la categoría "Pruebas" aunque cada una nombre distinto sus notas.
  const catPruebas=comp.categorias.find(c=>c.clave==='pruebas');
  check('por categoría calzan aunque cada uno renombre sus notas',catPruebas&&catPruebas.personas===5);
  // Por persona: alumna (4,2+5,0)/2=4,6; u20 (5+4)/2=4,5; u21 (3+4)/2=3,5; u22 6,0; u23 4,8 → 4,68.
  check('con el promedio de la categoría de cada uno (4,7)',catPruebas&&Number(catPruebas.promedio)===4.7);
  check('sin un alumno que le comparta ese ramo, no puede consultarlo',
    (await q(`select comparacion_ramo_profesor('uc','FIS1514') c`))[0].c===null);
  await soy(OTRO);
  check('otra cuenta no puede consultar comparaciones',(await q(`select comparacion_ramo_profesor('uc','MAT1620') c`))[0].c===null);

  console.log('\n=== Dejar de compartir y borrar cuentas ===');
  await soy(ALUMNA);
  const mios=await q('select * from mis_profesores()');
  check('la alumna ve con quién comparte y qué',mios.length===1&&mios[0].nombre_publico==='Academia Sintética'&&mios[0].ramos.join()==='r1');
  check('ella tampoco recibe la cuenta del profesor',!Object.keys(mios[0]).some(k=>/user|tutor|alumno/.test(k)));
  await soy(OTRO);
  check('otra cuenta no puede borrar el compartido ajeno',(await q('select dejar_de_compartir($1) b',[idCompartido]))[0].b===false);
  await soy(ALUMNA);
  check('la alumna deja de compartir con un toque',(await q('select dejar_de_compartir($1) b',[idCompartido]))[0].b===true);
  await soy(PROFE);
  check('y el profesor deja de verla al tiro',(await q('select * from mis_alumnos()')).length===0);
  await soy(ALUMNA);
  const otraVez=(await q('select compartir_con_profesor($1,$2,$3) id',[nuevo,'Cami',['r1','r2']]))[0].id;
  await soy(PROFE);
  check('el profesor también puede sacar a un alumno',(await q('select quitar_alumno($1) b',[otraVez]))[0].b===true);
  await soy(ALUMNA);
  await q('select compartir_con_profesor($1,$2,$3)',[nuevo,'Cami',['r1']]);
  await db.query('delete from auth.users where id=$1',[ALUMNA]);
  check('borrar la cuenta del alumno borra lo compartido',(await q('select count(*)::int n from profesor_alumnos'))[0].n===0);

  console.log('\n=== Seguridad de las funciones ===');
  const funciones=await q(`select proname, prosecdef, proconfig from pg_proc
    where proname in ('codigo_alumnos_profesor','profesor_por_codigo','compartir_con_profesor','dejar_de_compartir',
                      'mis_profesores','mis_alumnos','quitar_alumno','comparacion_ramo_profesor')`);
  check('las ocho son security definer con search_path fijo',
    funciones.length===8&&funciones.every(f=>f.prosecdef&&(f.proconfig||[]).some(c=>c==='search_path=public')));
  check('anon no puede llamar ninguna',
    !(await q(`select bool_or(has_function_privilege('anon',p.oid,'execute')) a from pg_proc p
      where proname in ('mis_alumnos','compartir_con_profesor','comparacion_ramo_profesor')`))[0].a);

  console.log(`\nPASS: ${pruebas}   FAIL: 0`);
}catch(e){console.error('  FAIL',e.message);process.exit(1);}
})();
