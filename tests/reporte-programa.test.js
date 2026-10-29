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
  const trozo=app.slice(app.indexOf('const REPORTE_PROGRAMA_MIN='),app.indexOf('function openReportModal('));
  assert.ok(trozo.includes('function enviarReportePrograma('));
  assert.ok(!/\b(save|aplicarReporteAlRamo|submit_catalog_report|track)\s*\(/.test(trozo));
  assert.ok(html.includes('id="ramo-programa-report"'));
  assert.ok(render.includes("avisoPrograma.style.display=conPautaCatalogo?'flex':'none'"));
  const ramo={id:'r-1',nombre:'Ramo sintético',origen:{tenant:'uc',carrera:'Derecho'},categorias:[{nombre:'Prueba 1'}]};
  const S={ramos:[ramo]},antes=JSON.stringify(S),usuario={id:U1};
  const nodos={
    'modal-content':{innerHTML:''},
    'm-programa-descripcion':{value:'El programa dice que vale 40 %',setAttribute(){},removeAttribute(){},focus(){}},
    'm-programa-evaluacion':{value:'Prueba 1'},
    'm-programa-enviar':{disabled:false,textContent:'',isConnected:true},
    'm-programa-error':{hidden:true,textContent:''}
  };
  const llamadas=[];let cerrado=0;
  const f=new Function('S','document','infoPeriodoPauta','esc','openModal','closeModal','showToast','supabaseClient','currentUser',
    `${trozo}\nreturn {abrirReportePrograma,enviarReportePrograma};`)(
    S,{getElementById:id=>nodos[id]},()=>({periodo:'2026-2'}),s=>String(s).replaceAll('<','&lt;'),()=>{},()=>cerrado++,()=>{},
    {rpc:async(...args)=>{llamadas.push(args);return {error:null};}},usuario);
  f.abrirReportePrograma('r-1');
  assert.match(nodos['modal-content'].innerHTML,/Mi programa dice otra cosa/);
  assert.match(nodos['modal-content'].innerHTML,/Editar evaluaciones/);
  await f.enviarReportePrograma('r-1');
  assert.equal(llamadas.length,1);
  assert.equal(llamadas[0][0],'enviar_reporte_programa');
  assert.deepEqual(llamadas[0][1],{p_tenant:'uc',p_carrera:'Derecho',p_ramo:'Ramo sintético',p_evaluacion:'Prueba 1',p_descripcion:'El programa dice que vale 40 %'});
  assert.equal(JSON.stringify(S),antes);
  assert.equal(cerrado,1);
  const sinSql=new Function('S','document','infoPeriodoPauta','esc','openModal','closeModal','showToast','supabaseClient','currentUser',
    `${trozo}\nreturn {enviarReportePrograma};`)(S,{getElementById:id=>nodos[id]},()=>({periodo:'2026-2'}),s=>String(s),()=>{},()=>cerrado++,()=>{},
    {rpc:async()=>({error:{code:'PGRST202'}})},usuario);
  await sinSql.enviarReportePrograma('r-1');
  assert.match(nodos['m-programa-error'].textContent,/disponible pronto/);
  assert.equal(cerrado,1,'sin SQL no muestra éxito ni cierra la hoja');
  console.log('OK cliente: solo catálogo, payload acotado, pauta intacta y sin analítica');
}

(async()=>{await probarSql();await probarCliente();})().catch(e=>{console.error(e);process.exitCode=1;});
