// Series sintéticas: el gráfico consulta el motor real sin guardar ni inventar historia.
const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const el=()=>({style:{setProperty(){},removeProperty(){}},classList:{add(){},remove(){},contains(){return false}},value:'',innerHTML:'',dataset:{},addEventListener(){},appendChild(){},setAttribute(){},removeAttribute(){},getAttribute(){return null},querySelector(){return null},querySelectorAll(){return[]},focus(){}});
const stub=el(),ctx={console,setTimeout,clearTimeout,window:{addEventListener(){},matchMedia:()=>({matches:true,addEventListener(){},addListener(){}})},document:{getElementById:()=>stub,createElement:el,addEventListener(){},documentElement:stub,body:stub,querySelector:()=>null,querySelectorAll:()=>[]},localStorage:{getItem(){return null},setItem(){throw Error('No se debe persistir al ver el gráfico')},removeItem(){}},navigator:{},location:{origin:'',pathname:'/',hash:''}};
vm.createContext(ctx);for(const f of ['data.js','engine.js','app.js','render-main.js'])vm.runInContext(fs.readFileSync(__dirname+'/../'+f,'utf8'),ctx);
const run=s=>vm.runInContext(s,ctx),json=s=>JSON.parse(run('JSON.stringify('+s+')'));
const nota=(nombre,valor,extra={})=>({id:nombre,nombre,valor,peso:1,...extra});
const cat=(id,peso,notas,extra={})=>({id,nombre:id,peso,notas,...extra});
const ramo=(nombre,creditos,categorias,extra={})=>({id:nombre,nombre,creditos,categorias,gates:[],...extra});
function calcular(ramos){ctx.__ramos=ramos;run('S={tenant:"uc",ramos:__ramos,historial:[]}');const antes=run('JSON.stringify(S)');const serie=json('seriePromedioNotas(S.ramos)');assert.equal(run('JSON.stringify(S)'),antes);assert.equal(serie.at(-1)?.valor??null,run('gpa(S.ramos)'));return serie;}
let serie=calcular([ramo('Inventado',10,[cat('Controles',100,[
 nota('Con edición',6,{editadaEn:'2026-10-15T12:00:00Z'}),nota('Sin fecha A',3),nota('Fecha manda',5,{fecha:'2026-09-10',editadaEn:'2026-11-01T00:00:00Z'}),nota('Sin fecha B',4),nota('Mismo día',7,{fecha:'2026-09-10'}),nota('Pendiente',null)
])])]);
assert.deepEqual(serie.map(p=>p.nombre),['Sin fecha A','Sin fecha B','Fecha manda','Mismo día','Con edición']);
assert.equal(serie[0].valor,3,'comienza en el primer promedio real, no en 4');assert.equal(serie[0].delta,null);assert.equal(serie[1].delta,.5);assert.equal(serie[2].origen,'evaluacion');assert.equal(serie.at(-1).origen,'edicion');
assert.equal(run("fechaNotaEvolucion({valor:5,editadaEn:'2026-10-12T10:00:00Z'},{fecha:'2026-10-01'}).fecha"),'2026-10-01');
assert.equal(run("fechaNotaEvolucion({fecha:'2026-02-30'},{}).tiempo"),null);
ctx.__notas=serie;let mes=json("puntosRangoEvolucion('mes',__notas,[],[], '2026-2',new Date(2026,9,20))");assert.equal(mes.length,1);assert.equal(mes[0].nombre,'Con edición');
assert.equal(run("puntosRangoEvolucion('mes',__notas,[],[], '2026-2',new Date(2026,7,20)).length"),0,'sin fecha no se asigna a un mes');
// 20 SCT y 10 SCT: no se promedia directamente la lista de notas.
serie=calcular([ramo('Mayor',20,[cat('Prueba',100,[nota('Primera',6)])]),ramo('Menor',10,[cat('Prueba',100,[nota('Segunda',3)])])]);assert.equal(serie.at(-1).valor,5);
// Cátedra y laboratorio vinculado se evalúan en el mismo contexto de ramos.
serie=calcular([ramo('Cátedra',10,[cat('Prueba',100,[nota('Cátedra',6)])],{aporta:{ramo:'Laboratorio',peso:30,min:4}}),ramo('Laboratorio',0,[cat('Prueba',100,[nota('Laboratorio',4)])])]);assert(Math.abs(serie.at(-1).valor-5.4)<1e-8);
// Los descartes y las compuertas mandan también en cada paso intermedio.
serie=calcular([ramo('Descartes',10,[cat('Controles',100,[nota('Baja',1),nota('Alta',7),nota('Otra',5)],{dropLowest:{count:1}})])]);assert.equal(serie.at(-1).valor,6);
serie=calcular([ramo('Compuerta',10,[cat('Trabajo',80,[nota('Trabajo',7)]),cat('Requisito',20,[nota('Requisito',2)])],{gates:[{type:'min_grade_required',catId:'Requisito',min:4,cap:3.9}]})]);assert.equal(serie.at(-1).valor,3.9);
assert.deepEqual(calcular([]),[]);
// Carrera: un valor por semestre, incluso con muchas notas y orden de ingreso distinto.
calcular([ramo("Actual",10,[cat("Prueba",100,[nota("Actual",5)])])]);
ctx.__hist=Array.from({length:24},(_,i)=>({label:(2014+Math.floor(i/2))+'-'+(i%2+1),gpa:4+i/20})).reverse();
run('S.historial=__hist');let carrera=json("serieSemestresEvolucion(S.historial,S.ramos,'2026-2')");assert.equal(carrera.length,25);assert.equal(carrera[0].nombre,'2014-1');assert.equal(carrera.at(-1).nombre,'2026-2');
ctx.__h={label:'2025-1',ramos:[ramo('Anterior',10,[cat('Prueba',100,[nota('P',6)])])]};assert.equal(run('serieSemestresEvolucion([__h],[],"2026-2")[0].valor'),6,'un archivo antiguo sin caché recupera su promedio');
// Segmentos rectos, no curvas; una sola nota es visible y explorable.
const h=run("rangoEvolucionStats='semestre';contenidoEvolucionStatsHTML()");assert(h.includes(' d="M'));assert(!/class="evolucion-linea" d="[^"]* C/.test(h));assert(h.includes('Ver datos del gráfico'));assert(h.includes('scope="row"'));assert(h.includes('role="slider"'));
calcular([ramo('<Inventado>',10,[cat('Prueba',100,[nota('<P1>',5)])])]);const unico=run('contenidoEvolucionStatsHTML()');assert(unico.includes('left:50.000%'));assert(unico.includes('&lt;P1&gt;'));assert(!unico.includes('<Inventado>'));assert(unico.includes('aria-valuemax="0"'));
assert(!run('contenidoEvolucionStatsHTML()').includes('data-evolucion-rango="carrera"'),'sin archivos no ofrece Carrera');
// El rango no vuelve a pedir datos ni repinta otros bloques ni mueve el scroll.
const scroll={scrollTop:411},zona={innerHTML:'',closest:()=>scroll,querySelector:()=>({focus(o){assert.equal(o.preventScroll,true)}})};
ctx.document.getElementById=id=>{assert.equal(id,'stats-evolucion-contenido');return zona;};run('enlazarGraficosEvolucion=()=>{}');const antes=run('JSON.stringify(S)');run("cambiarRangoEvolucionStats('mes')");assert.equal(scroll.scrollTop,411);assert.equal(run('JSON.stringify(S)'),antes);
const html=zona.innerHTML;run("cambiarRangoEvolucionStats('invalido');cambiarRangoEvolucionStats('carrera')");assert.equal(zona.innerHTML,html);
// Cache de lectura: alternar rangos no vuelve a recorrer cientos de notas.
calcular([ramo('Muchos',10,[cat('Pruebas',100,Array.from({length:200},(_,i)=>nota('Nota '+i,4+i%3)))])]);run('cacheEvolucionStats=null;var gpaReal=gpa,cuentasGpa=0;gpa=r=>{cuentasGpa++;return gpaReal(r)};modeloEvolucionStats()');assert.equal(run('cuentasGpa'),200);run('modeloEvolucionStats();contenidoEvolucionStatsHTML()');assert.equal(run('cuentasGpa'),200);run('S.ramos[0].categorias[0].notas[0].valor=7;modeloEvolucionStats()');assert.equal(run('cuentasGpa'),400);
console.log('OK: evolución con motor real, fechas antiguas, SCT, vínculo, descartes, compuertas, Carrera, tabla, escape, rango y caché');
