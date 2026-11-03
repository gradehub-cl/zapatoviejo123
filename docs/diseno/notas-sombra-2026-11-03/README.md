# Notas sombra — fase 1

Comparación contra `0625f5b` de main. Todas las cuentas, notas y pautas son
sintéticas. No se consultó ni modificó Supabase.

## Capturas

40 PNG: ocho antes y 32 después. Cada caso tiene versiones a 375 y 1280 px,
en claro y oscuro, con texto normal y al 200% (`-200`).

| Caso | Antes | Después |
|---|---|---|
| Reparto parejo, móvil oscuro | [Antes](antes-normal-375-oscuro.png) | [Después](despues-normal-375-oscuro.png) |
| Reparto parejo, escritorio claro | [Antes](antes-normal-1280-claro.png) | [Después](despues-normal-1280-claro.png) |
| Examen en su mínimo, móvil claro 200% | — | [Después](despues-minimo-375-claro-200.png) |
| No alcanza, móvil oscuro | — | [Después](despues-no-375-oscuro.png) |
| Ya aprobaste, móvil claro | — | [Después](despues-ya-375-claro.png) |

En el caso normal el slider del examen está abierto y tiene bloqueado el tramo
inferior a 3,5. En «mínimo», el examen queda en 3,5 y las demás pendientes en 1,0:
no se afirma que ya aprobaste porque falta cumplir la compuerta.

## Verificación en navegador

Chrome/Playwright, sin service worker y con solicitudes externas bloqueadas.
Se comprueba el código ensamblado desde `src/orden.json`, no un bundle cacheado.

- Sin desborde horizontal en los ocho tamaños/temas/tamaños de texto.
- Botones −/+ de 44 × 44 px, slider nativo, foco conservado al soltar una fijación.
- `Home` y flecha izquierda no permiten pasar bajo el mínimo del examen.
- Arrastrar actualiza el mismo nodo del slider, sin reemplazarlo durante el gesto.
- Fijar 4,5 no modifica `S`, `gpa(S.ramos)` ni localStorage.
- Tocar la sombra abre el campo existente; escribir 5,1 y salir guarda una nota
  real, elimina esa sombra y recalcula las restantes.
- Cada sombra libre y el medidor reciben literalmente la misma cifra.
- Recargar el JSON normalizado de una cuenta sintética con notas conserva sus
  datos y descarta las fijaciones de sesión. No se añade ningún campo guardado.
- Sin errores de JavaScript durante capturas e interacciones.
- Contraste del texto gris sobre la tarjeta: 5,20:1 en claro, 6,12:1 en oscuro.
  Etiquetas, marcas y valor del slider también superan 4,5:1.

## Alcance del cálculo

`modeloNotasSombra` clona el ramo y pasa las hipótesis a `notaNecesaria`, que usa
el motor compartido; valida el resultado completo con `ramoAvg` y
`notaFinalOficial`. El valor se sube a la décima suficiente, como el medidor.
Los mínimos de una sola evaluación se fijan temporalmente y se liberan, del
menor al mayor, cuando vuelven a participar en el reparto parejo.

En esta fase se conserva la UI anterior si hay pesos condicionales, vínculo
cátedra/laboratorio, descartes pendientes, lista abierta, pesos incompletos,
casillas ambiguas/sobrantes, compuertas distintas de un mínimo explícito de una
sola evaluación, mínimo institucional implícito de examen, eximición,
recuperativo, reemplazos optativos o ausencias justificadas activas. También se
conserva si el motor no entrega un valor finito o no pasa la comprobación de
suficiencia y de décima mínima. Una pauta completa, sin pendientes, o una cuenta
de profesor no incorpora esta interfaz.

Simular, el promedio real y los datos que consumen Estadísticas, Agenda y Wrapped
siguen usando las notas reales. La sesión hipotética se descarta al recargar o
reemplazar el estado de la cuenta; nunca se guarda ni se sincroniza.

## HIG

[Sliders](https://developer.apple.com/design/human-interface-guidelines/sliders):
respuesta continua, sentido numérico ascendente, extremos y valor explícitos,
control nativo con etiqueta y `aria-valuetext`.
[Steppers](https://developer.apple.com/design/human-interface-guidelines/steppers):
ajuste fino por décimas mediante −/+ junto al valor, extremos deshabilitados.
Áreas de 44 pt, foco visible y despliegue inmediato con movimiento reducido.
