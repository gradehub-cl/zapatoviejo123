# Profesor y Admin: diseño Editorial, Racional y Whoop

## Antes del merge: SQL manual

Lucas debe aplicar `supabase/paneles_historial.sql` después de `clases_particulares.sql`, `administradores.sql` y `admin_estadisticas.sql`. No se aplicó SQL remoto. El archivo es aditivo y reaplicable.

El diseño se conecta a datos y permisos reales; las capturas se hicieron con datos inventados, sin sesiones ni datos de producción. La comparación anterior usa el commit `0953f32` y los mismos fixtures. Son las funciones y estilos reales, montados en una página de prueba; la cabecera externa del banco de pruebas es ilustrativa. Las acciones se verificaron también con teclado, mouse y toque.

## Informe por impacto

| Pantalla | Problema anterior | Cambio y criterio |
|---|---|---|
| Admin › Anuncios | Revisión y deuda ocupaban la primera lectura, sin evolución temporal en esa vista. | Vistas, aperturas y clics en contacto con rango Hoy / 7 días / Un mes / Desde el inicio. Columnas con cifras puntuales al explorar y línea de promedio discontinua que cruza el gráfico. HIG Charts, Accessibility. |
| Ficha del alumno | El promedio y las evaluaciones se repartían entre bloques, con comparación poco directa. | Promedio actual destacado, diferencia frente al ramo o sección; última nota en escala 1–7, comparada con esa misma evaluación. Ramo por defecto y sección al tocar, independientemente del control general. Próximas antes de pasadas; conserva categorías y promedios en un detalle. HIG Charts, Buttons, Accessibility. |
| Clases › Resumen | Totales de campañas activas sin un rango temporal ni una historia continua. | Serie de vistas con 7 días / Un mes / Desde el inicio, cifras de alcance, presupuesto contra su tope, plazo, origen del alcance y costo por concepto. Los costos y el origen dicen acumulado; no se presentan como cifras del rango. HIG Charts, Segmented controls. |
| Admin › lista de anuncios | Identidad, estado e importes quedaban repartidos en columnas poco comparables. | Inicial circular, título y profesor juntos; chip Publicado turquesa; cuatro cifras centradas: vistas, aperturas, contactos y días. En computador comparten una fila; en celular las métricas van debajo de la identidad. HIG Typography, Charts. |
| Admin › filtros | El campo de búsqueda tenía un marco adicional y el selector nativo abierto rompía el diseño. | Búsqueda sin marco exterior y selector de estado con menú anclado en computador / panel inferior en celular. Conserva el select y sus eventos como base; Enter, espacio, flechas dentro del menú y Escape; foco visible. Se aplica a Anuncios y Profesores. HIG Menus, Pop-up buttons, Accessibility. |
| Admin › presupuesto y revisión | Bloques con jerarquía repetida. | Por revisar al lado del gráfico; presupuesto debajo y costo por concepto a su derecha. Los cobros históricos siguen disponibles en su detalle. HIG Layout, Charts. |

El marcador de inicio del alumno es vertical, continuo y termina en un cuadrado. El promedio del grupo es horizontal y discontinuo. La diferencia entre promedio y grupo usa el gradiente de semáforo pedido por Lucas: valores cercanos al empate cálidos, hacia rojo al bajar y verde al subir, con número y signo escritos. **Decisión explícita de Lucas:** esa diferencia no significa aprobar/reprobar; es una excepción al uso académico habitual del semáforo. No se colorean como éxito los porcentajes de presupuesto ni de avance.

No hay botón nuevo de apariencia; se respeta el modo de la app. La ficha usa el nombre del alumno en la cabecera real de Alumnos. Las acciones quedan bajo la cabecera. No se cambiaron pantallas del estudiante ni el editor de anuncios, descuento, cobros, precios, eventos, medición o motor académico.

## Qué cambia en los datos

