# Trípticos · prevención de enfermedades por sedentarismo

Cinco trípticos para **Educación Física III** (grupo 3.1, Bachillerato Rembrandt), pedidos por Carlos el 21 de octubre de 2026 para importarlos a Canva y editarlos allá.

| # | Tema | En la solapa |
|---|---|---|
| 1 | Sedentarismo: el enemigo silencioso | Test «¿Eres sedentario?» |
| 2 | Diabetes tipo 2 y obesidad | Reto de 7 días |
| 3 | Corazón en movimiento (hipertensión y corazón) | Toma tu pulso |
| 4 | Huesos fuertes, espalda sana | Pausa activa de 5 minutos |
| 5 | Mente activa (ansiedad, depresión, sueño) | No estás solo · Línea de la Vida |

- **Tamaño:** carta horizontal (11 × 8.5 in), dos caras. La primera lámina es la de afuera (solapa · contraportada · portada) y la segunda la de adentro.
- **Para Canva:** «Crear un diseño» → «Importar archivo» → el `.pptx`. Todo llega editable: textos, figuras e iconos. Las letras son Anton y Poppins, que Canva tiene.
- **Datos:** OMS, *Directrices sobre actividad física y comportamientos sedentarios* (2020), y la nota descriptiva «Actividad física» (26 de junio de 2024), revisadas el 21 de octubre. La Línea de la Vida (800 911 2000) se confirmó en gob.mx/conasama.
- **Rehacerlos:** `node hacer.js` (requiere `pptxgenjs`, `react`, `react-dom`, `react-icons` y `sharp`).

## Los 4 visuales (24 de octubre) · `visuales/`

Carlos pidió el 21: «aprovecha todo el espacio del tríptico y hazlo más visual… sólo 4 trípticos del tema específico de prevención de enfermedades por sedentarismo». Fotos reales a sangre (Unsplash, `fotos/CREDITOS.md`), cifras grandes y ningún hueco en blanco.

| # | Tema | En la solapa |
|---|---|---|
| 1 | Sentarte mucho te enferma | Test «¿Eres sedentario?» |
| 2 | Muévete y prevén (las enfermedades una por una) | Señales de alerta |
| 3 | 60 minutos que te cambian (el plan de la OMS) | Pausa activa de 5 minutos |
| 4 | Mitos del sedentarismo | Reto de 7 días |

- **Datos nuevos:** INSP, *Salud Pública de México* 2025;67:609-621 (ENSANUT Continua 2020-2024): 40.1 % de los adolescentes de 12 a 19 años con sobrepeso u obesidad. Y OMS 2024: 81 % de los adolescentes poco activos, y entre 20 % y 30 % más riesgo de morir antes de tiempo.
- **Los nombres del equipo NO están en el repo** (es público): van en `visuales/integrantes.txt`, que no se sube. Lo que sale (`visuales/salida/`, el .pptx y el PDF) sí los lleva.
- **El PDF va hecho de fotos de cada hoja**, para que el visor del iPhone no pinte cuadros (ver CLAUDE.md); el editable es el .pptx, para Canva.
- **Rehacerlos:** `NODE_PATH=<node_modules con pptxgenjs, sharp, react, react-dom, react-icons> node visuales/hacer.js`. Si algo no cabe, el generador truena y dice cuánto se sale.
