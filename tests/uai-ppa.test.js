// Entorno sintético, motor real sin presets como fixtures.
const fs=require('fs'),vm=require('vm'),path=require('path');
function entorno(){
 const nodo={style:{setProperty(){},removeProperty(){}},classList:{add(){},remove(){},toggle(){},contains(){return false}},addEventListener(){},appendChild(){},setAttribute(){},getAttribute(){return null},removeAttribute(){},querySelectorAll(){return[]},querySelector(){return nodo},dataset:{},value:'',innerHTML:''};
 const c={console,window:{addEventListener(){},matchMedia:()=>({matches:true,addEventListener(){},addListener(){}})},document:{getElementById:()=>nodo,createElement:()=>nodo,querySelector:()=>nodo,querySelectorAll:()=>[],documentElement:nodo,body:nodo,addEventListener(){}},localStorage:{getItem(){return null},setItem(){},removeItem(){}},navigator:{},location:{origin:'',pathname:'/',hash:''},setTimeout(){},clearTimeout(){}};
 vm.createContext(c);for(const f of ['data.js','engine.js','app.js'])vm.runInContext(fs.readFileSync(path.resolve(__dirname,'..',f),'utf8'),c);
 c.run=s=>vm.runInContext(s,c);return c;
};

const assert=require('assert/strict'),c=entorno();
c.run(`S.tenant='uai';S.historial=[
 {id:'h1',label:'2026-1',ramos:[{id:'a',nombre:'Ramo sintético',sigla:'SYN100',creditos:6,avgOverride:2,categorias:[]}]},
 {id:'h2',label:'2026-2',ramos:[{id:'b',nombre:'Ramo sintético',sigla:'SYN100',creditos:6,notaOficial:6,categorias:[]}]}]`);
// Mismo reproductor de auditoría #937: 2 antes y 6 después, no promedio 4.
assert.equal(c.run('resumenPromedioAcademico(S.historial).nota'),6);
assert.equal(c.run('resumenPromedioAcademico(S.historial).reprobadasExcluidas'),1);
const antes=c.run('JSON.stringify(S.historial)');c.run('resumenPromedioAcademico(S.historial)');assert.equal(c.run('JSON.stringify(S.historial)'),antes);
c.run(`S.historial[1].ramos.push({id:'x',nombre:'Otro',sigla:'SYN200',creditos:6,avgOverride:4,categorias:[]});`);
assert.equal(c.run('resumenPromedioAcademico(S.historial).nota'),5,'pondera los intentos vigentes');
c.run(`S.historial[0].ramos.push({id:'ed',nombre:'Nombre libre',creditos:6,avgOverride:1,categorias:[],exclusionPromedio:'educacion_fisica'},
 {id:'ex',nombre:'Nombre libre',creditos:6,avgOverride:1,categorias:[],exclusionPromedio:'extraprogramatica'},
 {id:'co',nombre:'Nombre libre',creditos:6,avgOverride:1,categorias:[],exclusionPromedio:'convalidada'});`);
assert.equal(c.run('resumenPromedioAcademico(S.historial).nota'),5);assert.equal(c.run('resumenPromedioAcademico(S.historial).excluidas'),3);
assert.equal(c.run('gpa(S.historial[0].ramos)'),2,'PPP excluye las clasificaciones, pero conserva el reprobado en su semestre');
c.run('S.historial[0].gpa=1');assert.equal(c.run('gpaHistorial(S.historial[0])'),2,'no usa una caché anterior a la exclusión');
c.run('delete S.historial[1].ramos[1].creditos');assert.equal(c.run('resumenPromedioAcademico(S.historial).nota'),null,'sin créditos no inventa PPA simple');
c.run('S.historial[1].ramos[1].creditos=6;S.historial.reverse()');assert.equal(c.run('resumenPromedioAcademico(S.historial).nota'),5,'usa etiquetas, no orden del array');
c.run("S.historial[0].label='2025-2'");assert.equal(c.run('resumenPromedioAcademico(S.historial).reprobadasExcluidas'),0,'aprobar antes no excluye reprobar después');
c.run("S.historial[0].label='texto antiguo'");assert.equal(c.run('resumenPromedioAcademico(S.historial).reprobadasExcluidas'),0,'fecha desconocida no se adivina');
c.run("S.historial[0].label='2026-2';delete S.historial[0].ramos[0].sigla");assert.equal(c.run('resumenPromedioAcademico(S.historial).reprobadasExcluidas'),0,'un homónimo sin código no basta');
assert.equal(c.run("resumenPromedioAcademico(S.historial,'uc')"),null,'otra universidad conserva su regla');
c.run("S.ramos=[{id:'normal',nombre:'Sintético',categorias:[],exclusionPromedio:'convalidada'}];S.historial=[];normalize(S)");assert.equal(c.run('S.ramos[0].exclusionPromedio'),'convalidada','viaja en el estado sin migración');
assert(c.run("selectorExclusionPromedio(S.ramos[0],'s')").includes('Convalidada'));
console.log('PASS UAI art.28: exclusiones, recursadas posteriores, créditos, legado y lectura inmutable');
