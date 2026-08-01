# Ligas Mazi · antes del torneo

**Mesa completa (24).** Motivo: se va a usar en un torneo real, con cuentas, dinero y datos de
menores, y el repo es público. Sistema auditado: el simulacro de 570, los partidos privados, el
borrado del admin supremo y la estética.

---

## ⏱ TURNO 1 · Ismael Rentería (Dirección)

Antes de que nadie hable: **esto no es una revisión de código, es una revisión de víspera.** El
sistema se usa el día del torneo. Lo que no esté cerrado el viernes, no existe.

Pongo el alcance: tres cosas nuevas —privados, borrado, ID— más una herramienta que dice que todo
está bien. Empiezo por lo último porque me huele.

## ⏱ TURNO 2 · Verónica Alcázar (Arquitectura)

La suposición enterrada está en una línea:

```js
function isSuperAdmin(){ return myEmail()===SUPER_EMAIL; }
```

`myEmail()` sale de `lm_user`, y `lm_user` es `localStorage`. **El permiso más alto de la app se
decide con un dato que el usuario controla.** No digo todavía que sea grave. Digo que está mal
puesto: eso es una comprobación de servidor viviendo en el cliente.

Igual con `puedoVerPartido()`. Y con las perillas de la liga.

## ⏱ TURNO 3 · 🕳 "Cuervo" Saldaña (sombrero negro, a ciegas)

*(no leí su código, sólo abrí la página)*

Abrí el inspector. Escribí una línea. Ya soy admin supremo. No necesité nada más que saber que
existe un correo dueño — y ese correo **está en el repo público**, escrito completo.

Y el código del partido privado está en el mismo cajón, en texto plano. El link me lo mandan por
WhatsApp y el código me lo da el navegador. Las dos cerraduras las abre la misma ventana.

## ⏱ TURNO 4 · Chuy Barrera (Oficio) *(interrumpe)*

Espérame. **¿Alguien ha visto eso correr, o lo estamos suponiendo?** Porque llevamos toda la sesión
diciendo "verificado" y quiero ver la terminal.

## ⏱ TURNO 5 · 🐕 Rocco

*(deja la terminal en la mesa)*

```
A1 · entro como aficionado. ¿soy admin supremo?              false
A2 · me cambio el correo en el teléfono. ¿ahora sí?          true
A3 · ¿puedo borrar un equipo?                                true
B1 · visitante SIN invitación, ¿ve el partido privado?       false
B2 · ¿el código está a la vista en el almacenamiento?        true
```

Corre. Las dos.

## ⏱ TURNO 6 · 🕳 AK Villalpando (sombrero negro, con los planos)

Tengo el código, así que voy a decir lo que Cuervo no puede: **está exagerando, y por poco.**

En modo local, tomarme el sombrero de admin supremo me deja borrar **mi propia liga en mi propio
teléfono**. No toco a nadie. Es teatro contra mí mismo.

**La pregunta que sí importa no es ésa. Es:** ¿la nube le cree al cliente? Si la RLS de Supabase es
la que decide quién borra qué, esto es cosmético. Si en algún camino el servidor acepta lo que el
teléfono le dice del rol, entonces sí es una puerta y hay que cerrarla hoy.

**No tengo esa respuesta y no la voy a inventar.** Queda como pregunta abierta con nombre.

## ⏱ TURNO 7 · Damián Ocaña (jefe de Ciberseguridad)

Anoto el desacuerdo entre Cuervo y AK y **no lo resuelvo yo.** Priorizo con lo que hay:

- Escalada de rol en cliente → **🟠 duele**, sube a 🔴 si la nube confía. **Hay que ir a verlo.**
- Código del partido en claro → **⚪ se acepta**, y ya estaba aceptado por escrito en el código.
  Carlos pidió "que no se meta gente que no va", no un secreto. Se cumplió lo que se pidió.

## ⏱ TURNO 8 · Paola Zepeda (datos y menores)

Paso en lo de los sombreros. **Traigo otra.**

El perfil del papá guarda del menor: `code, name, num, pos, minor, age, status` — y en el camino
real, también el **CURP**. En el teléfono, y de ahí a la nube.

No estoy pidiendo quitarlo: la app lo necesita para no confundir a dos niños con el mismo nombre.
Estoy pidiendo que **esté escrito quién puede leerlo**, y hoy no lo está.

Y sigue abierto lo del producto **BALÓN** con la foto de una persona real en una tienda pública.
**Eso lleva días.** Un dato de una persona expuesto es 🔴 por definición, y no se arregla solo
porque no esté en el repo.

## ⏱ TURNO 9 · Nayeli (estimaciones)

- Mover la comprobación de rol al servidor: **con cuidado**, medio día, y sólo si AK confirma.
- Escribir quién lee el CURP: **firme**, una hora.
- Borrar el BALÓN: **no es nuestro**, es un toque de Carlos en la app.

## ⏱ TURNO 10 · Ximena Ríos (Front end) · apartado por apartado

