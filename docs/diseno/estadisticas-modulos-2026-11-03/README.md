# Estadísticas: módulos existentes de #958

Antes: main `9b07f02`. Después: esta rama, con datos sintéticos. Ningún usuario, nota o dato de producción se consultó.

Se reutiliza `.stat-card` sin modificar su definición: superficie `--card`, borde `--border`, radio de 8 px y relleno de 16 px en los tres contenedores. Encabezados fuera y filas separadas dentro. Prioridades conserva las marcas de los ramos, la lectura «Vas … en lo evaluado» y los medidores. La comparación conserva el nombre «Cómo vas respecto a los demás», incluso con pocos datos. Historial contiene su gráfico, las filas de semestres y el mensaje vacío; no hay tarjetas dentro de tarjetas.

El título de «Tu promedio en el tiempo» va en la PR #963, que sigue abierta. La etiqueta del semestre queda dentro. Estos tres módulos se retiraron de #964 para no duplicarlos; esa PR conserva Inicio, Agenda y el vacío de Ficha.

## Verificación

- Chrome: 375 y 1280 px, claro y oscuro, texto al 100% y 200%, sin desborde horizontal. Bordes de 1 px, radio de 8 px y relleno de 16 px comprobados con estilos calculados.
- Desde el botón real «Editar»: ocultar/restaurar Prioridades, Curso, Historial y Ritmo elimina/restaura también su título sin duplicarlo; reordenar Historial conserva su encabezado junto a su tarjeta.
- Explorar y editar preferencias no cambia ramos ni semestres archivados. Sin SQL, cálculos, pauta, ids ni cambios de `gradehub_v1`.
- Comparación con y sin datos, Historial lleno y vacío, sin `.stat-card` anidadas.
- Profesor y admin: las estadísticas se construyen en `alumnos-evolucion.js`, `graficos-profesor.js` y `admin-estadisticas.js`, con contenedores propios. No usan estas tres piezas. Los cambios de CSS están bajo `#screen-stats`; no duplican sus títulos ni tarjetas y no cambian sus estadísticas.
- `npm test -- --resumen`: 392 tests aprobados; build, sintaxis JS y CSS 3607/3607 aprobados.

