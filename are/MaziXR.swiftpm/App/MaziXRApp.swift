// MAZI'S ARE 1 · la app nativa (Augmented Reality Environment). Hoy: el laboratorio de sensores (Hito 01).
// Lo que ya funciona en la web (vr/) sigue ahí; esto existe para lo que la web no puede: ARKit (6DoF, anclar cosas
// en el cuarto) y el giroscopio del DualShock 4.
import SwiftUI

@main
struct MaziXRApp: App {
    var body: some Scene {
        WindowGroup { DiagnosticView() }
    }
}
