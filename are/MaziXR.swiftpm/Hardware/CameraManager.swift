// MAZI'S ARE 1 · Hardware · la cámara trasera (AVFoundation): sólo mide que llegue imagen y a cuántos cuadros.
// En el Hito 04 el passthrough se toma de la sesión de ARKit (una sola captura); esto es la prueba de hardware.
import AVFoundation
import UIKit

final class CameraManager: NSObject, ObservableObject, AVCaptureVideoDataOutputSampleBufferDelegate {
    @Published private(set) var permiso = "sin pedir"
    @Published private(set) var fps: Double = 0
    @Published private(set) var resolucion = ""

    let sesion = AVCaptureSession()
    private let cola = DispatchQueue(label: "mazi.camara")
    private var medidor = MedidorFrecuencia()

    func iniciar() {
        switch AVCaptureDevice.authorizationStatus(for: .video) {
        case .authorized: configurar()
        case .notDetermined:
            AVCaptureDevice.requestAccess(for: .video) { [weak self] si in
                DispatchQueue.main.async { si ? self?.configurar() : (self?.permiso = "negado") }
            }
        default: permiso = "negado"
        }
    }

    private func configurar() {
        permiso = "dado"
        cola.async { [weak self] in
            guard let self, !self.sesion.isRunning else { return }
            self.sesion.beginConfiguration()
            self.sesion.sessionPreset = .hd1280x720
            if self.sesion.inputs.isEmpty,
               let dispositivo = AVCaptureDevice.default(.builtInWideAngleCamera, for: .video, position: .back),
               let entrada = try? AVCaptureDeviceInput(device: dispositivo), self.sesion.canAddInput(entrada) {
                self.sesion.addInput(entrada)
            }
            let salida = AVCaptureVideoDataOutput()
            salida.alwaysDiscardsLateVideoFrames = true
            salida.setSampleBufferDelegate(self, queue: self.cola)
            if self.sesion.outputs.isEmpty, self.sesion.canAddOutput(salida) { self.sesion.addOutput(salida) }
            self.sesion.commitConfiguration()
            self.sesion.startRunning()
        }
    }

    func captureOutput(_ output: AVCaptureOutput, didOutput sampleBuffer: CMSampleBuffer, from connection: AVCaptureConnection) {
        let t = CMSampleBufferGetPresentationTimeStamp(sampleBuffer).seconds
        medidor.marcar(t)
        let hz = medidor.hz
        var res = ""
        if let img = CMSampleBufferGetImageBuffer(sampleBuffer) { res = "\(CVPixelBufferGetWidth(img))×\(CVPixelBufferGetHeight(img))" }
        DispatchQueue.main.async { self.fps = hz; self.resolucion = res }
    }
}
