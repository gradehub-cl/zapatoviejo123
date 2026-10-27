// Promedio público, etiquetas sugeridas y payload del panel. Datos sintéticos.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const read=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
const ctx={S:{tenant:'uc',ramos:[]},currentUser:null,semester:()=>'2026-2',
  esc:s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),document:{getElementById:()=>null}};
vm.createContext(ctx);vm.runInContext(read('data.js')+'\n'+read('render-main.js'),ctx);
const plano=x=>JSON.parse(JSON.stringify(x));
assert.equal(ctx.htmlResumenCalificacion({total:2,promedio:4.5,etiquetas:[{etiqueta:'exigente',n:2}]}),'');
assert.equal(ctx.htmlResumenCalificacion({total:0}), '');
const html=ctx.htmlResumenCalificacion({total:12,promedio:'4.25',etiquetas:[{etiqueta:'buena_onda',n:5},{texto:'<img>',n:3}],mi_estrellas:4});
assert.match(html,/4\.3<\/strong>/);assert.doesNotMatch(html,/12|calificaciones|Buena onda|<img|Tu calificación/,'la ficha solo publica el promedio');
const etiquetas=plano(vm.runInContext('PROFESOR_ETIQUETAS',ctx));
assert.equal(etiquetas.length,14);assert(etiquetas.every(x=>x.valencia>=1&&x.valencia<=5));
assert.deepEqual(plano(ctx.etiquetasSugeridasProfesor(0)),[]);
const negativas=plano(ctx.etiquetasSugeridasProfesor(1));assert.equal(negativas.length,6);assert(negativas.includes('cuesta_entenderle'));assert(!negativas.includes('motiva'));
const positivas=plano(ctx.etiquetasSugeridasProfesor(5));assert.equal(positivas.length,6);assert(positivas.includes('motiva'));assert(!positivas.includes('cuesta_entenderle'));
assert(plano(ctx.etiquetasSugeridasProfesor(5,['cuesta_entenderle'])).includes('cuesta_entenderle'),'las marcadas se conservan al cambiar de estrellas');
const contexto={p_ramo_id:'local-1',p_seccion:2,p_periodo:'2026-2'};
assert.deepEqual(plano(ctx.payloadCalificacion(contexto,5,['amable','amable','inexistente','paciente','puntual','escucha'])),{...contexto,p_estrellas:5,p_etiquetas:['amable','paciente','puntual'],p_otros:[]});
assert.deepEqual(plano(ctx.payloadCalificacion(contexto,3,['exigente'],['Transmite calma','Clases claras'])),{...contexto,p_estrellas:3,p_etiquetas:['exigente'],p_otros:['Transmite calma','Clases claras']});
assert.deepEqual(plano(ctx.payloadCalificacion(contexto,3,['exigente','amable'],['Uno bueno','Dos bueno'])).p_otros,['Uno bueno'],'tres en total');
assert.equal(ctx.normalEtiquetaEscrita(' Transmite  CÁLMA '),'transmite calma');
assert.equal(ctx.nombreCorto('Lucas José Irarrázaval Bulnes'),'Lucas J. Irarrázaval');
assert.equal(ctx.nombreCorto('María José Pérez'),'María J. Pérez');
assert.equal(ctx.nombreCorto('Carlos Pérez González'),'Carlos Pérez');
assert.equal(ctx.nombreCorto('José de la Fuente González'),'José de la Fuente');
assert.equal(ctx.nombreProfesorNormal('María José  Pérez'),ctx.nombreProfesorNormal('maria jose perez'));
assert.equal(ctx.errorCalificacion({message:'texto no permitido'}),'Esa etiqueta no se puede usar');
console.log('OK calificaciones UI: promedio sin etiquetas, nombre corto, valencias, selección persistente, Otro y payload mínimo');
