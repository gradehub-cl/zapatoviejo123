// Servidor MCP de GradeHub — Cloudflare Pages Function.
//
// Un agente conectado consulta acá en vez de recibir un archivo: el estudiante
// vincula una vez y desde entonces las respuestas salen del estado del momento.
//
// Vive junto al feed de calendario y por la misma razón: Pages trae Functions
// en el plan gratis, así que viaja en el mismo deploy y no agrega proveedor. Se
// llama con la publishable, igual que el navegador; la clave secreta no entra
// acá ni haría falta, porque toda la autorización la resuelve una RPC
// `security definer` a partir del token.
//
// EL TOKEN NO LO ESCRIBE NADIE A MANO. Se canjea por un código de un solo uso
// que la app muestra durante cinco minutos, y el que queda guardado lo emite el
// servidor. Así el estudiante nunca tiene en la mano un secreto permanente que
// pueda pegar en el lugar equivocado, y desconectar desde Ajustes lo corta de
// verdad.

import { HERRAMIENTAS, NOMBRES, validarPropuestaPauta, validarPropuestaNotas, validarPropuestaRamos, validarPropuestaFechas } from './herramientas.js';
import motorCompartido from '../../engine.js';

const SUPABASE_URL = 'https://lsulsnswzesyekpsvlql.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_JwBMAOR7iHW-gcRdLMGrYw_eCOISwqA';

// Las versiones que este servidor sabe hablar, de la más nueva a la más vieja.
// Importa para los conectores de ChatGPT, Claude y Gemini: piden una versión de
// 2025 y, si el servidor contesta otra, algunos cortan ahí. Las tres se
// sostienen con lo que hay acá —el POST responde JSON, que Streamable HTTP
// permite— y ninguna obliga a SSE ni a sesiones, que son opcionales.
const PROTOCOLOS = ['2025-06-18', '2025-03-26', '2024-11-05'];
const PROTOCOLO = PROTOCOLOS[PROTOCOLOS.length - 1];

// Formato fijo: descarta basura antes de tocar la base.
const tokenValido = t => /^[0-9a-f]{64}$/.test(t);

