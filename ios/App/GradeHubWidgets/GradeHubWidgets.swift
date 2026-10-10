import ActivityKit
import AppIntents
import SwiftUI
import WidgetKit

// Widgets de GradeHub (#634–#638, #641). Solo muestran el resumen que calculó
// la app con el motor de siempre: acá no se calcula ninguna nota. Lo único que
// depende de la hora ("hoy", "en 3 días") se resuelve en el widget.

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
    // Una clase del horario (#640). `dia`: 1 = lunes … 6 = sábado; horas "H:MM" de Chile.
    struct Clase: Decodable {
        let dia: Int
        let inicio: String
        let fin: String
        let sala: String?
        let tipo: String?
        let ramoId: String
        let ramo: String
        let sigla: String?
        let color: String?
    }
    let ramos: [Ramo]
    let agenda: [Evaluacion]
    // Opcionales: un resumen guardado por una versión anterior de la app no los trae.
    let pendientes: [Pendiente]?
    let estadisticas: Estadisticas?
    let horario: [Clase]?
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

func enlaceRamo(_ id: String) -> URL {
    URL(string: "cl.gradehub.app://ramo/\(id)") ?? URL(string: "cl.gradehub.app://inicio")!
}

// MARK: - Línea de tiempo

struct Entrada: TimelineEntry {
    let date: Date
    let resumen: Resumen?
}

struct Proveedor: TimelineProvider {
    func placeholder(in context: Context) -> Entrada { Entrada(date: .now, resumen: nil) }
    func getSnapshot(in context: Context, completion: @escaping (Entrada) -> Void) {
        completion(Entrada(date: .now, resumen: Almacen.leer()))
    }
    func getTimeline(in context: Context, completion: @escaping (Timeline<Entrada>) -> Void) {
        let resumen = Almacen.leer()
        let cal = Calendar.current
        let ahora = Date()
        // Una entrada más a medianoche: "mañana" pasa a "hoy" sin abrir la app.
        let manana = cal.startOfDay(for: cal.date(byAdding: .day, value: 1, to: ahora) ?? ahora)
        completion(Timeline(entries: [Entrada(date: ahora, resumen: resumen), Entrada(date: manana, resumen: resumen)],
                            policy: .after(manana)))
    }
}

// MARK: - Colores

extension Color {
    // "#RRGGBB" del ramo. Sin color válido, gris.
    init(hexRamo: String?) {
        let limpio = (hexRamo ?? "").trimmingCharacters(in: CharacterSet(charactersIn: "#"))
        guard limpio.count == 6, let v = UInt64(limpio, radix: 16) else { self = .gray; return }
        self = Color(red: Double((v >> 16) & 0xFF) / 255, green: Double((v >> 8) & 0xFF) / 255, blue: Double(v & 0xFF) / 255)
    }
}

// El semáforo es semántico y no se tiñe por tema (AGENTS.md): los mismos tonos
// de SEMAFORO en data.js, claro y oscuro.
struct Semaforo {
    static func color(_ nivel: String?, _ esquema: ColorScheme) -> Color {
        let oscuro = esquema == .dark
        switch nivel {
        case "good": return Color(hexRamo: oscuro ? "#2ecc40" : "#0f766e")
        case "warn": return Color(hexRamo: oscuro ? "#ffc94d" : "#96590a")
        case "bad": return Color(hexRamo: oscuro ? "#ff5f7a" : "#c02b3f")
        default: return .secondary
        }
    }
}

// Una fila con la línea lateral del ramo, como en Inicio. Abre su ramo.
struct Fila<Valor: View>: View {
    let ramoId: String
    let color: String?
    let titulo: String
    let detalle: String?
    @ViewBuilder var valor: Valor
    var body: some View {
        Link(destination: enlaceRamo(ramoId)) {
            HStack(spacing: 8) {
                RoundedRectangle(cornerRadius: 1.5).fill(Color(hexRamo: color)).frame(width: 3)
                VStack(alignment: .leading, spacing: 0) {
                    Text(titulo).font(.subheadline.weight(.semibold)).lineLimit(1).minimumScaleFactor(0.75)
                    if let detalle {
                        Text(detalle).font(.caption).foregroundStyle(.secondary).lineLimit(1).minimumScaleFactor(0.8)
                    }
                }
                Spacer(minLength: 4)
                valor
            }
            .fixedSize(horizontal: false, vertical: true)
        }
    }
}

extension Fila where Valor == EmptyView {
    init(ramoId: String, color: String?, titulo: String, detalle: String?) {
        self.init(ramoId: ramoId, color: color, titulo: titulo, detalle: detalle) { EmptyView() }
    }
}

// MARK: - Próxima evaluación

// Cuánto del ramo define la evaluación, como un anillo que se llena: se lee de
// un vistazo y no compite con el texto. Neutro: no es el color del ramo ni el
// semáforo, que hablan de otra cosa.
struct ParteDelRamo: View {
    let porcentaje: Double
    var body: some View {
        HStack(spacing: 6) {
            ZStack {
                Circle().stroke(.quaternary, lineWidth: 3)
                Circle().trim(from: 0, to: min(max(porcentaje, 0), 100) / 100)
                    .stroke(.primary, style: StrokeStyle(lineWidth: 3, lineCap: .round))
                    .rotationEffect(.degrees(-90))
            }
            .frame(width: 16, height: 16)
            Text("\(Int(porcentaje.rounded()))% del ramo").font(.caption.weight(.semibold)).monospacedDigit().lineLimit(1)
        }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("Vale el \(Int(porcentaje.rounded())) por ciento del ramo")
    }
}

struct ProximaVista: View {
    @Environment(\.widgetFamily) var familia
    let entrada: Entrada

