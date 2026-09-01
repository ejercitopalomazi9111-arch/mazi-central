---
name: movimiento-honesto
description: Animar sin romper el contraste, sin marear y sin que la página vaya a tirones — sólo transform y opacity, nunca opacidad sobre texto, un solo bucle de animación, y el contenido completo cuando no hay JavaScript. Úsala al añadir cualquier animación, transición o revelado, cuando el scroll vaya a saltos, cuando alguien reporte mareo, y antes de entregar una pantalla con movimiento.
---

# Movimiento honesto

Cinco reglas. Las cinco salieron de defectos que llegaron a producción.

## 1 · Nunca se anima la opacidad sobre texto

Un texto a media transición **no cumple contraste**. Se destapa con máscara:
contenedor con `overflow: hidden` y el texto desplazándose dentro, siempre a
opacidad plena.

En elementos **decorativos** sí se puede.

**Reprueba si:** al congelar la animación al 50 %, el texto no cumple contraste.

## 2 · Sólo `transform` y `opacity`

Son las dos que resuelve el compositor sin recalcular la composición de la
página. Animar `width`, `height`, `top`, `margin` o `box-shadow` obliga a
recalcular en cada fotograma.

**Reprueba si:** hay una transición sobre una propiedad que afecta al flujo.

## 3 · Un solo bucle para todos

Diez componentes con su propio `requestAnimationFrame` compiten por el mismo
hilo y se degradan juntos.

Un motor compartido que recorre la lista de cosas que hay que mover, con
**pausa fuera de pantalla** y `devicePixelRatio` topado a 1.5 en lo decorativo.

**Reprueba si:** hay más de un bucle de animación activo en la página.

## 4 · Sin JavaScript, el contenido se ve completo

El estado por defecto es **el final**: visible y en su sitio. El movimiento va
dentro de `@media (scripting: enabled)` y, si usa `animation-timeline`, dentro
de `@supports`.

**Reprueba si:** con JavaScript desactivado queda algo oculto o desplazado.

## 5 · `prefers-reduced-motion` lo apaga

Apagar, no suavizar. Media transición sigue mareando, y el mareo es un síntoma
real, no una molestia.

**Reprueba si:** con la preferencia activa queda algún movimiento vestibular
—capas grandes, paralaje, desplazamientos amplios—.

## Las duraciones que se sienten

| Duración | Sensación |
|---|---|
| 100–150 ms | instantáneo; para estados de control |
| 200–300 ms | cuidado; para entradas y salidas |
| 400 ms + | lento; sólo para transiciones de pantalla completa |

Y dos curvas propias: entrada rápida con salida lenta para lo que **aparece**;
lo contrario para lo que **se va**. La curva por defecto en toda la interfaz
delata la plantilla.

## Nada de librerías de animación

Si el movimiento cabe en un motor propio sin dependencias, se resuelve así. Es
lo que permite que los componentes que sólo se revelan al entrar en pantalla no
envíen JavaScript propio.

## Neuronas relacionadas

`movimiento`, `paralaje`, `rendimiento-visual`, `accesibilidad`. En el cerebro:
`paralaje-no-animar-opacidad-en-texto`, `paralaje-un-solo-raf`,
`paralaje-marea-a-la-gente`, `estilo-animacion-de-libreria-suena-a-plantilla`.
