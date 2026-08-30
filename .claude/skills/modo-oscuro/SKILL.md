---
name: modo-oscuro
description: Hacer el tema oscuro como sistema y no invirtiendo la paleta — superficies por elevación, acentos desaturados, blanco roto, imágenes que no deslumbran y el interruptor que respeta la preferencia del sistema. Úsala al añadir tema oscuro, cuando en oscuro los colores se vean fluorescentes o las tarjetas se peguen al fondo, y al revisar un tema que ya existe.
---

# Modo oscuro

Invertir la paleta es una operación de una línea y produce un tema oscuro malo.
Esto es lo que sí hay que hacer.

## 1 · Ni blanco puro ni negro puro

`#FFF` sobre `#000` es el par que más fatiga produce y el que sale de invertir.

- Fondo: un negro con algo de tinte, alrededor de `#12`–`#1A` de luminancia.
- Texto: un blanco roto, no `#FFF`.

## 2 · La elevación se hace con superficie

Una sombra negra sobre fondo casi negro **no se ve**. En oscuro, más elevación
significa **superficie más clara**, y la sombra queda sólo como refuerzo.

Tres o cuatro superficies, cada una un paso más clara que la anterior.

**Reprueba si:** los niveles de elevación no se distinguen entre sí sin mirar el
contenido.

## 3 · Los acentos se desaturan

Un color saturado sobre fondo oscuro se percibe **más intenso**. El mismo
violeta que en claro se ve bien, en oscuro vibra.

- Bajar saturación y subir luminosidad del acento en oscuro.
- Comprobar de nuevo el contraste: el par cambió, la medida también.

**Reprueba si:** algún acento se ve fluorescente a brillo bajo.

## 4 · Las imágenes

Una foto clara a pantalla completa en un tema oscuro deslumbra de noche.

- Bajar un poco el brillo o poner un velo muy sutil.
- Los logotipos con fondo blanco incrustado se ven como un parche: hacen falta
  dos versiones, o un SVG que herede `currentColor`.

## 5 · El interruptor

Tres estados, no dos: **claro**, **oscuro** y **el del sistema**, que es el que
va por defecto.

- Con `prefers-color-scheme` para la preferencia del sistema.
- Una marca en la raíz para la elección explícita, que gana en los dos
  sentidos.
- La elección **se recuerda**, y se aplica **antes** de pintar: si no, hay un
  destello del tema equivocado en cada carga.

**Reprueba si:** al recargar en oscuro hay un flash claro.

## 6 · Los tokens se definen una vez

La paleta completa se define en la raíz. En el bloque de oscuro se **redefinen
sólo los que cambian**.

**Reprueba si:** hay un color cuya única definición está dentro del bloque
oscuro. Ese color no existe en claro.

## 7 · Lo que se prueba

- Los dos temas lado a lado **a brillo bajo**, que es como se usa el oscuro.
- Contraste medido otra vez, entero: no se hereda del tema claro.
- El modo de contraste forzado del sistema, que es un tercer caso.

## Neuronas relacionadas

`color`, `superficie`, `sombras`, `imagen`, `sistema`. En el cerebro:
`estilo-modo-oscuro-no-es-invertir`, `opacidad-de-la-sombra-segun-el-fondo`.
