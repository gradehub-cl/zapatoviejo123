// Pautas sintéticas: la presentación no cambia la meta ni guarda una nota al
// abrir el campo. Escribir reutiliza las operaciones existentes y sus metadatos.
const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
function nodo(){const attrs={},listeners={};return {style:{setProperty(){},removeProperty(){}},classList:{add(){},remove(){},contains(){return false}},dataset:{},value:'',isConnected:true,children:[],innerHTML:'',textContent:'',listeners,
 addEventListener(k,f){listeners[k]=f;},appendChild(){},setAttribute(k,v){attrs[k]=String(v);},getAttribute(k){return attrs[k]||null;},removeAttribute(k){delete attrs[k];},querySelector(){return null;},querySelectorAll(){return [];},replaceWith(n){this.reemplazo=n;},focus(){this.enfocado=true;},select(){}};}
const stub=nodo();const ctx={console,setTimeout,clearTimeout,window:{addEventListener(){},matchMedia:()=>({matches:true,addEventListener(){}})},document:{getElementById:()=>stub,createElement:nodo,documentElement:stub,body:stub,addEventListener(){},querySelector:()=>stub,querySelectorAll:()=>[]},localStorage:{getItem(){return null;},setItem(){},removeItem(){}},navigator:{},location:{origin:'',pathname:'/',hash:''}};
vm.createContext(ctx);for(const f of ['data.js','engine.js','app.js','render-main.js','render-agenda.js'])vm.runInContext(fs.readFileSync(__dirname+'/../'+f,'utf8'),ctx);
const run=s=>vm.runInContext(s,ctx);
run(`S=normalize({tenant:'uc',ramos:[{id:'r',nombre:'Ramo sintético',creditos:10,gates:[],categorias:[
 {id:'p',nombre:'Pruebas',peso:60,directNota:true,slots:3,notas:[{id:'n',slot:0,nombre:'P1 personalizada',peso:1,valor:3.6},{id:'pend',slot:1,nombre:'P2 personalizada',peso:1,valor:null,fecha:'2026-11-05',hora:'10:00',recorreccionPendiente:true}]},
 {id:'ex',nombre:'Examen',peso:40,directNota:true,notas:[]}
]}]});currentRamoId='r';renderRamo=()=>{};save=()=>{__guardados++};track=()=>{};animarPromedio=()=>{};mostrarEcoGpa=()=>{};showToast=()=>{};__guardados=0;`);
const antes=run('JSON.stringify(S)');
const barra=run('barraCategoriaFichaHTML(S.ramos[0],S.ramos[0].categorias[0],calculoRamoConCompuertas(S.ramos[0]))');
assert.match(barra,/--ficha-peso:60%/);
assert.match(barra,/--ficha-evaluado:33\.333333/,'una nota no da por cerrado el 60% del ramo');
assert.equal(run('JSON.stringify(S)'),antes,'dibujar la barra no cambia la cuenta');
assert.match(run('medidorFichaHTML(notaNecesariaParaAprobar(S.ramos[0]).valor)'),/Necesitas 4\.1 en lo pendiente/,'misma meta del motor');
assert.match(run('medidorFichaHTML(8)'),/Sin salida/);assert.match(run('medidorFichaHTML(8)'),/<strong>—<\/strong>/);
assert.match(run("medidorFichaHTML(4.1,'',true)"),/En cada evaluación pendiente/,'conserva la condición de las compuertas');
// Series: solo un índice de lectura; categorías y motor conservan su identidad.
const directa=(id,nombre,peso,v)=>({id,nombre,peso,directNota:true,slots:1,notas:v==null?[]:[{id:'n-'+id,nombre,valor:v,peso:1}]});
const categorias=[directa('i1','Interrogación 1',20,5),directa('i2','Interrogación 2',20,4),directa('i3','I3',20,null),directa('ex','Examen',40,null)];
ctx.__serie={id:'serie',nombre:'Pauta propia',creditos:10,categorias,gates:[{type:'min_grade_required',catId:'ex',min:3,cap:3.9}]};
const modelo=run('JSON.stringify(__serie)'),promedio=run('ramoAvg(__serie)'),necesaria=run('notaNecesariaParaAprobar(__serie).valor');
assert.equal(run('seriesNumeradasFicha(__serie.categorias).get("i1").nombre'),'Interrogaciones');
assert.equal(run('seriesNumeradasFicha(__serie.categorias).get("i3").categorias.length'),3);
assert.equal(run('seriesNumeradasFicha(__serie.categorias).has("ex")'),false);
const barraSerie=run('barraCategoriaFichaHTML(__serie,{nombre:"Interrogaciones"},calculoRamoConCompuertas(__serie),seriesNumeradasFicha(__serie.categorias).get("i1").categorias)');
assert.match(barraSerie,/--ficha-evaluado:66\.666/,'I3 sin casillas sigue pendiente en la pista del grupo');
assert.equal(run('JSON.stringify(__serie)'),modelo,'no fusiona, renombra ni persiste categorías');
assert.equal(run('ramoAvg(__serie)'),promedio);assert.equal(run('notaNecesariaParaAprobar(__serie).valor'),necesaria,'la misma meta, incluso con compuerta sobre una categoría');
assert.equal(run('seriesNumeradasFicha([__serie.categorias[0]]).size'),0,'una serie con un solo integrante queda intacta');
assert.equal(run('barraCategoriaFichaHTML(__serie,__serie.categorias[3],calculoRamoConCompuertas(__serie))'),'','Examen de una evaluación sin pista');
for(const [singular,plural] of [['Solemne','Solemnes'],['Control','Controles'],['Prueba','Pruebas'],['Entrega','Entregas']]){
 ctx.__nombres=[directa('a',singular+' 1',50,null),directa('b',singular+' 2',50,null)];assert.equal(run('seriesNumeradasFicha(__nombres).get("a").nombre'),plural);
}
ctx.__nombres=[directa('a','Prueba 1',50,null),directa('b','Prueba 1',50,null)];assert.equal(run('seriesNumeradasFicha(__nombres).size'),0,'índices repetidos no se juntan por accidente');
ctx.__nombres=[directa('a','C1',50,null),directa('b','C2',50,null)];assert.equal(run('seriesNumeradasFicha(__nombres).get("a").nombre'),'C','no inventa Control cuando C también podría ser Certamen');
ctx.__nombres=[directa('a','Certamen 1',50,null),directa('b','C2',50,null)];assert.equal(run('seriesNumeradasFicha(__nombres).get("a").nombre'),'Certámenes');
assert.equal(run('pluralSerieFicha("Control de lectura")'),'Controles de lectura');assert.equal(run('pluralSerieFicha("Trabajo práctico")'),'Trabajos prácticos');
function abrir(slot){const boton=nodo();boton.dataset={catId:slot===null?'ex':'p',...(slot===null?{}:{slot:String(slot)})};ctx.__boton=boton;run('abrirNotaEnFila(__boton)');return {boton,input:boton.reemplazo};}
let {boton,input}=abrir(1);
assert(input.enfocado);assert.equal(input.inputMode,'decimal','la casilla abre el teclado numérico');assert.equal(run('JSON.stringify(S)'),antes);assert.equal(run('__guardados'),0);
input.value='';input.listeners.blur();assert.equal(input.reemplazo,boton);assert.equal(run('JSON.stringify(S)'),antes,'salir vacío no borra fecha ni nombre');
({boton,input}=abrir(1));input.value='xyz';input.listeners.blur();assert.equal(input.getAttribute('aria-invalid'),'true');assert.equal(run('__guardados'),0);
input.value='5,2';input.listeners.blur();
const nota=JSON.parse(run('JSON.stringify(S.ramos[0].categorias[0].notas.find(n=>n.slot===1))'));
assert.equal(nota.valor,5.2);assert.equal(nota.id,'pend');assert.equal(nota.nombre,'P2 personalizada');assert.equal(nota.fecha,'2026-11-05');assert.equal(nota.hora,'10:00');assert.equal(run('__guardados'),1);
input.listeners.blur();assert.equal(run('__guardados'),1,'no guarda dos veces el mismo campo');
({input}=abrir(null));input.value='A';input.listeners.blur();assert.equal(run('S.ramos[0].categorias[1].notas[0].calificacionConceptual'),'A');assert.equal(run('S.ramos[0].categorias[1].notas[0].valor'),5);
console.log('OK: barra fiel al motor; entrada inline conserva nombres, fechas, conceptos y persistencia existente');
