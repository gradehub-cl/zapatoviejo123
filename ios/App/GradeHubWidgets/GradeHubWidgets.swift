import ActivityKit
import AppIntents
import SwiftUI
import WidgetKit

// Widgets de GradeHub (#634–#638, #641). Solo muestran el resumen que calculó
// la app con el motor de siempre: acá no se calcula ninguna nota. Lo único que
// depende de la hora ("hoy", "en 3 días") se resuelve en el widget.

// `Resumen`, `Almacen`, `Fechas`, `enlaceRamo`, `Nota` y `Clases` viven en
// Shared/Resumen.swift: los comparten la app (Siri y Atajos) y esta extensión.

// MARK: - Línea de tiempo

struct Entrada: TimelineEntry {
    let date: Date
    let resumen: Resumen?
    // Solo la usa Próxima clase: cuánto le importa esta entrada a la Smart Stack.
    var relevance: TimelineEntryRelevance? = nil
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
        ZStack {
            Circle().stroke(.quaternary, lineWidth: 3.5)
            Circle().trim(from: 0, to: min(max(porcentaje, 0), 100) / 100)
                .stroke(.primary, style: StrokeStyle(lineWidth: 3.5, lineCap: .round))
                .rotationEffect(.degrees(-90))
            Text("\(Int(porcentaje.rounded()))%")
                .font(.system(size: 11, weight: .bold, design: .rounded)).monospacedDigit()
                .minimumScaleFactor(0.7).lineLimit(1).padding(.horizontal, 4)
        }
        .frame(width: 36, height: 36)
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

    // Chico (Lucas, 16-11): qué es y de qué ramo; al medio, el anillo de cuánto
    // pesa junto a cuándo es; abajo, la nota que necesitas, grande.
    func tarjeta(_ e: Resumen.Evaluacion) -> some View {
        HStack(alignment: .top, spacing: 8) {
            // El color del ramo vive en su línea lateral, como en Inicio.
            Rectangle().fill(Color(hexRamo: e.color)).frame(width: 3)
            VStack(alignment: .leading, spacing: 2) {
                Text(e.evaluacion).font(.headline).lineLimit(2).minimumScaleFactor(0.8)
                Text(e.sigla ?? e.ramo).font(.caption).foregroundStyle(.secondary).lineLimit(1)
                Spacer(minLength: 4)
                HStack(spacing: 8) {
                    if let p = e.parte { ParteDelRamo(porcentaje: p) }
                    VStack(alignment: .leading, spacing: 0) {
                        Text(Fechas.cuando(e, desde: entrada.date)).font(.subheadline.weight(.semibold)).lineLimit(1).minimumScaleFactor(0.8)
                        Text(Fechas.corta(e.fecha)).font(.caption2).foregroundStyle(.secondary).lineLimit(1)
                    }
                }
                Spacer(minLength: 4)
                meta(e).privacySensitive()
            }
            Spacer(minLength: 0)
        }
    }

