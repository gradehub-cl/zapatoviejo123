// Resumen de la calificación y payload del panel: umbral de 3, escape, etiquetas personales. Datos sintéticos.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const read=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
const ctx={S:{tenant:'uc',ramos:[]},currentUser:null,semester:()=>'2026-2',
  esc:s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),
  document:{getElementById:()=>null}};
vm.createContext(ctx);vm.runInContext(read('data.js')+'\n'+read('render-main.js'),ctx);
const plano=x=>JSON.parse(JSON.stringify(x));

// Bajo 3 no hay promedio ni etiquetas, aunque el servidor mandara algo.
let html=ctx.htmlResumenCalificacion({docente:'X',total:2,promedio:4.5,etiquetas:[{etiqueta:'exigente',n:2}]});
assert.doesNotMatch(html,/4\.5|Exigente/);assert.match(html,/desde 3/);
assert.match(ctx.htmlResumenCalificacion({docente:'X',total:0}),/Todavía nadie/);
html=ctx.htmlResumenCalificacion({docente:'X',total:12,promedio:'4.25',etiquetas:[{etiqueta:'buena_onda',n:5},{etiqueta:'paciente',n:4},{etiqueta:'<img src=x>',n:3}],mi_estrellas:4});
assert.match(html,/4\.3<\/strong>/);assert.match(html,/12 calificaciones en este ramo/);
assert.match(html,/Buena onda · Paciente/,'las más frecuentes, en orden');
assert.doesNotMatch(html,/<img/,'una etiqueta desconocida no se pinta');
assert.match(html,/Tu calificación: 4 de 5/);
assert.doesNotMatch(html,/verde|rojo|aprobado|reprobado/,'no usa el semáforo');

// Las etiquetas describen a la persona, no la clase, y ninguna es negativa.
const ids=plano(vm.runInContext('PROFESOR_ETIQUETAS',ctx)).map(x=>x.id);
assert.deepEqual(ids,['buena_onda','amable','paciente','flexible','puntual','motiva','escucha','exigente']);

// El payload lleva solo el contexto de la sección, las estrellas y hasta 3 etiquetas conocidas.
const contexto={p_ramo_id:'local-1',p_seccion:2,p_periodo:'2026-2'};
assert.deepEqual(plano(ctx.payloadCalificacion(contexto,5,['amable','amable','explica_claro','paciente','puntual','escucha'])),
  {...contexto,p_estrellas:5,p_etiquetas:['amable','paciente','puntual']});

// El panel compara nombres como el servidor: tildes, mayúsculas y signos no cuentan.
assert.equal(ctx.nombreProfesorNormal('María José  Pérez'),ctx.nombreProfesorNormal('maria jose perez'));
assert.notEqual(ctx.nombreProfesorNormal('María José Pérez'),ctx.nombreProfesorNormal('Ricardo González'));
assert.match(ctx.errorCalificacion({message:'profesor sin informar'}),/quién te hace clases/);
console.log('OK calificaciones UI: umbral de 3, etiquetas personales, escape y payload mínimo');
