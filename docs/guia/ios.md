# La app iOS

> Detalle de [AGENTS.md](../../AGENTS.md). Léelo antes de tocar `ios/`, widgets, la Actividad en Vivo o cualquier cosa solo de la app nativa.

## La app iOS

La app es la misma web metida en Capacitor (`ios/`), más lo nativo: widgets
(`ios/App/GradeHubWidgets/`), Actividad en Vivo (`ios/App/Shared/`) y el puente
`ios/App/App/WidgetsPlugin.swift`. Lo que cambies en `app.js` o `styles.css`
cambia también la app.

**Se trabaja en la rama `ios`**, compartida por Martín y Lucas (acordado el
2026-10-08). Antes de tocar la app, trae lo último: `git switch ios && git pull
--ff-only` (`bin/estado.sh` solo hace `fetch`: avisa que hay algo nuevo, pero no
lo trae). Una tarea de la app sale de `ios` (rama `ms/…` o `li/…`) y vuelve a
`ios` por PR, nunca a `main`. Cada push a `ios` corre los tests y publica la
versión de prueba en https://ios.gradehub.pages.dev; la PR en borrador `ios` →
`main` muestra lo que todavía no llega a gradehub.cl. Si entró algo a `main`,
se trae con `git merge origin/main` estando en `ios` (sin rebase: ver «Una rama
con trabajo de otros adentro ya no se rebasea» en [colaboracion.md](colaboracion.md)).

**Qué tiene que hacer la persona según lo que toques**, y dilo en la PR:

| Cambias | Llega a su iPhone |
|---|---|
| HTML, JS o CSS | solo, con el push a `ios`: la app armada con `npm run ios:rama` lo carga al abrirse |
| Swift, widgets, `Info.plist`, entitlements, plugins, `capacitor.config.json`, ícono o splash | reinstalando: `npm run ios:rama` y ▶︎ en Xcode |

**Lo que es solo de la app** se marca con `html.app-nativa` en CSS (la pone
`index.html` antes de pintar) y con `enAppNativa()` en JS; la web no debe
cambiar. Un enlace externo se abre con `abrirFuera()` (hoja de Safari: un
`target=_blank` no abre nada en la app). Las hojas toman solas la barra de iOS
(`armarBarraDeHoja`): basta con que la última `.modal-btns` traiga el cerrar
como `.btn-cancel` («Cancelar» o «Cerrar») y la acción como `.btn-confirm`. Las
HIG valen igual que en la web.

**Firma.** Nunca commitees un Team ni un Bundle ID. El proyecto los toma de
`ios/App/Firma.xcconfig`; cada uno pone los suyos en `ios/App/Firma.local.xcconfig`,
que git ignora (el ejemplo está en `Firma.xcconfig`). No elijas el Team en
Signing & Capabilities: Xcode lo escribe en `project.pbxproj`, y si ese archivo
aparece modificado sin que lo hayas tocado, no lo subas. Nunca registres
`cl.gradehub.app` ni `group.cl.gradehub.app` con una cuenta personal. Si Xcode
ofrece «Update to recommended settings», es Cancel.

**Compilar y ver:**

```bash
npm run ios:preparar   # mete la web dentro de la app (la que va a la App Store)
npm run ios:rama       # lo mismo, pero la app carga desde ios.gradehub.pages.dev
```

En el simulador, sin firmar (`xcrun simctl list devices available` dice cuáles
hay). El DerivedData va fuera de `~/Desktop`: codesign rechaza los atributos que
pone iCloud («resource fork… detritus not allowed»).

```bash
cd ios/App && xcodebuild -project App.xcodeproj -scheme App -configuration Debug -destination 'platform=iOS Simulator,name=<simulador>' -derivedDataPath /tmp/gradehub-dd CODE_SIGN_IDENTITY=- DEVELOPMENT_TEAM= build
```

Para verla sin iniciar sesión: después de `ios:preparar`, quita el `<script>` de
supabase-js de `ios/App/App/public/index.html` (es generado y no se commitea) y
la app abre en modo local. Al terminar, vuelve a correr `ios:preparar`.

