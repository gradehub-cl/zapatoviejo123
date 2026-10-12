// Trae la fuente de calendario de Canvas UC para importar fechas (#647).
//
// El navegador no puede leer Canvas directo: Canvas no permite llamadas desde
// otros sitios. Esta función la pide en nombre de la persona y le devuelve el
// .ics tal cual, para que la app lo revise con el mismo flujo de un archivo.
//
// No es un proxy abierto:
// - Solo acepta https://cursos.canvas.uc.cl/feeds/calendars/user_….ics, sin
//   puerto, usuario, parámetros ni fragmento, y no sigue redirecciones: una
//   respuesta 3xx es un error, así que no se la puede mandar a otro host.
// - Exige una sesión de GradeHub (el token de Supabase de la persona, que se
//   comprueba contra Auth).
// - Corta a los 8 segundos y a los 512 KB, el mismo tope que un archivo .ics.
// - No guarda ni registra la URL ni el contenido. Un .ics no está entre las
//   extensiones que Cloudflare guarda en caché por omisión, y la respuesta va
//   con no-store.
//
// En la app iOS no hace falta: el teléfono puede pedir el .ics directo.

const SUPABASE_URL = 'https://lsulsnswzesyekpsvlql.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_JwBMAOR7iHW-gcRdLMGrYw_eCOISwqA';

const URL_CANVAS_RE = /^https:\/\/cursos\.canvas\.uc\.cl\/feeds\/calendars\/user_[A-Za-z0-9]{20,80}\.ics$/;
const MAX_BYTES = 512 * 1024;
const MAX_CUERPO = 2000;
const ESPERA_MS = 8000;

export function urlCanvasValida(url) {
  return typeof url === 'string' && URL_CANVAS_RE.test(url);
}

const respuesta = (cuerpo, status, tipo = 'application/json') =>
  new Response(tipo === 'application/json' ? JSON.stringify(cuerpo) : cuerpo, {
    status,
    headers: { 'Content-Type': tipo, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' },
  });
const error = (mensaje, status) => respuesta({ error: mensaje }, status);

async function sesionValida(authorization, pedir) {
  const m = /^Bearer ([A-Za-z0-9._-]{20,4096})$/.exec(authorization || '');
  if (!m) return false;
  try {
    const r = await pedir(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${m[1]}` },
    });
    return r.status === 200;
  } catch (e) {
    return false;
  }
}

// Lee como mucho MAX_BYTES; si el calendario es más grande, corta y avisa.
async function leerAcotado(r) {
  const reader = r.body && r.body.getReader ? r.body.getReader() : null;
  if (!reader) {
    const texto = await r.text();
    return new TextEncoder().encode(texto).length > MAX_BYTES ? null : texto;
  }
  const partes = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_BYTES) {
      try { await reader.cancel(); } catch (e) {}
      return null;
    }
    partes.push(value);
  }
  const todo = new Uint8Array(total);
  let i = 0;
  for (const p of partes) { todo.set(p, i); i += p.byteLength; }
  return new TextDecoder().decode(todo);
}

export async function traerCalendarioCanvas(request, pedir = fetch) {
  if (!(await sesionValida(request.headers.get('Authorization'), pedir))) {
    return error('Inicia sesión en GradeHub.', 401);
  }
  const crudo = await request.text();
  if (crudo.length > MAX_CUERPO) return error('Pedido inválido.', 400);
  let url;
  try { url = JSON.parse(crudo).url; } catch (e) { return error('Pedido inválido.', 400); }
  if (!urlCanvasValida(url)) {
    return error('Esa no es la URL de la fuente de calendario de Canvas UC.', 400);
  }
  const corte = new AbortController();
  const reloj = setTimeout(() => corte.abort(), ESPERA_MS);
  try {
    const r = await pedir(url, { redirect: 'manual', signal: corte.signal, headers: { Accept: 'text/calendar' } });
    if (r.status === 401 || r.status === 403 || r.status === 404) {
      return error('Canvas no reconoce esa URL. Cópiala de nuevo desde Calendario → Fuente de calendario.', 502);
    }
    if (r.status !== 200) return error('Canvas no respondió bien. Intenta de nuevo en un rato.', 502);
    const texto = await leerAcotado(r);
    if (texto === null) return error('Tu calendario de Canvas supera 500 KB.', 502);
    if (!/BEGIN:VCALENDAR/.test(texto)) return error('Canvas no devolvió un calendario.', 502);
    return respuesta(texto, 200, 'text/calendar; charset=utf-8');
  } catch (e) {
    return error('Canvas tardó demasiado en responder. Intenta de nuevo.', 504);
  } finally {
    clearTimeout(reloj);
  }
}

export async function onRequestPost({ request }) {
  return traerCalendarioCanvas(request);
}
