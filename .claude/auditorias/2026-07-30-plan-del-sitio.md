# Auditoría · El plan de desarrollo del sitio

**Fecha:** 30 de julio de 2026
**Quién la pidió:** Carlos — *"haz que hagan una auditoría del plan de desarrollo para ahora sí
afinar los últimos detalles de cómo funcionará y cómo estará acomodada"*, más un requisito nuevo:
**las herramientas no serán sólo la de fuentes; hacen falta cosas a distintas escalas para industrias
reales, todo tiene que ser una sola experiencia, y se prioriza el diseño.**
**Qué se auditó:** [`sitio/PLAN.md`](../../sitio/PLAN.md) completo · `herramientas/tipos.mjs` ·
`herramientas/vectorizar.mjs` · el requisito nuevo.
**Dónde correrá:** GitHub Pages. Sin servidor.
**¿Hay datos de personas?** hoy no · **¿de menores?** no · **¿el repo es público?** **sí**
**Mesa convocada:** **completa (24)** — no por la superficie, que hoy es chica, sino porque es la
primera auditoría de la casa y porque el requisito nuevo cambia la forma del proyecto, no un detalle.

**Auditorías previas:** ninguna. Ésta estrena `.claude/auditorias/`.
**Veredictos de negocio que aplican:** [`2026-07-30-el-sitio.md`](../veredictos/2026-07-30-el-sitio.md)
y [`2026-07-30-los-textos.md`](../veredictos/2026-07-30-los-textos.md).

---

## El sistema, en tres líneas

Un sitio estático en GitHub Pages, teléfono primero, sin cuentas y sin base de datos: cinco secciones
y rutas aparte. Lo usa un desconocido que llega de Instagram o de un reenvío de WhatsApp. **Lo peor
que puede pasar** no es que lo hackeen —no hay qué llevarse— sino que **no cargue, no se entienda, o
que la sección estrella no funcione** y quede como lo contrario de lo que vende.

---

# 🏗 ARQUITECTURA · Verónica, Beto, Kenji, Lucía

### Verónica Alcázar · la suposición enterrada

Nombro archivo y línea o no lo cuento, así que aquí va la que importa:

> **El plan supone en todos lados que el sitio es chico, y con el requisito nuevo deja de serlo.**

`PLAN.md` §11 dice *"portada = HTML + CSS + nuestra fuente + unos 10 KB de JavaScript a mano, cero
dependencias"*. Perfecto para **una** herramienta. Carlos acaba de pedir **varias, a distintas
escalas, para industrias reales, y como una sola experiencia.** Eso son cinco o seis programas
interactivos conviviendo.

Si cada uno se escribe a mano dentro de un `index.html`, en tres semanas tenemos **`ligas-mazi`
otra vez: 5,124 líneas en un archivo**, que es el sistema que Nayeli va a marcar en rojo más abajo y
el que a mí me obligó a pedir `mapa.mjs`. **No es una predicción: es el mismo camino, con las mismas
manos.**

**Lo que hay que decidir hoy, mientras es gratis** — un contrato de herramienta. Cada una vive en su
archivo y expone lo mismo:

```
sitio/taller/<herramienta>.js  →  export default {
    id, nombre, servicio,        // a qué servicio de los seis pertenece
    montar(nodo, taller),        // se dibuja dentro del nodo que le dan
    exportar(),                  // { nombre, tipo, datos }  ← el mismo para todas
    liberar()                    // se apaga al salir: temporizadores, listeners
}
```

**Ese contrato ES "una sola experiencia" dicho en código**, y por eso lo pongo yo y no el área de
diseño: si `exportar()` no es igual para todas, el botón de exportar tiene que ser distinto en cada
una, y ahí se acabó la experiencia única por más que se pinten iguales. **La consistencia visual sin
consistencia de interfaz dura hasta la tercera herramienta.**

Y `liberar()` no es adorno: el cronómetro tiene un temporizador vivo. Sin apagarlo al cambiar de
herramienta, se queda corriendo. Eso es el softlock de Torre Infinita con otra ropa.

### Lucía Prado · plataforma

GitHub Pages no compila nada, así que **módulos ES nativos y `import()` dinámico por herramienta.**
La portada no carga ni un byte del taller; cada herramienta llega cuando alguien la abre. Es la única
forma de que el presupuesto de Saúl sobreviva a seis herramientas, y no cuesta build: es una línea
por herramienta.