    var body: some View {
        let e = Fechas.proxima(entrada.resumen, desde: entrada.date)
        Group {
            switch familia {
            case .accessoryInline:
                if let e { Text("\(e.sigla ?? e.ramo) · \(Fechas.cuando(e, desde: entrada.date))") } else { Text("Sin evaluaciones próximas") }
            case .accessoryRectangular:
                if let e {
                    VStack(alignment: .leading, spacing: 1) {
                        Text(Fechas.cuando(e, desde: entrada.date)).font(.headline).widgetAccentable()
                        Text(e.evaluacion).font(.subheadline).lineLimit(1)
                        Text(e.ramo).font(.caption).foregroundStyle(.secondary).lineLimit(1)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                } else {
                    Text(entrada.resumen == nil ? "Abre GradeHub" : "Sin evaluaciones próximas").font(.subheadline)
                }
            case .systemMedium:
                if let e { mediano(e) } else { vacio }
            case .systemLarge:
                if let e { grande(e) } else { vacio }
            default:
                if let e { tarjeta(e) } else { vacio }
            }
        }
        .widgetURL(e.map { enlaceRamo($0.ramoId) } ?? URL(string: "cl.gradehub.app://agenda"))
    }

    // Las que vienen después de la próxima, en orden.
    func despues(_ cuantas: Int) -> [Resumen.Evaluacion] {
        Array((entrada.resumen?.agenda ?? [])
            .filter { (Fechas.diasHasta($0.fecha, desde: entrada.date) ?? -1) >= 0 }
            .dropFirst().prefix(cuantas))
    }

    func filaDespues(_ d: Resumen.Evaluacion) -> some View {
        Fila(ramoId: d.ramoId, color: d.color, titulo: d.evaluacion, detalle: "\(d.sigla ?? d.ramo) · \(Fechas.cuando(d, desde: entrada.date))")
    }

    func tarjeta(_ e: Resumen.Evaluacion) -> some View {
        HStack(alignment: .top, spacing: 8) {
            // El color del ramo vive en su línea lateral, como en Inicio.
            Rectangle().fill(Color(hexRamo: e.color)).frame(width: 3)
            // 0.5 s: qué viene arriba y, grande abajo, cuánto falta. Sin rótulo:
            // una evaluación con fecha ya dice que es la próxima.
            VStack(alignment: .leading, spacing: 2) {
                // Primero qué es; después cuánto falta (pedido de Lucas, 2026-10-07).
                // Una línea: se achica antes que partirse ("Interrogación / 2").
                Text(e.evaluacion).font(.headline).lineLimit(1).minimumScaleFactor(0.6)
                Text(e.sigla ?? e.ramo).font(.caption).foregroundStyle(.secondary).lineLimit(1)
                if let p = e.parte { ParteDelRamo(porcentaje: p).padding(.top, 6) }
                Text(Fechas.cuando(e, desde: entrada.date)).font(.headline).lineLimit(1).minimumScaleFactor(0.7)
                    .padding(.top, 6)
                Text(Fechas.corta(e.fecha)).font(.caption).foregroundStyle(.secondary)
                // Todo en un bloque, sin huecos al medio: el aire queda abajo.
                // Lo que necesitas en ESTA evaluación para ir con 4 después de
                // rendirla (lo calcula la app; ver notaParaIrConCuatro).
                Group {
                    if let n = e.necesitas {
                        HStack(alignment: .firstTextBaseline, spacing: 4) {
                            Text("Necesitas").font(.caption).foregroundStyle(.secondary)
                            Text(n).font(.subheadline.weight(.bold)).monospacedDigit()
                        }
                    } else if e.inalcanzable == true {
                        Text("Sola no alcanza para el 4").font(.caption)
                    } else if e.margen == true {
                        Text("Sigues con 4 aunque te vaya mal").font(.caption).lineLimit(1).minimumScaleFactor(0.8)
                    }
                }
                .padding(.top, 8)
                .privacySensitive()
            }
            Spacer(minLength: 0)
        }
    }

    // 0.5 s: la próxima a la izquierda, igual que el chico; a la derecha, en
    // fila, lo que viene después. Cada fila abre su ramo.
    func mediano(_ e: Resumen.Evaluacion) -> some View {
        // `proxima` es la primera que no ha pasado; después vienen las siguientes.
        let despues = despues(3)
        return HStack(alignment: .top, spacing: 16) {
            tarjeta(e).frame(maxWidth: .infinity, alignment: .leading)
            VStack(alignment: .leading, spacing: 10) {
                Text("Después").font(.caption).foregroundStyle(.secondary)
                if despues.isEmpty {
                    Text("Nada más por ahora").font(.subheadline).foregroundStyle(.secondary)
                }
                ForEach(Array(despues.enumerated()), id: \.offset) { _, d in filaDespues(d) }
                Spacer(minLength: 0)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
    }

    // Grande (#635): la próxima completa y, debajo, las cuatro que siguen.
    func grande(_ e: Resumen.Evaluacion) -> some View {
        let despues = despues(4)
        return VStack(alignment: .leading, spacing: 10) {
            tarjeta(e).fixedSize(horizontal: false, vertical: true)
            Divider()
            Text("Después").font(.caption).foregroundStyle(.secondary)
            if despues.isEmpty {
                Text("Nada más por ahora").font(.subheadline).foregroundStyle(.secondary)
            }
            ForEach(Array(despues.enumerated()), id: \.offset) { _, d in filaDespues(d) }
            Spacer(minLength: 0)
        }
    }

    var vacio: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text("PRÓXIMA").font(.caption2.weight(.semibold)).foregroundStyle(.secondary)
            Spacer(minLength: 0)
            Text(entrada.resumen == nil ? "Abre GradeHub para ver tus evaluaciones" : "Nada por venir").font(.subheadline)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

struct ProximaEvaluacionWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "proxima-evaluacion", provider: Proveedor()) { entrada in
            ProximaVista(entrada: entrada).containerBackground(.background, for: .widget)
        }
        .configurationDisplayName("Próxima evaluación")
        .description("Lo que viene y qué nota necesitas.")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge, .accessoryRectangular, .accessoryInline])
    }
}

