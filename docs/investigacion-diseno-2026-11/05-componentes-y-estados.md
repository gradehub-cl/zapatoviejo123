# 05 · Componentes y estados: formularios, validación, inputs de nota, toasts, confirmaciones, vacío/carga/error, timeouts y guardado seguro

Fuentes abiertas: [NN/g, 10 guías de errores en formularios](https://www.nngroup.com/articles/errors-forms-design-guidelines/) · [Smashing, Inline validation (2022)](https://www.smashingmagazine.com/2022/09/inline-validation-web-forms-ux/) · [MDN inputmode](https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/inputmode) · [NN/g, Confirmation dialogs](https://www.nngroup.com/articles/confirmation-dialog/) · [Material 3, Snackbar guidelines](https://m3.material.io/components/snackbar/guidelines) · [NN/g, Indicators, validations, notifications](https://www.nngroup.com/articles/indicators-validations-notifications/) · [NN/g, Skeleton screens 101](https://www.nngroup.com/articles/skeleton-screens/) · [NN/g, Progress indicators](https://www.nngroup.com/articles/progress-indicators/) · [Nielsen, Response times](https://www.nngroup.com/articles/response-times-3-important-limits/) · [NN/g, Empty states en apps complejas](https://www.nngroup.com/articles/empty-state-interface-design/) · [MDN aria-live](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-live) · [WCAG 2.2](https://www.w3.org/TR/WCAG22/) · [Apple HIG Accessibility (elementos con temporizador)](https://developer.apple.com/design/human-interface-guidelines/accessibility) · [web.dev, Optimize CLS](https://web.dev/articles/optimize-cls)

---

## 1. Formularios

### Principios
- **Etiqueta visible siempre** (no solo placeholder). WCAG 3.3.2 *Labels or Instructions*; además 2.5.3 *Label in Name*: el nombre accesible contiene el texto visible ([WCAG 2.2](https://www.w3.org/TR/WCAG22/)).
- **Una columna** en móvil; agrupar con `fieldset`/`legend` (evaluación: nombre, tipo, peso, fecha, nota).
- **Defaults inteligentes**: tipo "Solemne" y peso que complete el 100 % restante; fecha próxima vacía en vez de hoy.
- **Redundant Entry (3.3.7, nivel A, nuevo en 2.2)**: lo ya ingresado en el mismo proceso se autocompleta o se ofrece para elegir ([WCAG 2.2](https://www.w3.org/TR/WCAG22/)). Ej.: al crear la segunda solemne, proponer el mismo peso que la primera.
- **Botón primario siempre visible** (pie fijo en modales largos; ver §04) y **habilitado** con validación al enviar, en vez de deshabilitado sin explicación. Si se deshabilita, explicar por qué al lado.

### Antipatrón observado
"Guardar semestre" activo sin notas pese a decir "Pon al menos una nota" (validación que miente). Regla: **lo que dice el texto y lo que hace el botón deben venir de la misma condición**.

```js
const puedeGuardar = semestre.ramos.some(r => r.evaluaciones.some(e => e.nota != null));
btn.disabled = false; // preferible: habilitado y validar al enviar
btn.onclick = () => puedeGuardar ? guardar() : mostrarError(btn, 'Pon al menos una nota para guardar el semestre.');
```

## 2. Validación en vivo (cuándo y cómo)
NN/g ([10 guías](https://www.nngroup.com/articles/errors-forms-design-guidelines/)):
1. Validación inline siempre que sea posible, "apenas el usuario termina de llenar un campo".
2. Indicar éxito en campos complejos.
3. Mensajes de error **junto al campo**.
4. Color para diferenciar (rojo error, naranja/amarillo advertencia, verde/azul éxito); fondo semitransparente del mismo color en formularios largos.
5. Iconografía o animación sutil para escanear.
6. Modales/confirmaciones con moderación.
7. **No validar antes de que el input esté completo**: "evita mostrar un error hasta que el usuario terminó el campo y pasó al siguiente".
8. No usar un resumen de errores como única indicación.
9. No usar tooltips para errores.
10. Ayuda extra ante errores repetidos.

Smashing: evitar la **validación prematura** (al enfocar un campo vacío) y aplicar **"Reward early, punish late"**: si el campo estaba en error, validar en cada tecla para **quitar** el error apenas se corrige; si estaba válido, esperar al `blur` para mostrar uno nuevo ([Smashing](https://www.smashingmagazine.com/2022/09/inline-validation-web-forms-ux/)).

```js
function validarEnVivo(input, regla){
  let estabaEnError = false;
  input.addEventListener('input', () => {           // reward early
    if (estabaEnError && !regla(input.value)) limpiarError(input), estabaEnError = false;
  });
  input.addEventListener('blur', () => {            // punish late
    if (!input.value) return;                       // no castigar vacío al pasar
    const msg = regla(input.value);
    if (msg){ mostrarError(input, msg); estabaEnError = true; }
  });
}
function mostrarError(input, msg){
  const id = input.id + '-error';
  let el = document.getElementById(id);
  if (!el){ el = Object.assign(document.createElement('p'), {id, className:'campo-error'}); input.after(el); }
  el.textContent = msg;
  input.setAttribute('aria-invalid', 'true');
  input.setAttribute('aria-describedby', id);
}
function limpiarError(input){
  input.removeAttribute('aria-invalid');
  document.getElementById(input.id + '-error')?.remove();
}
```
```css
.campo[aria-invalid="true"]{ border-color: var(--danger); background: color-mix(in oklab, var(--danger) 6%, var(--surface)); }
.campo-error{ color: var(--danger); font-size: var(--text-footnote); display:flex; gap:4px; }
.campo-error::before{ content:"⚠"; }   /* forma además del color */
```

### Validaciones de dominio que GradeHub debe tener
| Regla | Cuándo | Mensaje |
|---|---|---|
| Nota entre 1,0 y 7,0 | blur | "La nota va de 1,0 a 7,0." |
| Máximo 1 decimal (o lo que use la U) | blur | "Usa un decimal, por ejemplo 5,5." |
| Pesos suman 100 % | **en vivo** (contador) + al guardar | Contador: "Llevas 110 % de 100 %. Sobra 10 %." Guardar bloqueado o "Guardar como borrador" explícito |
| Fecha de evaluación dentro del semestre | blur | "Esa fecha queda fuera del semestre 2026-2." |
| Tope/eximición coherentes | al guardar reglas | Texto concreto del conflicto, **dentro** del modal (auditoría: error de tope fuera del modal) |

Contador de pesos accesible:
```html
<p id="suma-pesos" role="status" aria-live="polite">Llevas <strong class="num">85 %</strong> de 100 %. Falta 15 %.</p>
```

## 3. Inputs numéricos de nota
**No usar `type="number"`** para notas: el separador decimal depende del navegador/teclado, permite `e`, tiene flechas de incremento, y la rueda del mouse cambia valores sin querer. Usar `type="text"` + `inputmode="decimal"`, que muestra un "teclado numérico fraccionario con el separador decimal del locale (típicamente . o ,)" ([MDN inputmode](https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/inputmode)). En iOS con región Chile el teclado trae coma; en Android depende del teclado: por eso hay que aceptar ambos.

```html
<label for="nota-s1">Nota Solemne 1</label>
<input id="nota-s1" class="campo num" type="text" inputmode="decimal"
       autocomplete="off" enterkeyhint="next" pattern="[1-7]([.,][0-9])?"
       aria-describedby="nota-s1-ayuda" placeholder="—">
<p id="nota-s1-ayuda" class="ayuda">De 1,0 a 7,0</p>
```
```js
// Postel: aceptar mucho, mostrar uniforme
export function parsearNota(raw){
  let s = String(raw).trim().replace(/\s/g,'').replace(',', '.');
  if (s === '') return {valor:null};
  if (/^\d{2}$/.test(s) && +s >= 10 && +s <= 70) s = (s/10).toFixed(1);  // "55" → 5.5 (confirmar visualmente)
  const n = Number(s);
  if (!Number.isFinite(n)) return {error:'Escribe un número, por ejemplo 5,5.'};
  if (n < 1 || n > 7)       return {error:'La nota va de 1,0 a 7,0.'};
  return {valor: Math.round(n*10)/10};
}
export const fmtNota = n => n == null ? '—' :
  new Intl.NumberFormat('es-CL',{minimumFractionDigits:1, maximumFractionDigits:1}).format(n);
// fmtNota(5.5) → "5,5" (verificado con Node/ICU)
```
Al hacer blur, reescribir el valor formateado (`5.5` → `5,5`) para que el usuario vea cómo se interpretó. Escala puntaje → nota (lo que hacen bien competidores y la propia calculadora): el input acepta puntaje y muestra al lado la nota resultante en vivo.

## 4. Guardado seguro (el bug de "pérdida de notas")
Auditoría: notas perdidas al guardar con **Tab** (3 veces) o con **Enter antes de ~0,7 s**. Causa típica: el guardado se dispara con *debounce* sobre `input`, y el `blur`/Enter cierra o re-renderiza la fila antes de que el debounce termine; o el re-render reemplaza el DOM con el estado viejo.

Patrón robusto:
1. **Estado local primero**: cada cambio actualiza el modelo en memoria **sincrónicamente** (y en IndexedDB/PGlite); la UI se re-renderiza desde ese modelo, nunca desde el servidor a mitad de edición.
2. **Commit en `change`/`blur`/Enter**, no solo tras debounce. Si hay debounce, `blur`, Enter, `visibilitychange` y `pagehide` hacen **flush inmediato**.
3. **Cola de escritura idempotente** hacia el servidor (Supabase): cada operación con id y `updated_at`; reintento con backoff; nunca descartar una operación pendiente por un re-render.
4. **No re-renderizar la fila que tiene foco** con datos remotos; aplicar el remoto al terminar la edición (o fusionar campo a campo).
5. **Indicador por campo**: `Guardando…` / `Guardado` / `Sin conexión: se guardará al volver` / `No se guardó · Reintentar`.
6. **Aviso al salir** si quedan cambios sin sincronizar (`beforeunload` en web; en Capacitor, `App.addListener('appStateChange')` para flush al ir a background).

```js
const pendientes = new Map();               // id → payload
let timer;
function programar(id, payload){ pendientes.set(id, payload); clearTimeout(timer); timer = setTimeout(flush, 600); }
async function flush(){
  clearTimeout(timer);
  const lote = [...pendientes.entries()]; pendientes.clear();
  for (const [id, p] of lote){
    marcar(id, 'guardando');
    try { await upsertEvaluacion({id, ...p}); marcar(id, 'guardado'); }
    catch { pendientes.set(id, p); marcar(id, 'error'); }
  }
}
form.addEventListener('focusout', flush);                   // Tab
form.addEventListener('keydown', e => { if (e.key === 'Enter') flush(); });
document.addEventListener('visibilitychange', () => document.hidden && flush());
addEventListener('pagehide', flush);
addEventListener('beforeunload', e => { if (pendientes.size) e.preventDefault(); });
```
Test de regresión obligatorio: escribir nota → Tab inmediato → recargar → la nota está. Igual con Enter a los 50 ms, 200 ms y 700 ms.

## 5. Toasts / snackbars con deshacer
Material 3 ([Snackbar](https://m3.material.io/components/snackbar/guidelines)):
- Abajo, delante del contenido; **uno a la vez**; no tapar navegación ni FAB; no cubrir el elemento con foco.
- **Una sola acción** ("Deshacer"); texto de 1–2 líneas; sin íconos ni links.
- Sin acción: se autodescartan a los **4–10 s**; **con acción: permanecen hasta que el usuario actúe o los cierre**.
- **En web, los snackbars autodescartables son inaccesibles** para personas con baja visión o que necesitan más tiempo: hay que dar también feedback inline (p. ej. el botón "Guardar" pasa a "Guardado") o hacer el snackbar accionable.

NN/g: un toast está bien para notificaciones pasivas, pero es **mala forma de mostrar errores** (un usuario esperó 5 minutos porque no vio un error que se desvaneció abajo) ([NN/g](https://www.nngroup.com/articles/indicators-validations-notifications/)). Apple recomienda minimizar elementos con temporizador y preferir el cierre explícito ([Apple HIG](https://developer.apple.com/design/human-interface-guidelines/accessibility)). WCAG 2.2.1 *Timing Adjustable* aplica a contenidos con límite de tiempo ([WCAG 2.2](https://www.w3.org/TR/WCAG22/)).

**Patrón "borrar con deshacer" para GradeHub**:
1. Al borrar, la evaluación desaparece de la lista (optimista) pero la eliminación real se **difiere** (o se hace *soft delete*).
2. Toast: "Borraste «Control 3» · **Deshacer**". Permanece ~10 s **y** no se cierra mientras tenga foco o hover; Escape lo cierra.
3. Deshacer restaura en la misma posición y devuelve el foco a la fila restaurada.
4. Anuncio a lectores de pantalla con región viva `role="status"` (no mover el foco al toast).
5. Errores **no** van en toast: van inline o en un banner persistente.

```html
<div id="toasts" class="toasts" role="status" aria-live="polite" aria-atomic="true"></div>
```
```css
.toasts{ position:fixed; inset-inline:16px; bottom:calc(72px + env(safe-area-inset-bottom)); z-index:var(--z-toast);
         display:grid; justify-items:center; pointer-events:none; }
.toast{ pointer-events:auto; max-inline-size:min(560px, 100%); display:flex; gap:12px; align-items:center;
        background:var(--fg); color:var(--bg); border-radius:12px; padding:12px 16px; box-shadow:var(--shadow-lg); }
.toast button{ color:var(--primary-on-inverse, oklch(0.80 0.12 180)); font-weight:600; min-block-size:44px; }
```

## 6. Confirmaciones
NN/g ([Confirmation dialogs](https://www.nngroup.com/articles/confirmation-dialog/)):
- Úsalas solo antes de acciones de **consecuencias serias** (destruir trabajo), sobre todo si **no se pueden deshacer**; e intenta ofrecer deshacer de todos modos.
- **No para acciones rutinarias** (se vuelven "el pastor y el lobo").
- **Sé específico**: nada de "¿Estás seguro?"; explica qué pasará en términos del usuario.
- **Botones que describen el resultado** ("Eliminar cuenta" / "Conservar cuenta"), no Sí/No.
- **Sin "Sí" por defecto**.

Aplicado a GradeHub:
| Acción | Tratamiento |
|---|---|
| Borrar evaluación, borrar nota | Sin diálogo; toast con Deshacer |
| Archivar semestre | Diálogo con resumen ("Se guardará 2026-2 con promedio 5,4 y 6 ramos. Luego podrás crear 2027-1.") + Deshacer luego |
| Cerrar sesión | Diálogo corto solo si hay cambios sin sincronizar |
| Reiniciar app / Eliminar cuenta | Zona de peligro separada, diálogo con consecuencia concreta, escribir "ELIMINAR", botón rojo "Eliminar mi cuenta", foco inicial en "Cancelar" |
| Cerrar modal con cambios (Escape/clic fuera) | "¿Descartar los cambios en tus ponderaciones?" — "Seguir editando" (default) / "Descartar" |

Apple, para Assistive Access, pide confirmar dos veces acciones difíciles de revertir ([Apple HIG](https://developer.apple.com/design/human-interface-guidelines/accessibility)): coherente con "escribir ELIMINAR".

## 7. Estados: vacío, carga, error, parcial, sin conexión
Cada vista/tarjeta debe diseñarse en **todos** sus estados (matriz):

| Estado | Qué mostrar | Ejemplo GradeHub |
|---|---|---|
| Ideal | Datos | Promedio 5,4 |
| Vacío (primera vez) | Explicación + acción + (opcional) ejemplo | "Aún no tienes notas. Agrega la primera y te decimos cuánto necesitas para aprobar." [Agregar nota] |
| Vacío (filtro sin resultados) | Qué filtro produjo el vacío + cómo salir | "No hay evaluaciones esta semana. [Ver todas]" |
| Cargando | Skeleton con la forma real (<10 s) | Fila de ramo gris con alto final |
| Parcial | Lo que hay + qué falta | "Promedio con 62 % evaluado" |
| Error | Qué pasó + qué hacer + reintento | "No pudimos cargar Apoyo. Revisa tu conexión. [Reintentar]" |
| Sin conexión | Datos locales + aviso no bloqueante | "Sin conexión. Tus cambios se guardan y se sincronizan al volver." |
| Sin permisos/feature no disponible | Explicar y ofrecer alternativa | "Apoyo aún no está disponible en tu universidad." |

NN/g sobre estados vacíos: "los estados totalmente vacíos generan confusión sobre si el sistema funciona" (¿terminó?, ¿está cargando?, ¿hubo error?, ¿filtré mal?); usarlos para **comunicar estado**, **dar pistas de aprendizaje** y **ofrecer caminos directos a tareas clave** ([NN/g](https://www.nngroup.com/articles/empty-state-interface-design/)). Ver `10-onboarding-y-empty-states.md`.

## 8. Carga: skeleton vs spinner vs progreso
NN/g ([Skeleton screens](https://www.nngroup.com/articles/skeleton-screens/), [Progress indicators](https://www.nngroup.com/articles/progress-indicators/)):
- **<1 s**: nada (o solo cambio de estado del botón). Mostrar spinner por 200 ms produce parpadeo: retrasar su aparición ~300 ms.
- **1–10 s**: skeleton (cargas de página/sección) o spinner (acciones puntuales, 2–10 s).
- **>10 s**: barra de progreso con porcentaje o estimación + forma de cancelar ([Nielsen](https://www.nngroup.com/articles/response-times-3-important-limits/)). Ej.: importar avance curricular, OCR de pauta.
- Skeleton = estructura real (mismas alturas) → también evita saltos de layout (CLS); web.dev recomienda reservar el espacio de contenido dinámico "usando un placeholder o skeleton UI" ([web.dev CLS](https://web.dev/articles/optimize-cls)).

```css
.skeleton{ background: linear-gradient(90deg, var(--muted) 25%, color-mix(in oklab, var(--muted), var(--fg) 6%) 37%, var(--muted) 63%);
           background-size: 400% 100%; animation: shimmer 1.4s ease infinite; border-radius: 8px; }
@keyframes shimmer{ from{background-position:100% 50%} to{background-position:0 50%} }
@media (prefers-reduced-motion: reduce){ .skeleton{ animation:none; } }
```
```html
<div class="fila-ramo" aria-busy="true" aria-label="Cargando ramos">
  <span class="skeleton" style="inline-size:40%;block-size:20px"></span>
  <span class="skeleton" style="inline-size:48px;block-size:32px"></span>
</div>
```

## 9. Timeouts: ninguna carga infinita
Auditoría: "Revisando tu acceso…" eterno en Apoyo y Ofrecer clases. Regla: **toda petición tiene timeout, todo estado de carga tiene salida**.

```js
async function conTimeout(promesaFn, ms = 10000){
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try { return await promesaFn(ctrl.signal); }
  finally { clearTimeout(t); }
}
async function cargarSeccion(el, fetcher){
  el.dataset.estado = 'cargando';
  const lento = setTimeout(() => el.dataset.lento = 'true', 3000); // "Está tardando más de lo normal…"
  try{
    const datos = await conTimeout(signal => fetcher(signal), 10000);
    render(el, datos); el.dataset.estado = datos?.length ? 'ok' : 'vacio';
  }catch(e){
    el.dataset.estado = 'error';
    renderError(el, e.name === 'AbortError'
      ? 'Esto está tardando demasiado. Revisa tu conexión e inténtalo de nuevo.'
      : 'No pudimos cargar esta sección.', () => cargarSeccion(el, fetcher));
  }finally{ clearTimeout(lento); }
}
```
Y registrar en analítica cada timeout (PostHog) para saber qué endpoint falla.

## 10. Consistencia de estado entre vistas
Auditoría: "✓ Aprobado" en el ramo vs chip "en riesgo" en Inicio; Estadísticas y Agenda con datos viejos tras guardar/archivar. Solución arquitectónica (no solo visual):
- **Una fuente de verdad** (store) y **selectores derivados** (`promedioRamo`, `estadoRamo`, `riesgo`) que usan todas las vistas.
- Las vistas se suscriben al store; al guardar o archivar, se emite un evento y todas re-renderizan.
- Las mismas funciones (`estadoNota`, `estadoRamo`) deciden texto, color e ícono.

## 11. Modales, sheets y navegación
- Móvil: **sheets** desde abajo en vez de modales centrados (auditoría: revisar breakpoint móvil).
- `<dialog>` nativo con `showModal()` (foco atrapado, Escape, `::backdrop`, top layer). Si hay cambios, interceptar `cancel`:
```js
dialog.addEventListener('cancel', e => { if (formulario.dataset.sucio === 'true'){ e.preventDefault(); confirmarDescarte(); } });
```
- Nombre accesible del diálogo = su título (`aria-labelledby`), no "Ventana" (auditoría).
- **Rutas reales** para Atrás del navegador y deep links (`history.pushState` + `popstate`), y para que "recargar a mitad de formulario" restaure (guardar borrador en `sessionStorage`).

## 12. Antipatrones (resumen)
- Validación que miente (110 % se guarda; botón activo contra su propio texto).
- Errores en toast o fuera del modal.
- `type="number"` para notas.
- Spinner sin timeout.
- Escape que descarta trabajo.
- "¿Estás seguro?" genérico con Sí/No.
- Estado vacío = cuadradito gris.
- Toasts apilados o que tapan la tab bar.
