// Contrato del puente y política Swift reales; solo datos sintéticos, sin red/llavero.
const assert=require('assert/strict'),fs=require('fs'),path=require('path'),os=require('os'),vm=require('vm'),{execFileSync}=require('child_process');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
(async()=>{
const fuente=read('app.js').match(/function pluginCanvas\(\)\{[\s\S]*?\n\}/)[0];
let resolver,recibido;const estado={ramos:[]};
const ctx={S:estado,currentUser:{id:'00000000-0000-0000-0000-000000000001'},enAppNativa:()=>true,window:{Capacitor:{Plugins:{GradeHubCanvas:{get:args=>{recibido=args;return new Promise(r=>resolver=r)},estado:async()=>({conectado:true})}}}}};
vm.createContext(ctx);vm.runInContext(fuente,ctx);
const puente=ctx.pluginCanvas(),p=puente.get({path:'courses'});
assert.equal(recibido.cuenta,ctx.currentUser.id);assert.equal(recibido.path,'courses');
ctx.currentUser={id:'00000000-0000-0000-0000-000000000002'};resolver({data:['privado']});await assert.rejects(p,/Cambió la cuenta/);
ctx.currentUser=null;assert.equal(ctx.pluginCanvas(),null,'sin sesión no usa el token de un tercero');
const swift=read('ios/App/App/CanvasPlugin.swift');
assert(swift.includes('kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly'));assert(swift.includes('kSecAttrAccount as String: cuenta'));
assert(swift.includes('completionHandler(nil)'),'nunca sigue una redirección con Authorization');
assert(swift.includes('session.bytes(for: pedido)')&&swift.includes('bytes.task.cancel()'),'tope durante la lectura');
assert(swift.includes('CanvasPolitica.agregarGrupos')&&swift.includes('/assignment_groups'));
assert(!/call\.resolve\([^\n]*"token"/.test(swift),'el puente no devuelve credenciales');
for(const f of ['CanvasPlugin.swift','CanvasPolitica.swift'])assert(read('ios/App/App.xcodeproj/project.pbxproj').includes(f+' in Sources'));
assert(read('ios/App/App/MainViewController.swift').includes('registerPluginInstance(GradeHubCanvasPlugin())'));
if(process.platform==='darwin'){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'gh-canvas-politica-'));
 try{
 fs.writeFileSync(path.join(dir,'main.swift'),`import Foundation
assert(CanvasPolitica.rutaValida("courses/123/assignment_groups"))
assert(CanvasPolitica.rutaValida("courses/123/assignments"))
assert(!CanvasPolitica.rutaValida("courses/123/grades"))
assert(!CanvasPolitica.rutaValida("courses/../users/self"))
assert(!CanvasPolitica.rutaValida("courses\\n"))
assert(CanvasPolitica.cuentaValida("00000000-0000-0000-0000-000000000001"))
assert(!CanvasPolitica.cuentaValida("otra"))
assert(CanvasPolitica.tokenValido("123~" + String(repeating:"A",count:24)))
assert(!CanvasPolitica.tokenValido("123~" + String(repeating:"A",count:24) + "\\n"))
let buenas="https://cursos.canvas.uc.cl/api/v1/courses/123/assignments?page=2"
assert(CanvasPolitica.urlValida(URL(string:buenas)!,ruta:"courses/123/assignments"))
for mala in ["http://cursos.canvas.uc.cl/api/v1/courses", "https://otro.cl/api/v1/courses", "https://cursos.canvas.uc.cl:444/api/v1/courses", "https://x@cursos.canvas.uc.cl/api/v1/courses", "https://cursos.canvas.uc.cl/api/v1/courses#x", "https://cursos.canvas.uc.cl/api/v1/users/self"] {
 assert(!CanvasPolitica.urlValida(URL(string:mala)!,ruta:"courses"))
}
let filas = CanvasPolitica.agregarGrupos([["id":1,"name":"Entrega","due_at":"2026-11-15","assignment_group_id":12,"grade":"privado"]],grupos:[["id":12,"name":"Controles"]])
assert((filas[0]["assignment_group"] as? [String:String])?["name"] == "Controles")
assert(filas[0]["grade"] == nil)
print("PASS política Swift real")`);
 execFileSync('xcrun',['swiftc','-module-cache-path',path.join(dir,'cache'),path.join(root,'ios/App/App/CanvasPolitica.swift'),path.join(dir,'main.swift'),'-o',path.join(dir,'prueba')],{stdio:'pipe'});
 console.log(execFileSync(path.join(dir,'prueba'),{encoding:'utf8'}).trim());
 }finally{fs.rmSync(dir,{recursive:true,force:true})}
}
console.log('PASS Canvas nativo: cuenta, respuesta tardía, host/ruta, llavero, grupos y registro');
})().catch(e=>{console.error(e);process.exitCode=1});
