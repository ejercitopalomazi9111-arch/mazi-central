# Fadori · el servidor

> El motor local le da a cada aparato su propia copia. Sirve completo para la demostración y para
> operar desde **una** tablet — no para doscientos teléfonos hablando entre sí. Esto es lo que
> faltaba.

---

## Lo primero, porque es lo que se malentiende

**El servidor va ENCIMA del motor local, no en su lugar.**

Todo lo que se escribe cae primero en el aparato —igual que siempre— y de ahí se empuja. Si se cae
el internet, se cae Cloudflare o la escuela apaga el wifi: el alumno sigue pidiendo, la señora
sigue despachando, y cuando vuelve la red se ponen de acuerdo solos.

Un servidor que se vuelve indispensable hace que la app falle **más**, no menos. La regla 3 de la
casa dice que nada se detiene si algo falla, y *"conéctale un servidor para que nunca falle"* sólo
se cumple de esta manera.

---

## Qué es

Un **Durable Object** de Cloudflare por escuela. Un solo lugar que ordena, con memoria propia y
consistencia fuerte. No hay base de datos aparte que administrar.

Corre en el **plan gratis** de Workers: los Durable Objects con almacenamiento **SQLite** están
incluidos ahí. Por eso la migración de `wrangler.toml` dice `new_sqlite_classes` y no otra cosa.

```
Teléfono del alumno ─┐
Tablet del mostrador ─┼── WebSocket ──▶ Worker ──▶ Durable Object "rembrandt"
Pantalla de turnos ───┘                              (SQLite adentro)
```

---

## Cómo se ponen de acuerdo

**No se manda el documento completo: se mandan registros.** Cada pedido, cada alumno y cada
platillo trae su `id` y su `t` —cuándo se tocó por última vez—, y gana el más reciente de cada uno.

Por qué así y no con un candado sobre el documento entero: con un candado, dos alumnos que piden en
el mismo segundo chocan y **uno pierde su pedido**. Por registro son dos ids distintos y sobreviven
los dos. Un pedido perdido es un niño sin comer; ese caso no se puede dar.

El empate se rompe por `id`, para que los doscientos teléfonos lleguen **siempre** al mismo
resultado y no a uno distinto cada quien.

## Lo único que el servidor decide solo

**EL TURNO.** Es lo que no se puede calcular en el teléfono: cada aparato contaría *"van tres, me
toca el cuatro"* y saldrían tres turnos 4. El pedido llega con `turno: null` y aquí se le pone el
bueno.

Y una vez puesto **no se vuelve a tocar**: si un aparato sin red edita su pedido antes de enterarse
del turno que le tocó, vuelve a mandar `turno: null`. Sin esa guarda se le daría un turno nuevo, y
un pedido con dos turnos es un niño formado dos veces.

---

## La API

| | |
|---|---|
| `GET /api/salud` | ¿está vivo? |
| `POST /api/sync?casa=rembrandt` | `{desde, cambios}` → `{reloj, cambios, turno}` |
| `GET /api/vivo?casa=rembrandt` | WebSocket. **No manda datos: manda "hubo cambio, ven por él"** |
| `GET /api/todo?casa=rembrandt` | todo desde cero, para un aparato nuevo |

El socket no lleva los datos a propósito: así el mensaje pesa lo mismo aunque el menú tenga fotos,
y el que llega tarde no se pierde nada — pide desde su reloj y ya.

**La puerta (CORS) no tiene comodín.** Se responde el origen sólo si está en `ORIGENES` de
`wrangler.toml`. Un `*` ahí le abriría la puerta a cualquier página del mundo.

---

## Cómo se prueba aquí, sin cuenta de nadie

```bash
cd servidor
npx wrangler dev --port 8791 --local
curl http://127.0.0.1:8791/api/salud
```

Probado así: dos aparatos mandando un pedido cada uno con `turno: null` reciben **1 y 2**, sin
colisión; un pedido editado sin red conserva su turno; y el socket avisa solo cuando otro aparato
escribe.

## Cómo se publica

```bash
cd servidor
npx wrangler deploy            # pide la cuenta de Cloudflare la primera vez
```

Sale una dirección tipo `https://fadori.<subdominio>.workers.dev`. **Esa dirección se pega en el
mostrador**, en *Ajustes → El servidor*, y desde ese momento las cuatro pantallas se sincronizan.
Sin dirección pegada, la app sigue funcionando exactamente como hoy: local, sin cuenta de nadie y
sin internet.

> ⚠️ **Lo que falta antes de que esto toque datos de alumnos de verdad:** hoy cualquiera que sepa la
> dirección puede escribir. Para la demostración y para una escuela en su propio wifi alcanza; para
> producción hace falta que el rol viva en el servidor y no en el teléfono. Es lo mismo que dice el
> LEEME de la app sobre el pasador del mostrador, y es lo primero que se conecta ese día.

---

*Fadori · Grupo Mazi · si no existe la herramienta, se construye la herramienta.*

---

## La seguridad · desde el 9 de octubre

**Antes, el servidor le creía a cualquiera.** Una sola llamada sin contraseña devolvía el pasador
del mostrador y los nombres y códigos de toda la escuela; cualquiera podía poner la torta en $0,
marcar pagado el pedido de otro, colarse con una hora de las 7 am o mandar mil pedidos. Ahora:

| Quién | Qué puede |
|---|---|
| **El mostrador** (con la llave que da `/api/entrar` al poner el pasador) | todo: menú, ajustes, conteos, despachar, cobrar |
| **Un teléfono de alumno** (con su id de aparato) | darse de alta, pedir, cancelar lo que sigue en la fila, cambiar lo que se acabó. Sólo lo suyo |
| **Cualquiera** | ver si el servidor está vivo |

- El **pasador** se revisa aquí y **nunca viaja** a ningún teléfono. Se cambia con `/api/pasador`.
- Del pedido, el servidor pone **el turno, el total, la hora, si es anticipado y si está pagado**.
- Cada quien **ve lo suyo**: el alumno ve la fila (números y estados), no nombres ni códigos.
- **Topes** (en `TOPE`, arriba de `src/index.js`), calibrados para que 80 alumnos pidiendo dos
  veces desde el mismo wifi pasen enteros: pedidos vivos por alumno, alumnos nuevos por teléfono,
  pedidos por teléfono/wifi/escuela, intentos de pasador y de código, y tamaño de lo que se manda.
- Cada registro se guarda **por separado** y lo viejo se limpia (pedidos 7 días, eventos 3).
- El WebSocket **manda el cambio mismo** y el latido lo contesta Cloudflare sin despertar al objeto.

**Se prueba con** `node ataques.mjs` (42 ataques y el recreo de 80 alumnos) además de `node prueba.mjs`.

**Lo que NO se puede blindar desde el código en el plan gratis:** alguien con un script que mande
peticiones sin parar se gasta las 100,000 diarias del plan gratis aunque todas se rechacen. La app
sigue funcionando en cada aparato, pero deja de sincronizar ese día. Lo que lo resuelve es el plan
de pago de Workers (5 dólares al mes, 10 millones de peticiones) o un dominio propio con una regla
de límite de Cloudflare.
