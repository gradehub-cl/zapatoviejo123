// Solo cuentas y pautas sintéticas sobre PostgreSQL en memoria; nunca red.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {PGlite}=require('@electric-sql/pglite');
const read=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8'),db=new PGlite();
const uid=i=>`00000000-0000-0000-0000-${String(i).padStart(12,'0')}`;
const ramo=(sigla='TST100')=>({id:'r-'+sigla,sigla,nombre:'Pauta propia sintética',origen:{tenant:'uc'},categorias:[
 {id:'l',nombre:'Laboratorios',peso:50,slots:2,notas:[{id:'n1',nombre:'Lab 1',valor:6.5},{id:'n2',nombre:'Lab 2',valor:null}]},
 {id:'e',nombre:'Examen',peso:50,notas:[{id:'n3',nombre:'',valor:4}]}]});
const documento=()=>({tenant:'uc',tipoCuenta:'estudiante',ramos:[ramo()],historial:[{label:'2026-2',ramos:[{...ramo('TST900'),cierre:{tenant:'uc'}}]}]});
const q=async(s,a=[])=>(await db.query(s,a)).rows;
const soy=async i=>{await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[i?uid(i):'']);if(i)await db.exec('set role authenticated');};
const guardar=async(i,d)=>q('update user_ramos set data=$2 where user_id=$1',[uid(i),JSON.stringify(d)]);
const propias=async(i,clave,p)=>{await db.exec('reset role');return q('select evaluacion_clave,nota,periodo from evaluacion_notas where user_id=$1 and ramo_clave=$2 and periodo=$3 order by evaluacion_clave',[uid(i),clave,p]);};
const referencia=async(clave,p='2027-1')=>{await db.exec('reset role');return q('select * from notas_tipicas_ramo_interno($1,$2,$3)',['uc',clave,p]);};
(async()=>{try{
 await db.exec(read('bin/supabase-stubs.sql'));
 await db.exec("alter table auth.users add column raw_app_meta_data jsonb default '{}',add column raw_user_meta_data jsonb default '{}',add column is_anonymous boolean default false;create table user_ramos(user_id uuid primary key references auth.users(id) on delete cascade,data jsonb not null);alter table user_ramos enable row level security;grant select,insert,update,delete on user_ramos to authenticated;create policy propias on user_ramos for all to authenticated using(auth.uid()=user_id) with check(auth.uid()=user_id);");
 // Definiciones reales, sin otra normalización ni dependencias ajenas del panel.
 const panel=read('supabase/profesor_alumnos.sql');for(const nombre of ['clave_evaluacion','clave_curso_comparacion']){const f=panel.match(new RegExp('create or replace function public\\.'+nombre+'\\([^]*?\\$\\$;'));assert(f,nombre);await db.exec(f[0]);}
 for(let i=1;i<=8;i++){await q('insert into auth.users(id) values($1)',[uid(i)]);const d=documento();if(i===6)d.tipoCuenta='profesor';if(i===7)d.tipoCuenta='demo';await q('insert into user_ramos values($1,$2)',[uid(i),JSON.stringify(d)]);}
 await q("update auth.users set raw_app_meta_data='{"+'"gradehub_datos_sinteticos":true'+"}' where id=$1",[uid(8)]);
 const estadoAntes=await q('select * from user_ramos order by user_id'),sql=read('supabase/notas_tipicas.sql');await db.exec(sql);
 const periodo=(await q('select notas_tipicas_periodo_actual() as p'))[0].p;
 assert.equal((await q("select count(*)::int as n from evaluacion_notas where ramo_clave='TST900'"))[0].n,10,'carga inicial 2026-2 de cinco alumnos, sin profesor/demo/sintético');
 const inicial=await q('select * from evaluacion_notas order by user_id,tenant,periodo,ramo_clave,evaluacion_clave');await db.exec(sql);assert.deepEqual(await q('select * from evaluacion_notas order by user_id,tenant,periodo,ramo_clave,evaluacion_clave'),inicial,'reaplicar no duplica ni reescribe fechas');assert.deepEqual(await q('select * from user_ramos order by user_id'),estadoAntes);
 assert.deepEqual((await referencia('TST900')).map(r=>[r.evaluacion_clave,Number(r.promedio),r.personas,r.periodos]),[['examen',4,5,['2026-2']],['lab 1',6.5,5,['2026-2']]]);
 await q("delete from evaluacion_notas where user_id=$1 and ramo_clave='TST900'",[uid(5)]);assert.deepEqual(await referencia('TST900'),[],'cuatro no publican');await q('select notas_tipicas_capturar($1,$2,null,$3,true)',[uid(5),JSON.stringify(documento()),'2026-2']);
 for(let i=1;i<=5;i++){await soy(i);await guardar(i,documento());}
 await soy(1);assert.deepEqual(await q("select * from notas_tipicas_ramo('uc','TST100')"),[],'período en curso no es referencia');
 await assert.rejects(q("select * from notas_tipicas_ramo_interno('uc','TST100','2099-1')"),/permission denied/);await assert.rejects(q('select * from evaluacion_notas'),/permission denied/);await assert.rejects(q('select notas_tipicas_capturar($1,$2,null,$3)',[uid(2),JSON.stringify(documento()),periodo]),/permission denied/);
 await soy(null);await assert.rejects(q("select * from notas_tipicas_ramo('uc','TST100')"),/iniciado sesión/);await db.exec('set role anon');await assert.rejects(q("select * from notas_tipicas_ramo('uc','TST100')"),/permission denied/);await db.exec('reset role');
 // Repetir la misma persona varios semestres no aumenta el piso ni su peso.
 for(let i=1;i<=4;i++)for(const p of ['2024-1','2024-2','2025-1']){const r=ramo('TST200');r.categorias=[{nombre:'Prueba',notas:[{nombre:'Prueba',valor:4}]}];await q('select notas_tipicas_capturar($1,$2,null,$3,true)',[uid(i),JSON.stringify({tenant:'uc',ramos:[r]}),p]);}
 assert.deepEqual(await referencia('TST200'),[]);const quinta=ramo('TST200');quinta.categorias=[{nombre:'Prueba',notas:[{valor:7}]}];await q('select notas_tipicas_capturar($1,$2,null,$3,true)',[uid(5),JSON.stringify({tenant:'uc',ramos:[quinta]}),'2025-1']);
 const cinco=(await referencia('TST200'))[0];assert.equal(cinco.personas,5);assert.equal(Number(cinco.promedio),4.6);assert.deepEqual(cinco.periodos,['2024-1','2024-2','2025-1']);assert.deepEqual(Object.keys(cinco),['evaluacion_clave','promedio','personas','periodos']);
 const pasado=await q("select * from evaluacion_notas where user_id=$1 and periodo='2026-2' order by ramo_clave,evaluacion_clave",[uid(4)]);await q("select notas_tipicas_capturar($1,$2,null,'2027-1')",[uid(4),JSON.stringify({tenant:'uc',ramos:[]})]);await q("select notas_tipicas_capturar($1,null,null,'2026-2',true)",[uid(4)]);assert.deepEqual(await q("select * from evaluacion_notas where user_id=$1 and periodo='2026-2' order by ramo_clave,evaluacion_clave",[uid(4)]),pasado,'nuevo semestre o backfill sin documento no borra el anterior');
 // Casillas reales, sin sombras, propuestas, simulación ni promedio de categoría.
 let d=documento();d.ramos[0].avgOverride=6.9;d.ramos[0].notaOficial=6.9;d.ramos[0].categorias[0].valor=6.9;d.ramos[0].categorias[0].notas.push({id:'sombra:1',nombre:'Lab 2',valor:7},{id:'sim',nombre:'Simulada',valor:7,simulada:true},{id:'p',nombre:'Propuesta',valor:7,propuesta:true},{id:'texto',nombre:'No numérica',valor:'6.8'},{id:'fuera',nombre:'Fuera de escala',valor:9});
 await soy(1);await guardar(1,d);const reales=await propias(1,'TST100',periodo);assert.deepEqual(reales.map(r=>[r.evaluacion_clave,Number(r.nota)]),[['examen',4],['lab 1',6.5]]);assert.deepEqual((await q('select data from user_ramos where user_id=$1',[uid(1)]))[0].data,d,'el trigger no toca datos sincronizados');
 d=documento();d.ramos[0].categorias[0].notas=[];await soy(1);await guardar(1,d);assert.deepEqual((await propias(1,'TST100',periodo)).map(r=>r.evaluacion_clave),['examen'],'borrar casilla borra su fila');
 d.ramos=[];await soy(1);await guardar(1,d);assert.equal((await propias(1,'TST100',periodo)).length,0,'borrar ramo borra filas actuales');
 // Cerrar preserva la captura incluso si un cliente manda categorías vacías.
 d={tenant:'uc',tipoCuenta:'estudiante',ramos:[ramo('TST300')],historial:[]};await soy(1);await guardar(1,d);const antesCerrar=await propias(1,'TST300',periodo);const cerrado={...d.ramos[0],categorias:[],cierre:{tenant:'uc'}};await soy(1);await guardar(1,{...d,ramos:[],historial:[{label:periodo,ramos:[cerrado]}]});assert.deepEqual(await propias(1,'TST300',periodo),antesCerrar);
 // La copia completa nueva del historial manda sobre una copia OLD más vieja.
 d={tenant:'uc',ramos:[ramo('TST400')],historial:[]};await soy(1);await guardar(1,d);const reciente=JSON.parse(JSON.stringify(d.ramos[0]));reciente.cierre={tenant:'uc'};reciente.categorias[0].notas[0].valor=6.8;await guardar(1,{...d,ramos:[],historial:[{label:periodo,ramos:[reciente]}]});assert.equal(Number((await propias(1,'TST400',periodo)).find(r=>r.evaluacion_clave==='lab 1').nota),6.8);
 await assert.rejects(q('insert into evaluacion_notas values($1,$2,$3,$4,$5,$6,now())',[uid(1),'uc','2025-2','TST999','examen',8]),/check constraint/);
 // Todas las escalas del servidor coinciden con el motor, sin presetRamo().
 const ctx=vm.createContext({});vm.runInContext(read('engine.js'),ctx);for(const tenant of ['uc','fen','uai','uandes','udd']){const escala=vm.runInContext(`gh_reglasNota('${tenant}').grade_scale`,ctx);for(const [nota,esperado] of [[escala.min,true],[escala.max,true],[escala.min-.01,false],[escala.max+.01,false]])assert.equal((await q('select notas_tipicas_en_escala($1,$2) as v',[tenant,nota]))[0].v,esperado);}
 // Una marca administrativa excluye también datos ya capturados al consultar.
 await q("update auth.users set raw_app_meta_data='{"+'"gradehub_datos_sinteticos":true'+"}' where id=$1",[uid(2)]);assert.deepEqual(await referencia('TST200'),[]);await soy(2);await guardar(2,documento());await db.exec('reset role');assert.equal((await q('select count(*)::int as n from evaluacion_notas where user_id=$1',[uid(2)]))[0].n,0);
 await soy(3);await guardar(3,{...documento(),tipoCuenta:'profesor'});await db.exec('reset role');assert.equal((await q('select count(*)::int as n from evaluacion_notas where user_id=$1',[uid(3)]))[0].n,0);
 await q('delete from auth.users where id=$1',[uid(1)]);assert.equal((await q('select count(*)::int as n from evaluacion_notas where user_id=$1',[uid(1)]))[0].n,0,'borrar cuenta elimina actuales y pasadas');
 console.log('OK: captura real por trigger, carga inicial idempotente, piso cinco, pasado, casillas, borrado, archivo, cascada, escala, cuentas excluidas y permisos');
}finally{await db.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
