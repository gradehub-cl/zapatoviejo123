---
name: gradehub-design-system
description: Sistema de diseño de GradeHub (app de notas universitarias chilena, web/PWA + Capacitor, JS sin framework). Úsalo SIEMPRE que crees o cambies UI en GradeHub - una pantalla, un componente, un estilo en styles.css, HTML generado en src/render-*/ o src/app/, textos de interfaz, toasts, modales, estados vacío/carga/error - o cuando pidan "que se vea mejor", "arregla el diseño", "modo oscuro", "accesibilidad" o "formato de notas". Define tokens, tipografía, color semántico (semáforo), componentes, formato es-CL con coma decimal, plurales, estados con timeout, toasts con deshacer y accesibilidad (HIG de Apple, WCAG 2.2 AA).
metadata:
  version: "1.0"
  owner: equipo-gradehub
---

# Sistema de diseño de GradeHub

Antes de tocar UI lee esta página entera; es corta a propósito. Las reglas de
`AGENTS.md` mandan sobre esta skill si chocan. El detalle con código listo para
copiar está en [references/patrones-codigo.md](references/patrones-codigo.md) y
los textos de interfaz en [references/textos-es-cl.md](references/textos-es-cl.md):
léelos cuando el cambio toque números, plurales, estados o toasts.

> **Marcadores.** Donde dice `{{DIR: …}}` el valor depende de la dirección
> gráfica que elija el dueño del producto. Mientras no se decida otra, vale la
> dirección **Editorial** vigente y el valor "actual" que aparece al lado.
> Nunca reemplaces un marcador por un valor inventado: usa el actual o pregunta.

## 0. Principios (en orden de prioridad)

1. **La nota es la protagonista.** Cada pantalla responde primero "¿cómo voy?" y
   "¿qué necesito?". Todo lo demás es secundario y se ve secundario.
2. **El color significa algo.** Verde/ámbar/rojo = aprobado / al borde /
   reprobado. Nunca decorativo, nunca "por tema". El 100 % de avance es cierre,
   no celebración verde.
3. **Nativo antes que bonito.** GradeHub se usa sobre todo en iPhone: se siente
   como una app iOS (HIG), no como una landing. Una acción principal por pantalla.
4. **Confianza.** Un promedio mal formateado o un dato que "desaparece" sin
   explicación destruye más confianza que cualquier detalle visual. Cada acción
   da respuesta, cada error dice qué pasó y qué hacer, lo destructivo se puede
   deshacer o se confirma.
5. **Sin "AI slop".** Nada de Inter, gradientes morados, glassmorphism gratuito,
   tarjetas idénticas con la misma sombra, emojis como íconos, eyebrows en
   MAYÚSCULAS sobre cada título, flechas `→` pegadas a cada botón ni números
   `01 / 02 / 03` cuando no hay secuencia.

## 1. Arquitectura que condiciona el diseño

- Sin frameworks ni Tailwind: HTML como template strings en `src/render-*/` y
  `src/app/`, estilos en **un** `styles.css`. Edita `src/`, nunca los bundles
  generados; tras editar corre `npm run build`.
- Escapa todo texto de usuario con `esc()` al interpolarlo en HTML.
- Lo nuevo y visible va **solo a la app nativa** hasta el lanzamiento:
  detrás de `enAppNativa()` en JS o `html.app-nativa` en CSS. En la web solo
  entran arreglos, seguridad, pautas/datos y el panel de profesores. El motor es
  uno solo para ambas.
- Modo oscuro: `@media (prefers-color-scheme: dark)` sobre
  `:root:not([data-modo="claro"])` **y** el mismo bloque en
  `:root[data-modo="oscuro"]`. Todo token nuevo se define en los tres lugares.
- Temas de fondo existentes (Neutro, Papel, Pizarra) y acentos guardados son
  preferencias del usuario: no los borres ni los reinterpretes.
- Especificidad: `input[type=text]` gana a una clase sola. Usa `input.clase`
  o `.contenedor input`; **nunca `!important`** nuevo.

## 2. Tokens

Usa siempre variables; no escribas hex, px de color ni sombras sueltas. Si
falta un token, créalo en `:root` (claro + los dos bloques oscuros) con nombre
semántico, no visual (`--superficie-elevada`, no `--gris-2`).

