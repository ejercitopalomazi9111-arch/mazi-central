---
name: estados-completos
description: Diseñar y revisar los ocho estados que todo componente tiene y que casi siempre se entregan a medias — reposo, cursor encima, foco, activo, deshabilitado, cargando, vacío y error. Úsala al diseñar cualquier componente, al revisar uno ajeno, cuando algo «funciona pero se siente incompleto», y como última pasada antes de entregar.
---

# Los ocho estados

Un componente entregado con dos estados no está terminado: está empezado. La
lista es corta y se recorre entera, componente por componente.

| # | Estado | La pregunta que lo comprueba |
|---|---|---|
| 1 | **Reposo** | ¿se entiende qué es y si se puede tocar? |
| 2 | **Cursor encima** | ¿existe? ¿y qué pasa en táctil, donde no ocurre? |
| 3 | **Foco** | ¿se ve el anillo al llegar con el tabulador? |
| 4 | **Activo** | ¿hay respuesta inmediata al pulsar, antes de que llegue la red? |
| 5 | **Deshabilitado** | ¿dice **por qué** está apagado? |
| 6 | **Cargando** | ¿aparece antes de 100 ms? ¿reserva el espacio? |
| 7 | **Vacío** | ¿explica qué va ahí y ofrece cómo empezar? |
| 8 | **Error** | ¿dice qué pasó, de quién es y cómo se arregla? |

## Los cuatro que más se olvidan

**Foco.** `outline: none` sin sustituto es el defecto de accesibilidad más
repetido que existe. Anillo propio de 2–3 px con `outline-offset`, y
`:focus-visible` para que no salga con el ratón.

**Deshabilitado sin explicación.** Un botón gris que no dice qué falta obliga a
adivinar. O se deja activo y al pulsarlo se explica, o se pone el motivo al
lado. Y ojo: un botón deshabilitado **no recibe foco**, así que quien navega con
teclado ni sabe que existe.

**Cursor encima en táctil.** Lo que sólo aparece al pasar el ratón **no existe
en un teléfono**. Se separa con `@media (hover: hover)`, no con el ancho de
pantalla: hay portátiles táctiles y monitores sin ratón.

**Cargando que empuja.** Si el esqueleto no mide lo mismo que el contenido
final, todo salta al llegar. El espacio se reserva antes.

## La revisión

1. Listar los componentes de la pantalla.
2. Para cada uno, recorrer los ocho y marcar los que **no existen**.
3. Un estado que «no aplica» se escribe como decisión, no se salta en silencio.

**Reprueba si:** queda un componente interactivo sin estado de foco visible, o
un contenedor de datos sin estado vacío.

## Neuronas relacionadas

`interfaz`, `formularios`, `espera`, `accesibilidad`, `detalles`. En el cerebro:
`el-boton-deshabilitado-no-explica`, `hover-que-no-existe-en-tactil`,
`sombra-de-foco-no-es-decorativa`, `estado-vacio-no-es-una-pantalla-en-blanco`.
