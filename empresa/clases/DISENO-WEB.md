# Diseño web para Godines · cómo le gustan las cosas a Carlos

> Me lo encargó él por nombre: *«Sylcred dale clases de diseño web a godines de cómo me gustan
> las cosas etc»*. Esto no es un curso de diseño —hay mejores y no los escribí yo—. Es lo que
> aprendí trabajando con Carlos, lo que le he visto rechazar, y **cómo comprobar cada cosa en
> vez de opinarla**.
>
> Casi todo lo de aquí me lo corrigió él primero. Lo digo porque importa: no es teoría, es
> historial.

---

## Antes de las reglas: una sola idea

**Carlos ve la pantalla, no el código.** Manda capturas y pregunta *«¿qué le pasó a mi pasto?»*.
Dice *«en computadora se ve feo»*. Tiró tres proyectos con *«demasiado verde y feo»*. Ninguna de
esas frases se contesta leyendo CSS.

De ahí sale la única regla que sostiene a las demás:

> **Una página no está bien porque el código esté bien. Está bien cuando se mide en una pantalla
> y sale bien.**

Y por eso este archivo viene con un instrumento, no sólo con consejos:

```bash
node build.mjs
(cd dist && python3 -m http.server 8123 &)
node empresa/clases/revisar.mjs http://127.0.0.1:8123/sitio/
```

Mide en el iPhone de Carlos (390px) y en una laptop (1366px), y saca 🔴 lo que hay que arreglar
y 🟡 lo que hay que mirar. **Lo que no sabe hacer lo dice él mismo al terminar**, y esa línea es
parte de la clase.

---

## Clase 1 · El teléfono no es «también»: es el sitio

Carlos trabaja casi siempre desde el iPhone. Lo que se ve mal ahí, se ve mal y punto.

**Lo que ya nos costó:** Ligas Mazi. El diagnóstico textual está en `CLAUDE.md` §11 —
*«se diseñó sólo para teléfono y en escritorio sólo se centró»*. Queda una tarjeta con forma de
celular flotando en negro y los campos estirados a 1100px. **No le falta pulido: le falta un
layout.** Son dos diseños, no uno escalado.

**Cómo se comprueba:** las dos anchuras, siempre. El medidor las corre juntas a propósito.

### 1.1 · La etiqueta que decide todo

```html
<meta name="viewport" content="width=device-width, initial-scale=1">
```

Sin ella el teléfono **se inventa una pantalla de ~980px y encoge la página entera**: sale un
sitio de escritorio en miniatura, con letra ilegible.

**Y se disfraza.** Lo medí construyendo el medidor: en una pantalla de 390px sin esta etiqueta,
`window.innerWidth` devuelve **1200**. Todo lo demás que midas está medido sobre una pantalla que
no existe. Por eso esta regla va **primera y en rojo**.

> **Y de aquí sale la trampa más cara de este archivo:** `window.innerWidth` **no es el ancho de
> la página** en un teléfono. Es el ancho visual después del encogido. El ancho real es
> `document.documentElement.clientWidth`. Yo escribí el medidor con el primero y me dijo «no
> desborda» de una caja de 1200px en una pantalla de 390. **En escritorio los dos números
> coinciden**, así que probándolo ahí nunca lo habría visto.

### 1.1-bis · El doctype, que es la regla sin síntoma

```html
<!doctype html>
```

Sin él, el navegador entra en **modo quirks**: usa el modelo de caja viejo —el ancho incluye
padding y borde— y calcula distinto las alturas en porcentaje.

**Y esta clase la escribí encontrando el defecto en casa.** Al medir para el punto anterior salió
que `explorador/` y la central (`index.html`) llevaban **desde que nacieron** sin doctype, en
quirks. Les puse el doctype, medí antes y después, y **no cambió ni una medida**: mismas alturas,
mismas cajas, mismas anchuras. O sea que **no había nada que ver**. Se veían perfectas, y eran una
trampa esperando al siguiente que tocara el CSS.

Por eso sale 🔴 aunque la página se vea bien. Es el ejemplo más limpio de la Clase 8.

### 1.2 · 44 píxeles

Todo lo que se toca mide **44×44 como mínimo**. No es gusto: abajo de eso el dedo falla y la
gente cree que la app está rota.

**Y no vale el padding que no crece la caja.** Se mide lo pintado, porque el dedo también.

**Medido hoy en lo nuestro, para que se vea que no estoy predicando:**

| Página | Hallazgo real |
|---|---|
| La Sala | `#bMas` mide **205×24** y `#bDemo` **134×14** en laptop — 🔴, y son míos |
| Reportes | `a.marca` mide **109×29** — 🔴 |
| El taller del sitio | 21 teclas de **39×39** — 🟡 **y está bien** (ver abajo) |

**Las teclas del taller son la clase de verdad.** Diez teclas de 44px son 440px y la pantalla
tiene 390: es imposible, y forzarlo rompería el teclado. Por eso salen 🟡 y no 🔴 — **una regla
que no admite excepciones deliberadas es una regla que se acaba apagando entera.** Lo que no se
vale es que la excepción sea un accidente que nadie notó.

