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
        CAPPluginMethod(name: "guardarAmigos", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "borrarAmigos", returnType: CAPPluginReturnPromise),
    ]

    // Sale de Firma.xcconfig (vía Info.plist): con otra cuenta de Apple el grupo cambia.
    static let grupo = Bundle.main.object(forInfoDictionaryKey: "GradeHubAppGroup") as? String ?? "group.cl.gradehub.app.shared"
    static let clave = "resumen.v1"
    // «Hoy en la u»: los bloques de clases de los amigos (ver AmigosHoy).
    static let claveAmigos = "amigos.v1"
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
        // Tampoco el horario de los amigos de esa cuenta.
        UserDefaults(suiteName: Self.grupo)?.removeObject(forKey: Self.claveAmigos)
        WidgetCenter.shared.reloadAllTimelines()
        call.resolve()
    }

    // «Hoy en la u»: la app manda los bloques de sus amigos ya filtrados.
    @objc func guardarAmigos(_ call: CAPPluginCall) {
        guard let json = call.getString("json"),
              json.utf8.count <= Self.maximoBytes,
              let datos = json.data(using: .utf8),
              (try? JSONSerialization.jsonObject(with: datos)) is [String: Any],
              let compartido = UserDefaults(suiteName: Self.grupo) else {
            call.reject("Datos inválidos")
            return
        }
        compartido.set(json, forKey: Self.claveAmigos)
        WidgetCenter.shared.reloadTimelines(ofKind: "hoy-en-la-u")
        call.resolve()
    }
    @objc func borrarAmigos(_ call: CAPPluginCall) {
        UserDefaults(suiteName: Self.grupo)?.removeObject(forKey: Self.claveAmigos)
        WidgetCenter.shared.reloadTimelines(ofKind: "hoy-en-la-u")
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
            // Si cambió la hora de una prueba que ya está en pantalla, la clave
            // es la misma (va con la fecha, no con la hora): se actualiza la
            // tarjeta en vez de dejarla con la hora vieja. Una programada que
            // todavía no aparece no se puede reprogramar: se termina y se vuelve
            // a pedir abajo, con su nueva hora de partida.
            let porClave = Dictionary(pedidas.map { ($0.0.clave, $0) }, uniquingKeysWith: { a, _ in a })
            for a in Activity<ActividadPruebaAtributos>.activities where a.content.state.sensacion == nil {
                guard let (_, estado, _) = porClave[a.attributes.clave],
                      a.content.state.inicio != estado.inicio || a.content.state.fin != estado.fin else { continue }
                if Self.esProgramada(a) { await a.end(nil, dismissalPolicy: .immediate) }
                else { await a.update(Self.contenido(estado)) }
            }
            var iniciadas = 0
            if ActivityAuthorizationInfo().areActivitiesEnabled {
                let vigentes = Set(Activity<ActividadPruebaAtributos>.activities
                    .filter { $0.activityState == .active || $0.activityState == .stale || Self.esProgramada($0) }
                    .map { $0.attributes.clave })
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

    @available(iOS 16.2, *)
    static func esProgramada(_ a: Activity<ActividadPruebaAtributos>) -> Bool {
        if #available(iOS 26.0, *) { return a.activityState == .pending }
        return false
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
        // Clases inventadas alrededor de ahora, con el contrato «Próxima clase»
        // (docs/guia/ios.md): una en curso, otra más tarde y una mañana.
        let chile = TimeZone(identifier: "America/Santiago") ?? .current
        let dia = DateFormatter(); dia.locale = f.locale; dia.timeZone = chile; dia.dateFormat = "yyyy-MM-dd"
        let hm = DateFormatter(); hm.locale = f.locale; hm.timeZone = chile; hm.dateFormat = "HH:mm"
        let iso = ISO8601DateFormatter(); iso.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        let ahora = Date()
        let clase = { (ramoId: String, ramo: String, sigla: String, sala: String, tipo: String, enMinutos: Double, dura: Double) -> String in
            let inicio = ahora.addingTimeInterval(enMinutos * 60), fin = inicio.addingTimeInterval(dura * 60)
            return """
            {"id":"\(ramoId):demo:\(Int(enMinutos))","ramoId":"\(ramoId)","ramo":"\(ramo)","sigla":"\(sigla)","fecha":"\(dia.string(from: inicio))",\
            "inicio":"\(hm.string(from: inicio))","fin":"\(hm.string(from: fin))","inicioAt":"\(iso.string(from: inicio))","finAt":"\(iso.string(from: fin))",\
            "sala":"\(sala)","tipo":"\(tipo)","enlace":"cl.gradehub.app://ramo/\(ramoId)"}
            """
        }
        let clases = [clase("demo", "Cálculo II", "MAT1620", "K201", "CLAS", -20, 70),
                      clase("b", "Física", "FIS1514", "Lab 3", "LAB", 80, 70),
                      clase("c", "Programación", "IIC1103", "B12", "AYUD", 24 * 60 - 20, 70),
                      clase("demo", "Cálculo II", "MAT1620", "K201", "CLAS", 48 * 60 - 20, 70)].joined(separator: ",")
        let json = """
        {"version":1,"actualizado":"\(ISO8601DateFormatter().string(from: Date()))","promedio":{"oficial":5.3,"nivel":"good"},
        "zonaHoraria":"America/Santiago","fechaHoy":"\(dia.string(from: ahora))","clasesProximas":[\(clases)],
        "ramos":[{"id":"demo","nombre":"Cálculo II","color":"#7F77DD","promedio":4.6,"nivel":"good"},{"id":"b","nombre":"Física","color":"#1D9E75","promedio":3.8,"nivel":"bad"},
        {"id":"c","nombre":"Programación","color":"#D85A30","promedio":5.9,"nivel":"good"},{"id":"d","nombre":"Economía","color":"#378ADD","promedio":4.2,"nivel":"warn"},
        {"id":"e","nombre":"Química","color":"#BA7517","promedio":6.1,"nivel":"good"},{"id":"f","nombre":"Teología","color":"#D4537E","promedio":5.5,"nivel":"good"}],
        "agenda":[{"ramoId":"demo","ramo":"Cálculo II","sigla":"MAT1620","color":"#7F77DD","evaluacion":"Interrogación 2","fecha":"\(f.string(from: enDosDias))","hora":"17:30","necesitas":"3.7","parte":30},
        {"ramoId":"b","ramo":"Física","sigla":"FIS1514","color":"#1D9E75","evaluacion":"Control 4","fecha":"\(f.string(from: enDosDias.addingTimeInterval(86400)))"},
        {"ramoId":"c","ramo":"Programación","sigla":"IIC1103","color":"#D85A30","evaluacion":"Tarea 3","fecha":"\(f.string(from: enDosDias.addingTimeInterval(4 * 86400)))"},
        {"ramoId":"demo","ramo":"Cálculo II","sigla":"MAT1620","color":"#7F77DD","evaluacion":"Examen","fecha":"\(f.string(from: enDosDias.addingTimeInterval(9 * 86400)))"}]}
        """
        UserDefaults(suiteName: grupo)?.set(json, forKey: clave)
        WidgetCenter.shared.reloadAllTimelines()
    }
    #endif
}
