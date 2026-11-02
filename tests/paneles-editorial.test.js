// Mismo código de producción, sin red ni datos reales.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const leer=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
const nodo=()=>({style:{setProperty(){},removeProperty(){}},classList:{add(){},remove(){},contains(){return false},toggle(){}},addEventListener(){},appendChild(){},setAttribute(){},removeAttribute(){},getAttribute(){return null},querySelector(){return null},querySelectorAll(){return []},focus(){},value:'',innerHTML:'',textContent:'',dataset:{}});
const ctx={console,Intl,URL,setTimeout,clearTimeout,window:{addEventListener(){},matchMedia:()=>({matches:false,addEventListener(){},addListener(){}})},
 document:{getElementById:nodo,createElement:nodo,addEventListener(){},documentElement:nodo(),body:nodo(),querySelector:()=>null,querySelectorAll:()=>[]},
 localStorage:{getItem(){return null},setItem(){},removeItem(){}},navigator:{},location:{origin:'https://example.invalid',pathname:'/',hash:''}};
vm.createContext(ctx);for(const f of ['data.js','engine.js','app.js','marketplace.js','render-main.js','render-agenda.js'])vm.runInContext(leer(f),ctx);
const run=s=>vm.runInContext(s,ctx),json=s=>JSON.parse(JSON.stringify(run(s)));
ctx.__filas=[{dia:'2026-01-01',vistas:100,aperturas:10,contactos:2},{dia:'2026-10-23',vistas:11,aperturas:2,contactos:1},{dia:'2026-10-30',vistas:3,aperturas:1,contactos:0}];
run('globalThis.__ahora=new Date(2026,9,30,12)');
const antes=JSON.stringify(ctx.__filas);
assert.equal(run("sumarHistorialPrivado(intervaloPrivado(__filas,'1',__ahora).filas).vistas"),3);
assert.equal(run("sumarHistorialPrivado(intervaloPrivado(__filas,'7',__ahora).filas).vistas"),3,'7 días incluye hoy, excluye el octavo');
assert.equal(run("sumarHistorialPrivado(intervaloPrivado(__filas,'30',__ahora).filas).vistas"),14);
assert.equal(run("sumarHistorialPrivado(intervaloPrivado(__filas,'inicio',__ahora).filas).vistas"),114);
assert.equal(run("serieHistorialPrivado(__filas,'inicio','vistas',__ahora).puntos.reduce((n,p)=>n+p.valor,0)"),114,'agrupar semanas no pierde conteos');
assert.equal(run("serieHistorialPrivado(__filas,'7','vistas',__ahora).puntos.length"),7,'los días sin registros confirmados valen cero');
assert.equal(JSON.stringify(ctx.__filas),antes);
// En Chile aún es octubre, pero SQL ya registra el 1 de noviembre UTC.
// No se puede tratar ese dato confirmado como si fuera un evento futuro.
ctx.__noche=Date.parse('2026-10-31T22:17:00-03:00');
ctx.__registro=[{dia:'2026-10-31',vistas:21},{dia:'2026-11-01',vistas:3},{dia:'2026-11-02',vistas:1000}];
assert.equal(run("sumarHistorialPrivado(intervaloPrivado(__registro,'7',__noche).filas).vistas"),24);
assert.equal(run("sumarHistorialPrivado(intervaloPrivado(__registro,'1',__noche).filas).vistas"),3);
assert.equal(run("serieHistorialPrivado(__registro,'inicio','vistas',__noche).puntos.reduce((n,p)=>n+p.valor,0)"),24);
assert.equal(run("intervaloPrivado(__registro,'1',Date.parse('2026-11-01T00:01:00+09:00')).hasta"),'2026-10-31','no depende del huso del dispositivo');
ctx.__profesor={nombre:'Profesor sintético',estado:'aprobado',anuncios:[{id:'aviso-sintetico',titulo:'Clase de ejemplo',estado:'publicado',precio_clp:10000,
 publicado_at:'2026-10-31T22:30:00Z',vence_at:'2026-11-02T22:30:00Z',ramos_siglas:['TEST100'],
 campana:{vistas:3,aperturas:2,contactos:1,dias_cobrados:1,tope_clp:10000}}]};
