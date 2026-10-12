// Una visita por cuenta y por día (#666). PostgreSQL real en memoria con cuentas
// sintéticas: que se guarde una sola vez por día, que nadie la lea ni la
// escriba desde la app, que se borre con la cuenta y a los 13 meses, y que la
// vista semanal cuente bien. Al final, que la app la mande una vez por día.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {PGlite}=require('@electric-sql/pglite');
const raiz=path.join(__dirname,'..'),leer=f=>fs.readFileSync(path.join(raiz,f),'utf8');
const db=new PGlite();
const u=i=>`00000000-0000-0000-0000-0000000000${String(i).padStart(2,'0')}`;
const ANA=u(1),BETO=u(2),CARO=u(3),DANI=u(4);
let pruebas=0;
const check=(nombre,cond)=>{assert.ok(cond,nombre);pruebas++;console.log('  OK   '+nombre);};
const q=async(text,params=[])=>(await db.query(text,params)).rows;
const soy=id=>db.query("select set_config('request.jwt.claim.sub',$1,false)",[id||'']);
const falla=async(text,params=[])=>{try{await db.query(text,params);return null;}catch(e){return e.message;}};
const visitas=async id=>(await q('select dia::text from public.visitas_diarias where user_id=$1 order by dia',[id])).map(r=>r.dia);
(async()=>{
try{
  await db.exec(leer('bin/supabase-stubs.sql'));
  await db.exec('create table public.user_ramos(user_id uuid primary key references auth.users(id) on delete cascade, data jsonb not null);');
  const sql=leer('supabase/visitas_diarias.sql');
  await db.exec(sql);
  await db.exec(sql);
  check('se puede aplicar dos veces',true);
  for(const id of [ANA,BETO,CARO,DANI])await db.query('insert into auth.users(id) values($1)',[id]);

  console.log('=== Una por cuenta y por día ===');
  await soy(ANA);
  await db.query('select public.registrar_visita()');
  await db.query('select public.registrar_visita()');
  const hoy=(await q("select (now() at time zone 'America/Santiago')::date::text as d"))[0].d;
  check('abrir dos veces el mismo día deja una sola fila, con la fecha de Chile',JSON.stringify(await visitas(ANA))===JSON.stringify([hoy]));
  await soy(null);
  await db.query('select public.registrar_visita()');
  check('sin sesión no anota nada',(await q('select count(*)::int n from public.visitas_diarias'))[0].n===1);

  console.log('\n=== Nadie la lee ni la escribe desde la app ===');
  await db.exec('set role authenticated');await soy(ANA);
  check('no se puede leer, ni la propia',/permission denied/.test(await falla('select * from public.visitas_diarias')));
  check('no se puede insertar a mano',/permission denied/.test(await falla('insert into public.visitas_diarias values($1,current_date)',[BETO])));
  check('ni borrar',/permission denied/.test(await falla('delete from public.visitas_diarias')));
  check('ni ver la vista del equipo',/permission denied/.test(await falla('select * from admin.crecimiento_semanal')));
  check('sí registrar la propia visita',(await falla('select public.registrar_visita()'))===null);
  await db.exec('reset role');
  await db.exec('set role anon');
  check('anon no puede registrar visitas',/permission denied/.test(await falla('select public.registrar_visita()')));
  await db.exec('reset role');
  check('RLS activo',(await q("select relrowsecurity r from pg_class where oid='public.visitas_diarias'::regclass"))[0].r===true);

  console.log('\n=== Se borra a los 13 meses y con la cuenta ===');
  await db.query(`insert into public.visitas_diarias values
    ($1,(current_date-interval '14 months')::date),($1,(current_date-interval '12 months')::date)`,[BETO]);
  await soy(CARO);await db.query('select public.registrar_visita()');
  const beto=await visitas(BETO);
  check('una visita de hace 14 meses se borra; la de hace 12 se queda',beto.length===1);
  await db.query('delete from auth.users where id=$1',[CARO]);
  check('borrar la cuenta borra sus visitas',(await visitas(CARO)).length===0);

  console.log('\n=== La vista semanal ===');
  await db.exec('truncate public.visitas_diarias');
  await db.query("update auth.users set created_at='2026-09-01 12:00-03' where id in ($1,$2)",[ANA,BETO]);
  await db.query("update auth.users set created_at='2026-09-09 12:00-03' where id=$1",[DANI]);
  await db.query(`insert into public.user_ramos values ($1,'{"tenant":"uc"}'),($2,'{"tenant":"fen"}'),($3,'{"tenant":"uc"}')`,[ANA,BETO,DANI]);
  // Semana del 7 de septiembre: Ana (dos días) y Beto. Semana del 14: Ana y Dani.
  await db.query(`insert into public.visitas_diarias values ($1,'2026-09-08'),($1,'2026-09-10'),($2,'2026-09-09'),($1,'2026-09-15'),($3,'2026-09-16')`,[ANA,BETO,DANI]);
  const fila=async(semana,univ)=>(await q('select nuevas::int,activas::int,vuelven::int,pct_vuelven::float pct from admin.crecimiento_semanal where semana=$1 and universidad=$2',[semana,univ]))[0];
  const s7=await fila('2026-09-07','todas'),s14=await fila('2026-09-14','todas');
  check('dos días en la misma semana son una cuenta activa',s7.activas===2);
  check('la semana siguiente: 2 activas, 1 vuelve (Ana) de 2 → 50%',s14.activas===2&&s14.vuelven===1&&s14.pct===50);
  check('nuevas cuenta las cuentas creadas esa semana',s7.nuevas===1&&s14.nuevas===0);
  const uc14=await fila('2026-09-14','uc'),fen14=await fila('2026-09-14','fen');
  check('por universidad: UC 2 activas y 1 vuelve; FEN 0 activas, nadie vuelve',uc14.activas===2&&uc14.vuelven===1&&fen14.activas===0&&fen14.pct===0);
  check('sin semana anterior, el porcentaje queda vacío',(await fila('2026-09-07','todas')).pct===null);

  console.log('\n=== La app la manda una vez por día ===');
  const llamadas=[];let falla_rpc=false;const guardado={};
  const ctx={window:{addEventListener(){}},document:{addEventListener(){},visibilityState:'visible'},console,
    localStorage:{getItem:k=>k in guardado?guardado[k]:null,setItem:(k,v)=>{guardado[k]=String(v);},removeItem:k=>{delete guardado[k];}},
    Intl,setTimeout,clearTimeout};
  vm.createContext(ctx);
  // Solo el bloque de la visita, con lo mínimo que necesita alrededor.
  const src=leer('app-session.js');
  const bloque=src.slice(src.indexOf("const VISITA_DIA_KEY"),src.indexOf('async function loadFromCloud'));
  vm.runInContext('var currentUser={id:"u1"},supabaseClient={rpc:async n=>{__llamadas.push(n);return {error:__falla()?{message:"x"}:null};}};'+bloque,
    Object.assign(ctx,{__llamadas:llamadas,__falla:()=>falla_rpc}));
  const dia=(d,h=12)=>new Date(Date.UTC(2026,9,d,h));
  await vm.runInContext('registrarVisitaDiaria',ctx)(dia(12));
  await vm.runInContext('registrarVisitaDiaria',ctx)(dia(12,20));
  check('dos aperturas el mismo día, una sola llamada',llamadas.length===1&&llamadas[0]==='registrar_visita');
  // 02:00 UTC del 13 son las 23:00 del 12 en Chile: sigue siendo el mismo día.
  await vm.runInContext('registrarVisitaDiaria',ctx)(dia(13,2));
  check('el día es el de Chile, no el de Londres',llamadas.length===1);
  await vm.runInContext('registrarVisitaDiaria',ctx)(dia(13));
  check('al día siguiente, otra',llamadas.length===2);
  falla_rpc=true;
  await vm.runInContext('registrarVisitaDiaria',ctx)(dia(14));
  falla_rpc=false;
  await vm.runInContext('registrarVisitaDiaria',ctx)(dia(14,15));
  check('si falla, se reintenta en la próxima apertura',llamadas.length===4);
  vm.runInContext('currentUser={id:"u2"}',ctx);
  await vm.runInContext('registrarVisitaDiaria',ctx)(dia(14,16));
  check('otra cuenta en el mismo dispositivo cuenta aparte',llamadas.length===5);
  check('lo anotado no entra a gradehub_v1',!('gradehub_v1' in guardado)&&guardado.gradehub_visita_dia==='u2|2026-10-14');
  vm.runInContext('currentUser=null',ctx);
  check('sin sesión no llama',(await vm.runInContext('registrarVisitaDiaria',ctx)(dia(15)))===false&&llamadas.length===5);

  console.log(`\n${pruebas} pruebas OK`);
}catch(e){console.error(e);process.exit(1);}
})();
