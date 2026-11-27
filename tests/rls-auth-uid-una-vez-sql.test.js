// supabase/rls_auth_uid_una_vez.sql cambia CÓMO se escribe la comparación con
// auth.uid() en 15 políticas, no a quién dejan pasar. Acá se arman las
// políticas tal como están hoy en producción (pg_policies, 2026-11-27), se
// aplica el archivo dos veces y se comprueba que cada persona sigue viendo y
// tocando solo lo suyo. Datos sintéticos.
const fs=require('fs'),assert=require('node:assert/strict');
const {PGlite}=require('@electric-sql/pglite');
const leer=f=>fs.readFileSync(__dirname+'/../'+f,'utf8');
const db=new PGlite(),q=async(sql,p=[])=>(await db.query(sql,p)).rows;
const a='00000000-0000-4000-8000-000000000001',b='00000000-0000-4000-8000-000000000002';
async function sesion(uid,rol='authenticated'){
  await db.exec('reset role');
  await q("select set_config('request.jwt.claim.sub',$1,false)",[uid||'']);
  await db.exec('set role '+rol);
}
// Tabla, columna dueña, rol de las políticas y si tiene las cuatro o solo SELECT.
const TABLAS=[
  ['profiles','id','public',true,'profiles_%s_own'],
  ['user_ramos','user_id','public',true,'user_ramos_%s_own'],
  ['catalog_reports','user_id','public',true,'reports_%s_own'],
  ['encuesta_respuestas','user_id','authenticated',false,'encuesta_respuesta_propia'],
  ['encuesta_visitas','user_id','authenticated',false,'encuesta_visita_propia'],
  ['encuestas_cuentas','user_id','authenticated',false,'encuestas_cuenta_propia'],
];
const politicas=()=>q(`select tablename,policyname,cmd,roles::text roles,coalesce(qual,'') qual,coalesce(with_check,'') with_check
  from pg_policies where schemaname='public' order by tablename,policyname`);
(async()=>{try{
  await db.exec(leer('bin/supabase-stubs.sql'));
  for(const id of [a,b])await q('insert into auth.users(id) values($1)',[id]);
  for(const [t,col,rol,cuatro,nombre] of TABLAS){
    await db.exec(`create table public.${t}(${col} uuid primary key references auth.users(id) on delete cascade,dato text);
      alter table public.${t} enable row level security;
      grant select,insert,update,delete on public.${t} to anon,authenticated;`);
    const propia=col==='id'?`auth.uid() = ${col}`:(cuatro?`auth.uid() = ${col}`:`${col} = auth.uid()`);
    const n=c=>nombre.replace('%s',c);
    if(cuatro)await db.exec(`
      create policy ${n('select')} on public.${t} for select to ${rol} using (${propia});
      create policy ${n('insert')} on public.${t} for insert to ${rol} with check (${propia});
      create policy ${n('update')} on public.${t} for update to ${rol} using (${propia}) with check (${propia});
      create policy ${n('delete')} on public.${t} for delete to ${rol} using (${propia});`);
    else await db.exec(`create policy ${nombre} on public.${t} for select to ${rol} using (${propia});`);
    for(const id of [a,b])await q(`insert into public.${t}(${col},dato) values($1,'sintético')`,[id]);
  }
  const antes=await politicas();
  assert.equal(antes.length,15,'las 15 políticas que marca el advisor');
  assert.ok(antes.every(p=>!/select auth\.uid\(\)/i.test(p.qual+p.with_check)),'parten sin el SELECT, como en producción');

  await db.exec(leer('supabase/rls_auth_uid_una_vez.sql'));
  await db.exec(leer('supabase/rls_auth_uid_una_vez.sql')); // reaplicable
  const despues=await politicas();
  assert.deepEqual(despues.map(p=>[p.tablename,p.policyname,p.cmd,p.roles]),antes.map(p=>[p.tablename,p.policyname,p.cmd,p.roles]),
    'mismas políticas, mismos comandos y mismos roles');
  for(const p of despues){
    for(const [campo,expr] of [['using',p.qual],['with check',p.with_check]]){
      if(!expr)continue;
      assert.match(expr,/select auth\.uid\(\)/i,`${p.policyname} (${campo}) usa (select auth.uid())`);
      assert.doesNotMatch(expr.replace(/select auth\.uid\(\)/ig,''),/auth\.uid\(\)/,`${p.policyname} (${campo}) no deja un auth.uid() suelto`);
    }
  }
  assert.equal(antes.filter(p=>p.qual).length,despues.filter(p=>p.qual).length,'ninguna política perdió su USING');
  assert.equal(antes.filter(p=>p.with_check).length,despues.filter(p=>p.with_check).length,'ni su WITH CHECK');

  for(const [t,col,rol,cuatro] of TABLAS){
    await sesion(a);
    assert.deepEqual((await q(`select ${col} id from public.${t}`)).map(r=>r.id),[a],`${t}: cada persona ve solo su fila`);
    await sesion(null,'anon');
    assert.equal((await q(`select 1 from public.${t}`)).length,0,`${t}: sin sesión no se ve nada`);
    await sesion(a);
    if(cuatro){
      assert.equal((await db.query(`update public.${t} set dato='ajeno' where ${col}=$1`,[b])).affectedRows,0,`${t}: no edita la fila de otra persona`);
      assert.equal((await db.query(`delete from public.${t} where ${col}=$1`,[b])).affectedRows,0,`${t}: no borra la fila de otra persona`);
      assert.equal((await db.query(`update public.${t} set dato='propio' where ${col}=$1`,[a])).affectedRows,1,`${t}: sí edita la suya`);
      await assert.rejects(q(`update public.${t} set ${col}=$1 where ${col}=$2`,[b,a]),/row-level security|duplicate key/,`${t}: no puede traspasar su fila a otra persona`);
      assert.equal((await db.query(`delete from public.${t} where ${col}=$1`,[a])).affectedRows,1,`${t}: sí borra la suya`);
      await db.exec('reset role');await q(`delete from public.${t} where ${col}=$1`,[b]);
      await sesion(a);
      await assert.rejects(q(`insert into public.${t}(${col},dato) values($1,'ajeno')`,[b]),/row-level security/,`${t}: no inserta a nombre de otra persona`);
      await q(`insert into public.${t}(${col},dato) values($1,'propio')`,[a]);
      await sesion(null,'anon');
      await assert.rejects(q(`insert into public.${t}(${col},dato) values($1,'anónimo')`,[b]),/row-level security/,`${t}: sin sesión no inserta`);
    }else{
      // Solo tienen política de lectura: escribir va por funciones del servidor.
      await assert.rejects(q(`insert into public.${t}(${col},dato) values($1,'x')`,[a]),/row-level security|duplicate key/,`${t}: no se escribe directo`);
      assert.equal((await db.query(`update public.${t} set dato='x' where ${col}=$1`,[a])).affectedRows,0,`${t}: tampoco se edita directo`);
    }
  }
  await db.exec('reset role');
  // encuestas.sql crea las suyas con el mismo patrón: aplicarlo después no las devuelve.
  const enc=leer('supabase/encuestas.sql');
  for(const n of ['encuesta_respuesta_propia','encuesta_visita_propia','encuestas_cuenta_propia'])
    assert.match(enc,new RegExp('create policy '+n+'[^;]*using\\(user_id=\\(select auth\\.uid\\(\\)\\)\\);'),n+' nace con el SELECT en encuestas.sql');
  console.log('OK: las 15 políticas evalúan auth.uid() una vez y dejan pasar lo mismo que antes');
}catch(e){console.error(e);process.exitCode=1;}finally{await db.close();}})();