### 2.1 Color (semánticos)

| Token | Uso | Actual claro | Actual oscuro |
|---|---|---|---|
| `--bg` | Fondo de pantalla | `#ffffff` | `#080809` |
| `--card` | Superficie de fila/tarjeta | `#ffffff` | `#111113` `{{DIR: subir a ≥1,15:1 vs --bg}}` |
| `--muted` | Fondo agrupado, chips | `#f2f2f4` | `#1b1b1f` |
| `--fg` / `--fg2` / `--fg3` | Texto principal / secundario / terciario | `#19191c` / `#54545b` / `#6c6c74` | `#f1f1f3` / `#b4b4bd` / `#92929c` |
| `--border` | Separador decorativo (no delimita controles) | `#e7e7e9` | `#27272c` |
| `--border2` | Borde de control | `#b8b8be` `{{DIR: ≥3:1 vs fondo}}` | `#55555e` |
| `--primary` / `--primary-fg` | Acento de marca, acción principal | `#0d7a6b` / `#fff` | `#2dd4bf` / `#04231e` |
| `--green` `--yellow` `--red` (+ `-bg`) | **Solo** semáforo y suma/resta | ver `styles.css` | ver `styles.css` |
| `--accent` | Brillos de Estadísticas | `#56e2e8` | `#56e2e8` |

Reglas de color:
- **Semáforo exclusivo.** `--green/--yellow/--red` solo para estado de nota
  (aprobado ≥ 4,0 / al borde / reprobado) y para "suma / resta" en variaciones.
  Para éxito genérico de una acción usa `--fg` o `--primary`, no verde.
- La nota usa `--grade-color` (calculado por `notaHue`/`colorClass`); el color
  de identidad de un ramo vive en su **línea lateral**, nunca tiñe su nota.
- Promedio del semestre: en el acento, sin palabra de veredicto (un semestre no
  se aprueba ni se reprueba).
- Nunca comuniques estado **solo** con color: acompaña con texto o ícono
  ("Aprobado", "Te falta 4,6").
- Contraste mínimo: texto 4,5:1 (grande 3:1), bordes de controles y foco 3:1,
  **en claro y en oscuro**. Mídelo, no lo supongas
  (ver `gradehub-ux-review`).
- Superficies en oscuro: no uses negro puro bajo texto largo; diferencia
  niveles por luminosidad (`--bg` < `--card` < `--muted`), no por sombras.

### 2.2 Tipografía

- Familia única: `--font-ui` (pila del sistema: SF en Apple, Segoe en Windows).
  **No se descargan fuentes.** `{{DIR: si se aprueba una fuente de marca, solo
  para el logotipo/titulares y autohospedada}}`.
- Toda cifra (notas, %, ponderaciones, fechas en columnas) con
  `font-variant-numeric: tabular-nums`.
- Escala (usa rem; la raíz ya escala con `clamp`). Hoy hay ~90 tamaños sueltos:
  **no agregues tamaños nuevos**, elige de esta escala `{{DIR: confirmar escala}}`:

| Token propuesto | rem | Uso |
|---|---|---|
| `--fs-cifra-xl` | `{{DIR: 2.75–3.5}}` | Promedio protagonista (Inicio, ficha) |
| `--fs-titulo` | 1.375 | Título de pantalla |
| `--fs-subtitulo` | 1.0625 | Título de sección/hoja |
| `--fs-cuerpo` | 0.9375 | Texto de fila, párrafos |
| `--fs-secundario` | 0.8125 | Metadatos, ponderación, ayudas |
| `--fs-mini` | 0.6875 | Solo etiquetas de gráfico; nunca texto que haya que leer para decidir |

- Pesos: 400 cuerpo, 600 nombres/filas, 700–800 cifras y títulos. Máximo 3
  pesos por pantalla.
- `letter-spacing` negativo solo en cifras y títulos grandes; el cuerpo, normal.
- Líneas ≤ 70 caracteres; `line-height` 1.4–1.55 en párrafos, 1.1–1.2 en cifras.
- Sentence case en todo (títulos, botones, pestañas). MAYÚSCULAS solo en siglas
  de ramo (`MAT1610`).
