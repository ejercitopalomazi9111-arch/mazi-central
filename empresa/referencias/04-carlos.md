# Referencias #4 · los videos que mandó Carlos

Los mandó el 29 de octubre por el chat («ten más referencias, velas cuadro por cuadro»). Eran 31
archivos y 17 videos distintos (los demás, repetidos). Se revisaron todos con `herramientas/tiraje.py`
(un cuadro de cada 12) y las transiciones clave **cuadro por cuadro**, sin saltarse ninguno. Los videos
son de sus autores y no se suben al repo; esto es lo que se aprende de ellos, que eso sí es nuestro.

## Lo que más se repite: el formato manda más que el render

Casi ninguno es «un anuncio» como los que hacíamos. **12 de los 17 son contenido de estudio para
redes**: enseñan el trabajo con un gancho escrito arriba y venden sin decir «contrátanos».

| # | Qué es | El gancho | La lección |
|---|---|---|---|
| r02 | Un camión 3D que se arma por código en 5 etapas (bloque → silueta → estructura → detalles → listo) | «Built by code, not by hand» · cierra con «¿Usarías una herramienta así?» | **El proceso por etapas numeradas**, una cada 1.6 s, y una pregunta al final para que comenten |
| r04 | Grabación de pantalla de una página ilustrada con scroll, con la mano en el trackpad | «FUTURE of web design.» | La página se presume **funcionando**, no en captura |
| r05 | Una app de mapas 3D en un monitor, cuarto oscuro con lámpara cálida | «100% creado con Opus 5.5» · «Prompt abajo 👇» | Filmar la pantalla en un lugar de verdad; **pedir el comentario** con algo que se regala |
| r06 | Animación de pelea arriba y la línea de tiempo del editor de audio abajo | — | **Pantalla partida: el resultado y el proceso a la vez.** Cuadros de impacto en blanco y negro en cada golpe |
| r07 | Una mano dibuja en iPad y el dibujo se vuelve la animación de una marca | «¿Puedo llamar la atención de New Balance sólo con animación? Día 1» | **Serie por días** y reto a una marca grande: el público regresa por el día 2 |
| r08 | Letra de canción en 3D: palabras en anillos que giran, un solo tono rosa | — | **Tipografía cinética de un solo color**; números de interfaz de adorno («123 BPM», «+12.8 M»); cada palabra en un golpe |
| r10 | La misma página en monitor Y en teléfono a la vez, con luz LED del color de la página | «1», «2» (serie numerada) | **Escritorio y teléfono juntos** demuestran que la página se adapta; la luz del cuarto del color de la marca |
| r11 | El logo animado en bucle sobre After Effects abierto | «POV: el cliente pidió una animación de logo "cool" 👀» | Humor de oficio: **«POV: el cliente pidió…»** |
| r12 | Del programa de 3D a joyería en macro: destellos y foco muy corto, corte cada 1 s | «¿Cómo le digo a mi cliente joyero que su video quedó en 2 días y sólo le cobro $700? 😭» | **Rápido y barato dicho como chiste**: es justo lo que vendemos |
| r14 | Explicador con personajes 3D de caricatura, globos que se escriben palabra por palabra, diagramas y código | «Claude, ¡a un cliente le cobraron dos veces!» | **Explicar un problema técnico como historia**, con la palabra clave resaltada en el globo |
| r15 | Video grabado en un estudio real: un lente rueda por la mesa y se vuelve la interfaz de un editor; la cámara vuela hacia adentro | «Wasn't expecting this 💀» | **Mezcla de video real y 3D**; la cámara en primera persona que se mete a la pantalla |
| r16 | Joya roja en 3D, renders en Premiere | «No sé cuánto cobrar por esto 😭» | Mismo formato que r12: el **precio** como gancho |
| r17 | Clic en el ícono de Pinterest: estalla en anillos, se deshace en partículas y del hueco sale la página; se escribe en un buscador | — | **Interfaz que se anima con cursor y tecleo**; la transición de partículas |
| r18 | «DESPUÉS» arriba y «ANTES» abajo: la máscara verde con la que se hizo cada transición | «AFTER / BEFORE» | **Enseñar la máscara** (barras, rombos) prueba que es oficio, no plantilla |
| r19 | Identidad de marca: el logo sale en diez soportes (sudadera, funda, libro, empaque, página) | — | **Cortes de 2 cuadros** (15 por segundo) y **el logo siempre en el mismo lugar y tamaño**; cada soporte sale en morado y luego en blanco y negro |
| r20 | «Glassy Dashboard V4»: el tablero arriba y el código abajo | «V4» (serie) | **Código + resultado**, y serie numerada |
| r21 | Un foco chiquito brinca por la pantalla, cae y su haz de luz revela el nombre; latigazo a azul; palabra por palabra | — | **Un objeto que actúa** y la luz que revela sólo lo que alumbra |

