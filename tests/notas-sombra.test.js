// Pautas propias. Las hipótesis pasan por el motor, sin escribir en S.
const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const el=()=>({style:{setProperty(){},removeProperty(){}},classList:{add(){},remove(){},contains(){return false}},value:'',innerHTML:'',dataset:{},addEventListener(){},appendChild(){},setAttribute(){},removeAttribute(){},getAttribute(){return null},querySelector(){return null},querySelectorAll(){return[]},focus(){}});
const stub=el(),ctx={console,setTimeout,clearTimeout,window:{addEventListener(){},matchMedia:()=>({matches:true,addEventListener(){},addListener(){}})},document:{getElementById:()=>stub,createElement:el,addEventListener(){},documentElement:stub,body:stub,querySelector:()=>null,querySelectorAll:()=>[]},localStorage:{getItem(){return null},setItem(){throw Error('Una hipótesis no se guarda')},removeItem(){}},navigator:{},location:{origin:'',pathname:'/',hash:''}};
vm.createContext(ctx);for(const f of ['data.js','engine.js','app.js','render-main.js'])vm.runInContext(fs.readFileSync(__dirname+'/../'+f,'utf8'),ctx);
const run=s=>vm.runInContext(s,ctx),json=s=>JSON.parse(run('JSON.stringify('+s+')'));
const cat=(nombre,peso,valor=null,extra={})=>({id:nombre,nombre,peso,directNota:true,notas:valor===null?[]:[{id:'n-'+nombre,nombre,valor,peso:1}],...extra});
const curso=(cats,extra={})=>({id:'propio',nombre:'Ramo sintético',origen:null,gates:[],categorias:cats,...extra});
function cargar(r){ctx.__r=r;run("S={tenant:'uc',tipoCuenta:'estudiante',ramos:[__r],historial:[]};var r=S.ramos[0];");return run('modeloNotasSombra(r)');}
const porNombre=(m,n)=>m.pendientes.find(p=>p.nombre===n);
let m=cargar(curso([cat('Rendida',20,3.2),cat('Prueba pendiente',40),cat('Examen',40)]));
assert.equal(m.necesaria,4.2);assert.equal(m.auto.size,0);assert.equal(m.libres.length,2);
assert.equal(run('nfNecesaria(notaNecesariaParaAprobar(r).valor)'),m.necesaria.toFixed(1),'sin piso aislado se conserva la respuesta del medidor existente');
const antes=run('JSON.stringify(S)'),promedio=run('gpa(S.ramos)');
run('var vista=notasSombraDelRamo(r);');assert.equal(run('JSON.stringify(S)'),antes);assert.equal(run('gpa(S.ramos)'),promedio);
ctx.__m=m;assert(run("botonNotaSombraHTML({...__m,sesion:{abierta:null}},__m.pendientes[0])").includes('necesitas 4,2'));
// El piso del examen no se exige a todas las otras casillas.
m=cargar(curso([cat('Rendida',50,5.2),cat('Trabajo',20),cat('Examen',30)],{gates:[{type:'min_grade_required',catId:'Examen',min:3.5,cap:3.9}]}));
assert.equal(m.auto.get(porNombre(m,'Examen').clave),3.5);assert.equal(m.necesaria,1.5);
assert.equal(m.estado,'ok','todavía debe cumplir el mínimo, no se dice ya aprobado');
// Con pisos distintos solo se libera el menor: la sombra sigue siendo suficiente.
m=cargar(curso([cat('Rendida',20,3),cat('Trabajo',30),cat('Práctico',20),cat('Examen',30)],{gates:[{type:'min_grade_required',catId:'Práctico',min:3.5,cap:3.9},{type:'min_grade_required',catId:'Examen',min:5,cap:3.9}]}));
assert.equal(m.auto.size,1);assert.equal(m.auto.get(porNombre(m,'Examen').clave),5);assert.equal(m.necesaria,3.7);assert.equal(m.libres.length,2);
// Si sube la exigencia, el examen vuelve a participar del reparto parejo.
m=cargar(curso([cat('Rendida',30,2.3),cat('Trabajo',40),cat('Examen',30)],{gates:[{type:'min_grade_required',catId:'Examen',min:3.5,cap:3.9}]}));
assert.equal(m.auto.size,0);assert.equal(m.necesaria,4.7);
ctx.__fijas=new Map([[porNombre(m,'Examen').clave,4.5]]);
m=run('modeloNotasSombra(r,__fijas)');assert.equal(m.necesaria,4.8);assert.equal(m.libres[0].nombre,'Trabajo');
assert(run('textoEstadoSombra(modeloNotasSombra(r,__fijas),modeloNotasSombra(r,__fijas).pendientes.find(p=>p.nombre==="Examen"))').includes('Si sacas 4,5 en el examen, necesitas 4,8'));
// Lo fijado vive aparte: promedio, estado y exportación siguen siendo reales.
const guardado=run('JSON.stringify(S)'),real=run('gpa(S.ramos)');run('modeloNotasSombra(r,__fijas)');assert.equal(run('JSON.stringify(S)'),guardado);assert.equal(run('gpa(S.ramos)'),real);
ctx.__bajo=new Map([[porNombre(m,'Examen').clave,1]]);assert.equal(run('modeloNotasSombra(r,__bajo).fijas.values().next().value'),3.5,'no permite fijar por debajo del mínimo');
m=cargar(curso([cat('Rendida',80,1),cat('Examen',20)]));assert.equal(m.estado,'no');assert(m.necesaria>7);
m=cargar(curso([cat('Rendida',80,6),cat('Examen',20)]));assert.equal(m.estado,'ya');assert.equal(m.necesaria,1);
// Con una fijada ya alcanza, pero todavía es una hipótesis.
m=cargar(curso([cat('Rendida',50,5),cat('Trabajo',20),cat('Examen',30)]));ctx.__fijas=new Map([[porNombre(m,'Examen').clave,6]]);m=run('modeloNotasSombra(r,__fijas)');assert.equal(m.estado,'ya');assert(run('textoEstadoSombra(modeloNotasSombra(r,__fijas))').startsWith('Con lo que fijaste'));
ctx.__fijas.set(porNombre(m,'Trabajo').clave,5);m=run('modeloNotasSombra(r,__fijas)');assert.equal(m.estado,'cerrado');assert.equal(m.final,5.3);
assert.equal(run('notaFinalOficial(3.95)'),4);assert.equal(run('notaFinalOficial(3.949)'),3.9);
m=cargar(curso([cat('Nota',100)]));assert.equal(m.necesaria,4,'la sombra sube a la décima suficiente, no pide 4,0 bruto al motor');
ctx.__p=m.pendientes;ctx.__v=new Map([[m.pendientes[0].clave,3.95]]);assert.equal(run('notaFinalOficial(ramoAvg(proyectarNotasSombra(r,__p,__v)))'),4);
// Llega la nota real: ya no es pendiente y se descarta también su fijación.
run("var sesion=notasSombraDelRamo(r);sesion.sesion.fijas.set(sesion.pendientes[0].clave,6);r.categorias.find(c=>c.nombre==='Nota').notas=[{id:'real',nombre:'Nota',valor:5}];");
assert.equal(run('notasSombraDelRamo(r)'),null);assert.equal(run('sesion.sesion.fijas.size'),0);
// Casillas: los ids de hojas y notas reales se conservan al proyectar.
m=cargar(curso([cat('Controles',60,null,{slots:3,notas:[{id:'hecha',nombre:'C1 propio',slot:0,valor:5,peso:1,fecha:'2026-10-01'}]}),cat('Examen',40)]));
assert.equal(m.pendientes.length,3);assert.equal(porNombre(m,'Examen').slot,null);assert(m.pendientes.filter(p=>p.catId==='Controles').every(p=>[1,2].includes(p.slot)));
const copia=run('JSON.stringify(S)');run('notasSombraDelRamo(r)');assert.equal(run('JSON.stringify(S)'),copia);
// La cifra de cada libre y la que alimenta el medidor son literalmente la misma.
ctx.__m=m;for(const p of m.libres){ctx.__p=p;assert.equal(run('valorNotaSombra(__m,__p)'),m.necesaria);}
assert.match(run('medidorFichaHTML(__m.necesaria)'),new RegExp('<strong[^>]*>'+m.necesaria.toFixed(1).replace('.',',')+'</strong>'),'la sombra y el mensaje de la ficha dicen la misma cifra');
// Sin respuesta exacta se vuelve a + Nota y al comportamiento anterior.
assert.equal(cargar(curso([cat('Sin cantidad',100,null,{directNota:false})])),null);
assert.equal(cargar(curso([cat('Con descarte',100,null,{slots:3,dropLowest:{count:1}})])),null);
assert.equal(cargar(curso([cat('Parcial',40)])),null);
assert.equal(cargar(curso([cat('A',50),cat('B',50)],{gates:[{type:'group_min',catIds:['A','B'],min:4,cap:3.9}]})),null);
assert.equal(cargar(curso([cat('A',100)],{aporta:{ramo:'Laboratorio',peso:30,min:4}})),null);
assert.equal(cargar(curso([cat('A',50),cat('B',50)],{gates:[{type:'conditional_weights',pauta:[{catId:'A',nombre:'A',peso:50,slots:1},{catId:'B',nombre:'B',peso:50,slots:1}]}]})),null);
assert.equal(cargar(curso([cat('Completa',100,5)])),null);assert.equal(cargar(curso([])),null);
// La meta de la ficha con lo fijado o con el examen en su mínimo. La primera
// versión buscaba piezas del medidor que #977 sacó: el error cortaba el
// repintado del slider y la ficha (Lucas, 2026-11-03).
{
  const chip=el(),getById=ctx.document.getElementById;ctx.document.getElementById=id=>id==='ramo-min-chip'?chip:stub;
  m=cargar(curso([cat('Rendida',50,5.2),cat('Trabajo',20),cat('Examen',30)],{gates:[{type:'min_grade_required',catId:'Examen',min:3.5,cap:3.9}]}));
  ctx.__m=m;run('pintarMetaNotasSombra(__m)');
  assert.match(chip.innerHTML,/Necesitas <strong[^>]*>1,5<\/strong> en las otras pendientes para aprobar/);
  ctx.__m={...m,estado:'no',necesaria:null};run('pintarMetaNotasSombra(__m)');
  assert.match(chip.innerHTML,/Ya no es posible aprobar/);
  ctx.document.getElementById=getById;
}
// El examen se muestra al final sin reordenar la pauta guardada.
ctx.__cats=[cat('Examen',30),cat('Laboratorio',20),cat('Interrogación 1',50)];
assert.deepEqual(json('ordenCategoriasFicha(__cats).map(c=>c.nombre)'),['Laboratorio','Interrogación 1','Examen']);
assert.equal(run('__cats[0].nombre'),'Examen');
// Lucas, 2026-11-03: el slider solo en el examen. Tocar otra sombra abre la nota real.
m=cargar(curso([cat('Rendida',20,3.2),cat('Prueba pendiente',40),cat('Examen',40)]));ctx.__m={...m,sesion:{abierta:null}};
const botonPrueba=run("botonNotaSombraHTML(__m,__m.pendientes.find(p=>p.nombre==='Prueba pendiente'))"),botonExamen=run("botonNotaSombraHTML(__m,__m.pendientes.find(p=>p.nombre==='Examen'))");
assert(!botonPrueba.includes('aria-expanded')&&!botonPrueba.includes('fijar'),'la prueba no ofrece fijar');
assert(botonExamen.includes('aria-expanded="false"')&&botonExamen.includes('fijar o anotar'),'el examen sí');
run("var __abiertas=[];var __renders=0;var __abrirReal=abrirNotaEnFila,__render=renderRamo;abrirNotaEnFila=b=>__abiertas.push(b.dataset.sombraClave);renderRamo=()=>__renders++;currentRamoId=r.id;");
ctx.__clave=porNombre(m,'Prueba pendiente').clave;
run("var __sesion=notasSombraDelRamo(r).sesion;__sesion.abierta=null;abrirSombraEnFila({dataset:{sombraClave:__clave}})");
assert.deepEqual(json('__abiertas'),[ctx.__clave]);assert.equal(run('__renders'),0);assert.equal(run('__sesion.abierta'),null,'no abre el panel en la prueba');
ctx.__clave=porNombre(m,'Examen').clave;run("abrirSombraEnFila({dataset:{sombraClave:__clave}})");
assert.equal(run('__sesion.abierta'),ctx.__clave);assert.equal(run('__renders'),1);
run('abrirNotaEnFila=__abrirReal;renderRamo=__render;');
// Lucas, 2026-11-03: apagar es una preferencia del dispositivo; las fijaciones
// siguen vivas en la sesión y el modelo permanece disponible para el switch.
m=cargar(curso([cat('Rendida',20,3.2),cat('Prueba pendiente',40),cat('Examen',40)]));
run("currentRamoId=r.id;var __sesionSwitch=notasSombraDelRamo(r).sesion;var __examen=notasSombraDelRamo(r).pendientes.find(p=>p.nombre==='Examen');__sesionSwitch.fijas.set(__examen.clave,6);var __conFijas=notasSombraDelRamo(r);");
const previoSwitch=run('JSON.stringify(S)'),necesariaFijada=run('__conFijas.necesaria');
assert.equal(run('sombrasActivadas()'),true);
assert.match(run('interruptorSombrasHTML(__conFijas)'),/for="sombras-activadas"/);
assert.match(run('interruptorSombrasHTML(__conFijas)'),/<span>Notas sombra<\/span>/);
assert.match(run('interruptorSombrasHTML(__conFijas)'),/type="checkbox" role="switch" checked/);
assert.equal(run('interruptorSombrasHTML(null)'),'','un ramo sin modelo no ofrece interruptor');
const storagePrevio=ctx.localStorage;const escriturasSwitch=[];
ctx.localStorage={...storagePrevio,setItem:(k,v)=>escriturasSwitch.push([k,v])};
run('var __renderSwitch=renderRamo;var __vecesSwitch=0;renderRamo=()=>__vecesSwitch++;cambiarSombras(false);');
assert.equal(run('sombrasActivadas()'),false);
assert.match(run("botonNotaEnFilaHTML('Examen',null,'Examen',__conFijas)"),/>\+ Nota<\/button>/);
assert.doesNotMatch(run("botonNotaEnFilaHTML('Examen',null,'Examen',__conFijas)"),/nota-sombra|data-sombra/);
assert.doesNotMatch(run('interruptorSombrasHTML(notasSombraDelRamo(r))'),/ checked/,'se puede volver a encender desde el mismo lugar');
ctx.__clApagada={querySelectorAll(){throw Error('No montar panel ni pie apagados')},appendChild(){throw Error('No agregar pie apagado')}};
run('montarNotasSombra(r,__conFijas,__clApagada)');
assert.equal(run('__sesionSwitch.fijas.get(__examen.clave)'),6);
assert.equal(run('JSON.stringify(S)'),previoSwitch);
run('cambiarSombras(true)');
assert.match(run("botonNotaEnFilaHTML('Examen',null,'Examen',notasSombraDelRamo(r))"),/nota-sombra sombra-fija/);
assert.equal(run('notasSombraDelRamo(r).necesaria'),necesariaFijada);
assert.equal(run('notasSombraDelRamo(r).sesion'),run('__sesionSwitch'));
assert.equal(run('JSON.stringify(S)'),previoSwitch);
assert.deepEqual(escriturasSwitch,[['gradehub_sombras','0'],['gradehub_sombras','1']],'sin gradehub_v1 ni guardado de fijaciones');
ctx.localStorage={...storagePrevio,setItem(){throw Error('Dispositivo sin almacenamiento')}};
assert.doesNotThrow(()=>run('cambiarSombras(false);cambiarSombras(true)'));
assert.equal(run('JSON.stringify(S)'),previoSwitch);
ctx.localStorage=storagePrevio;run('renderRamo=__renderSwitch');
// Una sola preferencia alcanza todos los ramos y sobrevive la recarga; la
// ausencia o un fallo de lectura conserva el valor predeterminado encendido.
const fuenteSombras=fs.readFileSync(__dirname+'/../src/app/notas-sombra.js','utf8');
for(const [getItem,esperado] of [[()=>null,true],[()=> '0',false],[()=> '1',true],[()=>{throw Error('lectura bloqueada')},true]]){
 const otro=vm.createContext({localStorage:{getItem},Map});vm.runInContext(fuenteSombras,otro);
 assert.equal(vm.runInContext('sombrasActivadas()',otro),esperado);
}
// Lucas, 2026-11-04: el switch queda en la fila del examen y permanece apagado.
const documentoSwitch=ctx.document,chipSwitch=el(),destinosSwitch=[];
let retiradosSwitch=0;
const examenSwitch={dataset:{fichaCategoria:'Examen'},querySelector:()=>null,insertAdjacentHTML:(pos,html)=>destinosSwitch.push([pos,html])};
ctx.document={...documentoSwitch,getElementById:()=>chipSwitch,querySelectorAll:selector=>selector==='.sombras-interruptor'?[{remove(){retiradosSwitch++}}]:[examenSwitch]};
run('pintarInterruptorSombras(notasSombraDelRamo(r))');
assert.equal(destinosSwitch[0][0],'beforeend');assert.match(destinosSwitch[0][1],/sombras-interruptor-examen/);
assert.equal(chipSwitch.innerHTML,'','con examen no aparece junto al promedio');
run('mostrarNotasSombra=false;pintarInterruptorSombras(notasSombraDelRamo(r))');
assert.doesNotMatch(destinosSwitch[1][1],/ checked/,'apagado sigue disponible en la misma fila');
assert.equal(retiradosSwitch,2,'cada repintado retira la copia anterior');
examenSwitch.querySelector=()=>({insertAdjacentHTML:(pos,html)=>destinosSwitch.push([pos,html])});
run('mostrarNotasSombra=true;pintarInterruptorSombras(notasSombraDelRamo(r))');
assert.equal(destinosSwitch[2][0],'beforebegin','fuera del panel o cuerpo colapsable');
ctx.document.querySelectorAll=selector=>selector==='.sombras-interruptor'?[]:[];
run('pintarInterruptorSombras(notasSombraDelRamo(r))');assert.match(chipSwitch.innerHTML,/sombras-interruptor/,'sin examen visible conserva el control');
ctx.document=documentoSwitch;
assert.equal(run('JSON.stringify(S)'),previoSwitch,'mover el switch no cambia notas ni pauta');
run("S.tipoCuenta='profesor'");assert.equal(run('modeloNotasSombra(r)'),null);
console.log('OK: sombras con motor real, mínimos, fijaciones, estados, borde UC, casillas, cuenta existente intacta y exclusiones exactas');
