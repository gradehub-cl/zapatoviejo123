# Ficha del ramo · maqueta aprobada, etapa 3 de 5

La entrega original sigue en `codex/ficha-racional-estudiante`. Por instrucción de Lucas del 2026-11-02, esta etapa se abre ahora en `codex/ficha-estudiante-pr`, sobre Agenda (#944); no se mergea antes de ella. Inicio (#910) ya está mergeado. No requiere SQL.

## Cambios

- La meta numérica utiliza `htmlMedidorNota` original, con su degradado y raya. El arco sube 6 px respecto de la cifra, como en la última corrección aprobada. Conserva el valor de `notaNecesariaParaAprobar`, la condición «en cada evaluación pendiente» y la distinción de cátedra cuando corresponde.
- Dos posiciones revisables: junto al promedio o debajo. La rama usa «al lado» de manera provisional; la clase de presentación `medidor-debajo` permite capturar la otra sin guardar preferencias ni cambiar datos.
- «Simular» comparte su bloque con Faltas (solo al activarlas) y Décimas/bonus (solo si la pauta trae la regla). «Editar evaluaciones» queda al pie de la lista y en «⋯». Se conserva el botón «⋯» y los accesos de detalle de cada evaluación.
- Una casilla pendiente dice «+ Nota». Al tocarla, esa misma casilla se convierte en un campo, recibe el foco y solicita teclado decimal. Enter o salir guarda; salir vacío devuelve «+ Nota» sin crear, borrar ni guardar nada. Escape cancela. Una entrada inválida no se persiste.
- Se reutilizan `parseNota`, `setSlotNota` y `setDirectNota`: no hay un nuevo cálculo ni una nueva operación de persistencia. Las letras conceptuales UC siguen siendo aceptadas por el validador; los campos de notas ya ingresadas y los editores de detalle conservan su teclado anterior.
- Las categorías son superficies grandes sin borde; las subnotas son filas con separadores, sin tarjetas anidadas. El promedio y el relleno usan los colores semánticos existentes.
- Todas las pistas ocupan el mismo ancho y representan el ramo completo. La banda de cada categoría ocupa su peso vigente; lo evaluado está relleno y lo pendiente, rayado. Los pendientes vienen de `emptyLeaves` del motor, no de contar categorías con alguna nota.
- Las casillas sin nota dicen «Pendiente», acompañadas de su fecha cuando la tienen.

No se cambiaron motor, pautas, pesos, nombres, fechas, descuentos, datos del servidor ni el modelo guardado. No se agrega aún `editadaEn`: corresponde a la etapa 4.

## Cuentas existentes y estados especiales

- Una cuenta existente lee las mismas notas y obtiene los mismos promedios. Abrir una casilla no modifica `S` ni escribe en almacenamiento.
- Al completar una subnota ya creada para ponerle fecha, se conservan su id, nombre personalizado, fecha y hora. Se mantienen los tests de recorrección y notas conceptuales de los guardadores originales.
- Las evaluaciones con nota mantienen sus entradas actuales y los accesos para editar el detalle. Se conserva la navegación con Enter/Tab, ahora considerando también los botones de casillas pendientes.
- Los avisos de compuertas, eximición, aprobación asegurada, ramo cerrado y recuperativo conservan sus condiciones y mensajes. No se sustituyen por una meta que prometa aprobar pese a una regla pendiente.
- Cuando la meta supera 7,0 se conserva la conclusión existente de que ya no alcanza. El medidor muestra **«— · Sin salida»**, con la raya en el extremo de 7,0.
- Sin evaluaciones queda el estado vacío y el acceso a armar/editar la pauta. Las notas sin fecha siguen visibles.
- Las listas abiertas de varias notas conservan su editor y su acción de agregar; no se inventa cuántas casillas faltan.

## Capturas sintéticas

Reloj fijo: 30 de octubre de 2026, America/Santiago. Fixtures inventados de cinco ramos, sin usar personas, notas ni cuentas reales. Navegador aislado, sin service worker ni peticiones a servicios externos.

| Tamaño y apariencia | Antes | Medidor al lado | Medidor debajo |
| --- | --- | --- | --- |
| 375 · claro | [Antes](antes-375-claro.png) | [Al lado](despues-375-claro.png) | [Debajo](variante-debajo-375-claro.png) |
| 375 · oscuro | [Antes](antes-375-oscuro.png) | [Al lado](despues-375-oscuro.png) | [Debajo](variante-debajo-375-oscuro.png) |
| 1280 · claro | [Antes](antes-1280-claro.png) | [Al lado](despues-1280-claro.png) | [Debajo](variante-debajo-1280-claro.png) |
| 1280 · oscuro | [Antes](antes-1280-oscuro.png) | [Al lado](despues-1280-oscuro.png) | [Debajo](variante-debajo-1280-oscuro.png) |

Texto al 200%: [375 claro](despues-375-claro-texto200.png), [375 oscuro](despues-375-oscuro-texto200.png), [1280 claro](despues-1280-claro-texto200.png), [1280 oscuro](despues-1280-oscuro-texto200.png).

Entrada inline: [escribir en celular](anotar-375-oscuro.png), [nota guardada](nota-guardada-375-oscuro.png), [escribir en computador](anotar-1280-claro.png), [nota guardada en computador](nota-guardada-1280-claro.png).

Estados: [sin evaluaciones](cuenta-sin-evaluaciones-375-oscuro.png), [sin fechas](cuenta-sin-fechas-375-oscuro.png), [sin salida](cuenta-imposible-375-oscuro.png), [compuerta activa](cuenta-compuerta-375-oscuro.png).

## Validación y HIG

- `npm run build`, chequeos de JS y CSS de AGENTS.md, y `git diff --check`.
- `npm test`: **366 archivos de prueba aprobados**. Incluye el nuevo mecanismo `ficha-racional.test.js`: abrir/vaciar no guarda, entrada inválida no escribe, guardado único, conservación de metadatos, nota conceptual UC, meta común con el motor y una nota dentro de tres casillas no da por cerrado el peso de la categoría.
- Se adaptaron las expectativas de presentación en `ficha-coincide-con-estadisticas`, `simulador-nota-necesaria`, `render-ramo-malformado` y `nombres-casillas`. El inventario de `gradientes.test.js` suma el rayado funcional del peso pendiente.
- Chrome real a 375 y 1280 px, claro y oscuro: ingreso con Enter, salida vacía, validación, persistencia, nombres/fechas conservados, acciones de simulador y editor, y texto al 200% sin desborde horizontal.
- Texto de las piezas afectadas en Neutro/Papel/Pizarra: contraste mínimo medido 4,66:1 en claro y 5,50:1 en oscuro.
- [Buttons](https://developer.apple.com/design/human-interface-guidelines/buttons): casillas y acciones con objetivos de 44 pt, foco visible, acciones secundarias pareadas.
- [Text fields](https://developer.apple.com/design/human-interface-guidelines/text-fields): edición en el lugar, teclado decimal, misma validación académica existente y nombre accesible de la evaluación.
- [Typography](https://developer.apple.com/design/human-interface-guidelines/typography): `--font-ui`, cifras tabulares y jerarquía de categoría/filas.
- [Color](https://developer.apple.com/design/human-interface-guidelines/color), [Dark Mode](https://developer.apple.com/design/human-interface-guidelines/dark-mode) y [Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility): semáforo existente acompañado de cifra/palabra, nombre accesible de metas y barras, texto grande y foco.
- La transición de la casilla usa el token corto del sistema y se elimina con `prefers-reduced-motion`.

El medidor original se conserva por instrucción de Lucas. La posición es la decisión visual pendiente; las dos capturas muestran el mismo cálculo y los mismos datos.


## Actualización del 2026-11-02

Adaptada sobre main `9f1e89f` y Agenda #944. El único conflicto fue el inventario
de gradientes: se conserva el Wrapped de main y se suma el rayado funcional de
la ficha (21 en total). Sin cambios al motor ni al contenido de Wrapped.
Build, JS, CSS 3497/3497, diff y **383 tests completos aprobados**. Se repitió
Chrome a 375/1280, claro/oscuro, texto 200%, ambas posiciones del medidor e
ingreso real: vacío e inválido no guardan; Enter guarda valor y conserva
id/nombre/fecha; Simular y Editar evaluaciones conservan sus acciones.
Capturas de esta comprobación local en `/tmp/gh-ficha-pr-qa`; las capturas
aprobadas de arriba se conservan como referencia de diseño.


## Corrección de Lucas: Simular y contadores · 2026-11-02

Los contadores existentes se movieron, sin duplicarlos ni cambiar sus
guardadores, junto a Simular. Sin contadores, Simular ocupa todo el ancho.
En 375 px, Simular va arriba a todo el ancho y los contadores debajo; los
controles −/+ mantienen 44 pt. Límite/exceso de faltas, tope y condiciones
del bonus se conservan. Abrir la ficha no inicializa bonus ni guarda nada.

| Caso · 375 px | Claro | Oscuro |
|---|---|---|
| Sin contadores | [Ver](contadores-sin-contadores-375-claro.png) | [Ver](contadores-sin-contadores-375-oscuro.png) |
| Faltas | [Ver](contadores-faltas-375-claro.png) | [Ver](contadores-faltas-375-oscuro.png) |
| Faltas y décimas | [Ver](contadores-faltas-decimas-375-claro.png) | [Ver](contadores-faltas-decimas-375-oscuro.png) |

Chrome: tres casos, ambos temas, texto 200%, sin desborde, nodos únicos,
controles 44 pt y suma/resta con los guardadores reales. El cálculo no cambia.
