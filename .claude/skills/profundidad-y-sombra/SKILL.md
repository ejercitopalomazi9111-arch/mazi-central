---
name: profundidad-y-sombra
description: Construir un sistema de elevación que se lea en claro y en oscuro — sombras en capas y teñidas, cuándo la sombra sobra, el difuminado que cuesta y el que no, y por qué en oscuro la elevación se hace con superficie. Úsala al definir tarjetas, menús y modales, cuando la interfaz se vea plana o de cartón, cuando alguien pida efecto vidrio, y cuando el scroll vaya a tirones.
---

# Profundidad, sombra y difuminado

## 1 · Cuántos niveles

**Tres o cuatro**, y cada componente asignado a uno:

| Nivel | Qué va ahí | Cómo se ve |
|---|---|---|
| 0 | el papel, tarjetas de contenido | sin sombra; borde o cambio de tono |
| 1 | elementos que se levantan al interactuar | contacto corto |
| 2 | menús, desplegables, popovers | contacto + difusión |
| 3 | modales, hojas que cubren | difusión amplia + velo detrás |

**Reprueba si:** hay más de cinco valores distintos de sombra en la hoja de
estilo. Eso no es un sistema, es una colección.

## 2 · La sombra en capas

Una sola sombra con mucho desenfoque se ve de cartón. La luz real da a la vez
un **contacto** cerrado y una **difusión** amplia.

- Dos o tres capas.
- Desplazamiento vertical ≈ **un tercio** del desenfoque.
- La opacidad baja a la mitad en cada capa.

## 3 · Teñir la sombra

**El negro puro ensucia.** Una sombra `rgba(0,0,0,.15)` sobre un fondo con
tinte desatura la zona.

Tintar con el matiz del fondo, más oscuro y más saturado. En el botón principal,
con el matiz del propio relleno al 20 % — al 50 % ya parece videojuego.

**Reprueba si:** la misma tarjeta sobre tres fondos de colores distintos ensucia
alguno.

## 4 · En oscuro, superficie y no sombra

Una sombra negra sobre fondo casi negro no existe. **Más elevación = superficie
más clara.**

**Reprueba si:** en oscuro los niveles no se distinguen entre sí.

## 5 · El difuminado: el caro y el barato

| | Costo | Cuándo |
|---|---|---|
| `filter: blur()` sobre un elemento propio | se pinta una vez | manchas de fondo, imágenes fuera de foco, decoración |
| `backdrop-filter: blur()` | **se recalcula en cada fotograma** | sólo en elementos que no se mueven con el scroll |

**Reprueba si:** hay `backdrop-filter` en algo que pasa durante el scroll. Es la
causa número uno de que una página vaya a tirones, y está medida.

## 6 · Lo hundido lleva sombra interior

`box-shadow: inset` arriba, no un borde oscuro. Un borde es una línea; un hueco
es una sombra que cae dentro.

## 7 · box-shadow o drop-shadow

- **`box-shadow`**: sombrea el rectángulo. Barata. Para cajas.
- **`filter: drop-shadow()`**: sigue la **silueta** opaca. Para iconos, PNG con
  transparencia y formas con `clip-path`.

**Reprueba si:** un icono transparente proyecta una sombra rectangular.

## 8 · No animar la sombra

Al pasar el cursor, animar `box-shadow` obliga a repintar y a veces mueve la
caja. Se ponen **dos sombras superpuestas** y se cruza la opacidad.

**Reprueba si:** al señalar una tarjeta de una rejilla, las vecinas se mueven.

## Neuronas relacionadas

`sombras`, `profundidad`, `superficie`, `rendimiento-visual`. En el cerebro:
`sombra-negra-pura-ensucia`, `blur-cuesta-cada-fotograma`,
`opacidad-de-la-sombra-segun-el-fondo`, `drop-shadow-sigue-la-forma`.
