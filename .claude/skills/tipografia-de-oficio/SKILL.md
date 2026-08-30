---
name: tipografia-de-oficio
description: Elegir y ajustar tipografía para que el texto se lea y el conjunto se vea trabajado — escala, medida de línea, interlineado, cifras tabulares, viudas en titulares, comillas y rayas del español. Úsala al arrancar un sistema de diseño, cuando alguien pida «más profesional» sin saber qué cambiar, cuando el texto se vea apretado o barato, y antes de entregar cualquier pieza con texto largo.
---

# Tipografía de oficio

Lo que más rápido separa un diseño trabajado de una plantilla no es la fuente:
es la medida de línea, el ritmo y media docena de detalles del español.

## 1 · Cuántas familias

**Dos bastan.** Una variable con eje de peso —y de ancho, si lo tiene— cubre
titular, cuerpo y etiqueta. Una monoespaciada para datos, código y folios.

**Reprueba si:** hay más de dos familias cargadas sin una razón escrita.

## 2 · La medida de línea

Entre **45 y 75 caracteres** por línea en texto corrido. Se mide contando, no
estimando: `ch` es la unidad que existe justo para esto (`max-width: 68ch`).

**Reprueba si:** algún bloque de texto corrido pasa de 80 caracteres en el
ancho más común, o baja de 40 en teléfono.

## 3 · El interlineado sigue al tamaño y a la medida

Texto de cuerpo: **1.5 a 1.6**. Titulares grandes: **1.1 a 1.25**. Cuanto más
larga la línea, más interlineado necesita para no perder el renglón.

**Reprueba si:** el titular usa el mismo interlineado que el cuerpo. Se nota de
inmediato y es el error más común.

## 4 · La escala

Cinco o seis tamaños, con una razón constante entre ellos (1.2, 1.25 o 1.333
funcionan). Nada de tamaños sueltos «porque ahí quedaba mejor».

**Reprueba si:** hay más de siete tamaños distintos, o dos que se diferencian
en menos de 2 px.

## 5 · Cifras

`font-variant-numeric: tabular-nums` en **tablas, precios, contadores y
cronómetros**. Sin eso los dígitos bailan y un contador que sube tiembla.

**Reprueba si:** una columna de números alineada a la derecha no tiene los
dígitos unos sobre otros.

## 6 · Los detalles del español

- **Comillas angulares** «así» en el primer nivel; “altas” en el segundo. Nunca
  las rectas de máquina de escribir.
- **Raya** (—) para incisos, **semirraya** (–) para rangos de números, **guion**
  (-) sólo para palabras compuestas.
- **Espacio entre cifra y símbolo**: 20 %, 15 kg, 3 s. Mejor duro, para que no
  se parta al final de línea.
- Signos de apertura: ¿ y ¡ **siempre**.

**Reprueba si:** aparece `"` o `'` en el contenido publicado.

## 7 · Viudas y saltos

`text-wrap: balance` en titulares cortos, `pretty` en párrafos.

**Reprueba si:** algún titular deja **una sola palabra** en la última línea, en
cualquiera de los anchos probados.

## 8 · La carga de la fuente

Auto-hospedada, `font-display: swap`, precargada la del titular. El navegador
no debería llamar a un servidor de terceros para pintar texto.

**Reprueba si:** hay una petición a un dominio ajeno para cargar la tipografía,
o si el texto no se ve hasta que la fuente llega.

## Neuronas relacionadas

`tipografia`, `contenido`, `detalles`, `escala`, `idiomas`. En el cerebro:
`cifras-tabulares-en-tablas`, `comillas-rectas-delatan`,
`viuda-y-huerfana-en-titulares`, `estilo-una-tipografia-basta`.
