# Revisión de normativa chilena · 4 de octubre de 2026

**Estado: brechas abiertas; no es una certificación de cumplimiento.** Revisión
sobre `origin/main` a12de54 y los archivos públicos de gradehub.cl. Los cambios
propuestos necesitan revisión y merge; esta auditoría no publica ni aplica SQL.

## Integración sobre main · 29 de octubre de 2026

La revisión anterior es una foto del 4 de octubre, no una certificación actual de
producción. Al poner esta PR al día sobre `e57fc10`, se preservan la ruleta de
edad y los mínimos de main (14 estudiante / 18 profesor), el flujo de postulación,
la edad y generación guardadas, las visitas diarias y el consentimiento de
compartir con un profesor. La casilla legal se exige aparte y se limpia al
entrar otra cuenta; las cuentas que ya terminaron onboarding siguen entrando.
La versión del texto aceptado pasa a 2026-10-29 sin rellenar aceptaciones antiguas.

La calculadora incorporada en main desde la revisión original también usa la
misma puerta de Analytics y la misma preferencia del navegador. Su cálculo y
el enlace a GradeHub funcionan sin permiso. Se mantienen los eventos y el origen
calculadora/profesor cuando existe autorización; los eventos previos no se envían
al activarla. Las pruebas de estos embudos declaran explícitamente si hay permiso.

No se aplicó SQL ni se revisó la configuración privada. Esta PR presupone las
columnas y permisos de `supabase/aceptacion_legal.sql` y `supabase/edad_declarada.sql`
que ya usa main; su instalación en producción debe verificarse antes del merge.
Verificación de la integración anterior: 362 tests, JS/CSS y navegador sintético
en ocho variantes (375/1280 px, claro/oscuro, texto normal/200%), con app y
calculadora abiertas, autorización/revocación entre pestañas y datos conservados.

Después de incorporarse #806 y #801 a main, se repitió la integración sobre
`25e4600`: 365 tests aprobados y las ocho variantes del navegador nuevamente
en verde. Se conservan también Canvas y los reportes de programas.

Los demás hallazgos jurídicos de la revisión original siguen pendientes de
verificación; no se dan por resueltos al integrar los conflictos.

## Alcance y fuentes oficiales

