// Resumen semanal por correo (supabase/resumen_semanal.sql), contra un Postgres
// de verdad (PGlite) y con datos sintéticos. Resend, Vault y pg_net van
// simulados: el test no manda correos ni necesita claves.
const fs=require('fs'),path=require('path');
const raiz=path.join(__dirname,'..');
const leer=f=>fs.readFileSync(path.join(raiz,f),'utf8');
let ok=0,fail=0;const chk=(n,c)=>{console.log(`  ${c?'OK  ':'FAIL'} ${n}`);if(c)ok++;else fail++;};

(async()=>{
  const {PGlite}=await import('@electric-sql/pglite');
  const db=new PGlite();
  await db.exec(leer('bin/supabase-stubs.sql'));
  // Las tablas históricas no tienen archivo en el repo (ver supabase-stubs.sql):
  // acá van solo las columnas que el resumen lee, nada más.
  await db.exec(`
    create table public.user_ramos (user_id uuid primary key references auth.users(id), data jsonb);
    create table public.catalog_reports (
      user_id uuid, tenant text, carrera text, ramo text, ramo_norm text, ramo_sigla text,
      estructura jsonb, huella text, nota text, seccion integer, updated_at timestamptz not null default now());
    create schema admin;
    create table admin.administradores (user_id uuid primary key references auth.users(id));
    create schema vault;
    create table vault.decrypted_secrets (name text, decrypted_secret text);
    create schema net;
    create table net.llamadas (url text, headers jsonb, body jsonb);
    create function net.http_post(url text, body jsonb default '{}', params jsonb default '{}',
                                  headers jsonb default '{}', timeout_milliseconds integer default 5000)
    returns bigint language sql as $$ insert into net.llamadas values (url, headers, body); select 7::bigint $$;
  `);
  for(const f of ['supabase/errores_app.sql','supabase/user_feedback.sql','supabase/visitas_diarias.sql','supabase/resumen_semanal.sql'])
    await db.exec(leer(f));

  // Personas sintéticas: dos de la semana, una antigua, una admin.
  const u=['11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222',
           '33333333-3333-4333-8333-333333333333','44444444-4444-4444-8444-444444444444'];
  await db.exec(`
    insert into auth.users (id, email, created_at) values
      ('${u[0]}','uno@ejemplo.test', now() - interval '2 days'),
      ('${u[1]}','dos@ejemplo.test', now() - interval '3 days'),
      ('${u[2]}','tres@ejemplo.test', now() - interval '40 days'),
      ('${u[3]}','admin@ejemplo.test', now() - interval '90 days');
    insert into public.user_ramos values
      ('${u[0]}', '{"tenant":"fen","ramos":[{"id":"a","nombre":"Ramo Sano","creditos":6,"categorias":[
          {"id":"c1","peso":60,"notas":[{"id":"n1","valor":5.5}]},{"id":"c2","peso":40,"notas":[]}]}]}'),
      ('${u[1]}', '{"tenant":"uc","ramos":[
          {"id":"b","nombre":"Filosofía: ñPara queñ","origen":{"tenant":"uc"},"categorias":[
            {"id":"k","peso":50,"slots":2,"notas":[{"id":"x","valor":8,"slot":0},{"id":"y","valor":"5,5","slot":1},{"id":"z","valor":4,"slot":0}]}]},
          {"id":"b","nombre":"Repetido","creditos":10,"categorias":[{"id":"q","peso":100}]}]}'),
      ('${u[2]}', '{"tenant":"fen","ramos":"roto"}');
    insert into public.errores_app (user_id, plataforma, version, tipo, mensaje, donde, pantalla, creado) values
      ('${u[0]}','web','774a70f','ReferenceError','Can''t find variable: track','promesa','auth', now() - interval '1 day'),
      ('${u[1]}','web','774a70f','ReferenceError','Can''t find variable: track','promesa','auth', now() - interval '1 day'),
      ('${u[0]}','web','2168b87','TypeError','viejo conocido','app.js:[n]','home', now() - interval '1 day'),
      ('${u[0]}','web','aaaaaaa','TypeError','viejo conocido','app.js:[n]','home', now() - interval '20 days');
    insert into public.user_feedback (user_id, categoria, mensaje, universidad, created_at) values
      ('${u[0]}','problema','No me deja   cambiar la clave','fen', now() - interval '1 day'),
      ('${u[2]}','sugerencia','Comentario de hace un mes','uc', now() - interval '30 days');
    insert into public.visitas_diarias values
      ('${u[0]}', current_date - 1), ('${u[1]}', current_date - 2), ('${u[2]}', current_date - 10);
    insert into public.catalog_reports (user_id, tenant, ramo, ramo_norm, huella, nota, updated_at) values
      ('${u[0]}','fen','Marketing','marketing','h1',null, now() - interval '20 days'),
      ('${u[1]}','fen','Marketing','marketing','h1',null, now() - interval '20 days'),
      ('${u[2]}','fen','Marketing','marketing','h1','El examen pesa 30', now() - interval '1 day');
  `);

  const texto=(await db.query(`select admin.resumen_semanal_texto() as t`)).rows[0].t;
  if(process.env.VER)console.log(texto);

  console.log('\n=== Uso ===');
  chk('cuentas nuevas de la semana y total', /Cuentas nuevas: 2 \(total 4\)/.test(texto));
  chk('por universidad, desde el tenant guardado', /fen 1/.test(texto)&&/uc 1/.test(texto));
  chk('quiénes entraron esta semana y la anterior', /Entraron esta semana: 2 \(la anterior: 1\)/.test(texto));

  console.log('\n=== Errores ===');
  chk('total y cuentas', /ERRORES \(3 en 2 cuentas\)/.test(texto));
  chk('agrupados, con su versión, y marca los nuevos', /2× · 2 cuentas · NUEVO · ReferenceError: Can't find variable: track · promesa · auth · web 774a70f/.test(texto));
  chk('uno que ya había pasado no es NUEVO', /1× · 1 cuentas · TypeError: viejo conocido/.test(texto));
  chk('cuenta por versión', /Por versión: 774a70f 2, 2168b87 1/.test(texto));

  console.log('\n=== Comentarios y pautas ===');
  chk('solo los de la semana, en una línea', /COMENTARIOS \(1\)\n  \[problema · fen\] No me deja cambiar la clave/.test(texto)&&!/hace un mes/.test(texto));
  chk('un grupo que llegó a 3 personas', /Llegó a 3: fen · Marketing \(3 personas\)/.test(texto));
  chk('el comentario del reporte', /Comentario · fen · Marketing: El examen pesa 30/.test(texto));

  console.log('\n=== Salud de los datos ===');
  chk('encabezado con cuentas y ramos', /SALUD DE LOS DATOS \(3 cuentas, 3 ramos\)/.test(texto));
  chk('⚠ cuenta con ramos que no son lista', /⚠ Cuentas sin lista de ramos: 1 \(1 cuentas\)/.test(texto));
  chk('⚠ nota fuera de 1 a 7', /⚠ Notas fuera de 1 a 7: 1/.test(texto));
  chk('⚠ nota que no es número', /⚠ Notas que no son número: 1/.test(texto));
  chk('⚠ id de ramo repetido', /⚠ Ramos con id repetido en la misma cuenta: 1/.test(texto));
  chk('⚠ casilla con dos notas', /⚠ Casillas con dos notas: 1/.test(texto));
  chk('⚠ evaluación sin lista de notas', /⚠ Evaluaciones sin lista de notas: 1/.test(texto));
  chk('lo que está bien dice 0, sin ⚠', /^    Ramos sin lista de evaluaciones: 0$/m.test(texto));
  chk('contexto: pesos que no suman 100, nombres con ñ, UC sin créditos',
    /Ramos con evaluaciones que no suman 100%: 1/.test(texto)&&/Ramos con ñ en lugar de ¿ o \?: 1/.test(texto)&&/Ramos UC del catálogo sin créditos: 1/.test(texto));
  chk('nunca correos ni nombres de personas', !/@ejemplo\.test/.test(texto));

  console.log('\n=== Envío ===');
  let id=(await db.query(`select admin.enviar_resumen_semanal() as id`)).rows[0].id;
  chk('sin API key no manda nada', id===null&&(await db.query('select count(*)::int c from net.llamadas')).rows[0].c===0);
  await db.exec(`insert into vault.decrypted_secrets values ('resend_api_key','re_prueba');`);
  id=(await db.query(`select admin.enviar_resumen_semanal() as id`)).rows[0].id;
  chk('sin administradores tampoco', id===null);
  await db.exec(`insert into admin.administradores values ('${u[3]}');`);
  id=(await db.query(`select admin.enviar_resumen_semanal() as id`)).rows[0].id;
  const llamada=(await db.query('select * from net.llamadas')).rows[0]||{};
  chk('con las dos, manda a Resend', id===7&&llamada.url==='https://api.resend.com/emails'&&llamada.headers.Authorization==='Bearer re_prueba');
  chk('a los administradores, desde hola@gradehub.cl', JSON.stringify(llamada.body&&llamada.body.to)==='["admin@ejemplo.test"]'&&/hola@gradehub\.cl/.test(llamada.body.from));
  chk('con el resumen como texto', /SALUD DE LOS DATOS/.test(llamada.body&&llamada.body.text||''));

  console.log('\n=== Permisos ===');
  const priv=async(rol,fn)=>(await db.query(`select has_function_privilege('${rol}','${fn}','execute') as p`)).rows[0].p;
  chk('anon y authenticated no pueden ejecutarlas',
    !(await priv('anon','admin.enviar_resumen_semanal()'))&&!(await priv('authenticated','admin.enviar_resumen_semanal()'))
    &&!(await priv('anon','admin.resumen_semanal_texto(timestamptz)')));
  chk('se programa los lunes con pg_cron', /cron\.schedule\('gradehub-resumen-semanal', '0 12 \* \* 1'/.test(leer('supabase/resumen_semanal.sql')));
  chk('la API key nunca está en el repo', !/re_[A-Za-z0-9]{10,}/.test(leer('supabase/resumen_semanal.sql')));

  console.log(`\nPASS: ${ok}   FAIL: ${fail}`);
  process.exit(fail?1:0);
})().catch(e=>{console.error(e);process.exit(1);});
