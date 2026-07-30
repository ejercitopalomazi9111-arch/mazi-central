---
name: scroll-cinema
description: La animación de scroll de las páginas caras (Apple AirPods, Mac Pro) — una secuencia de fotogramas dibujada en canvas cuyo índice lo manda la posición del scroll. Úsala cuando pidan "que se anime mientras hago scroll", una portada cinematográfica, un producto que gira o se arma al bajar, o cualquier efecto tipo Apple. Incluye la implementación completa, el presupuesto de peso y la degradación honesta en teléfono.
---

# Cine de scroll

La técnica de las páginas caras. No es magia ni WebGL: es un **flipbook digital**.

## Qué es en realidad

Se toma un video, se parte en fotogramas sueltos (`0001.jpg`, `0002.jpg`…), y en vez de
reproducirlo, **JavaScript lee cuánto scroll llevas y dibuja el fotograma que toca en un
`<canvas>`**. Parece video, pero responde a tu dedo: si subes, va para atrás; si te detienes,
se congela.

Ese control es todo el efecto. Un video no lo puede hacer.

## Por qué importa para Grupo Mazi

**No necesita React, ni framework, ni build.** Es canvas + JavaScript puro. Encaja perfecto con
la entrega favorita — un archivo HTML autónomo — y es de las pocas técnicas "de página cara"
que se puede hacer sin arrastrar medio ecosistema.

Es candidata natural para el **laboratorio de animación** del sitio (`CLAUDE.md` §6-bis).

## Cómo se hace

### 1 · Los fotogramas

Se parte el video con `ffmpeg` y se numeran con ceros a la izquierda:

```bash
ffmpeg -i origen.mp4 -vf "fps=30,scale=1280:-1" -q:v 6 fotogramas/%04d.jpg
```

**Regla del arte:** el video de origen tiene que ser **real** — grabado, o de banco con
licencia. Nada de fotogramas generados por código. Si el "producto" que gira es una app
nuestra, se graba la pantalla y de ahí salen los fotogramas.

### 2 · El espacio de scroll

El canvas se queda **fijo** y el cuerpo de la página se estira para dar recorrido:

```css
html { height: 100vh; }
body { height: 500vh; }        /* 5 pantallas de recorrido */
canvas { position: fixed; left: 50%; top: 50%; transform: translate(-50%, -50%); }
```

### 3 · Scroll → fotograma

```js
const scrollTop     = document.documentElement.scrollTop;
const maxScrollTop  = document.documentElement.scrollHeight - window.innerHeight;
const avance        = scrollTop / maxScrollTop;              // 0 … 1
const indice        = Math.min(total - 1, Math.floor(avance * total));
```

### 4 · Dibujar

Siempre dentro de `requestAnimationFrame`. Dibujar directo en el evento de scroll produce
parpadeo.

**El error clásico:** casi todos los tutoriales hacen `img.src = ruta` en cada fotograma. Eso
**vuelve a pedir la imagen** aunque ya esté en caché. Lo correcto es guardar los objetos
`Image` en un arreglo y dibujar de ahí:

```js
const cuadros = [];                       // se llena en la precarga
ctx.drawImage(cuadros[indice], 0, 0);     // sin tocar .src nunca más
```

Implementación completa y comentada en `reference/implementacion.md`.

## El presupuesto de peso — léelo antes de vender esto

Aquí es donde esta técnica mata sitios.

**La animación de AirPods de Apple pesa ~55.8 MB en 148 imágenes.** Apple se lo puede permitir.
Un negocio local en México, con un cliente en datos móviles, **no**.

Presupuesto que sí funciona:

| | Escritorio | Teléfono |
|---|---|---|
| Fotogramas | 60–120 | 30–48 |
| Ancho | 1280–1600px | 720px |
| Peso total | **≤ 3 MB** | **≤ 800 KB** |

Si no cabe en ese presupuesto, **el efecto no va**. Punto. Una portada bonita que tarda ocho
segundos en cargar es una portada que nadie ve.

## Degradación honesta

Tres puertas, en orden:

1. **`prefers-reduced-motion`** → una sola imagen fija, la más representativa. Sin excepción.
2. **Conexión lenta** (`navigator.connection.saveData` o `effectiveType` de `2g`/`slow-2g`) →
   imagen fija. Es lo que hace Apple: en móvil con 3G sirve ~350 KB en vez de megas.
3. **Teléfono normal** → secuencia corta y angosta, no la de escritorio.

La secuencia completa es el caso **mejor**, no el caso base. Se construye al revés de como lo
piensa todo el mundo.

## Cuándo NO usarla

- **Cuando el contenido es el producto.** Si la gente viene a leer o a comprar, un flipbook de
  5 pantallas de alto es un peaje, no un regalo.
- **Cuando no hay video real que valga.** El efecto sólo impresiona si lo que gira impresiona.
- **En una landing de conversión.** Retrasa el CTA. Ahí manda la velocidad.
- **Más de una vez por sitio.** Es un truco de portada. Repetido, cansa y pesa el doble.

## Errores que se pagan caro

| Error | Qué pasa | Arreglo |
|---|---|---|
| Dibujar en el evento `scroll` | parpadeo y tirones | todo dentro de `requestAnimationFrame` |
| Reasignar `img.src` por fotograma | pide la imagen otra vez | arreglo de `Image` precargadas |
| No manejar el `resize` | canvas borroso o cortado | recalcular y redibujar, con *debounce* |
| Empezar antes de precargar | primeros fotogramas en blanco | barra de carga hasta tener el 100% |
| Ignorar el retina | se ve suave y feo | `canvas.width = css * devicePixelRatio` |

## Alternativas más baratas

Antes de meter 3 MB de fotogramas, checa si alcanza con esto:

- **Un `<video>` con `currentTime` manejado por scroll** — mucho más ligero, pero el rasqueo
  (*scrubbing*) va irregular en Safari de iPhone. Probar en el teléfono de Carlos antes.
- **Animación por CSS con `scroll-timeline`** — nativa, sin JS, pero soporte todavía disparejo.
- **SVG o elementos animados con Anime.js** — si lo que se mueve es geometría y no un objeto
  filmado, esto pesa kilobytes en vez de megas.

**La regla:** la secuencia de fotogramas es la opción **más cara**. Se usa cuando de verdad hay
un objeto real que tiene que girar, y no antes.

## Trabaja con otras skills

- **`ui-components`** — React Bits trae fondos animados por WebGL; otro camino al mismo "se ve
  caro", con otro presupuesto.
- **`web-prompts`** — el pase de pulido revisa el peso y `prefers-reduced-motion`.
- **`four-judges`** — si el efecto va a costar 3 MB en la portada, rostízalo: ¿vende o luce?

## Fuentes

- [CSS-Tricks — Let's Make One of Those Fancy Scrolling Animations](https://css-tricks.com/lets-make-one-of-those-fancy-scrolling-animations-used-on-apple-product-pages/)
- [Scroll Driven Image Sequence Animations](https://medium.com/@kozelsky/how-to-create-scroll-driven-image-sequence-animations-964359507371)
- [Casi puro CSS para secuencias por scroll](https://geyer.dev/blog/css-image-sequence-animations/)