GradeHub trata datos personales de estudiantes, aunque la app sea gratuita.
La [Ley 19.628 vigente](https://www.bcn.cl/leychile/navegar?idNorma=141599)
regula autorización informada, finalidad, cuidado de los datos, acceso,
rectificación, eliminación/bloqueo y revocación. El art. 16 permite recurrir
judicialmente si no hay pronunciamiento dentro de dos días hábiles: no confundirlo
con un plazo arbitrario de 30 días ni prometer únicamente un acuse de recibo.

Desde **1 de diciembre de 2026**, la reforma de la
[Ley 21.719](https://www.bcn.cl/leychile/navegar?idNorma=1209272)
exige preparar transparencia (14 ter), consentimiento demostrable (12), derechos
incluida portabilidad (9–11), seguridad/incidentes (14 quinquies–sexies), menores
(16 quáter) y transferencias internacionales (27–28). La versión futura puede
[consultarse por separado](https://www.bcn.cl/leychile/navegar?idNorma=141599&idVersion=2026-12-01).
No se presentan sus nuevos procedimientos como vigentes hoy.

La [Ley 19.496](https://www.bcn.cl/leychile/navegar?idNorma=61438) y el
[Reglamento de Comercio Electrónico, DS 6](https://www.bcn.cl/leychile/navegar?idNorma=1165504)
necesitan evaluar el negocio real: gratuidad para estudiantes no resuelve por
sí sola el cobro a profesores. El reglamento excluye sitios que solo exhiben
publicidad o redirigen; no asumir que la falta de checkout excluye toda
contratación. Si aplica, revisar identidad del proveedor/operador, precio total,
condiciones, aceptación, confirmación y retracto aplicable a servicios.

La [Ley 17.336](https://www.bcn.cl/leychile/navegar?idNorma=28933) protege obras:
que un PDF sea público no concede automáticamente licencia para reproducirlo.
Revisar licencias de imágenes, videos y materiales; distinguir datos académicos
transcritos de reproducción de obras. El retiro publicado no reemplaza permisos.

## Hallazgos y acciones

| Prioridad | Evidencia comprobada | Acción / estado |
|---|---|---|
| Alta | `index.html` publicado carga GA antes de cualquier elección; privacidad decía que sin cookies no había consentimiento que pedir. | Corregido en esta PR: no cargar Google hasta autorización opcional en Ajustes. Revocar recarga y se propaga a otras pestañas. |
| Alta | Paso 1 de onboarding solo exigía nombre y edad; `registrarDeclaracionEdad` anotaba aceptación legal también para Google. | Corregido el paso: casilla independiente, desmarcada, finalidad y enlaces; la edad sola no autoriza. Versión nueva solo para aceptaciones nuevas. |
| Alta | OAuth puede crear la cuenta y entregar correo/nombre a Supabase antes del onboarding. | **Abierto**: diseñar autorización/información previa a OAuth y verificar su evidencia; la casilla de onboarding no resuelve el tratamiento anterior. No dar por regularizado ese acceso. |
| Alta | «Quién es responsable» identifica una marca y un correo, sin persona/entidad legal. | **Pendiente de Lucas**: confirmar quién decide el tratamiento y completar nombre legal, representante si corresponde y contacto/domicilio aplicable. No inventar sociedad, RUT ni dirección. |
| Alta | Métricas: funciones `limpiar_alcance_anuncios` y `limpiar_interacciones_anuncios` existen, sin programación demostrada en el repo. La política promete 90 días tras campaña. | **Verificar producción**: job o procedimiento, última ejecución, cobertura y respaldos. No se ejecutó borrado ni se extendió el plazo prometido. |
| Alta | Consentimiento de nuevas cuentas queda en `profiles`; cuentas antiguas pueden tener nulos. El guardado de onboarding absorbe errores y puede perder la constancia. | **Abierto**: demostrar columnas/RLS y guardado real, conservar versión aceptada y gestionar reintentos. No rellenar históricos ni fechar aceptación retroactivamente. Acordar cualquier nueva persistencia. |
| Alta | Recomendaciones usan rendimiento local; aceptación general incorpora publicidad y no hay selector global por finalidad. Cerrar una tarjeta solo descarta esa clase. | **Decidir base y mecanismo de oposición** por finalidad; separar lo necesario de recomendaciones/medición/comparaciones/aportes. Procesamiento local también debe analizarse. No se cambiaron algoritmos ni cobros. |
| Alta | Política: menor de 18 requiere autorización; app: declaración de 14 o más. No hay comprobación de representante. | **Abierto**: reconciliar edad de admisión, capacidad contractual y tratamiento sensible en adolescentes. No equiparar 14 años a mayoría de edad ni pedir fecha/RUT por defecto. No se expulsaron cuentas existentes. |
| Media | Política omitía notas entregadas a agentes autorizados y eventos del calendario mediante URL privada. | Corregido: alcance, destinatario elegido por la persona, revocación y límites sobre copias recibidas. |
| Media | Promedios en `curso_notas` llevan `user_id`, aunque el texto parecía describirlos como anónimos. | Corregido el aviso. El mínimo de cinco y salida agregada son mitigaciones; no certifican anonimización frente a consultas sucesivas. |
| Media | Política aún mencionaba Google Fonts; nombre descrito como opcional aunque onboarding lo exige; contraseña descrita como nunca recibida en texto. | Corregido con comportamiento real: fuente del sistema, nombre/apodo de onboarding, envío desde formulario a Supabase sin almacenamiento propio en claro. |
| Media | Derechos por correo exigían hacerlo desde el correo de alta. | Aclarados gratuidad, bloqueo/revocación y alternativa de verificación si se perdió ese correo. **Falta** procedimiento y persona que lo atienda. |
| Media | «Exportar mis datos» exporta `gradehub_v1`; no incluye todos los registros de perfil, anuncios, comentarios, autorizaciones y agentes. | **Abierto**: inventario completo para responder acceso; preparar portabilidad cuando corresponda. No llamar a ese respaldo una exportación legal completa. |
| Media | Países, regiones, retenciones de logs/backups y contratos de encargados no están acreditados por el código. | **Verificar configuración/contratos**. Existen [DPA de Supabase](https://supabase.com/legal/customer-resources/data-processing-addendum) y [Cloudflare](https://www.cloudflare.com/cloudflare-customer-dpa/), pero no se comprobó cuáles rigen esta cuenta ni garantías aplicables a Chile. No basta consentir genéricamente «el extranjero». |
| Media | Panel y código contemplan cobro manual de anuncios; política dice que ya financia la app y AGENTS dice que cobro/publicidad no están activados. | **Pendiente de Lucas**: confirmar operación real; preparar términos de profesores, facturación y normativa de consumo según el flujo. No afirmar que cobrar fuera del sitio elimina obligaciones. |
| Media | Términos dicen que necesitan «peso legal de verdad» y que no los revisó abogado. | **Revisión contractual pendiente**: un texto no pierde efectos solo por esa frase; revisar derechos irrenunciables, responsabilidades y cambios contractuales, sin renuncias generales. |
| Media | Aviso de incidentes promete informar a usuarios, sin procedimiento operativo acreditado. | **Preparar protocolo**: responsables, detección, contención, registro, evaluación del riesgo y comunicaciones exigibles. No adoptar automáticamente el plazo GDPR de 72 horas como norma chilena. |
| Media | Pautas/programas públicos y futuros saludos de profesores. | **Verificar derechos** de materiales; obtener autorización para imagen/voz, edición, público, duración y retiro de saludos. Videos y encuestas/profesores de PRs pendientes no se presentaron como funciones ya publicadas. |

## Inventario para terminar la revisión

No consultar cuentas reales como fixtures. Confirmar con la administración,
mediante evidencia sin filas personales:

- Categorías: Auth (correo, proveedor, credenciales), `profiles`, estado académico
  actual/historial, reportes de pautas/fechas, `curso_notas`, feedback, feeds,
  enlaces/propuestas de agentes y perfiles/anuncios/métricas de profesores.
- Por categoría: finalidad, autorización/base, fuente, destinatario, conservación,
  acceso de equipo y modo de eliminación. Un UUID vinculado a cuenta sigue siendo
  dato personal; el anonimato de la pantalla no cambia eso.
- RLS/grants/FK a `auth.users` en el esquema **aplicado**, incluidas tablas nuevas.
  La RPC `eliminar_mi_cuenta` deriva UID de la sesión; comprobar cascadas y
  revocación de feeds/agentes con cuentas sintéticas y todos sus registros.
- Rotación de respaldos y logs, recuperación, eliminación en otros dispositivos
  y procedimiento para retirar autorización sin convertir la solicitud en baja
  automática. No borrar ni migrar datos a partir de este documento.
- Retención/configuración de GA (incluida medición mejorada automática), ausencia
  de identificadores personales en URLs/eventos y cualquier telemetría inyectada
  por el hosting. La prueba de nuestra cola no audita el servicio de Google.
- Revisión jurídica de menores, finalidad publicitaria y contratos comerciales.
  Preparar las decisiones de diciembre sin presentarlas como una autorización
  legal ya obtenida para todos los usuarios históricos.

## Verificación realizada

- Lectura del HTML público de `/` y `/privacidad.html`; coincide la carga GA
  automática y las afirmaciones señaladas. Copias locales de consulta, sin
  datos de cuentas.
- `HEAD /` público: HTTPS, HSTS, CSP, `nosniff`, restricciones de capacidades y
  `frame-ancestors 'none'` presentes. CSP aún permite inline: no es prueba de
  ausencia de XSS. No se auditaron consolas privadas ni configuración de Auth.
- No se observó `static.cloudflareinsights.com` en el HTML recibido; su permiso
  en CSP no prueba ni descarta otras modalidades de telemetría del hosting.
- Tests nuevos escritos antes de arreglar: `analitica-consentimiento` (carga y
  cola previas, rechazo, datos corruptos, storage bloqueado, revocación/otra
  pestaña, URL sin secretos), `onboarding-consentimiento` (edad sin aceptación),
  `privacidad-alcance` (proveedores, destinatarios, derechos y datos asociados).
- Suite completa: **251 archivos de test pasan**, incluidos tests SQL/PGlite y
  regresiones de cuentas/cálculo. Esto verifica el repo, no el esquema desplegado.
- Navegador local con datos sintéticos, sin Supabase y reemplazando Google por
  un stub: desactivado al entrar, activar, revocar/recargar sin cargar el stub,
  estado accesible y botón de 44 px a 390×844. No se enviaron eventos reales.
- HIG seguida: [Privacy](https://developer.apple.com/design/human-interface-guidelines/privacy),
  propósito claro, permiso opcional sin bloquear funciones y sin pedirlo al
  lanzamiento. Se conserva la hoja existente, safe areas y tipografía del
  sistema. Sin nuevas animaciones; los controles heredados respetan Reducir
  movimiento. La revisión visual no certifica toda la accesibilidad de la app.

## Cuentas existentes y riesgo del cambio

No cambia `gradehub_v1`, ramos, cálculo, SQL, sesiones, métricas de anuncios ni
sus tarifas. El consentimiento de estadísticas es una preferencia de **este
navegador**, no de una cuenta: se informa así y no se sincroniza. Las cuentas
que ya terminaron onboarding no reciben otra barrera ni aceptación inventada.
Quien inicia onboarding debe aceptar expresamente; campos antiguos del perfil
no se rellenan. Si la base no tiene las columnas existentes de aceptación,
continúa siendo necesario verificar/aplicar su SQL previo, fuera de esta PR.

Tras merge, Analytics deja de contar visitas de quien no active estadísticas;
no comparar esa caída con abandono real ni mezclarla con las métricas de
anuncios. Revocar recarga la app, conserva el almacenamiento académico y no
borra eventos ya recibidos. La constancia local de Analytics no es un registro
central inmutable: evaluar la evidencia necesaria con el responsable.

La identificación legal, contratos/configuraciones y procedimientos abiertos
son condiciones para cerrar la revisión. **No publicar una insignia de
«cumplimiento» ni dar por resuelta la legalidad del producto con estos tests.**
