// Una categoría colectiva no convierte cada entrega en "Controles 1".
// Los nombres propios y las notas ya guardadas siguen perteneciendo al alumno.
const fs=require('fs'),vm=require('vm'),path=require('path');
const root=path.join(__dirname,'..');
const appPath=process.env.GRADEHUB_APP||path.join(root,'app.js');
const files=['data.js','engine.js',appPath,'render-main.js','render-agenda.js'];
const stub={style:{setProperty(){},removeProperty(){}},classList:{add(){},remove(){},contains(){return false}},addEventListener(){},appendChild(){},setAttribute(){},removeAttribute(){},getAttribute(){return null},querySelectorAll(){return[]},querySelector(){return null},focus(){},value:'',innerHTML:'',textContent:'',dataset:{}};
const ctx={console,window:{addEventListener(){},matchMedia:()=>({matches:false,addEventListener(){},addListener(){}})},document:{getElementById(){return stub},createElement(){return stub},addEventListener(){},documentElement:stub,body:stub,querySelector(){return null},querySelectorAll(){return[]}},localStorage:{getItem(){return null},setItem(){},removeItem(){}},navigator:{},location:{origin:'',pathname:'/',hash:''},setTimeout,clearTimeout};
vm.createContext(ctx);
files.forEach(file=>vm.runInContext(fs.readFileSync(file,'utf8'),ctx,{filename:file}));
const run=expr=>vm.runInContext(expr,ctx);
let failures=0;
function check(label,ok){console.log((ok?'OK  ':'FAIL ')+label);if(!ok)failures++}

const ramo={nombre:'Ramo manual',origen:null};
const etiqueta=run('etiquetaCasilla');
check('Controles se muestra como Control 1',etiqueta(ramo,{nombre:'Controles',slots:3},0)==='Control 1');
check('Pruebas teóricas conserva género y singular',etiqueta(ramo,{nombre:'Pruebas teóricas',slots:2},1)==='Prueba teórica 2');
check('Controles de lectura conserva el complemento',etiqueta(ramo,{nombre:'Controles de lectura',slots:2},0)==='Control de lectura 1');
check('Trabajos prácticos concuerda en singular',etiqueta(ramo,{nombre:'Trabajos prácticos',slots:2},0)==='Trabajo práctico 1');
check('UC: Interrogaciones se muestra como Interrogación 1',etiqueta(ramo,{nombre:'Interrogaciones',slots:3},0)==='Interrogación 1');
check('FEN: Solemnes se muestra como Solemne 1',etiqueta(ramo,{nombre:'Solemnes',slots:2},0)==='Solemne 1');
check('un nombre explícito del preset manda sobre la derivación',etiqueta(ramo,{nombre:'Informes',slots:6,slotLabel:'Informe de taller',slotStart:0},0)==='Informe de taller 0');
check('un nombre desconocido no se singulariza a ciegas',etiqueta(ramo,{nombre:'Análisis',slots:2},0)==='Análisis 1');

const notaVieja={id:'n1',nombre:'Controles 1',valor:5.4,peso:1,slot:0,fecha:'2026-10-01'};
const categoria={id:'c1',nombre:'Controles',peso:100,directNota:true,slots:3,notas:[notaVieja]};
const evento={fecha:notaVieja.fecha,ramo,cat:categoria,nota:notaVieja,notas:[notaVieja],pending:false};
check('Agenda muestra el singular sin reescribir la nota antigua',run('nombreEventoAgenda')(evento)==='Control 1'&&notaVieja.nombre==='Controles 1');
check('un nombre personalizado se respeta',run('nombreEventoAgenda')({...evento,nota:{...notaVieja,nombre:'Primer control de lectura'}})==='Primer control de lectura');
check('la fila de Agenda muestra el mismo nombre',run('agendaRendidaHTML')(evento).includes('Control 1')&&!run('agendaRendidaHTML')(evento).includes('Controles 1'));
const destino={ramo:{...ramo,id:'r1'},cat:categoria,nota:notaVieja};
const key=run('claveDestinoIcs')(destino);
check('importar un calendario reconoce títulos viejos y nuevos',
  run('coincidenciaIcs')({titulo:'Controles 1 — Ramo manual'},[destino])===key&&
  run('coincidenciaIcs')({titulo:'Control 1 — Ramo manual'},[destino])===key);

const normalizar=run('normalize');
const estado=normalizar({tenant:'uc',ramos:[{id:'r1',nombre:'Manual',origen:null,categorias:[{...categoria,notas:[{...notaVieja,slot:undefined}]}],gates:[]}]});
const recuperada=estado.ramos[0].categorias[0].notas[0];
check('una nota antigua sin slot conserva su casilla y su valor',recuperada.slot===0&&recuperada.nombre==='Controles 1'&&recuperada.valor===5.4);
check('el promedio existente no cambia',run('ramoAvg')(estado.ramos[0])===5.4);

