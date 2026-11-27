# 08 · Mobile-first, PWA + Capacitor y rendimiento percibido

Fuentes abiertas: [web.dev, Web Vitals](https://web.dev/articles/vitals) · [web.dev, INP](https://web.dev/articles/inp) · [web.dev, Optimize CLS](https://web.dev/articles/optimize-cls) · [web.dev Learn PWA, Installation](https://web.dev/learn/pwa/installation) · [Nielsen, Response times](https://www.nngroup.com/articles/response-times-3-important-limits/) · [Laws of UX, Doherty Threshold](https://lawsofux.com/) · [NN/g, Skeleton screens](https://www.nngroup.com/articles/skeleton-screens/) · [Apple, Liquid Glass (tab bars)](https://www.apple.com/newsroom/2025/06/apple-introduces-a-delightful-and-elegant-new-software-design/) · [Material 3, Structure](https://m3.material.io/foundations/designing/structure) · [MDN inputmode](https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/inputmode)

---

## 1. Mobile-first de verdad
La mayoría de los estudiantes revisa notas en el celular, entre clases, con una mano. La auditoría no pudo probar 390×844: **falta esa pasada** y es prioritaria.

### Principios
- **Diseñar primero a 360–390 px** y agrandar; no "encoger" el escritorio.
- **Zona del pulgar**: acciones frecuentes abajo (tab bar, botón "Agregar nota", pie de sheets). M3: colocar acciones importantes arriba o abajo de la pantalla ([M3](https://m3.material.io/foundations/designing/structure)).
- **Tab bar** de 4–5 destinos (Inicio, Ramos, Agenda, Estadísticas, Perfil). iOS 26 encoge la tab bar al hacer scroll y la expande al volver ([Apple](https://www.apple.com/newsroom/2025/06/apple-introduces-a-delightful-and-elegant-new-software-design/)): patrón deseable para ganar espacio en listas largas.
- **Sheets** en vez de modales centrados; con asa de arrastre **y** botón cerrar (alternativa al gesto).
- **Teclado**: `inputmode="decimal"` para notas ([MDN](https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/inputmode)), `enterkeyhint="next"` para pasar de campo en campo, `enterkeyhint="done"` en el último. Capacitor ya usa `Keyboard.resize: "native"`: verificar que el campo enfocado y el botón Guardar queden visibles sobre el teclado.
- **Safe areas**: el viewport ya tiene `viewport-fit=cover`; usar `env(safe-area-inset-*)` en tab bar, toasts y pies de sheet.
- **Unidades de viewport dinámicas** (`dvh`, `svh`) para alturas completas: `100vh` en iOS incluye la barra del navegador y corta el pie.

```css
.app{ min-block-size: 100dvh; }
.tabbar{ position: sticky; bottom: 0; padding-block-end: env(safe-area-inset-bottom); }
.sheet{ max-block-size: 90dvh; border-radius: 16px 16px 0 0; }
@media (hover: hover) and (pointer: fine){ /* escritorio: hover, tooltips, atajos */ }
@media (pointer: coarse){ :root{ --hit: 48px; } }
```

### Breakpoints sugeridos
| Rango | Layout |
|---|---|
| <600 px | Una columna, tab bar abajo, sheets |
| 600–1023 px | Dos columnas en Inicio (KPI + próximas), lista de ramos en grilla de 2 |
| ≥1024 px | Barra lateral (navigation rail) + contenido máx. 1120 px; detalle de ramo en panel lateral (lista-detalle) |

Combinar con *container queries* para componentes (ver §04).

## 2. PWA
web.dev: la instalabilidad depende del Web App Manifest y algunas propiedades (nombre, configuración de la experiencia instalada); los criterios varían por navegador y Safari en macOS no soporta instalación como Chrome ([web.dev](https://web.dev/learn/pwa/installation)).

### Revisión del `manifest.json` actual
| Campo | Hoy | Recomendación |
|---|---|---|
| `lang` | `"es"` | `"es-CL"` |
| `theme_color` / `background_color` | `#0a0e14` (oscuro) | La UI clara es `#ffffff`: la splash y la barra de estado quedan oscuras para quien usa modo claro. Usar el color claro en el manifest y `<meta name="theme-color" media=…>` por esquema (ver §03) |
| `id` | Falta | `"id": "/"` para identidad estable de la app |
| `shortcuts` | Falta | "Agregar nota", "Agenda", "Calculadora" (menú del ícono en Android) |
| `screenshots` | Falta | Capturas `form_factor: narrow/wide` mejoran el diálogo de instalación en Chrome |
| `display_override` | Falta | `["standalone"]` (o `window-controls-overlay` en escritorio si se quiere) |
| `orientation` | `portrait` | Bien en móvil; ojo que también bloquea tablets en horizontal |

### Service worker
El SW actual usa *network-first* para HTML y *cache-first* para estáticos, versionado por SHA del commit: buena base. Mejoras:
- **Datos offline-first**: los datos ya viven localmente; mostrar siempre lo local al instante y sincronizar después (ver §05 guardado seguro).
- **Aviso de nueva versión** no intrusivo: "Hay una versión nueva · Actualizar" (snackbar con acción), nunca recargar a mitad de edición.
- **Indicador de conexión** discreto, no bloqueante.

### Capacitor (iOS/Android)
- `SplashScreen.launchShowDuration: 3000`: **3 s de splash fijo** es tiempo muerto percibido. Ocultarlo programáticamente (`SplashScreen.hide()`) apenas el shell pinta con datos locales.
- Respetar convenciones de cada plataforma: gesto atrás de Android (`App.addListener('backButton')` → navegar atrás en la ruta interna, no salir), swipe-back en iOS.
- Háptica (`@capacitor/haptics` instalado) solo en momentos clave.
- Notificaciones locales (`@capacitor/local-notifications` instalado): recordatorio de evaluación con texto útil ("Mañana: Solemne 2 de Cálculo I · Necesitas 4,6") y permiso pedido **en contexto** (al agregar la primera fecha), no al abrir la app.

## 3. Core Web Vitals
Umbrales "buenos" al percentil 75, separado móvil/escritorio ([web.dev Vitals](https://web.dev/articles/vitals)):

| Métrica | Bueno | Qué mide | Riesgo en GradeHub |
|---|---|---|---|
| **LCP** | ≤ 2,5 s | Carga del contenido principal | `styles.css` de 664 KB bloqueante; splash de 3 s en nativo |
| **INP** | ≤ 200 ms (mejorable ≤500, malo >500) | Latencia de **todas** las interacciones hasta el siguiente pintado | Recalcular y re-renderizar toda la vista al tipear una nota |
| **CLS** | ≤ 0,1 | Estabilidad visual | Secciones que aparecen sin espacio reservado; modal que salta de 723 a 603 px |

INP reemplazó a FID; mide la peor interacción (ignorando un outlier cada 50) y "el 90 % del tiempo de un usuario en una página ocurre **después** de cargar" ([web.dev INP](https://web.dev/articles/inp)). En una app de uso continuo como GradeHub, **INP es la métrica que más importa**.

### Optimizar INP
- **Pintar feedback primero, calcular después**: actualizar el input y el indicador "Guardando…" en el mismo frame; el recálculo pesado en `requestIdleCallback`/`scheduler.yield()` o en un *web worker* (web.dev lista "optimize long tasks", "use web workers", "avoid large complex layouts", "DOM size" como causas/soluciones ([web.dev INP](https://web.dev/articles/inp))).
- **Re-render quirúrgico**: actualizar solo la fila y el KPI afectados, no la vista completa.
- **DOM pequeño**: virtualizar o paginar la tabla de 50–68 filas de la calculadora; `content-visibility: auto` en secciones fuera de pantalla.
```css
.seccion-secundaria{ content-visibility: auto; contain-intrinsic-size: auto 600px; }
```
```js
async function alCambiarNota(input){
  pintarEstado(input, 'guardando');           // feedback inmediato
  await (globalThis.scheduler?.yield?.() ?? new Promise(r => setTimeout(r)));
  recalcularYRenderizarSoloAfectados(input.dataset.ramo);
}
```
- Medir en campo con la librería `web-vitals` (`onINP`, `onLCP`, `onCLS`) y enviarlo a PostHog con el nombre de la interacción.

### Optimizar LCP
- Partir `styles.css` (664 KB): CSS crítico del shell inline (<14 KB) y el resto diferido por vista; eliminar CSS muerto (91 tamaños de fuente sugieren mucho CSS duplicado).
- Fuente del sistema (ya) = cero bloqueo por fuentes.
- Pintar desde datos locales antes de pedir al servidor.

### Evitar CLS
- Reservar espacio para skeletons, imágenes (`width`/`height` o `aspect-ratio`) y banners ([web.dev CLS](https://web.dev/articles/optimize-cls)).
- Alto estable en modales con tabs; `scrollbar-gutter: stable` en contenedores que a veces tienen scroll.

## 4. Rendimiento percibido
Nielsen: 0,1 s instantáneo, 1 s mantiene el flujo, 10 s límite de atención ([NN/g](https://www.nngroup.com/articles/response-times-3-important-limits/)); Doherty: <400 ms para que nadie espere a nadie ([Laws of UX](https://lawsofux.com/)).
Técnicas:
1. **UI optimista** con reversión: la nota aparece guardada al instante; si el servidor falla, se marca "No se guardó · Reintentar" (nunca se borra en silencio).
2. **Skeletons con forma real** (1–10 s) ([NN/g](https://www.nngroup.com/articles/skeleton-screens/)).
3. **Precargar** la siguiente vista probable (al tocar un ramo, ya se tienen sus datos locales).
4. **Retrasar spinners** ~300 ms para que acciones rápidas no parpadeen.
5. **Transiciones cortas** que encubren latencia sin alargarla (≤300 ms).
6. **Progreso explícito** en operaciones largas (importar malla/avance, OCR de pauta) con cancelar.

## 5. Checklist mobile/PWA/rendimiento
- [ ] Pasada completa a 390×844 y 360×780 (iOS y Android), con teclado abierto.
- [ ] Ningún botón final tapado por teclado, tab bar o home indicator.
- [ ] Manifest: `lang es-CL`, `id`, `shortcuts`, `screenshots`, colores coherentes con el tema.
- [ ] Splash nativo se oculta al primer pintado útil.
- [ ] Botón atrás de Android y del navegador navegan dentro de la app.
- [ ] LCP ≤2,5 s, INP ≤200 ms, CLS ≤0,1 al p75 en móvil (medido en campo).
- [ ] CSS crítico inline; CSS total reducido.
- [ ] Recalcular promedio no bloquea el input.
