# Auditoría · El plan de desarrollo del sitio
## 🎙 ACTA TAQUIGRÁFICA — la junta completa, en orden

**Fecha:** 30 de julio de 2026 · **Mesa:** completa (24) · **Duró:** 9 turnos
**Convocó:** Carlos — *"haz que hagan una auditoría del plan de desarrollo para ahora sí afinar los
últimos detalles"*, con un requisito nuevo: **herramientas a distintas escalas para industrias
reales, todo como una sola experiencia, priorizando diseño.**
**Se auditó:** [`sitio/PLAN.md`](../../sitio/PLAN.md) · `herramientas/tipos.mjs` ·
`herramientas/vectorizar.mjs`
**Repo público:** sí · **Datos de personas:** hoy no

> **Cómo se lee esta acta.** Es la junta tal como pasó: quién habló, en qué orden, quién interrumpió
> a quién, en qué se pelearon y cómo se resolvió. Lo decidido está hasta abajo, pero **el valor está
> en el camino** — sobre todo en el turno 4, donde Rocco entró a media junta y tumbó el argumento
> principal del plan.

---

## ⏱ TURNO 0 · Ismael abre y pone la regla

> **ISMAEL RENTERÍA** *(Director de Ingeniería)* — Mesa completa, y aclaro por qué, porque no es por
> la superficie: este sitio no tiene cuentas ni datos y de seguridad va a salir poco. Es mesa
> completa **porque estrenamos la casa y porque el requisito nuevo cambia la forma del proyecto**,
> no un detalle.
>
> Y la regla de siempre: **el que no tenga nada que aportar dice "paso" y se calla.** Prefiero un
> acta corta con tres hallazgos que una larga donde el bueno se perdió entre relleno.

> **NADIA BERRONES** *(Jueza)* — Y yo agrego una: nadie afirma nada que no haya visto correr. Es la
> regla 7 de la casa. Si alguien dice "eso funciona", que lo enseñe.

*(Nadie sabía todavía que esa frase iba a decidir la junta.)*

---

## ⏱ TURNO 1 · Arquitectura

> **VERÓNICA ALCÁZAR** *(jefa de Arquitectura)* — Voy a nombrar archivo y línea o no lo cuento. Y la
> que importa es una sola:
>
> **El plan supone en todos lados que el sitio es chico, y con el requisito nuevo deja de serlo.**
>
> §11 dice *"portada = HTML + CSS + nuestra fuente + unos 10 KB de JavaScript a mano, cero
> dependencias"*. Perfecto para **una** herramienta. Carlos acaba de pedir cinco o seis programas
> interactivos conviviendo. Si cada uno se escribe a mano dentro de un `index.html`, en tres semanas
> tenemos **`ligas-mazi` otra vez: 5,124 líneas en un archivo.** No es una predicción: es el mismo
> camino con las mismas manos.

> **NAYELI CORDERO** *(interrumpe)* — Perdón, Verónica, pero ahí te voy a frenar tantito. Estás
> pidiendo arquitectura para cinco herramientas y **no existe la primera**. Yo he visto ese
> despeñadero más veces que el tuyo: el equipo diseña el marco perfecto y a las tres semanas no hay
> nada que enseñar.

> **VERÓNICA** — No estoy pidiendo un marco. Estoy pidiendo **un contrato de cuatro renglones**:
>
> ```js
> sitio/taller/<herramienta>.js  →  export default {
>     id, nombre, servicio,      // a qué servicio de los seis pertenece
>     montar(nodo, taller),      // se dibuja dentro del nodo que le dan
>     exportar(),                // { nombre, tipo, datos }  ← el MISMO para todas
>     liberar()                  // se apaga al salir: temporizadores, listeners
> }
> ```
>
> Y esto no es purismo, Nayeli, es **lo que Carlos pidió, dicho en código**. Si `exportar()` no es
> igual para todas, el botón de exportar tiene que ser distinto en cada una — **y ahí se acabó la
> "sola experiencia" por más que se pinten iguales.** La consistencia visual sin consistencia de
> interfaz dura hasta la tercera herramienta.

