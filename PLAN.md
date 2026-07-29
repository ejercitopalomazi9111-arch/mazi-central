# Plan de trabajo — Grupo Mazi

> Los 16 frentes que Carlos puso sobre la mesa, ordenados por lo que desbloquea a lo demás.
> Carlos está estudiando para un examen esta semana, así que **la mayoría del trabajo va solo**.
> Lo que necesita su decisión está marcado 🔴.

---

## La foto completa

| # | Frente | Bloquea a | Puedo solo |
|---|---|---|---|
| 1 | 🔴 **Identidad**: logo, nombre, qué significa Mazi | 2, 9, 10, 11, 12 | preparo opciones |
| 2 | **Planeación del sitio**: flujo y diseño | 3 | sí |
| 3 | **La página de Grupo Mazi** | — | sí (menos el video) |
| 4 | **Herramientas nuevas** de lo aprendido en Ligas Mazi | todo lo demás | sí |
| 5 | **Terminar Ligas Mazi** | el portafolio | casi todo |
| 6 | **Subir TODO a GitHub** | — | sí |
| 7 | **Mejorar mazi-central** | — | sí |
| 8 | ⚠️ **Publicador de redes** | 13 | con reservas — leer abajo |
| 9 | **Flyers** | — | tras identidad |
| 10 | **Carteles publicitarios** | — | tras identidad |
| 11 | **Anuncios** | — | tras identidad |
| 12 | **Guías para colaboradores** | contratar | sí |
| 13 | **Agente de marketing** | — | parcial |
| 14 | **Herramienta de finanzas** | — | sí |
| 15 | 🔴 **Herlinda Ávila** (bienes raíces) | — | necesito hablar con ella |
| 16 | 🔴 **GERALDMED** | — | decisión de negocio |

---

## Lo que tengo que decirte antes de empezar

### ⚠️ El publicador de redes — esto hay que hablarlo

Pediste *"publicar en todas las redes automáticamente sin que me baneen las cuentas por uso de
bots"*. Te lo digo derecho porque es donde se pierden meses:

**Las plataformas no banean por "detectar bots". Banean por publicar sin usar su API.** Si
automatizas con un navegador que se hace pasar por ti, tarde o temprano cae la cuenta — y no es
un problema técnico que se pueda esquivar con trucos, es la plataforma aplicando sus reglas. Ahí
no hay ingenio que valga: hay cuentas perdidas.

**El camino que sí funciona, y es el que voy a construir:** publicar por las **APIs oficiales**.
Meta (Instagram y Facebook), LinkedIn, X, TikTok y YouTube **todas permiten publicar
programado**. Eso no es un premio de consolación: es la única versión que sobrevive, y de paso
te da métricas reales que el otro camino no te da.

**El costo honesto:** hay que registrar una app por plataforma y pasar su revisión. Es papeleo,
tarda días o semanas, y algunas piden cuenta de empresa verificada. **No es difícil, es lento.**
Por eso conviene arrancar el trámite ya, aunque la herramienta la construyamos después.

### El remedio temporal — sí se puede, y es mejor de lo que parece

Carlos pidió algo que funcione mientras aprueban. **Sí hay, y es bueno**, porque resulta que
**no todas las plataformas piden revisión.**

| Plataforma | ¿Revisión? | Se puede automatizar hoy |
|---|---|---|
| **YouTube** | no, sólo OAuth y cuota | ✅ subir videos completos |
| **X / Twitter** | no, capa gratis limitada | ✅ ~1,500 publicaciones al mes |
| **Telegram** | no, API de bots abierta | ✅ inmediato |
| **Bluesky** | no, protocolo abierto | ✅ inmediato |
| **Pinterest** | ligera | ✅ casi inmediato |
| Instagram / Facebook | sí + verificación de empresa | ⏳ tras aprobación |
| TikTok | sí | ⏳ tras aprobación |
| LinkedIn | sí, para publicar orgánico | ⏳ tras aprobación |

**Entonces el plan de dos velocidades:**

1. **Hoy** — la herramienta lee la carpeta, prepara todo (recorta a 9:16, 1:1 y 16:9, escribe
   el texto, arma los hashtags, programa la hora) y **publica de verdad** en YouTube, X,
   Telegram, Bluesky y Pinterest.
2. **Para Meta, TikTok y LinkedIn, mientras aprueban** — modo *"listo para publicar"*: te deja
   todo preparado en una pantalla donde das **un toque por publicación**. No es automático del
   todo, pero te quita el 90% del trabajo: el recorte, el texto, la hora y la organización.
