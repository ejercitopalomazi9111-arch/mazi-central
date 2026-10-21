# Smiley's Wings & Pizza

Sitio completo del local: portada, la caja que se abre, carta, «Ármala tú», alitas y más,
promociones, sucursales y **pedido por WhatsApp** a la sucursal que elija el cliente.
Un solo `index.html` con la carpeta `img/`, sin compilación.

## Cómo se edita

La página se escribe en `scripts/fuente.html` y se arma con:

    python3 smileys/scripts/armar.py

El armador le mete el logo y la sonrisa en vector (`img/logo.svg`, `img/sonrisa.svg`,
trazados con potrace de la foto de la caja) y los pinceles del armador de pizzas que hizo
Godines en la versión anterior (`anterior.html`, que se queda como estaba).

## El pedido

- Recetas (con tamaño, orilla y cantidad), pizza armada, complementos y promociones.
- Se guarda en el teléfono: si se cierra la página, el pedido sigue ahí.
- Pide sucursal, nombre y, si es a domicilio, dirección. El mensaje sale ya redactado.
- **El precio de cada receta por tamaño no lo tenemos**, así que la página no lo inventa:
  suma lo que sí tiene precio y le pide a la sucursal que confirme el resto. La grande de un
  ingrediente sí vale $109 y la página la cobra así.

## Fotografía

Del local: `mostrador.jpg`, `caja.jpg`, `cartel.jpg` y `kraft.jpg` (recortada de la caja).
Provisionales de Unsplash: `hero`, `base`, `orilla`, `pz/*` y `c-*`. **Hay que cambiarlas por
fotos del producto real** antes de usar la página como oficial.

## Datos

Carta, precios, teléfonos y la frase del cartel salen de fotos del local de septiembre de
2026. Conviene revalidar precios antes de publicar.
