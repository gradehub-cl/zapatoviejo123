// La calculadora pública de puntaje → nota (calculadora.html, issue #735).
// La fórmula vive en engine.js para que la página y la app den la misma nota;
// acá se prueban los casos que alguien comprobaría con su prueba en la mano.
const fs = require('fs'), path = require('path');
const vm = require('vm');
const raiz = path.join(__dirname, '..');
const leer = f => fs.readFileSync(path.join(raiz, f), 'utf8');
const { gh_notaDesdePuntaje } = require('../engine.js');

let ok = 0, fail = 0;
const chk = (n, c) => { if (c) { ok++; console.log('  OK   ' + n); } else { fail++; console.log('  FAIL ' + n); } };
const nota = (p, t, o) => (gh_notaDesdePuntaje(p, t, o) || {}).nota;

console.log('\n=== Criterios de la issue ===');
chk('25 de 50 con 50% es 4,0', nota(25, 50) === 4.0);
chk('30 de 50 con 60% es 4,0', nota(30, 50, { exigencia: 0.6 }) === 4.0);
chk('50 de 50 es 7,0', nota(50, 50, { exigencia: 0.6 }) === 7.0);
chk('0 de 50 es 1,0', nota(0, 50, { exigencia: 0.6 }) === 1.0);
chk('la exigencia por defecto es 50%', gh_notaDesdePuntaje(10, 40).puntajeAprobacion === 20);

console.log('\n=== Las dos rectas ===');
// Bajo el corte: 1 + 3 × 15/30 = 2,5.
chk('15 de 50 con 60% es 2,5', nota(15, 50, { exigencia: 0.6 }) === 2.5);
// Sobre el corte: 4 + 3 × 10/20 = 5,5.
chk('40 de 50 con 60% es 5,5', nota(40, 50, { exigencia: 0.6 }) === 5.5);
chk('acepta medio punto: 23,5 de 47 con 50% es 4,0', nota(23.5, 47) === 4.0);

console.log('\n=== Redondeo en el borde del 4,0 ===');
// 29,5 de 50 con 60% da 3,95 exacto en papel: aproximado es 4,0 y truncado 3,9.
chk('3,95 aproximado es 4,0', nota(29.5, 50, { exigencia: 0.6 }) === 4.0);
chk('3,95 truncado es 3,9', nota(29.5, 50, { exigencia: 0.6, truncar: true }) === 3.9);
chk('3,9 crudo sigue en 3,9', nota(29, 50, { exigencia: 0.6 }) === 3.9);
// Un 4,0 justo no puede caer a 3,9 al truncar por el punto flotante.
chk('un 4,0 exacto truncado sigue en 4,0', nota(21, 35, { exigencia: 0.6, truncar: true }) === 4.0);
chk('7,0 truncado sigue en 7,0', nota(70, 70, { exigencia: 0.6, truncar: true }) === 7.0);

console.log('\n=== Otra escala ===');
chk('aprobación 4,5 con 60%: el corte vale 4,5', nota(30, 50, { exigencia: 0.6, naprob: 4.5 }) === 4.5);
chk('mínima 2,0: cero puntos es 2,0', nota(0, 50, { nmin: 2 }) === 2.0);

console.log('\n=== Datos que no forman una escala ===');
chk('puntaje sobre el total → null', gh_notaDesdePuntaje(51, 50) === null);
chk('puntaje negativo → null', gh_notaDesdePuntaje(-1, 50) === null);
chk('total cero → null', gh_notaDesdePuntaje(0, 0) === null);
chk('exigencia 0% → null', gh_notaDesdePuntaje(10, 50, { exigencia: 0 }) === null);
chk('exigencia 100% → null', gh_notaDesdePuntaje(10, 50, { exigencia: 1 }) === null);
chk('escala que no sube → null', gh_notaDesdePuntaje(10, 50, { nmin: 4, naprob: 4 }) === null);
chk('NaN → null', gh_notaDesdePuntaje(NaN, 50) === null);