> **NAYELI** — …eso sí me lo compro. Pero sigo diciendo que no es de hoy.

> **NADIA** — Anotado el desacuerdo. Lo fallo al final.

> **LUCÍA PRADO** *(plataforma)* — Dos cosas y me callo. Una: Pages no compila nada, así que
> **módulos ES nativos e `import()` dinámico por herramienta.** La portada no carga un byte del
> taller. Es la única forma de que el presupuesto de Saúl sobreviva a seis herramientas.
>
> Dos, y ésta el plan no la contempla: **el sitio NO debe llevar service worker en la v1.** Sirve
> para offline, pero también sirve versiones viejas, y `PLAN.md` no dice quién lo va a versionar.
> Un sitio que cambia a diario con un SW mal cuidado es cómo Carlos ve "no se aplicó mi cambio" diez
> veces.

> **CHUY BARRERA** — Firmo. Y añado que ese problema es de los que a mí me despiertan.

> **BETO NÁJERA** — **Paso** en lo mío, no hay base de datos y me alegro. Pero dejo sembrado algo:
> las herramientas del taller **van a producir datos del visitante**, y una en particular va a
> producir datos de la operación de su negocio. Que alguien lo recoja.

> **KENJI MORA** — Casi paso. Sólo: **el historial de mediciones crece sin tope.** 500 ciclos son
> 30 KB, no es problema; el problema es que nadie lo borre nunca. Tope y aviso, no crecimiento
> callado.

---

## ⏱ TURNO 2 · El ataque · primero el que no sabe nada

> **"CUERVO" SALDAÑA** *(sombrero negro, entra a ciegas)* — No leí el código, ésa es mi chamba. Y voy
> a ser honesto porque me toca serlo:
>
> **Un sitio estático sin cuentas, sin base y sin servidor es de las cosas más aburridas que me
> pueden dar.** No hay sesión que robar, no hay `id` que cambiar, no hay login que enumerar. **Paso
> en las nueve clases que normalmente uso.**

> **DAMIÁN OCAÑA** *(jefe de Seguridad)* — Cuervo, no me hagas eso. ¿Nada?

> **CUERVO** — Dije "en las nueve que normalmente uso". Encontré dos, y las dos vienen del requisito
> nuevo, no del plan viejo:
>
> **Uno.** El botón *"compartir por WhatsApp"* del menú propio arma una liga `wa.me` pegando texto de
> la página. Si ese texto sale de algo que el visitante escribió y no se codifica, se le puede meter
> contenido a la liga que él va a compartir.
>
> **Dos.** Las herramientas que aceptan un archivo. Le doy una imagen de 80 MB desde el teléfono y le
> tumbo la pestaña.
>
> Y aquí está el detalle que quiero que quede en el acta: **ninguno de los dos llega a nosotros. Los
> dos le pegan al visitante.** En un sitio de venta eso cuesta igual — alguien entra a probar y se le
> traba el teléfono, y ésa era toda la venta.

---

## ⏱ TURNO 3 · El ataque · ahora el que tiene los planos

> **AK VILLALPANDO** *(sombrero negro, con el código en la mano)* — Confirmo lo de Cuervo y subo dos.
>
> **Clase 8, texto de usuario.** Las herramientas de "escribe tu nombre" toman texto y lo meten en un
> SVG. Un SVG **es** un documento con etiquetas: si el nombre se concatena sin escapar, se rompe — y
> si además ese SVG se descarga y se comparte, **el archivo roto lo generamos nosotros.** Se escapa
> al construir, no al pintar. Y tope de largo: un nombre de 4,000 letras no es un nombre.
>
> **Clase 9, lo que queda en el teléfono.** Y aquí es donde me quiero detener, porque no es un
> hallazgo técnico, es de diseño:
>
> **El cronómetro de tiempos y movimientos va a guardar datos de la operación de un negocio ajeno.**
> Cuánto tarda su cocina en sacar un plato. Dónde está su cuello de botella. **Eso no son "datos de
> un formulario": es información competitiva de un tercero**, y la va a meter en nuestra página un
> desconocido que todavía no nos contrata.

