---
name: color-que-se-lee
description: Armar o revisar una paleta para que el color se lea de verdad — contraste medido contra el fondo REAL de cada elemento, no contra el del documento; tema oscuro que no es la paleta invertida; y la prueba de escala de grises que destapa la información que sólo vive en el color. Úsala al definir colores, al añadir un tono nuevo, cuando alguien diga «no se lee bien», cuando haya que hacer modo oscuro, y antes de entregar cualquier pantalla con color de marca.
---

# Color que se lee y no miente

El color es el apartado donde más se aprueba a ojo y más se falla medido. Esta
skill es el procedimiento, y **cada paso tiene una comprobación que puede
reprobar**.

## 1 · Contra qué se mide

**El error que más cuesta:** se mide el texto contra el fondo del documento y
no contra el fondo **real** del elemento — una tarjeta tintada, una franja, una
imagen o un degradado debajo.

- Si un tono de texto se usa sobre tres superficies, son **tres medidas**, no una.
- Se mide el color **calculado**, no el escrito: la opacidad y la herencia
  cambian el resultado.

**Reprueba si:** algún par texto/fondo real queda por debajo de **4.5:1** en
texto normal o **3:1** en texto grande (≥24 px, o ≥19 px en negrita).

## 2 · Los bordes también tienen mínimo

Un campo que sólo se distingue por un borde gris claro desaparece al sol.

**Reprueba si:** el borde de un control contra su fondo queda por debajo de
**3:1** (WCAG 1.4.11). Aplica a campos, botones fantasma, casillas y al anillo
de foco.

## 3 · La prueba de escala de grises

Poner la pantalla en blanco y negro y volver a mirarla.

**Reprueba si:** desaparece información. Un error marcado sólo en rojo, una
serie de un gráfico distinguida sólo por color, un estado activo sólo teñido.
Cada uno necesita una **segunda señal**: icono, texto, patrón o grosor.

## 4 · Tema oscuro: no se invierte, se rediseña

- El acento saturado se percibe **más intenso** sobre fondo oscuro: baja la
  saturación.
- Ni blanco puro ni negro puro: ese par es el que más fatiga produce.
- La **elevación en oscuro se hace con superficie más clara**, no con sombra
  más fuerte: una sombra negra sobre fondo casi negro no se ve.

**Reprueba si:** los niveles de elevación no se distinguen entre sí en oscuro
sin mirar el contenido.

## 5 · Modo de contraste forzado

Con el contraste forzado del sistema, los fondos se descartan.

**Reprueba si:** algún control se queda sin borde y desaparece. La regla que
sobrevive: **la información nunca vive sólo en el fondo**.

## 6 · Cuántos colores

Un color de marca, un acento, una escala de grises de cinco a siete pasos y los
cuatro de estado (bien, aviso, error, información). Más que eso casi siempre es
indecisión.

**Reprueba si:** hay dos tonos a menos de 5 % de diferencia haciendo el mismo
trabajo en sitios distintos.

## El paso que casi nadie da

**Mirar la pantalla, no leer la hoja de estilo.** Una captura a brillo bajo y
otra al 100 % de zoom. El contraste calculado y el contraste percibido no son
lo mismo cuando hay una imagen o un degradado debajo.

## Neuronas relacionadas

`color`, `superficie`, `accesibilidad`, `estilos`, `sombras`. En el cerebro:
`contraste-que-pasa-en-el-mockup-y-no-en-la-pantalla`,
`estilo-modo-oscuro-no-es-invertir`, `el-borde-como-unica-diferencia-de-estado`.
