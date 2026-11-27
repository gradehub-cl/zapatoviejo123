# 08 · Glosario de diseño español ↔ inglés

Glosario para que el equipo de GradeHub use **un solo nombre por concepto** en Figma, en el código, en los issues y en las conversaciones. Formato: **término en español** · *equivalente en inglés* · definición corta · ejemplo en GradeHub cuando ayuda.

Convenciones:
- Cuando en Chile se usa el término en inglés tal cual (ej. "toast", "skeleton"), se indica **"se usa en inglés"** y ese es el nombre recomendado en código.
- Los nombres de componentes en código van en inglés (`EmptyState`, `GradeInput`); en la interfaz visible para el estudiante, siempre en español de Chile.

---

## 1. Fundamentos y proceso

| Español | Inglés | Definición | Ejemplo GradeHub |
|---|---|---|---|
| Experiencia de usuario | User experience (UX) | Todo lo que siente y logra la persona al usar el producto, no solo la pantalla. | Saber en 3 s si apruebas Cálculo. |
| Interfaz de usuario | User interface (UI) | La capa visual e interactiva: pantallas, componentes, estados. | — |
| Usabilidad | Usability | Qué tan fácil, eficiente y libre de errores es usar algo. | — |
| Heurística | Heuristic | Regla general para evaluar una interfaz (ej. las 10 de Nielsen). | "Visibilidad del estado del sistema" al guardar una nota. |
| Evaluación heurística | Heuristic evaluation | Revisión experta de una interfaz contra un set de heurísticas. | — |
| Test de usabilidad | Usability test | Observar a personas reales intentando tareas concretas. | "Agrega tu control 2 con 30 %." |
| Investigación de usuarios | User research | Métodos para entender necesidades y comportamiento (entrevistas, encuestas, observación). | — |
| Persona (arquetipo) | Persona | Perfil ficticio basado en investigación que representa a un grupo de usuarios. | "Estudiante de primer año con 6 ramos". |
| Trabajo por hacer | Job to be done (JTBD) | Lo que la persona "contrata" al producto para lograr. | "Saber cuánto necesito en el examen." |
| Recorrido del usuario | User journey / customer journey | Secuencia de pasos, emociones y puntos de contacto en el tiempo. | Del inicio del semestre al cierre de notas. |
| Flujo de usuario | User flow | Camino de pantallas y decisiones para completar una tarea. | Crear ramo → agregar evaluaciones → ver promedio. |
| Arquitectura de información | Information architecture (IA) | Cómo se organiza, nombra y conecta el contenido. | Ramos > Evaluaciones > Notas. |
| Wireframe | Wireframe (se usa en inglés) | Boceto de baja fidelidad que define estructura, sin estilo visual. | — |
| Maqueta / mockup | Mockup | Diseño estático de alta fidelidad. | — |
| Prototipo | Prototype | Versión interactiva para probar un flujo antes de programarlo. | — |
| Fidelidad (baja/alta) | Fidelity (low/high) | Qué tan cercano está un diseño al producto final. | — |
| Iteración | Iteration | Ciclo de diseñar → probar → ajustar. | — |
| Hipótesis | Hypothesis | Supuesto verificable sobre el efecto de un cambio. | "Si mostramos 'Necesitas X' arriba, más usuarios ingresan notas." |
| Prueba A/B | A/B test | Comparar dos variantes con usuarios reales y medir. | — |
| Métrica / indicador clave | Metric / KPI | Número que indica si el producto cumple su objetivo. | % de usuarios que ingresan ≥1 nota por semana. |
| Ajuste producto-mercado | Product-market fit (PMF) | Cuando un mercado claro quiere fuertemente el producto. | Encuesta de Superhuman. |
| Diseño centrado en el usuario | User-centered design (UCD) | Proceso que parte de las necesidades de la persona. | — |
| Diseño dirigido por objetivos | Goal-directed design | Método de *About Face*: diseñar desde los objetivos de las personas. | — |
| Deuda de diseño | Design debt | Inconsistencias acumuladas que hacen el producto más difícil de usar y mantener. | 91 tamaños de fuente distintos en el CSS. |
| Handoff (entrega a desarrollo) | Design handoff | Traspaso de un diseño a desarrollo con specs, tokens y estados. | — |