3. **Cuando pasen las revisiones** — se conecta el adaptador y esas tres pasan a automáticas sin
   tocar nada más.

**Lo que NO voy a construir:** un robot que maneje un navegador haciéndose pasar por ti para
publicar. Eso es exactamente lo que tumba cuentas, y no hay truco que lo evite — es la
plataforma aplicando sus reglas, no un sistema que se pueda burlar. Perder la cuenta de
Instagram del negocio cuesta más que esperar la aprobación.

**Arrancar los trámites es lo primero**, porque es lo único que no puedo acelerar. Te dejo
preparada la lista de qué pide cada plataforma.

### El agente de marketing es cuatro productos, no uno

Lo que describiste —decidir cuándo publicar, qué publicar, qué va en el siguiente video,
analizar estadísticas, armar estrategias, y que sirva para clientes— son cuatro cosas:

1. **Calendario y cola** (cuándo)
2. **Generador de contenido** (qué)
3. **Analítica** (qué funcionó)
4. **Estratega** (qué hacer con eso)

Construirlas todas antes de tener un solo cliente es cómo se van tres meses. **Se construye la 1
y la 2 primero**, que son las que te quitan trabajo desde el día uno. La 3 no sirve sin datos —y
no hay datos hasta que publiques. La 4 no sirve sin la 3.

### Herlinda — Carlos dice que probablemente no deja dinero, pero lo quiere hacer

Perfecto, y de hecho conviene aunque no pague. Aquí está el argumento:

- **Es el mejor caso de estudio posible para el sitio.** "Le quitamos 200 mensajes al mes a una
  agente inmobiliaria" vende más que cualquier animación bonita.
- **Es replicable.** Todos los de bienes raíces tienen el mismo dolor: pones una casa en venta y
  te preguntan si se renta. Le resuelves a una, lo vendes a veinte. **El producto se paga con
  el segundo cliente, no con ella.**
- **Es el laboratorio del agente de marketing.** Lo que se construya para Herlinda —responder
  solo, publicar propiedades, clasificar interesados— es el mismo motor que necesita Grupo Mazi.

Así que se construye **como producto, no como favor**. Mismo esfuerzo, y queda algo vendible.

**Lo que necesito de ella:** sus mensajes típicos, o media hora de plática. Sin saber qué le
preguntan de verdad, el bot sale genérico y no le sirve a nadie.

### GERALDMED — la decisión no es técnica

Dijiste que estás enojado porque no te agradecieron el cliente que les conseguiste. Eso es
información de negocio, no un berrinche: **te dice qué tipo de cliente son.**

Dos preguntas antes de escribir una línea de código:

1. **¿Les vas a cobrar esta página?** Si el resentimiento viene de haber regalado trabajo, hacer
   otra gratis lo va a empeorar.
2. **¿Vale la pena la relación?** Un cliente que no reconoce lo que le das es un cliente que va
   a pelear cada factura.

Yo la dejaría **hasta el final de la lista** y sólo con cotización de por medio. Pero es tuya.

### "Terminar Ligas Mazi" — ya está definido: el fondo del iceberg

Carlos lo aclaró: no es pulido, es **todo lo que hace que un software sea un producto de
verdad**. La lista:

| # | Qué | Riesgo si no se hace |
|---|---|---|
| 1 | Afinar detalles y **asegurar que funcione de verdad** | se cae con el primer usuario real |
| 2 | Cambiar **logo y nombre** | depende de la decisión de identidad |
| 3 | Ajustar **sobres** (economía del gacha) | o no vende, o regala de más |
| 4 | Ajustar **movilidad** (el layout de escritorio incluido) | se ve inacabado |
| 5 | **Candados de seguridad** | fuga de datos entre cuentas |
| 6 | **Términos y condiciones** + qué datos recopilamos | ilegal operar sin esto |
| 7 | **Moderación de imágenes** subidas para las cartas | ⚠️ **el más grave — ver abajo** |
| 8 | **Deslindes de responsabilidad** | quedas expuesto tú, personalmente |
| 9 | **Muros de paga que de verdad funcionen** | hoy no cobra nada |
| 10 | La publicidad, al final | — |

### 🚨 El punto 7 es el más serio de todo el plan, y hay que tratarlo aparte

**Ligas Mazi es una plataforma con menores de edad**, donde padres y niños suben fotos de sus
caras para las cartas. Eso cambia todo el cálculo: no es "moderar contenido", es **proteger
niños y protegerte a ti legalmente**.

