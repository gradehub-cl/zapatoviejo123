// En la PWA de iPhone el alto puede quedar encogido, con un recuadro vacío bajo
// la barra de pestañas. Al cerrar un campo o volver a la app se fuerza a medir de
// nuevo, sin perder el scroll y sin tocar nada si el alto está bien.
const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const raiz=__dirname+'/../';
const src=['data.js','engine.js','app.js'].map(f=>fs.readFileSync(raiz+f,'utf8')).join('\n');
const nodo=()=>({style:{setProperty(){},removeProperty(){}},classList:{add(){},remove(){},contains(){return false}},addEventListener(){},appendChild(){},setAttribute(){},removeAttribute(){},getAttribute(){return null},querySelector(){return null},querySelectorAll(){return []},focus(){}});
const lista={scrollTop:120},cambios=[];
const app={...nodo(),querySelectorAll:()=>[lista],style:{set display(v){cambios.push(v);lista.scrollTop=0;}},offsetHeight:1};
const ctx={window:{innerHeight:773,addEventListener(){},matchMedia:()=>({matches:true,addEventListener(){},addListener(){}})},
  document:{getElementById:nodo,createElement:nodo,addEventListener(){},documentElement:nodo(),querySelector:s=>s==='.app'?app:null,querySelectorAll:()=>[],body:nodo(),activeElement:null},
  localStorage:{getItem(){return null},setItem(){},removeItem(){}},navigator:{standalone:true},screen:{height:874},location:{origin:'',pathname:'/',hash:''},history:{replaceState(){}},setTimeout,clearTimeout,console};
vm.createContext(ctx);vm.runInContext(src,ctx);
const correr=()=>{cambios.length=0;vm.runInContext('recuperarAltoPwa()',ctx);return cambios.slice();};

assert.deepEqual(correr(),['none',''],'encogida: esconde y muestra .app');
assert.equal(lista.scrollTop,120,'la lista no pierde su posición');
ctx.window.innerHeight=874;
assert.deepEqual(correr(),[],'con el alto correcto no toca nada');
ctx.window.innerHeight=773;ctx.navigator.standalone=false;
assert.deepEqual(correr(),[],'Safari y Android no cambian');
ctx.navigator.standalone=true;ctx.document.activeElement={matches:()=>true};
assert.deepEqual(correr(),[],'con un campo abierto espera a que se cierre');
console.log('OK pwa-alto-encogido');
