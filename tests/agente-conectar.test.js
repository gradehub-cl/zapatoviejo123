// Conectar un agente tiene que poder hacerse, y el handshake tiene que
// sobrevivir al primer mensaje de un cliente real.
//
// Dos cosas que no fallan ruidosamente y dejan el MCP inservible igual:
//
// 1. `notifications/initialized` es lo PRIMERO que manda un cliente MCP
//    después de conectar. Es una notificación —no lleva `id`— y el protocolo
//    prohíbe contestarla. El servidor la trataba como un método más y
//    devolvía un objeto de error con id null, que un cliente estricto lee como
//    servidor roto: el handshake se cortaba ahí, con las seis herramientas
//    funcionando perfectamente.
//
// 2. Un GET con Accept: text/event-stream es un cliente abriendo el canal de
//    eventos. Acá todo va en la respuesta del POST, y devolverle un 200 con
//    otro JSON lo deja esperando un flujo que no llega.
//
const fs = require('fs'), path = require('path'), vm = require('vm');
const raiz = path.join(__dirname, '..');
const leer = f => fs.readFileSync(path.join(raiz, f), 'utf8');
const TOKEN = 'a'.repeat(64);
const fecha = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago' }).format(new Date());
const ramo = {
  id: 'ramo-sintetico', nombre: 'Curso sintético', sigla: 'SIN1234',
  categorias: [
    { id: 'c1', nombre: 'Controles', peso: 40, slots: 3, nombresCasillas: ['Lectura', 'Práctico'],
      notas: [
        { id: 'n0', nombre: 'Lectura', valor: 4.8, slot: 0, peso: 1 },
        { id: 'n1', nombre: 'Lectura', valor: 5.5, slot: 0, peso: 1 },
        { id: 'n2', valor: null, slot: 1, fecha, hora: '14:00', peso: 1 },
        { id: 'n3', nombre: 'Nota de un respaldo', valor: 6.3, peso: 1 },
      ] },
    { id: 'c2', nombre: 'Examen', peso: 60, notas: [], fecha: '2099-12-31' },
  ],
};
const llamadas = [];

let ok = 0, fail = 0;
const chk = (n, c) => { if (c) { ok++; console.log('  OK   ' + n); } else { fail++; console.log('  FAIL ' + n); } };

// ---------- El endpoint MCP ----------
function cargarEndpoint() {
  const ctx = {
    console, Response, structuredClone,
    fetch: async (url, opciones) => {
      const rpc = url.split('/').at(-1);
      const datos = JSON.parse(opciones.body);
      llamadas.push({ rpc, datos });
      if (rpc === 'agente_datos') return Response.json(datos.p_token === TOKEN ? { ramos: [ramo] } : null);
      if (rpc === 'proponer_notas_agente') return Response.json('propuesta-sintetica');
      throw new Error('RPC inesperada en la prueba');
    },
    module: { exports: {} }, exports: {},
  };
  vm.createContext(ctx);
  vm.runInContext(leer('engine.js'), ctx, { filename: 'engine.js' });
  ctx.motorCompartido = { gh_crearCalculoRamo: ctx.module.exports.gh_crearCalculoRamo };
  vm.runInContext(leer('functions/mcp/herramientas.js').replace(/^export /gm, ''), ctx, { filename: 'herramientas.js' });
  const src = leer('functions/mcp/[[ruta]].js')
    .replace(/^import .*;\s*$/gm, '')
    .replace(/^export /gm, '');
  vm.runInContext(src + '\n;globalThis.__mcp={onRequestPost,onRequestGet};', ctx, { filename: 'mcp.js' });
  return ctx.__mcp;
}
const mcp = cargarEndpoint();
const post = cuerpo => mcp.onRequestPost({
  params: { ruta: [TOKEN] },
  request: new Request('https://gradehub.test/mcp/', { method: 'POST', body: JSON.stringify(cuerpo) }),
});
const llamada = (method, params) => post({ jsonrpc: '2.0', id: 2, method, params }).then(r => r.json());
const herramienta = (name, args) => llamada('tools/call', { name, arguments: args });
const datos = respuesta => JSON.parse(respuesta.result.content[0].text);

