// Dinámica se aprueba solo si la cátedra Y el laboratorio llegan cada uno a
// 4,0, pero la ficha y el simulador mostraban un único número combinado: quien
// iba bien en el lab no podía ver si la cátedra sola lo estaba dejando abajo.
// `partesDelVinculo` separa las dos partes y `htmlPartesVinculo` las pinta.
const fs=require('fs'),vm=require('vm');
const raiz=__dirname+'/../';
const stub={style:{setProperty(){},removeProperty(){}},addEventListener(){},appendChild(){},classList:{add(){},remove(){},contains(){return false}},value:'',innerHTML:'',textContent:'',focus(){},select(){},setAttribute(){},removeAttribute(){},getAttribute(){return null},querySelectorAll(){return[]},querySelector(){return stub},clientWidth:400,dataset:{},click(){}};
const ctx={window:{addEventListener(){},matchMedia:()=>({matches:true,addEventListener(){},addListener(){}})},document:{getElementById:()=>stub,createElement:()=>stub,addEventListener(){},documentElement:{style:{setProperty(){},removeProperty(){}},setAttribute(){},removeAttribute(){},getAttribute(){return null}},querySelector:()=>stub,querySelectorAll:()=>[],body:stub},localStorage:{getItem(){return null},setItem(){},removeItem(){}},navigator:{},location:{origin:'',pathname:'',hash:''},setTimeout,clearTimeout,console};
vm.createContext(ctx);
['data.js','engine.js','app.js'].forEach(f=>vm.runInContext(fs.readFileSync(raiz+f,'utf8'),ctx));
const g=n=>vm.runInContext(n,ctx);
let ok=0,fail=0;const chk=(n,c)=>{if(c){ok++;console.log('  OK   '+n);}else{fail++;console.log('  FAIL '+n);}};
const S=g('S');
const oficial=v=>g('notaFinalOficial')(v);

// La pauta va escrita acá: es un test de mecanismo y el catálogo se edita.
const catedra=(i2,examen)=>({id:'d',nombre:'Dinámica',color:'#3aa',creditos:10,origen:null,gates:[],
  aporta:{ramo:'Laboratorio de Dinámica',peso:30,min:4.0},categorias:[
  {id:'i1',nombre:'Interrogación 1',peso:25,notas:[{id:'a',valor:3.0,peso:1}]},
  {id:'i2',nombre:'Interrogación 2',peso:25,notas:i2==null?[]:[{id:'z',valor:i2,peso:1}]},
  {id:'co',nombre:'Controles',peso:20,slots:3,notas:[0,1,2].map(i=>({id:'c'+i,slot:i,valor:3.5,peso:1}))},
  {id:'ex',nombre:'Examen',peso:30,notas:examen==null?[]:[{id:'e',valor:examen,peso:1}]}]});
const laboratorio=nota=>({id:'l',nombre:'Laboratorio de Dinámica',color:'#a73',creditos:0,origen:null,gates:[],
  categorias:[{id:'x',nombre:'Nota',peso:100,notas:nota==null?[]:[{id:'n',valor:nota,peso:1}]}]});

console.log('\n=== Lab aprobado, cátedra cerrada bajo 4,0 ===');
{
  const din=catedra(3.5,4.0),lab=laboratorio(6.5);S.ramos=[din,lab];
  const p=g('partesDelVinculo')(din);
  const propio=g('calculoRamoConCompuertas')(din).valor;
  chk(`la cátedra sale sola (${propio.toFixed(2)}), no mezclada con el lab`,Math.abs(p.propio.valor-propio)<1e-9);
  chk('el lab sale con su propia nota',Math.abs(p.externo.valor-6.5)<1e-9);
  chk('la final es la más baja de las dos, como siempre',Math.abs(g('ramoAvg')(din)-propio)<1e-9);
  const html=g('htmlPartesVinculo')(din,{interactivo:true});
  chk('el recuadro no repite la cátedra, que ya está al lado del promedio',!html.includes('Cátedra ·'));
  chk('el lab dice que cumple su mínimo',/Laboratorio de Dinámica · 30%[\s\S]*Cumple el mínimo de 4\.0/.test(html));
  chk('el lab se puede abrir desde la ficha',html.includes(`openRamo('l')`));
  chk('en el simulador no se puede abrir',!g('htmlPartesVinculo')(din).includes('openRamo'));
  const solo=g('htmlSoloCatedra')(din);
  chk('al lado del promedio va la cátedra sola',solo.includes('Solo cátedra')&&solo.includes(`>${g('fmtPromedio')(propio)}<`));
}

