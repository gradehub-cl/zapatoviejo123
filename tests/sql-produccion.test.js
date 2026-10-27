// El SQL llega a producción por el workflow sql-produccion, con la aprobación de
// Martín (docs/guia/desplegar.md). Sin red ni base: se prueba qué decide aplicar
// y que el workflow no pueda saltarse la aprobación.
const fs=require('fs'),path=require('path');
const raiz=path.join(__dirname,'..');
const {plan}=require('../bin/sql-produccion.js');
const leer=f=>fs.readFileSync(path.join(raiz,f),'utf8');
let ok=0,fail=0;const chk=(n,c)=>{console.log(`  ${c?'OK  ':'FAIL'} ${n}`);if(c)ok++;else fail++;};

console.log('\n=== Qué se aplica ===');
const todos=fs.readdirSync(path.join(raiz,'supabase')).filter(f=>f.endsWith('.sql')).map(f=>'supabase/'+f);
const p=Object.fromEntries(plan(todos,leer).map(x=>[x.archivo,x]));
chk('los de una sola vez quedan a mano', ['profesores_445_limpieza','prueba_aislamiento','respaldo_campanas_515','revertir_campanas_515']
  .every(f=>p[`supabase/${f}.sql`]&&p[`supabase/${f}.sql`].modo==='manual'));
chk('sin begin propio, en una transacción', p['supabase/resumen_semanal.sql'].transaccion==='una');
chk('con begin/commit propio, se respeta el suyo', p['supabase/administradores.sql'].transaccion==='propia');
chk('todo archivo con begin; también trae commit;', todos.filter(f=>p[f].modo==='aplicar'&&p[f].transaccion==='propia')
  .every(f=>/^\s*commit\s*;/im.test(leer(f))));
chk('nada fuera de supabase/*.sql, ni rutas raras', plan(['README.md','supabase/../app.js','supabase/sub/x.sql','supabase/catalogo_uc.csv'],()=>'').length===0);

console.log('\n=== El workflow ===');
const wf=leer('.github/workflows/sql-produccion.yml');
chk('corre al llegar SQL a main, nunca en un PR', /push:\s*\n\s*branches: \[main\]\s*\n\s*paths: \['supabase\/\*\.sql'\]/.test(wf)&&!/pull_request/.test(wf));
chk('aplicar espera la aprobación: va en el environment produccion-sql', /aplicar:[\s\S]*environment: produccion-sql/.test(wf));
chk('revisar no toca la base', !/revisar:[\s\S]*PRODUCCION_DB_URL[\s\S]*aplicar:/.test(wf.split('  aplicar:')[0]+'aplicar:'));
chk('cada archivo se detiene al primer error', (wf.match(/ON_ERROR_STOP=1/g)||[]).length===2&&/--single-transaction/.test(wf));
chk('lo que escribe una persona entra por env, no pegado en el script', /PEDIDOS: \$\{\{ inputs\.archivos \}\}/.test(wf)&&!/run:[^\n]*\$\{\{ inputs\./.test(wf));
chk('la conexión no está en el repo', !/postgres(ql)?:\/\/[^\s'"]*@/.test(wf+leer('bin/sql-produccion.js')));

console.log('\n=== Sin el proyecto de prueba ===');
chk('se sacó el workflow prueba y su script', !fs.existsSync(path.join(raiz,'.github/workflows/prueba.yml'))&&!fs.existsSync(path.join(raiz,'bin/prueba-e2e.js')));
chk('AGENTS.md cuenta cómo llega el SQL', /sql-produccion/.test(leer('AGENTS.md'))&&/-- sql-produccion: manual/.test(leer('AGENTS.md')));

console.log(`\nPASS: ${ok}   FAIL: ${fail}`);
process.exit(fail?1:0);
