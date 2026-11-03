# Antes y después por alumno y ramo

Pautas y alumnos sintéticos. Sin consultas reales ni SQL.
Base de comparación: `0625f5b` de main.

## Reproductor

Una cuenta tiene dos ramos, con dos evaluaciones comparables antes y dos después
en cada uno. La referencia del ramo es 4,0 en todas las evaluaciones:

| Ramo | Antes | Después | Cambio frente al ramo | Inicio |
|---|---|---|---|---|
| Álgebra sintética · TST101 | 3,0 / 3,0 | 5,0 / 5,0 | +2,0 | 15 sep |
| Física sintética · TST102 | 5,0 / 5,0 | 3,0 / 3,0 | −2,0 | 1 oct |

Antes se generaba una sola comparación para esa persona y su cambio era cero.
Ahora son dos filas, con sus cifras y cortes propios. El resumen cuenta dos
pares comparables, uno que mejoró y una mediana de cero: se calcula entre +2,0 y
−2,0, sin borrar los dos cambios antes de obtener la mediana.

La leyenda distingue **1 alumno en 2 ramos** del número de pares usados por la
mediana y por «Pares que mejoraron». Con dos alumnos en el mismo ramo, el ramo
se cuenta una sola vez; universidades diferentes no se mezclan en esa cuenta.

## Implementación y cuentas existentes

`metricasAlumnoRamoPanel` toma un solo ramo y su `inicioRamoPanel` y delega las
cuentas existentes a `metricasAlumnoPanel`. El grupo consume esos cortes por
ramo. El helper de alumno conserva el listado completo para el CSV por
evaluación, que necesita todas sus notas y fechas.

- Se mantiene `MIN_EVALS_COMPARACION` en cada par: un ramo con pocas notas no
  toma prestadas las de otro para mostrar un cambio.
- Las filas sin comparables también aparecen, con guiones y la explicación de
  qué falta. Sin ramos compartidos se muestra el estado vacío.
- Tocar una fila abre el ramo indicado de la ficha del alumno.
- El CSV de resumen ya tenía «Ramo» como segunda columna y una fila por par.
  Conserva las 14 columnas y su orden; ahora comparte el mismo corte por ramo
  que la comparación visual. El CSV detallado por evaluación conserva su uso.
- No se modifican notas, promedios académicos, fechas ni ids. No se alteran los datos guardados de
  `S`, localStorage ni Supabase; no hay migración. Las cuentas existentes ven
  sus ramos separados al cargar el panel y sus estadísticas pueden cambiar por
  la unidad de análisis corregida.

## Validación

- Test con los dos ramos opuestos: falla antes del arreglo (una fila en lugar de
  dos) y pasa después.
- Cuatro tests de mecanismo: filas opuestas con fechas propias, mínimo por par y
  ausencia total de comparaciones, conteo de alumnos/ramos y mediana por pares,
  CSV con mismo orden y dos cambios de signos opuestos.
- `npm run build`, JS, balance CSS, vocabulario y `git diff --check` aprobados.
- `npm test -- --resumen`: **394 archivos de tests aprobados**.
- Navegador real con RPC simuladas y red externa bloqueada: 16 capturas en
  375/1280 px, claro/oscuro y texto al 200%; sin desborde ni errores JS.
- Se verifican altura y ancho táctiles de al menos 44 px, sigla con
  `tabular-nums` y apertura de la segunda fila en su ramo correcto.

[Filas móvil oscuro](filas-375-oscuro.png) ·
[Filas escritorio claro](filas-1280-claro.png) ·
[Filas móvil claro 200%](filas-375-claro-200.png) ·
[Resumen escritorio oscuro](resumen-1280-oscuro.png)

HIG: [Lists and tables](https://developer.apple.com/design/human-interface-guidelines/lists-and-tables).
Se conserva la fila completa como acción, con jerarquía de nombre, ramo y
contexto, texto que puede ocupar más de una línea y separación Editorial fina.
Los dos estilos nuevos solo presentan el ramo/inicio y las cifras tabulares de
la sigla; no cambian las superficies ni los colores existentes.
