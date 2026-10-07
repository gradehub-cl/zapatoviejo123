// `hidden` no oculta nada si el CSS de autor le da `display` al elemento: la
// regla del navegador pierde. Así quedaba un cuadro vacío al pie de Inicio (el
// aviso de instalar ya descartado) y "Espacio de profesor" visible en el menú
// para todos (2026-10-06). Cada elemento de index.html que nace con `hidden` y
// tiene una clase o id con `display` necesita su regla `[hidden]{display:none}`.
const fs = require('fs'), path = require('path');
const raiz = path.join(__dirname, '..');
const css = fs.readFileSync(path.join(raiz, 'styles.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
const html = fs.readFileSync(path.join(raiz, 'index.html'), 'utf8').replace(/<!--[\s\S]*?-->/g, '');
let ok = 0, fail = 0;
const chk = (n, c) => { if (c) { ok++; console.log('  OK   ' + n); } else { fail++; console.log('  FAIL ' + n); } };

const conDisplay = new Set(), conHidden = new Set();
for (const m of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
  for (const sel of m[1].split(',')) {
    const sujeto = sel.trim().split(/[\s>+~]+/).pop() || '';
    const toks = [...sujeto.matchAll(/([.#][\w-]+)/g)].map(x => x[1]);
    if (/\[hidden\]/.test(sujeto)) { if (/display\s*:\s*none/.test(m[2])) toks.forEach(t => conHidden.add(t)); continue; }
    // Solo reglas que aplican siempre, no las de un contexto (`.a .b`).
    if (sel.trim().split(/[\s>+~]+/).length > 1) continue;
    const d = m[2].match(/display\s*:\s*([\w-]+)/);
    if (d && d[1] !== 'none') toks.forEach(t => conDisplay.add(t));
  }
}
for (const tag of html.matchAll(/<[a-z][^<>]*\shidden[\s>][^<>]*>?/gi)) {
  const t = tag[0];
  const toks = [...(t.match(/\bclass="([^"]+)"/) || ['', ''])[1].split(/\s+/).filter(Boolean).map(c => '.' + c),
    ...((t.match(/\bid="([\w-]+)"/) || [])[1] ? ['#' + t.match(/\bid="([\w-]+)"/)[1]] : [])];
  const nombre = toks.join(' ') || t.slice(0, 40);
  const peligrosos = toks.filter(x => conDisplay.has(x) && !conHidden.has(x));
  if (!toks.some(x => conDisplay.has(x))) continue;
  chk(`${nombre} se oculta de verdad`, peligrosos.length === 0 || toks.some(x => conHidden.has(x)));
}
chk('se revisó el aviso de instalar', /instalar-aviso/.test(html));
console.log(`\nPASS: ${ok}   FAIL: ${fail}`);
process.exit(fail ? 1 : 0);
