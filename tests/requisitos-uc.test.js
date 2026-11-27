// Requisitos UC: lee el texto del catálogo y dice si se cumplen con el
// historial. Siglas INVENTADAS (prefijo TST/QQQ/ZZZ) y personas sintéticas:
// no hay datos de nadie ni del catálogo real.
const fs=require('fs'),vm=require('vm'),path=require('path');
const raiz=path.join(__dirname,'..');
const elementos={};
function elemento(){return {innerHTML:'',textContent:'',value:'',disabled:false,checked:true,dataset:{},style:{setProperty(){}},
  classList:{add(){},remove(){},contains(){return true}},addEventListener(){},appendChild(){},focus(){},
  setAttribute(){},removeAttribute(){},querySelector(){return null}};}
const ctx={console,window:{addEventListener(){},matchMedia:()=>({matches:true,addEventListener(){},addListener(){}})},
  document:{getElementById:id=>elementos[id]||(elementos[id]=elemento()),querySelector:()=>elemento(),querySelectorAll:()=>[],
    createElement:elemento,addEventListener(){},documentElement:elemento(),body:elemento(),head:{appendChild(){}}},
  localStorage:{getItem(){return null},setItem(){},removeItem(){}},navigator:{},
  location:{origin:'https://gradehub.cl',pathname:'/',search:'',hash:''},history:{replaceState(){}},
  setTimeout,clearTimeout,requestAnimationFrame(){return 1},cancelAnimationFrame(){}};
vm.createContext(ctx);
for(const f of ['data.js','engine.js','app.js'])vm.runInContext(fs.readFileSync(path.join(raiz,f),'utf8'),ctx,{filename:f});
const run=c=>vm.runInContext(c,ctx);
let ok=0,fail=0;
const chk=(n,c)=>{if(c){ok++;console.log('  OK   '+n);}else{fail++;console.log('  FAIL '+n);}};
const plano=v=>JSON.parse(JSON.stringify(v));
const leer=t=>plano(ctx.requisitosLeer(t));
const set=a=>new Set(a);
const evaluar=(fila,c={})=>plano(ctx.evaluarRequisitosUC({sigla:'TST3000',...fila},{conHistorial:true,...c,
  aprobadas:set(c.aprobadas||[]),cursando:set(c.cursando||[]),enPlan:set(c.enPlan||[]),
  equivalencias:ctx.requisitosEquivalencias(c.filas||[])}));
const siglas=r=>r.faltan.map(f=>f.sigla+(f.co?'(c)':'')).join(' ');

console.log('\nLeer el texto del catálogo');
{
  chk('«No tiene» es sin prerrequisitos',leer('No tiene').arbol===null);
  chk('vacío y null son sin prerrequisitos',leer('').arbol===null&&leer(null).arbol===null);
  chk('una sigla',JSON.stringify(leer('TST1001').arbol)===JSON.stringify({tipo:'curso',sigla:'TST1001',co:false}));
  const a=leer('(TST1001 y TST1002) o QQQ2000 o ZZZ105A').arbol;
  chk('o de primer nivel con un y adentro',a.tipo==='o'&&a.partes.length===3&&a.partes[0].tipo==='y'&&a.partes[2].sigla==='ZZZ105A');
  const b=leer('TST1001 y TST1002 o TST1003').arbol;
  chk('«y» amarra más que «o»',b.tipo==='o'&&b.partes[0].tipo==='y'&&b.partes[1].sigla==='TST1003');
  const c=leer('FIS0001(c) y TST1001').arbol;
  chk('«(c)» pegado marca correquisito',c.partes[0].co===true&&c.partes[1].co===false);
  chk('«(c)» con espacios también',leer('TST1001 ( c )').arbol.co===true);
  chk('minúsculas y &nbsp; del HTML',leer('tst1001&nbsp;Y&nbsp;tst1002').arbol.partes[1].sigla==='TST1002');
  const d=leer('((TST1001 y TST1002) y TST1003)').arbol;
  chk('y anidados se aplanan',d.tipo==='y'&&d.partes.length===3);
}

console.log('\nLo que no se entiende no se adivina');
{
  chk('una palabra rara',ctx.requisitosLeer('TST1001 y Créditos>=100')===null);
  chk('paréntesis sin cerrar',ctx.requisitosLeer('(TST1001 y TST1002')===null);
  chk('conector colgando',ctx.requisitosLeer('TST1001 y')===null);
  chk('dos siglas sin conector',ctx.requisitosLeer('TST1001 TST1002')===null);
  const r=evaluar({prerrequisitos:'TST1001 y Requisito especial'});
  chk('queda ilegible con el texto original',r.estado==='ilegible'&&r.texto==='TST1001 y Requisito especial');
}

