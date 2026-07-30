# El Sitio · plan de construcción

**Fecha:** 30 de julio de 2026
**Cómo salió:** Carlos convocó al **consejo entero** (`multi-agent` + `four-judges`) y además pidió
mi criterio aparte. El acta completa —quién dijo qué y qué se descartó— está en
[`.claude/veredictos/2026-07-30-el-sitio.md`](../.claude/veredictos/2026-07-30-el-sitio.md).
Este archivo es sólo **lo decidido**, para construir.

**Reemplaza y afina** la lista de secciones de `CLAUDE.md` §7, que se escribió antes de que
existieran el logo vectorizado, la fábrica de tipografías y la fuente de la casa.

---

## 0 · La tesis, en una línea

> **El sitio no es un folleto que enseña herramientas. El sitio ES una herramienta.**

`CLAUDE.md` §7 decía *"el sitio es la demo"*. Es correcto pero se queda corto, porque una demo se
mira y una herramienta **se usa**. Y usar es lo que retiene, lo que convence a un comprador técnico
y —esto es lo que lo vuelve nuestro y no de nadie más— lo que dice el lema de la empresa:
*si no existe la herramienta, se construye la herramienta.*

Un sitio de portafolio con animaciones bonitas lo tiene cualquiera. **Un sitio donde el visitante
mueve una perilla y la tipografía de la casa se redibuja en vivo, no.**

---

## 1 · Qué incluye

Cinco secciones en la página principal, y las piezas pesadas en **rutas aparte** que sólo cargan
si alguien las pide. Eso no es purismo: es que nadie que sólo quiere el teléfono debe descargar un
juego de megabytes.

### La página principal

| # | Sección | Qué hace | Qué resuelve |
|---|---|---|---|
| 1 | **El display** (portada) | Paloma + logotipo armándose segmento por segmento, el lema, una frase, y el botón de WhatsApp. Un reloj con la hora **real** en la tipografía de la casa | Que en dos segundos se vea vivo y hecho por alguien |
| 2 | **Qué hacemos** | Los seis servicios, una línea cada uno. Sin nombres de tecnología | Que se entienda qué se compra |
| 3 | **El taller** | La fábrica de tipografías **corriendo en la página**. El visitante cambia esqueleto, pincel y ochavo y las letras se redibujan | La prueba de capacidad. Es la sección que nadie más puede copiar |
| 4 | **Trabajo** | Ligas Mazi por su nombre · la plataforma de gestión sin marca ajena. **Torre Infinita queda fuera** (ver §7-ter) | La prueba comercial |
| 5 | **Cómo trabajamos · Contacto** | El modelo de comisión en cristiano, WhatsApp, correo, y **"trabaja con nosotros"** para colaboradores | Cerrar. Y captar gente, que es el agujero que más sangra |

**La sección 5 trae algo que §7 no tenía: la entrada para colaboradores.** La puso Sofía y tiene
razón — el modelo de comisión necesita gente, y hoy no hay una sola manera de que alguien nos
busque para trabajar.

### Las rutas aparte

| Ruta | Qué es | Por qué no va en la principal |
|---|---|---|
| `/taller` | La fábrica completa: 15 alfabetos, 13 pinceles, 6 remates, el juego de 107 caracteres, descarga del SVG | Pesa y es para quien se clavó |
| ~~`/juega`~~ | ❌ **Eliminada.** Decisión de Carlos, ver §7-ter | |
| `/marca` | Las hojas que ya existen (`marca/mazi.html`, `tipos.html`) limpiadas | Es material de venta, no de portada |

**Candidata, sin prometer:** `/vectorizar` — subir un PNG y bajar un SVG, gratis, en el navegador.
Sería el mejor imán que podríamos tener, porque es útil de verdad y deja a la vista lo que sabemos
hacer. **Hay que confirmar antes** que `imagetracerjs` corre en el navegador sin la parte de Node;
si no corre, no se anuncia.

---

## 2 · El acomodo · dónde va qué

Teléfono en vertical primero. Siempre.

