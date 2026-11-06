// Estadísticas de Alumnos. Datos sintéticos, con el bundle real: con marcas se
// compara con clases y sin clases, sin marcas sigue la fecha, y las dos formas
// nunca se mezclan. Las cifras de resumen, histograma, pestañas y filas calzan.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),test=require('node:test');
const nodo=()=>({style:{setProperty(){},removeProperty(){}},classList:{add(){},remove(){},contains(){return false},toggle(){}},addEventListener(){},appendChild(){},setAttribute(){},removeAttribute(){},getAttribute(){return null},querySelector(){return null},querySelectorAll(){return []},focus(){},value:'',innerHTML:'',textContent:'',dataset:{}});
const c={console,Intl,URL,setTimeout,clearTimeout,window:{addEventListener(){},matchMedia:()=>({matches:false,addEventListener(){},addListener(){}})},document:{getElementById:nodo,createElement:nodo,addEventListener(){},documentElement:nodo(),body:nodo(),querySelector:()=>null,querySelectorAll:()=>[]},localStorage:{getItem(){return null},setItem(){},removeItem(){}},navigator:{},location:{origin:'https://gradehub.cl',pathname:'/',hash:''}};
vm.createContext(c);for(const f of ['data.js','engine.js','app.js','marketplace.js','render-main.js','render-agenda.js'])vm.runInContext(fs.readFileSync(__dirname+'/../'+f,'utf8'),c);
const run=s=>vm.runInContext(s,c);
run(`var currentUser=null,supabaseClient=null;S.tenant='uc';S.ramos=[];
 const eval_=(id,fecha,nota)=>({id:'c'+id,nombre:'Prueba '+id,peso:25,directNota:true,notas:[{id:'n'+id,nombre:'Prueba '+id,valor:nota,fecha,peso:1}]});
 const fechas=['2026-09-01','2026-09-10','2026-09-20','2026-10-01'];
 globalThis.ramo=(id,sigla,notas)=>({id,nombre:'Ramo '+sigla,sigla,creditos:10,gates:[],categorias:notas.map((n,i)=>eval_(id+i,fechas[i],n))});
 globalThis.alumno=(id,nombre,ramos)=>({id,tenant:'uc',nombre_visible:nombre,desde:'2026-09-15',ramos});
 globalThis.comp=(_al,r)=>({ramo:{promedio:4,personas:23},evaluaciones:r.categorias.map(k=>({clave:claveEvaluacionPanel(k.notas[0].nombre),promedio:4,personas:23})),categorias:[]});
 globalThis.marcas=(ramoId,ids)=>({ramos:[{ramo_id:ramoId,manual:true,marcas:ids.map(nota_id=>({nota_id})),evaluaciones:[]}]});
 globalThis.vista=(alumnos,cambios={})=>{const e=estadoEstadisticasPanel();Object.assign(e,cambios);e.datos=datosEstadisticasPanel(alumnos,comp);return e;};
 globalThis.texto=h=>h.replace(/<[^>]+>/g,' ').replace(/\\s+/g,' ');`);
const conteo=(html,clase)=>[...html.matchAll(new RegExp(`class="est-barra est-barra-${clase}[^"]*"[^>]*aria-label="(\\d+) con`,'g'))].reduce((s,m)=>s+ +m[1],0);

