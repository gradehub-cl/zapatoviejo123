# Inicio: «¿Cómo te fue?»

Actualizado el 19-11-2026 con el control de la ficha solicitado por Lucas.

Solo app nativa. Datos sintéticos, sin cuentas ni Canvas reales. Pruebas del
motor con una pauta propia, sin `presetRamo()`. Se conserva el flujo web previo.

## Plazos confirmados por Lucas

Todas las universidades, UC incluida (Martín, 27-11-2026): pregunta desde 7 días
después de la fecha y hasta el día 14, mientras no esté la nota ni «Ahora no».
Antes la UC esperaba 14 días y no vencía. Se declara en
`RECORDATORIO_NOTAS_POR_TENANT`, sin condicionales por universidad ni reglas
nuevas en el motor. Las pruebas cubren días 0, 6, 7, 14, 15 y fechas más antiguas.

La composición final, ajustada por Lucas, contiene solo pregunta, ramo y control
con «+ Nota» / «Ahora no»: sin contador, explicación larga ni abrir otra
pantalla para poner la nota.

## Qué se reutiliza

- `agendaEvents` para las evaluaciones y sus fechas: una fecha propia identifica
  su casilla; la fecha del grupo cubre solo casillas sin fecha propia.
- Los escritores existentes (`abrirNotaEnFila`, `escribirNotaPropuesta`, `asignarCalificacionNota`)
  y `save`, sin crear notas al pintar. La prueba y el navegador comprueban que
  la entrada de Control 3 cambia solo la tercera casilla y Control 2 sigue
  pendiente. Se guarda al salir del campo sin abandonar Inicio, también con el guardado real.
  La ficha conserva su camino anterior; Inicio aporta su destino mediante una
  función opcional al mismo editor en fila. No hay botón Guardar separado.
- `lecturaDespuesDeNota` y `notaNecesaria`: el aviso después del guardado sale
  del motor. Conserva los casos de compuertas, nota inalcanzable, cierre y listas
  con descarte abierto. No hay cálculo de promedios ni pesos nuevo.
- La revisión existente de Canvas: una coincidencia exacta por nombre o alias
  puede ofrecer «Traer de Canvas». Un parecido solo por tipo no basta. Abrir la
  revisión no escribe; guardar vuelve a comprobar que la casilla esté vacía.

El servidor MCP conserva `porRegistrar` y su ventana predeterminada de 45 días.
No se movió ni duplicó esa función. La prueba compara su cuenta de casillas con
la de la Agenda para la misma ventana de 14 días y una pauta sintética con
fechas por casilla y fecha de grupo.

## Datos y privacidad

«Ahora no» usa la clave local existente
`gradehub_recordatorios_notas_descartados_v1`, con cuenta, universidad, período,
ramo, categoría y casilla. También se respetan los descartes anteriores. No
contiene nombres ni notas, no entra en `gradehub_v1` ni viaja por sync.

La comprobación de Canvas es de lectura y solo en la app, para quien ya lo
conectó. Consulta el estado del puente y los cursos/evaluaciones con entrega
propia, con las rutas y proyecciones que ya existen. Se limita a ramos con
recordatorios elegibles, sección única compatible y período activo; conserva
una caché de sesión de cinco minutos entre visitas a Inicio. Sin conexión,
permiso, coincidencia o puente disponible, permanece «Poner nota». No hay rutas
nativas nuevas, SQL, campos guardados nuevos ni métricas nuevas.

Las respuestas tardías no pasan entre cuentas, estados, universidades,
secciones o períodos. La caché se limpia al olvidar la cuenta o desconectar
Canvas. El equipo y sus cambios de sección de la #1204 se integran por separado;
esta PR no está apilada sobre ella.

En la app, la tarjeta única sustituye los recordatorios generales y de profesor
que se inyectaban en las filas de Inicio. La web conserva esos recordatorios.

## Revisión visual

Chromium aislado, 375 × 900 px, claro y oscuro, con backend y puente simulados.
La tarjeta tiene una acción principal, «Ahora no» como secundaria, superficies
neutras y texto sin semáforo ni celebración. Se midieron controles ≥44 px,
contraste superior a 4,5:1 y ancho de documento 375 px sin scroll horizontal.
Texto al 200 % conserva las acciones y el ajuste de líneas.

La tarjeta final mide 118 px en la muestra de 375 px, con controles de 44 px
y contraste mínimo 5,23:1 en claro / 9,73:1 en oscuro. Con texto al 200 %, las
acciones se ajustan en filas y no hay scroll horizontal. Las capturas finales
corresponden al control + Nota compartido con la ficha, no a los diseños
anteriores. Se compararon los estilos calculados de ambos botones: ancho
84 px, altura mínima 44 px, radio 8 px, borde, fondo, color, fuente y padding
coinciden en los dos modos.

Una respuesta tardía de Canvas no borra el valor ni reemplaza el campo que se
está editando. Se probó guardar `5,4` con teclado y salir del campo con Tab: el aviso
«Ahora necesitas 3,5 en lo que queda para aprobar» coincide con `notaNecesaria`.

HIG: [Feedback](https://developer.apple.com/design/human-interface-guidelines/feedback)
para una consecuencia breve y contextual del guardado;
[Buttons](https://developer.apple.com/design/human-interface-guidelines/buttons)
para la acción principal y la secundaria;
[Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility)
para contraste, tamaño táctil y texto ampliado. No se incorporan animaciones.

Los recursos del fixture están fuera del repositorio y no se publican.
No se modificó Swift; no hace falta una ruta nativa ni plugin nuevos.

## Validación final

- Build, revisión JS, balance CSS y `git diff --check`.
- Suite completa `npm test -- --resumen`: 485/485 aprobadas sobre `ios` actualizada al 19-11-2026. JS y balance CSS OK.
- Pruebas sintéticas de descartes, plazos por universidad, ingreso y guardado
  reales, Canvas, respuesta tardía, campo en edición y aislamiento web.

También se comprobó con un toque real en «Ahora no» mientras había `5,4`
escrito: descarta sin guardar. Campo vacío, Escape, nota inválida y blur
duplicado tienen pruebas sintéticas ejecutando el editor compartido real.
