// Clases particulares en la UDD (2026-10-31). La base de producción tiene los
// checks de universidad con las cuatro de antes, y `create table if not exists`
// no los cambia. Este test parte de ese estado y aplica el SQL de las dos
// formas: el delta clases_universidades.sql solo, como se hace en producción,
// y los archivos base de nuevo. En las dos, un profesor publica un anuncio para
// la UDD, el anuncio suma métricas y el perfil declara las cinco. PGlite y
// datos sintéticos.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {PGlite}=require('@electric-sql/pglite');
const leer=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
const u=i=>'00000000-0000-4000-8000-'+String(i).padStart(12,'0');
const [PROF,ALUMNA]=[u(1),u(2)];
const CINCO=['uc','fen','uai','uandes','udd'];
let pruebas=0;
const check=(nombre,cond)=>{assert.ok(cond,nombre);pruebas++;console.log('  OK   '+nombre);};
const falla=async(db,sql,p=[])=>{try{await db.query(sql,p);return false;}catch(e){return true;}};

// Los tres checks como están hoy en producción (nombres y definiciones
// revisados el 2026-10-31). Sin `if exists`: si los archivos los crean con
// otro nombre, el drop de abajo falla.
const VIEJOS=`
  alter table public.tutor_anuncios drop constraint tutor_anuncios_tenant_check;
  alter table public.tutor_anuncios add constraint tutor_anuncios_tenant_check check (tenant in ('fen','uc','uai','uandes'));
  alter table public.anuncio_metricas drop constraint anuncio_metricas_tenant_check;
  alter table public.anuncio_metricas add constraint anuncio_metricas_tenant_check check (tenant in ('fen','uc','uai','uandes'));
  alter table public.tutor_perfiles drop constraint tutor_perfiles_universidades_check;
  alter table public.tutor_perfiles add constraint tutor_perfiles_universidades_check
    check (universidades is null or (cardinality(universidades) <= 4 and universidades <@ array['fen','uc','uai','uandes']));`;

async function como(db,uid){
  await db.exec('reset role');
  await db.query("select set_config('request.jwt.claim.sub',$1,false)",[uid]);
  await db.exec('set role authenticated');
}
async function baseAnterior(){
  const db=new PGlite();
  await db.exec(leer('bin/supabase-stubs.sql'));
  await db.exec(`create function auth.jwt() returns jsonb language sql stable as $$
    select jsonb_build_object('aal',coalesce(nullif(current_setting('request.jwt.claim.aal',true),''),'aal2')) $$;
    create table public.user_ramos(user_id uuid);`);
  for(const f of ['clases_particulares','admin_clases','administradores','perfil_profesor'])await db.exec(leer(`supabase/${f}.sql`));
  await db.exec(VIEJOS);
  await db.query('insert into auth.users(id) values($1),($2)',[PROF,ALUMNA]);
  await db.query('insert into user_ramos values($1)',[ALUMNA]);
  await db.query(`insert into tutor_perfiles(user_id,nombre_publico,presentacion,estado,revisado_at,universidades)
    values($1,'Profe Sintético','Presentación ficticia para probar la UDD','aprobado',now(),$2)`,[PROF,['uc','fen','uai','uandes']]);
  return db;
}
const borradorUdd=`insert into tutor_anuncios(autor_id,tenant,ramos_siglas,modalidad,ubicacion,precio_clp,titulo,descripcion,contacto_tipo,contacto_valor)
  values($1,$2,array['DDCP13'],'individual','online',12000,'Clase sintética','Descripción sintética de más de veinte caracteres','whatsapp','56900000000') returning id`;

