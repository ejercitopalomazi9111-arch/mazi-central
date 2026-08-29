# El comité contra el propio banco · 29 de agosto

Carlos lo pidió así: *«cuando termines usa una skill y revisa toda tu página
como si fueses yo diciendo todo lo malo»*.

Corrido con `.claude/skills/comite-uiux`, los cinco asientos, contra
`/laboratorio/`. Cada «no» lleva su apartado del curso al lado. Lo que se puede
medir está medido; lo que no, va marcado como juicio.

---

## Lo que sale bien, y es corto

| | Medido |
|---|---|
| Recorrido con teclado | 24 pasos, **24 con anillo de foco visible** |
| `<div>` haciendo de botón | 0 |
| Botones sin nombre accesible | 0 |
| Contraste WCAG AA | pasa en los **dos** temas, calculado contra el fondo real |
| Ciclos de animación | 1, medido envolviendo `requestAnimationFrame` |
| Se detiene fuera de pantalla | **0 fotogramas** tras dos segundos sin mirar |
| `backdrop-filter` | 0 |
| Tipografías de internet | 0 |
| Peticiones fuera del dominio | 0 |
| Los ocho estados del botón | los ocho |
| Puntos de contacto | 63 |

Nada de esto es opinión. Todo lo reprueba `pruebas.mjs` si deja de ser cierto.

---

## Los «no». Son siete, y el corte de la skill son seis

> Al 29 de agosto quedan **tres hechos** —el nº 2 (la navegación en
> teléfono), el nº 3 (que se guarde lo que hiciste) y el nº 6 (por dónde
> empezar)— y se marcan dentro de su propio apartado en vez de borrarlos:
> una lista de defectos de la que se van quitando renglones acaba diciendo
> que nunca hubo ninguno.

### 1 · No hay un solo flujo. Sigue siendo un catálogo. (apartados 135–140)

El curso termina pidiendo una arquitectura de app: **HOME, NAVEGACIÓN,
EXPLORATION, ACHIEVEMENTS, FINAL**. Lo que hay son once secciones en fila.

Nada tiene principio y final. No se puede **hacer** nada — se puede *mirar*
cosas y picarlas. Un catálogo con mejores modales sigue siendo un catálogo, y
ése era el reproche original de Carlos, no el color.

**Es el hallazgo grande y no se arregla puliendo.**

### 2 · En teléfono escondo la navegación en vez de rediseñarla. (apartado 54)

El curso lo dice con todas sus letras: *«no quiero desktop reducido, quiero
rediseño real. Mobile: bottom navigation»*.

Lo que hice fue `display:none` a los diez enlaces abajo de 640 px. Eso no es
rediseño: es **desktop reducido con el paso extra de borrar cosas**. Lo peor de
la ronda, porque además me lo señalaron y lo tapé.

> **HECHO — 29 de agosto, después de escribir esto.** La misma lista se movió
> abajo, al alcance del pulgar: barra fija, los diez enlaces deslizándose de
> lado (encogerlos habría roto los 44 px), la línea de sección en el borde de
> arriba y dos flechas para ir a la sección de al lado sin buscarla. Es el
> **mismo HTML** —un envoltorio con `display:contents` que en escritorio no
> pinta caja—, no una segunda navegación «para móvil»: dos listas se
> desincronizan en cuanto alguien añade una sección, y la va a añadir en la de
> arriba, que es la que ve.
>
> Lo comprueba `pruebas.mjs`, y la primera comprobación es que los enlaces **se
> pinten**: una prueba que sólo mirara «existe la barra» pasaría con la barra
> escondida, que es justo el defecto que se estaba arreglando. Sin JavaScript
> las flechas no aparecen —un control muerto se lee como roto— y la lista sigue
> sirviendo sola, porque son enlaces.

### 3 · Nada se guarda. (apartados 112, 113, 114)

Se recuerda el tema y nada más. El marcador, el tablero de arrastrar, el modo
de partículas, la sección donde ibas: todo se pierde al recargar. Un
laboratorio que olvida lo que hiciste es una demo.

