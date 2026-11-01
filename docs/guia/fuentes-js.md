# Fuentes JavaScript por tema

Los siete scripts grandes de raíz son **generados**, ignorados por git y por
`rg`. Se editan sus piezas en `src/`. `src/orden.json` declara el orden exacto;
el ensamblado concatena bytes sin minificar, añadir wrappers, cambiar nombres ni
introducir imports. El navegador conserva sus siete scripts clásicos, con las
mismas URL, ámbito global, hoisting, orden y precache. No hay dependencias nuevas
en el navegador. Acorn es solo de desarrollo, para encontrar símbolos con AST.

## Ir directo al código

```bash
npm ci                                         # instala y ensambla
npm run buscar -- renderAlumnosProfesor          # archivo y rango
npm run buscar -- --ver htmlAnillo               # cuerpo acotado de la función
npm run buscar -- alumnos                        # símbolos, temas y texto
npm run buscar -- "Calificar profesor"           # texto literal, no regex
npm run buscar -- --ver "PRESETS_UC.Termodinámica" # solo la pauta de ese ramo
npm run buscar -- --ver renderRamo --archivo render-main # desambiguar
npm run buscar -- --ver renderRamo --desde 49 --lineas 48
npm run buscar -- renderHome --tests --json
npm run buscar -- admin_reportes --tipo sql       # también css, html, docs
npm run buscar -- "MFA" --docs                     # documentación por tema
npm run buscar -- --archivo styles.css --desde 200 --lineas 20
npm run buscar -- --mapa                          # resumen de carpetas
npm run buscar -- --mapa --archivo alumnos        # rutas de un tema
npm run buscar -- --mapa --detallado              # inventario completo
```

Por defecto devuelve hasta 8 resultados; `--limite` admite hasta 30. Una función
se muestra en hasta 48 líneas y 240 caracteres por línea; `--lineas` admite hasta
120. `--desde` es relativo al comienzo de la función. Las coordenadas son de la
fuente editable, no del bundle. El índice distingue funciones anidadas, flechas,
datos y llaves dentro de regex/templates. Ignora tildes y mayúsculas. Si el nombre
no es único, pide `--archivo` en vez de elegir. `--json` permite automatizar.

Sin consulta, `--archivo` muestra un solo archivo conocido en el mismo límite de
líneas, también SQL, CSS, HTML o Markdown. Si hay ambigüedad, devuelve hasta 8
rutas para elegir, no el listado entero. `--tipo` admite una lista (`js,sql`);
`--docs` equivale a `--tipo docs`. La búsqueda habitual cubre JS, SQL, CSS y HTML;
los tests y la documentación se incluyen solo al pedirlos. `--archivo` filtra
antes de leer y parsear; no hace falta indexar toda la app para abrir una función.
Los inventarios y paquetes de revisión UC quedan fuera de la búsqueda de docs,
pero siguen disponibles al nombrarlos con `--archivo`.

El índice se guarda en `.cache/indice-js.json`, se invalida por contenido y
versión del parser, y se reconstruye automáticamente. No se versiona. No busca
en duplicados generados, `node_modules`, OCR de terceros, `cursos-uc.js` ni
mallas comprimidas. Para esos catálogos, nómbralos explícitamente con `rg`.
No necesitas leer el índice ni mantener una lista de funciones a mano.

## Carpetas

| Fuente | Temas |
|---|---|
| `src/data/` | colores, universidades, carreras, créditos, pautas por universidad, profesores sugeridos |
| `src/engine/` | reglas/puntajes, descartes, ausencias, cálculo final, meta, adaptador |
| `src/app/` | estado/normalización, identidad, catálogo, onboarding, navegación, editores, OCR, consenso, agentes, ajustes, historial, simulación, calendario, Canvas, iOS |
| `src/app-session/` | cliente, acceso, errores, correo/clave, OAuth, aislamiento de caché, entrada/salida, sync, legal, MFA |
| `src/marketplace/` | perfil/logo, catálogo, campañas/métricas, editor, recomendación, admin, alumnos, encuestas |
| `src/render-main/` | Inicio, ficha, evolución, estadísticas, historias del semestre, ficha/calificación del profesor |
| `src/render-agenda/` | orden, tarjetas, interacciones, resumen, pantalla |

