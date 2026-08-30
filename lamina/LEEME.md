# Lámina · segunda edición

Atlas de los defectos del diseño web: **353 piezas** en 42 áreas, repartidas en
**seis sistemas**. Un archivo autónomo, sin build, sin CDN y sin una sola
petición a un servidor ajeno.

## Por qué hay una segunda edición

Carlos reprobó la primera, e278, con la razón exacta: *«es un proyecto de
diseño que sólo tiene texto, un fondo medio café y una cuadrícula»*. Tenía
razón. Era un documento bonito, y un documento no demuestra que un
departamento sabe diseñar.

Lo que sí lo demuestra es lo que pidió, y es lo que hay aquí:

| Lo que pidió | Dónde se ve |
|---|---|
| Color | Seis sistemas, seis tonos, y el tono **se hereda** hasta la ficha |
| Cambios de cámara | Bajar de nivel acerca; subir aleja |
| Movimiento y transiciones | Sólo `transform` y `opacity`, sin una sola librería |
| Aparecer gradualmente | Máscara para el texto, opacidad para lo decorativo |
| Flujo de app | Sistema → área → pieza. Tres niveles, una sola vez |
| Dinamismo | Un campo de 353 puntos vivos, uno por pieza |
| Tres apartados | El atlas, el diagnóstico y cómo se hizo |

## El sistema, en cuatro reglas

1. **El tono se hereda.** Seis sistemas, seis tonos. El área los aclara, la
   pieza los usa de acento y el campo del fondo los reparte. Un color quiere
   decir lo mismo en los cuatro sitios donde aparece — así el color *informa*
   en vez de decorar.
2. **La cámara se mueve, la página no.** Bajar de nivel es un acercamiento: lo
   que dejas atrás retrocede, lo que llega viene del fondo. Es la misma escena,
   no dos páginas.
3. **El texto nunca aparece a media opacidad.** Se destapa con máscara
   —recorte más desplazamiento— a opacidad plena: un texto al 40 % no cumple
   contraste, y «aparecer gradualmente» no puede costar legibilidad. Lo
   decorativo sí usa opacidad; ahí no hay nada que leer.
4. **Ningún tono entre 270° y 310°.** Ahí vive el violeta de la casa, y esto es
   el portafolio del departamento, no material de Grupo Mazi.

## Cómo se rehace

```bash
node lamina/taller/armar.mjs . lamina/index.html
node lamina/pruebas.mjs http://127.0.0.1:8791      # 56 comprobaciones
```

`sistemas.js` es lo único editorial: qué área pertenece a qué sistema, y con
qué tono. **La versión anterior lo deducía comparando contra `origin/main` con
un `git ls-tree`** — funcionaba mientras las áreas nuevas estuvieran sin
fusionar, y el día que se fusionaron el atlas se habría quedado vacío sin que
nada avisara. Un contenido que depende del estado de una rama no es contenido:
es un efecto secundario.

## Dos defectos que costaron, y que ahora tienen prueba

**La máscara cortaba los acentos.** `overflow:hidden` recorta por la caja de
línea, y con `line-height:1` —lo normal en un rótulo en versalitas— la tilde de
la Ñ y el acento de la Ó se quedan fuera. La portada decía **«DEPARTAMENTO DE
DISENO · SEGUNDA EDICION»**. En español eso no es un detalle: es media página
mal escrita, y en una captura pequeña parece una errata de quien la escribió,
no un fallo de CSS. Ahora la caja crece arriba y abajo y devuelve el mismo
espacio con un margen negativo.

**Sin JavaScript la página se quedaba vacía.** Los tres niveles los pinta el
motor, así que sin motor no había ni una pieza: ni se leía, ni se buscaba con
Ctrl+F, ni salía en un buscador. Ahora se hornea el atlas entero en HTML llano
—los seis sistemas, sus áreas y las 353 piezas con su síntoma— y se esconde en
cuanto el motor arranca. Las fichas completas sí necesitan JavaScript, y la
propia página lo dice: prometer menos y cumplirlo es mejor que prometerlo todo.

## Lo que las pruebas pueden reprobar

Que el registro no cuadre; que el flujo se convierta en una rueda —que desde
las áreas de un sistema se salte a las de otro—; **que la cámara no se mueva**,
o sea que las «transiciones» sean un cambio de pantalla disfrazado; que el tono
no llegue hasta la ficha; que una máscara pueda cortar un acento; que sin
JavaScript falte contenido; que un texto no llegue a 4.5:1; que algo se
desborde o baje de 44 px; que se cuele una cuarta familia tipográfica o un
color de otra marca; y que salga **una sola petición** fuera del dominio.

Letras: Big Shoulders, Instrument Sans y Red Hat Mono, las tres SIL OFL, con su
licencia en `taller/fuentes/`.
