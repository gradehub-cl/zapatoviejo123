// PostgreSQL real en memoria, sin datos ni servicios de producción.
const assert=require('node:assert/strict'),fs=require('node:fs'),{PGlite}=require('@electric-sql/pglite');
const read=f=>fs.readFileSync(__dirname+'/../'+f,'utf8'),db=new PGlite(),u=i=>`00000000-0000-0000-0000-${String(i).padStart(12,'0')}`;
const q=async(s,a=[])=>(await db.query(s,a)).rows;
const soy=async i=>{await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[i?u(i):'']);await db.exec('set role authenticated');};
const ramo=(i,sec=1)=>({id:'r'+i,nombre:'Ramo sintético',sigla:'TST100',seccion:sec,origen:{tenant:'uc',ramoKey:'TST100'},categorias:[]});
let periodo,anterior;
const calificar=(i,sec=1,etiquetas=['interesante'])=>q('select ramo_calificar($1,$2,$3,$4,$5,$6,$7)', ['r'+i,sec,periodo,i%4+1,i%5+1,i%2===0,etiquetas]);
const estado=async(i,sec=1,p=periodo)=>(await q('select ramo_calificacion_estado($1,$2,$3) as j',['r'+i,sec,p]))[0].j;
const resumen=async()=>(await q("select ramo_resumen_publico('uc','TST100') as j"))[0].j;
(async()=>{try{
 await db.exec(read('bin/supabase-stubs.sql'));
 await db.exec('create table public.user_ramos(user_id uuid primary key references auth.users(id) on delete cascade,data jsonb); alter default privileges in schema public grant execute on functions to anon,authenticated;');
 await db.exec(read('supabase/profesores.sql'));await db.exec(read('supabase/ramo_calificaciones.sql'));await db.exec(read('supabase/ramo_calificaciones.sql'));
 periodo=(await q('select profesor_periodo_actual() as p'))[0].p;anterior=periodo.endsWith('2')?periodo.slice(0,4)+'-1':String(Number(periodo.slice(0,4))-1)+'-2';
 for(const i of [...Array(12)].map((_,i)=>i+1).concat([20,21,22])){
  await db.query('insert into auth.users(id) values($1)',[u(i)]);
  await db.query('insert into user_ramos values($1,$2)',[u(i),JSON.stringify({tenant:'uc',tipoCuenta:i===20?'profesor':'estudiante',ramos:[ramo(i,i>=8&&i<=12?2:1)],historial:[]})]);
 }
 await soy(1);
 assert.equal((await estado(1)).mia,null);assert.equal((await estado(1)).puede_calificar,true);
 for(let i=1;i<=4;i++){await soy(i);await calificar(i);assert.deepEqual(await resumen(),{disponible:false},'bajo cinco no se expone siquiera n');}
 await soy(5);await calificar(5);let r=await resumen();assert.equal(r.disponible,true);assert.equal(r.total,5);assert.equal(r.carga.length,4);assert.equal(r.facilidad_distribucion.length,5);
 assert.equal(r.carga.reduce((n,x)=>n+x.n,0),5);assert.equal(r.recomiendan_de_10,4);assert.deepEqual(r.etiquetas,[{id:'interesante',n:5}]);
 await soy(1);await calificar(1,1,['interesante','interesante']);assert.equal((await resumen()).total,5);assert.deepEqual((await estado(1)).mia.etiquetas,['interesante']);
 assert.equal((await estado(1)).mia.carga,2);await assert.rejects(calificar(1,2),/no sincronizados/);
 await assert.rejects(calificar(1,1,['otro']),/etiquetas/);await assert.rejects(calificar(1,1,Array(4).fill('interesante')),/etiquetas/);
 await assert.rejects(q('select ramo_calificar($1,1,$2,0,3,true)', ['r1',periodo]),/no válidas/);
 await assert.rejects(q('select ramo_calificar($1,1,$2,1,6,true)', ['r1',periodo]),/no válidas/);
 await assert.rejects(q('select ramo_calificar($1,1,$2,1,3,null)', ['r1',periodo]),/no válidas/);
 await assert.rejects(q('select * from ramo_calificaciones'),/permission denied/);
 await assert.rejects(q('select ramo_calificacion_contexto($1,1,$2)',['r1',periodo]),/permission denied/);
 await soy(2);await assert.rejects(estado(1),/no sincronizados/,'nadie puede consultar la opinión de otra cuenta');
 await soy(20);await assert.rejects(calificar(20),/profesor no califica/);
 await db.exec('reset role');const convertido=(await q('select data from user_ramos where user_id=$1',[u(5)]))[0].data;
 await db.query('update user_ramos set data=$2 where user_id=$1',[u(5),{...convertido,tipoCuenta:'profesor'}]);await soy(1);assert.deepEqual(await resumen(),{disponible:false},'una cuenta convertida deja de aportar al piso');
 await db.exec('reset role');await db.query('update user_ramos set data=$2 where user_id=$1',[u(5),convertido]);
 await soy(null);await assert.rejects(resumen(),/sin sesión/);await assert.rejects(estado(1),/sin sesión/);await assert.rejects(calificar(1),/sin sesión/);
 await db.exec('reset role; set role anon');await assert.rejects(resumen(),/permission denied/);await assert.rejects(calificar(1),/permission denied/);
 await soy(1);await q('select ramo_calificacion_borrar($1,1,$2)',['r1',periodo]);assert.equal((await estado(1)).mia,null);assert.deepEqual(await resumen(),{disponible:false});await calificar(1);
 // Estrellas por docente con el mismo agregado y piso de tres de profesores.sql.
 for(let i=1;i<=5;i++){await soy(i);await q('select profesor_docente_informar($1,1,$2,$3)',['r'+i,periodo,'María Ejemplo']);if(i<=3)await q("select profesor_calificar($1,1,$2,$3,'{}')", ['r'+i,periodo,6-i]);}
 await soy(1);r=await resumen();let d=r.docentes.find(x=>x.nombre==='María Ejemplo');assert.equal(d.ramo.total,5);assert.equal(d.estrellas.promedio,4);assert.equal(d.estrellas.total,3);
 const prof=(await q('select * from profesor_calificacion_estado($1,1,$2)',['r1',periodo]))[0];assert.equal(d.estrellas.promedio,Number(prof.promedio));
 // Etiqueta con dos cuentas no aparece; con tres sí, y jamás texto libre.
 for(const i of [1,2]){await soy(i);await calificar(i,1,['interesante','mucha_lectura']);}assert(!(await resumen()).etiquetas.some(e=>e.id==='mucha_lectura'));
 await soy(3);await calificar(3,1,['mucha_lectura']);assert((await resumen()).etiquetas.some(e=>e.id==='mucha_lectura'&&e.n===3));
 // Historial ya sincronizado: el origen permite comprobar universidad, sección y período.
 await db.exec('reset role');const doc=(await q('select data from user_ramos where user_id=$1',[u(1)]))[0].data;
 doc.historial=[{id:'h',label:anterior,ramos:[ramo(101)]}];await db.query('update user_ramos set data=$2 where user_id=$1',[u(1),doc]);
 await soy(1);await q('select ramo_calificar($1,1,$2,1,5,true)', ['r101',anterior]);assert.equal((await estado(101,1,anterior)).mia.facilidad,5);assert.equal((await resumen()).total,5,'dos períodos de una cuenta no inflan personas');
 await assert.rejects(estado(1,1,anterior),/no sincronizados/);await assert.rejects(estado(1,1,'2099-2'),/período/);
 await db.exec('reset role');const antiguo={tenant:'uc',ramos:[],historial:[{id:'h',label:anterior,ramos:[{...ramo(21),origen:null}]}]};await db.query('update user_ramos set data=$2 where user_id=$1',[u(21),antiguo]);
 await soy(21);await assert.rejects(estado(21,1,anterior),/no sincronizados/);
 antiguo.historial[0].ramos[0].cierre={tenant:'uc'};await db.exec('reset role');await db.query('update user_ramos set data=$2 where user_id=$1',[u(21),antiguo]);await soy(21);await q('select ramo_calificar($1,1,$2,1,4,true)',['r21',anterior]);
 // Oculto: no nombre/desglose. Sus respuestas solo suman al ramo si el piso
 // de cinco se alcanza sin él; incluye autores sin aporte propio por consenso.
 for(let i=8;i<=12;i++){await soy(i);if(i<=10)await q('select profesor_docente_informar($1,2,$2,$3)',['r'+i,periodo,'Docente Oculto']);await calificar(i,2);}
 await db.exec('reset role');await db.query("insert into profesor_ocultos(tenant,nombre) values('uc','Docente Oculto')");
 // Quitamos la cuenta histórica adicional para que el grupo público quede en cinco.
 await soy(21);await q('select ramo_calificacion_borrar($1,1,$2)',['r21',anterior]);await soy(1);r=await resumen();assert.equal(r.total,10);assert(!JSON.stringify(r).includes('Oculto'));
 // Docente con menos de cinco opiniones: estrellas pueden existir, carga/facilidad no.
 await soy(5);await q('select ramo_calificacion_borrar($1,1,$2)',['r5',periodo]);assert.deepEqual(await resumen(),{disponible:false});await calificar(5);
 // Reaplicar no destruye opiniones ni revierte permisos.
 await db.exec('reset role');const cuentaAntes=(await q('select count(*)::int as n from ramo_calificaciones'))[0].n;await db.exec(read('supabase/ramo_calificaciones.sql'));assert.equal((await q('select count(*)::int as n from ramo_calificaciones'))[0].n,cuentaAntes);
 const rls=(await q("select relrowsecurity as r from pg_class where oid='public.ramo_calificaciones'::regclass"))[0].r;assert(rls);
 for(const nombre of ['ramo_piso_publicacion()','ramo_etiquetas_validas()','ramo_docente_interno(text,text,integer,text)'])assert.equal((await q('select has_function_privilege($1,$2,$3) as p',['authenticated','public.'+nombre,'EXECUTE']))[0].p,false);
 await db.query('delete from auth.users where id=$1',[u(2)]);assert.equal((await q('select count(*)::int as n from ramo_calificaciones where user_id=$1',[u(2)]))[0].n,0);
 await soy(1);assert.deepEqual(await resumen(),{disponible:false},'cascade vuelve a cerrar el piso si quedan cuatro no ocultos');
 // El ramo ya alcanza el piso, pero este docente solo tiene tres opiniones.
 for(const i of [6,7,22]){
  await db.exec('reset role');await db.query('update user_ramos set data=$2 where user_id=$1',[u(i),JSON.stringify({tenant:'uc',ramos:[ramo(i,3)]})]);
  await soy(i);await q('select profesor_docente_informar($1,3,$2,$3)',['r'+i,periodo,'Pedro Sintético']);await calificar(i,3);
  await q("select profesor_calificar($1,3,$2,4,'{}')",['r'+i,periodo]);
 }
 r=await resumen();d=r.docentes.find(x=>x.nombre==='Pedro Sintético');assert(d);assert.equal(d.ramo,null);assert.equal(d.estrellas.total,3);
 assert(!JSON.stringify(r).includes('user_id'));assert(!JSON.stringify(r).includes('seccion'));
 console.log('OK: ramo calificaciones, piso privado, etiquetas, contexto/historial, roles, docentes/estrellas, ocultos, reaplicación y cascade');
}finally{await db.close();}})().catch(e=>{console.error(e);process.exit(1)});
