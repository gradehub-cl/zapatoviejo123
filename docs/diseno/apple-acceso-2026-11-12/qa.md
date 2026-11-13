# QA de acceso con Apple

Solo cuentas, nombres y credenciales sintéticas. Ningún login real ni cambio en
Apple Developer o Supabase. No se probó una autorización Apple real: requiere
el equipo de la SpA y un iPhone. El simulador no demuestra vinculación de cuentas.

## Web

`npm run build && node tests/apple-acceso.navegador.cjs`

Chrome local con la CSP de `_headers`, conexiones externas bloqueadas y Supabase
simulado. Capturas a 375 y 1440 px en claro/oscuro: Apple antes de Google,
ambos de 48 px y el mismo ancho, marca «Lo usaste la última vez», foco visible,
colores oficiales negro/blanco (21:1). Texto al 200 % sin scroll horizontal.
El botón usa imágenes oficiales generadas por Apple, locales y sin redibujar
ni recortar, con etiqueta accesible HTML; no descarga fuentes ni scripts de Apple.

Fuentes de arte, consultadas el 12-11-2026:

- `https://appleid.cdn-apple.com/appleid/button?color=black&border=false&border_radius=12&width=360&height=48&type=continue&locale=es_ES&scale=2`
- Igual URL con `color=white` para el modo oscuro.
- [HIG y generador oficial](https://developer.apple.com/design/human-interface-guidelines/sign-in-with-apple).

El paquete DMG de arte pedía aceptar su acuerdo y no se aceptó: se usaron los
botones provistos por el generador oficial enlazado desde las HIG, no un logo
redibujado ni uno obtenido de una biblioteca de terceros.

## App

Se ejecutó `npm run ios:preparar` y se compiló con Xcode para el simulador iOS 27.
Para la captura se usó una app de QA con identificador temporal pasado **por línea
de comandos**, sin escribirlo en el proyecto ni registrar Bundle IDs con Apple.
No se reemplazó ninguna instalación de Lucas/Martín. Supabase se reemplazó solo
en el HTML generado por un cliente falso sin sesión, como permite la guía iOS.

El plugin Swift propio se compiló dentro de ese binario. Captura de su pantalla
de entrada, no de una autorización real. Al terminar se vuelve a ejecutar
`ios:preparar` para retirar el cliente falso del árbol generado; no se versionan
esos archivos ni las rutas locales de paquetes que genera Capacitor.

## Auth y cuentas existentes

`tests/apple-acceso.test.js` ejecuta las funciones reales con mocks: web OAuth,
hoja nativa sin navegador, SHA-256 del nonce, cancelación 1001, nombre solo si
falta, proveedor apagado, respuesta tardía y separación de cachés. Se ejecuta
también `afterLogin` real con nube simulada y se restaura la cuenta anterior:
su nota sigue siendo 5,2 y el respaldo conserva exactamente el JSON anterior.
El aviso relay no aparece para una cuenta creada antes del intento.

`tests/apple-nativo-contrato.test.js` comprueba registro, scopes, entitlement,
ausencia de almacenamiento/log de tokens, firma sin Team/Bundle ID personales,
privacidad y publicación de los recursos. Los tests preexistentes de auth se
mantienen. Pendientes reales: mismo usuario iPhone/web, correo compartido frente
a relay, cancelación de la hoja y primera/segunda autorización con la SpA.

Verificación final sobre `origin/main` `ff359fd`: build de 170 fuentes, sintaxis
de los siete scripts y balance CSS 4855/4855; **449/449 tests**. La prueba de
Apple confirma además que `afterLogin` llega al onboarding sin errores y que
entrar a la misma cuenta conserva su caché exactamente.
