// Entorno sintético, motor real sin presets como fixtures.
const fs=require('fs'),vm=require('vm'),path=require('path');
function entorno(){
 const nodo={style:{setProperty(){},removeProperty(){}},classList:{add(){},remove(){},toggle(){},contains(){return false}},addEventListener(){},appendChild(){},setAttribute(){},getAttribute(){return null},removeAttribute(){},querySelectorAll(){return[]},querySelector(){return nodo},dataset:{},value:'',innerHTML:''};
 const c={console,window:{addEventListener(){},matchMedia:()=>({matches:true,addEventListener(){},addListener(){}})},document:{getElementById:()=>nodo,createElement:()=>nodo,querySelector:()=>nodo,querySelectorAll:()=>[],documentElement:nodo,body:nodo,addEventListener(){}},localStorage:{getItem(){return null},setItem(){},removeItem(){}},navigator:{},location:{origin:'',pathname:'/',hash:''},setTimeout(){},clearTimeout(){}};
 vm.createContext(c);for(const f of ['data.js','engine.js','app.js'])vm.runInContext(fs.readFileSync(path.resolve(__dirname,'..',f),'utf8'),c);
 c.run=s=>vm.runInContext(s,c);return c;
};

const assert=require('assert/strict'),c=entorno();
c.run(`S.tenant='uc';var cat={id:'cat',nombre:'Cátedra sintética',creditos:10,aporta:{ramo:'Laboratorio sintético',sigla:'SYN154',peso:30,min:4},categorias:[{id:'pc',nombre:'Pruebas',peso:100,notas:[{id:'nc',valor:5,peso:1}]}]};var lab={id:'lab',nombre:'Nombre cambiado',sigla:'SYN154',creditos:0,categorias:[{id:'pl',nombre:'Informes',peso:100,notas:[{id:'nl',valor:6,peso:1}]}]};S.ramos=[cat,lab]`);
assert(Math.abs(c.run('ramoAvg(cat)')-5.3)<1e-8);
assert.equal(c.run('ramoVinculado(cat).id'),'lab','renombrar no rompe la sigla');
assert.equal(c.run('gpa(S.ramos)'),c.run('ramoAvg(cat)'),'no cuenta dos veces el aporte');
assert.equal(c.run('ramoAvg(lab)'),6);
c.run('cat.categorias[0].notas[0].valor=3');assert.equal(c.run('ramoAvg(cat)'),3);assert.equal(c.run('ramoAvg(lab)'),6,'el laboratorio conserva su propia nota');
c.run('cat.categorias[0].notas[0].valor=6;lab.categorias[0].notas[0].valor=3');assert.equal(c.run('ramoAvg(cat)'),3);assert.equal(c.run('ramoAvg(lab)'),3);
assert(c.run('notaNecesaria(cat)')>7,'laboratorio cerrado reprobado no se salva con cátedra');
c.run('lab.categorias[0].notas[0].valor=4');assert(Math.abs(c.run('ramoAvg(cat)')-5.4)<1e-8,'4.0 cumple el mínimo, sin cambiar la fórmula');
c.run("delete lab.sigla;lab.origen={ramoKey:'SYN154'}");assert.equal(c.run('ramoVinculado(cat).id'),'lab','origen.ramoKey también vincula');
c.run("delete lab.origen;delete cat.aporta.sigla;lab.nombre='Laboratorio sintético'");assert.equal(c.run('ramoVinculado(cat).id'),'lab','ramo legado por nombre');
c.run("cat.aporta.sigla='SYN154';lab.sigla='OTR999'");assert.equal(c.run('ramoVinculado(cat)'),null,'código distinto no se enlaza por homónimo');
c.run("S.ramos=[cat]");assert.equal(c.run('contextoVinculoRamo(cat).soloCatedra'),true);assert(c.run('contextoVinculoRamo(cat).html').includes('30%'));assert.equal(c.run('contextoVinculoRamo(cat).falta'),true);
const antes=c.run('JSON.stringify(S.ramos)');c.run('contextoVinculoRamo(cat);ramoVinculado(cat)');assert.equal(c.run('JSON.stringify(S.ramos)'),antes);
console.log('PASS Dinámica: enlace estable/legado, 70/30, acta propia, falta laboratorio y solver');
