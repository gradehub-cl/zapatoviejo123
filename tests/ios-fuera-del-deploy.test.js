// La app iOS (Capacitor) vive en este repo, pero no se publica en gradehub.cl,
// y dentro de la app no va nada que el deploy tampoco publique.
//
// El deploy excluye en vez de elegir: un archivo nuevo se publica si la lista
// no lo menciona. bin/preparar-ios.sh copia la misma lista a propósito (unificar
// las dos es un refactor aparte); este test avisa si se separan.
const fs = require('fs'), path = require('path');
const raiz = path.join(__dirname, '..');
const deploy = fs.readFileSync(path.join(raiz, '.github/workflows/deploy.yml'), 'utf8');
const preparar = fs.readFileSync(path.join(raiz, 'bin/preparar-ios.sh'), 'utf8');
let ok = 0, fail = 0;
const chk = (n, c) => { if (c) { ok++; console.log('  OK   ' + n); } else { fail++; console.log('  FAIL ' + n); } };
const excluye = txt => new Set([...txt.matchAll(/--exclude '([^']+)'/g)].map(m => m[1]));

const delDeploy = excluye(deploy.slice(deploy.indexOf('rsync -a ./ dist/')));
const deIos = excluye(preparar);

console.log('\n=== Lo de iOS no se publica en gradehub.cl ===');
for (const x of ['ios', 'ios-web', 'capacitor.config.*']) chk(`el deploy excluye ${x}`, delDeploy.has(x));

console.log('\n=== Dentro de la app no va lo que la web no publica ===');
const faltan = [...delDeploy].filter(x => !deIos.has(x));
chk(`preparar-ios excluye todo lo que excluye el deploy${faltan.length ? ' (falta: ' + faltan.join(', ') + ')' : ''}`, faltan.length === 0);
for (const x of ['tests', 'supabase', 'docs', 'bin', '*.md', 'node_modules']) chk(`incluido ${x}`, deIos.has(x));
for (const x of ['ios', 'ios-web', 'capacitor.config.*']) chk(`preparar-ios no se copia a sí mismo: ${x}`, deIos.has(x));
chk('copia a ios-web y sincroniza con Capacitor', /rsync -a \.\/ ios-web\//.test(preparar) && /cap sync ios/.test(preparar));
const config = JSON.parse(fs.readFileSync(path.join(raiz, 'capacitor.config.json'), 'utf8'));
chk('Capacitor toma la web de ios-web', config.webDir === 'ios-web' && config.appId === 'cl.gradehub.app');

console.log('\n=== Permisos que iOS exige antes de usar la cámara o las fotos ===');
// Sin estas claves iOS cierra la app de golpe: la foto del horario y el
// flyer de una clase ofrecen "Tomar foto", y compartir el Wrapped ofrece
// "Guardar imagen".
const plist = fs.readFileSync(path.join(raiz, 'ios/App/App/Info.plist'), 'utf8');
for (const k of ['NSCameraUsageDescription', 'NSPhotoLibraryAddUsageDescription'])
  chk(`Info.plist declara ${k}`, new RegExp(`<key>${k}</key>\\s*<string>[^<]{20,}</string>`).test(plist));
chk('la vuelta del login con Google está registrada', /<string>cl\.gradehub\.app<\/string>/.test(plist));

console.log('\n=== La rama compartida `ios` y su versión de prueba ===');
// Un push a `ios` publica una vista previa; solo main llega a gradehub.cl.
chk('el deploy corre para main y para ios', /branches: \[main, ios\]/.test(deploy));
chk('publica con el nombre de la rama: main es producción, ios queda de prueba',
  /--branch="\$RAMA"/.test(deploy) && /RAMA: \$\{\{ github\.ref_name \}\}/.test(deploy) && !/--branch=main/.test(deploy));
chk('los deploys de ios no hacen esperar a los de producción',
  /group: deploy-\$\{\{ github\.ref_name == 'main' && 'produccion' \|\| github\.ref_name \}\}/.test(deploy));
const pkg = JSON.parse(fs.readFileSync(path.join(raiz, 'package.json'), 'utf8'));
chk('ios:rama arma la app cargando desde la versión de prueba',
  /GRADEHUB_SERVIDOR=https:\/\/ios\.gradehub\.pages\.dev/.test(pkg.scripts['ios:rama'] || '') && /GRADEHUB_SERVIDOR:-/.test(preparar));
// La de la App Store lleva su copia: una app que es solo una página puede ser
// rechazada y no abre sin internet.
chk('la app normal no carga desde un servidor', !config.server);

console.log('\n=== La app abre sin internet ===');
// supabase-js viaja dentro de la app, con la misma versión que pide la web.
const html = fs.readFileSync(path.join(raiz, 'index.html'), 'utf8');
const versionWeb = (html.match(/supabase-js@([\d.]+)/) || [])[1];
chk('la versión empaquetada es la misma que pide index.html', !!versionWeb && (pkg.devDependencies || {})['@supabase/supabase-js'] === versionWeb);
chk('preparar copia supabase-js del paquete y le pone su SRI',
  /node_modules\/@supabase\/supabase-js\/dist\/umd\/supabase\.js/.test(preparar) && /ios-web\/supabase\.js/.test(preparar) && /createHash\("sha384"\)/.test(preparar));
chk('si las versiones no coinciden, se detiene', /if\(v!==m\[1\]\)\{[^}]*process\.exit\(1\)/.test(preparar));
chk('lo hace antes de pasarle la web a Capacitor', preparar.indexOf('ios-web/supabase.js') < preparar.indexOf('cap sync ios'));

console.log(`\nPASS: ${ok}   FAIL: ${fail}`);
process.exit(fail ? 1 : 0);
