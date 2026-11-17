import Foundation

// El resumen que la app (con el motor de siempre, en JS) guarda en el App Group
// para los widgets y los atajos de Siri. Lo comparten la app y la extensión:
// solo se lee, nunca se calcula una nota acá. Cambiar el JSON es cambiar
// `resumenParaWidgets` en src/app/ios-widgets.js, no este archivo.

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
    // Una clase del horario (#641), ya calculada por la app con la hora de Chile
    // (resumenHorarioClases, la misma de Inicio). Sin notas.
    struct Clase: Decodable {
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
    }
    let ramos: [Ramo]
    let agenda: [Evaluacion]
    // Opcionales: un resumen guardado por una versión anterior de la app no los trae.
    let pendientes: [Pendiente]?
    let estadisticas: Estadisticas?
    let clasesProximas: [Tolerante<Clase>]?
}

// Un elemento mal formado se descarta solo, sin dejar a todos los widgets sin datos.
struct Tolerante<T: Decodable>: Decodable {
    let valor: T?
    init(from decoder: Decoder) throws { valor = try? T(from: decoder) }
}

enum Almacen {
    // Sale de Firma.xcconfig (vía Info.plist): con otra cuenta de Apple el grupo cambia.
    static let grupo = Bundle.main.object(forInfoDictionaryKey: "GradeHubAppGroup") as? String ?? "group.cl.gradehub.app"
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

// MARK: - Horario (#641)

// La app manda las clases de los próximos 7 días con su instante exacto
// (`inicioAt`/`finAt`, con el cambio de hora de Chile ya resuelto). El widget
// solo elige cuál mostrar según la hora de cada entrada: no arma el horario ni
// repite semanas. Si nadie abre la app en 7 días, pide abrirla.
enum Horario {
    static let conFraccion: ISO8601DateFormatter = {
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return f
    }()
    static let sinFraccion = ISO8601DateFormatter()
    static func instante(_ s: String) -> Date? { conFraccion.date(from: s) ?? sinFraccion.date(from: s) }

    static func todas(_ r: Resumen?) -> [Resumen.Clase] { (r?.clasesProximas ?? []).compactMap(\.valor) }
    // Las que todavía no terminan, en el orden de la app: la en curso va primero.
    static func vigentes(_ r: Resumen?, _ ahora: Date) -> [Resumen.Clase] {
        todas(r).filter { (instante($0.finAt) ?? .distantPast) > ahora }
    }
    // El fin exacto ya no es "en curso", igual que en Inicio.
    static func enCurso(_ c: Resumen.Clase, _ ahora: Date) -> Bool {
        guard let d = instante(c.inicioAt), let h = instante(c.finAt) else { return false }
        return d <= ahora && ahora < h
    }
    static let diasSemana = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"]
    // "Hoy", "Mañana" o el día ("Jueves"), en español aunque el iPhone no lo esté.
    static func dia(_ c: Resumen.Clase, _ ahora: Date) -> String {
        switch Fechas.diasHasta(c.fecha, desde: ahora) {
        case 0: return "Hoy"
        case 1: return "Mañana"
        default:
            guard let d = Fechas.dia(c.fecha) else { return c.fecha }
            return diasSemana[Calendar(identifier: .gregorian).component(.weekday, from: d) - 1]
        }
    }
    static func lugar(_ c: Resumen.Clase) -> String? {
        let partes = [c.sala.map { "Sala \($0)" }, c.tipo].compactMap { $0 }.filter { !$0.isEmpty }
        return partes.isEmpty ? nil : partes.joined(separator: " · ")
    }
    // El color vive en el ramo, no en la clase.
    static func color(_ r: Resumen?, _ c: Resumen.Clase) -> String? { r?.ramos.first { $0.id == c.ramoId }?.color }
}
