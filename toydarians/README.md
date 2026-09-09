# Vitrina Toydarians

Escaparate para [toydarians.com](https://www.toydarians.com/) — Star Wars
*The Vintage Collection*. Un solo archivo, cero dependencias, cero peticiones
externas salvo las tipografías.

```
python3 scripts/armar.py     # genera sitio.html
node    scripts/revisar.mjs  # compuerta: desborde, h1, contraste, sin JS
```

## Qué es

Un **escaparate**, no una tienda: enseña la colección y manda a comprar a la
tienda de siempre. No cobra, no guarda datos, no pone cookies ni scripts de
terceros.

## De dónde salen los datos

| | |
|---|---|
| `activos/catalogo-limpio.json` | 47 piezas reales sacadas del feed del WooCommerce del cliente, con su número VC y su enlace |
| `activos/assets.json` | Las imágenes en WebP, ya en base64, y **el color de fondo medido de cada render** |

Nada de esto se inventa. Si un dato no está confirmado no se publica.

## Las tres decisiones que explican el diseño

**1. La luz de cada celda está medida, no elegida.** Los renders de fábrica de
Hasbro vienen cada uno sobre un degradado de color distinto y se pelean entre
sí. En vez de pelear con ellos, cada cajón de la vitrina adopta *el color que
se midió en la foto que contiene* (la mediana de su corona exterior). Por eso
la vitrina no es de un solo tono: está iluminada por lo que hay dentro.

**2. Los saltos del índice son información.** Hasbro numera cada figura y esa
numeración salta: de VC 01A a VC 57, de VC 73 a VC 231. El índice dibuja esos
huecos con su cuenta —**334 números ausentes en 15 tramos**— en vez de
esconderlos, porque dicen qué parte de la línea no está en esta vitrina.

**3. Se intentó recortar las figuras y no se pudo.** Se probaron tres llaveros
(relleno por inundación con tolerancia local, modelo radial, superficie
polinómica sembrada). Sólo uno de los cinco renders sale limpio; en el resto la
tela negra se confunde con el viñeteado y las capas desaparecen. Ese único
recorte limpio es la figura de la portada. Los demás van **enteros, con su
fondo, dentro del cartón** — que es lo que hace un blíster de verdad: llevar
arte impreso detrás de la burbuja. La limitación se volvió el concepto.

## Reglas de movimiento

Heredadas de trabajos anteriores y medidas, no opinadas:

- **Un solo `requestAnimationFrame`** para puntero, banda, polvo y medición.
  Varios bucles compitiendo es la forma más rápida de que una página vaya a
  tirones.
- **Sólo `transform`**, que resuelve el compositor sin recalcular layout.
- **Nunca `opacity` sobre texto.** Un texto a media transición no cumple
  contraste. El titular se destapa con máscara a opacidad plena.
- **Nada de `backdrop-filter`**: obliga a Chrome a recomponer en cada fotograma
  de scroll.
- `prefers-reduced-motion` lo apaga todo. Sin JavaScript la página se ve
  **completa y quieta** — la altura del documento es idéntica con y sin JS.
- WebGL: se enciende sólo si la portada está a la vista y se apaga al salir.
  `devicePixelRatio` topado a 1.5, presupuesto de ~30 fps para el fondo.
- La medición de fluidez del pie es real: se mide en vivo y muestra el mínimo.

## La compuerta

`scripts/revisar.mjs` mide el **DOM pintado**, no el CSS, en 390 / 768 / 1440 px
× con y sin JavaScript:

- desbordamiento horizontal (un hijo de grid no baja de `min-content`),
- **decapitado del titular** — se destapa con máscara, así que `overflow:hidden`
  también corta en horizontal: si la tipografía de Google no carga, la de
  reserva es más ancha y el titular se corta sin avisar,
- **contraste real** contra el fondo pintado, 4.5:1 (3:1 en texto grande),
- un solo `<h1>` y nada legible invisible.

Se comprobó que sabe reprobar: con las cuatro faltas inyectadas a mano, las seis
combinaciones salen en rojo y el proceso termina en 1.

## Pendiente del cliente

- **Fotos propias.** Las de ahora son los renders de fábrica de Hasbro y están
  puestas como provisionales. El diseño está hecho a la medida de las fotos del
  cliente: entran en el mismo hueco sin mover nada. Ver `GUIA-FOTOS.md`.
- Existencias y precios: hoy se mandan a la tienda, no se duplican aquí.

## Dos salidas

| | |
|---|---|
| `sitio.html` | Para el visor de artefactos: sin `doctype`/`head`/`body`, que los pone el visor |
| `publico/index.html` | Documento completo, listo para servir en cualquier hosting estático |

Ambas salen del mismo `armar.py` y llevan el mismo contenido.
