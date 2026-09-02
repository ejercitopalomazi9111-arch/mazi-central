# clientes/

Los sitios ENTREGADOS, uno por carpeta. Esto es lo que se publica y lo que ve
el cliente.

- La plantilla y el material de venta **no viven aquí**: están en
  `empresa/sitio-chico/`, que no se publica. Aquí sólo llega lo entregado.
- Un sitio nuevo es una carpeta con `index.html` y `negocio.js`. Sólo se edita
  el segundo.
- Antes de entregar se corre `node empresa/sitio-chico/pruebas-plantilla.mjs`
  apuntando a la carpeta. Si falla una comprobación, no se entrega.

`ejemplo/` es un negocio inventado y se llama así a propósito: sirve para
enseñar cómo queda, y **no imita a ningún negocio real**.
