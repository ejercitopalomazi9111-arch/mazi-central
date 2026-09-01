---
name: sistema-de-iconos
description: Montar un juego de iconos que se vea de una sola pieza — una colección, una rejilla, un grosor, tamaños de la escala, y el nombre accesible que casi siempre falta. Úsala al elegir iconos, cuando la barra de herramientas se vea desordenada, cuando haya que dibujar uno que no existe, y al revisar iconos que salieron de un modelo.
---

# El sistema de iconos

Un icono suelto no es un problema. Veinte de tres colecciones distintas se ven
de lejos.

## 1 · Una sola colección

El grosor de trazo es lo que más delata: un icono de 1.5 px entre unos de 2 px
se ve enfermo.

**Reprueba si:** al poner todos los iconos juntos y grandes se distinguen dos
grosores o dos radios de esquina.

## 2 · Si falta uno, se dibuja en su rejilla

No se toma de otra colección. Se abre uno existente, se mide su rejilla
(normalmente 24×24 con 2 px de margen), su grosor y su radio, y se dibuja el
nuevo con esos valores.

## 3 · Tamaños de la escala

Dos o tres tamaños, de la escala del sistema: 16, 20 y 24 px cubren casi todo.
Un icono a 17 px porque «ahí quedaba mejor» es el principio del desorden.

Y el icono **no crece con el texto**: si el titular es de 32 px, el icono a su
lado sigue siendo de 24. Crecer con el texto los hace parecer globos.

## 4 · El nombre accesible

Un icono solo, sin texto al lado, **necesita nombre**:

- Si es un botón: `aria-label` con el verbo de lo que hace.
- Si es decorativo junto a un texto que ya lo dice: `aria-hidden="true"`.

**Reprueba si:** hay un botón cuyo contenido es sólo un `<svg>` sin nombre
accesible. Para un lector de pantalla ese botón se llama «botón».

## 5 · Inline, no fuente de iconos

SVG en línea o como sprite. Las fuentes de iconos rompen con el contraste
forzado, se ven mal si la fuente no carga, y a veces salen como cuadraditos.

## 6 · Color y estado

El icono hereda `currentColor`, así que cambia de color con el texto sin tocar
nada. Si un icono tiene su color fijo escrito dentro, se rompe en modo oscuro.

**Reprueba si:** algún icono no cambia con el tema.

## 7 · Área táctil

El icono puede medir 24 px; **el botón que lo contiene, 44**. El área táctil no
es el dibujo.

## 8 · Los que se confunden

Estos pares se confunden siempre y conviene acompañarlos de texto: guardar y
descargar, compartir y enviar, actualizar y sincronizar, y los tres puntos —que
no dicen nada por sí solos—.

## Neuronas relacionadas

`iconos`, `accesibilidad`, `marca`, `detalles`, `escala`. En el cerebro:
`iconos-de-tres-fuentes-distintas`, `estilo-modo-alto-contraste`.
