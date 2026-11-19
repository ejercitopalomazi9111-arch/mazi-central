// MAZI'S ARE 1 · los criterios del Hito 01 se deciden con números, no a ojo.
import XCTest
@testable import MaziXRCore

final class Hito01Tests: XCTestCase {
    func testSinNadaNoEstaTerminado() {
        let l = Hito01.Lectura()
        XCTAssertFalse(Hito01.terminado(l))
        XCTAssertEqual(Hito01.criterios(l).filter(\.cumplido).count, 0)
    }

    func testTodoCumplido() {
        var l = Hito01.Lectura()
        l.cabezaHz = 100; l.cabezaGiroMaximo = 120; l.controlConectado = true; l.controlPerfil = "DualShock 4"
        l.botonesVistos = Set(Hito01.botones); l.controlTieneMovimiento = true; l.controlGiroMaximo = 3; l.camaraFps = 30
        XCTAssertTrue(Hito01.terminado(l))
        XCTAssertTrue(Hito01.reporte(l, equipo: "iPhone 13").hasSuffix("HITO 01 TERMINADO"))
    }

    func testDiceQueBotonesFaltan() {
        var l = Hito01.Lectura()
        l.botonesVistos = Set(Hito01.botones.filter { $0 != "Touchpad" && $0 != "L3" })
        let c = Hito01.criterios(l).first { $0.nombre.hasPrefix("Los 16") }!
        XCTAssertFalse(c.cumplido)
        XCTAssertEqual(c.detalle, "faltan: L3, Touchpad")
    }

    func testGiroscopioPresenteNoBasta() {
        // que el control diga que tiene giroscopio no prueba que se lea: hace falta movimiento real
        var l = Hito01.Lectura(); l.controlTieneMovimiento = true; l.controlGiroMaximo = 0.2
        let c = Hito01.criterios(l)
        XCTAssertTrue(c[4].cumplido); XCTAssertFalse(c[5].cumplido)
    }
}