// Renombrar desde el editor debe verse también fuera de él. Solo datos sintéticos.
const ids=new Map();
function nodo(){
  const n={...stub,style:{setProperty(){},removeProperty(){}},children:[],remove(){},
    appendChild(h){this.children.push(h);return h;}};
  let html='';Object.defineProperty(n,'innerHTML',{get(){return html},set(v){html=String(v);this.children=[];}});
  return n;
}
const get=id=>{if(!ids.has(id))ids.set(id,nodo());return ids.get(id);};
ctx.document.getElementById=get;ctx.document.createElement=nodo;
run(`S=normalize({tenant:'uc',userName:'Cuenta sintética',ramos:[{
  id:'manual',nombre:'Curso sintético',color:'#123456',origen:null,gates:[],categorias:[{
    id:'fisico',nombre:'Físico',peso:100,directNota:true,slots:4,
    notas:[{id:'n-real',nombre:'Físico 1',valor:5.5,peso:1,slot:0},
      {id:'n-pendiente',nombre:'Físico 2',valor:null,peso:1,slot:1,fecha:'2026-11-10',fechaOrigen:'usuario'}]
  }]
}]});currentRamoId='manual';renderDocenteRamo=()=>{};openModal=()=>{};closeModal=()=>{};
renderAgenda=()=>{};track=()=>{};showToast=()=>{};vibrar=()=>{};simState={};simAusencias={};
globalThis.__guardados=[];save=()=>__guardados.push(JSON.stringify(S));`);
const promedioAntes=run('ramoAvg(S.ramos[0])'),avanceAntes=run('ramoProgress(S.ramos[0]).pct');
function renombrar(id,nombre,valor,fecha=''){
  get('m-nota-name').value=nombre;get('m-nota-val').value=valor;get('m-nota-fecha').value=fecha;
  get('m-pond-toggle').checked=false;run(`confirmEditNota('fisico','${id}')`);
}
renombrar('n-real','Resistencia','5.5');
renombrar('n-pendiente','Velocidad <final>','','2026-11-10');
const ficha=()=>get('cat-list').children.map(n=>n.innerHTML).join('');
check('la ficha usa los nombres editados de subnotas rendidas y pendientes',
  ficha().includes('>Resistencia</span>')&&ficha().includes('>Velocidad &lt;final&gt;</span>')
  &&!ficha().includes('>Físico 1</span>')&&!ficha().includes('>Físico 2</span>'));
check('los controles de la ficha tienen el mismo nombre accesible',
  ficha().includes('aria-label="Resistencia"')&&ficha().includes('aria-label="Velocidad &lt;final&gt;"'));
check('las subnotas sin editar mantienen su nombre automático',ficha().includes('>Físico 3</span>')&&ficha().includes('>Físico 4</span>'));
run('renderSimulador()');
check('el simulador usa el nombre guardado de la subnota pendiente y escapa su texto',
  get('sim-cats').innerHTML.includes('>Velocidad &lt;final&gt;</label>')&&!get('sim-cats').innerHTML.includes('>Físico 2</label>'));
check('el simulador conserva el nombre editado de la nota que ya tiene valor',get('sim-cats').innerHTML.includes('Resistencia:'));
check('renombrar no mueve notas, fechas, promedio ni avance',run(`
  S.ramos[0].categorias[0].notas[0].valor===5.5&&S.ramos[0].categorias[0].notas[1].valor===null
  &&S.ramos[0].categorias[0].notas[1].fecha==='2026-11-10'`)
  &&run('ramoAvg(S.ramos[0])')===promedioAntes&&run('ramoProgress(S.ramos[0]).pct')===avanceAntes);
run('S=normalize(JSON.parse(__guardados[__guardados.length-1]));renderRamo();renderSimulador();');
check('recargar datos ya guardados conserva ambos nombres en ficha y simulador',
  ficha().includes('>Resistencia</span>')&&ficha().includes('>Velocidad &lt;final&gt;</span>')
  &&get('sim-cats').innerHTML.includes('>Velocidad &lt;final&gt;</label>'));
const antesSimular=run('JSON.stringify(S)');
ctx.simNotaAlEscribir('fisico',1,{value:'6.0',dataset:{}});
check('simular no cambia el nombre ni el estado guardado',run('JSON.stringify(S)')===antesSimular);
run("showConfirm=(titulo,detalle,aceptar)=>aceptar();simCommit();S=normalize(S);renderRamo();");
check('guardar una simulación como real tampoco repone el nombre automático',
  run("S.ramos[0].categorias[0].notas.find(n=>n.slot===1).nombre")==='Velocidad <final>');

process.exit(failures?1:0);
