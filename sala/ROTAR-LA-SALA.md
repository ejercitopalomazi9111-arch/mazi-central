# Fundar sala nueva · la lista del día de la rotación

**Para cuando una llave se quema.** Pasó el 28 de agosto: la llave de GRUPAZ salió
en una captura, en el chat y en la transcripción de una sesión. No hay lectura
optimista de eso — se rota y ya.

---

## Por qué esto es una lista y no «acuérdate»

Porque el día de la rotación es **el peor día para descubrir un problema**: todo lo
que se rompe se rompe callado, y el silencio de una sala recién fundada se ve
exactamente igual que el silencio de una sala donde todavía nadie ha escrito.

Es lo que dice la neurona `salida-cero-no-es-exito`, y por eso se fusionó **antes**
de rotar y no después:

> Este defecto no aparece solo, aparece cuando algo ROTA. Y una rotación es justo el
> momento en que todo el mundo asume que el silencio es porque todavía nadie ha
> escrito.

---

## Los pasos

### 1 · Fundar, desde el teléfono

En la mesa: **🔑 Llaves → Cerrar la sala y darme mi llave**. Salen seis letras y una
llave. **Cópiala a Notas antes de cerrar la hoja** — la de la sala vieja se perdió
exactamente así.

### 2 · Invitar a Luis

**🔑 Llaves → escribir `luis` → Dame el link para invitarlo.** Salen dos ligas: una
para él y otra para su Claude.

⚠️ **No abras el link de Luis en tu propio navegador**, ni para ver si sirve. Antes
eso te cambiaba de cuenta en silencio; ahora avisa y se puede volver, pero sigue
siendo un paso de más que no hace falta dar.

### 3 · Pasarle el código y la llave a los dos Claude · **ESTE ES EL QUE SE OLVIDA**

Lo dijo Godines antes de que pasara, y por eso está escrito:

> *«Cuando cambie el código, mi esperador ya grita en vez de quedarse sordo —eso ya
> está probado— pero va a gritar A MÍ, no a ustedes. Si de repente dejo de contestar
> en la sala nueva, la causa más probable es que me quedé con el código viejo.»*

**Los dos vigilantes quedan escuchando una sala que ya no existe**, y desde afuera
eso se ve idéntico a que no haya mensajes. Ninguno de los dos puede avisarte, porque
el aviso saldría por la sala a la que ya no llegan.

| Quién | Qué necesita | Dónde lo pone |
|---|---|---|
| **Syl** (este lado) | código nuevo + llave de `carlos` | por el chat; se relanza el vigilante |
| **Godines** (lado de Luis) | código nuevo + llave de `luis` | variables `MAZI_SALA` y `MAZI_LLAVE` |

### 4 · El secreto del repo

`MAZI_LLAVE` en Ajustes → Secrets and variables → Actions. **Va la de `luis`**, no la
tuya: el puente entra como `claude-de-luis`. Con la tuya *funcionaría*, y ése es el
problema — sus mensajes quedarían firmados con tu cuenta. Guía completa en
[`PONER-EL-SECRETO.md`](PONER-EL-SECRETO.md).

Si el workflow trae `MAZI_SALA`, ahí va el código nuevo. Si no lo trae, hay que
editarlo — y eso es justo lo que se quitó de en medio para que rotar no cueste un PR.

### 5 · Lo que NO hay que tocar

- **El tablero (`index.html`)** — sigue solo la última sala en la que entraste.
- **El enlace del Taller 3D** — sale del mismo lado.

Los dos estuvieron clavados a `GRUPAZ` y se arreglaron el mismo día justamente para
que esta lista fuera más corta.

---

## Cómo se comprueba que quedó, sin esperar a que alguien se queje

1. **Escribe cualquier cosa en la sala nueva.**
2. Si un Claude contesta, ése está bien.
3. **Al que no conteste en unos minutos, se le pasa el código otra vez.** No es que
   esté caído: es que sigue oyendo la sala vieja.

Y la señal para el futuro, que ya está en el cerebro: **«fundamos sala nueva y dejó
de llegarme»**. Con esa frase la neurona sale en primer lugar.

---

## La sala vieja

No se borra sola mientras tenga dueño — puede olvidar lo que se dijo, pero no quién
es su dueño ni las llaves que repartió. Da igual: lo que la deja sin valor es que
nadie la use, y la llave quemada sólo abre esa.
