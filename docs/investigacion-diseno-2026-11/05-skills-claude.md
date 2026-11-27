# Skills de diseño para Claude, aplicados a GradeHub

Investigación de noviembre de 2026. Fuentes primarias abiertas durante la
investigación (docs de Claude Code, especificación Agent Skills, repositorios
de Anthropic y de la comunidad, docs de cada MCP); lista completa al final.
Sin datos personales: los ejemplos usan ramos y notas ficticias.

> **Entregables listos para copiar al repo** (carpeta `skills/` junto a este archivo):
>
> | Skill | Archivos | Para qué |
> |---|---|---|
> | `gradehub-design-system` | `SKILL.md` + `references/patrones-codigo.md` + `references/textos-es-cl.md` | Reglas de diseño: tokens, tipografía, semáforo, componentes, es-CL con coma, plurales, estados con timeout, toasts con deshacer, accesibilidad |
> | `gradehub-ux-review` | `SKILL.md` + `scripts/capturas.cjs` + `references/simular-estados.md` | QA visual con Playwright a 390 y 1280 px, claro/oscuro, texto grande, app nativa; mediciones automáticas e informe P0–P3 |
> | `gradehub-dashboard` | `SKILL.md` | Cómo diseñar Inicio, ficha, "Necesitas X" y Estadísticas: jerarquía, qué gráfico para qué pregunta, estados de datos |
>
> El script `capturas.cjs` se probó contra una copia del repo (commit `dda6088`) con
> Playwright 1.65 + Chromium: 32 combinaciones capturadas en ~1 min, sin errores
> de consola. Ver §9 para lo que encontró.

---

## 0. Resumen en 12 líneas

1. Un **Agent Skill** es una carpeta con `SKILL.md` (frontmatter YAML + instrucciones) y, opcionalmente, `scripts/`, `references/` y `assets/`. Claude solo ve el nombre y la descripción hasta que lo necesita (*progressive disclosure*).
2. En Claude Code se instalan en `~/.claude/skills/` (personales), `.claude/skills/` del repo (equipo, se commitean) o vía **plugins** (`/plugin install …@marketplace`).
3. Para GradeHub, lo que más rinde **no es un skill genérico de "diseño bonito"**, sino skills propios que codifiquen las reglas que ya existen (Editorial, semáforo, HIG, es-CL) y un ciclo obligatorio de capturas.
4. Los skills genéricos más fuertes (Anthropic `frontend-design`, Impeccable, UI UX Pro Max, Taste, Hallmark) empujan a "dirección estética distintiva" y fuentes nuevas: útiles para **explorar direcciones** o la landing, peligrosos si se aplican sin filtro a la app (que usa fuente del sistema y HIG).
5. Para revisar: `webapp-testing` (Anthropic), **Playwright MCP**, **Chrome DevTools MCP**, Vercel `web-design-guidelines` y el detector de Impeccable (`npx impeccable detect`, sin LLM, sirve en CI).
6. Para pulir movimiento y detalles: skills de Emil Kowalski y `make-interfaces-feel-better`.
7. **Figma MCP** solo si el equipo diseña en Figma; **shadcn MCP** y **21st MCP** no aplican (GradeHub es JS sin framework, sin React ni Tailwind).
8. El flujo que funciona: plan corto con tokens → código → capturas → crítica contra checklist → 2–3 iteraciones → PR con antes/después.
9. "AI slop" en 2026 ya no es solo Inter + gradiente morado: también crema + serif + terracota, negro + verde ácido, kit de tarjetas SaaS idénticas, eyebrows en MAYÚSCULAS, `→` en cada botón.
10. `CLAUDE.md` del repo es un symlink a `AGENTS.md`: está bien. Conviene **sacar el detalle de diseño de `AGENTS.md` a skills** (cargan solo cuando se usan) y dejar en `AGENTS.md` una línea que apunte a ellas.
11. Un **hook** puede volver obligatorio lo que un skill solo sugiere (p. ej., correr el detector o las capturas al editar `styles.css`).
12. Con plan Max el límite real es el uso: capturas y MCPs consumen contexto; itera a 390 px claro y deja la matriz completa para antes de la PR.

---

## 1. Qué es un Agent Skill

### 1.1 Estructura