async function probar(db,como_se_aplico){
  console.log(`\n=== ${como_se_aplico} ===`);
  check('el perfil que ya tenía cuatro universidades queda igual',
    (await db.query('select universidades from tutor_perfiles where user_id=$1',[PROF])).rows[0].universidades.join()==='uc,fen,uai,uandes');

  await como(db,PROF);
  const id=(await db.query(borradorUdd,[PROF,'udd'])).rows[0].id;
  check('el profesor guarda un borrador para la UDD',!!id);
  check('una universidad inventada sigue sin entrar',await falla(db,borradorUdd,[PROF,'harvard']));
  await db.query('insert into anuncio_campanas(anuncio_id,dias,tope_clp) values($1,10,50000)',[id]);
  await db.query("update tutor_anuncios set estado='en_revision' where id=$1",[id]);
  await db.exec('reset role');
  await db.query('select admin.publicar_anuncio($1,0)',[id]);

  await como(db,ALUMNA);
  check('una cuenta lo ve publicado en el catálogo de la UDD',
    (await db.query("select id from tutor_anuncios where tenant='udd' and estado='publicado'")).rows.some(r=>r.id===id));
  const vista=(await db.query("select registrar_alcance_anuncio($1,'lista') ok",[id])).rows[0].ok;
  const metrica=(await db.query("select registrar_metrica_anuncio($1,'impresion','DDCP13') ok",[id])).rows[0].ok;
  await db.exec('reset role');
  const filas=(await db.query('select tenant,eventos from anuncio_metricas where anuncio_id=$1',[id])).rows;
  check('su vista se cuenta y queda en las métricas con la UDD',vista&&metrica&&filas.length===1&&filas[0].tenant==='udd'&&filas[0].eventos===1);

  await como(db,PROF);
  await db.query('update tutor_perfiles set universidades=$2 where user_id=$1',[PROF,CINCO]);
  check('el perfil declara las cinco, con la UDD',
    (await db.query('select universidades from tutor_perfiles where user_id=$1',[PROF])).rows[0].universidades.join()===CINCO.join());
  check('pero no una inventada',await falla(db,'update tutor_perfiles set universidades=$2 where user_id=$1',[PROF,['uc','harvard']]));
  check('ni una repetida para pasar del máximo',await falla(db,'update tutor_perfiles set universidades=$2 where user_id=$1',[PROF,[...CINCO,'uc']]));
  await db.exec('reset role');
}

(async()=>{try{
  console.log('\n=== El delta dice lo mismo que los archivos base ===');
  const sentencias=f=>(leer(f).match(/alter table public\.\w+ (?:drop|add) constraint (?:if exists )?\w+_(?:tenant|universidades)_check[^;]*;/g)||[])
    .map(s=>s.replace(/\s+/g,' ')).sort().join('\n');
  const delta=sentencias('supabase/clases_universidades.sql');
  check('el delta reemplaza los tres checks',delta.split('\n').length===6);
  check('clases_particulares.sql trae las mismas sentencias',sentencias('supabase/clases_particulares.sql')===delta);
  check('perfil_profesor.sql, las del perfil',sentencias('supabase/perfil_profesor.sql')===delta.split('\n').filter(s=>s.includes('tutor_perfiles')).join('\n'));

  console.log('\n=== El editor y el perfil ofrecen lo que acepta la base ===');
  const ctx={console};vm.createContext(ctx);vm.runInContext(leer('marketplace.js'),ctx);
  const enJs=vm.runInContext('UNIVERSIDADES_PERFIL.map(([v])=>v)',ctx);
  const enSql=leer('supabase/clases_universidades.sql').match(/tenant in \(([^)]*)\)/)[1].match(/[a-z]+/g);
  check('las mismas universidades en el JS y en la base',[...enJs].sort().join()===[...enSql].sort().join());
  check('un borrador para la UDD pasa la validación del editor',vm.runInContext(`validarBorradorClase({tenant:'udd',ramos_siglas:['DDCP13'],
    criterios:{promedioMenorA:5,avanceMinimo:20},modalidad:'individual',ubicacion:'online',precio_clp:12000,titulo:'Clase sintética',
    descripcion:'Descripción sintética de más de veinte caracteres',contacto_tipo:'whatsapp',contacto_valor:'+56 9 0000 0000'})`,ctx).ok);
  check('y el perfil guarda la UDD',vm.runInContext(`validarPerfilProfesor({nombre_publico:'Profe Sintético',
    presentacion:'Presentación ficticia para probar la UDD',universidades:${JSON.stringify(CINCO)}})`,ctx).datos.universidades.join()===CINCO.join());

  const db=await baseAnterior();
  console.log('\n=== Antes, con los checks de producción ===');
  await como(db,PROF);
  check('un anuncio para la UDD no entra',await falla(db,borradorUdd,[PROF,'udd']));
  check('ni el perfil con la UDD',await falla(db,'update tutor_perfiles set universidades=$2 where user_id=$1',[PROF,CINCO]));
  await db.exec('reset role');

  await db.exec(leer('supabase/clases_universidades.sql'));
  await probar(db,'Aplicando solo clases_universidades.sql, como en producción');

  const otra=await baseAnterior();
  for(const f of ['clases_particulares','perfil_profesor'])await otra.exec(leer(`supabase/${f}.sql`));
  await probar(otra,'Reaplicando clases_particulares.sql y perfil_profesor.sql');

  console.log(`\nPASS: ${pruebas}   FAIL: 0`);
}catch(e){console.error('  FAIL',e.message);process.exit(1);}})();
