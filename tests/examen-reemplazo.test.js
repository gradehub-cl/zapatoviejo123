// Entorno sintético, motor real sin presets como fixtures.
const fs=require('fs'),vm=require('vm'),path=require('path');
function entorno(){
 const nodo={style:{setProperty(){},removeProperty(){}},classList:{add(){},remove(){},toggle(){},contains(){return false}},addEventListener(){},appendChild(){},setAttribute(){},getAttribute(){return null},removeAttribute(){},querySelectorAll(){return[]},querySelector(){return nodo},dataset:{},value:'',innerHTML:''};
 const c={console,window:{addEventListener(){},matchMedia:()=>({matches:true,addEventListener(){},addListener(){}})},document:{getElementById:()=>nodo,createElement:()=>nodo,querySelector:()=>nodo,querySelectorAll:()=>[],documentElement:nodo,body:nodo,addEventListener(){}},localStorage:{getItem(){return null},setItem(){},removeItem(){}},navigator:{},location:{origin:'',pathname:'/',hash:''},setTimeout(){},clearTimeout(){}};
 vm.createContext(c);for(const f of ['data.js','engine.js','app.js'])vm.runInContext(fs.readFileSync(path.resolve(__dirname,'..',f),'utf8'),c);
 c.run=s=>vm.runInContext(s,c);return c;
};

// Reproductor de #937 convertido en test de npm test; UDD DR50/26 art.37.
const assert=require('assert/strict'),c=entorno();
c.run(`S.tenant='udd';S.ramos=[{id:'r',nombre:'Ramo sintético',creditos:6,origen:{tenant:'udd'},
 categorias:[{id:'p',nombre:'Parciales',peso:70,directNota:true,notas:[{id:'np',nombre:'Parciales',valor:2,peso:1}]},
 {id:'e',nombre:'Examen',peso:30,directNota:true,notas:[{id:'ne',nombre:'Examen',valor:2.8,peso:1}]}],
 gates:[{type:'group_min',catIds:['e'],min:3,cap:'self',efecto:'reemplazar',nombre:'Examen'}]}]`);
const actual=c.run('notaFinalOficial(ramoAvg(S.ramos[0]))');
assert.equal(actual,2.8,'la regla exige sustituir por examen 2.8, no topar');

c.run("delete S.ramos[0].gates[0].efecto");assert.equal(c.run('notaFinalOficial(ramoAvg(S.ramos[0]))'),2.2,'sin declaración se conserva el tope');
c.run("S.ramos[0].gates[0].efecto='reemplazar';S.ramos[0].categorias[0].notas=[]");assert.equal(c.run('notaNecesaria(S.ramos[0],2.5)'),1,'con el examen fijo la sustitución ya satisface la meta baja');assert(c.run('notaNecesaria(S.ramos[0])')>7,'el examen reprobado no se salva');
c.run("S.ramos[0].categorias[0].notas=[{id:'np',valor:6,peso:1}];S.ramos[0].categorias[1].notas=[]");assert(Math.abs(c.run('notaNecesaria(S.ramos[0])')-2.95)<1e-5);
const antes=c.run('JSON.stringify(S.ramos[0])');c.run('ramoAvg(S.ramos[0]);gatesActivas(S.ramos[0])');assert.equal(c.run('JSON.stringify(S.ramos[0])'),antes);
console.log('PASS: sustitución declarada, tope legado, solver y datos inmutables');

c.run(`var guardada=S.ramos[0];var firmaAntes=requisitosDeGrupo(guardada)[0].clave;delete guardada.gates[0].efecto;var firmaDespues=requisitosDeGrupo(guardada)[0].clave;`);assert.notEqual(c.run('firmaAntes'),c.run('firmaDespues'),'la sustitución se anuncia como cambio de pauta');
c.run(`var definirOriginal=definicionPreset;definicionPreset=()=>({evals:[['Parciales',70],['Examen',30]],grupos:[{nombre:'Examen',evals:['Examen'],min:3,cap:'self',efecto:'reemplazar'}]});var nuevo=presetRamo('Sintético','udd');definicionPreset=definirOriginal;`);assert.equal(c.run('nuevo.gates[0].efecto'),'reemplazar','el preset conserva la operación como dato');
