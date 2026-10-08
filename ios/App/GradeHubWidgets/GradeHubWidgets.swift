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
        // Porcentaje del ramo que define (0–100); nil si no es fijo.
        let parte: Double?
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
        let despues = Array((entrada.resumen?.agenda ?? [])
            .filter { (Fechas.diasHasta($0.fecha, desde: entrada.date) ?? -1) >= 0 }
            .dropFirst().prefix(3))
        return HStack(alignment: .top, spacing: 16) {
            tarjeta(e).frame(maxWidth: .infinity, alignment: .leading)
            VStack(alignment: .leading, spacing: 10) {
                Text("Después").font(.caption).foregroundStyle(.secondary)
                if despues.isEmpty {
                    Text("Nada más por ahora").font(.subheadline).foregroundStyle(.secondary)
                }
                ForEach(Array(despues.enumerated()), id: \.offset) { _, d in
                    Link(destination: URL(string: "cl.gradehub.app://ramo/\(d.ramoId)")!) {
                        HStack(spacing: 8) {
                            RoundedRectangle(cornerRadius: 1.5).fill(Color(hexRamo: d.color)).frame(width: 3)
                            VStack(alignment: .leading, spacing: 0) {
                                Text(d.evaluacion).font(.subheadline.weight(.semibold)).lineLimit(1).minimumScaleFactor(0.75)
                                Text("\(d.sigla ?? d.ramo) · \(Fechas.cuando(d, desde: entrada.date))")
                                    .font(.caption).foregroundStyle(.secondary).lineLimit(1).minimumScaleFactor(0.8)
                            }
                        }
                        .fixedSize(horizontal: false, vertical: true)
                    }
                }
                Spacer(minLength: 0)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
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
        .supportedFamilies([.systemSmall, .systemMedium, .accessoryRectangular, .accessoryInline])
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
        ActividadPruebaWidget()
    }
}
