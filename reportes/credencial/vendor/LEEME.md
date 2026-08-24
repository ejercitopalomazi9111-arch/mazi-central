# Lo que vive aquí

`qrcode.min.js` — el generador de códigos QR de Ryan Day, **licencia MIT**
(el texto completo está en `LICENCIA-qrcode.txt`). Empaquetado para navegador
con esbuild desde la misma librería que ya usa `fadori/qr/armar.mjs`.

## Por qué está copiado aquí y no se pide a un CDN

La regla §2 de la casa: **conectar sí, depender no.** Un CDN es un servicio del
que dependemos — si se cae o cambia, se caen las credenciales. Una librería
open source copiada al repo y corriendo en nuestra máquina **no es un externo,
es stack propio**.

Aquí sí hace falta generarlo en el navegador y no al construir, porque cada
credencial lleva el folio de una persona distinta y las credenciales se arman
en el teléfono de Carlos.

## Por qué no lo escribí yo

Un codificador de QR es Reed-Solomon, enmascarado y tablas de versiones.
Escribirlo a mano son días y es un problema resuelto desde 1994. Está en
`herramientas/PENDIENTES.md` con el mismo criterio que el vectorizador: se
envuelve, no se reescribe.
