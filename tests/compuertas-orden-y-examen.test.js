// Requisitos que reemplazan la final: el resultado no depende del orden de las
// reglas y un requisito de grupo que incluye el examen no apaga el reglamento.
// Pautas sintéticas propias (no presetRamo), casos de la revisión del 26-11-2026.
const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('assert/strict');
function entorno(){
  const nodo={style:{setProperty(){},removeProperty(){}},classList:{add(){},remove(){},toggle(){},contains(){return false}},addEventListener(){},appendChild(){},setAttribute(){},getAttribute(){return null},removeAttribute(){},querySelectorAll(){return[]},querySelector(){return nodo},dataset:{},value:'',innerHTML:''};
  const c={console,window:{addEventListener(){},matchMedia:()=>({matches:true,addEventListener(){},addListener(){}})},document:{getElementById:()=>nodo,createElement:()=>nodo,querySelector:()=>nodo,querySelectorAll:()=>[],documentElement:nodo,body:nodo,addEventListener(){}},localStorage:{getItem(){return null},setItem(){},removeItem(){}},navigator:{},location:{origin:'',pathname:'/',hash:''},setTimeout(){},clearTimeout(){}};
  vm.createContext(c);for(const f of ['data.js','engine.js','app.js'])vm.runInContext(fs.readFileSync(path.resolve(__dirname,'..',f),'utf8'),c);
  c.run=s=>vm.runInContext(s,c);return c;
}
const c=entorno();
let ok=0;
const check=(nombre,fn)=>{fn();ok++;console.log('  ✓ '+nombre);};
// [id, nombre, peso, nota]
function ramo(tenant,filas,gates,origen){
  c.__r={id:'r',nombre:'Ramo sintético',creditos:10,gates:gates||[],origen:origen||null,categorias:filas.map(([id,nombre,peso,valor])=>(
    {id,nombre,peso,directNota:true,notas:valor==null?[]:[{id:'n'+id,nombre,valor,peso:1}]}))};
  c.run(`S.tenant='${tenant}';S.ramos=[__r];`);
}
const final=()=>c.run('notaFinalOficial(ramoAvg(S.ramos[0]))');
const teorica={type:'group_min',catIds:['t1','t2'],min:4,cap:'self',efecto:'reemplazar',nombre:'Teórica',origen:'editor'};
const practica={type:'group_min',catIds:['p1'],min:4,cap:'self',efecto:'reemplazar',nombre:'Práctica',origen:'editor'};
const porPartes=[['t1','Prueba 1',25,3.5],['t2','Prueba 2',25,3.5],['p1','Laboratorio',50,1.0]];

check('dos «la final es este promedio» que fallan: rige el menor, en cualquier orden',()=>{
  ramo('uc',porPartes,[teorica,practica]);assert.equal(final(),1);
  ramo('uc',porPartes,[practica,teorica]);assert.equal(final(),1);
});
check('un reemplazo no deshace un tope anterior',()=>{
  const filas=[['t1','Prueba',50,6],['ex','Examen',30,2],['p1','Laboratorio',20,3]];
  const tope={type:'min_grade_required',catId:'ex',min:3,cap:1.5,origen:'editor'};
  ramo('uc',filas,[tope,practica]);assert.equal(final(),1.5);
  ramo('uc',filas,[practica,tope]);assert.equal(final(),1.5);
});
const udd={tenant:'udd',carrera:'x'};
check('UDD: el reglamento (examen bajo 3,0 → final del examen) sigue rigiendo',()=>{
  ramo('udd',[['c1','Control',30,7],['so','Solemne',30,7],['ex','Examen',40,2]],[],udd);assert.equal(final(),2);
});
check('UDD: un requisito de grupo que incluye el examen no apaga el reglamento',()=>{
  ramo('udd',[['c1','Control',30,7],['so','Solemne',30,7],['ex','Examen',40,2]],
    [{type:'group_min',catIds:['so','ex'],min:4,cap:3.9,nombre:'Solemne y examen',origen:'editor'}],udd);
  assert.equal(final(),2);
});
check('UDD: un requisito propio no sube la final que dejó el reglamento',()=>{
  ramo('udd',[['c1','Control',30,1],['p1','Laboratorio',30,3.5],['ex','Examen',40,2]],[practica],udd);
  assert.equal(final(),2);
});
check('UDD: un mínimo puesto sobre el examen mismo sigue reemplazando al del reglamento',()=>{
  ramo('udd',[['so','Solemne',60,6],['ex','Examen',40,3.2]],
    [{type:'min_grade_required',catId:'ex',min:3.5,cap:3.9,origen:'editor'}],udd);
  assert.equal(final(),3.9);
});
check('sin requisitos incumplidos la final es el promedio ponderado',()=>{
  ramo('uc',[['t1','Prueba 1',25,5],['t2','Prueba 2',25,5],['p1','Laboratorio',50,6]],[teorica,practica]);
  assert.equal(final(),5.5);
  assert.equal(c.run('gatesActivas(S.ramos[0]).length'),0);
});
check('un reemplazo que falla puede subir la final respecto del promedio (regla oficial)',()=>{
  // Examen 2,0 con todo lo demás en 1,0: el reglamento UDD deja la final en 2,0.
  ramo('udd',[['c1','Control',60,1],['ex','Examen',40,2]],[],udd);assert.equal(final(),2);
});
console.log(`\nPASS: ${ok}   FAIL: 0`);
