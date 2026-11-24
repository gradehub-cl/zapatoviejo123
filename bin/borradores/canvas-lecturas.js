// Ruta final: módulo interno del MCP. Activar junto con functions/canvas-conexion.js.
import { baseCanvas, leerBytes, leerJson, leerConexionServidor, llaveDe, descifrarTokenCanvas } from './canvas-conexion.js';
import programa from '../../src/engine/programa-pauta.js';
import { getDocumentProxy } from 'unpdf';

const HOST = 'https://cursos.canvas.uc.cl';
const LIMITE = 2 * 1024 * 1024;
const SIGLA = /^[A-Z]{3,4}[0-9]{3,4}[A-Z]?$/;
const codigoCurso = /^([A-Z]{3,4}[0-9]{3,4}[A-Z]?)-(\d{1,3})$/;
const idValido = id => Number.isSafeInteger(id) && id > 0 && id <= 999999999999;
const desconectado = 'Para leer tus cursos, conecta Canvas en Ajustes.';
const formatos = {
  cursos: ['courses', { enrollment_state: 'active', enrollment_type: 'student', per_page: '50' }],
  evaluaciones: ['assignment_groups', { 'include[]': 'assignments', per_page: '100' }],
  notas: ['assignments', { 'include[]': 'submission', per_page: '100' }],
  avisos: ['discussion_topics', { only_announcements: 'true', per_page: '50' }],
  programa: ['', { 'include[]': 'syllabus_body' }],
  archivos: ['files', { per_page: '100' }],
  modulos: ['modules', { 'include[]': 'items', per_page: '100' }],
};
function urlPDF(curso, archivo, enlace) {
  const base = '/courses/' + curso + '/files/' + archivo + '/download';
  if (!enlace) return new URL(base, HOST);
  const url = new URL(enlace);
  if (url.origin !== HOST || url.username || url.password || url.hash ||
      (url.pathname !== base && url.pathname !== '/files/' + archivo + '/download')) return null;
  const vistos = new Set();
  for (const [k,v] of url.searchParams) {
    if (vistos.has(k) || !(k === 'download_frd' && v === '1' || k === 'verifier' && /^[A-Za-z0-9_-]{1,128}$/.test(v))) return null;
    vistos.add(k);
  }
  return url;
}
function ruta(tipo, curso, archivo, enlace) {
  if (tipo !== 'cursos' && !idValido(curso)) throw new Error('curso');
  if (idValido(archivo)) {
    if (tipo === 'archivo') return new URL('/api/v1/courses/' + curso + '/files/' + archivo, HOST);
    if (tipo === 'pdf') return urlPDF(curso, archivo, enlace);
  }
  if (!Object.hasOwn(formatos, tipo)) throw new Error('ruta');
  const [sufijo, params] = formatos[tipo];
  const path = tipo === 'cursos' ? sufijo : ['courses', curso, sufijo].filter(Boolean).join('/');
  const url = new URL('/api/v1/' + path, HOST);
  url.search = new URLSearchParams(params).toString();
  return url;
}
// Nunca seguir una URL recibida. Del Link solo se admite el número consecutivo,
// con origen, ruta y filtros idénticos. Se reconstruye el GET desde la lista.
function paginaSiguiente(link, inicial, pagina) {
  const segmento = String(link || '').split(',').find(s => /;\s*rel="next"/i.test(s));
  if (!segmento) return null;
  const destino = new URL(segmento.match(/<([^>]+)>/)?.[1]);
  const numero = destino.searchParams.getAll('page');
  destino.searchParams.delete('page');
  destino.searchParams.sort();
  const base = new URL(inicial);
  base.searchParams.sort();
  if (destino.href !== base.href || numero.length !== 1 || numero[0] !== String(pagina + 1) || pagina >= 10) throw new Error('paginación');
  return pagina + 1;
}
class RechazoCanvas extends Error {
  constructor(status) { super('Canvas'); this.status = status; }
}
function lector(token, signal, pedir) {
  let disponibles = LIMITE, solicitudes = 0;
  return async (tipo, curso, archivo, enlace) => {
    const inicial = ruta(tipo, curso, archivo, enlace), filas = [];
    if (!inicial) return null;
    let pagina = 1;
    do {
      if (++solicitudes > 40 || signal.aborted) throw new Error('límite');
      const url = new URL(inicial);
      if (pagina > 1) url.searchParams.set('page', String(pagina));
      const r = await pedir(url.href, { method: 'GET', redirect: 'manual', cache: 'no-store', signal,
        headers: { Accept: tipo === 'pdf' ? 'application/pdf' : 'application/json', Authorization: 'Bearer ' + token } });
      if (r.status !== 200) {
        if (r.body) await r.body.cancel();
        throw new RechazoCanvas(r.status);
      }
      const bytes = await leerBytes(r, disponibles, signal);
      disponibles -= bytes.length;
      if (tipo === 'pdf') return bytes;
      const data = JSON.parse(new TextDecoder().decode(bytes));
      if (tipo === 'programa' || tipo === 'archivo') return data;
      if (!Array.isArray(data)) throw new Error('lista');
      for (const fila of data) if (fila && typeof fila === 'object') filas.push(fila);
      pagina = paginaSiguiente(r.headers.get('Link'), inicial, pagina);
    } while (pagina);
    return filas;
  };
}
const { GH_PROGRAMA_PAUTA: motor } = programa;
const texto = html => motor.htmlATexto(typeof html === 'string' ? html
  .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, '').replace(/<\/(?:td|th)>/gi, ' ') : '');