- Las RPC de historial devuelven conteos por día/publicación, nunca identidades de alumnos. El profesor accede solo a sus anuncios; Admin exige MFA en servidor. Las comparaciones de notas conservan el mínimo de cinco personas.
- El rango de lectura admite un día y desde el inicio, sin el tope anterior de 90 días. Para más de 35 días se agrupa por semanas, conservando la suma y mostrando el intervalo al explorar.
- Los totales y el agregado diario de eventos dejan de esperar quince eventos. Los cortes por ramo y el desglose simultáneo día/universidad/ramo conservan el umbral de quince. No se cambió cómo se registra ni cobra cada evento.
- Antes de la limpieza existente, se conserva una instantánea de conteos. La limpieza de registros identificables mantiene su plazo y sus permisos de ejecución. Se combinan instantánea y registros restantes con `max`, evitando duplicar conteos si se limpia una tabla antes que la otra.
- La tabla privada tiene RLS, ningún permiso para clientes y borrado en cascada al borrar el anuncio o su autor. Guarda el vínculo al autor para respetar su borrado; no guarda identidades de alumnos. Las RPC no devuelven ese vínculo.
- No recupera datos ya borrados antes de instalar este SQL. “Desde el inicio” significa desde el primer registro conservado; no inventa el período perdido.
- Los días de cada anuncio son tiempo transcurrido desde publicación, limitado por su vencimiento; no cambian con el rango ni alteran los días facturados.

## Cuentas existentes y estados

No hay migración de notas, ramos, sesiones, preferencias ni datos personales. Instalar el SQL no cambia anuncios, campañas, estados, fechas o cobros. El archivo solo añade lecturas y preservación agregada para futuras limpiezas.

Con SQL sin instalar, Clases conserva su resumen anterior y Admin explica que falta el historial; Desde el inicio queda deshabilitado y las filas conservan el acumulado actual, rotulado. Un error no se representa como cero. Con historial confirmado vacío, los conteos sí son cero.

Con cero alumnos se conserva la invitación y el modo de ejemplo. Con varios ramos, la ficha tiene un selector que envuelve en varias líneas. Sin sección se indica no disponible. Sin fechas no se inventa una última evaluación ni una evolución temporal; las notas sin fecha siguen en la tabla de pasadas y en categorías. El motor sigue usando los ramos compartidos del alumno para resolver vínculos con laboratorios, y después restaura el estado del profesor.

Las acciones administrativas, revisión, edición, descuentos, código, cobros, avisos al profesor y exportación se conservan. Las filas siguen siendo detalles desplegables. Buscar o cambiar un período no reemplaza el botón que tiene el foco ni reinicia el scroll.

## Verificación

- `npm run build`; sintaxis JS de AGENTS y adicionalmente marketplace/render-main; balance CSS; `git diff --check`.
- `npm test`: **365 archivos de pruebas aprobados**.
- Nuevas pruebas de PostgreSQL/PGlite: MFA, propietario, permisos, rangos, agregado desde primer evento, umbrales finos, archivo antes de limpiar, limpieza parcial sin duplicar, reaplicación, datos de campaña intactos y borrado de cuenta.
- Pruebas del cliente: rangos y agrupación sin pérdida, datos ausentes frente a cero, promedio del motor, medidor compartido, próximas/pasadas, referencia de la misma evaluación y sección no disponible.
- Chrome con fixtures sintéticos: las tres vistas × 375/1280 × claro/oscuro; rangos sin salto de scroll, gráfico con mouse/teclado, menú adaptable, alternancia independiente ramo/sección y texto al 200%. Sin errores de JavaScript. Se capturó con movimiento reducido para no confundir el fotograma inicial de un anillo con su proporción final.
- Se actualizaron expectativas de texto de “curso” a “ramo”, los stubs de sesión y el listado de RPC consultadas. El parser DOM del test de descuento reconoce SVG autocerrado. No se relajaron comprobaciones de permisos, cálculo o medición.

## Guías aplicadas

