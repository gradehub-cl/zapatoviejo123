# Ficha de la App Store — BORRADOR

> **BORRADOR para revisión (Claude / Lucas).** Nada de esto está cargado en App
> Store Connect. Textos en español de Chile, basados solo en lo que la app hace
> hoy según el código (`src/`, `ios/`) y el `README.md`. Los límites de
> caracteres se contaron con espacios.

App en App Store Connect: Apple ID **6834207639** · bundle `cl.gradehub.app` ·
idioma principal sugerido: **Español (México)** es el único español
latinoamericano que ofrece App Store Connect; usar ese, con textos chilenos.

## Nombre (≤30)

`GradeHub` (8)

Alternativa con palabra clave en el nombre, si Lucas la prefiere:
`GradeHub: notas y promedio` (26)

## Subtítulo (≤30)

`Tus notas, promedio y agenda` (28)

Alternativas: `Cuánto necesito para aprobar` (28) · `Notas y promedio de la U` (24)

## Texto promocional (≤170)

> Sabe cuánto necesitas en la próxima prueba antes de darla. Anota tus notas,
> mira tu promedio ponderado al tiro y deja la agenda del semestre en tu pantalla de inicio.

(166)

## Descripción (≤4000)

```
GradeHub es la app para llevar tus notas de la universidad sin planillas. Anotas lo que te sacaste y la app te dice cómo va cada ramo, tu promedio y cuánto necesitas en lo que queda para aprobar.

TUS RAMOS, CON SU PAUTA
• Agrega tus ramos y GradeHub les carga la pauta de evaluación cuando la tiene: ponderaciones, controles, solemnes, exámenes y reglas de aprobación.
• Pautas y mallas para cursos de la UC, la FEN de la Universidad de Chile, la UAI, la Universidad de los Andes y la UDD. Si tu ramo no está, lo armas a mano en un minuto.
• La fuente de verdad siempre es el programa oficial del curso: puedes revisar y corregir la pauta cuando quieras.

PROMEDIO Y "CUÁNTO NECESITO"
• Promedio ponderado de cada ramo y del semestre, calculado al instante.
• La nota que necesitas en las evaluaciones que quedan para llegar a tu meta.
• Simulador: prueba escenarios ("¿y si me saco un 4,5 en el examen?") sin tocar tus notas reales.

AGENDA
• Tus próximas evaluaciones ordenadas por fecha y por cuánto pesan.
• Suscribe tus evaluaciones a Google Calendar, Apple Calendar u Outlook: se agregan una vez y se actualizan solas.
• Importa fechas desde un archivo .ics y revisa cada una antes de guardarla.
• Saca una foto de tu horario y GradeHub reconoce las siglas de tus ramos (el reconocimiento corre en tu teléfono).

EN TU IPHONE
• Widgets para la pantalla de inicio y de bloqueo: Próxima evaluación, Próxima clase, Promedio general, Pendientes y Estadísticas.
• Avisos antes de una evaluación con hora y una Actividad en Vivo que te acompaña las horas previas (opcionales).

ESTADÍSTICAS
• Cómo vas en el semestre, tu avance y lo que más te exige.
• Historial de semestres anteriores.
• Compárate de forma anónima con quienes cursan el mismo ramo: solo ves un porcentaje y únicamente cuando hay al menos cinco personas.

TUS DATOS
• Funciona sin conexión: tus notas se guardan en tu teléfono.
• Con una cuenta, se sincronizan entre tu iPhone y gradehub.cl.
• No vendemos tus datos ni se los pasamos a tu universidad. Puedes borrar tu cuenta desde Ajustes cuando quieras.

GradeHub es gratis. Puede mostrar clases particulares de tus ramos, siempre marcadas como publicidad.

GradeHub es un proyecto independiente, sin relación con ninguna universidad.
```

(≈2.240 caracteres; holgura de sobra.)

## Palabras clave (≤100, separadas por coma, sin espacios)

```
notas,promedio,ponderado,universidad,ramos,pruebas,examen,calculadora,agenda,UC,uchile,semestre
```

(95) — no repetir "GradeHub" (el nombre ya cuenta). Revisar si conviene
cambiar `UC,uchile` por `PUC,FEN` según búsquedas reales.

## Categoría

- Principal: **Educación**
- Secundaria (opcional): **Productividad**

## URLs

- Soporte: `https://gradehub.cl/preguntas.html` (preguntas frecuentes; el
  correo de contacto `gradehub.app@gmail.com` está en `privacidad.html` y
  `terminos.html`). Si Apple pide una página con contacto visible arriba, usar
  `https://gradehub.cl/terminos.html` o agregar el correo a `preguntas.html`.
- Marketing: `https://gradehub.cl`
- Política de privacidad: `https://gradehub.cl/privacidad.html` (ver `privacidad.md`).

## Derechos de autor

`2026 GradeHub SpA`

## Notas para el revisor (App Review Information → Notes) — borrador

