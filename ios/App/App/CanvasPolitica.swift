import Foundation
import Compression

// Lista cerrada compartida por solicitudes iniciales y páginas siguientes.
// Cada ruta tiene también sus parámetros permitidos, con valores acotados, y
// cada respuesta se recorta a los campos que la app usa.
enum CanvasPolitica {
    static let host = "cursos.canvas.uc.cl"
    static let api = "https://cursos.canvas.uc.cl/api/v1/"
    static let paginasMax = 10
    static let bytesMax = 2 * 1024 * 1024
    static let contextosMax = 10
    // El programa llega como texto plano y con tope: nunca HTML a la web.
    static let programaMax = 60_000

    private static func calza(_ texto: String, _ patron: String) -> Bool {
        let match = texto.range(of: patron, options: .regularExpression)
        return match?.lowerBound == texto.startIndex && match?.upperBound == texto.endIndex
    }

    static func rutaValida(_ ruta: String) -> Bool {
        calza(ruta, "^(users/self|courses|calendar_events|courses/[0-9]{1,12}|courses/[0-9]{1,12}/(assignments|assignment_groups))$")
    }

    enum Tipo { case yo, cursos, tareas, grupos, eventos, programa }
    static func tipo(_ ruta: String) -> Tipo? {
        guard rutaValida(ruta) else { return nil }
        if ruta == "users/self" { return .yo }
        if ruta == "courses" { return .cursos }
        if ruta == "calendar_events" { return .eventos }
        if calza(ruta, "^courses/[0-9]{1,12}$") { return .programa }
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
            case (.programa, "include[]"): ok = v == "syllabus_body"
            case (.eventos, "start_date"), (.eventos, "end_date"): ok = calza(v, "^[0-9]{4}-[0-9]{2}-[0-9]{2}$")
            default: ok = false
            }
            if !ok { return false }
        }
        // Sin contexto, Canvas devolvería el calendario personal de la cuenta.
        if tipo == .eventos && (contextos == 0 || contextos > contextosMax) { return false }
        return true
    }

    static func urlValida(_ url: URL, ruta: String, permitida: (String) -> Bool = rutaValida) -> Bool {
        url.scheme == "https" && url.host == host && url.port == nil && url.user == nil && url.password == nil && url.fragment == nil && url.path == "/api/v1/" + ruta && permitida(ruta)
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

    // El programa del curso (syllabus_body) pasa a texto plano acá: la web no
    // recibe etiquetas, enlaces, imágenes ni scripts, solo líneas de texto. Las
    // celdas de una tabla quedan separadas por tabulación y los títulos con
    // «# » al inicio, para encontrar la sección de evaluación. `archivo` dice
    // si el programa enlaza un archivo de Canvas, que la app no lee.
    static func proyectarPrograma(_ curso: [String: Any]) -> [String: Any] {
        let html = curso["syllabus_body"] as? String ?? ""
        let archivo = html.range(of: "/files/[0-9]+|instructure_file_link", options: [.regularExpression, .caseInsensitive]) != nil
        let completo = textoPrograma(html)
        return ["texto": String(completo.prefix(programaMax)), "archivo": archivo, "recortado": completo.count > programaMax]
    }

    static func textoPrograma(_ html: String) -> String {
        var s = html
        func cambiar(_ patron: String, _ por: String) {
            s = s.replacingOccurrences(of: patron, with: por, options: [.regularExpression, .caseInsensitive])
        }
        cambiar("(?s)<!--.*?-->", " ")
        cambiar("(?s)<(script|style|noscript|iframe|svg)\\b.*?</\\1\\s*>", " ")
        cambiar("<h[1-6]\\b[^>]*>", "\n# ")
        cambiar("</h[1-6]\\s*>", "\n")
        cambiar("</t[dh]\\s*>", "\t")
        cambiar("<br\\s*/?>", "\n")
        cambiar("<li\\b[^>]*>", "\n")
        cambiar("</(p|div|li|tr|ul|ol|table|blockquote|pre|section)\\s*>", "\n")
        cambiar("<[^>]*>", " ")
        s = decodificarEntidades(s)
        cambiar("\r", "")
        cambiar("[ \u{00A0}\u{200B}]+", " ")
        cambiar(" *\t *", "\t")
        cambiar("\t{2,}", "\t")
        cambiar("[ \t]+\n", "\n")
        cambiar("\n[ \t]+", "\n")
        cambiar("\n{3,}", "\n\n")
        return s.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    private static func decodificarEntidades(_ texto: String) -> String {
        let nombres = ["nbsp": " ", "amp": "&", "quot": "\"", "apos": "'", "lt": "<", "gt": ">", "ndash": "–", "mdash": "—",
                       "aacute": "á", "eacute": "é", "iacute": "í", "oacute": "ó", "uacute": "ú", "ntilde": "ñ", "uuml": "ü",
                       "Aacute": "Á", "Eacute": "É", "Iacute": "Í", "Oacute": "Ó", "Uacute": "Ú", "Ntilde": "Ñ", "ordm": "º", "ordf": "ª"]
        guard let re = try? NSRegularExpression(pattern: "&(#[xX][0-9a-fA-F]{1,6}|#[0-9]{1,7}|[A-Za-z]{2,8});") else { return texto }
        var salida = texto
        for m in re.matches(in: texto, range: NSRange(texto.startIndex..., in: texto)).reversed() {
            guard let todo = Range(m.range, in: salida), let r = Range(m.range(at: 1), in: salida) else { continue }
            let e = String(salida[r])
            var valor: String?
            if e.hasPrefix("#x") || e.hasPrefix("#X") { valor = UInt32(e.dropFirst(2), radix: 16).flatMap(Unicode.Scalar.init).map { String(Character($0)) } }
            else if e.hasPrefix("#") { valor = UInt32(e.dropFirst()).flatMap(Unicode.Scalar.init).map { String(Character($0)) } }
            else { valor = nombres[e] }
            // Una entidad que vuelva a formar una etiqueta queda como texto: la
            // web lo escapa igual, pero acá ya no hay HTML que interpretar.
            if let valor { salida.replaceSubrange(todo, with: valor) }
        }
        return salida
    }

    // ─── Programa desde los archivos del curso (Lucas, 2026-11-17) ──────────
    // En la UC el programa casi nunca está en `syllabus_body`: es un PDF o un
    // Word entre los archivos o en un módulo «Programa». La web NO puede pedir
    // estas rutas con `get` (siguen fuera de `rutaValida`): solo los dos
    // métodos del plugin, que devuelven nombres y texto, nunca enlaces.
    static let archivoBytesMax = 15 * 1024 * 1024
    static let archivosMax = 300
    static func cursoValido(_ id: Int) -> Bool { (1...999_999_999_999).contains(id) }
    static func rutaArchivos(_ ruta: String) -> Bool {
        calza(ruta, "^courses/[0-9]{1,12}/(files|modules|files/[0-9]{1,12})$")
    }
    static func parametrosArchivos(_ ruta: String, _ items: [URLQueryItem]) -> Bool {
        items.allSatisfy { item in
            let v = item.value ?? ""
            switch item.name {
            case "per_page": return calza(v, "^[0-9]{1,3}$") && (1...100).contains(Int(v) ?? 0)
            case "include[]": return ruta.hasSuffix("/modules") && v == "items"
            default: return false
            }
        }
    }
    // Solo lo que se puede leer como texto. El tipo sale del content-type o,
    // en un ítem de módulo, de la extensión del nombre.
    static func tipoArchivo(nombre: String, contentType: String?) -> String? {
        let ct = (contentType ?? "").lowercased(), n = nombre.lowercased()
        if ct == "application/pdf" || n.hasSuffix(".pdf") { return "pdf" }
        if ct == "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || n.hasSuffix(".docx") { return "docx" }
        if ct == "text/plain" || n.hasSuffix(".txt") { return "txt" }
        return nil
    }
    // Nombres y tipos de los archivos del curso, sin enlaces ni rutas. Los de
    // un módulo dicen en qué módulo están: «Programa» pesa al elegir.
    static func proyectarArchivos(archivos: [[String: Any]], modulos: [[String: Any]]) -> [[String: Any]] {
        var porID: [Int: [String: Any]] = [:]
        var orden: [Int] = []
        func sumar(_ id: Int, _ nombre: String, _ tipo: String, _ tamano: Int?, _ modulo: String?) {
            guard cursoValido(id), porID.count < archivosMax else { return }
            var fila = porID[id] ?? ["id": id, "nombre": String(nombre.prefix(200)), "tipo": tipo]
            if let tamano { fila["tamano"] = tamano }
            if let modulo, fila["modulo"] == nil { fila["modulo"] = String(modulo.prefix(120)) }
            if porID[id] == nil { orden.append(id) }
            porID[id] = fila
        }
        for a in archivos {
            guard let id = a["id"] as? Int, let nombre = a["display_name"] as? String,
                  let tipo = tipoArchivo(nombre: nombre, contentType: a["content-type"] as? String) else { continue }
            sumar(id, nombre, tipo, a["size"] as? Int, nil)
        }
        for m in modulos {
            let modulo = m["name"] as? String
            for item in m["items"] as? [[String: Any]] ?? [] where (item["type"] as? String) == "File" {
                guard let id = item["content_id"] as? Int, let titulo = item["title"] as? String,
                      let tipo = tipoArchivo(nombre: titulo, contentType: nil) else { continue }
                sumar(id, titulo, tipo, nil, modulo)
            }
        }
        return orden.compactMap { porID[$0] }
    }
    // El enlace de descarga que da Canvas: el mismo host y /files/N/download.
    static func descargaValida(_ url: URL) -> Bool {
        url.scheme == "https" && url.host == host && url.port == nil && url.user == nil && url.password == nil
            && calza(url.path, "^(/courses/[0-9]{1,12})?/files/[0-9]{1,12}/download$")
    }
    // Canvas redirige el archivo a su almacenamiento. Se sigue solo a HTTPS de
    // esos dominios y sin el token (lo quita el delegado de la descarga).
    static func redireccionValida(_ url: URL) -> Bool {
        guard url.scheme == "https", url.user == nil, url.password == nil, let h = url.host?.lowercased() else { return false }
        return h == host || ["inscloudgate.net", "instructure.com", "amazonaws.com"].contains { h == $0 || h.hasSuffix("." + $0) }
    }
    static func recortarTexto(_ texto: String) -> [String: Any] {
        ["texto": String(texto.prefix(programaMax)), "recortado": texto.count > programaMax]
    }

    // Texto de un .docx: un ZIP con word/document.xml. Se lee el directorio
    // central, se descomprime solo ese archivo y sus párrafos y celdas pasan
    // por el mismo limpiador que el programa en HTML.
    static func textoDocx(_ datos: Data) -> String? {
        guard let xml = archivoZip(datos, nombre: "word/document.xml"), let crudo = String(data: xml, encoding: .utf8) else { return nil }
        var s = crudo
        func cambiar(_ patron: String, _ por: String) { s = s.replacingOccurrences(of: patron, with: por, options: .regularExpression) }
        cambiar("<w:tab\\s*/>", "\t")
        cambiar("<w:br\\s*/>", "<br>")
        // El último párrafo de una celda no corta la fila: «Control 1⇥20 %».
        cambiar("</w:p>(\\s*</w:tc>)", "$1")
        cambiar("</w:p>", "</p>")
        cambiar("</w:tc>", "</td>")
        cambiar("</w:tr>", "</tr>")
        return textoPrograma(s)
    }
    static func archivoZip(_ datos: Data, nombre: String) -> Data? {
        let b = [UInt8](datos)
        func u16(_ i: Int) -> Int { i + 1 < b.count ? Int(b[i]) | Int(b[i + 1]) << 8 : -1 }
        func u32(_ i: Int) -> Int { i + 3 < b.count ? Int(b[i]) | Int(b[i + 1]) << 8 | Int(b[i + 2]) << 16 | Int(b[i + 3]) << 24 : -1 }
        guard b.count >= 22 else { return nil }
        var fin = -1
        var i = b.count - 22
        while i >= max(0, b.count - 65_557) { if u32(i) == 0x06054b50 { fin = i; break }; i -= 1 }
        guard fin >= 0 else { return nil }
        let entradas = u16(fin + 10), inicio = u32(fin + 16)
        guard entradas > 0, entradas < 10_000, inicio >= 0, inicio < b.count else { return nil }
        var p = inicio
        for _ in 0..<entradas {
            guard u32(p) == 0x02014b50 else { return nil }
            let metodo = u16(p + 10), comprimido = u32(p + 20), real = u32(p + 24)
            let largo = u16(p + 28), extra = u16(p + 30), comentario = u16(p + 32), local = u32(p + 42)
            guard largo >= 0, p + 46 + largo <= b.count else { return nil }
            let n = String(decoding: b[(p + 46)..<(p + 46 + largo)], as: UTF8.self)
            if n == nombre {
                guard local >= 0, u32(local) == 0x04034b50 else { return nil }
                let desde = local + 30 + u16(local + 26) + u16(local + 28)
                guard comprimido >= 0, real > 0, real <= 20 * 1024 * 1024, desde + comprimido <= b.count else { return nil }
                let fuente = Array(b[desde..<(desde + comprimido)])
                if metodo == 0 { return Data(fuente) }
                guard metodo == 8 else { return nil }
                var destino = [UInt8](repeating: 0, count: real)
                let escritos = compression_decode_buffer(&destino, real, fuente, fuente.count, nil, COMPRESSION_ZLIB)
                return escritos > 0 ? Data(destino.prefix(escritos)) : nil
            }
            p += 46 + largo + extra + comentario
        }
        return nil
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
