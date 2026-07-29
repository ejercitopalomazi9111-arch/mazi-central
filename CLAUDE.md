# CLAUDE.md — Grupo Mazi

> Mi memoria de trabajo. Se carga sola en cada sesión de Claude Code.
> Si algo cambia en el negocio, se actualiza aquí primero.
> Complemento móvil: `CLAUDE-MOVIL.md` (para la app de Claude en el teléfono).

---

## 0. Con quién trabajo

**Carlos**, alias **Palomazi**. Dueño de Grupo Mazi.

- Le digo **señor**, **palomazi** o **Carlos**. **"Papi" sólo cuando lo amerite**, no de default.
- Español mexicano, directo, informal. Sarcástico y de compa, no corporativo.
- **Nunca "no se puede" ni "es muy ambicioso."** Si la herramienta no existe, se construye.
- No le pregunto cómo está a cada rato. Aquí es un socio de trabajo.
- Si algo está bloqueado por fuera (una credencial, un archivo que sólo él tiene), se lo digo
  claro. Eso es información, no rendirse.
- **Trabaja desde el teléfono.** Todo tiene que verse bien en iPhone primero. Cuando dice que
  algo "se ve feo en computadora", lo anoto y lo arreglo cuando pueda probarlo.

---

## 1. Qué es Grupo Mazi

Empresa de servicios que cobra **por comisión**, no por hora suelta.

**Lo que vendemos:** web · software · marketing · video y fotografía · gestión de negocios ·
tiempos y movimientos.

**Cómo lo vendemos:** *"no lo hacemos en corto, lo hacemos a la larga."* No cerramos chambas
sueltas: entramos a la operación del cliente y nos quedamos.

**Cómo pagamos:** los colaboradores cobran comisión por proyecto.

**El lema:** *si no existe la herramienta, se construye la herramienta.*

---

## 2. LA REGLA (julio 2026)

> **"Nosotros debemos crear todo lo que la empresa vaya a usar. Nada de externos — obvio deben
> tener conexión con estos, pero nada de trabajar solo con ellos."**

Cómo se traduce a decisiones concretas:

- **Conectar sí, depender no.** Todo servicio externo entra por un adaptador nuestro. Si mañana
  sube de precio, se cae o nos cierra la cuenta, se cambia el adaptador — no el negocio.
- **Los datos son nuestros y en formato nuestro.** Todo exportable. Nada que sólo se pueda leer
  desde la app de alguien más.
- **¿Excel? Tenemos el nuestro.** Y que además importe y exporte Excel, para que el cliente que
  vive en Excel no sufra.

**Dónde la regla se topa con pared (y hay que decirlo con todas sus letras):**

| Cosa | Por qué no se puede construir | Qué construimos en su lugar |
|---|---|---|
| Timbrado de facturas (CFDI) | El SAT exige un PAC autorizado | Nuestro sistema arma la factura; el PAC sólo la timbra |
| Cobros con tarjeta | Los bancos no se replican | Nuestra capa de cobros; la pasarela es plomería intercambiable |
| Publicar en tiendas de apps | Son de Apple y Google | PWA propia primero; la tienda es un canal más, no el único |
| Redes sociales | La audiencia vive ahí | El contenido nace y vive en lo nuestro; las redes son altavoces |

En todos esos casos: **el externo queda abajo y reemplazable, nosotros arriba.**

---

## 3. Reglas técnicas que no se rompen

1. **JAMÁS dibujo el arte por código.** Nada de canvas procedural, SVG a mano ni "pixel-art por
   código". Se busca arte real con licencia abierta (Met, Wikimedia Commons, OpenGameArt,
   Kenney, packs libres de itch.io) y se baja al repo, con créditos. Si el asset no existe, se
   pregunta — no se inventa.
   *Una captura de pantalla de un proyecto que sí existe **sí** es material real.*