```
┌─────────────────────────────┐
│ ▌paloma   GRUPO MAZI    ⌾ │ ← barra fija, delgada. El ⌾ es WhatsApp
├─────────────────────────────┤
│                             │
│      ▓▓▓▓  ▓▓▓▓  (paloma)   │
│      GRUPO MAZI             │ ← se arma segmento por segmento
│                             │
│   No lo hacemos en corto,   │
│   lo hacemos a la larga.    │
│                             │
│   ┌───────────────────┐     │
│   │  Hablar por WhatsApp    │ ← el único botón de la primera pantalla
│   └───────────────────┘     │
│                             │
│              10:23  ← hora real, en nuestra tipografía
├─────────────────────────────┤
│  QUÉ HACEMOS                │
│  Web · una línea            │
│  Software · una línea       │
│  … los seis                 │
├─────────────────────────────┤
│  EL TALLER                  │
│  [ GRUPO MAZI ]  ← se redibuja
│  esqueleto ◄ ● ►            │
│  pincel    ◄ ● ►            │
│  ochavo    ──●──            │
│  → ver la fábrica completa  │
├─────────────────────────────┤
│  TRABAJO                    │
│  Ligas Mazi                 │
│  Plataforma de gestión      │
│  Torre Infinita → jugar     │
├─────────────────────────────┤
│  CÓMO TRABAJAMOS            │
│  … comisión en cristiano    │
│  ⌾ WhatsApp   ✉ correo      │
│  ¿Quieres trabajar con      │
│  nosotros? →                │
└─────────────────────────────┘
```

**Las reglas de acomodo, que no se negocian:**

1. **El botón de WhatsApp se ve sin hacer scroll.** Y vuelve a aparecer al final de cada sección
   larga y al final de cada ruta aparte. Iván: *"un visitante que se clavó en el taller y se fue
   sin escribir es una pérdida, no un éxito."*
2. **La primera pantalla tiene que sobrevivir a ser una captura.** La gente va a llegar de
   Instagram y de WhatsApp, y va a reenviar un screenshot. Ese screenshot tiene que decir quién
   somos, qué hacemos y cómo contactarnos, sin scroll.
3. **Una sola cosa por pantalla.** Nada de dos columnas en teléfono.
4. **Objetivos táctiles de 44 px mínimo.** Ya nos mordió en Ligas Mazi (`CLAUDE.md` §11).

---

## 3 · La animación de apertura

**La autoprueba del display.** Un reloj de LED, al encender, prende **todos** los segmentos un
instante y luego muestra la hora. Eso es un gesto real de la máquina, no un efecto inventado — y
resulta que nuestra tipografía *es* un display de segmentos.

Cómo va:

```
0.00 s  negro
0.15 s  TODOS los segmentos del logotipo prendidos, en violeta tenue   ← la autoprueba
0.45 s  se apagan los que no van; queda GRUPO MAZI
0.70 s  entra la paloma (escala corta, sin rebote)
0.95 s  entra la frase
1.20 s  entra el botón
1.20 s  el reloj arranca a contar la hora real
```

**Por qué ésta y no otra:**

- **Es nuestra.** Sale de la tipografía que construimos hoy, que sale de la foto que mandó Carlos.
  No hay manera de que se vea prestada.
- **Dura 1.2 s.** Una apertura que tarda tres segundos es un peaje, no un regalo.
- **No bloquea nada.** El contenido está en el HTML desde el primer byte; la animación sólo revela.
  Si el JavaScript truena, la portada se ve completa.
- **`prefers-reduced-motion` es trivial:** se salta a 1.20 s. Sin ramas raras.
- **Pesa casi nada:** la fuente (9 KB) + CSS. Cero librerías.
- **Y se repite gratis:** el mismo gesto sirve para revelar cada sección al entrar en pantalla, con
  un cuarto de la intensidad. Un solo idioma de movimiento en todo el sitio.

**Lo que NO va:** pantalla de carga con porcentaje, logo girando, cortina que tapa el contenido,
scroll secuestrado en la portada, ni video de fondo.

---

## 4 · El estilo

**Un instrumento, no un cartel.** La referencia no es una agencia: es un tablero — un reloj de
estación, una consola, un medidor. Eso ya está en la tipografía, así que el resto del sitio nada
más tiene que no contradecirla.

