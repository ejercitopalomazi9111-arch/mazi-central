// swift-tools-version: 5.9
// MAZI'S ARE 1 · proyecto de app para Swift Playgrounds (iPad). Se abre tal cual en el iPad para editar y correr ahí.
// Para el iPhone, la Mac de GitHub arma la .ipa con los mismos archivos (are/project.yml).
// SIN PROBAR EN SWIFT PLAYGROUNDS TODAVÍA: este manifiesto sólo lo lee Swift Playgrounds o Xcode.
import PackageDescription
import AppleProductTypes

let package = Package(
    name: "MaziXR",
    platforms: [.iOS("16.0")],
    products: [
        .iOSApplication(
            name: "MAZI'S ARE 1",
            targets: ["AppModule"],
            bundleIdentifier: "mx.grupomazi.are1",
            teamIdentifier: "",
            displayVersion: "0.1",
            bundleVersion: "1",
            appIcon: .placeholder(icon: .gamepad),
            accentColor: .presetColor(.purple),
            supportedDeviceFamilies: [.pad, .phone],
            supportedInterfaceOrientations: [.portrait, .landscapeRight, .landscapeLeft],
            capabilities: [
                .camera(purposeString: "Para ver tu cuarto dentro del visor y seguir tus manos."),
                .motion(purposeString: "Para saber hacia dónde miras con el visor puesto."),
            ]
        )
    ],
    targets: [
        .executableTarget(name: "AppModule", path: ".")
    ]
)
