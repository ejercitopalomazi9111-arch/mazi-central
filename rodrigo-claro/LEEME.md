# Rodrigo Cabrera · la versión clara

Dos archivos. Sustituyen a los del repo del cliente
(`BigTigerMX/rodrigo-cabrera`):

    style.css   →  assets/css/style.css
    index.html  →  index.html

Son material de paso: se generan aquí y se aplican allá. El enlace que se
entrega sale del repo del cliente, nunca de éste.

## Qué cambió

El sitio era de fondo oscuro y el cliente lo pidió claro. No se parcheó
color por color: se invirtió el sistema.

- Los nombres de las variables mentían —`--paper` era el color del TEXTO y
  `--night` el del fondo—, así que primero se renombraron a `--tinta` y
  `--fondo`, y después se les cambió el valor.
- Los ~50 colores literales sueltos se reasignaron por familias según el
  papel que cumplían (línea fina, velo, chapa, azul de rótulo), no por
  parecido visual.
- Cuatro reglas daban por hecho el fondo oscuro y quedaron ilegibles al
  invertir: la galería, la etiqueta de cada proyecto, el cartucho de la
  portada y el rótulo del cursor. Corregidas.
- El pie era un bloque negro a ancho completo. Se pasó a papel: el cajetín
  de una lámina de verdad va impreso sobre la hoja, no en negro.
- El logotipo es un PNG blanco con transparencia; sobre papel desaparecía.
  `filter:brightness(0)` lo pasa a tinta sin rehacer el archivo.

La lupa de la galería SÍ se queda oscura a propósito: una fotografía se
mira mejor sobre negro, y es una superficie aparte, no la página.

## Comprobado

Chromium a 390 y 1440 px, recorriendo la página entera:

- **Contraste WCAG medido elemento por elemento** (color real del texto
  contra el fondo real heredado): **0 por debajo del mínimo** en los dos
  anchos. Antes de arreglarlo salieron 10, y ése fue el trabajo.
- Sin desbordamiento horizontal, cero errores de consola, cero peticiones
  fallidas, ninguna foto rota.