> **BETO** *(desde el fondo)* — Es lo que dejé sembrado.

> **AK** — Exacto. Y técnicamente **no hay riesgo, por una razón chistosa: no hay a dónde
> mandarlos.** Pages no tiene servidor. Los datos se quedan en su teléfono porque no existe otra
> opción.
>
> Por eso quiero que quede escrito, palabra por palabra, **para el día que exista un servidor y a
> alguien se le ocurra "guardarlo en la nube"**: los datos del taller **nunca** salen del teléfono
> del visitante, y agregar cualquier envío exige auditoría.

> **PAOLA URQUIZA** *(interrumpe)* — AK, espérate. **Eso no es un riesgo: es un argumento de venta y
> lo estamos a punto de tirar a la basura.**

> **AK** — …a ver.

> **PAOLA** — Un dueño de taller que va a medir los tiempos de sus empleados en una página de una
> empresa que no conoce **va a dudar, y con razón.** Si no le decimos nada, la mitad no la usa. Que
> la herramienta lo diga en la pantalla, con todas sus letras:
>
> > *"Esto se calcula en tu teléfono. Nada de lo que midas sale de aquí, ni siquiera a nosotros."*
>
> Eso **es LA REGLA §2 dicha para el cliente** — *conectar sí, depender no* — y es la primera vez que
> la podemos **demostrar** en lugar de prometerla. Convierte nuestra limitación técnica en la razón
> para confiar.

> **RENATA** *(desde la mesa de negocio, que estaba escuchando)* — Esa frase se va al sitio tal cual.

> **DAMIÁN** — Bueno. Clasifico, y **no voy a inflar esto**: un sitio estático sin cuentas no tiene
> nada que sangre, y decir lo contrario para que la auditoría se vea importante sería exactamente el
> vicio que esta casa existe para evitar.
>
> **🔴 Ninguno.** 🟠 tres: el escapado del SVG, el archivo sin tope, y el `encodeURIComponent` de la
> liga. 🟡 dos: sin contrato de herramienta esto se vuelve monolito, y sin `liberar()` el cronómetro
> sigue corriendo al cambiar de herramienta. ⚪ dos aceptados por escrito: **el código es visible**
> —es nuestra arquitectura, a propósito— y **sin offline en la v1**, a cambio de no servir versiones
> viejas.
>
> Los tres arreglos de hoy: escapado y topes (1 h, antes de la primera herramienta), el contrato
> (2 h), y `encodeURIComponent` (10 min).

> **EMILIO CANTÚ** — **Paso.** No hay sesiones ni permisos que revisar. Cuando exista el formulario
> con servidor, me llaman.

> **TADEO RIQUELME** — **Paso**, con una línea: no hay incidente que no se arregle publicando de
> nuevo. **Eso es un lujo, disfrútenlo mientras dure.**

---

## ⏱ TURNO 4 · 🐕 ROCCO ENTRA A MEDIA JUNTA

> **CHUY** — Antes de que siga el diseño, quiero preguntar una cosa del plan. §7 dice que
> `tipos.mjs` *"corre en el navegador tal cual"*. ¿Alguien lo ha visto correr?

*(Silencio.)*

> **VERÓNICA** — …lo escribimos hace días.

> **NADIA** — Dije al abrir que nadie afirma nada que no haya visto correr. **Rocco.**

*(Rocco sale. Vuelve a los pocos minutos con la salida de una terminal en el hocico y la deja en la
mesa.)*

> **🐕 ROCCO** — Fui, lo corrí, y traigo esto. **No es sospecha:**
>
> ```
> RESULTADO: ERROR Failed to fetch dynamically imported module
> ERRORES: Access to script at 'node:fs' has been blocked by CORS policy
> ```
>
> Levanté un servidor local, abrí Chromium, e hice `import("/herramientas/tipos.mjs")`.
> **El módulo ni siquiera se descarga.**
>
> Por qué, exacto: **línea 61** hace `import { writeFileSync } from 'node:fs'` en el nivel superior,
> y las **líneas 1936 y 1942** leen `process.argv` al cargar el módulo. Las tres son del CLI, no del
> dibujo. 🦴

