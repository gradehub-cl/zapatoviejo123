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

console.log(`\nPASS: ${ok}   FAIL: ${fail}`);
process.exit(fail ? 1 : 0);
