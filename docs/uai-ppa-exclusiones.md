# UAI: exclusiones con un solo acumulado

Reemplaza #950 desde `origin/main` (`2aa43af`), ya con el cierre de #937. No se incorpora la rama antigua ni su función `resumenPromedioAcademico`.

Fuente primaria: [Reglamento de programas de pregrado UAI 2026](https://uai.cdn7pm.net/documentos/reglamento-programas-de-pregrado-2026.pdf), artículo 28, pp. 7–8. PPP y PPA ponderan por créditos y excluyen Educación Física, extraprogramáticas y convalidaciones. Solo el PPA excluye además el intento reprobado cuando la misma asignatura se aprueba posteriormente. Aprobar antes de reprobar no elimina esa reprobación.

## Un cálculo del acumulado

La política es un dato de `GH_REGLAS_NOTA_POR_TENANT`. No hay condiciones por nombre de universidad en el algoritmo.

`promedioAcumuladoCierre(historial)` es el único punto que calcula el acumulado. Resuelve cada nota con `notaRamoParaResumen`, dentro del contexto de su semestre, y pondera con `gpa`. Con política selecciona los intentos vigentes dentro de esa misma función; sin política conserva la fórmula anterior de #937, sin añadir redondeos ni exclusiones. Estadísticas sigue llamando solo a `promedioAcumuladoCierre(validos)`.

Para reconocer una recursada usa la sigla o la clave estable del origen y un semestre identificable. No compara nombres, no deduce períodos y no quita intentos cuya identidad o cronología no se conoce. Una aprobación excluida por clasificación no elimina una reprobación anterior. La final oficial mantiene su prioridad y los cierres incompletos conservan el tratamiento de #937. Sin créditos conocidos no se presenta un promedio simple como PPA.

`ramosDelPromedio` aplica únicamente las tres clasificaciones al PPP. El intento reprobado sigue en su semestre: **2,0 → 6,0 produce PPA 6,0 y PPP 2,0 en el primer semestre**. Los semestres con política se recalculan al leer, sin modificar su caché persistida.

## Cuentas existentes

`exclusionPromedio` es opcional en el ramo. Se declara en Editar ramo y en ambas vías de final histórica: el editor antiguo de `avgOverride` y la nota oficial del cierre de #937. Ausente equivale a incluido; volver a «Incluido» elimina solo esa propiedad. No se infiere por nombres como «Educación Física».

No se modifica `normalize`, ni la forma de `gradehub_v1`, ni sus identificadores, categorías, notas o créditos. El spread y las copias JSON existentes conservan la propiedad cuando la persona la declara. No hay migración, borrado de intentos ni SQL.

Como no es posible detectar una clasificación que la persona aún no marcó sin adivinar por nombre, el historial con esta política se presenta siempre como **PPA estimado del historial** y pide revisar las exclusiones. No certifica el PPA del portal ni presupone que el historial esté completo.

Referencia de alcance, no un conteo actualizado: la consulta agregada de solo lectura del **2026-11-02** encontró **35 cuentas UAI activas y 0 con historial archivado**, sin notas ni identidades. El dato no significa que 35 personas tuvieran un PPA incorrecto. La política se aplica al próximo cierre o al historial que cada persona agregue; los ramos no clasificados siguen incluidos.

## Verificación

- Reproductor previo sobre main: el único acumulado entregaba 4,0 para 2,0 → 6,0; el test falla antes y entrega 6,0 tras el cambio.
- Historiales sintéticos comparan contra la fórmula congelada de #937 para UC, UAndes, UDD y FEN, incluidos créditos desconocidos/cero, notas oficiales y cierres incompletos. Igualdad numérica exacta sin política.
- Exclusiones explícitas, recursada posterior, orden del array, períodos desconocidos, homónimos sin código, final oficial, lectura inmutable y normalización sin campos nuevos por defecto.
- Chrome a 375 px, claro/oscuro: Editar ramo, guardar y reabrir sin cambiar sus evaluaciones; también las dos vías de edición histórica. Solo datos sintéticos.

HIG: [Pop-up buttons](https://developer.apple.com/design/human-interface-guidelines/pop-up-buttons), selector de opciones excluyentes con etiqueta, valor inicial útil («Incluido») y control nativo de al menos 44 pt. Sin cambios en estilos compartidos ni en el Wrapped.