> **RENÉE IBARRA** — Espérame. ¿Entonces la sección estrella…?

> **ROCCO** — La sección estrella del sitio no funciona. Y `PLAN.md` §7 lo afirma como **el argumento
> número uno** de por qué el sitio no se puede copiar.

> **ISMAEL** — Eso lleva días escrito.

> **NADIA** — Y por eso la mesa completa valió la pena. **Sigue, Rocco.**

> **ROCCO** — La buena noticia también la comprobé: lo que el navegador necesita —`componer`, `svg`,
> `bitmap`, `ALFABETOS`, `PINCELES`— **no toca `node:fs` para nada.** Es un arreglo de dos líneas: el
> `import` se vuelve perezoso y `process` se lee sólo si existe.
>
> **La sección estrella está a dos líneas de ser posible, y a cero de ser una promesa falsa.**

> **FITO MENCHACA** — Y por eso, cuando me toque hablar, mi respuesta es: `tipos.mjs` **sí** se toca.
> No es "feo pero estable", que es lo que yo defiendo siempre. **Es inservible en el navegador**, que
> es otra cosa.

> **NADIA** — Queda como condición de salida: **la prueba de Rocco tiene que imprimir `OK <n> bytes
> de SVG`.** Mientras diga ERROR, el taller de tipografías no se anuncia. Y esa prueba se entierra en
> el repo, no se queda en el escritorio de nadie.

---

## ⏱ TURNO 5 · Oficio y operación

> **NAYELI CORDERO** — Con lo de Rocco encima, rehago mis cubetas en vivo:
>
> | | Qué | Por qué |
> |---|---|---|
> | 🟢 **Firme** | Bloque 1 · **el cronómetro** · "tu nombre en Mazi" · el 404 · la hora en la pestaña | Nuevo, aislado, sin dependencias. Y la fuente, el logo y los textos **ya existen** |
> | 🟡 **Con cuidado** | **El taller de tipografías** · el redimensionador | Por lo que acaba de traer Rocco. Arreglable y barato, pero **hoy no es cierto que corre** |
> | 🔴 **Minado** | El vectorizador · el video · **cualquier cosa que toque `ligas-mazi`** | `imagetracerjs` en navegador **no confirmado** · el video trae marca de ICAMP · y `ligas-mazi` son 5,124 líneas sin pruebas |
>
> Y la estimación honesta: el plan suena a semana y media y **con el requisito nuevo no lo es.** Lo
> que lo infla no es programar las herramientas: **es la experiencia única.** Cinco sueltas se hacen
> rápido; cinco que se sientan la misma máquina exigen que el contrato exista antes que la segunda.

> **VERÓNICA** — Gracias.

> **NAYELI** — No te emociones, sigo diciendo que no es de hoy. **La carcasa antes de la segunda
> cuesta 2 horas; la carcasa después cuesta cada herramienta otra vez.** Antes de la primera cuesta
> tres semanas sin nada que enseñar.
>
> Y **por dónde empezar para llegar más lejos hoy:** Bloque 1 completo y **una sola herramienta, el
> cronómetro.** Es 🟢, **es literalmente uno de los seis servicios**, y es la única que un
> desconocido puede usar hoy en su trabajo real.

> **CHUY BARRERA** — Un sitio estático no me despierta, pero **el cronómetro sí es un aparato con
> estado.** Mis preguntas de siempre: ¿qué pasa si truena a la mitad? Alguien mide 40 ciclos y se le
> bloquea el teléfono. **Si el estado sólo vive en memoria, perdió una hora de trabajo.** Se guarda
> en cada ciclo.
>
> Y si `tipos.mjs` truena, **la sección tiene que decirlo**: *"esta herramienta no cargó — escríbenos
> y te la enseñamos"*, con el botón. Un espacio en blanco es peor que un error honesto, sobre todo en
> la sección que prueba que sabemos.