Las piezas son unidades de edición, no módulos ES independientes. Una función
grande se mantiene completa; un catálogo literal también. No se cortan por una
cantidad arbitraria de líneas. Los catálogos ya generados/compactos, scripts
pequeños, terceros y funciones del servidor conservan su ubicación.

## Editar y probar

```bash
npm run js:watch              # recompila al guardar src/; otra terminal sirve la web
npm run build                 # una sola vez, sin instalar dependencias
npm run build -- --check      # verifica sin escribir ni regenerar
npm test                     # ensambla ANTES de ejecutar toda la suite
npm test -- --resumen         # mismos tests; detalle en .cache/tests.log
node tests/mi-test.test.js    # después de build, si quieres correr solo uno
```

También `npm ci`, `npm run deploy` y `bash bin/preparar-ios.sh` ensamblan. Las
fuentes no se publican ni se empaquetan en iOS. `index.html` y `sw.js` conservan
los assets y el sellado existentes. Para servir localmente: después de `npm ci`,
`python3 -m http.server 8080`; usa watch mientras editas. Comprueba la versión
del código si el service worker sigue entregando una copia anterior.

Watch revisa metadatos cada medio segundo, sin depender de los límites de
observadores del sistema.

El compilador valida todas las fuentes y salidas antes de escribir. Rechaza
fuentes sin declarar, repetidas, faltantes, con sintaxis rota y rutas inválidas.
Cada salida se reemplaza mediante rename y solo si cambió. No sobreescribe un
bundle modificado a mano: pasa primero ese cambio a `src/`. Si quieres descartar
**solo los generados** y reconstruirlos, `npm run build -- --recrear` lo hace
explícitamente. `.cache/js-generados.json` guarda sus hashes para esa protección.

Al agregar una fuente, regístrala en `src/orden.json` en la posición correcta.
Al mover código entre scripts clásicos, revisa sus dependencias y añade una
prueba de arranque: cambiar el orden entre scripts sí puede cambiar la app.

## Ramas anteriores a la separacion

Después de actualizar tu rama con main, git puede mostrar un conflicto
modificado/eliminado en un JS de raíz. **No aceptes eliminarlo sin trasladar tus
cambios**, ni lo vuelvas a versionar. Busca la función equivalente en `src/`,
aplica allí el cambio de tu rama y revisa el diff contra su versión anterior.
Luego quita el bundle del índice con `git rm --cached <archivo.js>`, reconstruye
con `npm run build -- --recrear` y corre la suite. Verifica que todo el cambio de
tu PR esté en las fuentes; los generados nunca son la fuente de verdad.

Los carriles por persona se conservan sobre `src/<nombre-del-script>/`; el
contenido de `src/data/` sigue repartido por universidad. Esta reorganización no
cambia el modelo, almacenamiento, permisos, SQL, métricas ni cálculos. Cuentas
existentes y nuevas reciben el mismo código de la app.

## Entrada de sesión sin ruido

`bash bin/estado.sh` comprueba git, compila y corre la suite completa. Su salida
resume cambios y limita PRs/commits; `--completo` amplía los listados y muestra
tamaños. Guarda la salida del test en `.cache/estado-tests.log`, también si falla,
y devuelve código de error: lee ese registro en vez de ejecutar otra vez.

`--rapido` omite la suite y lo anuncia como **SKIP**, nunca PASS. `--sin-red`
no llama a GitHub ni actualiza remotos y marca las referencias como no verificadas.
Ninguna de estas opciones sustituye los chequeos de entrega de AGENTS.md.

La documentación de contexto empieza en `docs/contexto.md`: abre solo el tema
necesario. Sus antecedentes conservan decisiones y evidencias, con fechas y
estados históricos que se contrastan con git antes de convertirlos en trabajo.
