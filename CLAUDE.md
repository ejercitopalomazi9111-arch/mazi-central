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
Contador de visitas nuestro (Supabase) en lugar de Google Analytics. Sabemos qué se ve sin
regalarle los datos a nadie.

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

**3 · Movimiento** — el laboratorio
Cuatro a seis demos de animación **corriendo en vivo en la página**, que el visitante puede
tocar y mover. Este es el argumento de venta real: *esto no lo saca una plantilla de Wix.*
Reemplaza al portafolio de capturas muertas.

**4 · Juega** — Torre Infinita empotrada
Jugable ahí mismo, sin salir del sitio, con control táctil para teléfono.
*"9111 pisos. Esto es lo que hacemos cuando nadie nos pone límites."*
→ El bug de morir **ya está arreglado** (sección 9).

**5 · ICAMP** — el comercial
Reproductor **nuestro**, no YouTube empotrado (regla de la sección 2). Video alojado en lo
nuestro.
→ **Bloqueado: necesito el archivo de video de Carlos.** Sin él la sección no existe.

**6 · Trabajo** — portafolio curado

| Pieza | Qué prueba |
|---|---|
| **Ligas Mazi** | Plataforma real con cliente real: cuentas, pagos, privacidad de menores. La prueba **comercial**. |
| **El Pacto Roto** | RPG con IA que narra y juzga, arte de museo. La prueba **técnica**. |
| **ICAMP** | Que también hacemos video. |
| **Torre Infinita** | Que llegamos hasta donde haga falta. |

**No van** (dicho por Carlos): **Hoja de Romero** y **KERNEL://LOCK** — feos y sin terminar. No
son portafolio.

De cada pieza se cuenta **qué problema resolvimos**, nunca cómo.

**7 · Cómo trabajamos**
*"No lo hacemos en corto, lo hacemos a la larga."* El modelo de comisión explicado en cristiano.
Qué esperar: tiempos, entregas, quién te atiende.

**8 · Contacto**
Formulario **nuestro** (nada de Google Forms), WhatsApp directo y correo.

### Proteger la propiedad sin parecer avaros

Lo que **sí** se enseña: el resultado, el movimiento, la sensación. Demos jugables y capturas
curadas.
Lo que **no**: código fuente, arquitectura, stack, estructura de base de datos, precios.

**Y una verdad incómoda que hay que atender antes que nada:**
`torre-infinita` y `mazi-central` son **repos públicos hoy**. Cualquiera puede leer completo el
código de la Torre, de Ligas Mazi y del Pacto Roto. Poner o no poner la web no cambia eso — ya
está abierto. Si de verdad preocupa que nos copien, **el primer movimiento no es la web: es
pasar los repos a privados y publicar sólo el build.** Es gratis y toma dos minutos.

Bloquear el clic derecho y minificar es teatro; no lo voy a vender como seguridad.
Lo que protege de verdad es que la ventaja no está en el código: está en la velocidad y el
criterio. Un competidor puede copiar una animación. No puede copiar que armemos un RPG con IA
en una semana.

### Lo que necesito de Carlos para terminar el sitio
1. **El video comercial de ICAMP** (el archivo).
2. **Permiso para nombrar a ICAMP** como cliente.
3. **Contacto real:** WhatsApp y correo de negocio.
4. **Logo:** ¿los `icon-192/512.png` de la raíz son el logo oficial?
5. **Dominio:** ¿compramos uno o nos quedamos en GitHub Pages por ahora?

---

## 7. Inventario de proyectos

| Proyecto | Qué es | ¿Portafolio? |
|---|---|---|
| **Ligas Mazi** | Gestión de ligas de baloncesto. Supabase, cuentas reales, marcador en vivo, cartas coleccionables. | ✅ la más fuerte |
| **El Pacto Roto** | RPG de mundo abierto, la magia se dibuja, IA narra. Arte de museo. | ✅ |
| **Torre Infinita** | Roguelike Pokémon, 9111 pisos, Phaser 3. Repo aparte. | ✅ jugable |
| **ICAMP** | App con comercial en video. | ✅ falta el archivo |
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

### Pendientes abiertos
- **El pasto de Torre Infinita se ve mal.** En la captura del piso salió verde plano con la
  cuadrícula marcada y unos cuadros negros con diagonales verdes encima. Sospecha: la captura se
  tomó en modo `__GODTEST`, que puede dibujar depuración, y/o el tileset real no cargó y entró
  la textura de respaldo. **Falta confirmarlo con una captura sin GODTEST antes de tocar nada.**
- **La página se ve feísima en computadora.** Carlos lo vio y lo dejamos para cuando tenga una
  computadora a la mano para probar. Aplica al diseño de escritorio en general — todo se hizo
  pensando en el teléfono.
- Falta el video de ICAMP y los datos de contacto (sección 6).
