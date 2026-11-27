# Checklist hasta TestFlight y App Store — BORRADOR

> **BORRADOR para revisión.** Escrito el 13-nov-2026 (Hark, #1117); rescatado y
> puesto al día el 15-nov en `ios`. **Revisado el 26-nov-2026** contra
> `origin/main` (5c826e9c), `origin/ios` (7e631386), el estado de los PR y
> lecturas de la base de producción; lo que se marcó ese día dice con qué se
> comprobó. App Store Connect y Apple Developer no se pudieron mirar: lo que
> depende de ellos sigue sin marcar. Marca quién hace cada
> paso: **[Lucas]** = requiere su cuenta de Apple Developer / Supabase / Xcode;
> **[tras merge]** = queda listo con este PR y solo hay que copiarlo a App Store
> Connect; **[código]** = falta un cambio en el repo.

Datos fijos: Team ID **PH6XQV8L2M** (GradeHub SpA) · bundle **cl.gradehub.app**
(widget `cl.gradehub.app.widgets`) · App Group **group.cl.gradehub.app.shared**
· Services ID web **cl.gradehub.web** · App Store Connect Apple ID **6834207639**
· versión **1.0**. Último build armado: **8** (25-nov, sobre `ios`); el
próximo es el **9**.

## 1. Antes del primer build

- [x] App Group `group.cl.gradehub.app.shared` registrado y asignado a los dos
      App ID (hecho por Lucas, 13-nov, issue #1116).
- [x] El repo usa `group.cl.gradehub.app.shared` (#1111, mergeada en `ios`).
- [x] `ITSAppUsesNonExemptEncryption = NO` en `ios/App/App/Info.plist` (#1127).
- [x] Solo iPhone: `TARGETED_DEVICE_FAMILY = 1` (#1131).
- [x] **[código]** Entrar con Apple (guideline 4.8): #1112, y revocar con Apple al borrar la cuenta: #1133.
- [x] **[Lucas]** Developer → Certificates, IDs & Profiles → **Keys** → crear una
      key con **Sign in with Apple** habilitado, asociada al App ID primario
      `cl.gradehub.app`. Descargar el `.p8` (se baja una sola vez) y anotar el Key ID.
      (Este y los dos siguientes: el 26-nov hay cuentas creadas con Apple en
      producción, así que la llave, el Services ID y el proveedor funcionan.)
- [x] **[Lucas]** Developer → Identifiers: App ID `cl.gradehub.app` con la
      capability **Sign in with Apple**; Services ID `cl.gradehub.web`
      configurado con el dominio `gradehub.cl` y el return URL de Supabase
      (`https://<proyecto>.supabase.co/auth/v1/callback`).
- [x] **[Lucas]** Supabase → Authentication → Providers → **Apple**: activar,
      Client IDs `cl.gradehub.web` (web) y `cl.gradehub.app` (nativo), Team ID
      `PH6XQV8L2M`, Key ID y el contenido del `.p8` para generar el secret.
      (Recordatorio: el secret de Apple vence cada 6 meses; agendar renovación.
      Si vence, nadie entra con Apple.)
- [ ] **[Lucas]** Supabase Auth: activar «manual linking» y aplicar el SQL y la
      función del arreglo de cuentas Apple (pendiente de #1282).
- [ ] **[Lucas]** Probar en el simulador/dispositivo: login con correo, Google
      y Apple; widgets leen el App Group nuevo.

## 2. Build 1.0 (1) a TestFlight

- [x] **[Lucas]** `git pull` en `ios` → `npm ci` → `npm run ios:preparar` (build 1.0 (1), 15-nov).
- [x] **[código]** El build Release/Archive verifica la configuración copiada y
      los recursos web con `bin/verificar-build-ios.py` (#1190).
- [ ] **[Lucas]** Antes de Archive: `npm run ios:preparar` →
      `python3 bin/verificar-build-ios.py`. No usar `ios:rama` para enviar a Apple.
- [ ] **[Lucas]** Xcode → target App y GradeHubWidgets: firma automática con el
      Team PH6XQV8L2M (sin commitear el Team; ver `docs/guia/ios.md`), Product →
      **Archive** con esquema App, destino «Any iOS Device».
- [x] **[Lucas]** Organizer → Distribute App → App Store Connect → Upload.
      Desde el Mac de Martín la subida por Xcode falla
      (`Actor/relationships/providerId`, Xcode 27.0): ahí se exporta el `.ipa` y
      se sube con **Transporter**. Así subió la 1.0 (6) el 24-nov.
- [ ] **[Martín]** Subir con Transporter los builds armados que falten: la
      1.0 (8) está en `~/Library/Developer/Xcode/Archives/2026-11-25/`. Confirmar
      en App Store Connect cuál es el último build procesado antes de armar el 9.
- [ ] **[Lucas]** Esperar el procesamiento; con `ITSAppUsesNonExemptEncryption`
      no debería preguntar por cifrado.
- [x] **[Lucas]** TestFlight → grupo interno (Lucas, Martín) → probar.

## 3. TestFlight externo

- [ ] **[tras merge]** Test Information: copiar de `docs/app-store/testflight.md`.
- [x] **[documentación]** Guion de las dos cuentas y recorrido del revisor en
      `cuenta-demo.md` y `ficha.md` (#1192). No se crearon cuentas.
- [ ] **[Lucas]** Aprobar la exclusión preventiva de métricas de #1192, crear
      las dos cuentas según `cuenta-demo.md` y guardar sus credenciales solo
      en App Store Connect. (El 26-nov `admin.cuentas_excluidas_metricas` tiene
      2 filas: confirmar que son las demo y no otras.)
- [ ] **[Lucas]** Grupo externo → agregar build → enviar a Beta App Review.

## 4. Ficha y envío a App Review

- [ ] **[tras merge]** App Information: nombre, subtítulo, categoría Educación,
      URL de privacidad (`ficha.md`).
- [ ] **[tras merge]** Versión 1.0: texto promocional, descripción, palabras
      clave, URLs de soporte y marketing, notas al revisor (`ficha.md`, en inglés).
- [x] **[código]** En la app no se compran campañas (3.1.1): #1161.
- [x] **[código]** Interruptor «Usar mis notas para elegir anuncios» (5.1.2 / 2.5.18): #1163, mergeada.
- [ ] **[código]** Versión B lista por si rechazan por 2.5.18: anuncios sin notas
      en la app. Es #1166, en borrador desde el 17-nov: **hay que ponerla al día
      con `ios` antes de enviar**, para que un rechazo se responda en horas y no
      en días. Decisión de Lucas (23-nov): se envía con los anuncios por notas.
- [x] **[tras merge]** App Privacy: cargar las etiquetas de `privacidad.md`
      (tracking: No). Lucas las cargó el 23-nov y calzan con
      `PrivacyInfo.xcprivacy` (#1267), según su comentario en #665.
- [ ] **[tras merge]** Age Rating: cuestionario según `age-rating.md`.
- [ ] **[Lucas]** Decidir si se fuerza 13+ (ver `age-rating.md`).
- [x] **[código]** «Denunciar o bloquear» en anuncios, perfiles y opiniones (guideline 1.2): #1137.
- [x] **[código]** Ajustes a `privacidad.html` para iOS: #1191; auditoría de
      Canvas, MCP y Apple en `privacidad.md` (#1193).
- [x] **[Lucas, tras merge #1191]** Comprobar política publicada. El 26-nov
      `gradehub.cl/privacidad` dice «Última actualización: 23 de noviembre de
      2026» y trae el párrafo «En la app» (#1293) y las filas de Amigos.
- [ ] **[Lucas]** Cerrar las verificaciones pendientes de `privacidad.md`
      (tablas base creadas desde el Dashboard).
- [ ] **[código]** La política dice «En la app para iPhone» al explicar que la
      analítica parte después de iniciar sesión. En Android pasa lo mismo
      (`analiticaPermitida` pregunta por app nativa): corregir el texto antes de
      publicar en Play.
- [ ] **[Lucas]** Capturas de 6,9". Sin iPad: la app parte solo en iPhone (#1131).
- [ ] **[Lucas]** Precio: gratis. **Disponibilidad: todos los países menos los
      27 de la Unión Europea** (decisión de Lucas; evita las obligaciones de
      «trader» de la DSA). Revisar también que no quede marcado ningún país de la
      UE al agregar regiones nuevas.
- [ ] **[Lucas]** App Review Information: contacto (Lucas Irarrázaval;
      teléfono y correo solo en App Store Connect) y cuenta demo.
- [ ] **[Lucas]** Enviar a revisión; publicación manual recomendada para la 1.0.

## 5. Amigos (si va en este envío)

Rama `claude/friendly-noether-h0w94l`. La pestaña aparece solo en la app nativa
y solo cuando su SQL está aplicado; sin SQL, la app queda como estaba.

- [x] **[Martín]** Aplicar en producción, en este orden, después de
      `administradores.sql`: `supabase/amigos.sql`, `supabase/amigos_grupos.sql`,
      `supabase/amigos_notas.sql`, `supabase/amigos_calendario.sql` y
      `supabase/amigos_avisos.sql`. Desde su Mac:
      `node bin/sql-produccion.js aplicar supabase/amigos.sql supabase/amigos_grupos.sql supabase/amigos_notas.sql supabase/amigos_calendario.sql supabase/amigos_avisos.sql`
      (un clic por archivo), o pegándolos en el SQL Editor. Comprobar con
      `node bin/sql-produccion.js consultar "select count(*) from pg_proc where proname in ('amigos_estado','mis_grupos','amigos_notas_estado')"` → 3.
      (Desde la nube no se puede: no hay token y quitar el clic de confirmación
      quedó descartado.) El 26-nov esa consulta da 3 y también existen
      `grupo_calendario` y `registrar_dispositivo`.
- [ ] **[Martín]** Confirmar que `supabase/amigos_notas.sql` se **reaplicó**
      después de #1268. Que la función exista no dice si es la versión corregida;
      con la anterior, dos cuentas sin universidad pueden ver los promedios de la
      otra.
- [x] **[código]** Pantalla en el panel de admin para las denuncias de usuarios.
- [ ] **[Lucas]** Avisos push: llave APNs, Push Notifications en el App ID,
      secretos, `supabase functions deploy avisos-push` y el Database Webhook.
      Paso a paso en `supabase/functions/avisos-push/LEEME.md`. En Xcode, revisar
      que Signing & Capabilities muestre **Push Notifications** (el permiso ya
      está en `App.entitlements`). El 26-nov hay dispositivos registrados en
      `push_dispositivos` pero `avisos_salientes` está vacía: no hay evidencia
      de que haya salido un aviso push.
- [ ] **[Lucas/Martín]** Compilar en Xcode y probar en un iPhone: el widget
      «Hoy en la u» (pequeño, mediano, grande y bloqueo) y los avisos. Se
      escribieron sin poder compilar.
- [ ] **[Lucas]** Cuenta demo para App Review con username, un amigo con horario
      y un grupo; anotarlo en `cuenta-demo.md` y en la nota para el revisor.
- [x] **[Lucas]** Publicar `privacidad.html` con las filas de Amigos antes del
      envío (llega a la web con el merge a `main`). Publicada; ver sección 4.
- [ ] **[tras merge]** App Privacy: Amigos no agrega tipos de dato; revisar las
      filas actualizadas en `privacidad.md` (Name, Other User Content, User ID).
- [x] **[código]** Universal Links (#663): #1188, mergeada. El 26-nov el
      archivo de asociación publicado en gradehub.cl cubre Inicio, `?profe=`,
      `?dar-clases` y `?amigo=`.
- [ ] **[Lucas]** Probar en un iPhone con TestFlight que `?amigo=` y `?profe=`
      abren la app desde Mensajes y Mail, y que antes de iniciar sesión no
      salen peticiones a Google Analytics ni a PostHog.
- Segunda versión (decidido por Lucas, 2026-11-20): Amigos parte solo dentro de
  la misma universidad. Lo único entre universidades que vale la pena es un
  calendario de pruebas en un grupo para ver cuándo pueden juntarse; turno y
  almorzar entre U se descartaron.

## Notas

- GitHub Actions volvió a correr: el 26-nov los checks de los PR y el deploy
  pasan normal. (El 13-nov los minutos de la organización estaban al 100 %.)
- La app nunca ha escrito en `errores_app` (0 filas con plataforma `app` al
  26-nov). El código está cubierto por `tests/errores-app.test.js`, pero falta
  forzar un error con una cuenta de prueba en TestFlight para confirmar que el
  reporte llega antes de tener usuarios ahí.
- Nada de este checklist toca `main`, App Store Connect ni Supabase por sí solo.

## 6. Google Play (Android)

La ficha, el cuestionario y la seguridad de los datos para Play Console no están
en el repo: viven en `~/code/gradehub-android/play-store/FICHA.md`, en el Mac de
Martín (puesta al día el 26-nov para la versión Capacitor y Amigos).

- [x] **[código]** `android/` con Capacitor, versionCode 2 (#1251, #1254, #1309).
- [ ] **[Martín]** Subir `app-release.aab` (versionCode 2, del 24-nov) a
      Producción. Sigue vigente mientras no entre nada nativo de Android: la app
      carga gradehub.cl en vivo.
- [ ] **[Martín]** Volver a pegar en Play Console lo que cambió en `FICHA.md`:
      instrucciones al revisor, cuestionario de contenido (ahora hay Amigos) y
      seguridad de los datos (PostHog, fotos de profesores, Amigos).
- [ ] **[Martín/Lucas]** Cuenta de prueba para Google con username, un amigo con
      horario y un grupo (la misma receta de `cuenta-demo.md`).
- [ ] **[Martín/Lucas]** Probar en un teléfono Android real: actualizar encima
      del TWA, entrar con Google, los avisos de evaluaciones y qué muestra sin
      internet. Hasta ahora solo se probó en el emulador.
- [ ] **[código]** `AndroidManifest.xml` no declara los links de gradehub.cl
      (`autoVerify`): `?amigo=` y `?profe=` abren el navegador y no la app.
      Necesita otro `.aab`; puede ir en la versión siguiente.
