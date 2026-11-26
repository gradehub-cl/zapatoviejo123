import Capacitor
import Foundation
import PDFKit
import Security

// Canvas UC en la app iOS (#648). El token personal del estudiante vive SOLO en
// el llavero de este iPhone: no pasa por nuestros servidores ni por Supabase,
// no entra a S y la parte web nunca lo vuelve a leer. La web pide datos con
// `get` y este plugin hace la consulta a Canvas con el token.
//
// Solo lectura: únicamente GET, a un único host y a una lista cerrada de rutas.
@objc(GradeHubCanvasPlugin)
public class GradeHubCanvasPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "GradeHubCanvasPlugin"
    public let jsName = "GradeHubCanvas"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "estado", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "conectar", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "desconectar", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "get", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "archivosCurso", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "leerArchivo", returnType: CAPPluginReturnPromise),
    ]

    static let api = CanvasPolitica.api
    // Lo único que la app necesita leer: quién eres, tus cursos, sus tareas
    // (con tu propia nota si la web la pide), grupos, eventos y el programa
    // del curso, este último ya convertido a texto plano.
    static let paginasMax = CanvasPolitica.paginasMax

    // ─── Llavero ─────────────────────────────────────────────────────────────
    // Solo en este dispositivo y después del primer desbloqueo: no viaja a
    // iCloud ni a un respaldo que se restaure en otro teléfono.
    static let servicio = "cl.gradehub.canvas"

    static func consulta(_ cuenta: String) -> [String: Any] {
        [kSecClass as String: kSecClassGenericPassword,
         kSecAttrService as String: servicio,
         kSecAttrAccount as String: cuenta]
    }
    private static let conexiones = ConexionesCanvas()

    static func guardarToken(_ token: String, cuenta: String) -> Bool {
        let datos = Data(token.utf8)
        let cambio = SecItemUpdate(consulta(cuenta) as CFDictionary, [kSecValueData as String: datos] as CFDictionary)
        if cambio != errSecItemNotFound { return cambio == errSecSuccess }
        var item = consulta(cuenta)
        item[kSecValueData as String] = datos
        item[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
        return SecItemAdd(item as CFDictionary, nil) == errSecSuccess
    }
    static func leerToken(_ cuenta: String) -> String? {
        var q = consulta(cuenta)
        q[kSecReturnData as String] = true
        q[kSecMatchLimit as String] = kSecMatchLimitOne
        var resultado: AnyObject?
        guard SecItemCopyMatching(q as CFDictionary, &resultado) == errSecSuccess,
              let datos = resultado as? Data else { return nil }
        return String(data: datos, encoding: .utf8)
    }
    static func borrarToken(_ cuenta: String) -> Bool {
        let resultado = SecItemDelete(consulta(cuenta) as CFDictionary)
        return resultado == errSecSuccess || resultado == errSecItemNotFound
    }
    // Canvas responde 401 tanto a un token vencido como a «no tienes permiso
    // para eso» (un curso que esconde una sección). Se borra solo si Canvas
    // tampoco acepta el token para `users/self`.
    static func borrarSiVencio(_ token: String, cuenta: String) async {
        if case .failure(let e) = await pedir("users/self", [], token: token), e.codigo == 401 {
            conexiones.revisarRevocacion { if leerToken(cuenta) == token { _ = borrarToken(cuenta) } }
        }
    }

    // ─── Métodos ─────────────────────────────────────────────────────────────
    private func cuenta(_ call: CAPPluginCall) -> String? {
        let cuenta = call.getString("cuenta") ?? ""
        guard CanvasPolitica.cuentaValida(cuenta) else { call.reject("Inicia sesión en GradeHub."); return nil }
        return cuenta.lowercased()
    }
    @objc func estado(_ call: CAPPluginCall) {
        guard let cuenta = cuenta(call) else { return }
        // Para mostrar Ajustes basta comprobar si existe, sin leer su valor.
        switch SecItemCopyMatching(Self.consulta(cuenta) as CFDictionary, nil) {
        case errSecSuccess: call.resolve(["conectado": true])
        case errSecItemNotFound: call.resolve(["conectado": false])
        default: call.reject("No pudimos revisar el llavero de este iPhone.")
        }
    }

    // Revisa con Canvas que el token sirva antes de guardarlo.
    @objc func conectar(_ call: CAPPluginCall) {
        guard let cuenta = cuenta(call) else { return }
        let token = (call.getString("token") ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
        guard CanvasPolitica.tokenValido(token) else {
            call.reject("Eso no parece un token de Canvas.")
            return
        }
        let intento = Self.conexiones.iniciar(cuenta)
        Task {
            let validacion = await Self.pedir("users/self", [], token: token)
            let vigente = Self.conexiones.terminar(intento, cuenta: cuenta) {
                switch validacion {
                case .success:
                    if Self.guardarToken(token, cuenta: cuenta) { call.resolve(["conectado": true]) }
                    else { call.reject("No pudimos guardar el token en el iPhone.") }
                case .failure(let error):
                    call.reject(error.mensaje, String(error.codigo))
                }
            }
            if !vigente { call.reject("La conexión se canceló.") }
        }
    }

    @objc func desconectar(_ call: CAPPluginCall) {
        guard let cuenta = cuenta(call) else { return }
        let borrado = Self.conexiones.desconectar(cuenta) { Self.borrarToken(cuenta) }
        if borrado { call.resolve(["conectado": false]) }
        else { call.reject("No pudimos desconectar Canvas en este iPhone.") }
    }

    // GET de solo lectura. `params` es un objeto: los arreglos se repiten
    // (`include[]=term`), como los pide Canvas.
    @objc func get(_ call: CAPPluginCall) {
        guard let cuenta = cuenta(call) else { return }
        let ruta = call.getString("path") ?? ""
        guard CanvasPolitica.rutaValida(ruta) else {
            call.reject("Esa consulta a Canvas no está permitida.")
            return
        }
        guard let token = Self.leerToken(cuenta) else {
            call.reject("Conecta Canvas primero.", "401")
            return
        }
        var items: [URLQueryItem] = []
        for (clave, valor) in call.getObject("params") ?? [:] {
            if let lista = valor as? [Any] { lista.forEach { items.append(URLQueryItem(name: clave, value: "\($0)")) } }
            else { items.append(URLQueryItem(name: clave, value: "\(valor)")) }
        }
        guard CanvasPolitica.parametrosValidos(ruta, items) else {
            call.reject("Esa consulta a Canvas no está permitida.")
            return
        }
        let tipo = CanvasPolitica.tipo(ruta)
        Task {
            switch await Self.pedir(ruta, items, token: token) {
            case .success(let datos):
                let filas = datos as? [[String: Any]] ?? []
                switch tipo {
                case .tareas:
                    // #806 entiende el nombre del grupo; también vuelven los
                    // grupos con su peso, como referencia para la pauta.
                    let gruposRuta = ruta.replacingOccurrences(of: "/assignments", with: "/assignment_groups")
                    var grupos: [[String: Any]] = []
                    switch await Self.pedir(gruposRuta, [URLQueryItem(name: "per_page", value: "100")], token: token) {
                    case .success(let datosGrupos): grupos = datosGrupos as? [[String: Any]] ?? []
                    case .failure(let error):
                        if error.codigo == 401 {
                            await Self.borrarSiVencio(token, cuenta: cuenta)
                            call.reject(error.mensaje, String(error.codigo)); return
                        }
                    }
                    call.resolve(["data": CanvasPolitica.agregarGrupos(filas, grupos: grupos),
                                  "grupos": CanvasPolitica.proyectarGrupos(grupos)])
                case .cursos: call.resolve(["data": CanvasPolitica.proyectarCursos(filas)])
                case .grupos: call.resolve(["data": CanvasPolitica.proyectarGrupos(filas)])
                case .docentes:
                    let curso = Int(ruta.split(separator: "/")[1]) ?? 0
                    call.resolve(["data": CanvasPolitica.proyectarDocentes(filas, curso: curso)])
                case .anuncios: call.resolve(["data": CanvasPolitica.proyectarAnuncios(filas)])
                case .eventos: call.resolve(["data": CanvasPolitica.proyectarEventos(filas)])
                case .programa: call.resolve(["data": CanvasPolitica.proyectarPrograma(datos as? [String: Any] ?? [:])])
                // `users/self` solo sirve para validar el token al conectar.
                case .yo, .none: call.resolve(["data": [] as [Any]])
                }
            case .failure(let error):
                // Un token revocado o vencido no sirve más: se borra.
                if error.codigo == 401 { await Self.borrarSiVencio(token, cuenta: cuenta) }
                call.reject(error.mensaje, String(error.codigo))
            }
        }
    }

    // ─── Programa desde los archivos del curso (Lucas, 2026-11-17) ──────────
    // Nombres y tipos (PDF, Word o texto) de los archivos del curso y de sus
    // módulos. Sin enlaces: para leer uno, la web pide `leerArchivo` con su id.
    @objc func archivosCurso(_ call: CAPPluginCall) {
        guard let cuenta = cuenta(call) else { return }
        guard let curso = call.getInt("curso"), CanvasPolitica.cursoValido(curso) else { call.reject("Ese curso no es válido."); return }
        guard let token = Self.leerToken(cuenta) else { call.reject("Conecta Canvas primero.", "401"); return }
        Task {
            let porPagina = URLQueryItem(name: "per_page", value: "100")
            let conItems = [URLQueryItem(name: "include[]", value: "items"), porPagina]
            guard CanvasPolitica.parametrosArchivos("courses/\(curso)/files", [porPagina]),
                  CanvasPolitica.parametrosArchivos("courses/\(curso)/modules", conItems) else { call.reject("Esa consulta a Canvas no está permitida."); return }
            // Muchos cursos esconden «Archivos» a los estudiantes: entonces
            // quedan los módulos, que es donde suele estar el programa.
            let archivos = await Self.pedir("courses/\(curso)/files", [porPagina], token: token, permitida: CanvasPolitica.rutaArchivos)
            let modulos = await Self.pedir("courses/\(curso)/modules", conItems, token: token, permitida: CanvasPolitica.rutaArchivos)
            // Ojo: Canvas responde 401 también cuando el curso esconde
            // «Archivos» a los estudiantes. Eso NO es un token vencido: acá
            // nunca se borra el token; si falta acceso, quedan los módulos.
            let a = (try? archivos.get()) as? [[String: Any]] ?? []
            let m = (try? modulos.get()) as? [[String: Any]] ?? []
            if a.isEmpty, m.isEmpty, case .failure = archivos, case .failure(let e) = modulos {
                call.reject("No pudimos ver los archivos del curso en Canvas.", String(e.codigo)); return
            }
            call.resolve(["data": CanvasPolitica.proyectarArchivos(archivos: a, modulos: m)])
        }
    }

    // Descarga un archivo DEL curso y devuelve solo su texto, con tope. Canvas
    // confirma que el archivo es de ese curso (courses/N/files/M) y da el
    // enlace; la web nunca lo ve. Un PDF escaneado vuelve sin texto.
    @objc func leerArchivo(_ call: CAPPluginCall) {
        guard let cuenta = cuenta(call) else { return }
        guard let curso = call.getInt("curso"), CanvasPolitica.cursoValido(curso),
              let archivo = call.getInt("archivo"), CanvasPolitica.cursoValido(archivo) else { call.reject("Ese archivo no es válido."); return }
        guard let token = Self.leerToken(cuenta) else { call.reject("Conecta Canvas primero.", "401"); return }
        Task {
            let ficha: [String: Any]
            switch await Self.pedir("courses/\(curso)/files/\(archivo)", [], token: token, permitida: CanvasPolitica.rutaArchivos) {
            case .success(let datos): ficha = datos as? [String: Any] ?? [:]
            case .failure(let e):
                // Un 401 acá suele ser «sin permiso para ese archivo», no un
                // token vencido: no se borra.
                call.reject("No pudimos abrir ese archivo de Canvas.", String(e.codigo)); return
            }
            let nombre = ficha["display_name"] as? String ?? ""
            guard let tipo = CanvasPolitica.tipoArchivo(nombre: nombre, contentType: ficha["content-type"] as? String) else {
                call.reject("Ese archivo no es PDF, Word ni texto."); return
            }
            if let tamano = ficha["size"] as? Int, tamano > CanvasPolitica.archivoBytesMax { call.reject("El archivo es demasiado grande."); return }
            guard let texto = ficha["url"] as? String, let url = URL(string: texto), CanvasPolitica.descargaValida(url) else {
                call.reject("Canvas no entregó el archivo."); return
            }
            guard let datos = await Self.descargar(url, token: token) else { call.reject("No pudimos descargar el archivo de Canvas."); return }
            let contenido: String
            switch tipo {
            case "pdf": contenido = Self.textoPdf(datos)
            case "docx": contenido = CanvasPolitica.textoDocx(datos) ?? ""
            default: contenido = String(decoding: datos, as: UTF8.self)
            }
            var respuesta = CanvasPolitica.recortarTexto(contenido)
            respuesta["nombre"] = String(nombre.prefix(200))
            respuesta["tipo"] = tipo
            call.resolve(respuesta)
        }
    }

    static func textoPdf(_ datos: Data) -> String {
        guard let pdf = PDFDocument(data: datos) else { return "" }
        var partes: [String] = []
        for i in 0..<min(pdf.pageCount, 60) { if let t = pdf.page(at: i)?.string { partes.append(t) } }
        return partes.joined(separator: "\n")
    }

    // El token va solo al host de Canvas. Si Canvas redirige al almacenamiento
    // de archivos, el pedido siguiente sale SIN token y solo a esos dominios.
    static func descargar(_ url: URL, token: String) async -> Data? {
        let config = URLSessionConfiguration.ephemeral
        config.urlCache = nil
        config.httpCookieStorage = nil
        config.httpShouldSetCookies = false
        let session = URLSession(configuration: config, delegate: CanvasDescarga(), delegateQueue: nil)
        defer { session.invalidateAndCancel() }
        var pedido = URLRequest(url: url, timeoutInterval: 30)
        pedido.httpMethod = "GET"
        pedido.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        guard let (bytes, respuesta) = try? await session.bytes(for: pedido),
              let http = respuesta as? HTTPURLResponse, (200..<300).contains(http.statusCode) else { return nil }
        var datos = Data()
        do {
            for try await byte in bytes {
                if datos.count >= CanvasPolitica.archivoBytesMax { bytes.task.cancel(); return nil }
                datos.append(byte)
            }
        } catch { return nil }
        return datos
    }

    // ─── HTTP ────────────────────────────────────────────────────────────────
    struct ErrorCanvas: Error {
        let codigo: Int
        var mensaje: String {
            switch codigo {
            case 401: return "Canvas no aceptó el token. Puede que haya vencido o lo hayas borrado."
            case 403: return "Canvas no permite esa consulta con tu cuenta."
            case 0: return "No pudimos conectar con Canvas. Revisa tu conexión."
            default: return "Canvas respondió con un error (\(codigo))."
            }
        }
    }

    static func pedir(_ ruta: String, _ items: [URLQueryItem], token: String,
                      permitida: (String) -> Bool = CanvasPolitica.rutaValida) async -> Result<Any, ErrorCanvas> {
        guard permitida(ruta) else { return .failure(ErrorCanvas(codigo: 0)) }
        guard var componentes = URLComponents(string: api + ruta) else { return .failure(ErrorCanvas(codigo: 0)) }
        if !items.isEmpty { componentes.queryItems = items }
        let config = URLSessionConfiguration.ephemeral
        config.urlCache = nil
        config.httpCookieStorage = nil
        config.httpShouldSetCookies = false
        let session = URLSession(configuration: config, delegate: CanvasSinRedirecciones(), delegateQueue: nil)
        defer { session.invalidateAndCancel() }
        var siguiente = componentes.url
        var leidos = 0
        var acumulado: [Any] = []
        var paginas = 0
        while let url = siguiente, paginas < CanvasPolitica.limitePaginas(ruta) {
            // Canvas manda la página siguiente completa; solo se sigue si es el mismo host.
            guard CanvasPolitica.urlValida(url, ruta: ruta, permitida: permitida), CanvasPolitica.paginaDocentesValida(url, ruta: ruta), CanvasPolitica.paginaAnunciosValida(url, ruta: ruta) else { return .failure(ErrorCanvas(codigo: 0)) }
            var pedido = URLRequest(url: url, timeoutInterval: 20)
            pedido.httpMethod = "GET"
            pedido.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
            pedido.setValue("application/json", forHTTPHeaderField: "Accept")
            guard let (bytes, respuesta) = try? await session.bytes(for: pedido),
                  let http = respuesta as? HTTPURLResponse else { return .failure(ErrorCanvas(codigo: 0)) }
            var datos = Data()
            do {
                for try await byte in bytes {
                    leidos += 1
                    if leidos > CanvasPolitica.bytesMax { bytes.task.cancel(); return .failure(ErrorCanvas(codigo: 0)) }
                    datos.append(byte)
                }
            } catch { return .failure(ErrorCanvas(codigo: 0)) }
            guard (200..<300).contains(http.statusCode) else { return .failure(ErrorCanvas(codigo: http.statusCode)) }
            guard let json = try? JSONSerialization.jsonObject(with: datos) else { return .failure(ErrorCanvas(codigo: 0)) }
            guard let lista = json as? [Any] else { return .success(json) }
            acumulado += lista
            paginas += 1
            siguiente = Self.paginaSiguiente(http.value(forHTTPHeaderField: "Link"))
        }
        return .success(acumulado)
    }

    static func paginaSiguiente(_ link: String?) -> URL? {
        guard let link else { return nil }
        for parte in link.components(separatedBy: ",") where parte.contains("rel=\"next\"") {
            if let inicio = parte.firstIndex(of: "<"), let fin = parte.firstIndex(of: ">"), inicio < fin {
                return URL(string: String(parte[parte.index(after: inicio)..<fin]))
            }
        }
        return nil
    }
}

// La descarga de un archivo: sigue la redirección de Canvas a su almacenamiento
// solo si es HTTPS a esos dominios, y siempre sin el token.
private final class CanvasDescarga: NSObject, URLSessionTaskDelegate {
    func urlSession(_ session: URLSession, task: URLSessionTask,
                    willPerformHTTPRedirection response: HTTPURLResponse,
                    newRequest request: URLRequest,
                    completionHandler: @escaping (URLRequest?) -> Void) {
        guard let url = request.url, CanvasPolitica.redireccionValida(url) else { completionHandler(nil); return }
        var siguiente = request
        siguiente.setValue(nil, forHTTPHeaderField: "Authorization")
        completionHandler(siguiente)
    }
}

// No se entrega Authorization a una redirección, ni siquiera dentro del host.
private final class CanvasSinRedirecciones: NSObject, URLSessionTaskDelegate {
    func urlSession(_ session: URLSession, task: URLSessionTask,
                    willPerformHTTPRedirection response: HTTPURLResponse,
                    newRequest request: URLRequest,
                    completionHandler: @escaping (URLRequest?) -> Void) { completionHandler(nil) }
}