    // Lo que necesitas en ESTA evaluación para ir con 4 después de rendirla
    // (lo calcula la app; ver notaParaIrConCuatro). Si ya vas con 4 aunque
    // saques la mínima, necesitas un 1,0: se dice igual, con la nota.
    @ViewBuilder
    func meta(_ e: Resumen.Evaluacion) -> some View {
        if let n = e.necesitas ?? (e.margen == true ? "1.0" : nil) {
            HStack(alignment: .firstTextBaseline, spacing: 5) {
                Text("Necesitas").font(.caption).foregroundStyle(.secondary)
                Text(Nota.coma(n)).font(.title3.weight(.bold)).monospacedDigit()
            }
            .lineLimit(1)
        } else if e.inalcanzable == true {
            Text("Sola no alcanza").font(.caption.weight(.semibold)).lineLimit(1)
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
    @Environment(\.widgetFamily) var familia
    let entrada: Entrada

    var body: some View {
        Group {
            switch familia {
            // Mediano (Lucas, 16-11): el promedio arriba a la izquierda y seis
            // ramos, que es lo que tiene casi todo el mundo: dos bajo el promedio
            // y cuatro a la derecha, cada uno con su barra 1–7 y la marca del 4.
            case .systemMedium:
                let ramos = ramosConNota
                HStack(alignment: .top, spacing: 16) {
                    VStack(alignment: .leading, spacing: 7) {
                        cabecera
                        Spacer(minLength: 0)
                        lista(Array(ramos.prefix(2)))
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    // Repartidas en todo el alto: la primera arriba con el
                    // título y la última abajo, alineada con la de la izquierda.
                    lista(Array(ramos.dropFirst(2).prefix(4)), repartir: true)
                        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
                }
            default:
                general
            }
        }
        .widgetURL(URL(string: "cl.gradehub.app://inicio"))
    }

    // Con coma decimal y un decimal, como en toda la app.
    static func nota(_ v: Double) -> String { String(format: "%.1f", v).replacingOccurrences(of: ".", with: ",") }

    var ramosConNota: [Resumen.Ramo] { (entrada.resumen?.ramos ?? []).filter { $0.promedio != nil } }

    // Promedio del mediano: etiqueta y número, sin los puntos del chico (los
    // ramos ya están al lado con su barra).
    @ViewBuilder
    var cabecera: some View {
        Text("PROMEDIO").font(.caption2.weight(.semibold)).foregroundStyle(.secondary)
        if let p = entrada.resumen?.promedio {
            Text(Self.nota(p.oficial))
                .font(.system(size: 40, weight: .semibold, design: .rounded)).monospacedDigit()
                .foregroundStyle(Semaforo.color(p.nivel, esquema))
                .minimumScaleFactor(0.7).lineLimit(1)
                .padding(.top, -6)
                .privacySensitive()
        } else {
            Text(entrada.resumen == nil ? "Abre GradeHub" : "Sin notas todavía").font(.subheadline)
        }
    }

    func lista(_ ramos: [Resumen.Ramo], repartir: Bool = false) -> some View {
        VStack(alignment: .leading, spacing: 7) {
            ForEach(Array(ramos.enumerated()), id: \.offset) { i, r in
                if repartir && i > 0 { Spacer(minLength: 0) }
                Link(destination: enlaceRamo(r.id)) {
                    VStack(alignment: .leading, spacing: 3) {
                        HStack(alignment: .firstTextBaseline) {
                            Text(r.nombre).font(.caption).lineLimit(1)
                            Spacer(minLength: 4)
                            Text(r.promedio.map(Self.nota) ?? "—").font(.caption.weight(.semibold)).monospacedDigit()
                                .foregroundStyle(Semaforo.color(r.nivel, esquema))
                        }
                        BarraNota(valor: r.promedio ?? 1, color: Semaforo.color(r.nivel, esquema))
                    }
                }
                .privacySensitive()
            }
        }
    }

    // Chico: el número grande y, debajo, un punto por ramo en su color de
    // semáforo. Se lee de un vistazo cuántos van bien y cuántos no.
    var general: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text("PROMEDIO").font(.caption2.weight(.semibold)).foregroundStyle(.secondary)
            Spacer(minLength: 0)
            if let p = entrada.resumen?.promedio {
                Text(Self.nota(p.oficial))
                    .font(.system(size: 52, weight: .semibold, design: .rounded)).monospacedDigit()
                    .foregroundStyle(Semaforo.color(p.nivel, esquema))
                    .minimumScaleFactor(0.7).lineLimit(1)
                    .privacySensitive()
                HStack(spacing: 4) {
                    ForEach(Array(ramosConNota.prefix(8).enumerated()), id: \.offset) { _, r in
                        Capsule().fill(Semaforo.color(r.nivel, esquema)).frame(width: 14, height: 6)
                    }
                }
                .accessibilityHidden(true)
                Text(conteo).font(.caption).foregroundStyle(.secondary).lineLimit(1).minimumScaleFactor(0.8)
                    .padding(.top, 2)
            } else {
                Text(entrada.resumen == nil ? "Abre GradeHub" : "Sin notas todavía").font(.subheadline)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    var conteo: String {
        let ramos = ramosConNota
        // Como en Inicio: verde va aprobando; ámbar y rojo, en riesgo.
        let aprobados = ramos.filter { $0.nivel == "good" }.count
        let riesgo = ramos.filter { $0.nivel == "warn" || $0.nivel == "bad" }.count
        if riesgo == 0 { return aprobados == 1 ? "1 ramo aprobando" : "\(aprobados) ramos aprobando" }
        return "\(aprobados) aprobando · \(riesgo) en riesgo"
    }
}

// Barra de una nota en la escala 1–7, con una marca fina en el 4.
struct BarraNota: View {
    let valor: Double
    let color: Color
    var body: some View {
        GeometryReader { g in
            let w = g.size.width, f = { (v: Double) in CGFloat((min(max(v, 1), 7) - 1) / 6) * w }
            ZStack(alignment: .leading) {
                Capsule().fill(.quaternary)
                Capsule().fill(color).frame(width: max(4, f(valor)))
                Rectangle().fill(.secondary).frame(width: 1, height: 8).offset(x: f(4))
            }
        }
        .frame(height: 5)
        .accessibilityHidden(true)
    }
}

struct PromedioGeneralWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "promedio-general", provider: Proveedor()) { entrada in
            PromedioVista(entrada: entrada).containerBackground(.background, for: .widget)
        }
        .configurationDisplayName("Promedio general")
        .description("Tu promedio con su semáforo y cómo va cada ramo.")
        .supportedFamilies([.systemSmall, .systemMedium])
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
        .supportedFamilies([.systemSmall, .systemMedium, .accessoryRectangular, .accessoryInline])
    }
}

// MARK: - Próxima clase (#641)

// La Smart Stack es cosa del widget (WidgetKit): va acá y no en Shared/Resumen.swift.
extension Clases {
    // Desde 15 minutos antes y hasta que termina, la clase es lo más útil de la
    // pantalla: la Smart Stack sube el widget sola. El resto del tiempo, nada.
    static let aviso: TimeInterval = 15 * 60
    static func relevancia(_ r: Resumen?, _ ahora: Date) -> TimelineEntryRelevance {
        guard !vencido(r, ahora), let o = vigentes(r, desde: ahora).first,
              o.inicio.timeIntervalSince(ahora) <= aviso else { return TimelineEntryRelevance(score: 0) }
        return TimelineEntryRelevance(score: 100, duration: o.fin.timeIntervalSince(ahora))
    }
}

// Una entrada en cada inicio, cada fin y cada medianoche de Chile: "Mañana" pasa
// a "Hoy" y "Hoy" a "Ahora" sin abrir la app. La última es el fin del horizonte.
struct ProveedorClases: TimelineProvider {
    func placeholder(in context: Context) -> Entrada { Entrada(date: .now, resumen: nil) }
    func getSnapshot(in context: Context, completion: @escaping (Entrada) -> Void) {
        completion(Entrada(date: .now, resumen: Almacen.leer()))
    }
    func getTimeline(in context: Context, completion: @escaping (Timeline<Entrada>) -> Void) {
        let resumen = Almacen.leer(), ahora = Date()
        guard let fin = Clases.horizonte(resumen), fin > ahora else {
            // Sin horario o ya vencido: nada cambia hasta que la app guarde otro resumen.
            completion(Timeline(entries: [Entrada(date: ahora, resumen: resumen)], policy: .never))
            return
        }
        // También 15 minutos antes de cada una: ahí sube en la Smart Stack.
        var cambios = Clases.todas(resumen).flatMap { [$0.inicio.addingTimeInterval(-Clases.aviso), $0.inicio, $0.fin] }
        var noche = Clases.cal.startOfDay(for: ahora)
        while let sigue = Clases.cal.date(byAdding: .day, value: 1, to: noche), sigue <= fin {
            cambios.append(sigue)
            noche = sigue
        }
        let fechas = Array(Set(cambios.filter { $0 > ahora && $0 <= fin } + [fin])).sorted()
        completion(Timeline(entries: ([ahora] + fechas).map { Entrada(date: $0, resumen: resumen, relevance: Clases.relevancia(resumen, $0)) },
                            policy: .after(fin)))
    }
}

// 0.5 s: qué clase, a qué hora y en qué sala. Sin notas ni semáforo: no hay
// nada que aprobar acá. El color del ramo va en su línea lateral, como en Inicio.
struct ProximaClaseVista: View {
    @Environment(\.widgetFamily) var familia
    let entrada: Entrada

