// Estudiante o profesor particular (#697). Desde 2026-11-03 no hay paso para
// elegirlo: todos parten como estudiantes y el profesor llega con la intención
// que dejó la entrada («Soy profesor particular» o gradehub.cl/?dar-clases).
//
// Lo que este test fija:
// - El estudiante recorre los pasos 1 a 5, con su número y condición de siempre.
// - El primer paso ofrece cerrar sesión en vez de Atrás.
// - El profesor se salta universidad, carrera, generación y ramos, confirma
//   tener 18 o más, y su cuenta solo queda creada si la postulación llegó.
// La pauta y los datos son sintéticos: es un test de mecanismo.
const fs = require('fs'), vm = require('vm');
const raiz = __dirname + '/../';
const src = ['data.js', 'engine.js', 'app.js', 'app-session.js', 'marketplace.js', 'render-main.js', 'render-agenda.js']
  .map(f => fs.readFileSync(raiz + f, 'utf8')).join('\n');
const html = fs.readFileSync(raiz + 'index.html', 'utf8');

const nuevo = () => ({ style: { setProperty() {}, removeProperty() {} }, checked: false, addEventListener() {}, appendChild() {}, classList: { add() {}, remove() {}, toggle() {}, contains() { return false } }, value: '', innerHTML: '', textContent: '', disabled: false, hidden: false, focus() {}, select() {}, setAttribute() {}, removeAttribute() {}, getAttribute() { return null }, querySelectorAll() { return [] }, querySelector() { return null }, clientWidth: 400, clientHeight: 400, scrollTop: 0, dataset: {}, click() {}, closest() { return null }, insertBefore() {}, removeChild() {}, remove() {}, getBoundingClientRect() { return { top: 0, left: 0, width: 0, height: 0, bottom: 0, right: 0 } }, children: [], firstElementChild: null, contains() { return false } });
const elementos = {};
const el = id => (elementos[id] = elementos[id] || nuevo());
const eventos = [];
const ctx = {
  window: { addEventListener() {}, matchMedia: () => ({ matches: false, addEventListener() {}, addListener() {} }) },
  document: { getElementById: el, createElement: nuevo, addEventListener() {}, documentElement: { style: { setProperty() {}, removeProperty() {} }, setAttribute() {}, removeAttribute() {}, getAttribute() { return null } }, querySelector: () => null, querySelectorAll: () => [], body: nuevo() },
  localStorage: { getItem() { return null }, setItem() {}, removeItem() {} },
  navigator: {}, location: { origin: '', pathname: '/', search: '', hash: '' },
  history: { replaceState() {} }, setTimeout, clearTimeout, console,
  gtag: (tipo, evento, params) => eventos.push({ evento, params }),
  requestAnimationFrame() { return 0 }, cancelAnimationFrame() {},
  matchMedia: () => ({ matches: false, addEventListener() {}, addListener() {} }),
};
vm.createContext(ctx); vm.runInContext(src, ctx);
const run = n => vm.runInContext(n, ctx);

// Lo que sale de la app se reemplaza por registros: acá no hay Supabase.
run(`
  var _postulaciones=[],_declaraciones=[],_entro=0,_modales=0,_syncProfileReal=syncProfile,_respuestaPostular={ok:true,perfil:{estado:'pendiente'}},_perfilPrevio={ok:true,perfil:null};
  postularProfesor=async(nombre,presentacion)=>{_postulaciones.push({nombre,presentacion});return _respuestaPostular;};
  perfilProfesorActual=async()=>_perfilPrevio;
  registrarDeclaracionEdad=d=>{_declaraciones.push(d||{});};
  var _salidas=0;signOut=()=>{_salidas++;};
  syncProfile=()=>{};save=()=>{};enterApp=()=>{_entro++;};openModal=()=>{_modales++;};
`);

let ok = 0, fail = 0;
const chk = (n, c) => { if (c) { ok++; console.log('  OK   ' + n); } else { fail++; console.log('  FAIL ' + n); } };

function empezar() {
  run('S=freshState()');
  for (const id of ['ob-name', 'ob-prof-nombre', 'ob-prof-presentacion']) el(id).value = '';
  el('ob-prof-error').textContent = '';
  run('obIniciar()');
  chk('cada pasada parte sin la confirmación de edad marcada', el('ob-prof-mayor').checked === false);
  // Las pruebas que no tratan de la edad parten de alguien que ya la confirmó.
  el('ob-prof-mayor').checked = true;
}
const PRESENTACION = 'Hago clases de Cálculo I y II hace tres años.';

