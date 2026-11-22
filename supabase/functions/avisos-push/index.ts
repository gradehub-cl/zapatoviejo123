// avisos-push: manda a Apple cada aviso que Amigos deja en avisos_salientes.
// La llama un Database Webhook de Supabase en cada INSERT de esa tabla (ver
// LEEME.md). Firma con la llave APNs del equipo y borra la fila al terminar.
// Si Apple dice que el token murió, lo borra de push_dispositivos.
//
// Secretos (supabase secrets set …), nunca en el repo ni en la app:
//   AVISOS_SECRETO   el mismo valor que el header x-avisos-secreto del webhook
//   APNS_TEAM_ID     PH6XQV8L2M
//   APNS_KEY_ID      el Key ID de la llave con «Apple Push Notifications service»
//   APNS_P8          la llave .p8 en PEM
//   APNS_SANDBOX     "1" solo para builds de desarrollo desde Xcode
// SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY los pone Supabase solo.
import { debeOlvidarToken, jwtApns, pedidoApns } from './apns.mjs';

const env = (k: string) => Deno.env.get(k) ?? '';
let jwt: { valor: string; hasta: number } | null = null;

async function tokenProveedor(): Promise<string | null> {
  if (jwt && jwt.hasta > Date.now()) return jwt.valor;
  const valor = await jwtApns({ teamId: env('APNS_TEAM_ID'), keyId: env('APNS_KEY_ID'), p8: env('APNS_P8') });
  if (!valor) return null;
  jwt = { valor, hasta: Date.now() + 50 * 60 * 1000 };
  return valor;
}

async function borrar(ruta: string) {
  const llave = env('SUPABASE_SERVICE_ROLE_KEY');
  await fetch(`${env('SUPABASE_URL')}/rest/v1/${ruta}`, {
    method: 'DELETE',
    headers: { apikey: llave, Authorization: `Bearer ${llave}` },
  }).catch(() => {});
}

const json = (cuerpo: unknown, status = 200) =>
  new Response(JSON.stringify(cuerpo), { status, headers: { 'content-type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'método' }, 405);
  const secreto = env('AVISOS_SECRETO');
  if (!secreto || req.headers.get('x-avisos-secreto') !== secreto) return json({ error: 'no autorizado' }, 401);
  const cuerpo = await req.json().catch(() => null);
  const fila = cuerpo?.record;
  if (cuerpo?.type !== 'INSERT' || cuerpo?.table !== 'avisos_salientes' || !fila) return json({ error: 'evento' }, 400);

  const pedido = pedidoApns(fila, { sandbox: env('APNS_SANDBOX') === '1' });
  const autorizacion = await tokenProveedor();
  if (!pedido || !autorizacion) {
    await borrar(`avisos_salientes?id=eq.${Number(fila.id)}`);
    return json({ ok: false, error: pedido ? 'llave APNs' : 'fila inválida' });
  }
  const r = await fetch(pedido.url, {
    method: 'POST',
    headers: { ...pedido.headers, authorization: `bearer ${autorizacion}` },
    body: pedido.body,
  });
  let razon: string | null = null;
  if (!r.ok) razon = (await r.json().catch(() => ({})))?.reason ?? null;
  await borrar(`avisos_salientes?id=eq.${Number(fila.id)}`);
  if (debeOlvidarToken(r.status, razon)) await borrar(`push_dispositivos?token=eq.${fila.token}`);
  // Nunca se registra el contenido del aviso ni el token.
  return json({ ok: r.ok, status: r.status, razon });
});
