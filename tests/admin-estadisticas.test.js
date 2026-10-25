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
