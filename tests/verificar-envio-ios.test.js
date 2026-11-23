// bin/verificar-envio-ios.js: el build para la App Store no puede ser el de
// ios:rama (carga un servidor remoto) ni quedar a medio armar. Todo sintético.
const fs=require('fs'),os=require('os'),path=require('path'),assert=require('assert/strict');
const {verificarEnvioIOS}=require('../bin/verificar-envio-ios.js');
let ok=0;const chk=(n,c)=>{assert.ok(c,n);ok++;console.log('  OK   '+n);};
const SCRIPTS=['data.js','engine.js','app.js','app-session.js','marketplace.js','render-main.js','render-agenda.js','supabase.js'];
const HTML='<script async src="https://www.googletagmanager.com/gtag/js?id=G-SINTETICO"></script>\n<script src="supabase.js" integrity="sha384-x"></script>\n'+SCRIPTS.slice(0,7).map(s=>`<script src="${s}?v=abc1234"></script>`).join('\n');
function armar({config={appId:'cl.gradehub.app'},html=HTML,faltan=[]}={}){
  const d=fs.mkdtempSync(path.join(os.tmpdir(),'gh-envio-ios-'));
  fs.mkdirSync(path.join(d,'public'));
  if(config!==null)fs.writeFileSync(path.join(d,'capacitor.config.json'),JSON.stringify(config));
  fs.writeFileSync(path.join(d,'public','index.html'),html);
  for(const s of SCRIPTS)if(!faltan.includes(s))fs.writeFileSync(path.join(d,'public',s),'//');
  return d;
}
const bien=verificarEnvioIOS(armar());
chk('el build de ios:preparar pasa',bien.errores.length===0);
chk('y avisa que Google Analytics sigue siendo remoto',bien.avisos.length===1&&/googletagmanager/.test(bien.avisos[0]));
chk('con server.url (ios:rama) no se envía',verificarEnvioIOS(armar({config:{appId:'cl.gradehub.app',server:{url:'https://ios.gradehub.pages.dev'}}})).errores.some(e=>/ios\.gradehub\.pages\.dev/.test(e)));
chk('sin capacitor.config.json no se envía',verificarEnvioIOS(armar({config:null})).errores.length>0);
chk('si falta un script del bundle no se envía',verificarEnvioIOS(armar({faltan:['marketplace.js']})).errores.some(e=>/marketplace\.js/.test(e)));
chk('si supabase-js sigue en jsDelivr no se envía',verificarEnvioIOS(armar({html:HTML.replace('<script src="supabase.js" integrity="sha384-x">','<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js">')})).errores.length>=2);
chk('sin versión sellada no se envía',verificarEnvioIOS(armar({html:HTML.replace(/abc1234/g,'__ASSET_VERSION__')})).errores.some(e=>/versión/.test(e)));
chk('un script remoto nuevo no se envía',verificarEnvioIOS(armar({html:HTML+'\n<script src="https://ejemplo.invalid/x.js"></script>'})).errores.some(e=>/ejemplo\.invalid/.test(e)));
console.log(`\nPASS: ${ok}   FAIL: 0`);
