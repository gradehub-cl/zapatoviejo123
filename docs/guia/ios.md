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