## 2. Principios y psicología (Laws of UX y afines)

| Español | Inglés | Definición | Ejemplo GradeHub |
|---|---|---|---|
| Ley de Hick | Hick's law | Más opciones = más tiempo para decidir. | Menos acciones en el home. |
| Ley de Fitts | Fitts's law | El tiempo para alcanzar un objetivo depende de su tamaño y distancia. | Botón "Agregar nota" grande y al alcance del pulgar. |
| Ley de Jakob | Jakob's law | La gente espera que tu app funcione como las que ya usa. | Tab bar inferior estándar. |
| Ley de Miller | Miller's law | La memoria de trabajo retiene pocos elementos (≈7±2). | Agrupar evaluaciones por tipo. |
| Ley de Tesler | Tesler's law (conservation of complexity) | La complejidad no desaparece; alguien (sistema o usuario) la absorbe. | La app calcula ponderaciones, no el estudiante. |
| Efecto de gradiente de meta | Goal-gradient effect | La motivación aumenta al acercarse a la meta. | Barra "80 % del ramo evaluado". |
| Efecto Zeigarnik | Zeigarnik effect | Recordamos mejor las tareas incompletas. | "Te faltan 2 notas por ingresar." |
| Regla del pico y el final | Peak-end rule | Juzgamos una experiencia por su punto más intenso y su final. | Cierre de semestre bien diseñado. |
| Umbral de Doherty | Doherty threshold | La productividad sube cuando el sistema responde en <400 ms. | Promedio recalculado al instante. |
| Efecto estética-usabilidad | Aesthetic-usability effect | Lo bello se percibe como más fácil de usar. | — |
| Carga cognitiva | Cognitive load | Esfuerzo mental que exige la interfaz. | — |
| Modelo mental | Mental model | Cómo cree el usuario que funciona el sistema. | "El 4,0 es la nota para aprobar." |
| Modelo conceptual | Conceptual model | Cómo el diseño comunica el funcionamiento del sistema. | — |
| Affordance (posibilidad de acción) | Affordance | Lo que un objeto permite hacer. | — |
| Significante / señal | Signifier | Pista visible que indica cómo usar algo. | Borde y cursor en un input de nota. |
| Mapeo | Mapping | Relación entre controles y sus efectos. | — |
| Retroalimentación | Feedback | Respuesta del sistema a una acción. | Check verde al guardar. |
| Revelación progresiva | Progressive disclosure | Mostrar lo básico primero y el detalle bajo demanda. | Promedio visible; desglose al tocar. |
| Reconocer antes que recordar | Recognition rather than recall | Mostrar opciones en vez de obligar a memorizar. | Sugerir nombres de evaluaciones previas. |
| Prevención de errores | Error prevention | Diseñar para que el error no ocurra. | Teclado numérico y rango 1,0–7,0. |
| Patrón oscuro | Dark pattern / deceptive pattern | Diseño que engaña al usuario en su contra. | Prohibido en GradeHub. |
| Gamificación | Gamification | Usar mecánicas de juego (rachas, logros) fuera de juegos. | Racha de semanas al día. |
| Racha | Streak | Contador de días o semanas consecutivas de una acción. | — |

## 3. Layout, espaciado y jerarquía