**Y una que el plan no contempla:** el sitio **no** debe llevar service worker en la versión 1.
Sirve para offline, pero también sirve versiones viejas, y `PLAN.md` no dice quién lo va a versionar.
Un sitio que se actualiza a diario con un SW mal cuidado es cómo Carlos ve "no se aplicó mi cambio"
diez veces. **Se acepta el riesgo de no tener offline** a cambio de no tener ese problema. Cuando el
sitio se estabilice, se agrega con su versionado.

### Beto Nájera · datos

**Paso en lo mío** —no hay base de datos y me alegro—, pero digo una cosa que sí es de datos y nadie
más va a decir: **las herramientas del taller van a producir datos del visitante**, y el cronómetro
en particular produce **datos de la operación de su negocio**. Eso lo retoma Paola y es más grande de
lo que parece.

### Kenji Mora · a escala

Nada se cae con más datos porque no hay datos compartidos. Un cronómetro con 500 ciclos en
`localStorage` son ~30 KB, sin problema. **La única que crece sin límite** es el historial de
mediciones si nunca se borra: hay que poner tope y avisar, no dejarlo crecer callado.

---

# 🕳 CUERVO · el sombrero negro EN CONTRA (a ciegas)

No leí el código. Abrí lo que habrá y le piqué. Y voy a ser honesto porque es lo que me toca:

> **Un sitio estático sin cuentas, sin base y sin servidor es de las cosas más aburridas que me
> pueden dar.** No hay sesión que robar, no hay `id` que cambiar, no hay login que enumerar. **Paso
> en las nueve clases que normalmente uso.**

Pero encontré dos cosas, y las dos vienen del requisito nuevo:

| # | Por dónde | Qué rompe | Qué tan fácil |
|---|---|---|---|
| 1 | El botón **"compartir por WhatsApp"** del menú propio (§6-bis) arma una liga `wa.me` pegando texto de la página | Si ese texto sale de algo que el visitante escribió —su nombre en la herramienta de tipografía— y no se codifica, se le puede meter contenido a la liga que se comparte | abriendo el inspector |
| 2 | Las herramientas que **aceptan un archivo** (el vectorizador) | Le doy una imagen de 80 MB desde el teléfono y le tumbo la pestaña **al visitante**, no a nosotros | arrastrando un archivo |

**El camino más corto al daño más grande:** ninguno llega a nosotros. **Los dos le pegan al
visitante**, que es un tipo de daño distinto y que en un sitio de venta cuesta igual: alguien que
entra a probar la herramienta y se le traba el teléfono no vuelve, y ésa es toda la venta.

---

# 🕳 AK · el sombrero negro A FAVOR (con los planos)

Leí el plan, el código de `tipos.mjs` y el de `vectorizar.mjs`. Confirmo lo de Cuervo y agrego lo que
sólo se ve con los planos. Las clases son las de
[`vulnerabilidades.md`](../skills/consejo-tecnico/reference/vulnerabilidades.md).

| Clase | Cómo aplica aquí | Cómo se cierra |
|---|---|---|
| **8 · texto de usuario en la página** | Las herramientas de "escribe tu nombre" toman texto y lo meten en un SVG. Un SVG **es** un documento con etiquetas: si el nombre se concatena sin escapar, se rompe el SVG, y si además ese SVG se descarga y se comparte, generamos nosotros el archivo | Escapar `&<>"'` **al construir el SVG**, no al pintarlo. Y tope de largo: un nombre de 4,000 letras no es un nombre |
| **7 · lo que el usuario sube** | El vectorizador recibe una imagen. Corre en el navegador del visitante, así que el riesgo no es nuestro servidor: es **su teléfono** | Tope de tamaño y de dimensiones **antes** de procesar, y decírselo con un mensaje, no con una pestaña colgada |
| **9 · lo que queda en el teléfono** | Aquí está lo importante, ver abajo | |

### Lo que sólo se ve con los planos, y cambia el diseño

> **El cronómetro de tiempos y movimientos guarda datos de la operación de un negocio ajeno.**

Cuánto tarda su cocina en sacar un plato, cuántos ciclos hace su línea, dónde está su cuello de
botella. **Eso no es "datos de un formulario": es información competitiva de un tercero**, y la va a
meter en nuestra página un desconocido que todavía no nos contrata.

