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
assert(swift.includes('CanvasPolitica.parametrosValidos(ruta, items)'),'los parámetros también tienen lista cerrada');
assert(swift.includes('siguiente.setValue(nil, forHTTPHeaderField: "Authorization")')&&swift.includes('CanvasPolitica.redireccionValida(url)'),'la descarga sigue la redirección solo sin token y a dominios conocidos');
assert(swift.includes('CanvasPolitica.descargaValida(url)')&&swift.includes('CanvasPolitica.archivoBytesMax'),'el archivo se valida y tiene tope');
{const lectura=swift.slice(swift.indexOf('@objc func archivosCurso'),swift.indexOf('static func textoPdf'));
 assert(lectura.length>100&&!lectura.includes('borrarToken'),'un 401 de archivos (curso que los esconde) nunca borra el token');}
assert(swift.includes('static func borrarSiVencio')&&!/codigo == 401 && Self\.leerToken\(cuenta\) == token \{ Self\.borrarToken/.test(swift),'el token se borra solo si Canvas tampoco lo acepta para users/self');
assert(/case "pdf": contenido = Self\.textoPdf/.test(swift)&&swift.includes('CanvasPolitica.recortarTexto(contenido)'),'a la web llega solo texto recortado');
for(const f of ['proyectarCursos','proyectarGrupos','proyectarEventos','proyectarPrograma','proyectarDocentes'])assert(swift.includes('CanvasPolitica.'+f),'cada respuesta se recorta: '+f);
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
assert(CanvasPolitica.rutaValida("calendar_events"))
for mala in ["courses/123/submissions", "courses/123/students/submissions", "conversations", "courses/123/files", "courses/123/users/7", "users/self/files", "calendar_events/9"] { assert(!CanvasPolitica.rutaValida(mala), mala) }
func q(_ p: [(String, String)]) -> [URLQueryItem] { p.map { URLQueryItem(name: $0.0, value: $0.1) } }
assert(CanvasPolitica.parametrosValidos("calendar_events", q([("context_codes[]","course_42"),("type","event"),("start_date","2026-11-16"),("end_date","2027-06-01"),("per_page","100")])))
assert(!CanvasPolitica.parametrosValidos("calendar_events", q([("type","event")])), "sin curso sería el calendario personal")
assert(!CanvasPolitica.parametrosValidos("calendar_events", q([("context_codes[]","user_7")])))
assert(!CanvasPolitica.parametrosValidos("calendar_events", q([("context_codes[]","group_7")])))
assert(!CanvasPolitica.parametrosValidos("calendar_events", q([("context_codes[]","course_42"),("type","assignment")])))
assert(!CanvasPolitica.parametrosValidos("calendar_events", q([("context_codes[]","course_42"),("start_date","mañana")])))
assert(!CanvasPolitica.parametrosValidos("calendar_events", q((0..<11).map { ("context_codes[]", "course_\\($0)") })))
assert(CanvasPolitica.parametrosValidos("courses/42/assignments", q([("include[]","submission"),("order_by","due_at"),("per_page","100")])))
assert(CanvasPolitica.parametrosValidos("courses/42/assignments", q([("bucket","future"),("per_page","100")])))
assert(!CanvasPolitica.parametrosValidos("courses/42/assignments", q([("include[]","score_statistics")])), "nada de datos de otros estudiantes")
assert(!CanvasPolitica.parametrosValidos("courses/42/assignments", q([("as_user_id","9")])))
assert(!CanvasPolitica.parametrosValidos("courses/42/assignment_groups", q([("include[]","assignments")])))
assert(CanvasPolitica.parametrosValidos("courses", q([("enrollment_state","active"),("include[]","term"),("per_page","50")])))
assert(!CanvasPolitica.parametrosValidos("courses", q([("include[]","syllabus_body")])))
assert(!CanvasPolitica.parametrosValidos("courses", q([("per_page","1000")])))
assert(!CanvasPolitica.parametrosValidos("users/self", q([("include[]","term")])))
assert(!CanvasPolitica.parametrosValidos("courses/123/grades", []))
assert(CanvasPolitica.cuentaValida("00000000-0000-0000-0000-000000000001"))
assert(!CanvasPolitica.cuentaValida("otra"))
assert(CanvasPolitica.tokenValido("123~" + String(repeating:"A",count:24)))
assert(!CanvasPolitica.tokenValido("123~" + String(repeating:"A",count:24) + "\\n"))
let buenas="https://cursos.canvas.uc.cl/api/v1/courses/123/assignments?page=2"
assert(CanvasPolitica.urlValida(URL(string:buenas)!,ruta:"courses/123/assignments"))
for mala in ["http://cursos.canvas.uc.cl/api/v1/courses", "https://otro.cl/api/v1/courses", "https://cursos.canvas.uc.cl:444/api/v1/courses", "https://x@cursos.canvas.uc.cl/api/v1/courses", "https://cursos.canvas.uc.cl/api/v1/courses#x", "https://cursos.canvas.uc.cl/api/v1/users/self"] {
 assert(!CanvasPolitica.urlValida(URL(string:mala)!,ruta:"courses"))
}
assert(CanvasPolitica.rutaValida("courses/42/users"))
assert(CanvasPolitica.tipo("courses/42/users") == .docentes)
let filtrosDocentes = q([("enrollment_type[]","teacher"),("enrollment_type[]","ta"),("include[]","enrollments"),("per_page","50")])
assert(CanvasPolitica.parametrosValidos("courses/42/users",filtrosDocentes))
for malos in [q([]),q([("enrollment_type[]","student")]),q([("enrollment_type[]","teacher")]),filtrosDocentes + q([("include[]","avatar_url")]),filtrosDocentes + q([("enrollment_role","StudentEnrollment")]),filtrosDocentes + q([("enrollment_type[]","teacher")]),filtrosDocentes + q([("search_term","persona")])] { assert(!CanvasPolitica.parametrosValidos("courses/42/users",malos)) }
for ruta in ["users","users/42","courses/42/search_users","courses/42/students","courses/42/users/7","groups/42/users"] { assert(!CanvasPolitica.rutaValida(ruta)) }
assert(CanvasPolitica.limitePaginas("courses/42/users") == 3 && CanvasPolitica.limitePaginas("courses/42/assignments") == 10)
let paginaDocentes = URL(string:"https://cursos.canvas.uc.cl/api/v1/courses/42/users?enrollment_type%5B%5D=teacher&enrollment_type%5B%5D=ta&include%5B%5D=enrollments&per_page=50&page=2")!
assert(CanvasPolitica.paginaDocentesValida(paginaDocentes,ruta:"courses/42/users"))
for query in ["page=2","enrollment_type%5B%5D=student&page=2","enrollment_type%5B%5D=teacher&enrollment_type%5B%5D=ta&include%5B%5D=enrollments&page=4"] { assert(!CanvasPolitica.paginaDocentesValida(URL(string:"https://cursos.canvas.uc.cl/api/v1/courses/42/users?"+query)!,ruta:"courses/42/users")) }
let docentes = CanvasPolitica.proyectarDocentes([
 ["id":7,"name":"Docente Sintético Uno","email":"privado@ejemplo.invalid","avatar_url":"https://privado","enrollments":[["id":1,"course_id":42,"type":"TeacherEnrollment","role":"Rol personalizado","enrollment_state":"active"]]],
 ["id":8,"name":"Ayudante Sintética Uno","enrollments":[["course_id":42,"type":"TaEnrollment","enrollment_state":"active"]]],
 ["id":9,"name":"Estudiante Sintético","enrollments":[["course_id":42,"type":"StudentEnrollment","enrollment_state":"active"]]],
 ["name":"Docente de otro curso","enrollments":[["course_id":43,"type":"TeacherEnrollment","enrollment_state":"active"]]],
 ["name":"Invitación pendiente","enrollments":[["course_id":42,"type":"TeacherEnrollment","enrollment_state":"invited"]]],
 ["name":"correo@ejemplo.invalid","enrollments":[["course_id":42,"type":"TeacherEnrollment","enrollment_state":"active"]]]
],curso:42)
assert(docentes.count == 2)
assert(docentes[0] == ["nombre":"Docente Sintético Uno","rol":"profesor"])
assert(docentes[1] == ["nombre":"Ayudante Sintética Uno","rol":"ayudante"])
assert(docentes.allSatisfy { Set($0.keys) == ["nombre","rol"] })
assert(CanvasPolitica.proyectarDocentes([],curso:42).isEmpty)
assert(CanvasPolitica.proyectarDocentes([["name":"Sin matrícula visible"]],curso:42).isEmpty)
let filas = CanvasPolitica.agregarGrupos([["id":1,"name":"Entrega","due_at":"2026-11-15","assignment_group_id":12,"grade":"privado"]],grupos:[["id":12,"name":"Controles"]])
assert((filas[0]["assignment_group"] as? [String:String])?["name"] == "Controles")
assert(filas[0]["grade"] == nil)
let conNota = CanvasPolitica.agregarGrupos([["id":2,"name":"I1","description":"<p>enunciado</p>","points_possible":7,"grading_type":"points","due_at":NSNull(),"submission":["score":5.5,"grade":"5.5","workflow_state":"graded","submission_comments":["comentario"],"attachments":["archivo"],"user_id":99]]],grupos:[])
assert(conNota[0]["description"] == nil && conNota[0]["due_at"] == nil)
assert(conNota[0]["points_possible"] as? Int == 7 && conNota[0]["grading_type"] as? String == "points")
let entrega = conNota[0]["submission"] as? [String:Any]
assert(entrega?["score"] as? Double == 5.5 && entrega?["grade"] as? String == "5.5")
assert(entrega?["submission_comments"] == nil && entrega?["attachments"] == nil && entrega?["user_id"] == nil)
let eventos = CanvasPolitica.proyectarEventos([["id":1,"title":"Interrogación 2","start_at":"2099-10-25T21:30:00Z","all_day":false,"type":"event","context_code":"course_42","description":"<a href=x>zoom</a>","location_name":"Sala B12"],["id":2,"title":"Personal","type":"event","context_code":"user_7"],["id":3,"title":"Tarea","type":"assignment","context_code":"course_42"]])
assert(eventos.count == 1 && eventos[0]["title"] as? String == "Interrogación 2")
assert(eventos[0]["description"] == nil && eventos[0]["location_name"] == nil)
let cursos = CanvasPolitica.proyectarCursos([["id":42,"name":"Curso","course_code":"MAT1620-2","apply_assignment_group_weights":true,"syllabus_body":"<p>x</p>","term":["name":"2026 Segundo Semestre","id":5]]])
assert(cursos[0]["syllabus_body"] == nil && cursos[0]["apply_assignment_group_weights"] as? Bool == true)
assert((cursos[0]["term"] as? [String:String])?["name"] == "2026 Segundo Semestre")
let grupos = CanvasPolitica.proyectarGrupos([["id":12,"name":"Controles","group_weight":30,"rules":["drop_lowest":1],"assignments":[["id":1]]]])
assert(Set(grupos[0].keys) == ["id","name","group_weight"])
assert(CanvasPolitica.rutaValida("courses/42"))
assert(CanvasPolitica.parametrosValidos("courses/42", q([("include[]","syllabus_body")])))
assert(!CanvasPolitica.parametrosValidos("courses/42", q([("include[]","total_scores")])), "solo el programa")
assert(!CanvasPolitica.parametrosValidos("courses/42", q([("include[]","students")])))
assert(!CanvasPolitica.rutaValida("courses/42/front_page") && !CanvasPolitica.rutaValida("courses/42/pages"))
let programa = CanvasPolitica.proyectarPrograma(["id":42,"name":"Curso","syllabus_body":"<h2>Evaluaci&oacute;n</h2><script>alert(1)</script><table><tr><th>Evaluación</th><th>Ponderación</th></tr><tr><td>Interrogación 1</td><td>25&nbsp;%</td></tr><tr><td><a href=\\"https://x.cl\\" onclick=\\"y()\\">Examen</a></td><td>35%</td></tr></table><p>Ver <a href=\\"/courses/42/files/77\\">programa.pdf</a></p><img src=x onerror=z()>","teachers":[["name":"Profe"]]])
let textoPrograma = programa["texto"] as? String ?? ""
assert(Set(programa.keys) == ["texto","archivo","recortado"])
assert(textoPrograma.hasPrefix("# Evaluación\\n"), textoPrograma)
assert(textoPrograma.contains("Interrogación 1\\t25 %") && textoPrograma.contains("Examen\\t35%"), textoPrograma)
assert(!textoPrograma.contains("<") && !textoPrograma.contains("alert") && !textoPrograma.contains("onerror") && !textoPrograma.contains("https://x.cl"), textoPrograma)
assert(programa["archivo"] as? Bool == true && programa["recortado"] as? Bool == false)
let largo = CanvasPolitica.proyectarPrograma(["syllabus_body": String(repeating: "<p>Control 10%</p>", count: 20000)])
assert((largo["texto"] as? String ?? "").count == CanvasPolitica.programaMax && largo["recortado"] as? Bool == true)
assert(CanvasPolitica.proyectarPrograma(["syllabus_body": NSNull()])["texto"] as? String == "")
// Programa desde los archivos (2026-11-17): rutas solo para el plugin, sin enlaces a la web.
assert(CanvasPolitica.rutaArchivos("courses/12/files") && CanvasPolitica.rutaArchivos("courses/12/modules") && CanvasPolitica.rutaArchivos("courses/12/files/99"))
assert(!CanvasPolitica.rutaValida("courses/12/files") && !CanvasPolitica.rutaValida("courses/12/modules"), "la web sigue sin pedir archivos con get")
assert(!CanvasPolitica.rutaArchivos("courses/12/files/99/download") && !CanvasPolitica.rutaArchivos("users/self/files") && !CanvasPolitica.rutaArchivos("courses/12/users"))
assert(CanvasPolitica.parametrosArchivos("courses/12/modules", q([("include[]","items"),("per_page","100")])))
assert(!CanvasPolitica.parametrosArchivos("courses/12/files", q([("include[]","items")])) && !CanvasPolitica.parametrosArchivos("courses/12/files", q([("search_term","x")])))
assert(CanvasPolitica.descargaValida(URL(string:"https://cursos.canvas.uc.cl/files/55/download?download_frd=1&verifier=x")!))
for mala in ["https://otro.cl/files/55/download", "http://cursos.canvas.uc.cl/files/55/download", "https://cursos.canvas.uc.cl/files/55", "https://cursos.canvas.uc.cl/api/v1/users/self"] { assert(!CanvasPolitica.descargaValida(URL(string:mala)!), mala) }
assert(CanvasPolitica.redireccionValida(URL(string:"https://inst-fs-iad-prod.inscloudgate.net/files/abc")!))
for mala in ["https://inscloudgate.net.otro.cl/x", "http://inst-fs.inscloudgate.net/x", "https://u:p@inst-fs.inscloudgate.net/x"] { assert(!CanvasPolitica.redireccionValida(URL(string:mala)!), mala) }
let lista = CanvasPolitica.proyectarArchivos(archivos: [["id":5,"display_name":"Programa.pdf","content-type":"application/pdf","size":1000,"url":"https://secreto"],["id":6,"display_name":"foto.png","content-type":"image/png"]],
  modulos: [["name":"Programa","items":[["type":"File","content_id":5,"title":"Programa.pdf"],["type":"File","content_id":7,"title":"Reglas.docx"],["type":"Page","title":"x"]]]])
assert(lista.count == 2 && lista[0]["url"] == nil && lista[0]["modulo"] as? String == "Programa" && lista[1]["tipo"] as? String == "docx")
assert(CanvasPolitica.textoDocx(Data("no es zip".utf8)) == nil)
let sinExt = CanvasPolitica.proyectarArchivos(archivos: [], modulos: [["name":"Información","items":[["type":"File","content_id":9,"title":"Programa del curso"]]]])
assert(sinExt.count == 1 && sinExt[0]["tipo"] as? String == "archivo", "un ítem de módulo sin extensión también entra")
print("PASS política Swift real")`);
 execFileSync('xcrun',['swiftc','-module-cache-path',path.join(dir,'cache'),path.join(root,'ios/App/App/CanvasPolitica.swift'),path.join(dir,'main.swift'),'-o',path.join(dir,'prueba')],{stdio:'pipe'});
 console.log(execFileSync(path.join(dir,'prueba'),{encoding:'utf8'}).trim());
 }finally{fs.rmSync(dir,{recursive:true,force:true})}
}
console.log('PASS Canvas nativo: cuenta, respuesta tardía, host/ruta/parámetros, llavero, recortes y registro');
})().catch(e=>{console.error(e);process.exitCode=1});
