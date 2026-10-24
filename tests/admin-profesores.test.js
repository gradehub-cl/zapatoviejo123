// Fila de cada profesor en Admin › Profesores (Lucas, 2026-10-23). Datos
// sintéticos. Aceptar es la acción principal de una postulación; Eliminar solo
// aparece si no hay historial ni alumnos que perder.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
const ctx={console,esc};vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname,'../marketplace.js'),'utf8'),ctx);
const fila=p=>{ctx.__p={user_id:'u1',nombre:'Profe sintético',correo:'profe@ejemplo.cl',anuncios:[],tiene_historial:false,alumnos_conectados:0,...p};return vm.runInContext('personaAdminHigHTML(__p)',ctx);};
const pend=fila({estado:'pendiente',presentacion:'<b>Enseño</b> cálculo hace años',solicitado_at:'2026-10-20T15:00:00Z'});
assert.match(pend,/class="accion-principal" data-admin-postulacion="u1" data-estado="aprobado">Aceptar/,'aceptar es la acción principal');
assert.match(pend,/data-estado="rechazado">Rechazar/);
assert.doesNotMatch(pend,/data-admin-eliminar/,'una postulación se rechaza, no se elimina');
assert.match(pend,/&lt;b&gt;Enseño/,'la presentación se muestra para decidir, sin entrar como HTML');
assert.match(pend,/postuló el 20 de octubre/);
const limpio=fila({estado:'aprobado'});
assert.match(limpio,/data-estado="suspendido">Pausar profesor/);
assert.match(limpio,/data-admin-eliminar="u1"/,'sin historial se puede eliminar');
const hist=fila({estado:'aprobado',tiene_historial:true});
assert.doesNotMatch(hist,/data-admin-eliminar/);
assert.match(hist,/Tiene campañas con cobros: páusalo en vez de eliminarlo/);
const alum=fila({estado:'suspendido',alumnos_conectados:3});
assert.doesNotMatch(alum,/data-admin-eliminar/);
assert.match(alum,/Tiene 3 alumnos conectados/);
assert.match(alum,/data-estado="aprobado">Reactivar profesor/);
const viejo=fila({estado:'aprobado',tiene_historial:undefined,alumnos_conectados:undefined});
assert.doesNotMatch(viejo,/data-admin-eliminar/,'sin el SQL nuevo no se ofrece eliminar a ciegas');
assert.match(fila({estado:'rechazado'}),/data-admin-postulacion="u1" data-estado="aprobado">Aceptar/,'una rechazada se puede aceptar');
console.log('OK admin profesores: aceptar, rechazar, pausar y eliminar solo cuando no se pierde nada');
