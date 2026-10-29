#!/usr/bin/env node
// Une fuentes por tema, sin transformar ni envolver el código. Conserva el
// ámbito y el hoisting de cada script clásico. No necesita paquetes npm.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createHash } = require('node:crypto');
const RAIZ = path.resolve(__dirname, '..');
const hash = texto => createHash('sha256').update(texto).digest('hex');
function escribirAtomico(destino, contenido) {
  const temporal = destino + '.gh-tmp-' + process.pid;
  try { fs.writeFileSync(temporal, contenido); fs.renameSync(temporal, destino); }
  finally { if (fs.existsSync(temporal)) fs.unlinkSync(temporal); }
}

function leerOrden(raiz = RAIZ) {
  const orden = JSON.parse(fs.readFileSync(path.join(raiz, 'src/orden.json'), 'utf8'));
  if (!orden || Array.isArray(orden) || typeof orden !== 'object' || !Object.keys(orden).length)
    throw new Error('src/orden.json debe declarar los scripts y sus fuentes.');
  const vistos = new Set();
  for (const [salida, fuentes] of Object.entries(orden)) {
    if (!/^[\w-]+\.js$/.test(salida) || !Array.isArray(fuentes) || !fuentes.length)
      throw new Error('Salida o lista de fuentes inválida: ' + salida);
    for (const fuente of fuentes) {
      if (typeof fuente !== 'string' || !/^src\/(?:[\w-]+\/)+[\w-]+\.js$/.test(fuente))
        throw new Error('Ruta de fuente inválida: ' + fuente);
      if (vistos.has(fuente)) throw new Error('Fuente duplicada: ' + fuente);
      vistos.add(fuente);
    }
  }
  function revisar(dir) {
    for (const entrada of fs.readdirSync(path.join(raiz, dir), { withFileTypes: true })) {
      const nombre = dir + '/' + entrada.name;
      if (entrada.isDirectory()) revisar(nombre);
      else if (nombre.endsWith('.js') && !vistos.has(nombre))
        throw new Error('Fuente fuera de src/orden.json: ' + nombre);
    }
  }
  revisar('src');
  return orden;
}

function compilar({ raiz = RAIZ, comprobar = false, recrear = false } = {}) {
  const orden = leerOrden(raiz);
  const sello = path.join(raiz, '.cache/js-generados.json');
  const anteriores = fs.existsSync(sello) ? JSON.parse(fs.readFileSync(sello, 'utf8')) : {};
  const preparados = [];
  // Valida TODO antes de escribir: una fuente rota no deja salidas a medias.
  for (const [salida, fuentes] of Object.entries(orden)) {
    const partes = fuentes.map(f => {
      const contenido = fs.readFileSync(path.join(raiz, f));
      new vm.Script(contenido.toString('utf8'), { filename: f });
      return contenido;
    });
    const contenido = Buffer.concat(partes);
    new vm.Script(contenido.toString('utf8'), { filename: salida });
    const destino = path.join(raiz, salida);
    const actual = fs.existsSync(destino) ? fs.readFileSync(destino) : null;
    const coincide = actual !== null && actual.equals(contenido);
    if (comprobar && !coincide) throw new Error(salida + ' falta o está desactualizado. Corre npm run build.');
    if (!comprobar && !coincide && actual && !recrear && hash(actual) !== anteriores[salida])
      throw new Error(salida + ' tiene cambios fuera de src/. Pásalos a la fuente antes de compilar. ' +
        'Para descartar SOLO el generado: npm run build -- --recrear');
    preparados.push({ salida, destino, contenido, coincide });
  }
  if (!comprobar) {
    for (const p of preparados.filter(p => !p.coincide)) {
      escribirAtomico(p.destino, p.contenido);
    }
    fs.mkdirSync(path.dirname(sello), { recursive: true });
    escribirAtomico(sello, JSON.stringify(Object.fromEntries(preparados.map(p => [p.salida, hash(p.contenido)]))) + '\n');
  }
  return { scripts: preparados.length, fuentes: Object.values(orden).flat().length,
    escritos: preparados.filter(p => !p.coincide).length };
}

function vigilar(raiz, alCambiar, intervalo = 500) {
  function firma(dir) {
    return fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name)).map(f => {
      const ruta = path.join(dir, f.name);
      if (f.isDirectory()) return f.name + '/' + firma(ruta);
      const s = fs.statSync(ruta, { bigint: true });
      return f.name + ':' + s.mtimeNs + ':' + s.size;
    }).join('|');
  }
  let anterior = firma(path.join(raiz, 'src'));
  // Polling barato de metadatos, sin depender del límite de FSEvents/inotify.
  // Incluye el manifiesto y altas/bajas de archivos, también guardados por rename.
  const timer = setInterval(() => {
    let actual;
    try { actual = firma(path.join(raiz, 'src')); }
    catch (e) { actual = 'error:' + e.message; }
    if (actual !== anterior) { anterior = actual; alCambiar(); }
  }, intervalo);
  return () => clearInterval(timer);
}

if (require.main === module) {
  const opciones = process.argv.slice(2);
  const permitidas = ['--check', '--watch', '--recrear'];
  if (opciones.some(o => !permitidas.includes(o)) || (opciones.includes('--check') && opciones.length > 1)) {
    console.error('Uso: node bin/compilar-js.js [--check | --watch] [--recrear]');
    process.exit(1);
  }
  function ejecutar() {
    try {
      const r = compilar({ comprobar: opciones.includes('--check'), recrear: opciones.includes('--recrear') });
      console.log(`JS OK: ${r.fuentes} fuentes → ${r.scripts} scripts (${r.escritos} actualizados)`);
      process.exitCode = 0;
    } catch (e) { console.error(e.message); process.exitCode = 1; }
  }
  ejecutar();
  if (opciones.includes('--watch')) {
    vigilar(RAIZ, ejecutar);
    console.log('Observando src/. Edita las fuentes; los scripts se actualizan al guardar.');
  }
}

module.exports = { compilar, leerOrden, vigilar, RAIZ };
