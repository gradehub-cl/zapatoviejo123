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
assert.equal(wa('+91 2345 678'),'+91 2345 678','un + explícito no se trata como celular local');
assert.equal(wa('91234'),'91234','completar solo celulares locales enteros');
assert.equal(wa('+56 9 1234 5678 anexo'),'+56 9 1234 5678 anexo','no borrar lo que hace inválido el número');
assert.equal(run("whatsappPerfilEscrito('912345678',{completar:false})"),'912345678','al escribir se conserva la posición del cursor');
const valido=e=>run(`validarPerfilDirectorio(${JSON.stringify({color_tarjeta:'#0d7a6b',...e})})`);
assert.match(valido({contacto_tipo:'whatsapp',contacto_valor:''}).error,/después del \+56 van 9 dígitos/,'WhatsApp vacío explica el formato');
assert.match(valido({contacto_tipo:'whatsapp',contacto_valor:'+56 9 1234'}).error,/después del \+56 van 9 dígitos/);
assert.equal(valido({contacto_tipo:'whatsapp',contacto_valor:'+56 9 1234 5678'}).ok,true);
assert.equal(valido({contacto_tipo:'whatsapp',contacto_valor:'+56 (9) 1234-5678'}).ok,true);
assert.equal(valido({contacto_tipo:'whatsapp',contacto_valor:'+56 9 1234 5678 anexo'}).campo,'contacto');
assert.equal(valido({contacto_tipo:'whatsapp',contacto_valor:'+56 9 1234 56789'}).campo,'contacto');
assert.equal(valido({contacto_tipo:'',contacto_valor:''}).ok,true,'sin contacto directo sigue permitido');
const contacto=run("contactoPerfilHTML({contacto_tipo:'instagram',contacto_valor:'@x'})");
assert.match(contacto,/value="instagram" checked/,'una cuenta con Instagram como contacto lo conserva');
assert.match(run('contactoPerfilHTML({})'),/value="" checked/,'sin contacto parte en Ninguno');
assert.match(run("tarjetaPerfilCamposHTML({color_tarjeta:'#1f5fbf'})"),/data-pf-color="#1f5fbf"[^>]*aria-pressed="true"/);
assert.match(run("iconoCanalPerfil('whatsapp')"),/fill="currentColor"/);
ctx.__p={nombre_publico:'Sintética',presentacion:'x',ramos_siglas:['TST100'],contacto_tipo:'whatsapp',contacto_valor:'+56 9 1234 5678'};
assert.match(run("perfilPublicoHTML(__p,null,{TST100:'Ramo de prueba'})"),/TST100<\/strong><span>Ramo de prueba/,'la lista entera usa los nombres del buscador');
// Muchos ramos (una plataforma): arriba solo siglas, hasta seis y «+N». Quien
// mira solo ve los de su universidad cuando el perfil enseña en varias.
ctx.__p2={...ctx.__p,universidades:['uc','uai'],ramos_siglas:['TST100','TST200','TST300','TST400','TST500','TST600','TST700','XYZ999']};
{
  const todos={TST100:'Uno',TST200:'Dos',TST300:'Tres',TST400:'Cuatro',TST500:'Cinco',TST600:'Seis',TST700:'Siete'};
  ctx.__todos=todos;
  const html=run("S.tenant='uc';perfilPublicoHTML(__p2,null,__todos)");
  const chips=html.match(/<ul class="perfil-apoyo-chips">([\s\S]*?)<\/ul>/)[1];
  assert.equal((chips.match(/<li>TST/g)||[]).length,6,'seis siglas a la vista');
  assert.match(chips,/>\+1<\/li>/);
  assert.doesNotMatch(chips,/Uno|Dos/,'arriba no van los nombres');
  assert.match(html,/7 ramos en la UC/);
  assert.doesNotMatch(html,/XYZ999/,'una sigla que su universidad no conoce no se muestra');
  assert.match(html,/<summary>Ver los 7 ramos<\/summary>/);
  assert.match(html,/class="perfil-apoyo" style="--directorio-color:#/,'el perfil abierto conserva su color');
  // Perfil de una sola universidad: se ven todas, aunque alguna no tenga nombre.
  ctx.__p3={...ctx.__p,universidades:['uc'],ramos_siglas:['TST100','XYZ999']};
  const solo=run("perfilPublicoHTML(__p3,null,__todos)");
  assert.match(solo,/XYZ999/);assert.match(solo,/2 ramos · UC/);
  // Siglas de BuscaCursos fuera del catálogo: tienen nombre en Apoyo.
  assert.equal(run("nombresRamosParaClases('uc').MAT1100"),'Cálculo I');
  assert.equal(run("nombresRamosParaClases('uai').MAT1100"),undefined,'solo para la UC');
}
assert.equal(run("buscarRamosParaClase({MAT1620:'Cálculo II',FIS1514:'Dinámica'},'mat16',[])[0].nombre"),'Cálculo II','por sigla dice el nombre');
console.log('PASS perfil: teléfono, contacto, color, íconos, vista previa y búsqueda por sigla');
