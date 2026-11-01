#!/usr/bin/env node
// Símbolos JS (AST) y búsqueda literal en las fuentes del repo.
// Salidas acotadas: no lee bundles, catálogos generados ni archivos de terceros.
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const acorn = require('acorn');
const { leerOrden, RAIZ } = require('./compilar-js');
const normal = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

function indexar(texto, { entradas = false } = {}) {
  let ast;
  const opciones = { ecmaVersion: 'latest', locations: true };
  try { ast = acorn.parse(texto, { ...opciones, sourceType: 'script' }); }
  catch (_) { ast = acorn.parse(texto, { ...opciones, sourceType: 'module' }); }
  const simbolos = [];
  function agregar(nombre, nodo, tipo) {
    simbolos.push({ nombre, tipo, linea: nodo.loc.start.line, fin: nodo.loc.end.line });
  }
  function recorrer(nodo, nivelFuncion = 0) {
    if (!nodo || typeof nodo !== 'object') return;
    if (nodo.type === 'FunctionDeclaration' && nodo.id) agregar(nodo.id.name, nodo, 'función');
    if (nodo.type === 'VariableDeclarator' && nodo.id.type === 'Identifier') {
      const funcion = nodo.init && /^(ArrowFunctionExpression|FunctionExpression)$/.test(nodo.init.type);
      if (funcion || nivelFuncion === 0) agregar(nodo.id.name, nodo, funcion ? 'función' : 'dato');
      // Una pauta literal se consulta por ramo, sin leer el catálogo completo.
      if (entradas && nivelFuncion === 0 && nodo.init && nodo.init.type === 'ObjectExpression')
        for (const propiedad of nodo.init.properties) {
          if (propiedad.type !== 'Property' || propiedad.computed) continue;
          const clave = propiedad.key.name ?? propiedad.key.value;
          if (clave !== undefined) agregar(nodo.id.name + '.' + clave, propiedad, 'entrada');
        }
    }
    const siguiente = nivelFuncion + (/^(FunctionDeclaration|FunctionExpression|ArrowFunctionExpression)$/.test(nodo.type) ? 1 : 0);
    for (const [clave, valor] of Object.entries(nodo)) {
      if (clave === 'loc') continue;
      if (Array.isArray(valor)) valor.forEach(hijo => recorrer(hijo, siguiente));
      else if (valor && typeof valor === 'object') recorrer(valor, siguiente);
    }
  }
  recorrer(ast);
  return simbolos;
}

const TIPOS = { js: /\.(js|cjs)$/, sql: /\.sql$/, css: /\.css$/, html: /\.html$/, docs: /\.md$/ };
function documentos({ raiz = RAIZ, tests = false, cache = true, tipos = ['js', 'sql', 'css', 'html'], archivo = '' } = {}) {
  const orden = leerOrden(raiz), archivos = new Set();
  const admite = f => tipos.some(t => TIPOS[t].test(f));
  const filtro = normal(archivo);
  function agregar(f) {
    // Filtra ANTES de leer/parsear, no después de indexar el repo entero.
    if (admite(f) && normal(f).includes(filtro)) archivos.add(f);
  }
  Object.values(orden).flat().forEach(agregar);
  function sumar(dir) {
    if (!fs.existsSync(path.join(raiz, dir))) return;
    for (const f of fs.readdirSync(path.join(raiz, dir), { withFileTypes: true })) {
      const relativo = dir + '/' + f.name;
      if (f.isDirectory()) sumar(relativo);
      else if (f.isFile() && admite(relativo)) {
        // Los inventarios/paquetes históricos siguen disponibles por ruta
        // explícita; no contaminan una búsqueda de documentación cotidiana.
        if (dir.startsWith('docs') && /catalogo-uc-|benchmark-pautas-uc-/.test(f.name) && !filtro) continue;
        agregar(relativo);
      }
    }
  }
  sumar('bin'); sumar('functions'); sumar('supabase');
  if (tipos.includes('docs')) sumar('docs');
  if (tests) sumar('tests');
  for (const f of fs.readdirSync(raiz, { withFileTypes: true }))
    if (f.isFile() && !orden[f.name] && f.name !== 'cursos-uc.js' && !f.name.startsWith('mallas-')) agregar(f.name);
  const rutaCache = path.join(raiz, '.cache/indice-js.json');
  let anterior = {};
  const versionIndice = '3/' + acorn.version;
  if (cache) try { const c = JSON.parse(fs.readFileSync(rutaCache, 'utf8')); if (c.version === versionIndice) anterior = c.archivos; } catch (_) {}
  // Una búsqueda filtrada no borra del cache los otros temas.
  const siguiente = { ...anterior };
  const docs = [...archivos].sort().map(archivo => {
    const texto = fs.readFileSync(path.join(raiz, archivo), 'utf8');
    const hash = createHash('sha256').update(texto).digest('hex');
    const entrada = anterior[archivo];
    const simbolos = entrada && entrada.hash === hash ? entrada.simbolos
      : TIPOS.js.test(archivo) ? indexar(texto, { entradas: archivo.startsWith('src/data/') }) : [];
    siguiente[archivo] = { hash, simbolos };
    return { archivo, texto, lineas: texto.split('\n'), simbolos };
  });
  if (cache) {
    fs.mkdirSync(path.dirname(rutaCache), { recursive: true });
    const temporal = rutaCache + '.gh-tmp-' + process.pid;
    try { fs.writeFileSync(temporal, JSON.stringify({ version: versionIndice, archivos: siguiente })); fs.renameSync(temporal, rutaCache); }
    finally { if (fs.existsSync(temporal)) fs.unlinkSync(temporal); }
  }
  return docs;
}

