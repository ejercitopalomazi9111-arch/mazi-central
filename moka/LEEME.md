# La cafetera · pieza de práctica del departamento de diseño

Una página de producto sobre la cafetera moka. No es una tienda: es una pieza
para enseñar oficio, y por eso todo lo que se ve tiene que aguantar que lo
miren de cerca.

Carlos, e280: *«haz tus web de práctica para tu portafolio sobre algún producto
con ejemplos de ese producto etc tú tienes que conseguir la imagen quitarle el
fondo animar etc»*.

## Lo que hay que mirar

| Lo que se pidió | Dónde está |
|---|---|
| Conseguir la imagen | Wikimedia Commons, con su autor y su licencia en `CREDITOS.md` |
| Quitarle el fondo | `taller/recortar.py` — y no fue trivial, ver abajo |
| Animar | Las tres piezas se montan en la portada; el corte anima el ciclo entero |
| Ejemplos del producto | Las tres piezas, los ocho tamaños y la foto en uso |

## El recorte, que es la parte que costó

El despiece original es una foto sobre un **degradado gris**, y la cafetera es
de aluminio: gris también. En el guion están escritos, uno a uno, los cuatro
métodos que se probaron y por qué fallan:

1. **Umbral de color** — el fondo no es blanco. Cualquier umbral que borre el
   fondo se lleva medio cuerpo.
2. **Inundación desde los bordes con tolerancia local** — el canto es suave, así
   que la inundación sube por la rampa y entra. Medido: **99 % de la imagen
   marcada como fondo**.
3. **Residuo contra un plano de fondo** — acierta la silueta, pero la sombra
   sobre la mesa también se aparta del plano y queda pegada a la base.
4. Y el problema de fondo: **buena parte del costado de la jarra tiene
   exactamente el mismo color, brillo y textura que el fondo**. Ahí no hay
   señal que valga, porque no hay nada que saber.

Lo que se hace: la silueta la da el mapa de **bordes**; el interior con textura,
el **residuo del plano**; y el trozo donde no hay señal se marca **a mano**, con
un rectángulo escrito en el código. Está a la vista, igual que se vería un
trazo de pluma en un archivo de Photoshop — fingir que salió solo sería mentir
sobre cómo se hizo.

Y tres remates: apertura de 17 px para los filamentos de sombra, medio píxel de
difuminado en el alfa, y **des-mezclar la aureola** (los píxeles del canto
llevan gris del fondo y sobre fondo oscuro eso es un halo).

## Cómo se rehace

```bash
python3 moka/taller/recortar.py moka/taller/origen/flotando.png moka/img
python3 moka/taller/optimizar.py          # 5.2 MB → 404 KB
node moka/taller/armar.mjs
node moka/pruebas.mjs http://127.0.0.1:8791   # 40 comprobaciones
```

El generador **copia el CSS y el motor**, no se copian a mano: la primera vez lo
hice con un `cp` y el sitio publicado se quedó una tarde con la versión
anterior. Lo que el generador no copia, no existe.

## Dos defectos que costaron media hora cada uno

**`min-height:auto`, que no se ve por ningún lado.** Un hijo de grid o de flex
tiene por omisión un tamaño mínimo igual a su contenido, y en una imagen ese
contenido es su tamaño natural. Ni `max-height:100%` ni `height:100%` pueden
con él: la foto se quedaba en **353 px dentro de una caja de 176**, se salía de
la tarjeta y tapaba el texto de la de al lado. La línea que lo desbloquea es
`min-height:0`.

**Las cifras en la tipografía de rótulo.** Italiana es de 1930 y sus números son
de estilo antiguo y finísimos: «1–2 bar» y «50 ml» se leían como un adorno y no
como un dato. La display rotula; las cifras van en la mono, que además las
alinea.

## Los datos

Salen del artículo *Moka pot* de Wikipedia y de las fuentes que cita: tres
piezas, 1–2 bar contra los 9 del espresso, proporción 1:10 en masa, 50 ml por
taza, el gorgoteo como señal de sobreextracción, y la migración de aluminio
—por debajo del 1 % del límite semanal con uso normal, hasta casi el 4 %
después de un lavavajillas—. **No hay ni una cifra inventada; donde no había
dato, no hay frase.**

## Las imágenes y su licencia

Tres de las cuatro son **CC BY-SA**. Recortar el fondo y separar las piezas crea
una obra derivada, así que los archivos de `img/` heredan esa misma licencia.
No es un tecnicismo: es la condición con la que su autor las publicó. Autor,
licencia y qué se le hizo a cada una, en [`CREDITOS.md`](CREDITOS.md).

Letras: Italiana, IBM Plex Serif y DM Mono, las tres SIL OFL.