const fila=run('filaAdminHigHTML(filasAdminHig([__profesor],__noche)[0],__noche)');
assert.match(fila,/data-pe-conteo="vistas">3<\/b>/);
assert.match(fila,/<b>1<\/b><small>Días publicada/,'el mismo día iniciado que el detalle, sin floor del reloj');
assert.match(fila,/3 personas te vieron/);
ctx.__profesor.anuncios[0].campana.vistas=null;
assert.match(run('filaAdminHigHTML(filasAdminHig([__profesor],__noche)[0],__noche)'),/data-pe-conteo="vistas">—<\/b>/,'ausencia no es cero');
ctx.__profesor.anuncios[0].campana.vistas=3;
// El rango del gráfico no pisa la instantánea actual de la fila con otro
// período ni suma publicaciones anteriores de un anuncio republicado.
const listeners={},destino=nodo(),boton=nodo();
boton.dataset.pePeriodo='inicio';boton.addEventListener=(tipo,fn)=>{listeners[tipo]=fn;};
const caja=nodo();caja.querySelector=()=>destino;caja.querySelectorAll=s=>s==='[data-pe-periodo]'?[boton]:[];
ctx.__raiz={querySelector:()=>caja,querySelectorAll(){throw Error('El gráfico no debe sobrescribir las cifras de las filas');}};
ctx.__historial=[{anuncio_id:'aviso-sintetico',publicacion:'anterior',dia:'2026-01-01',vistas:500},
 {anuncio_id:'aviso-sintetico',publicacion:'actual',dia:'2026-11-01',vistas:3}];
run('enlazarAdminEditorial(__raiz,__historial,null,__noche)');listeners.click();
assert.match(destino.innerHTML,/503/,'el gráfico sí incluye ambas publicaciones desde el inicio');
assert.match(run('filaAdminHigHTML(filasAdminHig([__profesor],__noche)[0],__noche)'),/data-pe-conteo="vistas">3<\/b>/);
assert.match(run("panelAlcancePrivadoHTML(null,'7','vistas',__ahora)"),/role="status"/,'error de carga no se vuelve cero');
assert.match(run("graficoPrivadoHTML([{valor:4,etiqueta:'Prueba'}],{titulo:'Vistas'})"),/class="pe-notita" hidden/,'cifra puntual oculta hasta explorar');
assert.match(run("graficoPrivadoHTML([{valor:4,etiqueta:'Prueba'}],{titulo:'Vistas'})"),/role="slider".*aria-valuetext=/,'teclado y lector de pantalla');
run(`S.tenant='uc';globalThis.__al={id:'ficticio',tenant:'uc',nombre_visible:'Alumno de ejemplo',desde:'2026-09-15',ramos:[{id:'r',nombre:'Ramo sintético',sigla:'TEST100',seccion:2,gates:[],categorias:[
 {id:'c1',nombre:'Prueba 1',peso:50,fecha:'2026-09-01',notas:[{id:'n1',nombre:'Prueba 1',valor:5.2}]},
 {id:'c2',nombre:'Prueba 2',peso:50,fecha:'2026-11-10',notas:[]}]}]};
 globalThis.__comp={ramo:{promedio:4.8,personas:6},evaluaciones:[{clave:'prueba 1',promedio:4.6,personas:6}],categorias:[]};`);