| Español | Inglés | Definición | Ejemplo GradeHub |
|---|---|---|---|
| Jerarquía visual | Visual hierarchy | Orden en que el ojo percibe los elementos según tamaño, peso, color y posición. | Promedio > nombre del ramo > detalles. |
| Grilla / retícula | Grid | Estructura de columnas y medianiles que ordena el layout. | — |
| Medianil / separación | Gutter | Espacio entre columnas de la grilla. | — |
| Margen | Margin | Espacio exterior de un elemento. | — |
| Relleno | Padding | Espacio interior de un elemento. | — |
| Espacio entre elementos | Gap | Separación entre hijos de un flex/grid. | — |
| Espacio en blanco / negativo | White space / negative space | Espacio vacío que da aire y agrupa. | — |
| Escala de espaciado | Spacing scale | Valores fijos permitidos (ej. 4, 8, 12, 16, 24, 32). | Tailwind `p-2`, `p-4`… |
| Grilla de 8 pt | 8-point grid | Sistema donde casi todo espaciado es múltiplo de 8 (o 4). | — |
| Alineación | Alignment | Posicionar elementos sobre ejes comunes. | Notas alineadas a la derecha. |
| Proximidad | Proximity | Elementos cercanos se perciben como grupo (Gestalt). | — |
| Principios de la Gestalt | Gestalt principles | Proximidad, similitud, cierre, continuidad, figura-fondo. | — |
| Densidad | Density | Cantidad de información por área. | Modo compacto para escritorio. |
| Encima del pliegue | Above the fold | Lo visible sin hacer scroll. | "Necesitas X" siempre arriba. |
| Diseño adaptable | Responsive design | Layout que se ajusta al tamaño de pantalla. | — |
| Mobile first | Mobile first (se usa en inglés) | Diseñar primero para móvil y luego ampliar. | — |
| Punto de quiebre | Breakpoint | Ancho donde cambia el layout. | — |
| Layout intrínseco | Intrinsic layout | Layout que se adapta por el contenido, sin media queries (Every Layout). | — |
| Diseño fluido | Fluid design | Tamaños que escalan de forma continua con `clamp()`. | Utopia. |
| Área segura | Safe area | Zona libre de notch e indicador de inicio en iOS. | Padding inferior de la tab bar. |
| Zona del pulgar | Thumb zone | Área de la pantalla cómoda para tocar con una mano. | — |
| Área táctil / objetivo táctil | Touch target / hit area | Superficie tocable de un control. | Mínimo 44×44 pt (Apple) / 48 dp (Material). |
| Tarjeta | Card | Contenedor que agrupa información de una entidad. | Tarjeta de ramo. |
| Bento / grilla bento | Bento grid | Layout de tarjetas de distintos tamaños en mosaico. | Dashboard del semestre. |

## 4. Tipografía

| Español | Inglés | Definición | Ejemplo GradeHub |
|---|---|---|---|
| Tipografía / familia tipográfica | Typeface / font family | Diseño de letras con sus variantes. | Inter. |
| Fuente | Font | Un archivo/variante concreta (Inter Bold 16). | — |
| Peso | Font weight | Grosor (400 regular, 500 medium, 600 semibold, 700 bold). | — |
| Fuente variable | Variable font | Un archivo con ejes continuos (peso, ancho). | — |
| Escala tipográfica | Type scale | Tamaños predefinidos con una proporción (ej. 1,25). | — |
| Escala modular | Modular scale | Escala basada en una razón constante. | — |
| Interlineado | Line height / leading | Distancia entre líneas de texto. | — |
| Interletraje / tracking | Letter spacing / tracking | Espacio uniforme entre letras. | — |
| Kerning | Kerning | Ajuste de espacio entre pares de letras específicos. | — |
| Largo de línea / medida | Line length / measure | Caracteres por línea (ideal 45–90). | — |
| Cifras tabulares | Tabular figures / tabular numbers (`tnum`) | Dígitos de igual ancho que se alinean en columnas. | Columna de notas alineada. |
| Cifras proporcionales | Proportional figures (`pnum`) | Dígitos de ancho variable, mejores en texto corrido. | — |
| Cifras de estilo antiguo | Oldstyle figures (`onum`) | Dígitos con ascendentes y descendentes. | No usar en notas. |
| Cero con barra | Slashed zero (`zero`) | Variante del 0 para distinguirlo de la O. | — |
| Funciones OpenType | OpenType features | Variantes activables (tnum, ss01, cv11…). | — |
| Sans serif / palo seco | Sans-serif | Letras sin remates. | — |
| Serif / con remates | Serif | Letras con remates. | — |
| Monoespaciada | Monospace | Todas las letras con el mismo ancho. | Geist Mono. |
| Fuente del sistema | System font | Fuente nativa del sistema operativo (SF Pro, Roboto). | — |
| Tipo dinámico | Dynamic Type | Sistema de iOS que escala el texto según la preferencia del usuario. | — |
| Viuda / huérfana | Widow / orphan | Palabra o línea suelta al final o al inicio de un bloque. | — |
| Truncamiento | Truncation | Cortar texto con "…". | Nombres de ramos largos. |

