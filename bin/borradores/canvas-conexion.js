// Ruta final: functions/canvas-conexion.js (mover junto con la autorización de deploy).
// Conexión personal a Canvas UC (#1063). No registra cuerpos ni secretos.
// CANVAS_TOKEN_KEY (v1), CANVAS_TOKEN_KEY_<n> (v2 en adelante): 32 bytes aleatorios base64 por versión y entorno.
// CANVAS_TOKEN_KEY_VERSION selecciona la versión de guardado (por defecto 1).
const SUPABASE_PRODUCCION = 'https://lsulsnswzesyekpsvlql.supabase.co';
const PUBLICABLE_PRODUCCION = 'sb_publishable_JwBMAOR7iHW-gcRdLMGrYw_eCOISwqA';
const HOST = 'https://cursos.canvas.uc.cl';
const TOKEN = /^[0-9]{1,8}~[A-Za-z0-9]{20,100}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PLAZO_MS = 8000, MAX_PEDIDO = 2000, MAX_RESPUESTA = 64 * 1024;
const json = (valor, status = 200) => new Response(JSON.stringify(valor), {
  status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' },
});
const error = (mensaje, status) => json({ error: mensaje }, status);

// Acota también un cuerpo sin Content-Length o que no termina de llegar.
export async function leerBytes(r, limite, signal) {
  if (!r.body) throw new Error('respuesta');
  const lector = r.body.getReader(), partes = [];
  let total = 0;
  const cancelar = () => { void lector.cancel().catch(() => {}); };
  signal.addEventListener('abort', cancelar, { once: true });
  try {
    for (;;) {
      if (signal.aborted) throw new Error('plazo');
      const { done, value } = await lector.read();
      if (signal.aborted) throw new Error('plazo');
      if (done) break;
      total += value.byteLength;
      if (total > limite) { await lector.cancel(); throw new Error('tamaño'); }
      partes.push(value);
    }
    const bytes = new Uint8Array(total); let i = 0;
    for (const parte of partes) { bytes.set(parte, i); i += parte.byteLength; }
    return bytes;
  } finally { signal.removeEventListener('abort', cancelar); lector.releaseLock(); }
}
export async function leerJson(r, limite, signal) {
  return JSON.parse(new TextDecoder().decode(await leerBytes(r, limite, signal)));
}
const base64 = bytes => btoa(String.fromCharCode(...new Uint8Array(bytes)));
const bytes64 = texto => Uint8Array.from(atob(texto), c => c.charCodeAt(0));
function material(env, version) {
  const configurada = env[version === 1 ? 'CANVAS_TOKEN_KEY' : 'CANVAS_TOKEN_KEY_' + version];
  if (!/^[A-Za-z0-9+/]{43}=$/.test(configurada || '')) throw new Error('configuración');
  const bytes = bytes64(configurada);
  if (bytes.byteLength !== 32) throw new Error('configuración');
  return bytes;
}
export async function llaveDe(env, version) {
  return crypto.subtle.importKey('raw', material(env, version), 'AES-GCM', false, ['encrypt', 'decrypt']);
}
// Una RPC pública con JWT o vínculo MCP solo entrega metadatos. Pages prueba
// posesión de una capacidad por cuenta y versión antes de recibir el cifrado.
async function pruebaLectura(env, userId, version) {
  if (!UUID.test(userId) || !Number.isInteger(version) || version < 1 || version > 32767) throw new Error('conexión');
  const key = await crypto.subtle.importKey('raw', material(env, version), 'HKDF', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256',
    salt: new TextEncoder().encode('GradeHub/Canvas/lectura/v1'), info: new TextEncoder().encode(userId + '/' + version) }, key, 256);
  return base64(bits);
}
async function huella(prueba) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(prueba));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}
export async function leerConexionServidor(env, rpc, nombre, args) {
  const meta = await rpc(nombre, args);
  if (!meta) return null;
  const prueba = await pruebaLectura(env, meta.user_id, meta.llave_version);
  const fila = await rpc(nombre, { ...args, p_prueba: prueba });
  if (!fila || !fila.token_cifrado || fila.user_id !== meta.user_id || fila.llave_version !== meta.llave_version) throw new Error('conexión');
  return fila;
}
// AAD liga el cifrado a persona, origen y vencimiento; mover filas no lo valida.
function parametros(userId, vence, iv, version) {
  return { name: 'AES-GCM', iv, tagLength: 128,
    additionalData: new TextEncoder().encode(JSON.stringify(['canvas-v1', userId, HOST, version, new Date(vence).toISOString()])) };
}
export async function cifrarTokenCanvas(token, userId, vence, llave, version = 1) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cifrado = await crypto.subtle.encrypt(parametros(userId, vence, iv, version), llave, new TextEncoder().encode(token));
  return { token_cifrado: base64(cifrado), iv: base64(iv), llave_version: version };
}
export async function descifrarTokenCanvas(fila, llave) {
  if (!Number.isInteger(fila.llave_version) || fila.llave_version < 1 || fila.llave_version > 32767 || fila.host !== HOST || !UUID.test(fila.user_id) || !/^[A-Za-z0-9+/]{16}$/.test(fila.iv)) throw new Error('conexión');
  const bytes = await crypto.subtle.decrypt(parametros(fila.user_id, fila.vence, bytes64(fila.iv), fila.llave_version), llave, bytes64(fila.token_cifrado));
  const token = new TextDecoder().decode(bytes);
  if (!TOKEN.test(token)) throw new Error('conexión');
  return token;
}

