// MAZI'S ARE 1 · Hardware · sensores del teléfono (CoreMotion): la orientación de la cabeza, 3DoF.
// OJO: esto NO es 6DoF. CoreMotion da hacia dónde mira el teléfono (roll, pitch, yaw), no dónde está. La posición
// (6DoF) llega en el Hito 03 con ARKit.
import CoreMotion
import Foundation

final class MotionManager: ObservableObject {
    @Published private(set) var disponible = false
    @Published private(set) var cuaternion = Cuaternion.identidad
    @Published private(set) var euler = Euler(roll: 0, pitch: 0, yaw: 0)
    @Published private(set) var hz: Double = 0
    @Published private(set) var giroMaximo: Double = 0       // grados desde la primera lectura

    private let cm = CMMotionManager()
    private var medidor = MedidorFrecuencia()
    private var inicial: Cuaternion?

    func iniciar() {
        disponible = cm.isDeviceMotionAvailable
        guard disponible, !cm.isDeviceMotionActive else { return }
        cm.deviceMotionUpdateInterval = 1.0 / 100.0
        // xArbitraryZVertical: el yaw arranca donde mires, sin brújula (la brújula se va con imanes cerca del visor)
        cm.startDeviceMotionUpdates(using: .xArbitraryZVertical, to: .main) { [weak self] m, _ in
            guard let self, let m else { return }
            let q = m.attitude.quaternion
            let c = Cuaternion(x: q.x, y: q.y, z: q.z, w: q.w)
            self.cuaternion = c
            self.euler = Orientacion.euler(c)
            self.medidor.marcar(m.timestamp)
            self.hz = self.medidor.hz
            if self.inicial == nil { self.inicial = c }
            if let i = self.inicial { self.giroMaximo = max(self.giroMaximo, Orientacion.angulo(i, c)) }
        }
    }

    func detener() { cm.stopDeviceMotionUpdates() }
}