## 5. Color

| Español | Inglés | Definición | Ejemplo GradeHub |
|---|---|---|---|
| Paleta | Palette | Conjunto de colores del sistema. | — |
| Escala de color / rampa | Color scale / ramp | Tonos de un mismo color de claro a oscuro (50–950). | — |
| Tono (matiz) | Hue | El color en sí (rojo, azul). | — |
| Saturación / croma | Saturation / chroma | Intensidad del color. | — |
| Luminosidad | Lightness / luminance | Qué tan claro u oscuro se percibe. | — |
| OKLCH | OKLCH (se usa así) | Espacio de color perceptual (L, C, H) con luminosidad uniforme. | Tokens de Tailwind v4. |
| Gama de color | Color gamut | Rango de colores que un espacio o pantalla puede mostrar (sRGB, Display P3). | — |
| Contraste | Contrast | Diferencia de luminancia entre texto y fondo. | 4,5:1 mínimo para texto normal. |
| Relación de contraste | Contrast ratio | Medida WCAG 2.x (de 1:1 a 21:1). | — |
| APCA | APCA (Accessible Perceptual Contrast Algorithm) | Método de contraste perceptual que considera tamaño y peso. | — |
| Color semántico | Semantic color | Color nombrado por su función, no por su apariencia. | `--color-danger` para nota roja. |
| Color de acento / primario | Accent / primary color | Color de marca para acciones principales. | — |
| Neutros / grises | Neutrals / grays | Escala de grises para texto, fondos y bordes. | — |
| Colores de estado | Status colors | Éxito, advertencia, error, información. | Aprobando / en riesgo / reprobando. |
| Modo oscuro | Dark mode | Tema con fondos oscuros. | — |
| Tema | Theme | Conjunto de valores de tokens (claro, oscuro, alto contraste). | — |
| Paleta categórica | Categorical palette | Colores distintos para categorías sin orden. | Un color por ramo. |
| Paleta secuencial | Sequential palette | Gradiente para valores ordenados. | Mapa de calor de notas. |
| Paleta divergente | Diverging palette | Dos gradientes desde un punto medio. | Bajo/sobre el 4,0. |
| Daltonismo / deficiencia de visión de color | Color blindness / color vision deficiency (CVD) | No distinguir ciertos colores (rojo-verde es la más común). | No comunicar "reprobado" solo con rojo. |

## 6. Componentes

