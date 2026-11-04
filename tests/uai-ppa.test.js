// UAI art. 28; pautas sintéticas propias, sin presets ni datos personales.
const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const elements=new Map(),store=new Map();
const el=()=>({style:{setProperty(){},removeProperty(){}},classList:{add(){},remove(){},contains(){return false}},value:'',innerHTML:'',dataset:{},addEventListener(){},appendChild(){},setAttribute(){},removeAttribute(){},getAttribute(){return null},querySelector(){return null},querySelectorAll(){return[]},focus(){},select(){}});
const stub=el(),ctx={console,setTimeout(){},clearTimeout(){},window:{addEventListener(){},matchMedia:()=>({matches:true,addEventListener(){}})},document:{getElementById:id=>{if(!elements.has(id))elements.set(id,el());return elements.get(id)},createElement:el,documentElement:stub,body:stub,addEventListener(){},querySelector(){return null},querySelectorAll(){return[]}},localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)},navigator:{},location:{origin:'',pathname:'/',hash:''}};
vm.createContext(ctx);for(const f of ['data.js','engine.js','app.js','render-main.js'])vm.runInContext(fs.readFileSync(__dirname+'/../'+f,'utf8'),ctx);
const run=s=>vm.runInContext(s,ctx);
const ramo=(id,nota,extra={})=>({id,nombre:'Ramo sintético',sigla:'SYN100',creditos:6,avgOverride:nota,categorias:[],...extra});
const historia=()=>[{id:'h1',label:'2026-1',gpa:2,ramos:[ramo('a',2)]},{id:'h2',label:'2026-2',gpa:6,ramos:[ramo('b',6)]}];
ctx.historia=historia();run("S.tenant='uai';S.historial=historia");
// Antes del arreglo el único acumulado de main entregaba 4,0.
assert.equal(run('promedioAcumuladoCierre(S.historial)'),6,'2,0 → 6,0: el PPA excluye la reprobación anterior');
assert.equal(run('gpaHistorial(S.historial[0])'),2,'el PPP conserva el 2,0 de su semestre');
assert.equal(run('gpa(S.historial[0].ramos)'),2);
const antes=run('JSON.stringify(S)');run('promedioAcumuladoCierre(S.historial);gpaHistorial(S.historial[0])');assert.equal(run('JSON.stringify(S)'),antes,'lectura sin migrar, borrar intentos ni recalcular cachés persistidas');
run('S.historial.reverse()');assert.equal(run('promedioAcumuladoCierre(S.historial)'),6,'ordena períodos, no el array');
run("S.historial[0].label='2025-2'");assert.equal(run('promedioAcumuladoCierre(S.historial)'),4,'aprobar antes no elimina una reprobación posterior');
run("S.historial[0].label='fecha desconocida'");assert.equal(run('promedioAcumuladoCierre(S.historial)'),4,'no adivina el período');
run("S.historial[0].label='2026-2';delete S.historial[0].ramos[0].sigla");assert.equal(run('promedioAcumuladoCierre(S.historial)'),4,'un homónimo sin código no es una recursada');
ctx.historia=historia();run('S.historial=historia');
for(const exclusion of ['educacion_fisica','extraprogramatica','convalidada']){
 ctx.excluido=ramo('x-'+exclusion,1,{sigla:'SYN-'+exclusion,exclusionPromedio:exclusion});run('S.historial[0].ramos.push(excluido)');
}
assert.equal(run('promedioAcumuladoCierre(S.historial)'),6,'las tres clasificaciones quedan fuera del PPA');
assert.equal(run('gpaHistorial(S.historial[0])'),2,'el PPP excluye clasificaciones incluso con gpa cacheado');
ctx.sinMarcar=ramo('normal',4,{nombre:'Educación Física',sigla:'SYN200'});run('S.historial[1].ramos.push(sinMarcar)');
assert.equal(run('promedioAcumuladoCierre(S.historial)'),5,'sin marcar se incluye: nunca infiere por nombre');
run('delete S.historial[1].ramos[1].creditos');assert.equal(run('promedioAcumuladoCierre(S.historial)'),null,'sin créditos conocidos no inventa un PPA simple');
run('S.historial[1].ramos[1].creditos=6;S.historial[1].ramos[0].notaOficial=7');assert.equal(run('promedioAcumuladoCierre(S.historial)'),5.5,'la final oficial manda');
ctx.historia=historia();run("S.historial=historia;S.historial[1].ramos[0].exclusionPromedio='convalidada'");assert.equal(run('promedioAcumuladoCierre(S.historial)'),2,'una aprobación excluida no borra el intento reprobado');
// Congelado del main 2aa43af (#937), para comparar ambos motores de lectura
// sin política. No consulta git ni conserva un acumulado alternativo en la app.
run(`function acumuladoAntes(historial){
 const finales=(historial||[]).flatMap(h=>ramosDelPromedio(h.ramos||[]).map(r=>({creditos:r.creditos,avgOverride:notaRamoParaResumen(r,h.ramos),categorias:[]}))).filter(r=>Number.isFinite(r.avgOverride));
 return gpa(finales);
}`);
const escenarios=[[],historia(),[{label:'2026-1',ramos:[ramo('x',3.946),ramo('y',6,{creditos:12})]}],
 [{label:'2026-1',ramos:[ramo('x',3,{creditos:undefined}),ramo('y',6)]}],
 [{label:'2026-1',ramos:[ramo('x',3,{creditos:0}),ramo('y',6,{creditos:0})]}],
 [{label:'2026-1',ramos:[ramo('x',2,{notaOficial:5,exclusionPromedio:'convalidada'}),ramo('y',6)]}],
 [{label:'2026-1',ramos:[{id:'parcial',nombre:'Pendiente',creditos:6,cierreIncompleto:true,categorias:[{id:'p',nombre:'Prueba',peso:100,directNota:true,slots:2,notas:[{id:'n',valor:5,peso:1}]}]},ramo('y',6)]}]];