// MARK: - Promedio general

struct PromedioVista: View {
    @Environment(\.colorScheme) var esquema
    @Environment(\.widgetFamily) var familia
    let entrada: Entrada

    var body: some View {
        Group {
            switch familia {
            // Mediano y grande (#637): el promedio y, al lado o debajo, los ramos.
            case .systemMedium:
                HStack(alignment: .top, spacing: 16) {
                    general.frame(maxWidth: .infinity, alignment: .leading)
                    lista(4).frame(maxWidth: .infinity, alignment: .leading)
                }
            case .systemLarge:
                VStack(alignment: .leading, spacing: 12) {
                    general.frame(height: 110)
                    Divider()
                    lista(8)
                }
            default:
                general
            }
        }
        .widgetURL(URL(string: "cl.gradehub.app://inicio"))
    }

    func lista(_ cuantos: Int) -> some View {
        let ramos = entrada.resumen?.ramos ?? []
        return VStack(alignment: .leading, spacing: 10) {
            ForEach(Array(ramos.prefix(cuantos).enumerated()), id: \.offset) { _, r in
                Fila(ramoId: r.id, color: r.color, titulo: r.nombre, detalle: nil) {
                    Text(r.promedio.map { String(format: "%.1f", $0) } ?? "—")
                        .font(.subheadline.weight(.semibold)).monospacedDigit()
                        .foregroundStyle(Semaforo.color(r.nivel, esquema))
                        .privacySensitive()
                }
            }
            if ramos.count > cuantos {
                Text("y \(ramos.count - cuantos) más").font(.caption).foregroundStyle(.secondary)
            }
            Spacer(minLength: 0)
        }
    }

    var general: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text("PROMEDIO GENERAL").font(.caption2.weight(.semibold)).foregroundStyle(.secondary)
            Spacer(minLength: 0)
            if let p = entrada.resumen?.promedio {
                Text(String(format: "%.1f", p.oficial))
                    .font(.system(size: 44, weight: .medium)).monospacedDigit()
                    .foregroundStyle(Semaforo.color(p.nivel, esquema))
                    .privacySensitive()
                Text(conteo).font(.caption).foregroundStyle(.secondary).lineLimit(1)
            } else {
                Text(entrada.resumen == nil ? "Abre GradeHub" : "Sin notas todavía").font(.subheadline)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    var conteo: String {
        let ramos = entrada.resumen?.ramos.filter { $0.promedio != nil } ?? []
        let aprobados = ramos.filter { $0.nivel == "good" || $0.nivel == "warn" }.count
        let riesgo = ramos.filter { $0.nivel == "bad" }.count
        return riesgo > 0 ? "\(aprobados) aprobando · \(riesgo) en riesgo" : "\(aprobados) aprobando"
    }
}

struct PromedioGeneralWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "promedio-general", provider: Proveedor()) { entrada in
            PromedioVista(entrada: entrada).containerBackground(.background, for: .widget)
        }
        .configurationDisplayName("Promedio general")
        .description("Tu promedio con su semáforo y cómo va cada ramo.")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
    }
}

// MARK: - Pendientes (#636)

enum Tareas {
    // Hoy y mañana salen de la agenda, mirada con la fecha de la entrada; el
    // resto (recorregir, sin nota, sin fecha) ya viene ordenado desde la app.
    // ponytail: lo de ayer sin nota aparece recién cuando se abre la app.
    static func lista(_ r: Resumen?, desde ahora: Date) -> [Resumen.Pendiente] {
        guard let r else { return [] }
        let pronto = r.agenda.filter { (0...1).contains(Fechas.diasHasta($0.fecha, desde: ahora) ?? -1) }.map {
            Resumen.Pendiente(tipo: "hoy", ramoId: $0.ramoId, ramo: $0.ramo, sigla: $0.sigla, color: $0.color,
                              evaluacion: $0.evaluacion, fecha: $0.fecha, hora: $0.hora)
        }
        return pronto + (r.pendientes ?? [])
    }
    static func texto(_ p: Resumen.Pendiente, desde ahora: Date) -> String {
        switch p.tipo {
        case "hoy": return Fechas.cuando(fecha: p.fecha ?? "", hora: p.hora, desde: ahora)
        case "recorregir": return p.fecha.map { "Recorregir hasta el \(Fechas.corta($0))" } ?? "Mandar a recorregir"
        case "sin-nota": return "Falta la nota"
        default: return "Falta la fecha"
        }
    }
}

struct PendientesVista: View {
    @Environment(\.widgetFamily) var familia
    let entrada: Entrada

