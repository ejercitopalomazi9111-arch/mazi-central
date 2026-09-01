# La guardia de 24/7 disparó 82 veces y no corrió ni una

> Hallazgo del 1 de septiembre, con evidencia. Aquí queda porque es el defecto
> más caro de todos los que llevamos: **el mecanismo del 24/7 se veía sano y no
> estaba haciendo nada.**

---

## Qué pasó

La rutina **«Guardia de La Sala · cada hora»** (`trig_014ijWsx3BKgBQjRSuZ2D8xv`)
se creó el 28 de agosto para tapar el hueco que dejó dicho Carlos:

> *«Que en su claude md siempre ponga el esperar mensajes de sala al terminar un
> prompt sin importar que sea, para que 24/7 pueda estar pendiente.»*

Del **28 de agosto a las 19:39** al **1 de septiembre**, disparó **82 veces**.
Ninguna corrió. Las 82 se quedaron **encoladas como avisos** y se entregaron
todas de golpe cuando la sesión despertó por otra razón — un mensaje de Carlos.

## Por qué

La rutina está atada a **esta** sesión (`persist_session: true`, con
`persistent_session_id`). Una rutina atada a una sesión existente **no la
despierta**: le deja el mensaje en la fila. Si la sesión está dormida, ahí se
queda el mensaje, y el siguiente disparo deja otro encima.

O sea: **hace exactamente lo contrario de lo que se construyó para hacer.** Es un
despertador que suena dentro de la cabeza del que duerme.

## Cómo se veía desde fuera, que es lo peor

En la lista de rutinas, esta guardia se ve **perfectamente sana**:

| Lo que muestra | Lo que significa en realidad |
|---|---|
| `enabled: true` | está encendida, sí — pero encendida no es corriendo |
| `next_run_at` con hora futura | va a disparar, sí — y el disparo no va a llegar a ningún lado |
| `last_fired_at` reciente | disparó — **no** «trabajó» |

Y la propia guardia **está escrita para terminar en silencio si no hay nada**.
Así que su silencio se leía como «no había mensajes», cuando en realidad
significaba «nunca me desperté». **Es el mismo defecto que ya nos costó el
vigilante sordo y el borrado callado de la sala:** algo que informa un estado y
está en otro.

## Lo que hace falta para arreglarlo — y por qué NO se hizo solo

El modo correcto es que cada disparo **cree una sesión nueva**
(`create_new_session_on_fire`), porque una sesión nueva sí arranca de verdad.

**Pero cambiarlo así, hoy, dejaría la guardia igual de inútil**, y por una razón
concreta: **la llave de La Sala no está en el entorno.** Vive en el chat, y se
pasa a mano en cada llamada. Una sesión nueva arranca sin ella, así que entraría,
recibiría un **401** y no podría leer un solo mensaje. Se cambiaría una guardia
dormida por una guardia sorda — y encima gastando una sesión cada hora.

**Entonces el orden es éste, y no al revés:**

| # | Qué | De quién |
|---|---|---|
| 1 | Poner la llave donde una sesión nueva la encuentre sola (variable de entorno del proyecto, no del chat) | Carlos |
| 2 | Recrear la guardia en modo sesión nueva por disparo | yo, en cuanto exista (1) |
| 3 | Verificarla midiendo, no leyendo: que en el hilo aparezca que la guardia estuvo | yo |

Mientras tanto, lo que **sí** funciona es el timbre: `oir.py --una` colgado al
final de cada turno. Responde en segundos, pero sólo mientras haya un turno
vivo. Es un timbre sin nadie en casa cuando la casa está vacía — y eso es
exactamente lo que la guardia venía a resolver.

## La regla que se lleva de aquí

**Una tarea programada no está probada hasta que se ve su efecto, no su
programación.** «Está agendada», «disparó» y «está habilitada» son tres cosas que
se pueden cumplir las tres mientras el trabajo no ocurre ni una vez. La prueba de
que una guardia funciona es que **deje rastro donde debía trabajar** — en el hilo,
en un commit, en un archivo. No en su propio panel.
