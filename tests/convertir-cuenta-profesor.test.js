// Conversión de una sola cuenta y conflicto con un teléfono desactualizado.
// Todos los UUID, ramos y notas son sintéticos.
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {PGlite}=require('@electric-sql/pglite');
const root=path.join(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
const uid=n=>`00000000-0000-0000-0000-${String(n).padStart(12,'0')}`;

// Ejecuta las funciones reales de fusión de app-session.js.
const src=read('app-session.js');
const start=src.indexOf('function conciliarNotaEditadaSync('),end=src.indexOf('async function subirConVersion(');
assert(start>0&&end>start);
const fechaEdicion=(read('app.js').match(/\nfunction fechaEdicionNotaValida\([\s\S]*?\n\}/)||[])[0];
assert(fechaEdicion,'la fusión carga el validador real de la marca opcional');
const ctx={};vm.createContext(ctx);
vm.runInContext(`const objetoSync=v=>!!v&&typeof v==='object'&&!Array.isArray(v);
const igualSync=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
${fechaEdicion}
${src.slice(start,end)}`,ctx);
const base={tipoCuenta:'estudiante',ramos:[{id:'ramo',categorias:[{id:'cat',notas:[{id:'a',valor:5.1}]}]}]};
const local=structuredClone(base);local.ramos[0].categorias[0].notas.push({id:'b',valor:6.2});
const cloud=structuredClone(base);cloud.tipoCuenta='profesor';cloud._rev=9;
const merged=vm.runInContext('fusionarSync(__base,__local,__cloud)',Object.assign(ctx,{__base:base,__local:local,__cloud:cloud}));
assert.equal(merged.tipoCuenta,'profesor','el tipo del servidor gana al teléfono');
assert.deepEqual(merged.ramos[0].categorias[0].notas.map(n=>n.valor),[5.1,6.2],'la nota local sigue');

(async()=>{
  const db=new PGlite();
  try{
    await db.exec(read('bin/supabase-stubs.sql'));
    await db.exec('create table public.user_ramos(user_id uuid primary key references auth.users(id), data jsonb not null)');
    for(let n=1;n<=2;n++)await db.query('insert into auth.users(id,email) values($1,$2)',[uid(n),`codex${n}@example.test`]);
    for(let n=1;n<=2;n++)await db.query('insert into user_ramos(user_id,data) values($1,$2)',[uid(n),JSON.stringify({...base,_rev:3})]);
    const original=read('supabase/tipo_cuenta_profesor.sql');
    assert.equal(original.split('CORREO_DE_LA_CUENTA').length-1,1,'el correo se reemplaza una sola vez');
    const sql=original.replace('CORREO_DE_LA_CUENTA','codex1@example.test');
    await db.exec(sql);
    const row=async n=>(await db.query('select data from user_ramos where user_id=$1',[uid(n)])).rows[0].data;
    assert.equal((await row(1)).tipoCuenta,'profesor');
    assert.equal((await row(1))._rev,4,'la conversión invalida la versión antigua');
    assert.equal((await row(1)).onboardingDone,true,'entra a Clases, no al onboarding');
    assert.equal((await row(2)).tipoCuenta,'estudiante','solo cambia una cuenta');
    assert.deepEqual((await row(1)).ramos,base.ramos,'las notas se conservan');
    // Una cuenta ya convertida sin onboardingDone se corrige al volver a correrlo.
    await db.query(`update user_ramos set data=data-'onboardingDone' where user_id=$1`,[uid(1)]);
    await db.exec(sql);
    assert.equal((await row(1)).onboardingDone,true,'se corrige una conversión anterior');
    assert.equal((await row(1))._rev,5);
    await db.exec(sql);
    assert.equal((await row(1))._rev,5,'correrlo de nuevo no cambia nada');
    await db.query("select set_config('request.jwt.claim.sub',$1,false)",[uid(1)]);
    await db.query('update user_ramos set data=$1 where user_id=$2',[JSON.stringify(local),uid(1)]);
    assert.equal((await row(1)).tipoCuenta,'profesor','una pestaña antigua no revierte el tipo');
    assert.deepEqual((await row(1)).ramos[0].categorias[0].notas.map(n=>n.valor),[5.1,6.2],'tampoco pierde la nota nueva');
    console.log('PASS conversión: una cuenta, notas preservadas, nube autoritativa y pestaña antigua');
  }finally{await db.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
