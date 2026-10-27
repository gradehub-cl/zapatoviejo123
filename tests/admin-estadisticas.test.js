// Los gráficos de Estadísticas del panel de administración, con datos
// sintéticos: ejes redondos, la semana en curso sin comparar, cobros en su mes,
// alcance sumado, los números también en texto y qué pasa sin datos o sin SQL.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const ctx={console,Intl,esc:s=>String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;'),
  document:{addEventListener(){},getElementById(){return null;}}};
vm.createContext(ctx);vm.runInContext(fs.readFileSync(path.join(__dirname,'../marketplace.js'),'utf8'),ctx);
const run=c=>vm.runInContext(c,ctx);

// El eje: tope redondo, con mitad también redonda, y cero sin datos.
assert.deepEqual([0,1,3,7,45,100,12000].map(n=>run(`topeEjeAdmin(${n})`)),[0,2,4,8,60,100,20000]);

// Jueves 22 de octubre: la semana del 19 está en curso, la del 12 es la última cerrada.
const ahora=Date.parse('2026-10-22T15:00:00-03:00');ctx.__ahora=ahora;
ctx.__semanas=[
  {semana:'2026-10-19',activas:40,nuevas:3,vuelven:30,pct_vuelven:25,activas_estudiantes:35,activas_profesores:5},
  {semana:'2026-10-12',activas:120,nuevas:12,vuelven:80,pct_vuelven:80,activas_estudiantes:110,activas_profesores:10},
  {semana:'2026-10-05',activas:100,nuevas:20,vuelven:70,pct_vuelven:70}];
