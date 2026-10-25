// Material de apoyo en los anuncios (Lucas, 2026-10-23). PostgreSQL en memoria
// con datos sintéticos: los anuncios que existían quedan como clase, un
// material no tiene formato, lugar ni pack, y su contacto pagado puede ser un
// link. Reaplicar clases_particulares.sql no le quita al tipo sus permisos.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {PGlite}=require('@electric-sql/pglite');
const read=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
const prof='00000000-0000-0000-0000-000000000041';
let n=0;const id=()=>`00000000-0000-0000-0000-0000000001${String(++n).padStart(2,'0')}`;
let pruebas=0;
const check=(nombre,cond)=>{assert.ok(cond,nombre);pruebas++;console.log('  OK   '+nombre);};
(async()=>{try{
  const db=new PGlite();
  await db.exec(read('bin/supabase-stubs.sql'));
  await db.exec(`create function auth.jwt() returns jsonb language sql stable as $$ select '{"aal":"aal2"}'::jsonb $$;
    create table public.user_ramos(user_id uuid);`);
  // Como en producción: primero lo que había, con un anuncio ya guardado.
  await db.exec(read('supabase/clases_particulares.sql').replace(/-- MATERIAL DE APOYO \(2026-10-23[\s\S]*?(?=\n-- UN RAMO POR ANUNCIO)/,'').replace(/grant (select|insert|update) \(tipo\)[^\n]*\n/g,''));
  await db.query('insert into auth.users(id) values($1)',[prof]);
  const anterior=id();
  await db.query(`insert into tutor_anuncios(id,autor_id,tenant,ramos_siglas,modalidad,ubicacion,precio_clp,descripcion,contacto_tipo,contacto_valor,titulo)
    values($1,$2,'uc',array['MAT1620'],'individual','online',15000,'Clase sintética de más de veinte caracteres','whatsapp','+56912345678','Clase sintética')`,[anterior,prof]);
  check('antes del SQL no existe la columna tipo',(await db.query(`select count(*)::int n from information_schema.columns where table_name='tutor_anuncios' and column_name='tipo'`)).rows[0].n===0);

  // El delta, dos veces.
  await db.exec(read('supabase/clases_material.sql'));
  await db.exec(read('supabase/clases_material.sql'));
  check('el anuncio que ya existía queda como clase y sin cambios',
    (await db.query('select tipo,modalidad,precio_clp from tutor_anuncios where id=$1',[anterior])).rows[0].tipo==='clase');
  const insertar=async(extra)=>{const nuevo=id();try{
    await db.query(`insert into tutor_anuncios(id,autor_id,tenant,ramos_siglas,precio_clp,descripcion,contacto_tipo,contacto_valor,titulo,tipo,modalidad,ubicacion,pack_clases)
      values($1,$2,'uc',array['MAT1620'],$3,'Material sintético de más de veinte caracteres',$4,$5,'Guía sintética',$6,$7,$8,$9)`,
      [nuevo,prof,extra.precio??5000,extra.contacto??'whatsapp',extra.valor??'+56912345678',extra.tipo??'material',extra.modalidad??null,extra.ubicacion??null,extra.pack??null]);
    return null;}catch(e){return e.message;}};
  check('un material pagado con WhatsApp se guarda',await insertar({})===null);
  check('un material pagado con un link se guarda',await insertar({contacto:'enlace',valor:'https://ejemplo.cl/guia'})===null);
  check('un material pagado no puede llevar Instagram',!!(await insertar({contacto:'instagram',valor:'@ejemplo'})));
  check('un material gratis puede llevar Instagram',await insertar({precio:0,contacto:'instagram',valor:'@ejemplo'})===null);
  check('una clase pagada sigue solo con WhatsApp',!!(await insertar({tipo:'clase',contacto:'enlace',valor:'https://ejemplo.cl'})));
  check('un material no tiene formato',!!(await insertar({modalidad:'individual'})));
  check('ni lugar',!!(await insertar({ubicacion:'online'})));
  check('ni pack',!!(await insertar({pack:4})));
  check('un tipo inventado no entra',!!(await insertar({tipo:'curso'})));

  // Reaplicar el archivo base entero no le quita los permisos (lección de #559).
  await db.exec(read('supabase/clases_particulares.sql'));
  const p=(await db.query(`select has_column_privilege('anon','public.tutor_anuncios','tipo','select') a,
    has_column_privilege('authenticated','public.tutor_anuncios','tipo','insert') i,
    has_column_privilege('authenticated','public.tutor_anuncios','tipo','update') u`)).rows[0];
  check('el tipo se lee, se crea y se edita después de reaplicar el archivo base',p.a&&p.i&&p.u);
  check('y el anuncio anterior sigue siendo clase',(await db.query('select tipo from tutor_anuncios where id=$1',[anterior])).rows[0].tipo==='clase');
  console.log(`\nPASS: ${pruebas}   FAIL: 0`);
}catch(e){console.error('  FAIL',e.message);process.exit(1);}})();