const titulo = s => texto(s).slice(0, 180);
function emparejar(lista, estado, siglaDeRamo) {
  const ramos = (!estado.tenant || estado.tenant === 'uc') && Array.isArray(estado.ramos) ? estado.ramos : [];
  const cursos = lista.flatMap(c => {
    const m = codigoCurso.exec(String(c.course_code || '').trim().toUpperCase());
    return idValido(c.id) ? [{ id: c.id, sigla: m?.[1] || null, seccion: m ? Number(m[2]) : null, nombre: titulo(c.name), usaPesos: c.apply_assignment_group_weights === true }] : [];
  });
  for (const c of cursos) {
    const compatibles = ramos.filter(r => c.sigla && siglaDeRamo(r) === c.sigla && (!r.seccion || Number(r.seccion) === c.seccion));
    const ramo = compatibles.length === 1 && compatibles[0];
    c.emparejado = !!ramo && cursos.filter(otro => otro.sigla === c.sigla && (!ramo.seccion || otro.seccion === c.seccion)).length === 1;
  }
  return cursos;
}
const fecha = s => typeof s === 'string' && /^\d{4}-\d\d-\d\dT.*(?:Z|[+-]\d\d:\d\d)$/i.test(s) && Number.isFinite(Date.parse(s));
const enChile = new Intl.DateTimeFormat('es-CL', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Santiago' });
function avisos(lista) {
  return lista.filter(a => a.published !== false && a.is_announcement !== false && fecha(a.posted_at) && Date.parse(a.posted_at) <= Date.now()
    && (!a.delayed_post_at || (fecha(a.delayed_post_at) && Date.parse(a.delayed_post_at) <= Date.now())))
    .sort((a,b) => Date.parse(b.posted_at) - Date.parse(a.posted_at)).map(a => ({
      titulo: titulo(a.title), fechaChile: enChile.format(Date.parse(a.posted_at)), texto: texto(a.message).slice(0, 2000),
    }));
}
function notas(lista) {
  return lista.flatMap(a => {
    const s = a.submission;
    if (a.published === false || !s || s.excused || s.workflow_state !== 'graded' || !fecha(s.posted_at) || Date.parse(s.posted_at) > Date.now()) return [];
    const nombre = titulo(a.name), grade = String(s.grade ?? '').trim();
    if (a.grading_type === 'points' && Number.isFinite(s.score) && Number.isFinite(a.points_possible) && a.points_possible > 0)
      return [{ nombre, puntos: s.score, maximo: a.points_possible }];
    if (a.grading_type === 'percent' && /^\d{1,3}([.,]\d+)?%$/.test(grade)) return [{ nombre, porcentaje: grade }];
    if (['letter_grade','gpa_scale'].includes(a.grading_type) && /^[1-7]([.,]\d{1,2})?$/.test(grade) && Number(grade.replace(',','.')) <= 7)
      return [{ nombre, calificacionPublicada: grade, escala: 'Confirmar con el programa antes de proponer una nota.' }];
    return [];
  });
}
function grupos(lista, usaPesos) {
  return lista.map(g => ({
    grupo: titulo(g.name), ponderacion: usaPesos && Number.isFinite(g.group_weight) && g.group_weight >= 0 && g.group_weight <= 100 ? g.group_weight : null,
    evaluaciones: (Array.isArray(g.assignments) ? g.assignments : []).filter(a => a && a.published !== false)
      .map(a => ({ nombre: titulo(a.name), fecha: fecha(a.due_at) ? a.due_at : null })),
  }));
}
// Mismo puntaje que puntajeArchivoPrograma de la app. Una prueba compara ambos.
export function puntajeArchivoPrograma(a) {
  const normal = s => motor.normalizar(s || '');
  const n = normal(a.nombre.replace(/[_.-]+/g,' ')), m = normal(a.modulo);
  let p = 0;
  if (/\b(programa|syllabus|silabo|reglas|condiciones|normativa)\b/.test(n)) p += 5;
  if (/\b(programa|syllabus|informacion del curso)\b/.test(m)) p += 3;
  if (/\b(clase a clase|calendario|cronograma|fechas|planificacion)\b/.test(n)) p++;
  if (/\b(pauta de correccion|solucion|solucionario|ayudantia|guia|enunciado|tarea|control|interrogacion|examen|prueba)\b/.test(n) && p < 5) p -= 4;
  return p;
}
async function opcional(leer, tipo, id, archivo, enlace) {
  try { return await leer(tipo, id, archivo, enlace); }
  catch (e) {
    if (e instanceof RechazoCanvas && [301,302,303,307,308,403,404].includes(e.status)) return null;
    throw e;
  }
}
async function candidatos(leer, id) {
  const archivos = new Map();
  for (const a of await opcional(leer,'archivos',id) || []) {
    if (idValido(a.id) && (a.size == null || a.size <= LIMITE) && (/\.pdf$/i.test(a.display_name) || a['content-type'] === 'application/pdf'))
      archivos.set(a.id, { id:a.id, nombre: titulo(a.display_name) });
  }
  for (const m of await opcional(leer,'modulos',id) || []) {
    for (const item of Array.isArray(m.items) ? m.items : []) {
      if (item?.type !== 'File' || !idValido(item.content_id)) continue;
      const a = archivos.get(item.content_id) || { id: item.content_id, nombre: titulo(item.title) };
      if (!a.modulo) a.modulo = titulo(m.name);
      archivos.set(a.id, a);
    }
  }
  return [...archivos.values()].map(a => ({ ...a, puntaje: puntajeArchivoPrograma(a) })).filter(a => a.puntaje > 0)
    .sort((a,b) => b.puntaje - a.puntaje || a.nombre.localeCompare(b.nombre)).slice(0,3);
}
async function textoPDF(bytes, signal) {
  if (!bytes || new TextDecoder().decode(bytes.subarray(0,5)) !== '%PDF-') return null;
  let pdf;
  try {
    pdf = await getDocumentProxy(bytes, { verbosity: 0, isEvalSupported: false, useWasm: false, useWorkerFetch: false, disableFontFace: true,
      useSystemFonts: false, maxImageSize: 0, stopAtErrors: true });
    let contenido = '';
    if (pdf.numPages > 40) return null;
    for (let i = 1; i <= pdf.numPages; i++) {
      if (signal.aborted) throw new Error('plazo');
      const pagina = await pdf.getPage(i), { items } = await pagina.getTextContent();
      for (const item of items) {
        if (typeof item.str === 'string') contenido += item.str + (item.hasEOL ? '\n' : ' ');
        if (contenido.length > 50000) return null;
      }
      contenido += '\n';
      pagina.cleanup();
    }
    return contenido.trim();
  } catch { return null; }
  finally { if (pdf) await pdf.loadingTask.destroy(); }
}
function analizar(contenido, sigla, origen) {
  if (!contenido || contenido.length > 50000 || contenido.split('\n').length > 600) return null;
  const r = motor.extraerDeTexto(contenido, { encabezadosAmplios: true, courseCode: sigla });
  if (r.reasons.includes('course_code_mismatch')) return null;
  return { fuente: 'según el programa en Canvas', origen, texto: contenido, lectura: { estado: r.estado, motivo: r.motivo,
    ponderaciones: r.status === 'auto_importable' ? r.filas.map(f => ({ nombre: f.nombre, porcentaje: f.peso })) : [],
    citasParaRevisar: r.complexRuleLines.map(c => c.line) } };
}
async function programaCurso(leer, curso, signal) {
  const html = await leer('programa',curso.id);
  let mejor = analizar(texto(html?.syllabus_body), curso.sigla, 'Programa del curso');
  if (mejor?.lectura.estado === 'propuesta') return mejor;
  for (const a of await candidatos(leer,curso.id)) {
    const ficha = await opcional(leer,'archivo',curso.id,a.id);
    if (ficha?.id !== a.id || ficha.size > LIMITE ||
      !(ficha['content-type'] === 'application/pdf' || /\.pdf$/i.test(ficha.display_name))) continue;
    const bytes = await opcional(leer,'pdf',curso.id,a.id,ficha.url);
    const leido = analizar(await textoPDF(bytes,signal), curso.sigla, a.nombre);
    if (leido?.lectura.estado === 'propuesta') return leido;
    mejor ||= leido;
  }
  if (mejor) return { ...mejor, aviso: 'Mostramos el texto disponible. No encontramos ponderaciones que se puedan proponer desde el programa.' };
  return { aviso: 'No pudimos leer el programa de este curso. Si el PDF requiere una redirección o está escaneado, revísalo en Canvas.' };
}
export async function consultarCanvas(nombre, args, tokenMcp, request, env, siglaDeRamo, pedir = fetch) {
  const corte = new AbortController(), reloj = setTimeout(() => corte.abort(), 8000);
  try {
    const base = baseCanvas(new URL(request.url),env);
    if (!base) throw new Error('configuración');
    const rpc = async (nombreRpc, argsRpc) => {
      const r = await pedir(base.supabase + '/rest/v1/rpc/' + nombreRpc, { method:'POST', redirect:'manual', signal:corte.signal,
        headers:{ 'Content-Type':'application/json', apikey:base.publicable }, body: JSON.stringify(argsRpc) });
      if (r.status !== 200) { if (r.body) await r.body.cancel(); throw new Error('base'); }
      return leerJson(r, LIMITE, corte.signal);
    };
    const vinculo = { p_token: tokenMcp };
    const estado = await rpc('agente_datos', vinculo);
    if (!estado) return { error: 'Esta conexión ya no es válida. Vuelve a vincular desde Ajustes.' };
    const fila = await leerConexionServidor(env,rpc,'canvas_conexion_agente',vinculo);
    if (!fila) return { error: desconectado };
    const sigla = typeof args.sigla === 'string' && args.sigla.trim().toUpperCase();
    if (Object.keys(args).some(k => k !== 'sigla' || nombre === 'canvas_cursos') || ('sigla' in args && !SIGLA.test(sigla))
      || (!sigla && !['canvas_cursos','canvas_avisos'].includes(nombre))) return { error:'Indica la sigla del ramo tal como aparece en GradeHub.' };
    const token = await descifrarTokenCanvas(fila,await llaveDe(env,fila.llave_version));
    const leer = lector(token,corte.signal,pedir);
    try {
      const cursos = emparejar(await leer('cursos'),estado,siglaDeRamo);
      let datos;
      if (nombre === 'canvas_cursos') datos = cursos.map(({sigla,seccion,nombre,emparejado}) => ({ sigla,seccion,nombre,emparejado }));
      else {
        const seleccion = cursos.filter(c => (!sigla || c.sigla === sigla) && (c.emparejado || (!sigla && nombre === 'canvas_avisos')));
        if (sigla && seleccion.length !== 1) return { error:'No encontramos un único curso de Canvas emparejado con esa sigla y sección.' };
        if (nombre === 'canvas_avisos') {
          datos = [];
          for (const c of seleccion) datos.push({ ramo:c.nombre, sigla:c.sigla, seccion:c.seccion, avisos:avisos(await leer('avisos',c.id)) });
        } else {
          const c = seleccion[0];
          if (nombre === 'canvas_programa') datos = await programaCurso(leer,c,corte.signal);
          if (nombre === 'canvas_notas') datos = notas(await leer('notas',c.id));
          if (nombre === 'canvas_evaluaciones') datos = grupos(await leer('evaluaciones',c.id),c.usaPesos);
        }
      }
      const salida = JSON.stringify(datos);
      if (corte.signal.aborted || !salida || salida.length > 150000 || [token,tokenMcp,fila.iv,fila.token_cifrado].some(s => salida.includes(s))) throw new Error('respuesta');
      return { fuente: 'Canvas', datos };
    } catch (e) {
      if (!(e instanceof RechazoCanvas) || e.status !== 401) throw e;
      await rpc('canvas_borrar_rechazada_agente', { ...vinculo,p_iv:fila.iv });
      return { error: 'Canvas rechazó el token. Para continuar, conecta Canvas en Ajustes.' };
    }
  } catch { return { error:'No pudimos leer Canvas. Intenta de nuevo o consulta un ramo a la vez.' }; }
  finally { clearTimeout(reloj); }
}
