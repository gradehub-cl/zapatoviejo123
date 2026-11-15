// Un solo interruptor para toda la app (HIG: Toggles).
//
// Había cinco dibujos distintos: 44×26 en Ajustes, 44×28 en la ficha, 48×28 en
// Clases, una casilla de 24 px en Alumnos. Ahora todos salen de una regla. Este
// test evita que vuelva a aparecer uno con medidas propias.
const fs = require('fs');
const css = fs.readFileSync(__dirname + '/../styles.css', 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
let ok = 0, fail = 0;
const chk = (n, c) => { if (c) { ok++; console.log('  OK   ' + n); } else { fail++; console.log('  FAIL ' + n); } };

const base = (css.match(/input\[type=checkbox\]\[role=switch\],\.toggle input\[type=checkbox\]\{([^}]*)\}/) || [])[1] || '';
chk('la regla única existe', !!base);
chk('riel de 51×31, como el de iOS', /width:51px/.test(base) && /height:31px/.test(base));
chk('con su margen llega a 44 pt de alto', /margin:6\.5px 0/.test(base));
chk('encendido usa el acento, no el semáforo', /:checked,\.toggle input\[type=checkbox\]:checked\{background:var\(--primary\);\}/.test(css));
chk('la perilla encendida se distingue en oscuro', /:checked::before\{[^}]*background:var\(--primary-fg\)/.test(css));
chk('tiene foco visible', /role=switch\]:focus-visible[^{]*\{outline:2px solid var\(--primary\)/.test(css));
chk('respeta movimiento reducido', /prefers-reduced-motion:reduce\)\{input\[type=checkbox\]\[role=switch\][^}]*transition:none/.test(css));

// Nadie más le pone ancho o alto a un interruptor.
const propias = [...css.matchAll(/([^{}]*(?:interruptor|\.toggle|role=switch)[^{}]*)\{([^}]*)\}/g)]
  .filter(([, sel, decl]) => /input/.test(sel) && !/^input\[type=checkbox\]\[role=switch\]/.test(sel.trim()) && !/^@/.test(sel.trim()) && /(^|;)\s*(width|height|appearance)\s*:/.test(decl));
chk(`ninguna otra regla redibuja un interruptor (${propias.length})`, propias.length === 0);

console.log(`\nPASS: ${ok}   FAIL: ${fail}`);
process.exit(fail ? 1 : 0);
