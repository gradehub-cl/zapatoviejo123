// La sección del ramo es opcional y la escribe el estudiante al editarlo.
// Lo que no se puede romper: un ramo guardado antes no cambia, vaciar el campo
// quita la sección, y algo mal escrito se avisa en vez de borrarse en silencio.
const fs = require('fs'), vm = require('vm');
const raiz = __dirname + '/../';
const appPath = process.env.GRADEHUB_APP || raiz + 'app.js';

function elemento() {
  const atributos = {};
  return {
    style: { setProperty() {}, removeProperty() {} }, textContent: '', innerHTML: '', value: '', className: '', hidden: true, isConnected: true,
    classList: { add() {}, remove() {}, contains() { return false } },
    addEventListener() {}, focus() { this.focused = true; }, select() {},
    setAttribute(k, v) { atributos[k] = String(v); }, removeAttribute(k) { delete atributos[k]; }, getAttribute(k) { return atributos[k] || null; },
    querySelector() { return null; }, querySelectorAll() { return []; }, appendChild() {}, remove() {}, dataset: {}, clientWidth: 400,
  };
}
function arnes() {
  const src = ['data.js', 'engine.js'].map(f => fs.readFileSync(raiz + f, 'utf8'))
    .concat(fs.readFileSync(appPath, 'utf8'), fs.readFileSync(raiz + 'app-session.js', 'utf8'), fs.readFileSync(raiz + 'render-main.js', 'utf8'), fs.readFileSync(raiz + 'render-agenda.js', 'utf8')).join('\n');
  const ids = {}; const get = id => ids[id] || (ids[id] = elemento());
  const stub = elemento();
  const ctx = {
    window: { addEventListener() {}, matchMedia: () => ({ matches: false, addEventListener() {}, addListener() {} }) },
    document: { getElementById: get, createElement: elemento, addEventListener() {}, documentElement: { ...elemento(), style: { setProperty() {}, removeProperty() {} } }, querySelector: () => stub, querySelectorAll: () => [], body: stub },
    localStorage: { getItem() { return null }, setItem() {}, removeItem() {} }, navigator: {}, location: { origin: '', pathname: '', hash: '' },
    setTimeout: fn => fn(), clearTimeout() {}, requestAnimationFrame: fn => fn(), cancelAnimationFrame() {}, console,
  };
  vm.createContext(ctx); vm.runInContext(src, ctx);
  // La ficha no se dibuja en este arnés: solo interesa qué quedó guardado.
  vm.runInContext('renderRamo=()=>{};closeModal=()=>{};track=()=>{};', ctx);
  return { ctx, el: get, val: c => vm.runInContext(c, ctx) };
}

let ok = 0, fail = 0;
const chk = (n, c) => { if (c) { ok++; console.log('  OK   ' + n); } else { fail++; console.log('  FAIL ' + n); } };

const RAMO = { id: 'r1', nombre: 'Cálculo de prueba', color: '#2563eb', creditos: 10, categorias: [{ id: 'c1', nombre: 'Examen', peso: 100, notas: [{ id: 'n1', nombre: 'Examen', valor: 5.5 }] }], gates: [] };

console.log('\n=== Cuentas que ya existen ===');
{
  const { val } = arnes();
  const antes = val(`normalize({ramos:[${JSON.stringify(RAMO)}]}).ramos[0]`);
  chk('un ramo guardado sin sección carga con sección vacía', antes.seccion === null);
  chk('y conserva nombre, créditos y notas', antes.nombre === RAMO.nombre && antes.creditos === 10 && antes.categorias[0].notas[0].valor === 5.5);
  chk('su promedio no cambia', val(`ramoAvg(normalize({ramos:[${JSON.stringify(RAMO)}]}).ramos[0])`) ===
    val(`ramoAvg(normalize({ramos:[${JSON.stringify({ ...RAMO, seccion: 4 })}]}).ramos[0])`));
  chk('una sección guardada se conserva al recargar', val(`normalize({ramos:[${JSON.stringify({ ...RAMO, seccion: 4 })}]}).ramos[0].seccion`) === 4);
  chk('un valor que no es sección se descarta al cargar',
    [0, 1000, 3.5, '3', -1, null].every(v => val(`normalize({ramos:[${JSON.stringify({ ...RAMO, seccion: v })}]}).ramos[0].seccion`) === null));
}

