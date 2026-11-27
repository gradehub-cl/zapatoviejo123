---
name: gradehub-ux-review
description: Revisión visual y de UX de GradeHub con capturas reales (Playwright) a 390 px y 1280 px, claro y oscuro, texto grande y modo app nativa. Úsalo antes de abrir o aprobar cualquier PR que cambie UI, cuando pidan "revisa el diseño", "saca capturas", "QA visual", "se ve mal en el celular", "modo oscuro roto", "textos pegados" o "audita la pantalla X", y después de usar gradehub-design-system. Toma capturas con datos sintéticos, mide desbordes, objetivos táctiles, contraste, punto decimal, NaN/undefined y textos pegados, y revisa estados vacío/carga/error, validaciones, toasts y accesibilidad. Entrega un informe priorizado P0-P3 con evidencia.
metadata:
  version: "1.0"
  owner: equipo-gradehub
---

# Revisión de UX de GradeHub

Objetivo: que nada visual llegue a `main` sin haberlo **visto** en las
combinaciones donde la gente usa GradeHub (iPhone en claro y oscuro, a veces
con texto grande; y escritorio). Una captura vale más que leer el CSS.

Reglas fijas:
- **Solo datos sintéticos.** Nunca cuentas, correos ni notas reales en
  capturas, fixtures o el informe. El script ya trae un escenario ficticio.
- **Service worker bloqueado y red externa cortada.** Si no, ves código viejo
  (ya pasó).
- No corrijas mientras revisas: primero el informe completo, después los
  arreglos (salvo que te pidan "revisa y arregla").
- Las reglas de diseño están en la skill `gradehub-design-system`; esta skill
  verifica que se cumplan.

## 1. Preparar

```bash
npm run build                       # los bundles deben estar al día
git diff --name-only origin/main... # qué pantallas tocó el cambio
```

Decide las pantallas afectadas (`home`, `ramo`, `stats`, `agenda`, u otras que
agregues en `IR` del script). Si el cambio es solo de app nativa
(`enAppNativa()` / `html.app-nativa`), usa `--nativa`.

## 2. Capturar (automático)

```bash
node .claude/skills/gradehub-ux-review/scripts/capturas.cjs \
  --pantallas home,ramo,stats,agenda --salida /tmp/gh-ux [--nativa] [--solo-movil]
# Si playwright/Chrome no están en el repo, igual que tests/browser:
# PLAYWRIGHT_MODULE=/ruta/node_modules/playwright CHROME_PATH=/ruta/chrome node …
```

Genera 32 combinaciones (4 pantallas × 390/1280 × claro/oscuro × texto
normal/grande): `/tmp/gh-ux/<pantalla>-<ancho>-<modo>[-texto-grande].png`, más
`informe.json` e `informe.md` con mediciones automáticas:

| Medición | Qué significa | Prioridad típica |
|---|---|---|
| Desborde horizontal | Algo más ancho que la pantalla: scroll lateral | P0 a 390 px |
| Errores de consola / pageerror | JS roto en esa vista | P0 |
| Texto basura (`NaN`, `undefined`, `null`, `[object Object]`) | Dato no formateado | P0 |
| Posible punto decimal (`5.5`) | Rompe es-CL: debe ser `5,5` | P1 |
| Posible texto pegado (`3notas`, `PruebaExamen`) | Falta espacio/separador al interpolar | P1 |
| Objetivos < 44 px | Revisar: puede estar bien si la fila entera es tocable o un pseudo-elemento amplía el área; si no, P1 | P1–P2 |
| Contraste bajo (aprox.) | Texto < 4,5:1 (grande < 3:1) contra su fondo | P1 (P0 si es la nota o un botón) |

El script devuelve código 2 si hay problemas graves (útil en CI o en un hook).
Las mediciones son heurísticas: **confirma cada hallazgo mirando la captura**
antes de reportarlo y descarta falsos positivos explicando por qué.

Para explorar a mano (abrir hojas, escribir notas, provocar errores) usa el
**Playwright MCP** si está instalado (`browser_resize` 390×844,
`browser_take_screenshot`, `browser_snapshot` para el árbol accesible), con el
mismo servidor local y datos sintéticos. Para rendimiento o CLS, el
**Chrome DevTools MCP** (traza de rendimiento).

## 3. Mirar cada captura (lista de revisión)

Abre las PNG (son imágenes: míralas, no solo el informe). Para cada pantalla
recorre esta lista y anota solo lo que falla, con archivo y zona.

**A. Jerarquía y lectura (5 s)**
- [ ] En 5 segundos se entiende "cómo voy" y "qué necesito". La cifra
      protagonista es la nota/promedio, no un adorno.
- [ ] Una sola acción principal visible y reconocible.
- [ ] Nombres largos de ramo se cortan con elipsis o envuelven limpio; no
      empujan la nota fuera de su columna.
- [ ] Cifras alineadas (tabular-nums) y a la derecha en listas.

**B. Color y semáforo**
- [ ] Verde/ámbar/rojo solo para aprobado/al borde/reprobado o suma/resta.
- [ ] El color del ramo está en la línea lateral, no en la nota.
- [ ] 100 % de avance se ve como cierre neutro, no celebración.
- [ ] Ningún estado se comunica solo con color.

**C. Modo oscuro** (compara cada par claro/oscuro lado a lado)
- [ ] Superficies distinguibles (fondo vs tarjeta vs hoja); bordes de
      controles visibles.
