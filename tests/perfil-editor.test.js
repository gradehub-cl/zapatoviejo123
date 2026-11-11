// Clases › Perfil: el teléfono se completa como en el anuncio, los ramos se
// buscan por sigla y la vista previa muestra lo que se abre. Datos sintéticos.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const nodo=()=>({style:{setProperty(){},removeProperty(){}},classList:{add(){},remove(){},contains(){return false},toggle(){}},addEventListener(){},appendChild(){},setAttribute(){},removeAttribute(){},querySelector(){return nodo()},querySelectorAll(){return []},dataset:{}});
const ctx={console,setTimeout,clearTimeout,Intl,URL,window:{addEventListener(){},matchMedia:()=>({matches:false,addEventListener(){},addListener(){}})},
 document:{getElementById:nodo,createElement:nodo,addEventListener(){},documentElement:nodo(),body:nodo(),querySelector:()=>null,querySelectorAll:()=>[]},
 navigator:{},location:{origin:'',pathname:'/',search:'',hash:''},localStorage:{getItem:()=>null,setItem(){},removeItem(){}},history:{replaceState(){}}};
vm.createContext(ctx);
for(const f of ['data.js','engine.js','app.js','marketplace.js'])vm.runInContext(fs.readFileSync(__dirname+'/../'+f,'utf8'),ctx);
const run=s=>vm.runInContext(s,ctx);
run('S=normalize({tenant:"uc",ramos:[],historial:[]});');
const wa=t=>run(`whatsappPerfilEscrito(${JSON.stringify(t)})`);
assert.equal(wa('912345678'),'+56 9 1234 5678','sin código se completa');
assert.equal(wa('9 1234 5678'),'+56 9 1234 5678');
assert.equal(wa('+56912345678'),'+56 9 1234 5678');
assert.equal(wa('+56 9 1234 56789'),'+56 9 1234 56789','no se corta: lo que sobra queda a la vista');
assert.equal(wa('+1 555 123'),'+1 555 123','otro país se deja igual');
const valido=e=>run(`validarPerfilDirectorio(${JSON.stringify({color_tarjeta:'#0d7a6b',...e})})`);
assert.match(valido({contacto_tipo:'whatsapp',contacto_valor:''}).error,/después del \+56 van 9 dígitos/,'WhatsApp vacío explica el formato');
assert.match(valido({contacto_tipo:'whatsapp',contacto_valor:'+56 9 1234'}).error,/después del \+56 van 9 dígitos/);
assert.equal(valido({contacto_tipo:'whatsapp',contacto_valor:'+56 9 1234 5678'}).ok,true);
assert.equal(valido({contacto_tipo:'',contacto_valor:''}).ok,true,'sin contacto directo sigue permitido');
const contacto=run("contactoPerfilHTML({contacto_tipo:'instagram',contacto_valor:'@x'})");
assert.match(contacto,/value="instagram" checked/,'una cuenta con Instagram como contacto lo conserva');
assert.match(run('contactoPerfilHTML({})'),/value="" checked/,'sin contacto parte en Ninguno');
assert.match(run("tarjetaPerfilCamposHTML({color_tarjeta:'#1f5fbf'})"),/data-pf-color="#1f5fbf"[^>]*aria-pressed="true"/);
assert.match(run("iconoCanalPerfil('whatsapp')"),/fill="currentColor"/);
ctx.__p={nombre_publico:'Sintética',presentacion:'x',ramos_siglas:['TST100'],contacto_tipo:'whatsapp',contacto_valor:'+56 9 1234 5678'};
assert.match(run("perfilPublicoHTML(__p,null,{TST100:'Ramo de prueba'})"),/TST100<\/strong><span>Ramo de prueba/,'la vista previa usa los nombres del buscador');
assert.equal(run("buscarRamosParaClase({MAT1620:'Cálculo II',FIS1514:'Dinámica'},'mat16',[])[0].nombre"),'Cálculo II','por sigla dice el nombre');
console.log('PASS perfil: teléfono, contacto, color, íconos, vista previa y búsqueda por sigla');