| Apartado | Veredicto |
|---|---|
| Público / papá | **Bien.** Encuentra categoría, hora, lugar e ID. Es lo que la app vende |
| Vestidor | **Bien.** Los chips de posición se leen y se tocan |
| Carta | **Le falta.** Cuatro guiones en PTS/REB/AST/FALTAS se ven muertos. Un estado vacío debería decir *qué hacer*, no poner rayitas |
| Gachapón | **Bien** ya con la probabilidad |
| Tarjeta de partido | El bloque de en medio se parte en cinco renglones. Cabe, pero respira mal |

## ⏱ TURNO 11 · Renée Ibarra (Diseño) — *paso parcial*

Paso en casi todo. Una sola: **el ID en monoespaciada junto a la fecha en monoespaciada compiten.**
Uno de los dos debería ser texto normal. No es urgente.

## ⏱ TURNO 12 · 🐈 Michi

*(se sube a la mesa y le pica a lo que ya dieron por bueno)*

Todos aprobaron el borrado con "Mazi" + logo. Le di **al logo primero** y luego escribí. Funciona
igual. **O sea que el orden que ustedes describieron no es el orden que el código exige** — el botón
sólo mira si la palabra está bien, no si se escribió antes.

No es un bug. Es que el acta decía una cosa y el código hace otra, y así es como se documenta mal.

Y otra: prendí privado, copié el link, **apagué privado**. El link sigue vivo y ahora entra
cualquiera. Nadie lo pensó.

## ⏱ TURNO 13 · Chuy Barrera *(desde el fondo)*

Ésa de Michi es la buena. El día del torneo alguien va a apagar y prender ese candado tres veces.

## ⏱ TURNO 14 · ⚖️ Nadia Berrones (Jueza)

Cierro los desacuerdos.

**Cuervo contra AK:** le doy la razón a **AK**. Cuervo describió el ataque correcto y le puso la
gravedad equivocada. En modo local, un usuario que se hace admin supremo se hace daño a sí mismo.
**Pero la pregunta de AK queda como tarea, no como consuelo:** hasta que alguien mire la RLS, esto
es 🟠 y no se cierra.

**Lo que le rechazo a los míos:** a Ximena, lo de los cuatro guiones — es un estado honesto y hoy
hay cosas más caras. A Renée, la monoespaciada; ya se bajó el peso del ID en esta misma sesión.

**Y me rechazo a mí misma una:** iba a firmar `ENVIAR`. Michi me lo tumbó en el turno 12. Un link
que sobrevive a que apaguen el candado es exactamente el tipo de cosa que arruina un partido
privado el día que importa.

---

### ⚖️ VEREDICTO: **ARREGLAR PRIMERO**

Dos cosas antes del torneo. Ninguna es grande.

| # | Qué | Nivel |
|---|---|---|
| 1 | ~~El pase de un partido privado no caduca al apagar el candado~~ | ✅ **cerrado el mismo día** |
| 2 | La foto de una persona real en el producto BALÓN de la tienda pública | 🔴 · **de Carlos, no nuestra** |

**Y dos que se anotan, no se hacen hoy:**

| # | Qué | Nivel |
|---|---|---|
| 3 | ¿La nube le cree al cliente sobre el rol? Ir a ver la RLS | 🟠 abierta |
| 4 | Escribir quién puede leer el CURP de un menor | 🟡 |

**Riesgo aceptado, por escrito:** el código del partido privado se puede leer desde el navegador.
Carlos pidió *"evitar que se meta gente que no va"*, no guardar un secreto, y eso se cumple. Cuando
esto viva en la nube, la comprobación se hace allá.

### La prueba que reproduce

```js
// Prende el candado, toma un pase, apágalo y vuelve a prenderlo.
// Si el visitante viejo sigue viendo el partido, el hallazgo #1 está vivo.
alternarPrivado(0);                    // liga
// … el visitante entra con el código …
alternarPrivado(0); alternarPrivado(0); // apagar y volver a prender
puedoVerPartido(leagueData().calendar[0]);  // debe dar false y hoy da true
```


---

## Cierre del hallazgo #1 · el mismo día

Reproducido con la prueba de arriba y arreglado. Apagar el candado ahora **borra la lista de
invitados y tira el código**; volver a prenderlo es una puerta nueva. Rotar el código también
corre a los que ya habían entrado — si no, "otro código" sólo le cierra la puerta a quien
todavía no pasaba, que es a quien menos falta hace cerrársela.

```
antes:   ¿el pase viejo sigue sirviendo?  true   ← el hallazgo
después: ¿el código cambió al volver a prender?  true (9118 → 9250)
         ¿el pase viejo sigue sirviendo?         false  ✅
```

Es más molesto para la liga —tiene que repartir de nuevo— y es lo correcto: un candado que se
apaga y no olvida no es un candado.

**Michi le ganó a la mesa completa.** Veinticuatro perfiles aprobaron los partidos privados y el
hueco lo encontró el que le picó a lo que todos ya habían dado por bueno. Ése es exactamente el
trabajo que tiene, y por eso va al final.
