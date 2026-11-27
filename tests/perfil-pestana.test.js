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
const base = { soloProfesor: false, hayRamos: true, conFicha: false, conSesion: true };

console.log('\n=== Estudiante ===');
const est = claves(ctx.gruposPerfil(base));
chk('llega a cada sección de Ajustes', ['academico', 'calendario', 'apariencia', 'agentes', 'sugerencias', 'datos'].every(c => est.includes(c)));
chk('conserva archivar y la calculadora', est.includes('archivar') && est.includes('calculadora'));
chk('sin ramos no hay nada que archivar', !claves(ctx.gruposPerfil({ ...base, hayRamos: false })).includes('archivar'));
chk('la foto del horario solo donde hay lector', !est.includes('horario') && claves(ctx.gruposPerfil({ ...base, conHorario: true })).includes('horario'));
chk('cargar semestres solo donde hay lector', !est.includes('ficha') && claves(ctx.gruposPerfil({ ...base, conFicha: true })).includes('ficha'));
chk('sin sesión no se ofrece dar clases', !claves(ctx.gruposPerfil({ ...base, conSesion: false })).includes('profesor'));
chk('con Amigos, el username se cambia en Tu cuenta, como en Instagram', !est.includes('username') && claves(ctx.gruposPerfil({ ...base, conAmigos: true })).includes('username'));
chk('compartir perfil solo con username, al lado de Username', !claves(ctx.gruposPerfil({ ...base, conAmigos: true })).includes('compartir') && (()=>{const c=claves(ctx.gruposPerfil({ ...base, conAmigos: true, conUsername: true }));return c.indexOf('compartir')===c.indexOf('username')+1;})());
chk('la cabecera muestra cuántos amigos solo si la lista llegó', /cifrasAmigos\(\):null/.test(fuente) && /if\(!amigosListaCache\)return null/.test(fs.readFileSync(raiz + 'src/app/amigos-pantalla.js', 'utf8')));
chk('Canvas tiene su fila solo donde está disponible, después de Calendario', !est.includes('canvas') && (()=>{const c=claves(ctx.gruposPerfil({ ...base, conCanvas: true }));return c.indexOf('canvas')===c.indexOf('calendario')+1;})());
// Lucas, 2026-11-22: los avisos de Amigos salen de su Privacidad y viven en Avisos.
chk('Avisos tiene su fila solo en la app, después de Apariencia', !est.includes('avisos') && (()=>{const c=claves(ctx.gruposPerfil({ ...base, conAvisos: true }));return c.indexOf('avisos')===c.indexOf('apariencia')+1&&typeof ctx.PERFIL_ACCIONES.avisos==='function'&&!!ctx.PERFIL_ICONOS.avisos;})());
{const amigos=fs.readFileSync(raiz+'src/app/amigos-pantalla.js','utf8'),ajustes=fs.readFileSync(raiz+'src/app/ajustes.js','utf8');
 chk('Privacidad de Amigos ya no tiene el interruptor de avisos', !/id="amigos-avisos"/.test(amigos) && /Compartir notas/.test(amigos) && /Compartir fechas/.test(amigos) && !/Compartir mis (promedios|pruebas)/.test(amigos));
 chk('Ajustes › Avisos junta amigos y evaluaciones', /section==='avisos'[\s\S]{0,400}id="amigos-avisos"[\s\S]{0,600}Avisos antes de tus evaluaciones/.test(ajustes) && !/section==='calendario'[\s\S]{0,2000}Avisos antes de tus evaluaciones[\s\S]{0,800}section==='avisos'/.test(ajustes));}
// Buscador (Lucas, 2026-11-22): por título o por lo que hay adentro, sin tildes.
vm.runInContext('this.filasBuscadasPerfil=filasBuscadasPerfil;', ctx);
{const g=ctx.gruposPerfil({ ...base, conHorario: true, conAmigos: true, conAvisos: true });const b=q=>[...ctx.filasBuscadasPerfil(g,q)];
 chk('busca por lo que hay adentro', b('cambiar mi carrera').join()==='academico' && b('OSCURO').join()==='apariencia' && b('contraseña').length===0);
 chk('sin tildes y con varias palabras', b('foto horario').join()==='horario' && b('calculadora').join()==='calculadora' && b('ics').join()==='calendario' && b('notificaciones').join()==='avisos');
 chk('el buscador solo existe en la app', /conBuscador=typeof enAppNativa==='function'&&enAppNativa\(\)/.test(fuente));}
console.log('\n=== Herramientas en Inicio ===');
const herr = o => vm.runInContext('herramientasInicio('+JSON.stringify(o)+')', ctx).map(([c]) => c);
chk('la calculadora siempre está', herr({}).join() === 'calculadora');
chk('UC con Canvas y ficha: las cuatro, en orden', herr({ conHorario: true, conCanvas: true, conFicha: true }).join() === 'calculadora,horario,canvas,ficha');
chk('sin Canvas no se ofrece traer notas', !herr({ conHorario: true, conFicha: true }).includes('canvas'));
// Perfil y la llave inglesa preguntan lo mismo que Agregar ramo y el menú: si hay
// lector para esa universidad. Antes decían «solo UC» y FEN quedaba fuera (2026-11-22).
for (const f of ['perfil-pestana.js', 'herramientas-inicio.js']) {
  const s = fs.readFileSync(raiz + 'src/app/' + f, 'utf8');
  chk(f + ': el horario se decide con HORARIO_FOTO_POR_TENANT', s.includes('conHorario:typeof HORARIO_FOTO_POR_TENANT!==\'undefined\'&&!!HORARIO_FOTO_POR_TENANT[S.tenant]') && !/tenant==='uc'/.test(s));
}
const creditos = fs.readFileSync(raiz + 'src/data/creditos.js', 'utf8');
chk('FEN tiene lector de horario', /HORARIO_FOTO_POR_TENANT=\{[^;]*\bfen:\{/.test(creditos));
chk('la llave también está en la web, no solo en la app', !/enAppNativa/.test(fs.readFileSync(raiz + 'src/app/herramientas-inicio.js', 'utf8').split('function herramientasInicioDisponibles')[1].split('}')[0]));
chk('las cuentas de profesor no ven la llave', /function herramientasInicioDisponibles\(\)\{\s*if\(esCuentaProfesor\(\)\)return \[\];/.test(fs.readFileSync(raiz + 'src/app/herramientas-inicio.js', 'utf8')));
chk('Canvas tiene su propio ícono', /circle/.test(vm.runInContext('PERFIL_ICONOS.canvas', ctx)));

console.log('\n=== Cuenta de profesor ===');
const prof = claves(ctx.gruposPerfil({ ...base, soloProfesor: true, conHorario: true, conFicha: true }));
chk('solo lo suyo: apariencia, sugerencias y datos', prof.join() === 'apariencia,sugerencias,datos');

console.log('\n=== Cada fila abre algo ===');
const todas = claves(ctx.gruposPerfil({ ...base, conHorario: true, conFicha: true, conAmigos: true, conUsername: true }));
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
