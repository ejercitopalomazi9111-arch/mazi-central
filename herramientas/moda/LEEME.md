# Anuncios de moda en lote

Hecho para **All's fashion · clothes & more** (9 de octubre de 2026). Carlos subió al banco
129 fotos de su ropa y pidió *«un chingo de anuncios con el logo para publicar como 10 todos
los días durante 15 días»*, más anuncios de **tandas**: 15 personas, 15 días, cada día todos
ponen una parte y alguien estrena; primero playeras, luego sudaderas, pantalones y chamarras o
lociones.

Salen **227**: 150 de los días (6 publicaciones 4:5 y 4 historias 9:16 por día) y 77 de tandas
(cómo funciona, las cuentas, el calendario, los lugares, la encuesta y el avance diario «Día N de 15»).

## Cómo se arma

1. **Bajar las fotos del banco** a `trabajo/fotos/` y la lista a `trabajo/alls.json`.
2. `python3 catalogo.py` — clasifica cada foto por índice (sudadera, tenis, bolsa…). Las
   categorías se escribieron viendo las hojas de contacto: **si cambian las fotos, se revisa
   a ojo y se edita ahí**.
3. `node srv.mjs 8765 &` y `node recortar.mjs` — quita el fondo de cada prenda con el mismo
   recorte de `presentaciones/recorte.js` (MediaPipe, en el navegador, sin servidor).
   Revisar los recortes sobre un fondo de color: los que se comieron el mármol se marcan
   `malo` en `trabajo/recortes/info.json` y esa prenda va con su foto completa.
4. `node plan.mjs` — el calendario: qué prenda, qué diseño, qué frase, qué día.
5. `node render.mjs trabajo/plan.json <salida>` — un JPEG por anuncio.

`trabajo/` no se sube: son las fotos y el logo del cliente. `TRABAJO=/otra/carpeta` lo cambia.

## Los diseños (`anuncios.html`)

estudio (prenda con luz de estudio) · crema (claro, palabra gigante detrás) · color (fondo
del color de la prenda) · revista (portada con el logo de cabecera) · etiqueta (con su
etiqueta colgando) · trío (escoge tu color) · foto completa · rejilla de 4/6 con medalla ·
tienda (la bodega en un marco) · y los de tanda.

Cada anuncio se comprueba al pintarse: nada de texto fuera del lienzo y el título se encoge
hasta caber en tres renglones.

## Lo que NO dicen, a propósito

Ni precios, ni «originales», ni envíos, ni dirección, ni cuánto se paga al día en la tanda:
nada de eso lo confirmó Carlos. Todos mandan a DM. Si da el precio de la tanda, se agrega
en `plan.mjs` y se vuelve a correr.