| Decisión | Qué es | Por qué |
|---|---|---|
| **Oscuro por defecto** | Fondo casi negro con tinte violeta | Un display se lee sobre negro. Y es lo que ya dice `CLAUDE.md` §7 |
| **Tipografía de la casa en todo lo grande** | Mazi en titulares, cifras, navegación y etiquetas | Es el argumento de venta más barato que tenemos: la marca *es* la tipografía |
| **Una sans del sistema en el texto corrido** | `system-ui` para párrafos | Mazi es de rótulo. Un párrafo largo en tipografía de display se lee mal, y decir esto es más honesto que forzarla |
| **Líneas de 1 px** | Separadores finos, sin sombras ni degradados | Cuesta cero y se ve caro |
| **Rejilla visible pero discreta** | Todo alineado a una columna clara, con márgenes generosos | Un instrumento está medido |
| **Números grandes** | La hora, los años, las cifras | Nuestra tipografía es mejor en dígitos que en prosa. Se juega donde somos fuertes |
| **Cero adorno** | Ni partículas, ni glass, ni gradientes de moda, ni blobs | Todo eso envejece en un año y grita plantilla |

**Texto corto por diseño, no por flojera.** `CLAUDE.md` §11 dice con todas sus letras que el hueco
de capacidad más grande de la casa es **voz de marca y copywriting**. Un sitio bonito con textos
flojos se lee barato. Entonces: **una línea por sección**. Corto es donde somos fuertes; largo es
donde somos débiles. Esto es una decisión de diseño tomada desde un diagnóstico honesto, no un
atajo.

---

## 5 · La paleta

Se confirma la de `CLAUDE.md` §7 y se le agrega **una sola cosa**: el rojo de fósforo, y sólo
dentro del display.

| Papel | Color | Dónde |
|---|---|---|
| **Vacío** | `#100A18` | El fondo de todo |
| **Superficie** | `#1E1428` | Tarjetas, recuadros, la barra |
| **Línea** | `#2A2036` | Separadores, bordes |
| **Hueso** | `#E9E4E4` | Todo el texto |
| **Apagado** | `#8B8296` | Texto secundario, etiquetas |
| **Violeta** | `#AC27FF` | **El acento de la marca.** Un solo uso a la vez |
| **Fósforo** | `#E8232A` | **Sólo dentro del display**: el reloj, los segmentos encendidos |

**El fósforo no es un segundo color de marca — es un material.** Aparece únicamente donde el sitio
está imitando una pantalla de LED, igual que en la foto que mandó Carlos. Si se sale de ahí y
empieza a aparecer en botones o títulos, la marca deja de tener un acento y pasa a tener dos, que
es lo mismo que no tener ninguno. **Esa frontera hay que respetarla.**

Todo en variables CSS desde el primer archivo, porque Carlos va a querer cambiar algo y tiene que
ser una línea.

---

## 6 · Qué NO va en la página

Esto es la mitad del trabajo.

**Mentiras y medias verdades**
- ⛔ **ICAMP.** Ni el nombre, ni el logo, ni el video con su marca. No son clientes (`CLAUDE.md` §7).
- ⛔ **"Clientes" que no son clientes.** Ninguna fila de logos, ninguna insignia de "confían en".
- ⛔ **Testimonios.** No existen. Inventarlos es lo que más rápido quema a una empresa nueva.
- ⛔ **"Nuestro equipo"** con caras. El equipo es Carlos y sus herramientas. Decir otra cosa es
  mentir, y además se cae en la primera llamada.
- ⛔ **Cifras sin respaldo:** "+50 proyectos", "98% de satisfacción". Nada de eso es cierto.

**Cosas que se ven mal o envejecen**
- ⛔ Fotos de stock de gente sonriendo con laptops (ya estaba en §7).
- ⛔ Carrusel automático. Nadie espera al segundo cuadro.
- ⛔ Video de fondo con audio. Ni sin audio, en teléfono.
- ⛔ Scroll secuestrado, desplazamiento horizontal, parallax de tres capas.
- ⛔ Cursor personalizado. En teléfono no existe y en escritorio estorba.
- ⛔ Modo claro a medias. O se hace bien o se queda oscuro. **Por ahora: sólo oscuro.**

**Cosas que nos abren el flanco**
- ⛔ **Precios.** Se cotiza, no se lista (§7 · proteger la propiedad).
- ⛔ **La lista de tecnologías.** Nadie compra "React + Supabase" y decirlo nos vuelve intercambiables.
- ⛔ **Ligas al repositorio.** El sitio es justo lo que va a traer ese tráfico (§7).
- ⛔ **Un blog.** Nadie lo va a escribir. Una sección vacía con fecha de hace ocho meses hace más
  daño que no tenerla.
