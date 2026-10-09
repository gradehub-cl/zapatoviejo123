import Capacitor

// El controlador de Capacitor con los plugins propios de GradeHub registrados.
class MainViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(GradeHubWidgetsPlugin())
        bridge?.registerPluginInstance(GradeHubCanvasPlugin())
    }
}
