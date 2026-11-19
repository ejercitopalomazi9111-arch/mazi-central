// swift-tools-version: 5.9
// MAZI'S ARE 1 · el núcleo matemático (Core), probado con `swift test` en Linux y en macOS.
// La app de iPhone/iPad vive en MaziXR.swiftpm (se abre en Swift Playgrounds) y usa estos mismos archivos.
import PackageDescription

let package = Package(
    name: "MaziXRCore",
    products: [.library(name: "MaziXRCore", targets: ["MaziXRCore"])],
    targets: [
        .target(name: "MaziXRCore", path: "MaziXR.swiftpm/Core"),
        .testTarget(name: "MaziXRCoreTests", dependencies: ["MaziXRCore"], path: "Tests"),
    ]
)
