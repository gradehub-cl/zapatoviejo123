import ActivityKit
import Capacitor
import WidgetKit

// Puente de la app web a los widgets (#634). La web calcula el resumen con el
// mismo motor de siempre y lo entrega ya hecho; acá solo se guarda en el
// espacio compartido (App Group) y se avisa a los widgets que lo relean.
// Los widgets nunca calculan notas: así no pueden contradecir a la app.
@objc(GradeHubWidgetsPlugin)
public class GradeHubWidgetsPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "GradeHubWidgetsPlugin"
    public let jsName = "GradeHubWidgets"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "guardarResumen", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "borrarResumen", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "sincronizarActividades", returnType: CAPPluginReturnPromise),
    ]

    static let grupo = "group.cl.gradehub.app"
    static let clave = "resumen.v1"
    // Un resumen sano pesa unos pocos KB; algo mucho más grande es un error.
    static let maximoBytes = 200_000

    @objc func guardarResumen(_ call: CAPPluginCall) {
        guard let json = call.getString("json"),
              json.utf8.count <= Self.maximoBytes,
              let datos = json.data(using: .utf8),
              (try? JSONSerialization.jsonObject(with: datos)) is [String: Any],
              let compartido = UserDefaults(suiteName: Self.grupo) else {
            call.reject("Resumen inválido")
            return
        }
        compartido.set(json, forKey: Self.clave)
        WidgetCenter.shared.reloadAllTimelines()
        call.resolve()
    }

    // Al cerrar sesión: que no queden notas de una cuenta en la pantalla de inicio.
    @objc func borrarResumen(_ call: CAPPluginCall) {
        UserDefaults(suiteName: Self.grupo)?.removeObject(forKey: Self.clave)
        WidgetCenter.shared.reloadAllTimelines()
        call.resolve()
    }

    // Deja exactamente las Actividades en Vivo que la app pide: inicia las que
    // faltan y termina las que ya no corresponden (pasó la prueba, se borró la
    // evaluación, se apagaron los avisos o se cerró sesión). La web decide cuáles.
    @objc func sincronizarActividades(_ call: CAPPluginCall) {
        guard #available(iOS 16.2, *) else { call.resolve(["iniciadas": 0]); return }
        let pedidas = (call.getArray("actividades") as? [[String: Any]] ?? []).compactMap(Self.actividad)
        let claves = Set(pedidas.map { $0.0.clave })
        Task {
            for a in Activity<ActividadPruebaAtributos>.activities where !claves.contains(a.attributes.clave) {
                await a.end(nil, dismissalPolicy: .immediate)
            }
            var iniciadas = 0
            if ActivityAuthorizationInfo().areActivitiesEnabled {
                let vigentes = Set(Activity<ActividadPruebaAtributos>.activities.map { $0.attributes.clave })
                for (atributos, estado) in pedidas where !vigentes.contains(atributos.clave) {
                    // Pasada la hora de inicio, la tarjeta cambia a "Suerte" sola
                    // (isStale), sin que la app tenga que estar abierta.
                    let contenido = ActivityContent(state: estado, staleDate: estado.inicio)
                    if (try? Activity.request(attributes: atributos, content: contenido, pushType: nil)) != nil { iniciadas += 1 }
                }
            }
            call.resolve(["iniciadas": iniciadas])
        }
    }

    static func actividad(_ d: [String: Any]) -> (ActividadPruebaAtributos, ActividadPruebaAtributos.ContentState)? {
        guard let clave = d["clave"] as? String, let ramoId = d["ramoId"] as? String,
              let ramo = d["ramo"] as? String, let evaluacion = d["evaluacion"] as? String,
              let inicioMs = d["inicio"] as? Double, let finMs = d["fin"] as? Double, finMs > inicioMs else { return nil }
        let atributos = ActividadPruebaAtributos(clave: clave, ramoId: ramoId, ramo: ramo, sigla: d["sigla"] as? String,
                                                 color: d["color"] as? String, evaluacion: evaluacion, sala: d["sala"] as? String)
        return (atributos, .init(inicio: Date(timeIntervalSince1970: inicioMs / 1000), fin: Date(timeIntervalSince1970: finMs / 1000)))
    }

    #if DEBUG
    // Solo para desarrollo: `xcrun simctl launch booted cl.gradehub.app -gradehubDemoActividad`
    // muestra una Actividad con datos inventados, sin iniciar sesión.
    static func iniciarDemo() {
        guard #available(iOS 16.2, *) else { return }
        let ahora = Date()
        let datos: [String: Any] = ["clave": "demo", "ramoId": "demo", "ramo": "Cálculo II", "sigla": "MAT1620", "color": "#7F77DD",
                                    "evaluacion": "Interrogación 2", "sala": "B12",
                                    "inicio": (ahora.timeIntervalSince1970 + 25 * 60) * 1000, "fin": (ahora.timeIntervalSince1970 + 145 * 60) * 1000]
        guard let (a, e) = actividad(datos) else { return }
        _ = try? Activity.request(attributes: a, content: ActivityContent(state: e, staleDate: e.inicio), pushType: nil)
    }
    #endif
}

