// La pestaña Perfil: qué filas ve cada cuenta y que toda fila tenga qué abrir.
//
// Reemplaza al menú del avatar. Lo que se fija acá es que nadie pierda una
// puerta que antes tenía (Ajustes, archivar, cerrar sesión) y que una cuenta de
// profesor no vea lo que es de estudiante.
const fs = require('fs'), vm = require('vm');
const raiz = __dirname + '/../';
const fuente = fs.readFileSync(raiz + 'src/app/perfil-pestana.js', 'utf8');
const html = fs.readFileSync(raiz + 'index.html', 'utf8');
const css = fs.readFileSync(raiz + 'styles.css', 'utf8');

const ctx = { document: { addEventListener() {}, getElementById: () => null } };
vm.createContext(ctx);
vm.runInContext(fuente + '\n;this.gruposPerfil=gruposPerfil;this.PERFIL_ACCIONES=PERFIL_ACCIONES;this.PERFIL_ICONOS=PERFIL_ICONOS;', ctx);
vm.runInContext(fs.readFileSync(raiz + 'src/app/herramientas-inicio.js', 'utf8') + '\n;this.herramientasInicio=herramientasInicio;', ctx);

let ok = 0, fail = 0;
const chk = (n, c) => { if (c) { ok++; console.log('  OK   ' + n); } else { fail++; console.log('  FAIL ' + n); } };
const claves = g => g.flatMap(([, filas]) => filas.map(([c]) => c));
const base = { soloProfesor: false, tenant: 'syn', hayRamos: true, conFicha: false, conSesion: true };

console.log('\n=== Estudiante ===');
const est = claves(ctx.gruposPerfil(base));
chk('llega a cada sección de Ajustes', ['academico', 'calendario', 'apariencia', 'agentes', 'sugerencias', 'datos'].every(c => est.includes(c)));
chk('conserva archivar y la calculadora', est.includes('archivar') && est.includes('calculadora'));
chk('sin ramos no hay nada que archivar', !claves(ctx.gruposPerfil({ ...base, hayRamos: false })).includes('archivar'));
chk('la foto del horario es solo de la UC', !est.includes('horario') && claves(ctx.gruposPerfil({ ...base, tenant: 'uc' })).includes('horario'));
chk('cargar semestres solo donde hay lector', !est.includes('ficha') && claves(ctx.gruposPerfil({ ...base, conFicha: true })).includes('ficha'));
chk('sin sesión no se ofrece dar clases', !claves(ctx.gruposPerfil({ ...base, conSesion: false })).includes('profesor'));
chk('Canvas tiene su fila solo donde está disponible, después de Calendario', !est.includes('canvas') && (()=>{const c=claves(ctx.gruposPerfil({ ...base, conCanvas: true }));return c.indexOf('canvas')===c.indexOf('calendario')+1;})());
console.log('\n=== Herramientas en Inicio ===');
const herr = o => vm.runInContext('herramientasInicio('+JSON.stringify(o)+')', ctx).map(([c]) => c);
chk('la calculadora siempre está', herr({ tenant: 'syn' }).join() === 'calculadora');
chk('UC con Canvas y ficha: las cuatro, en orden', herr({ tenant: 'uc', conCanvas: true, conFicha: true }).join() === 'calculadora,horario,canvas,ficha');
chk('sin Canvas no se ofrece traer notas', !herr({ tenant: 'uc', conFicha: true }).includes('canvas'));
chk('Canvas tiene su propio ícono', /circle/.test(vm.runInContext('PERFIL_ICONOS.canvas', ctx)));

console.log('\n=== Cuenta de profesor ===');
const prof = claves(ctx.gruposPerfil({ ...base, soloProfesor: true, tenant: 'uc', conFicha: true }));
chk('solo lo suyo: apariencia, sugerencias y datos', prof.join() === 'apariencia,sugerencias,datos');

console.log('\n=== Cada fila abre algo ===');
const todas = claves(ctx.gruposPerfil({ ...base, tenant: 'uc', conFicha: true }));
chk('toda fila tiene acción', todas.every(c => typeof ctx.PERFIL_ACCIONES[c] === 'function'));
chk('toda fila tiene ícono', todas.every(c => !!ctx.PERFIL_ICONOS[c]));
chk('la cabecera y cerrar sesión también', ['cuenta', 'salir'].every(c => typeof ctx.PERFIL_ACCIONES[c] === 'function'));

console.log('\n=== En la barra ===');
const barra = html.slice(html.indexOf('<nav class="bottom-nav"'), html.indexOf('</nav>', html.indexOf('<nav class="bottom-nav"')));
const orden = [...barra.matchAll(/id="nav-([a-z]+)"/g)].map(m => m[1]);
chk('Inicio es la primera pestaña', orden[0] === 'home');
chk('Perfil es la última', orden[orden.length - 1] === 'perfil');
chk('la pantalla existe y entra al carrusel', /id="screen-perfil"/.test(html) && /\.app\.tab-mode #screen-perfil\{/.test(css));
chk('ya no hay avatar en las barras de arriba', !/class="avatar-btn"/.test(html));
chk('las filas miden al menos 44 px', /\.perfil-fila\{[^}]*min-height:(4[4-9]|[5-9]\d)px/.test(css));

console.log(`\nPASS: ${ok}   FAIL: ${fail}`);
process.exit(fail ? 1 : 0);
