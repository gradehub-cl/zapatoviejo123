// Ficha académica acumulada en PDF: pdf.js entrega trozos de texto con su
// posición y acá se arman las filas y se leen. Datos sintéticos con la forma
// de la ficha UC; nada de notas, nombres ni RUT reales.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const raiz=path.join(__dirname,'..');
const leer=f=>fs.readFileSync(path.join(raiz,f),'utf8');
const stub={style:{setProperty(){},removeProperty(){}},classList:{add(){},remove(){},contains(){return false}},
  addEventListener(){},appendChild(){},setAttribute(){},removeAttribute(){},focus(){},querySelectorAll(){return []},
  value:'',innerHTML:'',textContent:'',dataset:{}};
const ctx={console,Intl,window:{addEventListener(){},matchMedia:()=>({matches:false,addEventListener(){},addListener(){}})},
  document:{getElementById:()=>stub,createElement:()=>stub,addEventListener(){},
    documentElement:stub,body:stub,querySelector:()=>stub,querySelectorAll:()=>[]},
  localStorage:{getItem(){return null},setItem(){},removeItem(){}},navigator:{},location:{origin:'',pathname:'/',hash:''},
  setTimeout,clearTimeout};
vm.createContext(ctx);
for(const f of ['data.js','engine.js','app.js'])vm.runInContext(leer(f),ctx,{filename:f});
const run=s=>vm.runInContext(s,ctx);
run(`S.tenant='uc';`);
let ok=0;
const check=(nombre,fn)=>{fn();ok++;console.log('  OK   '+nombre);};

// Un trozo de texto como lo entrega pdf.js: x e y en transform[4] y [5].
const item=(x,y,str)=>({str,transform:[1,0,0,1,x,y]});
const fila=(y,celdas)=>celdas.map(([x,t])=>item(x,y+(x%3===0?1:0),t)); // y no siempre exacta
const lineas=items=>{ctx.__i=items;return JSON.parse(run('JSON.stringify(lineasDeItemsPdf(__i))'));};
const ficha=ls=>{ctx.__l=ls;return JSON.parse(run('JSON.stringify(leerFichaAcademica(__l))'));};

const items=[
  item(194,734,'FICHA ACADÉMICA ACUMULADA'),
  item(59,678,'Estudiante:'),item(159,678,'Persona Sintética'),
  item(59,663,'Rut:'),item(159,663,'11.111.111-1'),
  ...fila(609,[[43,'SIGLA'],[94,'SEC.'],[126,'CRED.'],[159,'NOMBRE DEL CURSO'],[426,'NOTA(*)'],[475,'SEM.'],[511,'AÑO'],[538,'(**)']]),
  // Desordenados a propósito: pdf.js no promete el orden.
  ...fila(599,[[438,'6.2'],[43,'TST1001'],[98,'4'],[134,'10'],[159,'Ramo Sintético: ¿Uno?'],[482,'1'],[511,'2025']]),
  ...fila(589,[[43,'TST1002'],[100,'1'],[134,'10'],[159,'Ramo Sintético Dos'],[438,'3,4'],[482,'2'],[511,'2025']]),
  ...fila(579,[[43,'TST1003'],[100,'2'],[134,'5'],[159,'Ramo Sintético Tres'],[438,'5.0'],[482,'1'],[511,'2026']]),
  ...fila(569,[[43,'VRA0001'],[100,'1'],[136,'0'],[159,'Taller Sin Créditos'],[482,'1'],[511,'2026']]),
  ...fila(559,[[43,'VRA0002'],[100,'1'],[136,'0'],[159,'Examen Con Letra'],[439,'A'],[482,'1'],[511,'2026']]),
  ...fila(549,[[43,'TST1004'],[136,'10'],[159,'Ramo Convalidado'],[439,'5.5'],[482,'1'],[511,'2026'],[538,'(1)']]),
  ...fila(539,[[43,'TST1005'],[100,'3'],[134,'10'],[159,'Ramo Reprobado Con Letra'],[439,'R'],[482,'1'],[511,'2026']]),
  ...fila(529,[[43,'TST1006'],[100,'1'],[134,'10'],[159,'Ramo De Verano'],[439,'6.0'],[482,'3'],[511,'2026']]),
  item(523,195,'5,36'),item(522,216,'PPA'),
  // Página 2: carga académica actual, sin nota.
  ...fila(600,[[43,'TST2001'],[98,'13'],[134,'10'],[159,'Ramo En Curso'],[482,'2'],[511,'2026']]).map(i=>({...i,transform:[1,0,0,1,i.transform[4],i.transform[5]-1000]})),
];