function rpc(nombre, cuerpo) {
  return fetch(`${SUPABASE_URL}/rest/v1/rpc/${nombre}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify(cuerpo),
  });
}

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });

const respuesta = (id, result) => json({ jsonrpc: '2.0', id, result });
const error = (id, code, message) => json({ jsonrpc: '2.0', id, error: { code, message } });

// El esquema que MCP espera para cada herramienta. Se arma desde la misma lista
// que usa el despacho, para que no puedan divergir: una herramienta anunciada y
// no implementada es una promesa rota, y una implementada sin anunciar es una
// puerta que nadie revisó.
function comoMcp(h) {
  const properties = {};
  for (const [k, v] of Object.entries(h.args || {})) {
    properties[k] = typeof v === 'string' ? { type: 'string', description: v } : v;
  }
  return {
    name: h.nombre,
    description: h.resumen,
    inputSchema: { type: 'object', properties },
  };
}

const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

function copiarRecuperativo(regla) {
  if (!regla || !Number.isFinite(regla.min) || !Number.isFinite(regla.max) || !Number.isFinite(regla.nota) || regla.min > regla.max) return null;
  return { min: regla.min, max: regla.max, nota: regla.nota };
}

function buscarRamo(ramos, consulta) {
  const q = norm(consulta);
  if (!q) return null;
  // Las herramientas prometen «nombre o sigla»: «TTF012» también encuentra
  // Revelación y Fe, aunque la sigla no esté en el nombre.
  return ramos.find(r => norm(r.nombre) === q)
    || ramos.find(r => norm(siglaDeRamo(r)) === q)
    || ramos.find(r => norm(r.origen && r.origen.ramoKey) === q)
    || ramos.find(r => norm(r.nombre).includes(q));
}

// Las reglas que el ramo trae guardadas, para que el agente las vea y las
// explique (Lucas, 2026-11-17: «que puedan ver bien todas las reglas, como las
// de Revelación y Fe»). Solo describe: el cálculo sigue en el motor. El
// catálogo no viaja al servidor, así que lo que vive solo ahí (las reglas
// informativas del curso) se lee del ramo cuando la app lo guardó.
function reglasDelRamo(r, calculo) {
  const coma = n => String(n).replace('.', ',');
  const cats = Array.isArray(r.categorias) ? r.categorias : [];
  const nombreDe = id => (cats.find(c => c.id === id) || {}).nombre || null;
  const out = {};
  if (Number.isInteger(r.seccion)) out.seccion = r.seccion;
  const descartes = cats.filter(c => Number.isInteger(c.dropLowest?.count) && c.dropLowest.count > 0)
    .map(c => ({ evaluacion: c.nombre, seDescartan: c.dropLowest.count, texto: `En ${c.nombre} se descarta${c.dropLowest.count > 1 ? 'n las ' + c.dropLowest.count + ' notas más bajas' : ' la nota más baja'}.` }));
  if (descartes.length) out.descartes = descartes;
  const compuertas = (Array.isArray(r.gates) ? r.gates : []).filter(g => g && (g.type === 'min_grade_required' || g.type === 'group_min'))
    .map(g => {
      const sobre = g.type === 'group_min' ? (g.catIds || []).map(nombreDe).filter(Boolean) : [nombreDe(g.catId)].filter(Boolean);
      const tope = g.cap === 'self' ? 'la final queda en ese promedio' : Number.isFinite(g.cap) ? `la final queda en ${coma(g.cap)}` : 'no se aprueba';
      return { nombre: g.nombre || sobre.join(', '), sobre, minimo: g.min, ...(g.cap != null ? { tope: g.cap } : {}),
        texto: `${g.nombre || sobre.join(' + ')}: mínimo ${coma(g.min)}; si no, ${tope}.` };
    });
  if (compuertas.length) out.compuertas = compuertas;
  const calculadas = (calculo.reglasCalculoVigentes?.(r) || []).map(g => ({ tipo: g.type, nombre: g.nombre || null }));
  if (calculadas.length) out.formulas = calculadas;
  const ex = calculo.estadoEximicion?.(r), regla = ex?.regla || r.eximicion;
  if (regla && (!Array.isArray(regla.secciones) || regla.secciones.includes(r.seccion))) {
    out.eximicion = {
      evaluacion: regla.evaluacion, segun: regla.segun, minimo: regla.min, promedio: regla.promedio || null,
      ...(Number.isInteger(regla.maxInasistencias) ? { maxInasistencias: regla.maxInasistencias, faltasRegistradas: r.faltas?.activo ? r.faltas.cantidad ?? 0 : null } : {}),
      ...(regla.notaExamen ? { notaExamen: regla.notaExamen } : {}),
      ...(ex ? { cumple: !!ex.elegible, activa: !!ex.activa, promedioActual: ex.promedio ?? null, notaExamenCalculada: ex.notaExamen ?? null } : {}),
      texto: `Se exime de ${regla.evaluacion} con promedio${regla.promedio === 'simple' ? ' simple' : ''} de ${(regla.segun || []).join(', ')} desde ${coma(regla.min)}`
        + (Number.isInteger(regla.maxInasistencias) ? ` y con ${regla.maxInasistencias} faltas como máximo` : '') + '.',
    };
  }
  const bonus = (Array.isArray(r.bonus) ? r.bonus : []).map(b => ({
    id: b.id, pregunta: b.pregunta || null, texto: b.ayuda || null,
    ...(r.bonusConfirmado && b.id in r.bonusConfirmado ? { confirmado: r.bonusConfirmado[b.id] === true } : {}),
    ...(r.bonusIngresado && b.id in r.bonusIngresado ? { ingresado: r.bonusIngresado[b.id] } : {}),
  }));
  if (bonus.length) out.bonus = bonus;
  const ausencias = r.reglasAusenciaJustificada;
  if (ausencias && (ausencias.reemplazos || ausencias.traspasos)) out.ausenciasJustificadas = {
    reemplazos: (ausencias.reemplazos || []).map(x => ({ desde: x.desde, hacia: x.hacia })),
    ...(ausencias.traspasos ? { traspasos: ausencias.traspasos } : {}),
    ...(Number.isInteger(ausencias.maxReemplazos) ? { maxReemplazos: ausencias.maxReemplazos } : {}),
  };
  if (Array.isArray(r.reemplazosOptativos) && r.reemplazosOptativos.length) out.reemplazosOptativos = r.reemplazosOptativos.length;
  const vinculo = calculo.referenciaRamoVinculado?.(r);
  if (vinculo) out.ramoVinculado = { ramo: vinculo.ramo, ...(vinculo.sigla ? { sigla: vinculo.sigla } : {}), ...(Number.isFinite(vinculo.peso) ? { peso: vinculo.peso } : {}), ...(Number.isFinite(vinculo.min) ? { minimo: vinculo.min } : {}) };
  if (r.faltas?.activo) out.faltas = { registradas: r.faltas.cantidad ?? 0, ...(Number.isInteger(r.faltas.limite) ? { maximo: r.faltas.limite } : {}) };
  // Reglas informativas del programa que el promedio no incluye (por ejemplo,
  // el 1,0 a una evaluación no rendida sin justificación). Solo si la app las
  // guardó en el ramo: el servidor no tiene el catálogo.
  for (const k of ['reglasDelCurso', 'reglasNoCalculadas']) if (Array.isArray(r[k]) && r[k].length) out[k] = r[k].filter(t => typeof t === 'string').slice(0, 20);
  return out;
}

// Cada llamada arma el adaptador con los ramos entregados por `agente_datos`.
// No se guarda identidad ni estado académico en el isolate: otro request nunca
// puede heredar la cuenta anterior. El catálogo no viaja al servidor, por eso
// las reglas que el ramo persiste se usan tal cual y no se infieren por nombre.
function calculoPara(ramos, tenant) {
  return motorCompartido.gh_crearCalculoRamo({
    normName: norm,
    copiarRecuperativo,
    definicionPresetDelRamo: ramo => ramo && ramo.eximicion ? { eximicion: ramo.eximicion } : null,
    ramos: () => ramos,
    // Cada universidad redondea su nota oficial a su manera (ver
    // GH_REGLAS_NOTA_POR_TENANT en engine.js). Sin tenant, la regla común.
    tenant: () => tenant,
  });
}

function alcanzaMetaOficial(calculo, ramo, promedio, meta) {
  const final = calculo.notaFinalOficial(promedio);
  const objetivo = calculo.notaFinalOficial(meta);
  return final !== null && final >= objetivo
    && !(objetivo >= 4 && calculo.gatesActivas(ramo).length);
}

// ¿Cuánto necesito en ESTA evaluación, con todo lo demás fijo? `notaNecesaria`
// reparte la misma nota en todo lo pendiente, y con examen y laboratorio
// pendientes esa respuesta no sirve para preparar el examen. No hay fórmula
// nueva: se fija lo demás con los supuestos del agente (o `resto`) en una copia
// del ramo —y del ramo vinculado, si lo hay— y se le pregunta al mismo
// `notaNecesaria`, que ya respeta compuertas, descartes, eximición, el vínculo
// con su mínimo y el redondeo oficial. Lo único pendiente que queda es la
// evaluación pedida, así que su respuesta es la nota de esa evaluación.
function necesitaEnEvaluacion(ramos, ramo, args, meta, tenant) {
  const calculoBase = calculoPara(ramos, tenant);
  const vinculado = calculoBase.ramoVinculado ? calculoBase.ramoVinculado(ramo, ramos) : null;
  const partes = [ramo, ...(vinculado ? [vinculado] : [])];
  const enRamo = (r, nombre) => (r.categorias || []).filter(c => norm(c.nombre) === norm(nombre));
  // La evaluación se busca primero en el ramo pedido y después en el vinculado
  // (el laboratorio de Dinámica vive en otro ramo y entra a su nota).
  const ubicar = (nombre, ramoPedido) => {
    const donde = ramoPedido == null ? partes : partes.filter(r => norm(r.nombre) === norm(ramoPedido) || norm(siglaDeRamo(r)) === norm(ramoPedido));
    for (const r of donde) {
      const cats = enRamo(r, nombre);
      if (cats.length > 1) return { error: `Hay más de una evaluación llamada "${nombre}" en ${r.nombre}. Corrige la pauta en la app antes de calcular.` };
      if (cats.length) return { r, cat: cats[0] };
    }
    const declaradas = partes.flatMap(r => (r.categorias || []).map(c => (partes.length > 1 ? `${c.nombre} (${r.nombre})` : c.nombre)));
    return { error: `No encontré "${nombre}" en ${ramo.nombre}. Las evaluaciones que tiene son: ${declaradas.join(', ')}.` };
  };
  const slotsDe = c => (Number.isInteger(c.slots) && c.slots > 1 ? c.slots : 1);
  const casillaValida = (c, casilla) => casilla == null || (Number.isInteger(casilla) && casilla >= 1 && casilla <= slotsDe(c));

  const objetivo = ubicar(String(args.evaluacion || '').trim());
  if (objetivo.error) return { error: objetivo.error };
  const { r: ramoObjetivo, cat: objetivoCat } = objetivo;
  const casillaObjetivo = args.casilla == null ? null : args.casilla;
  if (!casillaValida(objetivoCat, casillaObjetivo)) return { error: `${objetivoCat.nombre} tiene ${slotsDe(objetivoCat)} casilla${slotsDe(objetivoCat) > 1 ? 's' : ''}; la casilla va de 1 a ${slotsDe(objetivoCat)}.` };
  const pendientesObjetivo = pendientesDeCategoria(objetivoCat).filter(c => casillaObjetivo == null || slotsDe(objetivoCat) === 1 || c === casillaObjetivo);
  if (!pendientesObjetivo.length) return { error: `${objetivoCat.nombre}${casillaObjetivo != null && slotsDe(objetivoCat) > 1 ? ' casilla ' + casillaObjetivo : ''} ya tiene nota: no queda nada que calcular ahí. Para probar otra nota usa simular.` };
  const esObjetivo = (r, c, casilla) => r === ramoObjetivo && c === objetivoCat && (casillaObjetivo == null || slotsDe(c) === 1 || casilla === casillaObjetivo);

  let resto = null;
  if (args.resto != null) {
    resto = Number(args.resto);
    if (!Number.isFinite(resto) || resto < 1 || resto > 7) return { error: '«resto» tiene que ser una nota entre 1,0 y 7,0.' };
  }
  const supuestos = args.supuestos == null ? [] : args.supuestos;
  if (!Array.isArray(supuestos) || supuestos.length > 60) return { error: 'Los supuestos tienen que venir en una lista de hasta 60.' };
  // Cada supuesto cae sobre una casilla pendiente. Uno sin casilla en una
  // evaluación de varias vale para todas sus casillas pendientes.
  const fijadas = new Map();
  const clave = (r, c, casilla) => `${r.id}|${c.id}|${casilla == null ? '' : casilla}`;
  for (const s of supuestos) {
    const nombre = String(s && s.evaluacion || '').trim(), valor = Number(s && s.valor), casilla = s && s.casilla;
    if (!nombre) return { error: 'Cada supuesto necesita el nombre de su evaluación.' };
    if (!Number.isFinite(valor) || valor < 1 || valor > 7) return { error: `El supuesto de "${nombre}" está fuera de la escala 1,0 a 7,0.` };
    const lugar = ubicar(nombre, s.ramo);
    if (lugar.error) return { error: lugar.error };
    if (!casillaValida(lugar.cat, casilla)) return { error: `La casilla de "${nombre}" va de 1 a ${slotsDe(lugar.cat)}.` };
    const pedidas = pendientesDeCategoria(lugar.cat).filter(c => casilla == null || slotsDe(lugar.cat) === 1 || c === casilla);
    const libres = pedidas.filter(c => !esObjetivo(lugar.r, lugar.cat, c));
    if (!libres.length) {
      return { error: pedidas.length
        ? `"${nombre}" es la evaluación que estás calculando: no puede ser también un supuesto.`
        : `"${nombre}"${casilla != null && slotsDe(lugar.cat) > 1 ? ' casilla ' + casilla : ''} ya tiene nota; los supuestos son solo para lo pendiente.` };
    }
    for (const c of libres) {
      if (fijadas.has(clave(lugar.r, lugar.cat, c))) return { error: `Hay dos supuestos para "${nombre}"${c != null ? ' casilla ' + c : ''}.` };
      fijadas.set(clave(lugar.r, lugar.cat, c), { r: lugar.r, cat: lugar.cat, casilla: c, valor, origen: 'supuesto' });
    }
  }
  // Todo lo pendiente fuera de la evaluación pedida queda fijo: con un
  // supuesto, con `resto`, o se pide en vez de suponerlo en silencio.
  const faltan = [];
  for (const r of partes) for (const c of r.categorias || []) for (const casilla of pendientesDeCategoria(c)) {
    if (!(Number(c.peso) > 0) || esObjetivo(r, c, casilla) || fijadas.has(clave(r, c, casilla))) continue;
    if (resto !== null) fijadas.set(clave(r, c, casilla), { r, cat: c, casilla, valor: resto, origen: 'resto' });
    else faltan.push(`${c.nombre}${casilla != null ? ' ' + casilla : ''}${r !== ramo ? ' (' + r.nombre + ')' : ''}`);
  }
  if (faltan.length) {
    return { error: `Para calcular ${objetivoCat.nombre} con el resto fijo falta suponer: ${faltan.join(', ')}. Pásalos en «supuestos» o usa «resto» para darles a todos la misma nota.` };
  }

  const fijas = [...fijadas.values()];
  const clones = new Map(partes.map(r => [r, ramoSimulado(r, fijas.filter(f => f.r === r).map(f => ({ evaluacion: f.cat.nombre, valor: f.valor, casilla: f.casilla })))]));
  const calculo = calculoPara(ramos.map(x => clones.get(x) || x), tenant);
  const necesaria = calculo.notaNecesaria(clones.get(ramo), meta);
  let estado = 'alcanzable';
  if (necesaria === null) estado = 'no_calculable';
  else if (necesaria > 7) estado = 'fuera_de_escala';
  else if (necesaria <= 1 + 1e-9) estado = 'con_cualquier_nota';
  // La comprobación con la nota puesta: la misma copia con la evaluación
  // pedida en esa nota, para que el agente vea la final y las compuertas.
  let comprobacion = null;
  if (estado === 'alcanzable' || estado === 'con_cualquier_nota') {
    const valor = Math.max(1, Math.min(7, necesaria));
    const conObjetivo = new Map([...clones].map(([orig, c]) => [orig, orig === ramoObjetivo
      ? ramoSimulado(c, pendientesObjetivo.map(casilla => ({ evaluacion: objetivoCat.nombre, valor, casilla })))
      : c]));
    const calc2 = calculoPara(ramos.map(x => conObjetivo.get(x) || x), tenant);
    const final = calc2.ramoAvg(conObjetivo.get(ramo));
    comprobacion = {
      finalConEsaNota: final,
      alcanzaLaMeta: alcanzaMetaOficial(calc2, conObjetivo.get(ramo), final, meta),
      compuertasIncumplidas: calc2.gatesActivas(conObjetivo.get(ramo)).map(g => ({ nombre: g.nombre, actual: g.actual, minimo: g.min, tope: g.cap })),
    };
  }
  return {
    ramo: ramo.nombre, meta,
    evaluacion: objetivoCat.nombre,
    ...(ramoObjetivo !== ramo ? { enRamoVinculado: ramoObjetivo.nombre } : {}),
    ...(slotsDe(objetivoCat) > 1 ? { casillas: pendientesObjetivo } : {}),
    notaNecesaria: necesaria,
    estado,
    ...(estado === 'no_calculable' ? { motivo: 'El motor no puede proyectar esta evaluación (por ejemplo, una ausencia justificada sin resolver o una eximición ya cerrada).' } : {}),
    ...(comprobacion || {}),
    supuestos: fijas.map(f => ({ evaluacion: f.cat.nombre, ...(f.casilla != null ? { casilla: f.casilla } : {}), ...(f.r !== ramo ? { ramo: f.r.nombre } : {}), valor: f.valor, origen: f.origen })),
    ...((calculoBase.reglasCalculoVigentes?.(ramo) || []).some(g => g.type === 'conditional_weights')
      ? { advertencia: 'Este ramo cambia de fórmula según las notas: con otros supuestos la respuesta puede cambiar más de lo esperado.' } : {}),
    nota: 'Cálculo con el resto fijo en los supuestos. No se guardó nada.',
  };
}

function queNecesitoParaAprobar(ramos, args, tenant) {
  const ramo = buscarRamo(ramos, args.ramo);
  if (!ramo) return { error: 'No encontré ese ramo', ramos: ramos.map(r => r.nombre) };
  const meta = args.meta == null ? 4 : Number(args.meta);
  if (!Number.isFinite(meta) || meta < 1 || meta > 7) return { error: 'La meta debe ser una nota entre 1,0 y 7,0.' };
  if (args.evaluacion != null) return necesitaEnEvaluacion(ramos, ramo, args, meta, tenant);

  const calculo = calculoPara(ramos, tenant);
  const promedioNecesario = calculo.notaNecesaria(ramo, meta);
  const promedioActual = calculo.ramoAvg(ramo);
  const compuertasIncumplidas = calculo.gatesActivas(ramo).map(g => ({
    nombre: g.nombre,
    actual: g.actual,
    minimo: g.min,
    tope: g.cap,
  }));

  const base = calculo.calculoRamoConCompuertas?.(ramo);
  const motivosPendientes = [];
  if(base?.ausencias?.bloqueadas?.length)motivosPendientes.push('Las pruebas justificadas superan el máximo del examen; falta resolver el derecho a examen o la recuperativa con el curso.');
  if(base?.res.formulas?.some(f=>f.ambigua))motivosPendientes.push('El programa se contradice en el límite exacto 3,8: confirma con el profesor cómo ponderar las tareas.');
  let estado = 'alcanzable';
  if (promedioNecesario === null) estado = promedioActual === null ? 'sin_notas' : (alcanzaMetaOficial(calculo, ramo, promedioActual, meta) ? 'meta_alcanzada' : 'sin_evaluaciones_pendientes');
  else if (promedioNecesario > 7) estado = 'fuera_de_escala';
  else if (promedioNecesario < 1) estado = 'con_cualquier_nota';

  if(motivosPendientes.length)estado='requiere_confirmacion_curso';
  return {
    ramo: ramo.nombre,
    meta,
    ...(motivosPendientes.length?{motivosPendientes}:{}),
    ...((calculo.reglasCalculoVigentes?.(ramo)||[]).some(g=>g.type==='conditional_weights')?{supuesto:'La misma nota en cada evaluación pendiente. Cambiar una nota puede activar otra fórmula; el resultado no es un mínimo monotónico.'}:{}),
    promedioActual,
    promedioNecesario,
    ...(calculo.estadoEximicion(ramo)?.regla.notaExamen==='maxima'?{eximicion:{
      activa:calculo.estadoEximicion(ramo).activa,presentacion:calculo.estadoEximicion(ramo).promedio,
      notaExamen:calculo.estadoEximicion(ramo).notaExamen,
      necesariaEnPrevias:calculo.notaNecesariaEximicion(ramo),requiereAsistencia:true,
    }}:{}),
    factibleEnEscala: promedioNecesario === null ? alcanzaMetaOficial(calculo, ramo, promedioActual, meta) : promedioNecesario <= 7,
    estado,
    // No se esconden detrás del promedio: una compuerta puede impedir aprobar
    // aunque la exigencia ponderada sí quepa dentro de la escala.
    compuertasIncumplidas,
  };
}

// La propuesta solo puede caer sobre un ramo que ya está en el semestre. Así
// nunca crea un ramo a espaldas de la persona ni queda una pauta huérfana que
// la app no pueda revisar y aplicar con sus notas a la vista.
function ramoParaPropuesta(estado, consulta) {
  const ramos = Array.isArray(estado.ramos) ? estado.ramos : [];
  return buscarRamo(ramos, consulta);
}

function errorPropuesta(valor) {
  if (!valor || typeof valor !== 'object') return 'No se pudo guardar la propuesta.';
  const mensaje = String(valor.message || valor.details || '');
  // La RPC devuelve errores pensados para que el agente los corrija. No se
  // reenvía el resto de la respuesta de PostgREST: puede incluir detalles de
  // infraestructura que no ayudan a arreglar una pauta.
  return mensaje.startsWith('Propuesta inválida:') || mensaje.startsWith('No se encontró') || mensaje.startsWith('La conexión')
    ? mensaje
    : 'No se pudo guardar la propuesta.';
}

async function guardarPropuestaFechas(token, estado, args) {
  const ramo = ramoParaPropuesta(estado, args.ramo);
  if (!ramo) return { error: 'No se encontró ese ramo en el semestre. Pídele a la persona que lo agregue primero.' };
  const invalida = validarPropuestaFechas(args);
  if (invalida) return { error: invalida };
  const declaradas = (ramo.categorias || []).map(c => String(c.nombre || ''));
  const sinCalce = args.fechas
    .map(f => String(f.evaluacion || '').trim())
    .filter(nombre => !declaradas.some(d => norm(d) === norm(nombre)));
  if (sinCalce.length) {
    return { error: `No encontré estas evaluaciones en ${ramo.nombre}: ${sinCalce.join(', ')}. Las que tiene son: ${declaradas.join(', ')}.` };
  }
  const clave = String((ramo.origen && ramo.origen.ramoKey) || norm(ramo.nombre));
  try {
    const r = await rpc('proponer_fechas_agente', {
      p_token: token,
      p_ramo: String(ramo.nombre || '').trim(),
      p_ramo_key: clave,
      p_fechas: args.fechas,
      p_fuente: String(args.fuente || '').trim(),
    });
    if (!r.ok) return { error: errorPropuesta(await r.json().catch(() => null)) };
    const data = await r.json();
    return {
      id: data, ramo: ramo.nombre, fechas: args.fechas.length,
      mensaje: 'Fechas propuestas. NO están guardadas: la persona las acepta, edita o rechaza en la ficha del ramo.',
    };
  } catch {
    return { error: 'No se pudo conectar con GradeHub para guardar la propuesta.' };
  }
}

async function guardarPropuestaNotas(token, estado, args) {
  const ramo = ramoParaPropuesta(estado, args.ramo);
  if (!ramo) return { error: 'No se encontró ese ramo en el semestre. Pídele a la persona que lo agregue primero.' };
  const invalida = validarPropuestaNotas(args);
  if (invalida) return { error: invalida };
  // Se avisa cuando una evaluación propuesta no existe en el ramo, en vez de
  // guardarla y que aparezca como una fila que no calza con nada. El agente
  // puede corregir el nombre y reintentar; la lista de las que sí hay es lo que
  // se lo permite.
  const declaradas = (ramo.categorias || []).map(c => String(c.nombre || ''));
  const sinCalce = args.notas
    .map(n => String(n.evaluacion || '').trim())
    .filter(nombre => !declaradas.some(d => norm(d) === norm(nombre)));
  if (sinCalce.length) {
    return { error: `No encontré estas evaluaciones en ${ramo.nombre}: ${sinCalce.join(', ')}. Las que tiene son: ${declaradas.join(', ')}.` };
  }
  const clave = String((ramo.origen && ramo.origen.ramoKey) || norm(ramo.nombre));
  try {
    const r = await rpc('proponer_notas_agente', {
      p_token: token,
      p_ramo: String(ramo.nombre || '').trim(),
      p_ramo_key: clave,
      p_notas: args.notas,
      p_fuente: String(args.fuente || '').trim(),
    });
    if (!r.ok) return { error: errorPropuesta(await r.json().catch(() => null)) };
    const data = await r.json();
    return {
      id: data, ramo: ramo.nombre, notas: args.notas.length,
      mensaje: 'Notas propuestas. NO están guardadas: la persona las acepta, edita o rechaza en la ficha del ramo.',
    };
  } catch {
    return { error: 'No se pudo conectar con GradeHub para guardar la propuesta.' };
  }
}

async function guardarPropuestaPauta(token, estado, args) {
  const ramo = ramoParaPropuesta(estado, args.ramo);
  if (!ramo) return { error: 'No se encontró ese ramo en el semestre. Pídele a la persona que lo agregue primero.' };
  const evaluaciones = args.evaluaciones;
  const invalida = validarPropuestaPauta(args);
  if (invalida) return { error: invalida };
  const clave = String((ramo.origen && ramo.origen.ramoKey) || norm(ramo.nombre));
  try {
    const r = await rpc('proponer_pauta_agente', {
      p_token: token,
      p_ramo: String(ramo.nombre || '').trim(),
      p_ramo_key: clave,
      p_evaluaciones: evaluaciones,
      p_fuente: String(args.fuente || '').trim(),
    });
    if (!r.ok) return { error: errorPropuesta(await r.json().catch(() => null)) };
    const data = await r.json();
    return { id: data, ramo: ramo.nombre, mensaje: 'Propuesta guardada. La persona la revisará en GradeHub antes de aplicarla.' };
  } catch {
    return { error: 'No se pudo conectar con GradeHub para guardar la propuesta.' };
  }
}

// Los ramos del horario. Es la única propuesta que no cae sobre un ramo que ya
// existe —justamente propone los que faltan—, así que lo que se comprueba acá
// es lo contrario: que no venga proponiendo lo que la persona ya tiene.
async function guardarPropuestaRamos(token, estado, args) {
  const invalida = validarPropuestaRamos(args);
  if (invalida) return { error: invalida };
  const actuales = Array.isArray(estado.ramos) ? estado.ramos : [];
  // Como ramoPropuestoYaEsta en app.js: si los dos tienen sigla, manda la sigla.
  // Por nombre se confunden los homónimos (TEB110 y TTF012 se llaman igual).
  const yaTiene = r => actuales.some(x => {
    const propia = siglaDeRamo(x), pedida = r.sigla == null ? '' : String(r.sigla).trim().toUpperCase();
    return propia && pedida ? propia === pedida : norm(x.nombre) === norm(r.nombre);
  });
  const repetidos = args.ramos.filter(yaTiene).map(r => String(r.nombre).trim());
  const nuevos = args.ramos.filter(r => !yaTiene(r)).map(r => {
    const fila = { nombre: String(r.nombre).trim() };
    const sigla = r.sigla == null ? '' : String(r.sigla).trim();
    if (sigla) fila.sigla = sigla.toUpperCase();
    if (Number.isInteger(r.seccion)) fila.seccion = r.seccion;
    return fila;
  });
  if (!nuevos.length) {
    return { error: `Ya tiene todos esos ramos en su semestre: ${repetidos.join(', ')}. No hay nada que proponer.` };
  }
  try {
    const r = await rpc('proponer_ramos_agente', {
      p_token: token,
      p_ramos: nuevos,
      p_fuente: String(args.fuente || '').trim(),
    });
    if (!r.ok) return { error: errorPropuesta(await r.json().catch(() => null)) };
    const data = await r.json();
    return {
      id: data,
      ramos: nuevos.length,
      // Se dicen los que se dejaron fuera: el agente le puede avisar en vez de
      // que la persona note después que faltaba uno.
      yaLosTenia: repetidos,
      mensaje: 'Ramos propuestos. NO están agregados: la persona los revisa y acepta en GradeHub, y ahí se les carga la pauta oficial si existe.',
    };
  } catch {
    return { error: 'No se pudo conectar con GradeHub para guardar la propuesta.' };
  }
}

// Da forma a las herramientas que responden directamente desde el estado
// autorizado. `proponer_pauta` se despacha aparte porque usa su propia RPC;
// cualquier herramienta todavía pendiente devuelve `undefined` y el endpoint
// lo dice con todas sus letras.
// La sigla NO está guardada en el ramo: la app la deriva de sus tablas de
// catálogo, que no viven acá. Lo único disponible del lado del servidor es la
// clave de origen, y solo sirve cuando tiene forma de código oficial —los ramos
// UC antiguos guardaron ahí el nombre normalizado—. Se devuelve null cuando no
// se puede saber, que es distinto de inventarla: mismo criterio que usa
// `siglaDeRamo` en app.js para ese caso.
const FORMA_SIGLA = /^[A-Z]{2,5}\d{3,4}[A-Z]?$/i;
function siglaDeRamo(r) {
  if (r && typeof r.sigla === 'string' && FORMA_SIGLA.test(r.sigla)) return r.sigla.toUpperCase();
  const clave = r && r.origen && r.origen.ramoKey;
  return typeof clave === 'string' && FORMA_SIGLA.test(clave) ? clave.toUpperCase() : null;
}

// Los umbrales son los de app.js: bajo 5,0 es riesgo, y sobre 7,05 de exigencia
// ya no alcanza. Si acá dijeran otra cosa, la app y el agente contestarían
// distinto sobre el mismo ramo.
function riesgoDeRamo(promedio, necesario) {
  if (promedio === null) return 'sin_notas';
  if (necesario !== null && necesario > 7.05) return 'ya_no_alcanza';
  if (Math.round(promedio * 100) / 100 < 5) return 'en_riesgo';
  return 'bien';
}

// ─── ESTADO DEL SEMESTRE Y SIMULACIÓN ───────────────────────────────────────

// "Hoy" es el de Chile, no el del servidor. Cloudflare corre en UTC: desde las
// 20:00 o 21:00 de acá allá ya es mañana, y resumen_para_hoy anunciaba como de
// hoy las pruebas de mañana y daba por pasadas las de esta noche.
const hoyChile = (ahora = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago' }).format(ahora);
const sumarDias = (iso, n) => { const d = new Date(iso + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
// Una ventana absurda (`dias: 1e9`) reventaba el Date con un RangeError.
const ventanaDias = (dias, porDefecto) => Math.min(366, Number(dias) > 0 ? Math.ceil(Number(dias)) : porDefecto);

// Todas las fechas del semestre: la de cada evaluación y la propia de cada
// casilla. Una casilla con fecha es una evaluación suelta dentro del grupo —el
// Control 2 puede ser tres semanas después del Control 1— y la fecha de la
// categoría vale para el grupo entero. Antes solo evaluaciones_proximas miraba
// las casillas; estado_semestre y resumen_para_hoy no las veían, igual que le
// pasaba a "Próxima evaluación" en la app (#534).
function fechasDeRamos(ramos) {
  const out = [];
  ramos.forEach(r => (r.categorias || []).forEach(c => {
    (c.notas || []).forEach(n => {
      if (!n.fecha) return;
      out.push({
        ramo: r.nombre, evaluacion: n.nombre || c.nombre, fecha: n.fecha,
        hora: n.hora || null, peso: c.peso, grupo: c.nombre,
        rendida: typeof n.valor === 'number',
      });
    });
    if (!c.fecha) return;
    // La fecha del grupo vale para las casillas sin fecha propia, como en
    // porRegistrar. Sin `rendida`, una prueba que ya tenía nota seguía saliendo
    // como la próxima del ramo, y la app (agendaEvents) ya no la mostraba.
    const conFecha = new Set((c.notas || []).filter(n => n.fecha && Number.isInteger(n.slot)).map(n => n.slot + 1));
    const rendida = !pendientesDeCategoria(c).some(casilla => !conFecha.has(casilla));
    out.push({ ramo: r.nombre, evaluacion: c.nombre, fecha: c.fecha, hora: c.hora || null, peso: c.peso, rendida });
  }));
  // Mismo orden que la Agenda: dos pruebas el mismo día van por hora.
  return out.sort((a, b) => a.fecha.localeCompare(b.fecha) || (a.hora || '').localeCompare(b.hora || ''));
}

// La regla del promedio general es la de `gpa()` en app.js y tiene que decir lo
// mismo que la app: se pondera por créditos SOLO si todos los ramos con nota
// los tienen, y un ramo que aporta su nota a otro (el laboratorio de Dinámica)
// no entra por su cuenta, porque ya está contado adentro del otro.
function promedioGeneral(ramos, calculo) {
  const aportados = new Set(ramos.filter(r => r && r.aporta && r.aporta.ramo).map(r => norm(r.aporta.ramo)));
  const cuentan = ramos.filter(r => !aportados.has(norm(r.nombre)));
  const conNota = cuentan.map(r => ({ r, avg: calculo.ramoAvg(r) })).filter(x => x.avg !== null);
  if (!conNota.length) return { valor: null, modo: 'sin_notas', ramosConNota: 0 };
  const tieneCreditos = r => typeof r.creditos === 'number' && r.creditos >= 0;
  const simple = conNota.reduce((a, x) => a + x.avg, 0) / conNota.length;
  if (!conNota.every(x => tieneCreditos(x.r))) return { valor: simple, modo: 'simple', ramosConNota: conNota.length };
  const den = conNota.reduce((a, x) => a + x.r.creditos, 0);
  return {
    valor: den > 0 ? conNota.reduce((a, x) => a + x.avg * x.r.creditos, 0) / den : simple,
    modo: den > 0 ? 'creditos' : 'simple',
    ramosConNota: conNota.length,
  };
}

function proximaConFecha(ramo, hoy) {
  const f = fechasDeRamos([ramo]).find(x => x.fecha >= hoy && !x.rendida);
  return f ? { evaluacion: f.evaluacion, fecha: f.fecha, hora: f.hora, peso: f.peso } : null;
}

// Una copia del ramo con notas hipotéticas puestas encima. No toca el original
// ni vuelve a la base: se calcula y se bota. Las casillas usan `slot` como en
// el resto de la app, así el motor las cuenta igual que si fueran reales.
function ramoSimulado(ramo, notas) {
  const clon = { ...ramo, categorias: (ramo.categorias || []).map(c => ({ ...c, notas: (c.notas || []).map(n => ({ ...n })) })) };
  notas.forEach(({ evaluacion, valor, casilla }) => {
    const cat = clon.categorias.find(c => norm(c.nombre) === norm(evaluacion));
    if (!cat) return;
    const slots = Number.isInteger(cat.slots) && cat.slots > 1 ? cat.slots : 0;
    if (slots) {
      const slot = (Number.isInteger(casilla) ? casilla : 1) - 1;
      const existente = cat.notas.find(n => n.slot === slot);
      if (existente) existente.valor = valor;
      else cat.notas.push({ id: `__sim__${cat.id}__${slot}`, nombre: `${cat.nombre} ${slot + 1}`, valor, slot, peso: 1 });
    } else if (cat.notas.length) {
      cat.notas[0] = { ...cat.notas[0], valor };
    } else {
      cat.notas.push({ id: `__sim__${cat.id}`, nombre: cat.nombre, valor, peso: 1 });
    }
  });
  return clon;
}

function errorSimulacion(ramo, notas) {
  if (!Array.isArray(notas)) return 'Las notas tienen que venir en una lista.';
  if (notas.length > 60) return 'Como máximo 60 notas por simulación.';
  const declaradas = (ramo.categorias || []).map(c => String(c.nombre || ''));
  for (const n of notas) {
    const evaluacion = String(n && n.evaluacion || '').trim();
    const valor = Number(n && n.valor);
    const casilla = n && n.casilla;
    if (!evaluacion) return 'Cada nota necesita el nombre de su evaluación.';
    if (!Number.isFinite(valor) || valor < 1 || valor > 7) return `"${evaluacion}" tiene una nota fuera de la escala 1,0 a 7,0.`;
    if (casilla != null && (!Number.isInteger(casilla) || casilla < 1 || casilla > 100)) return 'La casilla debe ser un entero entre 1 y 100.';
    if (!declaradas.some(d => norm(d) === norm(evaluacion))) {
      return `No encontré "${evaluacion}" en ${ramo.nombre}. Las evaluaciones que tiene son: ${declaradas.join(', ')}.`;
    }
  }
  return null;
}

function prepararAusenciasSimuladas(ramo, ausencias, notas) {
  if (!Array.isArray(ausencias)) return { error: 'Las ausencias tienen que venir en una lista.' };
  if (ausencias.length > 60) return { error: 'Como máximo 60 ausencias por simulación.' };
  if (!ausencias.length) return { categorias: [] };
  const oficial = ramo.reglasAusenciaJustificada;
  const estudiante = ramo.reglasAusenciaJustificadaUsuario?.declaradaPor === 'estudiante'
    ? ramo.reglasAusenciaJustificadaUsuario : null;
  const regla = oficial || estudiante;
  if (!regla) return { error: 'Este ramo no tiene declarada la regla de inasistencia justificada; revisa el programa o declárala en la app.' };
  const categorias = [], vistas = new Set();
  for (const ausencia of ausencias) {
    const nombre = String(ausencia?.evaluacion || '').trim();
    if (!nombre) return { error: 'Cada ausencia necesita el nombre de su evaluación.' };
    const encontradas = (ramo.categorias || []).filter(c => norm(c.nombre) === norm(nombre));
    if (!encontradas.length) return { error: `No encontré "${nombre}" en ${ramo.nombre}.` };
    if (encontradas.length > 1) return { error: `Hay más de una evaluación llamada "${nombre}". Corrige la pauta en la app antes de simular la ausencia.` };
    const cat = encontradas[0];
    if (vistas.has(cat.id)) return { error: `La ausencia de ${cat.nombre} está repetida.` };
    vistas.add(cat.id);
    const casilla = ausencia.casilla;
    if (casilla != null && (!Number.isInteger(casilla) || casilla < 1 || casilla > 100))
      return { error: 'La casilla debe ser un entero entre 1 y 100.' };
    if (casilla != null && Number.isInteger(cat.slots) && cat.slots > 1)
      return { error: `La justificación de ${cat.nombre} se aplica a la evaluación completa, no a una sola casilla. Omite «casilla» para simularla.` };
    if (casilla != null && casilla !== 1)
      return { error: `${cat.nombre} tiene una sola casilla; usa 1 u omite «casilla».` };
    if (!(Number(cat.peso) > 0)) return { error: `${cat.nombre} no tiene un peso válido para justificar.` };
    if ((cat.notas || []).some(n => n?.valor != null))
      return { error: `${cat.nombre} ya tiene nota; no se puede simular una inasistencia justificada.` };
    if (notas.some(n => norm(n?.evaluacion) === norm(cat.nombre)))
      return { error: `No se puede poner una nota hipotética y justificar ${cat.nombre} en el mismo escenario.` };
    const entradas = ['rezagos', 'reemplazos', 'traspasos']
      .flatMap(tipo => Array.isArray(regla[tipo]) ? regla[tipo] : []);
    if (!entradas.some(x => x.desdeId === cat.id))
      return { error: `La regla guardada no indica qué ocurre al justificar ${cat.nombre}; revisa el programa o la declaración en la app.` };
    categorias.push(cat);
  }
  return { categorias };
}

function detalleAusenciasSimuladas(ramo, categorias, estado) {
  return categorias.map(cat => {
    const aplicada = (estado.activas || []).find(x => x.desdeId === cat.id);
    const pendiente = (estado.pendientes || []).find(x => x.desdeId === cat.id);
    const inactiva = (estado.inactivas || []).find(x => x.desdeId === cat.id);
    if (inactiva || (!aplicada && !pendiente))
      return { error: `La ausencia de ${cat.nombre} no se puede aplicar a esta pauta; revisa la regla en la app.` };
    const movimiento = aplicada || pendiente;
    const destino = (ramo.categorias || []).find(c => c.id === movimiento.haciaId);
    const nuevoDestino = (estado.estructura.children || []).find(c => c.id === movimiento.haciaId);
    return {
      evaluacion: cat.nombre,
      tipo: movimiento.tipo,
      estado: aplicada ? 'aplicada' : 'pendiente',
      ...(pendiente ? { motivo: pendiente.motivo } : {}),
      pesoOriginal: cat.peso,
      destino: destino?.nombre || null,
      ...(movimiento.tipo === 'traspaso' && aplicada ? {
        pesoNuevoDestino: nuevoDestino?.weight ?? null,
        pesoAplicado: aplicada.pesoAplicado,
        topeAplicado: aplicada.pesoExcedente > 0,
        pesoExcedenteConNotaUno: aplicada.pesoExcedente,
        ...(aplicada.pesoExcedente > 0 ? { topePesoDestino: aplicada.topePesoDestino, notaExceso: aplicada.notaExceso } : {}),
      } : {}),
      origenRegla: estado.origenRegla,
      yaDeclarada: (ramo.ausenciasJustificadas || []).includes(cat.id),
    };
  });
}

// Sin notas hipotéticas, la pregunta es la otra: dónde rinde estudiar. Para cada
// evaluación sin nota se calcula la nota final sacándose un 7 y sacándose un 1,
// con TODO lo demás pendiente fijo en 4,0 en los dos casos. Ese supuesto es lo
// que hace comparable el número: sin él, con el semestre entero pendiente, cada
// evaluación parece mover la final entera, porque el promedio de lo rendido es
// esa sola nota. Sale del mismo motor, así que respeta pesos, casillas,
// descartes y compuertas en vez de suponer que el peso es el impacto.
const BASE_PENDIENTE = 4;

function pendientesDeCategoria(cat) {
  const slots = Number.isInteger(cat.slots) && cat.slots > 1 ? cat.slots : 0;
  const conNota = (cat.notas || []).filter(n => typeof n.valor === 'number');
  if (!slots) return conNota.length ? [] : [undefined];
  const ocupados = new Set(conNota.map(n => n.slot));
  const libres = [];
  for (let i = 0; i < slots; i++) if (!ocupados.has(i)) libres.push(i + 1);
  return libres;
}

function impactoPendientes(ramos, ramo, meta, tenant) {
  const pendientes = (ramo.categorias || [])
    .map(cat => ({ cat, casillas: pendientesDeCategoria(cat) }))
    .filter(x => x.casillas.length);
  const relleno = valorPorCategoria => pendientes.flatMap(({ cat, casillas }) =>
    casillas.map(casilla => ({ evaluacion: cat.nombre, valor: valorPorCategoria(cat), casilla })));
  const finalCon = valorPorCategoria => {
    const clon = ramoSimulado(ramo, relleno(valorPorCategoria));
    return calculoPara(ramos.map(x => (x === ramo ? clon : x)), tenant).ramoAvg(clon);
  };
  return pendientes.map(({ cat, casillas }) => {
    const mejor = finalCon(c => (c === cat ? 7 : BASE_PENDIENTE));
    const peor = finalCon(c => (c === cat ? 1 : BASE_PENDIENTE));
    if (mejor === null || peor === null) return null;
    return {
      evaluacion: cat.nombre,
      peso: cat.peso,
      casillasPendientes: casillas.length,
      notaFinalSiSacas7: mejor,
      notaFinalSiSacas1: peor,
      // Cuánto se mueve la nota final entre el mejor y el peor caso: es el
      // orden en que conviene repartir las horas.
      mueveLaFinal: Math.round((mejor - peor) * 100) / 100,
      decideAprobar: peor < meta && mejor >= meta,
    };
  }).filter(Boolean).sort((a, b) => b.mueveLaFinal - a.mueveLaFinal);
}

// Evaluaciones cuya fecha ya pasó y siguen sin nota. Es el dato que más rinde
// en un repaso: la app no puede saber la nota, pero sí puede notar que la
// prueba fue hace dos semanas y la casilla sigue vacía, que es justo cuando el
// promedio que se está mirando ya no es el real.
function porRegistrar(ramos, hoy, diasAtras = 45) {
  const desde = sumarDias(hoy, -diasAtras);
  const enRango = f => !!f && f < hoy && f >= desde;
  const filas = [];
  ramos.forEach(r => (r.categorias || []).forEach(c => {
    // Una casilla con fecha propia se cuenta sola; la fecha de la categoría
    // vale para las casillas que no tienen la suya.
    const propias = (c.notas || []).filter(n => n.fecha && Number.isInteger(n.slot) && typeof n.valor !== 'number');
    propias.forEach(n => {
      if (enRango(n.fecha)) filas.push({ ramo: r.nombre, evaluacion: n.nombre || c.nombre, fecha: n.fecha, casillasSinNota: 1 });
    });
    if (!enRango(c.fecha)) return;
    const conFecha = new Set(propias.map(n => n.slot + 1));
    const faltan = pendientesDeCategoria(c).filter(casilla => !conFecha.has(casilla)).length;
    if (faltan) filas.push({ ramo: r.nombre, evaluacion: c.nombre, fecha: c.fecha, casillasSinNota: faltan });
  }));
  return filas.sort((a, b) => b.fecha.localeCompare(a.fecha));
}

function simular(ramos, args, tenant) {
  const ramo = buscarRamo(ramos, args.ramo);
  if (!ramo) return { error: 'No encontré ese ramo', ramos: ramos.map(r => r.nombre) };
  const meta = args.meta == null ? 4 : Number(args.meta);
  if (!Number.isFinite(meta) || meta < 1 || meta > 7) return { error: 'La meta debe ser una nota entre 1,0 y 7,0.' };
  const notas = args.notas == null ? [] : args.notas;
  const invalida = errorSimulacion(ramo, notas);
  if (invalida) return { error: invalida };
  const ausencias = args.ausencias == null ? [] : args.ausencias;
  const preparadas = prepararAusenciasSimuladas(ramo, ausencias, notas);
  if (preparadas.error) return { error: preparadas.error };

  const actual = calculoPara(ramos, tenant).ramoAvg(ramo);
  if (!notas.length && !preparadas.categorias.length) {
    return {
      ramo: ramo.nombre, meta, promedioActual: actual,
      impacto: impactoPendientes(ramos, ramo, meta, tenant),
      supuesto: `Para comparar, el resto de lo pendiente se deja en ${BASE_PENDIENTE},0 en los dos escenarios.`,
      nota: 'Nada de esto está guardado: es lo que pasaría con cada evaluación que le queda.',
    };
  }

  const clon = ramoSimulado(ramo, notas);
  if (preparadas.categorias.length) {
    clon.ausenciasJustificadas = [...new Set([
      ...(Array.isArray(ramo.ausenciasJustificadas) ? ramo.ausenciasJustificadas : []),
      ...preparadas.categorias.map(cat => cat.id),
    ])];
  }
  const calculo = calculoPara(ramos.map(x => (x === ramo ? clon : x)), tenant);
  const estadoAusencias = preparadas.categorias.length ? calculo.estadoAusenciasJustificadas(clon) : null;
  const detalleAusencias = estadoAusencias ? detalleAusenciasSimuladas(ramo, preparadas.categorias, estadoAusencias) : [];
  const noAplicable = detalleAusencias.find(x => x.error);
  if (noAplicable) return { error: noAplicable.error };
  const simulado = calculo.ramoAvg(clon);
  const faltaDespues = calculo.notaNecesaria(clon, meta);
  return {
    ramo: ramo.nombre,
    meta,
    promedioActual: actual,
    promedioSimulado: simulado,
    alcanzaLaMeta: alcanzaMetaOficial(calculo, clon, simulado, meta),
    // Lo que todavía quedaría por rendir después de estas notas: null cuando ya
    // no queda nada pendiente.
    promedioNecesarioEnLoQueQueda: faltaDespues,
    compuertasIncumplidas: calculo.gatesActivas(clon).map(g => ({ nombre: g.nombre, actual: g.actual, minimo: g.min, tope: g.cap })),
    ...(detalleAusencias.length ? { ausenciasSimuladas: detalleAusencias, origenReglaAusencia: estadoAusencias.origenRegla } : {}),
    nota: detalleAusencias.length
      ? 'Simulación: no se guardó ninguna nota ni inasistencia.'
      : 'Simulación: no se guardó ninguna nota.',
  };
}

function despachar(nombre, estado, args) {
  const ramos = Array.isArray(estado.ramos) ? estado.ramos : [];
  const tenant = typeof estado.tenant === 'string' ? estado.tenant : null;
  const buscar = q => buscarRamo(ramos, q);

  if (nombre === 'listar_ramos') {
    // Prometía "promedio actual, cuánto llevan evaluado y si están en riesgo" y
    // devolvía el nombre, los créditos y un conteo. Un agente que lee la
    // descripción pide esto y recibe otra cosa, así que se arregla la
    // implementación y no la promesa: son los tres datos que hacen útil la
    // herramienta, y el motor ya los calcula.
    //
    // `cantidadEvaluaciones` en vez de `evaluaciones`: la clave `evaluaciones`
    // en `ver_ramo` es el ARRAY de evaluaciones, y tenerla acá como número
    // hacía que la misma palabra significara dos cosas distintas.
    const calculo = calculoPara(ramos, tenant);
    return ramos.map(r => {
      const promedio = calculo.ramoAvg(r);
      const necesario = calculo.notaNecesaria(r);
      const avance = calculo.estadoParaNotaNecesaria(r);
      return {
        nombre: r.nombre,
        sigla: siglaDeRamo(r),
        creditos: r.creditos ?? null,
        promedio,
        // Fracción del peso del ramo que ya tiene nota, en porcentaje entero.
        avanceEvaluado: avance && avance.total > 0 ? Math.round((1 - avance.pendiente) * 100) : 0,
        cantidadEvaluaciones: (r.categorias || []).length,
        // Los mismos umbrales que usa la app para su tarjeta de riesgo (5,0 de
        // promedio y 7,05 de exigencia). Tenerlos escritos de nuevo con otros
        // números diría que un ramo está en riesgo en la app y bien acá.
        riesgo: riesgoDeRamo(promedio, necesario),
      };
    });
  }

  if (nombre === 'ver_ramo') {
    const r = buscar(args.ramo);
    if (!r) return { error: 'No encontré ese ramo', ramos: ramos.map(x => x.nombre) };
    const reglas = reglasDelRamo(r, calculoPara(ramos, tenant));
    return {
      nombre: r.nombre,
      sigla: siglaDeRamo(r),
      ...(Object.keys(reglas).length ? { reglas } : {}),
      evaluaciones: (r.categorias || []).map(c => ({
        nombre: c.nombre,
        peso: c.peso,
        casillas: c.slots || 1,
        // Qué es cada casilla cuando no son la N-ésima de lo mismo: sin esto el
        // agente no sabe si la casilla 1 de "Trabajos de IA" son las Cápsulas.
        ...(Array.isArray(c.nombresCasillas) && c.nombresCasillas.length ? { nombresCasillas: c.nombresCasillas } : {}),
        notas: (c.notas || []).filter(n => typeof n.valor === 'number').map(n => ({ nombre: n.nombre, valor: n.valor })),
      })),
    };
  }

  if (nombre === 'evaluaciones_proximas') {
    const hoy = hoyChile(), hasta = sumarDias(hoy, ventanaDias(args.dias, 30));
    return fechasDeRamos(ramos).filter(f => f.fecha >= hoy && f.fecha <= hasta);
  }

  if (nombre === 'estado_semestre') {
    const dias = ventanaDias(args.dias, 14);
    const hoy = hoyChile(), hasta = sumarDias(hoy, dias);
    const calculo = calculoPara(ramos, tenant);
    const filas = ramos.map(r => {
      const promedio = calculo.ramoAvg(r);
      const necesario = calculo.notaNecesaria(r);
      const avance = calculo.estadoParaNotaNecesaria(r);
      return {
        nombre: r.nombre,
        sigla: siglaDeRamo(r),
        creditos: r.creditos ?? null,
        promedio,
        avanceEvaluado: avance && avance.total > 0 ? Math.round((1 - avance.pendiente) * 100) : 0,
        riesgo: riesgoDeRamo(promedio, necesario),
        // El mismo número que contesta `que_necesito_para_aprobar` con meta 4,0,
        // para que el agente no tenga que preguntarlo ramo por ramo.
        necesitaParaAprobar: necesario,
        proximaEvaluacion: proximaConFecha(r, hoy),
      };
    });
    const proximas = fechasDeRamos(ramos).filter(f => f.fecha >= hoy && f.fecha <= hasta);
    return {
      promedioGeneral: promedioGeneral(ramos, calculo),
      ramos: filas,
      proximas,
      // Lo que hay que mirar primero, ya filtrado: un agente que recibe 8 ramos
      // no debería tener que deducir cuáles son los que duelen.
      atencion: filas.filter(f => f.riesgo === 'en_riesgo' || f.riesgo === 'ya_no_alcanza').map(f => f.nombre),
      ventanaDias: dias,
    };
  }

  if (nombre === 'resumen_para_hoy') {
    const dias = ventanaDias(args.dias, 7);
    const hoy = hoyChile(), hasta = sumarDias(hoy, dias);
    const calculo = calculoPara(ramos, tenant);
    const proximas = fechasDeRamos(ramos).filter(f => f.fecha >= hoy && f.fecha <= hasta).map(f => ({ ...f, esHoy: f.fecha === hoy }));
    const enRiesgo = ramos.map(r => {
      const promedio = calculo.ramoAvg(r);
      const necesario = calculo.notaNecesaria(r);
      return { ramo: r.nombre, promedio, necesitaParaAprobar: necesario, riesgo: riesgoDeRamo(promedio, necesario) };
    }).filter(f => f.riesgo === 'en_riesgo' || f.riesgo === 'ya_no_alcanza');
    // Lo que más mueve, mirando el semestre entero y no un ramo: es la respuesta
    // a "¿en qué me conviene ponerme?" cuando hay cuatro cosas encima. Primero
    // lo que decide aprobar; entre dos que deciden, la que está peor parada —su
    // peor escenario es más grave—, y recién ahí cuánto mueve la final.
    const dondeRinde = ramos
      .flatMap(r => impactoPendientes(ramos, r, 4, tenant).map(i => ({ ramo: r.nombre, ...i })))
      .sort((a, b) => {
        if (a.decideAprobar !== b.decideAprobar) return a.decideAprobar ? -1 : 1;
        if (a.notaFinalSiSacas1 !== b.notaFinalSiSacas1) return a.notaFinalSiSacas1 - b.notaFinalSiSacas1;
        return b.mueveLaFinal - a.mueveLaFinal;
      })
      .slice(0, 3);
    const sinRegistrar = porRegistrar(ramos, hoy);
    return {
      fecha: hoy,
      ventanaDias: dias,
      promedioGeneral: promedioGeneral(ramos, calculo),
      hoy: proximas.filter(p => p.esHoy),
      proximas,
      enRiesgo,
      porRegistrar: sinRegistrar,
      dondeRinde,
      // Para que el agente no arme un mensaje cuando no hay nada que contar.
      hayAlgoQueContar: !!(proximas.length || enRiesgo.length || sinRegistrar.length),
    };
  }

  if (nombre === 'simular') {
    return simular(ramos, args, tenant);
  }

  if (nombre === 'que_necesito_para_aprobar') {
    return queNecesitoParaAprobar(ramos, args, tenant);
  }

  return undefined;
}

export async function onRequestPost({ request, params }) {
  const token = String((params.ruta && params.ruta[0]) || '');
  if (!tokenValido(token)) return json({ error: 'Not found' }, 404);

  let peticion;
  try {
    peticion = await request.json();
  } catch {
    return error(null, -32700, 'JSON inválido');
  }

  const { id = null, method, params: args = {} } = peticion || {};

  // Una notificación es una petición SIN `id`, y el protocolo prohíbe
  // contestarla: corresponde un 202 vacío. Importa porque `notifications/
  // initialized` es lo PRIMERO que manda un cliente después de conectar, y
  // antes caía en "Método no soportado" —un objeto de error con id null—, que
  // es justo lo que un cliente estricto trata como servidor roto. El handshake
  // se cortaba ahí, con las seis herramientas funcionando perfectamente.
  if (!peticion || !('id' in peticion) || peticion.id === undefined) {
    return new Response(null, { status: 202, headers: { 'Cache-Control': 'no-store' } });
  }

  if (method === 'initialize') {
    // Se devuelve la que pidió el cliente cuando la sabemos hablar, y la más
    // vieja cuando no: es lo que dice el protocolo y lo que evita que un
    // conector nuevo se vaya sin explicar por qué.
    const pedida = String(args.protocolVersion || '');
    return respuesta(id, {
      protocolVersion: PROTOCOLOS.includes(pedida) ? pedida : PROTOCOLO,
      capabilities: { tools: {} },
      serverInfo: { name: 'GradeHub', version: '1' },
    });
  }

  if (method === 'tools/list') {
    return respuesta(id, { tools: HERRAMIENTAS.map(comoMcp) });
  }

  if (method === 'tools/call') {
    const nombre = String(args.name || '');
    // Lista blanca: solo lo declarado. Sin esto, cualquier nombre que la RPC
    // llegue a entender mañana quedaría accesible sin haber pasado por la
    // revisión de qué puede hacer un agente.
    if (!NOMBRES.includes(nombre)) return error(id, -32601, `Herramienta desconocida: ${nombre}`);

    // La base entrega el estado y el despacho se arma acá. Es a propósito: dar
    // forma a cada herramienta en SQL obligaría a reescribir en plpgsql reglas
    // que ya existen en JS —casillas declaradas, descartes, compuertas, el ramo
    // vinculado— y una segunda copia de esas cuentas es exactamente como este
    // proyecto se ha equivocado antes.
    let estado;
    try {
      const r = await rpc('agente_datos', { p_token: token });
      if (!r.ok) return error(id, -32000, 'No se pudo consultar GradeHub');
      estado = await r.json();
    } catch {
      return error(id, -32000, 'GradeHub no está disponible');
    }
    // Token vencido o revocado: la RPC devuelve null y acá se corta.
    if (!estado) return error(id, -32001, 'Esta conexión ya no es válida. Vuelve a vincular desde Ajustes.');

    const argumentos = args.arguments || {};
    if (nombre === 'proponer_fechas') {
      const propuesta = await guardarPropuestaFechas(token, estado, argumentos);
      if (propuesta.error) return error(id, -32602, propuesta.error);
      return respuesta(id, { content: [{ type: 'text', text: JSON.stringify(propuesta) }] });
    }

    if (nombre === 'proponer_ramos') {
      const propuesta = await guardarPropuestaRamos(token, estado, argumentos);
      if (propuesta.error) return error(id, -32602, propuesta.error);
      return respuesta(id, { content: [{ type: 'text', text: JSON.stringify(propuesta) }] });
    }

    if (nombre === 'proponer_notas') {
      const propuesta = await guardarPropuestaNotas(token, estado, argumentos);
      if (propuesta.error) return error(id, -32602, propuesta.error);
      return respuesta(id, { content: [{ type: 'text', text: JSON.stringify(propuesta) }] });
    }

    if (nombre === 'proponer_pauta') {
      const propuesta = await guardarPropuestaPauta(token, estado, argumentos);
      if (propuesta.error) return error(id, -32602, propuesta.error);
      return respuesta(id, { content: [{ type: 'text', text: JSON.stringify(propuesta) }] });
    }

    const datos = despachar(nombre, estado, argumentos);
    if (datos === undefined) return error(id, -32601, `Herramienta aún no disponible: ${nombre}`);

    // Un ramo que no existe o una meta fuera de escala salían dentro de un
    // resultado EXITOSO, con una clave `error` adentro. Un agente no tiene cómo
    // distinguir eso de un dato, así que lo leía como respuesta válida. MCP
    // tiene `isError` justamente para esto, y el texto sigue viajando —incluye
    // la lista de ramos que sí existen, que es lo que deja reintentar bien.
    const esFallo = !!(datos && typeof datos === 'object' && !Array.isArray(datos) && datos.error);
    return respuesta(id, {
      content: [{ type: 'text', text: JSON.stringify(datos) }],
      ...(esFallo ? { isError: true } : {}),
    });
  }

  return error(id, -32601, `Método no soportado: ${method}`);
}

// Un GET sirve para comprobar que la vinculación quedó viva sin ejecutar nada.
export async function onRequestGet({ params, request }) {
  const token = String((params.ruta && params.ruta[0]) || '');
  if (!tokenValido(token)) return json({ error: 'Not found' }, 404);
  // Un cliente que abre el canal de eventos pide text/event-stream. No lo
  // servimos —acá todo va en la respuesta del POST— y decirlo con un 405 es
  // distinto de devolverle un 200 con un JSON que no esperaba: lo segundo lo
  // deja esperando un flujo que nunca llega.
  const acepta = String((request && request.headers && request.headers.get('accept')) || '');
  if (acepta.includes('text/event-stream')) {
    return json({ error: 'Este servidor responde en el POST; no abre un canal de eventos.' }, 405);
  }
  return json({ servidor: 'GradeHub', protocolo: PROTOCOLO, herramientas: NOMBRES });
}
