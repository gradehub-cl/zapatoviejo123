# Reglas académicas pendientes de modelar

> Extraído de `docs/contexto.md` sin cambiar el contenido. Sus fechas, cifras y
> estados describen el momento en que se anotaron: verifica el código y git
> antes de tratarlos como actuales. [Índice](../contexto.md).

### Las reglas que el motor todavía no calcula

`drop_lowest` fue la primera de `noCalcula` que pasó a calcularse. La segunda
fueron las **inasistencias justificadas**: `ausenciasJustificadas` se declara en
el preset (hoy solo Micro, que es el único programa que dice a qué evaluación
pasa el porcentaje), `presetRamo()` la resuelve a ids y el estudiante marca la
inasistencia en la ficha. Está hecha: no la vuelvas a proponer.

Quedan, en orden de dificultad:

| Regla | Qué falta |
|---|---|
| Eximición del examen con Casos ≥ 5,5 (Gestión de Personas) | Falta el dato: “Casos y ensayos” está agrupado y el programa no dice cuántos casos son. Sin poder contar cuántos quedaron bajo 4,0 no se puede decidir la eximición; requiere rediseño del preset FEN con Martín, no un `if` por ramo. |
| Examen de Segunda Fecha (Métodos) | El programa da quién puede rendirlo (examen bajo 3,0 y promedio ≥ 3,95; en Métodos I también una inasistencia justificada), pero no dice con qué nota queda el ramo al aprobarlo. Falta una nota fija o fórmula oficial; no se puede reutilizar el recuperativo de Micro sin inventarla. |
| ±10 décimas por evaluación entre compañeros | El dato no existe en la app |
| Busuu reprobatorio (Inglés IV) | El programa dice que reprueba pero no fija la nota mínima, así que no hay umbral que declarar |

Y una que **no es calculable y no lo va a ser**: el 75% de asistencia a los
controles sorpresa de Contabilidad. El programa dice "entre 4 y 6 controles", así
que no existe el denominador. Esa se queda declarada para siempre.
