// Contrato del plugin propio y la firma. La compilación Swift se comprueba con Xcode.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');const read=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
const swift=read('ios/App/App/AppleSignInPlugin.swift'),proyecto=read('ios/App/App.xcodeproj/project.pbxproj');
assert.match(swift,/CAPBridgedPlugin/);assert.match(swift,/ASAuthorizationAppleIDProvider\(\).createRequest\(\)/);assert.match(swift,/requestedScopes = \[.fullName, .email\]/);assert.match(swift,/request.nonce = nonce/);assert.match(swift,/ASAuthorizationError.canceled/);
assert.doesNotMatch(swift,/UserDefaults\s*\(|print\s*\(/);
assert.match(read('ios/App/App/MainViewController.swift'),/registerPluginInstance\(AppleSignInPlugin\(\)\)/);
assert.match(proyecto,/AppleSignInPlugin.swift in Sources/);assert.match(read('ios/App/App/App.entitlements'),/com.apple.developer.applesignin[\s\S]*Default/);
assert.doesNotMatch(proyecto,/DEVELOPMENT_TEAM\s*=\s*[A-Z0-9]{10}/);assert.doesNotMatch(proyecto,/PRODUCT_BUNDLE_IDENTIFIER\s*=\s*cl\./);
const html=read('index.html');assert(html.indexOf('id="btn-apple"')<html.indexOf('id="btn-google"'));assert.match(html,/aria-label="Continuar con Apple"/);
assert.match(read('privacidad.html'),/Si entras con Apple/);assert.match(read('privacidad.html'),/relay/);
for(const f of ['apple/continuar-negro.png','apple/continuar-blanco.png'])assert(read('.github/workflows/deploy.yml').includes(f));
console.log('PASS contrato Apple: plugin propio, scopes, cancelación, nonce, entitlement y firma sin identificadores personales, privacidad y assets incluidos.');
