# Modelo de datos, motor y temas

> Detalle de [AGENTS.md](../../AGENTS.md). Léelo antes de tocar el modelo `S`, un ramo, compuertas, el motor por universidad, cuentas de profesor, el promedio general o los temas.

## Modelo de datos

```js
S = { ramos, userName, careerSemestre, generacion, verano, carrera, tenant,
      onboardingDone, tipoCuenta, historial, sortMode }

ramo = {
  id, nombre, color,
  creditos,          // SCT — si TODOS los ramos lo tienen, el promedio se pondera
  seccion,           // entero 1–999 o null; opcional, se escribe en Editar ramo
  origen,            // {tenant, carrera} si vino del catálogo; null si es manual
  categorias: [{ id, nombre, peso, fecha, slots, directNota, notas: [] }],
  gates: []
}
```

`slots` declara cuántas casillas espera una categoría. El motor deriva hojas
pendientes para las casillas sin nota —nunca se guardan en `S`—, para que metas
y avance no den por cerrado un 70% con un solo informe. Sin `slots`, no se
inventa cuántas evaluaciones faltan.

### Compuertas

```js
// Una evaluación bajo su mínimo topa la nota final
{ type:'min_grade_required', catId, min: 3.0, cap: 3.9 }

// El promedio de un CONJUNTO bajo su mínimo topa la final.
// cap:'self' → el tope es el promedio del propio grupo.
// Modela la regla FEN "la nota final es la más baja entre los dos requisitos".
{ type:'group_min', catIds: [...], min: 4.0, cap: 'self' }

// exacto:true → el mínimo se compara SIN aproximación: 2,96 no es 3,0.
// Sin él, el mínimo se redondea a la décima como la nota final (3,95 cumple 4,0).
// Lo usa el art. 27 UAndes: presentación ≥ 3,0 sin aproximación para dar examen.
{ type:'group_min', catIds: [...], min: 3.0, cap: 'self', exacto: true }
```

En un preset de `data.js` la compuerta de grupo se escribe en `grupos`
(`{nombre, evals:[nombres], min, cap, exacto}`) y la de una evaluación como
`{min, cap, exacto}` en su fila. `presetRamo` las copia al ramo.

### Motor de notas por universidad

Hay **un solo motor** (`engine.js`) y cada universidad le dice cómo calcular. Las
reglas viven en dos niveles, según de quién son:

| Nivel | Qué | Dónde | Ejemplo |
|---|---|---|---|
| Universidad | Escala, nota de aprobación y cómo el promedio se vuelve nota oficial | `GH_REGLAS_NOTA_POR_TENANT` en `engine.js` | UAndes: a la centésima y después a la décima |
| Ramo | Pesos, casillas, descartes, compuertas, eximición, recuperativo | el preset del ramo en `data.js` | "presentación ≥ 3,0 sin aproximación para dar examen" |

- **Sin entrada, la regla común:** 1 a 7, aprueba con 4,0, a la décima. FEN, UC,
  UAI y UDD la usan (la UDD por su art. 35, que remite la aproximación a un
  instructivo no publicado: ver `docs/mallas-udd.md`). Una universidad nueva
  hereda esa y solo declara lo que cambia,
  **con el artículo de su reglamento al lado**. No se agrega una regla por
  parecido con otra universidad.
- **Vive en `engine.js` y no en `data.js`** porque el servidor MCP calcula con ese
  archivo solo. Si la regla estuviera afuera, el agente conectado calcularía
  distinto que la app.
- **La universidad la elige el tenant de la cuenta:** `S.tenant` en la app y
  `estado.tenant` en el MCP. Ambos se la pasan a `gh_crearCalculoRamo` como
  dependencia `tenant`.
- **Nada redondea una nota final a mano.** Todo pasa por `notaFinalOficial`
  (app) o `gh_notaOficial` (motor), y la nota necesaria resuelve contra
  `gh_bordeOficial`: 3,95 con la regla común, 3,945 en la UAndes
  (3,946 → 3,95 → 4,0).
