// MAZI'S ARE 1 · UI · el laboratorio: qué lee de verdad el hardware, y la lista del Hito 01 que se palomea sola.
import AVFoundation
import SwiftUI
import UIKit

struct DiagnosticView: View {
    @StateObject private var cabeza = MotionManager()
    @StateObject private var control = DualShockManager()
    @StateObject private var camara = CameraManager()
    @State private var copiado = false

    private var lectura: Hito01.Lectura {
        var l = Hito01.Lectura()
        l.cabezaHz = cabeza.hz; l.cabezaGiroMaximo = cabeza.giroMaximo
        l.controlConectado = control.conectado; l.controlPerfil = control.perfil
        l.botonesVistos = control.vistos; l.controlTieneMovimiento = control.tieneMovimiento
        l.controlGiroMaximo = control.giroMaximo; l.camaraFps = camara.fps
        return l
    }

    var body: some View {
        NavigationStack {
            List {
                Section("Hito 01") {
                    ForEach(Hito01.criterios(lectura), id: \.nombre) { c in
                        HStack {
                            Image(systemName: c.cumplido ? "checkmark.circle.fill" : "circle")
                                .foregroundStyle(c.cumplido ? .green : .secondary)
                            Text(c.nombre)
                            Spacer()
                            Text(c.detalle).foregroundStyle(.secondary).font(.caption)
                        }
                    }
                    Button(copiado ? "Copiado" : "Copiar reporte") {
                        UIPasteboard.general.string = Hito01.reporte(lectura, equipo: UIDevice.current.model + " iOS " + UIDevice.current.systemVersion)
                        copiado = true
                    }
                }
                Section("Cabeza") {
                    fila("Roll", cabeza.euler.roll, "°"); fila("Pitch", cabeza.euler.pitch, "°"); fila("Yaw", cabeza.euler.yaw, "°")
                    Text(cuat(cabeza.cuaternion)).font(.caption.monospaced())
                    fila("Frecuencia", cabeza.hz, " Hz")
                }
                Section("Control") {
                    if control.conectado {
                        Text("\(control.perfil) · \(control.nombre)")
                        Text(control.apretados.isEmpty ? "—" : control.apretados.sorted().joined(separator: " "))
                            .font(.title3.bold())
                        Text(String(format: "Palancas %.2f %.2f · %.2f %.2f", control.palancas[0], control.palancas[1], control.palancas[2], control.palancas[3]))
                            .font(.caption.monospaced())
                        Text(String(format: "L2 %.2f · R2 %.2f", control.gatillos[0], control.gatillos[1])).font(.caption.monospaced())
                        if let t = control.touchpad { Text(String(format: "Touchpad %.2f %.2f", t.x, t.y)).font(.caption.monospaced()) }
                        Text("Giroscopio: " + (control.tieneMovimiento ? (control.sensoresActivos ? "activo" : "apagado") : "no"))
                        if control.tieneMovimiento {
                            Text(String(format: "Giro %.2f %.2f %.2f rad/s", control.giro[0], control.giro[1], control.giro[2])).font(.caption.monospaced())
                            Text(String(format: "Gravedad %.2f %.2f %.2f", control.gravedad[0], control.gravedad[1], control.gravedad[2])).font(.caption.monospaced())
                            if let q = control.orientacion { Text(cuat(q)).font(.caption.monospaced()) }
                            else { Text("Sin orientación (sólo giro y aceleración)").font(.caption) }
                            fila("Frecuencia", control.hzMovimiento, " Hz")
                        }
                    } else {
                        Text("Conecta el DualShock 4 por Bluetooth")
                    }
                }
                Section("Cámara") {
                    Text("Permiso: \(camara.permiso)")
                    fila("Cuadros", camara.fps, " fps")
                    Text(camara.resolucion.isEmpty ? "—" : camara.resolucion)
                    VistaCamara(sesion: camara.sesion).frame(height: 160).clipShape(RoundedRectangle(cornerRadius: 8))
                }
            }
            .navigationTitle("MAZI'S ARE 1")
        }
        .onAppear { cabeza.iniciar(); camara.iniciar() }
        .onDisappear { cabeza.detener() }
    }

    private func fila(_ t: String, _ v: Double, _ u: String) -> some View {
        HStack { Text(t); Spacer(); Text(String(format: "%.1f", v) + u).monospacedDigit() }
    }
    private func cuat(_ q: Cuaternion) -> String { String(format: "q = %.3f %.3f %.3f %.3f", q.x, q.y, q.z, q.w) }
}

/// La imagen de la cámara en vivo (sólo para ver que llega).
struct VistaCamara: UIViewRepresentable {
    let sesion: AVCaptureSession
    final class Vista: UIView {
        override class var layerClass: AnyClass { AVCaptureVideoPreviewLayer.self }
        var capa: AVCaptureVideoPreviewLayer { layer as! AVCaptureVideoPreviewLayer }
    }
    func makeUIView(context: Context) -> Vista { let v = Vista(); v.capa.session = sesion; v.capa.videoGravity = .resizeAspectFill; return v }
    func updateUIView(_ v: Vista, context: Context) {}
}