> **SAÚL ZEPEDA** — Números. Fuente 9.4 KB · paloma 15 KB —**usen `paloma-simple.svg`, 12.8**— ·
> texto del sitio completo **1.9 KB**, o sea que el copy no es el problema · `tipos.mjs` son 1,993
> líneas y **no va a la portada, va al taller por `import()`**. Portada estimada **~50 KB** contra un
> presupuesto de 200.
>
> **El número que no pasa: ninguno.** Y por eso digo lo importante: **el presupuesto sólo se rompe si
> el taller se carga con la portada.** La decisión de Lucía vale más que cualquier optimización
> posterior.

---

## ⏱ TURNO 6 · Diseño toma el encargo principal

> **RENÉE IBARRA** — Carlos dijo *"priorizar diseño"* y *"una sola experiencia"*. Esta área lo toma
> como su encargo, y no entrego un párrafo, entrego la decisión:
>
> **No se diseñan cinco herramientas. Se diseña UN instrumento con cinco módulos.**
>
> Cinco juguetes bonitos con estilos parecidos **no** son una experiencia única: se nota a los dos
> segundos porque los controles no se comportan igual.
>
> Vocabulario, cinco piezas y ni una más: **la perilla** (44 px mínimo), **el selector** (fichas, no
> menú), **la lectura** (siempre arriba en teléfono), **el botón de acción** (uno), y **la bandeja**
> —exportar, reiniciar, compartir— **idéntica en las cinco.**
>
> Y digo lo que Verónica ya dijo en código: **la bandeja es la pieza clave.** Si el botón de exportar
> está en distinto lugar en cada herramienta, se acabó — por más que compartan colores.

> **VERÓNICA** — Es lo mismo que dije en el turno 1 y me lo discutieron.

> **NAYELI** — Te discutí el *cuándo*, no el *qué*.

> **RENÉE** — Y una corrección al plan que hago yo y no espero a que se rompa sola. §5 dice *fósforo
> rojo sólo dentro del display*. **Con cinco herramientas eso se desborda solo** — alguien va a
> querer el rojo para "detener" en el cronómetro. **Mi decisión: el fósforo se queda en el display Y
> en la lectura de las herramientas**, que también son pantallas, **y nunca en un botón ni en un
> título.** Ampliar la frontera a propósito y por escrito es mejor que verla romperse.

> **MATEO QUIROZ** — Regla de la tipografía, y sale de un error que cometimos **hoy mismo** en la
> central: **Mazi para lo grande y para las CIFRAS GRANDES. Nunca para números chicos.** Puse los
> contadores en Mazi a 12 px y **el 5 se leía como S y el 1 como dos puntos.** En el cronómetro eso
> sería peor: es puros números. A 40 px es el mejor argumento de marca del sitio; a 12 px es un
> acertijo.

> **SOL AGUIRRE** — **El fondo del taller no es una imagen**: degradado + grano en SVG, como quedó la
> central. Cero kilobytes. **Paso** en lo demás — aquí no hay ilustración que hacer, y meterla sería
> decorar un instrumento.

> **BRUNO TAPIA** — Dos concretas: **`paloma-simple.svg` en la barra**, no la completa. Y **lo que se
> exporte, que se exporte bien**: el SVG con `viewBox` para que escale, el CSV con BOM para que Excel
> no rompa los acentos. **Un exportador que entrega un archivo roto hace más daño que no tenerlo.**

---

## ⏱ TURNO 7 · Front end, apartado por apartado