- Respeta el tamaño de texto elegido por la persona (no fijes `px` en texto;
  prueba con texto grande).

### 2.3 Espacio, radios, capas, sombras, movimiento

- Espaciado en grilla de 4: `4 8 12 16 20 24 32 40 48`. `{{DIR: tokens --sp-1…--sp-12}}`.
  Padding de fila: 12–16; separación entre secciones: 24–32.
- Radios: control `{{DIR: 10}}`, fila/tarjeta `{{DIR: 14}}`, hoja/modal
  `{{DIR: 20}}`, píldora `999px`. Radio interior = radio exterior − padding
  (radios concéntricos). No un radio único para todo.
- `z-index` solo de la escala `{{DIR: --z-base 0, --z-sticky 10, --z-nav 20,
  --z-hoja 40, --z-toast 60, --z-overlay 80}}`. Hoy hay 18 valores sueltos: no
  agregues otro.
- Sombras: `--shadow` y `--shadow-lg` y nada más. En oscuro casi no se ven: la
  jerarquía la da la superficie.
- Movimiento: `--motion-press 120ms`, `--motion-fast 160ms`,
  `--motion-base 220ms`, `--motion-screen 320ms`, curvas `--ease-out` (entradas)
  y `--ease-standard`. Entradas con ease-out, nunca ease-in. Anima `transform` y
  `opacity`, no `width/height/top`. Todo movimiento tiene su versión en
  `@media (prefers-reduced-motion: reduce)` (sin desplazamiento; un fundido
  corto sí). El movimiento responde a una acción; no hay animaciones de adorno
  en cada sección.

## 3. Componentes (usa los existentes antes de crear uno)

Busca antes con `npm run buscar -- <nombre>`. Piezas existentes clave:
`showToast`, `showConfirm` (destructivo con `actionFirst`, `focusCancel`),
`esc`, `nf`/`fmt`/`fmtNota`/`fmtPromedio`/`notaConComa`, `htmlAnillo`,
`htmlMedidorNota`, `htmlEscalaNotas`, `htmlBarraCentrada`, filas `.eval-row`.

| Componente | Reglas |
|---|---|
| **Botón principal** | Uno por pantalla. Verbo + objeto ("Guardar nota", no "Enviar"/"OK"). Alto ≥ 44 px. Estado cargando: deshabilitado + texto "Guardando…" (mismo ancho), nunca spinner sin texto. |
| **Botón destructivo** | Rojo de texto/borde, no relleno rojo grande. Confirma con `showConfirm` o, si es reversible, ejecuta y ofrece **Deshacer**. |
| **Input de nota** | `inputmode="decimal"`, acepta `5,5` y `5.5`, muestra siempre con coma. Rango 1,0–7,0 (o conceptos del tenant). Valida al salir del campo (`blur`) y al guardar, no en cada tecla. Error bajo el campo, en texto, con `aria-describedby` y `aria-invalid="true"`. Alto ≥ 44 px, `font-size` ≥ 16 px (evita zoom en iOS). |
| **Interruptor** | Si el cambio se aplica al tocar (sin "Guardar"), es switch (`role="switch"`, `aria-checked`). No casillas ni botón que cambia de texto. |
| **Selector de apariencia** | Muestras que se ven como va a quedar, no radios. |
| **Hoja (modal)** | `role="dialog"`, `aria-modal`, título con `aria-labelledby`, foco al abrir en el primer control útil, Esc y gesto/botón "Cerrar" la cierran, el foco vuelve al disparador, área segura inferior respetada. |
| **Fila de ramo / evaluación** | Nombre (botón nativo) + metadato en `--fg3` + cifra alineada a la derecha con `tabular-nums`. Línea lateral de color de ramo. Área táctil de fila completa. |
| **Toast** | Ver §5. Siempre `role="status"`/`aria-live="polite"`; errores con `role="alert"`. |
| **Chips/etiquetas** | Texto en sentence case, `--muted` de fondo, nunca semáforo salvo que sea estado de nota. |
| **Íconos** | SVG en línea, trazo uniforme, 20–24 px, `aria-hidden="true"` si acompañan texto; si van solos, botón con `aria-label`. Sin emojis como íconos de interfaz. |
| **Gráficos/estadísticas** | Usa `gradehub-dashboard`. |