Lo que esto exige, y no es negociable:

- **Moderación ANTES de publicar, no después.** Cola de revisión: la imagen no se ve en ningún
  lado hasta que pasa. Publicar primero y limpiar después es exactamente como terminas con algo
  ilegal en tus servidores.
- **Consentimiento del padre o tutor, registrado y con fecha.** No una casilla escondida: un
  registro que puedas mostrar si alguien pregunta.
- **Nada público por defecto.** La carta de un menor se ve dentro de su liga, no en internet
  abierto.
- **Recolectar lo mínimo.** Hoy se pide CURP. Hay que justificar cada dato que se guarda, porque
  la Ley Federal de Protección de Datos Personales (LFPDPPP) obliga a decir para qué es cada uno.
- **Una vía de borrado.** Que un padre pueda decir "quiten a mi hijo" y que de verdad se quite.
- **Detección automática + revisión humana.** Lo automático caza lo obvio; lo dudoso lo ve una
  persona. Ninguna de las dos sola alcanza.

**Esto no es opcional ni se deja para después.** Es lo que separa un proyecto bonito de uno que
te puede meter en un problema serio. Y aviso claro: **si el sistema de moderación no está listo,
la función de subir fotos no se abre al público.** Prefiero que la carta salga sin foto a que
salga con algo que no debía.

### Los muros de paga de verdad

"Que funcionen" significa cobrar dinero real, y eso arrastra tres cosas que no son código:

1. **Pasarela de pago** — Stripe, Mercado Pago o Conekta. Requiere cuenta de empresa y datos
   fiscales.
2. **Facturación** — si cobras en México, tarde o temprano piden factura, y eso necesita un PAC
   (ver `CLAUDE.md` §2).
3. **Qué pasa si alguien cancela o pide reembolso.** Definirlo antes, no cuando ya pasó.

Lo que sí puedo construir solo: la lógica de qué se bloquea, los planes, los límites, y la
pasarela detrás de un adaptador nuestro. Lo que necesita tu firma: la cuenta y los datos
fiscales.

---

### ¿Puedo editar video? Sí — probado, no prometido

Verificado el 29 de julio armando un clip real: fondo de marca + título con tipografía correcta
+ desvanecido, en 1080×1920 vertical.

**Lo que sí puedo:**

| | |
|---|---|
| **Cortar, recortar y unir** | quitar pedazos, pegar clips, ordenar |
| **Reformatear por plataforma** | 9:16 para reels y TikTok, 1:1, 16:9 — de una sola fuente |
| **Transiciones** | desvanecidos, cruzados entre clips |
| **Sobreponer** | logo, marcas de agua, tarjetas de texto, imágenes |
| **Texto con tipografía real** | se maqueta en el navegador y se sobrepone. **Mejor que el texto nativo de ffmpeg**: control total de fuente, peso y color |
| **Movimiento sobre foto fija** | el acercamiento lento tipo documental |
| **Audio** | mezclar, recortar, desvanecer, cambiar la pista |
| **Subtítulos** | quemados o como pista aparte |
| **Sacar fotogramas** | para miniaturas y para `scroll-cinema` |
| **Ver el resultado** | extraigo cuadros y los reviso. **Puedo juzgar cómo quedó, no sólo generarlo** |
| **Video desde código** | Remotion, para hacer cien videos con datos distintos |

**Lo que no:** no tengo tu material. Tú me pasas el crudo. Y para corrección de color fina o
decisiones de montaje muy sensibles voy más lento que un editor humano, porque reviso por
cuadros en vez de ver la línea de tiempo corriendo.

**Lo que esto desbloquea de inmediato:** los reels y videos para redes salen de aquí. Le das
material crudo a la herramienta y salen las tres versiones ya cortadas, con tu marca y listas
para publicar.

---

## El orden

### 🔴 Bloque 0 · Branding e identidad — **la prioridad que puso Carlos**

**La identidad bloquea seis frentes.** Flyers, carteles, anuncios, la página, la central y hasta
el logo de Ligas Mazi dependen de saber cómo se llama y cómo se ve la empresa. Sin eso, todo lo
visual se hace dos veces.

Lo que preparo para que tú sólo escojas:

1. **Opciones de nombre** — con qué gana y qué pierde cada una. Incluye **quedarse como Grupo
   Mazi**, que es una opción legítima y probablemente la más barata: ya hay dominio mental,
   correo, y proyectos que lo llevan en el nombre.
