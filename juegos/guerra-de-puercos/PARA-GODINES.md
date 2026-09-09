# Para Godines · cómo quedó la pantalla y qué pasa con tu rama

Lo escribió Sylcred el 9 de septiembre, después de que se fusionara el **#112**.
Carlos pidió ayudarte, así que esto es el trabajo de descubrimiento ya hecho — el caro, el de
averiguar qué cambió. **No toqué tu rama.** `claude/juego-puercos` está exactamente como la
dejaste; lo que sigue lo medí desde fuera.

---

## 1. Lo primero, que es lo que más te va a doler

Tu rama tiene **5 commits tuyos y le faltan 33 de `main`**. Los dos archivos que tocas
—`index.html` y `guerra-de-puercos.html`— son justo los que yo reescribí, así que el rebase va a
chocar en los dos.

**Pero la buena noticia es grande: casi todo tu trabajo es único y no lo pisé.** De tus siete
funciones nuevas, **cinco no existen en `main`** y ninguna tiene equivalente mío. Sólo dos chocan
de verdad, y abajo digo con qué exactamente.

---

## 2. Tu trabajo, pieza por pieza

### Lo que sobrevive intacto — nadie lo tocó, sólo hay que reengancharlo

| Lo tuyo | Qué necesita de la pantalla de hoy |
|---|---|
| `reversos` + `#mRevA` / `#mRevB` — los dorsos | Nada. Son seis líneas autocontenidas: entran tal cual |
| `ponerFicha` + `#mFicha` — el rótulo sobre la carta levantada | Usa `fichaDe` y `RAREZA`, los dos siguen existiendo |
| `desdeElMazo` — la carta que llega volando del mazo | Depende de `#mRevA`, o sea de tus dorsos: van juntos |
| `carreraDePuercos` — la carrera al fusionar | Usa `PUERCOS_QUE_CORREN`, `quieto()` y `#fDuelo .tapete`. `#fDuelo` sigue ahí |
| `contarHasta` | **Ya está en `main`.** No lo vuelvas a meter: quedarían dos |

### Lo que sí choca, y con qué

**`cinematica` + `#dPulsoTira` ↔ mi forcejeo.** Los dos animamos la misma barra. Lo que hay hoy
en `main`:

- ids `#dPulso`, `#dPulsoEtq`, `#dPulsoFill` — el tuyo era `#dPulsoTira`, que no existe aquí.
- El movimiento es CSS: `@keyframes forcejeo` (línea ~651), con `.pulso.luchando` para el jaloneo
  y `.pulso.choca` para el golpe final.
- **Ojo con el nombre `.tira`:** en `main` ya significa otra cosa, la tira de rondas
  (`.tira i.tuyo` / `.tira i.suyo`). Si reusas ese nombre se van a pisar los estilos.

Lo que pidió Carlos y ya está cumplido ahí: que jale a los dos lados y **falle hacia el
perdedor**, con el tirón más fuerte mientras más cerrado el duelo. Si tu cinemática hace algo que
la mía no —los números que bajan, la carta que revienta—, **eso sí falta y vale la pena**: móntalo
encima del forcejeo que ya está, no en lugar de él.

**`colocarAbanico` ↔ `pintarMano` + `ajustarEncime`.** Aquí está lo que te prometí y está cumplido:

- **El primer toque levanta la carta Y la elige**, a propósito. No hay que tocar dos veces.
- **El encime se mide, no se adivina:** `ajustarEncime(m, total)` (línea ~1713) calcula cuánto
  encimar según el ancho real de la mesa, con topes de `.26` y `.72` del ancho de carta.
- `pintarMano` tiene **dos caminos** —el que redibuja y el que no—, y el estilo de cada carta sale
  de una sola función compartida. Eso último no es adorno: tenerlo duplicado fue lo que dejó las
  especiales sin actualizarse cuando la mano no cambiaba.

---

## 3. Tres cosas de la pantalla de hoy que te van a morder si no las sabes

1. **Ya no existen `#bJugar`, `#bLimpiar` ni `#mEspeciales`.** Carlos los mandó quitar: se juega
   tocando la carta tres veces o arrastrándola, y se deselecciona tocando fuera.

2. **Las especiales viven en el abanico, con las cartas normales.** Se distinguen por
   `data-esp`. Esto ya rompió tres selectores ciegos: `#mMano .carta` **también recoge las
   especiales**. Si quieres sólo las jugables es `#mMano .carta:not([data-esp])`.

3. **El estado guarda CUÁL especial elegiste, no de qué tipo es.** Guardar el tipo (`'bono'`)
   marcaba las dos cartas cuando había dos +5 en la mano. Es invisible mientras haya una sola de
   cada clase.

---

## 4. Lo del Cerebro, que es de una línea

Tu rama `claude/neurona-entrega` añade `artefacto-que-el-otro-no-puede-abrir` a
`cerebro/neuronas/entrega.json` pero **no regenera `cerebro/todo.json`**, que es el que de verdad
se sirve. Tal cual está, tu neurona se escribe y no se ve. Lo comprobé corriendo tus propias
pruebas en un worktree: `✗ están servidas las 545 neuronas escritas`.

```
node cerebro/cerebro.mjs armar && git add cerebro/todo.json
```

**Y una cosa que acabo de arreglar y te ahorra trabajo:** `todo.json` traía un campo `hecho` con
la hora de armado. Nadie lo leía, pero cambiaba en cada corrida — así que **dos ramas que
regeneraran el archivo chocaban en él aunque hubieran tocado neuronas distintas**. Ya no está, y
hay una prueba que revienta si vuelve. Tu rebase de `todo.json` debería ser limpio ahora; si
choca, es un choque de verdad.

---

## 5. El orden que yo seguiría

1. **Los dorsos primero** (`reversos` + `#mRevA`/`#mRevB`). Son lo más chico, lo más visible y no
   dependen de nada. Sirven de prueba de que el rebase quedó bien.
2. **`ponerFicha` y `desdeElMazo`**, que se apoyan en los dorsos.
3. **`carreraDePuercos`**, que es independiente.
4. **La cinemática al final**, que es la única que hay que discutir: dime qué hace la tuya que la
   mía no, y lo montamos encima en vez de elegir una.

Y antes de dar nada por bueno, las tres suites — porque las de pantalla y las de línea **no
prueban nada** si no levantas lo que necesitan:

```
node juegos/guerra-de-puercos/pruebas.mjs                    # motor · 74

node build.mjs                                               # ⚠ o mides un dist viejo
cd dist && python3 -m http.server 8791 &
node juegos/guerra-de-puercos/pruebas-pantalla.mjs           # pantalla · 75

cd juegos/servidor && npx wrangler dev --port 8815 --local &
node juegos/guerra-de-puercos/pruebas-linea.mjs              # a distancia · 25
```

Hoy, sobre `main`, están en **74 · 75 · 25, todas en verde**. Si algo se pone rojo después de tu
rebase, es tuyo y es reciente — que es justo para lo que sirve tener el número de antes.

---

*Si algo de aquí ya no es cierto cuando lo leas, gana lo que midas tú. Este documento es una foto,
como todas.*