console.log('\n=== La página ===');
const html = leer('calculadora.html');
// La página no tiene su propia copia de la fórmula: si la tuviera, la app y la
// calculadora podrían dar notas distintas para la misma prueba.
chk('carga engine.js sellado con la versión del deploy', html.includes('<script src="/engine.js?v=__ASSET_VERSION__"></script>'));
chk('calcula con gh_notaDesdePuntaje', /gh_notaDesdePuntaje\(p,t,escala\)/.test(html));
const scripts = [...html.matchAll(/<script[^>]*src="([^"]+)"/g)].map(m => m[1]);
chk('no carga app.js ni pide sesión: solo engine.js y GA', scripts.length === 2 && scripts.includes('/engine.js?v=__ASSET_VERSION__') && scripts.some(s => s.startsWith('https://www.googletagmanager.com/gtag/js?id=')));
chk('guarda en una clave propia, no en gradehub_v1', html.includes("'gradehub_calculadora_v1'") && !html.includes('gradehub_v1\''));
chk('los campos piden teclado decimal', (html.match(/inputmode="decimal"/g) || []).length >= 6);
// 16px o más evita que Safari en iPhone haga zoom al tocar el campo.
chk('los campos no bajan de 16px', !/\.calc input[^}]*font-size:(1[0-5]|[0-9])px/.test(html));
chk('el resultado se anuncia al lector de pantalla', /aria-live="polite"/.test(html));
chk('respeta las áreas seguras', /env\(safe-area-inset-bottom\)/.test(html));
chk('la nota usa números tabulares', /\.nota\{[^}]*tabular-nums/.test(html.replace(/\s+/g, ' ').replace(/\.resultado \.nota\{/, '.nota{')));
// El canonical apunta a la URL final: /calculadora.html redirige a /calculadora.
chk('el canonical es la URL final, sin .html', html.includes('<link rel="canonical" href="https://gradehub.cl/calculadora"/>'));
// La tarjeta que muestra WhatsApp al compartir el link: la propia de la
// calculadora (bin/og-calculadora.html), no la general de og-v3.png.
const og = fs.readFileSync(path.join(raiz, 'og-calculadora.png'));
chk('comparte su propia tarjeta', html.includes('<meta property="og:image" content="https://gradehub.cl/og-calculadora.png"/>'));
chk('la tarjeta mide 1200×630 y pesa menos de 200 KB', og.readUInt32BE(16) === 1200 && og.readUInt32BE(20) === 630 && og.length < 200000);
chk('la app enlaza a la calculadora', /href="\/calculadora\.html"/.test(leer('index.html')));
chk('las preguntas enlazan a la calculadora', /href="\/calculadora\.html"/.test(leer('preguntas.html')));

console.log('\n=== Herramienta independiente dentro de la app ===');
const app = leer('app.js'), inicio = app.indexOf('// Herramienta aparte del editor de evaluaciones (#735).');
const fin = app.indexOf("document.addEventListener('keydown'", inicio);
chk('el menú abre una calculadora aparte', /id="um-calculadora"[^>]*openCalculadoraApp/.test(leer('index.html')));
chk('la herramienta usa la fórmula común, no otra copia', inicio >= 0 && fin > inicio && app.slice(inicio, fin).includes('gh_notaDesdePuntaje('));
chk('cada evaluación sigue pidiendo solo nota', !leer('render-main.js').includes('Desde puntaje'));

function escenarioCalculadora({profesor=false,exigenciaGuardada}={}){
  // Pauta sintética: una evaluación directa, dos casillas y una lista abierta.
  // La lista no se reinterpreta como una casilla al guardar.
  const ramo={id:'ramo-sintetico',nombre:'Ramo de prueba',categorias:[
    {id:'prueba',nombre:'Prueba',peso:60,directNota:true,notas:[]},
    {id:'controles',nombre:'Controles',peso:30,directNota:true,slots:2,notas:[]},
    {id:'tareas',nombre:'Tareas',peso:10,directNota:false,notas:[]}
  ]};
  if(exigenciaGuardada!==undefined)ramo.exigenciaPuntaje=exigenciaGuardada;
  const elementos={};
  function el(id){return elementos[id] ||= {
    value:'',textContent:'',innerHTML:'',disabled:false,checked:false,open:false,attributes:{},
    setAttribute(k,v){this.attributes[k]=v;},removeAttribute(k){delete this.attributes[k];}
  };}
  for(const [id,value] of Object.entries({puntaje:'',total:'',exigencia:'50',nmin:'1',naprob:'4',nmax:'7',ramo:'',destino:''}))el('calc-app-'+id).value=value;
  const llamadas=[];
  const ctx=vm.createContext({
    S:{ramos:[ramo]},document:{getElementById:el},gh_notaDesdePuntaje,
    esCuentaProfesor:()=>profesor,ausenciaDeEvaluacion:()=>null,categoriaEximida:()=>false,
    etiquetaCasilla:(_r,c,i)=>`${c.nombre} ${i+1}`,esc:s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;'),
    openModal:()=>llamadas.push('abrir'),closeModal:()=>llamadas.push('cerrar'),
    showTab:s=>llamadas.push('tab:'+s),openRamo:id=>llamadas.push('ramo:'+id),
    save:()=>llamadas.push('sync'),
    setDirectNota:(id,raw)=>llamadas.push(`directa:${id}:${raw}`),
    setSlotNota:(id,slot,raw)=>llamadas.push(`casilla:${id}:${slot}:${raw}`)
  });
  vm.runInContext(app.slice(inicio,fin),ctx);
  ctx.openCalculadoraApp();
  return {ctx,ramo,el,llamadas};
}
let caso=escenarioCalculadora();
caso.el('calc-app-puntaje').value='25';caso.el('calc-app-total').value='50';
caso.ctx.calcularNotaApp();
chk('25/50 al 50 % aparece en vivo como 4,0',caso.el('calc-app-nota').textContent==='4,0');
chk('sin ramo se puede calcular, pero no guardar',caso.el('calc-app-guardar').disabled===true);
caso.el('calc-app-ramo').value=caso.ramo.id;caso.ctx.seleccionarRamoCalculadoraApp();
caso.el('calc-app-destino').value='0';caso.ctx.calcularNotaApp();caso.ctx.guardarNotaCalculadoraApp();
chk('guardar evaluación simple pasa por setDirectNota',caso.llamadas.includes('directa:prueba:4.0'));
chk('50 % por defecto no agrega un campo al ramo',!Object.hasOwn(caso.ramo,'exigenciaPuntaje'));
chk('ningún puntaje entra al estado guardable',!JSON.stringify(caso.ctx.S).includes('puntaje'));

caso=escenarioCalculadora();
caso.el('calc-app-puntaje').value='30';caso.el('calc-app-total').value='50';
caso.el('calc-app-ramo').value=caso.ramo.id;caso.ctx.seleccionarRamoCalculadoraApp();
caso.el('calc-app-exigencia').value='60';caso.el('calc-app-destino').value='2';
caso.ctx.calcularNotaApp();
chk('30/50 al 60 % aparece en vivo como 4,0',caso.el('calc-app-nota').textContent==='4,0');
caso.ctx.guardarNotaCalculadoraApp();
chk('guardar casilla pasa por setSlotNota',caso.llamadas.includes('casilla:controles:1:4.0'));
chk('exigencia elegida queda en campo opcional del ramo',caso.ramo.exigenciaPuntaje===60);
chk('el puntaje no se agregó al ramo con la preferencia',!Object.keys(caso.ramo).some(k=>/puntaje/i.test(k)&&k!=='exigenciaPuntaje'));

caso=escenarioCalculadora();
caso.el('calc-app-exigencia').value='60';caso.ctx.editarExigenciaCalculadoraApp();
caso.el('calc-app-ramo').value=caso.ramo.id;caso.ctx.seleccionarRamoCalculadoraApp();
chk('elegir ramo después de escribir 60 % no lo devuelve a 50 %',caso.el('calc-app-exigencia').value==='60');
chk('la exigencia se sincroniza sin guardar una nota',caso.ramo.exigenciaPuntaje===60&&caso.llamadas.includes('sync'));

caso=escenarioCalculadora({exigenciaGuardada:60});
caso.el('calc-app-ramo').value=caso.ramo.id;caso.ctx.seleccionarRamoCalculadoraApp();
chk('un ramo existente recupera su exigencia entre dispositivos',caso.el('calc-app-exigencia').value==='60');
caso.el('calc-app-puntaje').value='50';caso.el('calc-app-total').value='50';caso.ctx.calcularNotaApp();
chk('50/50 llega a 7,0',caso.el('calc-app-nota').textContent==='7,0');
caso.el('calc-app-puntaje').value='0';caso.ctx.calcularNotaApp();
chk('0/50 llega a 1,0',caso.el('calc-app-nota').textContent==='1,0');
caso.el('calc-app-puntaje').value='51';caso.ctx.calcularNotaApp();
chk('puntaje mayor al total bloquea el guardado',caso.el('calc-app-guardar').disabled&&caso.el('calc-app-error').textContent.includes('superar'));
caso=escenarioCalculadora({profesor:true});
chk('una cuenta solo profesor no abre la herramienta de estudiante',!caso.llamadas.includes('abrir'));

console.log(`\n${ok} OK, ${fail} FAIL`);
if (fail) process.exit(1);
