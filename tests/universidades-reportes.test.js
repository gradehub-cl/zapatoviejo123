// Migración compatible con perfiles y aplicaciones anteriores; todo sintético.
const assert=require('assert/strict'),fs=require('fs'),vm=require('vm');
const {PGlite}=require('@electric-sql/pglite');
(async()=>{
 const db=new PGlite();
 await db.exec(fs.readFileSync('bin/supabase-stubs.sql','utf8'));
 await db.exec(`create table catalogo_uc(sigla text primary key,nombre text,creditos int,busqueda text);
 create table user_ramos(user_id uuid primary key references auth.users(id),data jsonb);
 create table profiles(id uuid primary key references auth.users(id),universidad text,updated_at timestamptz default now());
 create table catalog_reports(id uuid primary key default gen_random_uuid(),user_id uuid references auth.users(id),tenant text,carrera text,ramo text,ramo_norm text,estructura jsonb,huella text,nota text,created_at timestamptz default now());`);
 await db.exec(fs.readFileSync('supabase/catalog_consensus.sql','utf8'));
 const nombres=['U. Católica · Ingeniería','U. de Chile · FEN','U. Adolfo Ibáñez','U. de los Andes','U. del Desarrollo',null];
 const ids=nombres.map((_,i)=>'00000000-0000-0000-0000-'+String(i+1).padStart(12,'0'));
 const estructura=JSON.stringify([{nombre:'Pruebas',peso:60},{nombre:'Examen',peso:40}]);
 for(let i=0;i<ids.length;i++){
  await db.query('insert into auth.users(id) values($1)',[ids[i]]);
  await db.query('insert into profiles(id,universidad) values($1,$2)',[ids[i],nombres[i]]);
  await db.query('insert into user_ramos values($1,$2)',[ids[i],JSON.stringify({tenant:'uc',onboardingDone:true})]);
 }
 for(const id of ids.slice(0,3)) await db.query(`insert into catalog_reports(user_id,tenant,carrera,ramo,ramo_norm,ramo_sigla,estructura,huella) values($1,'uc','ING-PC','Sintético','sintetico','MAT9999',$2,huella_catalogo($2))`,[id,estructura]);
 const antes=(await db.query("select * from catalog_consensus('uc')")).rows;
 const reportes=(await db.query('select * from catalog_reports order by id')).rows;
 const sql=fs.readFileSync('supabase/universidades_reportes.sql','utf8');
 await db.exec(sql);
 assert.deepEqual((await db.query('select universidad from profiles order by id')).rows.map(x=>x.universidad),['uc','fen','uai','uandes','udd',null]);
 const perfiles=(await db.query('select * from profiles order by id')).rows;
 await db.exec(sql);
 assert.deepEqual((await db.query('select * from profiles order by id')).rows,perfiles);
 assert.deepEqual((await db.query('select * from catalog_reports order by id')).rows,reportes);
 assert.deepEqual((await db.query("select * from catalog_consensus('uc')")).rows,antes);
 await db.query('update profiles set universidad=$2 where id=$1',[ids[0],nombres[0]]);
 assert.equal((await db.query('select universidad from profiles where id=$1',[ids[0]])).rows[0].universidad,'uc');
 await assert.rejects(db.query('update profiles set universidad=$2 where id=$1',[ids[0],'Desconocida']),/desconocida/);
 await db.query("select set_config('request.jwt.claim.sub',$1,false)",[ids[0]]);
 await db.query(`select submit_catalog_report('uc','Ingeniería','Sintético','sintetico','MAT9999',$1,'h',null)`,[estructura]);
 assert.equal((await db.query('select carrera from catalog_reports where user_id=$1',[ids[0]])).rows[0].carrera,'ING-PC');
 await db.query(`select submit_catalog_report('uc','Ingeniería','Nuevo','nuevo','MAT9998',$1,'h',null)`,[estructura]);
 assert.equal((await db.query("select carrera from catalog_reports where ramo_sigla='MAT9998'")).rows[0].carrera,null);
 const payloads=[];
 const ctx={S:{},currentUser:{id:'sintetico'},TENANTS:Object.fromEntries(['uc','fen','uai','uandes','udd'].map(t=>[t,{name:'Nombre'}])),supabaseClient:{from:()=>({upsert:async p=>payloads.push(p)})}};
 vm.createContext(ctx);vm.runInContext(fs.readFileSync('src/app-session/perfil-y-legal.js','utf8'),ctx);
 for(const tenant of Object.keys(ctx.TENANTS)){ctx.S.tenant=tenant;await ctx.syncProfile();assert.equal(payloads.at(-1).universidad,tenant);}
 ctx.esCuentaProfesor=()=>true;await ctx.syncProfile();assert.equal(payloads.length,5);
 await db.close();console.log('PASS universidades: migración reaplicable, legado, null, consenso y cliente');
})().catch(e=>{console.error(e);process.exit(1)});
