# Solo pruebas: clasificación explícita

Auditoría 2026-11-04: las categorías no traen un tipo académico general. `type`
en el motor identifica reglas, no prueba/laboratorio/tarea. El clasificador de
Canvas usa nombres para emparejar calendarios; no se reutilizará para inferir
este análisis.

Propuesta: `src/data/panel-tipos-evaluacion.js` contendrá una tabla explícita por
tenant, preset y categoría exacta. Se empieza con Cálculo I/II y Dinámica UC,
según las categorías de sus programas ya transcritas en `uc-pautas.js`.
Prueba, examen y control entran; laboratorio/tarea y categorías desconocidas no.
El nombre solo busca la anotación declarada: no hay regex que adivine tipos.
Una categoría con `tipoEvaluacion` explícito válido también podrá usarse, sin
crear ese campo ni migrar los documentos. No se modifica `gradehub_v1`.
Los ramos existentes con origen de catálogo leen la tabla en memoria; una pauta
manual sin metadatos queda sin clasificación, aunque se llame igual.

El interruptor parte apagado y vive en la sesión del panel. Activo, muestra un
promedio de referencia ponderado por pesos de categorías con notas, sin
compuertas, bonus, descartes ni aportes vinculados. Usa la agregación del motor
sobre un árbol de referencia sin esas reglas, no otro cálculo oficial. Mantiene visible la nota oficial,
calculada por `ramoAvg`. Las comparaciones por evaluación excluyen tipos ajenos;
la referencia global solo se calcula si hay agregados suficientes en todas las
categorías incluidas, para no comparar subconjuntos distintos. El mínimo de dos
comparables por período se conserva. Lo desconocido se cuenta y se avisa.

No cambian riesgos, aprobación ni notas oficiales de la lista/CSV. La exportación
conserva el panel completo sin el filtro y se explica junto al control.
Sin SQL nuevo; no se consulta ni modifica producción.