Técnicamente no hay riesgo, y por una razón concreta: **no hay a dónde mandarlos.** GitHub Pages no
tiene servidor. Los datos se quedan en su teléfono porque no existe otra opción.

**Y ahí está lo que quiero que quede escrito, porque el día que exista un servidor alguien va a
querer "guardarlo en la nube":**

**Se cierra por diseño, no por casualidad: los datos del taller NUNCA salen del teléfono del
visitante, y agregar cualquier envío requiere auditoría.** Punto.

Lo otro que traigo es de la casa y ya lo dijo el catálogo: **`ligas-mazi` y `vitallink` cargan
librerías de un CDN ajeno** (clase 6). El sitio nuevo **no puede nacer con esa deuda** — cero CDN
desde el primer archivo, que además es LA REGLA §2.

---

# 🛡 LOS SOMBREROS BLANCOS · Damián, Emilio, Paola, Tadeo

### Damián Ocaña · la clasificación

Leí a los dos negros. **Y no voy a inflar esto:** un sitio estático sin cuentas no tiene nada que
sangre, y decir lo contrario para que la auditoría se vea importante sería exactamente el vicio que
esta casa existe para evitar.

| Nivel | Hallazgo | Arreglo | Cómo se comprueba |
|---|---|---|---|
| 🔴 | **Ninguno.** No hay cuentas, ni pagos, ni datos nuestros ni de menores | — | — |
| 🟠 | Texto del visitante concatenado en un SVG que se puede descargar y compartir | Escapar al construir + tope de largo | Escribir un nombre con etiquetas y bajar el SVG: tiene que salir literal |
| 🟠 | Archivo sin tope en el vectorizador tumba el teléfono **del visitante** | Tope de tamaño y de píxeles antes de procesar | Soltar una imagen enorme: debe rechazarla con un mensaje |
| 🟠 | Texto sin codificar en la liga `wa.me` del menú propio | `encodeURIComponent`, siempre | Compartir con un nombre raro y revisar la liga |
| 🟡 | Sin contrato de herramienta, el taller se vuelve un monolito | El contrato de Verónica, **antes** de la segunda herramienta | Que la herramienta 2 no obligue a tocar la 1 |
| 🟡 | Sin `liberar()`, el cronómetro sigue corriendo al cambiar de herramienta | `liberar()` en el contrato | Abrir cronómetro → cambiar → volver: un solo temporizador |
| ⚪ | **Todo el código es visible.** Es nuestra arquitectura, a propósito | **Se acepta.** La ventaja no está en el código, está en la velocidad y el criterio | — |
| ⚪ | **Sin offline (sin service worker) en la v1** | **Se acepta** a cambio de no servir versiones viejas mientras el sitio cambia a diario. Se agrega cuando se estabilice, con versionado | — |

**Los tres arreglos de hoy, en orden, con horas:**
1. Escapado + topes en toda entrada del visitante — **1 h**, y va **antes** de la primera herramienta.
2. El contrato de herramienta — **2 h**, y va **antes** de la segunda.
3. `encodeURIComponent` en el menú propio — **10 min**.

### Paola Urquiza · datos y privacidad

Firmo lo de AK y subo la apuesta, porque esto **no es un riesgo: es un argumento de venta que
estamos a punto de desperdiciar.**

Un dueño de taller que mide los tiempos de sus empleados en una página de una empresa que no conoce
**va a dudar, y con razón.** Si no le decimos nada, la mitad no la usa.

> **Que la herramienta lo diga, en la pantalla, con todas sus letras:**
> *"Esto se calcula en tu teléfono. Nada de lo que midas sale de aquí, ni siquiera a nosotros."*

Eso **es LA REGLA §2 dicha para el cliente** —*conectar sí, depender no*— y es la primera vez que la
podemos demostrar en lugar de prometerla. Convierte nuestra limitación técnica (no hay servidor) en
la razón para confiar.

### Emilio Cantú
**Paso.** No hay sesiones ni permisos que revisar. Cuando exista el formulario de contacto con
servidor, me llaman.

### Tadeo Riquelme
**Paso**, con una línea: no hay incidente posible que no se arregle publicando de nuevo. **Eso es un
lujo y hay que disfrutarlo mientras dure.**

---

