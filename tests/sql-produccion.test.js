// La base de producción desde el Mac de Martín (bin/sql-produccion.js): consultas
// de solo lectura y SQL aplicado con confirmación en un diálogo. Sin red ni base:
// la API es de mentira y el diálogo se reemplaza por una respuesta fija.
const fs=require('fs'),path=require('path');
const raiz=path.join(__dirname,'..');
const m=require('../bin/sql-produccion.js');
const leer=f=>fs.readFileSync(path.join(raiz,f),'utf8');
let ok=0,fail=0;const chk=(n,c)=>{console.log(`  ${c?'OK  ':'FAIL'} ${n}`);if(c)ok++;else fail++;};
const api=(respuestas=[])=>{const pedidos=[];return {pedidos,pedir:async(url,op)=>{pedidos.push({url,cuerpo:JSON.parse(op.body),auth:op.headers.Authorization});
  const r=respuestas.length?respuestas.shift():[];return {ok:!r.error,status:r.error?400:201,text:async()=>JSON.stringify(r.error?{message:r.error}:r)};}};};
const conexion=extra=>({ref:'refprueba',token:'sbp_prueba',...extra});

(async()=>{
  console.log('\n=== Qué se aplica y cómo ===');
  const todos=fs.readdirSync(path.join(raiz,'supabase')).filter(f=>f.endsWith('.sql')).map(f=>'supabase/'+f);
  const p=Object.fromEntries(m.plan(todos).map(x=>[x.archivo,x]));
  chk('los de una sola vez quedan a mano', ['profesores_445_limpieza','prueba_aislamiento','respaldo_campanas_515','revertir_campanas_515']
    .every(f=>p[`supabase/${f}.sql`].modo==='manual'));
  chk('sin begin propio se envuelve en una transacción', p['supabase/resumen_semanal.sql'].transaccion==='una'
    &&/^begin;\n[\s\S]*\ncommit;$/.test(m.consultaDe(p['supabase/resumen_semanal.sql'])));
  chk('con begin/commit propio se manda tal cual', p['supabase/administradores.sql'].transaccion==='propia'
    &&m.consultaDe(p['supabase/administradores.sql'])===leer('supabase/administradores.sql'));
  chk('todo archivo con begin; también trae commit;', todos.filter(f=>p[f].modo==='aplicar'&&p[f].transaccion==='propia').every(f=>/^\s*commit\s*;/im.test(leer(f))));
  chk('nada fuera de supabase/*.sql, ni rutas raras', m.plan(['README.md','supabase/../app.js','supabase/sub/x.sql','supabase/catalogo_uc.csv'],()=>'').length===0);

  console.log('\n=== Aplicar pide confirmación ===');
  let a=api();
  let r=await m.aplicar(['supabase/resumen_semanal.sql'],conexion({pedir:a.pedir,confirmar:()=>false}),()=>{});
  chk('sin el clic en Aplicar no se manda nada', r===false&&a.pedidos.length===0);
  a=api();const log=[];
  r=await m.aplicar(['supabase/resumen_semanal.sql','supabase/respaldo_campanas_515.sql'],conexion({pedir:a.pedir,confirmar:()=>true}),l=>log.push(l));
  chk('con el clic, se manda a la API de esa base', r===true&&a.pedidos.length===1&&a.pedidos[0].url==='https://api.supabase.com/v1/projects/refprueba/database/query'&&a.pedidos[0].auth==='Bearer sbp_prueba');
  chk('aplicar no va en modo lectura', a.pedidos[0].cuerpo.read_only===undefined);
  chk('el manual no se manda y lo dice', log.some(l=>/respaldo_campanas_515\.sql: es solo a mano/.test(l)));
  let error='';
  try{await m.aplicar(['supabase/resumen_semanal.sql'],conexion({pedir:api([{error:'syntax error at or near "x"'}]).pedir,confirmar:()=>true}),()=>{});}catch(e){error=e.message;}
  chk('un error de Postgres se informa', /400/.test(error)&&/syntax error/.test(error));

  console.log('\n=== Consultar es solo lectura ===');
  a=api([[{transaction_read_only:'on'}],[{n:3}]]);
  const filas=await m.consultar('select count(*) n from public.errores_app',conexion({pedir:a.pedir}));
  chk('comprueba el modo antes y después consulta', a.pedidos.length===2&&a.pedidos[0].cuerpo.query==='show transaction_read_only'&&filas[0].n===3);
  chk('las dos van con read_only', a.pedidos.every(x=>x.cuerpo.read_only===true));
  a=api([[{transaction_read_only:'off'}]]);error='';
  try{await m.consultar('select 1',conexion({pedir:a.pedir}));}catch(e){error=e.message;}
  chk('si la API no confirma solo lectura, no corre la consulta', /no confirmó/.test(error)&&a.pedidos.length===1);
  error='';try{m.consultaDeLectura('select 1; commit; delete from public.user_ramos');}catch(e){error=e.message;}
  chk('una consulta no puede cerrar la transacción para escribir', /no puede abrir ni cerrar/.test(error));

  console.log('\n=== Secretos y proyecto de prueba ===');
  const src=leer('bin/sql-produccion.js');
  chk('el token sale del Llavero, nunca del repo', /find-generic-password', '-s', 'gradehub-supabase'/.test(src)&&!/sbp_[A-Za-z0-9]{10,}/.test(src));
  chk('el proyecto es el de la app', m.refDelProyecto()===(leer('app-session.js').match(/https:\/\/([a-z0-9]+)\.supabase\.co/)||[])[1]);
  chk('se sacó el proyecto de prueba', !fs.existsSync(path.join(raiz,'.github/workflows/prueba.yml'))&&!fs.existsSync(path.join(raiz,'bin/prueba-e2e.js')));
  chk('AGENTS.md cuenta cómo llega el SQL', /sql-produccion/.test(leer('AGENTS.md'))&&/-- sql-produccion: manual/.test(leer('AGENTS.md')));

  console.log(`\nPASS: ${ok}   FAIL: ${fail}`);
  process.exit(fail?1:0);
})().catch(e=>{console.error(e);process.exit(1);});