- [ ] Nada quedó "pintado" en claro: fondos blancos, sombras grises, íconos
      negros, inputs de fecha claros, imágenes sin variante.
- [ ] Texto secundario legible; el semáforo sigue diciendo lo mismo.

**D. Texto grande y 390 px**
- [ ] Sin cortes de palabras, superposiciones ni botones que se salen.
- [ ] Barras fijas y hojas no tapan contenido; respetan notch y barra de
      inicio (áreas seguras, sobre todo con `--nativa`).
- [ ] Tablas/gráficos tienen versión legible o scroll interno, no lateral de
      página.

**E. 1280 px**
- [ ] El contenido no se estira a todo el ancho: columna de lectura razonable
      (≤ ~720 px para listas, grillas para paneles).
- [ ] Estados hover solo con puntero fino; foco visible con teclado (Tab).

**F. Textos (es-CL)**
- [ ] Coma decimal, plurales correctos (0/1/2), nada pegado, nada en inglés,
      sentence case, verbo + objeto en botones, sin "¡Ups!".
- [ ] Vocabulario de la universidad del escenario.

## 4. Probar comportamiento (a mano o con Playwright MCP)

Usa el escenario sintético y fuerza cada caso. Captura la evidencia. Los
fragmentos de Playwright para simular lentitud, timeout, error, sin conexión,
validación, deshacer y foco están en
[references/simular-estados.md](references/simular-estados.md).

**Validaciones de nota**
- [ ] Escribir `5,5` y `5.5` → se guarda y se muestra `5,5`.
- [ ] `8`, `0`, `0,5`, `abc`, vacío → mensaje bajo el campo ("Escribe una nota
      entre 1,0 y 7,0"), `aria-invalid="true"`, no se pierde lo escrito, el
      foco queda en el campo. No valida en cada tecla.
- [ ] Ponderaciones que no suman 100 % → aviso con cuánto falta.
- [ ] Teclado numérico (`inputmode="decimal"`) y sin zoom en iOS (≥ 16 px).

**Estados**
- [ ] Vacío: sin ramos, ramo sin notas, búsqueda sin resultados → título +
      frase + una acción.
- [ ] Carga: esqueleto con la forma final; sin saltos al llegar los datos.
- [ ] Lento/timeout: simula con `page.route` (retraso 10 s o `abort`) → a los
      ~3 s "Sigue cargando…", al tope error con **Reintentar** que funciona.
      Nunca spinner infinito.
- [ ] Sin conexión (`context.setOffline(true)`) → muestra lo guardado y lo
      dice; al volver, sincroniza.
- [ ] Error del servidor (RPC con `{error}`) → mensaje humano, sin códigos.

**Toasts y deshacer**
- [ ] Borrar una evaluación/nota/ramo → toast "… eliminada" con **Deshacer**
      ≥ 5 s; Deshacer restaura exacto (valor y orden); el toast no tapa la
      barra de navegación ni el botón principal; se anuncia (`role=status`).
- [ ] Acciones irreversibles usan confirmación con foco en Cancelar.

**Accesibilidad**
- [ ] Recorrido completo con Tab/Shift+Tab: orden lógico, foco siempre
      visible, Esc cierra hojas y el foco vuelve al disparador.
- [ ] `browser_snapshot` (árbol accesible): botones con nombre, inputs con
      label, encabezados en orden, switches con `role=switch`.
- [ ] Cambio de promedio se anuncia (región viva).
- [ ] `prefers-reduced-motion`: sin desplazamientos (el script ya captura con
      movimiento reducido; prueba también sin él para ver las animaciones).

## 5. Informe

Escribe el informe en la PR (o en `docs/revisiones/ux-<tema>-<fecha>.md` si te
lo piden) con este formato, ordenado por prioridad:

```markdown
## Revisión UX — <pantallas> — <fecha>
Combinaciones: 390/1280 × claro/oscuro × texto normal/grande [× nativa]
Resultado: ❌ bloquea | ⚠️ arreglar antes de lanzar | ✅ listo

### P0 (bloquea el merge)
- [stats-390-oscuro.png, gráfico] Texto «4,0 · referencia» a 2,1:1 sobre la tarjeta. Regla: contraste 4,5:1. Arreglo: usar --fg2.
### P1 (arreglar en esta PR)
### P2 (siguiente PR)
### P3 (pulido)
### Falsos positivos descartados
- «Ramo sin notas» 108×21: la fila completa es el objetivo (alto 64 px).
### Lo que está bien
- (2–3 cosas concretas, para no romperlas después)
```

Prioridades: **P0** rompe datos, cálculo visible, lectura de la nota, JS,
desborde a 390 px o accesibilidad básica (foco invisible, contraste de la
nota/botón). **P1** viola una regla del sistema de diseño (coma, plural, 44 px,
semáforo, estado sin acción). **P2** inconsistencias visibles. **P3** pulido.

Cada hallazgo: captura + zona, qué regla rompe, arreglo propuesto concreto
(token/clase/texto). Nada de "mejorar el espaciado" sin decir cuánto ni dónde.

## 6. Después de arreglar

Vuelve a correr el script y adjunta en la PR los pares antes/después de lo que
cambió (390 claro y oscuro como mínimo). Si el cambio choca con HIG vs
semáforo/tipografía/Editorial, descríbelo para que decida el dueño del producto.
