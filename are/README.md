# MAZI'S ARE 1 · Augmented Reality Environment

La realidad mixta de Grupo Mazi en un iPhone dentro de un visor, con un DualShock 4. Tiene dos caras:

| Cara | Dónde | Para qué |
|---|---|---|
| **Web** (Mazi VR) | `vr/` | Ya se usa todos los días: menú, cine, música, lector, juegos, manos, control. Se abre con un link |
| **Nativa** (MAZI XR) | `are/` | Lo que la web **no puede** en iPhone: ARKit (saber dónde estás y anclar cosas en el cuarto) y el giroscopio del DualShock 4 |

La web no se tira: la nativa crece por hitos y va absorbiendo lo que la web no alcanza.

## Estado real (19 nov 2026)

| Pieza | Estado |
|---|---|
| Estéreo, lente, menú, cine, música, lector, objetos, Tem Shop (web) | **Implementado y probado** en navegador; en el iPhone lo prueba Carlos |
| Manos con MediaPipe (web) | **Implementado**, rastreo mejorable (cámara de 1 sola vista, manos que salen del cuadro) |
| DualShock 4: botones y palancas (web) | **Implementado y probado** |
| DualShock 4: giroscopio | **Bloqueado en web** (el navegador no lo da) → **implementado sin probar** en la nativa |
| 6DoF y anclar cosas en el cuarto (escritorio con tele) | **Bloqueado en web en iPhone** (Safari no trae WebXR) → Hito 03 nativo |
| App nativa, Hito 01 (laboratorio de sensores) | **Implementado sin probar en hardware**: falta instalarla en el iPhone |
| Netflix / Crunchyroll dentro del visor | **No se puede**: sus páginas no dejan meterse en otra, y la app nativa tampoco puede tomar su video |

## Hitos

1. **Laboratorio de sensores** ← ahora. Cabeza, DualShock 4 (botones + giroscopio), cámara. Se da por terminado cuando la app palomea sola los 7 criterios (`Core/Hito01.swift`) en el iPhone de verdad y Carlos pega el reporte.
2. Estéreo nativo (Metal o SceneKit): dos cámaras, separación de ojos, lente.
3. **ARKit 6DoF**: caminar y que el escritorio con la tele se quede en su lugar.
4. Passthrough desde la sesión de ARKit (una sola captura).
5. El DualShock 4 como puntero con su giroscopio.
6. Manos.
7. Juntar todo con lo de la web.

## Archivos

```
are/
├── MaziXR.swiftpm/      ← la app (se abre en Swift Playgrounds del iPad)
│   ├── App/             entrada
│   ├── Core/            matemática pura, sin Apple: se prueba en Linux
│   ├── Hardware/        CoreMotion, GameController (DualShock 4), cámara
│   └── UI/              la pantalla del laboratorio
├── Tests/               pruebas del Core (`swift test`)
├── Package.swift        para correr esas pruebas
├── project.yml          el proyecto de Xcode que arma la Mac de GitHub
└── INSTALAR.md          cómo llega al iPhone sin Mac
```
