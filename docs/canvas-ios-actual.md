# Canvas iOS: reemplazo de #670

Base `ios`, por decisión explícita de Lucas el 2026-11-02. La lógica compartida de #806 ya está en esta rama; falta el plugin. La foto del horario permite proponer ramos/secciones, pero no sustituye la conexión a Canvas ni sus fechas.

El plugin se registra en Capacitor y usa el llavero por cuenta de GradeHub, con `kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly`. El token se valida contra Canvas antes de guardarse. Nunca se devuelve al JavaScript ni se guarda en S, localStorage, Supabase o registros. Una respuesta de otra cuenta, tras cambiar sesión, se descarta en el puente. Un 401 borra solo el token usado por esa consulta, sin borrar uno nuevo conectado mientras tanto.

Solo GET a `cursos.canvas.uc.cl` y rutas cerradas de cursos, tareas y grupos. Tanto la primera URL como cada página se verifican; los redirects se rechazan. Sesión HTTP efímera, sin cookies ni caché; máximo diez páginas y 2 MiB leídos por consulta, con plazo de red. El grupo se incorpora a la respuesta de tareas para que #806 identifique evaluaciones cuyo título es genérico. La proyección de tareas no incluye calificaciones ni descripciones.

Las propuestas siguen los revisores actuales de ramos y fechas: no se agregan sin confirmar, no cambian ponderaciones ni notas y no pisa fechas existentes. En web no aparece el puente. Sin token conectado las cuentas anteriores siguen como estaban. Los tokens de una compilación experimental vieja que no identificaba cuenta no se adoptan: se vuelve a conectar.

## Ampliación del 2026-11-16: eventos, notas y pesos

Lucas pidió que la app lea todo lo útil de Canvas. Se agregó:

- **Eventos del calendario del curso** (`calendar_events`, `type=event`, `context_codes[]=course_<id>`, desde hoy a 200 días). Dan fecha y **hora de Chile** de interrogaciones y exámenes. Pasan por la misma hoja de revisión que las tareas; un evento que no parece evaluación («Clase suspendida») no se propone. La hora solo viene de eventos (una entrega a las 23:59 no es la hora de una prueba) y nunca pisa una hora existente. Si no hay propuestas, Ajustes dice por qué (pasadas, sin fecha, no son evaluaciones).
- **Notas publicadas**: misma ruta de tareas con `include[]=submission`. «Traer notas» abre una hoja propia: evaluación y nota editables, nada se escribe hasta «Guardar notas elegidas». Solo casillas **vacías**; una tarea que calza por nombre con una casilla llena se da por ya ingresada. Se vuelve a revisar la casilla justo antes de escribir. Escala 1–7 tal cual (esquema numérico o puntos sobre 7); un puntaje o porcentaje se muestra y la casilla queda vacía, porque convertirlo exige la exigencia de la prueba. Eximidas, aprobado/reprobado y no calificables no se proponen. La nota queda en memoria del teléfono y solo sube como nota propia por el sync normal.
- **Pesos de grupos** (`group_weight`, solo si el curso tiene `apply_assignment_group_weights`): en «Editar evaluaciones», un botón «Ver pesos en Canvas» los muestra como referencia «según Canvas». No cambian la pauta ni se guardan.
- **Política**: además de la ruta, cada parámetro tiene lista cerrada con valores acotados (`CanvasPolitica.parametrosValidos`). `context_codes[]` solo acepta cursos (máximo 10): nunca el calendario personal, de grupos o de otra persona. Cada respuesta se recorta en Swift: cursos (id, nombre, código, periodo, si usa pesos), grupos (id, nombre, peso), eventos (título, inicio, fin, día completo, curso) y entrega (puntaje, calificación, eximida, estado). Sin descripciones, lugares, comentarios, archivos ni rúbricas.

Descartado, con razón: **quizzes** (los que cuentan para la nota ya llegan como tareas; la ruta de quizzes solo suma los de práctica), **anuncios y módulos** (fechas en texto libre, propuestas poco confiables), **estadísticas del curso** (`score_statistics`: son datos de otros estudiantes; la política lo rechaza) y mensajes o archivos. El **programa del curso** (`syllabus_body`) queda para una PR aparte.

Por confirmar con una cuenta real: que la UC no tenga restringido `calendar_events` para estudiantes, cómo publican las notas los profes (puntos sobre 7, esquema numérico o porcentaje) y si los cursos UC usan `apply_assignment_group_weights`.

## Verificación

- `npm test`: 363 tests de la base ios, incluidos puente simulado, descarte de respuesta tardía y política Swift real ejecutada con datos sintéticos en macOS.
- `CanvasPolitica` verifica host, ruta, cuenta, token, páginas y proyección de grupos. No usa red ni escribe en el llavero durante los tests.
- Preparación local y compilación Xcode de simulador sin firma: **BUILD SUCCEEDED**. No instala ni despliega. Las rutas temporales generadas por `cap sync` no se versionan.
- Chequeos JS/CSS y diff: aprobados. Falta que Lucas o Martín prueben la conexión con su cuenta real en un iPhone; aquí se usaron solo datos sintéticos.

Para verlo en el teléfono hay que **reinstalar**, porque cambia Swift: `npm run ios:rama` y compilar desde Xcode. No se modificó Team, Bundle ID, firma, widgets ni Actividad en Vivo. No lleva SQL.

## Base compartida y siguiente sincronización

`ios` aún no contiene la separación de fuentes de main. Por eso aquí `app.js` sigue siendo fuente; solo se cambia el adaptador `pluginCanvas`. Al incorporar main en ios, conservar ese adaptador en **`src/app/canvas.js`** y generar el bundle: no recuperar un app.js antiguo encima del generado. No se arrastraron los otros 116 commits de main a esta PR.

Fuentes: [Apple Keychain](https://developer.apple.com/documentation/security/ksecattraccessibleafterfirstunlockthisdeviceonly), [rechazo de redirects](https://developer.apple.com/documentation/foundation/urlsessiontaskdelegate/urlsession(_:task:willperformhttpredirection:newrequest:completionhandler:)). HIG [Text fields](https://developer.apple.com/design/human-interface-guidelines/text-fields), [Buttons](https://developer.apple.com/design/human-interface-guidelines/buttons) y [Privacy](https://developer.apple.com/design/human-interface-guidelines/privacy): conserva campo seguro, controles de 44 pt, confirmación al desconectar y divulgación del lugar donde queda la credencial.