export function baseCanvas(url, env) {
  // Una preview con otra llave AES no puede escribir en la base de producción.
  // Estas opciones son bindings del servidor, nunca parámetros del pedido.
  const supabase = env.CANVAS_SUPABASE_URL || SUPABASE_PRODUCCION;
  const publicable = env.CANVAS_SUPABASE_PUBLISHABLE_KEY || PUBLICABLE_PRODUCCION;
  const produccion = ['gradehub.cl', 'www.gradehub.cl', 'gradehub.pages.dev'].includes(url.hostname);
  if (!/^https:\/\/[a-z0-9]{20}\.supabase\.co$/.test(supabase)
    || !/^sb_publishable_[A-Za-z0-9_-]+$/.test(publicable)
    || (!produccion && (supabase === SUPABASE_PRODUCCION || !env.CANVAS_SUPABASE_PUBLISHABLE_KEY))) {
    return null;
  }
  return { supabase, publicable };
}

export async function gestionarConexionCanvas(request, env, pedir = fetch) {
  if (!['POST', 'DELETE'].includes(request.method)) return error('Método no permitido.', 405);
  const url = new URL(request.url), origen = request.headers.get('Origin');
  if (url.search || (origen && origen !== url.origin)) return error('Pedido inválido.', 400);
  const auth = /^Bearer ([A-Za-z0-9._-]{20,4096})$/.exec(request.headers.get('Authorization') || '');
  if (!auth) return error('Inicia sesión en GradeHub.', 401);
  const base = baseCanvas(url, env);
  if (!base) return error('La conexión con Canvas todavía no está disponible.', 503);
  const { supabase, publicable } = base;
  const corte = new AbortController(), reloj = setTimeout(() => corte.abort(), PLAZO_MS);
  const rpc = async (nombre, cuerpo) => {
    const headers = { 'Content-Type': 'application/json', apikey: publicable, Authorization: 'Bearer ' + auth[1] };
    const r = await pedir(supabase + '/rest/v1/rpc/' + nombre, {
      method: 'POST', redirect: 'manual', signal: corte.signal, headers, body: JSON.stringify(cuerpo),
    });
    if (r.status !== 200) { if (r.body) await r.body.cancel(); throw new Error('conexión'); }
    return leerJson(r, MAX_RESPUESTA, corte.signal);
  };
  try {
    const sesion = await pedir(supabase + '/auth/v1/user', {
      redirect: 'manual', signal: corte.signal, headers: { apikey: publicable, Authorization: 'Bearer ' + auth[1] },
    });
    if (sesion.status !== 200) { if (sesion.body) await sesion.body.cancel(); return error('Inicia sesión en GradeHub.', 401); }
    const cuenta = await leerJson(sesion, MAX_RESPUESTA, corte.signal);
    if (!UUID.test(cuenta?.id)) return error('Inicia sesión en GradeHub.', 401);
    // Revocar sigue funcionando aunque la llave de cifrado esté mal configurada.
    if (request.method === 'DELETE') {
      await rpc('borrar_canvas_conexion', {});
      return json({ conectado: false, vence: null });
    }
    const permitido = await rpc('canvas_registrar_intento', {});
    if (permitido === false) return error('Intenta conectar más tarde.', 429);
    if (permitido !== true) throw new Error('conexión');
    if (!/^application\/json(?:;|$)/i.test(request.headers.get('Content-Type') || '')) return error('Pedido inválido.', 400);
    let cuerpo;
    try { cuerpo = await leerJson(request, MAX_PEDIDO, corte.signal); }
    catch { if (corte.signal.aborted) throw new Error('plazo'); return error('Pedido inválido.', 400); }
    if (!cuerpo || Array.isArray(cuerpo) || Object.keys(cuerpo).some(k => !['token', 'vence'].includes(k))
      || typeof cuerpo.token !== 'string' || !TOKEN.test(cuerpo.token)
      || typeof cuerpo.vence !== 'string') return error('Revisa el token y su vencimiento.', 400);
    const hasta = Date.parse(cuerpo.vence), ahora = Date.now();
    if (!Number.isFinite(hasta) || hasta <= ahora || hasta > ahora + 90 * 86400000) return error('El vencimiento debe estar dentro de los próximos 90 días.', 400);
    const vence = new Date(hasta).toISOString();
    const version = Number(env.CANVAS_TOKEN_KEY_VERSION || 1);
    if (!Number.isInteger(version) || version < 1 || version > 32767) throw new Error('configuración');
    const llave = await llaveDe(env, version);
    const anterior = await rpc('canvas_conexion_mia', {});
    const canvas = await pedir(HOST + '/api/v1/users/self', {
      method: 'GET', redirect: 'manual', signal: corte.signal,
      headers: { Accept: 'application/json', Authorization: 'Bearer ' + cuerpo.token },
    });
    if (canvas.status !== 200) {
      if (canvas.body) await canvas.body.cancel();
      if (canvas.status === 401) {
        // Un token nuevo inválido no borra el anterior. Si se rechazó el que ya
        // estaba guardado, borra solo esa versión (IV), nunca una renovación.
        const guardada = anterior && await leerConexionServidor(env, rpc, 'canvas_conexion_mia', {});
        if (guardada && guardada.user_id === cuenta.id && await descifrarTokenCanvas(guardada, await llaveDe(env, guardada.llave_version)) === cuerpo.token) {
          await rpc('canvas_borrar_rechazada', { p_iv: guardada.iv });
        }
        return error('Canvas rechazó ese token. Genera uno nuevo para conectar.', 401);
      }
      return error('Canvas no respondió bien. Intenta de nuevo.', 502);
    }
    const perfil = await leerJson(canvas, MAX_RESPUESTA, corte.signal);
    if (!Number.isSafeInteger(perfil?.id) || perfil.id <= 0) return error('Canvas no respondió bien. Intenta de nuevo.', 502);
    const cifrado = await cifrarTokenCanvas(cuerpo.token, cuenta.id, vence, llave, version);
    await rpc('guardar_canvas_conexion', { p_token_cifrado: cifrado.token_cifrado, p_iv: cifrado.iv, p_vence: vence, p_llave_version: String(version), p_verificador: await huella(await pruebaLectura(env, cuenta.id, version)) });
    return json({ conectado: true, vence });
  } catch {
    return error(corte.signal.aborted ? 'Canvas no respondió a tiempo. Intenta de nuevo.' : 'No pudimos conectar Canvas. Intenta de nuevo.', corte.signal.aborted ? 504 : 503);
  } finally { clearTimeout(reloj); }
}
export async function onRequest({ request, env }) { return gestionarConexionCanvas(request, env); }
