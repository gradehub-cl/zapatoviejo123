# Seguridad y Supabase

> Extraído de `docs/contexto.md` sin cambiar el contenido. Sus fechas, cifras y
> estados describen el momento en que se anotaron: verifica el código y git
> antes de tratarlos como actuales. [Índice](../contexto.md).

### Seguridad · auditoría del 13 de agosto de 2026

La rama `codex/security-hardening` ya está en producción: limpia tokens de
recovery de la URL, evita enumerar correos al registrarse, agrega HSTS, fija
Wrangler con lockfile y pone límites server-side a los reportes.

**Ya hecho, no lo repitas:** `catalog_consensus.sql` aplicado (y borrada la
sobrecarga vieja `catalog_consensus(text,text)`, que contaba filas en vez de
personas distintas), `calendar_feed.sql` aplicado y verificado de punta a punta
(el feed devuelve un `.ics` con 10 eventos y sin notas), `eliminar_mi_cuenta`
aplicado, `user_feedback.sql` aplicado el 2026-08-17. HSTS y CSP verificados en
producción.

`calendar_feed_data` se volvió a aplicar el 2026-08-21 para que devuelva `hora`
(#160). Ojo si hay que reaplicarla otra vez: agregar una columna cambia el tipo
de retorno y Postgres no lo acepta con `create or replace`, así que el archivo
empieza con un `drop function`. Verificado contra el feed real: la evaluación
con hora sale `DTSTART:20260821T123000` —sin `Z` y sin `TZID`, o sea hora local
flotante— y las que no tienen hora siguen siendo de día completo.

**Lo que falta es todo manual, lo lleva Martín, y va PRIMERO.** Desde el
2026-08-17 tiene administrador en Supabase y Cloudflare. Ningún deploy hace nada
de esto: Cloudflare publica archivos estáticos y no ejecuta SQL ni toca la
configuración de Auth.

Que vaya primero es una decisión de Lucas del 2026-08-18, y tiene una razón
concreta: el repositorio es público, así que esta lista de pendientes también lo
es. Cerrarlos es lo que la vuelve inofensiva. Cualquier otra tarea de la cola
espera.

1. En Supabase → Authentication, dejar y **anotar** los valores de Sessions,
   Rate Limits y Password Security. El repo no puede demostrarlos. JWT ≤ 1 h,
   rotación de refresh tokens, y el mínimo de contraseña en 8 para que calce
   con `PASS_MIN` en `app.js`. No cambiar sesiones existentes a ciegas.
2. Turnstile en registro y recuperar contraseña. **El orden importa:** activar
   el CAPTCHA en Supabase antes de que el código mande el `captchaToken` deja
   registro, recuperación y login caídos para todos, y falla del lado del
   servidor, así que ningún test del repo lo atrapa. La CSP necesita
   `https://challenges.cloudflare.com` en `script-src` **y** una directiva
   `frame-src` nueva: hoy no existe, la cubre `default-src 'self'` y el iframe
   del widget queda bloqueado. Turnstile no pide `'unsafe-inline'`.
3. Prueba RLS autenticada con dos cuentas: A no puede leer, editar ni borrar
   filas de B. La prueba anónima devuelve `[]` y no demuestra nada —
   `auth.uid()` es NULL para anon, así que ninguna política calza. La prueba
   vale solo si además se comprueba que B **sí** ve lo suyo con la misma
   consulta; si no, un `[]` puede ser aislamiento o un UID mal escrito.
4. Recovery completo en producción: que el correo llegue, que el cambio
   funcione y que la URL quede sin `access_token`, `refresh_token` ni
   `type=recovery` (van en el fragmento, así que hay que mirar `location.hash`).

**Deuda de hardening, no mezclar con features:** retirar gradualmente handlers
`onclick` y `innerHTML` para poder sacar `'unsafe-inline'` de la CSP. Mientras
la sesión de Supabase viva en storage accesible a JavaScript, una XSS podría
leer notas y actuar como la cuenta aunque `connect-src` limite la exfiltración.
MFA puede ser opcional para estudiantes; pasa a ser obligatorio si aparece un
panel administrativo.

**Base de datos actual:** además de las tres tablas históricas existen
`calendar_feeds` y `user_feedback`. El SQL de `user_feedback` se aplicó en
producción el 17 de agosto de 2026: RLS activa, única política INSERT atada a
`auth.uid()`, sin lectura para clientes y FK a `auth.users` con
`ON DELETE CASCADE`. `calendar_feeds` mantiene cero políticas y acceso solo por
RPC. Toda tabla nueva reabre la auditoría RLS y de borrado — y el `CASCADE` no
se da por bueno porque esté escrito: se comprueba borrando una cuenta de prueba
y mirando que no queden filas suyas en ninguna tabla.

- **Ponderaciones oficiales: 12 de 88 ramos FEN.** Las MALLAS ya están
  completas (88 ramos únicos, los 10-11 semestres de las tres mallas); lo que
  falta son las pautas de evaluación. A casi todos los estudiantes la malla se
  les carga sola y las ponderaciones las escriben a mano — ese es el camino real
  del 95%, y hay que hacerlo rápido
- La cobertura ya no es "el tronco común de 2°": **1° está completo (5 de 5)** y
  **2° va en 6 de 7** — solo falta Inglés I. Después cae de golpe: 3° va 2 de 7,
  4° va 0 de 6, 5° va 1 de 9. En la UC, Ingeniería plan común va 8 de 18 y
  Comercial 5 de 31. Los dos primeros semestres de FEN son lo mejor cubierto del
  producto. Estos números salen de contar, no de memoria: recuéntalos antes de
  citarlos
- Notas de reemplazo y exámenes recuperativos distintos al de Microeconomía:
  aparecen en la mayoría de los programas FEN transcritos y siguen sin
  calcularse. Ver la tabla de reglas pendientes más abajo
- **La RLS quedó auditada el 2026-08-10 y está correcta.** Las tres tablas
  (`user_ramos`, `profiles`, `catalog_reports`) tienen `rowsecurity` activo y
  doce políticas: todo INSERT con `WITH CHECK`, todo UPDATE con `USING` y
  `WITH CHECK`, siempre atando `auth.uid()` a la columna de usuario. Que SELECT
  y DELETE no lleven `with_check` es correcto, no un hueco. Que las políticas
  estén sobre el rol `public` tampoco: `auth.uid()` es NULL para anon y la
  comparación nunca da verdadero. **No hace falta volver a auditarlo** salvo que
  se agregue una tabla — y ahí sí, porque una tabla sin política es legible por
  cualquiera. La consulta está en el historial de este PR.
- Cualquier tabla nueva con datos de usuario tiene que referenciar
  `auth.users` con `ON DELETE CASCADE`. Sin eso, esos datos sobreviven al
  borrado de cuenta y la política de privacidad pasa a ser mentira sin que
  falle nada. Ver `supabase/eliminar_mi_cuenta.sql`

### Preparación declarada por el profesor · #976, 2026-11-04

`profesor_alumnos_preparacion` es privada (RLS, sin grants de tabla). Sus FK
compuesta a conexión/propietarios y directas a `auth.users` borran en cascada.
Retirar un ramo compartido elimina también su selección. Las únicas RPC
públicas autenticadas son `preparacion_alumno` y `guardar_preparacion_alumno`:
lectura de ambos participantes y escritura del profesor propietario aprobado,
con panel activo, validando cada evaluación contra `user_ramos` crudo. Helpers
sin permisos de ejecución de cliente. Lectura enlaza futuras en esta tabla;
no hay trigger sobre sync ni escritura en notas del alumno. PGlite cubre
anon/terceros/alumno sin escritura, revocación y borrado/reaplicación.

Límite de identidad: antes de tener `nota.id`, una futura refiere a la casilla
lógica (categoría.id, número, cantidad e inicio). Borrar/recrear la misma casilla
vacía sin cambiar esa forma en una sincronización no es detectable; cambios
intermedios que nunca se leyeron tampoco se reconstruyen. Una marca ya ligada
no pasa a un id nuevo. No se agregaron ids al documento del alumno.

### Notas típicas por evaluación · revisión local 2026-11-03

Propuesta en `supabase/notas_tipicas.sql`, **sin aplicar en producción**. Lucas
debe aprobar y publicar primero el texto nuevo de `privacidad.html`: las notas
individuales privadas se conservan después de archivar para calcular referencias
anónimas de semestres anteriores.

- `evaluacion_notas` lleva RLS, sin acceso directo para `PUBLIC`, `anon` o
  `authenticated`, y FK a `auth.users ON DELETE CASCADE`. PGlite comprueba la
  eliminación de todas las filas, actuales e históricas, al borrar la cuenta.
- Captura al sincronizar `user_ramos` mediante trigger, sin reescribir su JSON.
  Reutiliza las claves del panel. Solo mira `categorias[].notas[].valor` numérico
  dentro de escala: no promedios de categoría, sombras ni `avgOverride`.
- La captura es de mejor esfuerzo: `notas_tipicas_al_sincronizar` la ejecuta
  dentro de un bloque `EXCEPTION WHEN OTHERS`. Si falla, se revierte solo esa
  captura y se guarda el upsert de `user_ramos`. El aviso lleva `user_id`,
  SQLSTATE y un mensaje fijo; no usa `SQLERRM`, porque puede interpolar notas
  o JSON. No añade detalles del error ni el documento al aviso. PGlite fuerza un
  error después de una escritura parcial y verifica INSERT/UPDATE guardados y
  `evaluacion_notas` idéntica. Una muestra fallida queda pendiente hasta otro
  upsert exitoso: no se reintenta desde el cliente.
- El único reloj es `public.profesor_periodo_actual()` de `profesores.sql`.
  `notas_tipicas.sql` requiere ese archivo y `profesor_alumnos.sql`; elimina la
  copia antigua `notas_tipicas_periodo_actual()` sin CASCADE.
- Cambio de período: una clave activa con captura anterior pero sin archivo
  explícito de ese período/tenant/ramo se retiene, sin copiarla al período nuevo.
  Cubre marzo y agosto y mantiene la retención más allá de ese primer mes,
  incluso si se salta un semestre entero. El historial verificable permite
  capturar una recursada nueva de la misma clave; las claves nuevas no se frenan.
  No añade campos al estado ni una tabla de marcas.
  **Límites:** es conservador: un intento realmente nuevo sin archivo verificable
  puede quedar fuera de las referencias. Sin una captura anterior no hay cómo
  detectar el arrastre; tampoco se corrige un período que el propio historial
  declare mal. No se infiere el semestre por fechas/nombres ni se reetiquetan
  registros. La carga inicial de 2026-2 mantiene su contrato separado.
- Borrar notas o ramos actuales elimina sus filas. Archivar preserva la copia;
  una actualización posterior no borra las referencias de períodos anteriores.
  La carga inicial 2026-2 es idempotente y no borra datos históricos ausentes.
- La única RPC para la app requiere sesión y devuelve clave de evaluación,
  promedio, personas y períodos; nunca ids ni notas individuales. El piso es
  cinco personas por evaluación. Excluye el período actual y futuros. Una
  persona con varias repeticiones pesa una vez en el promedio.
- Funciones internas de captura/reloj/agregado sin permisos de ejecución para
  los roles del cliente; el parámetro de prueba no se expone como RPC pública.
- Las cuentas de profesor, demo, anónimas o marcadas administrativamente en
  `raw_app_meta_data.gradehub_datos_sinteticos=true` se excluyen. Esa marca nueva
  queda propuesta para revisión de Lucas; no se escribe `gradehub_v1` ni se
  deduce una cuenta de prueba por su correo/nombre. Marcar cuentas de prueba
  antes de aplicar el SQL. Los alumnos de ejemplo del panel no se sincronizan.
- Un cambio de marca administrativa excluye las referencias inmediatamente;
  la siguiente sincronización o reaplicación retira su copia privada capturada.
  Pruebas: `tests/notas-tipicas-sql.test.js`, solo fixtures sintéticos.
- Comprobación agregada de solo lectura el 2026-11-03: no se encontraron claves
  `demo`/`sintetico`/`test`/`prueba` en los metadatos de Auth. El esquema solo
  mostró `tutor_perfiles.alumnos_ejemplo`, que controla ejemplos locales del
  panel. No prueba que no existan cuentas de prueba: identificarlas y marcarlas
  es requisito de revisión antes de activar esta captura. No se leyeron
  nombres, correos ni notas, y no se marcó ninguna cuenta.

#### Coste local del trigger de notas típicas

Medición opcional reproducible: `GH_MEDIR_NOTAS_TIPICAS=1 node tests/notas-tipicas-sql.test.js`.
PGlite 0.3.16, sin red ni datos reales: documento de 17.875 bytes, 8 ramos
activos y 2 semestres con 8 ramos cada uno; 120 notas numéricas en total
(40 activas y 80 históricas). Cada upsert cambia una nota. Se mide la sentencia
con `clock_timestamp()` dentro de PostgreSQL, con resolución local de 1 ms;
10 calentamientos y 100 muestras por condición, en 5 bloques alternados.

| Condición | Media | Mediana | p95 | Máximo |
|---|---:|---:|---:|---:|
| Sin este trigger | 0,10 ms | 0 ms | 1 ms | 1 ms |
| Con este trigger | 2,43 ms | 2 ms | 3 ms | 3 ms |

Incremento medio observado: **2,33 ms**; no supera 20 ms en esta medición. No
se introdujeron optimizaciones de rendimiento. Es una medición en memoria/WASM,
no una garantía de latencia del Postgres de producción, su disco o su carga.