    var body: some View {
        let lista = Tareas.lista(entrada.resumen, desde: entrada.date)
        let vacio = entrada.resumen == nil ? "Abre GradeHub" : "Nada pendiente"
        Group {
            switch familia {
            case .accessoryInline:
                if let p = lista.first { Text("\(p.sigla ?? p.ramo) · \(Tareas.texto(p, desde: entrada.date))") } else { Text(vacio) }
            case .accessoryRectangular:
                if let p = lista.first {
                    VStack(alignment: .leading, spacing: 1) {
                        Text(Tareas.texto(p, desde: entrada.date)).font(.headline).widgetAccentable().lineLimit(1)
                        Text(p.evaluacion).font(.subheadline).lineLimit(1)
                        Text(lista.count > 1 ? "\(p.sigla ?? p.ramo) · y \(lista.count - 1) más" : p.sigla ?? p.ramo)
                            .font(.caption).foregroundStyle(.secondary).lineLimit(1)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                } else {
                    Text(vacio).font(.subheadline)
                }
            case .systemSmall:
                VStack(alignment: .leading, spacing: 2) {
                    Text("PENDIENTES").font(.caption2.weight(.semibold)).foregroundStyle(.secondary)
                    Spacer(minLength: 0)
                    if let p = lista.first {
                        HStack(alignment: .top, spacing: 8) {
                            Rectangle().fill(Color(hexRamo: p.color)).frame(width: 3)
                            VStack(alignment: .leading, spacing: 2) {
                                // Una línea: se achica antes que partirse, como en Próxima evaluación.
                                Text(p.evaluacion).font(.headline).lineLimit(1).minimumScaleFactor(0.6)
                                Text(p.sigla ?? p.ramo).font(.caption).foregroundStyle(.secondary).lineLimit(1)
                                Text(Tareas.texto(p, desde: entrada.date)).font(.subheadline.weight(.semibold)).lineLimit(2)
                                    .minimumScaleFactor(0.8).padding(.top, 4)
                            }
                        }
                        .fixedSize(horizontal: false, vertical: true)
                        if lista.count > 1 { Text("y \(lista.count - 1) más").font(.caption).foregroundStyle(.secondary).padding(.top, 4) }
                    } else {
                        Text(vacio).font(.subheadline)
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
            default:
                // En el mediano caben tres filas y nada más, sin rótulo: cada
                // fila ya dice qué hay que hacer.
                let mediano = familia == .systemMedium
                let cuantos = mediano ? 3 : 6
                VStack(alignment: .leading, spacing: mediano ? 8 : 10) {
                    if !mediano {
                        Text("PENDIENTES").font(.caption2.weight(.semibold)).foregroundStyle(.secondary)
                    }
                    if lista.isEmpty {
                        Spacer(minLength: 0)
                        Text(vacio).font(.subheadline)
                    }
                    ForEach(Array(lista.prefix(cuantos).enumerated()), id: \.offset) { _, p in
                        Fila(ramoId: p.ramoId, color: p.color, titulo: p.evaluacion,
                             detalle: "\(p.sigla ?? p.ramo) · \(Tareas.texto(p, desde: entrada.date))")
                    }
                    if !mediano && lista.count > cuantos {
                        Text("y \(lista.count - cuantos) más").font(.caption).foregroundStyle(.secondary)
                    }
                    Spacer(minLength: 0)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
            }
        }
        .widgetURL(lista.first.map { enlaceRamo($0.ramoId) } ?? URL(string: "cl.gradehub.app://agenda"))
    }
}

struct PendientesWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "pendientes", provider: Proveedor()) { entrada in
            PendientesVista(entrada: entrada).containerBackground(.background, for: .widget)
        }
        .configurationDisplayName("Pendientes")
        .description("Lo que tienes que hacer, lo más urgente primero.")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge, .accessoryRectangular, .accessoryInline])
    }
}

// MARK: - Horario (#641)

// Qué clase toca lo decide el widget con la hora real: es lo único que calcula.
enum Horario {
    static let cal = Calendar.current
    static let dias = ["", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"]
    // 1 = lunes … 7 = domingo, como en la app.
    static func dia(_ d: Date) -> Int { (cal.component(.weekday, from: d) + 5) % 7 + 1 }
    static func minutos(_ hora: String) -> Int? {
        let partes = hora.split(separator: ":").compactMap { Int($0) }
        return partes.count == 2 ? partes[0] * 60 + partes[1] : nil
    }
    static func instante(_ hora: String, en dia: Date) -> Date? {
        minutos(hora).flatMap { cal.date(byAdding: .minute, value: $0, to: cal.startOfDay(for: dia)) }
    }
    static func delDia(_ clases: [Resumen.Clase], _ d: Date) -> [Resumen.Clase] {
        clases.filter { $0.dia == dia(d) }.sorted { (minutos($0.inicio) ?? 0) < (minutos($1.inicio) ?? 0) }
    }
    // El primer día desde `ahora` (hoy incluido) que todavía tiene clases por terminar.
    static func proximoDia(_ clases: [Resumen.Clase], desde ahora: Date) -> (Date, [Resumen.Clase])? {
        for k in 0..<8 {
            guard let d = cal.date(byAdding: .day, value: k, to: cal.startOfDay(for: ahora)) else { continue }
            let quedan = delDia(clases, d).filter { (instante($0.fin, en: d) ?? .distantPast) > ahora }
            if !quedan.isEmpty { return (d, quedan) }
        }
        return nil
    }
    static func enCurso(_ c: Resumen.Clase, _ d: Date, _ ahora: Date) -> Bool {
        (instante(c.inicio, en: d) ?? .distantFuture) <= ahora
    }
    // "Ahora", "Hoy", "Mañana" o el nombre del día.
    static func cuando(_ c: Resumen.Clase, _ d: Date, _ ahora: Date) -> String {
        if enCurso(c, d, ahora) { return "Ahora" }
        if cal.isDate(d, inSameDayAs: ahora) { return "Hoy" }
        if let m = cal.date(byAdding: .day, value: 1, to: ahora), cal.isDate(d, inSameDayAs: m) { return "Mañana" }
        return dias[dia(d)].capitalized
    }
    static func tipo(_ t: String?) -> String? {
        ["catedra": "Cátedra", "ayudantia": "Ayudantía", "laboratorio": "Laboratorio", "taller": "Taller"][t ?? ""]
    }
    // La cátedra es lo normal y no se dice; ayudantía, laboratorio o taller, sí.
    static func tipoSiNoEsCatedra(_ c: Resumen.Clase) -> String? { c.tipo == "catedra" ? nil : tipo(c.tipo) }
    static func lugar(_ c: Resumen.Clase) -> String {
        ["\(c.inicio)–\(c.fin)", c.sala.map { "Sala \($0)" }, tipoSiNoEsCatedra(c)].compactMap { $0 }.joined(separator: " · ")
    }
}

// Una entrada al inicio y al fin de cada clase de los próximos días: lo que
// toca cambia solo, sin abrir la app.
struct ProveedorHorario: TimelineProvider {
    func placeholder(in context: Context) -> Entrada { Entrada(date: .now, resumen: nil) }
    func getSnapshot(in context: Context, completion: @escaping (Entrada) -> Void) {
        completion(Entrada(date: .now, resumen: Almacen.leer()))
    }
    func getTimeline(in context: Context, completion: @escaping (Timeline<Entrada>) -> Void) {
        let resumen = Almacen.leer(), ahora = Date(), cal = Horario.cal
        var cambios: [Date] = []
        for k in 0..<3 {
            guard let d = cal.date(byAdding: .day, value: k, to: cal.startOfDay(for: ahora)) else { continue }
            if k > 0 { cambios.append(d) }
            for c in Horario.delDia(resumen?.horario ?? [], d) {
                cambios += [Horario.instante(c.inicio, en: d), Horario.instante(c.fin, en: d)].compactMap { $0 }
            }
        }
        let fechas = Array(Set(cambios.filter { $0 > ahora })).sorted()
        let fin = fechas.last ?? cal.date(byAdding: .day, value: 1, to: ahora) ?? ahora
        completion(Timeline(entries: [Entrada(date: ahora, resumen: resumen)] + fechas.map { Entrada(date: $0, resumen: resumen) },
                            policy: .after(fin)))
    }
}

struct HorarioVista: View {
    @Environment(\.widgetFamily) var familia
    let entrada: Entrada

