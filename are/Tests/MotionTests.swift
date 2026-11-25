// MAZI'S ARE 1 · pruebas del núcleo (orientación y frecuencia). Corren sin hardware.
import XCTest
@testable import MaziXRCore

final class MotionTests: XCTestCase {
    let tol = 1e-6

    func testIdentidadEsCero() {
        let e = Orientacion.euler(.identidad)
        XCTAssertEqual(e.roll, 0, accuracy: tol); XCTAssertEqual(e.pitch, 0, accuracy: tol); XCTAssertEqual(e.yaw, 0, accuracy: tol)
    }

    func testCadaEjePorSeparado() {
        let r = Orientacion.euler(.eje(1, 0, 0, angulo: .pi / 6))   // 30° de roll
        XCTAssertEqual(r.roll, 30, accuracy: 1e-9); XCTAssertEqual(r.pitch, 0, accuracy: 1e-9); XCTAssertEqual(r.yaw, 0, accuracy: 1e-9)
        let p = Orientacion.euler(.eje(0, 1, 0, angulo: .pi / 4))   // 45° de pitch
        XCTAssertEqual(p.pitch, 45, accuracy: 1e-9)
        let y = Orientacion.euler(.eje(0, 0, 1, angulo: -.pi / 2))  // −90° de yaw
        XCTAssertEqual(y.yaw, -90, accuracy: 1e-9)
    }

    func testOrdenZYX() {
        // yaw 40°, luego pitch 20°, luego roll 10° (Z·Y·X) debe regresar exactamente esos tres
        let q = Cuaternion.eje(0, 0, 1, angulo: 40 * .pi / 180) * Cuaternion.eje(0, 1, 0, angulo: 20 * .pi / 180) * Cuaternion.eje(1, 0, 0, angulo: 10 * .pi / 180)
        let e = Orientacion.euler(q)
        XCTAssertEqual(e.yaw, 40, accuracy: 1e-9); XCTAssertEqual(e.pitch, 20, accuracy: 1e-9); XCTAssertEqual(e.roll, 10, accuracy: 1e-9)
    }

    func testPitchEnElLimiteNoDaNaN() {
        // un cuaternión con un poquito de error numérico justo en 90°: asin recibiría 1.0000001
        let q = Cuaternion(x: 0, y: 0.70710679, z: 0, w: 0.70710679)
        let e = Orientacion.euler(q)
        XCTAssertFalse(e.pitch.isNaN); XCTAssertEqual(e.pitch, 90, accuracy: 1e-3)
    }

    func testCuaternionSinNormalizar() {
        let q = Cuaternion.eje(0, 0, 1, angulo: .pi / 3)
        let doble = Cuaternion(x: q.x * 2, y: q.y * 2, z: q.z * 2, w: q.w * 2)
        XCTAssertEqual(Orientacion.euler(doble).yaw, 60, accuracy: 1e-9)
        XCTAssertEqual(Orientacion.euler(Cuaternion(x: 0, y: 0, z: 0, w: 0)), Euler(roll: 0, pitch: 0, yaw: 0))
    }

    func testAnguloEntreOrientaciones() {
        let a = Cuaternion.eje(0, 0, 1, angulo: 170 * .pi / 180), b = Cuaternion.eje(0, 0, 1, angulo: -170 * .pi / 180)
        XCTAssertEqual(Orientacion.angulo(a, b), 20, accuracy: 1e-6)            // cruzar ±180° son 20°, no 340°
        let c = Cuaternion(x: -a.x, y: -a.y, z: -a.z, w: -a.w)
        XCTAssertEqual(Orientacion.angulo(a, c), 0, accuracy: 1e-4)             // q y −q son la misma orientación
    }

    func testMedidorDeFrecuencia() {
        var m = MedidorFrecuencia()
        XCTAssertEqual(m.hz, 0)
        m.marcar(10); XCTAssertEqual(m.hz, 0)                                    // una sola lectura no da frecuencia
        for i in 1...200 { m.marcar(10 + Double(i) / 100) }                    // 100 Hz durante 2 s
        XCTAssertEqual(m.hz, 100, accuracy: 0.5)
        m.marcar(30); m.marcar(30.5)                                             // se paró y volvió: sólo cuentan las del último segundo
        XCTAssertEqual(m.hz, 2, accuracy: 1e-9)
    }
}
