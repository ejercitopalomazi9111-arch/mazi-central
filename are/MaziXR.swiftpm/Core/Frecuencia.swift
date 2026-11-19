// MAZI'S ARE 1 · Core · cada cuánto llega un dato (sensores, cámara, control)
import Foundation

/// Cuenta cuántas lecturas llegaron en el último segundo. El reloj se pasa de fuera para poder probarlo.
public struct MedidorFrecuencia {
    public let ventana: Double
    private var marcas: [Double] = []
    public init(ventana: Double = 1) { self.ventana = ventana }

    /// Apunta una lectura en el segundo `t` (el `timestamp` del sensor o `CACurrentMediaTime()`).
    public mutating func marcar(_ t: Double) {
        marcas.append(t)
        let corte = t - ventana
        if let i = marcas.firstIndex(where: { $0 > corte }), i > 0 { marcas.removeFirst(i) }
    }

    /// Lecturas por segundo. Con menos de dos lecturas da 0: no inventa.
    public var hz: Double {
        guard marcas.count >= 2, let a = marcas.first, let b = marcas.last, b > a else { return 0 }
        return Double(marcas.count - 1) / (b - a)
    }
}
