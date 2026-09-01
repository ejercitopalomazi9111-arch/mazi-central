---
name: rendimiento-que-se-siente
description: Medir y arreglar lo que hace que una página se sienta lenta aunque cargue rápido — scroll a tirones, contenido que salta, capas de composición de más, y las tres propiedades que cuestan cada fotograma. Úsala cuando alguien diga «va lento» o «va a saltos», antes de entregar cualquier página con movimiento, y cuando se añada un efecto visual.
---

# Rendimiento que se siente

No es la puntuación de una herramienta: es que el dedo empuje y la página
responda. Se mide con la CPU ralentizada, porque en la máquina de quien
desarrolla nunca falla.

## El método

1. Ralentizar la CPU **6×** en las herramientas del navegador.
2. Grabar el scroll de la página entera.
3. Mirar **qué tipo** de trabajo domina: composición, pintado o JavaScript.

Cada tipo tiene un culpable distinto y un arreglo distinto.

## Los tres culpables de scroll a tirones

**1 · `backdrop-filter`.** Obliga a releer y difuminar lo que hay detrás en cada
fotograma. Es la causa número uno, está medida, y el arreglo es un fondo
semitransparente sólido o restringirlo a un elemento que no se mueva.

**2 · `background-attachment: fixed`.** Repinta el área completa en cada
fotograma, y en varios navegadores móviles ni se soporta. Se sustituye por una
capa con `transform` o un `position: sticky`.

**3 · Sombras grandes en listas largas.** El costo crece con el área
desenfocada, multiplicado por cincuenta elementos. En listas, mejor espacio y
una línea.

## Contenido que salta

- Imágenes y vídeos **sin dimensiones**.
- Fuentes que cambian de métrica al cargar: `size-adjust` o una alternativa con
  métricas parecidas.
- Avisos que se insertan arriba y empujan.
- Listas que **se reordenan** cuando llegan más resultados: una vez pintado, se
  añade abajo, no se reordena bajo el dedo.

## Capas de composición

`will-change` puesto por precaución promueve cada elemento a su propia capa, y
cada capa cuesta memoria de vídeo. **Decenas de capas** en una página normal es
la señal de que se puso de más.

Ponerlo sólo en lo que está a punto de animarse, y quitarlo al terminar. En
duda, no ponerlo: el navegador decide bien solo casi siempre.

## Lienzos y densidad

Un lienzo dimensionado con `devicePixelRatio` sin tope pinta **nueve veces** más
píxeles en un aparato de ratio 3. Para efectos de fondo, topar en 1.5. Para
texto y líneas finas, el ratio real.

## Lo que sí paga

- Un solo bucle de animación compartido, con pausa fuera de pantalla.
- Animar sólo `transform` y `opacity`.
- Precargar la fuente del titular y la imagen del encabezado; diferir el resto.
- Imágenes al tamaño en que se van a ver.

## Reprueba si

- El scroll baja de **50 fps** con la CPU ralentizada 6×.
- Hay `backdrop-filter` en algo que se mueve con el scroll.
- Hay más de un `requestAnimationFrame` activo.
- El desplazamiento acumulado de diseño sube al cargar imágenes o fuentes.

## Neuronas relacionadas

`rendimiento-visual`, `sombras`, `paralaje`, `imagen`, `movimiento`. En el
cerebro: `blur-cuesta-cada-fotograma`, `will-change-no-es-gratis`,
`paralaje-densidad-de-pixel`, `resultados-que-cambian-de-orden`.
