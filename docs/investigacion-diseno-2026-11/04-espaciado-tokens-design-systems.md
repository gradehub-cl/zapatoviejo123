# 04 · Espaciado, grillas, design tokens y design systems

Fuentes abiertas: [spec.fm, The 8-Point Grid](https://spec.fm/specifics/8-pt-grid) · [Tailwind CSS v4.0](https://tailwindcss.com/blog/tailwindcss-v4) · [Material 3 Expressive](https://m3.material.io/blog/building-with-m3-expressive) · [Material 3, Structure / target sizes](https://m3.material.io/foundations/designing/structure) · [Apple, Liquid Glass](https://www.apple.com/newsroom/2025/06/apple-introduces-a-delightful-and-elegant-new-software-design/) · [Apple HIG Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility) · [Radix Colors scale](https://www.radix-ui.com/colors/docs/palette-composition/understanding-the-scale) · [shadcn/ui Theming](https://ui.shadcn.com/docs/theming) · [Vercel Geist](https://vercel.com/geist/introduction) · [Linear UI redesign](https://linear.app/now/how-we-redesigned-the-linear-ui) · [Evil Martians, OKLCH](https://evilmartians.com/chronicles/oklch-in-css-why-quit-rgb-hsl)

---

## 1. Grilla de 8 pt (con sub-grilla de 4)
spec.fm: "usa múltiplos de 8 para definir dimensiones, padding y margin de elementos de bloque y en línea"; cuando un bloque solo contiene texto (botones), fija el tamaño del texto y usa padding para dar el tamaño; el autor combina la grilla de 8 pt con una **grilla base de 4 pt** para el texto ([spec.fm](https://spec.fm/specifics/8-pt-grid)).

**Por qué importa en GradeHub**: hoy hay 31 paddings en px distintos (1, 3, 5, 7, 9, 11, 13, 15, 17 px…). Cada valor "casi igual" produce desalineaciones visibles y decisiones repetidas.

### Escala de espaciado propuesta
| Token | px | Uso típico |
|---|---|---|
| `--space-0-5` | 2 | Ajustes ópticos (iconos) |
| `--space-1` | 4 | Entre ícono y texto en un chip |
| `--space-2` | 8 | Entre elementos relacionados (nota y su etiqueta) |
| `--space-3` | 12 | Padding interno de chips/inputs compactos |
| `--space-4` | 16 | Padding de tarjeta en móvil; margen lateral de pantalla |
| `--space-5` | 20 | Margen lateral en pantallas ≥390 px (opcional) |
| `--space-6` | 24 | Entre grupos dentro de una sección |
| `--space-8` | 32 | Entre secciones |
| `--space-12` | 48 | Separación de bloques grandes / alto de fila táctil |
| `--space-16` | 64 | Aire alrededor del KPI héroe |

Tailwind v4 deriva **todo** el espaciado de una sola variable: `--spacing: 0.25rem` y `mt-8 = calc(var(--spacing) * 8)` ([Tailwind v4](https://tailwindcss.com/blog/tailwindcss-v4)). Es exactamente una grilla de 4 px: usar solo pasos pares (2, 4, 6, 8, 12, 16) para quedar en 8.

```css
@theme { --spacing: 0.25rem; }   /* p-2 = 8px, p-4 = 16px, gap-6 = 24px */
```

### Reglas de espaciado (proximidad)
- **Interno < externo**: el espacio dentro de un grupo siempre menor que entre grupos (Law of Proximity).
- Separar con **espacio** antes que con líneas; si hay línea, que sea `--border` sutil.
- Alto mínimo de fila táctil 44–48 px (Apple 44×44 pt por defecto; Material 48×48 dp, ~9 mm; separación entre objetivos ≥8 dp) ([Apple HIG](https://developer.apple.com/design/human-interface-guidelines/accessibility), [M3](https://m3.material.io/foundations/designing/structure)).
- Márgenes laterales consistentes: 16 px en móvil; contenido centrado con `max-width` en escritorio (p. ej. 720 px para listas, 1120 px para dashboards).

## 2. Grillas y layout
- **Móvil**: 4 columnas, margen 16, gutter 16. **Tablet**: 8 columnas. **Escritorio**: 12 columnas, máximo ~1120–1200 px.
- **Container queries** (en el core de Tailwind v4: `@container`, `@sm:`, `@max-md:`) ([Tailwind v4](https://tailwindcss.com/blog/tailwindcss-v4)): ideal para que la tarjeta de un ramo se reorganice según el ancho de su contenedor (lista en móvil, grilla en escritorio) sin media queries globales.

```html
<section class="@container">
  <article class="grid gap-3 @md:grid-cols-[1fr_auto] @md:items-center">
    <h3 class="text-title-3">Cálculo I</h3>
    <p class="text-display tabular-nums">5,4</p>
  </article>
</section>
```

- **Modales largos con pie fijo** (auditoría: botón final cortado o tapado):
```css
.modal{ display:grid; grid-template-rows:auto 1fr auto; max-block-size:min(90dvh, 720px); }
.modal__body{ overflow:auto; overscroll-behavior:contain; }
.modal__footer{ position:sticky; bottom:0; padding-block-end:max(16px, env(safe-area-inset-bottom)); }
```
- **Alto estable**: el modal de Ajustes salta de 723 a 603 px entre secciones (auditoría). Fijar `min-block-size` o usar `block-size` fijo con scroll interno para que los tabs no "salten".

### Capas (z-index) con escala
Hoy hay 18 valores de `z-index` distintos (hasta 1000). Escala cerrada:
```css
:root{ --z-base:0; --z-sticky:10; --z-dropdown:20; --z-tabbar:30; --z-overlay:40; --z-modal:50; --z-toast:60; --z-tooltip:70; }
```
Mejor aún: usar `<dialog>`/`popover` nativos, que van a la *top layer* y no necesitan `z-index`.

## 3. Design tokens
Un token es una decisión de diseño con nombre (color, tamaño, espacio, radio, sombra, duración, curva) almacenada en una fuente única que alimenta CSS, iOS y Android.

**Jerarquía recomendada**: primitivo → semántico → componente.
```css
/* primitivo */  --teal-9: oklch(0.52 0.092 180);
/* semántico */  --primary: var(--teal-9);
/* componente */ --button-primary-bg: var(--primary);
```

**Tipos de token que GradeHub necesita (y ya tiene algunos)**: color (§03), tipografía (§02), espacio, radio (`--radius:10px` existe), sombra/elevación (`--shadow`, `--shadow-lg` existen), motion (`--motion-fast:160ms`, `--ease-out` existen ✓), z-index, breakpoints, opacidades de estado.

**Gobernanza**: Stylelint con reglas que prohíben literales fuera del archivo de tokens (`color-no-hex`, `declaration-property-value-disallowed-list` para `font-size`, `z-index`, `padding` en px), como Evil Martians recomienda para colores ([Evil Martians](https://evilmartians.com/chronicles/oklch-in-css-why-quit-rgb-hsl)).

```json
{
  "rules": {
    "color-no-hex": true,
    "function-disallowed-list": ["rgb", "rgba", "hsl", "hsla"],
    "declaration-property-value-disallowed-list": {
      "font-size": ["/px$/", "/^[0-9.]+rem$/"],
      "z-index": ["/^[0-9]+$/"]
    }
  }
}
```
(Excepción: el propio archivo `tokens.css`, vía `overrides`.)

## 4. Design systems de referencia: qué tomar de cada uno

### Material 3 y M3 Expressive (Google, mayo 2025)
- M3 Expressive "no es M4"; es una evolución con 14 componentes nuevos o actualizados (button groups, FAB menu, loading indicator, split button, toolbars…), un **sistema de motion basado en resortes** (springs espaciales y de efectos), tipografía enfatizada para fuentes variables, 35 formas con *shape morph* y esquemas de color más vibrantes ([M3 Expressive](https://m3.material.io/blog/building-with-m3-expressive)).
- Base de investigación: 46 estudios, >18.000 participantes; en pantallas expresivas los participantes encontraron elementos clave **hasta 4 veces más rápido** ([M3 Expressive](https://m3.material.io/blog/building-with-m3-expressive)).
- Tácticas útiles para GradeHub: contener contenido para dar énfasis; usar contraste de color para el mensaje principal; tipografía enfatizada para la acción clave; **"momentos héroe": uno o dos por producto**, no más ([M3 Expressive](https://m3.material.io/blog/building-with-m3-expressive)). Candidatos: el momento "¡Aprobaste el ramo!" y el resumen de cierre de semestre.
- Target táctil 48×48 dp, separación 8 dp ([M3](https://m3.material.io/foundations/designing/structure)).

### Apple HIG y Liquid Glass (WWDC 2025)
- Liquid Glass es un material translúcido que refleja y refracta lo que hay detrás; los controles forman "una capa funcional distinta que se sitúa sobre las apps", concéntricos con las esquinas del hardware; en iOS 26 las tab bars **se encogen al hacer scroll** y se expanden al volver ([Apple Newsroom](https://www.apple.com/newsroom/2025/06/apple-introduces-a-delightful-and-elegant-new-software-design/)).
- Qué tomar: contenido primero, controles flotantes compactos, tab bar que se reduce en scroll. Qué **no** copiar a ciegas en web: el vidrio translúcido sobre contenido variable baja el contraste del texto; si se imita con `backdrop-filter`, respetar `prefers-reduced-transparency` y garantizar 4,5:1 sobre el peor fondo posible.
```css
.tabbar{ background: color-mix(in oklab, var(--surface) 72%, transparent);
         backdrop-filter: blur(20px) saturate(1.4); }
@media (prefers-reduced-transparency: reduce){
  .tabbar{ background: var(--surface); backdrop-filter: none; }
}
```
- Tamaños: control 44×44 pt por defecto (mínimo 28), padding ~12 pt alrededor de elementos con borde y ~24 pt sin borde; texto default 17 pt ([Apple HIG](https://developer.apple.com/design/human-interface-guidelines/accessibility)).

### Radix (Primitives + Colors)
- Radix Colors: escala de 12 pasos con rol por paso y contraste APCA garantizado en pasos de texto ([Radix](https://www.radix-ui.com/colors/docs/palette-composition/understanding-the-scale)). Úsala como plantilla para definir el teal y los grises de GradeHub.
- Radix Primitives (diálogos, popovers, menús, tabs) resuelven foco, `aria-*` y teclado: si GradeHub migra a React, son la base correcta; si sigue en vanilla, `<dialog>` + `popover` nativos.

### shadcn/ui
- No es una librería instalada sino componentes copiados al repo sobre Radix/Base UI + Tailwind; tematiza con variables CSS semánticas en pares (`primary`/`primary-foreground`), en `:root` y `.dark`, valores en `oklch()` ([shadcn](https://ui.shadcn.com/docs/theming)).
- Qué tomar: la **convención de nombres** de tokens (background, foreground, card, popover, muted, accent, destructive, border, input, ring) aunque no se use React.

### Tailwind v4 (enero 2025)
- Configuración **CSS-first** con `@theme`; todos los tokens expuestos como variables CSS; paleta en OKLCH/P3; `color-mix()`; container queries en core; variante `starting:` para `@starting-style` (animar entrada sin JS); utilidades `field-sizing` (textarea auto-ajustable), `color-scheme`, `inert`, `not-*` ([Tailwind v4](https://tailwindcss.com/blog/tailwindcss-v4)).
- Builds completos ~3,5–5× más rápidos e incrementales >100× ([Tailwind v4](https://tailwindcss.com/blog/tailwindcss-v4)).

### Vercel Geist y Linear
- Geist: design system de Vercel con escala de color "de alto contraste y accesible", componentes y familia tipográfica Sans/Mono/Serif ([Vercel Geist](https://vercel.com/geist/introduction)). Referente de densidad y sobriedad para dashboards.
- Linear: temas generados desde **3 variables** (base, acento, contraste) en LCH; el contraste es un parámetro que produce temas de alto contraste automáticamente ([Linear](https://linear.app/now/how-we-redesigned-the-linear-ui)). Lección para GradeHub: en vez de N acentos sueltos elegibles, un generador con pocas entradas y contraste garantizado.

## 5. Recomendación para GradeHub
GradeHub es vanilla JS + CSS (664 KB de CSS). No hace falta migrar de framework para tener un design system:
1. Crear `tokens.css` (primitivos + semánticos + dominio) siguiendo nombres tipo shadcn y escala de 12 pasos tipo Radix, en OKLCH.
2. Escala de tipo (§02), espacio (8/4), radios (`--radius-sm 6`, `--radius 10`, `--radius-lg 16`, `--radius-full`), sombras, motion y z-index.
3. Inventario de componentes (botón, input de nota, chip de estado, tarjeta de ramo, fila de evaluación, toast, diálogo, sheet, tabs, estado vacío, skeleton) con todos sus estados documentados en una página interna `/_estilos` (equivalente a Storybook sin dependencias).
4. Stylelint en CI para impedir regresiones.
5. Migración incremental: reemplazar literales por tokens archivo por archivo; medir con el mismo script de este informe (meta: ≤8 tamaños de fuente, 0 hex fuera de tokens, ≤8 `z-index`).

## 6. Antipatrones
- Valores "casi iguales" (13/14/15 px) que nadie decidió.
- Tokens con nombre de color en vez de rol (`--teal-text` en un botón de error).
- Un design system copiado (Material o iOS) sin adaptar: GradeHub corre en web, iOS y Android; mejor un sistema propio con convenciones de cada plataforma en navegación (tab bar abajo, atrás).
- `z-index: 9999` para "arreglar" un modal.