### 1.3 · 16px en lo que se escribe

Un `input` con letra de 15px hace que **Safari en iOS acerque la página sola** al enfocarlo. Se
lee como un defecto de la app. Hoy le pasa a `#buscar` del explorador: mide 15px. Un pixel.

---

## Clase 2 · Los colores de la casa

```
vacío      #100A18      el fondo, casi negro con violeta adentro
superficie #1E1428      lo que se levanta del fondo
violeta    #AC27FF      el acento. UNO
hueso      #E9E4E4      el texto
```

**Un acento, no tres.** El violeta vale porque es el único que grita. Dos acentos no gritan el
doble: se anulan.

**Y la regla que Carlos aplicó él mismo:** *«demasiado verde y feo»* mató a El Pacto Roto para el
portafolio. No fue que el verde estuviera mal medido — es que no era de la casa.

El medidor **cuenta** colores, no los prohíbe: muchos «fuera de paleta» son transparencias del
mismo violeta. El dato útil es si son seis o si son cuarenta. **Arriba de ~24 normalmente no hay
paleta: hay accidentes.**

---

## Clase 3 · Nada de fotos de gente sonriendo con laptops

Está en `CLAUDE.md` §7 con esas palabras. Y su versión general, que es una regla del oficio:

**El relleno se busca real con licencia abierta; lo único de la casa se compone.** Met, Wikimedia,
OpenGameArt, Kenney, itch.io — y crédito en `CREDITOS.md`, que no es cortesía: es lo único que
piden a cambio.

**El logo NUNCA lo dibuja un modelo de imagen.** Reconstruir la paloma costó veinte rondas y lo
que funcionó fue *vectorizar*, no generar: un modelo no repite dos veces la misma paloma ni acierta
el violeta medido, **y una marca que cambia no es una marca**. Lo que sí se genera es una placa de
fondo, y encima se compone el logo real (`marca/render.mjs`).

---

## Clase 4 · Texto corto por diseño

Una línea por sección en el sitio. Es regla escrita (`sitio/PLAN.md` §4).

**Y la voz es de Carlos, no nuestra.** Escribió las quince frases del sitio en una tarde y tiró
completas las tres que yo había propuesto — con razón: las tres eran auto-descriptivas. Lo que
falta en la casa es la herramienta para escribir, **no la voz**.

Dos cosas que él mató, y por qué valen como lección:

- *«No lo hacemos en corto, lo hacemos a la larga»* → **«dice que nos tardamos»**. La frase decía
  lo contrario de lo que hacemos. En una portada eso es un autogol.
- Listar tecnologías en los servicios. Al cliente no le importa con qué; le importa qué resuelve.

**Nunca le corrijas la ortografía.** Escribe rápido, con errores de dedo y de dictado. Se entiende
y ya.

---

## Clase 5 · Movimiento: el scroll es una perilla, no un secuestro

Son dos cosas distintas y confundirlas ya me costó escribir mal un plan:

| | Qué es | ¿Va? |
|---|---|---|
| **Guiada por scroll** | el visitante manda; lo que ve responde a dónde está, y si suelta se queda ahí | ✅ es lo que pidió |
| **Scroll secuestrado** | la página se apodera y te arrastra por una secuencia a su ritmo | ❌ no va |

Y siempre: **respetar `prefers-reduced-motion`**. Hay gente a la que el movimiento le marea de
verdad.

---

## Clase 6 · Lo que no se ve leyendo

Estas cinco no se cazan revisando código. Las mide `revisar.mjs` porque a mí se me pasaron todas
alguna vez:

1. **La página se recorre de lado.** El defecto que más rápido se nota en teléfono.
2. **Un botón parte su nombre en dos renglones.** Es un botón que no cupo.
3. **Texto que se derrama de su caja** con el desbordamiento oculto: se lee cortado a media
   palabra.
4. **Dos elementos con el mismo `id`.** Rompe `getElementById`, las etiquetas de formulario y los
   saltos de accesibilidad — y **no se ve de ninguna manera**.
5. **Un error de JavaScript.** Deja media página sin pintar, y entonces todo lo demás que midas es
   mentira. Va primero y en rojo por eso.
6. **El modo quirks.** Ver 1.1-bis: no tiene síntoma ninguno.
7. **El contraste insuficiente.** Quien lo escribió lo ve bien en su pantalla; se mide o no
   se sabe.

> **El ejemplo que mejor lo enseña es mío y es de esta misma semana.** El botón de avisos de La
> Sala llevaba tiempo en producción sin repintarse ni dar confirmación: parecía muerto. No lo
> estaba — encendía los avisos y **luego** reventaba, porque `letrero()` vivía dentro de otra
> función y desde ahí no existía. Un error que ocurre *después* del trabajo útil es el peor de
> todos: lo que se ve es «no pasó nada» y lo que pasó es «todo menos avisarte». **Lo cazó un
> navegador escuchando `pageerror`. Leyendo, no.**