# 🌙 OFICIO Y OPERACIÓN · Chuy, Nayeli, Fito, Saúl

### 🔴🟡🟢 Nayeli Cordero · las tres cubetas

Esto es lo que Carlos pidió con nombre y apellido: **por dónde moverse y por dónde no.**

| | Qué | Por qué |
|---|---|---|
| 🟢 **Terreno firme** | **Bloque 1** (armazón + portada + contacto) · **el cronómetro de tiempos y movimientos** · **"tu nombre en Mazi"** · el 404 · la hora en la pestaña | Todo es nuevo, aislado, sin dependencias y sin datos ajenos. Y la fuente, el logo y los textos **ya existen**: no hay nada que esperar |
| 🟡 **Con cuidado** | **El taller de tipografías en vivo** · el redimensionador de imágenes | `tipos.mjs` **no corre en el navegador** (ver abajo). Es arreglable y barato, pero **hoy no es cierto que "corre tal cual"**, y el plan lo da por hecho en §7 |
| 🔴 **Minado** | **El vectorizador** · **el video de la plataforma** · **cualquier cosa que toque `ligas-mazi`** | El vectorizador depende de que `imagetracerjs` corra en navegador — **no confirmado**, y `vectorizar.mjs` son 551 líneas escritas para Node. El video trae marca de ICAMP. Y `ligas-mazi` son 5,124 líneas en un archivo sin pruebas: ahí no se entra esta semana |

**La estimación honesta, y qué la infla.** El plan tiene siete bloques y suena a semana y media.
**Con el requisito nuevo de varias herramientas, no lo es**, y lo que lo infla no es programarlas:
es **la experiencia única**. Cinco herramientas sueltas se hacen rápido; cinco herramientas que se
sienten **la misma máquina** exigen que el contrato y la carcasa existan antes que la segunda. Si se
hace después, se rehacen las anteriores. **La carcasa primero cuesta 2 horas; la carcasa después
cuesta cada herramienta otra vez.**

**Por dónde empezar para llegar más lejos hoy:** Bloque 1 completo y **una sola herramienta, el
cronómetro** — porque es 🟢, porque **es literalmente uno de los seis servicios**, y porque es la
única que un desconocido puede usar hoy en su trabajo real. La de tipografías es más impresionante y
es 🟡: va segunda, cuando `tipos.mjs` esté arreglado.

### 🌙 Chuy Barrera · las 3 de la mañana

Un sitio estático no me despierta. Pero **el cronómetro sí es un aparato con estado**, y ahí van mis
preguntas de siempre:

- **¿Qué pasa si truena a la mitad?** Alguien mide 40 ciclos, se le bloquea el teléfono, entra una
  llamada, o cambia de pestaña. **Si el estado sólo vive en memoria, perdió una hora de trabajo.**
  Se guarda en cada ciclo, no al final. Y al volver, se ofrece continuar.
- **¿Se entera si falla?** Si `tipos.mjs` truena, la sección estrella tiene que **decirlo**, no
  quedarse en blanco: *"esta herramienta no cargó — escríbenos y te la enseñamos"*, con el botón. Un
  espacio vacío es peor que un error honesto, sobre todo en la sección que prueba que sabemos.
- **¿Se puede deshacer?** Sí: es Pages, se revierte publicando de nuevo.

### Fito Menchaca · dónde tocar
**Nada de `ligas-mazi` esta semana**, y Carlos ya lo dijo. Lo que sí hay que tocar y es barato es
`tipos.mjs`: dos líneas, ver abajo. Feo pero estable no se toca; **`tipos.mjs` no es feo, es
inservible en el navegador**, que es otra cosa.

### 📉 Saúl Zepeda · números o nada

| Qué | Medido | Presupuesto | ¿Pasa? |
|---|---|---|---|
| Fuente Mazi (`woff2`) | **9.4 KB** | — | ✅ |
| Paloma (`svg`) | **15 KB** | — | ⚠️ usar `paloma-simple.svg` (12.8 KB) en la barra |
| Texto del sitio completo | **~1.9 KB** | — | ✅ el copy no es el problema |
| `tipos.mjs` completo | **1,993 líneas** | — | ⚠️ **no va entero a la portada.** Sólo al taller, y por `import()` |
| Portada (estimado) | fuente + logo + CSS + ~10 KB JS ≈ **50 KB** | < 200 KB | ✅ con margen |

