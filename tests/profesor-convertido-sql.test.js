// Cuentas y notas exclusivamente sintéticas. #811, sin borrar consentimientos.
const assert=require('node:assert/strict'),fs=require('fs'),{PGlite}=require('@electric-sql/pglite');
const db=new PGlite(),leer=f=>fs.readFileSync(require('path').join(__dirname,'..',f),'utf8');
const id=n=>'00000000-0000-0000-0000-'+String(n).padStart(12,'0');
const q=async(s,p=[])=>(await db.query(s,p)).rows;
const soy=n=>q("select set_config('request.jwt.claim.sub',$1,false)",[id(n)]);
(async()=>{try{
await db.exec(leer('bin/supabase-stubs.sql'));
await db.exec(`create function auth.jwt() returns jsonb language sql stable as $$ select '{}'::jsonb $$;
create table user_ramos(user_id uuid primary key references auth.users(id),data jsonb not null);`);
for(const f of ['clases_particulares','curso_posicion','profesor_alumnos'])await db.exec(leer('supabase/'+f+'.sql'));
for(let i=1;i<=7;i++)await q('insert into auth.users(id) values($1)',[id(i)]);
await q("insert into tutor_perfiles(user_id,nombre_publico,presentacion,estado,revisado_at) values($1,'Profesor sintético','Presentación de prueba suficiente','aprobado',now())",[id(1)]);
await soy(1);const codigo=(await q('select codigo_alumnos_profesor() c'))[0].c;
for(let i=2;i<=7;i++){
const r={id:'r'+i,nombre:'Ramo sintético',sigla:'SYN100',categorias:[{nombre:'Pruebas',peso:100,notas:[{nombre:'Prueba 1',valor:5,peso:1}]}]};
await q('insert into user_ramos values($1,$2)',[id(i),JSON.stringify({tenant:'udd',ramos:[r]})]);
await q("insert into curso_notas(user_id,tenant,ramo_sigla,promedio) values($1,'udd','SYN100',5)",[id(i)]);
}
await soy(2);await q('select compartir_con_profesor($1,$2,$3)',[codigo,'Alumno sintético',['r2']]);
await soy(1);assert.equal((await q('select * from mis_alumnos()')).length,1);
assert((await q("select comparacion_ramo_profesor('udd','SYN100') c"))[0].c,'con alumno válido autoriza comparar');
await q(`update user_ramos set data=jsonb_set(data,'{tipoCuenta}','"profesor"') where user_id=$1`,[id(2)]);
assert.equal((await q('select * from mis_alumnos()')).length,0,'no entrega el consentimiento previo de una cuenta convertida');
assert.equal((await q("select comparacion_ramo_profesor('udd','SYN100') c"))[0].c,null,'su consentimiento viejo no autoriza comparar');
await soy(2);await assert.rejects(q('select compartir_con_profesor($1,$2,$3)',[codigo,'Profesor convertido',['r2']]),/cuenta de profesor/);
assert.equal(Number((await q('select count(*) n from profesor_alumnos'))[0].n),1,'no borra el consentimiento guardado');
await q(`update user_ramos set data=jsonb_set(data,'{ramos}','[]') where user_id=$1`,[id(2)]);
await assert.rejects(q('select compartir_con_profesor($1,$2,$3)',[codigo,'Profesor sin ramos',[]]),/cuenta de profesor/);
await soy(3);await q('select compartir_con_profesor($1,$2,$3)',[codigo,'Estudiante vigente',['r3']]);
await soy(1);assert.equal((await q('select * from mis_alumnos()')).length,1,'ser tutor aprobado no convierte una cuenta estudiante en solo profesor');
assert.equal((await q("select comparacion_ramo_profesor('udd','SYN100') c"))[0].c.ramo.personas,5,'la cuenta convertida no participa del grupo');
await db.exec(leer('supabase/profesor_alumnos.sql'));
assert.equal((await q('select * from mis_alumnos()')).length,1,'SQL reaplicable, mantiene el filtro');
console.log('PASS #811: comparte solo estudiante, oculta vínculos viejos sin borrarlos, UDD y reaplicación');
}finally{await db.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
