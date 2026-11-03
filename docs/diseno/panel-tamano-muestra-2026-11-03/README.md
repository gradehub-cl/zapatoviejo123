# Tamaño de muestra en Alumnos · 2026-11-03

Solo datos sintéticos. La ficha muestra el tamaño de cada referencia del ramo,
la sección, la categoría o la evaluación: «vs. N estudiantes en GradeHub».
El tamaño de una evaluación puede ser distinto al del ramo. No se suman muestras
entre evaluaciones ni se presentan como personas únicas del gráfico completo.

## Contrato y compatibilidad

`comparacion_ramo_profesor(p_tenant, p_sigla, p_seccion default null)` ya devuelve
`personas` junto a `promedio` en `ramo`, `categorias` y `evaluaciones`
(`supabase/profesor_alumnos.sql`). Cada persona cuenta una vez por agregado y
el servidor exige cinco. No requiere SQL nuevo ni se aplicó SQL.

El tamaño es el de la referencia calculada, no la matrícula oficial. La referencia
del ramo usa `curso_notas` actualizado en los últimos 30 días; las evaluaciones y
categorías usan las notas guardadas en `user_ramos`. Se conserva esa selección.
No se consultaron cuentas reales.

El cliente muestra y exporta comparaciones solo con un tamaño entero conocido de
al menos cinco. Tamaños inferiores, ausentes o inválidos no se revelan ni se
convierten en cero: «No disponible» y celdas vacías. Una RPC ausente mantiene las
notas compartidas y muestra el estado de comparación no disponible.

Ambos CSV agregan al final `Estudiantes en GradeHub (ramo)` y
`Estudiantes en GradeHub (sección)`. La segunda queda vacía cuando no corresponde
o falta muestra. Se mantienen el orden y el contenido de las columnas anteriores
para referencias válidas; las comparaciones sin muestra suficiente quedan vacías.
No se cambian notas, cálculos, preferencias ni datos guardados de cuentas existentes.

## Validación

- `npm run build`, comprobación JS, balance CSS y `git diff --check`.
- `npm test -- --resumen`: 394 archivos aprobados. Incluye pruebas PGlite del
  agregado existente, autorización, deduplicación y mínimo de cinco.
- Cinco casos nuevos: tamaños 5/23, 0/1/4, RPC/tamaño ausente, ambas exportaciones
  con sección independiente y tamaño por evaluación en gráfico/tabla.
- Chrome con RPC simulada: ramo 23, sección 9, evaluación del ramo 7 y de la
  sección 5. Cambiar ambos controles actualiza cada referencia. Tamaño 4 y
  error `PGRST202` no revelan una muestra ni interrumpen la ficha.
- 375/1280 px, claro/oscuro, texto normal/200%, movimiento reducido; controles
  conservados de al menos 44 pt. Sin desborde horizontal ni cifras superpuestas.
- Texto secundario `--fg2`: contraste observado 7,51:1 en claro y 9,73:1 en
  oscuro sobre el fondo de la ficha. Cifras tabulares, sin colores nuevos.
- HIG: [Lists and tables](https://developer.apple.com/design/human-interface-guidelines/lists-and-tables),
  información secundaria junto a su valor y jerarquía estable de las filas.

## Capturas

`ramo-*` muestra la referencia del ramo. `evaluaciones-*` muestra las evaluaciones
tras cambiar a sección y comparar la última nota con ella. `-200` amplía el texto.

| Ancho | Tema | Ramo | Evaluaciones | Ramo 200% | Evaluaciones 200% |
|---|---|---|---|---|---|
| 375 | Claro | [Ver](ramo-375-claro.png) | [Ver](evaluaciones-375-claro.png) | [Ver](ramo-375-claro-200.png) | [Ver](evaluaciones-375-claro-200.png) |
| 375 | Oscuro | [Ver](ramo-375-oscuro.png) | [Ver](evaluaciones-375-oscuro.png) | [Ver](ramo-375-oscuro-200.png) | [Ver](evaluaciones-375-oscuro-200.png) |
| 1280 | Claro | [Ver](ramo-1280-claro.png) | [Ver](evaluaciones-1280-claro.png) | [Ver](ramo-1280-claro-200.png) | [Ver](evaluaciones-1280-claro-200.png) |
| 1280 | Oscuro | [Ver](ramo-1280-oscuro.png) | [Ver](evaluaciones-1280-oscuro.png) | [Ver](ramo-1280-oscuro-200.png) | [Ver](evaluaciones-1280-oscuro-200.png) |