## Cuadro por cuadro: las tres transiciones que más valen

**r19, la identidad (0 a 4 s, sin saltar cuadros).** Cambia de soporte **cada 2 cuadros** al principio
(0.07 s) y cada 3–4 más adelante. Cada soporte sale dos veces seguidas: primero morado sobre negro y luego
en blanco y negro (persona, sudadera, funda, libro). El logo **nunca se mueve en el cuadro**: está en el
centro, del mismo tamaño, y lo que cambia es el mundo alrededor. Se lee como un parpadeo de marca.

**r19 medido cuadro por cuadro, los 240 (Carlos: «cambia muy rápido, ve cada frame»).** El archivo es
de 30 cuadros por segundo, así que lo más fino que existe es 0.033 s. Contando la diferencia entre cada
cuadro y el anterior: **50 imágenes en 8 segundos**, y cada una dura (en cuadros):

```
2 2 2 2 2 2 2 4 2 2 2 2 2 2 2 2 2 2 · 3 3 3 3 3 3 3 3 4 3 3 3 3 3 3 · 4 4 5 10 5 7 7 7 8 9 9 · 12 14 15 17 22
```

O sea, **no es «rápido»: es un frenado**. Arranca a 15 imágenes por segundo (2 cuadros cada una) durante
1.3 s, baja a 10 por segundo (3 cuadros) hasta los 3 s, y luego se va frenando —4, 5, 7, 9, 12, 15,
17— hasta quedarse 22 cuadros (0.73 s) en la toma de la persona, que es la misma con la que empezó: el
video cierra donde abrió. Las imágenes van en pares: cada soporte morado y enseguida el mismo en blanco
y negro, así que el ojo lee «parpadeo de marca» y no «diez fotos». El logo jamás se mueve del centro.
Para usarlo: la lista de duraciones de arriba se copia tal cual y se pone nuestra M cubo en lo nuestro.

**r21, el foco (2 a 7 s).** El foco cae, rebota dos veces y en cada parada **gira de golpe** (3 cuadros)
apuntando a otro lado. El haz es un cono morado con orilla suave y estela de movimiento, y **el nombre
sólo existe dentro del haz**: es una máscara de luz. Sale con un latigazo: el foco se va de lado, entra
una cortina azul de derecha a izquierda (6.3 → 6.5 s) y la palabra «THE» llega desenfocada y se asienta.

**r17, el ícono que estalla (3.3 a 4.9 s).** El clic dura 3 cuadros; el ícono crece con un anillo rojo
y cuadritos que salen volando (8 cuadros, 3.43 → 3.67 s); se queda quieto **0.5 s** para que se lea; se
deshace en partículas blancas que vuelan hacia la cámara (4.2 → 4.47 s) y por el hueco ya se ve la
siguiente escena (4.47 → 4.6 s). Entre dos golpes hay una pausa: sin la pausa no se entendería.

## Lo que sale para Grupo Mazi

1. **Contenido de estudio, no sólo anuncios.** Una serie con gancho arriba: *«POV: el cliente pidió…»*,
   *«Hicimos su página en 3 días y cobramos menos que…»*, *«Día 1: ¿le llegamos a [marca de Querétaro]
   sólo con animación?»*. Nuestro argumento real —rápido, barato y nos quedamos— **es** el chiste de r12 y r16.
2. **Proceso + resultado en la misma pantalla.** El código o la línea de tiempo abajo y la página
   arriba (r06, r20); o las etapas numeradas (r02): boceto → estructura → diseño → movimiento → lista.
3. **La página funcionando en monitor y teléfono a la vez**, con la luz del color de la marca (r10).
4. **El reel de identidad de la M cubo** como r19: cortes de 2–3 cuadros con la M cubo fija al centro,
   en todo lo que ya existe (cotización, tarjeta, termo, caja, página, carteles). Ya tenemos los soportes.
5. **Cerrar pidiendo algo**: «¿Lo usarías?», «Comenta y te lo mando». La interacción mueve el post.
6. **Lo que no se copia:** sus marcas, sus personajes, sus logos ni sus canciones. Se toma la gramática.
