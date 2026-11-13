# Sensación nativa de iOS — revisión del 13 de noviembre de 2026

Datos sintéticos, web local empaquetada, iPhone 18 Pro / iOS 27.0, Xcode 27.1.
Base comparada: `0adec38` de `origin/main`. No se crearon cuentas ni se usaron
servicios o notas reales. XCTest usa otro identificador (`cl.gradehub.nativeqa`)
y una copia temporal del proyecto; bloquea las conexiones con CSP.

## Los nueve puntos

| Punto | Antes | Resultado y comprobación |
| --- | --- | --- |
| Mantener pulsado | Ya se impedía seleccionar la interfaz, pero también las siglas. | Se conservan esas protecciones y se permite copiar la sigla de la ficha y correos/URL escritos. XCTest comprueba menú **Copy** en la sigla exacta y su ausencia al mantener pulsada **Inicio**. Los campos conservan selección. |
| Tocar | Ya existía `-webkit-tap-highlight-color:transparent` en la app. | Se conserva el estado activo propio. No se añadió una vibración a cada botón. |
| Desplazar | La raíz de WKWebView podía moverse además del contenido. | Raíz sin rebote, cabecera sin encogerse y scroll interior. La hoja bloquea el scroll del fondo solo en la app. XCTest compara la posición de **Volver** antes y después de desplazar una categoría de diez casillas; Chrome verifica el bloqueo real de fondo. |
| Teclado | El código web podía mover la raíz al buscar el campo. | `Keyboard` redimensiona la vista nativa; solo se desplaza el contenedor interior necesario. Campo de nota y buscador de hoja por encima del teclado; fuentes de al menos 16 px. El teclado decimal muestra coma. Guardado sintético con `5,7` y regreso a Inicio; la barra reaparece al cerrar el teclado. Correo/números conservan los tipos existentes. |
| Barra y áreas seguras | Ya había márgenes `safe-area` y fondo de arranque claro/oscuro. | `StatusBar` sigue la apariencia elegida por la app, también al cambiarla abierta; `Keyboard` acompaña el modo. La barra usa texto oscuro sobre claro y claro sobre oscuro. Se conservan los márgenes de isla e indicador de inicio. |
| Carga | El splash tenía un máximo de 3 s y después había una respiración/viaje de marca. | Se oculta tras dos cuadros de la primera pantalla, sin esperar la animación. El máximo de 3 s sigue siendo respaldo. Fondo nativo y web oscuro coinciden. Medición abajo. |
| Sin internet | Ya existía la recuperación de la copia local de la misma cuenta al fallar la nube. | Se conserva ese camino y se añade «Sin conexión · tus cambios quedan en este iPhone». XCTest inicia con copia sintética propia, sesión disponible, `navigator.onLine=false` y nube fallando, y comprueba ramo y aviso. No se modifica la autenticación ni se atribuye una copia ajena a la cuenta actual. |
| Vibración | Ya había nota, borrado, ruedas e interruptores. | Guardar nota usa éxito; errores usan advertencia con deduplicación de 500 ms; un cambio de selección segmentada hace selección. Plugin simulado comprueba llamadas y ausencia en web; plugins ausentes/rechazados no interrumpen el guardado. |
| Movimiento | Ya había varias excepciones por componente. | Se anulan duraciones de navegación/transiciones en la app con Reducir movimiento. XCTest activa **Reduce Motion** en Ajustes del simulador y restaura el valor anterior; el registro confirma la preferencia y CSS sin animación. Chrome comprueba hoja con transición `0s`. |

## Arranque medido

Tres relanzamientos del proceso, sin sesión, en el mismo simulador y con los
assets locales. Instrumentación temporal desde `performance.now()` al cargar
el documento hasta retirar la cubierta y completar dos cuadros:

| Versión | Mediciones | Mediana |
| --- | --- | --- |
| main | 2351, 2306, 2313 ms | 2313 ms |
| cambio | 230, 205, 204 ms | 205 ms |

Es tiempo de la web dentro del arranque en frío del proceso, **no** una medida
de encendido del dispositivo o del tiempo de lanzamiento total de iOS. El
SDK/red se simula de la misma forma en ambos casos; no se atribuye a este cambio
una mejora de latencia de autenticación. La primera pantalla puede ser la carga
con contenido mientras llega la sesión.

## Pruebas reproducibles

```sh
npm run build
node tests/ios-sensacion.test.js
node tests/teclado-no-tapa.test.js
npm test -- --resumen
```

La suite completa: **449 archivos de tests, todos pasan**. XCTest: **6 tests aprobados**, incluidos cambio de apariencia con la app abierta y preferencia real de movimiento recibida por WebKit. Revisión de sintaxis
JS y llaves CSS: correctas. No se modifican motor, estado persistido, fusión,
SQL ni las ramas de #1111 y #1112.

Web real con CSP de `_headers`, sin service worker ni red externa:

