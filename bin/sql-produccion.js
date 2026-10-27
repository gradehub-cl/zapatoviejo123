#!/usr/bin/env node
// La base de producción de Supabase, desde este Mac (pedido de Martín, 2026-10-27).
//
//   node bin/sql-produccion.js consultar "select … from public.errores_app …"
//   node bin/sql-produccion.js aplicar supabase/resumen_semanal.sql [más archivos]
//
// - consultar: SOLO LECTURA. Va con `read_only` de la API y, antes de correrla,
//   se comprueba que la sesión de verdad sea de solo lectura
//   (`show transaction_read_only` = on); si no, no se manda. Sirve para revisar
//   errores, comentarios o la salud de los datos sin que nadie pegue resultados.
// - aplicar: cada archivo pide confirmación en un diálogo de macOS ("Aplicar" /
//   "Cancelar"), que tiene que apretar una persona. Sin ese clic no se manda nada.
//   Cada archivo corre entero o nada: sin `begin;` propio se envuelve en una
//   transacción; con `begin;`/`commit;` se respeta el suyo. Los marcados
//   `-- sql-produccion: manual` (respaldos, limpiezas de una vez) no se aplican.
//
// Usa la API de administración de Supabase con un token personal guardado en el
// Llavero de macOS (servicio `gradehub-supabase`), nunca en el repo ni en el chat:
//   security add-generic-password -a "$USER" -s gradehub-supabase -w
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const raiz = path.join(__dirname, '..');
const MANUAL = /^--\s*sql-produccion:\s*manual\b/m;

function plan(archivos, leer = f => fs.readFileSync(path.resolve(raiz, f), 'utf8')) {
  return archivos
    .filter(f => /^supabase\/[\w-]+\.sql$/.test(f))
    .map(f => {
      const sql = leer(f);
      if (MANUAL.test(sql)) return { archivo: f, modo: 'manual', sql };
      return { archivo: f, modo: 'aplicar', transaccion: /^\s*begin\s*;/im.test(sql) ? 'propia' : 'una', sql };
    });
}

// Lo que viaja a la API: entero o nada.
function consultaDe(p) {
  return p.transaccion === 'una' ? `begin;\n${p.sql}\ncommit;` : p.sql;
}

// Una consulta de lectura no puede abrir ni cerrar transacciones: con un
// `commit;` podría salirse del modo de solo lectura.
function consultaDeLectura(sql) {
  if (/\b(commit|rollback|abort)\b/i.test(sql) || /^\s*(begin|end|start\s+transaction)\b/im.test(sql))
    throw new Error('Una consulta no puede abrir ni cerrar transacciones: para cambiar algo, usa aplicar con un archivo.');
  return sql;
}

async function consultar(sql, conexion) {
  const consulta = consultaDeLectura(sql);
  const modo = await enviar('show transaction_read_only', { ...conexion, soloLectura: true });
  if (!Array.isArray(modo) || !modo[0] || modo[0].transaction_read_only !== 'on')
    throw new Error('La API no confirmó el modo de solo lectura: no se corrió la consulta.');
  return enviar(consulta, { ...conexion, soloLectura: true });
}

function refDelProyecto() {
  const fuente = fs.readFileSync(path.join(raiz, 'app-session.js'), 'utf8');
  return (fuente.match(/const SUPABASE_URL\s*=\s*'https:\/\/([a-z0-9]+)\.supabase\.co'/) || [])[1];
}

function tokenDelLlavero() {
  try {
    return execFileSync('security', ['find-generic-password', '-s', 'gradehub-supabase', '-w'], { encoding: 'utf8' }).trim();
  } catch {
    throw new Error('No encontré el token en el Llavero (servicio gradehub-supabase). Guárdalo con:\n  security add-generic-password -a "$USER" -s gradehub-supabase -w');
  }
}

// El diálogo lo aprieta una persona. Devuelve true solo con "Aplicar".
function confirmarEnMac(p) {
  const lineas = p.sql.split('\n').length;
  const texto = `¿Aplicar ${p.archivo} en la base de PRODUCCIÓN de GradeHub?\n\n${lineas} líneas · `
    + (p.transaccion === 'una' ? 'entero o nada (una transacción)' : 'con su propio begin/commit');
  try {
    const r = execFileSync('osascript', ['-e',
      `display dialog ${JSON.stringify(texto)} with title "GradeHub · SQL" buttons {"Cancelar", "Aplicar"} default button "Cancelar" cancel button "Cancelar" with icon caution`],
    { encoding: 'utf8' });
    return /button returned:Aplicar/.test(r);
  } catch { return false; }
}

async function enviar(sql, { ref, token, pedir = fetch, soloLectura = false }) {
  const r = await pedir(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(soloLectura ? { query: sql, read_only: true } : { query: sql }),
  });
  const cuerpo = await r.text();
  if (!r.ok) throw new Error(`Supabase respondió ${r.status}: ${cuerpo.slice(0, 500)}`);
  return cuerpo ? JSON.parse(cuerpo) : null;
}

async function aplicar(archivos, { confirmar = confirmarEnMac, ...conexion }, log = console.log) {
  const pasos = plan(archivos, conexion.leer);
  if (!pasos.length) throw new Error('Nada que aplicar: pasa archivos supabase/<tema>.sql.');
  for (const p of pasos) {
    if (p.modo === 'manual') { log(`– ${p.archivo}: es solo a mano (SQL Editor). No se aplicó.`); continue; }
    if (!confirmar(p)) { log(`– ${p.archivo}: cancelado. No se aplicó nada más.`); return false; }
    await enviar(consultaDe(p), conexion);
    log(`✓ ${p.archivo} aplicado en producción`);
  }
  return true;
}

if (require.main === module) {
  const [accion, ...resto] = process.argv.slice(2);
  (async () => {
    const conexion = { ref: refDelProyecto(), token: tokenDelLlavero() };
    if (accion === 'consultar' && resto.length) {
      console.log(JSON.stringify(await consultar(resto.join(' '), conexion), null, 2));
    } else if (accion === 'aplicar' && resto.length) {
      if (!(await aplicar(resto, conexion))) process.exitCode = 1;
    } else {
      console.error('Uso:\n  node bin/sql-produccion.js consultar "select …"\n  node bin/sql-produccion.js aplicar supabase/<tema>.sql');
      process.exitCode = 2;
    }
  })().catch(e => { console.error(e.message); process.exit(1); });
}

module.exports = { plan, consultaDe, consultaDeLectura, consultar, aplicar, enviar, refDelProyecto };
