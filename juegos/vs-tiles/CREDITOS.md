# VS TILES · EXÓRCIST — créditos y licencias

Fan game **sin fines de lucro**. Idea, mundo y documento de diseño: Carlos «Palomazi» (`DISEÑO.md`).
Nada del arte se dibujó aquí: todo es importado y lo que hace el código es moverlo.
Para venderlo hacen falta las licencias de los personajes y de la música (Carlos las paga cuando toque).

## Personajes 3D

Modelos de fans publicados en Sketchfab con licencia **CC BY 4.0**, bajados del espejo de
Objaverse (allenai/objaverse, Hugging Face). Los personajes son de sus dueños (Crypton Future
Media, INTERNET Co., AH-Software y demás); aquí salen como homenaje.

| Archivo | Personaje | Autor en Sketchfab | uid |
|---|---|---|---|
| `modelos/gumi.glb` | GUMI | Saionji | 62e94b9a5b444ed28bbc58131c6c3bdb |
| `modelos/miku.glb` | Hatsune Miku | A-Z inc. | a393a4f3613143f09834705eb6a61d31 |
| `modelos/luka.glb` | Okurine Luka | kirirato | 6e0563e695884100901d767c4289e045 |
| `modelos/una.glb` | Otomachi Una | theuniversalmodeler | b815f5620dde41d0922bf030687c38fb |
| `modelos/miku-hagane.glb` | Hagane Miku | kirirato | c0d12094df9d4a4e843e4410f72e67fb |
| `modelos/miku-akuma.glb` | Akuma Miku («Miku Excomulgada») | Tiago.Carneiro | b3018f9de1e84afbacaf7b9561450012 |

**La invitada sorpresa** (el huevo de pascua: 10 toques al logo): `modelos/miku-susto.glb`,
«Shiteyanyo - Hatsune Miku» de **Seafoam** (Sketchfab, CC BY 4.0, uid 0f4029ba805c4751933bba24dc72dd24),
con su caminata original.

Se comprimieron con gltf-transform (cuantizado y texturas WebP de 1024 px); la forma no se tocó.
**Faltan v flower y Momone Momo:** sus modelos en Sketchfab son de 2023 en adelante y no están en el
espejo; bajarlos de Sketchfab pide una cuenta (un token de su API).

## Música

Kevin MacLeod (incompetech.com), **Creative Commons: By Attribution 4.0**. Recortadas a ~2 min con
fundido: «Itty Bitty 8 Bit», «Raving Energy», «Movement Proposition», «Exit the Premises», «Voltaic»,
«Ouroboros», «Volatile Reaction».

**Piano imposible.** Partituras de **dominio público** del Mutopia Project (mutopiaproject.org), en MIDI:
Chopin (Vals Op. 64 n.º 1, Fantasía-Impromptu Op. 66, Estudios Op. 10 n.º 1, 5 y 12), Mozart (Rondo alla
turca, K. 331) y Beethoven (Sonatas Op. 13 y Op. 57, tercer movimiento). Las toca el **Salamander Grand
Piano** de Alexander Holm (un Yamaha C5 grabado nota por nota), **Creative Commons: By Attribution 3.0**,
con FluidSynth (`herramientas/piano.py`). «RUSH Ω» es un arreglo nuestro del Estudio Revolucionario: más
rápido y con cada nota doblada en octavas.

## Escenarios

Fotos 360° de **Poly Haven** (CC0): shanghai_bund, neon_photostudio, metro_noord, mirrored_hall,
rooftop_night, kloppenheim_07_puresky, industrial_sunset_02_puresky, music_hall_01 y old_hall (Sergej
Majboroda), dresden_station_night y modern_buildings_night (Greg Zaal), st_peters_square_night (Andreas Mischok). Se usan las versiones JPG a 2048 px
y el juego las tiñe y las hace latir.

## Botones, partículas y sonidos

**Kenney** (kenney.nl, CC0): Input Prompts (los △ ○ × □, flechas y círculos), Particle Pack (destellos,
estrellas, chispas, remolinos) e Interface / Impact Sounds (golpe, fallo, clic de la calibración) e Impact Sounds para los pasos de la invitada.
**AntumDeluge** (OpenGameArt, «Witch Cackle», CC0): la risa.

## Letra y código

Orbitron, Zen Kaku Gothic New y Cinzel (Google Fonts, SIL Open Font License). three.js (MIT).