```sh
# Tomar la base antes de editar, con el mismo fixture y fecha congelada:
node tests/ios-sensacion.navegador.cjs --antes
# Comparar después de build (exige misma geometría, texto y PNG byte por byte):
node tests/ios-sensacion.navegador.cjs
```

Capturas de Inicio a 375 y 1440 px, claro y oscuro: **idénticas píxel a píxel**.
No hay scroll horizontal. Después también se prueban el bloqueo del fondo y el
mínimo de fuente de la hoja con estilos nativos y movimiento reducido.

Para XCTest, en Mac con Xcode y simulador disponible:

```sh
npm run ios:preparar
python3 tests/ios-sensacion.simulador.py
# El script imprime la ruta de una COPIA temporal; usarla en -project:
xcodebuild -project <ruta-temporal>/App/App.xcodeproj -scheme QA \
  -configuration Debug -destination 'platform=iOS Simulator,id=<UUID>' \
  -derivedDataPath /tmp/gradehub-nativa-qa \
  -resultBundlePath /tmp/gradehub-nativa-qa.xcresult \
  -collect-test-diagnostics never -parallel-testing-enabled NO \
  CODE_SIGN_IDENTITY=- CODE_SIGNING_ALLOWED=NO DEVELOPMENT_TEAM= \
  GRADEHUB_BUNDLE_ID=cl.gradehub.nativeqa \
  GRADEHUB_APP_GROUP=group.cl.gradehub.nativeqa test
```

Los identificadores de QA se pasan por comando; el proyecto del repositorio
sigue tomando la firma de `Firma.xcconfig`. No se sube el proyecto temporal ni
el SDK simulado. El test de Ajustes usa los rótulos ingleses del simulador.

## Capturas

| Pantalla | Claro | Oscuro |
| --- | --- | --- |
| Inicio | [captura](claro-inicio.png) | [captura](oscuro-inicio.png) |
| Ficha | [captura](claro-ficha.png) | [captura](oscuro-ficha.png) |
| Nota con teclado | [captura](claro-editor-teclado.png) | [captura](oscuro-editor-teclado.png) |
| Hoja | [captura](claro-hoja.png) | [captura](oscuro-hoja.png) |
| Hoja con teclado | [captura](claro-hoja-teclado.png) | [captura](oscuro-hoja-teclado.png) |
| Sin red | [captura](claro-modo-avion.png) | [captura](oscuro-modo-avion.png) |

Los archivos `antes-web-*` y `despues-web-*` contienen la comparación web.
`claro-sigla-copiable.png` muestra la selección permitida; `movimiento-reducido.png`, la ficha con el ajuste del sistema activado. `cambio-abierta-claro.png` y `cambio-abierta-oscuro.png` muestran la misma hoja al cambiar el modo sin salir de la app.

## Límites y riesgo

- El simulador no tiene radio: «modo avión» se prueba bloqueando conexiones y
  marcando sin red, con sesión sintética disponible. Falta la pasada física en
  modo avión y con una sesión vencida; esta PR no añade un acceso alternativo
  ni cambia las garantías de autenticación para resolver ese caso.
- La intensidad y los ajustes físicos de háptica requieren iPhone. Se usan los
  generadores UIKit del plugin oficial existente, sin vibración alternativa que
  eluda la configuración del sistema.
- El camino más sensible es el foco: perderlo guarda una nota por el mecanismo
  existente. Se prueba el campo inferior, guardado con coma, regreso y hoja;
  el nuevo código no reescribe notas ni dispara guardados propios.
- Las nuevas dependencias oficiales, fijadas exactamente, son
  `@capacitor/keyboard@8.0.6` (redimensionar la vista ante teclado) y
  `@capacitor/status-bar@8.0.4` (contraste al cambiar modo). Requieren reinstalar
  la app; las llamadas toleran un binario anterior sin esos plugins.
- El alcance cruza varios archivos porque conecta foco, errores, háptica,
  arranque y el puente nativo. Los cambios pequeños en editores solo invocan el
  aviso; el comportamiento se concentra en `experiencia-nativa.js`.

## Guías consultadas

- [Haptics](https://developer.apple.com/design/human-interface-guidelines/playing-haptics): significado de éxito, advertencia y selección; evitar exceso.
- [Layout](https://developer.apple.com/design/human-interface-guidelines/layout): áreas seguras, controles de 44 pt y contenido visible con teclado.
- [Launching](https://developer.apple.com/design/human-interface-guidelines/launching): mostrar contenido cuanto antes y concordar con la apariencia.
- [Motion](https://developer.apple.com/design/human-interface-guidelines/motion): respetar Reducir movimiento y no añadir desplazamientos ornamentales.
- API oficial Capacitor v8: [Keyboard](https://capacitorjs.com/docs/apis/keyboard), [Status Bar](https://capacitorjs.com/docs/apis/status-bar), [Splash Screen](https://capacitorjs.com/docs/apis/splash-screen) y [Haptics](https://capacitorjs.com/docs/apis/haptics).
