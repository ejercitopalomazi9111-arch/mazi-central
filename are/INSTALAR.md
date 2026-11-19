# Instalar MAZI'S ARE 1 en el iPhone sin tener Mac

Verificado el 19 nov 2026 (fuentes al final). Hay dos caminos; el primero es gratis.

## Camino 1 · Gratis: la Mac de GitHub + SideStore

1. **La .ipa se arma sola.** Cada cambio en `are/` lo compila una Mac de GitHub (gratis porque el repo es público) y deja `MAZI-ARE-1-ipa` en la pestaña *Actions* del repo.
2. **Una sola vez, en la computadora familiar (Windows sirve):** se instala **SideStore** en el iPhone con su instalador para Windows. Pide tu Apple ID (uno gratis basta).
3. **De ahí en adelante, todo en el iPhone:** abres la .ipa con SideStore y la instala. Con Apple ID gratis la app dura **7 días**; SideStore la renueva desde el teléfono, sin computadora.

Límites: hasta 3 apps así a la vez, y la primera instalación de SideStore sí pide computadora.

## Camino 2 · De paga: Swift Playgrounds en el iPad + TestFlight

- **Swift Playgrounds** (gratis) abre `are/MaziXR.swiftpm` en el iPad: se edita y se corre AHÍ, en el iPad.
- Para pasarla al iPhone desde el iPad hace falta la **cuenta de Apple Developer** (USD 99 al año): se sube a App Store Connect y se instala con TestFlight.
- Hay reportes de subidas que se atoran desde el iPad; por eso éste es el segundo camino.

## Lo que NO se necesita

Ni Mac ni Xcode propios. La Mac de GitHub compila.

## Fuentes

- GitHub: los runners estándar de macOS son gratis y sin límite en repos públicos — docs.github.com/en/actions/reference/runners/github-hosted-runners
- Swift Playgrounds en iPad: subir una app a App Store Connect pide cuenta de desarrollador — support.apple.com/guide/playgrounds-ipad/itc65b2d9a15/ipados
- SideStore / Apple ID gratis: 3 apps y renovar cada 7 días; la primera instalación pide computadora — gigazine.net/gsc_news/en/20260628-sidestore-sideloading-ios
