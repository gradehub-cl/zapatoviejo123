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


### Calificaciones de ramos · auditoría preparada, 2026-11-03

`supabase/ramo_calificaciones.sql` se aplica manualmente después de
`profesores.sql`. Esta revisión y sus pruebas PGlite son locales: no certifican
la instalación ni ejecutaron SQL en producción.

- Tabla privada con RLS y sin permisos directos para `PUBLIC`, `anon` o
  `authenticated`. Solo cuatro RPC públicas, con sesión, `search_path=''` y
  contexto del ramo/sección/período tomado de `user_ramos`. Los auxiliares y
  la constante del piso no tienen permisos de ejecución para clientes.
- Las cuentas `tipoCuenta='profesor'` no califican. El historial solo habilita
  respuestas si conserva sección, período y universidad verificable por origen
  o cierre; no se añaden campos al estado guardado.
- Solo el autor lee/edita/borra su respuesta por contexto. El resumen para elegir
  ramos no requiere tener el ramo, pero sí sesión, y devuelve solo agregados:
  cinco cuentas distintas como mínimo, tres para una etiqueta. Cada cuenta
  aporta su semestre más reciente, sin inflar n al repetir el ramo.
- Un docente oculto nunca aparece en el desglose. El ramo solo publica si hay
  cinco cuentas sin ese docente; entonces sus opiniones pueden contribuir al
  total general. La receta manual de supresión está en el SQL y debe ejecutarse
  antes de eliminar los aportes que permiten asociar el docente.
- FK `user_id -> auth.users ON DELETE CASCADE`. El test borra una cuenta
  sintética y comprueba cero filas residuales, además de cerrar el agregado si
  el borrado deja el grupo bajo el piso. No hay datos en Storage que limpiar.
- Validación: `tests/ramo-calificaciones-sql.test.js` cubre permisos positivos y
  negativos, contexto, privacidad, roles, docencia, edición/borrado, reaplicación
  y cascada. `tests/ramo-calificaciones-cliente.test.js` verifica contrato de
  etiquetas, aviso local por cuenta/ramo/período y búsqueda sin la nueva RPC.