console.log('\nCumple o le falta');
{
  chk('aprobado: cumple',evaluar({prerrequisitos:'TST1001'},{aprobadas:['TST1001']}).estado==='cumple');
  const f=evaluar({prerrequisitos:'TST1001 y TST1002'},{aprobadas:['TST1001']});
  chk('le falta uno de un y',f.estado==='falta'&&siglas(f)==='TST1002'&&!f.otrasOpciones);
  const o=evaluar({prerrequisitos:'(TST1001 y TST1002 y TST1003) o QQQ2000'},{aprobadas:['TST1001']});
  chk('en un o propone la opción con menos faltantes',o.estado==='falta'&&siglas(o)==='QQQ2000'&&o.otrasOpciones);
  const o2=evaluar({prerrequisitos:'(TST1001 y TST1002) o QQQ2000'},{aprobadas:['TST1001']});
  chk('empate de cantidad: la primera opción',siglas(o2)==='TST1002');
  chk('cualquier opción del o basta',evaluar({prerrequisitos:'TST1001 o QQQ2000'},{aprobadas:['QQQ2000']}).estado==='cumple');
  chk('sin prerrequisitos',evaluar({prerrequisitos:'No tiene'}).estado==='sin_requisitos');
}

console.log('\nLo que está cursando ahora');
{
  const r=evaluar({prerrequisitos:'TST1001 y TST1002'},{aprobadas:['TST1001'],cursando:['TST1002']});
  chk('cumple si aprueba lo que cursa',r.estado==='si_apruebas'&&r.cursando.join()==='TST1002'&&!r.faltan.length);
  const m=evaluar({prerrequisitos:'TST1001 y TST1002'},{cursando:['TST1002']});
  chk('si además falta otro, manda el faltante',m.estado==='falta'&&siglas(m)==='TST1001');
  const o=evaluar({prerrequisitos:'TST1001 o QQQ2000'},{aprobadas:['QQQ2000'],cursando:['TST1001']});
  chk('si otra opción ya se cumple, cumple',o.estado==='cumple'&&!o.cursando.length);
}

console.log('\nCorrequisitos');
{
  chk('tomarlo el mismo semestre cumple',evaluar({prerrequisitos:'FIS0001(c) y TST1001'},{aprobadas:['TST1001'],enPlan:['FIS0001']}).estado==='cumple');
  chk('aprobado antes también',evaluar({prerrequisitos:'FIS0001(c)'},{aprobadas:['FIS0001']}).estado==='cumple');
  const r=evaluar({prerrequisitos:'FIS0001(c) y TST1001'},{aprobadas:['TST1001']});
  chk('si no está en el plan, falta y se marca como correquisito',r.estado==='falta'&&siglas(r)==='FIS0001(c)');
  chk('un prerrequisito normal en el plan NO cuenta',evaluar({prerrequisitos:'TST1001'},{enPlan:['TST1001']}).estado==='falta');
}

console.log('\nEquivalencias');
{
  const filas=[{sigla:'TST1001',equivalencias:'(TST0901 o QQQ0901)'}];
  chk('una equivalente aprobada cuenta',evaluar({prerrequisitos:'TST1001'},{aprobadas:['QQQ0901'],filas}).estado==='cumple');
  const vuelta=[{sigla:'TST0901',equivalencias:'(TST1001)'}];
  chk('vale en las dos direcciones',evaluar({prerrequisitos:'TST1001'},{aprobadas:['TST0901'],filas:vuelta}).estado==='cumple');
  const cadena=[{sigla:'TST1001',equivalencias:'(TST0901)'},{sigla:'TST0901',equivalencias:'(TST0801)'}];
  chk('no se encadenan',evaluar({prerrequisitos:'TST1001'},{aprobadas:['TST0801'],filas:cadena}).estado==='falta');
  chk('«No tiene» no agrega nada',ctx.requisitosEquivalencias([{sigla:'TST1001',equivalencias:'No tiene'}]).size===0);
}