function mostrar(d, r, opciones) {
  const inicio = r.linea + opciones.desde - 1;
  if (inicio > r.fin) throw new Error('--desde queda fuera del rango (' + (r.fin - r.linea + 1) + ' líneas).');
  const fin = Math.min(r.fin, inicio + opciones.lineas - 1);
  const codigo = d.lineas.slice(inicio - 1, fin).map((texto, i) => ({
    linea: inicio + i, texto: texto.slice(0, 240), ...(texto.length > 240 ? { truncado: true } : {})
  }));
  if (opciones.json) console.log(JSON.stringify({ ...r, mostrando: [inicio, fin], codigo }, null, 2));
  else {
    console.log(`${r.archivo}:${r.linea}-${r.fin} · ${r.tipo} ${r.nombre}`);
    for (const l of codigo) console.log(`${l.linea}: ${l.texto}${l.truncado ? ' […]' : ''}`);
    if (fin < r.fin) console.log(`… continúa con --desde ${fin - r.linea + 2}.`);
  }
}

function buscar(docs, consulta, { archivo = '', limite = 8 } = {}) {
  const q = normal(consulta), resultados = [];
  for (const d of docs.filter(d => normal(d.archivo).includes(normal(archivo)))) {
    const tema = normal(d.archivo).includes(q);
    const simbolos = d.simbolos.filter(s => normal(s.nombre).includes(q));
    for (const s of simbolos) resultados.push({ archivo: d.archivo, ...s,
      rango: normal(s.nombre) === q ? 100 : normal(s.nombre).startsWith(q) ? 80 : 60 });
    if (tema && !simbolos.length) resultados.push({ archivo: d.archivo, linea: 1, fin: d.lineas.length,
      nombre: path.basename(d.archivo, '.js'), tipo: 'tema', rango: 50 });
    if (!tema && !simbolos.length) {
      const indice = d.lineas.findIndex(l => normal(l).includes(q));
      if (indice >= 0) resultados.push({ archivo: d.archivo, linea: indice + 1, fin: indice + 1,
        nombre: d.lineas[indice].trim().slice(0, 160), tipo: 'texto', rango: 20 });
    }
  }
  return resultados.sort((a, b) => b.rango - a.rango || a.archivo.localeCompare(b.archivo) || a.linea - b.linea).slice(0, limite);
}

