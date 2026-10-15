# La campaña de Fadori · de dónde sale cada cosa

Pedida por Carlos el 15 de octubre: 15 pósters de dos caras y un comercial con 3 s de créditos al final.

**Segunda vuelta, el mismo día.** Carlos: *«no uses las fotos de place holder… las de pizza, productos
empacados y café va, pero las de hamburguesas, hotdogs y así no, se ven horribles»*, y pidió un estilo más
de app de comida (Rappi, DiDi, Uber Eats, Temu, Mercado Libre, Domino's). Por eso la comida va **ilustrada**
y sólo quedan dos fotos de platillo: la pizza y el capuchino. La pantalla de turnos sale en una compu con un
partido y los logos de Fadori y Radio Divergentes.

| Qué | Autor · licencia | Dónde |
|---|---|---|
| Ilustraciones `img/fl/*.svg` | Fluent Emoji de Microsoft · MIT (`img/fl/LICENSE-fluent.txt`) | github.com/microsoft/fluentui-emoji |
| `img/hd-pizza-individual.jpg` | @joefoodie · CC BY 2.0 | flickr.com/photos/98178986@N00/3804324703 |
| `img/hd-cafe-capuchino.jpg` | Bryan Pocius · CC BY 2.0 | flickr.com/photos/57104631@N00/4437445488 |
| El partido dentro de `img/f-vivo.png` | EileenSanda · CC BY-SA 3.0 | Wikimedia Commons, «TB vs ÍF 29-04-2012 Við Stórá» |
| Música «Funky Chunk» (sólo el video) | Kevin MacLeod · CC BY 4.0 | incompetech.com |
| Bebidas, botanas y dulces (`img/*.jpg` sin `hd-`) | foto de catálogo de cada producto; las marcas son de sus dueños | ver `fadori/fotos/CREDITOS.md` |
| `img/radio-divergentes.png` | logo de Radio Divergentes | `podcast/marca/` |
| `img/f-*.png` | la app Fadori de verdad, con datos de prueba en un servidor local | capturas propias |
| Letras Anton, Poppins, DM Serif Display y Pacifico | SIL Open Font License (`f/OFL-*.txt`) | Google Fonts |

Cada póster con foto lleva su línea de crédito; el video, su pantalla de créditos.

## Tandas B y C (15 de octubre, tercera vuelta)

Carlos pidió 15 pósters más al estilo de la primera tanda (`posters-b.html`) y 15 con diseños variados
y **fotos reales de comida normal** (`posters-c.html`), con «Imágenes ilustrativas» en pequeño en una
esquina de toda cara que muestre comida. Las capturas de la app (`img/app-*.png`) son la app real, con
sus fotos de verdad: la vez pasada se le habían cambiado las fotos por ilustraciones y Carlos lo notó.

Las fotos son CC0 (dominio público): no piden crédito, pero aquí queda de dónde salió cada una.

| Qué | Autor · licencia | Dónde |
|---|---|---|
| `img/foto/brownie.jpg` | rawpixel · CC0 (rawpixel) | https://www.rawpixel.com/image/5906085/photo-image-background-public-domain-tree |
| `img/foto/capuchino.jpg` | Bryan Pocius · CC0 (stocksnap) | https://stocksnap.io/photo/coffee-cappuccino-TO4DBIESND |
| `img/foto/capuchino-b.jpg` | Porapak Apichodilok · CC0 (stocksnap) | https://stocksnap.io/photo/cappuccino-froth-8R6DD0I63L |
| `img/foto/galletas.jpg` | Suzy Hazelwood · CC0 (stocksnap) | https://stocksnap.io/photo/cookies-chocolatechipcookies-S4T2FDBYCN |
| `img/foto/galletas-b.jpg` | PICSELI · CC0 (stocksnap) | https://stocksnap.io/photo/chocolatechip-cookies-PAUNN1ZOQL |
| `img/foto/hamburguesa.jpg` | Sebastián LP · CC0 (stocksnap) | https://stocksnap.io/photo/burger-food-BN2YAQSIU1 |
| `img/foto/hamburguesa-b.jpg` | Markus Spiske · CC0 (stocksnap) | https://stocksnap.io/photo/food-burger-CFSQPAXM18 |
| `img/foto/hotdog.jpg` | rawpixel · CC0 (rawpixel) | https://www.rawpixel.com/image/6075115/hot-dogs |
| `img/foto/hotdog-b.jpg` | rawpixel · CC0 (rawpixel) | https://www.rawpixel.com/image/6075018/hot-dogs |
| `img/foto/pizza.jpg` | Pawel Kadysz · CC0 (stocksnap) | https://stocksnap.io/photo/pizza-food-R926LU1YEA |
| `img/foto/pizza-b.jpg` | rawpixel · CC0 (rawpixel) | https://www.rawpixel.com/image/5914811/image-public-domain-fire-food |
| `img/foto/quesadilla.jpg` | rawpixel · CC0 (rawpixel) | https://www.rawpixel.com/image/5940361/free-public-domain-cc0-photo |
| `img/foto/quesadilla-b.jpg` | T'Kai Monet · CC0 (wordpress) | https://wordpress.org/photos/photo/58169e6dbd/ |
| `img/foto/tacos.jpg` | Tim Sullivan · CC0 (stocksnap) | https://stocksnap.io/photo/mexican-tacos-UPG7YS3LGW |
| `img/foto/tacos-b.jpg` | rawpixel · CC0 (rawpixel) | https://www.rawpixel.com/image/5917508/free-taco-image-public-domain-food-cc0-photo |
| `img/foto/torta.jpg` | petradr · CC0 (stocksnap) | https://stocksnap.io/photo/sandwich-toasted-D7F9292D60 |

Se arman con `node fadori-campana/armar.mjs posters posters-b.html B` (y `C`); `previa` en lugar de
`posters` saca las dos hojas de revisión (frentes y vueltas) a tamaño de pantalla.
