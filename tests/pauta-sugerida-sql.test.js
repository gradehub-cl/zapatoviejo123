const assert=require('node:assert/strict'),fs=require('node:fs'),{PGlite}=require('@electric-sql/pglite');
(async()=>{
  const db=new PGlite();
  await db.exec(fs.readFileSync('bin/supabase-stubs.sql','utf8'));
  await db.exec(`create table public.catalogo_uc(sigla text primary key,nombre text,creditos int,busqueda text);
    create table public.user_ramos(user_id uuid primary key references auth.users(id),data jsonb);
    create table public.catalog_reports(id uuid primary key default gen_random_uuid(),user_id uuid references auth.users(id),
      tenant text,carrera text,ramo text,ramo_norm text,estructura jsonb,huella text,nota text,created_at timestamptz default now());`);
  for(const file of ['catalog_consensus','consenso_periodo','pauta_sugerida','pauta_sugerida'])
    await db.exec(fs.readFileSync(`supabase/${file}.sql`,'utf8'));
  const clave='ZZZ1234',periodo='2026-2';
  const a=[{nombre:'Pruebas',peso:60,slots:2},{nombre:'Examen',peso:40,min:3,cap:3.9}];
  const b=[{nombre:'Proyecto',peso:65},{nombre:'Presentación',peso:35}];
  const c=[{nombre:'Controles',peso:30},{nombre:'Examen',peso:70}];
  const id=n=>'00000000-0000-0000-0000-'+String(n).padStart(12,'0');
  for(let n=1;n<=12;n++){
    await db.query('insert into auth.users(id) values($1)',[id(n)]);
    if(n!==11)await db.query('insert into public.user_ramos values($1,$2)',[id(n),{
      tenant:n===10?'fen':'uc',onboardingDone:n!==9,tipoCuenta:n===12?'profesor':'estudiante',
    }]);
  }
  const uid=async n=>db.query("select set_config('request.jwt.claim.sub',$1,false)",[n?id(n):'']);
  const report=async(n,est=a,{p=periodo,s=null,k=clave,tenant='uc',rama=k,origen='explicito',at='2026-11-01'}={})=>
    db.query(`insert into public.catalog_reports(user_id,tenant,ramo,ramo_norm,ramo_sigla,estructura,huella,nota,seccion,periodo,origen,updated_at)
      values($1,$2,'Nombre de reporte excluido',$3,$4,$5,public.huella_catalogo($5),'Texto libre excluido',$6,$7,$8,$9)`,
      [id(n),tenant,rama,k,JSON.stringify(est),s,p,origen,at]);
  const sugerir=async({s=null,k=clave,p=periodo,tenant='uc'}={})=>(await db.query(
    'select * from public.pauta_sugerida($1,$2,$3,$4)',[tenant,p,k,s])).rows;
  const limpiar=()=>db.exec('delete from public.catalog_reports');
  await report(1,a.map(e=>({...e,nota:7,uid:'Privado',fecha:'2000-01-01',otro:{correo:'Privado'}})));
  await report(9);await report(10);await report(11);
  await report(2,b,{p:'2025-2'});await report(2,b,{k:'ZZZ1235'});
  await uid(8); // Tiene tenant, pero su JSON no tiene ningún ramo.
  await db.exec('set role anon');
  await assert.rejects(sugerir(),/permission denied/);
  await db.exec('set role authenticated');
  const [sugerida]=await sugerir();
  assert.deepEqual(Object.keys(sugerida).sort(),['estructura','huella','respaldos']);
  assert.deepEqual(sugerida.estructura,a);
  assert.equal(sugerida.respaldos,1);
  assert.deepEqual(await sugerir({k:'ZZZ'}),[]);
  assert.equal((await sugerir({p:'2025-2'}))[0].estructura[0].nombre,'Proyecto');
  assert.deepEqual(await sugerir({tenant:'fen'}),[]);
  for(const n of [0,10,11,12]){await uid(n);assert.deepEqual(await sugerir(),[]);}
  await db.exec('reset role');
  await uid(8);

  // Una fila legado duplicada por persona no suma votos; gana la más reciente.
  await report(1,b,{at:'2026-10-31'});
  await report(2,a);
  assert.equal((await sugerir())[0].respaldos,2);
  await report(3,a);
  assert.deepEqual(await sugerir(),[]);
  assert.equal((await db.query('select respaldos from public.catalog_consensus_periodo($1,$2,null) where ramo_key=$3',
    ['uc',periodo,clave])).rows[0].respaldos,3,'sigue existiendo el consenso normal');
  await report(4,b);await report(5,b);await report(6,c);
  assert.equal((await sugerir())[0].respaldos,3,'3 de 6 no es consenso y sí se puede sugerir');

  await limpiar();
  await report(1,a);await report(2,b);await report(3,c);
  const empate=await sugerir();
  assert.equal(empate.length,2);
  assert.deepEqual(await sugerir(),empate,'orden y muestra estables en el empate');
  assert.ok(empate.every(r=>r.respaldos===1));
  await limpiar();
  await report(1,a,{s:1});await report(2,b,{s:2});
  assert.deepEqual(await sugerir(),[]);
  assert.deepEqual(await sugerir({s:3}),[]);
  assert.deepEqual((await sugerir({s:1}))[0].estructura,a);
  assert.deepEqual((await sugerir({s:2}))[0].estructura,b);
  await report(3,a);
  assert.deepEqual(await sugerir(),[]);
  assert.equal((await sugerir({s:1}))[0].respaldos,1,'prefiere la sección declarada');
  await limpiar();
  await report(1,a,{s:1});await report(2,a);
  assert.deepEqual((await sugerir({s:2}))[0].estructura,a,'común compatible y sin atribución a otra sección');
  await report(3,b,{s:1});
  assert.deepEqual(await sugerir({s:2}),[],'el reporte común queda ambiguo ante una variante');
  await limpiar();
  await report(1,[{nombre:'Pruebas',peso:50},{nombre:'Examen',peso:40}]);
  await report(2,[{nombre:'Pruebas',peso:60},{nombre:'Examen',peso:40,min:8,cap:3.9}]);
  await report(3,[{nombre:'Pruebas',peso:60,slots:2.5},{nombre:'Examen',peso:40}]);
  assert.deepEqual(await sugerir(),[]);
  await report(4,a,{origen:'automatico'});
  await report(5,a,{origen:'explicito'});
  assert.equal((await sugerir())[0].respaldos,2);
  await db.query("insert into public.pautas_catalogo_registro values ('uc',$1,$2,'Sintético',$1,'[]')",[clave,periodo]);
  assert.deepEqual(await sugerir(),[],'el programa excluye toda sugerencia');
  await db.close();
  console.log('OK: RPC reaplicable, permisos, contexto, filtros, empates, privacidad y consenso');
})().catch(e=>{console.error(e);process.exitCode=1;});
