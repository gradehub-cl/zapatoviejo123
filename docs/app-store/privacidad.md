# Privacidad para la App Store — BORRADOR

> **BORRADOR para revisión.** Propuesta de respuestas para App Store Connect →
> App Privacy, sacada del código y del SQL del repo al 13-nov-2026. Nada está
> cargado. Donde dice *verificar*, el repo no alcanza para estar seguro.

## 1. ¿Sirve la política publicada?

**Sí, existe y sirve como Privacy Policy URL:** `https://gradehub.cl/privacidad.html`
(fuente: `privacidad.html` del repo; la versión publicada responde 200 y dice
«Última actualización: 4 de noviembre de 2026»).

Cubre lo que Apple pide (guideline 5.1.1(i)): qué datos se recogen y cómo,
para qué, con quién se comparten (Supabase, Cloudflare, Google Analytics,
Google Fonts/jsDelivr, Google al entrar con Google), retención, cómo pedir y
hacer el borrado (Ajustes → Datos y cuenta → Eliminar mi cuenta, en la app;
cumple 5.1.1(v)), y contacto (`gradehub.app@gmail.com`).

**Lo que falta o conviene ajustar para la app iOS** (texto propuesto; va a
`privacidad.html` en otro PR, no en este):

1. Habla siempre de «tu navegador» y «el almacenamiento local del navegador».
   En iPhone los datos quedan en la app. Propuesta, en «Dónde viven tus datos»:
   > **En tu propio dispositivo**: en la web, en el almacenamiento local del
   > navegador (la clave `gradehub_v1`); en la app para iPhone, dentro de la
   > app y, para los widgets, en un espacio compartido entre la app y sus
   > widgets que no sale del teléfono.
2. No menciona funciones propias de iOS. Propuesta de sección nueva:
   > **En la app para iPhone.** Si sacas una foto de tu horario, la lectura del
   > texto ocurre en tu teléfono y la foto no se sube. Los avisos antes de una
   > evaluación y la Actividad en Vivo son notificaciones locales: se programan
   > en tu iPhone y no pasan por nuestros servidores. Lo que respondes en
   > «¿cómo te fue?» queda en tu teléfono. Si eres profesor particular y subes
   > un logo o un flyer, esa imagen se guarda en nuestra base de datos para
   > mostrarla en tu aviso.
3. «Estadísticas de uso» dice que GA va sin cookies. En la app iOS el mismo
   `index.html` carga Google Analytics (`index.html` líneas ~95–106, se copia
   tal cual a `ios-web` en `bin/preparar-ios.sh`). Conviene decir que también
   aplica en la app.
4. Si entra #1112 (Entrar con Apple), esa PR ya toca `privacidad.html`;
   revisar que mencione el correo de relay de Apple («Ocultar mi correo»).

## 2. App Privacy («nutrition labels») — propuesta

**Tracking (rastreo entre apps/sitios de otras empresas): NO.** No hay SDK de
publicidad, no se usa IDFA (no hay `NSUserTrackingUsageDescription` ni
`AppTrackingTransparency` en `ios/`), GA va con `ad_storage`,
`ad_user_data` y `ad_personalization` en `denied` (`index.html`), y los
profesores que pagan avisos reciben solo totales (`privacidad.html`,
`supabase/anuncio_totales.sql`). Por lo tanto no hace falta el prompt ATT.

«Data Used to Track You»: ninguno.

### Data Linked to You

| Tipo Apple | Qué es en GradeHub | Propósitos | Evidencia |
| --- | --- | --- | --- |
| Contact Info → **Email Address** | Correo de la cuenta (o el que entrega Google) | App Functionality | Supabase Auth; `src/app-session/login-registro.js`, `oauth-y-recuperacion.js` |
| Contact Info → **Name** | Nombre opcional; nombre de la cuenta Google; nombre con que el alumno aparece ante su profesor | App Functionality | `profiles` (`src/app-session/perfil-y-legal.js`), `supabase/profesor_alumnos.sql` |
| User Content → **Other User Content** | Ramos, evaluaciones, notas, pautas propias, calificación y etiquetas a profesores, respuestas a encuestas | App Functionality; Analytics (promedios anónimos agregados) | `user_ramos` (`src/app-session/sync-escritura.js`), `evaluacion_notas` en `supabase/notas_tipicas.sql`, `profesor_calificaciones` en `supabase/profesores.sql`, `supabase/encuestas.sql` |
| User Content → **Customer Support** | Sugerencias y comentarios enviados desde Ajustes | App Functionality | `supabase/user_feedback.sql`, `src/app/feedback-enviar.js` |
| User Content → **Photos or Videos** | Solo cuentas de profesor particular: logo y flyer del aviso | App Functionality | bucket `tutor-flyers` en `src/marketplace/logo-y-seleccion-apoyo.js` |
| Identifiers → **User ID** | UUID de la cuenta en Supabase | App Functionality; Analytics | todas las tablas con `user_id`; `supabase/visitas_diarias.sql` |
| Usage Data → **Product Interaction** | Días en que la cuenta abrió la app; visitas a encuestas | Analytics; App Functionality | `supabase/visitas_diarias.sql`, `encuesta_visitas` en `supabase/encuestas.sql` |
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

### Data Not Linked to You

| Tipo Apple | Qué es | Propósitos | Evidencia |
| --- | --- | --- | --- |
| Usage Data → **Product Interaction** | Eventos de Google Analytics sin cookies («alguien agregó un ramo») | Analytics | `index.html` (gtag `G-TS791S6PDM`, consent `denied`), `src/app/analitica.js` |
| Location → **Coarse Location** *(opcional, conservador)* | País que GA deduce de la IP | Analytics | GA4; `privacidad.html` «Estadísticas de uso» |

### No se recoge (verificado en el código)

- Precise Location, Contacts, Health & Fitness, Financial Info / Purchases,
  Browsing History, Search History (la búsqueda del catálogo no se guarda,
  según `privacidad.html`), Sensitive Info, Audio, Gameplay, Emails/Text Messages.
- **Fotos del horario**: el OCR corre en el dispositivo con Tesseract
  empaquetado (`ocr/`, `src/app/horario-ocr.js`, sin subida) → no se declara.
- Fotos guardadas en la galería (Wrapped): solo escritura local
  (`NSPhotoLibraryAddUsageDescription`) → no se declara.
- Avisos y Actividad en Vivo: locales (`src/app/ios-avisos-pruebas.js`) → no se declaran.

### Verificar antes de enviar

- [ ] Tablas base creadas desde el Dashboard (`profiles`, `user_ramos`,
      `catalog_reports`): no están declaradas en el repo
      (`supabase/permisos_tablas_base.sql`). Confirmar columnas reales.
- [ ] Integración Canvas (`src/app/canvas.js`, plugin `GradeHubCanvas`): confirmar
      si el token o datos de Canvas se guardan en Supabase o solo en el dispositivo.
- [ ] Agentes conectados / MCP (`supabase/agente_mcp.sql`, `agent_links`):
      guarda fechas de uso por cuenta; entra en Product Interaction/App Functionality.
- [ ] Si #1112 se mergea, Apple ID token: igual cae en Email Address / Name.
