import ActivityKit
import AppIntents
import Foundation

// La Actividad en Vivo de una evaluación (#645). Lo comparten la app (que la
// inicia y la termina) y la extensión de widgets (que la dibuja). No lleva
// notas: solo qué evaluación es, dónde y cuándo, y cómo dijo la persona que
// le fue (una sensación, no una nota).
struct ActividadPruebaAtributos: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        var inicio: Date
        var fin: Date
        // 1 = muy mal … 5 = muy bien. Opcional: las Actividades de antes no lo traen.
        var sensacion: Int? = nil
    }
    var clave: String
    var ramoId: String
    var ramo: String
    var sigla: String?
    var color: String?
    var evaluacion: String
    var sala: String?
}

enum Sensacion {
    static let textos = ["Muy mal", "Mal", "Normal", "Bien", "Muy bien"]
    static func texto(_ v: Int) -> String { textos.indices.contains(v - 1) ? textos[v - 1] : "" }

    // Lo respondido queda en el App Group hasta que la app lo recoge.
    static let grupo = "group.cl.gradehub.app"
    static let clave = "sensaciones.v1"

    static func guardar(clave c: String, valor: Int) {
        guard let compartido = UserDefaults(suiteName: grupo) else { return }
        var todas = compartido.dictionary(forKey: clave) as? [String: [String: Double]] ?? [:]
        todas[c] = ["valor": Double(valor), "fecha": Date().timeIntervalSince1970 * 1000]
        compartido.set(todas, forKey: clave)
        // Aparte, y no se consume: una evaluación ya respondida no vuelve a
        // aparecer aunque la app la pida antes de recoger la respuesta.
        var respondidas = compartido.dictionary(forKey: "respondidas.v1") as? [String: Double] ?? [:]
        let semana = Date().timeIntervalSince1970 - 7 * 86400
        respondidas = respondidas.filter { $0.value > semana }
        respondidas[c] = Date().timeIntervalSince1970
        compartido.set(respondidas, forKey: "respondidas.v1")
    }

    static func respondidas() -> Set<String> {
        Set((UserDefaults(suiteName: grupo)?.dictionary(forKey: "respondidas.v1") ?? [:]).keys)
    }

    // Devuelve lo pendiente y lo borra: la app lo guarda de su lado.
    static func consumir() -> [[String: Any]] {
        guard let compartido = UserDefaults(suiteName: grupo),
              let todas = compartido.dictionary(forKey: clave) as? [String: [String: Double]] else { return [] }
        compartido.removeObject(forKey: clave)
        return todas.compactMap { c, x in
            guard let v = x["valor"] else { return nil }
            return ["clave": c, "valor": Int(v), "fecha": x["fecha"] ?? 0]
        }
    }
}

// Tocar "Bien" en la pantalla de bloqueo, sin abrir la app. Corre en el proceso
// de la app: guarda la respuesta, la muestra y deja que la Actividad se vaya.
@available(iOS 17.0, *)
struct ResponderSensacion: LiveActivityIntent {
    static var title: LocalizedStringResource = "¿Cómo te fue?"
    static var isDiscoverable: Bool = false

    @Parameter(title: "Evaluación") var clave: String
    @Parameter(title: "Cómo te fue") var valor: Int

    init() {}
    init(clave: String, valor: Int) { self.clave = clave; self.valor = valor }

    func perform() async throws -> some IntentResult {
        guard (1...5).contains(valor) else { return .result() }
        Sensacion.guardar(clave: clave, valor: valor)
        for a in Activity<ActividadPruebaAtributos>.activities where a.attributes.clave == clave {
            var estado = a.content.state
            estado.sensacion = valor
            await a.end(ActivityContent(state: estado, staleDate: nil), dismissalPolicy: .after(.now + 30 * 60))
        }
        return .result()
    }
}