(async () => {
  console.log('\n=== Todos parten como estudiantes, en el paso 1 ===');
  empezar();
  chk('el onboarding parte en el paso 1', run('obStep') === 1);
  chk('como estudiante', run('obTipo') === 'estudiante');
  chk('ya no hay paso 0 ni radios de tipo de cuenta', !/data-step="0"/.test(html) && !/name="ob-tipo"/.test(html));
  chk('el estudiante recorre 1, 2, 3, 4 y 5', JSON.stringify(run('obPasos("estudiante")')) === '[1,2,3,4,5]');
  chk('el paso 1 pide solo el nombre', run(`obStepValid(1,{tipo:'estudiante',nombre:'Ana'})`) === true && run(`obStepValid(1,{tipo:'estudiante',nombre:''})`) === false);
  chk('en el primer paso, el botón de la izquierda es Cerrar sesión', el('ob-back').hidden === false && el('ob-back').textContent === 'Cerrar sesión');
  run('obBack()');
  chk('y cierra sesión', run('_salidas') === 1 && run('obStep') === 1);
  el('ob-name').value = 'Ana'; run('obNext()');
  chk('del 1 a la universidad, como siempre', run('obStep') === 2);
  chk('desde ahí vuelve a decir Atrás', el('ob-back').textContent === 'Atrás');
  run('obBack()');
  chk('y Atrás no cierra sesión', run('obStep') === 1 && run('_salidas') === 1);

  console.log('\n=== La intención de la entrada lo deja como profesor ===');
  run('var _consumir=consumirEntradaProfesor;consumirEntradaProfesor=()=>true');
  empezar();
  chk('entra como profesor', run('obTipo') === 'profesor' && run('obStep') === 1);
  run('consumirEntradaProfesor=_consumir');

  console.log('\n=== El camino del profesor ===');
  empezar();
  run(`elegirTipoCuenta('profesor')`);
  chk('elegir Profesor cambia el tipo', run('obTipo') === 'profesor');
  chk('un valor que no es de la lista se ignora', (run(`elegirTipoCuenta('admin')`), run('obTipo')) === 'profesor');
  chk('el profesor recorre 1 y su paso propio', JSON.stringify(run('obPasos()')) === '[1,6]');
  chk('en el primer paso también puede cerrar sesión', el('ob-back').textContent === 'Cerrar sesión');

  el('ob-name').value = 'Ana'; run('obNext()');
  chk('del paso 1 salta a su paso, sin universidad ni ramos', run('obStep') === 6);
  chk('el nombre público parte en su nombre', el('ob-prof-nombre').value === 'Ana');
  chk('Atrás vuelve al paso 1, no al 5', (run('obBack()'), run('obStep')) === 1);
  run('obNext()');
  chk('sin presentación no se puede enviar', run('obStepValid(6)') === false);
  el('ob-prof-presentacion').value = 'Hago clases.';
  chk('con menos de 20 caracteres, tampoco', run('obStepValid(6)') === false);
  el('ob-prof-presentacion').value = PRESENTACION;
  chk('con nombre y presentación, sí', run('obStepValid(6)') === true);
  el('ob-prof-mayor').checked = false;
  chk('sin confirmar que tiene 18 o más, no', run('obStepValid(6)') === false);
  chk('la confirmación está en su paso y dice 18 años', /data-step="6"[\s\S]*id="ob-prof-mayor"[\s\S]*Tengo 18 años o más/.test(html));
  el('ob-prof-mayor').checked = true;
  el('ob-prof-nombre').value = 'A';
  chk('un nombre público de una letra no basta', run('obStepValid(6)') === false);
  el('ob-prof-nombre').value = 'Ana Profe';

  console.log('\n=== Si la postulación no llega, no hay cuenta de profesor ===');
  run(`_respuestaPostular={ok:false,error:'No pudimos enviar tu postulación. Intenta de nuevo.'};_perfilPrevio={ok:true,perfil:null}`);
  await run('completarOnboardingProfesor("Ana")');
  chk('no termina el onboarding', run('S.onboardingDone') === false && run('_entro') === 0);
  chk('la cuenta sigue siendo de estudiante', run('S.tipoCuenta') === 'estudiante');
  chk('y dice qué pasó', /No pudimos enviar/.test(el('ob-prof-error').textContent));
  chk('el botón vuelve a quedar disponible', run('obEnviandoProfesor') === false);

  console.log('\n=== Si ya había llegado (un reintento), cuenta como enviada ===');
  run(`_perfilPrevio={ok:true,perfil:{estado:'pendiente'}}`);
  await run('completarOnboardingProfesor("Ana")');
  chk('termina el onboarding', run('S.onboardingDone') === true && run('_entro') === 1);

  console.log('\n=== Con la postulación enviada ===');
  empezar();
  run(`elegirTipoCuenta('profesor');_respuestaPostular={ok:true,perfil:{estado:'pendiente'}};_perfilPrevio={ok:true,perfil:null};_postulaciones.length=0;_declaraciones.length=0`);
  el('ob-name').value = 'Ana'; el('ob-prof-nombre').value = 'Ana Profe'; el('ob-prof-presentacion').value = PRESENTACION;
  eventos.length = 0;
  run('obStep=6'); run('completeOnboarding()');
  await new Promise(r => setTimeout(r, 0));
  chk('la postulación va con lo que escribió', run('_postulaciones.length') === 1 && run('_postulaciones[0].nombre') === 'Ana Profe' && run('_postulaciones[0].presentacion') === PRESENTACION);
  chk('la cuenta queda como profesor', run('S.tipoCuenta') === 'profesor' && run('esCuentaProfesor()') === true);
  chk('con su nombre y sin ramos', run('S.userName') === 'Ana' && run('S.ramos.length') === 0);
  chk('el onboarding queda hecho', run('S.onboardingDone') === true);
  chk('la declaración se anota sin generación, porque no estudia acá', run('_declaraciones.length') === 1 && run('_declaraciones[0].generacion') == null && !('edad' in run('_declaraciones[0]')));
  const fin = eventos.filter(e => e.evento === 'onboarding_complete');
  chk('la analítica recibe solo el tipo, nada que escribió', fin.length === 1 && JSON.stringify(fin[0].params) === '{"tipo":"profesor"}');
  chk('el tipo sobrevive el normalize de la sincronización', run('normalize(JSON.parse(JSON.stringify(S))).tipoCuenta') === 'profesor');
  chk('el aviso dice que Clases ya está disponible', /preparar tu anuncio en Clases/.test(el('modal-content').innerHTML)
    && !/aparece la pestaña Clases/.test(el('modal-content').innerHTML));

  console.log('\n=== Una postulación previa conserva su estado ===');
  empezar();
  run(`elegirTipoCuenta('profesor');_respuestaPostular={ok:false};_perfilPrevio={ok:true,perfil:{estado:'rechazado'}}`);
  el('ob-name').value='Ana';el('ob-prof-nombre').value='Ana Profe';el('ob-prof-presentacion').value=PRESENTACION;
  const modalesAntes=run('_modales');
  await run('completarOnboardingProfesor("Ana")');
  chk('una postulación rechazada entra para ver su estado sin falso aviso de recepción',
    run('S.tipoCuenta')==='profesor'&&run('_modales')===modalesAntes);

  console.log('\n=== «Sigue como estudiante» devuelve el camino de siempre ===');
  empezar();
  run(`elegirTipoCuenta('profesor');obStep=6;seguirComoEstudiante()`);
  chk('los pasos vuelven a ser 1 a 5', JSON.stringify(run('obPasos()')) === '[1,2,3,4,5]');
  chk('y sigue en la universidad, sin repetir el nombre', run('obStep') === 2 && run('obTipo') === 'estudiante');
  chk('y un estudiante nuevo no queda como profesor', run('S.tipoCuenta') === 'estudiante');

  console.log('\n=== El perfil académico no inventa universidad para un profesor ===');
  run(`var _perfilesSubidos=[];
    supabaseClient={from:tabla=>({upsert:datos=>{_perfilesSubidos.push({tabla,datos});return {error:null}}})};
    currentUser={id:'usuario-sintetico'};syncProfile=_syncProfileReal;
    S=freshState();S.tipoCuenta='profesor';S.userName='Ana';`);
  await run('syncProfile()');
  chk('profesor sin universidad no sube FEN por el valor técnico de S',run('_perfilesSubidos.length')===0);
  run(`S.tipoCuenta='estudiante';S.tenant='uc';S.carrera='ing';S.careerSemestre=3`);
  await run('syncProfile()');
  chk('estudiante sigue sincronizando su perfil académico',run('_perfilesSubidos.length')===1
    &&run('_perfilesSubidos[0].tabla')==='profiles'
    &&run('_perfilesSubidos[0].datos.universidad')==='uc'
    &&run('_perfilesSubidos[0].datos.semestre')===3);

  console.log('\nPASS: ' + ok + '   FAIL: ' + fail);
  process.exit(fail ? 1 : 0);
})();
