# QA de Universal Links — 2026-11-18

Simuladores propios «GradeHub-Enlaces-QA» y «GradeHub-Enlaces-Final», iPhone 18 Pro, iOS 27.0. Solo cuentas,
profesor y ramos sintéticos; sin ponderaciones inventadas ni filas reales.

| Estado observado | Claro | Oscuro |
|---|---|---|
| Invitación pendiente antes de entrar | [captura](acceso-claro.png) | [captura](acceso-oscuro.png) |
| Hoja de consentimiento después del login | [captura](invitacion-claro.png) | [captura](invitacion-oscuro.png) |
| Ruta desconocida: Inicio visible | [captura](inicio-claro.png) | [captura](inicio-oscuro.png) |

Las imágenes son capturas del simulador, reducidas proporcionalmente a 1600 px.
No son maquetas. La primera captura clara corresponde al acceso de un
navegador nuevo; tras usar la cuenta sintética el acceso recuerda el método,
como muestra la oscura. No se crearon cuentas de servidor.

## Qué se comprobó

- `simctl openurl` entrega la URL al esquema aislado de QA. El relay temporal
  crea una `NSUserActivityTypeBrowsingWeb`, y el puente real de Capacitor y
  `@capacitor/app` emiten `appUrlOpen` con el HTTPS de GradeHub.
- Sin sesión, la invitación permanece pendiente y se ve el contexto existente.
  Tras reiniciar con caché de una cuenta sintética pero sin sesión, sigue en
  el acceso: no muestra sus ramos ni abre la hoja privada.
- El login usa `submitAuth`, `afterLogin`, aislamiento de caché y la hoja
  existentes, con transporte Supabase falso. Al terminar, el dueño coincide
  con el usuario sintético y se abre la invitación. Ninguna casilla viene
  marcada y Compartir permanece deshabilitado.
- Con la app abierta, tocar otra vez el link vuelve a la misma invitación.
  Una ruta desconocida deja Inicio visible y cierra la hoja anterior. El
  registro QA termina con `auth:false`, `modal:false`, `pestana:"home"`, dueño
  propio y `errores:[]`.
- Se repitió el arranque de un proceso cerrado con la actividad inyectada al
  aparecer el WebView: `sesion:false`, `auth:true`, `pendiente:"ABCD2345"`,
  `dueno:null`, sin ramos ni errores. Después del login: dueño propio y hoja
  de consentimiento. Se registran las opciones de arranque antes de mostrar
  la ventana, para no perder el primer `capacitorViewDidAppear`.
- `tests/universal-links.test.js` comprueba además getLaunchUrl/arranque frío,
  evento retenido duplicado, onboarding, recuperación/auth excluidos,
  parámetros malformados, cambio de cuenta y formulario sin guardar. Un único
  oyente conserva los callbacks OAuth retenidos; las fichas de widgets esperan
  también al dueño correcto de la caché. Ejecuta
  el `afterLogin` real con una lectura remota demorada y una caché de otra
  persona. También pasa aplicado a una copia temporal de `origin/ios`.

## Reproducir sin tocar el proyecto de producción

1. Enlazar dependencias y ejecutar `npm run ios:preparar`.
2. `python3 docs/diseno/universal-links-2026-11-18/preparar-qa.py "$PWD"`.
   Imprime la ruta de una copia temporal. Compilarla con el esquema App,
   `GRADEHUB_BUNDLE_ID=cl.gradehub.enlacesqa`,
   `GRADEHUB_APP_GROUP=group.cl.gradehub.enlacesqa`, `DEVELOPMENT_TEAM=` y
   `CODE_SIGN_IDENTITY=-`, solo como argumentos de xcodebuild.
3. Instalar esa copia en un simulador vacío propio y abrir la app. El primer
   openurl puede pedir «Open in Enlaces QA?»: aceptar esa apertura del sistema.
4. Ejecutar, reemplazando DEVICE por el identificador del simulador:

```bash
xcrun simctl openurl DEVICE 'cl.gradehub.enlacesqa://abrir?url=https%3A%2F%2Fgradehub.cl%2F%3Fprofe%3DABCD2345'
xcrun simctl openurl DEVICE 'cl.gradehub.enlacesqa://entrar'
xcrun simctl openurl DEVICE 'cl.gradehub.enlacesqa://abrir?url=https%3A%2F%2Fgradehub.cl%2Fno-existe'
```

Para repetir el arranque en frío sin el diálogo de apertura del esquema QA:

```bash
xcrun simctl launch --terminate-running-process DEVICE cl.gradehub.enlacesqa -qaEnlaceFrio 'cl.gradehub.enlacesqa://abrir?url=https%3A%2F%2Fgradehub.cl%2F%3Fprofe%3DABCD2345'
```

Ese argumento existe solo en la copia temporal y entrega la actividad al puente
nativo al aparecer el WebView. Si la lectura de estado ocurre antes de cargar JS,
`cl.gradehub.enlacesqa://estado` vuelve a leerlo sin repetir el enlace.

Esperar a que termine cada pantalla antes del siguiente comando. `entrar`
solo existe en la copia QA: llama el login con credenciales sintéticas y
respuestas locales. La copia bloquea `connect-src`, omite GA remoto y jamás
consulta Supabase. `Documents/qa-enlace.json` permite comprobar el estado real
sin dar por buena una captura de una pantalla anterior. Cambiar apariencia con
`xcrun simctl ui DEVICE appearance light` / `dark` y guardar con
`xcrun simctl io DEVICE screenshot archivo.png`. Al terminar, desinstalar la
app QA y eliminar el simulador propio.

## Límite de esta evidencia

No se verificó la asociación real de `gradehub.cl`: requiere activar
Associated Domains en el portal, desplegar el AASA, renovar firma si corresponde,
reinstalar y probar en un iPhone. El relay, el transporte falso y el esquema QA
no forman parte de la app de producción. La compilación del proyecto original
se verificó aparte, sin esos cambios temporales.
