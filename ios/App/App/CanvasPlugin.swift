import Capacitor
import Foundation
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
    ]

    static let api = CanvasPolitica.api
    // Lo único que la app necesita leer: quién eres, tus cursos y sus tareas.
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
    static func guardarToken(_ token: String, cuenta: String) -> Bool {
        SecItemDelete(consulta(cuenta) as CFDictionary)
        var item = consulta(cuenta)
        item[kSecValueData as String] = Data(token.utf8)
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
    static func borrarToken(_ cuenta: String) { SecItemDelete(consulta(cuenta) as CFDictionary) }

    // ─── Métodos ─────────────────────────────────────────────────────────────
    private func cuenta(_ call: CAPPluginCall) -> String? {
        let cuenta = call.getString("cuenta") ?? ""
        guard CanvasPolitica.cuentaValida(cuenta) else { call.reject("Inicia sesión en GradeHub."); return nil }
        return cuenta.lowercased()
    }
    @objc func estado(_ call: CAPPluginCall) {
        guard let cuenta = cuenta(call) else { return }
        call.resolve(["conectado": Self.leerToken(cuenta) != nil])
    }

    // Revisa con Canvas que el token sirva antes de guardarlo.
    @objc func conectar(_ call: CAPPluginCall) {
        guard let cuenta = cuenta(call) else { return }
        let token = (call.getString("token") ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
        guard CanvasPolitica.tokenValido(token) else {
            call.reject("Eso no parece un token de Canvas.")
            return
        }
        Task {
            switch await Self.pedir("users/self", [], token: token) {
            case .success:
                if Self.guardarToken(token, cuenta: cuenta) { call.resolve(["conectado": true]) }
                else { call.reject("No pudimos guardar el token en el iPhone.") }
            case .failure(let error):
                call.reject(error.mensaje)
            }
        }
    }

    @objc func desconectar(_ call: CAPPluginCall) {
        guard let cuenta = cuenta(call) else { return }
        Self.borrarToken(cuenta)
        call.resolve(["conectado": false])
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
            call.reject("Conecta Canvas primero.")
            return
        }
        var items: [URLQueryItem] = []
        for (clave, valor) in call.getObject("params") ?? [:] {
            if let lista = valor as? [Any] { lista.forEach { items.append(URLQueryItem(name: clave, value: "\($0)")) } }
            else { items.append(URLQueryItem(name: clave, value: "\(valor)")) }
        }
        Task {
            switch await Self.pedir(ruta, items, token: token) {
            case .success(let datos):
                // #806 entiende el nombre del grupo. Se agrega acá sin cambiar
                // el contrato GET de la web ni traer calificaciones.
                if ruta.hasSuffix("/assignments"), let tareas = datos as? [[String: Any]] {
                    let gruposRuta = ruta.replacingOccurrences(of: "/assignments", with: "/assignment_groups")
                    var grupos: [[String: Any]] = []
                    switch await Self.pedir(gruposRuta, [URLQueryItem(name: "per_page", value: "100")], token: token) {
                    case .success(let datosGrupos): grupos = datosGrupos as? [[String: Any]] ?? []
                    case .failure(let error):
                        if error.codigo == 401 {
                            if Self.leerToken(cuenta) == token { Self.borrarToken(cuenta) }
                            call.reject(error.mensaje, String(error.codigo)); return
                        }
                    }
                    call.resolve(["data": CanvasPolitica.agregarGrupos(tareas, grupos: grupos)])
                } else { call.resolve(["data": datos]) }
            case .failure(let error):
                // Un token revocado o vencido no sirve más: se borra.
                if error.codigo == 401 && Self.leerToken(cuenta) == token { Self.borrarToken(cuenta) }
                call.reject(error.mensaje, String(error.codigo))
            }
        }
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

    static func pedir(_ ruta: String, _ items: [URLQueryItem], token: String) async -> Result<Any, ErrorCanvas> {
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
        while let url = siguiente, paginas < paginasMax {
            // Canvas manda la página siguiente completa; solo se sigue si es el mismo host.
            guard CanvasPolitica.urlValida(url, ruta: ruta) else { return .failure(ErrorCanvas(codigo: 0)) }
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

// No se entrega Authorization a una redirección, ni siquiera dentro del host.
private final class CanvasSinRedirecciones: NSObject, URLSessionTaskDelegate {
    func urlSession(_ session: URLSession, task: URLSessionTask,
                    willPerformHTTPRedirection response: HTTPURLResponse,
                    newRequest request: URLRequest,
                    completionHandler: @escaping (URLRequest?) -> Void) { completionHandler(nil) }
}
