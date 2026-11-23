# Clasificación por edad — BORRADOR

> **BORRADOR para revisión.** Respuestas propuestas al cuestionario de App
> Store Connect → App Information → Age Rating (sistema nuevo con 4+, 9+, 13+,
> 16+, 18+ y la pregunta de redes sociales agregada el 9-jul-2026). Definiciones:
> <https://developer.apple.com/help/app-store-connect/reference/app-information/age-ratings-values-and-definitions>
> y <https://developer.apple.com/news/?id=tlur8uvi>.

**Resultado esperado con estas respuestas: 4+** (Brasil: A12 por Publicidad).

## In-App Controls

| Pregunta | Respuesta | Por qué |
| --- | --- | --- |
| Parental Controls | **No** | No hay controles para padres ni límites de uso. |
| Age Assurance | **No** | Al crear la cuenta la persona *declara* tener 14 años o más (`privacidad.html`; `supabase/edad_declarada.sql`). Una casilla de autodeclaración no es verificación de edad ni usa la Declared Age Range API. |

## Capabilities

| Pregunta | Respuesta | Por qué |
| --- | --- | --- |
| Unrestricted Web Access | **No** | Los enlaces externos (contacto de un profesor, políticas) se abren con `abrirFuera()` en una hoja de Safari hacia una URL fija (`docs/guia/ios.md`, `src/marketplace/directorio.js`). No hay barra de direcciones ni navegación libre dentro de la app. |
| User-Generated Content | **Sí** *(conservador)* | Hay contenido creado por usuarios que ven otros usuarios: avisos y perfiles de profesores particulares con texto, logo y flyer (`supabase/clases_particulares.sql`, `supabase/directorio_perfiles.sql`, bucket `tutor-flyers`), y el nombre del profesor de cada sección que informan los alumnos (se muestra desde 3 cuentas; `supabase/profesores.sql`). Los avisos pasan por revisión del equipo antes de publicarse (`tutor_anuncios.estado`: borrador → en_revision → publicado; perfiles de profesor: pendiente → aprobado/rechazado/suspendido). Las etiquetas escritas a profesores hoy no se muestran (solo el promedio de estrellas). No sube la edad: UGC queda en 4+. |
| Social Media | **No** | No hay feed, seguidores, «me gusta», comentarios ni compartidos dentro de la app. Lo que ven otros es agregado (promedios desde 5 personas, porcentajes) o avisos moderados en un catálogo por universidad, no un feed que amplifique publicaciones de usuarios. |
| Social Media Disabled for Users Under 13 | **No aplica** | Solo se responde si lo anterior es Sí. |
| Messaging and Chat | **No** | No hay mensajes entre usuarios dentro de la app. El contacto con un profesor particular sale a un medio externo (`contacto_tipo`/`contacto_valor` en `supabase/directorio_perfiles.sql`, abierto con `abrirFuera`). Compartir notas con un profesor (`supabase/profesor_alumnos.sql`) es una vista de datos, no un chat. |
| Advertising | **Sí** | Clases particulares pagadas por profesores, marcadas «Publicidad · Clase particular» (`privacidad.html`, `src/marketplace/`). |

## Mature Themes / Medical / Sexuality / Violence

Todas **None / No**: la app trata de notas, ramos y fechas.

| Pregunta | Respuesta | Comentario |
| --- | --- | --- |
| Profanity or Crude Humor | None | Las etiquetas escritas a profesores se filtran contra insultos (`supabase/profesores.sql`) y hoy no se muestran. |
| Horror/Fear | None | |
| Alcohol, Tobacco, Drugs | None | |
| Medical or Treatment Information | None | |
| Health or Wellness Topics | **None** *(revisar)* | Los avisos antes de una prueba incluyen una fase «baño y agua» (`src/app/ios-avisos-pruebas.js`). Es un recordatorio práctico, no consejos de salud; si Lucas prefiere ser conservador, marcarlo sube a 9+. |
| Mature or Suggestive Themes | None | |
| Sexual Content / Graphic Sexual Content | None | |
| Cartoon/Fantasy Violence, Realistic Violence, Graphic Violence, Guns | None | |

## Chance-Based Activities

| Pregunta | Respuesta | Por qué |
| --- | --- | --- |
| Gambling / Simulated Gambling | No / None | |
| Contests | **None** | «Cómo vas respecto de tus compañeros» muestra un percentil anónimo del ramo; no hay rankings entre usuarios, premios ni competencias. |
| Loot Boxes | No | |

## ¿Subir la clasificación a mano (override)?

La política exige declarar 14+ al crear cuenta y autorización para menores de
18. Apple permite elegir una clasificación mayor que la calculada. Opciones:
dejar **4+** (calculada) o forzar **13+** para que la ficha no sugiera que es
para niños. 16+ quedaría por encima del mínimo real (14). **Decide Lucas.**
No marcar «Made for Kids».

## Ojo con la guideline 1.2 (contenido generado por usuarios)

Si se declara UGC, App Review suele exigir: filtro de contenido objetable,
**forma de reportar** contenido, **bloquear** a usuarios abusivos y datos de
contacto. Hay filtro y revisión previa de avisos, y el contacto está en
`privacidad.html`, pero **no encontré un botón para reportar un aviso o perfil
de profesor** dentro de la app (búsqueda de «reportar/denunciar/bloquear» en
`src/`). Recomendación: agregar «Reportar este aviso» en la tarjeta de clase y
en el perfil del directorio antes de enviar a App Review (no es necesario para
TestFlight interno).
