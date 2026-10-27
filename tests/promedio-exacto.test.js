// El promedio sin redondear que aparece al tocar el número grande se TRUNCA a
// milésimas: redondeado, un 3,9499 se leería 3,950 y parecería que ya llega al
// 4,0. Tampoco puede verse como un botón: es texto, no un control.
const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const path=require('path');
const root=path.join(__dirname,'..');
const ctx={document:{getElementById:()=>null}};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(root,'render-main.js'),'utf8'),ctx);
const fmt=n=>vm.runInContext(`fmtPromedioExacto(${n})`,ctx);

assert.equal(fmt(3.9499),'3.949','se trunca, no se redondea');
assert.equal(fmt(3.9499999999999997),'3.95','un 3,95 que el punto flotante guarda bajo no pierde la milésima');
assert.equal(fmt(3.95),'3.95');
assert.equal(fmt(5.4),'5.40','al menos dos decimales');
assert.equal(fmt(4.71666),'4.716');
assert.equal(fmt(7),'7.00');

const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
assert.match(html,/<span class="promedio-exacto" id="home-gpa-exacto" hidden><\/span>/,'el general parte oculto');
assert.match(html,/<span class="promedio-exacto" id="ramo-hero-exacto" hidden><\/span>/,'el del ramo parte oculto');
const css=fs.readFileSync(path.join(root,'styles.css'),'utf8');
const regla=(css.match(/\.promedio-exacto\{[^}]*\}/)||[''])[0];
assert.ok(regla,'tiene estilo propio');
assert.doesNotMatch(regla,/cursor|background|border|underline/,'no se ve como un control');
console.log('OK: el promedio exacto se trunca y se muestra como texto');
