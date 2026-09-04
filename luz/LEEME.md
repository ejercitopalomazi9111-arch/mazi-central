# El año en luz

Cuánto dura el día en un sitio, y cómo cambia a lo largo del año.

Es **la pieza de examen del portafolio**: una web sobre un tema cualquiera que
no habla de diseño ni se explica a sí misma. Lo que haya que demostrar tiene
que estar en la página, no en un texto al lado diciendo lo bien que está.

## Qué hay dentro

| Archivo | Qué es |
|---|---|
| `sol.js` | El algoritmo solar de la NOAA. Setenta líneas, cero dependencias |
| `lugares.js` | Ocho ciudades con coordenadas y huso **estándar** |
| `formato.js` | Horas, duraciones y diferencias. Lo usan la página **y** el generador |
| `motor.js` | La página: los mandos, la barra del día, la banda del año |
| `estilo.css` | Todo el sistema visual |
| `taller/armar.mjs` | Hornea `index.html` con el año de la ciudad por omisión ya escrito |
| `pruebas.mjs` | 52 comprobaciones |

## Cómo se rehace

```bash
node luz/taller/armar.mjs      # reescribe luz/index.html
node luz/pruebas.mjs           # 52/52, con el repo servido en el 8791
```

## Tres decisiones que parecen raras y no lo son

**Hay un generador para una página que ya calcula sola.** Sin él, con el
JavaScript apagado la página es un esqueleto. Con él, el HTML sale con el año
entero de la ciudad por omisión ya escrito: se lee, se busca con Ctrl+F, se
imprime y sale en cualquier buscador. El JavaScript deja de traer el contenido
y pasa a hacerlo interactivo, que es su sitio.

**Ninguna ciudad de la lista adelanta el reloj en verano.** No es casualidad:
meter una obligaría a llevar la tabla de cuándo empieza y termina el horario de
verano en cada país y a mantenerla, y una tabla así mal mantenida publica horas
equivocadas sin avisar. Para cualquier otro sitio está «mi ubicación», que usa
el huso del propio aparato.

**En el lienzo no se escribe.** Las horas y los meses son HTML, no pintura del
canvas. Dentro estaban en blanco translúcido y en verano caían sobre el ocre
del día —1.9:1, ilegible— y además no crecen si alguien sube el tamaño de
letra, porque un canvas no sabe de eso.

## Lo que las pruebas pueden reprobar

La astronomía se comprueba **contra constantes que no salen de esta
implementación**: ±23.44° de declinación en los solsticios, +16.4 y −14.2
minutos como extremos de la ecuación del tiempo, y 12 h 07 m en el ecuador
todo el año. Falsear la oblicuidad de la eclíptica en cuatro décimas tumba
tres pruebas.

También reprueban: que la página no diga nada sin JavaScript, que un `id` esté
repetido, que un texto no llegue a 4.5:1 en cualquiera de los dos temas, que
algo se desborde o baje de 44 px, que se cuele una cuarta familia tipográfica
o el color de otra marca, y que salga **una sola petición** fuera del dominio.

Letras: Young Serif, Work Sans e IBM Plex Mono, las tres SIL OFL, con su
licencia en `fuentes/`.
