# Carteles

Anuncios para redes de cualquier marca, hechos en el teléfono (todo se pinta en un `<canvas>`;
las fotos no salen de él salvo lo que se le pide al banco de La Sala).

## Las pestañas

| Pestaña | Para qué |
|---|---|
| **Campaña** | Fotos del banco (por carpeta) o del teléfono → categoría automática → quitar fondos → estilo → calendario de N días × M anuncios, tandas y encuestas → ver por día, rehacer uno, ZIP con carpeta por día o «Guardar en Fotos» |
| Un cartel | Un producto, todos los estilos de su grupo, «Otra versión» |
| Marca | Logo, colores, letras, WhatsApp. El logo con fondo liso se vuelve transparente solo |
| Desde Excel | Tabla de productos + fotos por nombre de archivo |

## Las piezas

| Archivo | Qué hace |
|---|---|
| `motor.js` | El motor y los 6 estilos de comida. `registrar()` deja que otros sumen estilos |
| `moda.js` | 17 estilos de moda con caché (maison, pasarela, minimal, preppy, náutico, glamour, dorado, rebaja, departamental, estudio, revista, etiqueta, su color, colección, mosaico, vitrina, portada) y el logo que se adapta |
| `campanas.js` | Tanda (cómo funciona, el número, las cuentas, calendario, lugares, avance diario) y encuesta A o B. Con precio calcula el pago diario; sin precio no inventa |
| `calendario.js` | Reparte N días × M sin repetir prenda en el día, usando parejo estilos y fotos |
| `frases.js` | Categorías (27) con sus frases y su género («la tuya», «los tuyos»); `categorizar()` lee lo que dice el banco |
| `recorte-lote.js` | Quita el fondo sin pantalla (MediaPipe de Presentaciones); si el recorte no sale limpio, se usa la foto completa |
| `campana-app.js` | La pestaña Campaña |

## De dónde salen los estilos de moda

Pedido de Carlos (9 de octubre de 2026): *«usa de referencia los de Dior, Gucci, Prada, Tommy H,
Náutica, MK, Guess, Zara, Liverpool y otros que sean de caché»*. Se tomó **la manera de componer**
(foto que manda, mucho aire, una letra con carácter, el logo como firma, el llamado como línea), no
logos, monogramas ni tipografías registradas. Cada estilo dice en su ficha a qué se parece.

## Lo que los anuncios NO dicen

Precios, «originales», envíos, sucursal o cómo se decide la tanda: sólo si la marca los da.

## Pruebas

```
node carteles/pruebas.mjs            # Un cartel, Marca y Desde Excel (38)
node carteles/pruebas-campana.mjs    # calendario, frases, tanda, cada estilo auditado y la Campaña de punta a punta (68)
```

La auditoría de texto anota dónde cae cada `fillText` y exige que nada se salga del cartel ni se
encime con otro texto. Es la que encontró el «NUEVA COLECCIÓN…» que se metía en el titular.
