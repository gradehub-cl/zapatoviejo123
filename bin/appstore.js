#!/usr/bin/env node
// Preparación local: nunca publica, modifica el frontend ni usa cuentas reales.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),os=require('node:os');
const {spawnSync}=require('node:child_process');
const ROOT=path.resolve(__dirname,'..');
function archivosFrontend(root){
  // La lista de producción es el contrato de qué assets pertenecen a la app.
  const workflow=fs.readFileSync(path.join(root,'.github/workflows/deploy.yml'),'utf8');
  const match=workflow.match(/archivos_app='([^']+)'/);
  if(!match)throw Error('No se encontró el contrato archivos_app del deploy.');
  const archivos=match[1].trim().split(/\s+/).filter(f=>!f.startsWith('functions/')&&f!=='_headers');
  for(const f of archivos){
    if(path.isAbsolute(f)||f.split('/').includes('..'))throw Error('Ruta de asset inválida: '+f);
    const origen=path.join(root,f);
    if(!fs.existsSync(origen)||!fs.statSync(origen).isFile())throw Error('Falta un asset: '+f);
  }
  return archivos;
}
function metadata(root){
  const m=JSON.parse(fs.readFileSync(path.join(root,'docs/appstore/es-CL.json'),'utf8'));
  for(const [k,max] of [['name',30],['subtitle',30],['keywords',100],['description',4000],['promotionalText',170]]){
    if(typeof m[k]!=='string'||!m[k].trim()||Array.from(m[k]).length>max)throw Error('Campo fuera del límite de App Store: '+k);
  }
  for(const k of ['privacyPolicyUrl','supportUrl'])if(new URL(m[k]).protocol!=='https:')throw Error('Se requiere HTTPS: '+k);
  return m;
}
function doctor(root=ROOT){
  const html=fs.readFileSync(path.join(root,'index.html'),'utf8'),auth=fs.readFileSync(path.join(root,'app-session.js'),'utf8'),app=fs.readFileSync(path.join(root,'app.js'),'utf8');
  const sdk=spawnSync('xcrun',['--sdk','iphoneos','--show-sdk-version'],{encoding:'utf8',timeout:10000});
  const version=sdk.status===0?sdk.stdout.trim():null;
  const web=archivosFrontend(root),m=metadata(root);
  return {readyForSubmission:false,scope:'Preparación estática; no certifica cumplimiento ni ejecución en iOS.',checks:[
    {id:'frontend',status:'ok',detail:`${web.length} assets disponibles para empaquetado local.`},
    {id:'metadata',status:'ok',detail:'Borrador es-CL dentro de los límites de texto; URLs pendientes de validación en producción.'},
    {id:'iphone-sdk',status:version&&parseInt(version,10)>=26?'ok':'blocked',detail:version?`SDK detectado: ${version}`:'No hay SDK iphoneos disponible en el Xcode seleccionado.'},
    {id:'native-project',status:fs.existsSync(path.join(root,'ios/App/App.xcodeproj'))?'review':'blocked',detail:'Se necesita proyecto iOS generado, firmado y probado en dispositivo; el bundle preparatorio no es un IPA.'},
    {id:'oauth',status:/signInWithOAuth/.test(auth)?'review':'manual',detail:'Verificar navegador del sistema y callback nativo para Google, recuperación y confirmación de correo. location.origin no define el retorno nativo.'},
    {id:'apple-login',status:html.includes('Sign in with Apple')||/provider\s*:\s*['"]apple['"]/.test(auth)?'review':'blocked',detail:'Si se conserva Google como login principal, resolver la opción equivalente de 4.8, habitualmente Sign in with Apple. La detección textual no prueba que funcione.'},
    {id:'account-deletion',status:app.includes("rpc('eliminar_mi_cuenta')")?'review':'blocked',detail:'Probar borrado completo desde la app con cuenta sintética, incluyendo tablas nuevas y revocación de Apple si corresponde.'},
    {id:'privacy',status:'review',detail:'Completar App Privacy con datos propios y proveedores. GA/CDN, notas sincronizadas, métricas y SDKs deben revisarse; no declarar «no recopilamos datos».'},
    {id:'external-scripts',status:'review',detail:(html.match(/<script[^>]+src="https:[^"]+"/g)||[]).join('\n')||'Sin scripts externos detectados.'},
    {id:'review-account',status:'manual',detail:'Preparar cuenta demo sintética, backend accesible y notas para App Review, sin credenciales en git.'},
    {id:'developer-account',status:'manual',detail:'Confirmar titular, Apple Developer, Team ID, Bundle ID y App Store Connect.'},
  ],metadata:m};
}
function bundle(root,out,appId){
  if(!/^[A-Za-z][A-Za-z0-9]*(\.[A-Za-z][A-Za-z0-9]*){2,}$/.test(appId||''))throw Error('Indica --app-id con el Bundle ID previsto (no lo registra en Apple).');
  const files=archivosFrontend(root);metadata(root);
  const target=path.resolve(out),relative=path.relative(root,target);
  if(!relative||(!relative.startsWith('..'+path.sep)&&relative!=='..'&&!path.isAbsolute(relative)))throw Error('La salida debe estar fuera del repo para evitar publicarla con la web.');
  if(fs.existsSync(target))throw Error('La salida ya existe; elige un directorio nuevo. No se sobrescribe.');
  const buffers=files.map(f=>[f,fs.readFileSync(path.join(root,f))]);
  // Identifica el contenido real, incluidas ediciones locales, sin depender de HEAD.
  const hash=crypto.createHash('sha256');for(const [f,b] of buffers)hash.update(f+'\0').update(b);
  const version=hash.digest('hex').slice(0,12),records=[];
  fs.mkdirSync(path.join(target,'www'),{recursive:true});
  for(const [f,original] of buffers){
    let b=original;
    if(f==='index.html'||f==='sw.js')b=Buffer.from(original.toString().replaceAll('__ASSET_VERSION__',version).replaceAll("'gradehub-dev'",`'gradehub-${version}'`));
    const dest=path.join(target,'www',f);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,b);
    records.push({path:f,bytes:b.length,sha256:crypto.createHash('sha256').update(b).digest('hex')});
  }
  fs.writeFileSync(path.join(target,'capacitor.config.json'),JSON.stringify({appId,appName:'GradeHub',webDir:'www'},null,2)+'\n');
  fs.writeFileSync(path.join(target,'package.json'),JSON.stringify({name:'gradehub-ios-preparation',private:true,version:'0.0.0',dependencies:{'@capacitor/core':'8.5.2','@capacitor/ios':'8.5.2'},devDependencies:{'@capacitor/cli':'8.5.2'}},null,2)+'\n');
  fs.writeFileSync(path.join(target,'bundle-manifest.json'),JSON.stringify({version,readyForSubmission:false,files:records},null,2)+'\n');
  fs.copyFileSync(path.join(root,'docs/appstore/es-CL.json'),path.join(target,'appstore-es-CL.json'));
  return {output:target,version,files:files.length,readyForSubmission:false};
}
if(require.main===module){
  try{
    const [command,...args]=process.argv.slice(2);
    if(command==='doctor')console.log(JSON.stringify(doctor(),null,2));
    else if(command==='bundle'){
      const options={};for(let i=0;i<args.length;i+=2){if(!['--out','--app-id'].includes(args[i])||!args[i+1]||options[args[i]])throw Error('Uso: node bin/appstore.js bundle --app-id ID [--out DIRECTORIO_NUEVO]');options[args[i]]=args[i+1];}
      // mkdtemp genera un padre; bundle exige que el destino aún no exista.
      const out=options['--out']||path.join(fs.mkdtempSync(path.join(os.tmpdir(),'gradehub-ios-')),'preparation');
      console.log(JSON.stringify(bundle(ROOT,out,options['--app-id']),null,2));
    }else throw Error('Uso: node bin/appstore.js doctor | bundle --app-id ID [--out DIRECTORIO_NUEVO]');
  }catch(e){console.error(e.message);process.exitCode=1;}
}
module.exports={archivosFrontend,metadata,doctor,bundle};
