[hoja]

## II. El método, paso por paso

Siete pasos, cada uno con su programa, cada uno dejando por escrito lo que
hizo. La razón de que sean siete programas separados y no uno grande es
simple: **cada paso se puede volver a correr sin repetir el anterior**, y
cuando algo sale mal se ve en cuál de los siete.

| Paso | Programa | Qué deja escrito |
| 1 · Elegir de dónde leer | `fuentes.mjs` | las nueve casas, con el porqué de cada una |
| 2 · Descubrir | `descubrir.mjs` | direcciones sacadas de mapas de sitio, no de memoria |
| 3 · Elegir | `cosechar.mjs elegir` | `elegidos.json`, con cupo por casa |
| 4 · Traer | `cosechar.mjs traer` | los textos en la bodega, fuera del repositorio |
| 5 · Repartir | `repartir.mjs` | `reparto.json`, qué se lee para cada materia |
| 6 · Leer y preguntar | `leer.mjs` | pasajes con su dirección, para poder citar |
| 7 · Escribir | a mano | las neuronas, con el campo que dice de dónde salió |

### Paso 1 · De dónde se lee, y por qué de ahí

El criterio no fue «que sea famosa». Fue **que discuta**: una lista de diez
consejos no sirve para escribir una neurona, porque una neurona necesita la
causa y la forma de cazarla, y una lista de consejos no trae ninguna de las
dos.

Están mezcladas tres cosas a propósito, y la mezcla es el punto:

- **El manual.** Empresas que publican cómo operan de verdad, con el detalle
  que normalmente no sale de dentro. GitLab, Basecamp y Atlassian.
- **La escuela.** Investigación con método y datos detrás. MIT Sloan
  Management Review, Knowledge at Wharton y Harvard Business Review.
- **El campo.** Quien ha visto morir muchas empresas de cerca (Y Combinator)
  y quien estudia cómo se decide mal (Farnam Street). Más Wikipedia para los
  marcos canónicos con su historia y sus críticas.

Quien sólo lee la escuela repite marcos que no aplican; quien sólo lee el
campo confunde su anécdota con una ley. **Cuando dos casas se contradicen, ahí
suele haber una neurona esperando**, porque la contradicción marca dónde está
la decisión de verdad.

### Paso 2 · Descubrir, que es el paso que no se puede saltar

Lo fácil habría sido escribir doscientas direcciones de memoria. Sería
mentira: la memoria de un modelo inventa rutas que suenan bien y dan 404, y
las que acierta son las cuatro de siempre. Así que las direcciones **se
descubren**: se piden los índices y los mapas de sitio de cada casa y se sacan
de ahí. Lo que no exista, no entra.

Filtrar se filtra por la ruta, no por el texto, y por una razón concreta: la
ruta la escribió una persona resumiendo de qué va la página. Una dirección que
no contiene ninguna palabra del campo casi nunca es un artículo del campo.

> **Una cosa del entorno que cambia el código.** La salida a internet de esta
> máquina va por un proxy que sólo entiende a `curl`. El `fetch` de Node
> contesta 403 contra sitios que `curl` trae sin problema. Por eso los
> programas llaman a `curl` y no a la función que uno esperaría. Está medido,
> no supuesto.

### Paso 3 · Elegir con cupo por casa

Descubrir trajo trece mil quinientas noventa y dos direcciones. Eso no es una
selección: es un montón, y un montón con una casa dominando incumple lo que se
pidió, que era no basarse en una sola web.

Así que se elige con **cupo por casa**: setenta por casa como máximo, ordenadas
por una puntuación de la ruta. La puntuación premia lo que parece un artículo
—una fecha en la ruta, un título largo con guiones, dos temas distintos en la
misma dirección— y descarta lo que nunca lo es: etiquetas, categorías, autores,
páginas de suscripción y avisos legales.

El cupo es **peor para el número total y mejor para lo que se va a aprender**.
Ocho voces que se contradicen enseñan más que una repetida trescientas veces.

### Paso 4 · Traer, sin abusar y sin guardar obra ajena

Los artículos se piden despacio, con pausa entre uno y otro. Una cosecha que
tumba el sitio del que aprende no es una cosecha.

Y hay una decisión que conviene entender porque explica la forma de todo el
repositorio: **el texto de los artículos no se guarda en el repositorio**.
Cuatrocientos textos ajenos dentro del repositorio son dos cosas malas a la
vez, peso muerto y obra de otros publicada sin permiso. Lo que se guarda es la
lista —de dónde salió cada cosa— y lo que yo escribí a partir de leerlos. El
texto vive en el disco de trabajo y se puede volver a traer cuando haga falta.

### Paso 5 · Repartir, que no es clasificar

`repartir.mjs` cuenta apariciones de términos de cada materia, normaliza por
la longitud del texto y ordena. El resultado es `reparto.json`, y **no es un
clasificador**: es un índice para saber por dónde empezar a leer cuatrocientos
archivos. De qué trata un artículo lo decide quien lo lee.

Que un artículo salga alto en dos materias suele estar bien: «precio» es de
marketing y es de ventas. El capítulo IV explica el algoritmo y sus dos
salvaguardas.

### Paso 6 · Leer preguntándole al montón

Cuatrocientos artículos no caben en la cabeza de nadie ni en la memoria de
trabajo de un modelo. Sin una forma de preguntarle al montón pasa lo de
siempre: las neuronas se escriben de memoria, suenan bien y son el promedio de
internet en vez de lo que dice la fuente.

Por eso `leer.mjs` devuelve **el pasaje y la dirección**, no un resumen. Una
neurona tiene que poder señalar de dónde salió, y un resumen ya no señala nada.

### Paso 7 · Escribir la neurona

Es el único paso a mano y no se puede automatizar, porque consiste justo en
decidir qué de lo leído es un patrón y qué es una anécdota. El capítulo V
explica los ocho campos de una neurona y por qué son ésos.

---
