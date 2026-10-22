# Smiley's Wings & Pizza

Sitio completo del local, versión 2 (22 de octubre de 2026): la entrada de la caja que se abre,
portada, las favoritas, «¿Cuántos van a comer?», la carta, «Ármala tú», alitas y más,
promociones por rebanada, sucursales y **pedido por WhatsApp** a la sucursal que elija el cliente.
Un solo `index.html` con la carpeta `img/`, sin compilación. Pruebas: `node smileys/pruebas.mjs <base>`.

## Cómo se edita

La página se escribe en `scripts/fuente.html` y se arma con:

    python3 smileys/scripts/armar.py

El armador le mete el logo y la sonrisa en vector (`img/logo.svg`, `img/sonrisa.svg`, trazados
con potrace de la foto de la caja).

## Las piezas

- **La entrada**: la tapa de cartón con el logo impreso, la sonrisa se dibuja y la tapa se abre.
  Una vez por visita, se salta con un toque, no sale con «reducir movimiento».
- **La caja del pedido**: el botón flotante es la caja 3D (modelo de Kenney, CC0) pintada cuadro
  por cuadro una sola vez: `scripts/caja-sprite.html` + `scripts/caja-sprite.mjs` →
  `img/caja-cuadros.webp` y `img/caja-cerrada.webp`. La página no corre 3D en vivo.
- **Ármala tú** (`horno.js`): una pizza de queso de verdad y cada ingrediente recortado de fotos
  reales (`scripts/ingredientes.py` → `img/armar/`). Las fotos fuente no se suben; el script dice
  de dónde sale cada una.
- **¿Cuántos van a comer?**: busca la combinación más barata de promos que alcance (2 grandes $289,
  2 familiares $350) y avisa si con grandes sencillas ($109) sale más barato.

## Lo que la página NO hace a propósito

No inventa reseñas, ni «12 personas están pidiendo», ni «quedan pocas». No son datos y la
publicidad engañosa está prohibida (Ley Federal de Protección al Consumidor). Lo que sí empuja la
venta es verdad: «la más vendida» lo dice la caja del local, y los precios por rebanada y lo que
se ahorra en par salen de los precios del cartel.

## El pedido

- Recetas (con tamaño, orilla y cantidad), pizza armada, complementos y promociones.
- Se guarda en el teléfono: si se cierra la página, el pedido sigue ahí.
- Pide sucursal, nombre y, si es a domicilio, dirección. El mensaje sale ya redactado.
- **Tamaños:** chica 6 rebanadas, grande 8, familiar 10 (Carlos, 22 de octubre). La chica no trae precio
  en la carta: se pide suelta y la sucursal la cotiza.
- **Las especialidades van en 2×1** (carta del mostrador, 22 de octubre): dos grandes $289, dos
  familiares $350, de 1 a 4 ingredientes, especialidad o mitad y mitad. La segunda se elige en la
  hoja. Orilla de queso +$35 por pizza (en el 2×1 se cobra en las dos: falta que Carlos lo confirme).
- Combos 1 a 5, snacks (4 muffins $49, 2 chicken bake $119) y Smileys Burger salen de las fotos
  de la carta del 22 de octubre. Las dos grandes son $289 en mostrador y $319 a domicilio
  (Carlos, 22 de octubre): el carrito cambia el precio al elegir «A domicilio». De las familiares a
  domicilio no se sabe, se quedan en $350.

## Fotografía

Del local: `mostrador.jpg`, `caja.jpg`, `cartel.jpg`, `kraft.jpg` (recortada de la caja), `real-queso.jpg`
(de la portada de su Facebook), `m-*` (recortadas de su carta) y `real-combo.jpg` (del cartel de los combos, octubre de 2026).
Provisionales, de Unsplash y Pexels (licencia libre): `hero-queso` (Unsplash
1541745537411), `alitas-glaseadas` (1567620832903), `pepperoni-caja` (1534308983496),
`rebanada` (1544982503), `queso-jala` (1520201163981), `pz/*`, `c-*`, y las de `img/armar/`.
**Hay que cambiarlas por fotos del producto real** antes de usar la página como oficial: varias
recetas tienen foto de otra pizza.

## Datos

Carta, precios, teléfonos y la frase del cartel salen de fotos del local de septiembre de
2026. Horario: todos los días de 11 am a 10 pm (Carlos, 22 de octubre). Opiniones: las de su Facebook
(88 % de 7 lo recomienda), con nombre corto y fecha. Sucursales: las del volante de su Facebook
(Peñaflor, Begonias y Balvanera); Carlos pidió seguir el volante, así que va «Begonias 442 654 4858»
y no «Lomas de San José 442-680-29-01», que decía la caja.