console.log('\n=== Lab pendiente: cuánto le falta ===');
{
  const lab={...laboratorio(3.0),categorias:[{id:'x',nombre:'Nota',peso:100,slots:2,notas:[{id:'n',slot:0,valor:3.0,peso:1}]}]};
  const din=catedra(4.5,null);S.ramos=[din,lab];
  const p=g('partesDelVinculo')(din);
  // 3,0 y 4,9 dan 3,95, que ya es 4,0: no hace falta el 5,0 exacto.
  chk(`pide ${p.externo.necesaria} en lo que le queda al lab`,p.externo.necesaria>4.8&&p.externo.necesaria<=4.9);
  const html=g('htmlPartesVinculo')(din,{fmt:g('simConComa')});
  chk('el simulador lo escribe con coma',html.includes('Necesitas 4,9 en lo pendiente para el 4,0'));
}

console.log('\n=== El simulador desglosa la proyección, no lo guardado ===');
{
  const din=catedra(null,null);S.ramos=[din,laboratorio(5.0)];
  vm.runInContext(`simState={i2:[{id:'h1',valor:7.0}],ex:[{id:'h2',valor:7.0}]};simAusencias={};`,ctx);
  const proyectado=g('simProjectedRamo')(din);
  const p=g('partesDelVinculo')(proyectado);
  chk(`la cátedra proyectada (${p.propio.valor.toFixed(2)}) usa las notas hipotéticas`,
    Math.abs(p.propio.valor-g('calculoRamoConCompuertas')(proyectado).valor)<1e-9&&p.propio.valor>g('calculoRamoConCompuertas')(din).valor);
  chk('el lab proyectado sigue siendo el real',Math.abs(p.externo.valor-5.0)<1e-9);
  chk('el número de al lado es la cátedra proyectada, con coma',
    g('htmlSoloCatedra')(proyectado,{fmt:g('simConComa')}).includes(`>${g('fmtPromedio')(p.propio.valor).replace('.',',')}<`));
  vm.runInContext('simState={};',ctx);
}

console.log('\n=== Lab sin notas o sin agregar ===');
{
  const din=catedra(4.0,4.0);S.ramos=[din,laboratorio(null)];
  let html=g('htmlPartesVinculo')(din,{interactivo:true});
  chk('avisa que el promedio de arriba es solo la cátedra',html.includes('es solo la cátedra'));
  chk('sin notas de lab no se repite el mismo número al lado',g('htmlSoloCatedra')(din)==='');
  chk('el lab dice que no tiene notas',/Laboratorio de Dinámica · 30%[\s\S]*Sin notas todavía/.test(html));
  S.ramos=[din];
  html=g('htmlPartesVinculo')(din,{interactivo:true});
  chk('sin el lab entre sus ramos, lo dice',html.includes('No está entre tus ramos'));
  chk('y no ofrece abrir un ramo que no existe',!html.includes('openRamo'));
}

console.log('\n=== Lo que no tiene partes no cambia ===');
{
  const suelto={id:'s',nombre:'Suelto',color:'#3aa',creditos:10,origen:null,gates:[],categorias:[
    {id:'a',nombre:'Prueba',peso:100,notas:[{id:'n',valor:5.0,peso:1}]}]};
  S.ramos=[suelto];
  chk('un ramo sin vínculo no tiene partes',g('partesDelVinculo')(suelto)===null&&g('htmlPartesVinculo')(suelto)===''&&g('htmlSoloCatedra')(suelto)==='');
  const archivado={...catedra(5,5),avgOverride:5.5};S.ramos=[archivado,laboratorio(6)];
  chk('un ramo archivado con nota corregida a mano tampoco',g('partesDelVinculo')(archivado)===null);
}

console.log(`\n${ok} OK, ${fail} FAIL`);
process.exit(fail?1:0);
