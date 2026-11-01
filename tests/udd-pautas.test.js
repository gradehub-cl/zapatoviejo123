// Pautas UDD (src/data/udd-pautas.js): que cada una cumpla lo que el
// Reglamento Académico exige a toda pauta, que diga de qué PDF salió y que la
// compuerta del examen (arts. 37 y 38) haga lo que dice el reglamento.
const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const raiz=__dirname+'/../';
const el=()=>({style:{setProperty(){},removeProperty(){}},classList:{add(){},remove(){},toggle(){},contains(){return false;}},
  addEventListener(){},appendChild(){},setAttribute(){},removeAttribute(){},getAttribute(){return null},
  querySelector(){return null},querySelectorAll(){return []},focus(){},value:'',innerHTML:'',textContent:'',dataset:{}});
const ctx={console,setTimeout(){return 1},clearTimeout(){},
  window:{addEventListener(){},matchMedia:()=>({matches:true,addEventListener(){},addListener(){}})},
  document:{getElementById:el,createElement:el,addEventListener(){},documentElement:el(),body:el(),
    head:{appendChild(){}},querySelector(){return null},querySelectorAll(){return []}},
  localStorage:{getItem(){return null},setItem(){},removeItem(){}},navigator:{},location:{hash:'',pathname:'/'},history:{replaceState(){}}};
vm.createContext(ctx);
for(const f of ['data.js','engine.js','app.js'])vm.runInContext(fs.readFileSync(raiz+f,'utf8'),ctx);
const run=s=>vm.runInContext(s,ctx);
run("S.tenant='udd'");

