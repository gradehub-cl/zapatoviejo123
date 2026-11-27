// El verificador real rechaza la copia remota/incompleta; Debug permite ios:rama.
const assert=require('assert'),fs=require('fs'),os=require('os'),path=require('path'),cp=require('child_process');
const raiz=path.join(__dirname,'..'),script=path.join(raiz,'bin/verificar-build-ios.py');
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'gh-archive-'));
const app=path.join(temp,'ios/App/App'),publico=path.join(app,'public');
const config=path.join(app,'capacitor.config.json');
const archivos=['data.js','engine.js','app.js','app-session.js','marketplace.js','render-main.js','render-agenda.js','supabase.js','festivos.js'];
const html='<html><script src="app.js?v=sintetico"></script><script src="festivos.js"></script><script src="https://analytics.ejemplo.test/medicion.js"></script></html>';
const comprobar=()=>cp.spawnSync('python3',[script,app],{encoding:'utf8'});
function preparar(datos={appId:'ejemplo.sintetico'}){
 fs.mkdirSync(publico,{recursive:true});fs.writeFileSync(config,JSON.stringify(datos));
 fs.writeFileSync(path.join(publico,'index.html'),html);
 for(const f of archivos)fs.writeFileSync(path.join(publico,f),'/* sintético */');
}
try{
 preparar();assert.equal(comprobar().status,0,'configuración local completa');
 preparar({server:{hostname:'localhost'}});assert.equal(comprobar().status,0,'server sin url no carga web remota');
 for(const url of ['https://ios.gradehub.pages.dev','',null]){
  preparar({server:{url}});const r=comprobar();assert.notEqual(r.status,0);assert.match(r.stderr,/server.url/);assert.match(r.stderr,/npm run ios:preparar/);
 }
 for(const nombre of ['index.html',...archivos]){
  preparar();fs.unlinkSync(path.join(publico,nombre));assert.notEqual(comprobar().status,0,'falta '+nombre);
 }
 preparar();fs.writeFileSync(path.join(publico,'app.js'),'');assert.notEqual(comprobar().status,0,'bundle vacío');
 preparar();fs.writeFileSync(config,'{ incompleto');assert.notEqual(comprobar().status,0,'config JSON inválida');
 preparar();fs.unlinkSync(config);assert.notEqual(comprobar().status,0,'config copiada ausente');
 preparar([]);assert.notEqual(comprobar().status,0,'configuración no es objeto');
 preparar({server:'remoto'});assert.notEqual(comprobar().status,0,'server inválido');
 // Un index válido no puede referenciar un archivo fuera de public.
 preparar();fs.writeFileSync(path.join(publico,'index.html'),'<script src="../privado.js"></script>');
 fs.writeFileSync(path.join(app,'privado.js'),'/* sintético */');assert.notEqual(comprobar().status,0);
 const proyecto=fs.readFileSync(path.join(raiz,'ios/App/App.xcodeproj/project.pbxproj'),'utf8');
 const fase=proyecto.match(/\/\* Begin PBXShellScriptBuildPhase section \*\/([\s\S]*?)\/\* End PBXShellScriptBuildPhase section \*\//)[1];
 const shell=JSON.parse(fase.match(/shellScript = ("(?:\\.|[^"])*");/)[1]);
 assert.match(fase,/alwaysOutOfDate = 1/,'se comprueba también al repetir Archive');
 assert(proyecto.indexOf('A6E600000000000000000001 /* Verificar build App Store */,')<proyecto.indexOf('504EC3001FED79650016851F /* Sources */,'));
 fs.mkdirSync(path.join(temp,'bin'),{recursive:true});fs.copyFileSync(script,path.join(temp,'bin/verificar-build-ios.py'));
 const ejecutar=configuracion=>cp.spawnSync('/bin/sh',['-c',shell],{encoding:'utf8',env:{...process.env,CONFIGURATION:configuracion,SRCROOT:path.join(temp,'ios/App')}});
 preparar({server:{url:'https://ios.gradehub.pages.dev'}});
 assert.equal(ejecutar('Debug').status,0,'Debug permite la rama de prueba');
 const release=ejecutar('Release');assert.notEqual(release.status,0);assert.match(release.stderr,/server.url/,'Release ejecuta el verificador real sobre la copia');
 preparar();assert.equal(ejecutar('Release').status,0,'Release local completo');
 console.log('PASS: verificador de build local, copia incompleta/remota y fase Release/Debug reales');
}finally{fs.rmSync(temp,{recursive:true,force:true});}
