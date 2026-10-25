// Código de descuento (Lucas, 2026-10-25): el anuncio dice «−10% con el código
// XXX». El WhatsApp NO lo incluye (lo da el estudiante). Datos sintéticos.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
const ctx={console,esc,URL};vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname,'../marketplace.js'),'utf8'),ctx);
const run=s=>vm.runInContext(s,ctx);
const con=a=>{ctx.__a={id:'a1',titulo:'Clase sintética',precio_clp:10000,ramos_siglas:['MAT1620'],...a};return ctx.__a;};
con({descuento_gradehub_pct:10,codigo_descuento:'salva10'});
assert.match(run('precioCatalogoHTML(__a)'),/−10% con el código SALVA10/,'con código, la etiqueta lo dice');
assert.match(run('precioCatalogoHTML(__a)'),/\$9\.000/,'y el precio sigue con el descuento');
assert.doesNotMatch(run('mensajeContactoClase(__a)'),/SALVA10|código/,'el WhatsApp no lleva el código');
con({descuento_gradehub_pct:10});
assert.match(run('precioCatalogoHTML(__a)'),/−10% por venir de GradeHub/,'sin código, como antes');
con({codigo_descuento:'SALVA10'});
assert.doesNotMatch(run('precioCatalogoHTML(__a)'),/código/,'un código sin descuento no se muestra');
con({descuento_gradehub_pct:10,codigo_descuento:'<b>x</b>'});
assert.match(run('precioCatalogoHTML(__a)'),/por venir de GradeHub/,'un código con otra forma se ignora, nunca entra como HTML');
assert.doesNotMatch(run('precioCatalogoHTML(__a)'),/<b>x/);
assert.equal(run('CAPAS_CAMPOS_CLASE.at(-1)'),',codigo_descuento','el catálogo lo pide en su propia capa: sin el SQL, se lee lo demás');
// Admin: el campo aparece solo si el SQL del código está.
con({estado:'borrador',descuento_gradehub_pct:10,codigo_descuento:'SALVA10'});
const sin=run(`editorDescuentoAdminHTML(__a,'listo',false)`),conCodigo=run(`editorDescuentoAdminHTML(__a,'listo',true)`);
assert.doesNotMatch(sin,/data-descuento-codigo/);
assert.match(conCodigo,/data-descuento-codigo value="SALVA10"/);
assert.match(conCodigo,/Actual: <b>10% con el código SALVA10/);
console.log('OK código de descuento: etiqueta, sin WhatsApp, sin descuento no se muestra, capa propia y campo admin');
