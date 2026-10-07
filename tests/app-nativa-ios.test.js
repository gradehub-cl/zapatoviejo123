// La app iOS se ve menos PWA (pedido de Martín, 2026-10-07): hojas con la barra
// de iOS arriba, Ajustes agrupado, menús desplegables y confirmaciones como
// alertas. Lo visual va solo con html.app-nativa; los menús, en las dos.
const fs = require('fs'), path = require('path');
const raiz = path.join(__dirname, '..');
const leer = f => fs.readFileSync(path.join(raiz, f), 'utf8');
const app = leer('app.js'), css = leer('styles.css'), html = leer('index.html');
let ok = 0, fail = 0;
const chk = (n, c) => { if (c) { ok++; console.log('  OK   ' + n); } else { fail++; console.log('  FAIL ' + n); } };

console.log('\n=== Qué sube a la barra de la hoja ===');
const re = nombre => new RegExp(app.match(new RegExp(nombre + '=/(.+?)/i'))[1], 'i');
const cerrar = re('HOJA_CERRAR'), volver = re('HOJA_VOLVER'), confirmar = re('HOJA_CONFIRMAR');
chk('Cancelar y Cerrar son la X', ['Cancelar', 'Cerrar'].every(t => cerrar.test(t)));
chk('Atrás y Volver son la flecha', ['Atrás', 'Volver'].every(t => volver.test(t)));
chk('"Ahora no" o "Dejar la mía" no cierran: son una decisión', !cerrar.test('Ahora no') && !cerrar.test('Dejar la mía'));
chk('guardar, agregar o enviar van arriba a la derecha',
  ['Guardar', 'Agregar ramo', 'Enviar reporte', 'Marcar justificada', 'Importar', 'Continuar', 'Listo', 'Guardar como reales'].every(t => confirmar.test(t)));
chk('copiar, elegir o reiniciar se quedan abajo',
  ['Copiar', 'Usar esta', 'Reiniciar todo', 'Eliminar', 'Ver mis ramos', 'Ir a Inicio'].every(t => !confirmar.test(t)));
chk('solo sube una acción a la derecha', /confirmables\.length===1\?confirmables\[0\]:null/.test(app));
chk('lo destructivo nunca sube (solo btn-confirm)', /classList\.contains\('btn-confirm'\)&&HOJA_CONFIRMAR/.test(app));
chk('un botón de envío sigue enviando su formulario', /b\.type==='submit'[\s\S]{0,80}setAttribute\('form'/.test(app));
chk('solo en la app nativa', /classList\.contains\('app-nativa'\)\)\s*new MutationObserver\(\(\)=>armarBarraDeHoja\(contenido\)\)/.test(app));

console.log('\n=== La web no cambia ===');
const bloque = css.slice(css.indexOf('/* ─── App iOS: aspecto nativo'));
const reglas = bloque.replace(/\/\*[\s\S]*?\*\//g, '').match(/[^{}]+(?=\{)/g) || [];
chk('todo el bloque de la app va bajo .app-nativa', reglas.length > 10 && reglas.every(r => r.split(',').every(s => s.trim().startsWith('.app-nativa'))));
chk('la caja de cada grupo de Ajustes no existe en la web', /\.settings-nav-card\{display:contents;\}/.test(css));

console.log('\n=== Menús desplegables ===');
chk('el orden abre un menú, no cambia con cada toque', /id="sort-btn" onclick="abrirMenuOrden\(this\)" aria-haspopup="menu"/.test(html) && !/cycleSortMode/.test(app + html));
chk('la opción elegida lleva ✓ y role menuitemradio', /menuitemradio/.test(app) && /it\.marcado\?CHECK_MENU/.test(app));
chk('editar y eliminar van en el "⋯" del ramo', /id="ramo-mas" onclick="abrirMenuRamo\(this\)"/.test(html) && !/onclick="confirmDeleteRamo\(\)"/.test(html));
const menuRamo = app.slice(app.indexOf('function abrirMenuRamo'), app.indexOf('function abrirMenuRamo') + 1400);
chk('eliminar va al final, separado y en rojo', /'sep',\s*\{texto:'Eliminar ramo',peligro:true/.test(menuRamo));
chk('Escape cierra el menú', /Escape'&&document\.getElementById\('menu-flotante'\)\)cerrarMenu\(\)/.test(app));
chk('Ajustes se llama igual en el menú y en la hoja', !/Configuración/.test(html + app));

console.log(`\n${ok} OK, ${fail} FAIL`);
if (fail) process.exit(1);
