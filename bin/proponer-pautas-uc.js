#!/usr/bin/env node
/*
 * Consulta el catálogo público UC y deja un BORRADOR revisable de pautas.
 *
 * No toca data.js ni se usa desde la app: los programas del catálogo son
 * genéricos y una persona tiene que revisar cada propuesta antes de convertirla
 * en un preset. En particular, un preset ya existente se conserva intacto;
 * este script solo reporta cómo difiere lo que dice el catálogo genérico.
 *
 * Uso:
 *   node bin/proponer-pautas-uc.js
 *   node bin/proponer-pautas-uc.js --sigla MAT1610,FIS1514 --out /tmp/uc.json
 *   node bin/proponer-pautas-uc.js --fixture-dir /ruta/a/html --sigla MAT1610
 *
 * Compatibilidad: los buckets (`propuestas`, `sinDatos`, `revisarAMano`) y el
 * campo `estado` se conservan. `status`, `reasons` y la evidencia trazable se
 * agregan en paralelo para que un revisor pueda decidir sin volver a descargar.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const crypto = require('crypto');

const ROOT = path.join(__dirname, '..');
const CATALOGO = 'https://catalogo.uc.cl/index.php?tmpl=component&option=com_catalogo&view=programa&sigla=';
const USER_AGENT = 'Mozilla/5.0 (compatible; GradeHubCatalogReview/1.0; +https://gradehub.cl)';

const { GH_PROGRAMA_PAUTA } = require('../src/engine/programa-pauta.js');
const {
  PARSER_VERSION, normalizar, decodificarEntidades, htmlATexto, esEncabezadoEvaluacion, bloqueEvaluaciones,
  filaConPorcentaje, filasConPorcentaje, asistenciaEsRequisito, senalesComplejidad, extraerDeTexto,
} = GH_PROGRAMA_PAUTA;

function leerDatosUC(dataPath = path.join(ROOT, 'data.js')) {
  const codigo = fs.readFileSync(dataPath, 'utf8');
  const contexto = {};
  vm.createContext(contexto);
  vm.runInContext(codigo + ';globalThis.__catalogoUC={MALLA_UC,CREDITOS_UC,PRESETS_UC};', contexto, { filename: dataPath });
  return contexto.__catalogoUC;
}

// El servidor UC ha enviado páginas ISO-8859-1 y UTF-8 según el curso. Elegir
// solo por el header vuelve "Cálculo" en "CÃ¡lculo" en una de las dos formas.
function decodificarCatalogo(bytes) {
  const buffer = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes);
  const utf8 = new TextDecoder('utf-8', { fatal: false }).decode(buffer);
  const latin1 = new TextDecoder('windows-1252', { fatal: false }).decode(buffer);
  const puntaje = texto => {
    const acentos = (texto.match(/[áéíóúüñÁÉÍÓÚÜÑ]/g) || []).length;
    const roto = (texto.match(/[Ã�]/g) || []).length;
    return acentos * 3 - roto * 8;
  };
  return puntaje(latin1) > puntaje(utf8) ? latin1 : utf8;
}


function hashEvaluacion(texto) {
  return crypto.createHash('sha256').update(normalizar(texto)).digest('hex');
}

// El lector vive en src/engine/programa-pauta.js, compartido con la app; acá
// solo se agrega lo propio del catálogo: su HTML y la huella del texto.
function extraerEstructura(html, opciones = {}) {
  return extraerDeTexto(htmlATexto(html), { ...opciones, hash: hashEvaluacion });
}

function convertirAFicha(fila) {
  const ficha = { nombre: fila.nombre, peso: fila.peso };
  // La cantidad viene declarada en el programa ("3 interrogaciones"), no es
  // una ponderación inventada. Se conserva como señal para quien revise el
  // borrador, sin dividir el porcentaje por nuestra cuenta.
  if (fila.detalleDetectado) ficha.detalleDetectado = fila.detalleDetectado;
  return ficha;
}

function cursosDeMallaUC({ MALLA_UC, CREDITOS_UC }) {
  const vistos = new Set();
  const cursos = [];
  Object.values(MALLA_UC).forEach(plan => Object.values(plan).forEach(semestre => semestre.forEach(nombre => {
    const datos = CREDITOS_UC[nombre];
    if (!datos || !datos[1]) return;
    const sigla = String(datos[1]).toUpperCase();
    if (vistos.has(sigla)) return;
    vistos.add(sigla);
    cursos.push({ nombre, creditos: datos[0], sigla });
  })));
  return cursos.sort((a, b) => a.sigla.localeCompare(b.sigla));
}

function presetPorCurso(curso, { PRESETS_UC, CREDITOS_UC }) {
  const clave = Object.keys(PRESETS_UC).find(nombre => normalizar(nombre) === normalizar(curso.nombre));
  if (!clave) return null;
  const bruto = PRESETS_UC[clave];
  // Los presets antiguos son arrays y los recientes agregan metadatos como
  // periodo, grupos o reglas dentro de {evals:[...]}. Ambos ya coexisten en
  // data.js; no confundir ese cambio de forma con una pauta ausente.
  const lista = Array.isArray(bruto) ? bruto : Array.isArray(bruto?.evals) ? bruto.evals : [];
  const evaluaciones = lista.map(item => {
    const [nombre, peso, extra] = item;
    return { nombre, peso, ...(extra && extra.slots ? { slots: extra.slots } : {}) };
  });
  return { clave, evaluaciones };
}

function comparacionEstructuras(preset, propuesta) {
  const actual = preset.evaluaciones.map(e => ({ nombre: e.nombre, peso: e.peso, ...(e.slots ? { slots: e.slots } : {}) }));
  const catalogo = propuesta.filas.map(convertirAFicha);
  const firma = filas => filas.map(f => `${normalizar(f.nombre)}:${f.peso}:${f.slots || f.detalleDetectado?.cantidad || 1}`).sort().join('|');
  return { coincide: firma(actual) === firma(catalogo), actual, catalogo };
}

function urlPrograma(sigla) {
  return CATALOGO + encodeURIComponent(sigla);
}

function esperar(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function descargar(url) {
  let respuesta;
  try { respuesta = await fetch(url, { headers: { 'user-agent': USER_AGENT, accept: 'text/html,application/xhtml+xml' } }); }
  catch (error) {
    const fallo = new Error(`No se pudo conectar con el catálogo: ${error.message}`);
    fallo.tipo = /timeout|abort/i.test(error.message) ? 'timeout' : 'connection_error';
    throw fallo;
  }
  if (!respuesta.ok) {
    const fallo = new Error(`El catálogo respondió ${respuesta.status} ${respuesta.statusText}.`);
    fallo.tipo = `http_${respuesta.status}`;
    throw fallo;
  }
  return decodificarCatalogo(Buffer.from(await respuesta.arrayBuffer()));
}

function opciones(argv) {
  const resultado = { delay: 250, out: null, fixtureDir: null, siglas: null, dataPath: path.join(ROOT, 'data.js') };
  for (let i = 2; i < argv.length; i++) {
    const valor = argv[i];
    if (valor === '--out') resultado.out = argv[++i];
    else if (valor === '--fixture-dir') resultado.fixtureDir = argv[++i];
    else if (valor === '--sigla') resultado.siglas = (argv[++i] || '').split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
    else if (valor === '--delay-ms') resultado.delay = Math.max(0, Number(argv[++i]));
    else if (valor === '--data') resultado.dataPath = argv[++i];
    else if (valor === '--help') resultado.help = true;
    else throw new Error(`Opción desconocida: ${valor}`);
  }
  return resultado;
}

function ayuda() {
  return `Uso: node bin/proponer-pautas-uc.js [opciones]\n\n` +
    `  --out <archivo>       destino del borrador JSON (por defecto: borradores/...)\n` +
    `  --sigla A,B           limita la revisión a siglas UC de la malla\n` +
    `  --fixture-dir <dir>   lee <SIGLA>.html local en vez de consultar UC\n` +
    `  --delay-ms <n>        espera entre consultas (por defecto: 250)\n` +
    `  --data <archivo>      data.js alternativo para una revisión aislada\n`;
}

async function htmlParaCurso(curso, opts) {
  const url = urlPrograma(curso.sigla);
  if (opts.fixtureDir) {
    const archivo = path.join(opts.fixtureDir, `${curso.sigla}.html`);
    return { html: decodificarCatalogo(fs.readFileSync(archivo)), url, local: true };
  }
  return { html: await descargar(url), url, local: false };
}

async function generarBorrador(opts) {
  const datos = leerDatosUC(opts.dataPath);
  let cursos = cursosDeMallaUC(datos);
  if (opts.siglas) {
    const solicitadas = new Set(opts.siglas);
    cursos = cursos.filter(curso => solicitadas.has(curso.sigla));
    const presentes = new Set(cursos.map(curso => curso.sigla));
    opts.siglas.filter(sigla => !presentes.has(sigla)).forEach(sigla => {
      throw new Error(`${sigla} no pertenece a una malla UC con sigla declarada en data.js.`);
    });
  }
  const consultadoEn = new Date().toISOString();
  const salida = {
    generadoEn: consultadoEn,
    alcance: 'Ramos de MALLA_UC; las pautas son borradores del catálogo genérico y requieren revisión humana.',
    propuestas: [],
    existentes: [],
    sinDatos: [],
    revisarAMano: [],
    errores: []
  };
  for (let indice = 0; indice < cursos.length; indice++) {
    const curso = cursos[indice];
    const fuente = { url: urlPrograma(curso.sigla), consultadoEn };
    try {
      const respuesta = await htmlParaCurso(curso, opts);
      fuente.url = respuesta.url;
      const estructura = extraerEstructura(respuesta.html, { courseCode: curso.sigla });
      const preset = presetPorCurso(curso, datos);
      const candidato = estructura.filas.map(convertirAFicha);
      const base = {
        ...curso, fuente, estado: estructura.estado, status: estructura.status,
        sourceType: 'official_uc_catalog', sourceUrl: fuente.url, sourceUniversity: 'Pontificia Universidad Católica de Chile',
        courseCode: curso.sigla, retrievedAt: consultadoEn, evaluationSourceText: estructura.evaluationSourceText,
        evaluationSourceHash: estructura.evaluationSourceHash || null, programVersionText: estructura.programVersionText || null,
        semester: null, parserVersion: estructura.parserVersion || PARSER_VERSION, reasons: estructura.reasons || [],
        candidate: { evaluations: candidato, total: estructura.total },
        parsedLines: estructura.parsedLines || [], unparsedLines: estructura.unparsedLines || [],
        complexRuleLines: estructura.complexRuleLines || [],
      };
      if (preset) {
        salida.existentes.push({
          ...base,
          presetExistente: preset.clave,
          comparacion: estructura.status === 'auto_importable'
            ? comparacionEstructuras(preset, estructura)
            : { coincide: null, motivo: estructura.motivo || 'El catálogo no entregó una estructura comparable.' }
        });
      } else if (estructura.status === 'auto_importable') {
        salida.propuestas.push({ ...base, periodo: null, evaluaciones: candidato, total: estructura.total });
      } else if (estructura.status === 'insufficient_information' || estructura.status === 'not_found') {
        salida.sinDatos.push({ ...base, motivo: estructura.motivo });
      } else {
        salida.revisarAMano.push({ ...base, motivo: estructura.motivo, encontrado: candidato, total: estructura.total });
      }
    } catch (error) {
      salida.errores.push({ ...curso, fuente, estado: 'error', status: 'transport_error', errorType: error.tipo || 'unknown_error', motivo: error.message });
    }
    if (!opts.fixtureDir && indice < cursos.length - 1 && opts.delay) await esperar(opts.delay);
  }
  return salida;
}

async function main() {
  const opts = opciones(process.argv);
  if (opts.help) return console.log(ayuda());
  const borrador = await generarBorrador(opts);
  const fecha = borrador.generadoEn.slice(0, 10);
  const destino = path.resolve(opts.out || path.join(ROOT, 'borradores', `pautas-uc-catalogo-${fecha}.json`));
  fs.mkdirSync(path.dirname(destino), { recursive: true });
  fs.writeFileSync(destino, JSON.stringify(borrador, null, 2) + '\n');
  console.log(`Borrador escrito en ${destino}`);
  console.log(`Propuestas: ${borrador.propuestas.length}; existentes: ${borrador.existentes.length}; sin datos: ${borrador.sinDatos.length}; revisar: ${borrador.revisarAMano.length}; errores: ${borrador.errores.length}.`);
}

if (require.main === module) {
  main().catch(error => {
    console.error(`No se pudo generar el borrador: ${error.message}`);
    process.exitCode = 1;
  });
}

module.exports = {
  PARSER_VERSION, decodificarCatalogo, htmlATexto, esEncabezadoEvaluacion, bloqueEvaluaciones,
  filaConPorcentaje, filasConPorcentaje, asistenciaEsRequisito, senalesComplejidad,
  extraerEstructura, cursosDeMallaUC, generarBorrador, normalizar
};
