// Una compuerta puede exigir su mínimo SIN aproximación (`exacto:true`). Es el
// art. 27 del Reglamento del Alumno UAndes: solo da examen quien tiene 3,0 de
// presentación "sin aproximación". Con la regla común, 2,96 se redondea a 3,0
// y la app diría que todavía puedes salvar el ramo en el examen.
const assert=require('node:assert/strict');
const motor=require(__dirname+'/../engine.js');
const calc=ramos=>motor.gh_crearCalculoRamo({normName:s=>String(s).toLowerCase(),copiarRecuperativo:()=>null,definicionPresetDelRamo:()=>null,ramos:()=>ramos,tenant:()=>'uandes'});
const nota=(id,valor)=>({id,nombre:id,valor,peso:1});
const ramo=(presentacion,exacto)=>({id:'r',nombre:'PEG sintético',categorias:[
  {id:'e1',nombre:'Ensayos',peso:70,slots:2,notas:presentacion.map((v,i)=>nota('n'+i,v))},
  {id:'ex',nombre:'Examen',peso:30,notas:[nota('x',7)]}],
  gates:[{type:'group_min',catIds:['e1'],min:3,cap:'self',nombre:'Presentación a examen',...(exacto?{exacto:true}:{})}]});

assert.equal(motor.gh_cumpleCompuerta(2.96,{min:3}),true,'la regla común aproxima: 2,96 cumple');
assert.equal(motor.gh_cumpleCompuerta(2.96,{min:3,exacto:true}),false,'exacta: 2,96 no cumple');
assert.equal(motor.gh_cumpleCompuerta(2.9999999999999996,{min:3,exacto:true}),true,'un 3,0 de punto flotante sí cumple');
assert.equal(motor.gh_cumpleCompuerta(3.05,{min:3,exacto:true}),true);

// 2,9 y 3,0 → presentación 2,95: sin examen. Con un 7 en el examen el
// promedio llegaría a 4,165; la compuerta lo topa en la presentación.
const exacta=ramo([2.9,3.0],true),c1=calc([exacta]);
assert.equal(c1.ramoAvg(exacta),2.95,'reprueba con la nota de presentación');
assert.equal(c1.gatesActivas(exacta).length,1,'y lo avisa');
const comun=ramo([2.9,3.0],false),c2=calc([comun]);
assert.ok(c2.ramoAvg(comun)>4,'sin exacto, 2,95 contaba como 3,0 y aprobaba');
// 2,9 y 3,1 → 3,0 justo (con punto flotante): da examen.
const justo=ramo([2.9,3.1],true),c3=calc([justo]);
assert.ok(c3.ramoAvg(justo)>4,'con 3,0 justo da examen');
assert.equal(c3.gatesActivas(justo).length,0);
console.log('OK: la compuerta exacta no aproxima el mínimo');
