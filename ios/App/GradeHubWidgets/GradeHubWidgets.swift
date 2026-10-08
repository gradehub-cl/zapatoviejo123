import SwiftUI
import WidgetKit

// Widgets de GradeHub (#634, #635, #637). Solo muestran el resumen que calculó
// la app con el motor de siempre: acá no se calcula ninguna nota. Lo único que
// depende de la hora ("hoy", "en 3 días") se resuelve en el widget.

// MARK: - Datos

struct Resumen: Decodable {
    struct Promedio: Decodable { let oficial: Double; let nivel: String }
    struct Ramo: Decodable { let id: String; let nombre: String; let promedio: Double?; let nivel: String? }
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
    }
    let version: Int
    let actualizado: String
    let promedio: Promedio?
    let ramos: [Ramo]
    let agenda: [Evaluacion]
}

enum Almacen {
    static let grupo = "group.cl.gradehub.app"
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
        guard let n = diasHasta(e.fecha, desde: ahora) else { return e.fecha }
        let hora = e.hora.map { " · \($0)" } ?? ""
        switch n {
        case 0: return "Hoy" + hora
        case 1: return "Mañana" + hora
        default: return "En \(n) días"
        }
    }
    // La próxima evaluación que todavía no pasa, vista desde la fecha de la entrada.
    static func proxima(_ r: Resumen?, desde ahora: Date) -> Resumen.Evaluacion? {
        r?.agenda.first { (diasHasta($0.fecha, desde: ahora) ?? -1) >= 0 }
    }
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

// MARK: - Próxima evaluación

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
            default:
                if let e { tarjeta(e) } else { vacio }
            }
        }
        .widgetURL(URL(string: e.map { "cl.gradehub.app://ramo/\($0.ramoId)" } ?? "cl.gradehub.app://agenda"))
    }

    func tarjeta(_ e: Resumen.Evaluacion) -> some View {
        HStack(alignment: .top, spacing: 8) {
            // El color del ramo vive en su línea lateral, como en Inicio.
            Rectangle().fill(Color(hexRamo: e.color)).frame(width: 3)
            VStack(alignment: .leading, spacing: 3) {
                Text("PRÓXIMA").font(.caption2.weight(.semibold)).foregroundStyle(.secondary)
                Text(Fechas.cuando(e, desde: entrada.date)).font(.title3.weight(.bold)).minimumScaleFactor(0.8)
                Text(e.evaluacion).font(.subheadline.weight(.semibold)).lineLimit(2)
                Text(e.sigla ?? e.ramo).font(.caption).foregroundStyle(.secondary).lineLimit(1)
                Spacer(minLength: 0)
                if let n = e.necesitas {
                    Text("Necesitas \(n)").font(.caption.weight(.semibold)).monospacedDigit().privacySensitive()
                } else if e.inalcanzable == true {
                    Text("Ya no alcanza el 4,0").font(.caption).privacySensitive()
                } else if e.margen == true {
                    Text("Tienes margen").font(.caption).privacySensitive()
                }
            }
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
        .supportedFamilies([.systemSmall, .accessoryRectangular, .accessoryInline])
    }
}

// MARK: - Promedio general

struct PromedioVista: View {
    @Environment(\.colorScheme) var esquema
    let entrada: Entrada

    var body: some View {
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
        .widgetURL(URL(string: "cl.gradehub.app://inicio"))
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
        .description("Tu promedio con su semáforo.")
        .supportedFamilies([.systemSmall])
    }
}

@main
struct GradeHubWidgets: WidgetBundle {
    var body: some Widget {
        ProximaEvaluacionWidget()
        PromedioGeneralWidget()
    }
}