console.log('\n=== Lo que se escribe ===');
{
  const { val } = arnes();
  chk('vacío es sin sección', val(`parseSeccion('')`) === null && val(`parseSeccion('   ')`) === null);
  chk('un número con espacios alrededor sirve', val(`parseSeccion(' 12 ')`) === 12 && val(`parseSeccion('999')`) === 999);
  chk('letras, cero o decimales no son una sección', ['3A', '0', '2.5', 'uno', '-1'].every(t => val(`parseSeccion(${JSON.stringify(t)})`) === undefined));
}

function editar(valor, seccionPrevia) {
  const k = arnes();
  k.val(`S=normalize({ramos:[${JSON.stringify({ ...RAMO, seccion: seccionPrevia })}]});currentRamoId='r1';modalColor='#2563eb';`);
  k.el('m-ramo-name').value = 'Nombre nuevo';
  k.el('m-ramo-creditos').value = '10';
  k.el('m-ramo-seccion').value = valor;
  const resultado = k.val('confirmEditRamo()');
  return { k, r: k.val('S.ramos[0]'), resultado };
}

console.log('\n=== Editar el ramo ===');
{
  const { r } = editar('3', null);
  chk('escribir la sección la guarda como número', r.seccion === 3 && r.nombre === 'Nombre nuevo');
}
{
  const { r } = editar('', 7);
  chk('vaciar el campo quita la sección', r.seccion === null && r.nombre === 'Nombre nuevo');
}
{
  const { k, r, resultado } = editar('3A', 7);
  chk('una sección mal escrita no guarda nada', resultado === false && r.seccion === 7 && r.nombre === RAMO.nombre);
  chk('y avisa en el campo', k.el('m-ramo-seccion').getAttribute('aria-invalid') === 'true' &&
    k.el('m-ramo-seccion').focused && k.el('m-ramo-seccion-error').hidden === false && /número/.test(k.el('m-ramo-seccion-error').textContent));
}
{
  const k = arnes();
  k.val(`S=normalize({ramos:[${JSON.stringify({ ...RAMO, seccion: 5 })}]});currentRamoId='r1';openModal=()=>{};renderModalColors=()=>{};openEditRamoModal();`);
  const html = k.el('modal-content').innerHTML;
  chk('el modal muestra la sección guardada sin el texto opcional',
    /id="m-ramo-seccion" value="5"/.test(html) && /for="m-ramo-seccion">Sección<\/label>/.test(html));
  chk('editar normalmente conserva el foco en el nombre y no marca la sección',
    k.el('m-ramo-name').focused && !/id="m-ramo-seccion"[^>]*aria-invalid/.test(html));
}

console.log('\n=== Ficha ===');
const render = fs.readFileSync(raiz + 'render-main.js', 'utf8');
chk('la ficha muestra la sección solo si hay una', /r\.seccion\?`Sección \$\{r\.seccion\}`:''/.test(render));

