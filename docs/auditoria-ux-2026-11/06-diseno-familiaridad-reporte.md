# GradeHub — Auditoría de diseño y familiaridad (diseñador de producto senior)
Cuenta auditada: gpruebahark2@prueba.cl (sesión ya iniciada). Tema: claro y oscuro. Detalle y evidencia por pantalla en `findings.md` (§0-26).

## 1. Sensación de marca e identidad
GradeHub **sí tiene identidad propia**, y es su mayor fortaleza. La marca de capas teal, el H1 "Mejor que tu Excel.", el lenguaje ("ramo", "solemne", "control", "PROMEDIO GENERAL", "Necesitas 3,4 en lo pendiente para aprobar") y la escala de notas propia construyen un producto hecho *para* el estudiante chileno, no traducido. El tono es sobrio, directo y algo juvenil sin ser infantil: cercano a **Notion/Linear** por austeridad y a **apps bancarias chilenas** (Falabella, Mercado Pago) por los números grandes como protagonistas. Se aleja de Duolingo (sin mascota ni celebración ruidosa) y de Canvas (denso, institucional). Riesgo: en Ajustes y formularios la austeridad cruza hacia **genérica** (grises planos, botones de igual peso, jerarquía apoyada solo en el tamaño).

## 2. Reporte por pantalla (síntesis + propuesta de rediseño)

### 2.1 Auth / landing pública (login, registro, error)
- **Jerarquía**: logo → H1 → bajada → prueba social → proveedores → formulario → footer. El ojo llega primero al botón negro de Apple, lo deseado en el segmento universitario chileno.
- **Familiaridad**: onboarding estilo iOS/Notion; orden Apple → Google → "o con tu correo" impecable. Las dos tarjetas de ejemplo laterales ("Ejemplo de un ramo", "Ejemplo de tus estadísticas") son la mejor decisión de la app: explican el producto sin video.
- **Problemas**: contador animado (2.222 / 9.178 / 39.025) concatenado en el árbol de accesibilidad y sin `aria-label`; salto brusco H1 34 px vs bajada 13-15 px; en registro se conserva el badge "Lo usaste la última vez" que ahí no aplica; el error "Ingresa un correo electrónico válido." sale en rojo **sin borde rojo en el campo ni `aria-invalid`**.
- **Rediseño**: borde + ícono rojo en el campo con error y foco en el campo; `aria-live=polite` y `aria-label` por contador; bajar la prueba social bajo el pliegue en mobile; quitar el badge en registro; subir la bajada a 16 px.

### 2.2 Inicio (estado vacío y con datos)
- **Jerarquía**: promedio general como número grande y luego las tarjetas de ramos; lo primero que mira el ojo es el número, correcto.
- **Bug**: en estado vacío aparece un **cuadradito gris de ~8 px** bajo "PROMEDIO GENERAL" en vez de "—", en claro y oscuro; rompe la jerarquía del estado vacío.
- **Familiaridad**: Notion (sidebar, densidad) + app bancaria (tarjeta de resumen arriba). Un estudiante de Canvas esperaría calendario; GradeHub elige el promedio y es la apuesta correcta.
- **Rediseño**: estado vacío ilustrado con el lenguaje de las tarjetas de ejemplo de la landing; "—" tipográfico; botón "Agregar ramo" anclado dentro de la tarjeta vacía.

### 2.3 Agregar ramo, ficha del ramo, ponderaciones, simulador, calificar profesor
- Buen lenguaje y densidad; la ficha del ramo es la pantalla más lograda (pesos, porcentaje, nota, "cuánto necesitas").
- **Problemas**: la escala de color de la nota **no es estable** (teal en Estadísticas, oliva en la ficha en claro; en oscuro el 4,8 pasa a amarillo); modales largos con el botón de acción cortado al pie; "Archivar semestre" y el modal de horario anclados abajo (cancelados antes del último paso).
- **Rediseño**: tokenizar la escala (rojo <3,0 / ámbar-oliva 3,0-4,4 / teal ≥4,5) **idéntica en todos los temas y pantallas** y acompañarla de ícono o etiqueta ("aprobado", "en riesgo") para no depender solo del color; pies de modal fijos con área segura y scroll interno.

### 2.4 Calculadora de nota
- Modal más largo de la app, botones cortados al pie, resultado "Tu nota 6,4" en **blanco** aunque esa misma nota sale verde/teal en otras pantallas: se pierde el único momento de recompensa emocional.
- Error "Tu puntaje no puede superar el total" **sin marca roja en el campo** y sin `aria-invalid`; el mensaje aparece lejos del campo que falla.
- **Rediseño**: color semántico en el resultado y microanimación de conteo; marca de error junto al campo; dividir en dos pasos o altura máxima con scroll interno.

### 2.5 Agenda y Estadísticas
- Agenda con solapas Evaluaciones / Horario y estados vacíos con buen microcopy; patrón de calendario familiar (Google Calendar / Notion).
- Estadísticas: buenos números grandes y rangos; en **oscuro el gráfico de área queda casi ilegible** (superficies casi idénticas, separadores invisibles) y el 4,8 cambia de color; la comparativa vacía no explica qué la llena.
- **Rediseño**: subir contraste de separadores en oscuro (opacidad 10-14 %), relleno de área más saturado y línea de 1,5 px; descripción textual de cada gráfico.

