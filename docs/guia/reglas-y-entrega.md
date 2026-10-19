# Reglas que no se rompen y antes de entregar

> Detalle de [AGENTS.md](../../AGENTS.md). Las reglas cortas están allá; acá van completas: arquitectura, diseño (Editorial, HIG), y por qué se prueba como se prueba.

## Arquitectura

Sin build, sin frameworks. Los archivos de la app se despliegan tal cual:

| Archivo | Qué tiene |
|---|---|
| `index.html` | Estructura, logo en base64, metadatos |
| `data.js` | Mallas, carreras, presets, temas, portales — solo literales |
| `engine.js` | El motor de notas, uno solo para todas las universidades: `calculateFinalGrade`, `solveForTarget`, compuertas, descartes y las reglas de nota de cada universidad (`GH_REGLAS_NOTA_POR_TENANT`) |
| `app.js` | Estado, navegación, editor y adaptadores de cálculo |
| `app-session.js` | Auth, recuperación, persistencia local y sync con Supabase |
| `marketplace.js` | Avisos, segmentación local, cotización pura y espacio privado de profesor; publicidad y cobro aún sin activar |
| `render-main.js` | `renderHome`, `renderRamo` y `renderStats` |
| `render-agenda.js` | `renderAgenda`, separado de `app.js` por tamaño |
| `styles.css` | Estilos y la base neutra compartida |

El orden de carga en `index.html` es `data.js` → `engine.js` → `app.js` →
`app-session.js` → `marketplace.js` → `render-main.js` → `render-agenda.js`, y no es decorativo:
son `<script>` clásicos, así que sus `const` quedan en el ámbito léxico global y
cada uno ve a los anteriores sin imports. Si inviertes el orden, aparece un
`ReferenceError` en el primer render.

**Contenido va en `data.js`, comportamiento en `app.js`.** Agregar una malla, una
carrera o un preset no debería tocar `app.js`. Si tienes que escribir un `if` de
tenant en `app.js` para que un dato nuevo funcione, el dato está mal modelado.

Backend: **Supabase** (auth email + Google, RLS activo). Hosting: **Cloudflare Pages**.

## Reglas que no se rompen

**El motor de cálculo es la razón de existir de la app.** Si tocas `ramoAvg`,
`gpa`, `calculateFinalGrade` o las compuertas, corre los tests antes de entregar.
Un promedio mal calculado destruye la confianza más rápido que cualquier bug visual.

**El motor es uno solo y calcula según la universidad.** Lo que cambia de una
universidad a otra se declara como dato, nunca como un `if(tenant===…)` en el
cálculo. Ver "Motor de notas por universidad" en [datos-y-motor.md](datos-y-motor.md).

**Nunca inventes ponderaciones.** Los presets salen de programas oficiales. Si un
dato no está en el documento, se marca como faltante — no se rellena con lo
plausible.

Las pautas que reportan los estudiantes (el consenso) **no son presets** y no se
presentan como del programa. Con 3 personas que coinciden se aplican solas en
ramos vacíos; con 5 (`CONSENSO_CATALOGO`) además se ofrecen en el buscador como
una del catálogo, siempre diciendo "pauta de N estudiantes". Una pauta de
programa manda sobre cualquier consenso.

**El semáforo es semántico.** Verde/ámbar/rojo significan aprobado / al borde /
reprobado. No se tiñen por tema ni por decoración.
El 100% de avance solo significa que el ramo quedó completamente evaluado: se
comunica como cierre y nunca como aprobación o celebración verde.

**Ojo con la especificidad de los campos.** La regla base `input[type=text]`
gana contra una clase sola aunque aparezca antes; un padding especializado usa
`input.clase` o `.contenedor input`, no `!important`.

**La dirección visual es Editorial, con tipografía del sistema (`--font-ui`).**
No se descargan fuentes. Revisa también los estilos inline de `app.js` y las
páginas 404, preguntas, términos y privacidad. Las notas y columnas numéricas
conservan `tabular-nums`. El color del ramo vive en su línea lateral, no tiñe
su nota; el avance de Inicio es un riel neutro con `scaleX`, no un fondo relleno.
Las superficies de Neutro son blancas/casi negras; Papel y Pizarra siguen siendo
preferencias válidas. No cambies el semáforo para armonizar la interfaz.

