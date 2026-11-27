# Ficha de alumno y ramo: propuesta para Lucas

Estado: maqueta para revisar, sin cambios en la app. Decisión de Lucas del 2026-11-04: estos paneles priorizan claridad, cuidado visual y dirección del cambio por sobre Editorial y el semáforo. El estudiante conserva su diseño.

## La pregunta y las decisiones

Quién: una persona del equipo docente que trabaja con unos 300 alumnos.
Pregunta: ¿cómo va este alumno en este ramo, qué muestran sus evaluaciones con/sin clases y qué conviene preparar después?
Cambia: un detalle amplio en computador, lectura breve en celular y preparación por evaluación, con cambios revisables antes de guardar.
Se conserva: motor, notas, permisos, método por marcas o por fecha y anonimato de las referencias.
Por validar: composición y edición por lote, antes de implementar en `src/`.

## Dirección visual y formas

- Superficies de #1019, sin copiar sus componentes: `maqueta.html` carga el `styles.css` real y reutiliza `.est`, `est-tarjeta-grande`, `est-seg`, `est-control`, `est-tarjeta`, `est-avatar`, `est-punto`, `est-pista` y sus tokens. Solo el diseño de esta ficha tiene CSS local.
- Paleta clara: fondo #f4f4f2, tarjeta #ffffff, texto #19191c, secundario #54545b, selección #0d7a6b, mejora #0c7f56. Oscuro: #080809, #121214, #f4f4f6, #b4b4bd, #2dd4bf y #34d399. Empeorar usa el rojo de la referencia; igual, gris. Las notas no llevan semáforo.
- `--font-ui`, jerarquía de 14 / 16 / 24 / 40 px y cifras tabulares. Sin rótulos decorativos ni animación de entrada.
- Gráfico protagonista: línea de notas y referencia discontinua por evaluación; segmentos rectos. Preparación se distingue por punto relleno/hueco y texto, nunca por verde/rojo. Las futuras no se proyectan.
- Cambio individual: punto y línea sobre una escala común de diferencia con el ramo/sección. Sin anillo ni un histograma de una sola persona.
- Promedio del motor integrado al gráfico; preparación y referencia junto a la comparación; próximas evaluaciones antes de las pasadas.
- Computador: gráfico y comparación lado a lado, tabla para trabajar. Celular: una columna y filas que se repliegan; no se exige una tabla de escritorio reducida.

```
Alumno y ramo                          Cambiar alumno / anterior / siguiente
[Promedio + gráfico por evaluación]    [Con/sin clases: punto y línea]
[Próximas y evaluaciones con nota: preparación por fila, guardar por lote]
Cómo se calcula / cautela de interpretación
```

La primera idea repetía tres KPI como la referencia lateral. Se reemplazó por una comparación individual de punto y línea: ocupa menos, explica ambos lados y deja el gráfico de notas como protagonista. Las tarjetas no repiten el cambio como un segundo titular.

## Fixture fija y respuestas conocidas

Todos los nombres, ramos, evaluaciones y pautas son ficticios. No se conecta a Supabase, no crea cuentas y no escribe localStorage. Hay 300 identidades sintéticas navegables; los primeros cinco casos cubren los bordes.

Camila, ramo SYN101:

| Evaluación | Nota | Ramo | Sección | Peso | Con clases |
|---|---:|---:|---:|---:|---|
| Control 1 | 3,6 | 4,2 | 4,4 | 10% | No |
| Interrogación 1 | 4,2 | 4,8 | 5,0 | 10% | No |
| Control 2 | 4,0 | 4,6 | 4,8 | 10% | No |
| Interrogación 2 | 5,4 | 4,8 | 5,0 | 10% | Sí |
| Control 3 | 5,0 | 4,4 | 4,6 | 10% | Sí |
| Interrogación 3 | 5,8 | 5,2 | 5,4 | 10% | Sí |
| Control 4, futuro | — | — | — | 10% | Sí |
| Examen, futuro | — | — | — | 30% | No |