### 2.6 Perfil y Ajustes (9 secciones)
- **Lo mejor de la app como sistema**: modal master–detail con búsqueda, segmented controls, switches y radiogroup de acentos: es **Settings de iOS**, familiaridad altísima.
- **Problemas**: el modal **cambia de alto en cada sección (723 → 603 px)** y produce saltos; "Archivar semestre" aparece en Perfil pero **no** en el sidebar de Ajustes (doble fuente de verdad); tres botones de guardado apilados con igual peso; en "Agentes conectados" el **label accesible del campo es la concatenación de dos títulos** ("1. PREGÚNTALE… 2. PONLE UN NOMBRE…") y el término "URL MCP" no se explica; en "Datos y cuenta" la **ZONA SENSIBLE** da igual peso a "Eliminar mi cuenta" y "Reiniciar app"; en Calendario la **URL de suscripción con token se muestra sin máscara**; en Sugerencias "Enviar comentario" sigue activo con 3 caracteres; el cambio de tema se aplica **sin transición**.
- **Rediseño**: altura fija o transicionada del modal; una sola entrada por función; un botón primario por sección; `htmlFor`/`aria-labelledby` correctos; máscara con revelar/copiar para el token; "Enviar" deshabilitado hasta el mínimo y contrato del contador cumplido; confirmación destructiva tipo "escribe ELIMINAR"; cross-fade de 150-200 ms al cambiar tema.

### 2.7 Modo oscuro
- Fondos casi puros y superficies casi idénticas → **pérdida de jerarquía por elevación**; separadores invisibles; gráficos debilitados; semántica inestable. Es un tema "pintado", no un token set.
- **Rediseño**: 5 niveles de superficie (fondo, elevated-1/2, borde, borde fuerte), 4,5:1 en texto secundario y 3:1 en gráficos, una sola escala de notas.

## 3. Transversal: componentes, accesibilidad, familiaridad
- **Consistencia**: botones (primario teal, outline, negro Apple), chips, switches, segmented controls, toasts e íconos de trazo fino son coherentes. Se rompen: peso de botones apilados, pies de modal cortados, escala de notas.
- **Microinteracciones**: contador animado en landing y menús correctos; casi no hay feedback en guardados ni al cambiar tema.
- **Accesibilidad básica**: `role=alert` presente (bien); faltan `aria-invalid` y marca visual en errores de campo, hay labels concatenados y objetivos táctiles de ~24-28 px en íconos del header. El **ancho angosto no pudo auditarse** (§25): el bottom-nav existe en el DOM pero no se renderiza al ancho disponible.
- **Expectativa del estudiante chileno**: Apple/Google sign-in ✓, lenguaje ramo/control/solemne ✓, escala 0-6 con 3,0 de umbral ✓, referencia al Excel ✓; faltan señales de Canvas: calendario/unidad, avisos de evaluación próxima y compartir/exportar evidente.

## 4. Top 15 de cambios de diseño priorizados (impacto / esfuerzo)
| # | Cambio | Impacto | Esfuerzo |
|---|---|---|---|
| 1 | Tokenizar la escala de notas (rojo/ámbar/teal) y usarla igual en claro, oscuro, ficha, estadísticas y calculadora | Alto | Bajo |
| 2 | Sumar marca roja en el campo + `aria-invalid`/`aria-describedby` en todos los errores (auth, calculadora) | Alto | Bajo |
| 3 | Corregir el cuadradito gris del estado vacío ("—" tipográfico + estado vacío ilustrado) | Alto | Bajo |
| 4 | Definir token set real de modo oscuro (5 superficies, bordes, contraste de gráficos) | Alto | Medio |
| 5 | Pies de modal fijos con área segura y scroll interno (calculadora, horario, archivar) | Alto | Medio |
| 6 | Altura estable del modal de Ajustes (o transición de altura) para eliminar saltos | Medio | Bajo |
| 7 | Un solo botón primario por sección; apilados de igual peso → primario + secundario/texto | Alto | Bajo |
| 8 | Unica fuente de verdad de entradas ("Archivar semestre" también en Ajustes, o quitado de Perfil) | Medio | Bajo |
| 9 | Arreglar labels accesibles concatenados (Agentes conectados, Archivar semestre) con `aria-labelledby`/`htmlFor` | Alto | Bajo |
| 10 | Máscara + revelar/copiar para la URL de suscripción con token; nota de revocación | Medio | Bajo |
| 11 | Acompañar el color semántico con ícono/etiqueta (de color + texto, no solo color) | Alto | Medio |
| 12 | Feedback de guardado y transición de tema (toast + cross-fade 150-200 ms) y microanimación del resultado en la calculadora | Medio | Medio |
| 13 | Cumplir contratos: "Enviar comentario" deshabilitado bajo el mínimo; quitar "Lo usaste la última vez" en registro | Bajo | Bajo |
| 14 | Jerarquía de ZONA SENSIBLE: "Eliminar mi cuenta" como texto destructivo con confirmación "escribe ELIMINAR"; "Reiniciar app" secundario | Alto | Medio |
| 15 | Auditar y pulir el breakpoint móvil (390×844): bottom-nav, objetivos ≥44 px, modales a sheet | Alto | Alto |

**Si solo se hacen tres**: 1, 2 y 4. Son los que más afectan percepción de calidad, confianza y accesibilidad, y los tres son de esfuerzo bajo o medio.

## 5. Nota metodológica y límites
Ancho angosto no alcanzable en este entorno (sin redimensionado; zoom por teclado no soportado) → recomendar segunda pasada con emulación móvil. No se pagó, no se conectaron cuentas externas, no se publicó nada (flujo "Calificar profesor" cancelado antes del último paso), no se borró la cuenta. Dato de prueba creado y eliminado; tema restablecido a Claro con acento Turquesa.
