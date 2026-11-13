// La app de Google Play es una TWA: Chrome solo la abre a pantalla completa si
// gradehub.cl declara la huella del certificado con que está firmada. Google
// vuelve a firmar lo que subimos (Play App Signing), así que la huella que ve el
// teléfono es la de Play, no la de la clave de subida. Si se pierde, a todo
// Android se le aparece la barra del navegador encima de la app.
const assert = require('assert');
const links = JSON.parse(require('fs').readFileSync(__dirname + '/../.well-known/assetlinks.json', 'utf8'));
const app = links.find(l => l.target && l.target.package_name === 'cl.gradehub.app');
assert(app, 'falta cl.gradehub.app en assetlinks.json');
assert(app.relation.includes('delegate_permission/common.handle_all_urls'));
const huellas = app.target.sha256_cert_fingerprints;
// Clave de firma de Play (Play Console → Protegida con Play → Firma de aplicaciones).
assert(huellas.includes('1A:38:07:E3:5B:39:5F:00:23:3D:A9:00:72:63:DC:C7:F1:1D:C3:C6:03:0B:3C:DB:89:4B:66:06:E3:6F:A2:4F'), 'falta la huella de la clave de firma de Play');
// Clave de subida: la que firma el APK que se instala a mano para probar.
assert(huellas.includes('F1:44:C2:04:15:CC:C7:DB:50:9A:F4:37:5C:03:0C:DC:AD:A2:E3:8A:B1:75:CA:B8:DD:E6:F0:F1:1E:FF:6E:39'), 'falta la huella de la clave de subida');
huellas.forEach(h => assert(/^([0-9A-F]{2}:){31}[0-9A-F]{2}$/.test(h), 'huella mal escrita: ' + h));
console.log('assetlinks OK');
