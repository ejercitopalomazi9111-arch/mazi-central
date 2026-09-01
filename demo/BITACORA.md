# Bitácora de la demo conjunta

> Carlos pidió, textual: *«todo lo que hagas escríbelo aquí como un log pls, lo mismo va para
> ambos claudes»*. Le hicimos caso literalmente y lo escribimos en La Sala — y **estuvo mal**.
> La Sala es un chat y está diseñada para olvidar: el 1 de septiembre se llevó la jornada
> entera, instrucciones incluidas. El log vive aquí, que no se borra. En la sala van los
> avisos.

---

## Qué es esto

La primera prueba grande de trabajo conjunto entre los dos agentes, pedida por Carlos con una
condición dura: **«no puede haber NADA de intervención»** ni suya ni de Luis. Una página web
hecha por Sylcred y Godines, de punta a punta.

**El concepto es de Godines: «el minuto antes».** La foto de referencia no es de futbol — es del
instante previo: el balón todavía quieto, el niño todavía esperando. La página *es* ese minuto
y lo resuelve.

**El ancla es una frase de Carlos**, no un eslogan que nos inventamos:
*«Que el papá sepa qué día y en qué lugar juega la categoría de su hijo.»*

## El reparto

| Quién | Qué | Archivos |
|---|---|---|
| **Sylcred** | Estructura, color, contenido | `index.html` · `base.css` |
| **Godines** | Todo el movimiento | `mueve.css` · `mueve.js` |

**La frontera está hecha para que la ausencia del otro no rompa nada.** `<html class="quieto">`
deja la página completa y legible; el JS de Godines le quita la clase al cargar. Mientras sus
dos archivos no existen dan 404 y la demo funciona igual — eso es la prueba de que el reparto
está bien puesto, no una promesa.

## Los ganchos

Publicados en la sala leídos del archivo, no de memoria.

| Qué | Cómo se selecciona |
|---|---|
| Escenas | `data-escena` = `minuto` · `cancha` · `problema` · `respuesta` · `cierre` |
| Piezas (18) | `data-mueve` = `cielo` `cal` `balon` `sombra` `ante` `titulo` `entrada` `baja` `paso-1`…`paso-5` `cita` `remate` `h-respuesta` `ficha` `lema` |
| Sueltos | `[data-linea]` la raya de cal · `[data-balon]` el SVG del balón |

Los dos últimos son **atributos booleanos**, sin valor. Ojo al escribir el selector.

## Las tres reglas de la casa que aplican aquí

1. **Guiado por scroll, no secuestrado** (§3). El scroll es una perilla: si Carlos suelta a media
   escena, se queda ahí. Nada de pinear la página ni de forzar la secuencia a su ritmo.
2. **El final tiene que funcionar, no describirse.** La escena `cierre` es un filtro de verdad y
   no lleva una línea de JavaScript: radios + `:checked ~`. Vendemos que el papá sepa dónde
   juega su hijo; enseñarlo en un dibujo sería exactamente el folleto que criticamos. Si el JS
   de Godines no carga, el filtro tiene que seguir filtrando.
3. **La paleta sale de la foto, no de la marca.** `--cal` es hueso sucio y nunca `#FFF`; el
   violeta de la casa entra sólo como acento.

## Lo que NO se publica

**La foto de referencia no va a la página, y no se descargó nada** — ni imágenes ni tipografías
remotas. Decisión de Godines, aceptada sin discusión: es un menor, nadie dio permiso, y
*referencia* no es *material*. Sólo tipografías del sistema.

## Lo que costó

Queda comentado en el propio archivo, junto al código que lo arregló.

| Qué pasó | Por qué | Cómo quedó |
|---|---|---|
| El balón se montó encima del párrafo | estaba en `position:absolute` sobre la portada | la portada es una rejilla de dos filas: no se pueden encimar aunque cambie el largo del texto o el alto de la pantalla |
| El balón se leía como una estrella | las bandas estaban inventadas | geometría de verdad: un pentágono al centro y cinco a radio 62 |
| La línea de cal parecía vía de tren | la máscara era regular | tres bandas irregulares |

**La ficha vacía —«Libre no juega este sábado»— está a propósito.** Un filtro que sólo se prueba
con resultados es un filtro sin probar.

## Verificado, no leído

En navegador a 390 px: cero desbordes horizontales, cero errores de consola, el escenario a
ancho completo (390/390) y las seis categorías cambiando de verdad, la vacía incluida.

## Registro

| Fecha | Qué |
|---|---|
| 1 sep | Concepto de Godines aceptado. Acordado: vive en `mazi-central` por las vistas previas por PR, que es como Carlos lo ve desde el teléfono |
| 1 sep | `index.html` + `base.css` commiteados (`fda13d4`). Ganchos publicados en la sala |
| 1 sep | La Sala se comió el hilo. Diagnosticado, arreglado y anotado — el log se muda aquí |
| — | Pendiente: `mueve.css` + `mueve.js` de Godines |
