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

**El secreto de Palomazi** (sólo aparece si el jugador se llama Palomazi o Temmie): `modelos/temmie.glb`,
«Temmie 3d model (basic low poly version)» de **Stewie_Box** (Sketchfab, CC BY 4.0). Su cara recortada de
ese mismo modelo es `sprites/temmie-cara.webp`. Temmie es personaje de **Undertale**, de **Toby Fox**: este
es un juego de fans, gratis, y el modelo es de un fan.

## Formas de nota

Modelos de **Sketchfab**, todos **Creative Commons: By Attribution 4.0**; se dejó sólo la pieza, centrada, con
texturas WebP de 256 px (`herramientas/fotos-notas.html` saca sus fotos para el vestidor):
«Lowpoly Gold Bar» de l0wpoly (Barra, la de fábrica) · «Arcade push button» de IgorMonasterio (Botón de arcade) · «Holo-Puck» de thekaz.2128 (Holo-disco) ·
«Gems (21 different shapes)» de Vivien Deroche / blue-odym, el corte redondo inglés (Brillante) ·
«Stylized Puck» de RiZoRuS77 (Disco) · «Low Poly Stylized Gemstone» de Discover (Cristal) ·
«5 Colored Fantasy Stylized Gems» de Incg5764 (Gema engarzada) · «Gold Star» de Roberto Chiaveri (Estrella) ·
«CC0 - Muscial Note» de plaggy (Corchea).
La secreta de Temmie: «Cereal Temmie Flakes» de **RavenBlox** (Temmie Flakes), con su dibujo original.

## Los bailes

Capturas de movimiento de bailarines reales de la **CMU Graphics Lab Motion Capture Database**
(mocap.cs.cmu.edu; «free for all uses»), en BVH por Bruce Hahne: macarena (143_35), salsa (60_03), lambada
(55_02), lindy hop (93_06) y danza moderna (05_11). `herramientas/riggear.py` (Blender) les mete esqueleto a los
modelos de las cantantes y les pasa esos bailes; los modelos siguen siendo los de sus autores.

## Música

Kevin MacLeod (incompetech.com), **Creative Commons: By Attribution 4.0**. Recortadas a ~2 min con
fundido: «Itty Bitty 8 Bit», «Raving Energy», «Movement Proposition», «Exit the Premises», «Voltaic»,
«Ouroboros», «Volatile Reaction».

**Anime y ritmo** (de OpenGameArt; recortadas a ~2 min con fundido):
«Play Now» de Cleyton Kauffman (CC0) · «Determination» de HydroGene (CC0) · «Tokyo Chase» de Socapex / tarfmagougou
(CC BY-SA 3.0) · «Cheers for Starlight», del OST de *cute Bytes*, de Chloe Wolfe (CC BY 4.0) · «Mauve Rhopalocera»
de ISAo (OGA-BY 3.0) · «Fever Stadium» (versión climax, 180 BPM) de MintoDog (CC0) · «Technomania101» de Fupi (CC0) ·
«Kyra the Cloud Maid» de Tsorthan Grove (CC BY 4.0) · «Cutie Pie» de FrancisLeeMusic (CC BY 3.0) · «Ascend»,
«Glory Days», «Stomper» y «Mental Corruption», de los *Free Rhythm Game Music Pack* 1 y 2 de tricksntraps (CC0).

**Piano imposible.** Partituras de **dominio público** del Mutopia Project (mutopiaproject.org), en MIDI:
Chopin (Vals Op. 64 n.º 1, Fantasía-Impromptu Op. 66, Estudios Op. 10 n.º 1, 5 y 12), Mozart (Rondo alla
turca, K. 331) y Beethoven (Sonatas Op. 13 y Op. 57, tercer movimiento). Las toca el **Salamander Grand
Piano** de Alexander Holm (un Yamaha C5 grabado nota por nota), **Creative Commons: By Attribution 3.0**,
con FluidSynth (`herramientas/piano.py`). «RUSH Ω» es un arreglo nuestro del Estudio Revolucionario: más
rápido y con cada nota doblada en octavas.

**La de Temmie** (secreta): «Buy Something!» de **Cleyton Kauffman** (OpenGameArt, «Shop Theme»,
**CC0**), con el título «hOI! (tEM SHOP)».

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
