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
assert.deepEqual(plano(ctx.payloadCalificacion(contexto,5,['amable','amable','inexistente','paciente','puntual','escucha'])),{...contexto,p_estrellas:5,p_etiquetas:['amable','paciente','puntual'],p_otro:null});
assert.deepEqual(plano(ctx.payloadCalificacion(contexto,3,['exigente'],'Transmite calma')),{...contexto,p_estrellas:3,p_etiquetas:['exigente'],p_otro:'Transmite calma'});
assert.equal(ctx.nombreCorto('Lucas José Irarrázaval Bulnes'),'Lucas J. Irarrázaval');
assert.equal(ctx.nombreCorto('María José Pérez'),'María J. Pérez');
assert.equal(ctx.nombreCorto('Carlos Pérez González'),'Carlos Pérez');
assert.equal(ctx.nombreCorto('José de la Fuente González'),'José de la Fuente');
assert.equal(ctx.nombreProfesorNormal('María José  Pérez'),ctx.nombreProfesorNormal('maria jose perez'));
assert.equal(ctx.errorCalificacion({message:'texto no permitido'}),'Esa etiqueta no se puede usar');

// Oferta sintética: coincidencia exacta de universidad, período, sigla y sección.
vm.runInContext("PROFESORES_PROPUESTOS.uc['2026-2'].TEST101={1:'Ana Ejemplo',2:'Tomás Prueba'};",ctx);
const r={id:'local-1',sigla:' test101 ',nombre:'Curso sintético',seccion:2};
ctx.S.ramos=[r];ctx.currentUser={id:'cuenta-sintetica'};ctx.esCuentaProfesor=()=>false;
const antes=JSON.stringify(ctx.S);
assert.equal(ctx.profesorPropuestoRamo(r,contexto),'Tomás Prueba');
assert.equal(ctx.profesorPropuestoRamo({...r,sigla:'',origen:{tenant:'uc',ramoKey:'TEST101'}},contexto),'Tomás Prueba','admite la sigla del origen');
assert.equal(ctx.profesorPropuestoRamo({...r,sigla:'OTRO101',origen:{tenant:'uc',ramoKey:'TEST101'}},contexto),'','la sigla explícita manda');
assert.equal(ctx.profesorPropuestoRamo({...r,seccion:1},{...contexto,p_seccion:1}),'Ana Ejemplo','no mezcla secciones');
for(const c of [null,{...contexto,p_periodo:'2027-2'},{...contexto,p_periodo:'2026-1'},
  {...contexto,p_seccion:null},{...contexto,p_seccion:1},{...contexto,p_seccion:2.5},{...contexto,p_ramo_id:'otro'}]){
  assert.equal(ctx.profesorPropuestoRamo(r,c),'');
}
assert.equal(ctx.profesorPropuestoRamo({...r,seccion:99},{...contexto,p_seccion:99}),'','sin oferta exacta no propone otro profesor');
assert.equal(ctx.profesorPropuestoRamo({...r,sigla:null},contexto),'','no infiere siglas por nombre');
assert.equal(ctx.profesorPropuestoRamo({...r,origen:{tenant:'fen'}},contexto),'','no cruza universidades');
ctx.S.tenant='fen';assert.equal(ctx.profesorPropuestoRamo(r,contexto),'');ctx.S.tenant='uc';
ctx.esCuentaProfesor=()=>true;assert.equal(ctx.profesorPropuestoRamo(r,contexto),'');ctx.esCuentaProfesor=()=>false;

// La propuesta usa la confirmación existente y abrirla no guarda un aporte.
let nodos={},abiertos=0,llamadas=[];
const contenido={_html:'',get innerHTML(){return this._html;},set innerHTML(v){this._html=v;nodos={};},
  querySelector(s){return nodos[s]||(nodos[s]={});}};
ctx.document.getElementById=()=>contenido;ctx.openModal=()=>abiertos++;ctx.enfocarEnHoja=()=>{};
ctx.supabaseClient={rpc:(...args)=>llamadas.push(args)};
ctx.abrirCalificarProfesor(r,contexto,{nombre:'',mio:'',calif:{}});
assert.match(contenido.innerHTML,/¿Es tu profesor <strong>Tomás Prueba<\/strong>\?/);
assert.match(contenido.innerHTML,/No, es otra persona/);assert.match(contenido.innerHTML,/Sí, es mi profesor/);
assert.equal(abiertos,1);assert.deepEqual(llamadas,[],'proponer no simula aportes ni escribe en Supabase');
ctx.abrirCalificarProfesor(r,contexto,{nombre:'Docente del consenso',mio:'',calif:{}});
assert.match(contenido.innerHTML,/<strong>Docente del consenso<\/strong>/,'el consenso real tiene prioridad');
ctx.abrirCalificarProfesor(r,contexto,{nombre:'',mio:'Mi docente confirmado',calif:{}});
assert.match(contenido.innerHTML,/<strong>Mi docente confirmado<\/strong>/,'conserva el nombre propio antes de la oferta');
assert.equal(JSON.stringify(ctx.S),antes,'abrir y proponer no cambian ramos ni notas');
console.log('OK calificaciones UI: promedio, valencias, Otro, propuestas por sección y confirmación sin escrituras');
