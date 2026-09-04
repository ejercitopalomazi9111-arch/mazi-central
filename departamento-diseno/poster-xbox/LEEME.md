# Póster Xbox · pieza de concepto

**Ejercicio de diseño. No es publicidad oficial de Xbox ni de Microsoft, no
está autorizado por el titular de la marca, y eso va escrito en la propia
lámina —a 3.4 mm, legible— y no escondido en un pie de 2 pt.** Se hizo así
desde el primer minuto: una pieza de concepto que no lo diga es una
falsificación con buenas intenciones.

Lo pidió Luis: «un póster promocional para Xbox, da tu mejor trabajo con
todos los recursos a tu alcance». Eligió, sabiendo lo de arriba, que fuera de
la marca Xbox y no de un producto nuestro.

---

## Lo primero: la v1 la tiró Luis, y tenía razón

Textual: **«se ve horrible»**. La v1 (en `v1/`) era fondo negro liso, la
marca encendida en verde neón `#7CFF80` y un haz de luz. Ni una imagen.

No hizo falta discutirlo: la guía de la casa
(`bodega/skills/huashu-design/references/design-styles.md`) lo tiene fichado
**con nombre propio, en su lista de zonas prohibidas**: *«solución perezosa
GitHub-dark — fondo oscuro uniforme + glow de neón genérico»*. Y ese verde,
a saturación de pantalla, en la misma guía no es Xbox: es *«verde
fluorescente → terminal / hacker»*.

Dos errores, los dos de principiante:

- **Un cartel PROMOCIONAL sin una sola imagen no promociona nada.** El verde
  encendido hacía de decorado porque no había nada más que mirar.
- **Saturación máxima de pantalla en superficie grande = plástico.** Lo que
  el ojo lee como «caro» es que la tinta impresa NUNCA llega al RGB de un
  monitor; en pantalla hay que bajar el croma a propósito.

La lección para la próxima, y va escrita aquí porque es la cara: **tenía la
guía en la bodega y no la abrí hasta que el cliente reprobó la pieza.**

## La idea, que sigue siendo una sola

**La X es una puerta.** Lo que cambió es que ahora del otro lado hay algo que
vale la pena entrar a ver.

- **Una fotografía de verdad ocupa la lámina entera**: los Pilares de la
  Creación del Hubble. Son verticales y SUBEN, así que el mundo apunta hacia
  la puerta sin necesidad de dibujar una flecha.
- **El verde aparece UNA vez a saturación entera: dentro del hueco.** En el
  resto de la lámina el texto es hueso y la única otra pizca de verde es un
  tercio de la regla. Repartir un color de marca por toda la hoja lo abarata;
  guardarlo para un solo sitio es lo que lo hace caro.
- **El mundo va con el croma comprimido y la luz bajada**, y sólo lo que se
  ve por el hueco está encendido.

## Las dos decisiones técnicas que sostienen la pieza

### 1 · El color se hornea en los archivos, no se pone con filtros de CSS

`gradar.py` deja tres archivos y **en toda la lámina no hay un solo
`filter:`**. Dos motivos, y el segundo es el que importa:

1. Un `filter:` obliga a Chromium a rasterizar la capa entera al factor de
   escala del PDF. Medido: **228 MB de PDF**, en flujos `FlateDecode` de
   5977 × 8340 px. Con el grado horneado, el mismo cartel pesa **3.6 MB** y
   la foto viaja como JPEG (`DCTDecode`).
2. **El hueco salía CIAN.** La nebulosa es azul-teal y una veladura verde al
   20 % encima no la mueve: la marca de Xbox tiene que ser VERDE o no es la
   marca. `nucleo.jpg` es la misma foto mapeada **por luminancia** a una
   rampa de verdes —un degradado de mapa—: conserva la textura y las
   estrellas, y el tono deja de ser una casualidad de la nebulosa.

| archivo | qué es |
|---|---|
| `fondo.jpg` | la foto encuadrada, con el croma comprimido y la luz bajada. 4200 px sobre 696 mm de lámina = **153 dpi** |
| `nucleo.jpg` | el mismo trozo de cielo mapeado a verdes de marca: lo que se ve por el hueco |
| `polvo.png` | la máscara de materia (abajo) |

### 2 · La marca no está pegada encima: la atraviesan los pilares

Ése era el defecto que quedaba después de arreglar el color. Una marca
pintada sobre una foto se lee **pegada**, y un hueco no se pega: se
interpone.

La solución la da la propia foto sin inventar nada. **Los pilares son polvo,
y la luz de una nebulosa los atraviesa a medias.** Así que donde hay pilar la
marca baja al 32 % y donde hay cielo abierto va entera. `polvo.png` sale de
la luminancia de la propia fotografía —percentiles 12 y 62, suavizado y con
*smoothstep*—, **no está dibujada a mano**.

