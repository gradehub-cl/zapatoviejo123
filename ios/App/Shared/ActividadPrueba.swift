import ActivityKit
import Foundation

// La Actividad en Vivo de una evaluación (#645). Lo comparten la app (que la
// inicia y la termina) y la extensión de widgets (que la dibuja). No lleva
// notas: solo qué evaluación es, dónde y cuándo.
struct ActividadPruebaAtributos: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        var inicio: Date
        var fin: Date
    }
    var clave: String
    var ramoId: String
    var ramo: String
    var sigla: String?
    var color: String?
    var evaluacion: String
    var sala: String?
}
