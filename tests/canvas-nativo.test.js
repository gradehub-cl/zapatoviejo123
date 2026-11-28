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
assert.equal(JSON.parse(read('capacitor.config.json')).ios.loggingBehavior,'none','Capacitor tampoco imprime los argumentos del puente en Debug');
assert(swift.includes('kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly'));assert(swift.includes('kSecAttrAccount as String: cuenta'));
assert(swift.includes('completionHandler(nil)'),'nunca sigue una redirección con Authorization');
assert(swift.includes('session.bytes(for: pedido)')&&swift.includes('bytes.task.cancel()'),'tope durante la lectura');
assert(swift.includes('CanvasPolitica.agregarGrupos')&&swift.includes('/assignment_groups'));
assert(swift.includes('CanvasPolitica.limitePaginas(ruta)')&&swift.includes('CanvasPolitica.paginaAnunciosValida(url, ruta: ruta)'),'el tope y el filtro también protegen páginas siguientes');
assert(swift.includes('CanvasPolitica.parametrosValidos(ruta, items)'),'los parámetros también tienen lista cerrada');
assert(swift.includes('siguiente.setValue(nil, forHTTPHeaderField: "Authorization")')&&swift.includes('CanvasPolitica.redireccionValida(url)'),'la descarga sigue la redirección solo sin token y a dominios conocidos');
assert(swift.includes('CanvasPolitica.descargaValida(url)')&&swift.includes('CanvasPolitica.archivoBytesMax'),'el archivo se valida y tiene tope');
{const lectura=swift.slice(swift.indexOf('@objc func archivosCurso'),swift.indexOf('static func textoPdf'));
 assert(lectura.length>100&&!lectura.includes('borrarToken'),'un 401 de archivos (curso que los esconde) nunca borra el token');}
assert(swift.includes('static func borrarSiVencio')&&!/codigo == 401 && Self\.leerToken\(cuenta\) == token \{ Self\.borrarToken/.test(swift),'el token se borra solo si Canvas tampoco lo acepta para users/self');
assert(/case "pdf": contenido = Self\.textoPdf/.test(swift)&&swift.includes('CanvasPolitica.recortarTexto(contenido)'),'a la web llega solo texto recortado');
for(const f of ['proyectarCursos','proyectarGrupos','proyectarEventos','proyectarPrograma','proyectarAnuncios'])assert(swift.includes('CanvasPolitica.'+f),'cada respuesta se recorta: '+f);
assert(!/call\.resolve\([^\n]*"token"/.test(swift),'el puente no devuelve credenciales');
for(const f of ['CanvasPlugin.swift','CanvasPolitica.swift'])assert(read('ios/App/App.xcodeproj/project.pbxproj').includes(f+' in Sources'));
assert(read('ios/App/App/MainViewController.swift').includes('registerPluginInstance(GradeHubCanvasPlugin())'));
if(process.platform==='darwin'){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'gh-canvas-politica-'));
 try{
 fs.writeFileSync(path.join(dir,'main.swift'),`import Foundation
let conexiones = ConexionesCanvas()
let primero = conexiones.iniciar("cuenta A")
let otraCuenta = conexiones.iniciar("cuenta B")
let segundo = conexiones.iniciar("cuenta A")
assert(!conexiones.terminar(primero, cuenta:"cuenta A") { fatalError("una validación antigua escribió") })
assert(conexiones.desconectar("cuenta A") { true })
assert(!conexiones.terminar(segundo, cuenta:"cuenta A") { fatalError("se guardó el token después de salir") })
var guardados = 0
assert(conexiones.terminar(otraCuenta, cuenta:"cuenta B") { guardados += 1 })
assert(guardados == 1)
assert(CanvasPolitica.cuentaValida("00000000-0000-0000-0000-000000000001"))
assert(!CanvasPolitica.cuentaValida("otra"))
assert(CanvasPolitica.tokenValido("123~" + String(repeating:"A",count:24)))
assert(!CanvasPolitica.tokenValido("123~" + String(repeating:"A",count:24) + "\\n"))
let recortadoAnuncio = CanvasPolitica.proyectarAnuncios([["title":String(repeating:"a",count:300),"posted_at":"2026-11-08","message":"Fecha confirmada. " + String(repeating:"x",count:10000)]])[0]
assert((recortadoAnuncio["title"] as? String ?? "").count == 180)
assert((recortadoAnuncio["texto"] as? String ?? "").count <= CanvasPolitica.anuncioMax)
assert(!(recortadoAnuncio["texto"] as? String ?? "").hasSuffix("x"),"el texto recortado no conserva una frase incompleta")
let largo = CanvasPolitica.proyectarPrograma(["syllabus_body": String(repeating: "<p>Control 10%</p>", count: 20000)])
assert((largo["texto"] as? String ?? "").count == CanvasPolitica.programaMax && largo["recortado"] as? Bool == true)
assert(CanvasPolitica.proyectarPrograma(["syllabus_body": NSNull()])["texto"] as? String == "")
assert(CanvasPolitica.textoDocx(Data("no es zip".utf8)) == nil)
${read("tests/fixtures/canvas-politica-swift.swift")}
print("PASS política Swift real y casos compartidos")`);
 execFileSync('xcrun',['swiftc','-module-cache-path',path.join(dir,'cache'),path.join(root,'ios/App/App/CanvasPolitica.swift'),path.join(dir,'main.swift'),'-o',path.join(dir,'prueba')],{stdio:'pipe'});
 console.log(execFileSync(path.join(dir,'prueba'),[path.join(root,'tests/fixtures/canvas-politica-casos.json')],{encoding:'utf8'}).trim());
 }finally{fs.rmSync(dir,{recursive:true,force:true})}
}
console.log('PASS Canvas nativo: cuenta, respuesta tardía, host/ruta/parámetros, llavero, recortes y registro');
})().catch(e=>{console.error(e);process.exitCode=1});
