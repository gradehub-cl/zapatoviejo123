# Línea de tiempo: semáforo y detalle táctil

Datos sintéticos, sin Supabase ni medición. Antes: main `b2a0086`. Después: esta rama. Todas las conexiones externas se bloquean en el navegador.

La cifra de la nota usa `colorClass(nota)` y `getColor(nota)`, que ya ajusta la luminosidad para texto legible en los fondos de GradeHub. El promedio y su flecha no se modifican.

Touch y pen sitúan la notita completa 12 px sobre el trazado, alineada al punto y limitada al ancho de la tarjeta. El cursor sigue en el punto. Es una posición absoluta: no reserva altura ni produce un salto. Los marcos y la tarjeta no recortan el detalle. Mouse y teclado conservan la posición previa junto al punto.

Las capturas de centro y borde usan eventos táctiles reales mediante CDP; el círculo gris es el dedo simulado solo en la captura y no pertenece a la app. La trayectoria es horizontal, conservando el scroll vertical de la página. Se comprobaron el punto elegido, los límites horizontales y la altura idéntica antes/después de mostrar el detalle.

HIG: [Charts](https://developer.apple.com/design/human-interface-guidelines/charts) para consultar valores sin ocultarlos con el gesto, y [Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility) para contraste y acceso equivalente por teclado.

## Contraste medido en Chrome

Nota sobre `--card`; mínimo requerido 4,5:1. No se crearon colores ni variantes nuevas.

| Modo | Nota 3,0 | Nota 4,5 | Nota 6,0 |
|---|---|---|---|
| claro | 8.70:1 | 5.44:1 | 5.46:1 |
| oscuro | 6.26:1 | 13.77:1 | 12.59:1 |

## Capturas a 375 px

| Vista | Antes | Después |
|---|---|---|
| borde-claro-375 | [Ver](antes-borde-claro-375.png) | [Ver](despues-borde-claro-375.png) |
| borde-oscuro-375 | [Ver](antes-borde-oscuro-375.png) | [Ver](despues-borde-oscuro-375.png) |
| linea-claro-375 | [Ver](antes-linea-claro-375.png) | [Ver](despues-linea-claro-375.png) |
| linea-oscuro-375 | [Ver](antes-linea-oscuro-375.png) | [Ver](despues-linea-oscuro-375.png) |
| medio-claro-375 | [Ver](antes-medio-claro-375.png) | [Ver](despues-medio-claro-375.png) |
| medio-oscuro-375 | [Ver](antes-medio-oscuro-375.png) | [Ver](despues-medio-oscuro-375.png) |

Validación: build, sintaxis JS, CSS 3619/3619 y `npm test -- --resumen` (392 tests). Pruebas explícitas de 3,0 reprobado, 4,5 al borde, 6,0 aprobado; touch/pen arriba del trazado; mouse/teclado, cursor, Escape y cancelación conservados. Sin cambios de notas, cálculos, preferencias ni datos guardados.
