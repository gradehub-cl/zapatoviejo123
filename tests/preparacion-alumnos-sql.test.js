const assert=require('node:assert/strict'),fs=require('node:fs'),{PGlite}=require('@electric-sql/pglite');
const db=new PGlite(),read=f=>fs.readFileSync(__dirname+'/../'+f,'utf8'),u=i=>'00000000-0000-0000-0000-'+String(i).padStart(12,'0');
const q=async(s,a=[])=>(await db.query(s,a)).rows,soy=async i=>{await db.exec('reset role');await q("select set_config('request.jwt.claim.sub',$1,false)",[u(i)]);await db.exec('set role authenticated')};
const ramo={id:'r1',nombre:'Ramo sintético',categorias:[{id:'c1',nombre:'Interrogaciones',slotLabel:'Interrogación',directNota:true,slots:3,notas:[{id:'n1',nombre:'I1',slot:0,valor:5}]}]};let conexion;
const guardar=async()=>{await db.exec('reset role');await q('update user_ramos set data=$1 where user_id=$2',[JSON.stringify({tenant:'uc',ramos:[ramo]}),u(2)]);await soy(1)};
const leer=async()=>(await q('select preparacion_alumno($1,$2) x',[conexion,'r1']))[0].x.ramos[0];
const marcar=async marcas=>(await q('select guardar_preparacion_alumno($1,$2,$3) x',[conexion,'r1',marcas===null?null:JSON.stringify(marcas)]))[0].x.ramos[0];
(async()=>{try{
 await db.exec(read('bin/supabase-stubs.sql'));await db.exec("create function auth.jwt() returns jsonb language sql as $$select '{}'::jsonb$$;create table user_ramos(user_id uuid primary key references auth.users(id) on delete cascade,data jsonb);");
 await db.exec(read('supabase/clases_particulares.sql'));await db.exec(read('supabase/curso_posicion.sql'));await db.exec(read('supabase/profesor_alumnos.sql'));
 for(let i=1;i<=4;i++)await q('insert into auth.users(id) values($1)',[u(i)]);
 for(const i of [1,3])await q("insert into tutor_perfiles(user_id,nombre_publico,presentacion,estado,revisado_at) values($1,'Profesor sintético','Presentación sintética del profesor','aprobado',now())",[u(i)]);
 await q('insert into user_ramos values($1,$2)',[u(2),JSON.stringify({tenant:'uc',ramos:[ramo]})]);
 conexion=(await q("insert into profesor_alumnos(tutor_id,alumno_id,nombre_visible,ramos) values($1,$2,'Alumno sintético',array['r1']) returning id",[u(1),u(2)]))[0].id;
 await soy(1);assert.equal((await leer()).manual,false);
 const original=(await q('select preparacion_alumno($1) x',[conexion]))[0].x;assert.equal(original.ramos[0].evaluaciones.length,3);
 let estado=await marcar([{cat_id:'c1',numero:2}]);assert.equal(estado.manual,true);assert.equal(estado.marcas[0].nota_id,null);
 // La nota aún no tiene valor: su id persistido basta para ligar la futura.
 ramo.categorias[0].notas.push({id:'n2',nombre:'I2 renombrada',slot:1,valor:null});await guardar();estado=await leer();assert.equal(estado.marcas[0].nota_id,'n2');assert.equal(estado.marcas[0].huerfana,false);
 ramo.categorias[0].notas[1].nombre='Otro nombre';await guardar();assert.equal((await leer()).marcas[0].nota_id,'n2');
 ramo.categorias[0].notas.splice(1);ramo.categorias[0].notas.push({id:'otra',slot:1,valor:6});await guardar();assert.equal((await leer()).marcas[0].huerfana,true,'borrar/recrear no transfiere un id ya ligado');
 estado=await marcar([{cat_id:'c1',numero:3}]);assert.equal(estado.marcas[0].huerfana,false);ramo.categorias[0].slots=2;await guardar();assert.equal((await leer()).marcas[0].huerfana,true);ramo.categorias[0].slots=3;await guardar();assert.equal((await leer()).marcas[0].huerfana,true,'recrear el número no revive una marca invalidada');
 // La futura conserva su etiqueta original al renombrar; al ligarse manda el id.
 await marcar([{cat_id:'c1',numero:3}]);ramo.categorias[0].nombre='Pruebas renombradas';await guardar();assert.equal((await leer()).marcas[0].huerfana,false);
 // Dos notas para el mismo slot nunca se eligen arbitrariamente.
 ramo.categorias[0].notas.push({id:'x3',slot:2,valor:5},{id:'y3',slot:2,valor:6});await guardar();assert.equal((await leer()).marcas[0].huerfana,true);ramo.categorias[0].notas.splice(-2);await guardar();
 await marcar(null);await marcar([{cat_id:'c1',numero:3}]);const categoria=ramo.categorias.pop();await guardar();assert.equal((await leer()).marcas[0].huerfana,true);ramo.categorias.push(categoria);await guardar();assert.equal((await leer()).marcas[0].huerfana,true);
 const documento=JSON.stringify({tenant:'uc',ramos:[ramo]});await leer();await marcar(null);await db.exec('reset role');assert.deepEqual((await q('select data from user_ramos where user_id=$1',[u(2)]))[0].data,JSON.parse(documento),'leer/guardar nunca crea notas del alumno');await soy(1);
 await marcar([]);assert.equal((await leer()).manual,true);await marcar(null);assert.equal((await leer()).manual,false);
 await assert.rejects(marcar([{nota_id:'inventada'}]),/evaluación/);await assert.rejects(marcar([{nota_id:'n1'},{nota_id:'n1'}]),/duplicada/);
 await marcar([{nota_id:'n1'}]);await soy(2);assert.equal((await leer()).marcas[0].nota_id,'n1');await assert.rejects(marcar([]),/conexión/);
 await soy(3);await assert.rejects(leer(),/conexión/);await assert.rejects(marcar([]),/conexión/);
 await db.exec('reset role;set role anon');await assert.rejects(leer(),/permission denied/);
 await soy(1);await assert.rejects(q('select * from profesor_alumnos_preparacion'),/permission denied/);
 await db.exec('reset role');await db.exec(read('supabase/profesor_alumnos.sql'));await soy(1);assert.equal((await leer()).marcas[0].nota_id,'n1','reaplicar conserva marcas');
 await db.exec('reset role');await q("update profesor_alumnos set ramos=array['otro'] where id=$1",[conexion]);assert.equal((await q('select count(*)::int n from profesor_alumnos_preparacion'))[0].n,0);
 await q("update profesor_alumnos set ramos=array['r1'] where id=$1",[conexion]);await soy(1);await marcar([{nota_id:'n1'}]);await soy(2);await q('select dejar_de_compartir($1)',[conexion]);await soy(1);await assert.rejects(leer(),/conexión/);await db.exec('reset role');assert.equal((await q('select count(*)::int n from profesor_alumnos_preparacion'))[0].n,0);
 conexion=(await q("insert into profesor_alumnos(tutor_id,alumno_id,nombre_visible,ramos) values($1,$2,'Alumno sintético',array['r1']) returning id",[u(1),u(2)]))[0].id;await soy(1);await marcar([{nota_id:'n1'}]);await db.exec('reset role');await q('delete from auth.users where id=$1',[u(2)]);assert.equal((await q('select count(*)::int n from profesor_alumnos_preparacion'))[0].n,0);
 console.log('OK: futuras ligadas una vez, renombre/borrado/forma/ambigüedad, manual vacío, permisos, revocación, retirada, reaplicación y cascada');
}finally{await db.close()}})().catch(e=>{console.error(e);process.exitCode=1});