- ⛔ **Formulario de contacto largo.** Nombre y mensaje, o de plano nada más el botón de WhatsApp.
  Y ojo: **GitHub Pages no tiene servidor**, así que un formulario de verdad necesita un externo.
  Eso va a `PENDIENTES.md`, no al sitio de una.

---

## 6-bis · El menú de contexto propio · decisión de Carlos

Carlos pidió quitar el menú de contexto del navegador *"porque es más aesthetic y no se salen de la
experiencia"*. **Se hace, y se hace bien** — hay una versión de esto que sí suma:

**No se bloquea nada: se REEMPLAZA.** El clic derecho abre **nuestro** menú, en la tipografía y los
colores de la casa, con cosas que sirven:

```
┌──────────────────────────┐
│  Copiar liga             │
│  Compartir por WhatsApp  │
│  ─────────────────────   │
│  Ver la marca            │
│  Hablar con nosotros     │
└──────────────────────────┘
```

Eso es lo que lo vuelve estética y no fricción: el visitante no pierde una función, gana un atajo —
y el más útil de todos es "compartir por WhatsApp", que es justo por donde va a llegar la gente.

**Lo que NO se toca, y esto no es negociable porque rompe el sitio:**
- La **selección de texto** se queda. Bloquearla impide copiar el teléfono y el correo.
- Los **atajos de teclado** se quedan. `Ctrl+C`, `Ctrl+F`, `Tab`.
- El **lector de pantalla** se queda funcionando.
- En **teléfono no aplica**: no hay clic derecho. Ahí la pulsación larga sigue siendo la del sistema.

**Y lo digo una vez y no vuelvo a insistir:** esto es estética, no protección. Quien quiera el código
lo tiene con `Ctrl+U`. Lo que protege de verdad ya está dicho en `CLAUDE.md` §7: la ventaja no está
en el código, está en la velocidad y el criterio.

---

## 6-ter · Animación por scroll — corrección al plan

**Yo escribí "nada de scroll secuestrado" y Carlos pidió animaciones que sigan el scroll. No se
contradicen, y mi redacción fue floja. Son dos cosas distintas:**

| | Qué es | Veredicto |
|---|---|---|
| **Scroll secuestrado** | La página se apodera del scroll: te obliga a pasar por una secuencia a su ritmo, un gesto salta una pantalla completa, no puedes irte | ⛔ **No** |
| **Animación guiada por scroll** | El scroll es una **perilla**: el visitante manda, y lo que ve responde a dónde está. Suelta la perilla y se queda ahí | ✅ **Sí, y es lo que queremos** |

La segunda es exactamente lo que pidió, y hay skill para eso: **`scroll-cinema`** (secuencia de
fotogramas en canvas, la técnica de Apple) y **`web-motion`** para decidir con qué se anima.

### Las tres piezas guiadas por scroll

| Pieza | Qué hace el scroll | Dónde |
|---|---|---|
| **La autoprueba, extendida** | Los segmentos del logotipo se encienden conforme bajas los primeros 400 px. Al abrir corre sola en 1.2 s; al volver a subir, la manejas tú | Portada |
| **El barrido del taller** | Bajando, la misma palabra recorre los 15 alfabetos históricos: sello Qin → kabuki → gótica del XIII → Mazi. **Ésta es la pieza fuerte del sitio** | El taller |
| **Los números que cuentan** | 9111 pisos · 107 caracteres · 15 alfabetos. Cuentan al entrar en pantalla, una vez | Trabajo |

### Las reglas, para que sea de alto nivel y no un mareo

1. **El scroll nunca se secuestra.** El visitante puede irse en cualquier momento y llega al final
   con un gesto largo.
2. **Todo va amarrado a la posición, no al tiempo.** Si sube, se deshace. Eso es lo que se siente
   caro: que responde a la mano.
3. **`prefers-reduced-motion` recibe el estado final**, no una versión aguada.
4. **Presupuesto:** el barrido del taller se dibuja en canvas con `tipos.mjs`, o sea **cero
   fotogramas que descargar** — la animación se *calcula*. Eso es la ventaja de tener la fábrica: lo
   que en otro sitio serían 300 imágenes, aquí son 9 KB de fuente y unas líneas de JavaScript.