Al crear un componente nuevo: estados *reposo, hover (solo puntero fino),
presionado, foco visible, deshabilitado, cargando, error* y claro/oscuro.

## 4. Números, fechas y plurales (es-CL)

Detalle y funciones en [references/patrones-codigo.md](references/patrones-codigo.md).

- **Coma decimal siempre en pantalla**: `5,5`, `4,0`, `62,5 %`. Nunca
  `.toFixed()` directo en HTML: pasa por `nf()`/`fmt()`/`notaConComa()` o
  `Intl.NumberFormat('es-CL')`. Al escribir código nuevo, busca `toFixed(` en
  lo que tocas y verifica que no llegue a pantalla con punto.
- Notas con 1 decimal (2 solo donde la regla del tenant lo pida); redondeo con
  el motor (`gh_excelRound`/`notaFinalOficial`), nunca `Math.round` propio.
- Porcentajes: `40 %` con espacio fino no separable (`\u202F`) o sin espacio,
  pero **consistente** `{{DIR: elegir "40 %" o "40%"}}`. Miles con punto:
  `1.250`.
- Fechas: `Intl.DateTimeFormat('es-CL', …)` → "lun 7 dic", "7 de diciembre".
  Hora 24 h: "14:50". Zona America/Santiago. Fechas relativas ("mañana",
  "en 3 días") solo si son exactas.
- Nada pegado: siempre espacio entre número y palabra ("3 notas", no "3notas")
  y entre fragmentos interpolados. Revisa los template strings con
  `${a}${b}`.
- Plurales con función, nunca "nota(s)": `plural(1,'nota') → "1 nota"`,
  `plural(0,'nota') → "Sin notas"` (el cero se dice en palabras cuando es
  estado vacío). Sustantivos irregulares (examen→exámenes, certamen→certámenes,
  interrogación→interrogaciones) por tabla, como `pluralSerieFicha`.
- Respeta el vocabulario de cada universidad (`tests/vocabulario.test.js`):
  "ramo", "certamen", "interrogación", "solemne"… según tenant.

## 5. Estados: vacío, carga, error, éxito

Toda vista que depende de datos remotos implementa los cuatro. Código en
`references/patrones-codigo.md` (`conTimeout`, `htmlEstadoVista`).

- **Carga.** Menos de 300 ms: nada. Más: esqueleto con la forma del contenido
  final (no spinner a pantalla completa), sin saltos de layout al llegar los
  datos. `aria-busy="true"` en el contenedor.
- **Timeout.** Toda petición de red con tope (`{{DIR: 8 s}}` por defecto; 15 s
  para OCR/archivos). A los ~3 s, texto "Sigue cargando…"; al vencer, estado de
  error con **Reintentar**. Nunca un spinner infinito. Si hay datos locales
  (`gradehub_v1`), muéstralos y avisa "Sin conexión: mostrando lo guardado en
  este dispositivo".
- **Error.** Dice qué pasó y qué hacer, en la voz de la interfaz, sin pedir
  disculpas ni culpar: "No pudimos guardar la nota. Revisa tu conexión y
  vuelve a intentarlo." + botón **Reintentar**. Nunca muestres códigos
  crudos (`42501`, `PGRST…`) ni `undefined`/`NaN`. Registra el detalle en
  `errores_app` como ya hace la app.
- **Vacío.** Es una invitación: título que dice qué irá ahí + una frase +
  **una** acción ("Agrega tu primer ramo"). Sin ilustraciones genéricas.
  Diferencia "todavía no hay nada" de "tu filtro no encontró nada" (este
  último ofrece "Quitar filtro").
- **Éxito.** Confirmación proporcional: un cambio de estado visible en el lugar
  basta; toast solo si la acción ocurre fuera de la vista o es reversible.
- **Optimista con red.** Al guardar una nota, muéstrala de inmediato; si el
  sync falla, márcala "Sin sincronizar" y reintenta, sin perder el valor.

## 6. Toasts y deshacer

- Una sola cola; uno visible a la vez; posición sobre la barra inferior y
  dentro del área segura (`env(safe-area-inset-bottom)`).
