// Vista semanal y panel de administración con cuentas sintéticas.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {PGlite}=require('@electric-sql/pglite');
const root=path.join(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
const db=new PGlite(),uid=n=>`00000000-0000-0000-0000-${String(n).padStart(12,'0')}`;
const q=async(sql,args=[])=>(await db.query(sql,args)).rows;
const login=async(n,aal='aal1')=>{
  await db.query("select set_config('request.jwt.claim.sub',$1,false)",[n?uid(n):'']);
  await db.query("select set_config('request.jwt.claim.aal',$1,false)",[aal]);
};
(async()=>{try{
  await db.exec(read('bin/supabase-stubs.sql'));
  await db.exec('create table public.user_ramos(user_id uuid primary key references auth.users(id), data jsonb not null)');
  await db.exec(`create or replace function public.administrador_verificado() returns boolean
    language sql stable as $$select auth.uid()='${uid(1)}'::uuid
      and current_setting('request.jwt.claim.aal',true)='aal2'$$`);
  const sql=read('supabase/visitas_diarias.sql');await db.exec(sql);await db.exec(sql);
  for(let i=1;i<=4;i++){
    await db.query('insert into auth.users(id,created_at) values($1,$2)',[uid(i),i===4?'2026-09-14 12:00-03':'2026-09-07 12:00-03']);
    await db.query('insert into user_ramos(user_id,data) values($1,$2)',[uid(i),JSON.stringify({tenant:'uc',...(i===1?{}:{tipoCuenta:i===2?'estudiante':'profesor'})})]);
  }
  await db.query(`insert into visitas_diarias(user_id,dia) values
    ($1,'2026-09-08'),($1,'2026-09-09'),($2,'2026-09-08'),($3,'2026-09-08'),
    ($1,'2026-09-15'),($3,'2026-09-15'),($4,'2026-09-15')`,[uid(1),uid(2),uid(3),uid(4)]);
  const f=(await q("select * from admin.crecimiento_semanal where semana='2026-09-14' and universidad='todas'"))[0];
  assert.equal(Number(f.activas),3);assert.equal(Number(f.vuelven),2);
  assert.equal(Number(f.activas_estudiantes),1,'tipo ausente cuenta como estudiante');
  assert.equal(Number(f.activas_profesores),2);
  assert.equal(Number(f.vuelven_estudiantes),1);assert.equal(Number(f.vuelven_profesores),1);
  assert.equal(Number(f.nuevas_profesores),1);assert.equal(Number(f.nuevas_estudiantes),0);
  assert.equal(Number(f.pct_vuelven),66.7);assert.equal(Number(f.pct_vuelven_estudiantes),50);
  assert.equal(Number(f.pct_vuelven_profesores),100);
  await login(1,'aal1');await assert.rejects(q('select public.crecimiento_semanal_admin()'),/administraci.n requiere segundo factor/);
  await login(2,'aal2');await assert.rejects(q('select public.crecimiento_semanal_admin()'),/administraci.n requiere segundo factor/);
  await login(1,'aal2');
  const data=(await q('select public.crecimiento_semanal_admin() as rows'))[0].rows;
  assert.equal(data[0].activas,3);assert.equal(data[0].activas_profesores,2);
  assert(!JSON.stringify(data).includes(uid(1)),'la RPC solo devuelve agregados');
  await db.exec('set role anon');await assert.rejects(q('select public.crecimiento_semanal_admin()'),/permission denied/);await db.exec('reset role');
  const ctx={currentUser:{id:"admin-sintetico"},esc:x=>String(x).replace(/</g,'&lt;'),document:{addEventListener(){},getElementById(){return null;}}};vm.createContext(ctx);
  vm.runInContext(read('marketplace.js'),ctx);
  ctx.__rows=data;
  const html=vm.runInContext('crecimientoAdminHTML(__rows)',ctx);
  assert(html.includes('<strong>3</strong>')&&html.includes('1 estudiantes · 2 profesores'));
  assert(html.includes('admin-crecimiento-historial')&&html.includes(`Ver ${data.length} semanas como tabla`),
    'el historial queda disponible sin ocupar la vista principal');
  assert(!vm.runInContext('crecimientoAdminHTML(__rows.slice(0,1))',ctx).includes('<details'),
    'una sola semana no necesita historial');
  assert.equal(vm.runInContext('crecimientoAdminHTML([])',ctx),'','sin SQL el resto del panel sigue');
  const node=()=>({innerHTML:'',value:'',textContent:'',hidden:false,dataset:{},addEventListener(){},setAttribute(){},
    querySelector(){return node()},querySelectorAll(){return []}});
  ctx.__root=node();ctx.__sb={rpc:async name=>name==='admin_panel_clases'
    ?{data:[],error:null}:{data:null,error:{code:'PGRST202'}}};
  vm.runInContext('supabaseClient=__sb',ctx);
  await vm.runInContext('pintarPanelAdmin(__root)',ctx);
  assert(ctx.__root.innerHTML.includes('Campañas')&&!ctx.__root.innerHTML.includes('adm-metricas"'),
    'el panel actual carga aunque la nueva RPC aún no exista');
  console.log('PASS crecimiento: totales, desglose, MFA, datos agregados y panel');
}finally{await db.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