**El número que NO pasa hoy: ninguno.** Y por eso digo lo importante: **el presupuesto sólo se rompe
si el taller se carga con la portada.** Con `import()` dinámico no se rompe nunca, aunque haya diez
herramientas. **Esa decisión de Lucía vale más que cualquier optimización posterior.**

---

# 🎨 DISEÑO GRÁFICO · Renée, Mateo, Sol, Bruno

> Carlos dijo **"vamos a priorizar diseño"** y **"todo tiene que ser una sola experiencia"**. Esta
> área toma eso como su encargo principal, y no entrega un párrafo: entrega la decisión.

### Renée Ibarra · qué significa "una sola experiencia"

Significa una cosa muy concreta y es lo contrario de lo que suele hacerse:

> **No se diseñan cinco herramientas. Se diseña UN instrumento con cinco módulos.**

Cinco juguetes bonitos con estilos parecidos **no** son una experiencia única: se nota a los dos
segundos porque los controles no se comportan igual. Un instrumento sí, y ya tenemos su referencia
escrita en `PLAN.md` §4: *un tablero, un reloj de estación, una consola.*

**El vocabulario del instrumento — cinco piezas y ni una más.** Todas las herramientas se arman con
esto y con nada más:

| Pieza | Qué es | Regla |
|---|---|---|
| **La perilla** | Un control de rango con su etiqueta y su cifra en Mazi | Mínimo 44 px de alto. Es la que más se toca |
| **El selector** | Elegir entre opciones (alfabeto, pincel, unidad) | Fichas, no menú desplegable. En teléfono un menú es un paso de más |
| **La lectura** | Donde sale el resultado: el SVG, la tabla, el número | Siempre arriba de los controles en teléfono, para verla mientras se mueve |
| **El botón de acción** | Uno por herramienta, en violeta | **Uno.** Si hay dos, el segundo va en texto |
| **La bandeja** | La barra de abajo: exportar, reiniciar, compartir | **Idéntica en las cinco.** Ésta es la que hace que se sienta la misma máquina |

**La bandeja es la pieza clave y es la que Verónica ya pidió en código con `exportar()`.** Si el
botón de exportar está en un lugar distinto en cada herramienta, se acabó la experiencia única — por
más que compartan colores.

**Lo que está fuera de la marca hoy y hay que corregir en el plan:** `PLAN.md` §5 dice *fósforo rojo
`#E8232A` sólo dentro del display*. **Con un taller de cinco herramientas eso se va a desbordar
solo** — alguien va a querer el rojo para "detener" en el cronómetro. **Mi decisión: el fósforo se
queda en el display Y en la lectura de las herramientas** (que también son pantallas), y **nunca en
un botón ni en un título**. Ampliar la frontera a propósito y por escrito es mejor que verla
romperse.

### Mateo Quiroz · marca y tipografía

Regla de la tipografía Mazi, y sale de un error que ya cometimos hoy mismo en la central:

> **Mazi para lo grande y para las CIFRAS GRANDES. Nunca para números chicos.**

En la central puse los contadores de sección en Mazi a 12 px y **el 5 se leía como S y el 1 como dos
puntos**. En un taller eso es peor: el cronómetro es **puros números**. A 40 px la cifra en Mazi se
ve espectacular y es el mejor argumento de marca del sitio; a 12 px es un acertijo.

**Entonces:** cifra principal en Mazi grande · cifras secundarias y tablas en la sans con cifras de
ancho fijo.

### Sol Aguirre · fondo y atmósfera
**El fondo del taller no es una imagen.** Degradado + grano en SVG, como quedó la central: cero
kilobytes y se cambia de color en una línea. **Paso** en lo demás: aquí no hay ilustración que hacer,
y meterla sería decorar un instrumento.

### Bruno Tapia · producción
Dos cosas concretas: **usar `paloma-simple.svg` (12.8 KB) en la barra**, no la completa; y **cada
herramienta que exporte algo tiene que exportarlo bien** — el SVG con `viewBox` para que escale, el
CSV con BOM para que Excel no rompa los acentos. Un exportador que entrega un archivo roto hace más
daño que no tenerlo.

---

# 🖥 FRONT END · Ximena, Iker, Pilar, Gonzalo

### Ximena Ríos · apartado por apartado

