# Checklist hasta TestFlight y App Store — BORRADOR

> **BORRADOR para revisión.** Escrito el 13-nov-2026 (Hark, #1117); rescatado y
> puesto al día el 15-nov en `ios`. Marca quién hace cada
> paso: **[Lucas]** = requiere su cuenta de Apple Developer / Supabase / Xcode;
> **[tras merge]** = queda listo con este PR y solo hay que copiarlo a App Store
> Connect; **[código]** = falta un cambio en el repo.

Datos fijos: Team ID **PH6XQV8L2M** (GradeHub SpA) · bundle **cl.gradehub.app**
(widget `cl.gradehub.app.widgets`) · App Group **group.cl.gradehub.app.shared**
· Services ID web **cl.gradehub.web** · App Store Connect Apple ID **6834207639**
· versión **1.0**, build **1**.

## 1. Antes del primer build

- [x] App Group `group.cl.gradehub.app.shared` registrado y asignado a los dos
      App ID (hecho por Lucas, 13-nov, issue #1116).
- [x] El repo usa `group.cl.gradehub.app.shared` (#1111, mergeada en `ios`).
- [x] `ITSAppUsesNonExemptEncryption = NO` en `ios/App/App/Info.plist` (#1127).
- [x] Solo iPhone: `TARGETED_DEVICE_FAMILY = 1` (#1131).
- [x] **[código]** Entrar con Apple (guideline 4.8): #1112, y revocar con Apple al borrar la cuenta: #1133.
- [ ] **[Lucas]** Developer → Certificates, IDs & Profiles → **Keys** → crear una
      key con **Sign in with Apple** habilitado, asociada al App ID primario
      `cl.gradehub.app`. Descargar el `.p8` (se baja una sola vez) y anotar el Key ID.
- [ ] **[Lucas]** Developer → Identifiers: App ID `cl.gradehub.app` con la
      capability **Sign in with Apple**; Services ID `cl.gradehub.web`
      configurado con el dominio `gradehub.cl` y el return URL de Supabase
      (`https://<proyecto>.supabase.co/auth/v1/callback`).
- [ ] **[Lucas]** Supabase → Authentication → Providers → **Apple**: activar,
      Client IDs `cl.gradehub.web` (web) y `cl.gradehub.app` (nativo), Team ID
      `PH6XQV8L2M`, Key ID y el contenido del `.p8` para generar el secret.
      (Recordatorio: el secret de Apple vence cada 6 meses; agendar renovación.)
- [ ] **[Lucas]** Probar en el simulador/dispositivo: login con correo, Google
      y Apple; widgets leen el App Group nuevo.

## 2. Build 1.0 (1) a TestFlight

- [x] **[Lucas]** `git pull` en `ios` → `npm ci` → `npm run ios:preparar` (build 1.0 (1), 15-nov).
- [ ] **[Lucas]** Xcode → target App y GradeHubWidgets: firma automática con el
      Team PH6XQV8L2M (sin commitear el Team; ver `docs/guia/ios.md`), Product →
      **Archive** con esquema App, destino «Any iOS Device».
- [x] **[Lucas]** Organizer → Distribute App → App Store Connect → Upload.
- [ ] **[Lucas]** Esperar el procesamiento; con `ITSAppUsesNonExemptEncryption`
      no debería preguntar por cifrado.
- [x] **[Lucas]** TestFlight → grupo interno (Lucas, Martín) → probar.

## 3. TestFlight externo

- [ ] **[tras merge]** Test Information: copiar de `docs/app-store/testflight.md`.
- [ ] **[Lucas]** Crear la cuenta demo en producción según el plan de
      `testflight.md` y pegar usuario/contraseña solo en App Store Connect.
- [ ] **[Lucas]** Grupo externo → agregar build → enviar a Beta App Review.

## 4. Ficha y envío a App Review

- [ ] **[tras merge]** App Information: nombre, subtítulo, categoría Educación,
      URL de privacidad (`ficha.md`).
- [ ] **[tras merge]** Versión 1.0: texto promocional, descripción, palabras
      clave, URLs de soporte y marketing, notas al revisor (`ficha.md`, en inglés).
- [x] **[código]** En la app no se compran campañas (3.1.1): #1161.
- [ ] **[código]** Interruptor «Usar mis notas para elegir anuncios» (5.1.2 / 2.5.18): #1163.
- [ ] **[código]** Versión B lista por si rechazan por 2.5.18: anuncios sin notas en la app (PR en borrador).
- [ ] **[tras merge]** App Privacy: cargar las etiquetas de `privacidad.md`
      (tracking: No) — después de cerrar sus puntos «Verificar».
- [ ] **[tras merge]** Age Rating: cuestionario según `age-rating.md`.
- [ ] **[Lucas]** Decidir si se fuerza 13+ (ver `age-rating.md`).
- [x] **[código]** «Denunciar o bloquear» en anuncios, perfiles y opiniones (guideline 1.2): #1137.
- [x] **[código]** Ajustes a `privacidad.html` para iOS: #1191; auditoría de
      Canvas, MCP y Apple en `privacidad.md` (PR pendiente).
- [ ] **[Lucas, tras merge #1191]** Comprobar política publicada y cerrar las
      verificaciones de producción pendientes en `privacidad.md` antes de App Privacy.
- [ ] **[Lucas]** Capturas de 6,9". Sin iPad: la app parte solo en iPhone (#1131).
- [ ] **[Lucas]** Precio: gratis. **Disponibilidad: todos los países menos los
      27 de la Unión Europea** (decisión de Lucas; evita las obligaciones de
      «trader» de la DSA). Revisar también que no quede marcado ningún país de la
      UE al agregar regiones nuevas.
- [ ] **[Lucas]** App Review Information: contacto (Lucas Irarrázaval;
      teléfono y correo solo en App Store Connect) y cuenta demo.
- [ ] **[Lucas]** Enviar a revisión; publicación manual recomendada para la 1.0.

## Notas

- Los minutos de GitHub Actions de la organización están al 100 % hasta el
  1-dic-2026: los checks de los PR pueden fallar por eso, no por el código.
  Correr `npm test` en local.
- Nada de este checklist toca `main`, App Store Connect ni Supabase por sí solo.
