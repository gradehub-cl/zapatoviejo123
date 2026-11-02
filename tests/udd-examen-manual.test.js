// Entorno sintético de la app real, sin datos de catálogo ni red.
const fs=require('fs'),vm=require('vm'),path=require('path');
function entorno(){
 const nodo={style:{setProperty(){},removeProperty(){}},classList:{add(){},remove(){},toggle(){},contains(){return false}},addEventListener(){},appendChild(){},setAttribute(){},getAttribute(){return null},removeAttribute(){},querySelectorAll(){return[]},querySelector(){return nodo},dataset:{},value:'',innerHTML:''};
 const c={console,window:{addEventListener(){},matchMedia:()=>({matches:true,addEventListener(){},addListener(){}})},document:{getElementById:()=>nodo,createElement:()=>nodo,querySelector:()=>nodo,querySelectorAll:()=>[],documentElement:nodo,body:nodo,addEventListener(){}},localStorage:{getItem(){return null},setItem(){},removeItem(){}},navigator:{},location:{origin:'',pathname:'/',hash:''},setTimeout(){},clearTimeout(){}};
 vm.createContext(c);for(const f of ['data.js','engine.js','app.js'])vm.runInContext(fs.readFileSync(path.resolve(__dirname,'..',f),'utf8'),c);
 c.run=s=>vm.runInContext(s,c);return c;
};

// Reproductor de la auditoría convertido en test de npm test. UDD DR50/26 art.37.
const assert=require('assert/strict'),c=entorno();
c.run(`S.tenant='udd';S.ramos=[{id:'r',nombre:'Ramo sintético',creditos:6,origen:{tenant:'udd'},gates:[],categorias:[
{id:'p',nombre:'Pruebas',peso:60,directNota:true,notas:[{id:'np',nombre:'Pruebas',valor:6,peso:1}]},
{id:'e',nombre:'Examen',peso:40,directNota:true,notas:[{id:'ne',nombre:'Examen',valor:2.9,peso:1}]}]}]`);
const actual=c.run('notaFinalOficial(ramoAvg(S.ramos[0]))');
assert.equal(actual,2.9,'sin compuerta explícita, final del examen bajo 3,0');

const original=c.run('JSON.stringify(S.ramos[0])');
assert.equal(c.run('gatesActivas(S.ramos[0])[0].min'),3);
assert.equal(c.run('JSON.stringify(S.ramos[0])'),original,'la regla derivada no cambia notas ni guarda compuertas');
c.run("S.ramos[0].categorias[0].notas[0].valor=2;S.ramos[0].categorias[1].notas[0].valor=2.8");assert.equal(c.run('notaFinalOficial(ramoAvg(S.ramos[0]))'),2.8,'sustitución, no tope');
c.run("S.ramos[0].categorias[0].notas[0].valor=6;S.ramos[0].categorias[1].notas[0].valor=3");assert.equal(c.run('notaFinalOficial(ramoAvg(S.ramos[0]))'),4.8,'con 3,0 se usa la ponderación');
c.run("S.ramos[0].categorias[1].notas[0].valor=null");assert(Math.abs(c.run('notaNecesaria(S.ramos[0])')-2.95)<1e-5,'la meta respeta el mínimo redondeado');
c.run("S.ramos[0].categorias[1].notas[0].valor=2.9;S.ramos[0].origen.tenant='uc';S.tenant='uc'");assert.equal(c.run('notaFinalOficial(ramoAvg(S.ramos[0]))'),4.8,'otra universidad no hereda la norma');
c.run("S.tenant='udd';S.ramos[0].origen=null");assert.equal(c.run('notaFinalOficial(ramoAvg(S.ramos[0]))'),2.9,'ramo manual sin origen usa la universidad de su cuenta');
c.run("S.ramos[0].avgOverride=5");assert.equal(c.run('ramoAvg(S.ramos[0])'),5,'no cambia un final confirmado del archivo');
console.log('PASS: examen manual, sustitución, mínimo, solver, aislamiento y notas existentes');

c.run("delete S.ramos[0].avgOverride;S.ramos[0].categorias[1].notas[0].valor=2.95");assert.equal(c.run('gatesActivas(S.ramos[0]).length'),0,'mínimo a la décima');
c.run("S.ramos[0].categorias[1].notas[0].valor=2.9;S.ramos[0].categorias[0].notas=[]");assert(c.run('notaNecesaria(S.ramos[0])')>7,'examen cerrado bajo mínimo no se salva con parciales');
c.run("S.ramos[0].categorias[0].notas=[{id:'np',valor:6,peso:1}];S.ramos[0].categorias[1].nombre='Trabajo final'");assert.equal(c.run('notaFinalOficial(ramoAvg(S.ramos[0]))'),4.8,'no se adivina qué componente es examen');

c.run("S.ramos[0].categorias[1].nombre='Examen';S.ramos[0].categorias[1].notas[0].valor=2.8;S.ramos[0].categorias[0].notas=[]");assert.equal(c.run('notaNecesaria(S.ramos[0],2.5)'),1,'la sustitución ya cumple una meta menor que la aprobación');