Acordado con Lucas el 2026-11-17: **no se esconde nada al revisor**. Las
campañas de los profesores se compran solo en la web; en la app no hay compras
ni enlaces de pago (#1161). Si Apple rechaza algo, se corrige en una versión
nueva, nunca con un interruptor remoto. La frase sobre los anuncios es la
acordada y no se cambia sin Lucas.

Se carga **en inglés** (lo leen revisores de todo el mundo). Abajo va la misma
nota en español, de referencia. Completar `[CUENTA DEMO]` solo en App Store
Connect (Sign-In Information), nunca en el repo; el plan de la cuenta está en
`testflight.md`.

```
GradeHub helps university students in Chile track their grades: each course follows its official grading scheme, and the app shows the course average, the semester average and the grade needed in the remaining evaluations to pass.

Demo account: [CUENTA DEMO] (email and password, synthetic data only). It has courses with grades and upcoming evaluations so you can see Agenda, Statistics and the widgets with content.

Sign in: email, Sign in with Apple or Google.

Ads: the app shows ads for private tutoring classes, always labeled "Publicidad · Clase particular" (Spanish for "Ad · Private class"). Which ad appears on the Home screen is decided on the device, comparing each campaign's audience with the student's courses and grades; grades are not sent to our servers for this. Students can turn it off in Settings → Datos y cuenta → "Usar mis notas para elegir anuncios"; then no recommendations appear on Home. Ads for private tutoring classes are managed by GradeHub directly with the tutors; the app has no purchases and no payment links. Contacting a tutor opens outside the app (WhatsApp, Instagram or a web link), and the class price shown is what the tutor charges the student for an in-person or one-to-one class.

Tutor accounts: tutors approved by our team see their ads and reach numbers in the "Clases" tab and can pause them. They cannot create, renew or pay for campaigns in the app.

User-generated content: every ad, tutor profile and professor rating has "Denunciar o bloquear" (report or block). Blocked authors are managed in Settings → Datos y cuenta. Reports are reviewed by our team.

Account deletion: Settings → Datos y cuenta → Eliminar mi cuenta. Accounts that use Sign in with Apple are revoked with Apple before deletion. Please do not delete the demo account; if you want to test deletion, create a new account.

Widgets: long-press the Home Screen → Edit → Add Widget → GradeHub (Next evaluation, Overall average, Pending, Next class, Statistics).

Not affiliated with any university.
```

Referencia en español:

```
GradeHub ayuda a estudiantes universitarios de Chile a llevar sus notas: cada ramo sigue su pauta oficial y la app muestra el promedio del ramo, el del semestre y la nota que se necesita en lo que queda para aprobar.

Cuenta demo: [CUENTA DEMO] (correo y contraseña, solo datos ficticios). Tiene ramos con notas y evaluaciones próximas para ver la Agenda, Estadísticas y los widgets con contenido.

Acceso: correo, Entrar con Apple o Google.

Anuncios: la app muestra anuncios de clases particulares, siempre marcados «Publicidad · Clase particular». Qué anuncio aparece en Inicio se decide en el dispositivo, comparando el público de cada campaña con los ramos y notas del estudiante; las notas no se envían a nuestros servidores para eso. Se puede apagar en Ajustes → Datos y cuenta → «Usar mis notas para elegir anuncios»; apagado, no aparecen recomendaciones en Inicio. Los anuncios de clases particulares los gestiona GradeHub directamente con los profesores; la app no tiene compras ni enlaces de pago. El contacto con el profesor se abre fuera de la app (WhatsApp, Instagram o un enlace web), y el precio que se ve es lo que el profesor le cobra al estudiante por una clase presencial o individual.

Cuentas de profesor: los profesores aprobados por nuestro equipo ven sus anuncios y su alcance en la pestaña «Clases» y pueden pausarlos. No pueden crear, renovar ni pagar campañas en la app.

Contenido de usuarios: cada anuncio, perfil de profesor y calificación de profesor tiene «Denunciar o bloquear». Los autores bloqueados se administran en Ajustes → Datos y cuenta. Nuestro equipo revisa las denuncias.

Borrar la cuenta: Ajustes → Datos y cuenta → Eliminar mi cuenta. En las cuentas que entran con Apple, primero se revoca el acceso con Apple. Por favor no borren la cuenta demo; para probar el borrado, creen una cuenta nueva.

Widgets: mantener presionada la pantalla de inicio → Editar → Agregar widget → GradeHub (Próxima evaluación, Promedio general, Pendientes, Próxima clase, Estadísticas).

Sin relación con ninguna universidad.
```

Antes de cargarla, verificar en el build que se envía: que estén #1161
(sin compras en la app) y #1163 (interruptor de anuncios por notas), y que
cada ruta nombrada exista con ese texto en la app.

## Pendiente de revisar

- [ ] Que cada función nombrada siga visible en la versión iOS 1.0 (widgets,
      Actividad en Vivo, foto del horario, suscripción de calendario).
- [ ] Capturas: 6,9" (1320×2868) obligatorias; 6,5" opcionales. No están en este PR.
- [ ] Si #1112 (Entrar con Apple) entra antes, mencionarlo en "Tus datos".
