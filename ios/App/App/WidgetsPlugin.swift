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
        CAPPluginMethod(name: "leerSensaciones", returnType: CAPPluginReturnPromise),
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
        #if DEBUG
        // Sin sesión la app borra el resumen al arrancar; la demo lo necesita.
        if ProcessInfo.processInfo.arguments.contains("-gradehubDemoWidgets") { call.resolve(); return }
        #endif
        UserDefaults(suiteName: Self.grupo)?.removeObject(forKey: Self.clave)
        WidgetCenter.shared.reloadAllTimelines()
        call.resolve()
    }

    // Deja exactamente las Actividades en Vivo que la app pide: inicia o programa
    // las que faltan y termina las que ya no corresponden (pasó la prueba, se
    // borró la evaluación, se apagaron los avisos o se cerró sesión). La web
    // decide cuáles; cada una trae `desde`, la hora a la que debe aparecer.
    @objc func sincronizarActividades(_ call: CAPPluginCall) {
        guard #available(iOS 16.2, *) else { call.resolve(["iniciadas": 0]); return }
        let respondidas = Sensacion.respondidas()
        let pedidas = (call.getArray("actividades") as? [[String: Any]] ?? []).compactMap(Self.actividad)
            .filter { !respondidas.contains($0.0.clave) }
        let claves = Set(pedidas.map { $0.0.clave })
        Task {
            // Las ya respondidas se quedan su media hora mostrando la respuesta.
            for a in Activity<ActividadPruebaAtributos>.activities
            where !claves.contains(a.attributes.clave) && a.content.state.sensacion == nil {
                #if DEBUG
                if a.attributes.clave.hasPrefix("demo|") { continue } // la de -gradehubDemoActividad
                #endif
                await a.end(nil, dismissalPolicy: .immediate)
            }
            var iniciadas = 0
            if ActivityAuthorizationInfo().areActivitiesEnabled {
                let vigentes = Set(Activity<ActividadPruebaAtributos>.activities.map { $0.attributes.clave })
                for (atributos, estado, desde) in pedidas where !vigentes.contains(atributos.clave) {
                    let contenido = Self.contenido(estado)
                    if desde <= Date() {
                        if (try? Activity.request(attributes: atributos, content: contenido, pushType: nil)) != nil { iniciadas += 1 }
                    } else if #available(iOS 26.0, *) {
                        // Programada: aparece sola a su hora aunque la app esté cerrada.
                        let alerta = AlertConfiguration(title: "\(atributos.evaluacion) a las \(Self.hora(estado.inicio))",
                                                        body: "Te acompaño hasta la prueba.", sound: .default)
                        if (try? Activity.request(attributes: atributos, content: contenido, pushType: nil, style: .standard,
                                                  alertConfiguration: alerta, start: desde)) != nil { iniciadas += 1 }
                    }
                }
            }
            call.resolve(["iniciadas": iniciadas])
        }
    }

    // Lo que se respondió en "¿Cómo te fue?" con la app cerrada.
    @objc func leerSensaciones(_ call: CAPPluginCall) {
        call.resolve(["sensaciones": Sensacion.consumir()])
    }

    // Pasada la hora de inicio, la tarjeta cambia a "Suerte" sola (isStale), sin
    // que la app tenga que estar abierta. Si ya empezó, va sin staleDate: iOS no
    // muestra una Actividad que nace vencida, y la vista ya se dibuja "en curso".
    @available(iOS 16.2, *)
    static func contenido(_ e: ActividadPruebaAtributos.ContentState) -> ActivityContent<ActividadPruebaAtributos.ContentState> {
        ActivityContent(state: e, staleDate: e.inicio > Date() ? e.inicio : nil)
    }

    static func hora(_ d: Date) -> String {
        let f = DateFormatter()
        f.locale = Locale(identifier: "en_US_POSIX")
        f.dateFormat = "H:mm"
        return f.string(from: d)
    }

    static func actividad(_ d: [String: Any]) -> (ActividadPruebaAtributos, ActividadPruebaAtributos.ContentState, Date)? {
        guard let clave = d["clave"] as? String, let ramoId = d["ramoId"] as? String,
              let ramo = d["ramo"] as? String, let evaluacion = d["evaluacion"] as? String,
              let inicioMs = d["inicio"] as? Double, let finMs = d["fin"] as? Double, finMs > inicioMs else { return nil }
        let atributos = ActividadPruebaAtributos(clave: clave, ramoId: ramoId, ramo: ramo, sigla: d["sigla"] as? String,
                                                 color: d["color"] as? String, evaluacion: evaluacion, sala: d["sala"] as? String)
        let inicio = Date(timeIntervalSince1970: inicioMs / 1000)
        let desde = (d["desde"] as? Double).map { Date(timeIntervalSince1970: $0 / 1000) } ?? .distantPast
        return (atributos, .init(inicio: inicio, fin: Date(timeIntervalSince1970: finMs / 1000)), min(desde, inicio))
    }

    #if DEBUG
    // Solo para desarrollo: `xcrun simctl launch booted cl.gradehub.app -gradehubDemoActividad 25`
    // muestra una Actividad con datos inventados, sin iniciar sesión, que empieza
    // en esos minutos.
    static func iniciarDemo() {
        guard #available(iOS 16.2, *) else { return }
        for a in Activity<ActividadPruebaAtributos>.activities { Task { await a.end(nil, dismissalPolicy: .immediate) } }
        let ahora = Date()
        // "n30" = empezó hace 30 minutos (un "-30" lo toma iOS como otro argumento).
        let crudo = UserDefaults.standard.string(forKey: "gradehubDemoActividad") ?? ""
        let minutos = crudo.hasPrefix("n") ? -(Double(crudo.dropFirst()) ?? 0) : Double(crudo) ?? 25
        let inicio = ahora.timeIntervalSince1970 + minutos * 60
        let datos: [String: Any] = ["clave": "demo|\(Int(ahora.timeIntervalSince1970))", "ramoId": "demo", "ramo": "Cálculo II", "sigla": "MAT1620", "color": "#7F77DD",
                                    "evaluacion": "Interrogación 2", "sala": "B12",
                                    "inicio": inicio * 1000, "fin": (inicio + 120 * 60) * 1000]
        guard let (a, e, _) = actividad(datos) else { return }
        _ = try? Activity.request(attributes: a, content: contenido(e), pushType: nil)
    }

    // `-gradehubDemoWidgets`: los widgets con un resumen inventado, sin iniciar sesión.
    static func demoWidgets() {
        let enDosDias = Calendar.current.date(byAdding: .day, value: 2, to: Date()) ?? Date()
        let f = DateFormatter(); f.locale = Locale(identifier: "en_US_POSIX"); f.dateFormat = "yyyy-MM-dd"
        let json = """
        {"version":1,"actualizado":"\(ISO8601DateFormatter().string(from: Date()))","promedio":{"oficial":5.3,"nivel":"good"},
        "ramos":[{"id":"demo","nombre":"Cálculo II","promedio":4.6,"nivel":"good"},{"id":"b","nombre":"Física","promedio":3.8,"nivel":"bad"}],
        "agenda":[{"ramoId":"demo","ramo":"Cálculo II","sigla":"MAT1620","color":"#7F77DD","evaluacion":"Interrogación 2","fecha":"\(f.string(from: enDosDias))","hora":"17:30","necesitas":"3.9","parte":30},
        {"ramoId":"b","ramo":"Física","sigla":"FIS1514","color":"#1D9E75","evaluacion":"Control 4","fecha":"\(f.string(from: enDosDias.addingTimeInterval(86400)))"},
        {"ramoId":"c","ramo":"Programación","sigla":"IIC1103","color":"#D85A30","evaluacion":"Tarea 3","fecha":"\(f.string(from: enDosDias.addingTimeInterval(4 * 86400)))"},
        {"ramoId":"demo","ramo":"Cálculo II","sigla":"MAT1620","color":"#7F77DD","evaluacion":"Examen","fecha":"\(f.string(from: enDosDias.addingTimeInterval(9 * 86400)))"}]}
        """
        UserDefaults(suiteName: grupo)?.set(json, forKey: clave)
        WidgetCenter.shared.reloadAllTimelines()
    }
    #endif
}
