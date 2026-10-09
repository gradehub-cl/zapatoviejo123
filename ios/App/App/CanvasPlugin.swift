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

    static let api = "https://cursos.canvas.uc.cl/api/v1/"
    // Lo único que la app necesita leer: quién eres, tus cursos y sus tareas.
    static let rutas = try! NSRegularExpression(pattern: "^(users/self|courses|courses/[0-9]{1,12}/assignments)$")
    static let formatoToken = try! NSRegularExpression(pattern: "^[0-9]{1,8}~[A-Za-z0-9]{20,100}$")
    static let paginasMax = 10

    // ─── Llavero ─────────────────────────────────────────────────────────────
    // Solo en este dispositivo y después del primer desbloqueo: no viaja a
    // iCloud ni a un respaldo que se restaure en otro teléfono.
    static let servicio = "cl.gradehub.canvas"
    static let cuenta = "token"

    static func consulta() -> [String: Any] {
        [kSecClass as String: kSecClassGenericPassword,
         kSecAttrService as String: servicio,
         kSecAttrAccount as String: cuenta]
    }
    static func guardarToken(_ token: String) -> Bool {
        SecItemDelete(consulta() as CFDictionary)
        var item = consulta()
        item[kSecValueData as String] = Data(token.utf8)
        item[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
        return SecItemAdd(item as CFDictionary, nil) == errSecSuccess
    }
    static func leerToken() -> String? {
        var q = consulta()
        q[kSecReturnData as String] = true
        q[kSecMatchLimit as String] = kSecMatchLimitOne
        var resultado: AnyObject?
        guard SecItemCopyMatching(q as CFDictionary, &resultado) == errSecSuccess,
              let datos = resultado as? Data else { return nil }
        return String(data: datos, encoding: .utf8)
    }
    static func borrarToken() { SecItemDelete(consulta() as CFDictionary) }

    static func coincide(_ re: NSRegularExpression, _ texto: String) -> Bool {
        re.firstMatch(in: texto, range: NSRange(texto.startIndex..., in: texto)) != nil
    }

    // ─── Métodos ─────────────────────────────────────────────────────────────
    @objc func estado(_ call: CAPPluginCall) {
        call.resolve(["conectado": Self.leerToken() != nil])
    }

    // Revisa con Canvas que el token sirva antes de guardarlo.
    @objc func conectar(_ call: CAPPluginCall) {
        let token = (call.getString("token") ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
        guard Self.coincide(Self.formatoToken, token) else {
            call.reject("Eso no parece un token de Canvas.")
            return
        }
        Task {
            switch await Self.pedir("users/self", [], token: token) {
            case .success:
                if Self.guardarToken(token) { call.resolve(["conectado": true]) }
                else { call.reject("No pudimos guardar el token en el iPhone.") }
            case .failure(let error):
                call.reject(error.mensaje)
            }
        }
    }

    @objc func desconectar(_ call: CAPPluginCall) {
        Self.borrarToken()
        call.resolve(["conectado": false])
    }

    // GET de solo lectura. `params` es un objeto: los arreglos se repiten
    // (`include[]=term`), como los pide Canvas.
    @objc func get(_ call: CAPPluginCall) {
        let ruta = call.getString("path") ?? ""
        guard Self.coincide(Self.rutas, ruta) else {
            call.reject("Esa consulta a Canvas no está permitida.")
            return
        }
        guard let token = Self.leerToken() else {
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
            case .success(let datos): call.resolve(["data": datos])
            case .failure(let error):
                // Un token revocado o vencido no sirve más: se borra.
                if error.codigo == 401 { Self.borrarToken() }
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
        var siguiente = componentes.url
        var acumulado: [Any] = []
        var paginas = 0
        while let url = siguiente, paginas < paginasMax {
            // Canvas manda la página siguiente completa; solo se sigue si es el mismo host.
            guard url.scheme == "https", url.host == "cursos.canvas.uc.cl" else { break }
            var pedido = URLRequest(url: url, timeoutInterval: 20)
            pedido.httpMethod = "GET"
            pedido.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
            pedido.setValue("application/json", forHTTPHeaderField: "Accept")
            guard let (datos, respuesta) = try? await URLSession.shared.data(for: pedido),
                  let http = respuesta as? HTTPURLResponse else { return .failure(ErrorCanvas(codigo: 0)) }
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
