// MAZI'S ARE 1 · Hardware · el DualShock 4 (GameController): botones, palancas, touchpad y giroscopio (GCMotion).
// Lo que no se puede: la POSICIÓN del control. GCMotion da orientación, giro y aceleración; para saber dónde está el
// control en el cuarto haría falta otro sistema de seguimiento. No se simula.
import Foundation
import GameController

final class DualShockManager: ObservableObject {
    @Published private(set) var conectado = false
    @Published private(set) var nombre = ""
    @Published private(set) var perfil = ""
    @Published private(set) var apretados: Set<String> = []
    @Published private(set) var vistos: Set<String> = []
    @Published private(set) var palancas: [Double] = [0, 0, 0, 0]   // izq x, izq y, der x, der y
    @Published private(set) var gatillos: [Double] = [0, 0]         // L2, R2 (0…1)
    @Published private(set) var touchpad: (x: Double, y: Double)? = nil

    @Published private(set) var tieneMovimiento = false
    @Published private(set) var tieneOrientacion = false
    @Published private(set) var sensoresActivos = false
    @Published private(set) var orientacion: Cuaternion? = nil
    @Published private(set) var giro: [Double] = [0, 0, 0]          // rad/s
    @Published private(set) var gravedad: [Double] = [0, 0, 0]      // g
    @Published private(set) var aceleracion: [Double] = [0, 0, 0]   // g, sin la gravedad
    @Published private(set) var giroMaximo: Double = 0
    @Published private(set) var hzMovimiento: Double = 0

    private var medidor = MedidorFrecuencia()
    private var observadores: [NSObjectProtocol] = []

    init() {
        let nc = NotificationCenter.default
        observadores.append(nc.addObserver(forName: .GCControllerDidConnect, object: nil, queue: .main) { [weak self] n in
            self?.conectar(n.object as? GCController)
        })
        observadores.append(nc.addObserver(forName: .GCControllerDidDisconnect, object: nil, queue: .main) { [weak self] _ in
            self?.conectado = false; self?.apretados = []
            self?.conectar(GCController.controllers().first)
        })
        conectar(GCController.controllers().first)
    }

    deinit { observadores.forEach(NotificationCenter.default.removeObserver) }

    private func conectar(_ c: GCController?) {
        guard let c, let g = c.extendedGamepad else { return }
        conectado = true
        nombre = c.vendorName ?? "Control"
        if g is GCDualShockGamepad { perfil = "DualShock 4" }
        else if g is GCDualSenseGamepad { perfil = "DualSense" }
        else { perfil = "Genérico" }
        g.valueChangedHandler = { [weak self] g, _ in self?.leer(g) }
        leer(g)

        if let m = c.motion {
            tieneMovimiento = true
            // algunos controles traen los sensores apagados para ahorrar batería: se prenden a mano
            if m.sensorsRequireManualActivation { m.sensorsActive = true }
            sensoresActivos = m.sensorsActive
            tieneOrientacion = m.hasAttitude
            m.valueChangedHandler = { [weak self] m in self?.leerMovimiento(m) }
        } else {
            tieneMovimiento = false
        }
    }

    private func leer(_ g: GCExtendedGamepad) {
        var a: Set<String> = []
        func b(_ boton: GCControllerButtonInput?, _ n: String) { if boton?.isPressed == true { a.insert(n) } }
        b(g.buttonA, "Cruz"); b(g.buttonB, "Círculo"); b(g.buttonX, "Cuadrado"); b(g.buttonY, "Triángulo")
        b(g.leftShoulder, "L1"); b(g.rightShoulder, "R1"); b(g.leftTrigger, "L2"); b(g.rightTrigger, "R2")
        b(g.leftThumbstickButton, "L3"); b(g.rightThumbstickButton, "R3")
        b(g.dpad.up, "Arriba"); b(g.dpad.down, "Abajo"); b(g.dpad.left, "Izquierda"); b(g.dpad.right, "Derecha")
        b(g.buttonMenu, "Options"); b(g.buttonOptions, "Share")
        if let ds = g as? GCDualShockGamepad {
            b(ds.touchpadButton, "Touchpad")
            if let t = ds.touchpadPrimary, t.xAxis.value != 0 || t.yAxis.value != 0 {
                touchpad = (Double(t.xAxis.value), Double(t.yAxis.value))
            } else { touchpad = nil }
        }
        apretados = a
        vistos.formUnion(a)
        palancas = [g.leftThumbstick.xAxis.value, g.leftThumbstick.yAxis.value, g.rightThumbstick.xAxis.value, g.rightThumbstick.yAxis.value].map(Double.init)
        gatillos = [Double(g.leftTrigger.value), Double(g.rightTrigger.value)]
    }

    private func leerMovimiento(_ m: GCMotion) {
        giro = [m.rotationRate.x, m.rotationRate.y, m.rotationRate.z]
        gravedad = [m.gravity.x, m.gravity.y, m.gravity.z]
        aceleracion = [m.userAcceleration.x, m.userAcceleration.y, m.userAcceleration.z]
        if m.hasAttitude { orientacion = Cuaternion(x: m.attitude.x, y: m.attitude.y, z: m.attitude.z, w: m.attitude.w) }
        giroMaximo = max(giroMaximo, (giro[0] * giro[0] + giro[1] * giro[1] + giro[2] * giro[2]).squareRoot())
        medidor.marcar(ProcessInfo.processInfo.systemUptime)
        hzMovimiento = medidor.hz
        sensoresActivos = m.sensorsActive
    }
}
