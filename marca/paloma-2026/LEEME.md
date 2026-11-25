# Logo nuevo de Grupo Mazi · la paloma completa (14 nov 2026)

Sale del dibujo de línea de Carlos (`fuente/dibujo-carlos.png`, recortado de una captura de WhatsApp).
**No lo dibujó un modelo de imagen**: cada pieza es un polígono sacado de su trazo.

- `logo-oscuro.svg` / `-2048.png`: el logo completo sobre morado oscuro, con brillo.
- `logo-transparente.svg` / `-2048.png`: igual, sin fondo (para fondos oscuros).
- `logo-claro.svg` / `-2048.png`: para fondo blanco; «GRUPO» en vino.
- `logo-icono.svg`, `icono-1024.png`, `icono-512.png`: la cabeza con la estrella, para iconos.

**Lo que se completó a mano.** La captura cortaba las puntas de las alas y los botones de WhatsApp tapaban la cola:
- el ala derecha y la cola derecha son el reflejo de las izquierdas (el dibujo es simétrico);
- la banda del brazo derecho sí es la suya, porque el cuerpo no es simétrico;
- las plumas cortadas rematan en punta, alargando sus dos orillas;
- **la cola termina en pico** (Carlos, 14 nov: «a la cola en la parte de hasta abajo termínala en pico»): las dos plumas del
  centro bajan y se juntan en punta, medido contra el dibujo completo que mandó después (`fuente/dibujo-completo.jpg`). Va en `pico()` de `componer.py`.

**Cómo se rehace** (en `receta/`):

    python3 facetas.py dibujo.png facetas-base.json 3 0.82 1 0   # piezas cerradas → polígonos
    python3 componer.py                                         # simetría, puntas, qué es cada pieza
    python3 pintar.py oscuro|claro|transparente|icono           # colores de la casa → SVG
    node svg2png.mjs logo-oscuro.svg salida.png 2048            # a PNG

Colores: morado oscuro #170A26, vino #7E1735, morado claro #AC27FF, lila #C77DFF.
Si llega el dibujo original sin recortar, se corre otra vez desde `facetas.py` con él.