**Tests:** `npm test`, como siempre. Los de la app son `ios-fuera-del-deploy`,
`oauth-nativo`, `pantalla-de-carga`, `app-nativa-ios` y `widgets-resumen`.

## Contrato «Próxima clase» (web y PWA, 2026-11-12)

El horario es privado y opcional en cada ramo activo, dentro del JSON existente:

```js
horario: [{
  id: 'bloque-estable', // identifica el bloque para fusionar ediciones de dispositivos
  dias: ['L', 'W'],    // L M W J V S D; miércoles W, domingo D
  inicio: '08:20', fin: '09:30', sala: 'K201', tipo: 'CLAS'
}]
```

`inicio`/`fin` son horas civiles de `America/Santiago` en formato 24 h `HH:MM`,
con fin posterior a inicio en el mismo día. `sala` y `tipo` son texto libre,
opcionales. No hay reglas de tipo por universidad. Un ramo antiguo sin el campo
sigue sin él. `[]` indica que la persona borró todos sus bloques; omitir el campo
desde una versión anterior no es una orden de borrado. Al importar un bloque sin
ID se deriva uno estable de su contenido. Copiar un bloque en el editor crea un
ID nuevo. El horario viaja también en los respaldos y el historial, pero solo los
ramos del semestre activo alimentan Inicio y los widgets.

