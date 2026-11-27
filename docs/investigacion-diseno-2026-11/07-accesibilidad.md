# 07 · Accesibilidad (WCAG 2.2 AA aplicada a GradeHub)

Fuentes abiertas: [WCAG 2.2, W3C Recommendation 12-dic-2024](https://www.w3.org/TR/WCAG22/) · [Understanding 2.5.8 Target Size (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html) · [Understanding 2.4.13 Focus Appearance](https://www.w3.org/WAI/WCAG22/Understanding/focus-appearance.html) · [MDN :focus-visible](https://developer.mozilla.org/en-US/docs/Web/CSS/:focus-visible) · [MDN aria-live](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-live) · [Apple HIG Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility) · [Material 3, Structure (landmarks, headings, targets)](https://m3.material.io/foundations/designing/structure) · [WCAG 3.0 WD](https://www.w3.org/TR/wcag-3.0/)

---

## 1. Qué es nuevo en WCAG 2.2 y cómo pega en GradeHub
WCAG 2.2 es Recomendación W3C desde el 12-dic-2024 y retira 4.1.1 *Parsing* ([WCAG 2.2](https://www.w3.org/TR/WCAG22/)). Criterios nuevos (A/AA) y su aplicación:

| Criterio | Nivel | Texto (resumen fiel) | En GradeHub |
|---|---|---|---|
| 2.4.11 Focus Not Obscured (Minimum) | AA | Al recibir foco de teclado, el componente no queda **totalmente** oculto por contenido del autor | Tab bar fija, toasts y pies de modal no pueden tapar el campo enfocado. `scroll-padding-bottom` |
| 2.4.13 Focus Appearance | AAA | Indicador ≥ perímetro de 2 px y 3:1 entre estado enfocado y no enfocado | Usarlo como meta de diseño aunque sea AAA |
| 2.5.7 Dragging Movements | AA | Todo lo que se hace arrastrando se puede hacer con un solo puntero sin arrastrar | Reordenar evaluaciones/ramos y sliders del simulador: agregar botones ↑↓ o input numérico |
| 2.5.8 Target Size (Minimum) | AA | Objetivos ≥ **24×24 px CSS**, o espaciados para que un círculo de 24 px centrado no toque otro objetivo; excepciones: equivalente, en línea con texto, control del navegador, esencial | Íconos 🔧, ✕ de chips, flechas del year picker |
| 3.2.6 Consistent Help | A | La ayuda repetida en varias páginas aparece en el mismo orden relativo | Botón de ayuda/soporte siempre en el mismo lugar |
| 3.3.7 Redundant Entry | A | Lo ya ingresado en el mismo proceso se autocompleta o se puede elegir | Onboarding y creación de evaluaciones en serie |
| 3.3.8 Accessible Authentication (Minimum) | AA | No exigir pruebas cognitivas (recordar contraseña, puzzles) sin alternativa (p. ej. permitir pegar/gestor de contraseñas, enlace mágico, OAuth) | No bloquear pegar en contraseña; ofrecer Google/Apple y enlace mágico |

Criterios "clásicos" más relevantes: 1.3.1 Info y relaciones, 1.4.1 Uso del color, 1.4.3 Contraste (4,5:1), 1.4.10 Reflow (320 px sin scroll 2D), 1.4.11 Contraste no textual (3:1), 1.4.12 Espaciado de texto, 2.1.1 Teclado, 2.4.3 Orden del foco, 2.4.7 Foco visible, 3.3.1 Identificación de errores, 3.3.3 Sugerencia ante errores, 4.1.2 Nombre, rol, valor, 4.1.3 Mensajes de estado ([WCAG 2.2](https://www.w3.org/TR/WCAG22/)).

## 2. Foco
- MDN: `:focus-visible` aplica cuando el navegador determina por heurística que el foco debe hacerse evidente (teclado sí, clic de mouse en botón no); "quitar los estilos de foco hace la navegación por teclado inaccesible" ([MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/:focus-visible)).
- Hoy GradeHub tiene **19 `outline:none`** junto a 170 `:focus-visible`: revisar cada uno y asegurar reemplazo visible.
- Diseño del anillo según 2.4.13: perímetro sólido ≥2 px, 3:1 contra el estado sin foco ([Understanding 2.4.13](https://www.w3.org/WAI/WCAG22/Understanding/focus-appearance.html)). Truco de doble anillo para que funcione sobre cualquier fondo:

```css
:where(a, button, input, select, textarea, [tabindex]):focus-visible{
  outline: 2px solid var(--focus-ring-solid, oklch(0.52 0.092 180));
  outline-offset: 2px;
  box-shadow: 0 0 0 4px var(--bg);         /* separa del contenido */
}
/* Nunca: *:focus{ outline:none } sin reemplazo */
html{ scroll-padding-block-end: calc(80px + env(safe-area-inset-bottom)); } /* 2.4.11: que la tab bar no tape el foco */
```
- **Orden del foco** = orden visual = orden del DOM (M3 insiste en que lectores de pantalla siguen el HTML, no el CSS ([M3](https://m3.material.io/foundations/designing/structure))).
- **Gestión del foco**: al abrir diálogo → foco al primer campo o al título; al cerrar → volver al botón que lo abrió; al borrar una fila → foco a la siguiente fila o al toast "Deshacer"; al navegar a otra vista → foco al `h1`.

## 3. Objetivos táctiles: 24 (norma) / 44 (Apple) / 48 (Material)
- WCAG 2.5.8: 24×24 px CSS mínimo, con excepción por espaciado ([Understanding 2.5.8](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html)).
- Apple: 44×44 pt por defecto (mínimo 28×28), y "el espacio entre controles es tan importante como el tamaño": ~12 pt de padding alrededor de elementos con borde, ~24 pt sin borde ([Apple HIG](https://developer.apple.com/design/human-interface-guidelines/accessibility)).
- Material: 48×48 dp (~9 mm), objetivos separados ≥8 dp; puntero ≥44 dp ([M3](https://m3.material.io/foundations/designing/structure)).
- **Regla GradeHub**: objetivo visual libre, **área táctil ≥44×44**; nunca bajo 24×24.

```css
.icon-btn{ inline-size:44px; block-size:44px; display:grid; place-items:center; }
/* Ícono pequeño con área táctil ampliada sin cambiar el layout */
.chip-cerrar{ position:relative; inline-size:20px; block-size:20px; }
.chip-cerrar::after{ content:""; position:absolute; inset:-12px; }   /* 44×44 efectivos */
```

## 4. Lectores de pantalla (VoiceOver, TalkBack, NVDA)
### Estructura
- Landmarks: `header` (banner), `nav`, `main` (uno), `footer`; regiones con nombre (`<section aria-labelledby>`); M3 lista los 8 roles landmark y pide etiquetar los repetidos ([M3](https://m3.material.io/foundations/designing/structure)).
- Un `h1` por vista, sin saltar niveles.
- Listas de ramos/evaluaciones como `<ul>`; tablas de notas/calculadora como `<table>` con `<th scope>` y `<caption>`.

### Texto pegado = lectura rota
Auditoría: "Así va tu semestre,Gonzalo", "2026-25 ramos", "2 aprobados2 en riesgo1 bajo 4,0", "Peso evaluado62 %". Visualmente a veces se separan con CSS (flex/gap), pero el árbol de accesibilidad concatena los nodos de texto sin espacio. Solución:
```html
<!-- Mal -->
<div class="kpi"><span class="label">Peso evaluado</span><span class="val">62 %</span></div>
<!-- Bien: separación semántica -->
<dl class="kpi"><dt>Peso evaluado</dt><dd class="num">62&nbsp;%</dd></dl>
<!-- o un espacio real en el DOM -->
<p class="kpi"><span class="label">Peso evaluado</span> <span class="val">62&nbsp;%</span></p>
```
Test automatizable: `element.textContent` de cada tarjeta no debe contener `/[a-záéíóúñ][0-9]|[0-9][A-ZÁÉÍÓÚ]/` (letra pegada a número o número pegado a mayúscula).

### Números y notas
- "5,4" lo leen bien los lectores en español; "5.4" en voz es-CL puede leerse "cinco punto cuatro" o como fecha. Formatear siempre con `Intl` es-CL (ver §11).
- Gráficos: texto alternativo con la conclusión ("Promedio subió de 4,8 a 5,4 en las últimas 3 evaluaciones"), no "gráfico de líneas". Ofrecer la tabla de datos.
- Iconos de estado (▼ ✓ ★) con `aria-hidden="true"` si el texto ya dice el estado; si no, `aria-label`.

### Mensajes de estado (4.1.3)
Deben poder anunciarse **sin recibir foco** ([WCAG 2.2](https://www.w3.org/TR/WCAG22/)). MDN: `aria-live="polite"` anuncia sin interrumpir; `assertive` interrumpe (solo urgencias); la región debe existir **vacía desde la carga** y luego actualizarse; `role="alert"` ya implica live ([MDN](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-live)).
```html
<div id="anuncios" class="sr-only" role="status" aria-live="polite"></div>
<script>
  const anunciar = msg => { const r = document.getElementById('anuncios'); r.textContent=''; requestAnimationFrame(()=> r.textContent = msg); };
  // anunciar('Nota guardada. Necesitas 4,6 en el examen para aprobar Cálculo I.');
</script>
```
```css
.sr-only{ position:absolute; inline-size:1px; block-size:1px; overflow:hidden; clip-path:inset(50%); white-space:nowrap; }
```

### Formularios
- `<label for>` real; errores con `aria-invalid="true"` + `aria-describedby` (auditoría: errores sin borde rojo ni `aria-invalid`).
- Mensajes del navegador en inglés ("Please fill out this field.", "No file chosen"): con `lang="es-CL"` en `<html>` y validación propia (`novalidate` + mensajes en español) se evitan; para `input type=file`, botón propio con texto "Elegir archivo".
- Diálogos con nombre accesible = título visible (no "Ventana").

## 5. Movimiento, tiempo y gestos
- 2.2.1 Timing adjustable: toasts con acción no expiran mientras tengan foco/hover; ofrecer más tiempo.
- 2.5.1 Pointer gestures / 2.5.7 Dragging: gestos multipunto o arrastre con alternativa de un toque. Apple: "si usas swipe para descartar, ofrece también un botón" ([Apple HIG](https://developer.apple.com/design/human-interface-guidelines/accessibility)).
- `prefers-reduced-motion` (ver §06).

## 6. Color y contraste
Ver `03-color-y-modo-oscuro.md`. Resumen: 4,5:1 texto, 3:1 UI/gráficos, nunca solo color; Apple pide revisar en claro y oscuro ([Apple HIG](https://developer.apple.com/design/human-interface-guidelines/accessibility)). APCA como guía extra; WCAG 3 aún no define algoritmo ([WCAG 3 WD](https://www.w3.org/TR/wcag-3.0/)).

## 7. Cognitiva (muy relevante en estudiantes estresados)
Apple: mantener acciones simples e intuitivas, preferir gestos conocidos, minimizar elementos con temporizador ([Apple HIG](https://developer.apple.com/design/human-interface-guidelines/accessibility)).
- Una tarea por pantalla en flujos largos (crear pauta).
- Lenguaje claro; explicar términos (PPA, consenso).
- No penalizar errores: deshacer en vez de diálogos.
- Evitar urgencia artificial (rojos, contadores) salvo riesgo real.

## 8. Reflow y zoom
- 1.4.10: sin pérdida de contenido ni scroll en dos dimensiones a 320 px de ancho (equivale a 1280 px al 400 %) ([WCAG 2.2](https://www.w3.org/TR/WCAG22/)). Excepción: tablas que requieren 2D (la tabla de 50–68 filas de la calculadora puede tener scroll propio horizontal, con primera columna fija).
- Apple: permitir agrandar texto al menos 200 % ([Apple HIG](https://developer.apple.com/design/human-interface-guidelines/accessibility)).

## 9. Pruebas
Automáticas (CI): axe-core/Playwright sobre las vistas principales en claro y oscuro; test de "texto pegado"; Lighthouse accesibilidad.
Manuales (cada release): solo teclado (Tab, Shift+Tab, Enter, Escape, flechas); VoiceOver iOS con la app Capacitor; TalkBack Android; zoom 200 % y 400 %; tamaño de texto del sistema al máximo; Aumentar contraste y Reducir transparencia ([Apple Dark Mode](https://developer.apple.com/design/human-interface-guidelines/dark-mode)); emulación de daltonismo.
Apple ofrece además las **Accessibility Nutrition Labels** en App Store Connect para declarar qué funciones soporta la app ([Apple HIG](https://developer.apple.com/design/human-interface-guidelines/accessibility)): conviene completarlas cuando GradeHub cumpla lo básico.

## 10. Checklist de accesibilidad
- [ ] `<html lang="es-CL">`.
- [ ] Cero `outline:none` sin reemplazo; anillo 2 px 3:1.
- [ ] Foco nunca tapado por tab bar/toast (scroll-padding).
- [ ] Objetivos ≥44×44 (mínimo absoluto 24×24).
- [ ] Alternativa sin arrastre para reordenar y sliders.
- [ ] Sin texto pegado en el árbol de accesibilidad.
- [ ] Errores con `aria-invalid` + `aria-describedby` + texto + ícono.
- [ ] Región `role=status` para guardados y recálculos.
- [ ] Diálogos con nombre = título; foco atrapado y devuelto.
- [ ] Gráficos con resumen textual y tabla alternativa.
- [ ] Reflow 320 px; zoom 200 %; texto del sistema al máximo.
- [ ] Autenticación sin prueba cognitiva obligatoria (pegar permitido, OAuth/enlace).