    var body: some View {
        let clases = entrada.resumen?.horario ?? []
        let ahora = entrada.date
        let proximo = Horario.proximoDia(clases, desde: ahora)
        let vacio = entrada.resumen == nil ? "Abre GradeHub" : clases.isEmpty ? "Agrega tu horario en GradeHub" : "Sin clases esta semana"
        Group {
            switch familia {
            case .accessoryInline:
                if let (d, quedan) = proximo, let c = quedan.first {
                    Text("\(c.sigla ?? c.ramo) \(Horario.enCurso(c, d, ahora) ? "hasta \(c.fin)" : c.inicio)\(c.sala.map { " \($0)" } ?? "")")
                } else { Text(vacio) }
            case .accessoryRectangular:
                if let (d, quedan) = proximo, let c = quedan.first {
                    VStack(alignment: .leading, spacing: 1) {
                        Text("\(Horario.cuando(c, d, ahora)) · \(Horario.enCurso(c, d, ahora) ? "hasta \(c.fin)" : c.inicio)")
                            .font(.headline).monospacedDigit().widgetAccentable().lineLimit(1)
                        Text(c.ramo).font(.subheadline).lineLimit(1)
                        Text(c.sala.map { "Sala \($0)" } ?? Horario.tipoSiNoEsCatedra(c) ?? "").font(.caption).foregroundStyle(.secondary).lineLimit(1)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                } else {
                    Text(vacio).font(.subheadline)
                }
            case .systemSmall:
                VStack(alignment: .leading, spacing: 2) {
                    if let (d, quedan) = proximo, let c = quedan.first {
                        Text(Horario.cuando(c, d, ahora).uppercased()).font(.caption2.weight(.semibold)).foregroundStyle(.secondary)
                        Spacer(minLength: 0)
                        HStack(alignment: .top, spacing: 8) {
                            Rectangle().fill(Color(hexRamo: c.color)).frame(width: 3)
                            VStack(alignment: .leading, spacing: 2) {
                                Text(c.ramo).font(.headline).lineLimit(2).minimumScaleFactor(0.7)
                                Text("\(c.inicio)–\(c.fin)").font(.subheadline.weight(.semibold)).monospacedDigit()
                                let detalle = [c.sala.map { "Sala \($0)" }, Horario.tipoSiNoEsCatedra(c)].compactMap { $0 }
                                if !detalle.isEmpty {
                                    Text(detalle.joined(separator: " · ")).font(.caption).foregroundStyle(.secondary).lineLimit(1)
                                }
                            }
                        }
                        .fixedSize(horizontal: false, vertical: true)
                        if quedan.count > 1 {
                            // La hora primero: si no cabe, se corta el nombre y no la hora.
                            Text("Después \(quedan[1].inicio) · \(quedan[1].sigla ?? quedan[1].ramo)")
                                .font(.caption).monospacedDigit().foregroundStyle(.secondary).lineLimit(1).padding(.top, 4)
                        }
                    } else {
                        Text("HORARIO").font(.caption2.weight(.semibold)).foregroundStyle(.secondary)
                        Spacer(minLength: 0)
                        Text(vacio).font(.subheadline)
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
            default:
                // Mediano: el día que viene (hoy si quedan clases). Grande: ese día y el siguiente con clases.
                let grande = familia == .systemLarge
                let siguiente = proximo.flatMap { (d, _) in
                    Horario.cal.date(byAdding: .day, value: 1, to: d).flatMap { Horario.proximoDia(clases, desde: $0) }
                }
                VStack(alignment: .leading, spacing: 8) {
                    if let (d, quedan) = proximo {
                        bloque(d, quedan, max: grande ? 4 : 3)
                        if grande, let (d2, todas) = siguiente {
                            Divider()
                            bloque(d2, todas, max: 3)
                        }
                    } else {
                        Text("HORARIO").font(.caption2.weight(.semibold)).foregroundStyle(.secondary)
                        Spacer(minLength: 0)
                        Text(vacio).font(.subheadline)
                    }
                    Spacer(minLength: 0)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
            }
        }
        .widgetURL(proximo?.1.first.map { enlaceRamo($0.ramoId) } ?? URL(string: "cl.gradehub.app://agenda"))
    }

    @ViewBuilder
    func bloque(_ d: Date, _ clases: [Resumen.Clase], max: Int) -> some View {
        let ahora = entrada.date
        let titulo = Horario.cal.isDate(d, inSameDayAs: ahora) ? "HOY"
            : Horario.cal.isDate(d, inSameDayAs: Horario.cal.date(byAdding: .day, value: 1, to: ahora) ?? ahora) ? "MAÑANA"
            : Horario.dias[Horario.dia(d)].uppercased()
        Text(titulo).font(.caption2.weight(.semibold)).foregroundStyle(.secondary)
        ForEach(Array(clases.prefix(max).enumerated()), id: \.offset) { _, c in
            Fila(ramoId: c.ramoId, color: c.color, titulo: c.ramo, detalle: Horario.lugar(c)) {
                if Horario.enCurso(c, d, ahora) {
                    Text("Ahora").font(.caption.weight(.semibold)).widgetAccentable()
                }
            }
        }
        if clases.count > max {
            Text("y \(clases.count - max) más").font(.caption).foregroundStyle(.secondary)
        }
    }
}

struct HorarioWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "horario", provider: ProveedorHorario()) { entrada in
            HorarioVista(entrada: entrada).containerBackground(.background, for: .widget)
        }
        .configurationDisplayName("Horario")
        .description("Qué clase toca y en qué sala.")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge, .accessoryRectangular, .accessoryInline])
    }
}

