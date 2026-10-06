# GradeHub en App Store: preparación inicial

Estado al 5 de octubre de 2026: PWA en producción; todavía no hay membresía Apple Developer (confirmado por Lucas). Este PR prepara herramientas y contenido. No cambia el frontend, sus datos ni su autenticación, y no publica una versión iOS.

## Preparar un candidato local

```bash
node bin/appstore.js doctor
node bin/appstore.js bundle --app-id cl.gradehub.preview --out /tmp/gradehub-ios-candidato
cd /tmp/gradehub-ios-candidato
npm install --ignore-scripts
npx --no-install cap add ios
npx --no-install cap open ios
```

La salida debe ser nueva y estar fuera del repo. `cl.gradehub.preview` es un identificador de prueba, sin reserva ni firma en Apple. Elegir el definitivo cuando esté confirmado el titular. El script copia los assets del contrato de producción, excluye funciones de servidor y headers de Pages, sella sus versiones y escribe hashes en `bundle-manifest.json`. Conserva archivos originales. `capacitor.config.json` usa `www` local, sin `server.url`. El proyecto generado **todavía requiere adaptación nativa**; no es un IPA listo para revisión.

Capacitor 8.5.2, fijado en el paquete generado, es una base propuesta para reutilizar cálculo, interfaz y catálogos. La primera instalación crea `package-lock.json`: conservarlo y usar `npm ci` en las siguientes instalaciones. Un candidato nuevo no reemplaza un proyecto iOS con cambios nativos: llevar esos cambios a una rama dedicada antes de regenerar. No guardar credenciales, certificados ni claves de firma en git.

