// calificaciones_etiquetas.sql en PostgreSQL real en memoria, con cuentas
// sintéticas. Se aplica sobre profesores.sql + ramo_calificaciones.sql, como en
// producción, y se reaplica.
const assert=require('node:assert/strict'),fs=require('node:fs'),{PGlite}=require('@electric-sql/pglite');
const read=f=>fs.readFileSync(__dirname+'/../'+f,'utf8'),db=new PGlite(),u=i=>`00000000-0000-0000-0000-${String(i).padStart(12,'0')}`;
const q=async(s,a=[])=>(await db.query(s,a)).rows;
const soy=async i=>{await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[i?u(i):'']);await db.exec('set role authenticated');};
const ramo=(i,sec=1)=>({id:'r'+i,nombre:'Ramo sintético',sigla:'TST100',seccion:sec,origen:{tenant:'uc',ramoKey:'TST100'},categorias:[]});
let periodo;
const opinar=(i,{etiquetas=[],otros=[],sec=1,nivel=3}={})=>q('select ramo_opinar($1,$2,$3,$4,$5,$6,$7,$8)',['r'+i,sec,periodo,3,true,nivel,etiquetas,otros]);
const antigua=(i,etiquetas=['interesante'])=>q('select ramo_calificar($1,1,$2,$3,4,null,true,$4)',['r'+i,periodo,(i%4)+1,etiquetas]);
const estado=async i=>(await q('select ramo_calificacion_estado($1,1,$2) as j',['r'+i,periodo]))[0].j;
const sugeridas=async i=>(await q('select ramo_etiquetas_sugeridas($1,1,$2) as j',['r'+i,periodo]))[0].j;
const resumen=async()=>(await q("select ramo_resumen_publico('uc','TST100') as j"))[0].j;
(async()=>{try{
 await db.exec(read('bin/supabase-stubs.sql'));
 await db.exec('create table public.user_ramos(user_id uuid primary key references auth.users(id) on delete cascade,data jsonb); alter default privileges in schema public grant execute on functions to anon,authenticated;');
 await db.exec(read('supabase/profesores.sql'));await db.exec(read('supabase/ramo_calificaciones.sql'));
 periodo=(await q('select profesor_periodo_actual() as p'))[0].p;
 for(let i=1;i<=14;i++){
  await db.query('insert into auth.users(id) values($1)',[u(i)]);
  await db.query('insert into user_ramos values($1,$2)',[u(i),JSON.stringify({tenant:'uc',tipoCuenta:'estudiante',ramos:[ramo(i)],historial:[]})]);
 }
 // Opiniones guardadas con el formulario anterior, antes de esta migración.
 for(const i of [1,2])await soy(i),await antigua(i);
 await db.exec('reset role');await db.exec(read('supabase/calificaciones_etiquetas.sql'));await db.exec(read('supabase/calificaciones_etiquetas.sql'));
 assert.equal((await q('select count(*)::int as n from ramo_calificaciones where carga is not null'))[0].n,2,'reaplicar conserva las horas guardadas');

 // Estado anuncia el formulario nuevo; una opinión antigua conserva sus horas.
 await soy(1);let e=await estado(1);assert.equal(e.version,2);assert.equal(e.mia.carga,2);assert.equal('estudio' in e.mia,false,'sin estudio');assert.deepEqual(e.mia.otros,[]);
 // Editar con el formulario nuevo conserva la carga antigua.
 await opinar(1,{etiquetas:['mucha_lectura'],otros:['Mucha  matemática']});
 e=await estado(1);assert.equal(e.mia.carga,2,'quien edita una opinión antigua mantiene su carga');
 // Recomendar en tres: el booleano se sigue escribiendo y no se reinterpreta.
 await soy(2);e=await estado(2);assert.equal(e.mia.recomienda_nivel,3,'una antigua «sí» se lee como Sí');assert.equal(e.mia.recomienda,true);
 await soy(1);await opinar(1,{etiquetas:['mucha_lectura'],otros:['Mucha  matemática'],nivel:2});e=await estado(1);assert.equal(e.mia.recomienda_nivel,2);assert.equal(e.mia.recomienda,null,'Más o menos guarda el booleano vacío');
 await opinar(1,{etiquetas:['mucha_lectura'],otros:['Mucha  matemática'],nivel:1});e=await estado(1);assert.equal(e.mia.recomienda,false,'No = false');
 await db.exec('reset role');await assert.rejects(q("update ramo_calificaciones set recomienda=true where recomienda_nivel=1"),/recomienda_nivel_check/);
 await db.query("update ramo_calificaciones set recomienda_nivel=null,recomienda=false where user_id=$1",[u(1)]);await soy(1);
 assert.equal((await estado(1)).mia.recomienda_nivel,1,'una antigua «no» se lee como No');assert.deepEqual(e.mia.otros,['Mucha matemática'],'espacios normalizados');
 await soy(3);await opinar(3);e=await estado(3);assert.equal(e.mia.carga,null,'una opinión nueva no inventa horas');
 // Validación: facilidad y recomendar obligatorias, tres etiquetas en total, filtro de texto.
 await assert.rejects(q('select ramo_opinar($1,1,$2,6,true,3)',['r3',periodo]),/no válidas/);
 await assert.rejects(q('select ramo_opinar($1,1,$2,3,true,null)',['r3',periodo]),/no válidas/);
 await assert.rejects(opinar(3,{nivel:0}),/no válidas/);await assert.rejects(opinar(3,{nivel:4}),/no válidas/);
 assert.equal((await q("select count(*)::int as n from information_schema.columns where table_name='ramo_calificaciones' and column_name='estudio'"))[0].n,0,'sin columna estudio');
 await assert.rejects(opinar(3,{etiquetas:['mucha_lectura','interesante'],otros:['Muy practico','Mucha tarea']}),/etiquetas/);
 await assert.rejects(opinar(3,{otros:['Profe idiota']}),/texto no permitido/);
 await assert.rejects(opinar(3,{otros:['ab']}),/texto no permitido/,'muy corta');
 await assert.rejects(opinar(3,{otros:['<b>hola</b>']}),/texto no permitido/,'solo letras');
 await assert.rejects(opinar(3,{etiquetas:['inventada']}),/etiquetas/);
 await opinar(3,{otros:['Muy practico','muy  PRÁCTICO']});assert.deepEqual((await estado(3)).mia.otros,['Muy practico'],'la misma escrita dos veces cuenta una');
 // La app anterior sigue guardando; si se pasaría de tres, se quitan las escritas.
 await soy(1);await antigua(1,['interesante','buen_material','trabajo_grupo']);e=await estado(1);assert.deepEqual(e.mia.otros,[]);assert.equal(e.mia.recomienda_nivel,3,'la app anterior deja el nivel en Sí o No');
 await assert.rejects(q('select * from ramo_calificaciones'),/permission denied/);

 // Sugeridas: con menos de cinco cuentas no hay; el cliente usa la lista fija.
 assert.deepEqual(await sugeridas(1),{disponible:false});
 for(const i of [2,4,5]){await soy(i);await opinar(i,{etiquetas:['mucha_lectura'],otros:['Muy practico']});}
 let s=await sugeridas(5);assert.equal(s.disponible,true);
 assert.equal(s.orden[0],'mucha_lectura','la más elegida va primero');assert(!s.orden.includes('interesante'),'elegida por una sola cuenta no se ordena');
 assert.deepEqual(s.propias,['Muy practico'],'una escrita aparece con tres cuentas');
 assert.deepEqual(s.sin_uso,[],'bajo diez cuentas no se oculta ninguna');
 assert(!JSON.stringify(s).match(/[0-9a-f]{8}-/),'sin ids de cuentas');assert(!('n' in s),'sin conteos');
 for(let i=6;i<=10;i++){await soy(i);await opinar(i,{etiquetas:['mucha_lectura','buen_material']});}
 s=await sugeridas(10);assert(s.sin_uso.includes('interesante')===false,'interesante tiene una cuenta: no está sin uso');
 assert(s.sin_uso.includes('proyectos_presentaciones'),'con diez cuentas, la que nadie eligió queda sin uso');assert(!s.sin_uso.includes('mucha_lectura'));
 // Resumen: escritas, sin quitar carga.
 await soy(6);await opinar(6,{etiquetas:['mucha_lectura','buen_material'],nivel:2});await soy(7);await opinar(7,{etiquetas:['mucha_lectura','buen_material'],nivel:1});
 let r=await resumen();assert.equal(r.disponible,true);
 assert.equal(r.recomiendan_de_10,8,'solo los Sí, sobre todos los que respondieron (8 de 10)');assert.equal(r.mas_o_menos_de_10,1,'más o menos aparte (1 de 10)');assert.equal(r.estudio,undefined,'sin estudio en el resumen');
 assert.equal(r.carga.reduce((n,x)=>n+x.n,0),2,'las dos cargas antiguas siguen en el resumen');assert.deepEqual(r.escritas.map(x=>x.texto),['Muy practico']);

 // Profesor: piso de tres con el mismo docente; escritas con tres cuentas.
 for(const i of [11,12,13]){await soy(i);await q('select profesor_docente_informar($1,1,$2,$3)',['r'+i,periodo,'María Sintética']);}
 await soy(11);assert.deepEqual((await q('select profesor_etiquetas_sugeridas($1,1,$2) as j',['r11',periodo]))[0].j,{disponible:false});
 for(const i of [11,12,13])await soy(i),await q("select profesor_calificar($1,1,$2,5,array['paciente','amable'],null,array['Explica bien'])",['r'+i,periodo]);
 await soy(11);s=(await q('select profesor_etiquetas_sugeridas($1,1,$2) as j',['r11',periodo]))[0].j;
 assert.equal(s.disponible,true);assert.deepEqual(s.orden.slice(0,2).sort(),['amable','paciente']);assert.deepEqual(s.propias,['Explica bien']);
 await soy(14);await assert.rejects(q('select profesor_etiquetas_sugeridas($1,1,$2) as j',['r1',periodo]),/no sincronizados/,'solo para un ramo propio');
 await db.exec('reset role');await db.query("insert into profesor_ocultos(tenant,nombre) values('uc','María Sintética')");
 await soy(11);assert.deepEqual((await q('select profesor_etiquetas_sugeridas($1,1,$2) as j',['r11',periodo]))[0].j,{disponible:false},'docente oculto sin sugerencias');

 // Permisos y cascade.
 await db.exec('reset role');
 for(const f of ['calificacion_escritas(text[])','calificacion_sugeridas(jsonb,text[],integer,integer,integer)','ramo_resumen_bloque(jsonb)'])
  assert.equal((await q('select has_function_privilege($1,$2,$3) as p',['authenticated','public.'+f,'execute']))[0].p,false,f+' es interna');
 await db.exec('set role anon');await assert.rejects(q('select ramo_etiquetas_sugeridas($1,1,$2)',['r1',periodo]),/permission denied/);
 await db.exec('reset role');await db.query('delete from auth.users where id=$1',[u(4)]);
 assert.equal((await q('select count(*)::int as n from ramo_calificaciones where user_id=$1',[u(4)]))[0].n,0,'borrar la cuenta borra sus etiquetas escritas');
 console.log('OK calificaciones ronda 2: sin horas nuevas y sin pisar carga, escritas filtradas, app anterior, sugeridas con piso, profesor, permisos y cascade');
}catch(e){console.error(e);process.exitCode=1;}})();