| # | Apartado | Cómo está en el plan | El arreglo | Nivel |
|---|---|---|---|---|
| 1 | **El display** (portada) | **Bien.** Es lo mejor pensado del plan y no lo toco | El diagrama de §2 todavía trae *"no lo hacemos en corto"*, que **ya está retirada**, y *"Torre Infinita → jugar"*, que **ya salió**. Corregir el dibujo | 🟠 |
| 2 | **Qué hacemos** | **Bien**, con la corrección de nombre grande + frase chica ya aplicada | Que cada uno de los seis **enlace a la herramienta que lo prueba**, cuando la haya. Ahí se amarra el requisito nuevo con la sección que ya existía | 🟢 |
| 3 | **El taller** | **Aquí está el hueco grande.** El plan tiene una sola herramienta y Carlos pidió varias | Rediseñarlo como **instrumento con módulos** (ver abajo) | 🔴 |
| 4 | **Trabajo** | Correcto | Sin capturas jugables de Torre. Y **añadir el propio sitio como pieza**: es el portafolio más honesto que hay | 🟡 |
| 5 | **Cómo trabajamos · Contacto** | Bien, ya sin la comisión | Ninguno | 🟢 |

**Lo que NO debería existir:** la ruta `/marca` como está planteada — *"las hojas que ya existen,
limpiadas"*. Eso es material interno con ropa nueva. **O es una herramienta (bajar la fuente, ver el
kit) o no va.** Una página que sólo enseña no cumple la regla de §7: *cada sección tiene que hacer
algo.*

**Lo que falta y qué poner ahí:** el taller deja de ser una sección con una demo y pasa a ser
**la sección de herramientas**, con esta forma:

```
EL TALLER
"Herramientas que construimos para nosotros. Úsalas."
┌──────────────────────────────────────────┐
│  [ fichas: las herramientas disponibles ] │ ← selector, siempre visible
├──────────────────────────────────────────┤
│                                          │
│              LA LECTURA                  │ ← el resultado, arriba
│                                          │
├──────────────────────────────────────────┤
│  perilla ────●────                       │ ← los controles, abajo
│  perilla ────●────                       │
├──────────────────────────────────────────┤
│  ⤓ exportar    ↺ reiniciar    ⌾ compartir │ ← LA BANDEJA, idéntica en todas
└──────────────────────────────────────────┘
        "Nada de esto sale de tu teléfono."
        ┌─────────────────────────┐
        │  Hablar por WhatsApp    │ ← la salida, en cada herramienta
        └─────────────────────────┘
```

**Y las herramientas, atadas a los seis servicios**, que es lo que Carlos pidió al decir *"escalas
para industrias reales"*. Una herramienta que no prueba un servicio es un juguete:

| Herramienta | Prueba el servicio | Para quién es, de verdad | Cubeta |
|---|---|---|---|
| **Cronómetro de tiempos y movimientos** | *Tiempos y movimientos* | Un taller, una cocina, una línea. **Mide ciclos, saca promedio y desviación, señala el cuello de botella y exporta a Excel** | 🟢 |
| **Tu nombre en Mazi** | *Marketing · identidad* | Cualquiera. Es el imán: se comparte solo | 🟢 |
| **La fábrica de tipografías** | *Marketing · identidad* | El que se clavó. Es la que nadie puede copiar | 🟡 |
| **Redimensionador para redes** | *Video y fotografía* | Una tienda, un restaurante: una foto → los cinco formatos que necesita | 🟡 |
| **Vectorizador** | *Video y fotografía · web* | El negocio que sólo tiene su logo en JPG borroso. **El mejor imán posible** | 🔴 |
| *(después)* **Cotizador** | *Gestión de negocios* | Es la Fase 3 asomando | — |

**Falta uno y hay que decirlo:** *Desarrollo de software* y *Páginas web* **no tienen herramienta
pública**, y son los dos servicios más caros. **El sitio mismo es su demostración** — por eso
Trabajo debe incluirlo como pieza.

### Iker Salgado · movimiento

El plan está bien en §6-ter y sólo agrego una regla que el taller nuevo necesita:

> **Las herramientas no se animan al entrar. Responden al tacto y ya.**

Una perilla que se desliza sola al aparecer se siente rota, no viva. El movimiento guiado por scroll
es para el **relato** (portada, secciones); dentro de un instrumento, el único movimiento es el que
provoca el dedo. **Mezclarlos es lo que hace que un sitio se sienta caro por fuera y barato al
usarlo.**

