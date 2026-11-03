// Falla conocida del acumulado genérico frente al PPA UAI, art.28, 2026.
// Reproductor explícito, fuera de npm test. Requiere política/datos de recursadas.
const assert=require('assert/strict'),c=require('./entorno.cjs')();
c.run(`S.tenant='uai';S.historial=[
{id:'h1',label:'2026-1',ramos:[{id:'r1',nombre:'Ramo sintético',sigla:'SYN100',creditos:6,avgOverride:2,categorias:[]}]},
{id:'h2',label:'2026-2',ramos:[{id:'r2',nombre:'Ramo sintético',sigla:'SYN100',creditos:6,notaOficial:6,categorias:[]}]}]`);
const actual=c.run('promedioAcumuladoCierre(S.historial)');
assert.equal(actual,6,'FALLO CONOCIDO: el promedio genérico incluye el intento reprobado y da '+actual+'; el PPA UAI debe excluirlo');