5. **Nada de librería de animación.** `IntersectionObserver` + `requestAnimationFrame` + CSS.

---

## 7 · Cómo destacar y ser diferente

La pregunta correcta no es "cómo nos vemos mejor" sino **"qué podemos hacer que el de al lado no
pueda"**. Hay cuatro cosas, y todas ya existen:

1. **La fábrica de tipografías en vivo.** `tipos.mjs` es JavaScript sin una sola dependencia: corre
   en el navegador tal cual. El visitante mueve tres perillas y ve 15 alfabetos históricos —
   escritura de sello de la dinastía Qin, cartel de kabuki, gótica del siglo XIII— redibujarse en
   tiempo real. **Ninguna agencia de la ciudad tiene esto**, y no porque no se les ocurra: porque
   hay que haberlo construido.
2. **El reloj.** La hora real, corriendo, en una tipografía que es un display de segmentos porque
   nació de la foto de un reloj. Cuesta veinte líneas y dice "esto está vivo y es de alguien" antes
   de que el visitante lea una palabra.
3. **Un juego jugable.** Torre Infinita, con el dedo, en el teléfono. Eso no lo empotra un sitio
   hecho con plantilla.
4. **Que la tipografía sea nuestra.** No es decir "diseñamos identidades": es que el sitio está
   escrito con una letra que no existe en ningún otro lado. Es la prueba y el producto a la vez.

**La regla que amarra todo:** cada sección tiene que **hacer** algo. Si una sección sólo cuenta,
sobra o se convierte en una línea dentro de otra.

---

## 7-ter · Torre Infinita y el arte de Pokémon

Carlos preguntó qué tan legal es. **La respuesta corta: no lo es, y en el sitio de la empresa es
peor que en un proyecto personal.** No soy abogado, pero los hechos aquí no son ambiguos.

**Lo que dice la ley:** los sprites, tilesets, música y nombres de Pokémon son de Nintendo, Game
Freak y The Pokémon Company. Usarlos sin permiso es infracción de derechos de autor. No hay
excepción de "es un fan game", ni de "es gratis", ni de "doy crédito".

**Lo que dice la práctica, que importa más:** Nintendo es de las empresas más agresivas del mundo en
esto. Han tirado **379 juegos de fans de un solo golpe** en Game Jolt, mataron **Pokémon
Essentials** —la herramienta con la que se hacen esos juegos— y en los últimos años están mandando
avisos **directo a GitHub**. Y el detalle que nos pega en el hueso: en el caso de Game Jolt el
argumento fue que **no sólo usaban su propiedad sin permiso, sino que LUCRABAN con ella.**

**Por qué en nuestro sitio es peor:**

1. **Contexto comercial.** Un sitio que vende servicios no es un proyecto de recámara. Eso mata
   cualquier defensa y sube muchísimo la probabilidad de que alguien actúe.
2. **El repo es público y está en GitHub**, que es justo donde están mandando los avisos. Y el sitio
   es lo que va a traer el tráfico que lo encuentre — eso ya estaba anotado en `CLAUDE.md` §7 como
   disparador.
3. **Y ésta es la que de verdad importa, y no es legal sino de marca:** Grupo Mazi vende
   *"todo lo que la empresa use lo construimos nosotros"*. Poner como pieza estrella del portafolio
   un juego construido sobre arte de otro **se contradice con lo único que vendemos.** Un cliente
   que lo note no piensa "qué buen juego": piensa "¿y mi proyecto también lo van a armar con cosas
   de alguien más?"

### Lo que NO se hace: tirar Torre Infinita

El objetivo era *"probar que llegamos hasta donde haga falta"*, y ese objetivo sobrevive completo.
**Lo único que cambia son las imágenes.** El código, las mecánicas, los 9111 pisos, el generador de
mazmorras, el arreglo del softlock — todo eso es nuestro y es lo que impresiona.

**El revestimiento:**
- Arte real con licencia abierta, que es la regla de la casa (`CLAUDE.md` §3, regla 1): **OpenGameArt,
  Kenney, LPC, itch.io.** Ya tenemos assets LPC bajados para Hoja de Romero.
