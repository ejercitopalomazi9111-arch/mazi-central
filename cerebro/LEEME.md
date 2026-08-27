# El Cerebro

**Contexto barato.** Cada sesión nueva empieza sin saber nada de las anteriores. Sin esto, cada
semana se vuelve a pagar la misma explicación —y peor: cada agente reconstruye cómo funciona el
proyecto, se arma su mapa mental, y lo tira al terminar.

```
cerebro/
├── neuronas/       una carpeta por área, en JSON
├── cerebro.mjs     el motor: buscar, relacionar, agrupar, agregar
├── pruebas.mjs     47 pruebas · node cerebro/pruebas.mjs
├── todo.json       el armado, para servirlo y para que un agente lo baje
└── index.html      la pantalla: lista y red
```

---

## Tres clases de neurona, y por qué

| Clase | Qué guarda | Qué se le pregunta |
|---|---|---|
| **error** | Lo que ya nos costó caro | ¿cómo se arregla y cómo lo cazo? |
| **pieza** | Qué es cada parte del proyecto | ¿dónde vive y qué la rompe? |
| **decisión** | Qué se decidió y por qué | ¿qué se descartó, y por qué no eso? |

Las tres piden `porque` y `senales`. Lo demás cambia porque las preguntas son distintas. De una
decisión, lo que más vale es **qué se descartó** — casi siempre más que lo que se aprobó.

## Se busca como habla una persona

No por término técnico. Quien tiene el bug enfrente dice *«se ve chiquito en el celular»*; si
supiera decir *«falta el meta viewport»*, ya lo habría arreglado.

```
node cerebro/cerebro.mjs buscar "ya lo arreglé y me sigue saliendo mal"
node cerebro/cerebro.mjs ver charset-que-no-manda-el-servidor
node cerebro/cerebro.mjs vecinas ver-la-pantalla
node cerebro/cerebro.mjs comunidades
node cerebro/cerebro.mjs revisar
node cerebro/cerebro.mjs armar        ← después de agregar neuronas
```

## Las neuronas se llaman entre sí

Es la mitad del punto. Un problema real casi nunca es una neurona: es una cadena. *«No se pinta
y no hay error»* lleva a un renombre, que lleva a que las pruebas no cubren la costura, que
lleva a verificar lo publicado. **Ese camino es el valor**; una lista alfabética no lo enseña.

Hay dos tipos de enlace: los **escritos** (alguien afirmó que llevan uno al otro) y los
**descubiertos** (se describen con las mismas palabras).

## Comunidades

Las áreas las escogí yo al crear los archivos. **Las comunidades las descubre el grafo**: quién
habla con quién de verdad. Casi nunca coinciden, y ahí está lo interesante.

Se calculan con propagación de etiquetas, sin librerías, y con desempate alfabético para que el
resultado sea **siempre el mismo** — un mapa que se reagrupa distinto en cada carga no se puede
aprender.

## La red, y por qué se ven las sinapsis

El botón **Red** en la pantalla. Los nodos se colorean por comunidad y su tamaño es cuántos
enlaces tienen.

Y al buscar o al tocar una neurona, **la señal se propaga**: enciende, salta a las vecinas con
retardo, y de ahí a las de más allá. No es adorno — **es la forma de la respuesta**. Ver la
cadena expandirse es lo que enseña que un problema se resuelve siguiendo el hilo.

El destello del enlace dura más que el del nodo a propósito: la sinapsis es lo que hay que
alcanzar a ver.

## Para los agentes

```
https://mazi-central.palomazi9111.workers.dev/cerebro/todo.json
```

Trae todas las neuronas, los enlaces, las comunidades y los grados. Se baja una vez y se busca
en `senales`. La sala manda a los agentes aquí antes de pelearse con un bug.

## Cómo crece

Un cerebro que no se actualiza se vuelve folklore. Se agrega con `agregar()`, que **valida antes
de escribir** para que nadie meta una a medias, y luego `armar` para que la pantalla y los
agentes vean lo nuevo.

**Lo que hay que escribir es el `porque`.** Sin él, una neurona es un apunte, y los apuntes no
evitan que vuelva a pasar.

---

## Dos defectos que salieron construyéndolo, y quedaron como neuronas

**El grafo salía en UNA sola comunidad.** La causa: la señal `«Â»` se normaliza a `«a»` al
quitarle el acento, y `«a»` es subcadena de casi cualquier frase, así que todo se conectaba con
todo. Ahora las señales cortas tienen que coincidir completas.

**Dentro de `vecinas()` había un `const parecidas` que tapaba a la función `parecidas`.** Es
literalmente la neurona `campo-que-choca-consigo`, en el código del propio cerebro. Lo cazó una
prueba nueva, no la vista.
