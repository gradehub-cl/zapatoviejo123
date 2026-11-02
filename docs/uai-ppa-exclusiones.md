# UAI: exclusiones del promedio académico

Fuente primaria: [Reglamento de programas de pregrado 2026](https://uai.cdn7pm.net/documentos/reglamento-programas-de-pregrado-2026.pdf), artículo 28, pp. 7–8. El PPP y el PPA ponderan por créditos y excluyen Educación Física, extraprogramáticas y convalidaciones. El PPA además excluye intentos reprobados de asignaturas aprobadas posteriormente. No se excluye una reprobación posterior a la aprobación.

La política vive en `GH_REGLAS_NOTA_POR_TENANT`, no en una condición por universidad dentro del algoritmo. `resumenPromedioAcademico` ordena por el semestre identificable y usa sigla o clave estable: un nombre parecido no prueba que sea la misma asignatura. Fechas o identidades desconocidas no se adivinan. Se calcula a una décima, solo con créditos conocidos; falta de créditos no se presenta como PPA simple.

## Cuentas existentes

Las tres clasificaciones no existían en el modelo. `exclusionPromedio` es un campo nuevo, opcional, que la persona declara en Editar ramo o al corregir una final histórica. Ausente mantiene el ramo incluido. No se adivina por el nombre “Deportes”, no se borran intentos ni se migran notas. El semestre conserva su reprobación: solo el acumulado excluye el intento cuando hay aprobación posterior. El selector conserva nombre, notas y créditos.

Por eso la interfaz dice **PPA estimado del historial** y recuerda revisar exclusiones. No certifica el PPA del portal ni supone que el historial esté completo. La nota oficial declarada tiene prioridad; ramos pendientes quedan fuera del acumulado. La caché de promedio histórico se recalcula al leer para aplicar la clasificación actual, sin reescribirla.

Consulta agregada de solo lectura del 2026-11-02: **35 cuentas UAI activas, ninguna con historial archivado**; 0 ramos históricos y 0 claves repetidas entre períodos. La regla está disponible para los próximos cierres. No se devolvieron notas ni identidades. El conteo potencial de 35 cuentas no equivale a 35 personas con una nota incorrecta.

## Integración con #937

Esta PR nace de main, donde aún no existe `promedioAcumuladoCierre`. Agrega el cálculo al historial actual y expone una sola función de selección. Cuando se integre #937, su `promedioAcumuladoCierre(historial)` debe consultar primero `resumenPromedioAcademico(historial)` y, si existe política académica, devolver su `nota`; para el resto conserva el acumulado genérico de #937. Esto está señalado en la revisión de #937 para evitar dos acumulados distintos.

## Pruebas

El reproductor original de #937 se ejecutó antes del arreglo: 2,0 en 2026-1 y 6,0 en 2026-2 daban 4,0, en vez de 6,0. Su caso se convirtió en `tests/uai-ppa.test.js` dentro de `npm test`, con motor/app reales y datos sintéticos. Incluye las tres exclusiones, créditos faltantes, semestre desordenado o desconocido, aprobación anterior, homónimos sin código, persistencia y lectura inmutable. Chrome verificó guardar/reabrir la clasificación en 375 px claro y oscuro, sin cambiar la nota.

Sin SQL, borrado ni migración masiva. No modifica el Wrapped.