- Texto ≤ 60 caracteres, en pasado y con el mismo verbo que la acción:
  botón "Eliminar evaluación" → toast "Evaluación eliminada".
- **Acciones destructivas reversibles** (eliminar nota, evaluación, ramo,
  archivar semestre): ejecútalas en la interfaz, guarda una copia, muestra
  toast con botón **Deshacer** durante `{{DIR: 6 s}}` (≥ 5 s; en lectores de
  pantalla no se cierra mientras tenga foco), y confirma en el servidor al
  vencer. Deshacer restaura exactamente lo anterior, incluido el orden.
- **Irreversibles** (eliminar cuenta, borrar todo): no usan toast; usan
  `showConfirm` con acción destructiva primero (`actionFirst`) y foco en
  Cancelar (`focusCancel`), describiendo qué se pierde.
- `showToast(msg,isError)` actual no tiene acción: para deshacer usa el patrón
  `toastConAccion` de `references/patrones-codigo.md` (extiéndelo en
  `src/app/estado-y-notas.js`, no crees un segundo sistema).
- Los toasts no tapan el botón principal ni la barra de navegación; se pausan
  al pasar el puntero o al enfocar.

## 7. Accesibilidad (piso, no extra)

- Área táctil ≥ 44×44 pt (aunque el ícono sea de 20 px; usa padding o
  pseudo-elemento). Separación ≥ 8 px entre objetivos.
- Foco visible en todo control: `:focus-visible` con anillo de 2 px a ≥ 3:1.
  Prohibido `outline: none` sin reemplazo.
- Semántica nativa primero (`button`, `a`, `label`, `fieldset`), ARIA solo
  para lo que HTML no da. Todo input tiene `<label>` visible (el placeholder no
  es etiqueta).
- Orden de lectura = orden visual. Encabezados sin saltos (`h1`→`h2`).
- Regiones vivas para cambios de promedio/nota necesaria: anúncialos con
  `aria-live="polite"` y texto completo ("Promedio del ramo: 5,4").
- Cifras para lector de pantalla: "5,4" se lee bien; `·` o guiones como
  "sin nota" necesitan `aria-label="Sin nota"`.
- `prefers-reduced-motion`, `prefers-contrast: more` (refuerza bordes) y texto
  grande deben funcionar sin cortes ni superposiciones.
- Áreas seguras (`env(safe-area-inset-*)`) en barras fijas, hojas y toasts.
- Gráficos: siempre una alternativa en texto/tabla con los mismos datos.

## 8. Cómo trabajar un cambio de UI

1. Lee la guía HIG del caso (sección iOS) y anótala para la PR.
2. Escribe un mini plan: qué responde la pantalla, acción principal, estados,
   tokens que usarás. Revísalo contra §0: si es lo que harías para cualquier
   app genérica, cámbialo.
3. Implementa en `src/` + `styles.css` con tokens; sin `!important`, sin hex.
4. `npm run build` y checks de `AGENTS.md` ("Antes de entregar").
5. Corre la skill **`gradehub-ux-review`** (capturas 390 px y 1280 px, claro y
   oscuro, texto grande) y corrige lo que salga antes de abrir la PR.
6. En la PR: guía HIG seguida, capturas antes/después, estados cubiertos, y
   cualquier conflicto con semáforo/tipografía/Editorial **descrito para que
   decida el dueño del producto** (no lo resuelvas tú).

## 9. Lista roja (rechaza el cambio si aparece)

- Hex o `px` de color sueltos; tamaños de fuente fuera de la escala; `z-index`
  nuevo inventado; `!important`; `outline:none` sin reemplazo.
- Punto decimal en pantalla; "nota(s)"; número pegado a palabra; `NaN`,
  `undefined`, `null`, `[object Object]` visibles.
- Verde para algo que no es aprobado/suma; ramo teñido en su nota; 100 % como
  celebración.
- Spinner sin tope; error sin acción; vacío sin acción; borrado sin deshacer ni
  confirmación.
- Fuentes descargadas, Inter, gradiente morado, glassmorphism decorativo,
  emojis como íconos, eyebrows en mayúsculas.
- Objetivos < 44 px; texto < 4,5:1; contenido bajo el notch o la barra de
  inicio.
- Datos reales de estudiantes en capturas, fixtures o ejemplos.