- Las criaturas dejan de ser Pokémon y pasan a ser **nuestras**. Eso además vuelve la pieza **más**
  fuerte, no menos: "roguelike de 9111 pisos con bestiario propio" vende mejor que "fan game".
- Créditos y licencias en un `CREDITOS.md`, como ya se hace en el resto.

### Mientras no esté revestido

- **`/juega` no se publica.** El Bloque 5 queda bloqueado.
- En la sección Trabajo, Torre Infinita **se menciona sin capturas jugables** o no se menciona.
- **Y aparte del sitio:** el repo público con arte de Pokémon es exposición **hoy**, no cuando
  publiquemos. Eso sube de prioridad y ya no es "cuando haya visitas".

**Lo que puedo hacer en cuanto me digas:** enganchar el repo `torre-infinita` y sacarte el
**inventario exacto** — cuántos sprites hay, cuáles son de Nintendo, cuáles ya son nuestros, y qué
cuesta el reemplazo en horas. Sin ese número la decisión se toma a ciegas.

---

## 8 · Retención sin cansar

Se retiene por **hacer**, no por mirar. Y se cansa por **esperar**.

| Sí | No |
|---|---|
| Perillas que responden al instante | Animaciones de entrada de tres segundos |
| Piezas chicas y autocontenidas | Una experiencia larga que hay que aguantar completa |
| Que el visitante decida cuándo profundizar (rutas aparte) | Meterle el juego de tres megas sin preguntar |
| Un solo idioma de movimiento en todo el sitio | Cinco efectos distintos |
| Salida a contacto en cada pieza | Callejones sin salida |

**Las tres reglas duras:**

1. **Nada dura más de 1.2 s.** Ninguna transición, ningún revelado.
2. **Nada se mueve dos veces.** Una sección se revela al entrar en pantalla **una** vez y se queda
   quieta. Un elemento que se re-anima cada vez que pasas por encima es lo que agota.
3. **Toda pieza interactiva tiene fondo.** Las perillas del taller deben poder tocarse veinte veces
   y seguir dando algo nuevo. Una demo que se agota en dos clics decepciona más que no estar.

**Y el número honesto:** la meta no es que se queden diez minutos. Es que **escriban**. Un visitante
que se clava cuatro minutos y se va sin mandar mensaje es una derrota — bonita, pero derrota.

---

## 9 · Otras ideas

Ordenadas por lo que valen contra lo que cuestan. Las primeras tres son las que yo construiría.

| Idea | Qué hace | Costo |
|---|---|---|
| **La hora en la pestaña** | El `<title>` lleva la hora en vivo: `10:23 · Grupo Mazi`. Quien deje la pestaña abierta lo ve | trivial |
| **Descargar la tipografía** | Un botón en el taller: bajar `mazi.woff2`. Regalar la fuente es la mejor tarjeta de presentación que existe — se instala y queda | trivial |
| **Tu nombre en Mazi** | Escribes tu nombre y lo ves en la tipografía; se puede bajar el SVG. Es el imán más barato y más compartible | bajo |
| **404 como error de display** | Los segmentos parpadeando y `E:404`. Una página que nadie diseña, diseñada | bajo |
| **Firma de correo generada** | Metes tu nombre y sale el HTML para pegar en Gmail. Sirve para los colaboradores desde el día uno | bajo |
| **Cotizador público simplificado** | Alcance, urgencia → un rango. Es la Fase 3 del plan asomando la nariz | medio |
| **Modo claro** | Sólo si se hace completo | medio |
| **Los alfabetos como producto** | Página que vende identidades tipográficas por encargo. El Inversionista le pone **$8–25k MXN** por cliente | medio |

---

## 10 · Pros y contras

### A favor
- **La cara pública tapa el agujero #1** del diagnóstico (`CLAUDE.md` §5): vendemos web y no
  tenemos web.
- **No depende de nadie.** Salvo el video, todo lo del sitio se construye aquí.
- **Ya está casi todo el material:** logo vectorizado, tipografía en `.woff2`, la fábrica, el juego,
  Ligas Mazi funcionando.
- **Es gratis:** GitHub Pages, y los archivos pesan kilobytes.
- **Lo que se construya se revende.** La fábrica de tipografías es capacidad facturable.
- **Le da un lugar a los colaboradores**, que es el agujero que más sangra.

