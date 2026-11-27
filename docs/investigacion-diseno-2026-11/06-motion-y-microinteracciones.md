# 06 · Motion y microinteracciones

Fuentes abiertas: [NN/g, Animation duration](https://www.nngroup.com/articles/animation-duration/) · [Apple HIG Accessibility (Reduce Motion)](https://developer.apple.com/design/human-interface-guidelines/accessibility) · [MDN prefers-reduced-motion](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion) · [WCAG 2.2 (2.3.3 Animation from Interactions)](https://www.w3.org/TR/WCAG22/) · [Material 3 Expressive (motion springs)](https://m3.material.io/blog/building-with-m3-expressive) · [Tailwind v4 (`@starting-style`)](https://tailwindcss.com/blog/tailwindcss-v4) · [Chrome, View Transition API](https://developer.chrome.com/docs/web-platform/view-transitions) · [Nielsen, Response times](https://www.nngroup.com/articles/response-times-3-important-limits/) · [Laws of UX, Doherty](https://lawsofux.com/)

---

## 1. Para qué sirve el motion en GradeHub
1. **Feedback** (tocaste, se guardó, se borró).
2. **Continuidad espacial** (de la lista de ramos al detalle del ramo; del real al simulado).
3. **Dirigir la atención** (el "Necesitas X" cambia cuando ingresas una nota).
4. **Momentos héroe** (aprobar el ramo, cerrar el semestre). Material 3 Expressive aconseja **uno o dos** por producto ([M3 Expressive](https://m3.material.io/blog/building-with-m3-expressive)).

Nunca: decorar por decorar, retrasar una acción, o animar números de forma que no se puedan leer.

## 2. Duraciones
NN/g: la mayoría de las animaciones en **100–500 ms**; feedback simple (checkbox, toggle) ~**100 ms**; a **500 ms** "empiezan a sentirse como un lastre"; en general 100–400 ms, con 400 solo para movimientos grandes en pantallas grandes; "es mucho más común que las animaciones sean demasiado largas que demasiado cortas" ([NN/g](https://www.nngroup.com/articles/animation-duration/)).

GradeHub ya tiene tokens que encajan:
| Token actual | Valor | Uso recomendado |
|---|---|---|
| `--motion-press` | 120 ms | Estado presionado, toggles, checks |
| `--motion-fast` | 160 ms | Hover, aparición de errores inline, chips |
| `--motion-base` | 220 ms | Expandir/colapsar, toasts, sheets pequeños |
| `--motion-screen` | 320 ms | Transición entre pantallas |
| `--motion-navegar` | 480 ms | **Revisar**: está en la zona que NN/g considera lenta; bajar a ≤350 ms en móvil |

Curvas: salida con `ease-out` (entra rápido, frena), entrada a pantalla con desaceleración, salida de pantalla con aceleración (`ease-in`, más corta). GradeHub tiene `--ease-out: cubic-bezier(.22,1,.36,1)`, `--ease-standard`, `--ease-navegar`: bien, mantener 3–4 curvas como máximo.

### Resortes (springs)
M3 Expressive introduce un sistema de motion con **resortes espaciales** (posición, tamaño) y **resortes de efectos** (color, opacidad) ([M3 Expressive](https://m3.material.io/blog/building-with-m3-expressive)). En CSS se aproximan con `linear()`:
```css
:root{
  /* resorte suave aproximado (generado; afinar a gusto) */
  --ease-spring: linear(0, 0.009, 0.035 2.1%, 0.141, 0.281 6.7%, 0.723 12.9%, 0.938 16.7%, 1.017, 1.077 20.4%, 1.121, 1.149 24.3%, 1.159, 1.163 27%, 1.154 29.9%, 1.129 32.8%, 1.051 39.6%, 1.017 43.1%, 0.991, 0.977 51%, 0.975 57.1%, 0.997 69.8%, 1.003 76.9%, 1);
}
.sheet[open]{ transition: translate var(--motion-screen) var(--ease-spring); }
```
Usar rebote solo en elementos pequeños y celebratorios; nunca en contenido que hay que leer.

## 3. Microinteracciones clave de GradeHub
| Momento | Microinteracción | Duración |
|---|---|---|
| Tocar botón | Escala 0,97 + cambio de fondo | 120 ms |
| Ingresar nota válida | El borde pasa a neutro, aparece ✓ "Guardado" junto al campo y se desvanece a los 2 s (el texto queda accesible en `role=status`) | 160 ms |
| Recalcular promedio | *Crossfade* del número (no "rodillo" largo); con `tabular-nums` el ancho no salta | 160–220 ms |
| "Necesitas X" cambia | Pulso de fondo sutil una vez (no parpadeo) | 220 ms |
| Borrar evaluación | Fila colapsa en alto + toast Deshacer | 220 ms |
| Deshacer | Fila reaparece en su lugar | 220 ms |
| Abrir ramo | Transición compartida tarjeta → cabecera (View Transitions) | 280–320 ms |
| Aprobar ramo (momento héroe) | Confeti/check grande una sola vez + háptico en nativo (`@capacitor/haptics` ya está instalado) | ≤800 ms total, saltable |
| Arrastrar para reordenar | Alternativa con botones (WCAG 2.5.7) | — |

Háptica: usar `Haptics.impact({style:'light'})` solo en confirmaciones importantes (guardado de nota en nativo, aprobado), y nunca como único feedback (Apple pide pares visual+háptico+sonido según el caso ([Apple HIG](https://developer.apple.com/design/human-interface-guidelines/accessibility))).

## 4. Animar sin JS: `@starting-style` y `transition-behavior`
Tailwind v4 agrega la variante `starting:` para `@starting-style`, que permite "animar elementos al aparecer sin JavaScript" ([Tailwind v4](https://tailwindcss.com/blog/tailwindcss-v4)).
```css
.toast{ transition: opacity var(--motion-base) var(--ease-out), translate var(--motion-base) var(--ease-out), display var(--motion-base) allow-discrete; }
@starting-style{ .toast{ opacity:0; translate:0 12px; } }

dialog[open]{ opacity:1; scale:1; }
dialog{ opacity:0; scale:.98; transition: opacity .2s, scale .2s, overlay .2s allow-discrete, display .2s allow-discrete; }
@starting-style{ dialog[open]{ opacity:0; scale:.98; } }
```

## 5. View Transitions (navegación entre vistas)
La View Transition API anima el paso entre dos estados del DOM (misma página) o entre documentos ([Chrome Developers](https://developer.chrome.com/docs/web-platform/view-transitions)). Para la SPA de GradeHub:
```js
function navegar(render){
  if (!document.startViewTransition || matchMedia('(prefers-reduced-motion: reduce)').matches) return render();
  document.startViewTransition(render);
}
```
```css
.tarjeta-ramo[data-id="calc1"]{ view-transition-name: ramo-calc1; }
.cabecera-ramo{ view-transition-name: ramo-calc1; }
::view-transition-group(*){ animation-duration: var(--motion-screen); animation-timing-function: var(--ease-out); }
@media (prefers-reduced-motion: reduce){ ::view-transition-group(*){ animation: none; } }
```
Nombres únicos por elemento en pantalla; no poner `view-transition-name` a decenas de nodos.

## 6. `prefers-reduced-motion`: reducir, no eliminar todo
WCAG 2.3.3 (AAA): "la animación de movimiento disparada por interacción puede desactivarse, salvo que sea esencial" ([WCAG 2.2](https://www.w3.org/TR/WCAG22/)). Apple, con Reduce Motion activo, pide reducir animaciones automáticas y repetitivas (zoom, escala, movimiento periférico), **apretar los resortes para reducir rebote**, seguir los gestos directamente, evitar animar cambios de profundidad, **reemplazar desplazamientos en x/y/z por fundidos** y evitar animar desenfoques ([Apple HIG](https://developer.apple.com/design/human-interface-guidelines/accessibility)). `prefers-reduced-motion` está disponible en todos los navegadores desde enero de 2020 ([MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion)).

```css
@media (prefers-reduced-motion: reduce){
  :root{ --motion-screen: 1ms; --motion-navegar: 1ms; --ease-spring: ease-out; }
  .sheet, .toast, dialog{ translate: none !important; }      /* movimiento → fundido */
  .skeleton, .confeti{ animation: none; }
  *{ scroll-behavior: auto !important; }
}
```
Mantener: cambios de color/opacidad cortos (no provocan malestar vestibular) y feedback de estado. GradeHub ya usa `prefers-reduced-motion` en 55 reglas: auditar que el confeti, el contador animado y la navegación (480 ms) estén cubiertos.

## 7. Rendimiento de las animaciones
- Animar solo `transform`/`translate`/`scale`/`opacity` (compositor); evitar `height`, `top`, `box-shadow` animados en listas largas. Para colapsar filas, `interpolate-size: allow-keywords` o `grid-template-rows: 0fr → 1fr`.
- Cualquier animación disparada por un toque debe pintar su primer frame en <100 ms (Nielsen: 0,1 s = instantáneo ([NN/g](https://www.nngroup.com/articles/response-times-3-important-limits/))) y mantener INP ≤200 ms (ver §08).
- No bloquear la interacción mientras anima (el usuario puede tocar el siguiente campo).

## 8. Antipatrones de motion
- Navegación de 480 ms o más en móvil.
- Números que "ruedan" 1 s antes de mostrar el promedio real.
- Rebote en modales con texto.
- Spinner como decoración permanente.
- Animación que corre aunque el usuario pidió reducir movimiento.
- Toast que entra deslizando sobre la tab bar.

## 9. Checklist
- [ ] Todas las duraciones salen de tokens; ninguna >400 ms salvo momento héroe.
- [ ] Reduce motion cambia movimiento por fundidos y quita bucles.
- [ ] Contadores animados con `tabular-nums` y valor final accesible inmediato.
- [ ] View Transitions con fallback.
- [ ] Momento héroe saltable y que no se repite en cada visita.
