# Resumen de Alumnos · maqueta para revisar

Esta pantalla responde «¿a quién conviene apoyar hoy y qué evaluaciones se vienen?». Está pensada para un equipo que coordina a unos 300 alumnos. En escritorio muestra una lista de atención y una agenda semanal en paralelo; en celular muestra tres casos iniciales y permite abrir más.

- El filtro de ramo se aplica a los tres totales, la lista de atención y la agenda. La selección de un día explora el desglose de la agenda, sin cambiar el alcance de la semana.
- La lista tiene una fila por alumno y ramo. Se puede ordenar por urgencia o próxima evaluación. Tocar una fila muestra el destino de la ficha; en esta maqueta es solo una vista previa.
- La agenda agrupa por día, ramo y evaluación. Las barras representan cantidad de evaluaciones, no promedios. Tocar una barra muestra el día; tocar un grupo muestra quiénes lo rinden. Con texto ampliado se puede seleccionar el día en un menú nativo.
- No hay comparaciones de rendimiento en Resumen. Los conteos se refieren solo a los ramos compartidos con el profesor; no son muestras anónimas de GradeHub.

## Datos de ejemplo y revisión

| Alcance | Alumnos | Necesitan atención | Casos | Evaluaciones en 7 días |
| --- | ---: | ---: | ---: | ---: |
| Todos | 300 | 24 | 30 | 84 |
| Análisis numérico | 110 | 10 | 10 | 28 |

La agenda completa reúne 72 alumnos distintos. Las siete barras suman 84: 18, 24, 5, 12, 6, 15 y 4. El viernes muestra 24 evaluaciones; con Análisis numérico, 8. Las razones y datos son ficticios; no se calculan ni guardan notas.

Se comprobó el filtro, los dos órdenes, la apertura de un grupo y su ficha, y los estados de carga, error con reintento y vacío. El vacío confirmado da cero; una carga sin respuesta muestra «—». Se revisó 375 y 1280 px en claro y oscuro, controles de 44 px y el ajuste del selector a 375 px con texto al 200 %. La agenda usa `prefers-reduced-motion` y no anima las barras.

[Escritorio](1280-claro.png) · [Celular](375-oscuro.png)

[HIG Charts](https://developer.apple.com/design/human-interface-guidelines/charts): escala común y lectura numérica de cada día. [HIG Layout](https://developer.apple.com/design/human-interface-guidelines/layout): lectura en una columna, reflujo con texto ampliado y acciones con área suficiente. [HIG Pickers](https://developer.apple.com/design/human-interface-guidelines/pickers): menús nativos para ramo, orden y día.

Para abrir: `python3 -m http.server 8080 --bind 127.0.0.1` desde la raíz del repo y visita `/docs/diseno/resumen-alumnos-2026-11/maqueta.html`. El menú «Maqueta» cambia modo, tamaño de texto y estado. Solo usa el CSS del repositorio y datos en memoria.

Pendiente del OK de Lucas: composición, orden predeterminado y agrupación de evaluaciones. Esta propuesta no cambia la app ni requiere SQL. Para construirla se usarán las fechas y razones que ya entrega el panel, con los permisos existentes y sin copiar las reglas sintéticas.