| Español | Inglés | Definición | Ejemplo GradeHub |
|---|---|---|---|
| Componente | Component | Pieza reutilizable de interfaz. | `GradeInput`. |
| Variante | Variant | Versión de un componente (tamaño, tipo). | Botón primario / secundario. |
| Botón | Button | Control que ejecuta una acción. | — |
| Botón principal / llamado a la acción | Primary button / call to action (CTA) | La acción más importante de la pantalla. | "Agregar nota". |
| Botón fantasma | Ghost button | Botón sin fondo ni borde. | — |
| Botón flotante | Floating action button (FAB) | Botón circular flotante (Material). | — |
| Campo de texto / input | Text field / input | Control para escribir. | Nota 1,0–7,0. |
| Etiqueta | Label | Texto que nombra un campo. | — |
| Texto de ayuda | Helper text / hint | Texto bajo el campo que orienta. | "Usa coma para decimales." |
| Placeholder (texto de ejemplo) | Placeholder | Texto dentro del campo vacío; no reemplaza la etiqueta. | — |
| Selector / desplegable | Select / dropdown | Lista de opciones que se despliega. | — |
| Combobox | Combobox | Input con autocompletado y lista. | Buscar ramo. |
| Casilla de verificación | Checkbox | Opción on/off independiente. | — |
| Botón de opción | Radio button | Una opción entre varias excluyentes. | — |
| Interruptor | Switch / toggle | Activa o desactiva algo al instante. | Modo oscuro. |
| Control segmentado | Segmented control | Grupo de botones excluyentes en una barra. | Semestre / año. |
| Deslizador | Slider | Elegir un valor arrastrando. | Simulador de nota. |
| Selector de fecha | Date picker | Control para elegir fechas. | Fecha de la prueba. |
| Pestañas | Tabs | Navegación entre vistas del mismo nivel. | — |
| Barra de pestañas / navegación inferior | Tab bar / bottom navigation | Navegación principal fija abajo en móvil. | — |
| Barra de navegación | Navigation bar / app bar | Barra superior con título y acciones. | — |
| Barra lateral | Sidebar | Navegación lateral (escritorio). | — |
| Migas de pan | Breadcrumbs | Ruta jerárquica de la página actual. | — |
| Menú de hamburguesa | Hamburger menu | Menú oculto tras un ícono de tres líneas. | Evitar para navegación principal. |
| Menú contextual | Context menu | Acciones al tocar largo o clic derecho. | — |
| Paleta de comandos | Command palette / command menu (⌘K) | Buscador de acciones por teclado. | cmdk en escritorio. |
| Modal / diálogo | Modal / dialog | Ventana que bloquea el resto hasta cerrarse. | — |
| Diálogo de confirmación | Confirmation dialog | Pide confirmar una acción destructiva. | "¿Eliminar ramo?" |
| Hoja inferior | Bottom sheet | Panel que sube desde abajo en móvil. | Agregar nota. |
| Cajón | Drawer | Panel lateral o inferior deslizable. | Vaul. |
| Popover | Popover (se usa en inglés) | Panel flotante anclado a un elemento. | — |
| Tooltip / descripción emergente | Tooltip | Texto breve al pasar el cursor o enfocar. | — |
| Toast / aviso emergente | Toast / snackbar | Mensaje temporal no bloqueante. | "Nota guardada · Deshacer". |
| Alerta / banner | Alert / banner | Mensaje persistente dentro de la página. | — |
| Insignia / contador | Badge | Marca pequeña con número o estado. | "2 pendientes". |
| Chip / etiqueta | Chip / tag | Elemento compacto para filtros o categorías. | "Prueba", "Control". |
| Avatar | Avatar | Imagen o iniciales del usuario. | — |
| Lista | List | Colección vertical de ítems. | — |
| Fila / ítem de lista | List item / row | Un elemento de la lista. | Fila de evaluación. |
| Tabla | Table / data table | Datos en filas y columnas. | — |
| Acordeón | Accordion | Secciones que se expanden y contraen. | — |
| Carrusel | Carousel | Contenido horizontal deslizable. | Evitar para info importante. |
| Divisor | Divider | Línea que separa secciones. | — |
| Barra de progreso | Progress bar | Indicador lineal de avance. | % del ramo evaluado. |
| Anillo de progreso | Progress ring | Indicador circular de avance. | — |
| Spinner / indicador de carga | Spinner / loading indicator | Animación de espera indeterminada. | — |
| Esqueleto (pantalla de carga) | Skeleton screen | Placeholder gris con la forma del contenido. | — |
| Paginación | Pagination | Navegar entre páginas de resultados. | — |
| Scroll infinito | Infinite scroll | Carga de contenido al bajar. | — |
| Deslizar para actualizar | Pull to refresh | Gesto de arrastrar hacia abajo para recargar. | — |
| Deslizar para acción | Swipe action | Gesto lateral sobre una fila para acciones. | Borrar evaluación. |
| Widget | Widget (se usa en inglés) | Vista pequeña en la pantalla de inicio del teléfono o en un dashboard. | Promedio en el widget de iOS. |