### En contra — dicho completo
- **No hay copy.** Es el hueco de capacidad reconocido en `CLAUDE.md` §11 y el sitio lo va a
  exhibir. *Mitigado por diseño: una línea por sección.*
- **Las herramientas distraen del teléfono.** Es la falla que encontró el Escéptico.
  *Mitigado: salida a contacto en cada pieza.*
- **Tráfico sin capacidad de atender.** Si llegan diez mensajes y Carlos está construyendo el sitio,
  se pierden. *Mitigado: WhatsApp empresarial con respuesta automática, que ya existe.*
- **El sitio va a traer ojos a los repos públicos.** Ya está anotado en §7 con su disparador.
  *Se revisa cuando empiece a haber visitas.*
- **Es una desviación del plan** otra vez: la Fase 2 (Panel Mazi) es la que para el sangrado y
  sigue sin empezar. **Esto es cierto y hay que decirlo, no esconderlo.**
- **Riesgo de que nunca se termine.** Un sitio siempre se puede pulir un día más. *Mitigado: el
  Bloque 1 se publica solo, feo o no.*

---

## 11 · El orden de construcción

**La regla:** ningún bloque espera nada de Carlos hasta el 6. Los cinco primeros se pueden hacer
de corrido.

| Bloque | Qué | Se puede publicar? | Depende de |
|---|---|---|---|
| **1** | El armazón: variables de color, la fuente, la retícula, la barra, teléfono primero. **Portada con la autoprueba + el reloj + contacto** | **Sí. El sitio ya existe** | nada |
| **2** | Qué hacemos · Cómo trabajamos · Trabaja con nosotros | sí | nada |
| **3** | **El taller** — la fábrica de tipografías en vivo | sí | nada |
| **4** | Trabajo — capturas reales de Ligas Mazi con `captura.mjs`, plataforma sin marca ajena | sí | nada |
| ~~**5**~~ | ❌ **Bloque eliminado.** La prueba interactiva la carga el taller | |
| **6** | El video de la plataforma | **no** | ⚠️ **confirmado: trae marca de ICAMP.** Carlos lo va a cambiar |
| **7** | Dominio y medición (Fase 6 del plan) | | Carlos compra dominio **más adelante**; GitHub Pages mientras |

**Por qué el Bloque 1 lleva la portada completa y no sólo el armazón:** porque al final del Bloque 1
ya hay un sitio publicable con nombre, promesa y teléfono. Eso cierra el agujero #1 desde el primer
día, y todo lo demás pasa a ser mejora en vez de requisito.

**Antes del Bloque 1, la cátedra:** cada bloque cierra con `agent-browser` a 390 px y `revision-web`
antes de publicar. No es opcional (`CLAUDE.md` §3, reglas 6 y 7).

---

## 12 · La navegación

**Una página para el argumento, rutas para lo pesado.** Ni todo en una página infinita ni ocho
páginas que nadie recorre.

**La barra** — fija, delgada, 52 px:
- Izquierda: paloma + `GRUPO MAZI` en la tipografía de la casa. Es la liga a la portada.
- Derecha: **un solo botón de WhatsApp.** Nada más.
- En medio, sólo en escritorio: `Taller · Trabajo · Contacto`. En teléfono la barra no lleva menú —
  el sitio es corto y se recorre con el dedo. **Un menú hamburguesa para cinco secciones es
  burocracia.**

**Dentro de la página:** las secciones se enlazan con ancla (`#taller`, `#trabajo`, `#contacto`) para
que se puedan compartir de una en una.

**Las rutas aparte** (`/taller`, `/juega`, `/marca`) siempre traen: la barra, un "← volver" y una
salida a contacto al final. **Ninguna ruta es un callejón sin salida.**

---

## 13 · El diagrama de flujo

Dónde entra la gente, por dónde pasa, qué resuelve cada apartado y a dónde conecta.

