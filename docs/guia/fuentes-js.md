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
npm run buscar -- --mapa                         # todos los temas y su orden
```

Por defecto devuelve hasta 8 resultados; `--limite` admite hasta 30. Una función
se muestra en hasta 48 líneas y 240 caracteres por línea; `--lineas` admite hasta
120. `--desde` es relativo al comienzo de la función. Las coordenadas son de la
fuente editable, no del bundle. El índice distingue funciones anidadas, flechas,
datos y llaves dentro de regex/templates. Ignora tildes y mayúsculas. Si el nombre
no es único, pide `--archivo` en vez de elegir. `--json` permite automatizar.

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
