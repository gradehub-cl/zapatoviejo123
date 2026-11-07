// Dinámica se aprueba solo si la cátedra Y el laboratorio llegan cada uno a
// 4,0, pero la ficha y el simulador mostraban un único número combinado: quien
// iba bien en el lab no podía ver si la cátedra sola lo estaba dejando abajo.
// `partesDelVinculo` separa las dos partes; la ficha y el simulador ponen la
// cátedra sola al lado del promedio y lo que falta para aprobar habla de ella.
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
  const solo=g('htmlSoloCatedra')(din);
  chk('al lado del promedio va la cátedra sola',solo.includes('Solo cátedra')&&solo.includes(`>${g('fmtPromedio')(propio)}<`));
  chk('con el exacto activado, agrega el promedio sin redondear',
    g('htmlSoloCatedra')(din,{exacto:v=>'exacto:'+v.toFixed(3)}).includes(`Solo cátedra · exacto:${propio.toFixed(3)}`));
}

console.log('\n=== Lo que falta para aprobar habla de la cátedra ===');
{
  const din=catedra(4.5,null);S.ramos=[din,laboratorio(6.5)];
  const {valor:nec,cual}=g('notaNecesariaParaAprobar')(din);
  chk(`pide ${nec&&nec.toFixed(2)} en el examen, para la cátedra`,nec>1&&nec<=7&&cual===' cátedra');
  // Seguir el consejo tiene que alcanzar: con esa nota la cátedra llega a 4,0.
  const puesta=Math.ceil((nec-1e-9)*10)/10;
  const cerrada=catedra(4.5,puesta);
  chk(`poniendo ${puesta} la cátedra queda en ${oficial(g('calculoRamoConCompuertas')(cerrada).valor)}`,
    oficial(g('calculoRamoConCompuertas')(cerrada).valor)>=4.0);
  // Y una décima menos no alcanza: no pide de más.
  const menos=Math.round((puesta-0.1)*10)/10,corta=catedra(4.5,menos);
  chk(`con ${menos} no llega`,oficial(g('calculoRamoConCompuertas')(corta).valor)<4.0);
  // En el simulador, con un control todavía pendiente.
  const conControl=catedra(4.5,null);conControl.categorias[2].notas=conControl.categorias[2].notas.slice(0,2);
  S.ramos=[conControl,laboratorio(6.5)];
  vm.runInContext('simState={};simAusencias={};',ctx);
  const necSim=g('notaNecesariaParaAprobar')(conControl).valor;
  const sim=g('simNotaNecesaria')(g('simProjectedRamo')(conControl));
  chk(`el simulador lo dice para la cátedra: "${sim&&sim.texto}"`,
    sim&&sim.texto===`Para aprobar cátedra necesitas ${g('simConComa')(g('nfNecesaria')(necSim))} en lo que queda`);
  const suelto={id:'s',nombre:'Suelto',color:'#3aa',creditos:10,origen:null,gates:[],categorias:[
    {id:'a',nombre:'Prueba',peso:50,notas:[{id:'n',valor:3.0,peso:1}]},{id:'b',nombre:'Examen',peso:50,notas:[]}]};
  S.ramos=[suelto];
  const sinLab=g('notaNecesariaParaAprobar')(suelto);
  chk('un ramo sin laboratorio sigue preguntando por el ramo entero',sinLab.cual===''&&Math.abs(sinLab.valor-g('notaNecesaria')(suelto))<1e-9);
}

console.log('\n=== El simulador muestra la proyección, no lo guardado ===');
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
  chk('sin notas de lab no se repite el mismo número al lado',g('htmlSoloCatedra')(din)==='');
  S.ramos=[din];
  chk('sin el lab entre sus ramos tampoco',g('htmlSoloCatedra')(din)==='');
}

console.log('\n=== Lo que no tiene partes no cambia ===');
{
  const suelto={id:'s',nombre:'Suelto',color:'#3aa',creditos:10,origen:null,gates:[],categorias:[
    {id:'a',nombre:'Prueba',peso:100,notas:[{id:'n',valor:5.0,peso:1}]}]};
  S.ramos=[suelto];
  chk('un ramo sin vínculo no tiene partes',g('partesDelVinculo')(suelto)===null&&g('htmlSoloCatedra')(suelto)==='');
  const archivado={...catedra(5,5),avgOverride:5.5};S.ramos=[archivado,laboratorio(6)];
  chk('un ramo archivado con nota corregida a mano tampoco',g('partesDelVinculo')(archivado)===null);
}

// Lucas, 2026-11-07: con la cátedra en 4,2 y el lab en 7,0 el 70/30 da 5,04,
// pero la cátedra sigue al borde de pasar a ser la final. El ramo va al borde.
console.log('\n=== Al borde por una de las partes ===');
{
  const cat=v=>({id:'d',nombre:'Dinámica',color:'#3aa',creditos:10,origen:null,gates:[],
    aporta:{ramo:'Laboratorio de Dinámica',peso:30,min:4.0},categorias:[{id:'t',nombre:'Todo',peso:100,notas:[{id:'a',valor:v,peso:1}]}]});
  const nivel=r=>g('nivelRamo')(r,g('ramoAvg')(r));
  let din=cat(4.2);S.ramos=[din,laboratorio(7.0)];
  chk(`cátedra 4,2 y lab 7,0: el promedio (${g('ramoAvg')(din).toFixed(2)}) sería verde, pero va al borde`,
    g('nivelNota')(g('ramoAvg')(din))==='good'&&nivel(din)==='warn');
  chk('y no se pinta verde',g('getColorRamo')(din,g('ramoAvg')(din))===g('getColor')(4.9));
  chk('sigue contando como aprobado',g('notaAprobadaRamo')(din,g('ramoAvg')(din)));
  din=cat(6.0);S.ramos=[din,laboratorio(4.3)];
  chk('lo mismo si el que está al borde es el lab',nivel(din)==='warn');
  din=cat(5.5);S.ramos=[din,laboratorio(6.0)];
  chk('con las dos partes sobre 5,0 queda bien',nivel(din)==='good'&&g('getColorRamo')(din,g('ramoAvg')(din))===g('getColor')(g('ramoAvg')(din)));
  din=cat(5.5);S.ramos=[din,laboratorio(null)];
  chk('sin nota de lab manda la cátedra sola',nivel(din)==='good');
}

console.log(`\n${ok} OK, ${fail} FAIL`);
process.exit(fail?1:0);