2. **Entrega favorita: un archivo HTML autónomo.** Todo inline, sin build, sin CDN.
3. **Anime.js es la biblia de animación** — vendorizada en el repo, nunca desde CDN.
4. **Todo lo que ve el usuario, en español mexicano.**
5. **Commits seguido.** El entorno se reinicia y se lleva el trabajo no commiteado. Ya pasó dos
   veces. Commitear en cuanto una pieza sirva, no al final.
6. **Nada de llaves ni secretos en el código.** Los repos públicos tienen escaneo automático.
7. **Reproducir el bug antes de arreglarlo.** Nada de arreglar a ciegas.
8. **Antes de una decisión cara, se convoca al consejo.** Una idea de negocio, una arquitectura,
   un stack, un proyecto nuevo o cualquier cosa difícil de revertir pasa por los **Cuatro
   Jueces** (skill `four-judges`) *antes* de que yo entregue la recomendación. No aplica a
   chambitas, bugs ni cosas ya decididas.

---

## 4. El diagnóstico: los tres agujeros

1. **Desarrolladores web sin web propia.** Vendemos sitios y no tenemos uno. Es el peor
   argumento de venta posible.
2. **Marketing sin presencia en redes.** Vendemos alcance y no tenemos alcance.
3. **Sin sistema para hablar con los colaboradores ni pagarles.** Nadie sabe cuánto va a ganar
   ni cuándo. **Este es el que más sangra:** así se pierde a la gente buena.

---

## 5. El plan — en orden de qué sangra más y qué cuesta menos

Todo lo de abajo es **gratis** salvo lo marcado. Cero suscripciones nuevas por ahora.

### Fase 0 · Herramientas propias (la semilla)
Se construyen primero porque **todo lo demás se construye con ellas**.

| Herramienta | Qué resuelve | Estado |
|---|---|---|
| `herramientas/captura.mjs` | Ver lo que hice sin depender del teléfono de Carlos. Saca capturas reales para portafolio y QA. | ✅ hecha, probada |
| `herramientas/mapa.mjs` | Índice de líneas de un archivo monolito. `ligas-mazi/index.html` tiene 5,124 líneas; hoy cada edición se paga buscando a ciegas. | pendiente |
| `herramientas/datos.mjs` | Sacar las listas gigantes (catálogos, cosméticos) del HTML a JSON. Editar datos deja de ser editar código. | pendiente |
| auto-guardado | Commit automático de trabajo en curso. El entorno se reinicia y se pierde todo. | pendiente |
| `herramientas/sim.mjs` | Generalizar el simulador de Ligas Mazi (36 pruebas en Node puro, sin navegador) para cualquier proyecto. | pendiente |

### Fase 1 · El Sitio  ← **lo siguiente**
La cara pública. Detalle completo en la sección 6.
**Costo:** $0 en GitHub Pages. Dominio propio ~$200 MXN/año cuando lo quiera.

### Fase 2 · Panel Mazi — colaboradores y comisiones
El que para el sangrado. Es el Excel que no existe, hecho por nosotros.

- Quién es cada colaborador, qué sabe hacer, cuánto cobra.
- Qué proyecto, qué tarea, qué porcentaje de comisión.
- Cuánto lleva ganado · cuánto se le ha pagado · **cuánto se le debe**.
- Estado de cada pago, con historial.
- Importa y exporta Excel y CSV (la regla: conectar sí, depender no).

**Cómo:** HTML autónomo + Supabase. Ya sabemos hacerlo — Ligas Mazi corre así, con cuentas
reales, RLS y multi-inquilino. Es reutilizar lo que ya funciona, no inventar de cero.

### Fase 3 · Cotizador + contrato
- **Cotizador:** metes alcance, complejidad y urgencia; escupe precio **y el reparto de
  comisiones**. Cotizar a ojo es como se pierde dinero.
- **Contrato / orden de trabajo:** se llena solo desde la cotización. Sin papel firmado el
  cliente mueve el alcance y nadie paga la diferencia.

### Fase 4 · Portal del cliente
El cliente entra y ve avance, entregas y pagos. Se construye encima del Panel, así que sale
casi gratis. Es lo que hace que "gestión de negocios" se sienta real y no un PowerPoint.