const html=run('ramoAlumnoEditorialHTML(__al,__al.ramos[0],__comp,__comp,false,__ahora)');
assert.match(html,/Promedio actual<\/span><strong>5,2/,'promedio del motor al frente');
assert.match(html,/Para llegar al 4,0 final/);assert.match(html,/class="medidor-nota"/,'medidor real de la app');
assert(html.indexOf('Próximas evaluaciones')<html.indexOf('Evaluaciones pasadas'));
assert.match(html,/Prueba 2/);assert.match(html,/Prueba 1/);
assert.match(run('barraUltimaPrivadaHTML(__al.ramos[0],__comp)'),/Ramo · última evaluación: 4,6/,'última prueba, no promedio global del ramo');
assert.match(run('barraUltimaPrivadaHTML(__al.ramos[0],SIN_SECCION_PANEL,true)'),/Sección no disponible/);
assert.equal(run('referenciaEvaluacionPrivada(__al.ramos[0],{id:"n1",nombre:"Prueba 1"},{...__comp,evaluaciones:[{clave:"prueba 1",personas:4,promedio:6.9}]})'),null,'no revela muestras pequeñas');
assert.equal(run('colorDiferenciaPrivada(0)'),'var(--fg2)');assert.match(run('colorDiferenciaPrivada(-.1)'),/var\(--yellow\).*90%.*var\(--red\).*10%/);
assert.match(run('colorDiferenciaPrivada(.1)'),/var\(--pe-verde-suave\).*90%.*var\(--green\).*10%/);
// La ficha conserva el cálculo y sus supuestos: no imita el 4 hipotético de la maqueta.
assert.match(html,/Necesita<\/small><strong>2,7/);
assert.match(html,/Para ir con 4,0 después de rendirla/);
assert.doesNotMatch(html,/si el examen|pe-datos-ramo|Antes · \d/);
assert.match(html,/1 sep · 50% del ramo/,'peso declarado de la evaluación, junto a la fecha');
assert.match(html,/En 11 días/);
assert(html.indexOf('data-pe-grupo')>html.indexOf('Frente al grupo'));
assert.match(run('ramoAlumnoEditorialHTML(__al,__al.ramos[0],{errorCarga:true},__comp,false,__ahora)'),/No pudimos cargar la comparación/);
assert.match(run('ramoAlumnoEditorialHTML(__al,__al.ramos[0],{sinSQL:true},__comp,false,__ahora)'),/Comparación no disponible por ahora/);
const sinNotas=run('ramoAlumnoEditorialHTML(__al,{...__al.ramos[0],categorias:[]},null,null,false,__ahora)');
assert.match(sinNotas,/Promedio actual<\/span><strong>—/,'ausencia de notas no es cero');
assert.match(sinNotas,/Todavía no tiene notas/);
run(`globalThis.__evol={id:'sintetico',evaluaciones:[
 {ramoId:'r',ramo:'Sintético',fecha:'2026-08-01',inicio:'2026-09-01',nota:3,curso:4,lado:'antes',evaluacion:'Primera'},
 {ramoId:'r',ramo:'Sintético',fecha:'2026-10-01',inicio:'2026-09-01',nota:5,curso:4,lado:'ahora',evaluacion:'Última'}]};`);
const graf=run('graficoAntesAhoraSVG(__evol,{ficha:true})');
assert.match(graf,/1 ago<\/span><span>1 oct/,'extremos temporales reales');
assert.match(graf,/0 = promedio del grupo/);
assert.match(graf,/evolucion-inicio/,'inicio real, distinto del promedio horizontal');
assert.doesNotMatch(graf,/ah-evolucion-periodos|Antes · \d/);
const fuera=run(`graficoAntesAhoraSVG({...__evol,evaluaciones:__evol.evaluaciones.map(e=>({...e,inicio:'2026-07-01'}))},{ficha:true})`);
assert.doesNotMatch(fuera,/class="evolucion-inicio"/,'no inventa una posición para un inicio fuera del rango');
assert.match(fuera,/Inicio de clases · 1 jul/,'la fecha fuera del rango sigue disponible');
assert.equal(run('pesoEvaluacionPrivada({cat:{peso:20,slots:2,notas:[]}})'), '20% del ramo');
assert.equal(run('pesoEvaluacionPrivada({nota:{id:"a"},cat:{peso:20,slots:2,notas:[{id:"a",valor:4,slot:0,fecha:"2026-08-01"}]}})'), '10% del ramo');
assert.equal(run('pesoEvaluacionPrivada({nota:{id:"a"},cat:{peso:20,slots:2,dropLowest:{count:1},notas:[]}})'), 'Peso variable');
assert.equal(run('S.tenant'),'uc');assert.equal(run('S.ramos.length'),0,'no modifica ramos del profesor');
const dias=run("barrasDiasClase({publicado_at:'2026-10-29T12:00:00Z',vence_at:'2026-11-01T12:00:00Z'},{dias:{'2026-10-30':{impresion:1}},total:{},ramos:{}},__ahora.getTime(),true)");
assert.doesNotMatch(dias,/Menos de 15/,'el nuevo detalle diario no confunde cero con un corte protegido');
assert.match(dias,/<td>1<\/td>/,'también el detalle muestra el primer evento');
console.log('OK editorial: rangos, semanas sin pérdida, ceros vs error, gráfico accesible, promedio del motor, próximas/pasadas, medidor, comparación por evaluación y privacidad');
