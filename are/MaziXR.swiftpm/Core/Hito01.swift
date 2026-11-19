// MAZI'S ARE 1 · Core · HITO 01 (laboratorio de sensores): cuándo se da por terminado.
// La app junta en `Lectura` lo que el hardware leyó DE VERDAD; aquí se decide, con números, qué criterio se cumplió.
import Foundation

public enum Hito01 {
    public struct Lectura: Equatable {
        public var cabezaHz: Double = 0                // CoreMotion: lecturas por segundo
        public var cabezaGiroMaximo: Double = 0        // grados que llegó a girar el teléfono desde que abrió la app
        public var controlConectado = false
        public var controlPerfil = ""                  // «DualShock 4», «DualSense», «Genérico»
        public var botonesVistos: Set<String> = []     // botones que se apretaron al menos una vez
        public var controlTieneMovimiento = false      // el control reporta GCMotion
        public var controlGiroMaximo: Double = 0       // rad/s más alta que reportó el giroscopio del control
        public var camaraFps: Double = 0
        public init() {}
    }

    public struct Criterio: Equatable {
        public let nombre: String, cumplido: Bool, detalle: String
    }

    /// Los 16 botones del DualShock 4 que se revisan (nombres de PlayStation).
    public static let botones = ["Cruz", "Círculo", "Cuadrado", "Triángulo", "L1", "R1", "L2", "R2", "L3", "R3",
                                 "Arriba", "Abajo", "Izquierda", "Derecha", "Options", "Touchpad"]

    public static func criterios(_ l: Lectura) -> [Criterio] {
        let faltan = botones.filter { !l.botonesVistos.contains($0) }
        return [
            Criterio(nombre: "Sensores del teléfono a 50 Hz o más", cumplido: l.cabezaHz >= 50,
                     detalle: String(format: "%.0f Hz", l.cabezaHz)),
            Criterio(nombre: "El teléfono responde al girar (90° o más)", cumplido: l.cabezaGiroMaximo >= 90,
                     detalle: String(format: "%.0f°", l.cabezaGiroMaximo)),
            Criterio(nombre: "Control conectado", cumplido: l.controlConectado,
                     detalle: l.controlConectado ? l.controlPerfil : "sin control"),
            Criterio(nombre: "Los 16 botones se leen", cumplido: faltan.isEmpty,
                     detalle: faltan.isEmpty ? "16/16" : "faltan: " + faltan.joined(separator: ", ")),
            Criterio(nombre: "El control reporta giroscopio (GCMotion)", cumplido: l.controlTieneMovimiento,
                     detalle: l.controlTieneMovimiento ? "sí" : "no"),
            Criterio(nombre: "El giroscopio del control se mueve (1 rad/s o más)", cumplido: l.controlGiroMaximo >= 1,
                     detalle: String(format: "%.2f rad/s", l.controlGiroMaximo)),
            Criterio(nombre: "Cámara a 24 fps o más", cumplido: l.camaraFps >= 24,
                     detalle: String(format: "%.0f fps", l.camaraFps)),
        ]
    }

    public static func terminado(_ l: Lectura) -> Bool { criterios(l).allSatisfy(\.cumplido) }

    /// Texto para pegar en el chat: el reporte de una prueba REAL en el hardware.
    public static func reporte(_ l: Lectura, equipo: String) -> String {
        var s = "MAZI'S ARE 1 · Hito 01 · \(equipo)\n"
        for c in criterios(l) { s += (c.cumplido ? "[OK] " : "[--] ") + c.nombre + " · " + c.detalle + "\n" }
        s += terminado(l) ? "HITO 01 TERMINADO" : "Hito 01 incompleto"
        return s
    }
}
