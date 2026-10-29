# Modelos 3D de los anuncios

Todos de [Poly Haven](https://polyhaven.com), con licencia **CC0** (dominio público: se pueden usar en
comerciales sin pedir permiso ni pagar). No la exige, pero se da crédito igual en el cierre del video.

| Carpeta | Modelo | Autor | Dónde sale |
|---|---|---|---|
| `Megaphone_01` | Megaphone 01 | Ethan Simon-Law | 04 · la imagen nueva en todo (marketing) |
| `vintage_video_camera` | Vintage Video Camera | James Ray Cock, Jenelle van Heerden | 04 · video y fotografía |
| `plastic_thermos` | Plastic Thermos | PierreB3D | 04 · el termo con logo |
| `cardboard_box_01` | Cardboard Box 01 | Rahul Chaudhary | 04 · la caja con logo |

Bajados en 1k (glTF + texturas JPG) de `api.polyhaven.com/files/<nombre>`.

## La luz

| Archivo | Qué es | Autor | Licencia |
|---|---|---|---|
| `../hdri/studio_small_09_1k.hdr` | HDRI «Studio Small 09»: la luz de estudio de todos los anuncios y de la portada de la página | Sergej Majboroda · Poly Haven | CC0 |

## La gente y los muebles

| Carpeta | Qué es | Autor | Dónde sale |
|---|---|---|---|
| `kenney-personas/` | «Mini Characters» (12 personas con 30 animaciones) | Kenney · kenney.nl | 05, 06, 08, 09, 10 |
| `kenney-muebles/` | «Furniture Kit» (mostrador, estufa, refri, escritorio, silla, laptop, planta…) | Kenney · kenney.nl | 05, 10 |

Licencia CC0 (viene en el `License.txt` de cada carpeta). Se bajaron con un navegador desde
`kenney.nl/download-link/<id>`: con `curl` la página contesta 403. Se cargan con `gente.js`
(`persona`, `mueble`, `actuar`).
