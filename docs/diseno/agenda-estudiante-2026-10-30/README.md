# Agenda del estudiante · maqueta aprobada, etapa 2 de 5

Implementación preparada después de Inicio (#910). Esta etapa solo cambia la presentación de Agenda. No requiere SQL.

## Qué cambia y por qué

| Antes | Ahora | Criterio aplicado |
| --- | --- | --- |
| «Qué se viene», resumen semanal y «Tus prioridades» competían antes de la primera evaluación. | Un título, una línea de resumen y el control de orden. | HIG Typography: jerarquía y lectura rápida. |
| Recomendado era el orden inicial; el peso podía dominar sobre el nombre de la evaluación. | Fecha por defecto, evaluación y ramo primero, cercanía como cifra principal y peso secundario. «Tu foco ahora» se conserva en Recomendado. | HIG Segmented controls: tres vistas relacionadas, selección explícita. |
| La alerta repetía una explicación larga en una caja amarilla. | Medidor original de GradeHub, con cifra y exigencia; «En lo pendiente» indica que es la meta del ramo completo. | HIG Color y Accessibility: color semántico acompañado por cifra y palabras. |
| El selector perdía el foco al repintarse. | El foco vuelve a la opción elegida, sin solicitar un desplazamiento. | HIG Buttons y Accessibility: teclado y foco visible. |

Tarjetas grandes y superficies internas sin borde, según la dirección Racional / Whoop / bozu aprobada. La tipografía sigue siendo `--font-ui`. El acento procede del tema; la fecha usa una mezcla del acento con el texto para mantener contraste en los fondos Papel y Pizarra. El semáforo conserva sus tokens.

El medidor utiliza **`htmlMedidorNota` sin modificarlo**: degradado y raya originales. Su SVG sube 6 px respecto de la cifra, como en la última corrección de la maqueta. En un caso imposible muestra **«— · Sin salida»**, con el indicador en el extremo de 7,0, igual que Estadísticas. No muestra una nota inventada por encima de la escala.

El rótulo de peso variable pasa de «Peso variable · grupo 70%» a «Parte del 70% de Informes»: no atribuye ese 70% a cada nota del grupo. Los pesos y las metas siguen saliendo de los mismos cálculos.

## Cuentas existentes

- No cambia `S`, `gradehub_v1`, notas, fechas, pesos, reglas de aprobación ni datos del servidor. No hay migración ni SQL.
- Fecha es una preferencia inicial de la sesión. Recomendado y Peso conservan su ordenamiento existente y no se persisten.
- Se conservan Después, Pendientes, Ya rendidas, sus desplegables, detalles de evaluación y acciones de abrir ramo, completar nota y corregir fecha.
- El medidor aparece con la elegibilidad del aviso anterior y una sola vez por ramo. No agrega avisos a ramos que ya no los tenían.
- Sin ramos o sin fechas se mantienen las acciones actuales. Al quedar vacía la cuenta, el resumen anterior se limpia.
- Aunque la próxima evaluación sea en dos semanas, el selector sigue disponible.

## Capturas sintéticas

Reloj fijo: 30 de octubre de 2026, en America/Santiago. Nombres, pautas, pesos y notas son fixtures inventados para esta revisión; no se consultaron cuentas ni datos reales y no se enviaron eventos externos.

| Pantalla | Antes | Después |
| --- | --- | --- |
| Celular · claro | [375](antes-375-claro.png) | [375](despues-375-claro.png) |
| Celular · oscuro | [375](antes-375-oscuro.png) | [375](despues-375-oscuro.png) |
| Computador · claro | [1280](antes-1280-claro.png) | [1280](despues-1280-claro.png) |
| Computador · oscuro | [1280](antes-1280-oscuro.png) | [1280](despues-1280-oscuro.png) |

Texto al 200%: [celular claro](despues-375-claro-texto200.png), [celular oscuro](despues-375-oscuro-texto200.png), [computador claro](despues-1280-claro-texto200.png), [computador oscuro](despues-1280-oscuro-texto200.png). En celular, el control se dispone verticalmente para conservar las etiquetas completas.

Recomendado: [celular claro](recomendado-375-claro.png), [celular oscuro](recomendado-375-oscuro.png), [computador claro](recomendado-1280-claro.png), [computador oscuro](recomendado-1280-oscuro.png).

Otros estados: [sin ramos](cuenta-sin-ramos-375-oscuro.png), [sin fecha](cuenta-sin-fecha-375-oscuro.png), [próxima fuera de la semana](cuenta-sin-semana-375-oscuro.png), [sin salida](cuenta-imposible-375-oscuro.png).

## Validación

- `npm run build`; comprobaciones JS y llaves CSS de AGENTS.md; `git diff --check`.
- `npm test`: **365 archivos de prueba aprobados**.
- Chrome real, a 375 y 1280 px, claro y oscuro: orden Fecha/Recomendado/Peso, apertura y cierre de detalles con Enter, foco conservado, controles de orden de al menos 44 × 44 px, cifra dentro del medidor y ausencia de desborde horizontal al 200%.
- `JSON.stringify(S)` idéntico antes y después de cambiar el orden en los tres modos.
- Contraste del texto de filtros, tarjetas y filas afectadas, en los fondos Neutro/Papel/Pizarra: mínimo medido **4,82:1** en claro y **5,41:1** en oscuro. Se conserva la adaptación de movimiento reducido existente; las tarjetas no se trasladan al pulsar.
- Se actualizaron las expectativas de copy y presentación de cuatro tests existentes: `agenda-aviso-ramo`, `agenda-orden-siempre`, `agenda-peso-evaluacion` y `pendientes-agenda`. Se conservan las pruebas de cálculo, peso individual, no duplicación y orden de pendientes.

## Guías Apple aplicadas

- [Segmented controls](https://developer.apple.com/design/human-interface-guidelines/segmented-controls): opciones relacionadas, anchos iguales y selección visible.
- [Buttons](https://developer.apple.com/design/human-interface-guidelines/buttons): botones nativos, controles de 44 pt y acciones de detalle conservadas.
- [Typography](https://developer.apple.com/design/human-interface-guidelines/typography): jerarquía de evaluación, fecha y peso; fuente del sistema y cifras tabulares.
- [Color](https://developer.apple.com/design/human-interface-guidelines/color) y [Dark Mode](https://developer.apple.com/design/human-interface-guidelines/dark-mode): acento del tema, colores de exigencia semánticos y contraste en ambas apariencias.
- [Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility): nombre accesible del medidor, foco visible, texto grande, teclado y movimiento reducido.

No se detectó un conflicto nuevo entre esas guías y las decisiones aprobadas para esta etapa. El medidor original se conserva por instrucción expresa de Lucas.
