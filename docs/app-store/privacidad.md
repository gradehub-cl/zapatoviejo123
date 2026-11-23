# Privacidad para la App Store — BORRADOR

> **BORRADOR para revisión.** Propuesta de respuestas para App Store Connect →
> App Privacy, contrastada con el código y el SQL de `origin/ios` (`2b702118`) al
> 18-nov-2026 y con `origin/main` (`55791f86`). Nada está
> cargado. Donde dice *verificar*, el repo no alcanza para estar seguro.

## 1. Política pública y diferencia entre web e iPhone

La URL sigue siendo `https://gradehub.cl/privacidad.html`. Esta revisión no
consulta producción ni confirma que el texto nuevo esté desplegado. La política
pública se corrige en una PR separada contra `main`, [PR #1191](https://github.com/gradehub-cl/zapatoviejo123/pull/1191); **hay que
mergearla y comprobar su publicación antes del envío a Apple**.

Al traer #1191 desde main a ios, hay dos conflictos de texto previsibles en
`privacidad.html`: fecha (12 frente a 18-nov) y la sección Apple que ios agregó
en #1112. Conservar la fecha 18-nov y la sección ampliada de #1191, que explica
relay, confirmación al borrar y límites de revocación web. No son conflictos
del código de auth. No basta mergear esta auditoría para publicar la política.

| Punto revisado | Lo que hace el código | Evidencia |
|---|---|---|
| Fuente y librerías | Fuente del sistema, sin Google Fonts. **La web sí carga jsDelivr** para supabase-js; `ios:preparar` lo copia dentro del build nativo. Eliminar ambos proveedores de la política habría sido incorrecto. | `index.html:38,757`, `_headers:36`, `bin/preparar-ios.sh:37-53` |
| Contacto de particulares | Quien publica elige WhatsApp, Instagram o email y puede agregar sitio web. WhatsApp revela su número a quienes consultan el perfil/anuncio aprobado. No se pide el teléfono a estudiantes para llevar notas. | `src/marketplace/perfil-profesor.js`, `src/marketplace/catalogo.js` |
| Apple | Apple ID, nombre cuando se recibe y correo real o relay para Auth. Revocación al borrar en iPhone con confirmación y código temporal en servidor, sin persistir tokens Apple. La web borra la cuenta sin revocarlos. | `src/app-session/apple-acceso.js`, `src/app/cuenta-borrado.js`, `functions/apple-revocar.js` (#1112, #1133) |
| Canvas iPhone | Token en llavero separado por cuenta, `AfterFirstUnlockThisDeviceOnly`; plugin consulta Canvas directamente. Solo lo que la persona confirma entra a `S` y puede sincronizarse. | `ios/App/App/CanvasPlugin.swift:34-55`, `src/app/canvas.js`, `canvas-notas.js`, `canvas-programa.js` |
| Canvas web | URL ICS en localStorage por cuenta; al actualizar pasa a la función Cloudflare y desde allí a Canvas. La función devuelve el calendario sin escribirlo en BD ni registrar su contenido. Las fechas confirmadas sí se guardan en los ramos. | `src/app/canvas-calendario-web.js:2-20,68-76,103-137`, `functions/canvas-calendario.js` |
| Widgets / App Group | Resumen calculado y almacenado en el teléfono, sin servidor para mostrarlo. Incluye notas y horarios: puede ser visible en Inicio/bloqueo según el widget. | `src/app/ios-widgets.js`, `ios/App/App/WidgetsPlugin.swift:26-46` |
| Avisos / Actividad en Vivo | Programación local; respuestas a «cómo te fue» locales. GA recibe el evento de uso, no la respuesta. | `src/app/ios-avisos-pruebas.js:109-133`, `ios/App/App/WidgetsPlugin.swift`, `ios/App/Shared/ActividadPrueba.swift` |
| Denuncias / bloqueos | Cuenta, contenido, motivo y texto opcional; revisión con MFA sin mostrar el denunciante al admin. FK por denunciante/bloqueador y autor, con cascada al borrar. | `supabase/denuncias_bloqueos.sql`, `src/marketplace/denuncias.js` (#1137) |
| Anuncios con notas | Elección en el dispositivo, activada inicialmente. Apagar «Usar mis notas para elegir anuncios» elimina recomendaciones en Inicio; Apoyo sigue disponible. La preferencia en `S` puede sincronizarse, sin enviar notas para elegir el anuncio. | `src/marketplace/recomendacion-inicio.js:23-36,378`, `src/app/ajustes.js:246-250` (#1163) |
| Analítica | GA se carga en web/iPhone con los cuatro permisos de Consent Mode denegados antes de config. El build iOS también desactiva Google Signals y señales de personalización. No equivale a ausencia de tráfico a Google. | `index.html:97-108`, `src/app/analitica.js` |
| Agentes elegidos por la persona | El conector entrega sus ramos/notas/fechas al servicio de IA elegido. `agent_links` guarda vínculo, llave, fechas de creación, último uso y vencimiento. No es procesamiento solo local. | `supabase/agente_mcp.sql`, `supabase/agente_url_directa.sql`, `functions/mcp/[[ruta]].js`, `src/app/agentes-conexion.js` |

**Límite identificado:** cerrar sesión limpia la URL ICS de Canvas, pero no
llama a `GradeHubCanvas.desconectar`. El token nativo queda aislado por cuenta
en el llavero; «Desconectar Canvas» lo borra y revocarlo en Canvas lo invalida.
No se declara que cerrar sesión o borrar Auth revoque ese token. Revisar aparte
si se quiere eliminarlo del llavero también al borrar la cuenta; esta PR de
texto no cambia el borrado ni la integración.

## 2. App Privacy («nutrition labels») — propuesta

**Tracking (rastreo entre apps/sitios de otras empresas): NO.** No hay SDK de
publicidad, no se usa IDFA (no hay `NSUserTrackingUsageDescription` ni
`AppTrackingTransparency` en `ios/`), GA va con `ad_storage`,
`ad_user_data` y `ad_personalization` en `denied` (`index.html`), y los
profesores que pagan avisos reciben solo totales (`privacidad.html`,
`supabase/anuncio_totales.sql`). Con esas prácticas, la propuesta es no pedir
ATT; Lucas debe comprobar que la configuración real de los proveedores coincide
antes de responder en App Store Connect. Esto no certifica el proyecto desplegado.

«Data Used to Track You»: ninguno.

### Data Linked to You

> **Una sola respuesta por tipo de dato (revisión de Hark, 2026-11-18):** App Store Connect no deja declarar
> *Product Interaction* como vinculado y como no vinculado a la vez. Se declara **una vez, vinculado a la
> identidad**, con los dos propósitos (App Functionality y Analytics): es la respuesta conservadora que cubre
> las dos filas de abajo. *Coarse Location* (GA deduce el país de la IP) **se declara**, no vinculado y solo
> para Analytics: es la opción conservadora, y omitirla arriesga una observación de App Review.


| Tipo Apple | Qué es en GradeHub | Propósitos | Evidencia |
| --- | --- | --- | --- |
| Contact Info → **Email Address** | Correo de la cuenta, Google o Apple (real o relay) | App Functionality | Supabase Auth; `src/app-session/login-registro.js`, `oauth-y-recuperacion.js` |
| Contact Info → **Name** | Nombre opcional; nombre recibido de Google o Apple; nombre con que el alumno aparece ante su profesor; nombre y apellido que ven amigos y grupos (Amigos) | App Functionality | `profiles` (`src/app-session/perfil-y-legal.js`), `supabase/profesor_alumnos.sql`, `supabase/amigos.sql` |
| Contact Info → **Phone Number** | WhatsApp elegido por el particular que publica, visible en su contacto | App Functionality | `src/marketplace/perfil-profesor.js`, `supabase/perfil_profesor.sql` |
| User Content → **Other User Content** | Ramos, evaluaciones, notas, pautas propias, calificación y etiquetas a profesores, respuestas a encuestas, denuncias y propuestas de agentes. **Amigos:** solicitudes, amistades, bloqueos, grupos (nombre, quién invitó), denuncias de usuarios, el horario que ven amigos y grupos y, si se activa, el promedio por ramo que ven los amigos | App Functionality; Analytics (promedios anónimos agregados) | `user_ramos` (`src/app-session/sync-escritura.js`), `evaluacion_notas` en `supabase/notas_tipicas.sql`, `profesor_calificaciones` en `supabase/profesores.sql`, `supabase/encuestas.sql` |
| User Content → **Customer Support** | Sugerencias y comentarios enviados desde Ajustes | App Functionality | `supabase/user_feedback.sql`, `src/app/feedback-enviar.js` |
| User Content → **Photos or Videos** | Solo cuentas de profesor particular: logo y flyer del aviso | App Functionality | bucket `tutor-flyers` en `src/marketplace/logo-y-seleccion-apoyo.js` |
| Identifiers → **User ID** | UUID de la cuenta en Supabase, el identificador Apple usado por Auth y el **username** de Amigos (Apple cuenta un *screen name / handle* como User ID) | App Functionality; Analytics | todas las tablas con `user_id`; `supabase/visitas_diarias.sql` |
| Usage Data → **Product Interaction** | Días en que la cuenta abrió la app; visitas a encuestas; creación, último uso y vencimiento de agentes conectados; eventos de PostHog con el identificador técnico de la cuenta (#1219) | Analytics; App Functionality | `supabase/visitas_diarias.sql`, `encuesta_visitas` en `supabase/encuestas.sql`, `supabase/agente_mcp.sql`, `src/app/analitica.js` (`identify`) |
| Usage Data → **Advertising Data** | Qué clase particular vio la cuenta, el día y si llegó por recomendación/búsqueda/catálogo (para cobrar una vez por persona) | Third-Party Advertising *(conservador; ver nota)*; Analytics | `anuncio_interacciones`, `anuncio_alcance` en `supabase/clases_particulares.sql`; `supabase/anuncio_eventos.sql` |
| Diagnostics → **Other Diagnostic Data** | Tipo de error, pantalla y versión, asociados a la cuenta | App Functionality | `supabase/errores_app.sql`, `src/app-session/errores.js` |
| Other Data → **Other Data Types** | Universidad, carrera, semestre, generación (año de ingreso); edad elegida en cuentas antiguas | App Functionality; Analytics | `profiles` (`src/app-session/perfil-y-legal.js`), `supabase/edad_declarada.sql` |

Nota sobre **Advertising Data**: Apple define «Third-Party Advertising» como
mostrar avisos de terceros en la app; los avisos de clases son de profesores
(terceros) y la app registra por cuenta qué aviso se vio. Aunque al profesor
solo le llegan totales, lo conservador es declararlo así. La **elección** de qué
clase recomendar se hace en el dispositivo con las notas (`src/marketplace/recomendacion-inicio.js`);
lo que se procesa solo en el dispositivo no cuenta como «recogido» para Apple,
así que las notas **no** se declaran con propósito publicitario.

### Amigos (2026-11-20): qué cambia en App Store Connect

La pestaña Amigos (solo en la app; `supabase/amigos.sql`, `amigos_grupos.sql`,
`amigos_notas.sql`) **no agrega tipos de dato nuevos**: cae en Name, Other User
Content y User ID, que ya se declaran como vinculados y para App Functionality.
El calendario de grupos (salas reservadas y fechas de pruebas, sin notas) también
cae en Other User Content.
**Manifiesto de la app:** desde #1267, `ios/App/App/PrivacyInfo.xcprivacy` declara los mismos tipos y propósitos de esta página, incluidos Device ID y Coarse Location. Si cambia uno, cambia el otro.
**Avisos push (opt-in):** el token APNs del iPhone se guarda asociado a la cuenta
(`push_dispositivos`) solo para mandar avisos. Apple no lo pide como tipo de dato
propio; lo conservador es incluirlo en *Identifiers → Device ID* vinculado y para
App Functionality (*verificar* con la definición vigente antes de enviar). El
widget «Hoy en la u» lee datos guardados en el teléfono: no se declara aparte.
Lo que sí cambia es que hay datos que **otros usuarios ven**, y eso tiene que
estar en la política pública (`privacidad.html`, filas de Amigos y «Con tus
amigos y tus grupos»). Ni la ubicación ni los contactos del teléfono se usan:
«qué hace ahora» sale del horario y a los amigos se los agrega por username o
link. *Precise/Coarse Location* y *Contacts* siguen sin declararse por Amigos.

**App Review 1.2 (contenido generado por usuarios)** — lo que pide y dónde está:

| Exige | En GradeHub |
|---|---|
| Filtrar contenido ofensivo | `amigos_texto_ofensivo` en la base rechaza groserías e insultos en usernames y nombres de grupo, más la lista de nombres reservados |
| Denunciar | «Denunciar» en la ficha de un amigo (`denunciar_usuario`) |
| Bloquear | «Bloquear» en la ficha; corta la amistad y separa también en grupos |
| Responder a tiempo | `admin_denuncias_usuarios` / `admin_resolver_denuncia_usuario` con segundo factor. **Pendiente: pantalla en el panel de admin** (hoy solo SQL) |
| Contacto publicado | `gradehub.app@gmail.com` en la política y en la ficha de la tienda |

Pendientes antes de enviar con Amigos: aplicar los tres SQL, publicar la
política con las filas de Amigos y, en la nota para App Review, explicar cómo
probarlo: la cuenta demo necesita un username, al menos un amigo con horario
y un grupo. Eso todavía no está en `cuenta-demo.md`.

### Data Not Linked to You

| Tipo Apple | Qué es | Propósitos | Evidencia |
| --- | --- | --- | --- |
| Usage Data → **Product Interaction** | Eventos de Google Analytics sin cookies («alguien agregó un ramo») | Analytics | `index.html` (gtag `G-TS791S6PDM`, consent `denied`, sin Google Signals ni señales de anuncios), `src/app/analitica.js` |
| Location → **Coarse Location** *(opcional, conservador)* | País que GA deduce de la IP | Analytics | GA4; `privacidad.html` «Estadísticas de uso» |

**Tracking: No.** GA corre sin Google Signals ni señales de anuncios (`allow_google_signals:false`, `allow_ad_personalization_signals:false` en `index.html`), El código no añade un identificador de GradeHub ni activa esas señales para
cruzar datos entre servicios. Mantener esta configuración y verificar en el panel
de GA → Admin → Recopilación de datos que Google Signals siga apagado antes de
confirmar Tracking: No. No se revisó esa configuración de producción.

### No se recoge (verificado en el código)

- Precise Location, Contacts, Health & Fitness, tarjeta ni cuenta bancaria,
  Browsing History, Search History (la búsqueda del catálogo no se guarda,
  según `privacidad.html`), Sensitive Info, Audio, Gameplay, Emails/Text Messages.
- **Fotos del horario**: el OCR corre en el dispositivo con Tesseract
  empaquetado (`ocr/`, `src/app/horario-ocr.js`, sin subida) → no se declara.
- Fotos guardadas en la galería (Wrapped): solo escritura local
  (`NSPhotoLibraryAddUsageDescription`) → no se declara.
- Avisos y Actividad en Vivo: locales (`src/app/ios-avisos-pruebas.js`) → no se declaran.

### Verificaciones del repo y pendientes antes de enviar

Comprobación de código, **no auditoría del proyecto desplegado**. La definición
Apple de «recogido» excluye el procesamiento solo local y el tránsito necesario
para atender una petición en tiempo real; no excluye las notas que se aceptan y
sincronizan. Referencia: [App privacy details](https://developer.apple.com/app-store/app-privacy-details/).


- [ ] Tablas base creadas desde el Dashboard (`profiles`, `user_ramos`,
      `catalog_reports`): no están declaradas en el repo
      (`supabase/permisos_tablas_base.sql`). Confirmar columnas reales.
- [x] Canvas revisado en el repo: token de iPhone solo en llavero; web ICS
      transita por Cloudflare y no se persiste allí. Datos aceptados pasan a los
      ramos y se incluyen en Other User Content si se sincronizan (#1193).
- [x] MCP revisado: `agent_links` guarda fechas y llave asociadas a la cuenta;
      último uso entra en Product Interaction/App Functionality. El conector
      envía contenido al agente elegido; no es una función solo local. Las tablas
      tienen FK en cascada y RLS en el SQL del repo (#1193).
- [x] Apple ID revisado en #1112 y revocación #1133: correo/relay y nombre
      figuran en Contact Info y el identificador de Auth en User ID. El token se
      entrega a Supabase para autenticar; el cliente no lo guarda por separado.
      El servidor de revocación usa tokens Apple temporalmente, sin tabla nueva
      ni persistencia. Su configuración real y el login requieren prueba de Lucas
      (#1193).
- [ ] Lucas: comprobar columnas/tablas reales creadas desde Dashboard y que el
      SQL auditado sea el desplegado. No se consultó Supabase por instrucción.
- [ ] Lucas: comprobar la política nueva publicada y copiar etiquetas a App Store
      Connect solo tras validar las prácticas reales; no se entró a ese servicio.
