# UDD: examen en pautas manuales sin compuerta

Fuente: [Reglamento Académico, DR50/26, marzo 2026](https://www.udd.cl/dircom/reglamentos/Reglamento-alumno-regular-de-pregrado.pdf), arts. 36–37, p.10. El examen exige 3,0; si no se cumple, la final es su nota. No es un tope sobre el promedio.

La regla vive en `GH_REGLAS_NOTA_POR_TENANT.udd.examenFinal`. El adaptador la deriva sin escribir datos cuando el ramo no tiene compuertas y hay exactamente una categoría vigente con peso positivo llamada Examen, Examen final o Evaluación final. No se inventa un examen a partir de otro nombre ni entre dos componentes ambiguos; la pauta explícita conserva prioridad. Las excepciones del programa deben declararse en su pauta, no inferirse.

Con pruebas 6,0 al 60% y examen 2,9 al 40%, antes se mostraba 4,8; ahora 2,9. Con parciales 2,0 y examen 2,8, se muestra 2,8, aunque el promedio ponderado fuese menor. Examen pendiente conserva el promedio parcial; la nota necesaria sí respeta el mínimo. Un examen cerrado bajo 3,0 no se puede salvar con una nota alta en los parciales.

## Cuentas existentes

No cambia notas, ids, fechas, pesos ni compuertas guardadas. No se migra `gradehub_v1` ni Supabase. El cálculo de un ramo elegible usa la norma vigente; un final `avgOverride` confirmado en el historial conserva su valor. Una pauta con compuerta explícita no cambia en este PR: su sustitución se revisa aparte. No se presenta la fórmula como verificada para nombres o exámenes ambiguos.

Consulta agregada de solo lectura, 2026-11-02: una cuenta UDD con ocho ramos activos sin compuertas; **ninguno** tiene una única evaluación final identificada por esos nombres. Alcance identificado actual: **0 cuentas / 0 ramos**. Es un alcance de reglas, no una lectura de calificaciones. No se devolvieron nombres de personas, ids ni notas. Consulta reproducible: `docs/consultas/udd-examen-manual.sql`.

## Verificación

`tests/udd-examen-manual.test.js` convierte el reproductor de #937 en test descubierto por npm test. Se ejecutó antes del arreglo y falló con actual 4,8 / esperado 2,9. Usa la app real con datos inventados; cubre sustitución, mínimo exacto/redondeado, solver, aislamiento de universidad, notas sin fecha y final confirmado del archivo. No usa presets como fixtures.

La ficha diferencia «la nota final queda en…» de un tope. Sin controles nuevos, semáforo, fuente o interacción nuevos; se conserva la accesibilidad del aviso existente. HIG [Typography](https://developer.apple.com/design/human-interface-guidelines/typography) y [Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility): expresar la consecuencia con texto, no solo color.