Según la [especificación Agent Skills](https://agentskills.io/specification) (estándar abierto que sigue Claude Code):

```
mi-skill/
├── SKILL.md        # obligatorio: frontmatter + instrucciones
├── scripts/        # opcional: código que el agente ejecuta (no se carga al contexto)
├── references/     # opcional: documentación que se lee solo si hace falta
└── assets/         # opcional: plantillas, imágenes, datos
```

### 1.2 Frontmatter

Campos del estándar (válidos en Claude Code, claude.ai y la API):

| Campo | Regla |
|---|---|
| `name` | 1–64 caracteres, minúsculas, números y guiones; sin `--`; igual al nombre de la carpeta |
| `description` | 1–1024 caracteres; **qué hace y cuándo usarlo**, con las palabras que la gente diría |
| `license`, `compatibility` (≤ 500), `metadata` (mapa), `allowed-tools` (experimental) | Opcionales |

Extensiones de Claude Code ([docs](https://code.claude.com/docs/en/skills)): `when_to_use`, `argument-hint`, `arguments`, `disable-model-invocation` (solo se invoca con `/nombre`), `user-invocable: false` (solo Claude lo invoca), `allowed-tools`/`disallowed-tools`, `model`, `effort`, `context: fork` + `agent` (corre en un subagente aislado), `hooks`, `paths` (globs que activan el skill), `shell`. Si subes el skill a claude.ai o a la API, **solo** se aceptan los seis campos del estándar; por eso los skills de GradeHub usan solo `name`, `description` y `metadata`.

Detalles prácticos de las docs:
- La descripción (+ `when_to_use`) se corta a **1.536 caracteres** en el listado; pon el caso de uso principal primero.
- El cuerpo se carga una vez y **no se vuelve a leer**: las reglas deben estar escritas como instrucciones permanentes ("en toda la tarea…").
- Tras compactar la conversación, Claude Code re-adjunta los primeros **5.000 tokens** de cada skill invocado (presupuesto total 25.000): **lo más importante, arriba**.
- `SKILL.md` < 500 líneas; el detalle va a archivos referenciados a un nivel de profundidad.
- Variables: `${CLAUDE_SKILL_DIR}` (carpeta del skill, para scripts), `${CLAUDE_PROJECT_DIR}`, `$ARGUMENTS`/`$0`.
- **Inyección dinámica**: una línea ``!`comando` `` se ejecuta antes de que Claude lea el skill y su salida queda en el texto (p. ej. ``!`git diff --name-only origin/main...` ``).

### 1.3 Progressive disclosure (por qué es mejor que pegar todo en AGENTS.md)

| Nivel | Qué se carga | Costo aproximado |
|---|---|---|
| Metadatos | `name` + `description` de **todos** los skills, al iniciar | ~100 tokens por skill |
| Instrucciones | El cuerpo de `SKILL.md`, cuando Claude decide usarlo | < 5.000 tokens recomendado |
| Recursos | `references/`, `scripts/`, `assets/`, solo si hacen falta | Variable; los scripts se ejecutan, no se leen |

Fuente: [agentskills.io/specification](https://agentskills.io/specification), [anthropic.com/engineering/equipping-agents…](https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills). Las docs de Claude Code lo dicen así: un skill es para cuando "una sección de CLAUDE.md creció hasta ser un procedimiento y no un hecho".

### 1.4 Skill vs CLAUDE.md/AGENTS.md vs hook vs subagente vs MCP

| Pieza | Cuándo se usa | Ejemplo en GradeHub |
|---|---|---|
| `AGENTS.md` (y `CLAUDE.md` → symlink) | Hechos que valen en toda sesión, cortos (< 200 líneas) | "Diseño Editorial, fuente del sistema; para UI usa `gradehub-design-system`" |
| Skill | Procedimientos y referencia larga que solo importan a veces | Sistema de diseño, revisión UX, dashboards |
| Hook | Reglas que **deben** cumplirse siempre, sin depender de que Claude se acuerde | Correr el detector/capturas al editar `styles.css` |
| Subagente (`.claude/agents/`) | Un rol con su propio contexto y skills precargados | `ui-reviewer` que solo revisa capturas |
| MCP | Darle a Claude herramientas nuevas (navegador, Figma) | Playwright MCP, Chrome DevTools MCP |

Nota sobre el repo: Claude Code lee `AGENTS.md` directamente desde v2.1.277 si no hay `CLAUDE.md`; con `CLAUDE.md` presente lee solo `CLAUDE.md`. En GradeHub `CLAUDE.md` es un **symlink** a `AGENTS.md`, así que ambos agentes (Codex, Claude, Gemini) leen el mismo texto. Correcto; no cambiarlo.

---

## 2. Dónde se instalan y cómo

| Ubicación | Ruta | Alcance |
|---|---|---|
| Personal | `~/.claude/skills/<nombre>/SKILL.md` | Todos tus proyectos en ese computador (no en sesiones cloud/Cowork) |
| Proyecto | `.claude/skills/<nombre>/SKILL.md` | Todos los que trabajen en el repo (se commitea) |
| Anidado | `<subcarpeta>/.claude/skills/…` | Se carga al trabajar en esa subcarpeta |
| Plugin | `<plugin>/skills/<nombre>/SKILL.md` | Donde el plugin esté activo, como `/plugin:skill` |
| claude.ai | Skills activados en tu cuenta | Se sincronizan a `~/.claude/skills/synced/` y a sesiones cloud/Cowork |
| Enterprise | Directorio de settings administrados | Toda la organización |

Prioridad con nombres repetidos: enterprise > personal > proyecto; los de plugin no chocan (van con prefijo).

**Comandos útiles**

```bash
# Marketplace oficial de skills de ejemplo de Anthropic
/plugin marketplace add anthropics/skills
/plugin install example-skills@anthropic-agent-skills     # incluye frontend-design, webapp-testing, canvas-design, theme-factory…
/plugin install document-skills@anthropic-agent-skills    # pdf, docx, pptx, xlsx

# Marketplace oficial de plugins de Claude Code
/plugin marketplace add anthropics/claude-plugins-official
/plugin install frontend-design@claude-plugins-official
/plugin install skill-creator@claude-plugins-official      # crea y evalúa skills (evals con/sin skill)
/plugin install playground@claude-plugins-official         # "playgrounds" HTML con controles para explorar opciones
/plugin install figma@claude-plugins-official              # MCP + skills de Figma

# CLI de la comunidad (agentskills / skills.sh)
npx skills add <dueño>/<repo>[@skill]      # p. ej. npx skills add vercel-labs/agent-skills@web-design-guidelines
npx skills list

# Dentro de una sesión
/skills            # ver qué skills hay y de dónde vienen
/reload-skills     # si uno nuevo no aparece
/skill-doctor      # costo en contexto y uso de cada skill
claude plugin validate .claude/skills       # valida el YAML de los SKILL.md
```

**Seguridad**: un skill puede traer scripts y `allowed-tools` (permisos sin preguntar). Lee el `SKILL.md` y los scripts antes de instalar uno de terceros. Ejemplo concreto: el modo `live` de Impeccable, si no hay agente escuchando, ejecuta `codex`/`claude` **con aprobaciones y sandbox apagados** (lo dice su README); no lo uses en un repo con secretos.

---

## 3. Catálogo de skills para diseño

Leyenda de aplicabilidad a GradeHub (JS sin framework, `styles.css` único, fuente del sistema, HIG obligatorias):
**●●●** úsalo · **●●○** útil con filtro · **●○○** solo para tareas puntuales · **○○○** no aplica.

### 3.1 Oficiales de Anthropic ([github.com/anthropics/skills](https://github.com/anthropics/skills))

| Skill | Qué hace | GradeHub |
|---|---|---|
| [`frontend-design`](https://github.com/anthropics/skills/tree/main/skills/frontend-design) (también como [plugin oficial](https://github.com/anthropics/claude-plugins-official/tree/main/plugins/frontend-design)) | Actúa como "design lead": aterriza el diseño en el tema del producto, pide un plan de tokens (4–6 colores con hex, tipografía, layout con wireframes ASCII), lo revisa contra el brief antes de codear, y lista los rasgos típicos de diseño generado por IA a evitar. Insiste en restricción ("gasta la audacia en un solo lugar"), accesibilidad base y autocrítica con capturas. Muy buena guía de textos de interfaz. | **●●○** Excelente para explorar direcciones nuevas, la landing y piezas de marketing. En la app, su consejo de "elegir tipografías distintivas" choca con la regla de fuente del sistema: usa su proceso (plan → revisión → crítica) y sus anti-patrones, no su libertad tipográfica. |
| [`webapp-testing`](https://github.com/anthropics/skills/tree/main/skills/webapp-testing) | Probar apps locales con scripts Python de Playwright: `with_server.py` levanta el servidor, patrón "reconocer → actuar", capturas y logs de consola. | **●●●** Complementa a `gradehub-ux-review` (que usa Node, como `tests/browser/`). |
| [`web-artifacts-builder`](https://github.com/anthropics/skills/tree/main/skills/web-artifacts-builder) | Artefactos de claude.ai con React 18 + Tailwind + shadcn/ui empaquetados en un HTML. Su regla de estilo: evitar layouts centrados en exceso, gradientes morados, radios uniformes e Inter. | **●○○** Solo para prototipos/maquetas en claude.ai; no para el repo. |
| [`canvas-design`](https://github.com/anthropics/skills/tree/main/skills/canvas-design) | Crea una "filosofía visual" (.md) y la expresa en PNG/PDF: pósters, piezas estáticas. | **●○○** Imágenes OG, pósters para campañas universitarias. |
| [`theme-factory`](https://github.com/anthropics/skills/tree/main/skills/theme-factory) | 10 temas predefinidos (colores + fuentes) para slides, docs, landings; genera temas nuevos. | **●○○** Presentaciones y documentos (pitch, reportes), no la app. |
| [`brand-guidelines`](https://github.com/anthropics/skills/tree/main/skills/brand-guidelines) | Aplica la marca **de Anthropic** (colores, Poppins/Lora). | **○○○** Úsalo como **plantilla** para un `gradehub-brand` propio (marketing). |
| [`algorithmic-art`](https://github.com/anthropics/skills/tree/main/skills/algorithmic-art) | Arte generativo con p5.js. | ○○○ |
| [`skill-creator`](https://github.com/anthropics/skills/tree/main/skills/skill-creator) / [plugin](https://github.com/anthropics/claude-plugins-official/tree/main/plugins/skill-creator) | Crea skills y los **evalúa**: casos en `evals/evals.json`, corridas con y sin skill, benchmark, A/B ciego entre versiones, ajuste de la descripción para que se active cuando debe. | **●●●** Para mejorar los 3 skills de GradeHub con evidencia. |
| [`playground`](https://github.com/anthropics/claude-plugins-official/tree/main/plugins/playground) (plugin) | Genera un HTML con controles + vista previa + prompt copiable para explorar opciones visuales. | **●●○** Afinar tokens (radios, grises del modo oscuro) viendo el resultado. |
| [`theme-examples`](https://github.com/anthropics/claude-plugins-official/tree/main/plugins/theme-examples) (plugin) | Fondos para la ventana de Claude Code desktop. | ○○○ (no es diseño de producto) |

### 3.2 Comunidad: dirección visual y anti-"slop"

| Skill | Qué hace | Instalación | GradeHub |
|---|---|---|---|
| [Impeccable](https://github.com/pbakaus/impeccable) · [impeccable.style](https://impeccable.style) | Vocabulario de 24 comandos: dirigir (`bolder`, `quieter`, `distill`, `colorize`, `typeset`, `layout`, `animate`), revisar (`critique` con heurísticas, `audit` P0–P3 de a11y/rendimiento/tema/responsive), terminar (`polish`, `harden` errores/i18n/overflow, `clarify` textos, `adapt`, `optimize`, `onboard` estados vacíos), planificar (`shape`, `init` → `PRODUCT.md`, `document` → `DESIGN.md`, `extract`). **Detector** de 62 reglas deterministas, sin LLM, con salida SARIF/GitHub para CI. | `npx impeccable install` → `/impeccable init` | **●●○** El detector y `harden`/`clarify`/`audit` son muy útiles. Configura excepciones (la regla de fuentes no aplica: GradeHub no carga fuentes). |
| [UI UX Pro Max](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) | Base de datos local consultada por script: ~80 estilos, ~190 paletas por tipo de producto, pares tipográficos, ~120 guías UX, tipos de gráfico, para 20+ stacks. | `/plugin marketplace add nextlevelbuilder/ui-ux-pro-max-skill` → `/plugin install ui-ux-pro-max@ui-ux-pro-max-skill` | **●○○** Para lluvia de ideas de dirección. Sus recetas de estilo tienden a lo genérico; no lo dejes decidir la app. |
| [Taste Skill](https://github.com/Leonxlnx/taste-skill) | Sitios "de nivel empresa": un sistema de diseño, copia sobria, fotos reales con crédito; variantes (soft, minimalist, brutalist…). Requiere Node 22+ y Chrome. | `/plugin marketplace add Leonxlnx/taste-skill` → `/plugin install taste-skill@taste-skill` | **●○○** Landing/marketing. |
| [Hallmark](https://github.com/nutlope/hallmark) (Together AI) | 50 "materiales" de tema, construye la página según su tarea, y **verifica en navegador real** contra rasgos de IA en niveles: *Floor* (contraste, foco, movimiento reducido, datos inventados, móvil roto), *Reflex*, *Finish*. `/hallmark audit <ruta>` solo reporta. | ver README | **●●○** `audit` como segunda opinión; el *Floor* coincide con nuestras reglas. |
| [StyleSeed](https://github.com/bitjaru/styleseed) | Compila reglas de diseño del proyecto y aplica un ciclo **render → puntaje → revisión** (miden +5,3 puntos en su benchmark). | `npx -y skills add bitjaru/styleseed -a claude-code -y --copy` | **●○○** Interesante como idea; nuestro `gradehub-ux-review` hace ese ciclo con reglas propias. |
| [Claude Code Frontend Skills](https://github.com/JaimeJunr/claude-code-frontend-skills) | Un marketplace que junta frontend-design, Impeccable, UI UX Pro Max, Taste, Hallmark y Emil Kowalski, con un "router" y reglas para cuando se contradicen; agentes `design-director` y `ui-reviewer`. | ver README | **●○○** Útil para ver cómo resolvieron conflictos entre packs; demasiado para el repo. |
| [Google Stitch skills](https://github.com/google-labs-code/stitch-skills) | Skills/plugins para diseñar con Google Stitch y pasar a código. | ver README | ○○○ salvo que usen Stitch. |

### 3.3 Comunidad: detalle, movimiento y revisión

| Skill | Qué hace | Instalación | GradeHub |
|---|---|---|---|
| [Emil Kowalski — skills](https://github.com/emilkowalski/skill) · [aiforui.dev/skills](https://aiforui.dev/skills) | Errores típicos de agentes en animación y UI (p. ej. `ease-in` en entradas) y cómo corregirlos; basados en experiencia en Vercel/Linear. | `npx skills@latest add emilkowalski/skills` | **●●●** para microinteracciones (hojas, toasts, anillos). Encaja con los tokens `--motion-*` existentes. |
| [make-interfaces-feel-better](https://github.com/jakubkrehel/make-interfaces-feel-better) | Detalles que suman: tipografía, íconos, hover, alineación óptica, radios concéntricos, sombras, áreas táctiles. | `npx skills add jakubkrehel/make-interfaces-feel-better` | **●●●** Pulido de filas, botones e íconos. |
| [Vercel `web-design-guidelines`](https://github.com/vercel-labs/agent-skills/tree/main/skills/web-design-guidelines) + [Web Interface Guidelines](https://github.com/vercel-labs/web-interface-guidelines) | Revisa archivos contra las Web Interface Guidelines y reporta `archivo:línea`. Reglas fijadas a un commit con hash. | `npx skills add vercel-labs/agent-skills@web-design-guidelines` | **●●●** Revisor de código UI (complementa las capturas). |
| Vercel `react-best-practices`, `composition-patterns`, `react-view-transitions` | Patrones React/Next. | idem | ○○○ (sin React). `react-view-transitions` solo como lectura sobre View Transitions. |
| [Owl-Listener/designer-skills](https://github.com/Owl-Listener/designer-skills) | Pack grande (cientos de skills y comandos) de investigación, sistemas, UI, interacción y entrega. | ver README | **●○○** Investigación UX (entrevistas, heurísticas) más que código. |
| [awesome-ux-skills](https://github.com/tommyjepsen/awesome-ux-skills) | Métodos de investigación, personas, mapas de empatía, revisión heurística, storyboards. | `./install.sh` | **●○○** Para validar con estudiantes. |
| [Chrome DevTools MCP — skills](https://github.com/ChromeDevTools/chrome-devtools-mcp) | El plugin instala el MCP **y** skills de uso (depuración, rendimiento). | `/plugin marketplace add ChromeDevTools/chrome-devtools-mcp` → `/plugin install chrome-devtools-mcp@chrome-devtools-plugins` | **●●○** Rendimiento (INP/CLS) y depuración visual. |
| [AccessLint](https://github.com/AccessLint/accesslint) | Motor de auditoría a11y con MCP (`@accesslint/mcp`), CLI, matchers de Playwright (`toBeAccessible()`) y plugin de Claude Code. | ver README / [marketplace](https://github.com/AccessLint/claude-marketplace) | **●●○** Matcher de Playwright para `tests/browser/`. |

### 3.4 Directorios para seguir buscando

[awesome-claude-skills (travisvn)](https://github.com/travisvn/awesome-claude-skills) · [awesome-claude-skills (ComposioHQ)](https://github.com/ComposioHQ/awesome-claude-skills) · [awesome-claude-skills (karanb192)](https://github.com/karanb192/awesome-claude-skills) · [awesome-agent-skills (VoltAgent)](https://github.com/VoltAgent/awesome-agent-skills) · [awesome-claude-design-skills](https://github.com/zhuyansen/awesome-claude-design-skills) (cada repo con nota de seguridad) · [awesome-claude-ui-armory](https://github.com/ezra-y/awesome-claude-ui-armory) · [awesome-ui-motion-skills](https://github.com/romanticamaj/awesome-ui-motion-skills) · [bergside/awesome-design-skills](https://github.com/bergside/awesome-design-skills) · [podo/design-agent-skills](https://github.com/podo/design-agent-skills) · [skills.sh](https://skills.sh) · [skillux.dev/design](https://skillux.dev/design).

Cuidado con los directorios: muchas entradas son copias o envoltorios de las mismas 5–6 fuentes, y algunos traen scripts. Prioriza las fuentes originales listadas arriba.

---

## 4. Qué instalar en GradeHub (recomendación)

### 4.1 En el repo (todo el equipo; se commitea)

```
.claude/skills/
├── gradehub-design-system/   ← entregable
├── gradehub-ux-review/       ← entregable (con scripts/capturas.cjs)
└── gradehub-dashboard/       ← entregable
```

Pasos:

```bash
git switch -c li/skills-diseno origin/main
mkdir -p .claude/skills
cp -r <esta carpeta>/skills/gradehub-* .claude/skills/
claude plugin validate .claude/skills
# probar que se activan (sesión nueva, sin contexto previo):
#   "agrega un estado vacío a la agenda"        → debe cargar gradehub-design-system
#   "revisa cómo se ve estadísticas en oscuro"  → debe cargar gradehub-ux-review
#   "rediseña el anillo del promedio"           → debe cargar gradehub-dashboard
```

Y en `AGENTS.md`, en "Reglas que no se rompen", una sola línea (no copiar el contenido):

> Antes de tocar UI usa la skill `gradehub-design-system`; antes de abrir la PR, `gradehub-ux-review`; vistas de notas/estadísticas, `gradehub-dashboard`. (Codex y Gemini: están en `.claude/skills/*/SKILL.md`, léelas.)

Esa última frase importa: Codex y Gemini también leen `AGENTS.md`; el formato de skill es un estándar abierto, así que pueden leer el mismo archivo.

**Playwright para el script**: el repo ya usa `PLAYWRIGHT_MODULE`/`CHROME_PATH` en `tests/browser/` sin tenerlo como dependencia. El script sigue esa convención; si prefieren, agregar `playwright` como devDependency o un `npm run ux:capturas`.

### 4.2 Personales recomendados (cada persona, en su máquina)

| Prioridad | Qué | Para qué |
|---|---|---|
| 1 | `skill-creator` (plugin oficial) | Medir y mejorar los skills propios |
| 2 | Playwright MCP | Explorar y capturar a mano (§5) |
| 3 | `web-design-guidelines` (Vercel) | Revisión de código UI por reglas |
| 4 | Skills de Emil Kowalski + `make-interfaces-feel-better` | Movimiento y detalle |
| 5 | `example-skills` de Anthropic (trae `frontend-design` y `webapp-testing`) | Explorar direcciones y testear |
| 6 | Impeccable (al menos el detector `npx impeccable detect`) | Detector anti-slop en CI y `harden`/`clarify` |
| Opcional | Chrome DevTools MCP | Rendimiento (INP, CLS) en pantallas pesadas |
| Opcional | Figma MCP | Solo si se diseña en Figma |

No recomendados para la app: `brand-guidelines` (es la marca de Anthropic), `web-artifacts-builder`/React/shadcn (otro stack), UI UX Pro Max/Taste/Hallmark como "decisores" (sus fuentes y estilos chocan con Editorial + fuente del sistema). Sí para la landing o piezas de marketing.

**Conflictos**: si hay instalados varios skills de diseño, se pueden activar varios a la vez y contradecirse. Las reglas del repo ganan: los skills de GradeHub lo dicen explícitamente. Para bajar ruido, usa `skillOverrides` en `.claude/settings.local.json` (`"frontend-design": "user-invocable-only"`) para que solo corran cuando los llames.

---

## 5. MCPs útiles para diseño

| MCP | Qué agrega | Instalación (Claude Code) | Notas para GradeHub |
|---|---|---|---|
| [Playwright MCP](https://github.com/microsoft/playwright-mcp) | Navegador controlado por el árbol de accesibilidad (sin visión), `browser_snapshot`, `browser_take_screenshot` (también `fullPage`), `browser_resize`; capacidades opcionales `--caps vision,pdf,devtools,network,storage,testing` | `claude mcp add playwright -- npx @playwright/mcp@latest --viewport-size 390x844` (o `--device "iPhone 15"`, `--mobile`) | La pieza clave del ciclo de capturas interactivo. El árbol accesible sirve además como auditoría de nombres/roles. |
| [Chrome DevTools MCP](https://github.com/ChromeDevTools/chrome-devtools-mcp) | Trazas de rendimiento con insights, red, consola, capturas, emulación | `/plugin marketplace add ChromeDevTools/chrome-devtools-mcp` → `/plugin install chrome-devtools-mcp@chrome-devtools-plugins` | Para INP en ingreso de notas y CLS al cargar Inicio. Ojo: por defecto puede consultar CrUX de Google (`--no-performance-crux` para evitarlo) y Google recoge estadísticas de uso. |
| [Figma MCP](https://developers.figma.com/docs/figma-mcp-server/) | Lee frames, variables y componentes; servidor remoto escribe en el canvas; Code Connect | `claude plugin install figma@claude-plugins-official` o `claude mcp add --transport http figma https://mcp.figma.com/mcp` (servidor de escritorio/Dev Mode requiere asiento Dev/Full) | Solo si el diseño vive en Figma. Útil para sincronizar variables de Figma con los tokens de `styles.css`. |
| [AccessLint MCP](https://github.com/AccessLint/accesslint) | Auditoría a11y de HTML/URL | plugin vía [AccessLint/claude-marketplace](https://github.com/AccessLint/claude-marketplace) | Complementa el contraste que mide `capturas.cjs`. |
| Supabase MCP (ya usado en el equipo, lectura) | Consultas a la base | — | Para entender formas reales de datos **sin** copiar datos reales a fixtures: construir escenarios sintéticos con la misma forma. |
| [shadcn MCP](https://ui.shadcn.com/docs/mcp) | Navegar e instalar componentes de registros shadcn | `npx shadcn@latest mcp init --client claude` | **No aplica**: requiere React/Tailwind. |
| [21st MCP](https://github.com/21st-dev/magic-mcp) (ex Magic MCP) | Genera componentes React desde 21st.dev | `npx @21st-dev/cli@latest init --client claude` | **No aplica** (React). |
| [Storybook MCP](https://github.com/storybookjs/mcp) | Expone componentes/historias de Storybook al agente | ver README | No aplica hoy (no hay Storybook). |

Costo de contexto: cada MCP suma sus herramientas al contexto de cada turno. Actívalos por proyecto (`.mcp.json`) solo cuando se usen; `/doctor` muestra su costo.

---

## 6. Flujo de trabajo recomendado

### 6.1 El ciclo

```
 brief (qué pregunta responde la pantalla, acción principal, estados)
   ↓  gradehub-design-system  (+ gradehub-dashboard si hay datos)
 plan corto: tokens que usará, jerarquía, wireframe ASCII, textos reales
   ↓  revisar el plan: ¿es lo que haría para cualquier app genérica? → cambiar
 código en src/ + styles.css (solo tokens) → npm run build
   ↓  gradehub-ux-review: capturas 390 claro (rápido) → mirar → corregir   ×2–3
 matriz completa (390/1280 × claro/oscuro × texto grande [× nativa])
   ↓  informe P0–P3, arreglar P0/P1
 PR: guía HIG citada, capturas antes/después, estados cubiertos, conflictos para decisión
```

Principios detrás (de las docs de Anthropic y de `frontend-design`):
- **Dar un objetivo visual verificable**: una captura, una maqueta o un criterio medible. Claude mejora mucho iterando contra lo que ve; "una imagen vale 1.000 tokens".
- **Plan antes de código**: `frontend-design` pide 4–6 colores con hex, roles tipográficos y wireframe, y revisarlo contra el brief antes de escribir.
- **Contenido real** (de Lovable): diseñar con textos reales revela que un titular ocupa dos líneas o que un botón funciona mejor como verbo. En GradeHub: nombres de ramo largos de verdad, notas 3,9/4,0, pautas incompletas.
- **Por componente, no por página**, y **decir qué no tocar** ("solo cambia la fila de evaluación; no toques el motor ni Agenda").
- **Pedir preguntas** antes de una pantalla nueva: "Pregúntame lo que necesites para entender qué quiero y cómo lo imagino."

### 6.2 Design tokens

- Fuente única: `:root` en `styles.css` (claro) + bloques oscuros (`prefers-color-scheme` y `[data-modo="oscuro"]`). Ya existen tokens de color y de movimiento; **faltan** escala tipográfica, espaciado, radios y `z-index` (el índice de esta investigación midió 91 tamaños de fuente, 31 paddings y 18 `z-index` distintos).
- Los skills usan marcadores `{{DIR: …}}` donde el valor depende de la dirección gráfica elegida (las candidatas están en `direcciones/` de esta misma carpeta). Al decidir, se reemplazan en `gradehub-design-system/SKILL.md` **y** en `styles.css` en la misma PR.
- Documentar el sistema en un archivo (`DESIGN.md` o la propia skill) evita que cada sesión lo reinvente; Impeccable propone lo mismo (`/impeccable document`).
- Si algún día se diseña en Figma, Figma MCP puede leer las variables y comparar contra `:root`.

### 6.3 Evitar el "AI slop" estético

Rasgos a evitar, según las fuentes:

| Fuente | Rasgos |
|---|---|
| [Cookbook de Anthropic — frontend aesthetics](https://github.com/anthropics/claude-cookbooks/blob/main/coding/prompting_for_frontend_aesthetics.ipynb) | Inter/Roboto/Arial por defecto; gradientes morados sobre blanco; layouts y componentes predecibles; convergencia a "Space Grotesk" incluso cuando se pide variedad |
| [`frontend-design`](https://github.com/anthropics/skills/tree/main/skills/frontend-design) (2026) | 1) fondo crema (~`#F4F1EA`) + serif de alto contraste + acento terracota (~`#D97757`, el acento de Claude); 2) casi negro + un acento verde ácido o bermellón; 3) layout de diario con filetes y radio 0; 4) kit de tarjetas SaaS: todo en tarjetas iguales, un solo radio, la misma sombra gris, lavados de degradado; 5) "chrome" de plantilla: eyebrow en MAYÚSCULAS sobre cada título, metadatos con `·`, etiquetas "PALABRA — fragmento", casi-negros `#0B0B0B`, monoespaciada para datos, `→` en cada link/botón; también acentuar una sola palabra del titular, numeración 01/02/03 sin secuencia, fade-up en cada sección |
| [`web-artifacts-builder`](https://github.com/anthropics/skills/tree/main/skills/web-artifacts-builder) | Exceso de centrado, gradientes morados, radios uniformes, Inter |
| [Impeccable](https://github.com/pbakaus/impeccable) | Tarjetas dentro de tarjetas, texto gris sobre color, ícono en cuadrado redondeado sobre cada título, padding apretado, encabezados saltados |
| [Blog de Claude — frontend design with skills](https://claude.com/resources/articles/improving-frontend-design-through-skills) | Sin guía, casi siempre Inter + gradiente morado + animación mínima; decir "evita Inter y Roboto" ya mejora el resultado |

Para GradeHub esto se traduce en reglas concretas (ya en `gradehub-design-system` §0 y §9): fuente del sistema (decisión de producto, no default), color solo semántico, filas abiertas Editorial en vez de tarjetas idénticas, sentence case, sin `→` ni eyebrows, sin emojis-íconos. Nótese que la app usa a propósito `·` en metadatos y fondo casi negro en oscuro: son decisiones vigentes, no hay que "corregirlas" porque una lista genérica las marque.

### 6.4 Hacer obligatorio lo importante (hooks)

Un skill se puede olvidar; un hook no. Ejemplo para `.claude/settings.json` del repo (ajustar rutas; el script sale con código 2 si hay problemas graves):

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|Write|MultiEdit",
        "hooks": [
          {
            "type": "command",
            "command": "case \"$CLAUDE_FILE_PATHS\" in *styles.css*|*src/render-*|*src/app/*) npx --no-install impeccable detect styles.css >/dev/null 2>&1 || echo 'Revisa el informe del detector antes de seguir' ;; esac"
          }
        ]
      }
    ]
  }
}
```

Verifica el nombre exacto de las variables de entorno del hook en la [guía de hooks](https://code.claude.com/docs/en/hooks-guide) de tu versión antes de commitearlo; si el detector no se instala, cambia el comando por `npm run build` + el chequeo de CSS de `AGENTS.md`. Las capturas completas son lentas (~1 min): mejor como paso manual de `gradehub-ux-review` o en CI, no en cada edición.

### 6.5 Subagente revisor (opcional)

`.claude/agents/ui-reviewer.md`:

```markdown
---
name: ui-reviewer
description: Revisa cambios de UI de GradeHub con capturas y entrega un informe P0–P3. Úsalo al terminar un cambio visual.
skills: [gradehub-ux-review, gradehub-design-system]
tools: Read, Grep, Glob, Bash
---
Corre gradehub-ux-review sobre las pantallas tocadas por `git diff origin/main...`.
No edites archivos. Devuelve solo el informe.
```

Ventaja: la revisión ocurre en un contexto limpio (no "defiende" lo que acaba de escribir) y no llena la conversación principal de capturas.

### 6.6 Uso con plan Max

- Las capturas son imágenes en el contexto: itera con `--solo-movil` y una o dos pantallas; la matriz completa, una vez antes de la PR.
- Prefiere `browser_snapshot` (texto) a capturas cuando solo verificas estructura.
- MCPs desactivados cuando no se usan; `/skill-doctor` para ver qué skills cuestan sin usarse.
- Para tareas largas de revisión, el subagente (§6.5) evita compactar la conversación principal.

---

## 7. Prompts de diseño listos para usar

### 7.1 Claude Code en GradeHub

**Pantalla o componente nuevo**
```
Usa gradehub-design-system (y gradehub-dashboard si muestra notas).
Tarea: [pantalla/componente]. Pregunta que responde: [¿cómo voy? / ¿qué necesito? / …].
Acción principal: [verbo + objeto]. Solo app nativa: [sí/no → enAppNativa()].
Antes de codear: dame un plan de 10 líneas (jerarquía, tokens que usarás, estados vacío/carga/error,
textos reales en es-CL) y un wireframe ASCII a 390 px. Dime qué parte del plan sería "lo genérico"
y cómo lo evitas. Espera mi OK.
No toques: motor (src/engine), sync, otras pantallas.
```

**Revisión**
```
Usa gradehub-ux-review sobre [pantallas] tras npm run build. Matriz completa.
Mira cada PNG, confirma o descarta cada hallazgo del informe automático,
y entrégame el informe P0–P3 con archivo y zona. No edites nada todavía.
```

**Iteración visual dirigida**
```
En la captura stats-390-oscuro.png, el texto de referencia del gráfico se pierde y el anillo
compite con la cifra. Ajusta solo Estadísticas: una cifra protagonista, el 4,0 marcado,
contraste ≥ 4,5:1 en oscuro. Vuelve a capturar 390 claro/oscuro y muéstrame antes/después.
```

**Textos**
```
Revisa los textos de [archivo] contra references/textos-es-cl.md de gradehub-design-system:
coma decimal, plurales 0/1/2, nada pegado, verbo + objeto en botones, errores con acción.
Devuelve una tabla actual → propuesto; no cambies lógica.
```

**Explorar dirección (fuera de la app)**
```
Usa frontend-design solo para explorar. Producto: app de notas universitarias chilena, uso
mayormente en iPhone, público 18–25 años, momento de uso: después de una prueba, con ansiedad.
Propón 3 direcciones como tokens (colores hex, roles tipográficos usando la fuente del sistema,
radios, superficies) + una maqueta HTML estática de Inicio con datos ficticios.
Ninguna puede caer en los 5 rasgos genéricos que lista el skill.
```

### 7.2 Bloque anti-slop para cualquier herramienta (Claude, v0, Lovable)

Adaptado del cookbook de Anthropic y de `frontend-design`:

```
<restricciones_esteticas>
Tiendes a converger en diseños genéricos ("AI slop"). Evítalo:
- Tipografía: [fuente del sistema para la app / una fuente elegida a propósito para marketing].
  Nada de Inter, Roboto, Space Grotesk por defecto. Escala tipográfica clara, cifras tabulares.
- Color: paleta definida en variables CSS; un color dominante y un acento con significado.
  Sin gradientes morados, sin crema+terracota, sin negro+verde ácido.
- Estructura: no todo en tarjetas idénticas con la misma sombra; jerarquía por tamaño, peso y espacio.
- Sin eyebrows en MAYÚSCULAS, sin "→" en cada botón, sin numeración 01/02/03 si no hay secuencia,
  sin animación fade-up en cada sección. Un solo momento de movimiento, que responda a una acción.
- Textos reales en español de Chile, sentence case, verbos concretos.
- Piso de calidad: 44 px táctiles, contraste 4,5:1, foco visible, prefers-reduced-motion, 390 px sin scroll lateral.
</restricciones_esteticas>
```

### 7.3 Lo que se aprende de v0 y Lovable (aplicable a Claude)

De la [guía de prompting de Lovable](https://docs.lovable.dev/prompting/prompting-one): planificar antes (qué es, para quién, por qué, cuál es la acción clave); mapear el recorrido entre pantallas; fijar la dirección visual temprano y guardarla en las instrucciones del proyecto (en Claude Code: la skill); pedir por componente; usar contenido real; vocabulario atómico (botón, chip, hoja, toast); decir qué cambiar y qué dejar; una sola cosa por iteración con puntos de retorno (en git: commits pequeños). Su ejemplo de "estilo calmado" usa Inter: justo el tipo de default que conviene no copiar. Docs de v0: [v0.app/docs](https://v0.app/docs) (genera React/shadcn; útil para maquetas rápidas, no para el código de GradeHub).

---

## 8. Cómo mejorar los skills con el tiempo

1. **Medir** con `skill-creator`: 5–10 pedidos reales del equipo ("agrega un toast al borrar un ramo", "estadísticas se ve mal en oscuro"), con y sin skill, y criterios verificables (¿usó coma?, ¿hay estado de error con Reintentar?, ¿corrió capturas?).
2. **Ajustar la descripción** si no se activa (o se activa de más): `skill-creator` genera prompts que deberían y no deberían activarlo.
3. **Mover a hook** lo que se salte aunque esté en el skill.
4. **Actualizar con cada decisión de producto** (nueva dirección, nuevo componente aprobado): la skill es la memoria del sistema de diseño; una decisión que no está ahí, se pierde en la próxima sesión.
5. **Reemplazar marcadores `{{DIR}}`** cuando se elija la dirección; buscar con `rg "\{\{DIR" .claude/skills`.

---

## 9. Lo que encontró el script en la copia del repo (commit `dda6088`)

Corrida de `capturas.cjs` sobre una copia local (bundles generados con `npm run build`), 4 pantallas × 2 anchos × 2 modos × 2 tamaños de texto = 32 capturas, datos ficticios, red externa bloqueada:

- **Sin errores de JS, sin desbordes horizontales, sin `NaN`/`undefined` visibles, sin puntos decimales** en Inicio, ficha, Estadísticas y Agenda con el escenario sintético.
- **Objetivos táctiles a revisar**: los nombres de ramo como botón miden ~21 px de alto a 390 px (aceptable solo si la fila completa es el objetivo; confirmar), y "Editar" (~31 px), "+ Semestre anterior" (~30 px), "Calendario" (~31–34 px) y "Ver 1 más" (~27 px) quedan bajo 44 px. Esto es candidato P1 por la regla HIG del propio repo.
- **Contraste** del texto: sin fallas detectadas en estas pantallas con el escenario usado (el índice de esta investigación sí detecta superficies oscuras casi iguales, `--card` vs `--bg` 1,06:1, y bordes de control a 1,97:1 en claro: eso no lo mide un chequeo de texto, por eso la lista manual del skill lo pide).
- **Formato**: el código todavía tiene 85 usos de `toFixed(`; la mayoría pasa por `nf`/`notaConComa`, pero conviene la auditoría de `references/patrones-codigo.md` §1.
- **Toasts**: `showToast(msg,isError)` no admite acción; no hay "Deshacer" para borrados. El skill trae el patrón `toastConAccion` para extenderlo sin crear un segundo sistema.

Las capturas de esa corrida quedaron fuera de esta carpeta (en `/tmp`) porque son temporales; el script las regenera en un minuto.

---

## 10. Fuentes

Documentación oficial
- Claude Code — Skills: https://code.claude.com/docs/en/skills (también en docs.claude.com/en/docs/claude-code/skills)
- Claude Code — Memoria, CLAUDE.md y AGENTS.md: https://code.claude.com/docs/en/memory
- Claude Code — Hooks: https://code.claude.com/docs/en/hooks-guide
- Skill authoring best practices: https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices
- Especificación Agent Skills: https://agentskills.io/specification
- Anthropic Engineering, "Equipping agents for the real world with Agent Skills": https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills
- Claude, "Improving frontend design through skills": https://claude.com/resources/articles/improving-frontend-design-through-skills
- Cookbook "Prompting for frontend aesthetics": https://github.com/anthropics/claude-cookbooks/blob/main/coding/prompting_for_frontend_aesthetics.ipynb

Repositorios de skills
- Anthropic skills: https://github.com/anthropics/skills (frontend-design, canvas-design, theme-factory, brand-guidelines, web-artifacts-builder, webapp-testing, skill-creator, algorithmic-art)
- Plugins oficiales: https://github.com/anthropics/claude-plugins-official (frontend-design, skill-creator, playground, theme-examples, figma)
- Impeccable: https://github.com/pbakaus/impeccable · https://impeccable.style
- UI UX Pro Max: https://github.com/nextlevelbuilder/ui-ux-pro-max-skill
- Taste Skill: https://github.com/Leonxlnx/taste-skill
- Hallmark: https://github.com/nutlope/hallmark
- StyleSeed: https://github.com/bitjaru/styleseed
- Emil Kowalski: https://github.com/emilkowalski/skill
- make-interfaces-feel-better: https://github.com/jakubkrehel/make-interfaces-feel-better
- Vercel agent-skills: https://github.com/vercel-labs/agent-skills · Web Interface Guidelines: https://github.com/vercel-labs/web-interface-guidelines
- Claude Code Frontend Skills: https://github.com/JaimeJunr/claude-code-frontend-skills
- Designer Skills: https://github.com/Owl-Listener/designer-skills · Awesome UX Skills: https://github.com/tommyjepsen/awesome-ux-skills
- Google Stitch skills: https://github.com/google-labs-code/stitch-skills
- AccessLint: https://github.com/AccessLint/accesslint

MCPs
- Playwright MCP: https://github.com/microsoft/playwright-mcp
- Chrome DevTools MCP: https://github.com/ChromeDevTools/chrome-devtools-mcp
- Figma MCP: https://developers.figma.com/docs/figma-mcp-server/
- shadcn MCP: https://ui.shadcn.com/docs/mcp
- 21st MCP: https://github.com/21st-dev/magic-mcp
- Storybook MCP: https://github.com/storybookjs/mcp

Prompts y otras herramientas
- Lovable, prompting best practices: https://docs.lovable.dev/prompting/prompting-one
- v0 docs: https://v0.app/docs
- Apple HIG: https://developer.apple.com/design/human-interface-guidelines

Repositorio de GradeHub (copia local, commit `dda6088`): `AGENTS.md`, `docs/guia/reglas-y-entrega.md`, `docs/diseno-editorial.md`, `styles.css`, `src/app/estado-y-notas.js`, `tests/browser/*.cjs`.
