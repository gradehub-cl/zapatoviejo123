// afterLogin pide los avisos antes de que Inicio exista. Si Inicio los pide
// mientras ese pedido sigue en vuelo, su callback no se puede perder: era el
// que pinta el aviso, y sin él el aviso no aparecía hasta la próxima visita.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const src=fs.readFileSync(path.join(__dirname,'../marketplace.js'),'utf8');
const ctx={console,Intl,setTimeout,clearTimeout};
vm.createContext(ctx);vm.runInContext(src,ctx);
let pedidos=0,soltar;
ctx.__cargar=()=>{pedidos++;return new Promise(r=>{soltar=r;});};
ctx.__llamados=[];
vm.runInContext('cargarAnunciosClases=__cargar;cargarAnunciosRecomendacion("uc",()=>__llamados.push("precarga"));cargarAnunciosRecomendacion("uc",()=>__llamados.push("inicio"))',ctx);
(async()=>{
  assert.equal(pedidos,1,'el segundo llamado reutiliza el pedido en vuelo');
  soltar([{id:'aviso-sintetico'}]);
  await new Promise(r=>setImmediate(r));
  assert.deepEqual([...ctx.__llamados],['precarga','inicio']);
  assert.equal(vm.runInContext('anunciosRecomendacion.lista[0].id',ctx),'aviso-sintetico');
  console.log('OK la precarga de avisos no pierde el pintado de Inicio');
})().catch(e=>{console.error(e);process.exitCode=1;});
