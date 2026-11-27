// Una cuenta que cambia su sección y califica al mismo docente en cada una
// cuenta una sola vez para el piso, el promedio y las etiquetas de estrellas.
// PostgreSQL real en memoria, cuentas sintéticas.
const assert=require('node:assert/strict'),fs=require('node:fs'),{PGlite}=require('@electric-sql/pglite');
const read=f=>fs.readFileSync(__dirname+'/../'+f,'utf8'),db=new PGlite(),u=i=>`00000000-0000-0000-0000-${String(i).padStart(12,'0')}`;
const q=async(s,a=[])=>(await db.query(s,a)).rows;
const soy=async i=>{await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[u(i)]);await db.exec('set role authenticated');};
const ramo=(i,sec)=>({id:'r'+i,nombre:'Ramo sintético',sigla:'TST100',seccion:sec,origen:{tenant:'uc',ramoKey:'TST100'},categorias:[]});
const enSeccion=async(i,sec)=>{await db.exec('reset role');await db.query('update user_ramos set data=$2 where user_id=$1',[u(i),JSON.stringify({tenant:'uc',tipoCuenta:'estudiante',ramos:[ramo(i,sec)],historial:[]})]);};
(async()=>{try{
  await db.exec(read('bin/supabase-stubs.sql'));
  await db.exec('create table public.user_ramos(user_id uuid primary key references auth.users(id) on delete cascade,data jsonb); alter default privileges in schema public grant execute on functions to anon,authenticated;');
  await db.exec(read('supabase/profesores.sql'));await db.exec(read('supabase/ramo_calificaciones.sql'));
  const periodo=(await q('select profesor_periodo_actual() as p'))[0].p;
  for(const i of [1,2,3,4,5]){await db.query('insert into auth.users(id) values($1)',[u(i)]);await db.query('insert into user_ramos values($1,$2)',[u(i),JSON.stringify({tenant:'uc',ramos:[ramo(i,1)],historial:[]})]);}
  const calificar=async(i,sec,estrellas,etiquetas='{}')=>{
    await enSeccion(i,sec);await soy(i);
    await q('select profesor_docente_informar($1,$2,$3,$4)',['r'+i,sec,periodo,'Ana Prueba']);
    await q('select profesor_calificar($1,$2,$3,$4,$5)',['r'+i,sec,periodo,estrellas,etiquetas]);
  };
  const estado=async(i,sec)=>(await q('select * from profesor_calificacion_estado($1,$2,$3)',['r'+i,sec,periodo]))[0];
  const resumen=async()=>(await q("select ramo_resumen_publico('uc','TST100') as j"))[0].j;
  // La cuenta 1 recorre tres secciones y le pone 1 estrella al mismo docente en cada una.
  for(const sec of [1,2,3])await calificar(1,sec,1);
  let e=await estado(1,3);
  assert.equal(e.total,1,'tres secciones de la misma cuenta cuentan como una persona');
  assert.equal(e.promedio,null,'una sola persona no publica promedio');
  // El resumen del ramo solo se abre con cinco opiniones del ramo.
  const opinar=async(i,sec)=>{await soy(i);await q('select ramo_calificar($1,$2,$3,$4,$5,$6,$7,$8)',['r'+i,sec,periodo,i%4+1,i%5+1,null,true,['interesante']]);};
  await opinar(1,3);for(const i of [2,3,4,5]){await enSeccion(i,1);await opinar(i,1);}
  let d=(await resumen()).docentes.find(x=>x.nombre==='Ana Prueba');
  assert.equal(d?.estrellas??null,null,'el resumen del ramo tampoco publica estrellas con una persona');
  // Dos personas más le ponen 5: el promedio es de tres personas, no de cinco filas.
  await calificar(2,1,5);await calificar(3,1,5);
  e=await estado(3,1);
  assert.equal(e.total,3);
  assert.equal(Number(e.promedio),3.7,'(1+5+5)/3, no (1+1+1+5+5)/5');
  d=(await resumen()).docentes.find(x=>x.nombre==='Ana Prueba');
  assert.equal(d.estrellas.total,3);assert.equal(d.estrellas.promedio,3.7);
  // Se usa la calificación más reciente de esa persona.
  await calificar(1,2,5);
  assert.equal(Number((await estado(1,2)).promedio),5);
  console.log('OK: estrellas de docentes, una calificación por persona aunque cambie de sección');
}catch(err){console.error(err);process.exitCode=1;}})();