> **XIMENA RÍOS** — Voy sección por sección, con veredicto y arreglo de cada una:
>
> | # | Apartado | Veredicto |
> |---|---|---|
> | 1 | **El display** | **Bien.** Lo mejor pensado del plan, no lo toco. **Pero el dibujo de §2 todavía trae la frase *"a la larga"*, que se retiró, y *"Torre Infinita → jugar"*, que ya salió** 🟠 |
> | 2 | **Qué hacemos** | Bien. Que cada servicio **enlace a la herramienta que lo prueba** 🟢 |
> | 3 | **El taller** | **Aquí está el hueco grande.** Una sola herramienta contra lo que pidió Carlos 🔴 |
> | 4 | **Trabajo** | Correcto. Y **añadir este sitio como pieza**: es el portafolio más honesto que hay 🟡 |
> | 5 | **Cómo trabajamos** | Bien, ya sin la comisión 🟢 |
>
> **Lo que NO debería existir:** la ruta `/marca` como está — *"las hojas que ya existen,
> limpiadas"*. Eso es material interno con ropa nueva. **O es una herramienta o no va.** §7 dice que
> cada sección tiene que **hacer** algo.

> **NADIA** — Ximena, tu 🔴 del taller te lo voy a rechazar al final. Adelanto el motivo: **no está
> roto, está incompleto.** Es distinto.

> **XIMENA** — Acepto la corrección. Y termino con las herramientas atadas a los seis servicios,
> porque **una herramienta que no prueba un servicio es un juguete**: cronómetro → *tiempos y
> movimientos* · tu nombre en Mazi → *identidad* · la fábrica → *identidad* · redimensionador →
> *video y foto* · vectorizador → *video y web*.
>
> **Y falta uno, hay que decirlo: *software* y *páginas web* no tienen herramienta pública, y son los
> dos servicios más caros.** El sitio mismo es su demostración.

> **IKER SALGADO** — Una regla que el taller nuevo necesita: **las herramientas no se animan al
> entrar. Responden al tacto y ya.** Una perilla que se desliza sola al aparecer se siente rota, no
> viva. El scroll guiado es para el **relato**; dentro de un instrumento, el único movimiento es el
> del dedo. **Mezclarlos es lo que hace que un sitio se sienta caro por fuera y barato al usarlo.**

> **PILAR ONTIVEROS** — **Perillas de 44 px mínimo.** Un `<input type=range>` mide 20 por defecto. Es
> el bug de `#segIn` en Ligas Mazi (161×36) y el del enlace de 24 px que salió **esta mañana** en el
> explorador. **Van tres. Que sea la última.**
>
> Y: etiqueta visible con su valor · el cronómetro tiene que funcionar **con teclado**, espacio para
> marcar ciclo · `prefers-reduced-motion` recibe el estado final, no una versión aguada.

> **GONZALO VERA** — **El acomodo de §2 sólo dibuja el teléfono**, y ése es exactamente el defecto por
> el que Ligas Mazi se ve mal en computadora. **Que no pase dos veces:** teléfono una columna ·
> **≥900 px dos columnas**, controles izquierda y lectura grande derecha · ≥1400 crece la lectura,
> **no** los controles. Un deslizador de 800 px no es más fácil de usar, es más difícil.

---

## ⏱ TURNO 8 · 🐈 Michi se sube a la mesa

*(Nadie lo invitó. Va después de todos, a propósito: su trabajo es romper lo que el equipo ya dio por
bueno.)*

> **🐈 MICHI** — Me subí al taller. Esto tiró:

| Qué le hice | Qué pasó |
|---|---|
| **Doble toque rápido** en "marcar ciclo" | Dos ciclos de 40 ms. Hay que ignorar bajo ~300 ms o el promedio se arruina **y nadie sabe por qué** |
| **Bloqueé el teléfono** a media medición | Si el tiempo se cuenta por cuadros, se detiene. **Se calcula con la hora del reloj** |
| **Cambié de pestaña** 10 minutos | Lo mismo, y al volver tiene que estar bien |
| **Recargué** con 40 ciclos medidos | Si sólo estaba en memoria: adiós hora de trabajo |
| **Cambié de herramienta** con el cronómetro corriendo | Sigue corriendo. `liberar()` |
| Solté una foto de **80 MB** | Pestaña colgada, sin mensaje |
| Escribí un nombre de **4,000 letras** | El SVG se vuelve gigante y el navegador se arrastra |
| **Giré el teléfono** con la lectura abierta | Si el canvas quedó del tamaño viejo, sale borroso |
| **Exportar sin haber medido nada** | Un archivo vacío. Botón apagado hasta que haya algo |

