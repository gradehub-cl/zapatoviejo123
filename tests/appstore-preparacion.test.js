const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto');
const {archivosFrontend,metadata,bundle}=require('../bin/appstore');
const root=path.resolve(__dirname,'..'),tmp=fs.mkdtempSync(path.join(os.tmpdir(),'gh-appstore-test-'));
try{
 const files=archivosFrontend(root),hash=f=>crypto.createHash('sha256').update(fs.readFileSync(path.join(root,f))).digest('hex');
 const before=files.map(hash),out=path.join(tmp,'bundle');
 assert.equal(metadata(root).status,'draft');
 assert.throws(()=>bundle(root,path.join(root,'dist-ios'),'cl.test.app'),/fuera del repo/);
 assert.throws(()=>bundle(root,out,'inválido'),/Bundle ID/);
 const result=bundle(root,out,'cl.synthetic.gradehub');assert.equal(result.readyForSubmission,false);
 const manifest=JSON.parse(fs.readFileSync(path.join(out,'bundle-manifest.json')));
 assert.equal(manifest.files.length,files.length);
 for(const record of manifest.files){const b=fs.readFileSync(path.join(out,'www',record.path));assert.equal(crypto.createHash('sha256').update(b).digest('hex'),record.sha256);}
 assert.deepEqual(files.map(hash),before,'No altera los assets de producción');
 assert.ok(!files.some(f=>f.startsWith('functions/')||f==='package.json'||f.includes('supabase/')));
 assert.ok(!fs.readFileSync(path.join(out,'www/index.html'),'utf8').includes('__ASSET_VERSION__'));
 const config=JSON.parse(fs.readFileSync(path.join(out,'capacitor.config.json')));
 assert.equal(config.webDir,'www');assert.equal(config.server,undefined,'No carga la web remota como sustituto del bundle');
 assert.throws(()=>bundle(root,out,'cl.synthetic.gradehub'),/ya existe/);
 const fixture=path.join(tmp,'missing');fs.mkdirSync(path.join(fixture,'.github/workflows'),{recursive:true});
 fs.writeFileSync(path.join(fixture,'.github/workflows/deploy.yml'),"archivos_app='index.html missing.js'");
 assert.throws(()=>archivosFrontend(fixture),/Falta un asset/);
 console.log('OK App Store: assets completos, hashes, sellado, metadata, salida aislada y sin sobrescritura');
}finally{fs.rmSync(tmp,{recursive:true,force:true});}
