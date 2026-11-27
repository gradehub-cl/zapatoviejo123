# 09 · Dashboards: cómo mostrar notas, progreso académico y riesgo

Fuentes abiertas: [Stephen Few, Dashboard Confusion (2004)](https://www.perceptualedge.com/articles/ie/dashboard_confusion.pdf) · [Stephen Few, Bullet Graph Design Specification (2013)](https://www.perceptualedge.com/articles/misc/Bullet_Graph_Design_Spec.pdf) · [Edward Tufte, Sparklines History](https://www.edwardtufte.com/notebook/sparklines-history-by-tufte-1324-to-now) · [NN/g, Dashboards: Making Charts and Graphs Easier to Understand](https://www.nngroup.com/articles/dashboards-preattentive/) · [NN/g, Progressive Disclosure](https://www.nngroup.com/articles/progressive-disclosure/) · [Apple HIG, Activity rings](https://developer.apple.com/design/human-interface-guidelines/activity-rings) · [Laws of UX (Goal-Gradient, Von Restorff)](https://lawsofux.com/) · [WCAG 2.2 (1.4.1, 1.4.11)](https://www.w3.org/TR/WCAG22/) · [Duolingo, la racha](https://blog.duolingo.com/how-duolingo-streak-builds-habit/)

---

## 1. Qué es (y qué no es) un dashboard
Definición de Stephen Few: **"una presentación visual de la información más importante necesaria para lograr uno o más objetivos, consolidada y organizada en una sola pantalla para poder monitorearla de un vistazo"** ([Few 2004](https://www.perceptualedge.com/articles/ie/dashboard_confusion.pdf)). Atributos que exige:
- **Resúmenes de alto nivel, incluidas las excepciones**: dice *qué* pasa, no *por qué*; el porqué se investiga con detalle (drill-down).
- **Mecanismos de visualización concisos, claros e intuitivos**; "insistir en widgets vistosos o parecidos a los de un auto cuando otros mecanismos funcionan mejor es contraproducente".
- **Personalizado** a la persona y su objetivo.
- No es un portal ni un lanzador de cosas; no requiere tiempo real si basta una foto periódica.

NN/g distingue **operacionales** (información crítica rápida para tareas con tiempo) y **analíticos** (de un vistazo para análisis y decisión) ([NN/g](https://www.nngroup.com/articles/dashboards-preattentive/)).

**En GradeHub**: Inicio es un dashboard **operacional** (¿cómo voy y qué hago ahora?). Estadísticas es **analítico** (tendencias, comparación entre ramos y semestres). No mezclarlos: Inicio no debe tener 8 gráficos.

### El objetivo del estudiante define el dashboard
Preguntas que Inicio debe responder en 5 segundos, en este orden:
1. ¿Voy aprobando el semestre? (promedio y estado)
2. ¿Qué ramo está en riesgo? (excepciones)
3. ¿Qué necesito sacar en lo que viene? ("Necesitas X")
4. ¿Qué tengo esta semana? (próximas evaluaciones)

## 2. Jerarquía de KPI
| Nivel | Qué | Cómo se ve | Ejemplo |
|---|---|---|---|
| **1 · Héroe** | 1 número | Display 48–56 px, arriba | **5,4** promedio ponderado del semestre · "Vas aprobando" |
| **2 · Excepciones/acción** | 1–3 alertas | Tarjeta con texto + color de estado + ícono | "Cálculo I: necesitas **4,6** en el Examen (40 %) para aprobar" |
| **3 · Por entidad** | Una fila por ramo | Fila con nota actual, mini-barra de avance, estado en texto | Cálculo I · 4,3 · 62 % evaluado · Justo |
| **4 · Contexto** | Tendencias, comparaciones | Sparklines, enlaces a Estadísticas | Sparkline de las últimas notas |

Reglas:
- **Un solo héroe**. Si el promedio aún no existe: mostrar "—" y "Agrega tu primera nota para calcularlo" (nunca un cuadradito gris ni "PROMEDIO GENERAL ·" vacío, hallazgos de la auditoría).
- **Siempre con contexto**: un número solo no dice nada. "5,4" + "sobre 4,0 para aprobar" + "con 58 % del semestre evaluado".
- **Excepciones primero** (Few): los ramos bien pueden ir colapsados; los en riesgo, arriba.
- **Von Restorff**: el color de alerta solo donde hay alerta ([Laws of UX](https://lawsofux.com/)).

## 3. Elegir el gráfico correcto
NN/g: la **posición en 2D y la longitud** son los atributos preatentivos que mejor se mapean a cantidad; barras y líneas se leen rápido; los gráficos **circulares o de área (tortas, donas, gauges, radares, treemaps) son difíciles de interpretar con rapidez y precisión**, y la dona es aún peor que la torta ([NN/g](https://www.nngroup.com/articles/dashboards-preattentive/)).

| Pregunta del estudiante | Gráfico recomendado | Evitar |
|---|---|---|
| ¿Cómo voy en este ramo respecto a la meta? | **Bullet graph** horizontal | Gauge/velocímetro, dona |
| ¿Cuánto del ramo ya está evaluado? | Barra de progreso apilada (evaluado / pendiente) con % en texto | Anillo de progreso sin número |
| ¿Cómo evolucionan mis notas? | **Línea** (o puntos conectados) con línea de referencia en 4,0 | Barras 3D, área rellena |
| ¿Cómo se comparan mis ramos? | **Barras horizontales ordenadas** por promedio, con marca en 4,0 | Radar, torta |
| ¿Cómo se reparte el peso de las evaluaciones? | Barra apilada al 100 % horizontal, o simplemente tabla con % | Torta con 7 tajadas |
| Tendencia compacta en una fila | **Sparkline** | Mini-gráfico con ejes y leyenda |
| Distribución de notas del curso (si hay datos agregados) | Histograma / dot plot con mi nota marcada | Box plot sin explicación |
| Semestre a semestre (PPA) | Línea o barras por semestre | Área apilada |

### Sobre anillos tipo Apple Fitness
Apple pide **no replicar ni modificar los Activity rings para otros fines** ni mostrar otros datos con ellos, y no usarlos como decoración ni branding ([Apple HIG](https://developer.apple.com/design/human-interface-guidelines/activity-rings)). Además, los anillos codifican en ángulo/arco, que NN/g considera difícil de comparar. Para GradeHub: inspirarse en la **idea** (meta diaria clara, cierre satisfactorio) pero dibujar **barras/bullets**, no anillos.

## 4. Bullet graph: el gráfico ideal para "¿cómo voy?"
Few lo diseñó para reemplazar medidores y gauges: muestra en poco espacio una medida principal, una o dos medidas comparativas (meta) y 2–5 rangos cualitativos (malo/aceptable/bueno) ([Few, Bullet Graph](https://www.perceptualedge.com/articles/misc/Bullet_Graph_Design_Spec.pdf)). Especificación:
- Etiqueta a la izquierda; escala lineal que empieza en cero **o** en un valor mayor si se usa un símbolo (punto/X) en vez de barra.
- Medida principal: barra oscura de ~1/3 del alto del contenedor.
- Medida comparativa: **línea corta perpendicular**, menos dominante.
- Rangos: **máximo 5, idealmente 3**, como **intensidades de un solo tono** (oscuro = peor), no tonos distintos, por daltonismo.
- Opcional: **proyección** del valor futuro según el desempeño actual.

**Adaptación a notas (escala 1,0–7,0)**: como la escala no empieza en 0, Few indica usar un **símbolo** (punto) en vez de barra. Rangos: 1,0–3,9 (reprobado), 4,0–4,9 (aprobado justo), 5,0–7,0 (holgado). Marca comparativa en 4,0 (o en la meta personal). Proyección: el rango de nota final posible según lo que falta evaluar (mínimo si sacas 1,0 en todo lo pendiente; máximo si sacas 7,0).

```html
<figure class="bullet" aria-labelledby="b-calc-t" style="--valor:4.3; --meta:4.0; --min:2.9; --max:6.1">
  <figcaption id="b-calc-t">Cálculo I · <strong class="num">4,3</strong> actual · final posible entre <span class="num">2,9</span> y <span class="num">6,1</span></figcaption>
  <div class="bullet__pista" aria-hidden="true">
    <span class="bullet__rango"></span>
    <span class="bullet__meta"></span>
    <span class="bullet__valor"></span>
  </div>
</figure>
```
```css
.bullet{ --pos: calc((var(--valor) - 1) / 6 * 100%); --pmeta: calc((var(--meta) - 1) / 6 * 100%);
         --pmin: calc((var(--min) - 1) / 6 * 100%); --pmax: calc((var(--max) - 1) / 6 * 100%); }
.bullet__pista{ position:relative; block-size:16px; border-radius:4px;
  background: linear-gradient(90deg,
    oklch(from var(--fg) l c h / .22) 0 50%,              /* 1,0–3,9: más oscuro = peor (Few) */
    oklch(from var(--fg) l c h / .12) 50% 66.6%,          /* 4,0–4,9 */
    oklch(from var(--fg) l c h / .05) 66.6% 100%); }      /* 5,0–7,0 */
.bullet__rango{ position:absolute; inset-block:5px; inset-inline-start:var(--pmin); inline-size:calc(var(--pmax) - var(--pmin));
  background: color-mix(in oklab, var(--primary) 35%, transparent); border-radius:3px; }   /* proyección */
.bullet__meta{ position:absolute; inset-block:1px; inset-inline-start:var(--pmeta); inline-size:2px; background:var(--fg); }
.bullet__valor{ position:absolute; top:50%; inset-inline-start:var(--pos); inline-size:10px; block-size:10px;
  translate:-50% -50%; border-radius:50%; background:var(--fg); }
```
El texto del `figcaption` lleva toda la información: el gráfico es redundante (accesible por diseño, WCAG 1.1.1/1.4.1).

## 5. Sparklines (Tufte)
Tufte: "gráficos pequeños, intensos, del tamaño de una palabra, con resolución tipográfica"; se pueden poner donde vaya una palabra o número; tienen **razón data-ink = 1,0** (sin marcos, ticks ni adornos) y toman su escala del texto o número cercano; nacieron de tres principios: **maximizar la densidad de datos, minimizar lo que no es dato, y el principio de encogimiento** ([Tufte](https://www.edwardtufte.com/notebook/sparklines-history-by-tufte-1324-to-now)).

En GradeHub: en cada fila de ramo, una sparkline de las notas en orden cronológico, con el último punto marcado y la nota al lado.
```html
<span class="fila-ramo__trend">
  <svg class="spark" viewBox="0 0 60 16" width="60" height="16" role="img" aria-label="Notas: 3,8, 4,5, 4,9, 5,2. Tendencia al alza.">
    <line x1="0" x2="60" y1="8" y2="8" class="spark__ref"/>   <!-- 4,0 → y = 16 − (n−1)/6·16 -->
    <polyline points="0,8.53 20,6.67 40,5.6 60,4.8" class="spark__linea"/>
    <circle cx="60" cy="4.8" r="2" class="spark__ultimo"/>
  </svg>
  <span class="num">5,2</span>
</span>
```
```css
.spark__linea{ fill:none; stroke:var(--fg-muted); stroke-width:1.5; vector-effect:non-scaling-stroke; }
.spark__ref{ stroke:var(--border); stroke-dasharray:2 2; }
.spark__ultimo{ fill:var(--fg); }
```
Regla: misma escala vertical (1,0–7,0) en todas las sparklines de la lista para que sean comparables (small multiples).

## 6. Data-ink en la práctica
Aplicando la idea de Tufte de minimizar lo que no es dato:
- Quitar fondos de gráfico, bordes, sombras, rejillas fuertes; dejar como mucho líneas guía muy tenues (que igual deben cumplir 3:1 si son necesarias para leer el gráfico, WCAG 1.4.11 ([WCAG 2.2](https://www.w3.org/TR/WCAG22/))).
- **Etiquetar directo** (valor al final de la línea o barra) en vez de leyendas lejanas.
- Una línea de referencia en 4,0 vale más que 7 líneas de rejilla.
- Sin 3D, sin degradados en barras, sin animaciones de entrada largas.
- Mostrar **una decimal** siempre; no "5,42857".

## 7. Cómo mostrar progreso académico
- **Progreso del ramo** = peso evaluado (%) + nota acumulada sobre lo evaluado. Mostrar ambos: "4,3 con 62 % evaluado". Barra apilada: evaluado (sólido) / pendiente (vacío).
- **Progreso del semestre**: ramos aprobados asegurados, en curso, en riesgo, como **conteos con texto** ("2 aprobados · 2 en riesgo · 1 bajo 4,0"), con espacios y separadores reales (hoy sale "2 aprobados2 en riesgo1 bajo 4,0").
- **Goal-gradient**: mostrar distancia a la meta en lenguaje humano: "Te faltan 0,3 décimas para el 4,0" ([Laws of UX](https://lawsofux.com/)).
- **Hábitos**: Duolingo encontró que dar flexibilidad (Streak Freeze) mantiene la constancia; permitir equipar dos congelamientos aumentó +0,38 % los aprendices activos diarios ([Duolingo](https://blog.duolingo.com/how-duolingo-streak-builds-habit/)). Si GradeHub usa rachas (p. ej., semanas registrando notas), que sean **flexibles** y nunca punitivas; en notas reales, la ansiedad es un riesgo.

## 8. Cómo mostrar riesgo
"Riesgo" debe ser una **regla explícita y explicable**, idéntica en todas las vistas (auditoría: "✓ Aprobado" en el ramo vs "en riesgo" en Inicio).

Propuesta de estados (función única `estadoRamo`):
| Estado | Regla (ejemplo) | Texto | Visual |
|---|---|---|---|
| Aprobado asegurado | Nota mínima final posible ≥ 4,0 | "Aprobado ✓" | Neutro/teal + ✓ |
| Bien encaminado | Actual ≥ 4,5 y necesitas ≤ 4,0 en lo pendiente | "Vas bien" | Neutro |
| Justo | Necesitas 4,1–5,5 en lo pendiente | "Necesitas 4,6" | Ámbar + ● |
| En riesgo | Necesitas 5,6–7,0 | "Necesitas 6,2: difícil" | Rojo + ▲ |
| Imposible | Necesitas > 7,0 | "Ya no alcanza el 4,0 en este ramo" + qué opciones hay (examen, recuperativa) | Rojo + ✕ |
| Sin datos | Sin notas | "Sin notas aún" | Gris + — |

- **Siempre explicar el porqué** con un toque ("¿Por qué?" → "Llevas 3,9 con 60 % evaluado; con el examen (40 %) necesitas 4,2").
- Tono: informar, no alarmar. Rojo solo para los dos últimos estados.
- Simulación: en "En riesgo", acción directa "Simular escenarios".
- Accesibilidad: el estado se escribe; el color y el ícono son redundantes ([WCAG 2.2 1.4.1](https://www.w3.org/TR/WCAG22/)).

## 9. Divulgación progresiva en dashboards
Nielsen: diferir lo avanzado a una capa secundaria ([NN/g](https://www.nngroup.com/articles/progressive-disclosure/)); Few: el dashboard dice *qué*, el detalle dice *por qué* ([Few](https://www.perceptualedge.com/articles/ie/dashboard_confusion.pdf)).
- **Nivel 1 (Inicio)**: héroe + excepciones + lista de ramos con bullet/sparkline.
- **Nivel 2 (ramo)**: evaluaciones, "Necesitas X", reglas.
- **Nivel 3 (Estadísticas)**: tendencias, comparación entre semestres, distribución, PPA.
- Tooltip/popover para el valor exacto de un punto; tabla de datos como alternativa accesible.

## 10. Densidad: móvil vs escritorio
- Móvil: lista vertical, una métrica por fila + sparkline; gráficos de ancho completo, ≤3 por pantalla.
- Escritorio: grilla de tarjetas (ramos) con small multiples, panel lateral de detalle; Few insiste en **una sola pantalla** sin scroll para el dashboard operacional ([Few](https://www.perceptualedge.com/articles/ie/dashboard_confusion.pdf)).

## 11. Colores en gráficos
- Serie principal en `--fg`/primario; comparaciones en gris; color de estado solo para excepciones.
- En modo oscuro, recalcular colores de series y de rejilla (la auditoría vio gráficos ilegibles).
- Paleta categórica (si se colorean ramos): ≤6 colores, distinguibles para daltonismo, con etiqueta directa.

## 12. Antipatrones de dashboard en apps de notas
- Gauge/velocímetro para el promedio.
- Dona de "porcentaje aprobado".
- Promedio sin contexto de cuánto está evaluado.
- Chips de estado contradictorios entre vistas.
- Ocho tarjetas del mismo tamaño y color (sin jerarquía).
- Leyendas lejanas y colores sin texto.
- Gráfico vacío con ejes cuando no hay datos (mostrar estado vacío que enseña).

## 13. Checklist de dashboard
- [ ] Responde las 4 preguntas del estudiante en 5 s.
- [ ] Un héroe, con contexto y estado escrito.
- [ ] Excepciones arriba; reglas de riesgo únicas y explicables.
- [ ] Solo barras, líneas, bullets, sparklines (sin tortas, donas, gauges, anillos).
- [ ] Escalas comunes en small multiples; referencia en 4,0.
- [ ] Etiquetado directo; una decimal con coma.
- [ ] Texto/tabla alternativa para cada gráfico.
- [ ] Estados vacío/parcial/carga diseñados.
