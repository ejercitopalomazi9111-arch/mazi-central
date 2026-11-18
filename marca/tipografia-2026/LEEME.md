# Mazi 2026 · la letra nueva

Dibujada a mano por la artista de Grupo Mazi y convertida en fuente el 18 de noviembre.

- `dibujo-original.jpg` es la hoja completa: letras, números, signos, operaciones, monedas e íconos.
- `dibujo-1-letras.jpg` es la primera hoja, sólo con letras.
- `fundir.py` arma la fuente desde la hoja. Se corre con `python3.13 -I marca/tipografia-2026/fundir.py`.
- Salen `mazi-2026.ttf`, `mazi-2026.woff2` y `mazi-2026.css`. En la página se usa
  `font-family: 'Mazi 2026'` cargando el `.css`.
- `prueba.html` enseña todo el juego y trae una caja para escribir.

Qué trae:

- **Letras:** A–Z con Ñ, y Á É Í Ó Ú Ü con el acento que ella dibujó. Las minúsculas escriben mayúsculas, porque la
  hoja sólo trae mayúsculas.
- **Números y signos:** 0–9, ! ? ¡ ¿ . , ; : …, comillas dobles y sencillas, ( ) [ ] { } / \ | @ # %.
- **Operaciones:** + − × ÷ = ≠ < > ≤ ≥. El guion (-) usa el menos.
- **Monedas y otros:** & * $ € ¥ ¢ ° ´ ^ ~ ¬ ⌐.
- **Íconos:** ✓ ✗ ← → ↑ ↓ ▶ ⏸ ⧄, y el bote de basura en U+E000, que no tiene carácter propio.

Cómo se lee el dibujo:

- Cada pieza viene dibujada sólo con su contorno.
- Una zona blanca que toca el fondo es pieza y se rellena. Si sólo toca piezas, es hueco de la letra. Lo que queda
  dentro de un hueco, como la estrella de la O, vuelve a ser pieza.
- Las rayitas blancas muy finas entre piezas se cierran al rellenar.

Falta:

- **Minúsculas propias**, si la artista las dibuja.
- **Los signos que no vienen:** _ ¿ ¡ en versión chica, «», ¨ suelta, ñ minúscula propia.
