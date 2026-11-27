---
name: gradehub-dashboard
description: Cómo diseñar vistas de notas y estadísticas en GradeHub - Inicio (promedio y ramos), ficha del ramo, "Necesitas X", simulador, Estadísticas del estudiante, del profesor y de administración, evolución del promedio, avance, comparaciones con semestres anteriores o con el curso. Úsalo al crear o cambiar cualquier número protagonista, gráfico, anillo, medidor, barra, tabla de notas o panel de métricas, o cuando pidan "dashboard", "estadísticas", "gráfico", "KPI" o "que se entienda mejor cómo voy". Complementa gradehub-design-system (tokens, formato, estados) y se verifica con gradehub-ux-review.
metadata:
  version: "1.0"
  owner: equipo-gradehub
---

# Vistas de notas y estadísticas

Una vista de notas responde preguntas, en este orden:
1. **¿Cómo voy?** (promedio actual, en su escala 1,0–7,0)
2. **¿Qué necesito?** (nota necesaria en lo que queda, o si ya está asegurado / es imposible)
3. **¿Qué lo mueve?** (qué evaluación pesa más, qué subió o bajó)
4. **¿Cómo vengo?** (evolución, comparación con semestres anteriores)

Si un elemento no ayuda a responder una de estas, sobra. Diseña primero el
texto de la respuesta ("Vas con 5,2. Necesitas 3,1 en el examen para aprobar")
y después el gráfico que la apoya.

## 1. Reglas que no se discuten

- **Cada número en su escala** (decisión vigente): anillo 1–7 con el 4,0
  marcado, medidor para la nota necesaria, escala con el rango posible,
  barras que salen del centro para variaciones. Usa las piezas existentes:
  `htmlAnillo`, `htmlMedidorNota`, `htmlEscalaNotas`, `htmlBarraCentrada`
  (búscalas con `npm run buscar -- --ver htmlAnillo`). No crees otro anillo ni
  importes librerías de gráficos.
- **Color con significado**: semáforo solo donde hay riesgo de reprobar (la
  nota necesaria, el estado del ramo). El promedio del semestre va en el
  acento y **sin** palabra de veredicto. El avance va neutro. En variaciones y
  "Qué mueve tu promedio": verde suma, rojo resta. El color del ramo no tiñe
  su nota.
- **El 4,0 es la referencia** en toda escala de notas (línea discontinua o
  marca), con etiqueta "4,0".
- **Escala honesta**: ejes de notas de 1 a 7 (o el rango del tenant), no
  recortados para exagerar; si se hace zoom (p. ej. 3–7 en la evolución),
  dilo con las marcas del eje. Barras siempre desde una base real (0 o el
  centro de variación).
- **No inventes datos**: sin fechas, no se inventa un día; sin historial, no
  hay línea; sin suficientes compañeros, no hay comparación con el curso. Se
  dice qué falta en una línea.
- **Las cifras vienen del motor** (`gpa`, `ramoAvg`, `notaFinalOficial`,
  `solveForTarget`). La vista nunca recalcula por su cuenta.
- Formato es-CL con coma, `tabular-nums`, plurales correctos (ver
  `gradehub-design-system`).
- Brillos suaves sí (estilo actual), pero se apagan con
  `prefers-reduced-motion`; nada de animar números contando hacia arriba si
  hay movimiento reducido.

## 2. Jerarquía de una vista

```
┌──────────────────────────────┐
│ Contexto (semestre / ramo)   │  --fs-secundario, --fg3
│ 5,2            ◔ anillo       │  cifra protagonista --fs-cifra-xl
│ Necesitas 3,1 en el examen    │  frase-respuesta, semáforo solo aquí
├──────────────────────────────┤
│ Qué mueve tu promedio         │  2–4 filas, barras centradas
├──────────────────────────────┤
│ Detalle (tabla/lista)         │  plegable; alternativa accesible
└──────────────────────────────┘
```

- **Una cifra protagonista por vista.** Las demás, de menor tamaño y peso.
  Máximo 3–4 indicadores visibles sin scroll a 390 px.
- **Etiqueta antes que leyenda**: rotula directo sobre la línea/barra; evita
  leyendas separadas que obligan a ir y volver.
- **Menos tinta**: sin bordes de gráfico, sin cuadrícula densa (solo 1–7 y la
  referencia 4,0), sin sombras en barras, sin 3D, sin degradados que no
  codifiquen nada.
- **Comparaciones explícitas**: "↑ 0,3 vs 2026-1" con el semestre nombrado;
  nunca un número de comparación sin decir contra qué.
- **Densidad por ancho**: a 390 px una columna, gráficos de ancho completo,
  tablas como listas; a 1280 px grilla de 2–3 columnas con ancho máximo y la
  cifra protagonista arriba a la izquierda.

## 3. Qué gráfico para qué pregunta

