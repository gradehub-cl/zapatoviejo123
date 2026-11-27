# Patrones de código (JS sin framework, `src/` concatenado)

Todo esto se escribe en la fuente correspondiente de `src/` (no en los bundles)
y se registra en `src/orden.json` si es archivo nuevo. Antes de crear una
función, busca si ya existe: `npm run buscar -- --ver nf`. Los nombres de abajo
son propuestas; si ya hay una equivalente, úsala y no dupliques.

## 1. Números en es-CL

Ya existen en `src/app/estado-y-notas.js`:

```js
function notaConComa(texto){return String(texto).replace('.',',');}
function nfDato(n,dec){return n.toFixed(dec==null?1:dec);}   // dato, con punto (para inputs/cálculo)
function nf(n,dec){return notaConComa(nfDato(n,dec));}          // pantalla, con coma
function fmt(n){return n===null?'·':nf(n);}
```

Reglas:
- Pantalla → `nf`/`fmt`/`fmtNota`/`fmtPromedio`. Dato/cálculo → número o
  `nfDato`. **Nunca** `n.toFixed(1)` directo dentro de un template HTML.
- `notaConComa` reemplaza solo el primer punto: no lo uses con miles.
- Para porcentajes y cifras con miles, usa `Intl` (cachea el formateador):

```js
const _fmtPct=new Intl.NumberFormat('es-CL',{maximumFractionDigits:1});
const _fmtEntero=new Intl.NumberFormat('es-CL');           // 1.250
function fmtPorcentaje(v){                                   // 62,5 %
  return v==null||!isFinite(v)?'·':_fmtPct.format(v)+'\u202F%';
}
function fmtEntero(v){return v==null||!isFinite(v)?'·':_fmtEntero.format(Math.round(v));}
```

- Lectura de lo que escribe la persona (acepta coma o punto, espacios):

```js
function leerNotaEscrita(txt){
  const s=String(txt??'').trim().replace(/\s+/g,'').replace(',','.');
  if(!/^\d{1,2}(\.\d{1,2})?$/.test(s))return null;          // conceptos (A, B…) se validan aparte por tenant
  const v=Number(s);
  return v>=1&&v<=7?v:null;                                   // escala chilena; el tope real lo da la regla del tenant
}
```

- Valor y "sin nota" accesibles:

```js
function htmlNotaCifra(n){
  return n==null
    ? '<span class="nota-cifra nota-vacia" aria-label="Sin nota">·</span>'
    : `<span class="nota-cifra ${colorClass(n)}">${fmt(n)}</span>`;   // colorClass/notaHue ya existen: no reinventes el semáforo
}
```

Auditoría rápida de puntos decimales que llegan a pantalla:

```bash
rg -n "toFixed\(" src | rg -v "nfDato|notaConComa|replace\('\.',','\)"
```

## 2. Plurales y números "pegados"

```js
// Tabla de irregulares del vocabulario académico (amplíala, no la dupliques:
// pluralSerieFicha en src/render-main/ficha-ramo.js ya trae examen/certamen/test).
const PLURALES={nota:'notas',ramo:'ramos',evaluación:'evaluaciones',examen:'exámenes',
  certamen:'certámenes',interrogación:'interrogaciones',control:'controles',
  tarea:'tareas','día':'días',semana:'semanas',crédito:'créditos',ausencia:'ausencias'};

function plural(n,singular,{cero}={}){
  const pl=PLURALES[singular]||(/[aeiouáéíóú]$/i.test(singular)?singular+'s':singular+'es');
  if(n===0&&cero)return cero;                    // plural(0,'nota',{cero:'Sin notas'})
  return `${_fmtEntero.format(n)} ${n===1?singular:pl}`;
}
// plural(1,'nota') → "1 nota" · plural(3,'evaluación') → "3 evaluaciones"
```

- Concordancia de género: "1 evaluación pendiente / 2 evaluaciones
  pendientes"; "te falta 1 nota / te faltan 2 notas" (el verbo también cambia):

```js
const faltan=n=>n===1?'Te falta 1 nota':`Te faltan ${plural(n,'nota')}`;
```

- Nunca "nota(s)", "1 notas", "0 notas" en un estado vacío.
- Al concatenar fragmentos, une con un separador explícito:
  `[a,b].filter(Boolean).join(' · ')`, nunca `${a}${b}`.
- Los tests: agrega casos 0, 1, 2 y 1.000 en el test del componente.

## 3. Petición con timeout y estados de vista

```js
// Tope para cualquier promesa de red (fetch, supabase.rpc, OCR).
function conTimeout(promesa,ms=8000,etiqueta='petición'){
  let t;
  const tope=new Promise((_,rej)=>{t=setTimeout(()=>rej(Object.assign(new Error('timeout'),{code:'TIMEOUT',etiqueta})),ms);});
  return Promise.race([promesa,tope]).finally(()=>clearTimeout(t));
}

// Ciclo de vida de una vista remota: carga → (lenta) → listo | vacío | error.
async function cargarVista(cont,{pedir,render,vacio,ms=8000,lentoMs=3000}){
  cont.setAttribute('aria-busy','true');
  const esqueleto=setTimeout(()=>{cont.innerHTML=htmlEsqueleto(cont.dataset.forma);},300);
  const lento=setTimeout(()=>cont.querySelector('.estado-lento')?.removeAttribute('hidden'),lentoMs);
  try{
    const datos=await conTimeout(pedir(),ms);
    cont.innerHTML=(!datos||datos.length===0)?htmlEstadoVista('vacio',vacio):render(datos);
  }catch(e){
    cont.innerHTML=htmlEstadoVista('error',{
      titulo:e.code==='TIMEOUT'?'Está tardando más de lo normal':'No pudimos cargar esto',
      texto:navigator.onLine?'Vuelve a intentarlo en un momento.':'Estás sin conexión. Te mostramos lo guardado en este dispositivo.',
      accion:{texto:'Reintentar',onclick:()=>cargarVista(cont,arguments[1])}
    });
    if(typeof registrarError==='function')registrarError(e);   // usa el registro existente a errores_app
  }finally{clearTimeout(esqueleto);clearTimeout(lento);cont.removeAttribute('aria-busy');}
}

function htmlEstadoVista(tipo,{titulo,texto,accion}){
  // accion.onclick se engancha con delegación; acá va solo el marcado
  return `<div class="estado-vista estado-${tipo}" role="${tipo==='error'?'alert':'status'}">
    <p class="estado-titulo">${esc(titulo)}</p>
    ${texto?`<p class="estado-texto">${esc(texto)}</p>`:''}
    ${accion?`<button type="button" class="btn-secundario estado-accion">${esc(accion.texto)}</button>`:''}
  </div>`;
}
```

