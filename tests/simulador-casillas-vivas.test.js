// El simulador usa la misma pauta que la ficha: una entrada por casilla, sin
// guardar nada hasta la confirmación. Todos los ramos de esta prueba son ficticios.
const fs=require('fs'),vm=require('vm'),path=require('path');
const raiz=path.join(__dirname,'..');
const elementos=new Map();
const nodo=()=>({style:{setProperty(){},removeProperty(){}},classList:{add(){},remove(){},contains(){return false}},dataset:{},
  value:'',innerHTML:'',textContent:'',hidden:false,disabled:false,focus(){},select(){},
  setAttribute(){},removeAttribute(){},addEventListener(){},appendChild(){},querySelector(){return null},querySelectorAll(){return[]}});
const get=id=>{if(!elementos.has(id))elementos.set(id,nodo());return elementos.get(id)};
const guardados=[];
const ctx={console,window:{addEventListener(){},matchMedia:()=>({matches:false,addEventListener(){},addListener(){}})},
  document:{getElementById:get,createElement:nodo,addEventListener(){},documentElement:nodo(),body:nodo(),querySelector(){return null},querySelectorAll(){return[]}},
  localStorage:{setItem(...args){guardados.push(args)},getItem(){return null},removeItem(){}},navigator:{},
  location:{origin:'',pathname:'/',hash:''},setTimeout(){return 1},clearTimeout(){},requestAnimationFrame(){return 1}};
vm.createContext(ctx);
for(const f of ['data.js','engine.js','app.js'])vm.runInContext(fs.readFileSync(path.join(raiz,f),'utf8'),ctx,{filename:f});
const run=s=>vm.runInContext(s,ctx),chk=(nombre,ok)=>{if(!ok)throw Error(nombre);console.log('OK '+nombre)};

run(`S={tenant:'uc',userName:'',historial:[],ramos:[{id:'r',nombre:'Ramo ficticio',color:'#345678',gates:[],categorias:[
  {id:'real',nombre:'Prueba rendida',peso:25,directNota:true,notas:[{id:'n',valor:3,peso:1}]},
  {id:'casillas',nombre:'Controles',peso:25,directNota:true,slots:3,notas:[]},
  {id:'unica',nombre:'Examen',peso:25,directNota:true,notas:[]},
  {id:'abierta',nombre:'Talleres',peso:25,directNota:false,notas:[]}
]}]};currentRamoId='r';simState={};simAusencias={};
  save=()=>__guardado++;showConfirm=(titulo,detalle,aceptar)=>aceptar();
  closeModal=()=>{};renderRamo=()=>{};track=()=>{};showToast=()=>{};`);
ctx.__guardado=0;
const original=JSON.stringify(run('S'));
guardados.length=0;
run('renderSimulador()');
const html=get('sim-cats').innerHTML;
const metaAntes=get('sim-needed').textContent;
chk('slots:3 muestra tres campos propios',
  (html.match(/id="sim-in-casillas(?:-\d+)?"/g)||[]).length===3);
chk('la evaluación única muestra un campo',
  (html.match(/id="sim-in-unica(?:-\d+)?"/g)||[]).length===1);
chk('la nota real de una evaluación única impide simular otra',
  !html.includes('id="sim-in-real"'));
run("S.ramos[0].categorias[1].notas.push({id:'control-real',valor:5,peso:1,slot:1})");
run('renderSimulador()');
chk('una casilla real deja solo dos campos pendientes',
  (get('sim-cats').innerHTML.match(/id="sim-in-casillas(?:-\d+)?"/g)||[]).length===2);
run('S.ramos[0].categorias[1].notas.pop()');run('renderSimulador()');
chk('no hay botón Agregar y Falté es una acción secundaria',
  !html.includes('+ Agregar')&&/class="sim-falta-btn"[^>]*>Falté<\/button>/.test(html));

const input=(value,slot=null)=>({value,dataset:{},closest(){return null}});
const control=input('55');
run('simNotaAlEscribir')( 'casillas',0,control);
chk('55 se interpreta al escribir como 5,5',run('simState.casillas[0].valor')===5.5);
chk('el promedio proyectado cambia sin tocar Agregar',run('simProjectedAvg(S.ramos[0])')>3);
chk('Tu meta se vuelve a calcular al escribir',get('sim-needed').textContent!==metaAntes);
chk('escribir no reconstruye los campos ni quita el foco',get('sim-cats').innerHTML===html);
control.value='9';run('simNotaAlEscribir')('casillas',0,control);
chk('9 topa en 7,0',run('simState.casillas[0].valor')===7);
control.value='';run('simNotaAlEscribir')('casillas',0,control);
chk('borrar quita la hipótesis',run('(simState.casillas||[]).length')===0);

const unica=input('6,0');run('simNotaAlEscribir')('unica',null,unica);
chk('la evaluación única acepta una sola nota',
  run('(simState.unica||[]).length')===1&&run('simCatLlena(S.ramos[0].categorias[2])'));
run('renderSimulador()');
chk('su campo sigue visible para corregirla, sin ofrecer una segunda',
  (get('sim-cats').innerHTML.match(/id="sim-in-unica(?:-\d+)?"/g)||[]).length===1);

let agregado='';const contenedor={children:[],insertAdjacentHTML(pos,html){agregado=html}};
const fila={nextElementSibling:null,parentElement:contenedor};contenedor.children.push(fila);
const abierta={value:'4,5',dataset:{},closest(){return fila}};
run('simNotaAlEscribir')('abierta',null,abierta);
chk('sin slots aparece otro campo vacío al llenar el último',
  run('simState.abierta.length')===1&&/id="sim-in-abierta-1"/.test(agregado));
chk('ninguna simulación cambia S ni gradehub_v1',JSON.stringify(run('S'))===original&&guardados.length===0&&ctx.__guardado===0);

unica.value='';run('simNotaAlEscribir')('unica',null,unica);
run("simToggleFalta('unica')");
chk('Falté conserva la hipótesis de ausencia',
  run('simAusencias.unica.hacia')==='abierta'&&get('sim-cats').innerHTML.includes('Ausencia simulada'));
run("simToggleFalta('unica')");
const css=fs.readFileSync(path.join(raiz,'styles.css'),'utf8');
chk('Falté tiene objetivo táctil de al menos 44 pt',
  /\.sim-falta-btn\{[^}]*min-width:44px;min-height:44px/.test(css));

run('simCommit()');
chk('solo Guardar como reales escribe en S',ctx.__guardado===1&&run('S.ramos[0].categorias[1].notas.length')===0
  &&run('S.ramos[0].categorias[3].notas[0].valor')===4.5);
console.log('Simulador por casillas OK');
