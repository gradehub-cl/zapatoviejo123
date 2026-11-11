// Datos sintéticos con la forma del avance de Mi Portal UC; nada de notas reales.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const leer=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
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
const leerAvance=t=>{ctx.__t=t;return JSON.parse(run('JSON.stringify(leerAvanceCurricular(__t))'));};
const porSigla=(r,s)=>r.filas.filter(f=>f.sigla===s);

// Una celda por tabulador, con el código de período del portal antes de la sigla.
{
  const r=leerAvance([
    'Detalle de cumplimiento',
    '1 MAT Matemáticas',
    'TST1000\tRamo Sintético Uno\t10\tSí\t202320\tTST1000\tRamo Sintético Uno\t10\t5.4',
    'TST2000\tRamo Sintético Dos\t10\tSí\t202322\tTST2000\tRamo Sintético Dos\t10\t3,2',
    'TST3000\tRamo TAV\t5\tSí\t202410\tTST3000\tRamo TAV\t5\t6.0'
  ].join('\n'));
  assert.deepEqual(r.filas.map(f=>[f.sigla,f.nota,f.periodo]),[['TST1000',5.4,'2023-1'],['TST2000',3.2,'2023-2'],['TST3000',6,'TAV 2024']]);
  assert.equal(r.filas[0].nombre,'Ramo Sintético Uno');
}

// Una celda por línea, como al copiar desde el celular.
{
  const r=leerAvance('TST1000\nRamo Uno\n10\nSí\n202420\nTST1000\nRamo Uno\n10\n6,1\nTST2000\nRamo Dos\n10\nSí\n202420\nTST2000\nRamo Dos\n10\n4,0');
  assert.deepEqual(r.filas.map(f=>[f.sigla,f.nombre,f.nota,f.periodo]),[['TST1000','Ramo Uno',6.1,'2024-1'],['TST2000','Ramo Dos',4,'2024-1']]);
}

// El requisito de la malla no le gana al curso que lo cumplió.
assert.equal(leerAvance('OPT1000\tOptativo\t10\tSí\t202420\tTST5000\tCurso Real\t10\t5,0').filas[0].sigla,'TST5000');

// Semestre como encabezado, con los formatos que se ven en la concentración.
{
  const r=leerAvance('Primer semestre 2022\nTST1000 Ramo Uno 10 5,5\nTST2000 Ramo Dos 10 6,5\n2022/2\nTST3000 Ramo Tres 10 4,5\n1/2023\nTST4000 Ramo Cuatro 10 7,0\nTAV 2023\nTST5000 Ramo Cinco 5 1,0');
  assert.deepEqual(r.filas.map(f=>f.periodo),['2022-1','2022-1','2022-2','2023-1','TAV 2023']);
  assert.equal(r.filas[0].nombre,'Ramo Uno');
  assert.deepEqual(r.filas.map(f=>f.nota),[5.5,6.5,4.5,7,1]);
}

// Lo que no es nota de un ramo cursado no entra.
{
  const r=leerAvance([
    '202320\tTST1000\tConvalidado\t10\t6,0\t(1)',
    '202320\tTST2000\tRetirado\t10\tRetirado 4,0',
    '202320\tTST3000\tConceptual\t10\tA',
    'Promedio acumulado 5,6',
    '202320\tTST4000\tCréditos raros\t10\t8,5',
    '202320\tTST5000\tEn fecha\t10\t2024-10-05',
    'Sin semestre\nTST6000 Ramo 10 5,5'
  ].join('\n'));
  assert.deepEqual(porSigla(r,'TST1000'),[]);
  assert.deepEqual(porSigla(r,'TST2000'),[]);
  assert.deepEqual(porSigla(r,'TST3000'),[]);
  assert.deepEqual(porSigla(r,'TST4000'),[]);
  assert.deepEqual(porSigla(r,'TST5000'),[]);
  assert.equal(r.omitidos>=2,true);
}

// El semestre después de la nota, en la misma fila, no se confunde con el anterior.
{
  const r=leerAvance('TST1000\tRamo Uno\t10\t5,0\t202320\nTST2000\tRamo Dos\t10\t6,0\t202322\nTST3000\tRamo Tres\t10\t4,0\t202420');
  assert.deepEqual(r.filas.map(f=>[f.sigla,f.periodo]),[['TST1000','2023-1'],['TST2000','2023-2'],['TST3000','2024-1']]);
}

// Sin ningún semestre a la vista la fila se lee, pero no se puede importar.
assert.equal(leerAvance('TST1000 Ramo 10 5,5').filas[0].periodo,null);