## 7. Estados y patrones

| Español | Inglés | Definición | Ejemplo GradeHub |
|---|---|---|---|
| Estado vacío | Empty state | Lo que se ve cuando no hay datos. | "Aún no tienes ramos." |
| Estado de carga | Loading state | Mientras llegan los datos. | — |
| Estado de error | Error state | Cuando algo falla. | — |
| Estado de éxito | Success state | Confirmación de que algo funcionó. | — |
| Estado deshabilitado | Disabled state | Control inactivo. | — |
| Estado de foco | Focus state | Cómo se ve un elemento seleccionado por teclado. | Anillo visible. |
| Estado hover (al pasar el cursor) | Hover state | Cambio visual al pasar el mouse. | — |
| Estado presionado | Pressed / active state | Cambio visual al tocar. | — |
| Estado seleccionado | Selected state | Elemento elegido en un grupo. | — |
| Validación en línea | Inline validation | Verificar un campo mientras/después de escribir. | "La nota debe estar entre 1,0 y 7,0." |
| Mensaje de error | Error message | Texto que explica qué pasó y cómo arreglarlo. | — |
| Deshacer | Undo | Revertir la última acción. | Preferible a confirmar. |
| Actualización optimista | Optimistic update | Mostrar el resultado antes de que el servidor confirme. | — |
| Sin conexión | Offline | Funcionar sin internet. | PWA con notas en caché. |
| Incorporación / bienvenida | Onboarding | Primeros pasos de un usuario nuevo. | — |
| Ayuda contextual | Contextual help | Ayuda en el momento y lugar en que se necesita. | — |
| Valores por defecto inteligentes | Smart defaults | Valores precargados probables. | Escala 1,0–7,0 y 4,0 para aprobar. |
| Notificación push | Push notification | Aviso enviado al dispositivo. | "Mañana tienes Control 3." |
| Patrón de diseño | Design pattern | Solución recurrente a un problema de interfaz. | — |
| Una pregunta por página | One thing per page / question pages | Patrón de GOV.UK: un dato por pantalla en formularios largos. | Onboarding. |

## 8. Interacción y motion

| Español | Inglés | Definición | Ejemplo GradeHub |
|---|---|---|---|
| Microinteracción | Microinteraction | Interacción pequeña de un solo propósito (trigger, reglas, feedback, loops). | Marcar evaluación como rendida. |
| Disparador | Trigger | Lo que inicia una microinteracción. | — |
| Animación / movimiento | Animation / motion | Cambio visual en el tiempo. | — |
| Transición | Transition | Animación entre dos estados o pantallas. | — |
| Curva de aceleración | Easing / easing curve | Cómo cambia la velocidad durante la animación (ease-out, ease-in-out). | — |
| Resorte | Spring | Animación basada en física (rigidez, amortiguación). | Motion. |
| Duración | Duration | Cuánto dura una animación (típicamente 150–300 ms en UI). | — |
| Coreografía | Choreography | Orden y desfase de varias animaciones. | — |
| Escalonado | Stagger | Animar elementos de una lista con pequeño desfase. | — |
| Interrumpible | Interruptible | Animación que puede cambiar de dirección a mitad. | — |
| Movimiento reducido | Reduced motion (`prefers-reduced-motion`) | Preferencia del usuario para minimizar animaciones. | — |
| Retroalimentación háptica | Haptic feedback | Vibración breve como respuesta. | Al alcanzar la nota para aprobar. |
| Gesto | Gesture | Interacción táctil (tocar, deslizar, pellizcar). | — |
| Arrastrar y soltar | Drag and drop | Mover un elemento arrastrándolo. | Reordenar ramos. |
| Rendimiento percibido | Perceived performance | Qué tan rápido se siente, más allá de lo medido. | — |

