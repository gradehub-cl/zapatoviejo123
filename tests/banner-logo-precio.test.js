// Tarjeta de Inicio (Lucas, 2026-10-25): un logo cuadrado o redondo se ve más
// grande, y el precio no va bajo el título (se ve al abrir). Datos sintéticos.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
const ctx={console,esc,URL};vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname,'../marketplace.js'),'utf8'),ctx);
const run=s=>vm.runInContext(s,ctx);
const caja=()=>{const c=new Set();return {classList:{toggle:(k,v)=>v?c.add(k):c.delete(k),remove:k=>c.delete(k),add:k=>c.add(k),has:k=>c.has(k)},clases:c};};
const logo=(w,h)=>{const p=caja();ctx.__img={parentElement:p,naturalWidth:w,naturalHeight:h,dataset:{}};run('revisarLogoClase(__img)');return p.clases.has('logo-cuadrado');};
assert.equal(logo(400,400),true,'un logo cuadrado o redondo se agranda');
assert.equal(logo(500,400),true,'casi cuadrado también');
assert.equal(logo(900,300),false,'uno ancho, como el de SalvaRamos, queda igual');
const material={id:'m1',tipo:'material',titulo:'Pack I3 Cálculo 2',precio_clp:4500,ramos_siglas:['MAT1620']};
ctx.__a=material;
assert.doesNotMatch(run('contenidoRecomendacionClase(__a)'),/4\.500|Precio/,'el material no muestra precio en Inicio');
assert.match(run('contenidoRecomendacionClase(__a)'),/Ver material ›/);
ctx.__a={id:'c1',titulo:'Cálculo II',precio_clp:15000,modalidad:'grupal',ubicacion:'online',ramos_siglas:['MAT1620'],linea_datos:['modalidad','precio']};
assert.match(run('contenidoRecomendacionClase(__a)'),/clase-apoyo-datos">Grupal</);
assert.doesNotMatch(run('contenidoRecomendacionClase(__a)'),/15\.000/,'una clase que había elegido el precio tampoco lo muestra');
assert.match(run('precioCatalogoHTML(__a)'),/15\.000/,'al abrirla, el precio sí está');
console.log('OK tarjeta de Inicio: logo cuadrado más grande y precio solo al abrir');
