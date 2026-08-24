# Manual de Ligas Mazi

> **Para qué es esto.** Para que cualquiera —tú, un coach, un papá que nunca ha usado una app de
> deportes— pueda abrir Ligas Mazi y saber exactamente qué hace cada cosa, qué pasa al tocarla y
> dónde se ve el resultado. Está escrito para leerse **mientras tienes el teléfono en la mano**.
>
> Cuando dice *"mira arriba a la derecha"*, es literal. Cuando dice *"toca X y va a pasar Y"*, es
> porque eso pasa. Si algo no coincide con lo que ves, lo primero que hay que revisar es la
> **versión** (§0.3): casi siempre es el caché del teléfono.

**Versión de la app que documenta este manual: `2026.08.01-f`**

---

## Índice

- [0 · Antes de empezar](#0--antes-de-empezar)
- [1 · Entrar: crear cuenta e iniciar sesión](#1--entrar-crear-cuenta-e-iniciar-sesión)
- [2 · Los seis sombreros](#2--los-seis-sombreros)
- [3 · Inicio (el hub)](#3--inicio-el-hub)
- [4 · Modo público · Marcadores](#4--modo-público--marcadores)
- [5 · Tabla de posiciones](#5--tabla-de-posiciones)
- [6 · El partido en vivo](#6--el-partido-en-vivo)
- [7 · La mesa](#7--la-mesa)
- [8 · Panel de la liga](#8--panel-de-la-liga)
- [9 · Vestidor (coach)](#9--vestidor-coach)
- [10 · Estrategias](#10--estrategias)
- [11 · Mi carta](#11--mi-carta)
- [12 · Gachapón](#12--gachapón)
- [13 · Tienda](#13--tienda)
- [14 · Casa del papá](#14--casa-del-papá)
- [15 · Notificaciones](#15--notificaciones)
- [16 · Perillas de la liga](#16--perillas-de-la-liga)
- [17 · Partidos privados](#17--partidos-privados)
- [18 · Directorio](#18--directorio)
- [19 · Perfil y tema](#19--perfil-y-tema)
- [20 · Preguntas que ya nos hicieron](#20--preguntas-que-ya-nos-hicieron)
- [21 · Lo que todavía NO hace](#21--lo-que-todavía-no-hace)

---

## 0 · Antes de empezar

### 0.1 · Qué es Ligas Mazi

Una app para **organizar y seguir ligas de baloncesto**. Hace tres cosas:

1. **La liga se organiza**: equipos, categorías, calendario, resultados, tabla.
2. **El partido se mide en vivo**: la mesa anota y todo el mundo lo ve al instante.
3. **El jugador tiene una identidad**: su carta, sus números, sus cosméticos.

### 0.2 · Dónde vive

`https://mazi-central.palomazi9111.workers.dev/ligas-mazi/`

Se abre en el navegador del teléfono. **No hay que instalar nada.** En iPhone conviene tocar
**Compartir → Añadir a pantalla de inicio** para que quede como una app de verdad, a pantalla
completa y sin la barra de Safari.

### 0.3 · La versión — lee esto antes de reportar un bug

Abre la app y **mira hasta abajo de la pantalla de entrada**, debajo de *"Hecho por Grupo Mazi"*.
Ahí dice algo como `v2026.08.01-f`.

**Ése es el número que importa.** Si reportas que algo no cambió y el número es viejo, no es la
app: es el caché de Safari. La solución:

1. Cierra la pestaña **por completo** (no basta con volver a Inicio).
2. Vuelve a abrir la dirección.
3. Comprueba que el número cambió.

Si aun así no cambia, en Ajustes → Safari → Borrar historial y datos.

### 0.4 · Modo local vs. nube

Abajo a la derecha de la entrada hay una etiqueta que dice **Modo local** o **Conectado**.

| | Modo local | Con nube |
|---|---|---|
| Dónde viven los datos | Sólo en **este** teléfono | En el servidor |
| Otros pueden ver tu liga | No | Sí |
| Si cambias de teléfono | Se queda todo atrás | Te sigue |

**En modo local todo funciona** —puedes armar la liga entera, anotar partidos y ver la tabla— pero
sólo tú lo ves. Es el modo para probar y para cuando no hay señal en el gimnasio.

---

## 1 · Entrar: crear cuenta e iniciar sesión

### 1.1 · La pantalla de entrada

Es lo primero que ves. De arriba a abajo:

1. **El logo y el nombre.**
2. **Una frase**: *"Organiza, juega, entrena y sigue tu liga."*
3. **Dos pestañas**: `Iniciar sesión` | `Crear cuenta`
4. Los campos que correspondan.
5. **Solo ver como invitado** — abajo del todo.
6. **La versión**, hasta abajo (§0.3).

### 1.2 · Crear cuenta

Toca **Crear cuenta**. La pestaña se pone naranja y cambian los campos.

**Paso 1 · ¿Qué eres?**
Aparece una fila de tarjetas. **Puedes elegir varias.** Toca las que apliquen:

| Sombrero | Elígelo si… |
|---|---|
| **Liga** | Tú organizas el torneo |
| **Equipo** | Eres dueño o coach de un equipo |
| **Jugador** | Vas a jugar tú |
| **Papá / tutor** | Tu hij@ va a jugar |
| **Aficionado** | Nada más quieres ver los partidos |

La tarjeta elegida se pone de color. Tocarla otra vez la quita. **Siempre queda al menos una.**

**Paso 2 · Tus datos**
- **Tu nombre** — como quieres que te vean
- **Correo** — tiene que tener forma de correo (`algo@algo.com`). No hace falta que sea real si
  estás probando, pero si quieres usar la nube sí
- **Contraseña** — mínimo 6 caracteres

**Paso 3 · Tu entidad**
Según el sombrero, aparece un campo más:
- Si elegiste **Liga**: el nombre de tu liga
- Si elegiste **Equipo**: el nombre de tu equipo
- Si elegiste **Jugador**: tu número de dorsal y tu posición

**Paso 4 · Toca `Crear cuenta ›`**

**Qué pasa:**
- Se crea tu cuenta y **entras directo** al hub
- Si elegiste Liga, tu liga queda creada **con un código** (algo como `L-3P9Z`)
- Si elegiste Equipo, igual: tu equipo tiene su código `E-…`
- Si elegiste Jugador, tienes tu código `J-…`
- **La cuenta queda guardada en este teléfono**, así que puedes cerrar sesión y volver

**Dónde se ve:** en el hub, arriba, dice tu nombre y tu sombrero. Y en el panel que corresponda
(liga, vestidor o carta).

> ⚠️ **Ojo:** crear cuenta **limpia** lo que hubiera de otra cuenta en este teléfono. Es a
> propósito: una cuenta nueva no debe heredar la liga, las monedas ni el rol de quien usó el
> teléfono antes.

### 1.3 · Iniciar sesión

Toca **Iniciar sesión**, escribe correo y contraseña, toca `Entrar ›`.

**Qué pasa:** vuelve todo como lo dejaste — tu liga, tu equipo, tu carta, tus monedas.

**Si dice "En este teléfono no hay una cuenta con ese correo":** o te equivocaste de correo, o esa
cuenta se creó en otro teléfono y estás en modo local. En modo local **las cuentas viven en el
aparato donde se crearon**.

**Si dice "Contraseña incorrecta":** el correo sí existe aquí, la contraseña no coincide.

### 1.4 · Entrar como invitado

`Solo ver como invitado ›` te mete sin cuenta, con el sombrero de **aficionado**. Puedes ver
marcadores, tablas y el directorio. **No puedes** administrar nada ni tener carta.

Sirve para enseñarle la app a alguien en dos segundos.

---

## 2 · Los seis sombreros

Todo en Ligas Mazi depende de **con qué sombrero entraste**. Es lo que decide qué pantallas ves.

| Sombrero | Su casa | Qué puede hacer |
|---|---|---|
| **Liga** | Panel de liga | Todo lo de la liga: equipos, calendario, resultados, perillas, mesa |
| **Coach / Dueño** | Vestidor | Su roster, posiciones, cambios en vivo, estrategias |
| **Jugador** | Mi carta | Su carta, sus números, sus cosméticos, el gachapón |
| **Papá / tutor** | Casa del papá | Sus hij@s, sus cartas, dónde juegan |
| **Mesa** | Mesa | Anotar el partido en vivo |
| **Aficionado** | Modo público | Ver marcadores y tablas |

### 2.1 · Cambiar de sombrero

Toca tu **avatar arriba a la derecha** → `Cambiar cómo entro`. Sale la lista de los sombreros que
elegiste al registrarte. Toca uno y la app se reacomoda entera: cambia la barra de abajo, cambian
las pantallas disponibles y cambia tu casa.

### 2.2 · Los candados

**Un sombrero no entra a lo de otro.** Si eres aficionado e intentas abrir el vestidor, la app te
regresa a tu casa sin decir nada. No es un error: es el candado.

**La excepción:** la mesa. Si la liga te asignó como mesa de un partido, puedes entrar a la mesa y
al marcador **aunque tu sombrero sea otro**, y sólo para ese partido.

---

## 3 · Inicio (el hub)

Es la pantalla a la que llegas al entrar y a la que vuelves con el botón **Inicio** de la barra de
abajo.

**Qué ves, de arriba a abajo:**

1. **Arriba a la izquierda**: la flecha de volver (si venías de otro lado)
2. **Arriba a la derecha**: tu avatar y el contador de monedas ★
3. **La campana** con un punto naranja si tienes notificaciones sin leer
4. **Tu nombre y tu sombrero**
5. **Los mosaicos** — las pantallas de tu sombrero, cada una con su foto
6. **Abajo**: la barra de navegación

### 3.1 · La barra de abajo

Cinco o seis botones, y **cambian según tu sombrero**:

| Botón | A dónde va |
|---|---|
| **Inicio** | Aquí |
| **Mi equipo** / **Ligas** | Vestidor si eres coach; directorio si no |
| **En vivo** | El marcador del partido en curso |
| **Carta** | Tu carta (o la de tu hij@) |
| **Tienda** | Productos de la liga |
| **Más** | Menú con lo que no cupo |

---

## 4 · Modo público · Marcadores

**Cómo llegar:** botón `En vivo` de la barra de abajo, o el mosaico *Marcadores*.

Es la pantalla que más se usa y la que ve **todo el mundo**, tenga el sombrero que tenga.

### 4.1 · En vivo ahora

Arriba del todo. Si hay un partido corriendo, sale su tarjeta con:
- Los dos escudos y los dos nombres
- **El marcador, actualizándose solo**
- El periodo y el reloj
- Una etiqueta roja `● EN VIVO`

Tocarla te lleva al marcador completo (§6).

Si no hay nada corriendo, dice: *"No hay partidos en vivo ahora. Cuando la mesa dirija un partido,
aparecerá aquí para todo el público."*

### 4.2 · Próximos — y los filtros

Debajo, una fila de **chips** (botoncitos redondos). Sirven para filtrar el calendario:

| Chip | Qué muestra |
|---|---|
| **♥ Mis hij@s** | *(sólo si eres papá)* Los partidos donde juega alguno de tus hij@s, **de cualquier categoría** |
| **Todas** | Todos los partidos que vienen |
| **Mixta 7–9**, **Varonil 14–15**, etc. | Sólo esa categoría |

> **Si eres papá, la app abre en `♥ Mis hij@s`.** Es a propósito: con nueve categorías jugando el
> mismo sábado, lo que un papá quiere ver primero son sus hijos, no una categoría.

### 4.3 · La tarjeta de un partido

Cada partido se ve así:

```
┌──────────────────────────────────────────┐
│  ♥ Aquí juegan Ximena y Diego · Coyotes  │  ← sólo si es de tus hij@s
├──────────────────────────────────────────┤
│  [CO]        VS          [MA]            │
│  Coyotes   Mixta 7–9 ·   Marea Alta      │
│  de        sábado, 8 de                  │
│  Alameda   agosto · 09:00                │
│            · Gimnasio Municipal          │
└──────────────────────────────────────────┘
   ID M79-J4-COMA                            ← se copia de un toque
```

**La cinta dorada de arriba** sale sólo cuando juega alguno de tus hij@s, y **dice su nombre**. Si
juegan varios, los nombra a todos. Si dos de tus hijos están en **equipos contrarios**, sale una
etiqueta `SE ENFRENTAN` antes que nada, porque eso decide de qué lado de la cancha te sientas.

**El ID** (`M79-J4-COMA`) se lee así:
- `M79` = Mixta 7–9
- `J4` = jornada 4
- `COMA` = **CO**yotes vs **MA**rea

Tócalo y **se copia al portapapeles**. Sirve para dictarlo por teléfono o pegarlo en el grupo de
WhatsApp: *"el partido de Ximena es el M79-J4-COMA"*.

### 4.4 · Resultados

Más abajo, los partidos ya jugados con su marcador final. Los que ganó el equipo local llevan el
número en blanco; el perdedor en gris.

### 4.5 · Apoyar a un equipo

Botón abajo. Te deja seguir un equipo para tenerlo a la mano.

---

## 5 · Tabla de posiciones

**Cómo llegar:** `Ver todo ›` junto a *Tabla* en el modo público, o el mosaico *Tabla*.

**Ojo: aquí NO hay calendario.** Esta pantalla es **sólo la tabla**. Los partidos que vienen están
en Marcadores (§4.2). Es la confusión más común.

### 5.1 · Cómo se lee

| Columna | Qué es |
|---|---|
| **#** | Posición |
| **EQUIPO** | Escudo y nombre |
| **PJ** | Partidos jugados |
| **G** | Ganados |
| **P** | Perdidos |
| **PF** | Puntos a favor (los que anotó) |
| **PC** | Puntos en contra (los que le anotaron) |
| **DIF** | PF menos PC |
| **PTS** | **Puntos de tabla** — con esto se ordena |

### 5.2 · Cómo se calculan los puntos

**Formato FIBA:**
- Partido **ganado** = 2 puntos
- Partido **perdido** = 1 punto (por presentarse)
- **No presentarse** = 0 puntos

Por eso un equipo con 5 jugados y 3 ganados tiene `3×2 + 2×1 = 8` puntos.

### 5.3 · Los desempates

Si dos equipos tienen los mismos puntos, se ordenan:
1. Por **diferencia de puntos** (DIF)
2. Si siguen empatados, por **puntos a favor** (PF)

**Nunca** por orden de lista. Una tabla que no desempata es una tabla que miente.

---

## 6 · El partido en vivo

**Cómo llegar:** toca la tarjeta `● EN VIVO`, o el botón `En vivo` de la barra.

### 6.1 · El marcador de arriba

```
   [HQ]     1ER CUARTO    [TI]
 HALCONES     10:00      TITANES
     0         24″          0
```

- **Los dos escudos** con sus colores
- **El periodo** y el **reloj**, corriendo
- **El reloj de tiro** (`24″`) si la liga lo tiene prendido
- **Los marcadores**, en grande

Todo esto **se actualiza solo** conforme la mesa anota.

### 6.2 · La cancha

Debajo, la cancha vista desde arriba con **los diez jugadores en su posición**.

Cada jugador es una mini-tarjeta con:
- Su **dorsal** arriba a la izquierda
- Su **posición** arriba a la derecha (`B`, `E`, `AL`, `AP`, `P`)
- Su foto (o una de relleno)
- Su nombre
- **Sus puntos** en naranja
- Un `3F` rojo si lleva faltas

**Los jugadores se acomodan por su posición**, no por orden de lista:
- El **Pívot** pegado al aro contrario
- Los **Aleros** en las bandas
- El **Base** y el **Escolta** atrás

Tu equipo (o el de tu hij@) sale **resaltado con borde naranja**.

**Toca a un jugador** y se abre su ficha: su nombre, su equipo, su posición, si está en cancha o en
banca, y sus números del partido.

### 6.3 · La banca

Abajo de la cancha, una fila que se desliza con los que están descansando: `#18 Leo Fuentes · 0′ ·
0 pts · 0F`.

### 6.4 · Los botones

| Botón | Quién lo ve | Qué hace |
|---|---|---|
| **Compartir** | Todos | Genera una **imagen** del marcador para mandar por WhatsApp |
| **VAR** | Liga | Repeticiones |
| **Repetir** | Liga | Lo mismo |
| **Mesa** | Liga / mesa | Ir a anotar |

**Compartir** arma una imagen de 1000×600 con los dos escudos, el marcador, el periodo y el logo de
Ligas Mazi. En iPhone abre la hoja de compartir; si no, la descarga.

---

## 7 · La mesa

**Quién entra:** la liga, o quien la liga haya asignado como mesa de ese partido.

Es donde **se anota el partido**. Lo que se toque aquí se ve al instante en el marcador de todos.

### 7.1 · Empezar a dirigir

Desde el panel de la liga o desde Próximos, busca el partido y toca `Dirigir este partido (eres la
mesa)`.

**Qué pasa:** el partido se marca como en vivo, aparece en *En vivo ahora* para todo el público, y
tú llegas a la mesa.

### 7.2 · Anotar

- **+1 / +2 / +3** para los puntos
- **Falta** para las faltas
- El **reloj**: arranca, pausa, y avanza de periodo

**Cada toque:**
1. Suma al marcador del equipo
2. Suma a las estadísticas del jugador
3. Se ve al instante en el marcador de todos
4. Queda en la bitácora del partido

### 7.3 · Las cinco faltas

Cuando un jugador llega a **5 faltas**, la app lo saca sola y mete a alguien de la banca. No hay que
acordarse.

---

## 8 · Panel de la liga

**Quién entra:** sólo el sombrero **Liga**, y sólo si esa liga es suya.

### 8.1 · Identidad

Arriba: el nombre de la liga, su escudo y su portada. Todo se puede cambiar:
- **Nombre** → se ve en todas las tarjetas y en el directorio
- **Escudo** → sube una imagen desde el teléfono
- **Portada** → la foto ancha de arriba

### 8.2 · Equipos

Lista de los equipos inscritos. Por cada uno:
- Escudo, nombre y **categoría**
- Cuántos jugadores tiene
- `Quitar de la liga` — lo saca de este torneo pero el equipo sigue existiendo
- `◆ Borrar el equipo` — *(sólo admin supremo)* lo borra **a él y a sus partidos**

**Agregar equipo:** escribe el nombre, elige la categoría, toca el botón. Queda con un color
asignado automáticamente.

### 8.3 · Calendario

**`Generar rol todos contra todos`** arma el calendario completo: cada equipo juega contra todos los
de su categoría, una vez, una jornada por semana empezando el próximo sábado.

Por cada partido puedes editar:
- **Fecha** y **hora**
- **Lugar** (la cancha)
- **Mesa** — el correo de quien va a anotar
- **Candado de privado** (§17)

Y ves el **ID** del partido.

> **Regenerar el rol borra el anterior.** Si ya había resultados, se pierden.

### 8.4 · Resultados

Los partidos jugados con su marcador. Se pueden reabrir para corregir.

### 8.5 · Zona de riesgo *(sólo admin supremo)*

Hasta abajo. `◆ Borrar la liga completa`.

**Pide dos cosas distintas:**
1. Escribir la palabra **Mazi**
2. Pulsar **el logo de Grupo Mazi**, que está apagado hasta que la palabra esté bien

Es a propósito: borrar una liga se lleva sus equipos, su calendario y su historia, y no se deshace.
Un *"¿estás seguro? [Sí]"* se contesta con el pulgar sin leer.

---

## 9 · Vestidor (coach)

**Quién entra:** coach o dueño de equipo.

### 9.1 · Cambios en vivo

**Sólo aparece si hay un partido en curso.** Dos columnas:

**Izquierda · En cancha.** Cada jugador con su dorsal, nombre, un **chip de posición** y sus
números (`0p · 0F`).

**Derecha · Banca.** Los que están descansando.

**Para hacer un cambio:**
1. **Toca al que sale** (columna izquierda). Se pone naranja.
2. **Toca al que entra** (columna derecha).
3. Listo.

**Qué pasa:**
- Se intercambian al instante
- **El que entra cubre la posición del que sale**
- Se ve de inmediato en el marcador de todos
- Queda en la bitácora: *"Cambio: entra Leo Fuentes de Ala-pívot por Damián Ortiz"*

**Para cambiar una posición sin sacar a nadie:** toca el **chip** debajo del nombre (`B`, `AL`…).
Se abre una hoja con las cinco posiciones y qué hace cada una. Elige y listo — la cancha se
reacomoda sola.

### 9.2 · Las cinco posiciones

| | Nombre | Qué hace |
|---|---|---|
| **B** | Base | Sube el balón y arma la jugada |
| **E** | Escolta | Tira de fuera y corta al aro |
| **AL** | Alero | Juega la banda: tira o entra |
| **AP** | Ala-pívot | Poste alto: rebote y espaldas al aro |
| **P** | Pívot | Poste bajo: pintura, tapas y rebote |

La app entiende también *poste*, *pivot* sin acento, *ala* y *armador*.

### 9.3 · Roster

La lista de tu equipo. Cada renglón: dorsal, nombre, **chip de posición** y su promedio de puntos.

**Aquí se arma la alineación con la que empieza el partido.** Lo que pongas se guarda en el equipo,
así que sobrevive al partido y a cerrar la app.

`＋ Alta` para agregar jugadores.

### 9.4 · Identidad del equipo

Nombre, escudo y color. El color es el que se ve en las tarjetas y en la cancha.

---

## 10 · Estrategias

**Quién entra:** coach.

Diez jugadas dibujadas, cinco de defensa y cinco de ataque:

**Defensa:** Hombre a hombre · Zona 2-3 · Zona 3-2 · Zona 1-3-1 · Presión 1-2-2
**Ataque:** Pick & Roll · Motion · 4 afuera 1 adentro · Contragolpe · Aislamiento

Cada una muestra **el diagrama** con los cinco jugadores colocados, y una explicación de qué gana y
qué arriesga.

Se elige una y queda como la del equipo. También puedes dejar **notas** que se guardan por partido.

---

## 11 · Mi carta

**Quién entra:** jugador, o papá (para ver la de sus hij@s).

Es la identidad del jugador. Estilo carta coleccionable.

### 11.1 · Partes de la carta

1. **El rango**, arriba a la izquierda (`◆ ORO`, `◆ DARK MATTER`…)
2. **El general**, arriba a la derecha — un número del 45 al 99
3. **La foto** — toca para subir una. Si no hay, sale una de relleno
4. **El nombre** y el dorsal
5. **Los números**: PTS · REB · AST · FALTAS
6. **Los cosméticos** que traigas puestos

### 11.2 · De dónde sale el general

De lo que juegas: `48 + (puntos por juego × 2.6) − (faltas por juego × 1.5)`, topado entre 45 y 99.

**Sin partidos anotados no hay general.** Sale `—` y un aviso de que la carta se arma sola cuando la
mesa registre tus partidos.

### 11.3 · De dónde sale el rango

De **dos caminos**, y manda el más alto:
- **Lo que juegas** — el general
- **Lo que traes puesto** — la rareza de tu ajuar completo

Por eso un jugador con pocos partidos pero con un ajuar de Dark Matter sale marcado como Dark
Matter. Los dos cuestan: uno se gana jugando y el otro juntando.

### 11.4 · Si eres papá

Arriba salen **chips con los nombres de tus hij@s**. Tócalos para cambiar de carta. Si además tú
juegas, hay un chip `Yo`.

### 11.5 · Las pestañas

| Pestaña | Qué tiene |
|---|---|
| **Resumen** | General, atributos y promedios |
| **Atributos** | Se llena con más partidos |
| **Vitrina** | **Aquí te pones los accesorios** |
| **Historial** | Por qué equipos has pasado |

### 11.6 · Ponerse accesorios

Pestaña **Vitrina**. Por cada categoría —marcos, auras, destellos, accesorios, fondos, mensajes—
una fila que se desliza con lo que tienes.

- Están **ordenados por rareza**: lo más raro primero
- El que traes puesto dice `EN USO`
- **Ninguno** al principio de cada fila, para quitártelo
- Toca uno y se aplica al instante

### 11.7 · Presumir

Arriba a la derecha, `Presumir`. Genera una **imagen de 900×1200** de tu carta —con foto grande,
marco por rareza, rayos y decoraciones— lista para compartir.

---

## 12 · Gachapón

**Cómo llegar:** mosaico *Logros y sobres*, o desde la tienda.

### 12.1 · Las monedas ★

Se ganan:
- Jugando partidos
- Con la **racha diaria**
- Cuando te sale un cosmético **repetido** (+20)

Se ven arriba a la derecha en todas las pantallas.

### 12.2 · Los tres sobres

| Sobre | Precio | Qué cambia |
|---|---|---|
| **Sencillo** | barato | Probabilidades base |
| **Avanzado** | medio | Sube las rarezas altas |
| **Armado** | caro | Las sube mucho más |

El "boost" del sobre **cambia las probabilidades de verdad**, y el número que te enseña la app al
abrirlo es el de **ese** sobre, no el genérico.

### 12.3 · Abrir un sobre — qué pasa, paso a paso

1. Toca `Abrir`.
2. **Arranca una ruleta horizontal** con cosméticos pasando, estilo CS:GO. Suena un tic por cada
   uno que pasa por el centro, y los tics **se van espaciando** conforme frena.
3. A los ~4 segundos **se detiene** sobre el que te tocó. Suena un *ping* cuya nota depende de la
   rareza: más raro, más agudo.
4. Debajo aparece la leyenda con la rareza y el nombre.
5. **Casi un segundo después** se abre el premio a pantalla completa.

### 12.4 · La pantalla del premio

```
        ¡ES DE COLECCIÓN!          ← o "Repetido" si ya lo tenías
   ┌──────────────────────┐
   │  ◆ DARK MATTER       │
   │                      │
   │      [la pieza]      │
   │                      │
   │       Espiral        │
   │  "Si te salió esto,  │
   │  cuenta el momento." │
   │                      │
   │  0.04% de probabilidad │
   │   · 1 de cada 2,779  │
   └──────────────────────┘
   ┌──────────────────────┐
   │ Ya lo tenías ·       │  ← sólo si es repetido
   │ se te pagan +20      │
   └──────────────────────┘
   [ Guardar ]  [ Aplicar en mi carta ]
```

- **El título cambia**: `¡ES DE COLECCIÓN!` para lo más raro, `¡Nuevo cosmético!` para lo bueno,
  `Añadido a tu colección` para lo normal, y **`Repetido`** si ya lo tenías
- **La probabilidad** siempre se enseña, calculada con el sobre que abriste
- **Si es repetido** sale la pastilla dorada con las +20 monedas
- **El premio NO se cierra solo.** Se queda hasta que toques un botón

**`Guardar`** lo deja en tu colección. **`Aplicar en mi carta`** además te lo pone.

### 12.5 · Las veinte rarezas

De menos a más rara. El porcentaje es con sobre sencillo:

| # | Rareza | Aprox. |
|---|---|---|
| 1 | Común | 30% |
| 2 | Poco Común | 20% |
| 3 | Bronce | 13% |
| 4 | Plata | 9% |
| 5 | Oro | 6.5% |
| 6 | Raro | 5% |
| 7 | Épico | 3.5% |
| 8 | Mega Épico | 2.5% |
| 9 | Esmeralda | 1.8% |
| 10 | Zafiro | 1.2% |
| 11 | Rubí | 0.8% |
| 12 | Amatista | 0.55% |
| 13 | Legendario | 0.38% |
| 14 | Mítico | 0.25% |
| 15 | Diamante | 0.16% |
| 16 | Diamante Rosa | 0.1% |
| 17 | Ópalo | 0.06% |
| 18 | Galaxy Opal | 0.03% |
| 19 | Dark Matter | 0.014% |
| 20 | Singularidad | 0.005% |

**Ejemplos concretos:**
- Un **Común** te va a salir casi uno de cada tres sobres
- Un **Oro** más o menos uno de cada quince
- Un **Legendario** uno de cada ~260
- Un **Dark Matter** uno de cada ~7,000 con sobre sencillo — con sobre armado sube a ~1 de cada 2,800

La tabla completa está en la app, en el desplegable *Probabilidades de cada rareza*.

### 12.6 · Los seis tipos de cosmético

| Tipo | Qué le hace a tu carta |
|---|---|
| **Marcos** | Un borde alrededor |
| **Auras / fondos brillantes** | Resplandor detrás |
| **Destellos** | Un rayo que barre la carta |
| **Accesorios visuales** | Coronas, alas, planetas… encima |
| **Fondos de carta** | El fondo completo |
| **Estilo de mensajes** | Cómo se ven tus mensajes |

**Puedes traer uno de cada tipo al mismo tiempo.** Y el conjunto es lo que sube tu rango: si traes
cuatro piezas de rareza alta, la carta sube un peldaño más.

### 12.7 · Racha diaria

Siete casillas. Reclamas una por día; si fallas un día, la racha se reinicia. Los cosméticos del
calendario **no salen en sobres** — sólo por racha.

### 12.8 · Abrir todos *(sólo admin supremo)*

Abre el lote completo de un jalón y muestra **todo lo que salió**, partido en **Nuevos** y
**Repetidos**, ordenado por rareza, con la probabilidad de cada uno. Se queda ahí hasta que toques
`Listo, ya los vi`.

---

## 13 · Tienda

**Quién entra:** todos.

### 13.1 · Si eres la liga

`Agregar producto`: nombre, categoría, precio en pesos, color e imagen.

> ⚠️ **La imagen que subas es PÚBLICA.** La ve cualquiera que abra la tienda. **No subas fotos de
> personas.**

### 13.2 · Si eres comprador

Los productos salen agrupados por liga y por categoría, con su precio.

`Apartar` te reserva el producto por un tiempo, con cuenta regresiva. Mientras esté apartado por
alguien, nadie más puede.

---

## 14 · Casa del papá

**Quién entra:** sombrero papá / tutor.

### 14.1 · Cómo funciona la cuenta de un niño chiquito — **léelo, es la pregunta más común**

**Un niño de 7 años NO tiene cuenta propia.** No la necesita y no debería tenerla.

Así funciona:

1. **El papá crea SU cuenta** con el sombrero *Papá / tutor*.
2. **Vincula a su hij@** desde `＋ Alta`. El niño queda **dentro** de la cuenta del papá.
3. La app le genera al niño su **código de jugador** (`J-…`), que es su identidad para siempre.
4. **El papá gestiona todo por él**: acepta la invitación del equipo, ve su carta, le pone
   accesorios, ve dónde juega.
5. El niño **existe** en la liga, sale en el roster, en la cancha y en la tabla — pero **no
   inicia sesión**, porque no tiene con qué.

**Cuando el niño crezca y tenga teléfono:** se registra él con el sombrero *Jugador* y la liga o el
coach lo empata con su código. Sus estadísticas y su carta lo siguen.

> **Lo que todavía falta:** el traspaso automático de la cuenta del papá al hijo. Hoy hay que
> hacerlo a mano con el código. Está anotado en pendientes.

### 14.2 · Vincular a un hij@

`＋ Alta`. Pide:
- **Nombre completo**
- **Dorsal** y **posición**
- **Fecha de nacimiento** — al escribirla te dice **la edad y qué categorías le tocan**
- **La casilla de tutor**: *"Soy mayor de edad y soy su papá, mamá o tutor"*

> **No se pide CURP ni ningún documento oficial.** La fecha sirve sólo para la categoría, y para no
> confundir a dos niños con el mismo nombre se usa el código que genera la app.

**Qué pasa al vincular:** el hij@ aparece en tu lista, se le crea su código, y ya puedes ver su
carta y recibir sus avisos.

### 14.3 · Tus hij@s

La lista, con su edad, su equipo y una etiqueta `MENOR`. La `×` lo desvincula.

### 14.4 · Los avisos que te van a llegar

La app **revisa sola** dónde juegan tus hij@s: al abrirla, cada 5 minutos, y al volver a ella. Te
manda tres avisos por partido:

1. **Cuando queda ubicado:** *"Ya sabemos dónde juega Ximena: M79-J4-COMA · sábado 8 de agosto ·
   09:00 · Gimnasio Municipal"*
2. **El día del partido:** *"HOY juega Ximena con Coyotes a las 09:00 en Gimnasio Municipal"*
3. **Media hora antes:** *"En 28 min empieza el partido de Ximena"*

**Ninguno se repite.** Si tienes varios hijos en el mismo partido, los nombra a todos. Si están en
equipos contrarios, te lo dice.

---

## 15 · Notificaciones

**Cómo llegar:** la **campana** arriba, o el mosaico *Bandeja*.

El punto naranja dice cuántas sin leer (`9+` si son muchas).

### 15.1 · La barra de arriba

Dice cuántas tienes y trae dos botones:
- **Seleccionar** — entra al modo de selección
- **Borrar leídas (N)** — se lleva todas las leídas de un jalón

### 15.2 · Las tres formas de borrar

| Forma | Cuándo |
|---|---|
| **La `×` de cada renglón** | Para la que estorba ahora |
| **Borrar leídas** | Para el montón acumulado |
| **Seleccionar** | Cuando quieres tirar diez pero salvar una |

En modo selección, toca las que quieras (se marcan con ✓), `Todas` para todas, y `Borrar`.

> **Lo que NUNCA se borra de un botonazo:** las que tienen algo **pendiente de contestar**. Salen
> marcadas con *"te toca contestar"*. Una invitación sin responder no es ruido, es trabajo. Si de
> plano la quieres tirar, se puede una por una.

---

## 16 · Perillas de la liga

**Quién entra:** sombrero Liga.

Aquí se define **cómo se juega** en esta liga:

- **Minutos por periodo** y **cuántos periodos**
- **Reloj de tiro** — prendido o apagado, y de cuántos segundos
- **Faltas para expulsión** — por defecto 5
- **Faltas de equipo** para el bonus
- **Presets**: FIBA, NBA, escolar…

**Todo esto se aplica de verdad**: el reloj del marcador, la expulsión automática y el bonus salen
de aquí.

---

## 17 · Partidos privados

**Quién lo prende:** la liga, desde el calendario.

Sirve para un partido que **no quieres que vea cualquiera**.

### 17.1 · Cómo se prende

En el calendario, en el partido, toca el botón `🔓 Abierto`. Se pone `🔒 Privado` y aparecen:
- **Un código de 4 dígitos**
- `Copiar link`
- `Otro código`

### 17.2 · Cómo se reparte

**Manda el link Y el código juntos.** Son dos cerraduras y hacen falta las dos:
- **El link** dice *dónde* está el partido
- **El código** dice *quién* puede pasar

### 17.3 · Qué ve el invitado

Al abrir el link se abre una pantalla que dice contra quién es, cuándo y dónde, y pide el código.
Con el código correcto, queda siguiendo el partido y lo verá cuando esté en vivo.

### 17.4 · Lo importante

- **Apagar el candado borra los pases.** Volver a prenderlo es una **puerta nueva**: código nuevo y
  lista en blanco. Hay que repartir de nuevo
- **`Otro código` también corre a los que ya entraron**
- La liga y el admin supremo **siempre** ven sus partidos

> ⚠️ **Esto no es seguridad de grado militar.** Sirve para que no se meta gente que no va. No lo
> uses para guardar un secreto.

---

## 18 · Directorio

Buscador de ligas, equipos y jugadores, por nombre o por código. Sirve para que un equipo encuentre
una liga a la que pedir entrar, o para que un coach encuentre a un jugador libre e invitarlo.

---

## 19 · Perfil y tema

Toca tu **avatar arriba a la derecha**:

- **Tu nombre, correo y sombrero**
- **Tema Oscuro / Claro**
- **Logros y sobres** — al gachapón
- **Cambiar cómo entro** — cambiar de sombrero
- **Cerrar sesión**

> **Cerrar sesión NO borra tu cuenta.** Queda guardada en este teléfono y puedes volver con tu
> correo y contraseña.

---

## 20 · Preguntas que ya nos hicieron

**¿Cómo aplica a un equipo un niño muy chiquito?**
No aplica él: **lo vincula su papá** (§14.1). El niño existe en la liga y juega, pero no tiene
cuenta ni inicia sesión hasta que crezca.

**Cambié algo y no se ve.**
Revisa la versión (§0.3). Casi siempre es el caché de Safari.

**No encuentro el partido de mi hij@.**
Ve a `En vivo` → chip `♥ Mis hij@s`. Si tu hij@ no sale, es que todavía no está en el roster de
ningún equipo — eso lo hace el coach o la liga.

**Cerré sesión y no puedo entrar.**
En modo local las cuentas viven en el teléfono donde se crearon. Si te registraste en otro, ahí
está.

**¿Por qué mi carta dice `—` en todo?**
Porque la mesa todavía no ha anotado partidos tuyos. Los números salen de ahí.

**¿Los cosméticos dan ventaja?**
No. Son puramente visuales.

**Se me llenó de notificaciones.**
Campana → `Borrar leídas`. §15.

---

## 21 · Lo que todavía NO hace

Se dice para que nadie lo busque y se frustre:

- **Traspaso automático de la cuenta del hijo** cuando crece. Hoy es manual, con el código
- **Rebotes y asistencias** — la mesa anota puntos y faltas; REB y AST salen en la carta pero
  todavía no se capturan
- **Escritorio** — la app está hecha para teléfono. En computadora funciona pero no se ve bien
- **La tienda con nube** — los productos necesitan conexión
- **Pagos** — la tienda aparta, no cobra

---

*Manual de Ligas Mazi · Grupo Mazi · versión de la app `2026.08.01-f`*
*Si algo no coincide con lo que ves en pantalla, revisa primero la versión (§0.3).*
