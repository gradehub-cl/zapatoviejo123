import Foundation

// Lista cerrada compartida por solicitudes iniciales y páginas siguientes.
// Cada ruta tiene también sus parámetros permitidos, con valores acotados, y
// cada respuesta se recorta a los campos que la app usa.
enum CanvasPolitica {
    static let host = "cursos.canvas.uc.cl"
    static let api = "https://cursos.canvas.uc.cl/api/v1/"
    static let paginasMax = 10
    static let bytesMax = 2 * 1024 * 1024
    static let contextosMax = 10

    private static func calza(_ texto: String, _ patron: String) -> Bool {
        let match = texto.range(of: patron, options: .regularExpression)
        return match?.lowerBound == texto.startIndex && match?.upperBound == texto.endIndex
    }

    static func rutaValida(_ ruta: String) -> Bool {
        calza(ruta, "^(users/self|courses|calendar_events|courses/[0-9]{1,12}/(assignments|assignment_groups))$")
    }

    enum Tipo { case yo, cursos, tareas, grupos, eventos }
    static func tipo(_ ruta: String) -> Tipo? {
        guard rutaValida(ruta) else { return nil }
        if ruta == "users/self" { return .yo }
        if ruta == "courses" { return .cursos }
        if ruta == "calendar_events" { return .eventos }
        return ruta.hasSuffix("/assignments") ? .tareas : .grupos
    }

    // Qué puede pedir la web en cada ruta. `context_codes[]` solo acepta
    // cursos: nunca el calendario personal ni el de un grupo o de otra persona.
    static func parametrosValidos(_ ruta: String, _ items: [URLQueryItem]) -> Bool {
        guard let tipo = tipo(ruta) else { return false }
        var contextos = 0
        for item in items {
            let v = item.value ?? ""
            let ok: Bool
            switch (tipo, item.name) {
            case (_, "per_page"): ok = calza(v, "^[0-9]{1,3}$") && (1...100).contains(Int(v) ?? 0)
            case (.cursos, "enrollment_state"): ok = v == "active"
            case (.cursos, "include[]"): ok = v == "term"
            case (.tareas, "include[]"): ok = v == "submission"
            case (.tareas, "bucket"): ok = ["future", "past", "upcoming", "undated"].contains(v)
            case (.tareas, "order_by"): ok = ["due_at", "position", "name"].contains(v)
            case (.eventos, "context_codes[]"): contextos += 1; ok = calza(v, "^course_[0-9]{1,12}$")
            case (.eventos, "type"): ok = v == "event"
            case (.eventos, "start_date"), (.eventos, "end_date"): ok = calza(v, "^[0-9]{4}-[0-9]{2}-[0-9]{2}$")
            default: ok = false
            }
            if !ok { return false }
        }
        // Sin contexto, Canvas devolvería el calendario personal de la cuenta.
        if tipo == .eventos && (contextos == 0 || contextos > contextosMax) { return false }
        return true
    }

    static func urlValida(_ url: URL, ruta: String) -> Bool {
        url.scheme == "https" && url.host == host && url.port == nil && url.user == nil && url.password == nil && url.fragment == nil && url.path == "/api/v1/" + ruta && rutaValida(ruta)
    }
    static func cuentaValida(_ cuenta: String) -> Bool { UUID(uuidString: cuenta) != nil }
    static func tokenValido(_ token: String) -> Bool { calza(token, "^[0-9]{1,8}~[A-Za-z0-9]{20,100}$") }

    private static func solo(_ fila: [String: Any], _ campos: [String]) -> [String: Any] {
        fila.filter { campos.contains($0.key) && !($0.value is NSNull) }
    }

    static func proyectarCursos(_ cursos: [[String: Any]]) -> [[String: Any]] {
        cursos.map { curso in
            var fila = solo(curso, ["id", "name", "course_code", "apply_assignment_group_weights"])
            if let term = curso["term"] as? [String: Any], let nombre = term["name"] as? String { fila["term"] = ["name": nombre] }
            return fila
        }
    }

    static func proyectarGrupos(_ grupos: [[String: Any]]) -> [[String: Any]] {
        grupos.map { solo($0, ["id", "name", "group_weight"]) }
    }

    // Solo eventos de cursos (las tareas llegan por su ruta) y sin
    // descripción, lugar ni enlaces: título, inicio, fin y si dura el día.
    static func proyectarEventos(_ eventos: [[String: Any]]) -> [[String: Any]] {
        eventos.filter { ($0["type"] as? String ?? "event") == "event" && (($0["context_code"] as? String)?.hasPrefix("course_") ?? false) }
            .map { solo($0, ["id", "title", "start_at", "end_at", "all_day", "context_code"]) }
    }

    // La nota propia que Canvas ya publicó, cuando la web la pide. Sin
    // comentarios, archivos, rúbricas ni intentos: solo puntaje y calificación.
    static func proyectarEntrega(_ entrega: [String: Any]) -> [String: Any] {
        solo(entrega, ["score", "grade", "excused", "workflow_state"])
    }

    static func agregarGrupos(_ tareas: [[String: Any]], grupos: [[String: Any]]) -> [[String: Any]] {
        var porID: [String: String] = [:]
        for grupo in grupos {
            if let id = grupo["id"], let nombre = grupo["name"] as? String { porID[String(describing: id)] = nombre }
        }
        return tareas.map { tarea in
            var fila = solo(tarea, ["id", "name", "due_at", "assignment_group_id", "points_possible", "grading_type"])
            if let id = tarea["assignment_group_id"], let nombre = porID[String(describing: id)] { fila["assignment_group"] = ["name": nombre] }
            if let entrega = tarea["submission"] as? [String: Any] { fila["submission"] = proyectarEntrega(entrega) }
            return fila
        }
    }
}