// Reprobado y repetido en otro semestre son dos filas; duplicado exacto, una.
{
  const r=leerAvance('202320\tTST1000\tRamo\t10\t3,0\n202322\tTST1000\tRamo\t10\t5,0\n202322\tTST1000\tRamo\t10\t5,0');
  assert.deepEqual(r.filas.map(f=>[f.periodo,f.nota]),[['2023-1',3],['2023-2',5]]);
}

assert.deepEqual(leerAvance('').filas,[]);
// La escala de notas termina en 7,0.
assert.deepEqual(leerAvance('202320 TST1000 Nota inválida 7,1\n202320 TST2000 Nota válida 7,0').filas.map(f=>[f.sigla,f.nota]),[['TST2000',7]]);

// Cuenta existente: no se toca un semestre que ya está, ni el que va en curso.
{
  const b=(p,h,a='2026-2')=>{ctx.__f={periodo:p};ctx.__h=h;ctx.__a=a;return run('bloqueoAvance(__f,__h,__a)');};
  const hist=[{label:'2025-2'},{label:'TAV 2025'},{label:'Mi semestre raro'},null];
  assert.equal(b(null,hist),'sin-semestre');
  assert.equal(b('2026-2',hist),'en-curso');
  assert.equal(b('TAV 2027',hist),'en-curso');
  assert.equal(b('2025-2',hist),'ya-esta');
  assert.equal(b('TAV 2025',hist),'ya-esta');
  assert.equal(b('2025-1',hist),null);
}

// Lo viejo no queda arriba de lo nuevo, y lo existente sigue intacto.
{
  ctx.__h=[{id:'a',label:'2026-1',gpa:5.1,ramos:[{id:'x'}]},{id:'raro',label:'Mi semestre raro'},{id:'b',label:'2024-1'}];
  const antes=JSON.stringify(ctx.__h);
  run(`for(const label of ['2025-1','TAV 2024','2023-2','2026-2'])insertarEnHistorial(__h,{id:label,label});`);
  assert.deepEqual(ctx.__h.map(h=>h.label),['2026-2','2026-1','Mi semestre raro','2025-1','2024-1','TAV 2024','2023-2']);
  const quedan=JSON.stringify(ctx.__h.filter(h=>['a','raro','b'].includes(h.id)));
  assert.equal(quedan,antes);
}

// Guardar usa el mismo mecanismo que un semestre cargado a mano, y el promedio
// del semestre sale del motor.
{
  run(`S.historial=[{id:'viejo',label:'2022-1',gpa:6,ramos:[]}];
    avance={omitidos:0,bloqueadas:[],filas:[
      {sigla:'TST1000',nombre:'Uno',nota:6,periodo:'2023-1',creditos:10,marcada:true},
      {sigla:'TST2000',nombre:'Dos',nota:4,periodo:'2023-1',creditos:10,marcada:true},
      {sigla:'TST3000',nombre:'Tres',nota:7,periodo:'2023-2',creditos:10,marcada:false}]};
    save=()=>{};track=()=>{};closeModal=()=>{};renderHome=()=>{};renderStats=()=>{};showToast=()=>{};
    guardarAvanceCurricular();`);
  const h=JSON.parse(run('JSON.stringify(S.historial)'));
  assert.deepEqual(h.map(x=>x.label),['2023-1','2022-1']);
  assert.equal(h[0].manual,true);
  assert.equal(h[0].gpa,5);
  assert.deepEqual(h[0].ramos.map(r=>[r.nombre,r.sigla,r.avgOverride,r.creditos]),[['Uno','TST1000',6,10],['Dos','TST2000',4,10]]);
  assert.deepEqual(h[0].ramos[0].categorias,[]);
  assert.equal(h[1].id,'viejo');
}

// La opción existe solo donde está declarada.
run(`S.tenant='uc';`);assert.equal(run('avanceCurricularDisponible()'),true);
run(`S.tenant='fen';`);assert.equal(run('avanceCurricularDisponible()'),false);

// El catálogo puede terminar después de que la persona salió de la hoja o cambió de cuenta.
(async()=>{
  run("S.tenant='uc';");
  ctx.currentUser={id:'sintetico-1'};
  const campo={value:'202320 TST1000 Ramo sintético 10 5,5'};
  let abierto=true,terminar;
  ctx.document.getElementById=id=>({
    'm-avance-texto':campo,'m-avance-leer':{},modal:{classList:{contains:()=>abierto}}
  }[id]||null);
  ctx.__catalogo=new Promise(resolve=>{terminar=resolve;});
  run('cargarCursosUC=()=>__catalogo;renderRevisionAvance=()=>{throw Error("La hoja se había cerrado");};');
  const leyendo=run('leerAvancePegado()');
  abierto=false;
  terminar(false);
  await leyendo;
  console.log('avance-curricular OK');
})().catch(error=>{console.error(error);process.exitCode=1;});