// MARK: - Estadísticas configurable (#638)

enum Estadistica: String, AppEnum {
    case avance, rango, exigente
    static var typeDisplayRepresentation: TypeDisplayRepresentation = "Estadística"
    static var caseDisplayRepresentations: [Estadistica: DisplayRepresentation] = [
        .avance: "Avance del semestre",
        .rango: "Rango del semestre",
        .exigente: "Lo que más te exige",
    ]
}

struct ElegirEstadistica: WidgetConfigurationIntent {
    static var title: LocalizedStringResource = "Estadística"
    static var description = IntentDescription("Elige qué estadística ver.")
    @Parameter(title: "Mostrar", default: .avance) var estadistica: Estadistica
}

struct EntradaEstadistica: TimelineEntry {
    let date: Date
    let resumen: Resumen?
    let estadistica: Estadistica
}

// Nada depende de la hora: cambia solo cuando la app guarda un resumen nuevo.
struct ProveedorEstadistica: AppIntentTimelineProvider {
    func placeholder(in context: Context) -> EntradaEstadistica { EntradaEstadistica(date: .now, resumen: nil, estadistica: .avance) }
    func snapshot(for c: ElegirEstadistica, in context: Context) async -> EntradaEstadistica {
        EntradaEstadistica(date: .now, resumen: Almacen.leer(), estadistica: c.estadistica)
    }
    func timeline(for c: ElegirEstadistica, in context: Context) async -> Timeline<EntradaEstadistica> {
        Timeline(entries: [EntradaEstadistica(date: .now, resumen: Almacen.leer(), estadistica: c.estadistica)], policy: .never)
    }
}

// 0.5 s: una cifra grande y una línea que dice qué es. Las mismas de Estadísticas.
struct EstadisticaVista: View {
    @Environment(\.colorScheme) var esquema
    let entrada: EntradaEstadistica