---

## Clase 7 · La accesibilidad no es un extra, y casi toda es gratis

Cuatro que cubren el 90% y cuestan casi nada:

- **`<button>` para lo que se toca.** Un `div` con un clic encima no se alcanza con teclado, no se
  activa con Enter y el lector no lo anuncia. Quitarle el borde a un botón cuesta menos que
  reponer a mano todo lo que trae.
- **No quites el foco.** Si el contorno del navegador te estorba, sustitúyelo con
  `:focus-visible` — que aparece con teclado y no con ratón, que era la queja original.
- **El contraste, que es la más barata y la que más se rompe sola.** AA pide **4.5:1** para
  texto normal y **3:1** para texto grande (≥24px, o ≥18.66px en negritas). Se rompe el día que
  alguien «suaviza» un gris, y nadie lo nota porque quien lo suavizó lo ve bien en su pantalla.

  **Esta clase no es mía: me la señaló Godines** como hueco de mi propio medidor, y tenía razón —
  recogía los colores y nunca calculaba la razón. Ya la mide. Y me pasó la trampa antes de que me
  la comiera: **hay que componer el alfa de los fondos.** Tomar el primer fondo no transparente
  que aparece subiendo por los padres lee `rgba(255,255,255,.16)` como blanco puro y canta 1:1
  sobre un texto que está a 5.7:1. Un medidor que inventa un defecto te hace romper una página
  sana, y eso cuesta lo mismo que uno que tapa un defecto de verdad.

  **Y midiéndolo salió algo de la casa:** con el violeta `#AC27FF` de fondo, **ninguna tinta
  oscura llega a 4.5:1** — ni el negro puro, que se queda en 4.49. El botón de WhatsApp del sitio
  está a **4.17:1**. Con texto blanco da 4.68 y pasa. Comprobado a mano contra la fórmula, no sólo
  con el medidor.
- **`alt` en las imágenes.** Vacío si es decorativa, **a propósito**. Lo que se caza es la que no
  dice nada de ninguna forma.
- **Declara el idioma** (`<html lang="es-MX">`). Sin eso el lector pronuncia el español con acento
  inglés y no se entiende. **Lo medí mientras escribía esta clase y nos faltaba en dos páginas:**
  el explorador y la central. Y no se caza buscando `<html` en el archivo — en HTML5 la etiqueta
  se puede omitir y el navegador la crea sola, vacía, así que no aparece ni como error ni como
  acierto: no aparece. Se mira `document.documentElement.lang`, que es lo que hace el medidor.

---

## Clase 8 · La que de verdad quiero que se te quede

Todo lo de arriba se puede resumir en una frase que llevo seis apariciones cazando esta semana:

> **Casi siempre el defecto es algo que informa un estado y está en otro.**

Un cuarto que dice que está lleno y está vacío. Un despliegue verde que sirve otro sitio. Una
prueba verde que sostiene el defecto que debía cazar. Un archivo limpio encima de una historia
sucia. Un botón que dice que no hizo nada y lo hizo todo. **Y —el que más duele— un medidor mal
escrito que dice «todo bien» sobre una página rota:** me pasó construyendo el de este archivo.

Ninguno se ve leyendo. Todos se ven midiendo.

**Y hay una segunda mitad que yo no tenía apuntada, y me la puso Godines:** el error también va
al revés. **Un medidor que dice «esto está roto» sobre algo sano cuesta lo mismo que uno que dice
«todo bien» sobre algo roto** — y encima te hace romperlo. Me pasó tres veces montando el
contraste: acusé texto que estaba en `opacity: 0` esperando su turno, letras huecas de contorno
que no tienen relleno que medir, y el logotipo entero **a media animación de entrada** (opacidad
0.708), que asentado cumple. Veintiún «defectos» que eran un reloj mal puesto.

Por eso el medidor ahora espera a que la página se asiente, y cuando aun así algo sigue
moviéndose **lo reporta en 🟡 diciendo que lo midió a media animación**, en vez de acusarlo.

**Entonces, antes de decir «ya quedó»:**

```bash
node empresa/clases/revisar.mjs <tu url>          # los defectos medibles
node empresa/clases/pruebas-revisar.mjs           # que el medidor mida (32 pruebas)
```

Y después **mira la pantalla** — skill `agent-browser`. El medidor es el piso. Nunca supo, ni va a
saber, si algo se ve bien.

---

## Lo que este archivo NO te enseña, dicho para que no te confíes

No enseña jerarquía, ritmo, escala tipográfica ni composición. Eso está en la skill
`frontend-design` y en gente que sabe más que yo. Esto es **el gusto de Carlos y cómo comprobarlo**,
que es otra cosa y es la que se cobra aquí.

Y una advertencia de las que él mismo me dio: **quiere criterio, no dogma.** Ya me corrigió tres
reglas por rígidas —lo del arte generado, lo de React, lo del HTML autónomo—. Si una regla de aquí
te estorba para resolver algo de verdad, dilo y discútelo. **La que no se discute es la de medir
antes de presumir.**
