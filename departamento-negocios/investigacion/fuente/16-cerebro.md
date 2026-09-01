[hoja]

## XVI. Dónde vive todo esto: el cerebro

Las 151 neuronas de negocio no viven solas. Entraron en el cerebro de la casa,
que ya tenía las de diseño y las de oficio, y hoy son **641 neuronas repartidas
en 64 áreas**. Diez de esas áreas son las materias de este documento.

El cerebro no es una carpeta de notas. Es una estructura con cuatro formas de
preguntarle, un artefacto que se sirve y una comprobación que revienta cuando
el artefacto y las fuentes dejan de coincidir.

### Cómo se le pregunta

| Orden | Qué hace |
| `buscar "lo que te está pasando"` | busca por cómo se describe el problema, no por el término técnico |
| `area <nombre>` | todo lo de un área |
| `ver <id>` | una neurona completa |
| `vecinas <id>` | a qué otras lleva |
| `comunidades` | cómo se agrupan de verdad |
| `revisar` | ligas rotas, campos faltantes y desfase del artefacto |
| `armar` | genera `todo.json`, que es lo que consume la pantalla y La Sala |

El buscador puntúa sobre todo el campo `senales`, que está escrito en las
palabras de quien tiene el problema. Es una decisión que se paga: obliga a
escribir cada neurona pensando en cómo la diría alguien atascado, y no en cómo
la titularía un manual.

### Los enlaces entre neuronas, que son de dos clases

**Los explícitos.** Cada neurona declara sus `vecinas` a mano. En negocios se
cablearon las 151 en grupos por mecanismo, con un tope de cinco por neurona:
más de cinco y dejan de ser vecinas, son una lista.

**Los derivados.** El cerebro además descubre parecidos comparando las
`senales` de unas y otras. Este mecanismo tiene una trampa conocida y
documentada dentro del código: si el parecido se afloja, todo se conecta con
todo y el grafo sale en una sola comunidad, que es inservible. Por eso la
prueba no pide «lo más conectado posible», sino un rango.

### La compuerta que hoy sí puede reprobar

`todo.json` es la lista plana que consume la pantalla del cerebro y el servidor
de La Sala. Durante un tiempo estuvo viejo —servía 490 neuronas mientras las
fuentes tenían 641— y **`revisar` decía que todo estaba bien**, porque nunca
comparaba el artefacto con su fuente. Está contado con detalle en el capítulo
siguiente porque es el error del que más se aprendió.

Hoy `revisar` compara los identificadores de las fuentes con los del artefacto,
dice cuáles faltan y **sale con código de error**. Se comprobó que puede
reprobar quitando neuronas del artefacto a propósito y viendo la prueba
ponerse roja.

### Lo que hoy está en rojo, y por qué se dice

De las 78 comprobaciones del cerebro, **74 pasan y 4 fallan**. Las cuatro
vienen de la rama principal y se comprobaron ahí antes de tocar nada, para no
reportar como propio un fallo heredado. Están aquí porque un expediente que
esconde sus rojos no sirve para nada:

| Comprobación | Estado | Qué significa |
| la mayoría lleva a otras | 290 de 641 · pide 70 % | menos de la mitad de las neuronas declara vecinas |
| descubre parecidas sin conectar todo con todo | 330 de 641 · pide 50 % como techo | el descubrimiento por señales dispara de más |
| se agrupa en varias comunidades | 192 · pide entre 3 y 15 | el grafo está partido en demasiados trozos sueltos |
| buscar «qué es lo que tengo que hacer para publicar» | no devuelve la esperada | un caso de búsqueda con muchas muletillas |

Las tres primeras tienen el mismo diagnóstico y conviene dejarlo escrito: **son
umbrales relativos sobre un corpus que creció**. Se fijaron cuando el cerebro
tenía la mitad de neuronas, y al crecer por áreas —cada área cableada por
dentro y poco entre sí— el grafo se fragmentó. No es un fallo de las neuronas
nuevas; es que la medida de «bien conectado» hay que rehacerla para el tamaño
de ahora. **No está hecho, y decirlo es parte del trabajo.**

---
