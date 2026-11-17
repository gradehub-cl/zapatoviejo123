// pautas_sugeridas: reportes agrupados por estructura, sección y profesor, sin
// identificar a nadie. PostgreSQL real en memoria; cuentas y ramos sintéticos.
const assert=require('node:assert/strict'),fs=require('node:fs'),{PGlite}=require('@electric-sql/pglite');
(async()=>{
  const db=new PGlite();
  await db.exec(fs.readFileSync('bin/supabase-stubs.sql','utf8'));
  await db.exec(`create table public.catalogo_uc(sigla text primary key,nombre text,creditos int,busqueda text);
    create table public.user_ramos(user_id uuid primary key references auth.users(id),data jsonb);
    create table public.catalog_reports(id uuid primary key default gen_random_uuid(),user_id uuid references auth.users(id),
      tenant text,carrera text,ramo text,ramo_norm text,estructura jsonb,huella text,nota text,created_at timestamptz default now());`);
  for(const file of ['catalog_consensus','consenso_periodo','pauta_sugerida','profesores','pautas_sugeridas','pautas_sugeridas'])
    await db.exec(fs.readFileSync(`supabase/${file}.sql`,'utf8'));
  const clave='ZZZ1234',periodo='2026-2';
  const A=[{nombre:'Trabajo final',peso:30},{nombre:'Prueba',peso:70}];
  const B=[{nombre:'Ensayo',peso:40},{nombre:'Examen',peso:60}];
  const id=n=>'00000000-0000-0000-0000-'+String(n).padStart(12,'0');
  for(let n=1;n<=12;n++){
    await db.query('insert into auth.users(id) values($1)',[id(n)]);
    await db.query('insert into public.user_ramos values($1,$2)',[id(n),{tenant:'uc',onboardingDone:true,tipoCuenta:n===12?'profesor':'estudiante'}]);
  }
  const reportar=(n,est,s=null)=>db.query(`insert into public.catalog_reports(user_id,tenant,ramo,ramo_norm,ramo_sigla,estructura,huella,nota,seccion,periodo,origen,updated_at)
    values($1,'uc','Nombre excluido','ramo sintetico',$2,$3,public.huella_catalogo($3),'Texto libre excluido',$4,$5,'explicito',now())`,
    [id(n),clave,JSON.stringify(est),s,periodo]);
  const aporte=(n,nombre,s)=>db.query(`insert into public.profesor_aportes(user_id,tenant,ramo_clave,seccion,periodo,nombre)
    values($1,'uc',public.profesor_normalizar($2),$3,$4,$5)`,[id(n),clave,s,periodo,nombre]);
  const soy=async n=>{await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[n?id(n):'']);await db.exec('set role authenticated');};
  const pedir=async(s=null)=>(await db.query('select * from public.pautas_sugeridas($1,$2,$3,$4)',['uc',periodo,clave,s])).rows;

  // Profe A: tres cuentas de la sección 1 (nombre público). Profe B: dos de la 2.
  for(const n of [1,2,3]){await reportar(n,A,1);await aporte(n,n===2?'Ana Perez':'Ana Pérez',1);}
  for(const n of [4,5]){await reportar(n,B,2);await aporte(n,'Bruno Soto',2);}
  await reportar(7,B); // sin sección ni profe

  await db.exec('set role anon');
  await assert.rejects(pedir(),/permission denied/);

  await soy(12);
  assert.deepEqual(await pedir(),[],'una cuenta de profesor no recibe reportes');

  await soy(6);
  await db.exec('reset role');await aporte(6,'Ana Pérez',3);await soy(6);
  const filas=await pedir();
  assert.deepEqual(Object.keys(filas[0]).sort(),['estructura','huella','mio','profe','profesor','respaldos','seccion']);
  assert.ok(!JSON.stringify(filas).includes('excluido'),'ni nombre del ramo ni comentario');
  // jsonb reordena las llaves: se compara por nombre y peso.
  const forma=est=>est.map(e=>e.nombre+':'+Number(e.peso)).join('|');
  const deA=filas.filter(f=>forma(f.estructura)===forma(A));
  const deB=filas.filter(f=>forma(f.estructura)===forma(B));
  assert.equal(deA.reduce((s,f)=>s+f.respaldos,0),3,'hay consenso y aun así se devuelve');
  assert.ok(deA.every(f=>f.mio),'mismo profe aunque esté en otra sección y lo escriba sin tilde');
  assert.ok(deA.every(f=>f.profesor==='Ana Pérez'||f.profesor==='Ana Perez'),'con tres cuentas, el nombre es público');
  assert.equal(new Set(deA.filter(f=>f.profe).map(f=>f.profe)).size>=1,true);
  assert.ok(deB.every(f=>!f.mio),'otro profe');
  assert.ok(deB.every(f=>f.profesor===null),'con dos cuentas, el nombre no sale');
  assert.equal(deB.find(f=>f.seccion===2).respaldos,2);
  assert.equal(deB.find(f=>f.seccion===null).respaldos,1);
  assert.ok(!filas.some(f=>f.profe&&/Bruno|Ana/.test(f.profe)),'el profe viaja opaco');

  // Sin profe propio, la sección basta para marcar la suya.
  await soy(8);
  const porSeccion=await pedir(2);
  assert.ok(porSeccion.filter(f=>f.seccion===2).every(f=>f.mio));
  assert.ok(porSeccion.filter(f=>f.seccion!==2).every(f=>!f.mio));

  // Un docente oculto no se nombra.
  await db.exec("reset role;insert into public.profesor_ocultos(tenant,nombre) values('uc','Ana Pérez')");
  await soy(8);
  assert.ok((await pedir()).every(f=>f.profesor===null));

  // Una pauta oficial coordinada excluye los reportes; una no coordinada, no.
  await db.exec('reset role');
  await db.query(`insert into public.pautas_catalogo_registro(tenant,clave,periodo,nombre,nombre_norm,definicion)
    values('uc',$1,'','Ramo sintético','ramo sintetico',$2)`,[clave,{coordinado:false,evals:[['Prueba',100]]}]);
  await soy(8);
  assert.ok((await pedir()).length>0,'coordinado:false no excluye');
  await db.exec('reset role');
  await db.query(`update public.pautas_catalogo_registro set definicion=$1 where clave=$2`,[{evals:[['Prueba',100]]},clave]);
  await soy(8);
  assert.deepEqual(await pedir(),[],'una pauta oficial coordinada manda');
  console.log('pautas-sugeridas-sql: OK');
})().catch(e=>{console.error(e);process.exit(1);});