const uso=run('crecimientoAdminHTML(__semanas,__ahora)');
assert.match(uso,/<span>Activas<\/span><strong>120<\/strong><p>Semana del 12 oct · \+20 \(\+20%\) vs\. semana del 5 oct<\/p>/,'compara la última semana cerrada con la anterior');
assert.match(uso,/<span>Nuevas<\/span><strong>12<\/strong><p>−8 \(−40%\) vs\. semana del 5 oct<\/p>/);
assert.match(uso,/<span>Volvieron<\/span><strong>80%<\/strong><p>80 de 100 activas la semana anterior<\/p>/);
assert.match(uso,/<span>Esta semana<\/span><strong>40<\/strong>/,'la semana en curso va aparte, sin comparar');
const cols=[...uso.matchAll(/<span data-admin-col data-lectura="([^"]*)"([^>]*)><i style="height:([\d.]+)%"/g)].slice(0,3);
assert.deepEqual(cols.map(c=>c[1]),['Semana del 5 de octubre · 100 activas','Semana del 12 de octubre · 120 activas','Semana del 19 de octubre (en curso) · 40 activas'],'de lo antiguo a lo nuevo');
assert.match(cols[1][2],/data-elegida/,'parte elegida la última semana cerrada');assert.match(cols[2][2],/data-tenue/);
assert.deepEqual(cols.map(c=>c[3]),['50.0','60.0','20.0'],'alto proporcional al tope del eje: 0 · 100 · 200');
assert.match(uso,/role="img" aria-label="Cuentas activas por semana, gráfico de columnas\./,'el gráfico se describe para VoiceOver');
const [arriba,historial]=uso.split('admin-crecimiento-historial');
assert(arriba.includes('35 estudiantes · 5 profesores')&&historial.includes('110 estudiantes · 10 profesores'),
  'el detalle por semana sigue igual: la primera semana arriba, las demás en el historial');

// Clases particulares: alcance de 30 días, cobros por mes y anuncios por estado.
const dia=k=>new Date(ahora-k*864e5).toISOString().slice(0,10);
ctx.__alcance=Array.from({length:30},(_,i)=>({dia:dia(29-i),vieron:i===29?50:i===10?80:10,abrieron:i===29?10:2,contactaron:i===29?4:0}));
const mes=k=>{const d=new Date(ahora);d.setMonth(d.getMonth()-k,10);return d.toISOString();};
ctx.__profesores=[{user_id:'p1',nombre:'Docente sintético',estado:'aprobado',anuncios:[
  {id:'a1',titulo:'Cálculo',estado:'publicado',publicado_at:mes(0),vence_at:'2099-01-01T00:00:00Z',cobros:[
    {publicado_at:mes(0),estado:'cobrado',monto_clp:5000},{publicado_at:mes(2),estado:'deuda',monto_clp:3000},{publicado_at:mes(8),estado:'cobrado',monto_clp:9999}]},
  {id:'a2',titulo:'Álgebra',estado:'en_revision',cobros:[]},{id:'a3',titulo:'Física',estado:'en_revision',cobros:[]},
  {id:'a4',titulo:'Borrado',estado:'eliminado',publicado_at:mes(1),cobros:[]}]}];
const clases=run('clasesEstadisticasAdminHTML(__profesores,__alcance,__ahora)');
const vieron=50+80+28*10;
assert.match(clases,new RegExp(`<span>Vieron un anuncio</span><strong>${run(`milesViz(${vieron})`)}</strong>`),'suma los 30 días');
assert.match(clases,/<span>Contactaron<\/span><strong>4<\/strong><p>1 ?% de las que lo vieron<\/p>/);
assert.match(clases,/el día con más fue el \d+ de \w+, con 80\./,'el resumen dice el mejor día con su número');
assert.equal((clases.match(/<tr><th scope="row">/g)||[]).length,30+6,'una fila por día y por mes en las tablas');
assert.match(clases,/\$5\.000 cobrados en seis meses · \$3\.000 en deuda/,'lo de hace ocho meses no entra');
assert.match(clases,/<span>Revisión pendiente<\/span>|<span>En revisión<\/span>/,'cuenta los anuncios por su estado');
assert.match(clases,/3 anuncios en total/,'sin los borrados');
assert.doesNotMatch(uso+clases,/--(green|yellow|red)|semaforo|sem-/,'nada usa el semáforo');

// Sin el SQL nuevo se dice qué falta y lo demás sigue; sin datos, no se dibuja un cero.
const sinSql=run('clasesEstadisticasAdminHTML(__profesores,null,__ahora)');
assert.match(sinSql,/aplicar supabase\/admin_estadisticas\.sql/);assert.match(sinSql,/Cobrado por mes/);
const vacio=run('clasesEstadisticasAdminHTML([],__alcance.map(d=>({...d,vieron:0,abrieron:0,contactaron:0})),__ahora)');
assert.match(vacio,/Ningún anuncio se ha mostrado en los últimos 30 días\./);
assert.match(vacio,/Todavía no hay cobros registrados/);
assert.doesNotMatch(vacio,/data-admin-col/,'sin datos no hay columnas');
console.log('PASS admin estadísticas: ejes, semana en curso, alcance, cobros por mes, estados, VoiceOver y estados vacíos');

// Cargamos la misma pieza compartida de app.js, no una copia ni un stub.
const anilloCompartido=fs.readFileSync(path.join(__dirname,'../app.js'),'utf8').match(/function htmlAnillo\([\s\S]*?\n\}/)[0];
run(anilloCompartido);
// Los anillos solo dibujan porcentajes válidos; el dato sigue como texto HTML.
for(const n of [0,12.5,100])assert.match(run(`datoCircularHTML(${n})`),new RegExp(`--anillo-fin:${(100-n).toFixed(2)}`));
for(const n of ['null','undefined','NaN','Infinity','-1','101'])assert.doesNotMatch(run(`datoCircularHTML(${n},'—','Sin dato')`),/anillo-arco/);
assert.match(run('crecimientoAdminHTML(__semanas,__ahora)'),/--anillo-fin:20.00/,'retención usa el porcentaje del servidor');
assert.match(run('clasesEstadisticasAdminHTML(__profesores,__alcance,__ahora)'),/--anillo-fin:94\.12/,'contactos sobre aperturas, con su denominador escrito');
const antes=JSON.stringify(ctx.__semanas);
run('crecimientoAdminHTML(__semanas,__ahora)');assert.equal(JSON.stringify(ctx.__semanas),antes);
for(const pct of [0,100,null]){
 ctx.__pct=pct;const html=run('graficosCrecimientoAdminHTML([{...__semanas[1],pct_vuelven:__pct},__semanas[2]],__ahora)');
 assert.match(html,new RegExp(`>${pct===null?'—':pct+'%'}<`));
 assert.equal(html.includes('class="anillo'),pct!==null);
}
// No confundir eventos con personas: las barras comparan solo personas,
// conservando aparte los eventos y la ausencia de datos.
ctx.__medida={alcance:70,totales:{impresion:150,clic:40,contacto:20},hayCortes:true,campana:{vistas:100,aperturas:25,contactos:5},costo:null};
const medidaAntes=JSON.stringify(ctx.__medida);
const etapas=run('cifrasClase(__medida,pesosClase)');
assert.deepEqual([...etapas.matchAll(/scaleX\(([\d.]+)\)/g)].map(m=>m[1]),['1.0000','0.2500','0.0500']);
assert.match(etapas,/>150<\/b><small>veces en total/);
assert.equal(JSON.stringify(ctx.__medida),medidaAntes);
const cero=run('cifrasClase({...__medida,campana:{vistas:0,aperturas:0,contactos:0}},pesosClase)');
assert.equal((cero.match(/scaleX\(0\.0000\)/g)||[]).length,3);
const desconocido=run('cifrasClase({...__medida,alcance:null,campana:null,hayCortes:false},pesosClase)');
assert.doesNotMatch(desconocido,/clase-etapa-riel|scaleX/);assert.match(desconocido,/>—<\/b>/);
// El coste y el tope son los mismos; sin tope no se dibuja un falso 0%.
assert.match(run('presupuestoProfesorHTML({total:2500,tope:10000})'),/--anillo-fin:75.00/);
assert.doesNotMatch(run('presupuestoProfesorHTML({total:2500,tope:null})'),/anillo-arco|0%/);
console.log('PASS datos visuales: proporciones, cero, sin datos, eventos separados e inmutabilidad');

ctx.__encuesta={total:12,opciones:[{opcion:'Mañana <temprano>',total:6},{opcion:'Tarde',total:12},{opcion:'Noche',total:0}],textos:[]};
const encuesta=run('resultadosEncuestaAdminHTML(__encuesta)');
assert.match(encuesta,/>12<\/b> respuestas/);
assert.match(encuesta,/Mañana &lt;temprano>/);
assert.deepEqual([...encuesta.matchAll(/scaleX\(([\d.]+)\)/g)].map(m=>m[1]),['0.500','1.000','0.000'],'opción múltiple: son cantidades, no partes excluyentes de un total');
assert.doesNotMatch(encuesta,/%|anillo/);
assert.match(run("resultadosEncuestaAdminHTML({total:2,textos:[{texto:'<ejemplo>',total:2}]})"),/&lt;ejemplo>/);
assert.match(run('resultadosEncuestaAdminHTML({total:0})'),/>0<\/b> respuestas/);

const conPresupuesto=run("cifrasClase({...__medida,costo:{total:2500,tope:10000}},pesosClase,'personas distintas',true)");
assert.equal((conPresupuesto.match(/\$2\.500/g)||[]).length,1,'en el detalle el costo se muestra una sola vez');
assert.match(conPresupuesto,/Por contacto/);

// Detalle de Profesor/Admin: categorías comparables y eventos repetidos.
const eventos=run('embudoClase({impresion:40,clic:60,contacto:15})');
assert.match(eventos,/Interacciones/);assert.match(eventos,/veces/);
assert.doesNotMatch(eventos,/quienes|personas|scaleX\(1\.[1-9]/);
assert.deepEqual([...eventos.matchAll(/scaleX\(([\d.]+)\)/g)].map(m=>Number(m[1])),[.6667,1,.25],
  'eventos repetidos: misma escala, ninguna barra excede el gráfico');
const canales=run("donaCanalesClase({recomendacion:20,busqueda:20,lista:0})");
assert.match(canales,/Recomendado en Inicio/);assert.match(canales,/Buscaron el ramo/);
assert.doesNotMatch(canales,/anillo|svg|%/,'comparación directa por canal');
assert.match(canales,/40 personas en total/,'conserva el total de cuentas atribuidas por el servidor');
assert.match(canales,/scaleX\(0.0000\)/,'cero conocido se conserva');
assert.doesNotMatch(run('donaCanalesClase(null)'),/figure/);
const ausente=run("barrasDetalleClaseHTML({titulo:'Prueba',filas:[{nombre:'Sin dato',valor:null}]})");
assert.match(ausente,/>—<\/b>/);assert.doesNotMatch(ausente,/scaleX/);
ctx.__costo={total:100,tope:100,partes:[{clave:'contacto',subtotal:150},{clave:'apertura',subtotal:50}]};
const costoAntes=JSON.stringify(ctx.__costo);
const costo=run('costoApiladoClase(__costo,pesosClase)');
assert.match(costo,/\$200 antes del tope · costo limitado a \$100/);
assert.equal(JSON.stringify(ctx.__costo),costoAntes,'el desglose no cambia el cobro');
ctx.__anuncio={publicado_at:'2026-10-01T12:00:00Z',vence_at:'2026-10-05T12:00:00Z',ramos_siglas:['MAT1620','MAT1610']};
const tiempo=run("anilloCampanaClase(__anuncio,Date.parse('2026-10-02T12:00:00Z'))");
assert.match(tiempo,/>3<\/b><span>días restantes/);assert.match(tiempo,/scaleX\(0.2500\)/);
assert.match(tiempo,/del plazo transcurrido/);assert.match(tiempo,/Inicio ·/);assert.match(tiempo,/Fin ·/);
assert.equal(run('anilloCampanaClase({},__ahora)'),'');
ctx.__agregados={dias:{'2026-10-01':{impresion:20},'2026-10-03':{impresion:40,contacto:15}},ramos:{MAT1620:{impresion:60}}};
const agregadosAntes=JSON.stringify(ctx.__agregados);
const diario=run("barrasDiasClase(__anuncio,__agregados,Date.parse('2026-10-03T12:00:00Z'))");
assert.match(diario,/Escala de 0 a 40/);assert.match(diario,/scaleY\(0.5000\)/);assert.match(diario,/scaleY\(1.0000\)/);
assert.equal((diario.match(/class="clase-dia-sin"/g)||[]).length,1,'día oculto sin columna de cero');
assert.match(diario,/Menos de 15 eventos; no es cero/);assert.match(diario,/<th scope="row">2 oct<\/th><td>Menos de 15 eventos<\/td>/);
assert.match(diario,/<summary>Ver días<\/summary>/);assert.match(diario,/<td>15<\/td>/,'solo los contactos publicables');
assert.match(run('barrasRamosClase(__anuncio,__agregados)'),/>—<\/b>/);
assert.equal(JSON.stringify(ctx.__agregados),agregadosAntes);
vm.runInContext(fs.readFileSync(path.join(__dirname,'../engine.js'),'utf8'),ctx);
ctx.fmtPromedio=n=>Number(n).toFixed(1);
const escala=run("comparacionPromediosPanelHTML(4,5,'uc')");
assert.match(escala,/left:50.00%/);assert.match(escala,/left:66.67%/);assert.match(escala,/Escala de 1.0 a 7.0/);
const sinReferencia=run("comparacionPromediosPanelHTML(4,null,'uc')");
assert.match(sinReferencia,/GradeHub: aún pocos datos/);assert.doesNotMatch(sinReferencia,/class="panel-curso-referencia"/);
assert.equal(run("comparacionPromediosPanelHTML(null,null,'uc')"),'');
console.log('PASS detalle visual: escala de eventos, canales, tope, tiempo, privacidad diaria, tablas y comparación de notas');

// Los riesgos de distintos ramos se pueden superponer. Son dos proporciones
// independientes sobre todos los conectados; nunca partes apiladas de un total.
ctx.__inicio={conectados:10,semana:[],atencion:[],reprobando:4,alBorde:7};
const inicio=run('resumenInicioAlumnosHTML(__inicio)');
assert.match(inicio,/panel-riesgo-bad[\s\S]*?scaleX\(0.4000\)/);
assert.match(inicio,/panel-riesgo-warn[\s\S]*?scaleX\(0.7000\)/);
assert.match(inicio,/Un alumno puede estar al borde en un ramo y reprobando otro/);
assert.doesNotMatch(run('resumenInicioAlumnosHTML({...__inicio,conectados:0,reprobando:0,alBorde:0})'),/panel-riesgo-riel/);
