import Foundation
import Capacitor
import WidgetKit

/// Lo que la app (carymo/widget.js) les deja a los widgets: los datos (JSON) y la foto del cuarto (PNG),
/// en el contenedor compartido del App Group, que el widget también puede leer. Luego se les pide repintarse.
@objc(CarymoWidgetPlugin)
public class CarymoWidgetPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "CarymoWidgetPlugin"
    public let jsName = "CarymoWidget"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "guardar", returnType: CAPPluginReturnPromise)
    ]

    static let grupo = "group.mx.grupomazi.carymo"

    @objc func guardar(_ call: CAPPluginCall) {
        guard let dir = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: CarymoWidgetPlugin.grupo) else {
            call.reject("Falta el App Group \(CarymoWidgetPlugin.grupo) en la app")
            return
        }
        do {
            if let datos = call.getString("datos"), !datos.isEmpty {
                try Data(datos.utf8).write(to: dir.appendingPathComponent("widget-datos.json"), options: .atomic)
            }
            if let imagen = call.getString("imagen"), !imagen.isEmpty, let png = Data(base64Encoded: imagen) {
                try png.write(to: dir.appendingPathComponent("widget-cuarto.png"), options: .atomic)
            }
            WidgetCenter.shared.reloadAllTimelines()
            call.resolve()
        } catch {
            call.reject("No se pudo guardar el widget: \(error.localizedDescription)")
        }
    }
}