## 9. Design systems y desarrollo

| Español | Inglés | Definición | Ejemplo GradeHub |
|---|---|---|---|
| Sistema de diseño | Design system | Conjunto de principios, tokens, componentes y documentación compartidos. | — |
| Biblioteca de componentes | Component library / UI kit | Componentes listos en código o Figma. | shadcn/ui. |
| Token de diseño | Design token | Variable con nombre que guarda una decisión de diseño. | `--radius-md`, `--color-fg`. |
| Token primitivo / global | Primitive / global token | Valor crudo (ej. `blue-600`). | — |
| Token semántico / alias | Semantic / alias token | Token con intención que apunta a un primitivo. | `--color-primary` → `blue-600`. |
| Token de componente | Component token | Token específico de un componente. | `--button-bg`. |
| Diseño atómico | Atomic design | Átomos → moléculas → organismos → plantillas → páginas. | — |
| Primitivas sin estilo | Headless / unstyled primitives | Componentes con lógica y accesibilidad pero sin estilo. | Radix. |
| Utilidades CSS | Utility classes / utility-first CSS | Clases pequeñas de una sola propiedad. | Tailwind. |
| Radio de borde | Border radius | Redondeo de esquinas. | — |
| Elevación / sombra | Elevation / shadow | Sensación de altura sobre el fondo. | — |
| Índice z / capas | Z-index / layering | Orden de apilamiento de elementos. | Escala fija de capas. |
| Fuente de verdad | Single source of truth | Un solo lugar canónico para una decisión. | Tokens en JSON. |
| Regresión visual | Visual regression | Cambio visual no intencional detectado al comparar capturas. | Playwright `toHaveScreenshot`. |
| Historia (Storybook) | Story | Un estado documentado de un componente. | `GradeInput/Error`. |
| Aplicación web progresiva | Progressive web app (PWA) | Web instalable con funciones offline. | — |

## 10. Accesibilidad

| Español | Inglés | Definición | Ejemplo GradeHub |
|---|---|---|---|
| Accesibilidad | Accessibility (a11y) | Que todas las personas, incluidas las con discapacidad, puedan usar el producto. | — |
| Pautas WCAG | Web Content Accessibility Guidelines (WCAG) | Norma internacional (versión vigente 2.2, niveles A, AA, AAA). | Meta: AA. |
| Lector de pantalla | Screen reader | Software que lee la interfaz en voz alta (VoiceOver, TalkBack). | — |
| Texto alternativo | Alt text | Descripción textual de una imagen. | — |
| Atributos ARIA | ARIA (Accessible Rich Internet Applications) | Atributos que describen roles y estados a tecnologías asistivas. | — |
| Región viva | Live region (`aria-live`) | Zona cuyo cambio se anuncia al lector de pantalla. | Anunciar el nuevo promedio. |
| Navegación por teclado | Keyboard navigation | Usar todo sin mouse. | — |
| Orden de foco | Focus order | Secuencia en que el foco recorre los elementos. | — |
| Trampa de foco | Focus trap | Mantener el foco dentro de un modal abierto. | — |
| Anillo de foco | Focus ring | Indicador visible del elemento enfocado. | No usar `outline: none` sin reemplazo. |
| Saltar al contenido | Skip link | Enlace oculto para saltar la navegación. | — |
| HTML semántico | Semantic HTML | Usar el elemento correcto (`button`, `nav`, `main`). | — |
| Diseño inclusivo | Inclusive design | Diseñar considerando la diversidad de capacidades y contextos. | — |

