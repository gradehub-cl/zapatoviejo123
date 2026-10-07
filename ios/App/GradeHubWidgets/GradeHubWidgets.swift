import ActivityKit
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
                // Primero qué es; después cuánto falta (pedido de Lucas, 2026-10-07).
                Text(e.evaluacion).font(.headline).lineLimit(2).minimumScaleFactor(0.85)
                Text(e.sigla ?? e.ramo).font(.caption).foregroundStyle(.secondary).lineLimit(1)
                Spacer(minLength: 0)
                Text(Fechas.cuando(e, desde: entrada.date)).font(.subheadline.weight(.bold)).minimumScaleFactor(0.8)
                Text(Fechas.corta(e.fecha)).font(.caption).foregroundStyle(.secondary)
                if let n = e.necesitas {
                    HStack(alignment: .firstTextBaseline, spacing: 4) {
                        Text("Necesitas").font(.caption).foregroundStyle(.secondary)
                        Text(n).font(.caption.weight(.bold)).monospacedDigit()
                    }
                    .privacySensitive()
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

// MARK: - Actividad en Vivo de una evaluación (#645)

// Antes de la hora de inicio: cuenta regresiva grande, como reloj. Desde la hora
// de inicio el sistema la marca "stale" y se dibuja "Suerte" con la barra del
// tiempo que queda, sin que la app tenga que estar abierta. Los mensajes de
// cada fase (repaso, baño y agua, caminar a la sala) llegan como notificaciones.
// Sin notas: solo qué evaluación es, dónde y cuándo.

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

struct PruebaBloqueoVista: View {
    let contexto: ActivityViewContext<ActividadPruebaAtributos>

    var body: some View {
        let a = contexto.attributes, e = contexto.state
        let color = Color(hexRamo: a.color)
        HStack(alignment: .center, spacing: 12) {
            // El color del ramo vive en su línea lateral, como en la app.
            RoundedRectangle(cornerRadius: 1.5).fill(color).frame(width: 3)
            VStack(alignment: .leading, spacing: 3) {
                Text(contexto.isStale ? "EN CURSO" : "PRÓXIMA EVALUACIÓN")
                    .font(.caption2.weight(.semibold)).tracking(0.6).foregroundStyle(.secondary).lineLimit(1)
                Text(a.evaluacion).font(.headline).lineLimit(1)
                Text(a.ramo).font(.subheadline).foregroundStyle(.secondary).lineLimit(1)
                Text(lugarYHora(a, e)).font(.caption).monospacedDigit().foregroundStyle(.secondary).lineLimit(1)
            }
            Spacer(minLength: 8)
            VStack(alignment: .trailing, spacing: 2) {
                if contexto.isStale {
                    Text("Suerte").font(.title2.weight(.bold))
                    Text("Termina \(Hora.de(e.fin))").font(.caption).monospacedDigit().foregroundStyle(.secondary)
                } else {
                    // En la pantalla de bloqueo iOS esconde los segundos de un reloj
                    // ("24:--"); este formato se adapta solo y se lee "24 minutos".
                    Text(e.inicio, style: .timer).font(.title2.weight(.bold)).monospacedDigit()
                        .multilineTextAlignment(.trailing).minimumScaleFactor(0.7).lineLimit(1).frame(maxWidth: 130, alignment: .trailing)
                    Text("para empezar").font(.caption).foregroundStyle(.secondary)
                }
            }
        }
        .overlay(alignment: .bottom) {
            if contexto.isStale {
                ProgressView(timerInterval: e.inicio...e.fin, countsDown: true) { EmptyView() } currentValueLabel: { EmptyView() }
                    .tint(color).offset(y: 10)
            }
        }
        .padding(.horizontal, 16).padding(.vertical, 14)
    }
}

struct ActividadPruebaWidget: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: ActividadPruebaAtributos.self) { contexto in
            PruebaBloqueoVista(contexto: contexto)
                .widgetURL(URL(string: "cl.gradehub.app://ramo/\(contexto.attributes.ramoId)"))
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
                    if contexto.isStale { Text("Suerte").font(.headline).foregroundStyle(color) }
                    else { CuentaRegresiva(hasta: e.inicio).font(.title3.weight(.semibold)).foregroundStyle(color).frame(maxWidth: 90, alignment: .trailing) }
                }
                DynamicIslandExpandedRegion(.bottom) {
                    if contexto.isStale {
                        ProgressView(timerInterval: e.inicio...e.fin, countsDown: true) { EmptyView() } currentValueLabel: { EmptyView() }.tint(color)
                    } else {
                        Text(lugarYHora(a, e)).font(.caption).monospacedDigit().foregroundStyle(.secondary).lineLimit(1)
                    }
                }
            } compactLeading: {
                Circle().fill(color).frame(width: 10, height: 10).padding(.leading, 2)
            } compactTrailing: {
                if contexto.isStale { Text("Suerte").font(.caption2.weight(.semibold)) }
                else { CuentaRegresiva(hasta: e.inicio).font(.caption2.weight(.semibold)).frame(maxWidth: 46) }
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
        ActividadPruebaWidget()
    }
}
