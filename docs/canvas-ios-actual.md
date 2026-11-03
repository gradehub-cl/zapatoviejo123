# Canvas iOS: reemplazo de #670

Base `ios`, por decisión explícita de Lucas el 2026-11-02. La lógica compartida de #806 ya está en esta rama; falta el plugin. La foto del horario permite proponer ramos/secciones, pero no sustituye la conexión a Canvas ni sus fechas.

El plugin se registra en Capacitor y usa el llavero por cuenta de GradeHub, con `kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly`. El token se valida contra Canvas antes de guardarse. Nunca se devuelve al JavaScript ni se guarda en S, localStorage, Supabase o registros. Una respuesta de otra cuenta, tras cambiar sesión, se descarta en el puente. Un 401 borra solo el token usado por esa consulta, sin borrar uno nuevo conectado mientras tanto.

Solo GET a `cursos.canvas.uc.cl` y rutas cerradas de cursos, tareas y grupos. Tanto la primera URL como cada página se verifican; los redirects se rechazan. Sesión HTTP efímera, sin cookies ni caché; máximo diez páginas y 2 MiB leídos por consulta, con plazo de red. El grupo se incorpora a la respuesta de tareas para que #806 identifique evaluaciones cuyo título es genérico. La proyección de tareas no incluye calificaciones ni descripciones.

Las propuestas siguen los revisores actuales de ramos y fechas: no se agregan sin confirmar, no cambian ponderaciones ni notas y no pisa fechas existentes. En web no aparece el puente. Sin token conectado las cuentas anteriores siguen como estaban. Los tokens de una compilación experimental vieja que no identificaba cuenta no se adoptan: se vuelve a conectar.

## Verificación

- `npm test`: 363 tests de la base ios, incluidos puente simulado, descarte de respuesta tardía y política Swift real ejecutada con datos sintéticos en macOS.
- `CanvasPolitica` verifica host, ruta, cuenta, token, páginas y proyección de grupos. No usa red ni escribe en el llavero durante los tests.
- Preparación local y compilación Xcode de simulador sin firma: **BUILD SUCCEEDED**. No instala ni despliega. Las rutas temporales generadas por `cap sync` no se versionan.
- Chequeos JS/CSS y diff: aprobados. Falta que Lucas o Martín prueben la conexión con su cuenta real en un iPhone; aquí se usaron solo datos sintéticos.

Para verlo en el teléfono hay que **reinstalar**, porque cambia Swift: `npm run ios:rama` y compilar desde Xcode. No se modificó Team, Bundle ID, firma, widgets ni Actividad en Vivo. No lleva SQL.

## Base compartida y siguiente sincronización

`ios` aún no contiene la separación de fuentes de main. Por eso aquí `app.js` sigue siendo fuente; solo se cambia el adaptador `pluginCanvas`. Al incorporar main en ios, conservar ese adaptador en **`src/app/canvas.js`** y generar el bundle: no recuperar un app.js antiguo encima del generado. No se arrastraron los otros 116 commits de main a esta PR.

Fuentes: [Apple Keychain](https://developer.apple.com/documentation/security/ksecattraccessibleafterfirstunlockthisdeviceonly), [rechazo de redirects](https://developer.apple.com/documentation/foundation/urlsessiontaskdelegate/urlsession(_:task:willperformhttpredirection:newrequest:completionhandler:)). HIG [Text fields](https://developer.apple.com/design/human-interface-guidelines/text-fields), [Buttons](https://developer.apple.com/design/human-interface-guidelines/buttons) y [Privacy](https://developer.apple.com/design/human-interface-guidelines/privacy): conserva campo seguro, controles de 44 pt, confirmación al desconectar y divulgación del lugar donde queda la credencial.
