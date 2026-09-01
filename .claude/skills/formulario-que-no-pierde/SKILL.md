---
name: formulario-que-no-pierde
description: Formularios que no pierden lo que la persona escribió, que se pueden llenar con el pulgar y que dicen qué está mal sin regañar — etiquetas de verdad, teclado correcto, errores útiles, y una salida cuando el envío falla. Úsala al diseñar o revisar cualquier formulario, alta, pago o contacto, y cuando alguien abandone a mitad.
---

# El formulario que no pierde nada

La regla que ordena todo lo demás: **el formulario nunca pierde lo que la
persona escribió.** Si falla el envío, si falta configuración, si se cae la red
—los datos siguen ahí y se ofrece otra vía.

## 1 · Etiquetas, no texto de ejemplo

El texto dentro del campo **desaparece al escribir**, así que a media captura
nadie sabe qué iba en ese campo. La etiqueta va fuera y se queda.

**Reprueba si:** algún campo se identifica sólo por su `placeholder`.

## 2 · El teclado correcto

En teléfono, `inputmode` y `type` deciden qué teclado sale:

| Dato | Qué poner |
|---|---|
| Teléfono | `type="tel"` |
| Correo | `type="email"` |
| Cantidad | `inputmode="numeric"` |
| Código de un solo uso | `autocomplete="one-time-code"` |

Y **`autocomplete`** en todos los campos de datos personales: es lo que permite
que el navegador rellene y que se acabe en un toque.

**Reprueba si:** al tocar un campo de cantidad sale el teclado de letras.

## 3 · Tamaño y zoom

Los `input` van a **16 px o más**: por debajo, iOS hace zoom solo al enfocar y
la persona se pierde. Área táctil de **44 px** como mínimo.

## 4 · Los errores

- **Cuándo**: al salir del campo, no en cada tecla. Regañar mientras se escribe
  es insufrible.
- **Dónde**: pegado al campo, no todo junto arriba.
- **Qué dice**: qué está mal y **cómo se arregla**. «Formato inválido» no es un
  mensaje; «El teléfono va a 10 dígitos, sin espacios» sí.
- **Cómo se marca**: color **más** icono **más** texto. Sólo rojo no lo ve todo
  el mundo.

**Reprueba si:** en escala de grises no se distingue qué campo tiene error.

## 5 · Cuando el envío falla

Se devuelve el estado con **todo lo escrito intacto** y una salida real:
enlaces de correo, WhatsApp o teléfono **con el mensaje ya redactado**. Que la
persona no tenga que volver a contarlo.

## 6 · Funciona sin JavaScript

La acción va en el atributo `action` del `<form>`. Si el JavaScript no llegó o
falló, el formulario sigue enviándose.

## 7 · Anti-spam sin castigar a nadie

Campo trampa fuera de pantalla —con una clase propia, **nunca**
`display: none`, que algunos rellenadores respetan— y tiempo mínimo de llenado.
Si huele a robot se responde **como si hubiera funcionado**: un error le diría
al robot qué corregir.

## 8 · Cuántos campos

Cada campo cuesta abandono. **Reprueba si:** hay un campo que nadie va a leer
nunca. Se quita, no se hace opcional.

## Neuronas relacionadas

`formularios`, `interfaz`, `accesibilidad`, `privacidad`, `avisos`. En el
cerebro: `el-boton-deshabilitado-no-explica`,
`el-borde-como-unica-diferencia-de-estado`, `borde-solo-no-es-señal-suficiente`.
