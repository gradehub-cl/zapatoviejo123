# Checklist hasta TestFlight y App Store — BORRADOR

> **BORRADOR para revisión.** Estado al 13-nov-2026. Marca quién hace cada
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
- [ ] **[tras merge]** Este PR: el repo usa `group.cl.gradehub.app.shared`
      (cierra #1116). *Ojo: #1111 hace el mismo cambio; mergear uno y cerrar el otro.*
- [ ] **[tras merge]** `ITSAppUsesNonExemptEncryption = NO` en `ios/App/App/Info.plist`.
- [ ] **[código]** Entrar con Apple: la app ofrece «Continuar con Google»
      (`src/app-session/oauth-y-recuperacion.js`), así que la guideline 4.8 pide
      una opción equivalente (Sign in with Apple). Está en el PR borrador
      **#1112**; hoy `App.entitlements` en `main` no tiene
      `com.apple.developer.applesignin`. Debe estar mergeado antes de App Review
      (para TestFlight externo es muy recomendable).
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

- [ ] **[Lucas]** `git pull` en `main` ya mergeado → `npm ci` → `npm run ios:preparar`.
- [ ] **[Lucas]** Xcode → target App y GradeHubWidgets: firma automática con el
      Team PH6XQV8L2M (sin commitear el Team; ver `docs/guia/ios.md`), Product →
      **Archive** con esquema App, destino «Any iOS Device».
- [ ] **[Lucas]** Organizer → Distribute App → App Store Connect → Upload.
- [ ] **[Lucas]** Esperar el procesamiento; con `ITSAppUsesNonExemptEncryption`
      no debería preguntar por cifrado.
- [ ] **[Lucas]** TestFlight → grupo interno (Lucas, Martín) → probar.

## 3. TestFlight externo

- [ ] **[tras merge]** Test Information: copiar de `docs/app-store/testflight.md`.
- [ ] **[Lucas]** Crear la cuenta demo en producción según el plan de
      `testflight.md` y pegar usuario/contraseña solo en App Store Connect.
- [ ] **[Lucas]** Grupo externo → agregar build → enviar a Beta App Review.

## 4. Ficha y envío a App Review

- [ ] **[tras merge]** App Information: nombre, subtítulo, categoría Educación,
      URL de privacidad (`ficha.md`).
- [ ] **[tras merge]** Versión 1.0: texto promocional, descripción, palabras
      clave, URLs de soporte y marketing, notas al revisor (`ficha.md`).
- [ ] **[tras merge]** App Privacy: cargar las etiquetas de `privacidad.md`
      (tracking: No) — después de cerrar sus puntos «Verificar».
- [ ] **[tras merge]** Age Rating: cuestionario según `age-rating.md`.
- [ ] **[Lucas]** Decidir si se fuerza 13+ (ver `age-rating.md`).
- [ ] **[código]** Botón «Reportar» en avisos/perfiles de profesores (guideline
      1.2) si se declara contenido de usuarios.
- [ ] **[código]** Ajustes a `privacidad.html` para iOS (ver `privacidad.md` §1).
- [ ] **[Lucas]** Capturas de 6,9" (y iPad si la app queda disponible en iPad:
      `TARGETED_DEVICE_FAMILY = "1,2"` en `project.pbxproj`, así que
      Apple pedirá capturas de iPad de 13" salvo que se limite a iPhone).
- [ ] **[Lucas]** Precio: gratis. **Disponibilidad: todos los países menos los
      27 de la Unión Europea** (decisión de Lucas; evita las obligaciones de
      «trader» de la DSA). Revisar también que no quede marcado ningún país de la
      UE al agregar regiones nuevas.
- [ ] **[Lucas]** App Review Information: contacto (Lucas Irarrázaval,
      +56 9 3427 7382, correo — ver nota en `testflight.md`) y cuenta demo.
- [ ] **[Lucas]** Enviar a revisión; publicación manual recomendada para la 1.0.

## Notas

- Los minutos de GitHub Actions de la organización están al 100 % hasta el
  1-dic-2026: los checks de los PR pueden fallar por eso, no por el código.
  Correr `npm test` en local.
- Nada de este checklist toca `main`, App Store Connect ni Supabase por sí solo.
