// Los majors de Ingeniería UC (UC-ING-*) traen su malla oficial de SIDING, pero
// cursan el mismo plan común que ING-PC: tienen que recibir los mismos
// programas oficiales y las mismas siglas. Si un major no heredara de ING-PC,
// elegir «Ingeniería · Major en Mecánica» dejaría a esa persona sin Cálculo I
// precargado, que es justo lo que este cambio no puede romper.
const fs = require('fs'), vm = require('vm');
const stub = { style: { setProperty() {}, removeProperty() {} }, addEventListener() {}, appendChild() {}, classList: { add() {}, remove() {}, contains() { return false } }, value: '', innerHTML: '', textContent: '', focus() {}, select() {}, setAttribute() {}, removeAttribute() {}, getAttribute() { return null }, querySelectorAll() { return [] }, querySelector() { return stub }, clientWidth: 400, dataset: {}, click() {} };
const ctx = {
  window: { addEventListener() {}, matchMedia: () => ({ matches: true, addEventListener() {}, addListener() {} }) },
  document: { getElementById: () => stub, createElement: () => stub, addEventListener() {}, documentElement: { style: { setProperty() {}, removeProperty() {} }, setAttribute() {}, removeAttribute() {}, getAttribute() { return null } }, querySelector: () => stub, querySelectorAll: () => [], body: stub },
  localStorage: { getItem() { return null }, setItem() {}, removeItem() {} },
  navigator: {}, location: { origin: '', pathname: '', hash: '' }, setTimeout, clearTimeout, console
};
vm.createContext(ctx);
vm.runInContext(['data.js', 'mallas-uc.js', 'engine.js', 'app.js'].map(f => fs.readFileSync(__dirname + '/../' + f, 'utf8')).join('\n'), ctx);
const run = e => vm.runInContext(e, ctx);

let ok = 0, fail = 0;
const chk = (n, cond) => { if (cond) ok++; else { fail++; console.log('  FAIL ' + n); } };

console.log('\n=== Cada major declarado tiene malla y hereda de ING-PC ===');
const majors = run("CARRERAS_DECLARABLES.uc.filter(c=>/^UC-ING-/.test(c.malla||''))");
chk('hay majors de Ingeniería declarados', majors.length >= 20);
for (const m of majors) {
  const malla = run('MALLAS_UC_EXTRA[' + JSON.stringify(m.malla) + ']');
  chk(m.malla + ' tiene malla', malla && Object.keys(malla).length >= 6);
  const nombres = Object.values(malla || {}).flat();
  chk(m.malla + ' sin ramos repetidos', new Set(nombres).size === nombres.length);
  chk(m.malla + ' solo nombres, sin siglas sueltas', nombres.every(n => typeof n === 'string' && n && !/^[A-Z]{3}\d{3,4}[A-Z]?$/.test(n)));
  chk(m.malla + ' hereda de ING-PC', run('carreraBaseUc(' + JSON.stringify(m.malla) + ')') === 'ING-PC');
}

console.log('\n=== Mismos programas y siglas que el plan común ===');
const firma = car => JSON.stringify(run('(()=>{const p=presetRamo("Cálculo I","uc",' + JSON.stringify(car) + ');return p&&p.categorias.map(c=>[c.nombre,c.peso])})()'));
chk('ING-PC tiene programa de Cálculo I', firma('ING-PC') !== 'null');
chk('Mecánica recibe el mismo programa de Cálculo I', firma('UC-ING-MECANICA') === firma('ING-PC'));
chk('Computación recibe el mismo programa de Cálculo I', firma('UC-ING-COMPUTACION') === firma('ING-PC'));
chk('findPresetName funciona para un major', run('findPresetName("Desafíos de la Ingeniería","uc","UC-ING-CIVIL")') === run('findPresetName("Desafíos de la Ingeniería","uc","ING-PC")'));
chk('sigla de Cálculo I para un major', run('siglaUC("Cálculo I","UC-ING-QUIMICA")') === 'MAT1610');

console.log('\n=== Las demás carreras no cambian ===');
chk('ING-PC se representa a sí misma', run('carreraBaseUc("ING-PC")') === 'ING-PC');
chk('COM se representa a sí misma', run('carreraBaseUc("COM")') === 'COM');
chk('Derecho se representa a sí misma', run('carreraBaseUc("UC-DERECHO")') === 'UC-DERECHO');
chk('la malla de ING-PC sigue igual en 1°', JSON.stringify(run('MALLA_UC["ING-PC"][1]')) === JSON.stringify(['Cálculo I', 'Álgebra Lineal', 'Química para Ingeniería', 'Desafíos de la Ingeniería', 'Filosofía: ¿Para Qué?']));
chk('un major sugiere ramos de 5° en adelante', (run('mallaDeCarrera("uc","UC-ING-MECANICA")[5]') || []).includes('Mecánica de Fluidos'));

console.log('\nPASS: ' + ok + '   FAIL: ' + fail);
process.exit(fail ? 1 : 0);