check('arma una fila por altura, de izquierda a derecha y separada con tabulador',()=>{
  const ls=lineas(items);
  assert.ok(ls.includes('TST1001\t4\t10\tRamo Sintético: ¿Uno?\t6.2\t1\t2025'));
  assert.ok(ls.includes('SIGLA\tSEC.\tCRED.\tNOMBRE DEL CURSO\tNOTA(*)\tSEM.\tAÑO\t(**)'));
  assert.equal(ls[0],'FICHA ACADÉMICA ACUMULADA','de arriba hacia abajo');
});

check('lee sigla, créditos, nota y semestre de cada ramo con nota',()=>{
  const r=ficha(lineas(items));
  assert.deepEqual(r.filas.map(f=>[f.sigla,f.creditos,f.nota,f.periodo]),[
    ['TST1001',10,6.2,'2025-1'],
    ['TST1002',10,3.4,'2025-2'],
    ['TST1003',5,5,'2026-1'],
    ['TST1006',10,6,null],
  ]);
  assert.equal(r.filas[0].nombre,'Ramo Sintético: ¿Uno?');
});

check('no entran convalidados, notas con letra ni ramos sin créditos; se cuentan',()=>{
  // VRA0002 (A), TST1004 (convalidado), TST1005 (R). VRA0001 no tiene nota.
  assert.equal(ficha(lineas(items)).omitidos,3);
});

check('lo que se está cursando (sin nota) no se importa',()=>{
  assert.ok(!ficha(lineas(items)).filas.some(f=>f.sigla==='TST2001'));
});

check('no lee el nombre ni el RUT del encabezado',()=>{
  const r=JSON.stringify(ficha(lineas(items)));
  assert.doesNotMatch(r,/Persona Sintética|11\.111\.111/);
});

check('un semestre desconocido queda sin semestre y la revisión lo bloquea',()=>{
  const verano=ficha(lineas(items)).filas.find(f=>f.sigla==='TST1006');
  ctx.__f=verano;
  assert.equal(run(`bloqueoAvance(__f,[],'2026-2')`),'sin-semestre');
});

check('la misma sigla y semestre no se repite',()=>{
  const l='TST1001\t1\t10\tRamo\t5.0\t1\t2025';
  assert.equal(ficha([l,l]).filas.length,1);
});

check('texto que no es la ficha no produce filas',()=>{
  assert.deepEqual(ficha(['Hola','MAT1610 Cálculo I 5.0','202620 MAT1610']).filas,[]);
});

check('pdf.js se sirve desde este dominio y el deploy lo publica',()=>{
  for(const f of ['pdf.min.mjs','pdf.worker.min.mjs','LICENSE.txt'])assert.ok(fs.existsSync(path.join(raiz,'pdf',f)),f);
  const deploy=leer('.github/workflows/deploy.yml');
  for(const f of ['pdf/pdf.min.mjs','pdf/pdf.worker.min.mjs','pdf/LICENSE.txt'])assert.ok(deploy.includes(f),f);
  const src=leer('src/app/ficha-academica.js');
  assert.match(src,/const PDF_BASE='\/pdf\/'/);
  assert.doesNotMatch(src,/https?:\/\//,'ningún CDN ni servidor externo');
});

check('el modal ofrece subir la ficha primero y pegar el avance como alternativa',()=>{
  const html=leer('src/app/avance-curricular.js');
  const subir=html.indexOf('id="m-avance-ficha"'),pegar=html.indexOf('id="m-avance-texto"');
  assert.ok(subir>0&&pegar>subir);
  assert.match(html,/accept="application\/pdf,\.pdf"/);
});

console.log(`\nPASS: ${ok}   FAIL: 0`);
