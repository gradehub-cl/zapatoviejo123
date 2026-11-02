const assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {spawnSync}=require('node:child_process');
const {referencias,seleccionarJSON,buscar}=require('../bin/buscar-js');
const raiz=path.join(__dirname,'..');
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'gh-usos-json-'));
try{
  const docs=[{archivo:'src/app/ejemplo.js',simbolos:[{nombre:'calcular',linea:1,fin:3}],
    lineas:['function calcular(){',' return 5;','}',
      'const resultado=calcular();','// CALCULAR también aparece en comentarios',
      ' '.repeat(900)+'const tardio=calcular();']},
    {archivo:'supabase/ejemplo.sql',simbolos:[],lineas:["select 'calcular';"]}];
  const r=referencias(docs,'CALCULAR',{limite:2});
  assert.equal(r.total,4,'cuenta líneas textuales, sin incluir la definición JS conocida');
  assert.equal(r.resultados.length,2);
  assert.deepEqual(r.resultados.map(x=>x.linea),[4,5]);
  const largo=referencias(docs,'tardio').resultados[0];
  assert.ok(largo.nombre.includes('tardio'),'el fragmento incluye la coincidencia aunque esté al final de una línea larga');
  assert.ok(largo.nombre.length<=160);
  assert.ok(buscar(docs,'tardio')[0].nombre.includes('tardio'));
  assert.equal(referencias(docs,'inexistente').total,0);

  const datos={scripts:{test:'node test-sintetico.js'},ramos:[{nombre:'Ramo sintético',nota:null}],
    'a/b':{'~dato':42},'':false,volumen:Array.from({length:10000},(_,i)=>({nombre:'Ramo '+i}))};
  fs.writeFileSync(path.join(tmp,'datos.json'),JSON.stringify(datos));
  const leer=clave=>seleccionarJSON('datos.json',clave,{raiz:tmp});
  assert.equal(JSON.parse(leer('/scripts/test').texto),'node test-sintetico.js');
  assert.equal(JSON.parse(leer('/ramos/0/nombre').texto),'Ramo sintético');
  assert.equal(JSON.parse(leer('/ramos/0/nota').texto),null);
  assert.equal(JSON.parse(leer('/a~1b/~0dato').texto),42);
  assert.equal(JSON.parse(leer('/').texto),false,'JSON Pointer permite una clave vacía');
  assert.equal(JSON.parse(leer('/volumen/9999/nombre').texto),'Ramo 9999');
  assert.ok(leer('/scripts/test').texto.length<40,'no devuelve el JSON completo');
  for(const clave of ['/ramos/01','/ramos/length','/inexistente','/scripts/toString','/a~2b'])
    assert.throws(()=>leer(clave));
  assert.throws(()=>seleccionarJSON('../datos.json','/scripts',{raiz:tmp}));
  assert.throws(()=>seleccionarJSON('/etc/config.json','/scripts',{raiz:tmp}));
  assert.throws(()=>seleccionarJSON('.cache/datos.json','/scripts',{raiz:tmp}));
  const externo=path.join(os.tmpdir(),'gh-json-externo-'+path.basename(tmp)+'.json');
  try{
    fs.writeFileSync(externo,'{"dato":1}');fs.symlinkSync(externo,path.join(tmp,'enlace.json'));
    assert.throws(()=>seleccionarJSON('enlace.json','/dato',{raiz:tmp}),/fuera del repo/);
  }finally{fs.rmSync(externo,{force:true});}

  const cli=args=>spawnSync(process.execPath,[path.join(raiz,'bin/buscar-js.js'),...args],{encoding:'utf8',cwd:os.tmpdir()});
  let x=cli(['renderAlumnosProfesor','--referencias','--limite','2','--json']);
  assert.equal(x.status,0,x.stderr);
  assert.equal(JSON.parse(x.stdout).resultados.length,2);
  assert.ok(JSON.parse(x.stdout).total>=2);
  x=cli(['--archivo','package.json','--clave','/scripts','--lineas','2','--json']);
  assert.equal(x.status,0,x.stderr);
  assert.equal(JSON.parse(x.stdout).codigo.length,2);
  assert.deepEqual(JSON.parse(x.stdout).mostrando,[1,2]);
  assert.equal(JSON.parse(x.stdout).clave,'/scripts');
  x=cli(['--archivo','package.json','--clave','/scripts','--desde','3','--lineas','2','--json']);
  assert.deepEqual(JSON.parse(x.stdout).mostrando,[3,4]);
  for(const args of [['--referencias'],['--clave','/scripts'],['--archivo','package.json','--clave','scripts'],
    ['--ver','renderHome','--referencias'],['--clave','/scripts','--mapa'],
    ['--archivo','../../etc/config.json','--clave','/dato']])assert.equal(cli(args).status,1);
  console.log('PASS: referencias textuales y selección JSON acotadas, sin ejecutar datos ni salir del repo');
}finally{fs.rmSync(tmp,{recursive:true,force:true});}