- **Una regla de reglamento que solo aplica a ramos con cierta estructura** (por
  ejemplo, "para dar examen") no se infiere por nombre de categoría: va como
  compuerta en el preset de cada ramo, que es lo que el ramo guarda y el MCP
  lee tal cual.

Hoy: UAndes declara `rounding:{decimals:1,previo:2}` (Reglamento del Alumno,
art. 22). Sus normativas por facultad (exámenes 70/30 en Salud, eximición en
Medicina, etc.) se cargan como reglas de cada pauta, no del tenant.

### Cuentas de estudiante y de profesor

`S.tipoCuenta` es `'estudiante'` o `'profesor'` (#697). Viaja en `user_ramos` con
el resto de `S`, y `normalize` deja `'estudiante'` cuando no viene: así quedaron
todas las cuentas anteriores, sin migración. Se pregunta con `esCuentaProfesor()`,
no comparando el campo a mano.

- **Una cuenta de profesor no estudia en GradeHub.** Lo que es de estudiante
  —ramos, notas, promedios, `curso_notas`, consenso, recomendaciones, widgets—
  no corre ni se muestra para ella. Si agregas algo de estudiante, ponle esa
  guarda en la función que lo hace, no en quien la llama.
- **Ser profesor aprobado es otra cosa:** vive en `tutor_perfiles.estado` y se
  pregunta con `esProfesorAprobado()`. Hay cuentas de estudiante que además son
  profesores aprobados (las de Lucas y Martín) y siguen viendo todo lo de
  estudiante. No confundas las dos preguntas.
- **El tipo se elige una vez.** Cambiarlo es una acción del equipo, con SQL
  revisado por Lucas, nunca algo que la app haga sola.

### Promedio general

Se pondera por créditos **solo si todos los ramos con nota los tienen**. Si alguno
falta, cae a promedio simple. Mezclar daría un número engañoso.

## Temas

`GRADEHUB_THEME` conserva la identidad turquesa por defecto. `ACENTOS` cambia
solo la identidad visual; `FONDOS` define superficies y texto para claro y
oscuro; `SEMAFORO` conserva el significado académico. No los mezcles: elegir un
fondo o acento no puede cambiar aprobado, al borde o reprobado.

`oculto:true` en `TENANTS` saca una universidad del selector sin borrar nada.
**Hoy no hay ninguna oculta**: se ofrecen FEN, UC, UAI, UAndes y UDD. Decía lo
contrario hasta el 2026-09-17 y mandó a encender algo que ya estaba encendido.
Lo que las separa no es el selector sino cuánto contenido tienen detrás:

| | Carreras declarables | Mallas | Ramos únicos | Con pauta |
|---|---|---|---|---|
| UC | 71 | 2 (ING-PC, COM) | 49 en malla + catálogo completo | 45 |
| FEN | 3 | 3 | 88 | 12 |
| UAI | 23, todas con malla | 23 | 530 | 6 |
| UAndes | 34, todas menos Arquitectura con malla | 33 | 869 | 44 (cursos PEG) |
| UDD | 46 (una por mención o sede donde la malla cambia), 42 con malla | 42 | 1.175 | 23 (Psicología y Arquitectura) |

**Una pauta que deja la mitad o más del ramo en grupos sin cantidad** (por
ejemplo "Evaluaciones sumativas 60%" sin decir cuántas) no se carga ni se
anuncia desde el 2026-09-25 (`pautaPresetSuficiente` en app.js, decisión de
Lucas a partir de Cálculo III). Al decidirlo eran 28 de la UC —Cálculo III, casi
todo Comercial y doce teológicos— y ninguna de FEN ni la UAI. El dato sigue en
`data.js`: si se transcribe cuántas evaluaciones lleva cada grupo, vuelve sola.
En la interfaz ya no se dice "pauta oficial": se dice "con pauta".

La UAI no publica siglas ni créditos de sus asignaturas, así que sus ramos no
ponderan el promedio por créditos y el consenso de reportes los agrupa por
nombre. Sus programas viven en Webcursos, detrás de sesión: la única vía a
escala es que cada estudiante se los pase a su agente.