(async () => {
  console.log('=== Una notificación no se contesta ===');
  for (const cuerpo of [
    { jsonrpc: '2.0', method: 'notifications/initialized' },
    { jsonrpc: '2.0', method: 'notifications/cancelled', params: { requestId: 1 } },
  ]) {
    const r = await mcp.onRequestPost({ params: { ruta: [TOKEN] }, request: { json: async () => cuerpo } });
    const texto = await r.text();
    chk(`${cuerpo.method} → 202 y sin cuerpo`, r.status === 202 && texto === '');
  }

  console.log('\n=== Una petición de verdad sigue contestándose ===');
  const init = await mcp.onRequestPost({
    params: { ruta: [TOKEN] },
    request: { json: async () => ({ jsonrpc: '2.0', id: 1, method: 'initialize', params: {} }) },
  });
  const cuerpoInit = await init.json();
  chk('initialize responde con su id y su protocolo',
    init.status === 200 && cuerpoInit.id === 1 && !!cuerpoInit.result.protocolVersion);
  chk('initialize orienta cómo leer un ramo y cuándo proponer',
    /ver_ramo/.test(cuerpoInit.result.instructions) && /pendiente/.test(cuerpoInit.result.instructions));
  // id 0 es un id válido y cae justo donde un `if(!id)` se equivocaría.
  const cero = await mcp.onRequestPost({
    params: { ruta: [TOKEN] },
    request: { json: async () => ({ jsonrpc: '2.0', id: 0, method: 'initialize', params: {} }) },
  });
  chk('y con id 0 también, que es un id válido', cero.status === 200 && (await cero.json()).id === 0);

  console.log('\n=== Descubrir y mantener viva la conexión no consulta el semestre ===');
  const ping = await llamada('ping');
  chk('ping devuelve un objeto vacío', ping.id === 2 && Object.keys(ping.result).length === 0);
  const lista = (await llamada('tools/list')).result.tools;
  const tool = nombre => lista.find(t => t.name === nombre);
  const ver = tool('ver_ramo');
  const proponerNotas = tool('proponer_notas');
  chk('lecturas y propuestas se identifican con título y anotaciones',
    typeof ver.title === 'string' && ver.annotations.readOnlyHint === true &&
    proponerNotas.annotations.readOnlyHint === false && proponerNotas.annotations.destructiveHint === false);
  chk('los argumentos obligatorios y límites se anuncian en el esquema real',
    ver.inputSchema.required.includes('ramo') &&
    proponerNotas.inputSchema.required.join() === 'ramo,notas,fuente' &&
    proponerNotas.inputSchema.properties.notas.items.properties.valor.maximum === 7 &&
    tool('estado_semestre').inputSchema.properties.dias.type === 'integer');
  chk('el catálogo ofrece proponer_ramos y omite la escritura que no existía',
    tool('proponer_ramos').inputSchema.required.join() === 'ramos,fuente' && !tool('agregar_ramo'));
  const obsoleta = await herramienta('agregar_ramo', { nombre: 'Inventado' });
  chk('un cliente con el nombre anterior recibe la acción disponible', /proponer_ramos/.test(obsoleta.error.message));

  console.log('\n=== Las solicitudes inválidas dan un error entendible ===');
  for (const entrada of [null, 1, true, 'texto', [], {}, { jsonrpc: '1.0', id: 1, method: 'ping' }]) {
    const respuesta = await (await post(entrada)).json();
    chk('estructura inválida: ' + JSON.stringify(entrada), respuesta.id === null && respuesta.error.code === -32600);
  }
  chk('params null mantiene el id y devuelve -32602', (await llamada('initialize', null)).error.code === -32602);
  chk('los argumentos tienen que ser un objeto', (await herramienta('ver_ramo', [])).error.code === -32602);
  chk('discovery y errores de protocolo no llaman a Supabase', llamadas.length === 0);

  console.log('\n=== El agente puede identificar la casilla antes de proponer ===');
  const curso = datos(await herramienta('ver_ramo', { ramo: 'SIN1234' }));
  const controles = curso.evaluaciones.find(c => c.nombre === 'Controles');
  chk('conserva los campos previos y agrega los números de casilla',
    controles.casillas === 3 && controles.notas.some(n => n.valor === 5.5) &&
    controles.nombresCasillas[0] === 'Lectura' && controles.detalleCasillas.length === 3);
  chk('usa la última nota por casilla y avisa si hay notas antiguas sin casilla',
    controles.detalleCasillas[0].nota === 5.5 && controles.registrosSinCasilla === 1 &&
    controles.notas.some(n => n.valor === 6.3) && controles.detalleCasillas.every(c => c.nota !== 6.3));
  chk('diferencia fecha grupal, fecha propia y una casilla aún vacía',
    curso.evaluaciones.find(c => c.nombre === 'Examen').fecha === '2099-12-31' && controles.fecha === null &&
    controles.detalleCasillas.some(c => c.casilla === 2 && c.nombre === 'Práctico' && c.fecha === fecha && c.hora === '14:00' && c.nota === null) &&
    controles.detalleCasillas.some(c => c.casilla === 3 && c.fecha === null && c.nota === null));
  const agenda = datos(await herramienta('evaluaciones_proximas', { dias: 1 }));
  chk('una fecha propia en la Agenda devuelve el grupo y su número de casilla',
    agenda.some(f => f.grupo === 'Controles' && f.casilla === 2 && f.fecha === fecha));
  const sinCalce = { ramo: 'SIN1234', notas: [{ evaluacion: 'Controles', casilla: 4, valor: 6.2 }], fuente: 'Publicación sintética' };
  const notaFuera = await herramienta('proponer_notas', sinCalce);
  const fechaFuera = await herramienta('proponer_fechas', {
    ramo: sinCalce.ramo, fechas: [{ evaluacion: 'Controles', casilla: 4, fecha }], fuente: sinCalce.fuente,
  });
  const simFuera = await herramienta('simular', { ramo: sinCalce.ramo, notas: sinCalce.notas });
  chk('notas, fechas y simulaciones dan el límite de casillas al agente',
    /3 casillas/.test(notaFuera.error.message) && /3 casillas/.test(fechaFuera.error.message) &&
    simFuera.result.isError === true && /3 casillas/.test(datos(simFuera).error));
  const fechaNula = await herramienta('proponer_fechas', { ramo: sinCalce.ramo, fechas: [null], fuente: sinCalce.fuente });
  const ramoNulo = await herramienta('proponer_ramos', { ramos: [null], fuente: sinCalce.fuente });
  chk('una fila nula entre las propuestas da un error de validación',
    /nombre/.test(fechaNula.error.message) && /nombre/.test(ramoNulo.error.message));
  chk('una casilla que no existe no llega a las RPC de propuestas', llamadas.every(l => l.rpc === 'agente_datos'));
  const valida = { ...sinCalce, notas: [{ ...sinCalce.notas[0], casilla: 2 }] };
  const simNumero = datos(await herramienta('simular', { ramo: valida.ramo, notas: valida.notas }));
  const simTexto = datos(await herramienta('simular', {
    ramo: valida.ramo, notas: [{ ...valida.notas[0], valor: '6.2' }],
  }));
  chk('simular incorpora la nota aunque un cliente antiguo la envíe como texto numérico',
    simNumero.promedioSimulado !== simNumero.promedioActual && simTexto.promedioSimulado === simNumero.promedioSimulado);
  const propuesta = datos(await herramienta('proponer_notas', valida));
  chk('la propuesta válida viaja a la misma RPC con casilla y fuente',
    propuesta.id === 'propuesta-sintetica' && llamadas.at(-1).rpc === 'proponer_notas_agente' &&
    llamadas.at(-1).datos.p_notas[0].casilla === 2 && llamadas.at(-1).datos.p_fuente === valida.fuente);

  console.log('\n=== El canal de eventos se declara ausente, no se finge ===');
  const sse = await mcp.onRequestGet({
    params: { ruta: [TOKEN] },
    request: { headers: { get: k => (k === 'accept' ? 'text/event-stream' : null) } },
  });
  chk('GET con Accept: text/event-stream → 405', sse.status === 405);
  const diag = await mcp.onRequestGet({
    params: { ruta: [TOKEN] },
    request: { headers: { get: () => 'application/json' } },
  });
  chk('GET normal sigue sirviendo para diagnóstico', diag.status === 200);

  console.log('\n=== Sin token no se admite ni que el servicio exista ===');
  const sinToken = await mcp.onRequestPost({
    params: { ruta: [] },
    request: { json: async () => ({ jsonrpc: '2.0', method: 'notifications/initialized' }) },
  });
  chk('una notificación sin token tampoco pasa', sinToken.status === 404);


  console.log('\nPASS: ' + ok + '   FAIL: ' + fail);
  process.exit(fail ? 1 : 0);
})();