    var titulo: String {
        switch entrada.estadistica {
        case .avance: return "AVANCE DEL SEMESTRE"
        case .rango: return "RANGO DEL SEMESTRE"
        case .exigente: return "LO QUE MÁS TE EXIGE"
        }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(titulo).font(.caption2.weight(.semibold)).foregroundStyle(.secondary).lineLimit(1).minimumScaleFactor(0.8)
            Spacer(minLength: 0)
            if let s = entrada.resumen?.estadisticas {
                contenido(s)
            } else {
                Text("Abre GradeHub").font(.subheadline)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .widgetURL(URL(string: entrada.estadistica == .exigente
            ? entrada.resumen?.estadisticas?.exigente.map { "cl.gradehub.app://ramo/\($0.ramoId)" } ?? "cl.gradehub.app://estadisticas"
            : "cl.gradehub.app://estadisticas"))
    }

    @ViewBuilder
    func contenido(_ s: Resumen.Estadisticas) -> some View {
        switch entrada.estadistica {
        case .avance:
            // Un riel neutro, como en Inicio: el 100% es "cerrado", no una celebración.
            Text("\(s.avance)%").font(.system(size: 44, weight: .medium)).monospacedDigit()
            ProgressView(value: Double(min(max(s.avance, 0), 100)), total: 100).progressViewStyle(.linear).tint(.primary)
            Text(s.avance >= 100 ? "Todo evaluado" : "del semestre ya tiene nota").font(.caption).foregroundStyle(.secondary).lineLimit(2)
        case .rango:
            if let r = s.rango {
                HStack(alignment: .firstTextBaseline, spacing: 6) {
                    Text(r.piso).foregroundStyle(Semaforo.color(r.nivelPiso, esquema))
                    Text("y").font(.title3.weight(.semibold)).foregroundStyle(.tertiary)
                    Text(r.techo).foregroundStyle(Semaforo.color(r.nivelTecho, esquema))
                }
                .font(.system(size: 36, weight: .medium)).monospacedDigit().lineLimit(1).minimumScaleFactor(0.6)
                .privacySensitive()
                Text("Tu promedio final puede quedar entre estos dos").font(.caption).foregroundStyle(.secondary).lineLimit(2)
            } else {
                Text("Nada pendiente por evaluar").font(.subheadline)
            }
        case .exigente:
            if let x = s.exigente {
                HStack(alignment: .top, spacing: 8) {
                    Rectangle().fill(Color(hexRamo: x.color)).frame(width: 3)
                    VStack(alignment: .leading, spacing: 2) {
                        Text(x.ramo).font(.subheadline.weight(.semibold)).lineLimit(2).minimumScaleFactor(0.8)
                        Group {
                            if let n = x.necesitas {
                                Text(n).font(.system(size: 36, weight: .medium)).monospacedDigit()
                                Text("necesitas en lo pendiente").font(.caption).foregroundStyle(.secondary)
                            } else {
                                Text("Ya no alcanza solo con lo pendiente").font(.caption).foregroundStyle(Semaforo.color("bad", esquema))
                            }
                        }
                        .privacySensitive()
                    }
                }
                .fixedSize(horizontal: false, vertical: true)
            } else {
                Text("Ingresa una nota para verlo").font(.subheadline)
            }
        }
    }
}

struct EstadisticasWidget: Widget {
    var body: some WidgetConfiguration {
        AppIntentConfiguration(kind: "estadisticas", intent: ElegirEstadistica.self, provider: ProveedorEstadistica()) { entrada in
            EstadisticaVista(entrada: entrada).containerBackground(.background, for: .widget)
        }
        .configurationDisplayName("Estadísticas")
        .description("Elige qué ver: avance, rango del semestre o lo que más te exige.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

// MARK: - Actividad en Vivo de una evaluación (#645)

// Te acompaña las 6 horas previas y las 2 de la prueba. Nada de esto necesita
// que la app esté abierta ni un servidor: la cuenta regresiva y el riel de fases
// los anima el sistema solo (cada tramo es un ProgressView con su intervalo), y
// a la hora de inicio el sistema la marca "stale" y se dibuja "Suerte" con los
// botones de "¿cómo te fue?". Los botones no se exigen: la Actividad muestra,
// no pide. Sin notas: solo qué evaluación es, dónde, cuándo y la sensación.

enum Hora {
    // 24 horas siempre, como se usa en Chile, aunque el iPhone esté en 12 horas.
    static let formato: DateFormatter = {
        let f = DateFormatter()
        f.locale = Locale(identifier: "en_US_POSIX")
        f.dateFormat = "H:mm"
        return f
    }()
    static func de(_ d: Date) -> String { formato.string(from: d) }
}

func lugarYHora(_ a: ActividadPruebaAtributos, _ e: ActividadPruebaAtributos.ContentState) -> String {
    let horas = "\(Hora.de(e.inicio))–\(Hora.de(e.fin))"
    return a.sala.map { "Sala \($0) · \(horas)" } ?? horas
}

struct CuentaRegresiva: View {
    let hasta: Date
    var body: some View {
        Text(timerInterval: Date.now...max(hasta, Date.now), countsDown: true, showsHours: true)
            .monospacedDigit()
            .multilineTextAlignment(.trailing)
    }
}

// Las fases que acompañan la cuenta regresiva, iguales a los avisos de la app.
struct Fase: Identifiable {
    let id: String, icono: String, desde: Date, hasta: Date
    static let horasAntes: Double = 6
    static func de(_ e: ActividadPruebaAtributos.ContentState) -> [Fase] {
        let m = { (min: Double) in e.inicio.addingTimeInterval(-min * 60) }
        return [
            Fase(id: "Estudia", icono: "book", desde: m(horasAntes * 60), hasta: m(30)),
            Fase(id: "Repaso", icono: "text.book.closed", desde: m(30), hasta: m(15)),
            Fase(id: "Agua", icono: "drop", desde: m(15), hasta: m(10)),
            Fase(id: "Sala", icono: "figure.walk", desde: m(10), hasta: e.inicio),
            Fase(id: "Prueba", icono: "pencil", desde: e.inicio, hasta: e.fin),
        ]
    }
}

// Un tramo por fase, de igual ancho: cada uno se llena solo durante su tiempo.
// Neutro, como el riel de avance de Inicio: el color del ramo vive en su línea.
struct RielFases: View {
    let estado: ActividadPruebaAtributos.ContentState
    var conEtiquetas = true
    var body: some View {
        HStack(alignment: .top, spacing: 4) {
            ForEach(Fase.de(estado)) { f in
                VStack(alignment: .leading, spacing: 4) {
                    ProgressView(timerInterval: f.desde...f.hasta, countsDown: false) { EmptyView() } currentValueLabel: { EmptyView() }
                        .progressViewStyle(.linear).tint(.primary)
                    if conEtiquetas {
                        Label(f.id, systemImage: f.icono).labelStyle(.titleAndIcon)
                            .font(.caption2.weight(.medium)).foregroundStyle(.secondary)
                            .lineLimit(1).minimumScaleFactor(0.8)
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
            }
        }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("Estudia, último repaso a las \(Hora.de(Fase.de(estado)[1].desde)), agua, sala y prueba a las \(Hora.de(estado.inicio))")
    }
}

// "¿Cómo te fue?": cinco botones que se pueden tocar sin abrir la app. No se exigen.
struct BotonesSensacion: View {
    let clave: String
    var body: some View {
        HStack(spacing: 6) {
            ForEach(1...5, id: \.self) { v in
                Button(intent: ResponderSensacion(clave: clave, valor: v)) {
                    Text(Sensacion.texto(v)).font(.caption.weight(.semibold)).lineLimit(1).minimumScaleFactor(0.75)
                        .frame(maxWidth: .infinity, minHeight: 36)
                        .background(.primary.opacity(0.12), in: Capsule())
                }
                .buttonStyle(.plain)
            }
        }
    }
}

// 0.5 s: una cuenta regresiva grande sobre un riel que se llena.
// Quién: alguien camino a la sala, nervioso, que mira el bloqueo un segundo.
// Qué debe sentir: calma y foco. Una sola cosa grande; el resto susurra.
struct PruebaBloqueoVista: View {
    let contexto: ActivityViewContext<ActividadPruebaAtributos>

    var body: some View {
        let a = contexto.attributes, e = contexto.state
        let enCurso = contexto.isStale || Date() >= e.inicio
        let lugar = [a.ramo, a.sala.map { "Sala \($0)" }].compactMap { $0 }.joined(separator: " · ")
        VStack(alignment: .leading, spacing: 10) {
            HStack(alignment: .top, spacing: 10) {
                // El color del ramo vive en su línea lateral, como en la app.
                RoundedRectangle(cornerRadius: 1.5).fill(Color(hexRamo: a.color)).frame(width: 3)
                VStack(alignment: .leading, spacing: 1) {
                    Text(a.evaluacion).font(.headline).lineLimit(1)
                    Text(lugar)
                        .font(.subheadline).monospacedDigit().foregroundStyle(.secondary).lineLimit(1)
                }
                Spacer(minLength: 8)
                if let s = e.sensacion {
                    Text(Sensacion.texto(s)).font(.title2.weight(.bold)).lineLimit(1).minimumScaleFactor(0.7)
                } else if enCurso {
                    VStack(alignment: .trailing, spacing: 0) {
                        Text("Suerte").font(.title2.weight(.bold))
                        Text("Termina \(Hora.de(e.fin))").font(.caption).monospacedDigit().foregroundStyle(.secondary)
                    }
                } else {
                    Text(Hora.de(e.inicio)).font(.title3.weight(.semibold)).monospacedDigit().foregroundStyle(.secondary)
                }
            }
            .fixedSize(horizontal: false, vertical: true)
            if e.sensacion != nil {
                Text("Toca para ver cuánto necesitas en lo que queda.").font(.footnote).foregroundStyle(.secondary)
            } else if enCurso {
                VStack(alignment: .leading, spacing: 6) {
                    Text("Al salir, ¿cómo te fue?").font(.footnote).foregroundStyle(.secondary)
                    BotonesSensacion(clave: a.clave)
                }
            } else {
                // En el bloqueo iOS lo escribe en palabras ("3 horas y 19 minutos",
                // "24 minutos") y lo actualiza solo; un reloj con segundos sale "24:--".
                Text(e.inicio, style: .timer)
                    .font(.system(.title, weight: .bold)).monospacedDigit()
                    .lineLimit(1).minimumScaleFactor(0.6)
                RielFases(estado: e)
            }
        }
        .padding(.horizontal, 16).padding(.vertical, 14)
    }
}

struct ActividadPruebaWidget: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: ActividadPruebaAtributos.self) { contexto in
            PruebaBloqueoVista(contexto: contexto)
                .widgetURL(URL(string: "cl.gradehub.app://\(contexto.state.sensacion != nil ? "simular" : "ramo")/\(contexto.attributes.ramoId)"))
        } dynamicIsland: { contexto in
            let a = contexto.attributes, e = contexto.state
            let color = Color(hexRamo: a.color)
            return DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    VStack(alignment: .leading, spacing: 2) {
                        Text(a.evaluacion).font(.headline).lineLimit(1)
                        Text(a.ramo).font(.caption).foregroundStyle(.secondary).lineLimit(1)
                    }
                    .padding(.leading, 4)
                }
                DynamicIslandExpandedRegion(.trailing) {
                    if let s = e.sensacion { Text(Sensacion.texto(s)).font(.headline) }
                    else if contexto.isStale { Text("Suerte").font(.headline) }
                    else { CuentaRegresiva(hasta: e.inicio).font(.title3.weight(.semibold)).frame(maxWidth: 90, alignment: .trailing) }
                }
                DynamicIslandExpandedRegion(.bottom) {
                    if e.sensacion != nil {
                        EmptyView()
                    } else if contexto.isStale {
                        BotonesSensacion(clave: a.clave)
                    } else {
                        RielFases(estado: e, conEtiquetas: false)
                    }
                }
            } compactLeading: {
                Circle().fill(color).frame(width: 10, height: 10).padding(.leading, 2)
            } compactTrailing: {
                if contexto.isStale { Text("Suerte").font(.caption2.weight(.semibold)) }
                // Con horas el reloj es "3:19:58": 46 pt lo cortaba en "03:1…".
                else { CuentaRegresiva(hasta: e.inicio).font(.caption2.weight(.semibold)).minimumScaleFactor(0.7).frame(width: 60) }
            } minimal: {
                Circle().fill(color).frame(width: 10, height: 10)
            }
            .keylineTint(color)
            .widgetURL(URL(string: "cl.gradehub.app://ramo/\(a.ramoId)"))
        }
    }
}

@main
struct GradeHubWidgets: WidgetBundle {
    var body: some Widget {
        ProximaEvaluacionWidget()
        PromedioGeneralWidget()
        PendientesWidget()
        EstadisticasWidget()
        HorarioWidget()
        ActividadPruebaWidget()
    }
}