| Pregunta | Usa | No uses |
|---|---|---|
| Promedio actual vs escala | `htmlAnillo` (1–7, marca 4,0) o cifra + `htmlEscalaNotas` | Velocímetro decorativo, % de 7 |
| Nota necesaria | `htmlMedidorNota` + frase ("Necesitas 4,6 en el examen") | Solo el número sin contexto |
| Rango posible del ramo (mín. si saco 1,0 / máx. si saco 7,0) | `htmlEscalaNotas` con banda min–max | Dos números sueltos |
| Qué evaluación pesa/mueve más | `htmlBarraCentrada` o barras horizontales ordenadas | Torta/dona de ponderaciones |
| Evolución en el tiempo | Línea de segmentos rectos, puntos por nota, referencia 4,0 discontinua | Curvas suavizadas que inventan valores intermedios |
| Varios ramos comparados | Lista ordenada con barras horizontales cortas o "dot plot" | Barras verticales con 8 colores |
| Avance (% evaluado) | Riel neutro con `scaleX` | Barra verde que "celebra" |
| Distribución del curso (profesor/admin) | Histograma 1,0–7,0 en tramos de 0,5 con 4,0 marcado | Promedio solo, sin dispersión |
| Tendencia compacta en una fila | Sparkline sin ejes, con último valor rotulado | Mini-gráfico con ejes y leyenda |
| Meta vs real (p. ej. meta del semestre) | Bullet graph horizontal (real, meta, rangos neutros) | Dos anillos |

Interacción: dedo, mouse y teclado consultan el valor exacto de cada punto
(tooltip/etiqueta con fecha y evaluación). **Siempre** hay una tabla o lista
con los mismos datos, accesible sin gesto.

## 4. Estados de una vista de notas

| Estado | Qué mostrar |
|---|---|
| Sin ramos | Vacío con "Agrega tu primer ramo"; no muestres anillos en 0. |
| Ramo sin notas | Escala vacía con el 4,0 marcado + "Cuando ingreses la primera nota calculamos tu promedio". Nunca "0,0" ni "NaN". |
| 1 nota | Cifra + "con 1 nota de 5". No dibujes línea de evolución con un punto (muestra el punto). |
| Ya aprobado asegurado | "Ya aprobaste: aunque saques 1,0 terminas con 4,1" en neutro/verde suave. |
| Imposible aprobar | "Aunque saques 7,0 no alcanzas el 4,0 con esta pauta" en rojo, con tono claro y sin dramatizar. |
| Necesita > 7,0 o < 1,0 | Se traduce a "imposible" / "asegurado"; nunca mostrar "Necesitas 7,8". |
| Ramo cerrado (100 %) | "Ramo cerrado · Nota final 5,6", tono neutro. |
| Pauta con datos faltantes | Aviso en línea: "La pauta no indica cuánto vale el examen", y no se calcula lo que depende de eso. |
| Pauta de consenso | "Pauta de N estudiantes", distinta de la del programa. |
| Cargando / error / sin conexión | Ver `gradehub-design-system` §5; el esqueleto tiene la forma del anillo/lista. |

Prueba siempre con estos datos sintéticos: notas 1,0 / 3,9 / 4,0 / 4,05
(redondeo) / 7,0; nombres de ramo de 70 caracteres; 1, 2 y 12 ramos; un
semestre sin fechas; ponderaciones que no suman 100 %.

## 5. Profesor y administración

- Mismas piezas y mismas reglas de color que el estudiante.
- Distribuciones antes que promedios: histograma + mediana + % bajo 4,0.
- Nunca mostrar datos que identifiquen a un estudiante fuera de lo permitido
  por las RLS y las vistas de profesor (`esCuentaProfesor()` ≠
  `esProfesorAprobado()`); en capturas y ejemplos, solo nombres ficticios.
- Tablas largas: encabezado fijo, columnas numéricas a la derecha con
  `tabular-nums`, orden por clic con `aria-sort`, filtro visible.

## 6. Accesibilidad de gráficos

- Cada gráfico SVG con `role="img"` y `aria-label` que diga la conclusión
  ("Promedio 5,2 de 7; necesitas 3,1 en el examen"), no la descripción
  ("gráfico de anillo").
- Tabla/lista equivalente (puede ir plegada con `<details>`).
- No depender del color: marcas, etiquetas y patrones de línea (discontinua
  para referencia).
- Contraste de líneas y marcas ≥ 3:1 contra el fondo, en claro y oscuro.
- Objetivos de consulta (puntos) ≥ 44 px de área efectiva aunque el punto mida 6 px.

## 7. Checklist antes de entregar una vista de datos

- [ ] La frase-respuesta existe y se lee sin mirar el gráfico.
- [ ] Una cifra protagonista; jerarquía clara a 390 px.
- [ ] Cada número en su escala, 4,0 marcado, ejes honestos.
- [ ] Semáforo solo donde hay riesgo; promedio de semestre en acento.
- [ ] Ningún dato inventado; faltantes explicados.
- [ ] Estados de §4 probados con datos sintéticos.
- [ ] Alternativa en tabla, `aria-label` con conclusión, foco y teclado.
- [ ] Movimiento reducido respetado.
- [ ] Capturas con `gradehub-ux-review` (390/1280, claro/oscuro, texto grande).
- [ ] Cifras salen del motor (`gpa`, `ramoAvg`, `notaFinalOficial`); si tocaste
      cálculo, `npm test` con casos concretos.
