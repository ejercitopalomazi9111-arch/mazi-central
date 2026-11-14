import UIKit
import Capacitor

/// El controlador de CARYMO: el de Capacitor, más el puente con los widgets de la pantalla de inicio.
class MainViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(CarymoWidgetPlugin())
    }
}