Cuentas hechas antes de la UI:
- Suma de notas: 28,0. Promedio sobre 60% evaluado: 4,666… → **4,7** oficial. Quedan dos evaluaciones y 40% de peso.
- Contra el ramo: **−0,6 sin clases**, **+0,6 con clases**, diferencia **+1,2**. Tres comparables por grupo.
- Contra la sección: **−0,8 / +0,4**, diferencia **+1,2**. La referencia cambia en gráfico, cifras, filas y ayudas.
- Necesita **2,9 en cada pendiente**: 2,8 + 0,4 × 2,9 = 3,96 → 4,0 oficial; con 2,8 sería 3,92 → 3,9. Se comprueba con `solveForTarget`, sin un solver nuevo.
- Cambiar solo la marca del examen futuro conserva todas esas cifras y seis puntos en el gráfico.
- Desmarcar Interrogación 3 y guardar: sin clases = (−0,6−0,6−0,6+0,6)/4 = **−0,3**; con clases = **+0,6**, diferencia **+0,9**. Cuatro comparables frente a dos.
- Desmarcar otra de las tres preparadas deja solo una comparable con clases: **sin diferencia disponible**, sin colorear ni dibujar un cambio.

Casos adicionales:
- Diego: notas 4,2 / 4,6 / 4,4 / 5,4 / 5,0 / 4,5. La última exige 5,0, con tope 3,9. El motor debe dar **3,9**, con el motivo visible junto al promedio. Todas las notas están sobre 4,0.
- Sofía: sin marcas; corte 25 de septiembre. Dice **Antes / Desde el inicio**, nunca «Con clases». La primera selección guardada cambia explícitamente a marcas; cancelar conserva la fecha.
- Tomás: muestra de referencia menor que 5. Muestra **No disponible**, sin revelar ese número, sin comparación ni una línea que lo simule. Las notas propias y el promedio siguen siendo legibles.
- Elena: sin notas; el promedio y la comparación son **—**, no 0. Las dos futuras siguen marcables.

El promedio y la nota necesaria se obtienen de `calculateFinalGrade` y `solveForTarget` del `engine.js` real. La pauta de ejemplo es propia; no usa presets oficiales. Solo la comparación visual de estos datos sintéticos se calcula en la maqueta. La construcción posterior usará `metricasAlumnoRamoPanel`, `conRamosAlumnoPanel` y `motivoPromedioAlumnoPanel` reales, con tests de integración.

## Problemas y acciones

- Tope activo: motivo y promedio juntos; acción «Ver regla» abre la explicación.
- Método por fecha: etiqueta visible «Por fecha de inicio»; acción «Marcar evaluaciones».
- Preparación sin guardar: número de cambios, «Guardar marcas» y «Cancelar». Las cifras conservan las marcas guardadas hasta confirmar.
- Menos de dos comparables a un lado: «Faltan evaluaciones comparables», sin una mejora inventada.
- Referencia menor que cinco personas: «No disponible»; no se revela el n ni se dibuja esa referencia.
- Carga, error y actualización: una sola señal en pantalla; al actualizar/error se conserva el último dato, sin convertirlo en cero.

## Dependencias y alcance

#1019 se mergeó mientras se revisaba su referencia; esta rama se adelantó a `origin/main` (616e51c0), sin resolver ni cambiar código de la app. #1001 seguía abierta: «Alumnos que partieron igual» no aparece todavía. Se incorpora solo cuando esté en main, sin inventar cohortes.

Aprobación pendiente de Lucas: no implementar todavía en `src/` ni abrir etapas siguientes. La maqueta se queda en `docs/diseno/`. No necesita SQL.

## HIG