## 11. Datos y dashboards

| Español | Inglés | Definición | Ejemplo GradeHub |
|---|---|---|---|
| Tablero / panel | Dashboard | Vista de monitoreo de un vistazo. | "Mi semestre". |
| Visualización de datos | Data visualization (dataviz) | Representar datos gráficamente. | — |
| Tarjeta de indicador | KPI card / stat card | Número clave con contexto. | Promedio general. |
| Gráfico de líneas | Line chart | Tendencia en el tiempo. | Evolución del promedio. |
| Gráfico de barras | Bar chart | Comparar cantidades. | Promedio por ramo. |
| Gráfico de área | Area chart | Línea con área rellena. | — |
| Gráfico de anillo / dona | Donut chart | Proporciones en un anillo (usar con cuidado). | — |
| Minigráfico | Sparkline | Gráfico de línea mínimo, sin ejes, junto a un número. | Tendencia en la fila del ramo. |
| Gráfico de bala | Bullet graph | Barra con meta y rangos cualitativos (Few). | Nota actual vs 4,0. |
| Múltiplos pequeños | Small multiples | Mismo gráfico repetido por categoría con la misma escala. | Un mini gráfico por ramo. |
| Mapa de calor | Heatmap | Matriz coloreada según valor. | — |
| Eje | Axis | Escala de referencia de un gráfico. | Eje 1,0–7,0. |
| Leyenda | Legend | Explicación de colores o símbolos. | — |
| Línea de referencia / umbral | Reference line / threshold | Línea que marca un valor clave. | Línea en 4,0. |
| Relación datos-tinta | Data-ink ratio | Proporción de tinta que representa datos (Tufte). | — |
| Basura gráfica | Chartjunk | Decoración que no aporta datos. | — |
| Atributos preatentivos | Preattentive attributes | Rasgos que el ojo percibe sin esfuerzo (posición, largo, color). | — |
| Granularidad | Granularity | Nivel de detalle de los datos. | Por evaluación vs por ramo. |
| Profundizar | Drill down | Ir de un resumen al detalle. | Tocar un ramo desde el dashboard. |
| Filtro | Filter | Reducir datos visibles según criterios. | — |

## 12. Herramientas y oficio

| Español | Inglés | Definición |
|---|---|---|
| Lienzo | Canvas | Área de trabajo en Figma. |
| Marco | Frame | Contenedor de Figma (equivale a una pantalla o sección). |
| Auto layout | Auto layout (se usa en inglés) | Frames de Figma que se comportan como flexbox. |
| Variables (Figma) | Variables | Tokens nativos de Figma (color, número, modo claro/oscuro). |
| Instancia | Instance | Copia vinculada de un componente de Figma. |
| Complemento | Plugin | Extensión de Figma. |
| Especificaciones | Specs / redlines | Medidas y valores para desarrollo. |
| Modo dev (Figma) | Dev Mode | Vista de Figma para desarrolladores. |
| Revisión de diseño / crítica | Design review / critique | Sesión para evaluar un diseño contra objetivos. |
| Pixel perfect | Pixel perfect (se usa en inglés) | Implementación idéntica al diseño. |
| Ingeniero de diseño | Design engineer | Perfil que diseña y programa interfaces. |
| Moodboard / tablero de inspiración | Moodboard | Colección de referencias visuales para una dirección. |

---

**Términos que conviene fijar en GradeHub (para la interfaz visible):** "ramo" (no "curso" ni "asignatura"), "evaluación" (prueba, control, tarea, examen como tipos), "ponderación" (no "peso"), "promedio" (no "media"), "nota para aprobar" (no "nota de corte" salvo contexto), "Necesitas X" como frase fija. Decimales siempre con coma (5,5) según formato es-CL.

Sin datos personales en este documento.
