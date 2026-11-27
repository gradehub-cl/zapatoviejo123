# 02 · Tipografía

Fuentes abiertas: [MDN font-variant-numeric](https://developer.mozilla.org/en-US/docs/Web/CSS/font-variant-numeric) · [Inter (rsms.me)](https://rsms.me/inter/) · [Utopia, fluid type calculator](https://utopia.fyi/type/calculator/) · [Apple HIG Accessibility (tamaños)](https://developer.apple.com/design/human-interface-guidelines/accessibility) · [Material 3 Expressive](https://m3.material.io/blog/building-with-m3-expressive) · [Vercel Geist font](https://vercel.com/font) · [MDN text-wrap](https://developer.mozilla.org/en-US/docs/Web/CSS/text-wrap) · [Apple, Liquid Glass (SF numerals)](https://www.apple.com/newsroom/2025/06/apple-introduces-a-delightful-and-elegant-new-software-design/)

---

## 1. Estado actual (medido)
El CSS de GradeHub usa **91 tamaños de fuente distintos**, mezclando `px`, `rem` y valores como `0.71875rem` (11,5 px). Los más usados: `.8125rem` (13 px, 208 veces), `.875rem` (14 px), `.75rem` (12 px), `.6875rem` (11 px, 133 veces entre variantes). La familia es la pila del sistema (`-apple-system, BlinkMacSystemFont, 'Segoe UI'…`), lo cual es una buena decisión de rendimiento.

Problemas: sin escala no hay jerarquía predecible; 11 px es el **mínimo absoluto** de Apple en iOS (default 17 pt) ([Apple HIG](https://developer.apple.com/design/human-interface-guidelines/accessibility)), y abusar de él daña legibilidad.

## 2. Escala tipográfica: pocos pasos, con nombre
Una escala es un conjunto cerrado de tamaños con nombres de rol. Recomendación para GradeHub (base 16 px, razón ~1,2 en UI; los números héroe salen de la escala):

| Token | Tamaño | Line-height | Uso |
|---|---|---|---|
| `--text-caption` | 12 px / .75rem | 16 px | Metadatos, fechas, leyendas de gráficos (nunca texto que haya que leer para decidir) |
| `--text-footnote` | 13 px / .8125rem | 18 px | Texto secundario en filas densas |
| `--text-body` | 16 px / 1rem | 24 px | Cuerpo, inputs (16 px evita el zoom automático de iOS Safari al enfocar un input) |
| `--text-callout` | 15 px / .9375rem | 20 px | Filas de lista |
| `--text-title-3` | 18 px | 24 px | Título de tarjeta |
| `--text-title-2` | 22 px | 28 px | Título de sección |
| `--text-title-1` | 28 px | 34 px | Título de pantalla |
| `--text-display` | 48–56 px | 1,0 | KPI héroe (promedio) |

Regla: **máximo 7–8 tamaños**. Cualquier tamaño nuevo requiere justificar por qué no sirve uno existente.

### Escala fluida (opcional, web ancha)
Utopia genera pasos con `clamp()` que interpolan entre un viewport mínimo y uno máximo ([Utopia](https://utopia.fyi/type/calculator/)). Ejemplo generado por la herramienta (360→1240 px, 18→20 px, razones 1,2→1,25):

```css
:root{
  --step--1: clamp(0.9375rem, 0.9119rem + 0.1136vw, 1rem);
  --step-0:  clamp(1.125rem, 1.0739rem + 0.2273vw, 1.25rem);
  --step-1:  clamp(1.35rem, 1.2631rem + 0.3864vw, 1.5625rem);
  --step-2:  clamp(1.62rem, 1.4837rem + 0.6057vw, 1.9531rem);
}
```
Para una app de datos (no editorial) basta con escala fija en móvil y uno o dos saltos en escritorio; la escala fluida rinde más en la landing.

### Tailwind v4: escala como tokens CSS
En Tailwind v4 la configuración vive en CSS con `@theme` y todos los tokens quedan como variables CSS ([Tailwind v4](https://tailwindcss.com/blog/tailwindcss-v4)):

```css
@import "tailwindcss";
@theme {
  --font-sans: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  --text-caption: 0.75rem;   --text-caption--line-height: 1rem;
  --text-body: 1rem;         --text-body--line-height: 1.5rem;
  --text-title-1: 1.75rem;   --text-title-1--line-height: 2.125rem;
  --text-display: 3.5rem;    --text-display--line-height: 1;
}
/* uso: <p class="text-body">, <span class="text-display tabular-nums"> */
```

## 3. Números: el contenido principal de GradeHub
Una app de notas es, tipográficamente, una app de **números**. Reglas:

### 3.1 Cifras tabulares donde se comparan valores
`font-variant-numeric: tabular-nums` activa cifras de ancho fijo (OpenType `tnum`), "permitiendo alinearlas fácilmente como en tablas" ([MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/font-variant-numeric)). Inter lo documenta para "datos tabulares, donde se desea comparar columnas entre filas" ([Inter](https://rsms.me/inter/)).

- **Usar `tabular-nums`**: columnas de notas, tablas de calculadora puntaje→nota, contadores que cambian en vivo (evita que el número "baile" al pasar de 4,1 a 4,8), porcentajes de ponderación.
- **Usar proporcionales** en el número héroe aislado (se ve mejor ópticamente) **salvo** que se anime.
- `lining-nums` (cifras alineadas a la línea base) en toda la UI; nunca cifras de estilo antiguo (`oldstyle-nums`) en datos.
- `slashed-zero` solo si hay confusión O/0 (códigos de ramo tipo `MAT1004`).

```css
.num, td.nota, .kpi-valor, [data-num] { font-variant-numeric: tabular-nums lining-nums; }
.codigo-ramo { font-variant-numeric: slashed-zero; letter-spacing: .02em; }
```

### 3.2 Alineación
- En tablas, números **alineados a la derecha** (o al separador decimal) para comparar magnitudes; texto a la izquierda.
- Como todas las notas tienen formato `d,d`, `tabular-nums` + alinear a la derecha deja las comas en columna.

### 3.3 El número héroe
- Tamaño display (48–56 px), peso 600–700, tracking levemente negativo (`letter-spacing: -0.02em`) a tamaños grandes.
- Unidad/etiqueta en tamaño menor y color secundario, **con espacio**: `5,4` + `promedio ponderado` debajo, no "PROMEDIO5,4".
- Apple rediseñó los numerales de SF para Liquid Glass escalando peso, ancho y alto ([Apple Newsroom](https://www.apple.com/newsroom/2025/06/apple-introduces-a-delightful-and-elegant-new-software-design/)): los números grandes son un elemento de identidad, no solo un dato.

## 4. Familias: sistema vs. fuente propia vs. variable
| Opción | Pros | Contras |
|---|---|---|
| Pila del sistema (actual) | 0 KB, nativa en iOS/Android, soporta Dynamic Type vía `font: -apple-system-body` | Aspecto distinto entre plataformas |
| **Inter** (variable, OFL) | Ejes `wght` 100–900 y `opsz` 14–32; `tnum`, `zero`, `frac`; muy probada en UI ([Inter](https://rsms.me/inter/)) | ~100–300 KB si no se subsetea |
| **Geist** (Vercel, OFL) | Sans + Mono; pensada para desarrolladores/datos ([Vercel](https://vercel.com/font)) | Versión de Google Fonts sin set completo de `font-feature-settings` (lo advierte Vercel) |

**Recomendación**: mantener la pila del sistema (cero costo de LCP, sensación nativa dentro de Capacitor). Si se quiere identidad propia, usar **Inter variable subseteada a latín** con `font-display: swap` y `size-adjust` para evitar saltos de layout (CLS):

```css
@font-face{
  font-family: "InterVar";
  src: url("/fonts/InterVariable-latin.woff2") format("woff2");
  font-weight: 100 900; font-display: swap;
  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+2000-206F, U+20AC, U+2122;
}
:root{ font-family: InterVar, system-ui, -apple-system, "Segoe UI", sans-serif;
       font-feature-settings: "cv11" 1; /* a de un piso opcional en Inter */ }
```

Fuentes variables: un archivo con todos los pesos; permiten pesos intermedios (550) para afinar jerarquía, y M3 Expressive introduce "estilos de texto enfatizados" pensados para fuentes variables ([M3 Expressive](https://m3.material.io/blog/building-with-m3-expressive)).

## 5. Legibilidad
- **Tamaño mínimo de lectura**: 16 px cuerpo; 13 px metadatos; 11–12 px solo para leyendas que no se necesitan para decidir. Apple: default iOS 17 pt, mínimo 11 pt; con pesos finos, subir tamaño ([Apple HIG](https://developer.apple.com/design/human-interface-guidelines/accessibility)).
- **Peso**: evitar 300 o menos bajo 20 px, sobre todo en modo oscuro.
- **Line-height**: 1,4–1,6 en párrafos; 1,1–1,25 en títulos; 1,0 en números héroe.
- **Largo de línea**: 45–75 caracteres en texto corrido (`max-width: 65ch`). Material sugiere 40–60 caracteres en snackbars de pantallas anchas ([M3 Snackbar](https://m3.material.io/components/snackbar/guidelines)).
- **Zoom 200 %**: Apple pide permitir agrandar texto al menos 200 % ([Apple HIG](https://developer.apple.com/design/human-interface-guidelines/accessibility)); WCAG 1.4.4/1.4.10 exige que no se rompa nada hasta 400 % / 320 px de ancho ([WCAG 2.2](https://www.w3.org/TR/WCAG22/)). Usar `rem`, no `px`, para tipografía.
- **Cortes de línea**: `text-wrap: balance` en títulos y `text-wrap: pretty` en párrafos evitan viudas y líneas desparejas ([MDN text-wrap](https://developer.mozilla.org/en-US/docs/Web/CSS/text-wrap)).

```css
h1,h2,h3,.titulo-tarjeta{ text-wrap: balance; }
p,.ayuda{ text-wrap: pretty; max-width: 65ch; }
```

- **MAYÚSCULAS**: solo en etiquetas muy cortas, con `letter-spacing: .04–.06em` y 11–12 px peso 600. Y siempre con un espacio real o un salto de bloque antes del valor (ver bug "Peso evaluado62 %").

## 6. Dynamic Type / tamaño de texto del sistema (Capacitor)
En iOS dentro de WKWebView, usar la fuente del sistema con estilos de texto para heredar el tamaño elegido por el usuario:

```css
@supports (font: -apple-system-body){
  html{ font: -apple-system-body; }   /* hereda Dynamic Type en WebKit */
}
```
Luego todos los tamaños en `rem` escalan. Probar con el tamaño de texto del sistema al máximo: las filas deben crecer en alto, no truncar notas.

## 7. Antipatrones tipográficos
- 91 tamaños distintos; px y rem mezclados.
- Número que cambia de ancho al animarse (falta `tabular-nums`).
- Texto gris claro de 11 px como única explicación de un cálculo.
- Etiquetas pegadas al valor sin espacio en el DOM (los lectores de pantalla leen "Peso evaluado62 por ciento").
- `font-weight: 300` en modo oscuro sobre fondo casi negro.
- Inputs con `font-size < 16px` en iOS (zoom al enfocar).

## 8. Checklist de tipografía
- [ ] Escala de ≤8 tokens con nombre; lint que prohíba `font-size` literal fuera de tokens.
- [ ] `tabular-nums` en toda cifra comparable o animada.
- [ ] Inputs a 16 px.
- [ ] Sin texto informativo bajo 12 px.
- [ ] Zoom 200 % y ancho 320 px sin cortes ni scroll horizontal.
- [ ] `text-wrap: balance` en títulos.
- [ ] Todo valor con su etiqueta separada por espacio real o en otro elemento de bloque.
