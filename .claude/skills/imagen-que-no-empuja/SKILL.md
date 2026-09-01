---
name: imagen-que-no-empuja
description: Meter imágenes sin que el contenido salte, sin que pesen de más y sin que la foto salga deformada — dimensiones declaradas, proporción fijada, formatos modernos, srcset y el marcador honesto cuando la foto real no existe todavía. Úsala al añadir cualquier imagen, cuando el contenido salte al cargar, cuando una página tarde en el teléfono, y al montar una galería.
---

# Imágenes que no empujan

## 1 · La imagen sin dimensiones empuja todo

Una imagen sin `width` y `height` ocupa **cero** hasta que llega, y cuando llega
empuja el contenido de abajo. Alguien que estaba a punto de tocar, toca otra
cosa.

- `width` y `height` en el atributo, aunque el CSS luego la escale.
- O `aspect-ratio` en el CSS.

**Reprueba si:** el desplazamiento acumulado de diseño sube al cargar imágenes.

## 2 · La proporción se fija en los dos casos

Si hay un marcador provisional donde luego irá la foto real, **los dos tienen
que medir lo mismo**. Así sustituir el marcador por la foto no mueve nada.

## 3 · El marcador es honesto

Sin foto real, se dibuja un marcador que **dice que es un marcador**. Nunca una
imagen genérica que pretenda ser el sitio, el producto o el equipo.

**Reprueba si:** hay una foto de banco de imágenes haciéndose pasar por la cosa
real.

## 4 · Formato y peso

- **WebP** o **AVIF** para fotografía. **SVG** para lo que es geometría.
- `srcset` con dos o tres anchos, y `sizes` que diga cuánto va a ocupar de
  verdad.
- La capa de fondo grande y desenfocada puede ir **a la mitad de resolución**:
  nadie lo nota y es donde está el ahorro fácil.

**Reprueba si:** se está sirviendo una imagen de 2000 px para un hueco de 400.

## 5 · Carga diferida, menos la primera

`loading="lazy"` en todo lo que está por debajo del primer pantallazo. La
imagen del encabezado **no**: ésa se precarga, porque suele ser lo que decide
cuándo la página se siente cargada.

## 6 · Recorte y deformación

`object-fit: cover` con la proporción fijada. Sin eso, una foto vertical en un
hueco apaisado sale estirada.

Y en avatares: `border-radius: 50%` sólo da un círculo si el elemento es
cuadrado. Con `aspect-ratio: 1` sale círculo; sin él, elipse.

## 7 · El texto sobre la foto

`text-shadow` **no arregla el contraste**: se mide el color del texto contra el
del fondo. Hace falta una capa real —un degradado oscuro o un velo— y medir
contra ella, contra el **píxel más claro** de la zona, no contra el promedio.

## 8 · El texto alternativo

Describe lo que aporta la imagen, no lo que se ve. Si es decorativa, `alt=""`
vacío, que es distinto de no ponerlo.

**Reprueba si:** hay un `alt` que dice «imagen» o repite el pie.

## Neuronas relacionadas

`imagen`, `medios`, `rendimiento-visual`, `contenido`, `bordes`. En el cerebro:
`text-shadow-no-arregla-contraste`, `radio-en-porcentaje-deforma`,
`paralaje-imagenes-pesadas`, `el-canto-de-la-imagen-a-sangre`.
