# TestFlight — BORRADOR

> **BORRADOR para revisión.** Textos para App Store Connect → TestFlight →
> Test Information (beta externa). Nada está cargado todavía. La cuenta demo
> **no está creada**: abajo solo está el plan; no hay contraseñas en el repo.

## Test Information

**Beta App Description** (lo que ven los testers externos, máx. 4000):

```
GradeHub para iPhone: tus ramos, notas y promedio ponderado, con la nota que necesitas en lo que queda del semestre. Es la misma GradeHub de gradehub.cl, ahora como app con widgets y avisos antes de cada evaluación. Si ya usas la web, entra con la misma cuenta y tus ramos aparecen solos.
```

**What to Test** (por build; borrador para la build 1.0 (1)):

```
Gracias por probar la primera versión de GradeHub para iPhone. Nos sirve mucho que revises:
1. Entrar con tu cuenta (correo o Google) y que aparezcan tus ramos de la web.
2. Agregar un ramo, anotar notas y ver el promedio y "cuánto necesito".
3. Agregar los widgets (Próxima evaluación, Promedio general, Pendientes, Estadísticas) y ver que se actualicen al cambiar una nota.
4. Activar los avisos de una evaluación con hora y la Actividad en Vivo.
5. Suscribir tus evaluaciones a Calendario o Google Calendar desde Ajustes.
6. Modo oscuro, textos grandes y usar la app sin internet.
Si algo se ve raro o se cae, manda una captura desde TestFlight (saca un pantallazo dentro de la app) o escríbenos.
```

**Feedback Email:** `gradehub.app@gmail.com`

**Marketing URL:** `https://gradehub.cl`
**Privacy Policy URL:** `https://gradehub.cl/privacidad.html`

## Información de contacto para Beta App Review

| Campo | Valor |
| --- | --- |
| Nombre | Lucas Irarrázaval |
| Teléfono | +56 9 3427 7382 |
| Correo | `gradehub.app@gmail.com` *(propuesto)* |

> `admin@gradehub.cl` no aparece en ninguna parte del repo ni en gradehub.cl.
> Usarlo solo si ese buzón existe y alguien lo lee; si no, dejar
> `gradehub.app@gmail.com`, que es el correo público de la política y los términos.

## Cuenta demo para el revisor de Apple (plan; NO crearla en este PR)

Apple pide una cuenta con acceso completo (Sign-In Information) cuando la app
tiene login. En el código no encontré un botón para usar la app sin cuenta en la
pantalla de acceso (`src/app-session/pantalla-acceso.js`), así que la cuenta demo
es necesaria.

**Quién la crea:** Lucas, a mano en producción, cuando el build esté listo.
**Usuario sugerido:** un correo del dominio propio o un alias tipo
`gradehub.app+applereview@gmail.com` (confirmar que los alias `+` llegan).
**Contraseña:** se genera al crearla y va **solo** en App Store Connect, nunca en el repo.
**Método:** correo y contraseña (el revisor no puede entrar con una cuenta Google ajena).
Si la cuenta tiene MFA activado, desactivarlo para esta cuenta.

**Datos sintéticos que debería tener** (sin datos de estudiantes reales):

- Perfil: universidad UC, carrera Ingeniería, generación 2025, nombre «Revisor Apple».
- Semestre en curso con 4–5 ramos con pauta precargada del catálogo UC
  (p. ej. un Cálculo, una Física, un Programación y un ramo armado a mano).
- En cada ramo: algunas notas puestas y evaluaciones pendientes **con fecha y
  hora** en los próximos días, para que se vean la Agenda, "cuánto necesito",
  los widgets y los avisos/Actividad en Vivo.
- Un ramo con meta configurada para que el simulador muestre la nota necesaria.
- Un semestre anterior archivado, para que Estadísticas e historial tengan datos.
- Sin calificaciones a profesores, sin respuestas a encuestas y sin profes
  particulares vinculados (no mezclar datos de terceros).
- No usar la cuenta para clases particulares/ads (no debe cobrar impresiones a
  profesores reales: revisar si las impresiones de esta cuenta cuentan en
  `anuncio_interacciones` y, si cuentan, excluirla o avisar en las notas).

**Texto para "Notes" de Sign-In Information:**

```
Cuenta demo con datos ficticios (correo y contraseña). Para borrar una cuenta: Ajustes → Datos y cuenta → Eliminar mi cuenta (por favor no borren esta, es la cuenta de revisión; si lo prueban, avísennos y la recreamos).
```

## Export compliance

Este PR agrega `ITSAppUsesNonExemptEncryption = NO` al `Info.plist` de la app:
GradeHub solo usa el cifrado del sistema (HTTPS/TLS), que está exento. Con eso
App Store Connect no pregunta por cifrado en cada build.
