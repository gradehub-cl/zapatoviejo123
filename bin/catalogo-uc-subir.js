#!/usr/bin/env node
// Sube el catálogo UC de cursos-uc.js a la tabla public.catalogo_uc de Supabase.
// Lo corre .github/workflows/catalogo-uc.yml cada vez que cursos-uc.js cambia en
// main: antes había que regenerar el CSV y reimportarlo a mano en el panel, y
// mientras nadie lo hacía la búsqueda por servidor mostraba nombres viejos (#730).
//
//   SUPABASE_SECRET_KEY=sb_secret_… node bin/catalogo-uc-subir.js
//
// Las filas salen del mismo generador que el CSV (bin/catalogo-uc-csv.js), con
// la columna `busqueda` igual a la de la app. Es un upsert por sigla: agrega y
// corrige, nunca borra.
// ponytail: un curso que desaparece de cursos-uc.js queda en la tabla. Si llega
// a importar, borrar en una RPC las siglas que no vinieron.
const fs = require('fs');
const path = require('path');
const { filas } = require('./catalogo-uc-csv.js');

const LOTE = 1000;

async function subir({ lista, url, clave, fetch: pedir = fetch, lote = LOTE }) {
  for (let i = 0; i < lista.length; i += lote) {
    const parte = lista.slice(i, i + lote);
    const r = await pedir(`${url}/rest/v1/catalogo_uc?on_conflict=sigla`, {
      method: 'POST',
      headers: {
        apikey: clave,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify(parte),
    });
    if (!r.ok) throw new Error(`Supabase respondió ${r.status} en las filas ${i + 1}–${i + parte.length}: ${(await r.text()).slice(0, 300)}`);
  }
  return lista.length;
}

// La URL del proyecto es pública y vive en la app: se lee de ahí para no tener dos.
function urlDelProyecto() {
  const fuente = fs.readFileSync(path.join(__dirname, '..', 'app-session.js'), 'utf8');
  return (fuente.match(/const SUPABASE_URL\s*=\s*'([^']+)'/) || [])[1];
}

if (require.main === module) {
  const clave = process.env.SUPABASE_SECRET_KEY;
  if (!clave) {
    // Sin el secreto configurado no se falla el workflow en cada cambio del catálogo.
    console.log('::notice::Falta el secreto SUPABASE_SECRET_KEY: catalogo_uc no se actualizó.');
    process.exit(0);
  }
  const lista = filas();
  subir({ lista, url: urlDelProyecto(), clave })
    .then(n => console.log(`${n} cursos subidos a catalogo_uc`))
    .catch(e => { console.error(e.message); process.exit(1); });
}

module.exports = { subir, urlDelProyecto };
