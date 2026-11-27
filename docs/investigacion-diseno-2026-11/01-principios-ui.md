# 01 · Principios de interfaz: heurísticas, Laws of UX y jerarquía visual

Fuentes abiertas: [Nielsen, 10 Usability Heuristics](https://www.nngroup.com/articles/ten-usability-heuristics/) · [Laws of UX (Jon Yablonski)](https://lawsofux.com/) · [Nielsen, Response Times: 3 Limits](https://www.nngroup.com/articles/response-times-3-important-limits/) · [Material 3, Structure/Hierarchy](https://m3.material.io/foundations/designing/structure) · [NN/g, Progressive Disclosure](https://www.nngroup.com/articles/progressive-disclosure/)

---

## 1. Las 10 heurísticas de Nielsen, aplicadas a GradeHub

Nielsen las formuló en 1990 con Molich, las refinó en 1994 con un análisis factorial de 249 problemas y dice que "se mantienen sin cambios desde 1994" ([NN/g](https://www.nngroup.com/articles/ten-usability-heuristics/)). Para cada una: qué dice, qué pide en GradeHub, antipatrón observado.

### H1 · Visibilidad del estado del sistema
> "El diseño debe mantener informado al usuario de lo que pasa, con feedback apropiado en un tiempo razonable."

- **En GradeHub**: cada guardado de nota necesita un estado visible y verificable: *Guardando… → Guardado ✓ → (error) No se guardó · Reintentar*. El indicador vive junto al campo, no solo en un toast.
- **Tiempos** ([Nielsen, límites de respuesta](https://www.nngroup.com/articles/response-times-3-important-limits/)): 0,1 s se siente instantáneo; 1 s mantiene el flujo; 10 s es el límite de atención, sobre eso hace falta indicador de porcentaje y forma de cancelar.
- **Antipatrón observado**: "Apoyo" y "Ofrecer clases" quedan en "Revisando tu acceso…" para siempre, sin spinner, error ni reintento. Viola H1 y H9 a la vez. Regla: **ningún estado de carga sin fin**: a los 10 s se convierte en error con "Reintentar" (ver `05-componentes-y-estados.md`, §Timeouts).
- **Antipatrón observado**: Inicio no se refresca tras guardar ("Sin evaluaciones" con notas puestas). El estado mostrado debe venir de la misma fuente de verdad que el formulario.

### H2 · Coincidencia con el mundo real
> "Habla el lenguaje del usuario… no jerga interna."

- "Ramo", "solemne", "control", "examen", "eximirse", "nota de presentación", "ponderación" son lenguaje real del estudiante chileno: úsalo.
- "Consenso anónimo", "PPA estimado", "agentes/MCP", "ponderaciones sugeridas" son jerga de producto: confundieron a usuarios nuevos en la auditoría. O se reemplazan por frases de tarea ("Ponderaciones que usan tus compañeros de ese ramo") o se explican en una línea en el punto de uso (ver `11-ux-writing-es-cl.md`, glosario).
- La escala 1,0–7,0 con 4,0 de aprobación y decimales con coma es el "mundo real": nunca mostrar `5.5`, siempre `5,5`.

### H3 · Control y libertad del usuario
> "Salida de emergencia claramente marcada… soporta Deshacer y Rehacer."

- Borrar una evaluación, archivar un semestre, cambiar una pauta: **deshacer** (toast con acción) en vez de "¿Estás seguro?".
- **Antipatrón observado**: Escape cierra "Armar mis ponderaciones" y **descarta todo sin preguntar**. Regla: si el formulario tiene cambios ("dirty"), Escape/clic fuera pide confirmación o guarda borrador.
- **Antipatrón observado**: el botón Atrás del navegador saca de la app (no hay rutas). Cada vista debe tener URL (`/ramos/:id`, `/agenda`, `/estadisticas`) y responder a `popstate`.

### H4 · Consistencia y estándares
- **Interna**: el mismo 4,8 no puede ser teal en Inicio, oliva en el ramo y amarillo en Estadísticas (hallazgo de la auditoría). Una sola función/token de color de nota (ver `03-color-y-modo-oscuro.md`).
- **Interna**: "Perfil" y "Ajustes" son dos caminos para lo mismo y "Archivar semestre" está en uno y no en el otro: una sola casa por función.
- **Externa (Jakob's Law)**: "los usuarios pasan la mayor parte de su tiempo en otros sitios" ([Laws of UX](https://lawsofux.com/)). Ajustes que imita a Settings de iOS es un acierto; mantenerlo.

### H5 · Prevención de errores
> "Elimina condiciones propensas a error, o verifícalas y pide confirmación antes de comprometer la acción."

- **Antipatrón observado**: pautas que se guardan sumando 110 % o 55 %. Una pauta que no suma 100 % debe bloquear "Guardar" (o permitir guardarla como borrador explícito, con aviso persistente).
- Inputs de nota que **no aceptan** valores fuera de 1,0–7,0, y aceptan tanto `5,5` como `5.5` (Postel's Law: "sé liberal en lo que aceptas y conservador en lo que envías").
- NN/g distingue *slips* (desatención) de *mistakes* (modelo mental errado): los slips se previenen con restricciones y buenos defaults; los mistakes con explicación y deshacer.

### H6 · Reconocer antes que recordar
- En el simulador, mostrar siempre al lado la nota real ("Real: 4,8 → Simulada: 5,6") para que nadie tenga que recordar el valor original.
- En formularios largos, mostrar la suma de ponderaciones en vivo ("Llevas 85 % de 100 %").

### H7 · Flexibilidad y eficiencia
- Atajos para usuarios expertos: Enter guarda y pasa a la siguiente evaluación; Tab navega; `N` nueva evaluación; búsqueda tipo comando (patrón Raycast/Linear, ver `12-referentes-y-tendencias.md`).
- **Ojo**: los atajos no pueden romper lo básico. La pérdida de notas al guardar con Tab o con Enter antes de ~0,7 s es exactamente lo contrario (ver `05-componentes-y-estados.md`, §Guardado seguro).

### H8 · Diseño estético y minimalista
> "Cada unidad de información extra compite con la relevante y disminuye su visibilidad."
- En Inicio, el número protagonista es **uno**: el promedio (o "Necesitas X"). Todo lo demás es secundario.
- Un solo botón primario por sección (hallazgo de la auditoría).

### H9 · Ayuda a reconocer, diagnosticar y recuperarse de errores
> "Lenguaje simple (sin códigos), indicar el problema con precisión, sugerir una solución."
- "Las ponderaciones suman 110 %. Quita 10 % para poder guardar." en vez de "Error de validación".
- El error vive junto al campo, con borde rojo **y** ícono **y** texto, y `aria-invalid` (ver `07-accesibilidad.md`).

### H10 · Ayuda y documentación
- Ayuda en contexto (un "?" junto a "PPA estimado" que despliega una línea), no un manual.
- WCAG 2.2 agrega el criterio 3.2.6 *Consistent Help*: si hay mecanismo de ayuda en varias páginas, debe estar siempre en el mismo lugar relativo ([WCAG 2.2](https://www.w3.org/TR/WCAG22/)).

---

## 2. Laws of UX que más pesan en una app de notas

Definiciones textuales de [lawsofux.com](https://lawsofux.com/). Aplicación propia.

| Ley | Definición | Aplicación en GradeHub |
|---|---|---|
| **Doherty Threshold** | La productividad se dispara cuando sistema y usuario interactúan a <400 ms | Recalcular promedio y "Necesitas X" en el cliente, al instante, mientras se escribe la nota; sincronizar en segundo plano |
| **Fitts's Law** | El tiempo para alcanzar un objetivo depende de distancia y tamaño | Botón "Agregar nota" grande y en zona del pulgar (abajo); objetivos ≥44 px |
| **Hick's Law** | Más opciones, más tiempo para decidir | Onboarding: no mostrar las 5 universidades + carreras + todos los ramos a la vez; buscador con autocompletar |
| **Goal-Gradient Effect** | La motivación aumenta al acercarse a la meta | Barra de "peso evaluado" (62 % del ramo ya evaluado) y "te faltan 0,3 para el 4,0" |
| **Zeigarnik Effect** | Se recuerdan mejor las tareas inconclusas | "3 evaluaciones sin nota" como recordatorio suave en Inicio |
| **Peak-End Rule** | La experiencia se juzga por su pico y su final | Cierre de semestre = momento final: hoy deja la app vacía ("PROMEDIO GENERAL ·"). Convertirlo en resumen celebratorio + paso claro al semestre siguiente |
| **Von Restorff** | Lo que difiere se recuerda | Solo el ramo en riesgo usa color de alerta; si todo es de color, nada destaca |
| **Law of Proximity / Common Region** | Lo cercano o dentro de un mismo borde se percibe agrupado | Nota + peso + fecha de una evaluación en la misma fila/tarjeta; separar con espacio, no con líneas |
| **Miller's Law / Chunking** | ~7±2 elementos en memoria de trabajo; agrupar | Agrupar evaluaciones por tipo (Solemnes, Controles, Laboratorio) |
| **Tesler's Law** | Hay complejidad irreducible | Las reglas reales (tope, eximición, requisitos combinados) son complejas: la app las absorbe, el usuario no |
| **Jakob's Law** | Los usuarios esperan que funcione como lo que ya conocen | Atrás del navegador, Escape, swipe para volver, pull-to-refresh, toasts abajo |
| **Postel's Law** | Liberal al aceptar, conservador al enviar | Aceptar `5`, `5,5`, `5.5`, `55` (→ ¿5,5?), y siempre mostrar `5,5` |
| **Aesthetic-Usability Effect** | Lo estético se percibe más usable | Coherencia visual sube la confianza en los cálculos (crucial para una app de notas) |
| **Paradox of the Active User** | Nadie lee manuales | Enseñar en el estado vacío y con datos de ejemplo, no con un tour |
| **Serial Position Effect** | Se recuerdan primero y último | Tab bar: Inicio a la izquierda, Ajustes/Perfil a la derecha; acciones clave en extremos |

---

## 3. Jerarquía visual

Material 3 resume la jerarquía como: elementos claramente visibles, contraste y tamaño suficientes, jerarquía clara de importancia e información clave legible de un vistazo; y advierte que "cada botón, imagen y línea de texto agregada aumenta la complejidad" ([M3 Structure](https://m3.material.io/foundations/designing/structure)).

### Palancas de jerarquía (de más a menos potente)
1. **Tamaño** (un número de 48–56 px domina una pantalla de 16 px).
2. **Peso** (700 vs 400).
3. **Contraste de luminosidad** (texto `--fg` vs `--fg3`).
4. **Color** (solo para significado: estado, acción; nunca como única señal).
5. **Posición** (arriba-izquierda se lee primero; en móvil, arriba y en zona del pulgar).
6. **Espacio en blanco** alrededor (aislar = destacar).

### Técnica: "prueba del entrecerrado" (squint test)
Desenfoca la captura (en DevTools: `filter: blur(6px)` sobre `body`) y pregunta qué se ve primero. En Inicio debería ser el promedio o "Necesitas X"; si lo primero es un chip de color o un banner, la jerarquía está rota.

```css
/* Prueba rápida en DevTools */
body { filter: blur(6px) grayscale(1); }
```

### Estructura de Inicio recomendada (de arriba a abajo)
1. **KPI héroe**: promedio del semestre (o "—" si no hay datos), con su estado en texto ("Vas aprobando").
2. **Acción/alerta principal**: "Necesitas 4,6 en el Examen de Cálculo para aprobar" (una sola, la más urgente).
3. **Lista de ramos** con mini-indicadores (ver `09-dashboards.md`).
4. **Próximas evaluaciones** (3, con "Ver agenda").
5. Todo lo demás (comunidad, apoyo, consejos) bajo el pliegue.

### Encabezados semánticos ≠ estilo visual
M3 recuerda que los lectores de pantalla siguen el orden del HTML, que hay que usar un solo `h1`, no saltar niveles, y que "el estilo visual no necesita coincidir con el nivel de encabezado" ([M3](https://m3.material.io/foundations/designing/structure)). Ej.: el nombre del ramo puede ser `h2` aunque visualmente sea pequeño.

### Divulgación progresiva
Nielsen: "difiere las funciones avanzadas o poco usadas a una pantalla secundaria, haciendo las aplicaciones más fáciles de aprender y menos propensas a error" ([NN/g](https://www.nngroup.com/articles/progressive-disclosure/)).
- Primer nivel del ramo: promedio actual, "Necesitas X", lista de evaluaciones.
- Segundo nivel (expandible "Reglas del ramo"): tope, eximición, requisitos, nota de presentación.
- Tercer nivel: simulador, historial de cambios, compartir pauta.

### Antipatrones de jerarquía
- Varios elementos en negrita y color compitiendo (todo es importante = nada lo es).
- Etiquetas en MAYÚSCULAS pequeñas pegadas a números ("PROMEDIO GENERAL ·" con valor vacío).
- Cuadrado gris como "vacío" del KPI: debe ser "—" con texto de ayuda.
- Dos botones primarios lado a lado.
