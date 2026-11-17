import AppIntents
import Foundation

// Siri, Atajos y Spotlight. Responden sin abrir la app leyendo el mismo
// resumen que los widgets (Shared/Resumen.swift). Acá no se calcula ninguna
// nota: "necesitas" ya viene escrito por la app (notaParaIrConCuatro).
// Dicen nombres de ramos, salas y notas en voz alta: con el iPhone bloqueado,
// Siri pide desbloquear antes de responder, como los widgets ocultan lo mismo.

enum Atajos {
    static func clase(_ r: Resumen?, ahora: Date) -> String {
        guard let r else { return "Abre la app para ver tus clases." }
        guard let c = Horario.vigentes(r, ahora).first else {
            return Horario.todas(r).isEmpty ? "Agrega tu horario en la app." : "Abre la app para ver tus próximas clases."
        }
        let sala = c.sala.flatMap { $0.isEmpty ? nil : ", sala \($0)" } ?? ""
        if Horario.enCurso(c, ahora) { return "Estás en \(c.ramo) hasta las \(c.fin)\(sala)." }
        return "\(Horario.dia(c, ahora)) a las \(c.inicio): \(c.ramo)\(sala)."
    }

    static func nota(_ r: Resumen?, ahora: Date) -> String {
        guard let r else { return "Abre la app para ver tus evaluaciones." }
        guard let e = Fechas.proxima(r, desde: ahora) else { return "No tienes evaluaciones por venir." }
        let n = Fechas.diasHasta(e.fecha, desde: ahora) ?? 0
        let dia = n == 0 ? "hoy" : n == 1 ? "mañana" : "en \(n) días"
        let cuando = e.hora.map { "\(dia) a las \($0)" } ?? dia
        let que = "\(e.evaluacion) de \(e.ramo), \(cuando)"
        if let necesitas = e.necesitas { return "\(que): necesitas un \(necesitas) para ir con 4." }
        if e.inalcanzable == true { return "\(que): sola no alcanza para el 4." }
        if e.margen == true { return "\(que): sigues con 4 aunque te vaya mal." }
        return "Tu próxima evaluación es \(que)."
    }
}

@available(iOS 17.0, *)
struct ProximaClaseIntent: AppIntent {
    static var title: LocalizedStringResource = "Próxima clase"
    static var description = IntentDescription("Qué clase tienes ahora o la siguiente, a qué hora y en qué sala.")
    static var authenticationPolicy: IntentAuthenticationPolicy = .requiresAuthentication

    func perform() async throws -> some IntentResult & ReturnsValue<String> & ProvidesDialog {
        let texto = Atajos.clase(Almacen.leer(), ahora: .now)
        return .result(value: texto, dialog: "\(texto)")
    }
}

@available(iOS 17.0, *)
struct NotaNecesariaIntent: AppIntent {
    static var title: LocalizedStringResource = "Nota que necesito"
    static var description = IntentDescription("Tu próxima evaluación y la nota que necesitas en ella para ir con 4.")
    static var authenticationPolicy: IntentAuthenticationPolicy = .requiresAuthentication

    func perform() async throws -> some IntentResult & ReturnsValue<String> & ProvidesDialog {
        let texto = Atajos.nota(Almacen.leer(), ahora: .now)
        return .result(value: texto, dialog: "\(texto)")
    }
}

// Las frases van también en es.lproj/AppShortcuts.strings: el proyecto es "en"
// y sin esa traducción Siri en español no las reconoce.
@available(iOS 17.0, *)
struct GradeHubAtajos: AppShortcutsProvider {
    static var appShortcuts: [AppShortcut] {
        AppShortcut(intent: ProximaClaseIntent(), phrases: [
            "¿Qué clase tengo ahora en \(.applicationName)?",
            "¿Qué clase tengo en \(.applicationName)?",
            "Mi próxima clase en \(.applicationName)",
            "¿Dónde es mi clase en \(.applicationName)?"
        ], shortTitle: "Próxima clase", systemImageName: "clock")
        AppShortcut(intent: NotaNecesariaIntent(), phrases: [
            "¿Qué nota necesito en \(.applicationName)?",
            "¿Cuánto necesito en \(.applicationName)?",
            "Mi próxima evaluación en \(.applicationName)"
        ], shortTitle: "Nota que necesito", systemImageName: "graduationcap")
    }
}
