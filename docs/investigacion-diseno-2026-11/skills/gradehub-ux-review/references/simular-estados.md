# Simular estados con Playwright (datos sintéticos)

Fragmentos para pegar en un script como `scripts/capturas.cjs` o en
`tests/browser/*.cjs`. Siguen el patrón del repo: host ficticio, red externa
cortada, `serviceWorkers:'block'`.

## Respuesta lenta / timeout de Supabase

```js
// Reemplaza el cliente por uno sintético que tarda (o nunca responde).
await page.evaluate(()=>{
  supabaseClient={...supabaseClient,rpc:(n,p)=>new Promise(res=>setTimeout(()=>res({data:[]}),12000))};
});
await page.waitForTimeout(3500);
await page.screenshot({path:'/tmp/gh-ux/lento-3s.png'});   // debe decir "Sigue cargando…"
await page.waitForTimeout(6000);
await page.screenshot({path:'/tmp/gh-ux/timeout.png'});   // debe mostrar error + Reintentar
```

## Error del servidor

```js
await page.evaluate(()=>{supabaseClient={...supabaseClient,rpc:async()=>({error:{code:'42501',message:'permission denied'}})};});
// Esperado: mensaje humano, sin "42501", con acción.
```

## Sin conexión

```js
await context.setOffline(true);
await page.evaluate(()=>window.dispatchEvent(new Event('offline')));
// Esperado: se ven los datos de gradehub_v1 y un aviso "Sin conexión…".
await context.setOffline(false);
await page.evaluate(()=>window.dispatchEvent(new Event('online')));
```

## Ingreso de notas y validación

```js
const campo=page.locator('.eval-row-input').first();
for(const v of ['5.5','5,5','8','0,5','abc','']){
  await campo.fill(v);await campo.blur();
  console.log(v,'→',await campo.inputValue(),await campo.getAttribute('aria-invalid'));
}
```

## Toast con Deshacer

```js
// Dispara el borrado por la interfaz (no llamando funciones internas) y verifica:
const toast=page.locator('#toast');
await toast.getByRole('button',{name:'Deshacer'}).click();
// Esperado: la evaluación vuelve en la misma posición y con el mismo valor.
```

## Teclado y foco

```js
for(let i=0;i<25;i++){
  await page.keyboard.press('Tab');
  const f=await page.evaluate(()=>{const e=document.activeElement;const s=getComputedStyle(e);
    return `${e.tagName} «${(e.getAttribute('aria-label')||e.textContent||'').trim().slice(0,30)}» outline:${s.outlineStyle}/${s.outlineWidth} shadow:${s.boxShadow!=='none'}`;});
  console.log(i,f);       // cada paso debe tener foco visible (outline o box-shadow)
}
```

## Árbol accesible

```js
console.log(await page.locator('body').ariaSnapshot());   // Playwright ≥ 1.49
// Revisa: botones con nombre, inputs con label, encabezados en orden, role=switch.
```

## Contraste exacto de un par de tokens

```js
const ratio=await page.evaluate(([a,b])=>{
  const cv=document.createElement('canvas').getContext('2d');
  const rgb=c=>{cv.fillStyle=c;cv.fillRect(0,0,1,1);return [...cv.getImageData(0,0,1,1).data].slice(0,3);};
  const L=c=>rgb(c).map(v=>(v/=255)<=.03928?v/12.92:((v+.055)/1.055)**2.4).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0);
  const css=n=>getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  const x=L(css(a)),y=L(css(b));return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);
},['--fg3','--card']);
```
