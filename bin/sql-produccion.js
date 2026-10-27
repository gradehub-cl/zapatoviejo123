#!/usr/bin/env node
// Qué SQL aplica en producción el workflow sql-produccion, y cómo.
//
//   node bin/sql-produccion.js supabase/a.sql supabase/b.sql
//   → "aplicar supabase/a.sql una" | "aplicar supabase/b.sql propia" | "manual supabase/c.sql"
//
// - `manual`: el archivo dice `-- sql-produccion: manual` (respaldos, limpiezas de
//   una vez, la prueba de aislamiento). Nunca se aplica solo: se corre a mano.
// - `una`: se corre entero dentro de una transacción (--single-transaction): si
//   algo falla, no queda nada a medias.
// - `propia`: el archivo ya trae su `begin;` y su `commit;`. Envolverlo en otra
//   transacción haría que su `commit` cerrara la de afuera a la mitad.
const fs = require('fs');

const MANUAL = /^--\s*sql-produccion:\s*manual\b/m;

function plan(archivos, leer = f => fs.readFileSync(f, 'utf8')) {
  return archivos
    .filter(f => /^supabase\/[\w-]+\.sql$/.test(f))
    .map(f => {
      const sql = leer(f);
      if (MANUAL.test(sql)) return { archivo: f, modo: 'manual' };
      return { archivo: f, modo: 'aplicar', transaccion: /^\s*begin\s*;/im.test(sql) ? 'propia' : 'una' };
    });
}

if (require.main === module) {
  for (const p of plan(process.argv.slice(2)))
    console.log(p.modo === 'manual' ? `manual ${p.archivo}` : `aplicar ${p.archivo} ${p.transaccion}`);
}

module.exports = { plan };
