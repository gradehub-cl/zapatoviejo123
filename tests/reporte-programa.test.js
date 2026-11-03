// #632: flujo independiente de la pauta, dos cuentas y bandeja con MFA.
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {PGlite}=require('@electric-sql/pglite');
const leer=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
const U1='00000000-0000-0000-0000-000000000101';
const U2='00000000-0000-0000-0000-000000000102';
const ADMIN='00000000-0000-0000-0000-000000000103';

async function probarSql(){
  const db=new PGlite();
  const q=async(s,p=[])=>(await db.query(s,p)).rows;
  const sesion=(id,aal='aal1')=>db.query("select set_config('request.jwt.claim.sub',$1,false),set_config('test.aal',$2,false)",[id,aal]);
  try{
    await db.exec(leer('bin/supabase-stubs.sql'));
    await db.exec(`create schema admin;
      create table admin.administradores(user_id uuid primary key references auth.users(id) on delete cascade);
      create function auth.jwt() returns jsonb language sql stable as $$
        select jsonb_build_object('aal',current_setting('test.aal',true)) $$;`);
    await db.exec(leer('supabase/reporte_programa.sql'));
    for(const id of [U1,U2,ADMIN])await q('insert into auth.users(id) values($1)',[id]);
    await q('insert into admin.administradores(user_id) values($1)',[ADMIN]);
    await sesion(U1);
    await db.exec('set role authenticated');
    await assert.rejects(q("insert into reportes_programa(user_id,tenant,ramo,descripcion) values($1,'uc','Ramo sintético','Peso diferente en el programa')",[U1]),/permission denied/);
    await assert.rejects(q("select enviar_reporte_programa('uc',null,'Ramo sintético',null,'corto')"),/Revisa los datos/);
    const reporte=(await q("select enviar_reporte_programa('uc','Derecho','Ramo sintético','Prueba 1','El programa dice que vale 40 %') id"))[0].id;
    assert.ok(reporte);
    await assert.rejects(q("select enviar_reporte_programa('uc',null,'Otro ramo',null,'Otra diferencia explícita')"),/Ya enviaste un reporte hoy/);
    assert.equal((await q('select count(*)::int n from reportes_programa'))[0].n,1);
    await assert.rejects(q('select admin_reportes_programa()'),/sin acceso/);
    await db.exec('reset role');
    await sesion(U2);
    await db.exec('set role authenticated');
    assert.equal((await q('select id from reportes_programa')).length,0);
    await q("select enviar_reporte_programa('uai',null,'Otro ramo',null,'Mi programa dice otra ponderación')");
    assert.equal((await q('select id from reportes_programa')).length,1);
    await db.exec('reset role');
    await sesion(ADMIN,'aal1');
    await db.exec('set role authenticated');
    await assert.rejects(q('select admin_reportes_programa()'),/sin acceso/);
    await db.exec('reset role');
    await sesion(ADMIN,'aal2');
    await db.exec('set role authenticated');
    const bandeja=(await q('select admin_reportes_programa() r'))[0].r;
    assert.equal(bandeja.length,2);
    assert.equal(bandeja[0].user_id,undefined);
    assert.ok(bandeja.some(x=>x.descripcion==='El programa dice que vale 40 %'));
    await db.exec('reset role');
    await db.exec(leer('supabase/reporte_programa.sql'));
    assert.equal((await q('select count(*)::int n from reportes_programa'))[0].n,2,'reaplicar SQL conserva ambos reportes');
    await sesion(U2);
    await db.exec('set role authenticated');
    assert.equal((await q('select id from reportes_programa')).length,1,'reaplicar conserva el aislamiento');
    await db.exec('reset role');
    await q('delete from auth.users where id=$1',[U1]);
    assert.equal((await q('select count(*)::int n from reportes_programa'))[0].n,1);
    console.log('OK SQL: texto, frecuencia, RLS entre dos cuentas, MFA y cascada');
  }finally{await db.close();}
}

async function probarCliente(){
  const app=leer('app.js'),render=leer('render-main.js'),html=leer('index.html');
  // Se quitó el 2026-11-02: «Repórtala» hace lo mismo y además corrige la pauta.
  assert.ok(!html.includes('ramo-programa-report'));
  assert.ok(!app.includes('function abrirReportePrograma('));
  assert.ok(!render.includes('abrirReportePrograma'));
  console.log('OK cliente: la ficha solo ofrece «Repórtala»; la bandeja de admin sigue');
}

(async()=>{await probarSql();await probarCliente();})().catch(e=>{console.error(e);process.exitCode=1;});
