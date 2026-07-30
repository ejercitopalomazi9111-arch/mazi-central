# La placa de fondo · prompt para generar

Carlos preguntó: *"dame la imagen del logo FINAL con el texto y un fondo tipo render chingón, o dame
el prompt y la imagen para hacerlo. ¿Qué recomiendan?"*

**La imagen ya está hecha:** `marca/render/` — siete tomas compositadas con la paloma vectorizada y
el logotipo en la fuente de la casa, a 2× de resolución. Se regeneran con `node marca/render.mjs
--capturar`.

Este archivo es para el otro camino: cuando quieras un fondo **generado** que no se pueda hacer con
un degradado.

---

## LA REGLA, y no es negociable

> **El logo NUNCA lo dibuja un modelo de imagen. Lo que se genera es el FONDO, y encima se compone
> el logo de verdad.**

Ya lo vivimos completo: reconstruir esta paloma desde imágenes generadas costó **veinte rondas** de
corrección, y el resultado bueno no salió de generar — salió de **vectorizar** una y arreglarla a
mano. Un modelo no puede repetir dos veces la misma paloma, ni respetar el ancho de las barras de la
cadera, ni acertarle al violeta medido. **Cada intento es una paloma distinta, y una marca que cambia
no es una marca.**

Entonces el flujo es siempre el mismo:

```
1. generas la PLACA (fondo, sin logo, sin letras, sin aves)
2. la guardas en marca/placas/
3. yo la meto en render.mjs como una toma más
4. el logo real se compone encima, exacto
```

---

## El prompt · placa oscura de estudio

Va en inglés porque los modelos de imagen responden mejor, y con el negativo explícito.

```
Abstract dark studio backdrop, deep near-black background with a subtle
desaturated violet cast. A single soft light source from the upper center
falling off into darkness at the edges. Smooth volumetric haze, very fine
film grain, gentle vignette. Empty center with room for a subject.
Cinematic product photography lighting. Absolutely no text, no letters,
no logos, no birds, no animals, no objects, no people. Pure background
plate. 16:9, high resolution.
```

**Negativo, si el modelo lo acepta aparte:**
```
text, letters, typography, watermark, logo, bird, wings, animal, person,
object, product, furniture, hands, frame, border, sharp shapes
```

## Variantes

| Quieres | Cambia en el prompt |
|---|---|
| **Panel de LED** | `...backdrop resembling the black glass of a large LED display panel, faint regular pixel grid, deep violet glow bleeding from the center...` |
| **Concreto / taller** | `...raw polished concrete wall lit from one side, subtle texture, industrial, desaturated...` |
| **Papel para documentos** | `...soft warm off-white paper surface, very subtle fiber texture, even diffuse light, no shadows...` |
| **Vertical para Instagram** | cambia `16:9` por `4:5` y sube la luz al `upper third` |

## Lo que hay que revisar antes de usar una placa

1. **Que no haya NADA reconocible.** Si el modelo metió un objeto, un reflejo con forma o una
   textura que parece un logo, se descarta. El centro tiene que estar vacío.
2. **Que el violeta no pelee con `#AC27FF`.** Si la placa trae un morado distinto, el logo encima se
   va a ver mal calibrado. Mejor una placa casi neutra y el violeta lo pone el logo.
3. **Que se vea bien a 48 px.** Una placa con mucha textura se vuelve ruido en un avatar.
4. **Que no tenga marca de agua.** Se ven a 100% de zoom, no a tamaño de pantalla.

---

## La recomendación

**Para todo lo que lleve el logo: compositado.** `marca/render.mjs`. Es exacto, se regenera con un
comando, pesa nada y el logo sale idéntico siempre.

**Generado: sólo la placa, y sólo cuando el degradado no alcance** — o sea cuando quieras concreto
real, tela real, una superficie con historia. Para luz y atmósfera, el degradado gana: es más limpio
y se puede cambiar de color en una línea.

**Y hay una tercera opción que es mejor que las dos para el sitio:** que el fondo **no sea una
imagen**. Un degradado en CSS con el grano en SVG pesa **cero kilobytes**, se adapta a cualquier
pantalla, y responde al scroll. En una página, eso le gana a cualquier PNG de 2 MB.
