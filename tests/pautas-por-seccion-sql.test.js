const assert=require('assert/strict'),fs=require('fs'),{PGlite}=require('@electric-sql/pglite');
const {registroPautas,semillaSQL,datosCatalogo}=require('../bin/actualizar-registro-pautas');
(async()=>{
 const propia={sigla:'SYN909',periodo:'2026-2',creditos:10,coordinado:false,porSeccion:{5:{evals:[['Prueba',40],['Examen',60]]},6:{evals:[['Trabajo',70],['Examen',30]]}}};
 const registro=registroPautas({presets:{uc:{'Ramo sintético':propia}},creditos:{},siglas:{}},datosCatalogo().resolver);
 assert.deepEqual(registro.filas.map(f=>f.clave),['SYN909-5','SYN909-6']);
 assert.equal(registro.filas[0].definicion.creditos,10);assert.equal(registro.filas[0].definicion.porSeccion,undefined);
 const db=new PGlite();
 try{
 await db.exec(fs.readFileSync('bin/supabase-stubs.sql','utf8'));
 await db.exec(`create table catalogo_uc(sigla text primary key,nombre text,creditos int,busqueda text);
 create table user_ramos(user_id uuid primary key references auth.users(id),data jsonb);
 create table catalog_reports(id uuid primary key default gen_random_uuid(),user_id uuid references auth.users(id),tenant text,carrera text,ramo text,ramo_norm text,estructura jsonb,huella text,nota text,created_at timestamptz default now());`);
 await db.exec(fs.readFileSync('supabase/catalog_consensus.sql','utf8'));
 await db.exec(fs.readFileSync('supabase/consenso_periodo.sql','utf8'));
 await db.exec(`insert into pautas_catalogo_registro values('uc','SYN909','2026-2','Ramo sintético','ramo sintetico','{}');`);
 const semilla=semillaSQL(registro);await db.exec(semilla);await db.exec(semilla);
 assert.deepEqual((await db.query("select clave from pautas_catalogo_registro where clave like 'SYN909%' order by clave")).rows.map(r=>r.clave),['SYN909-5','SYN909-6'],'borra solo la clave sin sección y es reaplicable');
 const id=n=>'00000000-0000-0000-0000-'+String(n).padStart(12,'0');
 for(let i=1;i<=12;i++){await db.query('insert into auth.users(id) values($1)',[id(i)]);await db.query('insert into user_ramos values($1,$2)',[id(i),JSON.stringify({tenant:'uc',onboardingDone:true})]);}
 const report=async(i,seccion,origen='explicito')=>{
  await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id(i)]);
  const estructura=seccion===6?[{nombre:'Trabajo',peso:70},{nombre:'Examen',peso:30}]:[{nombre:'Prueba',peso:40},{nombre:'Examen',peso:60}];
  await db.query("select submit_catalog_report_periodo('uc','IC','Ramo sintético','ramo sintetico','SYN909',$1,'h',null,$2,'2026-2',$3)",[JSON.stringify(estructura),seccion,origen]);
 };
 const cons=async seccion=>(await db.query("select * from catalog_consensus_periodo('uc','2026-2',$1)",[seccion])).rows;
 for(let i=1;i<=3;i++)await report(i,5);for(let i=4;i<=6;i++)await report(i,6);for(let i=7;i<=9;i++)await report(i,null);
 assert.equal((await cons(null)).length,0,'sin sección no recibe ninguna pauta no coordinada');
 assert.equal((await cons(5))[0].respaldos,3,'no cuenta las personas sin sección');
 assert.equal((await cons(6))[0].respaldos,3);
 assert.equal((await cons(4)).length,0,'otra sección no participa');
 assert.equal((await cons(5))[0].estructura[0].nombre,'Prueba');
 assert.equal((await cons(6))[0].estructura[0].nombre,'Trabajo');
 await db.exec('delete from catalog_reports');for(let i=1;i<=3;i++)await report(i,5,'automatico');
 assert.equal((await cons(5)).length,0,'pauta oficial de su sección manda sobre votos automáticos');
 for(let i=4;i<=6;i++)await report(i,4,'automatico');
 assert.equal((await cons(4))[0].respaldos,3,'una sección sin pauta oficial puede formar su propio consenso');
 console.log('PASS registro y consenso por sección: dos filas, limpieza reaplicable, ninguna mezcla, fuente oficial por sección');
 }finally{await db.close();}
})().catch(e=>{console.error(e);process.exit(1)});
