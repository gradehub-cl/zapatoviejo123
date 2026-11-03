# Inicio y Agenda: secciones con contorno

Capturas con datos sintéticos. Antes: main `f3518e2` (incluye #958). Después: esta rama. No se usaron cuentas ni notas reales. La rama final se actualizó sobre main `f8b4e3c` y conserva intactos #960 y #961; las capturas de referencia anteriores corresponden a `f3518e2`.

Base: main f3518e2, después del merge de #958. Cada módulo conserva sus datos, acciones y orden. En Mis ramos los hijos siguen directamente bajo home-ramos, como exige el arrastre existente. No se cambia Clases particulares ni el diseño de los anuncios.

Sin cambios de estado persistido, pauta, ids, cálculos o permisos. Las interacciones de edición y reordenamiento siguen llamando a los guardadores existentes.

HIG: [Lists and tables](https://developer.apple.com/design/human-interface-guidelines/lists-and-tables), [Charts](https://developer.apple.com/design/human-interface-guidelines/charts) y [Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility): agrupación legible, valores accesibles, controles de 44 pt y texto ampliado.

| Pantalla · ancho · tema · texto | Antes | Después |
|---|---|---|
| agenda-1280-claro · texto 200% | [Ver](antes-agenda-1280-claro-200.png) | [Ver](despues-agenda-1280-claro-200.png) |
| agenda-1280-claro | [Ver](antes-agenda-1280-claro.png) | [Ver](despues-agenda-1280-claro.png) |
| agenda-1280-oscuro · texto 200% | [Ver](antes-agenda-1280-oscuro-200.png) | [Ver](despues-agenda-1280-oscuro-200.png) |
| agenda-1280-oscuro | [Ver](antes-agenda-1280-oscuro.png) | [Ver](despues-agenda-1280-oscuro.png) |
| agenda-375-claro · texto 200% | [Ver](antes-agenda-375-claro-200.png) | [Ver](despues-agenda-375-claro-200.png) |
| agenda-375-claro | [Ver](antes-agenda-375-claro.png) | [Ver](despues-agenda-375-claro.png) |
| agenda-375-oscuro · texto 200% | [Ver](antes-agenda-375-oscuro-200.png) | [Ver](despues-agenda-375-oscuro-200.png) |
| agenda-375-oscuro | [Ver](antes-agenda-375-oscuro.png) | [Ver](despues-agenda-375-oscuro.png) |
| despues-agenda-1280-claro · texto 200% | [Ver](antes-despues-agenda-1280-claro-200.png) | [Ver](despues-despues-agenda-1280-claro-200.png) |
| despues-agenda-1280-claro | [Ver](antes-despues-agenda-1280-claro.png) | [Ver](despues-despues-agenda-1280-claro.png) |
| despues-agenda-1280-oscuro · texto 200% | [Ver](antes-despues-agenda-1280-oscuro-200.png) | [Ver](despues-despues-agenda-1280-oscuro-200.png) |
| despues-agenda-1280-oscuro | [Ver](antes-despues-agenda-1280-oscuro.png) | [Ver](despues-despues-agenda-1280-oscuro.png) |
| despues-agenda-375-claro · texto 200% | [Ver](antes-despues-agenda-375-claro-200.png) | [Ver](despues-despues-agenda-375-claro-200.png) |
| despues-agenda-375-claro | [Ver](antes-despues-agenda-375-claro.png) | [Ver](despues-despues-agenda-375-claro.png) |
| despues-agenda-375-oscuro · texto 200% | [Ver](antes-despues-agenda-375-oscuro-200.png) | [Ver](despues-despues-agenda-375-oscuro-200.png) |
| despues-agenda-375-oscuro | [Ver](antes-despues-agenda-375-oscuro.png) | [Ver](despues-despues-agenda-375-oscuro.png) |
| ficha-1280-claro · texto 200% | [Ver](antes-ficha-1280-claro-200.png) | [Ver](despues-ficha-1280-claro-200.png) |
| ficha-1280-claro | [Ver](antes-ficha-1280-claro.png) | [Ver](despues-ficha-1280-claro.png) |
| ficha-1280-oscuro · texto 200% | [Ver](antes-ficha-1280-oscuro-200.png) | [Ver](despues-ficha-1280-oscuro-200.png) |
| ficha-1280-oscuro | [Ver](antes-ficha-1280-oscuro.png) | [Ver](despues-ficha-1280-oscuro.png) |
| ficha-375-claro · texto 200% | [Ver](antes-ficha-375-claro-200.png) | [Ver](despues-ficha-375-claro-200.png) |
| ficha-375-claro | [Ver](antes-ficha-375-claro.png) | [Ver](despues-ficha-375-claro.png) |
| ficha-375-oscuro · texto 200% | [Ver](antes-ficha-375-oscuro-200.png) | [Ver](despues-ficha-375-oscuro-200.png) |
| ficha-375-oscuro | [Ver](antes-ficha-375-oscuro.png) | [Ver](despues-ficha-375-oscuro.png) |
| inicio-1280-claro · texto 200% | [Ver](antes-inicio-1280-claro-200.png) | [Ver](despues-inicio-1280-claro-200.png) |
| inicio-1280-claro | [Ver](antes-inicio-1280-claro.png) | [Ver](despues-inicio-1280-claro.png) |
| inicio-1280-oscuro · texto 200% | [Ver](antes-inicio-1280-oscuro-200.png) | [Ver](despues-inicio-1280-oscuro-200.png) |
| inicio-1280-oscuro | [Ver](antes-inicio-1280-oscuro.png) | [Ver](despues-inicio-1280-oscuro.png) |
| inicio-375-claro · texto 200% | [Ver](antes-inicio-375-claro-200.png) | [Ver](despues-inicio-375-claro-200.png) |
| inicio-375-claro | [Ver](antes-inicio-375-claro.png) | [Ver](despues-inicio-375-claro.png) |
| inicio-375-oscuro · texto 200% | [Ver](antes-inicio-375-oscuro-200.png) | [Ver](despues-inicio-375-oscuro-200.png) |
| inicio-375-oscuro | [Ver](antes-inicio-375-oscuro.png) | [Ver](despues-inicio-375-oscuro.png) |

## Comprobaciones de navegador

375/1280 px, claro/oscuro y texto 100/200%; arrastre real con mouse entre filas y reversión con teclado. Solo el gesto de ordenar cambia el orden, conservando íntegro cada ramo. Estadísticas se separó de esta PR por indicación de Lucas: sus módulos van en una PR nueva desde main y el título del gráfico en #963. Esta PR conserva solo Inicio, Agenda y el estado vacío de Ficha.

Además de las secciones pedidas, se agruparon las prioridades, Pendientes y Rendidas de Agenda; en Inicio los encabezados de Próxima evaluación/Ramo en riesgo/Última nota pasan fuera de su tarjeta. Los estados sin evaluaciones de Ficha y Todo al día de Agenda reciben contorno. Los rangos y selectores se conservan.

Verificación final sobre main `f8b4e3c` (incluye #948, #951 y #959): 392 tests aprobados; build, JS, CSS 3621/3621 y diff aprobados. Se mantiene la base de referencia indicada en las capturas; no se alteran los cambios nuevos de main.