const P=run('PRESETS_UDD'),nombres=Object.keys(P);
const lineas=fs.readFileSync(raiz+'src/data/udd-pautas.js','utf8').split('\n');
// Bimestrales con un solo certamen: 70% de los parciales es 49% de la final,
// más que el examen. El art. 36 lo prohíbe salvo excepción de la Vicerrectoría;
// el programa lo publica así y así se carga.
const CERTAMEN_SOBRE_EXAMEN=new Set(['Fundamentos Filosóficos de la Psicología','Fundamentos Epistemológicos de la Psicología','Teorías Humanistas']);
assert.ok(nombres.length>=20,'las pautas UDD están');
for(const n of nombres){
  const ev=P[n].evals,examen=ev.find(e=>e[0]==='Examen');
  assert.equal(Math.round(ev.reduce((s,e)=>s+e[1],0)*1e6)/1e6,100,n+' suma 100');
  // Art. 36: una evaluación final de 30% a 50%, y ninguna parcial pesa lo
  // mismo o más que ella. Un grupo con casillas se mide por casilla.
  assert.ok(examen&&examen[1]>=30&&examen[1]<=50,n+': examen de 30% a 50%');
  const sobre=ev.filter(e=>e!==examen&&e[1]/(e[2]&&e[2].slots||1)>=examen[1]).map(e=>e[0]);
  assert.deepEqual([...sobre],CERTAMEN_SOBRE_EXAMEN.has(n)?['Certamen']:[],n+': ninguna parcial pesa lo que el examen');
  assert.equal(JSON.stringify(P[n].grupos),JSON.stringify([{nombre:'Examen',evals:['Examen'],min:3,cap:'self'}]),n+': compuerta de los arts. 37 y 38');
  assert.ok(P[n].reglasDelCurso.includes(run('REGLA_EXAMEN_UDD')),n+': avisa la regla del examen');
  assert.match(P[n].sigla,/^[A-Z]{3}\d{3}$/,n+': sigla del programa');
  // La fuente va en el comentario de cada pauta: URL del PDF y fecha de subida.
  const k=lineas.indexOf(`  '${n}':{`);let j=k;
  while(j>0&&/^\s*\/\//.test(lineas[j-1]))j--;
  const comentario=lineas.slice(j,k).join('\n');
  assert.match(comentario,new RegExp(`${P[n].sigla.slice(0,3)} ?${P[n].sigla.slice(3)}, https://www\\.udd\\.cl/wp-content/uploads/20\\d\\d/\\d\\d/\\S+\\.pdf`),n+': URL del programa');
  assert.match(comentario,/subido el\s+(\/\/\s+)?20\d\d-\d\d-\d\d/,n+': fecha del programa');
  const p=run(`presetRamo(${JSON.stringify(n)},'udd','UDD-PSICOLOGIA')`);
  assert.ok(p,n+' se carga');
  const idExamen=p.categorias.find(c=>c.nombre==='Examen').id;
  assert.equal(JSON.stringify(p.gates.map(g=>[g.type,g.catIds.join(),g.min,g.cap])),JSON.stringify([['group_min',idExamen,3,'self']]),n+': la compuerta llega al ramo');
}
// Créditos solo con el SCT que declara el programa: Arquitectura no lo trae.
assert.equal(run("presetRamo('Procesos Psicológicos','udd',null).creditos"),5);
assert.equal(run("presetRamo('Componentes de la Matemática','udd',null).creditos"),null);
// Dos nombres que la UDD usa para cursos distintos se quedan sin pauta hasta
// que el catálogo distinga carreras: "Métodos de Investigación" es de
// Psicología y de Diseño; "Análisis Estructural", de Arquitectura y de Obras
// Civiles. Y nada de la UDD se cruza con otra universidad.
assert.equal(run("presetRamo('Métodos de Investigación','udd','UDD-PSICOLOGIA')"),null);
assert.equal(run("presetRamo('Análisis Estructural','udd','UDD-ARQUITECTURA')"),null);
assert.equal(run("presetRamo('Procesos Psicológicos','uandes',null)"),null);
assert.ok(run("presetsFueraDeMalla('udd','UDD-PSICOLOGIA')").includes('Neurociencia'),'lo que no está en la malla se ofrece en el buscador');

// La compuerta, con una pauta sintética: parciales 70% y examen 30%.
const nota=(id,valor)=>({id,nombre:id,valor,peso:1});
const ramo=(parciales,examen)=>({id:'r',nombre:'Ramo UDD sintético',origen:{tenant:'udd'},
  categorias:[{id:'p',nombre:'Parciales',peso:70,directNota:true,notas:parciales===null?[]:[nota('a',parciales)]},
    {id:'e',nombre:'Examen',peso:30,directNota:true,notas:examen===null?[]:[nota('b',examen)]}],
  gates:[{type:'group_min',catIds:['e'],min:3,cap:'self',nombre:'Examen'}]});
const con=(p,e,expr)=>{ctx.r=ramo(p,e);run('S.ramos=[r]');return run(expr);};
assert.equal(con(7,2.9,'notaFinalOficial(ramoAvg(r))'),2.9,'el examen bajo 3,0 topa la final aunque el promedio dé 5,8');
assert.equal(con(7,2.9,'notaAprobadaRamo(r,ramoAvg(r))'),false);
assert.equal(con(7,2.9,'gatesActivas(r)[0].nombre'),'Examen','y lo avisa');
assert.equal(con(5,3.0,'notaFinalOficial(ramoAvg(r))'),4.4,'con 3,0 justo en el examen, cuenta el promedio');
assert.equal(con(5,3.0,'gatesActivas(r).length'),0);
// El reglamento no pide el 3,0 "sin aproximación" (el art. 27 de la UAndes sí):
// 2,95 se lee 3,0, como la nota final.
assert.equal(con(5,2.95,'gatesActivas(r).length'),0,'2,95 cumple el mínimo');
// Límite conocido: el art. 38 registra la nota del examen (2,8); la compuerta
// solo topa, y el promedio ya está más abajo. Reprueba igual. docs/mallas-udd.md.
assert.equal(con(2,2.8,'notaFinalOficial(ramoAvg(r))'),2.2);
assert.equal(con(2,2.8,'notaAprobadaRamo(r,ramoAvg(r))'),false);
// La nota necesaria respeta el mínimo: con 7,0 en parciales el promedio pediría
// 1,0, pero el examen tiene que llegar a 3,0 (2,95 sin redondear).
assert.ok(Math.abs(con(7,null,'notaNecesaria(r)')-2.95)<1e-6,'pide el mínimo del examen');
assert.ok(Math.abs(con(3,null,'notaNecesaria(r)')-37/6)<1e-6,'o lo que pida el promedio, si es más');

// De punta a punta con una pauta real: el examen se busca por nombre.
run(`(()=>{const p=presetRamo('Procesos Psicológicos','udd','UDD-PSICOLOGIA');
  const de=n=>p.categorias.find(c=>c.nombre===n);
  ['Certamen 1','Certamen 2','Trabajo grupal'].forEach((n,i)=>de(n).notas=[{id:'n'+i,nombre:n,valor:6.0,peso:1}]);
  de('Controles de lectura y ejercicios').notas=[{id:'c',nombre:'Control 1',valor:6.0,peso:1}];
  de('Examen').notas=[{id:'x',nombre:'Examen',valor:2.0,peso:1}];
  globalThis.r={id:'r',nombre:'Procesos Psicológicos',categorias:p.categorias,gates:p.gates,origen:{tenant:'udd',carrera:'UDD-PSICOLOGIA'}};
  S.ramos=[r];})()`);
assert.equal(run('notaFinalOficial(ramoAvg(r))'),2.0,'reprueba con la nota del examen');
assert.equal(run('notaAprobadaRamo(r,ramoAvg(r))'),false);
console.log('OK: pautas UDD con fuente, arts. 36 a 38 y la compuerta del examen');
