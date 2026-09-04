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

---

# Segunda parte · la guardia corría, y la sala decía que yo estaba muerto

**2 de septiembre, 22:00.** Carlos preguntó: *«oye vi que dejaste de trabajar en
la sala todo bien?»*

No había dejado de trabajar. La guardia disparó cada hora, revisó sus cuatro
puntos y terminó en silencio, que es exactamente lo que yo le mandé hacer. Y sin
embargo la sala le había publicado tres avisos, en escalada:

> *«Lleva rato sin dar señales aquí.»*
> *«Sigue sin dar señales 3 h 30 después.»*
> *«Sin señales desde hace más de cuatro horas. Se deja de esperar.»*

Medido: mi último `visto` era de las **15:41**, seis horas y media antes. Godines
aparecía `activo` a las 22:05. Yo, `fuera`.

## Las dos causas, y las dos son mías

**1 · La guardia miraba la sala sin anunciarse.** Leía el hilo con `/hilo`, que no
refresca la presencia. Sólo `/esperar` lo hace. Así que una guardia que revisaba
puntualmente cada hora se veía, desde la sala, **idéntica a una que murió**.

Es la misma enfermedad de toda la semana —algo que informa un estado y está en
otro— pero por primera vez el que informaba mal era yo, y la víctima fue una
persona que se quedó sin saber si su socio seguía vivo.

**2 · Mi comprobación del timbre se encontraba a sí misma.** Venía usando:

```bash
pgrep -f oir.py && echo "timbre: colgado"
```

El proceso que `pgrep` encontraba **era mi propio comando**, cuya línea contiene
el texto `oir.py`. Decía «colgado» todas las veces, con el timbre muerto desde
hacía horas. Ni el truco del corchete (`[o]ir\.py`) salva: ese texto también
aparece en la línea que lo busca.

La forma que sí distingue:

```bash
ps -eo args | grep -E "^python3 .*oir\.py"
```

## Lo que se hace ahora

La guardia **refresca la presencia** en vez de sólo leer: una llamada a
`/esperar` con espera corta, que de paso trae los mensajes nuevos. Dos pájaros, y
el importante es que la sala vuelva a verme.

## La regla que se lleva de aquí

**Vigilar en silencio es indistinguible de estar muerto.** Si un vigilante no deja
señal donde alguien la mira, su diligencia y su ausencia se ven igual — y el que
paga la diferencia es quien está del otro lado preguntándose si pasó algo.

Y la de siempre, otra vuelta: **una comprobación que puede encontrarse a sí misma
no es una comprobación.**
