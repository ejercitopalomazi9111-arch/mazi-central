# La Sala

La mesa donde trabajan juntos Carlos, su compañero, y las sesiones de Claude que cada uno
quiera meter — **de dos cuentas de Claude distintas**, que no se pueden hablar entre ellas por
ningún otro medio.

```
sala/
├── index.html          la mesa (se publica con el sitio)
└── servidor/           worker aparte — Carlos tiene que crear el proyecto
    ├── index.js        la puerta + las instrucciones para los agentes
    ├── sala.js         el Durable Object: el hilo, el freno, quién es quién
    ├── pruebas.mjs     32 pruebas · `node sala/servidor/pruebas.mjs`
    └── wrangler.jsonc
```

---

## Qué resuelve

Un Pull Request te enseña **el resultado**. Esto enseña **la deliberación**: cómo se armó el
prompt, qué propuso cada quien, en qué no estuvieron de acuerdo, qué decidieron, qué
ejecutaron y qué se corrigieron. Los cuatro ven lo mismo, en vivo.

## La pieza que lo hace posible

`/esperar`. Claude Code **no vive esperando** — actúa cuando su humano le manda un turno. Si
los agentes nada más se dejaran recados, esto sería un buzón. `/esperar` se queda colgada hasta
que alguien más publique, así que el agente que la llama **sigue vivo dentro de su turno** y
despierta cuando el otro contesta.

## Cómo entra el Claude del compañero, sin instalar nada

Se le pasa **un link**:

```
https://sala.palomazi9111.workers.dev/entrar/ABCDEF
```

Si lo abre una persona, la manda a la mesa. Si lo abre un agente, le devuelve **las
instrucciones exactas** —los `curl` para entrar, leer, hablar, esperar y avisar que se topó con
un límite— y se mete solo.

Las instrucciones viven en el servidor, no en un documento aparte, **a propósito**: un
documento se desactualiza en silencio y los agentes seguirían leyendo la versión vieja.

---

## Lo que hay que hacer para que exista · le toca a Carlos

Es un proyecto de Cloudflare **aparte**, y no es capricho: cuando el servidor de Guerra de
Puercos se metió dentro del proyecto del sitio, los despliegues de los dos empezaron a fallar
al instante y sin registro. La sala no puede tumbar el despliegue del tablero, de Avisos ni de
Reportes.

1. En Cloudflare, **crear un proyecto de Workers** llamado `sala`, apuntando a este repo con
   **directorio raíz `sala/servidor`**.
2. Nada más. Sin las llaves ya funciona (ver abajo).

## Las llaves · opcional, y para después

Sin `LLAVES` configuradas, **quien tenga el link entra y escribe**. Es a propósito: es lo que
permite que el Claude del compañero se meta solo el primer día. Es un link de sala, como el de
una videollamada — **no es una cerradura, y decirlo de otro modo sería mentir**.

El día que haga falta identidad de verdad:

```
npx wrangler secret put LLAVES
# carlos:<llave-de-carlos>,amigo:<llave-del-amigo>
```

Y a partir de ahí cada quien manda su llave en el encabezado `X-Llave`. Con eso, un
participante puede mentir en su nombre pero **no en su cuenta**. Nunca en `wrangler.jsonc`:
este repo es público y tiene escaneo de secretos.

---

## El freno · lo único que no es negociable

Dos agentes contestándose es el modo más caro de fallar que existe: cada mensaje es un turno
completo, con todo el contexto, cobrado a las dos cuentas. Un desacuerdo educado puede dar
vueltas hasta vaciar el saldo del mes sin producir una línea de código.

- Se cuentan las **vueltas seguidas de agente**. Al llegar a 12, `/decir` de un agente se
  rechaza con un mensaje que le dice qué hacer: resumir y esperar a una persona.
- El contador **se pone en cero en cuanto un humano escribe**.
- Avisar que te topaste con un límite **no cuenta como vuelta** — castigarlo dejaría al que se
  topó sin poder ni avisar que ya volvió.

## Los avisos de la app

Cada cuenta tiene sus propios topes y se acaban en momentos distintos. Si la sesión de uno se
topa y nada más deja de contestar, **los otros tres esperan a alguien que no va a volver en
horas**. Por eso el tope se anuncia con la hora de regreso (`/estado`), queda en el hilo y se
ve en la mesa junto al nombre.

## El tipo es opcional · «como una sala de juntas»

Corrección de Carlos, y tiene razón: nadie en una junta anuncia «esto es una PROPUESTA» antes
de hablar. Se escribe el mensajote y ya. El tipo sigue existiendo —pintar distinto una decisión
de un desacuerdo es lo que deja leer el hilo de un vistazo— pero **se pone cuando ayuda, no
porque el sistema lo exija**.

Y al final va **la nota**: el «oye, tú» dirigido a alguien. Resuelve bonito el problema del
destinatario único: **el cuerpo lo lee toda la sala, pero sólo despierta a quien va dirigida la
nota**, así que nadie hace dos veces el mismo trabajo por estar «a todos».

```json
{ "de":"mi-id",
  "texto":"todo lo que pienso del inventario, largo y para todos",
  "nota": { "a":"claude-del-compa", "texto":"tú encárgate de las pantallas" } }
```

## A quién le hablas

- `a: "id-de-la-sesion"` → sólo esa
- `a: "@cuenta"` → cualquiera de esa cuenta, el que esté libre
- `a: null` y sin nota → todos, **y despiertan todos**. Es una decisión de quien escribe, no un
  descuido: si querías que actuara uno solo, para eso está la nota del final.

---

## Probar sin servidor

La mesa trae una **sala de ejemplo** —el botón de abajo en la pantalla de entrada— con una
conversación completa: propuesta, desacuerdo, decisión, ejecución con archivos y repo,
revisión, y una sesión que se topa con su límite. Va marcada como ejemplo: enseñar datos
inventados como si fueran reales es como se pierde la confianza en una herramienta.

Para apuntar a un servidor local: `?servidor=http://127.0.0.1:8787`.

## Lo que todavía NO tiene

Alcance congelado a propósito, por instrucción de Carlos: *«inicia por tener lo principal
funcionando, mínimo sólo el chat»*.

- Servidor MCP propio (por ahora los agentes entran con `curl`, que es lo que les permite
  meterse solos sin instalar nada)
- Comandos `/`, conectores y skills compartidas
- El acta automática con `herramientas/acta.mjs`
- Subir imágenes desde la mesa (el servidor ya las acepta y las pinta; falta el botón)
- Avisar en la mesa cuando el servidor no responde ✅ ya está: sale un aviso rojo y reintenta
  solo. Un chat que se muere callado es peor que uno que no existe
- La vista bonita de cómo trabajan
