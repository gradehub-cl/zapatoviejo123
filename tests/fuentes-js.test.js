// La app usa scripts clásicos: separar fuentes no puede cambiar su ámbito,
// hoisting, orden ni bytes. Estos fixtures nunca tocan una cuenta real.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const { spawnSync } = require('node:child_process');
const { compilar, leerOrden, RAIZ } = require('../bin/compilar-js');
const { indexar, buscar, documentos } = require('../bin/buscar-js');
const temporal = fs.mkdtempSync(path.join(os.tmpdir(), 'gh-fuentes-'));
let checks = 0;
function probar(nombre, fn) { fn(); checks++; console.log('  OK   ' + nombre); }
const escribir = (f, texto) => { const destino = path.join(temporal, f); fs.mkdirSync(path.dirname(destino), { recursive: true }); fs.writeFileSync(destino, texto); };
const leer = f => fs.readFileSync(path.join(temporal, f), 'utf8');
const orden = { 'app.js': ['src/app/estado.js', 'src/app/calculo.js'], 'vista.js': ['src/vista/pantalla.js'] };
function manifest(m = orden) { escribir('src/orden.json', JSON.stringify(m)); }
function fixture() {
  manifest();
  escribir('src/app/estado.js', 'const nota = calcular();\n');
  escribir('src/app/calculo.js', 'function calcular(){return 5.5;}\n');
  escribir('src/vista/pantalla.js', 'const texto = `Promedio: ${nota}`;\n');
}
try {
  fixture();
  probar('concatena bytes en orden, sin wrappers, separadores ni transformaciones', () => {
    assert.equal(compilar({ raiz: temporal }).escritos, 2);
    assert.equal(leer('app.js'), leer('src/app/estado.js') + leer('src/app/calculo.js'));
    const contexto = vm.createContext({});
    for (const salida of Object.keys(orden)) vm.runInContext(leer(salida), contexto);
    assert.equal(vm.runInContext('texto', contexto), 'Promedio: 5.5');
  });
  probar('mantiene hoisting: cargar las piezas como scripts separados sería incorrecto', () => {
    assert.throws(() => vm.runInNewContext(leer('src/app/estado.js')), /calcular is not defined/);
  });
  probar('recompilar no vuelve a escribir salidas idénticas', () => {
    const antes = fs.statSync(path.join(temporal, 'app.js')).mtimeMs;
    assert.equal(compilar({ raiz: temporal }).escritos, 0);
    assert.equal(fs.statSync(path.join(temporal, 'app.js')).mtimeMs, antes);
  });
  probar('detecta fuentes nuevas y regenera antes de testear', () => {
    escribir('src/app/calculo.js', 'function calcular(){return 6.1;}\n');
    assert.throws(() => compilar({ raiz: temporal, comprobar: true }), /desactualizado/);
    assert.equal(compilar({ raiz: temporal }).escritos, 1);
    assert.ok(leer('app.js').includes('return 6.1'));
  });
  probar('un generado editado a mano se protege; la recuperación es explícita', () => {
    escribir('app.js', '// cambio sin pasar a src/\n');
    assert.throws(() => compilar({ raiz: temporal }), /cambios fuera de src/);
    compilar({ raiz: temporal, recrear: true });
    assert.ok(leer('app.js').includes('return 6.1'));
  });
  probar('falla antes de escribir cualquier script si hay sintaxis inválida', () => {
    const antes = leer('app.js');
    escribir('src/app/calculo.js', 'function calcular(){return 7;}\n');
    escribir('src/vista/pantalla.js', 'const roto = ;');
    assert.throws(() => compilar({ raiz: temporal }), SyntaxError);
    assert.equal(leer('app.js'), antes);
    fixture(); compilar({ raiz: temporal });
  });
  probar('falla si una fuente falta, se duplica o queda fuera del manifiesto', () => {
    manifest({ ...orden, 'x.js': ['src/app/falta.js'] });
    assert.throws(() => compilar({ raiz: temporal }), /ENOENT/);
    manifest({ ...orden, 'x.js': ['src/app/estado.js'] });
    assert.throws(() => compilar({ raiz: temporal }), /duplicada/);
    manifest(); escribir('src/app/olvidada.js', 'const extra = 1;');
    assert.throws(() => compilar({ raiz: temporal }), /fuera de/);
    fs.unlinkSync(path.join(temporal, 'src/app/olvidada.js'));
  });
  probar('rechaza rutas que salgan de src y salidas con directorios', () => {
    manifest({ 'app.js': ['src/../app.js'] }); assert.throws(() => leerOrden(temporal), /inválida/);
    manifest({ '../app.js': ['src/app/estado.js'] }); assert.throws(() => leerOrden(temporal), /inválida/);
    manifest();
  });
  probar('un checkout sin bundles ni cache se reconstruye sin paquetes npm', () => {
    fs.rmSync(path.join(temporal, '.cache'), { recursive: true });
    fs.unlinkSync(path.join(temporal, 'app.js')); fs.unlinkSync(path.join(temporal, 'vista.js'));
    assert.throws(() => compilar({ raiz: temporal, comprobar: true }), /falta/);
    assert.equal(compilar({ raiz: temporal }).escritos, 2);
  });
  probar('watch actualiza al guardar por rename, sin observadores nativos', () => {
    const programa = `
      const fs=require('fs'),path=require('path');
      const {compilar,vigilar}=require(${JSON.stringify(path.join(RAIZ, 'bin/compilar-js.js'))});
      const raiz=${JSON.stringify(temporal)};
      const detener=vigilar(raiz,()=>{compilar({raiz});detener();clearTimeout(limite);},30);
      const limite=setTimeout(()=>{detener();process.exitCode=1;},3000);
      const tmp=path.join(raiz,'src/app/calculo.tmp');
      fs.writeFileSync(tmp,'function calcular(){return 6.7;}\\n');
      fs.renameSync(tmp,path.join(raiz,'src/app/calculo.js'));
    `;
    const r = spawnSync(process.execPath, ['-e', programa], { encoding: 'utf8', timeout: 5000 });
    assert.equal(r.status, 0, r.stderr); assert.ok(leer('app.js').includes('return 6.7'));
  });
  probar('la app real se ensambla igual que sus fuentes y parsea cada script', () => {
    compilar({ comprobar: true });
    for (const [salida, fuentes] of Object.entries(leerOrden()))
      assert.deepEqual(fs.readFileSync(path.join(RAIZ, salida)), Buffer.concat(fuentes.map(f => fs.readFileSync(path.join(RAIZ, f)))));
  });
  probar('el índice encuentra límites reales con llaves en strings, regex y templates', () => {
    const codigo = 'function externa(){\nconst llave = "}"; const re = /}/;\nfunction interna(){return `{ ${llave} }`;}\nreturn interna();\n}\nconst flecha = () => "}";\nconst DATO = 5;\n';
    const s = indexar(codigo);
    assert.deepEqual(s.find(s => s.nombre === 'externa'), { nombre: 'externa', tipo: 'función', linea: 1, fin: 5 });
    assert.equal(s.find(s => s.nombre === 'interna').linea, 3);
    assert.equal(s.find(s => s.nombre === 'flecha').tipo, 'función');
    assert.ok(s.some(s => s.nombre === 'DATO'));
    assert.ok(!s.some(s => s.nombre === 'llave'));
    assert.equal(indexar('export function ejemplo(){}')[0].nombre, 'ejemplo');
  });
  probar('prioriza símbolos exactos, admite tildes y limita las lecturas', () => {
    const docs = [{ archivo: 'src/app/estadisticas.js', lineas: ['// Atención'], simbolos: [
      { nombre: 'atencionProfesor', linea: 2, fin: 7 }, { nombre: 'atencion', linea: 8, fin: 9 }] }];
    assert.equal(buscar(docs, 'ATENCIÓN', { limite: 1 })[0].nombre, 'atencion');
    assert.equal(buscar(docs, 'estadísticas')[0].tipo, 'tema');
    assert.equal(buscar(docs, 'atencion', { archivo: 'alumnos' }).length, 0);
  });
  probar('localiza una pauta por ramo dentro de un catálogo literal', () => {
    const s = indexar('const PAUTAS = {\n"Ramo sintético": {evals:[["Prueba",100]]},\nOtro: []\n};', { entradas: true });
    assert.deepEqual(s.find(s => s.nombre === 'PAUTAS.Ramo sintético'), {
      nombre: 'PAUTAS.Ramo sintético', tipo: 'entrada', linea: 2, fin: 2
    });
  });
  probar('el índice incremental se invalida al cambiar una fuente', () => {
    let docs = documentos({ raiz: temporal });
    assert.equal(buscar(docs, 'calcular')[0].archivo, 'src/app/calculo.js');
    escribir('src/app/calculo.js', 'function nuevoNombre(){return 5;}\n');
    docs = documentos({ raiz: temporal });
    assert.equal(buscar(docs, 'nuevoNombre')[0].tipo, 'función');
    assert.ok(!buscar(docs, 'calcular').some(s => s.tipo === 'función'));
  });
  probar('CLI encuentra la fuente, muestra rangos acotados y no devuelve bundles duplicados', () => {
    const cli = args => spawnSync(process.execPath, [path.join(RAIZ, 'bin/buscar-js.js'), ...args], { cwd: os.tmpdir(), encoding: 'utf8' });
    const consulta = cli(['renderAlumnosProfesor', '--json']); assert.equal(consulta.status, 0, consulta.stderr);
    assert.ok(JSON.parse(consulta.stdout).every(r => r.archivo.startsWith('src/')));
    const vista = cli(['--ver', 'renderAlumnosProfesor', '--lineas', '4', '--json']);
    assert.equal(vista.status, 0, vista.stderr); assert.equal(JSON.parse(vista.stdout).codigo.length, 4);
    assert.equal(cli(['--lineas', '99999', 'algo']).status, 1);
  });
  console.log('\nPASS: ' + checks + '   FAIL: 0');
} finally { fs.rmSync(temporal, { recursive: true, force: true }); }
