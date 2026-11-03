# Promedio bajo 4 en el panel del profesor

Verificación con pautas y cuentas sintéticas, sin consultar datos reales.
Base: `0625f5b`. No se consultó ni modificó Supabase.

## Diagnóstico

| Hipótesis | Resultado sintético |
|---|---|
| Compuerta | Reproducido: Pruebas 6,0 (70%) y Examen 4,5 (30%), con mínimo 5,0 y tope 3,9. Ambos lados calculan 3,9; faltaba la explicación en el panel. También se probó una compuerta de grupo. |
| Universidad del profesor | No se reproduce con tenant válido: se usa el del alumno. Se comprobaron ambos cruces UC/UAndes y la regla institucional del examen UDD frente a UC. |
| Contexto de ramos | No se toma el laboratorio del profesor. El laboratorio compartido del alumno sigue contando incluso si el buscador lo oculta. Sin laboratorio en el estado compartido se calcula solo la parte disponible, igual que el motor con ese mismo contexto. |
| Pendientes o pesos | Las pendientes no se convierten en cero. Sí se encontró un bug con pesos numéricos en texto: se concatenaban en vez de sumarse. Con 4,2 al `"75"` y 6,2 al `"25"`, daba 0,1 en vez de 4,7; afectaba tanto al alumno como al profesor. |
| Redondeo | Ambos lados pasan por la nota oficial. Se probaron 3,949/3,95 y 4,049/4,05 y el redondeo propio de UAndes. |

Estos casos explican mecanismos posibles; no identifican cuál está presente en
la cuenta reportada. No se usaron sus datos.

El panel solo conoce los ramos compartidos. Si el alumno tiene en su cuenta un
laboratorio que no compartió, no se puede reconstruir su nota combinada desde
el panel. El test de ausencia verifica que no se invente ese dato ni se tome el
del profesor; no afirma conocer un promedio basado en datos privados ausentes.

## Cambios y cuentas existentes

- Una sola función produce el texto de compuerta de la ficha y del panel.
  Aparece en la fila compacta, «Necesitan atención», el detalle actual y el
  desglose de categorías. No se aplica ni modifica ningún mínimo o tope.
- `gh_weightOf` interpreta pesos numéricos en texto, también dentro de una
  categoría y en reemplazos de ponderación. El cálculo y el solver los leen de
  la misma forma. Los pesos que ya eran números no cambian.
- No se cambia `S`, `gradehub_v1`, el JSON compartido, ids, fechas ni notas. No
  hay SQL ni migración. En una cuenta existente con pesos en texto, el promedio
  y las metas se corrigen al recalcular; sus pesos guardados quedan intactos.
- El texto de la ficha del estudiante conserva literalmente su contenido.

## Pruebas

`tests/panel-promedio-bajo-4.test.js` contiene un test independiente por cada
hipótesis. Compara bruto, nota oficial, cifra formateada, resumen y detalle del
profesor con la app del alumno. Comprueba que no cambien los datos compartidos
ni el estado del profesor al entrar y salir del cálculo.

Build, sintaxis JS, balance CSS y `npm test -- --resumen`: **394 archivos de
tests aprobados**. Vocabulario y `git diff --check` aprobados.

Chrome con red externa bloqueada: 16 capturas de fila y ficha a 375/1280 px,
claro/oscuro y texto al 200%. Sin errores JS ni desborde horizontal; el motivo
es texto seleccionable y accesible, no depende del color.

- [Fila móvil oscura](lista-375-oscuro.png)
- [Ficha móvil clara al 200%](ficha-375-claro-200.png)
- [Fila escritorio clara](lista-1280-claro.png)
- [Ficha escritorio oscura](ficha-1280-oscuro.png)

HIG: [Feedback](https://developer.apple.com/design/human-interface-guidelines/feedback).
El estado se explica junto al dato, sin alertas ni acciones adicionales.