test('sin ninguna marca sigue la fecha de inicio y lo dice',()=>{
 run(`var al=alumno('a','Alumno sintético',[ramo('r','TST100',[3,3,5,5])]);var e=vista([al])`);
 const h=run('estadisticasAlumnosHTML(e.datos,e)');
 assert(h.includes('Aún sin marcas'));assert(h.includes('Cambio frente al ramo'));assert(h.includes('○ Antes'));assert(!h.includes('Sin marcar'));
});
test('con marcas compara con clases y sin clases, aunque se intercalen',()=>{
 run(`var al=alumno('a','Alumno sintético',[ramo('r','TST100',[3,5,3,5])]);al.preparacion=marcas('r',['nr1','nr3']);var e=vista([al])`);
 assert.equal(run('e.datos.metodo'),'manual');
 const p=run('filtradosEstPanel(e.datos,e)[0]');assert.equal(p.cambio,2,'la fecha no decide: I2 y I4 son las preparadas');assert.equal(p.estado,'mejor');
 const h=run('estadisticasAlumnosHTML(e.datos,e)');assert(h.includes('Con clases, frente al ramo'));assert(h.includes('○ Sin clases'));assert(!h.includes('Aún sin marcas'));
});
test('los dos métodos no se mezclan: sin marcas queda en Por completar',()=>{
 run(`var uno=alumno('a','Con marcas',[ramo('r','TST100',[3,5,3,5])]);uno.preparacion=marcas('r',['nr1','nr3']);var otro=alumno('b','Sin marcas',[ramo('s','TST200',[3,3,5,5])]);var e=vista([uno,otro])`);
 const r=run('resumenEstPanel(filtradosEstPanel(e.datos,e))');assert.equal(r.comp.length,1);assert.equal(r.sin,1);assert.equal(r.mediana,2);
 assert(run('filasEstadisticasHTML(e.datos,e)').includes('Sin marcar'));
});
test('un 0,3 que queda como 0,2999… igual cuenta como mejor',()=>{
 run(`var al=alumno('a','Alumno sintético',[ramo('r','TST100',[4.1,4.2,4.4,4.5])]);var e=vista([al])`);
 const p=run('filtradosEstPanel(e.datos,e)[0]');assert.equal(p.cambio,.3);assert.equal(p.estado,'mejor');
 run(`var al2=alumno('b','Alumno sintético',[ramo('r','TST100',[4,4,4.2,4.2])]);var e2=vista([al2])`);assert.equal(run('filtradosEstPanel(e2.datos,e2)[0].estado'),'igual');
});
test('elegir un ramo cambia el resumen, no solo la lista, y los conteos calzan',()=>{
 run(`var as=[alumno('a','Sube',[ramo('r','TST100',[3,3,5,5]),ramo('s','TST200',[5,5,3,3])]),alumno('b','Igual',[ramo('t','TST100',[4,4,4,4])]),alumno('c','Falta',[ramo('u','TST100',[4,4])])];var e=vista(as)`);
 let h=run('estadisticasAlumnosHTML(e.datos,e)');
 const r=run('resumenEstPanel(filtradosEstPanel(e.datos,e))');
 assert.equal(r.comp.length+r.sin,r.lista.length);assert.equal(r.mejor+r.igual+r.peor,r.comp.length);
 for(const [k,n] of [['peor',r.peor],['igual',r.igual],['mejor',r.mejor]])assert.equal(conteo(h,k),n,'histograma '+k);
 assert((h.match(/data-ver-alumno=/g)||[]).length===r.lista.length);
 const k=run(`claveRamoFiltroPanel(e.datos.pares.find(m=>m.sigla==='TST200'))`);c.__k=k;run('e.ramos.add(__k)');
 h=run('estadisticasAlumnosHTML(e.datos,e)');assert.equal((h.match(/data-ver-alumno=/g)||[]).length,1);assert(h.includes('Quitar Ramo TST200'));
 assert(texto_(h).includes('Solo 1 con datos suficientes'),'muestra chica no grita');
});
const texto_=h=>h.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ');
test('lo que pide acción va primero: bajó o sigue lejos del ramo',()=>{
 run(`var as=[alumno('a','Sube mucho',[ramo('r','TST100',[3,3,5,5])]),alumno('b','Lejos',[ramo('s','TST100',[2,2,2.1,2.1])]),alumno('c','Baja',[ramo('t','TST100',[5,5,4,4])])];var e=vista(as)`);
 const h=run('filasEstadisticasHTML(e.datos,e)');
 assert(h.indexOf('Por revisar')<h.indexOf('Baja')&&h.indexOf('Baja')<h.indexOf('Lejos')&&h.indexOf('Lejos')<h.indexOf('El resto')&&h.indexOf('El resto')<h.indexOf('Sube mucho'));
 assert(h.includes('1,9 bajo'));
 const pantalla=run('estadisticasAlumnosHTML(e.datos,e)');
 assert(!/\bpuntos\b|décimas? \w|>Puntos</.test(pantalla.replace(/<details class="est-ayuda">[\s\S]*?<\/details>/g,'').replace(/data-est-unidad="puntos"/g,'')),'la cifra va sola, sin unidad escrita');
 assert.match(pantalla,/<details class="est-ayuda"><summary aria-label="Qué significa esta cifra">/,'el ? explica la cifra');
 assert.match(pantalla,/escala de notas de 1 a 7.*\+0,6\./,'con un ejemplo en la misma notación');
 assert.equal(run("signoEstPanel(.6,'puntos')"),'+0,6');
});
test('el ramo se ve en cada fila y el tamaño de la muestra por ramo',()=>{
 run(`var as=[alumno('a','Dos ramos',[ramo('r','TST100',[3,3,5,5]),ramo('s','TST200',[5,5,3,3])])];var e=vista(as)`);
 const h=run('estadisticasAlumnosHTML(e.datos,e)');
 assert(h.includes('<small>Ramo TST100</small>')&&h.includes('<small>Ramo TST200</small>'));assert(h.includes('1 de 23 en GradeHub'));assert(h.includes('Elige uno o más para ver solo sus datos'));
 assert(!/\d\.\d/.test(texto_(h).replace(/Cada alumno[\s\S]*/,'')),'coma decimal');
 run(`var uno=vista([alumno('a','Un ramo',[ramo('r','TST100',[3,3,5,5])])])`);assert(!run('estadisticasAlumnosHTML(uno.datos,uno)').includes('est-ramos'),'con un ramo no hay filtro');
});
test('percentil solo si hay datos; nombres no entran como HTML; sin alumnos no rompe',()=>{
 run(`var al=alumno('a','<img src=x onerror=alert(1)>',[ramo('r','TST100',[3,3,5,5])]);var e=vista([al])`);
 const h=run('estadisticasAlumnosHTML(e.datos,e)');assert(!h.includes('<img'));assert(!h.includes('data-est-unidad'));
 run(`al.percentiles=['nr0','nr1','nr2','nr3'].map((nota_id,i)=>({ramo_id:'r',nota_id,ramo:{personas:9,percentil:[20,20,60,60][i]}}));var p=vista([al],{unidad:'percentil'})`);
 assert.equal(run('p.datos.hayPercentil'),true);assert.equal(run('filtradosEstPanel(p.datos,p)[0].cambio'),40);assert(run('estadisticasAlumnosHTML(p.datos,p)').includes('data-est-unidad="percentil"'));
 assert(run('estadisticasAlumnosHTML(datosEstadisticasPanel([],comp),estadoEstadisticasPanel())').includes('Todavía no hay ramos'));
});
test('tocar: zona alterna, filtros cierran y una fila sigue abriendo la ficha',()=>{
 const toque=(sel,dataset={},extra={})=>{c.__ev={target:{closest:s=>s===sel?{dataset,closest:x=>extra[x]||null}:null}};return run('tocarEstadisticasPanel(__ev,__e)');};
 run('var __e=estadoEstadisticasPanel()');
 assert.equal(toque('[data-est-tab]',{estTab:'mejor'}),'pintar');assert.equal(run('__e.tab'),'mejor');
 toque('[data-est-tab]',{estTab:'mejor'});assert.equal(run('__e.tab'),'todos','tocar la misma zona limpia');
 assert.equal(toque('[data-est-filtros]'),'pintar');assert.equal(run('__e.filtros'),true);
 assert.equal(toque('[data-ver-alumno]'),'pintar','un toque fuera cierra Filtros');assert.equal(run('__e.filtros'),false);
 assert.equal(toque('[data-ver-alumno]'),null);assert.equal(toque('[data-est-comparar]',{estComparar:'seccion'}),'comparar:seccion');assert.equal(toque('[data-est-solo]',{estSolo:'1'}),'solo:1');
});