**Seguir las Human Interface Guidelines de Apple es obligatorio**
(https://developer.apple.com/design/human-interface-guidelines). Decisión de
Lucas del 2026-09-28: la mayoría usa GradeHub desde el iPhone, y las HIG son la
referencia de cómo se espera que se sienta una app ahí. Todo cambio de diseño o
de interacción —una pantalla, un control, un flujo, un texto de la interfaz—
tiene que cumplirlas. Antes de escribirlo, lee lo que dicen para ese caso (la
sección de iOS de cada página), y en la PR di qué guía seguiste. Un cambio
visual que no las cumple no se mergea. Lo que más aplica a una PWA:

- Todo lo que se toca mide al menos 44×44 pt, aunque se vea más chico.
- Texto legible sin zoom y que respete el tamaño que eligió la persona; el
  contraste mínimo es 4,5:1 para texto normal, también en modo oscuro.
- Respeta las áreas seguras (`env(safe-area-inset-*)`): nada importante bajo
  el notch ni bajo la barra de inicio.
- Las hojas (el modal) se cierran de la forma esperada y una acción
  destructiva pide confirmación y se ve como tal.
- El movimiento acompaña, no decora, y respeta `prefers-reduced-motion`.
- Jerarquía clara: una acción principal por pantalla, lenguaje directo.

La única excepción son las otras reglas de esta sección: el semáforo, la
tipografía del sistema y la dirección Editorial se mantienen. Si una guía choca
con una de ellas, no elijas por tu cuenta: dilo en la PR y que decida Lucas.

**`gradehub_v1` es la clave de localStorage.** No se renombra sin migración.

**La `sb_secret_*` de Supabase nunca va en el código.** Solo la `sb_publishable_*`,
que es pública por diseño y está protegida por RLS.

## Antes de entregar cualquier cambio

```bash
# 1. Sintaxis
node -e 'const vm=require("vm"),fs=require("fs");["data.js","app.js"].forEach(f=>new vm.Script(fs.readFileSync(f,"utf8")));console.log("JS OK")'

# 2. CSS balanceado
node -e 'const c=require("fs").readFileSync("styles.css","utf8");const o=(c.match(/\{/g)||[]).length,x=(c.match(/\}/g)||[]).length;console.log("CSS "+o+"/"+x+(o===x?" OK":" MISMATCH"))'

# 3. Tests de lógica (si tocaste el motor o los temas)
npm test

# Uno solo, mientras trabajas
node tests/<archivo>.test.js
```

Si tocas cálculo, escribe un test que compruebe casos concretos — incluyendo los
de compuerta que topan la nota.

**Al mirar un cambio en el navegador, desconfía de lo que ves la segunda vez.**
En el servidor local el `CACHE_NAME` es siempre `gradehub-dev`, así que el
service worker sigue sirviendo el `app.js` de la primera carga aunque lo hayas
editado. Antes de concluir que un cambio "no funciona", comprueba que la página
tiene el código nuevo (por ejemplo, que exista la función que agregaste) y, si
no, borra el registro del service worker y sus cachés y recarga.

**Un test nuevo no se registra en ninguna parte: se corre por existir.** `npm test`
descubre todo `tests/*.test.js` (ver `bin/tests.js`). Antes había que agregarlo a
mano a una cadena de `&&` en `package.json`, y eso fallaba de las dos formas
posibles: todas las ramas editaban la misma línea —un conflicto por PR— y un test
que se olvidaba de registrar simplemente no corría, sin que nada avisara. Pasó:
`tests/arranque.test.js` estuvo en el repo sin ejecutarse porque se perdió al
resolver uno de esos conflictos.

**Un test de mecanismo no se arma con datos del catálogo.** Si lo que pruebas es
cómo se comporta el código, escribe la pauta de ejemplo dentro del test en vez de
sacarla con `presetRamo()`. El catálogo es justo lo que se edita a propósito y
todo el tiempo, así que atarle un test convierte una corrección de contenido en
un fallo lejano. Pasó el 2026-08-31: dos PR verdes por separado dejaron `main`
rojo al juntarse, porque uno cambió una pauta a cuatro evaluaciones y el otro
indexaba la quinta. Buscar por nombre en vez de por índice ayuda también: un
cambio de datos sale como comprobación en rojo y no como `TypeError`.