- [Charts](https://developer.apple.com/design/human-interface-guidelines/charts): formato según la comparación, unidades, ejes a la izquierda, detalles al explorar y tabla accesible.
- [Buttons](https://developer.apple.com/design/human-interface-guidelines/buttons): una acción principal visible por vista, acciones secundarias discretas, controles táctiles de 44 pt.
- [Segmented controls](https://developer.apple.com/design/human-interface-guidelines/segmented-controls): rangos mutuamente excluyentes y estado seleccionado anunciado.
- [Menus](https://developer.apple.com/design/human-interface-guidelines/menus) y [Pop-up buttons](https://developer.apple.com/design/human-interface-guidelines/pop-up-buttons): opciones de estado excluyentes, valor actual, menú próximo al control y presentación compacta.
- [Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility): teclado, foco, texto grande, valor además del color, datos legibles sin depender del gráfico, movimiento reducido.
- [Typography](https://developer.apple.com/design/human-interface-guidelines/typography), [Color](https://developer.apple.com/design/human-interface-guidelines/color) y [Dark Mode](https://developer.apple.com/design/human-interface-guidelines/dark-mode): tipografía del sistema, cifras tabulares y turquesa legible en ambos modos.

## Capturas antes y después

Las 24 capturas comparan la misma información sintética. El promedio de la ficha sigue siendo el del motor; el nuevo historial de anuncios añade la lectura diaria que no tenía esa vista.

### Clases

<details><summary>1280 px · oscuro</summary>

Antes

![Antes Clases, 1280, oscuro](antes-profesor-1280-oscuro.png)

Después

![Después Clases, 1280, oscuro](despues-profesor-1280-oscuro.png)

</details>

<details><summary>1280 px · claro</summary>

Antes

![Antes Clases, 1280, claro](antes-profesor-1280-claro.png)

Después

![Después Clases, 1280, claro](despues-profesor-1280-claro.png)

</details>

<details><summary>375 px · oscuro</summary>

Antes

![Antes Clases, 375, oscuro](antes-profesor-375-oscuro.png)

Después

![Después Clases, 375, oscuro](despues-profesor-375-oscuro.png)

</details>

<details><summary>375 px · claro</summary>

Antes

![Antes Clases, 375, claro](antes-profesor-375-claro.png)

Después

![Después Clases, 375, claro](despues-profesor-375-claro.png)

</details>


### Ficha del alumno

<details><summary>1280 px · oscuro</summary>

Antes

![Antes Ficha del alumno, 1280, oscuro](antes-alumno-1280-oscuro.png)

Después

![Después Ficha del alumno, 1280, oscuro](despues-alumno-1280-oscuro.png)

</details>

<details><summary>1280 px · claro</summary>

Antes

![Antes Ficha del alumno, 1280, claro](antes-alumno-1280-claro.png)

Después

![Después Ficha del alumno, 1280, claro](despues-alumno-1280-claro.png)

</details>

<details><summary>375 px · oscuro</summary>

Antes

![Antes Ficha del alumno, 375, oscuro](antes-alumno-375-oscuro.png)

Después

![Después Ficha del alumno, 375, oscuro](despues-alumno-375-oscuro.png)

</details>

<details><summary>375 px · claro</summary>

Antes

![Antes Ficha del alumno, 375, claro](antes-alumno-375-claro.png)

Después

![Después Ficha del alumno, 375, claro](despues-alumno-375-claro.png)

</details>


### Admin › Anuncios

<details><summary>1280 px · oscuro</summary>

Antes

![Antes Admin › Anuncios, 1280, oscuro](antes-admin-1280-oscuro.png)

Después

![Después Admin › Anuncios, 1280, oscuro](despues-admin-1280-oscuro.png)

</details>

<details><summary>1280 px · claro</summary>

Antes

![Antes Admin › Anuncios, 1280, claro](antes-admin-1280-claro.png)

Después

![Después Admin › Anuncios, 1280, claro](despues-admin-1280-claro.png)

</details>

<details><summary>375 px · oscuro</summary>

Antes

![Antes Admin › Anuncios, 375, oscuro](antes-admin-375-oscuro.png)

Después

![Después Admin › Anuncios, 375, oscuro](despues-admin-375-oscuro.png)

</details>

<details><summary>375 px · claro</summary>

Antes

![Antes Admin › Anuncios, 375, claro](antes-admin-375-claro.png)

Después

![Después Admin › Anuncios, 375, claro](despues-admin-375-claro.png)

</details>