Este Mac tiene seleccionado `/Library/Developer/CommandLineTools`; `xcrun --sdk iphoneos --show-sdk-version` no encuentra SDK. Instalar Xcode completo y seleccionar su toolchain antes de compilar. [Capacitor 8 exige Xcode 26 o posterior](https://capacitorjs.com/docs/getting-started/environment-setup). Apple exige [SDK iOS 26 o posterior para cargas desde el 28 de abril de 2026](https://developer.apple.com/news/?id=ueeok6yw). Generar el proyecto no demuestra que compile.

## Antes de la primera prueba real

1. **Acceso:** adaptar Google/OAuth con navegador del sistema y callback hacia la app. El código actual usa `location.origin+location.pathname`; copiarlo a Capacitor no completa el retorno. Probar registro, confirmación de correo, recuperación y sesión persistente. Si se conserva Google, resolver [la opción equivalente de 4.8](https://developer.apple.com/app-store/review/guidelines/#login-services), habitualmente Sign in with Apple. Incluye configuración del proveedor en Supabase y Apple; no se resuelve agregando solo un botón.
2. **Origen y datos:** WKWebView tiene almacenamiento distinto de Safari/PWA. Recuperar las notas existentes mediante la cuenta y la sincronización; no afirmar que localStorage se comparte ni sobrescribir una cuenta con estado vacío. Probar cuentas existentes y ediciones sin conexión con fixtures.
3. **Red y funciones:** `functions/` sigue ejecutándose en Pages. Revisar todas las URLs relativas de API, CSP/CORS, calendarios y agentes desde el origen nativo. Empaquetar/verificar las dependencias externas; la biblioteca Supabase aún se carga desde CDN. Revisar el service worker dentro del runtime nativo.
4. **Integración iPhone:** enlaces externos, exportación/importación y archivos, compartir, calendario, fotos/OCR, teclado y safe areas. Añadir permisos solo cuando una función los necesite. Probar accesibilidad y fondo/retorno de la app. El icono de 512 px actual no reemplaza el asset de distribución requerido por Xcode.
5. **Valor y estabilidad:** demostrar uso completo de cálculo, simulador y agenda, no limitarse a cargar el sitio remoto. [4.2 exige funcionalidad suficiente](https://developer.apple.com/app-store/review/guidelines/#minimum-functionality); Capacitor por sí solo no garantiza aceptación. Resolver los bugs de metas detectados en la auditoría antes de enviar.

## Cuenta y ficha

Elegir primero quién aparecerá como vendedor. La [inscripción individual](https://developer.apple.com/programs/enroll/) muestra el nombre legal de la persona; la inscripción de organización requiere una entidad legal y, normalmente, D‑U‑N‑S. No comprar la membresía ni registrar identificadores hasta decidir ese titular. Una cuenta gratuita permite desarrollo limitado; TestFlight/App Store requieren el programa de distribución.

`es-CL.json` contiene nombre, subtítulo, descripción, keywords y notas para revisión. El script valida los límites de texto. La categoría Educación es una propuesta; la clasificación por edad queda sin asignar hasta responder el cuestionario real. La edad declarada en onboarding no es la clasificación de App Store.

Las capturas finales deben salir del candidato iOS funcionando, con cuenta sintética y sin nombres/correos reales. Preparar estas historias: semestre y promedio, ingreso de notas, simulación de una meta, agenda y semestre anterior. Consultar [las especificaciones actuales de capturas](https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications/) para los dispositivos soportados. No anunciar funciones nativas que aún no existen.

## Privacidad y revisión

Completar [App Privacy](https://developer.apple.com/help/app-store-connect/reference/app-privacy/) después de revisar el binario y los proveedores. Inventario inicial para validar, no respuestas definitivas:

| Flujo observado | Datos a revisar | Uso observado |
|---|---|---|
| Supabase Auth / profiles | Correo, nombre/apodo, UID, universidad y configuración | Acceso y personalización |
| user_ramos | Ramos, notas, agenda e historial asociados a cuenta | Funcionalidad y sincronización |
| Comparación con el curso | Promedios asociados a cuenta en backend | Estadísticas agregadas |
| Google Analytics | Uso y datos técnicos de conexión/dispositivo | Analítica; verificar consentimiento y configuración del PR #606 |
| Marketplace y futuras encuestas/docentes | Perfil, aportes y métricas según funciones habilitadas | Revisar destinatarios, moderación y retención |
| SDKs y runtime iOS | APIs, manifiestos de privacidad y dependencias transitivas | Auditar tras generar el proyecto |

No declarar «no recopilamos datos». Determinar por flujo vinculación a identidad y si existe tracking según Apple; publicidad contextual local no prueba por sí sola tracking entre empresas. Revisar manifests y APIs de razón requerida del binario; no copiar declaraciones genéricas.

Ya hay `eliminar_mi_cuenta` y flujo de borrado en Ajustes. [Apple exige poder iniciar la eliminación desde la app](https://developer.apple.com/support/offering-account-deletion-in-your-app/). Verificar en cuenta sintética que elimina todos los registros asociados, incluidas tablas posteriores; si hay Apple login, contemplar revocación de tokens. No basta con esconder la cuenta o enviar al usuario a soporte.

Antes de App Review: confirmar URLs públicas de soporte/privacidad, preparar cuenta demo y credenciales en el campo privado de App Store Connect, mantener el backend disponible y documentar dónde se prueban simulación, agenda y borrado. Probar instalación limpia, actualización, conexión interrumpida y restauración de sesión en iPhone real. Después: archivo firmado → TestFlight → revisión. Merge de este PR solo incorpora herramientas, no realiza esos pasos.

## Artefacto local de esta ejecución

Se generó el proyecto Xcode en `/Users/lucasirarrazaval/dev/gradehub-ios-preview-20261005/ios/App/App.xcodeproj` con Capacitor 8.5.2 y assets locales. La generación y copia de assets pasaron; la compilación no se pudo validar por falta del SDK. Este artefacto usa el ID de prueba `cl.gradehub.preview`, no tiene equipo de firma y no incorpora todavía login nativo. El comprobador inspecciona el repo, no proyectos generados en directorios externos.