for(const tenant of ['uc','uandes','udd','fen'])for(const h of escenarios){
 ctx.h=structuredClone(h);ctx.tenant=tenant;run('S.tenant=tenant');
 assert.equal(run('promedioAcumuladoCierre(h)'),run('acumuladoAntes(h)'),tenant+': idéntico a main sin política de exclusión');
}
run("S.tenant='uai';S.ramos=[{id:'r',nombre:'Nombre propio',creditos:6,categorias:[]}];S.historial=[]");
const json=run('JSON.stringify(S)');run('S=normalize(JSON.parse(JSON.stringify(S)))');assert(!run("'exclusionPromedio' in S.ramos[0]"),'normalizar no añade el campo opcional');
assert(run("selectorExclusionPromedio(S.ramos[0],'selector')").includes('for="selector"'));
elements.set('selector',{value:'convalidada'});run("guardarExclusionPromedio(S.ramos[0],'selector')");assert.equal(run('S.ramos[0].exclusionPromedio'),'convalidada');
run('S=normalize(JSON.parse(JSON.stringify(S)))');assert.equal(run('S.ramos[0].exclusionPromedio'),'convalidada','el spread existente conserva el campo, sin migración');
elements.set('selector',{value:''});run("guardarExclusionPromedio(S.ramos[0],'selector')");assert(!run("'exclusionPromedio' in S.ramos[0]"));
const cierre=fs.readFileSync(__dirname+'/../src/app/cierre-semestre.js','utf8'),stats=fs.readFileSync(__dirname+'/../src/render-main/estadisticas.js','utf8');
assert(!fs.readFileSync(__dirname+'/../app.js','utf8').includes('function resumenPromedioAcademico'));
assert.match(stats,/const acumulado=promedioAcumuladoCierre\(validos\)/);
assert.match(stats,/PPA estimado/);
assert.match(cierre,/selectorExclusionPromedio\(r,'hist-oficial-promedio'\)/,'también disponible en la final oficial de #937');
console.log('PASS UAI: único acumulado, PPP, exclusiones explícitas, cuentas existentes y equivalencia UC/UAndes/UDD/FEN');
