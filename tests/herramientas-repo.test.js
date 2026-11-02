// Herramientas de lectura: límites de salida, filtros antes del parseo y estado
// sin red. Todo corre en un repo temporal con npm sintético, nunca producción.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {spawnSync}=require('node:child_process');
const {documentos,buscar}=require('../bin/buscar-js');
const raiz=path.join(__dirname,'..'),tmp=fs.mkdtempSync(path.join(os.tmpdir(),'gh-lectura-'));
const escribir=(f,s)=>{const p=path.join(tmp,f);fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,s);};
const cli=args=>spawnSync(process.execPath,[path.join(raiz,'bin/buscar-js.js'),...args],{encoding:'utf8'});
try{
  escribir('src/orden.json',JSON.stringify({'app.js':['src/app/calculo.js']}));
  escribir('src/app/calculo.js','function calcular(){return 5;}');
  escribir('app.js','function duplicadoNoBuscar(){}');
  escribir('supabase/reporte.sql','-- prueba\nselect 1 as dato_sintetico;');
  escribir('styles.css','.casilla_sintetica{color:red;}');
  escribir('index.html','<input aria-label="Casilla sintética">');
  escribir('docs/guia.md','# Guía\nContexto sintético');
  escribir('docs/catalogo-uc-inventory.md','NO_MOSTRAR_INVENTARIO');
  escribir('node_modules/tercero.js','TERCERO');
  escribir('tests/caso.test.js','const PRUEBA=1;');
  escribir('src/app/invalido.js','esto no parsea @@');
  escribir('src/orden.json',JSON.stringify({'app.js':['src/app/calculo.js','src/app/invalido.js']}));

  let docs=documentos({raiz:tmp,archivo:'calculo.js'});
  assert.equal(docs.length,1,'filtra antes de parsear JS ajeno, incluso si está roto');
  assert.equal(buscar(docs,'calcular')[0].archivo,'src/app/calculo.js');
  docs=documentos({raiz:tmp,tipos:['sql','css','html']});
  assert.equal(buscar(docs,'dato_sintetico')[0].archivo,'supabase/reporte.sql');
  assert.equal(buscar(docs,'casilla_sintetica')[0].archivo,'styles.css');
  assert.equal(buscar(docs,'Casilla sintética')[0].archivo,'index.html');
  docs=documentos({raiz:tmp,tipos:['docs']});
  assert.equal(buscar(docs,'Contexto sintético')[0].archivo,'docs/guia.md');
  assert.equal(buscar(docs,'NO_MOSTRAR_INVENTARIO').length,0);
  assert.equal(documentos({raiz:tmp,tipos:['docs'],archivo:'catalogo-uc-inventory.md'}).length,1);
  assert.ok(!docs.some(d=>/node_modules|tests/.test(d.archivo)));
  docs=documentos({raiz:tmp,archivo:'caso.test.js',tests:true});
  assert.equal(buscar(docs,'PRUEBA')[0].archivo,'tests/caso.test.js');
  const cache=JSON.parse(fs.readFileSync(path.join(tmp,'.cache/indice-js.json'),'utf8'));
  assert.ok(cache.archivos['src/app/calculo.js'],'las búsquedas filtradas conservan otros temas del cache');

  const sql=cli(['admin_reportes_programa','--tipo','sql','--json']);
  assert.equal(sql.status,0,sql.stderr);
  assert.equal(JSON.parse(sql.stdout)[0].archivo,'supabase/reporte_programa.sql');
  const vista=cli(['--archivo','supabase/reporte_programa.sql','--desde','57','--lineas','3','--json']);
  assert.equal(vista.status,0,vista.stderr);
  assert.deepEqual(JSON.parse(vista.stdout).mostrando,[57,59]);
  assert.equal(JSON.parse(vista.stdout).codigo.length,3);
  const css=cli(['--archivo','styles.css','--lineas','2','--json']);
  assert.equal(css.status,0,css.stderr);
  assert.ok(JSON.parse(css.stdout).codigo.every(l=>l.texto.length<=240));
  const texto=cli(['--archivo','docs/contexto.md','--lineas','4','--json']);
  assert.equal(texto.status,0,texto.stderr);
  assert.equal(JSON.parse(texto.stdout).codigo.length,4);
  assert.equal(cli(['--archivo','../../etc/passwd']).status,1,'no abre rutas fuera del índice');
  assert.equal(cli(['--tipo','invalido','algo']).status,1);
  assert.equal(cli(['--archivo','styles.css','--desde','99999']).status,1);
  const mapa=cli(['--mapa']);
  assert.equal(mapa.status,0,mapa.stderr);
  assert.ok(mapa.stdout.trim().split('\n').length<=8);
  const filtrado=cli(['--mapa','--archivo','render-agenda','--json']);
  assert.deepEqual(Object.keys(JSON.parse(filtrado.stdout)),['render-agenda.js']);
  const ambiguo=cli(['--archivo','src/app/','--limite','2']);
  assert.equal(ambiguo.status,1);
  assert.ok(ambiguo.stdout.trim().split('\n').length<=3,'no imprime todas las rutas ambiguas');

  // Repositorio git independiente y npm falso para probar el script de entrada.
  const git=args=>{const r=spawnSync('git',args,{cwd:tmp,encoding:'utf8'});assert.equal(r.status,0,r.stderr);};
  git(['init','-b','main']);
  git(['-c','user.name=Prueba','-c','user.email=prueba@example.invalid','commit','--allow-empty','-m','Fixture']);
  git(['update-ref','refs/remotes/origin/main','HEAD']);
  escribir('.gitignore','.cache/\n');
  escribir('bin/estado.sh',fs.readFileSync(path.join(raiz,'bin/estado.sh'),'utf8'));
  escribir('bin/compilar-js.js','console.log("Build sintético OK");');
  escribir('comandos/npm','#!/usr/bin/env node\nconsole.log("Detalle sintético del test");process.exit(Number(process.env.GH_TEST_FALLA||0));\n');
  fs.chmodSync(path.join(tmp,'comandos/npm'),0o755);
  const estado=args=>spawnSync('bash',['bin/estado.sh',...args],{cwd:tmp,encoding:'utf8',
    env:{...process.env,PATH:path.join(tmp,'comandos')+path.delimiter+process.env.PATH}});
  let e=estado(['--sin-red','--rapido']);
  assert.equal(e.status,0,e.stderr);
  assert.match(e.stdout,/no verificadas/);
  assert.match(e.stdout,/SKIP \(--rapido\)/);
  assert.ok(!fs.existsSync(path.join(tmp,'.cache/estado-tests.log')),'no anuncia tests que no corrió');
  e=estado(['--sin-red']);
  assert.equal(e.status,0,e.stderr);
  assert.match(e.stdout,/PASS \(suite completa\)/);
  assert.ok(!e.stdout.includes('Detalle sintético'));
  assert.match(fs.readFileSync(path.join(tmp,'.cache/estado-tests.log'),'utf8'),/Detalle sintético/);
  process.env.GH_TEST_FALLA='1';
  e=estado(['--sin-red']);
  delete process.env.GH_TEST_FALLA;
  assert.equal(e.status,1,'una suite fallida hace fallar estado.sh');
  assert.match(e.stdout,/FAIL/);assert.match(e.stdout,/Detalle sintético/);
  // El modo detallado necesita los generados que wc mide, todos ficticios.
  for(const f of ['data.js','engine.js','app-session.js','marketplace.js','render-main.js','render-agenda.js','sw.js']) escribir(f,'// fixture');
  e=estado(['--sin-red','--rapido','--completo']);
  assert.equal(e.status,0,e.stderr);
  assert.match(e.stdout,/TAMAÑOS GENERADOS/);
  assert.equal(estado(['--opcion-inexistente']).status,1);

  // --resumen cambia la salida, no los tests ejecutados ni su resultado.
  escribir('bin/tests.js',fs.readFileSync(path.join(raiz,'bin/tests.js'),'utf8'));
  escribir('bin/compilar-js.js','exports.compilar=()=>console.log("Build sintético OK");');
  fs.rmSync(path.join(tmp,'tests'),{recursive:true});
  escribir('tests/sintaxis.test.js','console.log("SINTAXIS SINTÉTICA");');
  escribir('tests/otro.test.js','console.log("OTRO SINTÉTICO");');
  const suite=args=>spawnSync(process.execPath,['bin/tests.js',...args],{cwd:tmp,encoding:'utf8'});
  let r=suite(['--resumen']);
  assert.equal(r.status,0,r.stderr);
  assert.match(r.stdout,/Pasaron los 2 tests/);
  assert.ok(!r.stdout.includes('SINTAXIS SINTÉTICA'));
  let detalle=fs.readFileSync(path.join(tmp,'.cache/tests.log'),'utf8');
  assert.ok(detalle.indexOf('SINTAXIS SINTÉTICA')<detalle.indexOf('OTRO SINTÉTICO'));
  escribir('tests/sintaxis.test.js','console.error("ERROR SINTÉTICO");process.exit(1);');
  r=suite(['--resumen']);
  assert.equal(r.status,1,r.stderr);
  assert.match(r.stdout,/FALLARON 1 de 2/);
  detalle=fs.readFileSync(path.join(tmp,'.cache/tests.log'),'utf8');
  assert.match(detalle,/ERROR SINTÉTICO/);assert.match(detalle,/OTRO SINTÉTICO/);
  assert.equal(suite(['--inexistente']).status,1);
  console.log('PASS: buscador multiformato, lectura acotada, estado y tests resumidos');
}finally{fs.rmSync(tmp,{recursive:true,force:true});}