Esqueleto: misma altura y estructura que el contenido final (filas con barras
`--muted`), animación de brillo apagada con `prefers-reduced-motion`.

## 4. Toast con acción (Deshacer)

Extiende el `showToast` existente; no crees otro contenedor. El `#toast` ya
tiene `role="status"` y `aria-live="polite"`.

```js
let _toastAccion=null;
function toastConAccion(msg,{accion='Deshacer',alAccionar,alVencer,ms=6000}={}){
  const t=document.getElementById('toast');
  clearTimeout(_toastTimer);
  t.innerHTML=`<span class="toast-msg">${esc(msg)}</span>`+
    (alAccionar?`<button type="button" class="toast-accion">${esc(accion)}</button>`:'');
  t.classList.add('show');
  let resuelto=false;
  const cerrar=()=>{t.classList.remove('show');t.innerHTML='';};
  const vencer=()=>{if(resuelto)return;resuelto=true;cerrar();alVencer?.();};
  const btn=t.querySelector('.toast-accion');
  btn?.addEventListener('click',()=>{if(resuelto)return;resuelto=true;clearTimeout(_toastTimer);cerrar();alAccionar();showToast('Listo, lo recuperamos');});
  // No vence mientras la persona lo está usando (puntero o foco).
  const pausar=()=>clearTimeout(_toastTimer),reanudar=()=>{_toastTimer=setTimeout(vencer,ms);};
  t.onmouseenter=pausar;t.onmouseleave=reanudar;t.onfocusin=pausar;t.onfocusout=reanudar;
  _toastTimer=setTimeout(vencer,ms);
  return vencer;   // permite confirmar antes (p. ej. si se hace otra acción destructiva)
}

// Uso: borrar evaluación con deshacer
function eliminarEvaluacionConDeshacer(ramo,idx){
  const copia=structuredClone(ramo.evaluaciones[idx]);
  ramo.evaluaciones.splice(idx,1); guardarLocal(); renderRamo(ramo);
  toastConAccion('Evaluación eliminada',{
    alAccionar:()=>{ramo.evaluaciones.splice(idx,0,copia);guardarLocal();renderRamo(ramo);},
    alVencer:()=>sincronizar()   // recién acá se propaga al servidor
  });
}
```

CSS mínimo (usa tokens; ajusta a los nombres reales):

```css
.toast{bottom:calc(16px + env(safe-area-inset-bottom));z-index:var(--z-toast,60);
  display:flex;align-items:center;gap:12px;max-width:min(92vw,480px);}
.toast .toast-accion{min-height:44px;padding:0 12px;background:none;border:0;
  color:var(--primary-light);font:inherit;font-weight:700;}
.toast .toast-accion:focus-visible{outline:2px solid currentColor;outline-offset:2px;}
@media (prefers-reduced-motion:reduce){.toast{transition:opacity var(--motion-fast) linear;transform:none;}}
```

Si encadenas dos borrados, el primero se confirma (`vencer()`) antes de mostrar
el segundo toast.

## 5. Validación de un input de nota

```js
function validarCampoNota(input,{tenant}={}){
  const v=leerNotaEscrita(input.value);
  const err=document.getElementById(input.getAttribute('aria-describedby'));
  const msg=input.value.trim()===''?'' : v===null?'Escribe una nota entre 1,0 y 7,0':'';
  input.setAttribute('aria-invalid',msg?'true':'false');
  if(err)err.textContent=msg;
  if(v!==null)input.value=nf(v);           // normaliza a coma al salir
  return msg?null:v;
}
// Engánchalo en 'blur' y al enviar; en 'input' solo limpia el error si se corrigió.
```

Marcado:

```html
<label for="nota-c1">Nota del certamen 1</label>
<input id="nota-c1" class="eval-row-input" inputmode="decimal" autocomplete="off"
       enterkeyhint="done" aria-describedby="nota-c1-error">
<p id="nota-c1-error" class="campo-error" aria-live="polite"></p>
```

## 6. Anunciar cambios de promedio

```js
function anunciar(texto){
  const r=document.getElementById('anuncio-sr')||Object.assign(document.body.appendChild(document.createElement('div')),{id:'anuncio-sr',className:'sr-only'});
  r.setAttribute('aria-live','polite');r.textContent='';requestAnimationFrame(()=>{r.textContent=texto;});
}
// anunciar(`Promedio de ${ramo.nombre}: ${fmtPromedio(prom)}. Necesitas ${nf(nec)} en el examen.`)
```
