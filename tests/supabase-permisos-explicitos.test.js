// Desde el 30-10-2026 Supabase ya no da permisos automáticos a anon,
// authenticated ni service_role sobre las tablas nuevas de `public` (#808). Una
// tabla creada sin decir quién la toca queda con el permiso que le tocó al
// proyecto ese día: en producción, todo; en una base nueva, nada. Por eso cada
// tabla de `public` declara sus permisos en el SQL, aunque sea para quitarlos
// todos y dejar las funciones como única puerta.
//
// service_role no se nombra: la app no lo usa (servidor y cliente entran con la
// clave publicable y funciones `security definer`, que corren como su dueño).
const fs = require('fs'), path = require('path');
const dir = path.join(__dirname, '..', 'supabase');
const sql = fs.readdirSync(dir).filter(f => f.endsWith('.sql'))
  .map(f => ({ f, txt: fs.readFileSync(path.join(dir, f), 'utf8').replace(/--.*$/gm, '') }));
const todo = sql.map(s => s.txt).join('\n');

let ok = 0, fail = 0;
const chk = (n, c) => { if (c) { ok++; console.log('  OK   ' + n); } else { fail++; console.log('  FAIL ' + n); } };

console.log('=== Cada tabla de public declara sus permisos ===');
const tablas = [];
for (const { f, txt } of sql)
  for (const m of txt.matchAll(/create\s+table\s+(?:if\s+not\s+exists\s+)?(?:public\.)?([a-z_][a-z0-9_]*)\s*\(/gi))
    tablas.push({ f, t: m[1].toLowerCase() });

chk('encuentra tablas que revisar', tablas.length > 10);
for (const { f, t } of tablas) {
  const declara = new RegExp(String.raw`\b(grant|revoke)\b[^;]*\bon\s+(table\s+)?[^;]*\bpublic\.` + t + String.raw`\b`, 'i');
  chk(`${t} (${f})`, declara.test(todo));
}

// El caso que motivó el test: la tabla nueva no puede quedar abierta a anon.
console.log('=== El patrón detecta una tabla sin permisos ===');
const sinPermisos = 'create table public.nueva (id int);';
chk('una tabla sin grant/revoke no pasa',
  !/\b(grant|revoke)\b[^;]*\bon\s+(table\s+)?[^;]*\bpublic\.nueva\b/i.test(sinPermisos));

console.log(`\n${ok} OK, ${fail} FAIL`);
if (fail) process.exit(1);