    var body: some View {
        let ahora = entrada.date
        let vigentes = Clases.vencido(entrada.resumen, ahora) ? [] : Clases.vigentes(entrada.resumen, desde: ahora)
        Group {
            switch familia {
            case .accessoryInline:
                if let o = vigentes.first {
                    Text([o.clase.sigla ?? o.clase.ramo, Clases.hora(o, ahora), o.clase.sala].compactMap { $0 }.joined(separator: " · "))
                        .privacySensitive()
                } else { Text(corto) }
            case .accessoryCircular:
                circular(vigentes.first)
            case .accessoryRectangular:
                if let o = vigentes.first {
                    VStack(alignment: .leading, spacing: 1) {
                        Text("\(Clases.cuando(o, ahora)) · \(Clases.hora(o, ahora))")
                            .font(.headline).monospacedDigit().widgetAccentable().lineLimit(1).minimumScaleFactor(0.8)
                        Text(o.clase.ramo).font(.subheadline).lineLimit(1).privacySensitive()
                        if let lugar = Clases.lugar(o.clase) {
                            Text(lugar).font(.caption).foregroundStyle(.secondary).lineLimit(1).privacySensitive()
                        }
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                } else {
                    Text(corto).font(.subheadline)
                }
            case .systemMedium:
                if let o = vigentes.first {
                    HStack(alignment: .top, spacing: 16) {
                        tarjeta(o).frame(maxWidth: .infinity, alignment: .leading)
                        despues(Array(vigentes.dropFirst().prefix(3))).frame(maxWidth: .infinity, alignment: .leading)
                    }
                } else { vacio }
            default:
                if let o = vigentes.first { tarjeta(o) } else { vacio }
            }
        }
        .widgetURL(vigentes.first.map { Clases.enlace($0.clase) } ?? URL(string: "cl.gradehub.app://inicio"))
    }

    // Por qué no hay clase que mostrar. Sin resumen, sin horario o sin datos recientes.
    var motivo: (titulo: String, detalle: String?) {
        guard let r = entrada.resumen else { return ("Abre GradeHub para ver tus clases", nil) }
        if Clases.vencido(r, entrada.date) { return ("Abre GradeHub", "Tu horario lleva más de una semana sin actualizarse.") }
        if (r.clasesProximas?.lista ?? []).isEmpty { return ("Sin horario todavía", "Agrégalo en la ficha de cada ramo.") }
        return ("Sin clases por venir", nil)
    }
    var corto: String {
        guard let r = entrada.resumen, !Clases.vencido(r, entrada.date) else { return "Abre GradeHub" }
        return (r.clasesProximas?.lista ?? []).isEmpty ? "Sin horario todavía" : "Sin clases por venir"
    }

    func tarjeta(_ o: Clases.Ocurrencia) -> some View {
        let ahora = entrada.date, c = o.clase
        return VStack(alignment: .leading, spacing: 2) {
            Text(Clases.cuando(o, ahora).uppercased()).font(.caption2.weight(.semibold)).foregroundStyle(.secondary)
            Spacer(minLength: 0)
            HStack(alignment: .top, spacing: 8) {
                Rectangle().fill(Color(hexRamo: Clases.color(c, entrada.resumen))).frame(width: 3)
                VStack(alignment: .leading, spacing: 2) {
                    // Primero qué clase; después la hora, que es lo que se viene a mirar.
                    Text(c.ramo).font(.headline).lineLimit(2).minimumScaleFactor(0.7).privacySensitive()
                    Text("\(c.inicio)–\(c.fin)").font(.headline).monospacedDigit().lineLimit(1).minimumScaleFactor(0.7)
                        .padding(.top, 4)
                    if let lugar = Clases.lugar(c) {
                        Text(lugar).font(.caption).foregroundStyle(.secondary).lineLimit(1).minimumScaleFactor(0.8)
                            .privacySensitive()
                    }
                }
            }
            .fixedSize(horizontal: false, vertical: true)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .accessibilityElement(children: .combine)
    }

    // Las que siguen. Cada fila abre su ramo.
    func despues(_ lista: [Clases.Ocurrencia]) -> some View {
        let ahora = entrada.date
        return VStack(alignment: .leading, spacing: 10) {
            Text("DESPUÉS").font(.caption2.weight(.semibold)).foregroundStyle(.secondary)
            if lista.isEmpty {
                Text("Nada más por ahora").font(.subheadline).foregroundStyle(.secondary)
            }
            ForEach(Array(lista.enumerated()), id: \.offset) { _, o in
                Link(destination: Clases.enlace(o.clase)) {
                    HStack(spacing: 8) {
                        RoundedRectangle(cornerRadius: 1.5).fill(Color(hexRamo: Clases.color(o.clase, entrada.resumen))).frame(width: 3)
                        VStack(alignment: .leading, spacing: 0) {
                            Text(o.clase.ramo).font(.subheadline.weight(.semibold)).lineLimit(1).minimumScaleFactor(0.75)
                                .privacySensitive()
                            Text("\(Clases.cuando(o, ahora)) · \(o.clase.inicio)\(o.clase.sala.map { " · \($0)" } ?? "")")
                                .font(.caption).monospacedDigit().foregroundStyle(.secondary).lineLimit(1).minimumScaleFactor(0.8)
                                .privacySensitive()
                        }
                        Spacer(minLength: 0)
                    }
                    .fixedSize(horizontal: false, vertical: true)
                }
            }
            Spacer(minLength: 0)
        }
    }

    // Bloqueo, circular: la hora de inicio y la sigla. En clase, un anillo que el
    // sistema llena solo hasta el fin (no gasta recargas) y la hora de término.
    func circular(_ o: Clases.Ocurrencia?) -> some View {
        let ahora = entrada.date
        return ZStack {
            AccessoryWidgetBackground()
            if let o {
                if Clases.enCurso(o, ahora) {
                    ProgressView(timerInterval: o.inicio...o.fin, countsDown: false) { EmptyView() } currentValueLabel: { EmptyView() }
                        .progressViewStyle(.circular).widgetAccentable()
                }
                VStack(spacing: 0) {
                    Text(Clases.enCurso(o, ahora) ? o.clase.fin : o.clase.inicio)
                        .font(.system(.headline, design: .rounded)).monospacedDigit().minimumScaleFactor(0.6)
                    Text(o.clase.sigla ?? o.clase.ramo).font(.system(size: 11, weight: .medium))
                        .lineLimit(1).minimumScaleFactor(0.6).privacySensitive()
                }
                .padding(6)
            } else {
                Image(systemName: "calendar").font(.title3)
            }
        }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(o.map { Clases.enCurso($0, ahora) ? "En clase de \($0.clase.ramo) hasta las \($0.clase.fin)" : "\($0.clase.ramo) a las \($0.clase.inicio)" } ?? corto)
    }

    var vacio: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text("PRÓXIMA CLASE").font(.caption2.weight(.semibold)).foregroundStyle(.secondary)
            Spacer(minLength: 0)
            Text(motivo.titulo).font(.subheadline)
            if let d = motivo.detalle { Text(d).font(.caption).foregroundStyle(.secondary) }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

struct ProximaClaseWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "proxima-clase", provider: ProveedorClases()) { entrada in
            ProximaClaseVista(entrada: entrada).containerBackground(.background, for: .widget)
        }
        .configurationDisplayName("Próxima clase")
        .description("Qué clase te toca, a qué hora y en qué sala.")
        .supportedFamilies([.systemSmall, .systemMedium, .accessoryCircular, .accessoryRectangular, .accessoryInline])
    }
}

// MARK: - Estadísticas configurable (#638)

enum Estadistica: String, AppEnum {
    case rango, exigente
    static var typeDisplayRepresentation: TypeDisplayRepresentation = "Estadística"
    static var caseDisplayRepresentations: [Estadistica: DisplayRepresentation] = [
        .rango: "Rango del semestre",
        .exigente: "Lo que más te exige",
    ]
}

struct ElegirEstadistica: WidgetConfigurationIntent {
    static var title: LocalizedStringResource = "Estadística"
    static var description = IntentDescription("Elige qué estadística ver.")
    @Parameter(title: "Mostrar", default: .rango) var estadistica: Estadistica
}

struct EntradaEstadistica: TimelineEntry {
    let date: Date
    let resumen: Resumen?
    let estadistica: Estadistica
}

// Nada depende de la hora: cambia solo cuando la app guarda un resumen nuevo.
struct ProveedorEstadistica: AppIntentTimelineProvider {
    func placeholder(in context: Context) -> EntradaEstadistica { EntradaEstadistica(date: .now, resumen: nil, estadistica: .rango) }
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
        case .rango:
            if let r = s.rango {
                HStack(alignment: .firstTextBaseline, spacing: 6) {
                    Text(Nota.coma(r.piso)).foregroundStyle(Semaforo.color(r.nivelPiso, esquema))
                    Text("y").font(.title3.weight(.semibold)).foregroundStyle(.tertiary)
                    Text(Nota.coma(r.techo)).foregroundStyle(Semaforo.color(r.nivelTecho, esquema))
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
                                Text(Nota.coma(n)).font(.system(size: 36, weight: .medium)).monospacedDigit()
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
        .description("Elige qué ver: el rango de tu promedio o lo que más te exige.")
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
            // Igual que los avisos (Lucas, 15-11): sin «repaso» ni «agua».
            Fase(id: "Estudia", icono: "book", desde: m(horasAntes * 60), hasta: m(15)),
            Fase(id: "Sala", icono: "figure.walk", desde: m(15), hasta: e.inicio),
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
        .accessibilityLabel("Estudia, camina a la sala a las \(Hora.de(Fase.de(estado)[1].desde)) y prueba a las \(Hora.de(estado.inicio))")
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
        ProximaClaseWidget()
        EstadisticasWidget()
        ActividadPruebaWidget()
    }
}
