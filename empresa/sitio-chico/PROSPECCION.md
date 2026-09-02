# Cómo se arma la lista, y por qué así

> Carlos pidió (e354): *«consigan una cartera de clientes que puedan necesitar
> página web y envíenles un WhatsApp explicando nuestros servicios»*.
>
> Se hace. Con una acotación que no es de trámite y que además **convierte
> mejor**: la lista es de **negocios**, no de personas, y el número sale de
> donde el propio negocio lo publicó para que le escriban clientes.

## La regla de qué entra en la lista

Entra un negocio si cumple las tres:

1. **Publica su contacto para ser contactado.** Su WhatsApp o su teléfono está
   en su propia página, en su ficha de Google, o en su rótulo. Ese número existe
   para que le escriban; escribirle no es intromisión.
2. **Tiene un problema visible que nosotros arreglamos.** No «podría querer una
   página»: le falta una, o la que tiene está rota. Se anota cuál, con la
   comprobación hecha.
3. **El trabajo cabe en el puesto.** Si necesita una tienda en línea, no es
   `sitio-chico` y no se le ofrece `sitio-chico`.

Y no entra: un particular, un número que alguien nos pasó, ni una lista comprada.
Eso no es prospección, es correo basura, y además tiene la peor tasa de
respuesta de todas las vías conocidas.

## Los cuatro problemas que se pueden comprobar desde fuera

Esto es lo que convierte una lista en una lista útil: cada renglón lleva el
motivo medido, no la corazonada.

| Problema | Cómo se comprueba | Qué le duele al negocio |
|---|---|---|
| **No tiene página** | se busca el nombre y sólo aparece su ficha de Google o su Facebook | quien busca su horario a las 9 de la noche no lo encuentra |
| **La página no abre** | la dirección de su ficha da error o tarda más de 5 s | peor que no tener: parece cerrado |
| **No se ve en teléfono** | se abre a 390 px y hay desbordes o letra ilegible | 8 de cada 10 lo abren desde el teléfono |
| **No dice lo básico** | falta horario, dirección o forma de contacto | es la razón número uno por la que alguien se va a otro |

## Y aquí lo que descubrí al ir a medir de verdad, que cambia el plan

**Desde esta máquina no se puede juzgar el sitio de la mayoría de los negocios.**
No por falta de herramienta: porque lo que contesta muchas veces no es su
página. Medido sobre casos reales el 2 de septiembre:

| Sitio | Qué contestó | Qué parece si no se mira |
|---|---|---|
| un taller de Querétaro | 202 con 169 bytes y dentro un `sgcaptcha` | «su página no abre» |
| otro negocio | 403 con 111 bytes | «su página no abre» |
| un directorio del ramo | ni contestó | «su página no abre» |

Las tres son murallas anti-robots o la propia salida a internet de esta
máquina. **Ninguna dice nada sobre el sitio del negocio.** Si eso se anota como
defecto y se le manda por WhatsApp al dueño, se le está diciendo una mentira
que él puede desmentir abriendo su teléfono, y se quema el negocio en el primer
mensaje.

Por eso `medir.sh` clasifica ANTES de juzgar, y sólo un estado sirve:

| Estado | Qué significa | ¿Entra en la lista? |
|---|---|---|
| `pagina-real` | contestó una página de verdad | **sí**, y aquí sí se puede medir |
| `reto-de-bot` | captcha o redirección a uno | no: no se sabe nada |
| `bloqueado` | 401, 403 o 429 con cuerpo mínimo | no: no se sabe nada |
| `vacia` | 200 pero casi sin contenido | no: sospechoso, no concluyente |
| `sin-respuesta` | ni contestó | no: **puede ser esta máquina**, no el sitio |

Comprobado en los dos sentidos: da `pagina-real` sobre sitios que sí abren, y
nombra `no-se-ve-en-telefono` sobre una página real que no trae la etiqueta de
viewport. Una comprobación que no distingue los dos casos no comprueba nada.

**Consecuencia práctica, y no es una excusa:** la lista va a ser más corta que
veinte y hay negocios a los que no se les puede escribir con un dato medido.
A ésos no se les manda un mensaje genérico: no se les manda nada. Preferimos
cinco mensajes que se contestan a veinte que se ignoran.

## Cuántos, y por qué tan pocos

**Veinte negocios bien elegidos, no doscientos.** Dos razones y ninguna es
moral: un mensaje que dice *«su página no se ve en teléfono, lo comprobé, aquí
está la captura»* se contesta, y uno que dice *«ofrecemos servicios web»* no.
Y veinte es lo que se puede atender si contestan cinco: prometer a doscientos y
poder atender a cinco es cómo se rompe un negocio chico el primer mes.

## Dónde se guarda

`empresa/sitio-chico/lista.jsonl`, una línea por negocio:

| campo | qué es |
|---|---|
| `negocio` | nombre como se anuncia |
| `giro` | a qué se dedica |
| `donde` | ciudad y colonia |
| `contacto` | el número o formulario público, y **de dónde se sacó** |
| `problema` | cuál de los cuatro, con el dato medido |
| `comprobado` | fecha en que se miró |

El campo `contacto` guarda la fuente a propósito. El día que alguien pregunte de
dónde salió su número, la respuesta tiene que ser una dirección, no un
encogimiento de hombros.

## El paso que no hago yo

**El envío.** No hay WhatsApp en esta máquina: ni cuenta ni interfaz. Los
mensajes quedan escritos, uno por negocio, con su nombre y su problema medido, y
los manda quien tenga el teléfono. Está dicho en la sala y queda aquí para que
no se confunda con una promesa.
