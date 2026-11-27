# Diseño web, de interfaces y de dashboards aplicado a GradeHub

Investigación de noviembre de 2026. Todas las URLs citadas se abrieron durante la investigación (la lista completa, con lo que se sacó de cada una, está en `15-fuentes.md`). Sin datos personales: los ejemplos usan ramos y notas ficticias.

**Contexto del producto.** GradeHub es una app web/PWA + iOS/Android (Capacitor) para universitarios chilenos: promedios ponderados (escala 1,0–7,0, decimales con coma), "Necesitas X para aprobar", simulador, pautas de evaluación, agenda con .ics, estadísticas y modo oscuro.

## Cómo leer esto

| # | Archivo | Qué contiene |
|---|---|---|
| 01 | `01-principios-ui.md` | Heurísticas de Nielsen y Laws of UX traducidas a pantallas de GradeHub; jerarquía visual |
| 02 | `02-tipografia.md` | Escalas, fuentes del sistema y variables, cifras tabulares, legibilidad de notas, CSS |
| 03 | `03-color-y-modo-oscuro.md` | Tokens semánticos, OKLCH, WCAG 2.2 vs APCA, escala de color de notas, modo oscuro bien hecho |
| 04 | `04-espaciado-tokens-design-systems.md` | Grilla de 8 pt, tokens, Material 3/Expressive, Apple HIG/Liquid Glass, Radix, shadcn/ui, Tailwind v4 |
| 05 | `05-componentes-y-estados.md` | Formularios, validación en vivo, inputs de notas, toasts con deshacer, confirmaciones, vacío/carga/error, skeletons, timeouts, guardado seguro |
| 06 | `06-motion-y-microinteracciones.md` | Duraciones, curvas, View Transitions, `prefers-reduced-motion` |
| 07 | `07-accesibilidad.md` | WCAG 2.2 AA aplicada: foco, objetivos 24/44 px, lectores de pantalla, regiones vivas, modales |
| 08 | `08-mobile-pwa-rendimiento.md` | Mobile-first, PWA + Capacitor, Core Web Vitals (LCP, INP, CLS), rendimiento percibido |
| 09 | `09-dashboards.md` | Stephen Few, Tufte, jerarquía de KPI, gráficos correctos, sparklines, bullet graphs, progreso y riesgo académico |
| 10 | `10-onboarding-y-empty-states.md` | Onboarding mínimo, demo sin registro, estados vacíos que enseñan |
| 11 | `11-ux-writing-es-cl.md` | Tono, plurales, números pegados, formato es-CL con `Intl`, glosario de términos confusos |
| 12 | `12-referentes-y-tendencias.md` | Qué copiar de Notion, Linear, Duolingo, Apple Fitness, Things, Arc, Raycast, Vercel; tendencias 2025–2026 |
| 13 | `13-checklists.md` | Checklists accionables por pantalla y por PR |
| 14 | `14-que-aplicar-en-gradehub.md` | Plan priorizado P0/P1/P2 conectado con la auditoría UX de noviembre |
| 15 | `15-fuentes.md` | Todas las fuentes abiertas, con lo que aporta cada una |

## Diagnóstico rápido del CSS actual (medido en `comp/repo/styles.css`, 26-nov-2026)

Se midió con un script sobre la copia local del repositorio de GradeHub (`/workspace/work/comp/repo/styles.css`, 664 KB, commit `dda6088` del 27-nov-2026 UTC). Si producción difiere de ese commit, los números son orientativos.

| Medición | Valor | Lectura |
|---|---|---|
| Tamaños de fuente distintos (`font-size`) | **91** | No hay escala tipográfica real; se mezclan px y rem (`13px`, `.8125rem`, `0.71875rem`) |
| Colores hex distintos | **78** | Hay tokens (`--fg`, `--primary`…), pero muchos colores sueltos |
| Paddings en px distintos | **31** (1, 2, 3, 5, 7, 9, 11, 13, 15, 17 px…) | No respeta una grilla de 4/8 |
| Valores de `z-index` distintos | **18** (hasta 1000) | Capas sin escala: causa de "botón tapado por un div" |
| `outline:none` | **19** | Riesgo de foco invisible (WCAG 2.4.7) |
| `!important` | 22 | Deuda de especificidad |
| `tabular-nums` | 255 usos | Bien: ya se alinean cifras |
| `prefers-reduced-motion` | 55 usos | Bien |
| `focus-visible` | 170 usos | Bien, pero convive con los `outline:none` |
| Tokens de motion (`--motion-fast:160ms`, `--ease-out`…) | Existen | Bien: base para estandarizar |
| `oklch()` | 0 usos | Todo en hex |

Contrastes calculados (WCAG 2.x) sobre los tokens actuales:

| Par | Ratio | Veredicto |
|---|---|---|
| `--fg3 #6c6c74` sobre blanco | 5,20:1 | Pasa AA texto |
| `--fg3` sobre `--muted #f2f2f4` | 4,66:1 | Pasa justo |
| `--border2 #b8b8be` sobre blanco | **1,97:1** | **Falla 1.4.11** si el borde es lo único que delimita un input (pide 3:1) |
| `--border #e7e7e9` sobre blanco | 1,23:1 | Solo vale como separador decorativo |
| Oscuro: `--card #111113` sobre `--bg #080809` | **1,06:1** | Superficies indistinguibles (coincide con "modo oscuro pintado" de la auditoría) |
| Oscuro: `--border #27272c` sobre `--card` | 1,27:1 | Separadores casi invisibles |
| Oscuro: `--primary #2dd4bf` sobre `--card` | 10,13:1 | Bien |

Estos números aterrizan varios hallazgos de la auditoría (`/workspace/work/auditoria/docs/auditoria-ux-2026-11/`) y se usan en `14-que-aplicar-en-gradehub.md`.