HIG: [Lists and tables](https://developer.apple.com/design/human-interface-guidelines/lists-and-tables) para agrupar filas con encabezados, y [Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility) para conservar las acciones y la lectura con texto ampliado.

## Antes y después

| Vista · ancho · tema · texto | Antes | Después |
|---|---|---|
| comparacion-1280-claro · texto 200% | [Ver](antes-comparacion-1280-claro-200.png) | [Ver](despues-comparacion-1280-claro-200.png) |
| comparacion-1280-claro | [Ver](antes-comparacion-1280-claro.png) | [Ver](despues-comparacion-1280-claro.png) |
| comparacion-1280-oscuro · texto 200% | [Ver](antes-comparacion-1280-oscuro-200.png) | [Ver](despues-comparacion-1280-oscuro-200.png) |
| comparacion-1280-oscuro | [Ver](antes-comparacion-1280-oscuro.png) | [Ver](despues-comparacion-1280-oscuro.png) |
| comparacion-375-claro · texto 200% | [Ver](antes-comparacion-375-claro-200.png) | [Ver](despues-comparacion-375-claro-200.png) |
| comparacion-375-claro | [Ver](antes-comparacion-375-claro.png) | [Ver](despues-comparacion-375-claro.png) |
| comparacion-375-oscuro · texto 200% | [Ver](antes-comparacion-375-oscuro-200.png) | [Ver](despues-comparacion-375-oscuro-200.png) |
| comparacion-375-oscuro | [Ver](antes-comparacion-375-oscuro.png) | [Ver](despues-comparacion-375-oscuro.png) |
| comparacion-vacia-1280-claro · texto 200% | [Ver](antes-comparacion-vacia-1280-claro-200.png) | [Ver](despues-comparacion-vacia-1280-claro-200.png) |
| comparacion-vacia-1280-claro | [Ver](antes-comparacion-vacia-1280-claro.png) | [Ver](despues-comparacion-vacia-1280-claro.png) |
| comparacion-vacia-1280-oscuro · texto 200% | [Ver](antes-comparacion-vacia-1280-oscuro-200.png) | [Ver](despues-comparacion-vacia-1280-oscuro-200.png) |
| comparacion-vacia-1280-oscuro | [Ver](antes-comparacion-vacia-1280-oscuro.png) | [Ver](despues-comparacion-vacia-1280-oscuro.png) |
| comparacion-vacia-375-claro · texto 200% | [Ver](antes-comparacion-vacia-375-claro-200.png) | [Ver](despues-comparacion-vacia-375-claro-200.png) |
| comparacion-vacia-375-claro | [Ver](antes-comparacion-vacia-375-claro.png) | [Ver](despues-comparacion-vacia-375-claro.png) |
| comparacion-vacia-375-oscuro · texto 200% | [Ver](antes-comparacion-vacia-375-oscuro-200.png) | [Ver](despues-comparacion-vacia-375-oscuro-200.png) |
| comparacion-vacia-375-oscuro | [Ver](antes-comparacion-vacia-375-oscuro.png) | [Ver](despues-comparacion-vacia-375-oscuro.png) |
| historial-1280-claro · texto 200% | [Ver](antes-historial-1280-claro-200.png) | [Ver](despues-historial-1280-claro-200.png) |
| historial-1280-claro | [Ver](antes-historial-1280-claro.png) | [Ver](despues-historial-1280-claro.png) |
| historial-1280-oscuro · texto 200% | [Ver](antes-historial-1280-oscuro-200.png) | [Ver](despues-historial-1280-oscuro-200.png) |
| historial-1280-oscuro | [Ver](antes-historial-1280-oscuro.png) | [Ver](despues-historial-1280-oscuro.png) |
| historial-375-claro · texto 200% | [Ver](antes-historial-375-claro-200.png) | [Ver](despues-historial-375-claro-200.png) |
| historial-375-claro | [Ver](antes-historial-375-claro.png) | [Ver](despues-historial-375-claro.png) |
| historial-375-oscuro · texto 200% | [Ver](antes-historial-375-oscuro-200.png) | [Ver](despues-historial-375-oscuro-200.png) |
| historial-375-oscuro | [Ver](antes-historial-375-oscuro.png) | [Ver](despues-historial-375-oscuro.png) |
| historial-vacio-1280-claro · texto 200% | [Ver](antes-historial-vacio-1280-claro-200.png) | [Ver](despues-historial-vacio-1280-claro-200.png) |
| historial-vacio-1280-claro | [Ver](antes-historial-vacio-1280-claro.png) | [Ver](despues-historial-vacio-1280-claro.png) |
| historial-vacio-1280-oscuro · texto 200% | [Ver](antes-historial-vacio-1280-oscuro-200.png) | [Ver](despues-historial-vacio-1280-oscuro-200.png) |
| historial-vacio-1280-oscuro | [Ver](antes-historial-vacio-1280-oscuro.png) | [Ver](despues-historial-vacio-1280-oscuro.png) |
| historial-vacio-375-claro · texto 200% | [Ver](antes-historial-vacio-375-claro-200.png) | [Ver](despues-historial-vacio-375-claro-200.png) |
| historial-vacio-375-claro | [Ver](antes-historial-vacio-375-claro.png) | [Ver](despues-historial-vacio-375-claro.png) |
| historial-vacio-375-oscuro · texto 200% | [Ver](antes-historial-vacio-375-oscuro-200.png) | [Ver](despues-historial-vacio-375-oscuro-200.png) |
| historial-vacio-375-oscuro | [Ver](antes-historial-vacio-375-oscuro.png) | [Ver](despues-historial-vacio-375-oscuro.png) |
| prioridades-1280-claro · texto 200% | [Ver](antes-prioridades-1280-claro-200.png) | [Ver](despues-prioridades-1280-claro-200.png) |
| prioridades-1280-claro | [Ver](antes-prioridades-1280-claro.png) | [Ver](despues-prioridades-1280-claro.png) |
| prioridades-1280-oscuro · texto 200% | [Ver](antes-prioridades-1280-oscuro-200.png) | [Ver](despues-prioridades-1280-oscuro-200.png) |
| prioridades-1280-oscuro | [Ver](antes-prioridades-1280-oscuro.png) | [Ver](despues-prioridades-1280-oscuro.png) |
| prioridades-375-claro · texto 200% | [Ver](antes-prioridades-375-claro-200.png) | [Ver](despues-prioridades-375-claro-200.png) |
| prioridades-375-claro | [Ver](antes-prioridades-375-claro.png) | [Ver](despues-prioridades-375-claro.png) |
| prioridades-375-oscuro · texto 200% | [Ver](antes-prioridades-375-oscuro-200.png) | [Ver](despues-prioridades-375-oscuro-200.png) |
| prioridades-375-oscuro | [Ver](antes-prioridades-375-oscuro.png) | [Ver](despues-prioridades-375-oscuro.png) |

Verificación final sobre main `f8b4e3c` (incluye #948, #951 y #959): 392 tests aprobados; build, JS, CSS 3607/3607 y diff aprobados. Se mantiene la base de referencia indicada en las capturas; no se alteran los cambios nuevos de main.
