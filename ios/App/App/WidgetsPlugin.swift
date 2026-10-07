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
}