2. **Qué significa Mazi** — propuestas, y también el argumento de **que no signifique nada**.
   Muchas marcas fuertes no significan nada (Sony, Kodak, Zara). Un nombre sin significado es
   más fácil de registrar y no te encasilla.
3. **Qué significa "Grupo"** — y si conviene. "Grupo" sugiere tamaño; si son pocos, puede jugar
   en contra o a favor según a quién le vendas.
4. **Propuestas de logo** — **generadas**, porque un logo tiene que ser tuyo y único. Aquí sí
   aplica la excepción de la regla del arte.
5. **El kit de marca** en un archivo: color, tipografía, tono de voz, y cómo se aplica. Es lo
   que hace que todo se vea de un mismo dueño.

**Yo no decido el nombre de tu empresa.** Te doy el material y el criterio; eliges tú.

**Antes de proponer nada, esto pasa por los Cuatro Jueces** — cambiar el nombre de una empresa
es de las decisiones más caras y difíciles de revertir que hay.

### Bloque 1 · Esta semana — la casa en orden

Todo esto lo hago solo, sin bloqueos:

1. **Subir TODO a GitHub.** Lo primero, porque el entorno se reinicia y ya perdí trabajo tres
   veces. Todo lo hablado, planeado y construido queda versionado.
2. **Las herramientas de lo aprendido en Ligas Mazi.** Ver abajo — son cuatro y las uso en todo
   lo demás, así que van temprano.
3. **Planeación del sitio:** flujo, mapa de secciones, wireframe y decisiones de diseño. **Esto
   te lo presento antes de construir**, para que no te sorprenda el resultado.
4. **El laboratorio de animación** — arranca sin depender de nada tuyo.
5. **Ligas Mazi presentable:** layout de escritorio + objetivos táctiles.

### Bloque 2 · Cuando decidas la identidad

6. **La página de Grupo Mazi**, completa
7. **Mejorar mazi-central** con la identidad nueva
8. **Flyers, carteles y anuncios** — salen del mismo kit de marca, así que en lote
9. **Guías para colaboradores** — esto sí lo puedo escribir ya, no depende del logo

### Bloque 3 · Las herramientas del negocio

10. **Finanzas** — la más fácil y la que más tranquilidad da. Entra y sale, por proyecto, con lo
    que se debe a colaboradores. Se conecta con el Panel Mazi de la Fase 2.
11. **Publicador de redes** — la herramienta completa, con las APIs por adaptador
12. **Agente de marketing** — sólo calendario y generador. Lo demás cuando haya datos.

### Bloque 4 · Clientes

13. **Herlinda Ávila** — necesito hablar con ella o que me pases sus mensajes típicos
14. **GERALDMED** — con cotización de por medio

---

## Las herramientas nuevas, de lo aprendido en Ligas Mazi

Lo que ese proyecto enseñó a la mala:

| Herramienta | La lección que la origina | Qué resuelve |
|---|---|---|
| `mapa.mjs` | `index.html` tiene **5,124 líneas** y cada edición se paga buscando a ciegas | índice de líneas de un monolito: qué función está dónde |
| `datos.mjs` | los catálogos gigantes viven mezclados con el código | saca las listas a JSON; editar datos deja de ser editar código |
| `guardado.mjs` | el entorno se reinició **tres veces** y se llevó trabajo | commit automático de lo que está en curso |
| `sim.mjs` | el simulador de Ligas Mazi (36 pruebas en Node puro, sin navegador) fue lo que más bugs cazó | generalizarlo para cualquier proyecto |

Las dos primeras ya las uso este mismo lunes. La tercera me deja de costar trabajo perdido. La
cuarta es la que más va a rendir a la larga: **probar lógica sin navegador es rapidísimo.**

---

## Lo que necesito de ti (cuando salgas del examen)

1. **La decisión de identidad** — nombre, significado, logo. Te preparo las opciones.
2. **El archivo del video** de la app de gestión, y si trae marca de ICAMP.
3. **Herlinda:** sus mensajes típicos, o una llamada con ella. Sin saber qué le preguntan de
   verdad, el bot sale genérico.
4. **GERALDMED:** ¿se cobra? ¿vale la pena?
5. **"Terminar Ligas Mazi":** ¿presentable o completo?
6. **Dominio:** ¿lo compramos? (~$200 al año, y desbloquea el correo serio)

---

## Cómo voy a reportar

Commit por pieza terminada, y al final de cada bloque te dejo un resumen corto de qué quedó,
qué encontré y qué sigue. **Nada de "ya quedó" sin captura o prueba que lo respalde.**
