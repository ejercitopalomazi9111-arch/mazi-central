[hoja]

## III. La cosecha: de trece mil a cuatrocientos diecinueve

Éste es el capítulo donde se ve cuánto se cae por el camino, que es la parte
que casi nunca se cuenta. Los cuatro números de cada casa son distintos y cada
salto tiene una explicación.

[[cosecha:casas]]

**Descubiertas** son las direcciones que aparecieron en los índices y mapas de
sitio y pasaron el filtro de ruta. **Elegidas** son las que sobrevivieron al
cupo de setenta por casa. **Traídas** son las que devolvieron texto de verdad.
**Asignadas** cuenta cuántas veces un archivo de esa casa entró en la lista de
lectura de alguna materia, y por eso puede ser mayor que las traídas: un
artículo sirve para más de una materia.

### Las tres cosas que este cuadro dice y hay que decir en voz alta

**Y Combinator: setenta elegidas, cero traídas.** Su biblioteca es una
aplicación de JavaScript. El mapa del sitio sí es XML plano y por eso las
direcciones se descubrieron bien, pero al pedirlas llega el armazón de la
aplicación y ni una línea del artículo. Se quedaron en cero y **no hay ni una
neurona sacada de ahí**, aunque la casa esté en la lista de fuentes. Decir
«leímos Y Combinator» sería falso.

**Wikipedia: sesenta y ocho traídas y ninguna sirvió.** Éste es un defecto mío
y está contado con detalle en el capítulo XVIII. En corto: el normalizador de
direcciones le pega una barra al final a toda ruta que no termine en archivo,
y para Wikipedia `/wiki/Brand_management/` es un título distinto que no existe.
El sitio contesta con una página cuyo cuerpo es el menú —«Jump to content»,
«Search», «Donate»—, mil setecientos caracteres, justo por encima del piso de
mil doscientos que existía para cazar exactamente esto. Los sesenta y ocho
archivos entraron a la bodega y **el reparto los tiró después**, por traer
menos de doscientas cincuenta palabras. Lo cazó el paso siguiente, de rebote.

**McKinsey no está, y no es un olvido.** No contesta desde este entorno:
`curl` devuelve código 000, que no es ni siquiera un error HTTP. Una fuente que
no se pudo abrir no se cita porque seguro sirve. Si alguien la quiere dentro,
hay que traerla desde una máquina que sí la alcance y volver a correr el paso
cuatro.

### Lo que se descartó y por qué

| Filtro | Qué tira | Dónde está |
| Palabra del campo en la ruta | direcciones que no hablan del tema | `valeLaPena`, en `fuentes.mjs` |
| Lo que no es un artículo | etiquetas, categorías, autores, avisos legales, suscripción | `NO_ES_ARTICULO`, en `cosechar.mjs` |
| Puntuación de ruta menor que 3 | índices y portadas | `puntuarUrl`, en `cosechar.mjs` |
| Cupo de 70 por casa | el exceso de la casa más grande | `elegir`, en `cosechar.mjs` |
| Menos de 1 200 caracteres | portadas, muros de cookies y 404 con buena cara | `traerTodo`, en `cosechar.mjs` |
| Menos de 250 palabras | lo que pasó el filtro anterior y aun así no es un artículo | `repartir.mjs` |
| Menos de 3 términos distintos | textos de otra cosa que mencionan la palabra de pasada | `repartir.mjs` |

De los 419 archivos que quedaron legibles, **284 entraron en la lista de
lectura de por lo menos una materia**. Los otros 135 se trajeron, se guardaron
y no se usaron: eran de la casa correcta y del tema equivocado. Ese desperdicio
es normal y es preferible al contrario, que es afinar tanto el filtro que sólo
entre lo que ya se esperaba encontrar.

---
