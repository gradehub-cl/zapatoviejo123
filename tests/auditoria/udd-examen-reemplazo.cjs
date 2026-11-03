// Falla conocida; UDD DR50/26 art.37, p.10. No forma parte de npm test.
const assert=require('assert/strict'),c=require('./entorno.cjs')();
c.run(`S.tenant='udd';S.ramos=[{id:'r',nombre:'Ramo sintético',creditos:6,origen:{tenant:'udd'},
 categorias:[{id:'p',nombre:'Parciales',peso:70,directNota:true,notas:[{id:'np',nombre:'Parciales',valor:2,peso:1}]},
 {id:'e',nombre:'Examen',peso:30,directNota:true,notas:[{id:'ne',nombre:'Examen',valor:2.8,peso:1}]}],
 gates:[{type:'group_min',catIds:['e'],min:3,cap:'self',nombre:'Examen'}]}]`);
const actual=c.run('notaFinalOficial(ramoAvg(S.ramos[0]))');
assert.equal(actual,2.8,'FALLO CONOCIDO: la compuerta topa y da '+actual+'; la regla exige sustituir por examen 2.8');
