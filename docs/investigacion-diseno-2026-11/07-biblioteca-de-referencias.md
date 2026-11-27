# 07 · Biblioteca de referencias de diseño para GradeHub

Biblioteca de libros, guías, artículos, galerías, herramientas, casos de producto, personas y cursos, pensada para el equipo de GradeHub (app de notas universitarias, web/PWA + iOS/Android, stack probable React + Tailwind).

**Cómo se verificó (26-nov-2026).** Cada URL de este documento se abrió con una petición HTTP (código 200 y título de página revisado), con `web_fetch` o apareció como resultado en `web_search` cuando el sitio bloquea bots (Medium, O'Reilly, Revolut, Quizlet y Figma Community responden 403/202 a scripts, pero existen y se confirmaron por búsqueda). Cuando una URL redirige o el sitio cambió de dueño, se dice explícitamente. No hay URLs inventadas: lo que no se pudo confirmar quedó fuera y figura en la sección "No incluido" al final.

**Leyenda de prioridad:** ★★★ leer o usar ya · ★★ consulta frecuente · ★ referencia ocasional.

---

## Índice

1. Libros esenciales
2. Guías oficiales y design systems
3. Artículos y ensayos clave
4. Galerías de inspiración
5. Herramientas
6. Casos de estudio de producto (qué copiar)
7. Personas y cuentas a seguir
8. Cursos
9. Ruta de lectura sugerida para el equipo
10. Notas de verificación y no incluido

---

## 1. Libros esenciales

| Libro | Autor(es) | Idea clave | Qué sacar para GradeHub | Link |
|---|---|---|---|---|
| ★★★ **Don't Make Me Think** (Revisited) | Steve Krug | La gente no lee, escanea; cada pregunta que la interfaz obliga a hacerse ("¿esto se puede apretar?") es un costo. | Test de "¿se entiende en 5 segundos?" para la pantalla de ramo: el promedio y "Necesitas X" deben leerse sin pensar. Hacer tests de usabilidad baratos con 3–5 compañeros cada mes. | https://sensible.com/dont-make-me-think/ |
| ★★★ **Refactoring UI** | Adam Wathan y Steve Schoger | Diseño con tácticas, no con talento: jerarquía con peso y color antes que tamaño, sistemas de espaciado y color definidos de antemano, menos bordes. | Es el libro más directo para un equipo de devs con Tailwind (los autores crearon Tailwind). Aplicar su paleta de 9–10 tonos por color y su escala de espaciado no lineal. | https://refactoringui.com/ |
| ★★★ **The Design of Everyday Things** | Don Norman | Affordances, signifiers, mapeo, feedback y modelos conceptuales; el error es culpa del diseño, no del usuario. | Que cada nota editable "parezca" editable (signifier), feedback inmediato al guardar, y diseñar para el error (deshacer en vez de confirmar). | https://www.hachettebookgroup.com/titles/don-norman/the-design-of-everyday-things/9780465050659/?lens=basic-books |
| ★★★ **Laws of UX** | Jon Yablonski | Psicología aplicada a interfaces en leyes cortas (Hick, Fitts, Jakob, Miller, Peak-End, Goal-Gradient, Zeigarnik, Doherty, Tesler). | Goal-Gradient y Zeigarnik para el progreso del semestre; Peak-End para el cierre de un ramo; Doherty (<400 ms) para la respuesta al ingresar notas. El sitio gratis resume cada ley. | Libro: https://lawsofux.com/book/ · Sitio: https://lawsofux.com/ |
| ★★★ **Information Dashboard Design** (2.ª ed.) | Stephen Few | Un dashboard es para monitorear de un vistazo: una pantalla, sin adornos, con bullet graphs y sparklines en vez de velocímetros. | La vista "Mi semestre" debe ser un dashboard de monitoreo: promedio por ramo + estado (aprobando/en riesgo) + tendencia mínima. Cero gauges decorativos. | https://www.analyticspress.com/idd.php · Biblioteca del autor: https://www.perceptualedge.com/library.php |
| ★★★ **Storytelling with Data** | Cole Nussbaumer Knaflic | Contexto → elegir el gráfico correcto → eliminar el ruido → enfocar la atención → contar la historia. | Destacar con color solo el dato que importa (la nota que falta), todo lo demás en gris. Títulos de gráfico que digan la conclusión ("Vas subiendo en Cálculo"). | https://www.storytellingwithdata.com/books |
| ★★ **The Visual Display of Quantitative Information** | Edward Tufte | Data-ink ratio: cada pixel del gráfico debe representar datos; small multiples y sparklines. | Sparklines por ramo en la lista; small multiples para comparar ramos con la misma escala 1,0–7,0. | https://www.edwardtufte.com/book/the-visual-display-of-quantitative-information/ |
| ★★ **Designing Interfaces** (3.ª ed.) | Jenifer Tidwell, Charles Brewer, Aynne Valencia | Catálogo de patrones de interacción (navegación, listas, formularios, datos) con cuándo usar cada uno. | Libro de consulta cuando se diseña un patrón nuevo (lista de evaluaciones, editor de pauta, filtros). Capítulos "Lists of Things" y "Getting Input from Users". | https://www.oreilly.com/library/view/designing-interfaces-3rd/9781492051954/ |
| ★★ **Microinteractions** | Dan Saffer | Toda microinteracción tiene trigger → reglas → feedback → loops y modos; los detalles convierten un producto tolerado en uno querido. | Diseñar con esa estructura el "check" al ingresar una nota, el swipe para borrar y el aviso de "Necesitas X". | https://www.oreilly.com/library/view/microinteractions/9781449342760/ |
| ★★ **Butterick's Practical Typography** (gratis online) | Matthew Butterick | Tipografía para gente que escribe: tamaño de cuerpo, largo de línea (45–90 caracteres), interlineado 120–145 %, nada de subrayados decorativos. | Reglas base para textos largos (pautas, ayuda, términos). Capítulo de cifras y alineación de números. | https://practicaltypography.com/ |
| ★★ **About Face** (4.ª ed.) | Alan Cooper, Robert Reimann, David Cronin, Christopher Noessel | Diseño dirigido por objetivos (goal-directed design) y personas; la app debe comportarse como "una persona considerada". | Definir 2–3 personas (estudiante de primer año, estudiante de ramo con examen, ayudante) y validar flujos contra sus objetivos, no contra features. | https://www.wiley.com/en-us/About+Face%3A+The+Essentials+of+Interaction+Design%2C+4th+Edition-p-9781118766576 |
| ★★ **Atomic Design** (gratis online) | Brad Frost | Construir interfaces como átomos → moléculas → organismos → plantillas → páginas. | Ordenar los componentes de GradeHub (input de nota → fila de evaluación → tarjeta de ramo → pantalla) y documentarlos en Storybook. | https://atomicdesign.bradfrost.com/ |
| ★★ **Every Layout** | Heydon Pickering y Andy Bell | Layouts CSS intrínsecos (Stack, Cluster, Sidebar, Switcher) que se adaptan sin media queries. | Primitivas de layout reutilizables para que la misma pantalla funcione en móvil, tablet y escritorio. | https://every-layout.dev/ |
| ★ **Lista "Design books for non-designers"** | Stripe Press | Selección curada por el equipo de diseño de Stripe. | Para elegir el próximo libro del equipo. | https://www.stripe.press/recommended/design-books.html |

---

## 2. Guías oficiales y design systems

### Plataformas (obligatorias para iOS/Android)

| Recurso | Qué sacar | Link |
|---|---|---|
| ★★★ **Apple Human Interface Guidelines** | Convenciones de navegación iOS, tamaños táctiles, tipografía dinámica (Dynamic Type), modo oscuro y requisitos que revisa App Store. Páginas clave: *Designing for iOS*, *Typography*, *Accessibility*, *Charts*, *Widgets*, *Activity rings*. | https://developer.apple.com/design/human-interface-guidelines/ · https://developer.apple.com/design/human-interface-guidelines/designing-for-ios · https://developer.apple.com/design/human-interface-guidelines/typography · https://developer.apple.com/design/human-interface-guidelines/accessibility · https://developer.apple.com/design/human-interface-guidelines/charts · https://developer.apple.com/design/human-interface-guidelines/widgets |
| ★★★ **Material Design 3** | Sistema de color dinámico (roles de color), escala tipográfica, motion, y sección de accesibilidad. Usarlo para que la versión Android "se sienta nativa" (navegación inferior, back gesture). | https://m3.material.io/ · Color: https://m3.material.io/styles/color/system/overview · Tipografía: https://m3.material.io/styles/typography/overview · Motion: https://m3.material.io/styles/motion/overview · Accesibilidad: https://m3.material.io/foundations/designing/structure · Blog: https://material.io/blog |

### Design systems de empresas (para robar patrones)

| Sistema | Por qué mirarlo | Qué sacar | Link |
|---|---|---|---|
| ★★ **Fluent 2** (Microsoft) | Tokens bien documentados y multiplataforma. | Cómo nombrar tokens (global → alias → componente). | https://fluent2.microsoft.design/ · Tokens: https://fluent2.microsoft.design/design-tokens |
| ★★ **Atlassian Design System** | Excelente en color semántico y contenido. | Tokens de color por intención (success, warning, danger) y guía de escritura. | https://atlassian.design/ · Color: https://atlassian.design/foundations/color · Contenido: https://atlassian.design/content |
| ★★★ **Carbon** (IBM) | La mejor guía pública de visualización de datos en un design system. | Reglas de gráficos (tipos, paleta categórica accesible) y patrón de *empty states*. | https://carbondesignsystem.com/ · Data viz: https://www.carbondesignsystem.com/building-blocks/data-visualization/overview · Empty states: https://www.carbondesignsystem.com/patterns/empty-states-pattern/ |
| ★★ **Polaris** (Shopify) | Fuerte en tono de voz y patrones de comercio. Hoy la referencia vive en shopify.dev (polaris.shopify.com redirige allí). | Ideas de voz y de componentes de formulario. | https://shopify.dev/docs/api/polaris |
| ★★★ **GOV.UK Design System** | El estándar de oro en formularios y mensajes de error, probado con millones de usuarios. | Patrón "una pregunta por página" para el onboarding y el componente de mensaje de error (qué pasó + cómo arreglarlo). | https://design-system.service.gov.uk/ · Patrones: https://design-system.service.gov.uk/patterns/ · Una pregunta por página: https://design-system.service.gov.uk/patterns/question-pages/ · Error: https://design-system.service.gov.uk/components/error-message/ |
| ★★ **Primer** (GitHub) | Sistema denso, pensado para productos con mucha información. | Patrones de UI (estados vacíos, carga, formularios) para vistas densas como la lista de evaluaciones. | https://primer.style/ · Patrones: https://primer.style/product/ui-patterns/ |
| ★★ **Vercel Geist** | Estética sobria tipo "developer tool", con escalas de color y tipografía muy limpias. | Escala de grises y tipografía Geist; guía *Web Interface Guidelines* (checklist de detalles). | https://vercel.com/geist/introduction · Colores: https://vercel.com/geist/colors · Tipografía: https://vercel.com/geist/typography · Guidelines: https://vercel.com/design/guidelines |
| ★ **Stripe (Apps design)** | Cómo Stripe pide a terceros que diseñen dentro de su dashboard. | Disciplina de consistencia y contenido. | https://docs.stripe.com/stripe-apps/design |
| ★ **Wonder Blocks** (Khan Academy) | Design system real de una app educativa, publicado en Storybook. | Cómo documentar componentes educativos (progreso, feedback de respuesta). | https://khan.github.io/wonder-blocks/ |

### Librerías para el stack React + Tailwind

| Recurso | Qué sacar | Link |
|---|---|---|
| ★★★ **shadcn/ui** | Componentes copiables (Radix + Tailwind) que pasan a ser código propio; tiene *blocks* y gráficos basados en Recharts. Es la base más probable para GradeHub. | https://ui.shadcn.com/ · Blocks: https://ui.shadcn.com/blocks · Charts: https://ui.shadcn.com/charts · Doc chart: https://ui.shadcn.com/docs/components/chart |
| ★★★ **Radix UI** | Primitivas accesibles sin estilo (Dialog, Popover, Tabs…) con foco y teclado resueltos; Radix Themes si se quiere algo ya estilizado. | https://www.radix-ui.com/primitives · Themes: https://www.radix-ui.com/themes/docs/overview/getting-started |
| ★★ **Tailwind Plus (ex Tailwind UI) + Catalyst** | Bloques de aplicación pagados hechos por el equipo de Tailwind; Catalyst es su kit de componentes React. La página de Tailwind Plus pide login para ver el catálogo completo. | https://tailwindcss.com/plus · https://catalyst.tailwindui.com/ · Docs Tailwind: https://tailwindcss.com/docs |
| ★★ **Headless UI** | Alternativa a Radix del equipo de Tailwind. | https://headlessui.com/ |
| ★★ **React Aria** (Adobe) | La implementación de accesibilidad más rigurosa; útil para inputs numéricos y de fecha. | https://react-aria.adobe.com/ |
| ★★ **Ant Design + Ant Design Charts** | Sistema empresarial grande; sus charts (AntV) traen muchos tipos listos. Mejor como referencia que como dependencia en una app móvil liviana. | https://ant.design/ · https://charts.ant.design/ · https://ant-design-charts.antgroup.com/ |
| ★ **Untitled UI** | Kit de Figma + React muy completo; tiene versión gratis. | https://www.untitledui.com/ · Gratis: https://www.untitledui.com/free-figma-ui-kit |

---

## 3. Artículos y ensayos clave

### 3.1 Nielsen Norman Group por tema

**Formularios (ingreso de notas, ponderaciones, registro)**
- ★★★ Website Forms Usability: Top 10 Recommendations: etiquetas arriba, campos agrupados y pocos campos. https://www.nngroup.com/articles/web-form-design/
- ★★★ 10 Design Guidelines for Reporting Errors in Forms: error junto al campo, en lenguaje humano, sin borrar lo escrito. https://www.nngroup.com/articles/errors-forms-design-guidelines/
- ★★ Placeholders in Form Fields Are Harmful: nunca usar el placeholder como etiqueta (ej. "Nota" dentro del input). https://www.nngroup.com/articles/form-design-placeholders/
- ★★ Date-Input Form Fields: para fechas de evaluaciones, cuándo usar date picker y cuándo texto. https://www.nngroup.com/articles/date-input/
- ★★ Indicators, Validations, and Notifications: elegir entre indicador, validación o notificación según lo que el usuario necesita. https://www.nngroup.com/articles/indicators-validations-notifications/
- ★★ Confirmation Dialogs Can Prevent User Errors: confirmar solo lo destructivo e irreversible; si no, deshacer. https://www.nngroup.com/articles/confirmation-dialog/

**Empty states**
- ★★★ Designing Empty States in Complex Applications: 3 Guidelines: el estado vacío debe explicar el sistema, mostrar el próximo paso y ofrecer un atajo. Aplicar a "Aún no tienes ramos". https://www.nngroup.com/articles/empty-state-interface-design/

**Mensajes de error**
- ★★★ Error-Message Guidelines: visibles, precisos, constructivos y amables. https://www.nngroup.com/articles/error-message-guidelines/

**Dashboards y datos**
- ★★★ Dashboards: Making Charts and Graphs Easier to Understand: atributos preatentivos (posición y largo antes que color o área). https://www.nngroup.com/articles/dashboards-preattentive/
- ★★ Choosing Chart Types: Consider Context: el tipo de gráfico depende de la tarea. https://www.nngroup.com/articles/choosing-chart-types/
- ★★ Data Tables: Four Major User Tasks: encontrar, comparar, ver detalle y actuar sobre filas. Útil para la tabla de evaluaciones. https://www.nngroup.com/articles/data-tables/

**Progreso, carga y tiempos de respuesta**
- ★★★ Progress Indicators Make a Slow System Less Insufferable: spinner bajo 10 s, barra con porcentaje sobre eso. https://www.nngroup.com/articles/progress-indicators/
- ★★ Skeleton Screens 101: cuándo usar skeleton y cuándo no. https://www.nngroup.com/articles/skeleton-screens/
- ★★ Response Time Limits (0,1 s / 1 s / 10 s). https://www.nngroup.com/articles/response-times-3-important-limits/

**Mobile y onboarding**
- ★★★ Mobile User Experience: Limitations and Strengths. https://www.nngroup.com/articles/mobile-ux/
- ★★ Basic Patterns for Mobile Navigation (tab bar vs menú hamburguesa). https://www.nngroup.com/articles/mobile-navigation-patterns/
- ★★ Bottom Sheets: Definition and UX Guidelines: candidato natural para "agregar nota" en móvil. https://www.nngroup.com/articles/bottom-sheet/
- ★★ Mobile-App Onboarding: An Analysis of Components and Techniques. https://www.nngroup.com/articles/mobile-app-onboarding/
- ★★ Onboarding Tutorials vs. Contextual Help: mejor ayuda en contexto que tutorial inicial. https://www.nngroup.com/articles/onboarding-tutorials/
- ★★ Five Mistakes in Designing Mobile Push Notifications: para recordatorios de evaluaciones. https://www.nngroup.com/articles/push-notification/
- ★ Tema completo Mobile & Tablet: https://www.nngroup.com/topic/mobile-and-tablet-design/

**Fundamentos**
- ★★★ 10 Usability Heuristics for User Interface Design. https://www.nngroup.com/articles/ten-usability-heuristics/
- ★★ Progressive Disclosure: mostrar el promedio primero y el detalle de ponderaciones bajo demanda. https://www.nngroup.com/articles/progressive-disclosure/
- ★★ Tabs, Used Right. https://www.nngroup.com/articles/tabs-used-right/
- ★★ Microinteractions in User Experience. https://www.nngroup.com/articles/microinteractions/
- ★★ The Role of Animation and Motion in UX. https://www.nngroup.com/articles/animation-purpose-ux/

### 3.2 Smashing Magazine
- ★★★ A Complete Guide To Live Validation UX: cuándo validar (al salir del campo, no mientras se escribe). https://www.smashingmagazine.com/2022/09/inline-validation-web-forms-ux/
- ★★ Best Practices For Mobile Form Design. https://www.smashingmagazine.com/2018/08/best-practices-for-mobile-form-design/
- ★★ Designing Better Error Messages UX. https://www.smashingmagazine.com/2022/08/error-messages-ux-design/
- ★★ How To Design An Effective User Onboarding Flow. https://www.smashingmagazine.com/2023/04/design-effective-user-onboarding-flow/
- ★★ The Role Of Empty States In User Onboarding. https://www.smashingmagazine.com/2017/02/user-onboarding-empty-states-mobile-apps/
- ★★ From Good To Great In Dashboard Design: Research, Decluttering And Data Viz. https://www.smashingmagazine.com/2021/11/dashboard-design-research-decluttering-data-viz/
- ★★ From Data To Decisions: UX Strategies For Real-Time Dashboards (skeletons y mostrar qué tan fresco es el dato). https://www.smashingmagazine.com/2025/09/ux-strategies-real-time-dashboards/
- ★★ Rethinking Data Visualisation: A UX Approach To Dashboards That Actually Drives Decisions (ago-2026): el 80 % del trabajo es antes del gráfico: contexto, audiencia y qué decisión debe cambiar. https://www.smashingmagazine.com/2026/08/rethinking-data-visualisation-ux-approach-dashboards/
- ★ A Guide To Getting Data Visualization Right. https://www.smashingmagazine.com/2023/01/guide-getting-data-visualization-right/
- ★ Categoría Design Systems. https://www.smashingmagazine.com/category/design-systems/

### 3.3 Refactoring UI y reglas visuales rápidas
- ★★★ 7 Practical Tips for Cheating at Design (Wathan y Schoger): jerarquía con color y peso, no gris sobre fondos de color, menos bordes, sombras desplazadas, no agrandar íconos pequeños. https://medium.com/refactoring-ui/7-practical-tips-for-cheating-at-design-40c736799886
- ★★★ Building Your Color Palette (capítulo de muestra): grises + primario + colores de estado, con 9 tonos cada uno. https://refactoringui.com/previews/building-your-color-palette
- ★★ Visual design rules you can safely follow every time (Anthony Hobday): checklist de reglas visuales "seguras". https://anthonyhobday.com/sideprojects/saferules/
- ★★ 7 Rules for Creating Gorgeous UI (Erik Kennedy, Learn UI Design). https://www.learnui.design/blog/7-rules-for-creating-gorgeous-ui-part-1.html

### 3.4 Producto y craft (Linear, Stripe, Vercel, Rauno, Emil, Josh)
- ★★★ **Linear – How we redesigned the Linear UI (part II)**: rehacer el sistema de color con LCH y reducir el ruido visual. https://linear.app/now/how-we-redesigned-the-linear-ui
- ★★ **Linear – Behind the latest design refresh** ("A calmer interface for a product in motion"): interfaz más calmada con menos contraste decorativo. https://linear.app/now/behind-the-latest-design-refresh
- ★ **Linear Method**: prácticas de producto (calidad, ciclos cortos). https://linear.app/method
- ★★★ **Stripe – Designing accessible color systems**: cómo construir una paleta que cumpla contraste en todos los tonos. https://stripe.com/blog/accessible-color-systems
- ★★★ **Vercel – Web Interface Guidelines**: checklist de detalles (foco, teclado, estados, formularios, números tabulares). Ideal como checklist de PR. https://vercel.com/design/guidelines (versión original de Rauno: https://interfaces.rauno.me/)
- ★★★ **Rauno Freiberg – Invisible Details of Interaction Design**: por qué ciertas interacciones "se sienten bien" (metáforas físicas, interrupción, respuesta inmediata). https://rauno.me/craft/interaction-design · Más ensayos: https://rauno.me/craft
- ★★★ **Emil Kowalski – Great Animations**: animaciones rápidas (<300 ms), interrumpibles y con propósito. https://emilkowal.ski/ui/great-animations
- ★★ **Emil Kowalski – You Don't Need Animations**: cuándo NO animar (acciones repetidas cientos de veces, como ingresar notas). https://emilkowal.ski/ui/you-dont-need-animations
- ★★ **Emil Kowalski – Building a toast component** (detrás de Sonner). https://emilkowal.ski/ui/building-a-toast-component
- ★★ **Josh W. Comeau – A Friendly Introduction to Spring Physics**. https://www.joshwcomeau.com/animation/a-friendly-introduction-to-spring-physics/
- ★★ **Josh W. Comeau – Designing Beautiful Shadows in CSS**: sombras coherentes con una fuente de luz. https://www.joshwcomeau.com/css/designing-shadows/
- ★ **Josh W. Comeau – An Interactive Guide to Flexbox**. https://www.joshwcomeau.com/css/interactive-guide-to-flexbox/

### 3.5 CSS, tipografía fluida y color moderno
- ★★ **Every Layout – Layouts**: Stack, Cluster, Sidebar, Switcher, Grid. https://every-layout.dev/layouts/
- ★★ **Utopia**: tipografía y espaciado fluidos con `clamp()`; calculadora de escala. https://utopia.fyi/ · https://utopia.fyi/type/calculator/
- ★★★ **Evil Martians – OKLCH in CSS: why we moved from RGB and HSL**: OKLCH da luminosidad perceptual uniforme, lo que permite generar paletas y modo oscuro predecibles (Tailwind v4 ya usa OKLCH). https://evilmartians.com/chronicles/oklch-in-css-why-quit-rgb-hsl
- ★★ **Evil Martians – Better dynamic themes in Tailwind with OKLCH**. https://evilmartians.com/chronicles/better-dynamic-themes-in-tailwind-with-oklch-color-magic
- ★★ **APCA – Why APCA as a New Contrast Method?**: contraste perceptual que considera tamaño y peso de fuente. Ojo: la norma exigible sigue siendo WCAG 2.2 AA; APCA es complemento. https://git.apcacontrast.com/documentation/WhyAPCA
- ★★ **Radix Colors – Understanding the scale**: para qué sirve cada uno de los 12 pasos (fondos, bordes, texto). https://www.radix-ui.com/colors/docs/palette-composition/understanding-the-scale

### 3.6 Dashboards, tablas y color de datos
- ★★★ **Pencil & Paper – Dashboard Design UX Patterns**. https://www.pencilandpaper.io/articles/ux-pattern-analysis-data-dashboards
- ★★ **Pencil & Paper – Data Table Design UX Patterns**. https://www.pencilandpaper.io/articles/ux-pattern-analysis-enterprise-data-tables
- ★★ **Pencil & Paper – Empty State UX Examples**. https://www.pencilandpaper.io/articles/empty-states
- ★★ **Dashboard Design Patterns** (VisHub, Univ. de Edimburgo): catálogo académico de patrones con cheatsheet. https://dashboarddesignpatterns.github.io/
- ★★ **Datawrapper – A detailed guide to colors in data vis style guides**. https://www.datawrapper.de/blog/colors-for-data-vis-style-guides

---

## 4. Galerías de inspiración (usar con criterio)

Regla del equipo: la galería sirve para ver **cómo otros resolvieron un flujo**, no para copiar la estética. Antes de adoptar algo, preguntarse: ¿resuelve una tarea de un estudiante? ¿Funciona con datos reales (7 ramos, nombres largos, notas faltantes)?

| Galería | Para qué usarla | Link |
|---|---|---|
| ★★★ **Mobbin** | La biblioteca más grande de pantallas y **flujos completos** de apps iOS, Android y web reales. Buscar "onboarding", "empty state", "progress", "grades". De pago para uso completo. | https://mobbin.com/ |
| ★★★ **Page Flows** | Videos y capturas de flujos de usuario completos (registro, onboarding, cancelación). **Screenlane hoy redirige aquí.** | https://pageflows.com/ |
| ★★ **Refero** | Referencias de UI web y móvil con buena búsqueda por patrón. | https://refero.design/ |
| ★★ **SaaSFrame** | Pantallas de productos SaaS, útil para dashboards y settings. | https://www.saasframe.io/ |
| ★★ **ScreensDesign** (ex UI Sources) | Biblioteca de diseño de apps. **uisources.com hoy redirige a ScreensDesign.** | https://screensdesign.com/ |
| ★★ **Godly → Recent** | Galería de diseño web de alto nivel visual. **godly.website hoy muestra "Recent — Design Inspiration" (recent.design).** Útil para la landing, no para la app. | https://godly.website/ |
| ★★ **Land-book** | Landing pages; para el sitio de marketing de GradeHub. | https://land-book.com/ |
| ★★ **Lapa Ninja** | 7.300+ landing pages con capturas y secciones (hero, pricing, FAQ). | https://www.lapa.ninja/ |
| ★★ **SaaS Landing Page** | Landings de SaaS por sección. | https://saaslandingpage.com/ |
| ★ **Dribbble** | Inspiración visual; muchos *shots* son conceptos que nunca enfrentaron datos reales. Usar solo para estilo de ilustración, íconos o motion. | https://dribbble.com/ |
| ★ **Behance** | Casos de estudio largos; filtrar por UI/UX. Misma advertencia que Dribbble. | https://www.behance.net/ |
| ★ **Awwwards** | Web experimental premiada; para inspiración de marca, no de producto. | https://www.awwwards.com/ |
| ★ **Collect UI** | Desafíos diarios de UI agrupados por componente. | https://collectui.com/ |
| ★★ **The Component Gallery** | Cómo nombran e implementan un mismo componente decenas de design systems. Muy útil para decidir nombres. | https://component.gallery/ |
| ★ **Design Systems Repo** | Directorio de design systems públicos. | https://designsystemsrepo.com/ |
| ★★ **Growth.Design – Case Studies** | Casos de UX en formato cómic sobre psicología (onboarding, pricing, retención). | https://growth.design/case-studies |

---

## 5. Herramientas

### 5.1 Figma y plugins
- ★★★ **Figma** + **Community** (kits, plugins). https://www.figma.com/ · https://www.figma.com/community · Plugins: https://www.figma.com/community/plugins
- ★★ **Material 3 Design Kit** (oficial de Google). https://www.figma.com/community/file/1035203688168086460
- ★★ **shadcn/ui design system** (archivo comunitario, no oficial de shadcn): útil para diseñar con los mismos componentes que se programan. https://www.figma.com/community/file/1203061493325953101
- ★★★ **Tokens Studio for Figma**: definir tokens (color, espaciado, tipografía) en JSON y sincronizarlos con GitHub. Puente diseño ↔ Tailwind. https://www.figma.com/community/plugin/843461159747178978/tokens-studio-for-figma · https://tokens.studio/
- ★★★ **Stark**: contraste, simulación de daltonismo y orden de foco dentro de Figma. https://www.figma.com/community/plugin/732603254453395948/stark · https://www.getstark.co/
- ★★ **Iconify**: 200+ sets de íconos open source (Lucide, Phosphor, Tabler…) dentro de Figma. https://www.figma.com/community/plugin/735098390272716381/iconify · https://iconify.design/
- ★★ **Content Reel**: llenar diseños con datos realistas (útil para probar nombres de ramos largos). https://www.figma.com/community/plugin/731627216655469013/content-reel
- ★★ **Autoflow**: flechas de flujo entre pantallas (gratis hasta 50 flujos por archivo). https://www.figma.com/community/plugin/733902567457592893/autoflow
- ★ **Figma Resource Library** (guías y artículos de Figma). https://www.figma.com/resource-library/

### 5.2 Color
| Herramienta | Para qué | Link |
|---|---|---|
| ★★★ **Radix Colors** | 30 escalas de 12 pasos, con versión clara y oscura pareadas y contraste pensado. Base ideal para tokens. | https://www.radix-ui.com/colors |
| ★★★ **oklch.com** | Selector y conversor OKLCH; ver si un color sale del gamut sRGB/P3. | https://oklch.com/ |
| ★★ **Leonardo** (Adobe) | Generar paletas a partir de un **contraste objetivo** (ej. "texto 4,5:1 sobre este fondo"). | https://leonardocolor.io/ |
| ★★ **Huetone** | Editar paletas en LCH/OKLCH y ver contraste WCAG y APCA de toda la grilla. | https://huetone.ardov.me/ |
| ★★ **Realtime Colors** | Probar una paleta y una fuente sobre una página real en vivo. | https://www.realtimecolors.com/ |
| ★★ **UI Colors (uicolors.app)** | Generar una escala Tailwind (50–950) desde un color de marca. | https://uicolors.app/ |
| ★★ **InclusiveColors** | Paletas accesibles WCAG exportables a Tailwind/CSS/Figma. | https://www.inclusivecolors.com/ |
| ★ **Coolors** | Exploración rápida de paletas. | https://coolors.co/ |
| ★★ **ColorBrewer** | Paletas secuenciales/divergentes probadas para datos (útil para mapas de calor de notas). | https://colorbrewer2.org/ |

### 5.3 Tipografía

**Fuentes de Google Fonts revisadas por cifras tabulares.** Se descargó el archivo latino que sirve Google Fonts (26-nov-2026) y se inspeccionó con fontTools: `tnum` = la fuente trae la función OpenType de cifras tabulares (activar con `font-variant-numeric: tabular-nums`, en Tailwind `tabular-nums`); "tabulares por defecto" = los dígitos ya tienen el mismo ancho sin activar nada.

| Fuente | `tnum` | Cifras tabulares por defecto | Comentario para GradeHub | Link |
|---|---|---|---|---|
| ★★★ **Inter** | Sí | No | La opción más segura para UI con muchos números; enorme cobertura y versión variable. Sitio del autor con guía de features. | https://fonts.google.com/specimen/Inter · https://rsms.me/inter/ |
| ★★★ **Geist** (Vercel) | Sí | No | Muy limpia, moderna; acompañar con **Geist Mono** para tablas de notas si se quiere un toque técnico. | https://fonts.google.com/specimen/Geist · https://vercel.com/font · https://fonts.google.com/specimen/Geist+Mono |
| ★★ **IBM Plex Sans** | No en la versión de Google | **Sí** | Los dígitos ya son de ancho fijo: las notas se alinean sin CSS extra. Personalidad más "técnica". | https://fonts.google.com/specimen/IBM+Plex+Sans |
| ★★ **Manrope** | Sí | No | Geométrica y amable; buena para una marca más juvenil. | https://fonts.google.com/specimen/Manrope |
| ★★ **Instrument Sans** | Sí | No | Contemporánea, algo condensada; buena en títulos de tarjetas. | https://fonts.google.com/specimen/Instrument+Sans |
| ★★ **Space Grotesk** | Sí | No | Mucha personalidad; mejor para títulos/marca que para texto largo. | https://fonts.google.com/specimen/Space+Grotesk |
| ★★ **Plus Jakarta Sans** · **Figtree** · **Onest** · **Public Sans** · **Outfit** | Sí | No | Alternativas válidas con `tnum`. | https://fonts.google.com/specimen/Plus+Jakarta+Sans · https://fonts.google.com/specimen/Figtree · https://fonts.google.com/specimen/Onest · https://fonts.google.com/specimen/Public+Sans · https://fonts.google.com/specimen/Outfit |
| ⚠ **DM Sans** | **No** | **No** | En la versión que sirve Google Fonts los dígitos son proporcionales y no hay `tnum`: las columnas de notas **no se alinearán**. Evitar para números o usar otra fuente para cifras. | https://fonts.google.com/specimen/DM+Sans |
| ★ **Roboto Flex** | No | **Sí** | Dígitos ya tabulares; muy configurable (ejes variables). | https://fonts.google.com/specimen/Roboto+Flex |
| — **SF Pro** (iOS) | — | — | En iOS usar la fuente del sistema (`system-ui` / `-apple-system`) respeta Dynamic Type; ver HIG Typography. | https://developer.apple.com/design/human-interface-guidelines/typography |

Herramientas tipográficas:
- ★★ **Filtro de Google Fonts por cifras tabulares**: https://fonts.google.com/?categoryFilters=Feature:%2FFeature%2Ftnum
- ★★ **Typescale**: generar una escala modular (ej. 1,2 o 1,25) y exportar CSS. https://typescale.com/
- ★★ **Utopia**: escala fluida con `clamp()` (ver 3.5). https://utopia.fyi/type/calculator/
- ★★ **Wakamai Fondue**: subir una fuente y ver todas sus features OpenType (ej. confirmar `tnum`, `zero`). https://wakamaifondue.com/
- ★ **Fontshare**: fuentes gratis de calidad (Indian Type Foundry). https://www.fontshare.com/
- ★ **Fontpair**: combinaciones de Google Fonts. https://www.fontpair.co/

### 5.4 Íconos
| Set | Comentario | Link |
|---|---|---|
| ★★★ **Lucide** | Set por defecto de shadcn/ui; trazo consistente, paquete React con tree-shaking. Recomendado como set principal. | https://lucide.dev/ |
| ★★ **Phosphor** | 6 pesos (thin → fill, duotone): útil para estados activo/inactivo en la tab bar. | https://phosphoricons.com/ |
| ★★ **Tabler Icons** | 6.000+ íconos de trazo, MIT. Bueno si Lucide no tiene un ícono. | https://tabler.io/icons |
| ★★ **Heroicons** | Del equipo de Tailwind; set más pequeño y pulido. | https://heroicons.com/ |
| ★★★ **SF Symbols** | Íconos nativos de Apple que escalan con Dynamic Type; usarlos en la capa iOS nativa (widgets, notificaciones). | https://developer.apple.com/sf-symbols/ |
| ★★ **Material Symbols** | Íconos variables de Google (relleno, peso, grado); para la capa Android nativa. | https://fonts.google.com/icons |
| ★ **Icônes** | Buscador rápido de todos los sets de Iconify. | https://icones.js.org/ |

Regla: **un solo set** en la app (mezclar trazos se nota); excepciones solo en capas nativas.

### 5.5 Ilustración
- ★★ **unDraw**: ilustraciones open source recoloreables al color de marca; buenas para estados vacíos. https://undraw.co/
- ★★ **Blush**: ilustraciones personalizables de varios artistas. https://blush.design/
- ★ **Humaaans**: personas mix-and-match. https://www.humaaans.com/
- ★ **Storyset**: ilustraciones animables gratis. https://storyset.com/
- ★ **Open Peeps**: personas dibujadas a mano. https://www.openpeeps.com/

Advertencia: estos estilos están muy vistos. Para una marca propia, considerar una sola mascota o set encargado (ver el caso Duolingo en la sección 6).

### 5.6 Gráficos (charts)
| Librería | Cuándo usarla | Link |
|---|---|---|
| ★★★ **Recharts** | La base de los charts de shadcn/ui; declarativa, suficiente para líneas, barras y áreas. **recharts.org hoy redirige a recharts.github.io.** | https://recharts.github.io/ |
| ★★★ **Tremor** | Componentes de dashboard en Tailwind (KPI cards, barras, sparklines, progress). Rápido para "Mi semestre". | https://www.tremor.so/ |
| ★★ **visx** (Airbnb) | Primitivas de bajo nivel sobre D3 para gráficos a medida (ej. barra de nota con umbral 4,0). | https://visx.airbnb.tech/ |
| ★★ **nivo** | Muchos tipos listos, con buen soporte de temas y SSR. | https://nivo.rocks/ |
| ★ **Apache ECharts** | Muy potente; pesado para una PWA móvil. | https://echarts.apache.org/ |
| ★★ **Observable Plot** | Para análisis exploratorio interno (métricas del producto), no tanto para la app. | https://observablehq.com/plot/ |
| ★ **Chart.js** | Canvas, liviano y popular. | https://www.chartjs.org/ |

Para elegir el gráfico: **Data Viz Catalogue** (https://datavizcatalogue.com/) y **From Data to Viz** (https://www.data-to-viz.com/).

### 5.7 Motion
| Herramienta | Uso | Link |
|---|---|---|
| ★★★ **Motion** (antes Framer Motion) | Animaciones React con springs, layout animations y `AnimatePresence`; framer.com/motion redirige aquí. | https://motion.dev/ |
| ★★ **AutoAnimate** | Una línea para animar listas (agregar/quitar evaluaciones). | https://auto-animate.formkit.com/ |
| ★★ **Rive** | Animaciones interactivas con máquinas de estado (mascota, celebración al aprobar); archivos pequeños. | https://rive.app/ |
| ★★ **Lottie** + **LottieFiles** | Animaciones vectoriales exportadas desde After Effects; biblioteca enorme. | https://lottie.airbnb.tech/ · https://lottiefiles.com/ |
| ★★ **Sonner** · **Vaul** (Emil Kowalski) | Toasts y drawers/bottom sheets muy pulidos para React. | https://sonner.emilkowal.ski/ · https://vaul.emilkowal.ski/ |
| ★ **cmdk** | Menú de comandos (⌘K) para la versión de escritorio. | https://github.com/dip/cmdk |

### 5.8 Accesibilidad
| Herramienta | Uso | Link |
|---|---|---|
| ★★★ **axe** (Deque) / **axe-core** | Motor de auditoría automática; integrarlo en tests. | https://www.deque.com/axe/ · https://github.com/dequelabs/axe-core · https://github.com/dequelabs/axe-core-npm |
| ★★★ **Playwright – Accessibility testing** | Correr axe dentro de los tests E2E en cada PR. | https://playwright.dev/docs/accessibility-testing |
| ★★ **WAVE** (WebAIM) | Extensión/servicio visual para revisar una página. | https://wave.webaim.org/ |
| ★★ **Stark** | Contraste y daltonismo en Figma y navegador. | https://www.getstark.co/ |
| ★★★ **WebAIM Contrast Checker** | Verificar pares de color contra WCAG AA/AAA. | https://webaim.org/resources/contrastchecker/ |
| ★★ **Contrast Ratio** (Lea Verou, hoy en Siege Media) | Contraste con transparencias. contrast-ratio.com redirige aquí. | https://www.siegemedia.com/contrast-ratio |
| ★★ **APCA Contrast Calculator** | Contraste perceptual (complementario). | https://apcacontrast.com/ |
| ★★★ **WCAG 2.2 Quick Reference** + **Understanding 1.4.3 Contrast** | La norma. | https://www.w3.org/WAI/WCAG22/quickref/ · https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html |
| ★★ **The A11Y Project – Checklist** | Checklist práctico por categoría. | https://www.a11yproject.com/checklist/ |

### 5.9 Testing visual y documentación de componentes
- ★★★ **Storybook**: documentar cada componente con sus estados (vacío, cargando, error, nota faltante, nota roja). https://storybook.js.org/ · Visual tests: https://storybook.js.org/docs/writing-tests/visual-testing
- ★★★ **Playwright – Visual comparisons** (`toHaveScreenshot`): detectar regresiones visuales en CI, gratis. https://playwright.dev/docs/test-snapshots
- ★★ **Chromatic**: servicio de revisión visual sobre Storybook (de pago, con plan gratis). https://www.chromatic.com/ · https://www.chromatic.com/storybook

---

## 6. Casos de estudio de producto y qué copiar

| Producto | Fuente(s) verificada(s) | Qué copiar en GradeHub | Qué NO copiar |
|---|---|---|---|
| ★★★ **Duolingo** | Racha basada en investigación de hábitos: https://blog.duolingo.com/how-duolingo-streak-builds-habit/ · Animación de hitos de racha: https://blog.duolingo.com/streak-milestone-design-animation/ · Rediseño del home: https://blog.duolingo.com/new-duolingo-home-screen-design/ · Hub de diseño: https://blog.duolingo.com/hub/design/ | Una sola métrica de constancia (ej. "semanas con notas al día"), celebración breve en hitos, y un home que muestre **el próximo paso** (la próxima evaluación). | Culpa y presión (mensajes pasivo-agresivos): el contexto académico ya es estresante. |
| ★★ **Notion** | Blog de diseño y producto: https://www.notion.com/blog/topic/design | Estados vacíos que enseñan con plantillas (ej. "Plantilla de ramo UC con ponderaciones típicas"). Tipografía sobria y mucho espacio. | La flexibilidad total: GradeHub debe ser opinado y rápido. |
| ★★★ **Things** (Cultured Code) | https://culturedcode.com/things/ · https://culturedcode.com/things/blog/ | Pulido extremo de microinteracciones, calma visual, jerarquía clara entre "hoy" y "después". Modelo para la agenda de evaluaciones. | — |
| ★★★ **Apple Fitness (anillos)** | HIG Activity rings: https://developer.apple.com/design/human-interface-guidelines/activity-rings · https://www.apple.com/watch/close-your-rings/ | Progreso hacia una meta como forma cerrable (anillo de "% del ramo evaluado" o "% del semestre"). Un color por métrica, siempre el mismo. | Usar anillos para datos que no son "progreso hacia meta" (un promedio no es un anillo). |
| ★★ **Strava** | https://stories.strava.com/ · https://stories.strava.com/articles | Resúmenes de actividad que se leen como historia ("Tu semana"), récords personales y comparación con uno mismo. | Comparación social de notas: riesgo de ansiedad y privacidad. |
| ★★ **Revolut** | Cómo usan una librería compartida en Figma para escalar a muchos mercados: https://www.figma.com/customers/how-figma-helps-revolut-deliver-wow-for-customers/ · Revolut 10 (home personalizable con widgets): https://www.revolut.com/blog/post/revolut-10/ | Home con **widgets configurables** (el estudiante elige qué ver primero), números grandes y legibles, design system compartido entre plataformas. | Sobrecarga de features en el home: la propia Revolut recibió críticas por eso. |
| ★★★ **Brilliant** | Rediseño de "game feel" con ustwo: https://ustwo.com/work/brilliant · Animaciones con Rive para motivación y rachas: https://rive.app/blog/how-brilliant-org-motivates-learners-with-rive-animations | Mecánicas de juego dosificadas para que no distraigan del foco; feedback animado al completar (Rive). | — |
| ★★ **Khan Academy** | Design system Wonder Blocks: https://khan.github.io/wonder-blocks/ · Blog: https://blog.khanacademy.org/ | Componentes accesibles para contexto educativo y tono alentador. | — |
| ★★★ **Quizlet** | Rediseño para 20 M de estudiantes (parts kit, rollout gradual con feature flags, A/B test): https://quizlet.com/blog/launching-a-successful-redesign-for-20-million-students · Rediseño de modos de estudio (feedback de respuesta en contexto): https://vickiechiang.medium.com/quizlet-study-modes-redesign-d80c6fd509c7 | **Proceso**: kit de componentes primero, lanzar por partes detrás de flags, medir. Lección concreta: su diseño inicial tenía fuentes demasiado grandes y mucho espacio en blanco, y en Chromebooks obligaba a hacer scroll. Además, al quitar los bordes de los inputs bajó 4 % la publicación de sets porque dejaron de parecer campos. | Inputs sin borde: deben parecer inputs. |
| ★★ **Todoist** | https://www.todoist.com/inspiration | Ingreso rápido en lenguaje natural ("Control 2 Cálculo el jueves 30 %") y contenido educativo sobre productividad. | — |
| ★★ **Superhuman** | Motor de product-market fit (encuesta "¿qué tan decepcionado estarías si no existiera?"): https://review.firstround.com/how-superhuman-built-an-engine-to-find-product-market-fit/ · https://superhuman.com/ | Usar la encuesta de PMF con los primeros usuarios de GradeHub; velocidad y atajos de teclado en la versión de escritorio. | Onboarding 1:1 manual a escala. |
| ★★ **Linear** | Ver 3.4 | Interfaz calmada, color con LCH/OKLCH y velocidad percibida. | — |

---

## 7. Personas y cuentas a seguir

Handles confirmados en el sitio propio de cada persona (o en fuente citada) el 26-nov-2026.

| Persona | Por qué seguirla | Dónde |
|---|---|---|
| ★★★ **Steve Schoger** | Tips visuales "antes/después" (coautor de Refactoring UI). | X @steveschoger (confirmado en UI Breakfast ep. 154: https://uibreakfast.com/154-refactoring-ui-with-adam-wathan-and-steve-schoger) |
| ★★ **Adam Wathan** | Creador de Tailwind; novedades del stack. | X @adamwathan (misma fuente) |
| ★★★ **Rauno Freiberg** | Craft de interacción (ex Vercel). | https://rauno.me/ · https://x.com/raunofreiberg |
| ★★★ **Emil Kowalski** | Animación en UI (Sonner, Vaul, curso animations.dev). | https://emilkowal.ski/ · https://twitter.com/emilkowalski |
| ★★ **Josh W. Comeau** | CSS y React explicados con interactivos. | https://www.joshwcomeau.com/ · https://bsky.app/profile/joshwcomeau.com |
| ★★ **shadcn** | Novedades de shadcn/ui. | https://twitter.com/shadcn |
| ★★ **Paco Coursey** | Autor de cmdk, interfaces web pulidas. | https://paco.me/ · https://twitter.com/pacocoursey |
| ★★ **Jhey Tompkins** | Demos de CSS y motion creativas. | https://jhey.dev/ |
| ★★ **Jon Yablonski** | Laws of UX. | https://jonyablonski.com/ · https://x.com/JonYablonski |
| ★★ **Luke Wroblewski** | Mobile first, formularios y diseño de producto con IA. | https://www.lukew.com/ · https://x.com/lukew |
| ★★ **Brad Frost** | Design systems y Atomic Design. | https://bradfrost.com/ · https://bsky.app/profile/bradfrost.com |
| ★★ **Anthony Hobday** | Reglas visuales concretas. | https://anthonyhobday.com/sideprojects/saferules/ · https://twitter.com/hobdaydesign |
| ★★ **Erik Kennedy** | Diseño UI para no diseñadores (Learn UI Design). | https://www.learnui.design/ |
| ★★ **Rasmus Andersson** | Creador de Inter. | https://rsms.me/ |
| ★★ **Stephen Few** | Dashboards (Perceptual Edge). | https://www.perceptualedge.com/library.php |
| ★★ **Cole Nussbaumer Knaflic** | Storytelling con datos. | https://www.storytellingwithdata.com/ |
| ★ **Kate Moran** | Muchos artículos de NN/g citados aquí (su perfil en NN/g figura hoy como ex empleada). | https://www.nngroup.com/people/kate-moran/ |

Fuentes colectivas (newsletters, blogs y canales):
- ★★ **Sidebar**: 5 links de diseño al día. https://sidebar.io/
- ★★ **Linear Now** (blog de Linear). https://linear.app/now/how-we-redesigned-the-linear-ui
- ★ **Figma Blog**. https://www.figma.com/blog/
- ★ **Google Design**. https://design.google/
- ★ **Design Better** (podcast y libros). https://designbetter.com/
- ★ YouTube **DesignCourse**: https://www.youtube.com/@DesignCourse · **Juxtopposed**: https://www.youtube.com/@juxtopposed

---

## 8. Cursos

| Curso | Formato y costo | Para quién en el equipo | Link |
|---|---|---|---|
| ★★★ **Refactoring UI** | Libro + videos + paletas/íconos, pago único. | Todos los devs. | https://refactoringui.com/ |
| ★★★ **Laws of UX** | Sitio gratis con cada ley + libro (O'Reilly). No se encontró un curso formal en el sitio; usarlo como mini-curso leyendo una ley por día. | Todos. | https://lawsofux.com/ |
| ★★ **Google UX Design Professional Certificate** | Coursera, 8 cursos (~6 meses a 10 h/semana), suscripción. | Quien lidere diseño/UX research. | https://www.coursera.org/professional-certificates/google-ux-design · https://grow.google/certificates/ux-design/ |
| ★★ **Interaction Design Foundation (IxDF)** | Membresía anual con muchos cursos UX/UI. interaction-design.org hoy redirige a ixdf.org. | Diseño y producto. | https://ixdf.org/ |
| ★★ **NN/g Training** | Cursos en vivo online, caros pero de referencia. | Lead de diseño. | https://www.nngroup.com/training/live-courses/ |
| ★★★ **web.dev Learn** (Google, gratis) | Learn Design (responsive), Learn Accessibility y Learn PWA. Muy relevante para la PWA. | Devs frontend. | https://web.dev/learn/design · https://web.dev/learn/accessibility · https://web.dev/learn/pwa |
| ★★ **animations.dev** (Emil Kowalski) | Curso de animación para web, pago. | Quien implemente motion. | https://animations.dev/ |
| ★★ **CSS for JavaScript Developers** · **The Joy of React** (Josh Comeau) | Cursos interactivos, pago. | Devs frontend. | https://css-for-js.dev/ · https://www.joyofreact.com/ |
| ★★ **Learn UI Design** (Erik Kennedy) | Curso en video de diseño de interfaces. | Devs que diseñan. | https://www.learnui.design/ |
| ★ **Hack Design** | Lecciones gratis curadas por diseñadores. | Todos. | https://hackdesign.org/ |
| ★ **DesignCode** | Cursos de UI y desarrollo, hoy con foco en IA. | Opcional. | https://designcode.io/ |
| ⚠ **design.dev** | **Ya no es un curso**: hoy (26-nov-2026) es un sitio de plantillas, generadores (DESIGN.md, tokens) y herramientas para agentes de IA. Puede servir su generador de tokens/DESIGN.md, pero no como formación. | — | https://design.dev/ |

---

## 9. Ruta de lectura sugerida para el equipo (4 semanas)

1. **Semana 1 – Base visual:** Refactoring UI (libro completo) + 7 Practical Tips + Visual design rules (Hobday). Resultado: escala de espaciado, tipográfica y paleta definidas en tokens.
2. **Semana 2 – Usabilidad:** Don't Make Me Think + 10 heurísticas de NN/g + artículos NN/g de formularios y errores + GOV.UK error message. Resultado: checklist de formularios para el input de notas.
3. **Semana 3 – Datos:** Storytelling with Data (caps. 1–4) + NN/g Dashboards preattentive + Pencil & Paper dashboards + Smashing 2026. Resultado: rediseño de "Mi semestre" como dashboard de monitoreo.
4. **Semana 4 – Craft y calidad:** Web Interface Guidelines (Vercel/Rauno) + Invisible Details + Great Animations + Playwright visual/accessibility testing. Resultado: checklist de PR y tests de regresión visual y de accesibilidad en CI.

---

## 10. Notas de verificación y no incluido

**Cambios detectados al verificar (26-nov-2026):**
- `godly.website` hoy muestra "Recent — Design Inspiration" (contenido de recent.design).
- `screenlane.com` redirige a Page Flows; `uisources.com` redirige a ScreensDesign.
- `recharts.org` dice "Recharts has moved" y apunta a recharts.github.io.
- `framer.com/motion` redirige a motion.dev; `interaction-design.org` a ixdf.org; `contrast-ratio.com` a siegemedia.com/contrast-ratio; `polaris.shopify.com` a shopify.dev/docs/api/polaris.
- `design.dev` cambió de giro (ver sección 8).
- `tailwindcss.com/plus` redirige a login para ver el catálogo; el producto existe.
- Medium, O'Reilly, Revolut, Quizlet, Dribbble, Behance y Figma Community bloquean peticiones automáticas (403/202). Se confirmaron con `web_fetch` o `web_search`.

**No incluido por no poder verificarlo:** artículos de NN/g sobre gamificación y rachas (las URLs probadas daban 404), una página pública de "design" de Notion sobre su design system (404), el sitio microinteractions.com (no respondió) y handles de X que no aparecían enlazados desde el sitio de la persona.

**Sin datos personales:** este documento no contiene información de usuarios ni del equipo.
