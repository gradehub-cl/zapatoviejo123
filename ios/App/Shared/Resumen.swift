import Foundation

// El resumen que la app (con el motor de siempre, en JS) guarda en el App Group,
// y cómo se lee. Lo compilan la app (atajos de Siri, Atajos.swift) y la
// extensión de widgets, para que los dos digan siempre lo mismo. Acá no se
// calcula ninguna nota. Cambiar el JSON es cambiar src/app/ios-widgets.js.

// MARK: - Datos

struct Resumen: Decodable {
    struct Promedio: Decodable { let oficial: Double; let nivel: String }
    struct Ramo: Decodable { let id: String; let nombre: String; let color: String?; let promedio: Double?; let nivel: String? }
    struct Evaluacion: Decodable {
        let ramoId: String
        let ramo: String
        let sigla: String?
        let color: String?
        let evaluacion: String
        let fecha: String
        let hora: String?
        let necesitas: String?
        let margen: Bool?
        let inalcanzable: Bool?
        // Porcentaje del ramo que define (0–100); nil si no es fijo.
        let parte: Double?
    }
    let version: Int
    let actualizado: String
    let promedio: Promedio?
    // Lo que hay que hacer (#639): recorregir, sin nota o sin fecha. Lo de hoy
    // o mañana no viene: sale de `agenda`, que el widget mira con la hora real.
    struct Pendiente: Decodable {
        let tipo: String
        let ramoId: String
        let ramo: String
        let sigla: String?
        let color: String?
        let evaluacion: String
        let fecha: String?
        var hora: String? = nil
    }
    // Las cifras de Estadísticas, ya escritas como en la app.
    struct Estadisticas: Decodable {
        struct Rango: Decodable { let piso: String; let techo: String; let nivelPiso: String; let nivelTecho: String }
        struct Exigente: Decodable { let ramoId: String; let ramo: String; let color: String?; let necesitas: String? }
        let avance: Int
        let rango: Rango?
        let exigente: Exigente?
    }
    let ramos: [Ramo]
    let agenda: [Evaluacion]
    // Opcionales: un resumen guardado por una versión anterior de la app no los trae.
    let pendientes: [Pendiente]?
    let estadisticas: Estadisticas?
    // Una clase con su fecha: contrato «Próxima clase» de docs/guia/ios.md. Las
    // horas `inicio`/`fin` son de Chile y se muestran tal cual; `inicioAt` y
    // `finAt` son los instantes reales, y con ellos se arma la línea de tiempo.
    struct Clase: Decodable {
        let id: String
        let ramoId: String
        let ramo: String
        let sigla: String?
        let fecha: String
        let inicio: String
        let fin: String
        let inicioAt: String
        let finAt: String
        let sala: String?
        let tipo: String?
        let enlace: String?
    }
    // Nunca falla: una clase mal escrita se salta y no bota el resumen entero,
    // que es el mismo que leen los otros cuatro widgets.
    struct ListaClases: Decodable {
        private struct Suelta: Decodable {
            let clase: Clase?
            init(from decoder: Decoder) throws { clase = try? Clase(from: decoder) }
        }
        let lista: [Clase]
        init(from decoder: Decoder) throws {
            lista = ((try? decoder.singleValueContainer().decode([Suelta].self)) ?? []).compactMap(\.clase)
        }
    }
    let fechaHoy: String?
    let clasesProximas: ListaClases?
}

enum Almacen {
    // Sale de Firma.xcconfig (vía Info.plist): con otra cuenta de Apple el grupo cambia.
    static let grupo = Bundle.main.object(forInfoDictionaryKey: "GradeHubAppGroup") as? String ?? "group.cl.gradehub.app.shared"
    static let clave = "resumen.v1"
    static func leer() -> Resumen? {
        guard let texto = UserDefaults(suiteName: grupo)?.string(forKey: clave),
              let datos = texto.data(using: .utf8),
              let resumen = try? JSONDecoder().decode(Resumen.self, from: datos),
              resumen.version == 1 else { return nil }
        return resumen
    }
}

// MARK: - Fechas

enum Fechas {
    static let iso: DateFormatter = {
        let f = DateFormatter()
        f.calendar = Calendar(identifier: .gregorian)
        f.locale = Locale(identifier: "en_US_POSIX")
        f.timeZone = .current
        f.dateFormat = "yyyy-MM-dd"
        return f
    }()
    static func dia(_ texto: String) -> Date? { iso.date(from: texto) }
    static func diasHasta(_ texto: String, desde ahora: Date) -> Int? {
        guard let d = dia(texto) else { return nil }
        let cal = Calendar.current
        return cal.dateComponents([.day], from: cal.startOfDay(for: ahora), to: cal.startOfDay(for: d)).day
    }
    static func cuando(_ e: Resumen.Evaluacion, desde ahora: Date) -> String {
        cuando(fecha: e.fecha, hora: e.hora, desde: ahora)
    }
    static func cuando(fecha: String, hora h: String?, desde ahora: Date) -> String {
        guard let n = diasHasta(fecha, desde: ahora) else { return fecha }
        let hora = h.map { " · \($0)" } ?? ""
        switch n {
        case 0: return "Hoy" + hora
        case 1: return "Mañana" + hora
        default: return "En \(n) días"
        }
    }
    // "jue 8 oct", en español, sin depender del idioma del iPhone.
    static func corta(_ texto: String) -> String {
        guard let d = dia(texto) else { return texto }
        let c = Calendar(identifier: .gregorian).dateComponents([.weekday, .day, .month], from: d)
        let dias = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"]
        let meses = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sept", "oct", "nov", "dic"]
        return "\(dias[(c.weekday ?? 1) - 1]) \(c.day ?? 0) \(meses[(c.month ?? 1) - 1])"
    }
    // La próxima evaluación que todavía no pasa, vista desde la fecha de la entrada.
    static func proxima(_ r: Resumen?, desde ahora: Date) -> Resumen.Evaluacion? {
        r?.agenda.first { (diasHasta($0.fecha, desde: ahora) ?? -1) >= 0 }
    }
}