// El paso de sección usa las funciones reales de validación y consulta, con
// respuestas de red inventadas. Nunca lee ni escribe cuentas de producción.
function flujoSeccion({sigla=null,tenant='uc'}={}){
  const k=arnes(),form=elemento(),input=k.el('m-ramo-seccion'),mensaje=k.el('calif-seccion-error'),boton=elemento(),cancelar=elemento();
  const foto=k.el('m-horario-foto'),subirFoto=elemento(),estado=k.el('m-horario-estado');
  const eventos=[];let respaldar=async()=>true,abiertos=0,abierta=true;
  k.el('modal').classList.contains=clase=>clase==='open'&&abierta;
  const contenido=k.el('modal-content');contenido.querySelector=()=>form;contenido.contains=n=>n===form&&form.isConnected;
  form.querySelector=s=>s==='input'?input:s==='[role=alert]'?mensaje:s==='[type=submit]'?boton:s==='[data-cancelar]'?cancelar:s==='[role=status]'?estado:sigla&&tenant==='uc'?(s==='[type=file]'?foto:s==='[data-foto]'?subirFoto:null):null;
  k.ctx.__rpc={rpc:async(nombre,args)=>{eventos.push(nombre);return {data:[nombre==='profesor_docente_estado'?{nombre_publico:null,mi_nombre:null}:{total:0,puede_calificar:true}]};}};
  k.val(`S=normalize({tenant:${JSON.stringify(tenant)},ramos:[${JSON.stringify({...RAMO,sigla})}]});currentRamoId='r1';currentUser={id:'cuenta-sintetica'};
    supabaseClient=__rpc;openModal=()=>{};`);
  // closeModal oculta la hoja pero conserva el formulario conectado al DOM.
  k.ctx.closeModal=()=>{abierta=false;};
  k.ctx.save=()=>eventos.push('guardar');
  k.ctx.respaldoAlDia=async()=>{eventos.push('respaldar');return respaldar();};
  k.ctx.abrirCalificarProfesor=(_r,c)=>{eventos.push('calificar');abiertos++;chk('continúa con la sección elegida',c.p_seccion===Number(input.value));};
  k.ctx.renderRamo=()=>eventos.push('repintar');
  const antes=k.val('JSON.stringify(S)');
  k.ctx.renderDocenteRamo(k.val('S.ramos[0]'));k.el('calif-accion').onclick();
  return {...k,form,input,mensaje,boton,cancelar,foto,subirFoto,estado,eventos,antes,enviar:()=>form.onsubmit({preventDefault(){}}),respaldar:fn=>{respaldar=fn;},abiertos:()=>abiertos};
}
async function probarPasoSeccion(){
  console.log('\n=== Sección dentro de Calificar ===');
  let f=flujoSeccion();const html=f.el('modal-content').innerHTML;
  chk('pide solo la sección dentro de la hoja de Calificar',/Calificar profesor/.test(html)&&/¿Cuál es tu sección\?/.test(html)&&!/Editar ramo|m-ramo-name/.test(html));
  chk('el foco va al campo numérico sin guardar ni consultar',f.input.focused&&/inputmode="numeric"/.test(html)&&f.eventos.length===0&&f.val('JSON.stringify(S)')===f.antes);
  f.cancelar.onclick();chk('cancelar antes de continuar no cambia datos',f.val('JSON.stringify(S)')===f.antes&&f.eventos.length===0);
  for(const invalida of ['', '0', '3A', '2.5', '1000']){
    f=flujoSeccion();f.input.value=invalida;await f.enviar();
    chk('rechaza sección '+JSON.stringify(invalida)+' antes de guardar',f.input.getAttribute('aria-invalid')==='true'&&/1 y 999/.test(f.mensaje.textContent)&&f.eventos.length===0&&f.val('JSON.stringify(S)')===f.antes);
  }
  f=flujoSeccion();f.input.value='3';await f.enviar();
  chk('guarda y respalda antes de consultar al profesor',f.eventos.join()===['guardar','respaldar','profesor_docente_estado','profesor_calificacion_estado','repintar','calificar'].join());
  const esperado=JSON.parse(f.antes);esperado.ramos[0].seccion=3;
  chk('solo cambia la sección en el ramo sintético',f.val('JSON.stringify(S)')===JSON.stringify(esperado)&&f.abiertos()===1);
  f=flujoSeccion();f.respaldar(async()=>false);f.input.value='3';f.mensaje.hidden=true;await f.enviar();
  chk('sin conexión conserva la sección local y permite reintentar con el error visible',f.val('S.ramos[0].seccion')===3&&!f.boton.disabled&&f.abiertos()===0&&!f.mensaje.hidden&&/guardar tu sección/.test(f.mensaje.textContent)&&f.eventos.join()==='guardar,respaldar');
  f.respaldar(async()=>true);await f.enviar();chk('el reintento continúa cuando queda respaldada',f.abiertos()===1);
  f=flujoSeccion();let terminar;f.respaldar(()=>new Promise(resolve=>terminar=resolve));f.input.value='3';
  const pendiente=f.enviar();await f.enviar();chk('doble envío no duplica el guardado',f.eventos.join()==='guardar,respaldar'&&f.boton.disabled);
  f.cancelar.onclick();terminar(true);await pendiente;chk('cancelar mientras guarda impide abrir la calificación tarde',f.abiertos()===0&&!f.eventos.includes('profesor_docente_estado'));
  f=flujoSeccion();f.respaldar(()=>new Promise(resolve=>terminar=resolve));f.input.value='3';const otra=f.enviar();
  f.val("currentUser={id:'otra-cuenta'};S=normalize({tenant:'uc',ramos:[]});");const estadoOtra=f.val('JSON.stringify(S)');
  terminar(true);await otra;chk('una respuesta de otra sesión no cambia ni abre nada en la cuenta nueva',f.abiertos()===0&&f.val('JSON.stringify(S)')===estadoOtra);
  f=flujoSeccion();f.input.value='3';f.ctx.__rpc.rpc=async()=>({error:{message:'red caída'}});await f.enviar();
  chk('un error al consultar deja la hoja con un reintento',f.abiertos()===0&&!f.boton.disabled&&/conectar/.test(f.mensaje.textContent));
  f=flujoSeccion();f.input.value='3';f.ctx.__rpc.rpc=async()=>({data:[{puede_calificar:false}]});await f.enviar();
  chk('la sección no omite el permiso del servidor para calificar',f.abiertos()===0&&/no puedes calificar/.test(f.mensaje.textContent));
}
async function probarFotoSeccion(){
  console.log('\n=== La misma foto del horario dentro de Calificar ===');
  const preparar=(lecturas=[{texto:'ABC1234-3 XYZ5678-8'}])=>{
    const f=flujoSeccion({sigla:'ABC1234'});let leidas=0;
    f.ctx.leerFotoOcr=async(_file,progreso)=>{leidas++;progreso(.5);return lecturas;};
    f.foto.files=[{type:'image/png',size:200000}];f.foto.value='foto';
    return {...f,leer:()=>f.foto.onchange(),leidas:()=>leidas};
  };
  let f=preparar();
  chk('ofrece la foto en la misma hoja, como alternativa secundaria',/class="horario-importar-link" data-foto>Sube una foto de tu horario/.test(f.el('modal-content').innerHTML)&&/type="file"[^>]*accept="image\/\*"/.test(f.el('modal-content').innerHTML));
  let elegidas=0;f.foto.click=()=>elegidas++;f.subirFoto.onclick();chk('el botón abre el selector compartido de imágenes',elegidas===1);
  f.mensaje.hidden=false;f.input.setAttribute('aria-invalid','true');await f.leer();
  chk('reutiliza el lector y rellena solo la sección del ramo actual',f.leidas()===1&&f.input.value==='3'&&/ABC1234 · Sección 3/.test(f.estado.textContent));
  chk('la lectura no guarda, agrega ramos ni califica',f.eventos.length===0&&f.val('JSON.stringify(S)')===f.antes&&f.abiertos()===0);
  chk('limpia el error, devuelve el foco y permite revisar antes de continuar',!f.input.getAttribute('aria-invalid')&&f.mensaje.hidden&&f.input.focused&&!f.boton.disabled&&!f.subirFoto.disabled&&!f.foto.disabled&&f.foto.value===''&&/Revisa el número/.test(f.estado.textContent));
  f.input.value='4';await f.enviar();chk('se puede corregir lo leído antes de guardarlo',f.val('S.ramos[0].seccion')===4);
  for(const lecturas of [[{texto:'XYZ5678-8'}],[{texto:'ABC1234'}],[{texto:'ABC1234-3 ABC1234-8'}]]){
    f=preparar(lecturas);f.input.value='7';await f.leer();
    chk('sin una sección inequívoca conserva lo escrito y avisa',f.input.value==='7'&&/No pudimos identificar la sección de ABC1234/.test(f.estado.textContent)&&f.eventos.length===0);
  }
  f=preparar([{texto:'ABC1234-3 ABC1234-3 ABC1234-8'}]);await f.leer();chk('usa la votación del lector existente',f.input.value==='3');
  for(const archivo of [{type:'application/pdf',size:10},{type:'image/png',size:21*1024*1024}]){
    f=preparar();f.foto.files=[archivo];await f.leer();chk('comparte la validación de tipo y tamaño sin leer ni guardar',f.leidas()===0&&f.eventos.length===0&&/Elige una imagen|pesa demasiado/.test(f.estado.textContent)&&!f.boton.disabled);
  }
  f=preparar();f.ctx.leerFotoOcr=async()=>{throw Error('sin lector');};await f.leer();
  chk('si falla la foto, permite reintentar o escribir la sección',/No pudimos leer la foto/.test(f.estado.textContent)&&!f.boton.disabled&&!f.subirFoto.disabled&&!f.input.disabled&&f.eventos.length===0);
  f=preparar();f.val('_horarioLeyendoFoto=true');await f.leer();
  chk('si aún termina una foto anterior, lo dice y permite volver a elegirla',/foto anterior/.test(f.estado.textContent)&&f.foto.value===''&&f.leidas()===0&&!f.subirFoto.disabled);
  f.val('_horarioLeyendoFoto=false');await f.leer();chk('puede reintentar cuando termina la lectura anterior',f.input.value==='3');
  f=preparar();let terminar;f.ctx.leerFotoOcr=()=>new Promise(resolve=>terminar=resolve);let pendiente=f.leer();
  await f.enviar();chk('no deja continuar ni cambiar el campo mientras lee',f.boton.disabled&&f.input.disabled&&f.subirFoto.disabled&&f.eventos.length===0);
  f.cancelar.onclick();terminar([{texto:'ABC1234-3'}]);await pendiente;
  chk('cancelar durante la lectura descarta el resultado',f.input.value===''&&f.val('JSON.stringify(S)')===f.antes&&f.eventos.length===0);
  f=preparar();f.ctx.leerFotoOcr=()=>new Promise(resolve=>terminar=resolve);pendiente=f.leer();f.val("currentUser={id:'otra-cuenta'};S=normalize({ramos:[]});");const otra=f.val('JSON.stringify(S)');terminar([{texto:'ABC1234-3'}]);await pendiente;
  chk('una foto tardía no rellena datos después de cambiar de cuenta',f.input.value===''&&f.val('JSON.stringify(S)')===otra&&f.eventos.length===0);
  f=preparar();f.ctx.leerFotoOcr=()=>new Promise(resolve=>terminar=resolve);pendiente=f.leer();f.val("S.ramos[0].sigla='XYZ5678'");terminar([{texto:'ABC1234-3'}]);await pendiente;
  chk('si el ramo cambió de sigla, no aplica la sección del anterior',f.input.value===''&&f.eventos.length===0);
  f=flujoSeccion();chk('sin sigla no intenta reconocer por un nombre parecido',!/data-foto/.test(f.el('modal-content').innerHTML));
  f=flujoSeccion({sigla:'ABC1234',tenant:'fen'});chk('otras universidades conservan el campo manual sin ofrecer el lector UC',!/data-foto/.test(f.el('modal-content').innerHTML));
}
probarPasoSeccion().then(probarFotoSeccion).then(()=>{
  console.log('\nPASS: ' + ok + '   FAIL: ' + fail);process.exit(fail ? 1 : 0);
}).catch(e=>{console.error(e);process.exit(1);});
