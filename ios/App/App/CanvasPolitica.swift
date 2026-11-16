import Foundation

// Lista cerrada compartida por solicitudes iniciales y páginas siguientes.
enum CanvasPolitica {
    static let host = "cursos.canvas.uc.cl"
    static let api = "https://cursos.canvas.uc.cl/api/v1/"
    static let paginasMax = 10
    static let bytesMax = 2 * 1024 * 1024
    static func rutaValida(_ ruta: String) -> Bool {
        let match = ruta.range(of: "^(users/self|courses|courses/[0-9]{1,12}/(assignments|assignment_groups))$", options: .regularExpression)
        return match?.lowerBound == ruta.startIndex && match?.upperBound == ruta.endIndex
    }
    static func urlValida(_ url: URL, ruta: String) -> Bool {
        url.scheme == "https" && url.host == host && url.port == nil && url.user == nil && url.password == nil && url.fragment == nil && url.path == "/api/v1/" + ruta && rutaValida(ruta)
    }
    static func cuentaValida(_ cuenta: String) -> Bool { UUID(uuidString: cuenta) != nil }
    static func tokenValido(_ token: String) -> Bool {
        let match = token.range(of: "^[0-9]{1,8}~[A-Za-z0-9]{20,100}$", options: .regularExpression)
        return match?.lowerBound == token.startIndex && match?.upperBound == token.endIndex
    }
    static func agregarGrupos(_ tareas: [[String: Any]], grupos: [[String: Any]]) -> [[String: Any]] {
        var porID: [String: String] = [:]
        for grupo in grupos {
            if let id = grupo["id"], let nombre = grupo["name"] as? String { porID[String(describing: id)] = nombre }
        }
        return tareas.map { tarea in
            var fila = tarea.filter { ["id", "name", "due_at", "assignment_group_id"].contains($0.key) }
            if let id = tarea["assignment_group_id"], let nombre = porID[String(describing: id)] { fila["assignment_group"] = ["name": nombre] }
            return fila
        }
    }
}