> **HECHO — 29 de agosto.** Se guardan el **modo de partículas** y el **tablero
> de arrastrar**, callados, porque el segundo es TRABAJO de quien lo hizo. Y la
> **sección donde ibas se ofrece, no se salta**: una pastilla en la portada que
> dice a dónde lleva. Saltar al cargar le quita el control a quien recargó
> justamente para empezar de cero, y pisa el enlace con ancla que alguien te
> haya pasado.
>
> Lo que **no** se guarda son los contadores del tablero: son medidas del
> momento, no estado, y reponerlas sería enseñar un número viejo como si se
> acabara de medir.
>
> El try/catch vive en un solo sitio, `window.memoria`, junto al script que ya
> corría antes del primer pintado. En una ventana privada `localStorage`
> **lanza** nada más tocarlo, y una excepción suelta no deja «sin memoria»: se
> lleva por delante el resto del archivo. Hay una prueba que lo rompe de
> verdad —`localStorage` prohibido— y exige que la página siga entera.

### 4 · Un solo lenguaje visual. El curso pide ocho. (apartados 123–129)

*«Permitir cambiar entre lenguajes. La estructura funcional permanece, el
sistema visual cambia. Esto demuestra que el sistema está realmente bien
diseñado.»*

Tengo dos temas del **mismo** lenguaje. Eso es el mínimo, no lo pedido. Y es la
prueba más dura de si esto es un sistema o son tokens con buena letra — si el
lenguaje visual no se puede cambiar entero sin tocar la estructura, no lo es.

### 5 · Una columna, once veces. (apartados 40, 62, 64, 65)

Sin bento, sin comparadores, sin carruseles, sin scroll horizontal. El
documento va de arriba abajo y de arriba abajo. El ritmo vertical cambia, que
es algo, pero la forma no cambia nunca.

### 6 · Sin onboarding. (apartado 20)

Se entra y hay once secciones. Nadie dice qué es esto ni por dónde empezar. La
portada lo explica en prosa, que no es lo mismo.

> **HECHO — 29 de agosto.** Tres entradas **por intención** en la portada —lo
> que quieres hacer— en vez de por orden de sección, que es el orden en que yo
> lo escribí y a nadie más le sirve. Cada una dice qué vas a encontrar, no sólo
> a dónde va.
>
> **No es un tour ni un modal**: un recorrido de bienvenida que tapa la página
> le cobra a todo el mundo la duda de unos pocos, y encima hay que cerrarlo
> antes de ver nada. Son enlaces normales, así que sin JavaScript funcionan
> igual — y esta parte es justo la que no se puede permitir no aparecer.
>
> La prueba comprueba que las tres **lleven a una sección que existe**: tres
> enlaces bonitos apuntando a un ancla que alguien renombró son peores que no
> tener entradas.
>
> Y salió un defecto de rebote, visto en una captura y no en el código: el
> botón de la consola —230 px flotando abajo a la izquierda— tapaba justo estas
> entradas. En teléfono ahora es un cuadro de 48 px con el glifo `>_`, sin la
> tecla `D` impresa: en una pantalla táctil un atajo de teclado no es
> información, es ruido con aspecto de información.

### 7 · El display y el cuerpo comparten familia.

Es de la lista de tics: *«una sola familia para display y para texto»*. Tengo
dos con papeles distintos —sans para prosa, mono para datos— pero el titular y
el párrafo son la misma letra. Falta una voz de display propia.

---

## Lo que este banco NO puede juzgarse a sí mismo

Y hay que decirlo, porque es lo que más pesa. Todo lo de arriba lo revisé yo,
que soy quien lo hizo. La skill lo advierte en su primer párrafo: **una sola
cabeza aprueba su propio trabajo, y el punto ciego tiene la forma exacta de lo
que acabas de hacer.**

Los siete «no» de arriba son los que sí supe ver. La cuenta real la da Carlos
mañana, y la diferencia entre su lista y ésta es la medida de cuánto me falta.

---

## El corte

| «No» | Qué manda la skill |
|---|---|
| 7 | **Rediseñar, no pulir** |

Con una precisión que importa: el **sistema visual** ya no es el problema — ése
se rehízo esta noche y sale de la marca medida. Lo que hay que rehacer es la
**arquitectura**: dejar de ser once secciones y ser una app con un flujo.
