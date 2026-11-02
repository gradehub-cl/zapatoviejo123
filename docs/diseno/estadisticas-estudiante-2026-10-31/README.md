# Tu promedio en el tiempo · etapa 5 de 5

**Sin SQL. Requiere la etapa 4 (#946) antes del merge.** Lucas autorizó abrir todas las etapas el 2026-11-02: se publica desde `codex/evolucion-estudiante-pr`, con #946 como base para revisar solo esta diferencia. La rama original `codex/estadisticas-evolucion-estudiante` se conserva intacta.

El promedio en un anillo mostraba una situación estática. La tarjeta aprobada muestra su evolución con una cifra protagonista, su movimiento con la última nota y una línea con área tenue. El anillo neutro de peso evaluado y las otras secciones se conservan. El título también coincide en «Editar Estadísticas»; el id persistido `ritmo` conserva el orden y la visibilidad que tenía cada cuenta.

## Datos y comportamiento

- **Semestre:** un paso por nota guardada. **Mes:** los pasos fechados en el mes calendario actual. **Carrera:** un punto por semestre archivado y el actual; aparece solo con historial.
- Se ordena por fecha de la evaluación (`nota.fecha`, o la fecha de su categoría); a falta de ella, por `editadaEn`. Sin ambas, primero y en orden guardado. No se asignan días ficticios.
- Cada punto consulta el `gpa` existente sobre una copia con las notas conocidas hasta ese paso. Se respetan créditos, compuertas, descartes y vínculos cátedra/laboratorio. Ni `gpa`, ni `ramoAvg`, ni el motor se modifican.
- Son **promedios reconstruidos con las calificaciones y la pauta actuales**. No se presenta como una bitácora de versiones anteriores: una corrección reemplaza la nota guardada y puede cambiar la reconstrucción.
- Carrera usa `gpaHistorial` para conservar el promedio archivado o recuperarlo con el motor si una cuenta antigua no trae esa caché. Sin notas actuales se puede explorar el historial, con «—» para el promedio actual.
- Segmentos rectos, sin suavizado que invente picos; empieza en el primer valor real. Eje solo a la izquierda, marcas enteras cercanas y referencia discontinua en 4,0. Los puntos están espaciados por evaluación, no por duración entre fechas.
- El área completa responde a mouse, dedo y teclado. Flechas, Inicio/Fin, PageUp/PageDown y Escape conservan el comportamiento accesible existente. La tabla contiene nota, evaluación, fecha, promedio y variación; Carrera contiene los semestres.
- Un solo punto se dibuja y se puede explorar. Sin notas fechadas del mes, lo dice en el espacio del gráfico. Las notas antiguas siguen en Semestre aunque no tengan fecha.
- Los rangos actualizan únicamente el gráfico, conservando foco y scroll; no vuelven a consultar Supabase ni repintan las otras secciones. La serie tiene caché de lectura que se invalida al cambiar los ramos o el tenant.
- Si no hay comparación colectiva suficiente queda una sola línea atenuada. Si sí la hay se conservan las filas y su encabezado.

## Cuentas existentes

Ver el gráfico no escribe en `S`, localStorage ni Supabase. No cambia notas, pesos, fechas, cálculo, preferencias, medición, permisos o caché del service worker. No se rellenan fechas de cuentas antiguas. Las opciones nuevas viven solo durante la sesión de vista; no se agrega persistencia.

Los cambios a `htmlGraficoEvolucion` son opciones explícitas (`recto`, `unPunto`); su comportamiento predeterminado sigue igual para profesor, admin y el historial inferior. No se modifican sus pantallas.

## Capturas sintéticas

Chrome, America/Santiago y reloj fijo al 30 de octubre de 2026. Datos inventados; red externa bloqueada y sin service worker.

| Vista | Antes | Después | Texto 200% |
| --- | --- | --- | --- |
| 375 · claro | [Antes](antes-375-claro.png) | [Después](despues-375-claro.png) | [Ampliado](despues-375-claro-texto200.png) |
| 375 · oscuro | [Antes](antes-375-oscuro.png) | [Después](despues-375-oscuro.png) | [Ampliado](despues-375-oscuro-texto200.png) |
| 1280 · claro | [Antes](antes-1280-claro.png) | [Después](despues-1280-claro.png) | [Ampliado](despues-1280-claro-texto200.png) |
| 1280 · oscuro | [Antes](antes-1280-oscuro.png) | [Después](despues-1280-oscuro.png) | [Ampliado](despues-1280-oscuro-texto200.png) |

Casos: [25 semestres](carrera-25-semestres-375-oscuro.png), [tabla](tabla-375-oscuro.png), [una nota sin fecha](una-nota-sin-fecha-375-oscuro.png), [Mes sin fechas](mes-sin-fechas-375-oscuro.png), [solo historial](solo-historial-375-oscuro.png).

## Validación y HIG

- `npm run build`, sintaxis de `data.js`, `app.js` y `render-main.js`, CSS equilibrado, `git diff --check`, `npm test` completo: **367 archivos aprobados** en esta rama.
- Nuevo test de mecanismo `estadisticas-evolucion.test.js`: motor real, fechas ausentes o inválidas, fecha de evaluación antes de edición, estabilidad de empates, SCT, laboratorio vinculado, compuertas, descartes, historial antiguo sin GPA, 25 semestres, inicio real, segmentos rectos, una sola nota, tabla, escape de texto, filtros sin escrituras, foco/scroll y caché.
- Se actualizan expectativas de presentación del antiguo anillo en `estadisticas-accionables`, `stats-editar-secciones` y `movimiento`. Las aserciones de cálculo, navegación, autorización y avance neutro se mantienen.
- Chrome real: 375/1280, claro/oscuro, texto al 200% sin desborde de página, mouse, tacto, teclado, una nota, sin fechas, solo historial, cambio de rango sin salto de scroll ni modificación del resto de la pantalla.
- 500 notas sintéticas: reconstrucción inicial de aproximadamente 170 ms en este Mac; consulta de caché inferior a 1 ms. Es una medición local, no una garantía para otros dispositivos.
- Contraste medido de textos afectados en Neutro/Papel/Pizarra: mínimo **5,23:1 en claro y 7,01:1 en oscuro**. Los controles tienen al menos 44 pt y foco visible. No se agrega animación.
- [Charts](https://developer.apple.com/design/human-interface-guidelines/charts): línea para evolución, escala explícita, referencia y detalle exacto; tabla como alternativa sin gesto.
- [Segmented controls](https://developer.apple.com/design/human-interface-guidelines/segmented-controls) y [Buttons](https://developer.apple.com/design/human-interface-guidelines/buttons): rangos excluyentes con estado anunciado, tacto y foco; solo se actualiza el contenido que controlan.
- [Typography](https://developer.apple.com/design/human-interface-guidelines/typography), [Color](https://developer.apple.com/design/human-interface-guidelines/color), [Dark Mode](https://developer.apple.com/design/human-interface-guidelines/dark-mode) y [Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility): sistema tipográfico, cifras tabulares, acento del tema, texto y signo además del color, contraste y texto ampliado.

El reemplazo del anillo corresponde a la aprobación explícita de esta maqueta por Lucas. La regla general de otras métricas y sus colores se conserva; el cambio se documenta también en `docs/guia/reglas-y-entrega.md`.


## Actualización del 2026-11-02

Integrada sobre main `9f1e89f` y las etapas Agenda #944, Ficha #945 y
fecha de edición #946. Sin conflictos de código; conservados los cambios de
Wrapped, pautas UDD, temas festivos y semáforo de Inicio de main.
Build, JS, CSS 3537/3537 y diff correctos; **385 tests completos aprobados**.
Chrome real a 375/1280, claro/oscuro: las cuatro pantallas sin errores ni
desborde, ingreso inline → editadaEn → valor del gráfico igual al GPA del motor.
Se conservan las capturas aprobadas de arriba; comprobación actual en
`/tmp/gh-evolucion-pr-qa`, con datos sintéticos y red externa bloqueada.
No SQL, migración retroactiva ni cambio en el motor. Las pruebas de la etapa
4 cubren el dato aditivo y la sincronización entre dispositivos.