### Pilar Ontiveros · tacto y accesibilidad

- **Perillas de 44 px de alto mínimo.** Un `<input type=range>` mide 20 px por defecto. Es
  exactamente el bug que ya nos mordió en Ligas Mazi (`#segIn`, 161×36) y el que salió esta mañana en
  el explorador (el enlace de 24 px). **Van tres. Que sea la última.**
- Cada perilla con **etiqueta visible y su valor**, no sólo la posición.
- El cronómetro tiene que **funcionar con teclado**: espacio para marcar ciclo.
- `prefers-reduced-motion` recibe el estado final, no una versión aguada.
- **La lectura necesita contraste real:** hueso sobre superficie, no violeta sobre violeta.

### Gonzalo Vera · anchos

**El acomodo de §2 sólo dibuja el teléfono**, y ése es exactamente el defecto por el que Ligas Mazi
se ve mal en computadora. **Que no pase dos veces:**

- **Teléfono:** lectura arriba, controles abajo, bandeja al pie. Una columna.
- **≥900 px:** **dos columnas** — controles a la izquierda, lectura grande a la derecha. Un
  instrumento en escritorio con los controles debajo del resultado desperdicia la pantalla.
- **≥1400 px:** la lectura crece, los controles **no**. Un deslizador de 800 px de ancho no es más
  fácil de usar, es más difícil.

---

# 🐈 MICHI · lo que nadie planeó

*Me subí al taller. Esto tiró:*

| Qué le hice | Qué pasa |
|---|---|
| Le di **dos veces rápido** a "marcar ciclo" | Dos ciclos de 40 ms. Hay que ignorar marcas a menos de ~300 ms, o el promedio se arruina y nadie sabe por qué |
| **Bloqueé el teléfono** a media medición | Si el tiempo se calcula sumando cuadros, se detiene. **Se calcula con la hora del reloj, no contando cuadros** |
| **Cambié de pestaña** 10 minutos | Lo mismo. Y al volver, tiene que estar bien |
| **Recargué** con 40 ciclos medidos | Si sólo estaba en memoria, adiós hora de trabajo |
| **Cambié de herramienta** con el cronómetro corriendo | Sigue corriendo. `liberar()` |
| Solté una foto de **80 MB** en el vectorizador | Pestaña colgada, sin mensaje |
| Escribí un nombre de **4,000 letras** | El SVG se vuelve gigante y el navegador se arrastra |
| **Giré el teléfono** con la lectura abierta | Hay que redibujar; si el canvas quedó del tamaño viejo, sale borroso |
| Le di a **exportar sin haber medido nada** | Un archivo vacío. Mejor: el botón apagado hasta que haya algo |

🐾 *Nueve. Y seis son del cronómetro, que es justo la herramienta que Nayeli quiere hacer primero.*

---

# 🐕 ROCCO · la evidencia

**Fui, lo corrí, y traigo esto. No es sospecha:**

| Qué se probó | Cómo | Resultado |
|---|---|---|
| **¿`tipos.mjs` corre en el navegador?** | Servidor local + Chromium, `import("/herramientas/tipos.mjs")` y llamar a `svg("MAZI")` | ❌ **NO.** `Failed to fetch dynamically imported module` · `Access to script at 'node:fs' has been blocked` |

**El plan dice, en §7:** *"`tipos.mjs` es JavaScript sin una sola dependencia: **corre en el navegador
tal cual**"*. **Eso no es cierto hoy**, y era el argumento número uno de por qué el sitio es
imposible de copiar.

**Por qué falla, exacto:** línea **61** hace `import { writeFileSync } from 'node:fs'` en el nivel
superior, y las líneas **1936 y 1942** leen `process.argv` al cargar el módulo. Las tres son del CLI,
no del dibujo.

**Y la buena noticia, que también comprobé:** lo que el navegador necesita —`componer`, `svg`,
`bitmap`, `ALFABETOS`, `PINCELES`— **no toca `node:fs` para nada.** Es un arreglo de dos líneas:
el `import` se vuelve dinámico dentro del bloque del CLI, y `process.argv` se lee sólo si `process`
existe. **La sección estrella del sitio está a dos líneas de ser posible, y a cero de ser una
promesa falsa.**