console.log('\nRestricciones: se muestran, no se evalúan');
{
  const r=evaluar({prerrequisitos:'TST1001',relacion:'o',restricciones:'(Programa=Carrera Inventada)'});
  chk('con relación «o» se informa la salida',r.estado==='falta'&&r.restriccion.relacion==='o'&&r.restriccion.texto==='(Programa=Carrera Inventada)');
  chk('«No tiene» deja la restricción en null',evaluar({prerrequisitos:'TST1001',relacion:'No tiene',restricciones:'No tiene'},{aprobadas:['TST1001']}).restriccion===null);
  const y=evaluar({prerrequisitos:'TST1001',relacion:'y',restricciones:'(Programa=Carrera Inventada)'},{aprobadas:['TST1001']});
  chk('con «y» cumple los prerrequisitos y la restricción queda a la vista',y.estado==='cumple'&&y.restriccion.relacion==='y');
}

console.log('\nSin historial no se dice «te falta»');
{
  chk('pide el avance',evaluar({prerrequisitos:'TST1001'},{conHistorial:false}).estado==='sin_historial');
  chk('pero un ramo sin prerrequisitos sigue libre',evaluar({prerrequisitos:'No tiene'},{conHistorial:false}).estado==='sin_requisitos');
  chk('sin fila del catálogo: sin datos',plano(ctx.evaluarRequisitosUC(null)).estado==='sin_datos');
}

console.log('\nDesde el historial guardado');
{
  const ramo=(sigla,nota,extra={})=>({id:'r'+sigla,nombre:'Ramo '+sigla,sigla,creditos:10,avgOverride:nota,categorias:[],origen:{manual:true},...extra});
  ctx.__h=[{id:'h1',label:'2026-1',ramos:[ramo('TST1001',4.0),ramo('TST1002',3.94),ramo('TST1003',3.95),ramo('TST1004',null)]},
    {id:'h2',label:'2025-2',ramos:[ramo('QQQ2000',6.1),{id:'x',nombre:'Ramo sin sigla',avgOverride:6,categorias:[]}]}];
  ctx.__r=[ramo('ZZZ3000',null)];
  run(`S={...S,tenant:'uc',userName:'Persona Sintética',historial:__h,ramos:__r}`);
  const e=run('(()=>{const c=requisitosDesdeEstado();return {a:[...c.aprobadas].sort(),c:[...c.cursando],h:c.conHistorial};})()');
  chk('4,0 aprueba y 3,95 también (se redondea a 4,0)',e.a.includes('TST1001')&&e.a.includes('TST1003'));
  chk('3,94 no aprueba',!e.a.includes('TST1002'));
  chk('sin nota final no cuenta',!e.a.includes('TST1004'));
  chk('semestres más viejos también',e.a.includes('QQQ2000'));
  chk('lo de este semestre va como cursando',e.c.includes('ZZZ3000'));
  chk('hay historial con siglas',e.h===true);
  chk('un ramo de otra universidad no cuenta',run(`requisitosAprobadasDelHistorial([{ramos:[{...__h[0].ramos[0],origen:{tenant:'fen'}}]}],'uc').aprobadas.size`)===0);
  chk('una cuenta de otra universidad no tiene siglas UC',run(`requisitosAprobadasDelHistorial(__h,'fen').conHistorial`)===false);
  chk('archivado sin nota final cuenta como cursando, no como falta',run('requisitosDesdeEstado().cursando.has("TST1004")')===true);
  ctx.__p=[{ramos:[ramo('TST1001',null)]},...ctx.__h];
  chk('un pendiente no se marca como cursando si se aprobó en otro semestre',
    run(`requisitosDesdeEstado({...S,historial:__p}).cursando.has('TST1001')`)===false);
  run(`S={...S,tenant:'uc',userName:'Persona Sintética',historial:[],ramos:[]}`);
  chk('sin semestres: conHistorial falso',run('requisitosDesdeEstado().conHistorial')===false);
  run(`S={...S,careerSemestre:3,ramos:__r}`);
  chk('cursando sin semestres pasados en 3°: sigue pidiendo el avance',run('requisitosDesdeEstado().conHistorial')===false);
  run(`S={...S,careerSemestre:1,ramos:__r}`);
  chk('en 1° semestre lo que cursa basta',run('requisitosDesdeEstado().conHistorial')===true);
  run(`S={...S,careerSemestre:1,ramos:[]}`);
  chk('en 1° sin ramos: sin historial',run('requisitosDesdeEstado().conHistorial')===false);
  run(`S={...S,careerSemestre:null,ramos:[]}`);
  const antes=JSON.stringify(ctx.__h);
  run('requisitosAprobadasDelHistorial(__h)');
  chk('no modifica el historial',JSON.stringify(ctx.__h)===antes);
}

console.log(`\n${ok} OK, ${fail} FAIL`);
if(fail)process.exit(1);
