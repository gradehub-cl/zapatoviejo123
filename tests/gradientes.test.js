// Los gradientes decorativos hablan con dos direcciones compartidas. Los de
// avance y los que muestran una nota son datos: se mantienen textualmente para
// que ordenar la estética no cambie qué entiende alguien de su ramo.
const fs = require('fs'), path = require('path');
const raiz = path.join(__dirname, '..');
const css = fs.readFileSync(process.env.GRADEHUB_CSS || path.join(raiz, 'styles.css'), 'utf8');
let ok = 0, fail = 0;
const chk = (nombre, condicion) => {
  if (condicion) { ok++; console.log('  OK   ' + nombre); }
  else { fail++; console.log('  FAIL ' + nombre); }
};
const regla = selector => (css.match(new RegExp(selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\{([^}]*)\\}')) || [])[1] || '';

console.log('\n=== Inventario de gradientes ===');
// Se cuentan los gradientes que PINTAN. Un `mask-image` también es un
// linear-gradient, pero no dibuja nada: recorta lo que ya está, y se usa para
// desvanecer un borde. Contarlos juntos hacía que agregar un desvanecido
// pareciera un gradiente decorativo de vuelta, que es lo que esta guarda existe
// para impedir.
const declaraciones = css.split(';');
const pintan = declaraciones.filter(d => /linear-gradient\(/.test(d) && !/mask-image/.test(d));
const total = pintan.reduce((n, d) => n + (d.match(/linear-gradient\(/g) || []).length, 0);
const enMascaras = (css.match(/linear-gradient\(/g) || []).length - total;
// Editorial reemplaza los tres de Home (decoración, avance y cierre) por una
// línea de identidad y un riel neutro. El resto sigue separado de esos cambios.
// 2026-10-26: Estadísticas cambió su tarjeta de avance (dos degradados) por un
// anillo neutro, y llegó la pista rayada de la barra centrada.
// 2026-10-27: la maqueta aprobada de Calificar profesor suma el oro de las estrellas.
// 2026-11-02: el Wrapped 2026-2 suma su cuadrícula y líneas; se conservan.
// La ficha añade un rayado funcional para el peso todavía pendiente.
// 2026-11-03: la tarjeta de clases de Inicio suma un relleno liso
// (`linear-gradient(var(--card),var(--card))`) que recorta el brillo del contorno.
chk(`hay 22 gradientes que pintan, incluidos Wrapped, peso pendiente de la ficha y el contorno de clases (${total}${enMascaras?` · ${enMascaras} más en máscaras`:''})`, total === 22);
chk('el sistema declara una dirección para superficies y otra para acentos',
  /--gradient-surface:150deg;--gradient-accent:135deg;/.test(css));

const decorativosSuperficie = ['.simg-hero', '.ag-event-priority-sec>.ag-priority-card', '.ag-priority-card', '.ag-empty'];
const decorativosAcento = ['.ramo-action.primary', '.ob-title-accent', '.btn-primary', '.accent-swatch', '.fondo-swatch'];
chk('las superficies decorativas que quedan usan el token de superficie',
  decorativosSuperficie.every(s => /linear-gradient\(var\(--gradient-surface\)/.test(regla(s))));
chk('los 5 acentos decorativos usan el token de acento',
  decorativosAcento.every(s => /linear-gradient\(var\(--gradient-accent\)/.test(regla(s))));

console.log('\n=== Avance: misma lectura antes y después ===');
chk('Home ya no usa un fondo degradado para medir el avance', !/--ramo-progress-end/.test(css));
chk('el onboarding conserva su barra funcional independiente', /linear-gradient\(90deg,var\(--primary\),var\(--accent\)\)/.test(regla('.ob-progress-bar')));
chk('el cierre de Home no usa un gradiente que pueda confundirse con aprobación', !/linear-gradient/.test(regla('.ramo-row.has-progress.is-complete')));

chk('el avance de Estadísticas ya no pinta un degradado', !/stats-progress-card/.test(css));

console.log('\n=== Las notas siguen siendo semánticas ===');
chk('los gradientes normalizados de notas mantienen 160 grados',
  /\.gpa-num\.good,[\s\S]*?linear-gradient\(160deg,/.test(css) && /\.ramo-num\.good,[\s\S]*?linear-gradient\(160deg,/.test(css));
chk('la urgencia mantiene su rojo literal, fuera del tema', /linear-gradient\(158deg,#ff8293 0%,#f31242 42%,#7a001b 100%\)/.test(css));
chk('la nota perfecta mantiene su verde literal, fuera del tema', /linear-gradient\(158deg,#7bffa8 0%,#2ecc40 45%,#12a52c 100%\)/.test(css));

console.log('\nPASS: ' + ok + '   FAIL: ' + fail);
process.exit(fail ? 1 : 0);