> **CHUY** — Seis de las nueve son del cronómetro.

> **NAYELI** — Que es justo la que quiero hacer primero.

> **MICHI** — 🐾 *(se echa encima del teclado)*

---

## ⏱ TURNO 9 · Nadia falla

> **NADIA BERRONES** — Escuché a los 23.

# VEREDICTO: `ARREGLAR PRIMERO`

> No es `ENVIAR` porque **el plan afirma como hecho algo que Rocco demostró falso**, y no es
> cualquier línea: es el argumento central de por qué el sitio no se puede copiar. No es `NO SE
> ENVÍA` porque no hay nada peligroso —ni cuentas, ni datos, ni dinero— y porque **el plan, en lo
> demás, es bueno**: la portada, la paleta, el orden de construcción y la regla de que cada sección
> haga algo se quedan.

### Qué rechazo de mi propio equipo

> - **A Verónica, a medias, y le doy la razón a Nayeli en el cuándo.** El contrato es correcto y lo
>   apruebo, **pero no antes de la primera herramienta.** Escribir la arquitectura de cinco teniendo
>   cero es cómo no se entrega nada. **Se escribe con la segunda a la vista.**
> - **A Ximena, su 🔴.** El taller no está roto: está **incompleto**. Con el requisito nuevo hay que
>   rediseñarlo, y eso ya quedó hecho en esta junta.
> - **A Michi, nada.** Nueve hallazgos y seis son de la herramienta que va primero. 🐾
> - **Y a mí misma:** abrí diciendo que nadie afirma lo que no ha visto correr, y **el plan llevaba
>   días afirmándolo.** Esa regla no sirve si sólo se dice al abrir la junta. Se vuelve prueba
>   enterrada en el repo.

### Lo que se arregla antes de escribir la primera línea del sitio

> 1. **`tipos.mjs` en el navegador** — dos líneas. Condición de salida: la prueba de Rocco imprime
>    `OK <n> bytes de SVG`.
> 2. **Corregir el plan donde miente** — el diagrama de §2 y el §7.
> 3. **Escapado y topes** en toda entrada del visitante — 1 h.

### Lo que se decide

> - **El taller es un instrumento con módulos.** La bandeja idéntica y el `exportar()` común **son**
>   la experiencia única; lo demás es pintura.
> - **Cada herramienta prueba un servicio, o es un juguete y sale.**
> - **Se arranca con Bloque 1 + el cronómetro**, no con la de tipografías.
> - **"Nada de esto sale de tu teléfono"** va en pantalla. Es la única parte de esta auditoría que
>   **vende**.

> **El riesgo más grande, en una línea:** que el taller crezca a cinco herramientas sin carcasa común
> y termine siendo cinco juguetes en una página — **y no se nota hasta la tercera, cuando ya cuesta
> rehacer las dos anteriores.**

**La prueba que reproduce:**
```bash
node herramientas/pruebas-tipos-navegador.mjs
# antes:  ERROR Failed to fetch dynamically imported module
# ahora:  OK 7603 bytes de SVG      ← arreglado el mismo día
```

---

## Qué pasó después

- [x] Prueba de Rocco corrida · **falló, como se esperaba**
- [x] **Arreglo 1 hecho el mismo día** · `tipos.mjs` dual · ahora imprime `OK 7603 bytes de SVG` ·
      prueba enterrada en `herramientas/pruebas-tipos-navegador.mjs`
- [x] **Arreglo 2 hecho** · `PLAN.md` §2 y §7 corregidos
- [ ] Arreglo 3 · escapado y topes — va con la primera herramienta
- [ ] 🟡 Contrato de herramienta — antes de la **segunda**
- [x] ⚪ Aceptados por escrito: código visible · sin service worker en la v1

**Lo decidido pasó después por el consejo de negocio y los cuatro jueces:**
[`2026-07-30-el-taller-de-herramientas.md`](../veredictos/2026-07-30-el-taller-de-herramientas.md)
— **CONSTRUIR, con alcance congelado en dos herramientas.**
