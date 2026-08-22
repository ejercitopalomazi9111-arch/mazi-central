# Los logos de la credencial

| Archivo | Qué es | De dónde salió |
|---|---|---|
| `logo-acc.jpg` | Advanced Critical Care · el original que mandó Carlos | él |
| `logo-acc.png` | el mismo, **sin fondo** | derivado |
| `parche-fire-rescue.jpg` | el parche bordado, original | él |
| `parche-fire-rescue.png` | el mismo, **sin fondo** | derivado |
| `escudo-ems.jpg` | EMS Paramedic · todavía no se usa, guardado para después | él |
| `qr-instagram.jpg` | el QR del perfil, puesto de base y cambiable | él |

## Por qué hay `.png` además del `.jpg`

Los originales son JPG con fondo blanco. Encima del azul marino de la credencial eso se ve como una
caja blanca. Se les quitó el fondo con **el canvas de un navegador sin cabeza** —la única
herramienta de imagen que hay en este contenedor— desvaneciendo el borde en vez de cortarlo, que es
lo que deja el diente de sierra al imprimir.

Los `.jpg` se conservan **como fuente**: si hay que volver a derivar el recorte, se parte de ellos y
no de una copia de una copia.

## El recorte del parche

El parche trae su propio texto arriba y abajo, y en el pie de la credencial estorba porque la
tarjeta ya dice *ADVANCED FIRE RESCUE* con su tipografía. Se muestra sólo el casco con las llamas.

La zona se **midió**, no se estimó: el color vive entre **x 17.8 – 81.4 %** y **y 19.1 – 66.9 %**,
lo que da un aspecto de **1.8**. Por eso la caja del pie lleva ese mismo aspecto — si se le deja
holgura vertical, vuelve a asomar el texto.

## La medida de la credencial

De la imagen que mandó Carlos: **1.654** de alto sobre ancho, que da **63.5 × 105 mm**. Se puede
cambiar desde la pestaña **Credencial**, porque cada imprenta pide lo suyo.

## Pendiente

Selector de tipografía. Hoy la credencial usa Arial —la de su diseño original— y **nunca** la
tipografía de Grupo Mazi. Lo pidió Carlos así, con la opción de cambiarla el día que quiera.
