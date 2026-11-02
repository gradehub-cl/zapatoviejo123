# Reglas pendientes: prioridad y evidencia, 2026-11-02

Seguimiento de #627–#633. No cambia cálculos ni marca como resuelta una regla sin programa. La consulta de `docs/consultas/reglas-627-alcance.sql` es agregada y de solo lectura: no devuelve notas, cuentas ni identidades. Cuenta personas con el ramo activo, no personas que incumplen la regla. Normaliza variantes de nombre; no suma los grupos de alias que pueden repetir a una misma cuenta.

| Ramo | Cuentas | Regla pendiente / siguiente paso |
|---|---:|---|
| Dinámica UC, ambas siglas | 298 | Vínculo y laboratorio faltante: PR separada de #652. No cambiar la fórmula 2026-2 sin programa. |
| Laboratorio de Dinámica | 297 | Tope del informe si falta control y autoevaluación: falta la regla original completa y una declaración de control no rendido. Una casilla vacía también puede ser futura; no equivale a ausencia. La respuesta de coordinación del 14-10 confirma el promedio por laboratorio y el mínimo de pares, ya implementados; no resuelve este caso. |
| Gestión de Personas FEN | 164 | #629: eximición por casos ≥5,5 y menos de dos casos bajo 4,0. El preset mezcla casos/ensayos y no declara cantidad. Separarlos exige el programa, no un número supuesto. |
| Inglés IV FEN | 121 | #633: requisito Busuu. Falta el efecto numérico de reprobarlo; el umbral de la nota final no se puede deducir de 117/169 actividades. |
| Programación para Analítica de Datos FEN | 119 | #627: la regla habla de Solemne II, el preset tiene una sola Prueba Solemne. Falta el programa y el artículo para identificar la evaluación. #628: el recuperativo además excluye sanciones disciplinarias, dato hoy no declarado. |
| Biología de la Célula UC | 92 | #633: descarte con cantidad de controles no definida y efecto del examen reprobado sin fórmula verificable. No asumir cantidad ni nota de reprobación. |
| Introducción a la Economía FEN | 15 | #627: extra 90/10 solo si conviene. Falta el programa que define componentes y pesos internos del bloque extra; no basta una nota de prensa sobre educación financiera. |
| Matemáticas Avanzadas I UAI | 10 | #629: resultado del segundo examen. `docs/programas-uai-2026.json` marca fuente faltante para MAT124. No extender la regla del ramo II al I. |
| Razonamiento Cuantitativo con Datos I UAI | 6 | #627: sigue faltando `Syllabus RCD I - 2do.pdf` para saber si ET/EP incluyen examen. No copiar RCD II. |

## Qué ya se representa y qué sigue en pausa

El catálogo actual ya declara fórmulas condicionales de Contabilidad Gerencial/Estrategia Competitiva, compuertas de Comunicación, reemplazos optativos de Métodos de Optimización/Transporte y varias eximiciones e inasistencias justificadas. No rehacer esos mecanismos ni convertir una ausencia no informada en 1,0. Cada nuevo artículo que aparezca debe comprobarse contra el preset vigente y añadirse con un test sintético que falle antes, en su propia PR.

Econometría Aplicada y Revelación y Fe siguen **en pausa por decisión de Lucas** (#631). No se activan bonus, tickets ni reemplazos por semejanza con otra pauta.

## Búsqueda de fuentes y límites

Se revisaron los comentarios de #627–#633, las fuentes y pruebas de main, los inventarios `docs/programas-uc-2026.json` y `docs/programas-uai-2026.json`, los programas locales disponibles, una búsqueda acotada en Drive y fuentes oficiales públicas. No se encontró una versión verificable del programa FEN ENGIN105 ni de MAT124/RCD I que resuelva las brechas anteriores. Los documentos de otros cursos y los resultados de búsquedas genéricas no se usaron como artículos académicos.

La [nota oficial FEN sobre Educación Financiera](https://econ.uchile.cl/noticia/curso-de-educacion-financiera-para-la-ciudadania-recibe-40-000-estudiantes/) confirma su incorporación a Introducción a la Economía, pero **no prueba la fórmula 90/10 ni sus pesos**. No sustituye el programa.

Para desbloquear cada fila hace falta el programa del período/sección con el apartado exacto, y donde corresponda una entrada explícita del estudiante (ausencia, sanción o clasificación). Hasta entonces las advertencias existentes se mantienen; las cuentas con notas no sufren una reinterpretación silenciosa. No hay SQL que aplicar ni cambios de UI o Wrapped.