No baja a cero a propósito: una máscara con agujeros negros se lee como un
error; una veladura se lee como materia.

## Cómo se regenera

```
python3 gradar.py    # el grado de color y la máscara de polvo (necesita pilares.jpg)
node render.mjs 3    # PDF de imprenta (1 página, 3.6 MB) + PNG 288 dpi + PNG de pantalla
node medir.mjs       # la compuerta
node detalle.mjs     # recortes 1:1 para mirar la letra chica
```

**`pilares.jpg` no está en el repo** (26.8 MB). Es `heic1501a.jpg` del CDN de
ESA/Hubble, 6780 × 7071 px, **CC BY 4.0**, y el crédito va impreso en el pie
del cartel: *NASA / ESA / Hubble Heritage Team (STScI · AURA)*. Los tres
archivos que produce sí están versionados, así que el cartel se rehace sin
volver a bajarla.

### Medidas, pensadas en milímetros y no en píxeles

Un cartel se piensa en el tamaño en que se imprime. Diseñar en píxeles y
«escalar al final» es cómo se acaba con texto de 4 pt y sangrado inventado.

| | |
|---|---|
| Hoja | 500 × 700 mm |
| Sangrado | 3 mm por lado, con marcas de corte |
| Área segura | 18 mm desde el corte |
| Retícula | 6 columnas · medianil 8 mm |
| Salida | PDF de 1 página, 506 × 706 mm · PNG a 288 dpi |

## La compuerta

`medir.mjs` — **24 comprobaciones, y las cuatro clases verificadas rompiendo
el diseño a propósito** para ver que se ponen rojas.

1. **Contraste contra el fondo DE VERDAD.** Aquí el fondo es una fotografía:
   medir contra «el negro del cartel» daría un número bonito y falso — es el
   error que ya está anotado en el Cerebro (`color.json`: *el contraste se
   midió contra el fondo equivocado*). Se apaga la capa de texto, se
   fotografía lo que queda, y cada texto se compara contra **los píxeles
   reales que tiene debajo**, quedándose con el peor.
2. **Área segura.** Nada legible entra en los 18 mm del corte.
3. **Cuerpo mínimo.** Impreso, por debajo de 3 mm no se lee. El aviso de
   pieza de concepto va a 3.4 mm a propósito: un descargo que no se puede
   leer no descarga nada.
4. **Que la marca sea verde de marca, y esté entera.** *Ésta se añadió porque
   FALLÓ*: el primer corte de la v2 enseñaba la nebulosa cruda por el hueco y
   la marca salía cian. Se veía en la pantalla y ninguna comprobación lo
   decía. Ahora el aspa se mide contra `#1DB954` y el anillo se recorre en 24
   puntos.

### Las cinco mutaciones, con lo que devolvió cada una

| se rompió | qué se puso rojo |
|---|---|
| el hueco enseña la foto cruda (el fallo real) | las 3 de la marca |
| radio del anillo a 250 | `2/24 puntos en verde` |
| el polvo tapa del todo en vez de velar | `13/24 puntos en verde` |
| la bajada en gris oscuro | `1.93:1` contra la foto |
| el titular fuera del área segura | 3 comprobaciones |

**Y una que se descubrió mutando, contra mí:** con el hueco en la foto cruda,
el check del *tono* siguió en verde — porque el gris no tiene tono y devuelve
un ángulo cualquiera (rgb(68,97,75), tono 134°). Un check que aprueba un gris
no comprueba color. El croma se metió **dentro de la misma comprobación**, no
al lado, y con eso la mutación la caza también.

## Dos defectos de la v1 que sólo salieron mirando la pantalla

Los dos pasaron las pruebas de sintaxis y ninguno se veía en el código. Se
dejan escritos porque son trampas del medio, no de esta pieza.

1. **La X salió OVALADA.** La v1 enmascaraba un `<div>` con
   `objectBoundingBox`; como la hoja no es cuadrada, el círculo se estiró.
   Ahora el plano, la luz y el hueco viven en un solo `<svg>` con `viewBox`,
   así que un círculo es un círculo.
2. **El haz tenía canto.** Un trapecio de relleno plano tiene una raya recta
   arriba y dos aristas a los lados: se lee como una rampa, no como luz. La
   luz no tiene filo.

## Lo que no se hizo, y por qué

- **No hay una sola imagen generada por un modelo.** Ni la marca ni el fondo.
  **El logo no lo dibuja un modelo de imagen** —regla de la casa en
  `marca/PLACA.md`—, y el fondo es una fotografía real de un archivo público,
  citada. Fabricar la marca de un tercero con un modelo sería lo contrario de
  una pieza de concepto honesta.
- **No se tocó la tipografía de Mazi.** Es una pieza de otra marca. Va en
  Inter y JetBrains Mono, incluidas en la carpeta para que el render salga
  igual en cualquier máquina.