```mermaid
flowchart TD
    IG["📱 Instagram · WhatsApp<br/>tarjeta · de boca en boca"] --> POR
    GG["🔎 Buscador"] --> POR

    POR["<b>1 · EL DISPLAY</b> (portada)<br/>autoprueba de segmentos · lema · reloj vivo<br/><i>resuelve: ¿esto es real y de alguien?</i>"]

    POR --> QUE["<b>2 · QUÉ HACEMOS</b><br/>seis servicios, una línea cada uno<br/><i>resuelve: ¿qué le compro?</i>"]
    QUE --> TAL["<b>3 · EL TALLER</b><br/>la fábrica de tipografías en vivo<br/><i>resuelve: ¿saben hacerlo?</i>"]
    TAL --> TRA["<b>4 · TRABAJO</b><br/>Ligas Mazi · plataforma · Torre<br/><i>resuelve: ¿ya lo hicieron antes?</i>"]
    TRA --> COM["<b>5 · CÓMO TRABAJAMOS</b><br/>el modelo de comisión en cristiano<br/><i>resuelve: ¿cómo se paga esto?</i>"]

    COM --> CON["<b>CONTACTO</b><br/>WhatsApp · correo<br/><i>resuelve: cerrar</i>"]
    COM --> COL["<b>TRABAJA CON NOSOTROS</b><br/><i>resuelve: el agujero que más sangra</i>"]

    TAL -.->|"ruta aparte"| RTAL["<b>/taller</b><br/>15 alfabetos · 13 pinceles<br/>107 caracteres · bajar el SVG<br/>bajar la fuente"]
    TRA -.->|"ruta aparte"| RJUE["<b>/juega</b><br/>Torre Infinita, con el dedo"]
    TRA -.->|"ruta aparte"| RMAR["<b>/marca</b><br/>las hojas de la tipografía"]

    POR ==>|"botón fijo, siempre visible"| CON
    RTAL --> CON
    RJUE --> CON
    RMAR --> CON

    E404["<b>404</b><br/>error de display: E:404"] --> POR

    classDef principal fill:#1E1428,stroke:#AC27FF,stroke-width:2px,color:#E9E4E4
    classDef ruta fill:#160F20,stroke:#2A2036,stroke-width:1px,color:#A99FB4
    classDef entra fill:#100A18,stroke:#8B8296,stroke-width:1px,color:#8B8296
    classDef cierra fill:#2A1428,stroke:#E8232A,stroke-width:2px,color:#E9E4E4
    class POR,QUE,TAL,TRA,COM principal
    class RTAL,RJUE,RMAR,E404 ruta
    class IG,GG entra
    class CON,COL cierra
```

**Cómo se lee:**
- **Línea llena** = el recorrido normal, hacia abajo, con el dedo. No hay que hacer clic para avanzar.
- **Línea punteada** = ruta aparte, sólo si el visitante la pide. Carga bajo demanda.
- **Línea gruesa** = el botón de WhatsApp, que está siempre y no depende de dónde ande.
- **Borde rojo** = donde se cierra. Todo camino termina en uno de los dos.

**Lo que el diagrama deja ver de un golpe:** hay **dos salidas** y ambas son válidas. Un visitante
que llega buscando trabajo no es un visitante perdido — es la mitad del problema de la empresa
resuelto por el mismo sitio.

---

## Lo decidido, en tabla

| # | Decisión | De quién salió |
|---|---|---|
| 1 | El sitio **es** una herramienta, no un folleto de herramientas | el Creyente, afinado por el Juez |
| 2 | Cinco secciones en la principal, lo pesado en rutas aparte | Mauro (congelar alcance) + Tomás (peso) |
| 3 | **El taller** es la sección estrella, y va **después** del argumento, no antes | Renata |
| 4 | La apertura es la **autoprueba del display**, 1.2 s, sin bloquear | yo |
| 5 | Fósforo rojo **sólo dentro del display**. Un solo acento de marca: el violeta | el Escéptico |
| 6 | Texto corto **por diseño**, desde el diagnóstico de que no tenemos copy | yo |
| 7 | **Trabaja con nosotros** entra al sitio como sección | Sofía |
| 8 | Salida a contacto en **cada** pieza y **cada** ruta. Ningún callejón | Iván |
| 9 | El Bloque 1 se publica solo, feo o no | Mauro |
| 10 | Nada del sitio espera a Carlos hasta el Bloque 6 | yo |
| 11 | La Fase 2 (Panel Mazi) sigue siendo la que para el sangrado, **y esto es una desviación** | Sofía, y se registra |
