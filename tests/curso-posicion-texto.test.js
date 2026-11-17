// Cómo se lee la comparación con el resto del curso. Nace de que no se entendía:
// la fila decía "75%" con "POR SOBRE" debajo, que puede leerse como un 75% por
// sobre alguien o como estar por sobre un 75.
const fs = require('fs'), vm = require('vm');
const raiz = __dirname + '/../';
const leer = f => fs.readFileSync(raiz + f, 'utf8');

let ok = 0, fail = 0;
const chk = (n, c) => { if (c) { ok++; console.log('  OK   ' + n); } else { fail++; console.log('  FAIL ' + n); } };

const stub = { style: { setProperty() {}, removeProperty() {} }, addEventListener() {}, appendChild() {}, classList: { add() {}, remove() {}, contains() { return false } }, value: '', innerHTML: '', textContent: '', focus() {}, select() {}, setAttribute() {}, removeAttribute() {}, getAttribute() { return null }, querySelectorAll() { return [] }, querySelector() { return stub }, clientWidth: 400, dataset: {}, click() {} };
const ctx = {
  window: { addEventListener() {}, matchMedia: () => ({ matches: true, addEventListener() {}, addListener() {} }) },
  document: {
    getElementById: () => ({ ...stub }), createElement: () => stub, addEventListener() {},
    documentElement: { style: { setProperty() {}, removeProperty() {} }, setAttribute() {}, removeAttribute() {}, getAttribute() { return null } },
    querySelector: () => stub, querySelectorAll: () => [], body: stub,
  },
  localStorage: { getItem() { return null }, setItem() {}, removeItem() {} },
  navigator: {}, location: { origin: '', pathname: '', hash: '' }, setTimeout, clearTimeout, console,
};
vm.createContext(ctx);
vm.runInContext(['data.js', 'engine.js', 'app.js', 'render-main.js', 'render-agenda.js'].map(leer).join('\n'), ctx);
// Si la función desaparece, esto sale en rojo diciendo cuál falta, en vez de
// reventar con un ReferenceError en la primera comprobación.
if (typeof vm.runInContext('typeof frasePosicionCurso', ctx) !== 'string' ||
    vm.runInContext('typeof frasePosicionCurso', ctx) !== 'function') {
  console.log('  FAIL falta frasePosicionCurso() en render-main.js');
  console.log('\nPASS: 0   FAIL: 1');
  process.exit(1);
}
const frase = (m, t) => vm.runInContext(`frasePosicionCurso(${m},${t})`, ctx);
const plano = (m, t) => frase(m, t).replace(/<[^>]+>/g, '');

console.log('=== La frase se entiende sola ===');
chk('dice "igual o por sobre el X%" y no un número suelto',
  plano(75, 12) === 'Igual o por sobre el 75% de tus 11 compañeros');
chk('el porcentaje va destacado dentro de la frase', /<b>75%<\/b>/.test(frase(75, 12)));

console.log('\n=== El denominador son los compañeros, no el total ===');
// curso_posicion divide por (total - 1): el porcentaje es contra los OTROS.
// Escribir el total correría el denominador y el número diría otra cosa.
chk('12 participantes son 11 compañeros', /de tus 11 compañeros/.test(plano(75, 12)));
chk('cinco participantes no muestran un porcentaje',plano(50,5)==='');
chk('diez participantes todavía son nueve compañeros',plano(50,10)==='');
chk('once participantes permiten comparar con diez compañeros',/de tus 10 compañeros/.test(plano(50,11)));
for(const total of [0,1,4,5,9,10,10.5,NaN,Infinity])chk('total insuficiente o inválido: '+total,vm.runInContext('posicionCursoVisible',ctx)({total,mejorQue:50})===false);
chk('nunca dice un número negativo de compañeros', plano(0,1)==='');

console.log('\n=== Ni 0 ni 100 se vuelven categóricos ===');
// mejor_que viene redondeado: 199 de 200 también llega como 100, y 1 de 300
// llega como 0. Decir "todos" o "ninguno" sería afirmar algo que puede ser falso.
chk('100% no dice "todos"', !/todos/i.test(plano(100, 12)) && /Igual o por sobre el 100%/.test(plano(100, 12)));
chk('0% no dice "ninguno" ni "último"', !/(ninguno|último|ultimo)/i.test(plano(0, 31)) && /Igual o por sobre el 0%/.test(plano(0, 31)));

console.log('\n=== No quedó nada del formato viejo ===');
const render = leer('render-main.js'), css = leer('styles.css');
chk('la fila ya no arma la columna del número suelto', !/stats-curso-val/.test(render));
chk('y su estilo no quedó huérfano en el CSS', !/stats-curso-val/.test(css));
chk('el estilo de la frase sí existe', /\.stats-curso-frase b\{/.test(css));

console.log('\n=== El total tiene que venir como número ===');
// Sin esta guarda un total que no sea número deja la frase diciendo "NaN".
chk('solo se guarda la posición si total y mejor_que son números',
  /typeof fila\.mejor_que==='number'&&typeof fila\.total==='number'/.test(leer('app.js')));

// Receptor real, con el SQL anterior todavía devolviendo grupos de cinco.
(async()=>{
  const run=s=>vm.runInContext(s,ctx),box={innerHTML:''};
  ctx.document.getElementById=id=>id==='stats-curso'?box:{...stub};
  run(`S={...S,tenant:'uc',ramos:[{id:'sintetico',nombre:'Ramo sintético',sigla:'SYN100',categorias:[],gates:[]}]};
    currentUser={id:'persona-sintetica'};subirNotasCurso=async()=>{};`);
  const antes=run('JSON.stringify(S)');
  for(const total of [4,5,10,11]){
    ctx.totalPrueba=total;
    run(`invalidarPosicionesCurso();supabaseClient={rpc:async()=>({data:[{total:totalPrueba,mejor_que:75}],error:null})};`);
    await run('pintarPosicionesCurso()');
    chk('render y receptor real con '+total+' participantes',total<11?!box.innerHTML.includes('%')&&box.innerHTML.includes('suficientes datos'):box.innerHTML.includes('75%')&&box.innerHTML.includes('10 compañeros'));
  }
  run(`_posCursoCache={sintetico:{total:5,mejorQue:75}}`);await run('pintarPosicionesCurso()');
  chk('una caché vieja tampoco filtra el porcentaje',!box.innerHTML.includes('%'));
  chk('cuenta existente conserva exactamente su JSON',run('JSON.stringify(S)')===antes);
  console.log('\nPASS: '+ok+'   FAIL: '+fail);process.exit(fail?1:0);
})().catch(e=>{console.error(e);process.exit(1)});