function ejecutar(args) {
  const ayuda = 'Uso: npm run buscar -- consulta [--tests] [--json] [--limite 8]\n' +
    '     npm run buscar -- --ver funcion [--archivo ruta] [--desde 1] [--lineas 48]\n' +
    '     npm run buscar -- --archivo ruta [--desde 1] [--lineas 48]\n' +
    '     npm run buscar -- consulta --tipo js|sql|css|html|docs [--tests]\n' +
    '     npm run buscar -- --mapa [--archivo tema] [--detallado]\n' +
    'Sin regex. Ignora tildes y mayúsculas. Los límites de funciones salen del AST.';
  if (!args.length || args.includes('--help')) { console.log(ayuda); return 0; }
  const opciones = { limite: 8, lineas: 48, desde: 1, archivo: '' }, consulta = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (['--tests', '--json', '--mapa', '--detallado', '--docs'].includes(a)) opciones[a.slice(2)] = true;
    else if (['--ver', '--archivo', '--limite', '--lineas', '--desde', '--tipo'].includes(a)) {
      if (!args[i + 1] || args[i + 1].startsWith('--')) throw new Error('Falta valor para ' + a);
      opciones[a.slice(2)] = args[++i];
    } else if (a.startsWith('--')) throw new Error('Opción desconocida: ' + a);
    else consulta.push(a);
  }
  for (const [clave, max] of [['limite', 30], ['lineas', 120], ['desde', 100000]]) {
    const n = Number(opciones[clave]);
    if (!Number.isInteger(n) || n < 1 || n > max) throw new Error('--' + clave + ' debe ser de 1 a ' + max);
    opciones[clave] = n;
  }
  if (opciones.tipo) {
    opciones.tipos = opciones.tipo.split(',');
    if (opciones.tipos.some(t => !TIPOS[t])) throw new Error('--tipo: usa js,sql,css,html,docs');
  } else if (opciones.docs) opciones.tipos = ['docs'];
  if (opciones.mapa) {
    const orden = leerOrden();
    const mapa = Object.fromEntries(Object.entries(orden).map(([salida, partes]) =>
      [salida, partes.filter(f => normal(f).includes(normal(opciones.archivo)))]).filter(([, partes]) => partes.length));
    if (opciones.json) console.log(JSON.stringify(mapa, null, 2));
    else for (const [salida, partes] of Object.entries(mapa))
      console.log(opciones.detallado || opciones.archivo ? salida + '\n  ' + partes.join('\n  ')
        : salida + ' · ' + partes.length + ' fuentes · ' + path.dirname(partes[0]) + '/');
    if (!opciones.json && !opciones.detallado && !opciones.archivo) console.log('Filtra con --archivo tema; --detallado muestra todas las rutas.');
    return 0;
  }
  const q = opciones.ver || consulta.join(' ');
  if (!q.trim() && !opciones.archivo) throw new Error(ayuda);
  // --archivo sin consulta abre solo un archivo conocido, nunca una ruta externa.
  if (!q.trim() && !opciones.tipos) opciones.tipos = Object.keys(TIPOS);
  const docs = documentos(opciones);
  if (!q.trim()) {
    const exacto = docs.find(d => d.archivo === opciones.archivo);
    const candidatos = exacto ? [exacto] : docs;
    if (candidatos.length !== 1) {
      console.log('Selecciona una ruta única con --archivo (' + candidatos.length + ' coincidencias):');
      candidatos.slice(0, opciones.limite).forEach(d => console.log(d.archivo));
      return 1;
    }
    const d = candidatos[0];
    mostrar(d, { archivo: d.archivo, linea: 1, fin: d.lineas.length, tipo: 'archivo', nombre: path.basename(d.archivo) }, opciones);
    return 0;
  }
  const resultados = buscar(docs, q, { ...opciones, limite: opciones.ver ? Infinity : opciones.limite });
  if (opciones.ver) {
    const exactos = resultados.filter(r => normal(r.nombre) === normal(q) && r.tipo !== 'tema' && r.tipo !== 'texto');
    if (exactos.length !== 1) {
      console.log('Selecciona un símbolo único con --archivo. Coincidencias:');
      console.log(JSON.stringify((exactos.length ? exactos : resultados).slice(0, opciones.limite), null, 2));
      return 1;
    }
    const r = exactos[0], d = docs.find(d => d.archivo === r.archivo);
    mostrar(d, r, opciones);
  } else if (opciones.json) console.log(JSON.stringify(resultados, null, 2));
  else {
    for (const r of resultados) console.log(`${r.archivo}:${r.linea}-${r.fin} · ${r.tipo} ${r.nombre}`);
    if (!resultados.length) console.log('Sin coincidencias. Prueba una función, texto visible o tema.');
  }
  return resultados.length ? 0 : 1;
}

if (require.main === module) {
  try { process.exitCode = ejecutar(process.argv.slice(2)); }
  catch (e) { console.error(e.message); process.exitCode = 1; }
}
module.exports = { indexar, documentos, buscar, ejecutar };