func enlaceRamo(_ id: String) -> URL {
    URL(string: "cl.gradehub.app://ramo/\(id)") ?? URL(string: "cl.gradehub.app://inicio")!
}

// Las notas llegan de la app como dato («3.7»); en pantalla van con coma.
enum Nota {
    static func coma(_ s: String) -> String { s.replacingOccurrences(of: ".", with: ",") }
}

// MARK: - Próxima clase (#641)

// Qué clase toca según la hora: es lo único que decide el widget. Las clases ya
// vienen con su fecha y sus instantes desde la app (`clasesProximas`), así que
// acá no se interpreta ninguna hora con la zona del teléfono.
enum Clases {
    static let zona = TimeZone(identifier: "America/Santiago") ?? .current
    static let cal: Calendar = {
        var c = Calendar(identifier: .gregorian)
        c.timeZone = zona
        return c
    }()
    static let instante: ISO8601DateFormatter = {
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return f
    }()
    static let dia: DateFormatter = {
        let f = DateFormatter()
        f.calendar = cal
        f.locale = Locale(identifier: "en_US_POSIX")
        f.timeZone = zona
        f.dateFormat = "yyyy-MM-dd"
        return f
    }()
    static let nombres = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"]

    struct Ocurrencia {
        let clase: Resumen.Clase
        let inicio: Date
        let fin: Date
    }

    static func todas(_ r: Resumen?) -> [Ocurrencia] {
        (r?.clasesProximas?.lista ?? []).compactMap { c in
            guard let i = instante.date(from: c.inicioAt), let f = instante.date(from: c.finAt), f > i else { return nil }
            return Ocurrencia(clase: c, inicio: i, fin: f)
        }
    }
    // Las que no han terminado, en el orden de la app: la que está en curso va primero.
    static func vigentes(_ r: Resumen?, desde ahora: Date) -> [Ocurrencia] { todas(r).filter { $0.fin > ahora } }
    static func enCurso(_ o: Ocurrencia, _ ahora: Date) -> Bool { o.inicio <= ahora }

    // La app manda las clases de hoy y los siete días siguientes. Pasado eso el
    // widget no sabe qué viene: lo dice y pide abrir la app, en vez de repetir
    // la misma semana para siempre.
    static func horizonte(_ r: Resumen?) -> Date? {
        guard let hoy = r?.fechaHoy.flatMap({ dia.date(from: $0) }) else { return nil }
        return cal.date(byAdding: .day, value: 8, to: hoy)
    }
    static func vencido(_ r: Resumen?, _ ahora: Date) -> Bool { horizonte(r).map { ahora >= $0 } ?? false }

    // "Ahora", "Hoy", "Mañana" o el día de la semana, con el calendario de Chile.
    static func cuando(_ o: Ocurrencia, _ ahora: Date) -> String {
        if enCurso(o, ahora) { return "Ahora" }
        guard let d = dia.date(from: o.clase.fecha),
              let n = cal.dateComponents([.day], from: cal.startOfDay(for: ahora), to: d).day else { return o.clase.fecha }
        switch n {
        case 0: return "Hoy"
        case 1: return "Mañana"
        default: return nombres[cal.component(.weekday, from: d) - 1]
        }
    }
    static func hora(_ o: Ocurrencia, _ ahora: Date) -> String {
        enCurso(o, ahora) ? "hasta las \(o.clase.fin)" : o.clase.inicio
    }
    // "Sala K201 · CLAS". El tipo es texto libre de cada universidad: va tal cual.
    static func lugar(_ c: Resumen.Clase) -> String? {
        let partes = [c.sala.map { "Sala \($0)" }, c.tipo].compactMap { $0 }.filter { !$0.isEmpty }
        return partes.isEmpty ? nil : partes.joined(separator: " · ")
    }
    static func enlace(_ c: Resumen.Clase) -> URL { c.enlace.flatMap { URL(string: $0) } ?? enlaceRamo(c.ramoId) }
    // El color no viaja con la clase: es el de su ramo.
    static func color(_ c: Resumen.Clase, _ r: Resumen?) -> String? { r?.ramos.first { $0.id == c.ramoId }?.color }
}