🦴 *Prueba de regresión enterrada: `scratchpad/rocco-tipos.mjs`. Se muda al repo cuando el taller
tenga su banco de pruebas, y corre en cada bloque.*

---

# ⚖️ NADIA BERRONES · la Jueza Técnica

Escuché a los 23. Aquí está mi fallo.

# VEREDICTO: `ARREGLAR PRIMERO`

No es `ENVIAR` porque **el plan afirma como hecho algo que Rocco demostró falso**, y no es cualquier
línea: es el argumento central de por qué el sitio no se puede copiar. No es `NO SE ENVÍA` porque no
hay nada peligroso —no hay cuentas, no hay datos, no hay dinero— y porque **el plan, en lo demás, es
bueno**: la portada, la paleta, el orden de construcción y la regla de que cada sección haga algo se
quedan como están.

### Qué rechazo de mi propio equipo

- **A Verónica, a medias.** Su contrato de herramienta es correcto y lo apruebo, pero **no antes de
  la primera herramienta.** Escribir la arquitectura de cinco herramientas antes de tener una es
  cómo no se entrega nada. **Se escribe con la segunda a la vista, no con cero.** Ella pidió "hoy";
  yo digo "antes de la segunda", que es cuando de verdad cuesta caro no tenerlo.
- **A Ximena, su 🔴 en el taller.** El taller no está roto: está **incompleto**, que es distinto. Con
  el requisito nuevo hay que rediseñarlo, y eso ya está hecho en esta acta.
- **A Michi, nada.** Nueve hallazgos y seis son de la herramienta que va primero. 🐾

### Lo que se arregla antes de escribir la primera línea del sitio

1. **`tipos.mjs` en el navegador** — dos líneas. Sin esto, la sección estrella es una promesa.
   **Y hasta que Rocco lo confirme, `PLAN.md` §7 no puede decir "corre tal cual".**
2. **Corregir el plan donde miente:** el diagrama de §2 todavía trae la frase retirada y
   *"Torre Infinita → jugar"*. Un plan que contradice las decisiones ya tomadas se va a construir mal.
3. **Escapado y topes** en toda entrada del visitante — 1 h, antes de la primera herramienta.

### Lo que se decide, y es lo que Carlos vino a preguntar

- **El taller es un instrumento con módulos**, no cinco demos. La bandeja idéntica y el
  `exportar()` común **son** la experiencia única; lo demás es pintura.
- **Las herramientas se atan a los seis servicios.** Una herramienta que no prueba un servicio es un
  juguete, y sale.
- **Se arranca con Bloque 1 + el cronómetro**, no con la de tipografías. Es 🟢, es literalmente uno
  de los seis servicios, y es la única que un desconocido puede usar **hoy en su trabajo real**. La
  de tipografías impresiona más y es 🟡: va segunda.
- **"Nada de esto sale de tu teléfono"** se pone en pantalla. Es LA REGLA dicha para el cliente y es
  la única parte de esta auditoría que **vende**.

**El riesgo más grande, en una línea:** que el taller crezca a cinco herramientas sin carcasa común y
termine siendo cinco juguetes en una página — que es exactamente lo contrario de lo que Carlos pidió,
y no se nota hasta la tercera, cuando ya cuesta rehacer las dos anteriores.

**La prueba que reproduce el hallazgo grave:**
```bash
node /tmp/.../scratchpad/rocco-tipos.mjs
# hoy imprime:  ERROR Failed to fetch dynamically imported module
# tiene que imprimir:  OK <n> bytes de SVG
```
**Ese comando es la condición de salida del arreglo 1.** Mientras diga ERROR, el taller de
tipografías no se anuncia.

---

## Qué pasó después

- [x] Se corrió la prueba que reproduce · **resultado: falla, como se esperaba.** `tipos.mjs` no
      carga en el navegador.
- [ ] Arreglo 1 · `tipos.mjs` dual (navegador + Node) · condición de salida: `OK <n> bytes`
- [ ] Arreglo 2 · corregir `PLAN.md` §2 y §7
- [ ] Arreglo 3 · escapado y topes en entradas del visitante
- [ ] 🟡 Contrato de herramienta — antes de la **segunda** herramienta, no de la primera
- [x] ⚪ Aceptados por escrito: código visible · sin service worker en la v1