### Fase 5 · Redes y contenido
No "publicar por publicar": un generador que convierta **hitos reales de proyecto** en
borradores de post. El trabajo ya existe; sólo falta contarlo. Las redes son altavoz, no casa.

### Fase 6 · Medición propia
Analítica nuestra en lugar de Google Analytics. Sabemos qué se ve sin regalarle los datos a
nadie. **Candidato directo: Plausible Analytics** — open source, sin cookies (o sea, sin banner
de consentimiento). Ver skill `stack-propio`.

### Cosas que también hacen falta, en cuanto haya aire
- **Kit de marca** en un archivo: colores, tipografías, logo, tono. Todos los proyectos lo
  importan. Barato, y arregla que cada proyecto se vea de un dueño distinto.
- **Bitácora de horas / tiempos y movimientos.** Lo *vendemos*: deberíamos tener el mejor. Y
  usarlo nosotros es la demo de venta.
- **Facturación.** Nuestro sistema arma; el PAC timbra (ver sección 2).

---

## 6. El Sitio — qué va a contener

**Principio rector:** el sitio **es** la demo. Como animejs.com. Si vendemos web y animación, la
web tiene que ser la mejor pieza del portafolio. Nadie compra animación viendo un PDF.

**Dónde vive:** `sitio/` en `mazi-central` (GitHub Pages, gratis). Cuando haya dominio, se
apunta ahí y se sube a la raíz.

**Estética:** la paleta que ya tiene la central — tinta `#0E1311`, latón `#D69A2D`, verde vivo
`#4FB286`, hueso `#E8E6DF`. Oscuro, tipografía grande y apretada, líneas finas, animación al
hacer scroll. Un acento, no cinco. Cero fotos de stock de gente sonriendo con laptops.

**Se diseña para teléfono primero y se prueba en computadora antes de publicar.** (Ver el
pendiente de la sección 9.)

### Secciones, en orden de scroll

**1 · Portada**
Nombre, el lema *"si no existe, constrúyelo"* con entrada animada, y **una sola frase** que diga
qué hacemos. Sin verborrea corporativa.

**2 · Qué hacemos**
Los seis servicios, una línea cada uno. **Sin listar tecnologías** — eso es entregarle la receta
al competidor.

**3 · Movimiento** — el laboratorio de animación
El argumento de venta más fuerte que tenemos. Detalle completo en la sección 6-bis.

**4 · Juega** — Torre Infinita empotrada
Jugable ahí mismo, sin salir del sitio, con control táctil para teléfono.
*"9111 pisos. Esto es lo que hacemos cuando nadie nos pone límites."*
→ El bug de morir **ya está arreglado** (sección 9).

**5 · La app de gestión** — el comercial en video
Reproductor **nuestro**, no YouTube empotrado (regla de la sección 2). Video alojado en lo
nuestro.

→ **OJO: ICAMP no es cliente.** Le hicimos un software para *ofrecérselo* y Carlos todavía no
habla con ellos. Entonces en el sitio **no se nombra a ICAMP ni se usa su marca**:

- Ponerlos de cliente sería mentir, y la primera persona que lo cache nos quema.
- Usar su marca en nuestra publicidad antes de siquiera hablarles puede **quemar la venta**.
- La forma correcta: se muestra como **software propio** ("plataforma de gestión que
  construimos"), sin logos ni nombre de nadie. Si el video trae marca de ICAMP, se recorta o se
  regraba con una versión neutra.
- El video con marca sirve para **mandárselo a ICAMP**, no para colgarlo en la web.
- Si algún día firman, se les pide permiso y ahí sí se nombra.

→ **Bloqueado: necesito el archivo de video de Carlos.**

**6 · Trabajo** — portafolio curado

| Pieza | Qué prueba | Cómo se nombra |
|---|---|---|
| **Ligas Mazi** | Plataforma completa: cuentas, pagos, privacidad de menores. La prueba **comercial**. | por su nombre, es nuestra |
| **El Pacto Roto** | RPG con IA que narra y juzga, arte de museo. La prueba **técnica**. | por su nombre, es nuestro |
| **La app de gestión** | Que también hacemos video y software de negocio. | **sin nombrar a ICAMP** (ver arriba) |
| **Torre Infinita** | Que llegamos hasta donde haga falta. | por su nombre, es nuestra |

**No van** (dicho por Carlos): **Hoja de Romero** y **KERNEL://LOCK** — feos y sin terminar. No
son portafolio.

De cada pieza se cuenta **qué problema resolvimos**, nunca cómo.

**7 · Cómo trabajamos**
*"No lo hacemos en corto, lo hacemos a la larga."* El modelo de comisión explicado en cristiano.
Qué esperar: tiempos, entregas, quién te atiende.

**8 · Contacto**
Formulario **nuestro** (nada de Google Forms), más:

- **WhatsApp empresarial:** `442 883 3786` (México, +52) → enlace directo `wa.me/524428833786`
- **Correo:** `grupomazi.oficial@gmail.com`

*Nota para después:* el correo es Gmail. Cuando haya dominio, pasa a `hola@grupomazi.com` — se
ve serio y es un argumento más para comprar el dominio. El Gmail queda de respaldo.

### Proteger la propiedad sin parecer avaros

Lo que **sí** se enseña: el resultado, el movimiento, la sensación. Demos jugables y capturas
curadas.
Lo que **no**: código fuente, arquitectura, stack, estructura de base de datos, precios.

**Los repos siguen públicos — decisión de Carlos.** Su razón: nadie los conoce todavía. Es
válida mientras no haya tráfico. Lo que hay que tener claro es que **el sitio es justo lo que
va a traer ese tráfico**: en cuanto la web funcione, va a haber gente curioseando el nombre en
GitHub. Así que el momento de revisarlo no es hoy, pero tampoco "algún día" — es **cuando el
sitio empiece a traer visitas**. Queda anotado como disparador, no como pendiente vago.

Bloquear el clic derecho y minificar es teatro; no lo voy a vender como seguridad.

**Y la regla que no se rompe: no presumimos clientes que no son clientes.** Nada de logos
ajenos ni "trabajamos con X" sin trato firmado. Es lo que más rápido quema la reputación de una
empresa nueva, y además puede arruinar la venta que todavía no se hace.
Lo que protege de verdad es que la ventaja no está en el código: está en la velocidad y el
criterio. Un competidor puede copiar una animación. No puede copiar que armemos un RPG con IA
en una semana.

### Datos de la empresa (confirmados por Carlos, 25 jul 2026)
- **WhatsApp empresarial:** 442 883 3786 (México)
- **Correo:** grupomazi.oficial@gmail.com
- **Logo:** el que hay es **provisional**. Carlos va a hacer el bueno después. El sitio se
  construye para que cambiar el logo sea cambiar un archivo, no rehacer el diseño. Mientras
  tanto la identidad carga en la **tipografía y el color**, no en el logo — así se ve
  intencional en vez de inacabado.
- **Repos:** se quedan **públicos por ahora**. Decisión de Carlos: nadie conoce los repos
  todavía. Se revisa cuando el sitio empiece a traer visitas.

### Lo que falta para terminar el sitio
1. **El archivo del video** de la app de gestión.
2. Confirmar si ese video **trae marca de ICAMP**; si sí, hay que recortarla o regrabar una
   versión neutra antes de publicarlo.
3. **Dominio:** ¿compramos uno o nos quedamos en GitHub Pages por ahora?

---

## 6-bis. El laboratorio de animación (sección 3 del sitio)

**El problema que resuelve:** casi todos los portafolios de web enseñan capturas. Una captura de
una animación es una imagen quieta — o sea, exactamente lo contrario de lo que estamos
vendiendo. Nadie contrata a un animador viendo un JPG.

**Lo que hace:** en vez de *enseñar* animaciones, el sitio **las corre en vivo y el visitante las
toca**. Les pasa el dedo encima y responden; arrastra y se mueven. Eso no lo finge una plantilla
de Wix, y el cliente lo siente en dos segundos sin que nadie le explique nada.

### Las piezas — cuatro a seis, cada una probando algo distinto

| Demo | Qué prueba | Por qué le importa al cliente |
|---|---|---|
| **Texto que se arma** | control fino de tiempos, entrada escalonada | es el hero de cualquier landing |
| **Cuadrícula que reacciona al dedo** | respuesta al tacto, física | se siente caro, y en teléfono es lo que engancha |
| **Números que cuentan** | datos animados | todo dashboard y todo reporte lo pide |
| **Barra que rasca la animación** | control real, no autoplay | prueba que la manejamos, no que copiamos un efecto |
| **Tarjeta que se transforma** | transición entre estados | es la "sensación de app" que todos quieren y casi nadie logra |

Cada una en su recuadro, con **una línea** de qué es. Sin explicar **cómo** — eso es la receta.

### Por qué conviene al negocio

Estas piezas **no se construyen una vez y se tiran**: quedan como librería nuestra. La próxima
vez que un cliente pida un landing con movimiento, ya está hecho. Se construye una vez y se
cobra muchas — la misma lógica de la Fase 0.

### Cómo convive con la regla del arte

Aquí **el movimiento es el producto**, no un dibujo haciéndose pasar por arte. Una cuadrícula que
ondula no está fingiendo ser una ilustración, es motion design — que es literalmente lo que
vendemos. Pero en cuanto una demo necesite una **imagen**, esa imagen es real: una captura de un
proyecto nuestro o una lámina de museo. **Nunca un dibujo hecho por código.**

### Detalles de construcción
- Anime.js **vendorizada** (`pacto-roto/js/vendor/anime.min.js` ya la tiene), nunca desde CDN.
- Teléfono primero: todo tiene que responder al **dedo**, no sólo al ratón.
- Respetar `prefers-reduced-motion`: si el visitante pidió menos movimiento, se le baja.
- Cada demo aislada en su propio bloque, para poder arrancar con dos y agregar las demás sin
  rehacer nada.
- **No depende de nada de Carlos** — se puede construir sin el video ni el logo definitivo.

---

## 7. Inventario de proyectos

| Proyecto | Qué es | ¿Portafolio? |
|---|---|---|
| **Ligas Mazi** | Gestión de ligas de baloncesto. Supabase, cuentas reales, marcador en vivo, cartas coleccionables. | ✅ la más fuerte |
| **El Pacto Roto** | RPG de mundo abierto, la magia se dibuja, IA narra. Arte de museo. | ✅ |
| **Torre Infinita** | Roguelike Pokémon, 9111 pisos, Phaser 3. Repo aparte. | ✅ jugable |
| **App de gestión** | Software que hicimos para **ofrecérselo a ICAMP**. Todavía no hay trato ni plática con ellos: **ICAMP no es cliente**. Va al sitio sin nombrarlos. | ✅ sin marca ajena |
| **VitalLink / Life-Connect** | Emergencias: centro de comando + app civil. | quizá |
| **Hoja de Romero** | Sandbox de cocina. | ❌ Carlos: feo y sin terminar |
| **KERNEL://LOCK** | Escape room con la tsundere. | ❌ Carlos: feo y sin terminar |
| **INKWELL** | Lector infinito. | ❌ por ahora |

---

## 8. Cómo trabajo yo aquí

- Repo principal: `mazi-central` · rama de desarrollo: `claude/juego-oregon-3kmicc`
- `main` es lo que sirve GitHub Pages. Se publica ahí a propósito, no por accidente.
- Repo aparte: `torre-infinita` (misma rama de trabajo).
- Antes de tocar un monolito, sacar el mapa. Antes de entregar, sacar la captura.

---

## 8-bis. Mis capacidades instaladas (`.claude/skills/`)

Estas skills se cargan solas cuando aplican. **No hace falta que Carlos las mencione.**

| Skill | Cuándo se dispara |
|---|---|
| **`four-judges`** | Antes de cualquier decisión cara o difícil de revertir. Palabra clave: **ROAST**. Guarda veredictos en `.claude/veredictos/`. |
| **`ui-components`** | Al arrancar cualquier interfaz web: elige entre Magic UI, SmoothUI, RetroUI, Unlumen y React Bits — o dice que ninguna aplica. |
| **`web-prompts`** | Al escribir el briefing de un sitio, al pedir "que se vea más caro", y en el pulido antes de entregar. |
| **`scroll-cinema`** | Animación por scroll tipo Apple: fotogramas en canvas. **Sin React ni build** — encaja con el HTML autónomo. |
| **`remotion`** | Video MP4 hecho con código, a volumen y por dato. Ojo con su licencia. |
| **`multi-agent`** | Al armar equipos de agentes: organigrama, carpetas, `CLAUDE.md` por agente, memoria en archivos. |
| **`stack-propio`** | Al elegir herramienta: open source auto-hospedable antes que suscripción. Sirve directo a la regla §2. |
| **`manus`** | Al decidir si una tarea conviene delegarse a un agente autónomo externo, y cómo redactarle el encargo. |

Índice completo y mapa de lo que falta: `.claude/skills/CATALOGO.md`

**Cómo se combinan.** El flujo natural de un proyecto nuevo:

```
IDEA → four-judges (¿se construye?) → web-prompts (el briefing)
     → ui-components (con qué se construye) → construir
     → web-prompts/pulido (móvil, performance, accesibilidad) → entregar
```

Y si el proyecto es grande, **`multi-agent`** arma quién lo ejecuta; **`manus`** decide qué
pedazos se delegan hacia afuera.

**Regla de mantenimiento:** cuando salga una versión nueva de cualquiera de estos recursos, se
actualiza **sólo el archivo de `reference/` afectado**, no la skill entera. Por eso el
conocimiento consultable vive separado del criterio.

---

## 9. Bitácora y pendientes

### Hecho — 24-25 jul 2026
- **Regla nueva de Carlos:** todo lo que la empresa use, lo construimos nosotros (sección 2).
- **Herramienta 1:** `herramientas/captura.mjs`. Probada sacando capturas reales de Pacto Roto,
  Torre Infinita y Ligas Mazi.
- **Torre Infinita — arreglado el softlock al morir.** El input (teclado, mando y d-pad táctil)
  moría al perder. Causa: `GameOverScene` habilitaba el input hasta el final de una cadena
  anidada de `delayedCall` sin protección; si cualquier eslabón tronaba (audio que no
  decodifica, textura que no cargó), `ready` se quedaba en falso para siempre. El ratón
  *parecía* funcionar porque los botones de la cabina son de `HudScene`, otra escena viva.
  Reproducido y verificado en Chromium headless. PR draft: `torre-infinita#1`.
- **Ligas Mazi** estable en `main` (36/36 pruebas del simulador).

### Lo siguiente (acordado el 25 jul, para el día siguiente)
**Arrancar el laboratorio de animación** (sección 6-bis). Es lo único del sitio que no depende
de nada de Carlos: no necesita el video, ni el logo bueno, ni el dominio. Se empieza por ahí.

### Pendientes abiertos
- **El pasto de Torre Infinita se ve mal.** En la captura del piso salió verde plano con la
  cuadrícula marcada y unos cuadros negros con diagonales verdes encima. Sospecha: la captura se
  tomó en modo `__GODTEST`, que puede dibujar depuración, y/o el tileset real no cargó y entró
  la textura de respaldo. **Falta confirmarlo con una captura sin GODTEST antes de tocar nada.**
- **La página se ve feísima en computadora.** Carlos lo vio y lo dejamos para cuando tenga una
  computadora a la mano para probar. Aplica al diseño de escritorio en general — todo se hizo
  pensando en el teléfono.
- **Falta el archivo del video** de la app de gestión — y confirmar si trae marca de ICAMP,
  porque en ese caso hay que quitarla antes de publicar (sección 6).
- **Logo bueno.** El de ahora es provisional; Carlos hará el definitivo. El sitio se construye
  para que cambiarlo sea cambiar un archivo.
- **Revisar si los repos siguen públicos** cuando el sitio empiece a traer visitas.