La tabla de módulos UC está en `src/data/horarios.js`, con su fuente oficial:
[Registros Académicos, modulación desde 2023-2, página 1](https://registrosacademicos.uc.cl/wp-content/uploads/2023/05/Estructura-de-modulacion-horaria-desde-2023-22.pdf).
`horarioDesdeModulos(tenant, dias, modulos, {sala,tipo})` convierte únicamente
módulos conocidos: no inventa horas para otro tenant o módulo ni rellena los
recreos entre módulos. `proponerHorarioDesdeCatalogo({tenant,sigla,seccion})`
devuelve hoy `null`: es el punto de entrada para el futuro catálogo de secciones,
sin consulta ni escritura actuales. Toda propuesta futura debe pasar por la
confirmación de la persona. El OCR actual sigue agregando ramos/secciones; aún no
reconstruye con suficiente certeza qué días/módulos/salas pertenecen a cada ramo.

### Payload aditivo, versión 1

`resumenParaWidgets(ahora)` añade al resumen existente el resultado de
`resumenHorarioClases(ramos, ahora)`, la misma función pura que usa la tarjeta de
Inicio. Ejemplo sintético, generado un lunes a las 08:30 de Chile:

```json
{
  "version": 1,
  "actualizado": "2026-11-09T11:30:00.000Z",
  "zonaHoraria": "America/Santiago",
  "fechaHoy": "2026-11-09",
  "clasesHoy": [
    {
      "id": "ramo-sintetico:bloque-estable:2026-11-09",
      "ramoId": "ramo-sintetico",
      "ramo": "Curso sintético",
      "sigla": "SYN100",
      "fecha": "2026-11-09",
      "inicio": "08:20",
      "fin": "09:30",
      "inicioAt": "2026-11-09T11:20:00.000Z",
      "finAt": "2026-11-09T12:30:00.000Z",
      "sala": "K201",
      "tipo": "CLAS",
      "enlace": "cl.gradehub.app://ramo/ramo-sintetico"
    }
  ],
  "proximaClase": {
    "id": "ramo-sintetico:bloque-estable:2026-11-09",
    "ramoId": "ramo-sintetico",
    "ramo": "Curso sintético",
    "sigla": "SYN100",
    "fecha": "2026-11-09",
    "inicio": "08:20",
    "fin": "09:30",
    "inicioAt": "2026-11-09T11:20:00.000Z",
    "finAt": "2026-11-09T12:30:00.000Z",
    "sala": "K201",
    "tipo": "CLAS",
    "enlace": "cl.gradehub.app://ramo/ramo-sintetico"
  },
  "clasesProximas": [
    {
      "id": "ramo-sintetico:bloque-estable:2026-11-09",
      "ramoId": "ramo-sintetico",
      "ramo": "Curso sintético",
      "sigla": "SYN100",
      "fecha": "2026-11-09",
      "inicio": "08:20",
      "fin": "09:30",
      "inicioAt": "2026-11-09T11:20:00.000Z",
      "finAt": "2026-11-09T12:30:00.000Z",
      "sala": "K201",
      "tipo": "CLAS",
      "enlace": "cl.gradehub.app://ramo/ramo-sintetico"
    }
  ]
}
```

Los tres campos de clases están siempre presentes; las listas vacías son `[]` y
la próxima desconocida es `null`. `sigla`, `sala` y `tipo` pueden ser `null`;
no se deduce una sala a partir de la universidad. No incluyen notas, nombres de
personas ni promedios. `id` identifica una ocurrencia (ramo, bloque, fecha).

- `clasesHoy`: todas las clases de la fecha chilena de generación, incluso las
  terminadas, ordenadas por inicio, fin y ramo. Inicio muestra solo las que no
  terminaron y oculta la tarjeta si no queda ninguna.
- `proximaClase`: prioriza una clase en curso (`inicioAt <= ahora < finAt`);
  en otro caso, la primera futura. Puede ser de otro día. En empates se elige la
  primera según el orden anterior; las clases simultáneas también permanecen en
  las listas. El fin exacto ya no es «en curso».
- `clasesProximas`: clases que aún no terminan, desde hoy hasta **los próximos
  siete días de calendario chileno, inclusive**. Incluye la clase de dentro de
  una semana aunque hoy ya haya terminado; no repite clases del historial.
- `inicioAt`/`finAt`: ISO 8601 absolutos en UTC, calculados en la app con el
  cambio de hora de Chile. Usarlos para las entradas del timeline. No interpretar
  `HH:MM` usando la zona del teléfono. Una hora civil inexistente al adelantar el
  reloj se omite, sin mover la clase; una hora repetida usa su primera ocurrencia.

No se sube `WIDGETS_VERSION`: el decodificador Swift existente exige `version==1`
y sus `Decodable` ignoran las claves nuevas. Los cuatro widgets actuales siguen
funcionando sin recompilar. El nuevo widget **todavía requiere trabajo Swift en
la rama `ios`**, su decodificador de estos campos, familia/diseño y un timeline
con entradas en los inicios, fines y cambios de fecha. Para avanzar sin abrir la
app debe consumir `clasesProximas`, no quedarse mostrando `proximaClase` de la
instantánea. Al agotar el horizonte, mostrar sin datos recientes y pedir una
recarga; no repetir una semana indefinidamente. Las horas no son eventos Canvas,
no incorporan feriados, vacaciones ni suspensiones puntuales.

El enlace ya lo abre `abrirEnlaceWidget`; si se borró el ramo lleva a Inicio.
Aplicar privacidad a nombres de ramos y salas en pantalla bloqueada como a las
notas de los widgets actuales. Una Live Activity es otra implementación futura:
esta PR no inicia actividades ni modifica el puente o Swift.

HIG: [Widgets](https://developer.apple.com/design/human-interface-guidelines/widgets)
y [Layout](https://developer.apple.com/design/human-interface-guidelines/layout):
contenido oportuno y breve, jerarquía de próxima clase, enlace al ramo,
controles de 44 puntos y adaptación al tamaño de texto/pantalla.

## Entrar con Apple

La web usa `signInWithOAuth({provider:'apple'})`. La app usa el plugin propio
`AppleSignInPlugin.swift` (AuthenticationServices) y `signInWithIdToken`: JS crea
un nonce aleatorio de 256 bits, manda su SHA-256 a Apple y su valor original a
Supabase. No se guarda el nonce, el identity token ni el código de autorización.
Se debe **reinstalar** el binario: una actualización de la web no agrega el plugin.

El entitlement de App es `com.apple.developer.applesignin = [Default]`; no se
agrega al widget. La firma sigue en `Firma.xcconfig`/`Firma.local.xcconfig`, sin
Team ni Bundle ID escrito en `project.pbxproj`.

Antes del merge, Lucas configura con el equipo Apple Developer de la SpA:

1. Sign in with Apple en el App ID de `cl.gradehub.app` y su provisioning profile.
2. Un **Services ID para la web**, asociado al mismo App ID/grupo de Sign in with
   Apple; dominio `gradehub.cl` y retorno de Apple al callback HTTPS de Supabase
   (`https://lsulsnswzesyekpsvlql.supabase.co/auth/v1/callback`). Así web y nativo
   representan el mismo servicio; comprobar la misma cuenta en ambos.
3. Proveedor Apple en Supabase Auth: **Client IDs** de la app (`cl.gradehub.app`)
   y del Services ID web. Configurar el secreto web generado con Team ID, Key ID
   y la clave `.p8`, exclusivamente en Apple/Supabase: nunca en JS ni git.
   Mantener también el retorno de la app web en la lista de redirect URLs.
4. **Lucas renueva el secreto web antes de seis meses** (puede delegar su ejecución
   a Martín), registra vencimiento y verifica el login web tras renovarlo. La
   clave `.p8` y el JWT de secreto no son lo mismo: la firma genera un JWT nuevo.
   No se programó una renovación automática ni se cambiaron credenciales aquí.

Antes de abrir Apple se consulta el endpoint público `/auth/v1/settings`, sin
sesión ni datos personales. Si el proveedor está apagado o no se puede consultar,
la pantalla conserva sus otros métodos y explica el error en español. Esto no
comprueba una clave web vencida ni la configuración del equipo: hay que probarlas.

### Cuentas existentes y siguientes PRs

El correo verificado compartido puede vincular identidades automáticamente en
Supabase; elegir relay puede crear otra cuenta. Nunca se unen cuentas desde el
cliente. Antes de entrar con Apple se aplica el aislamiento de caché existente:
se aparta la copia bajo su dueño original y no se importa a la cuenta nueva.
Volver al dueño permite restaurarla. El nombre recibido por el plugin solo se
manda a `updateUser` si falta `full_name`.

El aviso de cuenta nueva requiere relay, señales de otro acceso y creación dentro
del intento Apple con primer acceso próximo. Supabase no entrega `is_new_user` en
este flujo: se contrastan `created_at`, `last_sign_in_at` y el inicio guardado en
esta pestaña (máximo 15 minutos). No se infiere creación por tener cero ramos.
Sin contexto/fechas fiables no se muestra; un reloj local adelantado puede
suprimirlo. Esta detección solo decide un aviso: **nunca** permisos ni mezcla de
cuentas. Falta validarla con la respuesta real de Apple/Supabase en iPhone.

**No está listo para App Store sin resolver el borrado Apple.** La guía de
[eliminación de cuenta de Apple](https://developer.apple.com/support/offering-account-deletion-in-your-app/)
exige revocar autorización al borrar. Borrar Auth o cerrar sesión no llama por sí
solo a `https://appleid.apple.com/auth/revoke`. Ese endpoint requiere access o
refresh token de **Apple** y un secreto del servidor; el JWT de Supabase y el
identity token de Apple no sirven como sustitutos.

Recomendación para otra PR: intercambiar el authorization code en el servidor
al autorizar, conservar cifrado el refresh token de Apple por dueño, revocarlo
antes de borrar Auth y limpiar el registro/token con la cuenta. Necesita diseño
de retención, SQL/RLS/FK, servidor y clave de cifrado: fuera de esta PR. Alternativa:
pedir reautorización al borrar y canjear el código entonces, sin guardar refresh
token a largo plazo; debe prever una autorización vencida o una cuenta solo web.
También queda aparte «Vincular Apple» en Ajustes con `linkIdentity`, reautenticación
y resolución explícita de dos cuentas con notas: nunca fusionarlas por correo.

Referencias: [Supabase — Apple](https://supabase.com/docs/guides/auth/social-sign-in/auth-apple),
[HIG — Sign in with Apple](https://developer.apple.com/design/human-interface-guidelines/sign-in-with-apple),
[revocación REST](https://developer.apple.com/documentation/signinwithapplerestapi/revoke-tokens).
