// Issue #657: un anuncio pausado seguía sumando días cobrados porque la pausa
// solo se anotaba en anuncio_campanas, y un anuncio sin esa fila (publicado
// antes de que la campaña fuera obligatoria, o con la campaña creada después
// de pausarlo) no la guardaba en ningún lado. PostgreSQL real en memoria con
// cuentas y anuncios sintéticos.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {PGlite}=require('@electric-sql/pglite');
const raiz=path.join(__dirname,'..'),leer=f=>fs.readFileSync(path.join(raiz,f),'utf8');
const db=new PGlite();
const prof='00000000-0000-0000-0000-000000000001',admin='00000000-0000-0000-0000-000000000003';
const heredado='00000000-0000-0000-0000-000000000004',tardio='00000000-0000-0000-0000-000000000005',conCampana='00000000-0000-0000-0000-000000000006';
let pruebas=0;
const check=(nombre,cond)=>{assert.ok(cond,nombre);pruebas++;console.log('OK '+nombre);};
const q=async(text,params=[])=>(await db.query(text,params)).rows;
const coste=async id=>(await q('select * from costo_campana($1)',[id]))[0];
const sesion=async id=>db.query("select set_config('request.jwt.claim.sub',$1,false),set_config('audit.aal','aal2',false)",[id]);
// Publicado hace 9,5 días y vence en 20, como lo dejaba el flujo anterior a las
// campañas: sin fila en anuncio_campanas. El medio día evita bordes de redondeo.
const publicadoSinCampana=async id=>db.query(`insert into tutor_anuncios(id,autor_id,tenant,ramos_siglas,modalidad,ubicacion,precio_clp,descripcion,
    contacto_tipo,contacto_valor,titulo,estado,revisado_at,pagado_at,publicado_at,vence_at)
  values($1,$2,'uc',array['TEST100'],'individual','online',10000,'Descripción sintética de más de veinte caracteres','whatsapp','56900000000',
    'Clase ficticia','publicado',now(),now(),now()-interval '9 days 12 hours',now()+interval '20 days')`,[id,prof]);
// "La pausa fue hace 8 días": el reloj de la prueba no avanza, así que se
// corre la marca hacia atrás después de que el trigger la dejó.
const pausadoHace=async(id,intervalo)=>db.query('update tutor_anuncios set detenido_at=now()-$2::interval where id=$1',[id,intervalo]);
(async()=>{
try{
  await db.exec(leer('bin/supabase-stubs.sql'));
  await db.exec(`create function auth.jwt() returns jsonb language sql stable as $$ select jsonb_build_object('aal',coalesce(current_setting('audit.aal',true),'aal1')) $$;
    create table public.user_ramos(user_id uuid);`);
  await db.exec(leer('supabase/clases_particulares.sql'));
  await db.exec(leer('supabase/admin_clases.sql'));
  await db.exec(leer('supabase/administradores.sql'));
  await db.query('insert into auth.users(id) values($1),($2)',[prof,admin]);
  await db.query('insert into admin.administradores(user_id) values($1)',[admin]);
  await db.query(`insert into tutor_perfiles(user_id,nombre_publico,presentacion,estado,revisado_at)
    values($1,'Profesor sintético','Experiencia ficticia para probar comportamiento','aprobado',now())`,[prof]);

  // 1. El caso del issue: anuncio sin campaña que pausa un administrador.
  await publicadoSinCampana(heredado);
  check('sin campaña, publicado cuenta los 10 días empezados',(await coste(heredado)).dias_cobrados===10);
  await sesion(admin);
  check('el administrador lo pausa',(await q('select admin_pausar_anuncio($1) as ok',[heredado]))[0].ok===true);
  check('la pausa queda marcada en el anuncio aunque no tenga campaña',
    (await q('select detenido_at from tutor_anuncios where id=$1',[heredado]))[0].detenido_at!==null);
  await pausadoHace(heredado,'8 days');
  check('pausado hace 8 días, solo cobra los 2 días que alcanzó a estar visible',(await coste(heredado)).dias_cobrados===2);

  // 2. La campaña se crea con el anuncio ya pausado: su fila nace sin marca.
  await publicadoSinCampana(tardio);
  await db.query("update tutor_anuncios set estado='pausado' where id=$1",[tardio]);
  await pausadoHace(tardio,'7 days');
  await db.query('insert into anuncio_campanas(anuncio_id,dias,tope_clp) values($1,30,50000)',[tardio]);
  check('la campaña creada después de pausar no tiene marca propia',
    (await q('select detenido_at from anuncio_campanas where anuncio_id=$1',[tardio]))[0].detenido_at===null);
  check('igual deja de contar desde la pausa del anuncio',(await coste(tardio)).dias_cobrados===3);

  // 3. Con campaña desde el principio sigue igual que antes, y en los dos lados.
  await publicadoSinCampana(conCampana);
  await db.query('insert into anuncio_campanas(anuncio_id,dias,tope_clp) values($1,30,50000)',[conCampana]);
  await db.query("update tutor_anuncios set estado='pausado' where id=$1",[conCampana]);
  const marcas=(await q(`select a.detenido_at=c.detenido_at as iguales from tutor_anuncios a join anuncio_campanas c on c.anuncio_id=a.id where a.id=$1`,[conCampana]))[0];
  check('con campaña, el anuncio y la campaña quedan con la misma marca',marcas.iguales===true);
  check('pausado ahora cobra los 10 días visibles',(await coste(conCampana)).dias_cobrados===10);

  // 4. Reanudar es una publicación nueva: los días en pausa no se cobran.
  await db.query("update tutor_anuncios set estado='publicado',publicado_at=now()-interval '12 hours' where id=$1",[tardio]);
  check('al volver a publicarse se borra la marca del anuncio',
    (await q('select detenido_at from tutor_anuncios where id=$1',[tardio]))[0].detenido_at===null);
  check('la publicación nueva cobra solo desde que volvió',(await coste(tardio)).dias_cobrados===1);

  // 5. La marca es interna: nadie la lee ni la escribe desde la app.
  await db.exec('set role authenticated');
  await assert.rejects(db.query('update tutor_anuncios set detenido_at=null where id=$1',[heredado]),/permission denied/);
  await assert.rejects(db.query('select detenido_at from tutor_anuncios where id=$1',[heredado]),/permission denied/);
  await db.exec('reset role');
  check('el cliente no puede leer ni borrar la marca de pausa',true);

  console.log(`\n${pruebas} pruebas OK`);
}catch(e){console.error(e);process.exit(1);}
})();
