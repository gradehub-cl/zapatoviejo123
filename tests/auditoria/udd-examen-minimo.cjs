// Falla conocida; ejecutar a mano. UDD DR50/26 art.37, pp.9–10.
// No es parte de npm test y no se corrige con un if en esta PR.
const assert=require('assert/strict'),c=require('./entorno.cjs')();
c.run(`S.tenant='udd';S.ramos=[{id:'r',nombre:'Ramo sintético',creditos:6,origen:{tenant:'udd'},gates:[],categorias:[
{id:'p',nombre:'Pruebas',peso:60,directNota:true,notas:[{id:'np',nombre:'Pruebas',valor:6,peso:1}]},
{id:'e',nombre:'Examen',peso:40,directNota:true,notas:[{id:'ne',nombre:'Examen',valor:2.9,peso:1}]}]}]`);
const actual=c.run('notaFinalOficial(ramoAvg(S.ramos[0]))');
assert.equal(actual,2.9,'FALLO CONOCIDO: sin compuerta UDD da '+actual+'; la regla general exige final del examen, 2.9');
