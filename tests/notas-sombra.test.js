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
run("S.tipoCuenta='profesor'");assert.equal(run('modeloNotasSombra(r)'),null);
console.log('OK: sombras con motor real, mínimos, fijaciones, estados, borde UC, casillas, cuenta existente intacta y exclusiones exactas');