[Charts](https://developer.apple.com/design/human-interface-guidelines/charts): formas y escala estables, referencia identificada, alternativa textual y consulta por teclado/tacto.
[Toggles](https://developer.apple.com/design/human-interface-guidelines/toggles): casillas con etiqueta para selección múltiple y confirmación de un lote.
[Layout](https://developer.apple.com/design/human-interface-guidelines/layout): jerarquía, adaptación a texto ampliado y ancho disponible, áreas seguras.

Excepciones al recuento «sin frases» de la skill: el motivo del tope, el aviso de método/guardado, los estados vacíos/error y «La diferencia no demuestra que se deba a las clases» deben leerse sin abrir un tooltip. Son información necesaria para no engañar, no adorno.

## QA realizada el 2026-11-05

- [x] Referencia revisada en 1440 y 375, clara/oscura, filtros y detalle lateral.
- [x] Cifras del fixture: promedio, comparación, gráfico, filas y marcas futuras.
- [x] Edición por lote, cancelar, falta de comparables y método por fecha.
- [x] Cargando, actualización, error, muestra chica, vacío y tope.
- [x] Capturas 375 / 1280 / 1440 / 3440 en claro/oscuro; sin scroll horizontal.
- [x] 44 pt, contraste 4,5:1, teclado y texto al 200%; regla de movimiento reducido revisada en CSS (límite de emulación detallado abajo).
- [x] Mirar todas las capturas y corregir antes de entregar la maqueta.


Resultados de la revisión:

- Referencia #1019 abierta en claro/oscuro, 1440/375 px: filtros de referencia y tipo, detalle lateral y marca futura probados antes de construir.
- Maqueta inspeccionada en 375, 1280, 1440 y 3440 px, ambos modos. Texto duplicado a 375/1280, ambos modos. Sin desplazamiento horizontal: `scrollWidth === innerWidth` en esas combinaciones.
- Auditoría del DOM visible: controles de la ficha de al menos 44 × 44 px; textos con contraste de al menos 4,5:1 calculado sobre el fondo compuesto de cada elemento. Revisión visual de cada captura. No sustituye una auditoría con lector de pantalla.
- Teclado: flechas recorren los puntos y Escape oculta la notita; la notita se posiciona sobre el trazado sin alterar su altura. Tocar un punto también funciona. La maqueta no implementa arrastre continuo con el dedo.
- Movimiento reducido: revisada la regla que elimina animaciones/transiciones; no hay animación de carga ni de entrada. El navegador de revisión no ofrece emulación de esta preferencia; pendiente comprobarla con la preferencia del sistema al implementar.
- Se corrigieron títulos comprimidos y desborde al 200%, alineación de escala/gráfico, relleno lateral heredado del sitio y especificidad sin `!important`. En ultrapanorámica el detalle crece hasta 1640 px, para no separar el nombre de sus cifras por toda la pantalla.
- Comprobadas las cifras indicadas arriba contra el DOM renderizado; cambiar la referencia afecta la línea, el resumen, las filas y sus etiquetas. Guardar una marca futura no agrega una nota ni un punto. Un borrador no cambia el resumen guardado; cancelar lo conserva.
- Probada búsqueda y navegación entre 300 identidades sintéticas; no son cuentas. Con un lote pendiente se pide guardar o cancelar antes de cambiar de alumno.
- Carga muestra «—» y esqueletos; actualizar/error mantienen el último dato. Reintentar recupera la simulación. Referencia chica, ausencia de notas y tope probado sin notas reales.
- `npm run build`: 159 fuentes, 7 scripts, sin cambios en bundles. Chequeo JS OK y CSS 3960/3960. `npm test -- --resumen`: **422 tests aprobados**. No se agregaron tests de aplicación para una maqueta documental; la implementación posterior debe probar las funciones reales.

Las capturas están en [capturas/](capturas/). El panel «Maqueta», arriba, permite cambiar entre los cinco casos, simular carga/error, alternar claro/oscuro y duplicar el texto. Para probarla desde la raíz del repo: `python3 -m http.server 8080 --bind 127.0.0.1` y abrir `/docs/diseno/ficha-alumno-2026-11/maqueta.html`. Necesita los estilos y el motor del repo, no conexión con cuentas.

Riesgo para cuentas existentes: ninguno en esta entrega documental. No hay conexión a Supabase, escrituras ni cambios en `src/`, `S`, almacenamiento, permisos o cálculos. La edición guarda solo en memoria y se reinicia al recargar. Antes de implementarla hace falta el OK de Lucas y acordar los archivos de la app; esta maqueta no autoriza cambios del motor.
