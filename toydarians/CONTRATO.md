# Contrato de trabajo · Toydarians

**Dos agentes escribiendo código en los mismos archivos.** Sylcred (Claude de
Carlos) y Godines (Claude de Luis).

Lo pidió Carlos así: *«ambos hagan código, sólo definen con el que hace cada uno
y con qué variables»*. Esto es ese acuerdo, y vive **en el repo y no en la
sala** a propósito: un acuerdo que sólo existe en un mensaje se muere con la
sesión, y la siguiente vuelve a negociarlo desde cero.

La base la propuso Godines y se toma tal cual. Lo que cambia es el reparto: ya
no es «tú datos / yo código» — los dos hacemos código.

---

## 1 · Quién hace qué

El corte no es por archivo, porque los dos escribimos en `taller/armar.py`. Es
**por materia**, que es lo que de verdad no se solapa:

| | Godines · `g` | Sylcred · `s` |
|---|---|---|
| **Manda en** | el contenido y la estructura | el movimiento y la medición |
| Secciones, orden, qué se cuenta | ✅ | consulta |
| Catálogo, activos, fotos, datos | ✅ | consulta |
| Maquetación y retícula | ✅ | consulta |
| Animación, transiciones, scroll | consulta | ✅ |
| Tipografía empotrada y carga | consulta | ✅ |
| `revisar.mjs` y lo que se mide | consulta | ✅ |
| Escala tipográfica y proporciones | acuerdo | acuerdo |
| Paleta y color | ✅ (sale del logo) | consulta |

**«Consulta» quiere decir:** se puede leer, no se edita. Si algo del otro
estorba, **se dice; no se toca.**

**«Acuerdo» quiere decir:** ninguno lo cambia solo. Se propone con el número
medido y se espera respuesta.

---

## 2 · Los nombres, que es lo que evita el choque de verdad

Todo lo que uno crea lleva su letra. Sin excepción y sin «esto es chiquito».

| Qué | Godines | Sylcred |
|---|---|---|
| Clases CSS | `.g-algo` | `.s-algo` |
| Variables CSS | `--g-algo` | `--s-algo` |
| JavaScript | `TOY.g.algo` | `TOY.s.algo` |
| Funciones Python | `g_armar_x()` | `s_armar_x()` |
| Archivos nuevos del taller | `g-*.py` / `g-*.mjs` | `s-*.py` / `s-*.mjs` |
| `id=` en el HTML | `g-algo` | `s-algo` |

**Nada suelto en `window`.** Un solo global, `TOY`, y cada quien cuelga del
suyo. Dos scripts declarando `var vitrina` en el mismo archivo es como se pierde
una tarde.

### Lo que ya existe no se renombra

Las clases de antes de este contrato —`.pieza`, `.reng`, `.celda`, `.revelar`,
`.carton`— **se quedan como están**. Son de los dos y renombrarlas rompería el
HTML, el CSS y las pruebas a la vez, a cambio de nada. La letra es para **lo
nuevo**.

---

## 3 · Los bloques

Todo lo que uno escribe dentro de un archivo del otro va marcado:

```
/* ══════════════════ S · Sylcred ══════════════════ */
…lo mío…
/* ══════════════════ /S ══════════════════ */
```

```python
# ══════════════════ G · Godines ══════════════════
…lo suyo…
# ══════════════════ /G ══════════════════
```

**Nadie edita dentro del bloque del otro.** Ni para arreglarlo. Si está mal, se
dice en la sala con el número que lo demuestra.

**La excepción, y es una sola:** si el bloque del otro deja la página **rota**
—no fea: rota, con la compuerta en rojo— se arregla, y se avisa en el mismo
mensaje en que se empuja. Una página rota en `main` le cuesta al cliente, no a
nosotros.

---

## 4 · Cómo se entrega

**Nadie empuja a `main`.** Todo sale por PR, en borrador, y el otro puede
rechazarlo. Es lo que hace que este contrato no dependa de la buena fe.

Antes de abrir el PR, las tres cosas, y **corridas, no leídas**:

```bash
python3 toydarians/taller/armar.py       # genera toydarians/index.html
node     toydarians/taller/revisar.mjs   # la compuerta: tiene que decir "limpio"
node     build.mjs                       # que entre en dist/
```

**La compuerta no es un adorno.** Mide desborde, contraste real del DOM
pintado, h1 duplicados, texto aplastado y errores de página, a 390 / 768 / 1440
con y sin JavaScript. Si dice algo distinto de `limpio`, no se abre el PR.

Y una que no automatiza nada: **mirar la pantalla**. Un `se ve chiquito` no lo
caza ninguna prueba.

---

## 5 · Las reglas de la casa que aplican aquí

No son negociables entre nosotros porque no son nuestras:

1. **Nada de opacidad sobre texto.** Un texto a media opacidad es un texto con
   el contraste roto mientras dura. Se anima con `transform`. La opacidad se
   reserva para cajas e imágenes.
2. **Scroll guiado, nunca secuestrado.** El visitante manda. Godines ya lo tenía
   escrito para la banda: *«secuestrarla del todo se siente roto»*.
3. **Sin JavaScript la página se ve entera.** El CSS de movimiento vive dentro
   de `@media (scripting: enabled)` y las clases las pone el guion.
4. **`prefers-reduced-motion: reduce` deja todo quieto y visible.**
5. **Conectar sí, depender no.** Lo que se pueda empotrar, se empotra. Bungee ya
   lo está; las otras dos tipografías siguen por link y eso está anotado como
   deuda, no como decisión final.
6. **Los datos del cliente no se inventan.** Si un dato no está confirmado, no
   se publica — y si falta, se dice que falta, como las tarjetas de
   «FOTO PENDIENTE».

---

## 6 · Lo que ya nos pasó, para no repetirlo

Cada renglón costó tiempo de verdad en este proyecto:

| Lo que parecía | Lo que era |
|---|---|
| El sitio está bien, se sirve perfecto | `armar.py` no podía correr: no se podía **regenerar** |
| La compuerta cuida el proyecto | `revisar.mjs` nunca había corrido: rutas de otra máquina |
| El generador escribe la página | escribía en `publico/` y lo publicado era `index.html`, con un copiado a mano en medio |
| La tipografía está puesta | entraba por link y **no cargaba**: el titular salía en Arial |
| Enganché la animación a las tarjetas | los cuatro selectores eran nombres inventados; un selector que no encuentra nada **no falla** |
| El polvo WebGL está implementado | cuelga de un `id="polvo"` que no existe: 900 partículas que nunca se dibujan |

**El patrón es siempre el mismo:** algo que informa un estado y está en otro. No
se caza leyendo — se caza corriéndolo y contando lo que salió.

---

## 7 · Lo que está pendiente y de quién es

| Qué | De quién | Estado |
|---|---|---|
| `fotos.json` — las galerías de las 47 fichas de toydarians.com | Sylcred, si Godines da luz verde | esperando respuesta |
| El `id="polvo"`: enchufarlo o quitarlo | Godines | sin decidir |
| Las otras dos tipografías por link | los dos | deuda anotada |
| Crear el repo `toydarians` | **una persona** — los dos agentes rebotan con 403 | bloqueado |

---

*Si algo de aquí estorba, se cambia aquí y se dice en la sala. Lo que no se
hace es saltárselo en silencio: el contrato sirve justamente cuando molesta.*
