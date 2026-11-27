# 03 · Color, contraste y modo oscuro

Fuentes abiertas: [Evil Martians, OKLCH in CSS](https://evilmartians.com/chronicles/oklch-in-css-why-quit-rgb-hsl) · [Tailwind v4 (paleta OKLCH, color-mix)](https://tailwindcss.com/blog/tailwindcss-v4) · [WCAG 2.2](https://www.w3.org/TR/WCAG22/) · [APCA in a Nutshell](https://git.apcacontrast.com/documentation/APCA_in_a_Nutshell.html) · [ReadTech, Bronze Simple Mode](https://www.readtech.org/ARC/tests/bronze-simple-mode/) · [WCAG 3.0 Working Draft (10-sep-2026)](https://www.w3.org/TR/wcag-3.0/) · [Radix Colors, la escala de 12 pasos](https://www.radix-ui.com/colors/docs/palette-composition/understanding-the-scale) · [shadcn/ui Theming](https://ui.shadcn.com/docs/theming) · [Apple HIG Dark Mode](https://developer.apple.com/design/human-interface-guidelines/dark-mode) · [Apple HIG Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility) · [Linear, rediseño de UI (LCH)](https://linear.app/now/how-we-redesigned-the-linear-ui) · [MDN light-dark()](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/color_value/light-dark) · [Few, Bullet Graph Spec](https://www.perceptualedge.com/articles/misc/Bullet_Graph_Design_Spec.pdf) · [NN/g, Dashboards y atención preatentiva](https://www.nngroup.com/articles/dashboards-preattentive/)

---

## 1. Tres capas de tokens de color
1. **Primitivos** (paleta): `--teal-1 … --teal-12`, `--gray-1 … --gray-12`, `--red-*`, `--amber-*`. No se usan directo en componentes.
2. **Semánticos** (rol): `--bg`, `--surface`, `--surface-raised`, `--fg`, `--fg-muted`, `--border`, `--border-strong`, `--primary`, `--primary-fg`, `--danger`, `--warning`, `--success`, `--focus-ring`.
3. **De dominio** (GradeHub): `--nota-reprobada`, `--nota-limite`, `--nota-aprobada`, `--nota-destacada`, `--riesgo-alto`…

shadcn/ui lo formaliza en pares superficie/primer plano: `primary` se empareja con `primary-foreground`; los tokens viven en `:root` y `.dark` y Tailwind los mapea a `bg-background`, `text-foreground`, `border-border`, `ring-ring` ([shadcn](https://ui.shadcn.com/docs/theming)). Evil Martians: "para un tema oscuro o de alto contraste no necesitas `@media` en los componentes, solo cambias las custom properties de la paleta" ([Evil Martians](https://evilmartians.com/chronicles/oklch-in-css-why-quit-rgb-hsl)).

**Regla de oro**: los componentes solo conocen tokens semánticos/de dominio. Hoy GradeHub tiene 78 hex distintos en CSS: la meta es que fuera del archivo de tokens haya cero.

## 2. La escala de 12 pasos (Radix) como modelo de paleta
Radix asigna un rol a cada paso ([Radix](https://www.radix-ui.com/colors/docs/palette-composition/understanding-the-scale)):

| Paso | Rol |
|---|---|
| 1–2 | Fondos de app y fondos sutiles (tarjetas, sidebar) |
| 3–5 | Fondos de componente: normal, hover, activo/seleccionado |
| 6 | Bordes sutiles no interactivos (tarjetas, separadores) |
| 7 | Bordes de componentes interactivos |
| 8 | Bordes fuertes y anillos de foco |
| 9 | Fondo sólido (el paso más puro/croma más alta): botón primario |
| 10 | Hover del fondo sólido |
| 11 | Texto de bajo contraste |
| 12 | Texto de alto contraste |

Radix garantiza que los pasos 11 y 12 dan **Lc 60 y Lc 90 APCA** sobre el paso 2 de la misma escala. Es una plantilla excelente para que GradeHub defina su teal y sus grises en claro y oscuro.

## 3. OKLCH: por qué y cómo
`oklch(L C H / a)`: L = luminosidad percibida (0–1), C = croma, H = tono (0–360) ([Evil Martians](https://evilmartians.com/chronicles/oklch-in-css-why-quit-rgb-hsl)). Ventajas:
- **Luminosidad predecible**: en HSL "agregar 10 % de luz da resultados distintos en azul y morado"; en OKLCH no, lo que hace los contrastes previsibles.
- **Paletas generables** por fórmula; **P3** (colores más vivos en pantallas Apple/OLED); **legible** al leer el código.
- Soportado en todos los navegadores actuales y con **colores relativos** (`oklch(from var(--x) calc(l - .1) c h)`).
- Tailwind v4 migró toda su paleta de `rgb` a `oklch` y usa `color-mix(in oklab, …)` para opacidades ([Tailwind](https://tailwindcss.com/blog/tailwindcss-v4)).
- Linear reconstruyó su generador de temas en LCH, y redujo 98 variables por tema a **3 entradas: color base, acento y contraste**, generando temas de alto contraste automáticos ([Linear](https://linear.app/now/how-we-redesigned-the-linear-ui)).

Advertencia de Evil Martians: OKLCH da luminosidad, no contraste; **para contraste hay que medir (APCA/WCAG)**. Y no todas las combinaciones L-C-H existen en sRGB: verificar con [oklch.com](https://oklch.com/).

### Ejemplo: tokens de GradeHub en OKLCH (aprox. al teal actual `#0d7a6b`)
```css
:root{
  color-scheme: light dark;
  /* primitivos (valores a afinar con oklch.com y verificar contraste) */
  --teal-9:  oklch(0.52 0.092 180);  /* = #0d7a6b actual (convertido) */
  --teal-10: oklch(0.48 0.10 180);
  --teal-11: oklch(0.45 0.09 180);
  --gray-1:  oklch(0.99 0 0);
  --gray-2:  oklch(0.975 0.002 286);
  --gray-6:  oklch(0.90 0.004 286);
  --gray-8:  oklch(0.63 0.013 286);  /* ≈ #8a8a93: 3,42:1 sobre blanco, borde de input válido */
  --gray-11: oklch(0.50 0.01 286);
  --gray-12: oklch(0.21 0.006 286);

  /* semánticos */
  --bg: var(--gray-1);
  --surface: oklch(1 0 0);
  --fg: var(--gray-12);
  --fg-muted: var(--gray-11);
  --border: var(--gray-6);
  --border-control: var(--gray-8);
  --primary: var(--teal-9);
  --primary-hover: oklch(from var(--primary) calc(l - 0.05) c h);
  --primary-fg: oklch(1 0 0);
  --focus-ring: oklch(from var(--primary) l c h / .55);
}
```

### Con `light-dark()` (un solo bloque para ambos temas)
`light-dark()` devuelve uno de dos colores según el `color-scheme` activo, sin media query; Baseline desde mayo 2024 ([MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/color_value/light-dark)).
```css
:root{ color-scheme: light dark; }
:root[data-theme="light"]{ color-scheme: light; }
:root[data-theme="dark"]{  color-scheme: dark; }
:root{
  --bg:      light-dark(oklch(0.985 0.002 286), oklch(0.16 0.004 286));
  --surface: light-dark(oklch(1 0 0),          oklch(0.205 0.005 286));
  --surface-raised: light-dark(oklch(1 0 0),   oklch(0.25 0.006 286));
  --fg:      light-dark(oklch(0.21 0.006 286), oklch(0.96 0.003 286));
  --border:  light-dark(oklch(0.90 0.004 286), oklch(0.32 0.006 286));
}
```

## 4. Contraste: WCAG 2.2 (norma) + APCA (guía de diseño)
### WCAG 2.2 AA (lo exigible hoy)
- **1.4.3 Contraste mínimo**: texto ≥ **4,5:1**; texto grande ≥ **3:1** ([WCAG 2.2](https://www.w3.org/TR/WCAG22/)).
- **1.4.11 Contraste no textual**: componentes de UI y sus estados, y partes de gráficos necesarias para entenderlos, ≥ **3:1** contra colores adyacentes ([WCAG 2.2](https://www.w3.org/TR/WCAG22/)). Aplica a bordes de inputs, anillos de foco, barras de progreso, líneas de gráficos.
- **1.4.1 Uso del color**: el color no puede ser la única vía de transmitir información.
- Apple usa estos mismos valores AA en Accessibility Inspector y pide verificar contraste en claro **y** oscuro; para colores propios, apuntar a 7:1 en texto pequeño ([Apple Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility), [Apple Dark Mode](https://developer.apple.com/design/human-interface-guidelines/dark-mode)).

### APCA
- Mide "contraste de luminosidad" (Lc), depende de la polaridad (texto oscuro sobre claro ≠ claro sobre oscuro) y del tamaño/peso. Niveles Bronze Simple Mode: **Lc 90 preferido / Lc 75 mínimo** para cuerpo de texto, **Lc 60** para otro texto de contenido, **Lc 45** para texto grande (>36 px), Lc 30 mínimo para cualquier texto, Lc 15 umbral de invisibilidad ([APCA](https://git.apcacontrast.com/documentation/APCA_in_a_Nutshell.html), [ReadTech](https://www.readtech.org/ARC/tests/bronze-simple-mode/)).
- **Estado normativo**: WCAG 3 sigue siendo borrador (Working Draft del 10-sep-2026) y dice textualmente que "el algoritmo de contraste usado en WCAG 3 está por determinarse" ([WCAG 3.0 WD](https://www.w3.org/TR/wcag-3.0/)). APCA **no** sirve para declarar cumplimiento.
- **Recomendación**: cumplir WCAG 2.2 AA siempre (es lo exigible) y usar APCA como criterio adicional en modo oscuro, donde WCAG 2 tiende a sobreestimar el contraste de texto claro sobre fondo oscuro.

### Lo que hoy falla en GradeHub (medido)
| Par | Ratio | Criterio | Acción |
|---|---|---|---|
| `--border2 #b8b8be` / blanco | 1,97:1 | 1.4.11 si delimita un input | Borde de control ≥3:1 (`#8a8a93` da 3,42:1) o fondo de input distinto + borde |
| `--card #111113` / `--bg #080809` (oscuro) | 1,06:1 | (jerarquía, no norma) | Hoy `--bg` es L 0,135 y `--card` L 0,179 en OKLCH; separar más: L≈0,16 → 0,205 → 0,25 |
| `--border #27272c` / `--card` (oscuro) | 1,27:1 | 1.4.11 si es necesario para entender | Subir a L≈0,32–0,36 o usar espacio en vez de líneas |

## 5. La escala de color de notas (dominio)
Hallazgo de la auditoría: el mismo 4,8 aparece teal, oliva o amarillo según pantalla y modo. Solución: **una sola función → un solo set de tokens**.

### Diseño de la escala
- Rangos (ajustables por universidad): `< 4,0` reprobada · `4,0–4,4` en el límite · `4,5–5,9` aprobada · `≥ 6,0` destacada.
- Few, para rangos cualitativos, recomienda **intensidades de un solo tono** (oscuro = peor) en vez de tonos distintos, porque los tonos se confunden con daltonismo, y como máximo 3–5 rangos ([Few, Bullet Graph](https://www.perceptualedge.com/articles/misc/Bullet_Graph_Design_Spec.pdf)). NN/g recuerda que ~8 % de los hombres y ~0,5 % de las mujeres tienen alguna forma de daltonismo ([NN/g](https://www.nngroup.com/articles/dashboards-preattentive/)).
- Compromiso práctico para GradeHub: **tono semántico + forma/texto redundante**. Rojo solo para "reprobada", ámbar para "en el límite", neutro/teal para "aprobada", y un acento para "destacada". Siempre acompañado de ícono o palabra ("Bajo 4,0", "Justo", "Aprobado").

```css
:root{
  --nota-reprobada:  light-dark(oklch(0.52 0.19 25),  oklch(0.72 0.17 20));
  --nota-limite:     light-dark(oklch(0.55 0.12 70),  oklch(0.83 0.14 85));
  --nota-aprobada:   light-dark(oklch(0.45 0.09 180), oklch(0.80 0.12 180));
  --nota-destacada:  light-dark(oklch(0.48 0.13 160), oklch(0.82 0.15 155));
}
```
```js
// Única fuente de verdad: devuelve token + etiqueta + ícono
export function estadoNota(n, {aprobacion = 4.0} = {}) {
  if (n == null) return {token:'--fg-muted', label:'Sin nota', icon:'—'};
  if (n < aprobacion) return {token:'--nota-reprobada', label:'Bajo 4,0', icon:'▼'};
  if (n < aprobacion + 0.5) return {token:'--nota-limite', label:'Justo', icon:'●'};
  if (n < 6.0) return {token:'--nota-aprobada', label:'Aprobado', icon:'✓'};
  return {token:'--nota-destacada', label:'Destacado', icon:'★'};
}
```

> **Verificación de los valores propuestos (calculada):** los cuatro tokens de nota dan en claro, sobre blanco, 6,08 / 4,98 / 7,0 / 5,97:1 y en oscuro, sobre `--surface` L 0,205, 6,69 / 10,53 / 10,1 / 10,88:1: todos pasan AA para texto. `--fg-muted` (L 0,50) da 6,01:1 sobre blanco. Ojo: entre superficies oscuras el *ratio* WCAG es casi siempre ~1,1 (0,16 vs 0,205 da 1,08; 0,205 vs 0,25 da 1,12), así que el ratio no sirve para juzgar elevación: usa la diferencia de L OKLCH (≥0,045) **más** un borde fino o un cambio de sombra. El borde oscuro propuesto (L 0,32) da 1,41:1: sirve como separador decorativo, pero el borde de un **input** en oscuro necesita L≈0,55 o más para llegar a 3:1.

Validar cada token: texto ≥4,5:1 sobre `--surface` en claro **y** oscuro; si el color se usa como relleno con texto encima, medir el texto sobre el relleno.

## 6. Modo oscuro bien hecho
Apple: la paleta oscura usa "fondos más tenues y primeros planos más brillantes", y "no son necesariamente inversiones" de los claros; usar colores semánticos que se adaptan y evitar valores hardcodeados; en iOS hay dos niveles de fondo, **base** (más tenue, retrocede) y **elevated** (más claro, avanza) para modales y popovers ([Apple Dark Mode](https://developer.apple.com/design/human-interface-guidelines/dark-mode)).

Reglas:
1. **Elevación = más claro**, no sombra (las sombras casi no se ven en negro). Tres superficies con saltos de luminosidad perceptibles: `bg` L≈0,16, `surface` L≈0,205, `raised` L≈0,25.
2. **No negro puro** de fondo ni blanco puro de texto en bloques largos (halo/fatiga). `fg` ≈ L 0,96.
3. **Desaturar y aclarar** los colores de estado: el rojo `#c02b3f` del modo claro se ve sucio en oscuro; usar su versión de L mayor y C menor.
4. **Gráficos**: recalcular colores de series, rejillas y etiquetas para oscuro (la auditoría: "gráficos ilegibles").
5. **Imágenes con fondo blanco**: oscurecerlas levemente (Apple lo recomienda) o ponerlas en una tarjeta.
6. **Respetar la preferencia del sistema**. Apple desaconseja un selector propio de apariencia porque obliga a ajustar dos lugares ([Apple](https://developer.apple.com/design/human-interface-guidelines/dark-mode)). En la web es común ofrecer "Sistema / Claro / Oscuro" con **Sistema por defecto**; GradeHub puede mantenerlo, pero el default debe ser Sistema.
7. **Sin flash**: aplicar el tema antes del primer pintado (script inline en `<head>`), y `<meta name="color-scheme" content="light dark">` + `meta theme-color` por esquema para la barra del navegador/PWA.
8. **Scrollbars e inputs nativos**: `color-scheme: dark` los oscurece (Tailwind v4 trae utilidades `color-scheme` para eso ([Tailwind](https://tailwindcss.com/blog/tailwindcss-v4))).
9. **Probar con Aumentar contraste y Reducir transparencia** del sistema, por separado y juntos ([Apple](https://developer.apple.com/design/human-interface-guidelines/dark-mode)); en web: `@media (prefers-contrast: more)`.

```html
<meta name="color-scheme" content="light dark">
<meta name="theme-color" media="(prefers-color-scheme: light)" content="#ffffff">
<meta name="theme-color" media="(prefers-color-scheme: dark)"  content="#141416">
<script>/* antes de cualquier CSS */
  try{const t=localStorage.getItem('tema'); if(t&&t!=='sistema') document.documentElement.dataset.theme=t;}catch{}
</script>
```
```css
@media (prefers-contrast: more){
  :root{ --border: var(--border-control); --fg-muted: var(--fg); }
}
@media (forced-colors: active){
  .chip-estado{ border: 1px solid CanvasText; }   /* el color desaparece: que quede la forma */
}
```

## 7. Usar el color con intención
- Color = **significado** (estado, acción, selección). La decoración va en gris.
- Un acento primario. Hoy "Índigo" y "Azul" como acentos elegibles son casi iguales (auditoría): reducir opciones a tonos distinguibles.
- Nunca solo color: Apple pide "transmitir información con más que color", con formas o íconos ([Apple](https://developer.apple.com/design/human-interface-guidelines/accessibility)). En el historial, "Aprobado/Reprobado" debe estar escrito, no solo pintado.
- Fondos tintados para estado (ej. `--red-bg`) con texto en el color de estado oscuro, verificado ≥4,5:1 (hoy `#c02b3f` sobre `#fdecef` = 5,03:1 ✓; `#a16207` sobre `#fdf9e7` = 4,66:1 ✓ justo).

## 8. Antipatrones de color
- Hex sueltos en componentes; colores que cambian por pantalla.
- Modo oscuro = invertir o "pintar" con superficies a 1,06:1.
- Verde/rojo como única diferencia (daltonismo).
- Bordes de input a <3:1.
- Gradientes decorativos detrás de números (bajan contraste).
- Opacidad para "deshabilitar" texto informativo.

## 9. Checklist de color
- [ ] Tres capas de tokens; cero hex fuera del archivo de tokens (lint `color-no-hex` de Stylelint, como sugiere Evil Martians).
- [ ] Todos los pares texto/fondo ≥4,5:1 en claro y oscuro; bordes de control y foco ≥3:1.
- [ ] Escala de notas centralizada (`estadoNota`) y con redundancia texto/ícono.
- [ ] Superficies oscuras con saltos de L OKLCH de ~0,045 o más **y** borde fino/sombra que las separe (hoy bg→card es 0,044 sin borde visible: se pierden), verificadas a ojo en pantalla real.
- [ ] Probado con `prefers-contrast: more`, `forced-colors` y simulador de daltonismo (DevTools → Rendering → Emulate vision deficiencies).
