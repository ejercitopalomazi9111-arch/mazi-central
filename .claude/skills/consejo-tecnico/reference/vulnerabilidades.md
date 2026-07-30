# El catálogo de AK — qué nos puede pasar y cómo se cierra

> **Quién escribe esto:** AK Villalpando, el sombrero negro **a favor** — la que tiene los planos.
> Su trabajo es doble: pegar más duro que el atacante de afuera **y explicar el hueco**, porque un
> hallazgo que nadie entiende no se arregla, se archiva.

**Qué es este archivo:** las **clases** de vulnerabilidad que aplican a nuestro stack, cómo se ven en
lo nuestro, cómo se cierran y **cómo se comprueba que quedaron cerradas.**

**Qué NO es:** un mapa de nuestros huecos abiertos. Este repo es público (`CLAUDE.md` §3 regla 6), o
sea que esto lo puede leer el atacante. Aquí van **clases y arreglos** — que son conocimiento
defensivo y le sirven a cualquiera. Lo que un hallazgo concreto tiene en el acta mientras está abierto
es sólo *área, nivel y "en proceso"*.

**Cómo se lee cada ficha:**
- **Qué es** — la clase, en cristiano.
- **Cómo se ve en lo nuestro** — dónde aplica, con nombres de nuestros proyectos.
- **Cómo se cierra** — el arreglo que quita **la clase entera**, no el caso.
- **Cómo se comprueba** — porque un arreglo sin verificar es una esperanza.

---

## 1 · Pedir lo que no es tuyo cambiando un número (IDOR)

**Qué es.** La falla número uno de las aplicaciones con cuentas, y la más aburrida: la app pide
`/jugador/482`, alguien cambia el 482 por 483, y el servidor contesta porque **verificó que estás
dentro, pero no que ese dato sea tuyo.** Autenticado no es lo mismo que autorizado.

**Cómo se ve en lo nuestro.** Es *la* clase que más nos aplica. Ligas Mazi tiene padres, jugadores,
coaches y mesa, todos con cuenta real, y todos pidiendo datos de la misma base. Cada tabla donde un
rol ve "lo suyo" es una oportunidad de esta clase.

**Cómo se cierra.** No validando el número: **haciendo que el servidor decida qué puede ver cada
quien.** En Supabase eso es una política de RLS que compara el dueño del renglón con `auth.uid()`, no
un `if` en el navegador. La pregunta correcta no es *"¿el id es válido?"* sino *"¿este usuario tiene
derecho a este renglón?"*, y sólo la base puede contestarla.

**Cómo se comprueba.** Con **dos cuentas de prueba**: A pide lo de B directo, sin pasar por la
interfaz. Si contesta algo distinto de "no", está abierto. Es la única prueba que vale, porque la
interfaz nunca te va a ofrecer el botón.

---

## 2 · Validar en el navegador es no validar

**Qué es.** Todo lo que corre en el teléfono del usuario lo controla el usuario. Un `if` en el
JavaScript, un `required` en el input, un `maxlength`, un botón deshabilitado: **son sugerencias.** Se
quitan desde el inspector en cinco segundos.

**Cómo se ve en lo nuestro.** Nuestra arquitectura es *HTML autónomo de un archivo*, o sea que **todo
nuestro código viaja al navegador.** No hay nada secreto y no hay nada que no se pueda saltar. Eso no
está mal —es la arquitectura que elegimos y nos sirve— pero define de dónde puede venir la defensa: de
la base, nunca del archivo.

**Cómo se cierra.** La validación del navegador se queda **para el usuario** (que no se equivoque) y
se **duplica** donde el usuario no manda: en la política y en las restricciones de la tabla
(`CHECK`, `NOT NULL`, `UNIQUE`, llaves foráneas). Si un dato tiene que ser un número entre 1 y 99, eso
va escrito en la tabla, no sólo en el `input`.

**Cómo se comprueba.** Mandando la operación **sin la interfaz.** Si pasa, la interfaz era el único
guardia.

---

## 3 · Una política de RLS que no filtra nada

**Qué es.** Prender RLS y luego escribir una política que permite todo. `USING (true)` con RLS activa
se ve seguro en el tablero y **no protege nada**. También cuenta: políticas que aplican a `SELECT`
pero se olvidan de `UPDATE` y `DELETE`, o que se escriben para el rol autenticado y dejan al anónimo
con acceso.

**Cómo se ve en lo nuestro.** Ligas Mazi tiene **13 tablas con RLS activa y 21 políticas.** Ese número
está bien como punto de partida y **es exactamente lo que hay que auditar una por una**, porque la
llave pública está en el cliente a propósito —así se usa Supabase— y el comentario del código lo dice
con todas sus letras: *"la RLS protege los datos"*. Eso es cierto, y por eso la RLS no es *una* capa de
defensa: es **la** capa. No hay segunda.

**Cómo se cierra.** Revisando cada política contra cuatro preguntas, y las cuatro por separado:
¿quién puede **leer**? ¿quién puede **escribir**? ¿quién puede **cambiar**? ¿quién puede **borrar**? Y
para cada una: **¿lo suyo, o lo de todos?**

**Cómo se comprueba.** Con las dos cuentas de prueba del punto 1, y además con **una sesión anónima**:
lo que contesta sin haber entrado nadie es lo que el mundo puede leer.

---

## 4 · Esconderlo en la pantalla no lo esconde en la respuesta

**Qué es.** La interfaz no muestra un dato, así que el equipo lo considera protegido. Pero el dato
**viajó** en la respuesta y está a un clic en la pestaña de red del navegador. Traer más de lo que se
va a mostrar es la forma más común de filtrar sin darse cuenta.

**Cómo se ve en lo nuestro.** Con nombre y apellido: Ligas Mazi promete en su propia interfaz que
**"CURP nunca visible ni buscable"**. Ésa es una promesa de producto, y una promesa de producto sobre
un dato de un menor **tiene que estar sostenida por una política, no por que la pantalla no lo
pinte.**

**Cómo se cierra.** Dos cosas juntas: **pedir sólo las columnas que se van a usar** en vez de traer el
renglón completo, y que la política **no permita** leer las columnas sensibles a quien no le toca —con
una vista que las excluya, o con permisos por columna. Si de plano hace falta comparar un CURP para
vincular, se compara **del lado de la base** (una función que contesta sí o no) y el CURP nunca sale.

**Cómo se comprueba.** Abriendo la pestaña de red y **leyendo lo que llegó**, no lo que se pintó. Si
el dato está en la respuesta, está filtrado, aunque no se vea.

---

## 5 · Secretos en el repo — y en el historial, que es lo que se olvida

**Qué es.** Una llave, un token o una contraseña que se subió al repositorio. Y la parte que muerde:
**borrarla en un commit nuevo no la borra.** Sigue en el commit viejo, y los escáneres automáticos
leen el historial completo. Un repo público con una llave viva se encuentra en minutos, no en meses.

**Cómo se ve en lo nuestro.** Todos nuestros repos son públicos y la casa ya tiene la regla
(`CLAUDE.md` §3 regla 6). El patrón correcto **ya lo usamos y hay que copiarlo siempre**: la llave de
Groq en El Pacto Roto la pega Carlos una vez y vive en el `localStorage` de **su** teléfono, nunca en
el código. Igual la llave de GitHub del Explorador.

Ojo con la confusión que sí importa: **la llave publicable de Supabase SÍ va en el cliente**, es su
diseño. La que jamás puede salir es la de servicio (`service_role`), que ignora la RLS por completo.

**Cómo se cierra.** Una llave expuesta **se rota**, no se borra. Y para adelante: las que deben ser
secretas no entran al repo, y las que van en el cliente están ahí **a propósito y documentado**, para
que nadie las "arregle" moviéndolas y nadie confunda una con otra.

**Cómo se comprueba.** Buscando en el **historial**, no en los archivos de hoy. Y con el escaneo de
secretos de GitHub prendido.

---

## 6 · Cadena de suministro: el script de otro corriendo en nuestra página

**Qué es.** Cargar una librería desde el servidor de un tercero. Ese código corre **con todos los
permisos de nuestra página**: ve el DOM, la sesión, lo que el usuario escribe. Tres riesgos, no uno:
que el servidor **no responda** (y la app se caiga), que sirva **algo distinto** de lo que esperábamos,
y que **esté comprometido** (y entonces lo ve todo).

**Cómo se ve en lo nuestro.** Está a la vista hoy y no hizo falta auditar nada:

| Dónde | Qué carga |
|---|---|
| `ligas-mazi/index.html:1542` | `supabase-js@2` desde `cdn.jsdelivr.net` |
| `vitallink/index.html:1002` | `leaflet@1.9.4` desde `unpkg.com` |

Lo agravante del primero: **`@2` no es una versión, es un rango**, no trae `integrity`, y corre en la
misma página que maneja sesiones, pagos y datos de menores. Si jsdelivr no contesta, no hay login — y
falla **en silencio**, porque el código lo contempla con un `if` que simplemente no hace nada.

**Cómo se cierra.** **Vendorizar:** el archivo al repo, versión fija, `src` local. Cuesta menos de una
hora y ya sabemos hacerlo — `anime.min.js` está vendorizado en esa misma carpeta. Es LA REGLA §2 sin el
matiz que la perdona, porque el matiz aplica cuando construir cuesta más que la chamba, y aquí cuesta
menos. Anotado en `herramientas/PENDIENTES.md` punto 5.

**Cómo se comprueba.** Bloqueando el dominio del CDN y abriendo la app. Si algo dejó de funcionar,
todavía dependíamos.

---

## 7 · Lo que el usuario sube

**Qué es.** Cualquier archivo que un desconocido puede mandar es superficie. Y hay una trampa que casi
nadie ve: **un SVG no es una imagen, es código.** Servido en la misma página, es un script con
disfraz. Además: el `accept` del input es decorativo, la extensión miente, y el tamaño sin tope es una
forma de tumbar el teléfono de otro.

**Cómo se ve en lo nuestro.** Ligas Mazi acepta **logos de equipo**. Ahí están las cuatro preguntas:
qué tipos se aceptan **de verdad**, qué tamaño máximo, qué pasa con un SVG, y **quién puede
sobrescribir el logo de qué equipo** (que en realidad es el punto 1 disfrazado de subida de archivo).

**Cómo se cierra.** Validar el tipo **por su contenido** y no por el nombre; lista blanca corta
(`png`, `jpg`, `webp`) y **SVG fuera** salvo que se sirva desde otro dominio o se sanee; tope de
tamaño; renombrar el archivo al guardarlo para que el nombre del usuario no decida la ruta; y una
política que diga quién puede escribir en qué carpeta.

**Cómo se comprueba.** Subiendo un archivo con la extensión cambiada, uno enorme, y un SVG con un
script adentro. Los tres tienen que ser rechazados.

> **Nota nuestra:** en el Explorador esta clase salió del lado de leer. `raw.githubusercontent` sirve
> los SVG como texto plano, así que no se pueden mostrar con `<img>` y hay que inyectarlos. Se hace,
> **pero saneados** — se les quitan los `<script>`, los atributos `on*` y los `javascript:` antes de
> inyectar. Son nuestros propios archivos y aun así se sanean, porque "es nuestro" no es un control de
> seguridad.

---

## 8 · Meter texto de alguien en la página sin escaparlo (XSS)

**Qué es.** Tomar algo que escribió un usuario y ponerlo en el HTML con `innerHTML`. Si trae etiquetas,
el navegador las **ejecuta**. El nombre de un equipo, un comentario, el nombre de un jugador: cualquier
texto que otra persona vaya a ver.

**Cómo se ve en lo nuestro.** Todo lo nuestro arma HTML con plantillas de texto, así que cada dato de
usuario que se pinta es un punto de esta clase. En Ligas Mazi eso son nombres de equipo, de jugador y
de liga — datos que **otras personas** van a ver, que es lo que lo hace grave.

**Cómo se cierra.** Escapando **siempre** al pintar, sin excepciones "porque este dato es de
confianza". Y donde sólo hace falta texto, `textContent` en vez de `innerHTML`: no se puede escapar mal
lo que nunca se interpretó como HTML.

**Cómo se comprueba.** Poniéndole a un equipo un nombre con etiquetas y viéndolo **desde otra cuenta**.
Si algo se ejecuta o desaparece del texto, está abierto.

---

## 9 · Lo que queda guardado en el teléfono

**Qué es.** `localStorage` no tiene permisos: lo lee **cualquier script que corra en esa página**, y
sobrevive a cerrar la app. Un token de sesión ahí es cómodo y es un riesgo; una llave de API ahí es
la decisión correcta sólo si el dueño de la llave es el dueño del teléfono.

**Cómo se ve en lo nuestro.** Lo usamos mucho y **bien**: partidas de Pacto Roto y Romero, la llave de
Groq, la llave de GitHub del Explorador, los favoritos. En todos esos casos el dato es **del usuario y
para el usuario**, que es exactamente cuándo esto se vale.

**Cómo se cierra.** No hay que cerrarlo: hay que **cuidar la condición que lo hace seguro**, y es una
sola — **ningún script ajeno en una página que guarda algo del usuario.** O sea que el punto 6 no es
sólo una deuda de arquitectura: es lo que sostiene este punto. Y lo que nunca va ahí es un dato de un
tercero (el CURP de un menor no se guarda en el teléfono de nadie).

**Cómo se comprueba.** Abriendo el almacenamiento del navegador y leyendo lo que hay. Si aparece algo
que no es del dueño del teléfono, sale.

---

## 10 · Login: adivinar cuentas y probar mil veces

**Qué es.** Dos clases hermanas. **Enumeración:** el login contesta distinto para "ese correo no
existe" y "contraseña incorrecta", y con eso alguien arma la lista de quién tiene cuenta. **Fuerza
bruta:** nada impide intentar mil contraseñas.

**Cómo se ve en lo nuestro.** Ligas Mazi tiene registro con confirmación por correo. Los mensajes de
error del formulario y el aviso de "ya existe una cuenta" son justo donde esto se asoma. Y no hay
servidor propio donde poner un límite: **GitHub Pages no tiene servidor**, así que el límite tiene que
venir del proveedor de auth.

**Cómo se cierra.** Mensajes de error **iguales** para los dos casos ("correo o contraseña
incorrectos"), y activar los límites de intentos del proveedor. Donde sí se puede ser explícito es en
**registro**, y ahí la salida elegante es no decir nada tampoco: mandar el correo de confirmación
siempre y contarle al dueño del buzón, no a quien llenó el formulario.

**Cómo se comprueba.** Probando un correo que existe y uno que no, y **comparando la respuesta letra
por letra** — y también el tiempo que tarda.

---

## 11 · Doble clic, dinero contado dos veces

**Qué es.** Una operación que no es idempotente y se dispara dos veces: dos registros, dos pagos, dos
inscripciones. Pasa con el doble toque, con la señal mala (el usuario cree que no pasó y le da otra
vez), y con recargar a media operación.

**Cómo se ve en lo nuestro.** Cualquier cosa que **cree** algo o **sume** algo. Inscribir un jugador,
registrar un pago, cerrar un partido. Y es justo el terreno de Michi: *"le di dos veces rápido y se
registró dos veces"* es un hallazgo real, no una broma del gato.

**Cómo se cierra.** Tres capas y hacen falta las tres: **deshabilitar el botón** mientras va (para el
usuario), una **restricción `UNIQUE`** en la base que haga imposible el duplicado (para el atacante), y
que la operación se pueda **repetir sin daño** — si ya existe, contesta "ya existe" en vez de crear
otro.

**Cómo se comprueba.** Doble clic rápido, y mandar la misma operación dos veces seguidas. El resultado
tiene que ser **uno**.

---

## 12 · Operaciones a medias

**Qué es.** Una secuencia de pasos donde uno truena y **nadie repara el estado**. Un pago cobrado sin
registrar, un usuario creado sin equipo, un partido cerrado sin marcador. No es un hueco de seguridad:
es peor, porque los datos quedan mintiendo.

**Cómo se ve en lo nuestro.** Ya nos pasó y por eso Chuy pregunta siempre *"¿qué pasa si truena a la
mitad?"*: el **softlock de Torre Infinita** era eso — el control se habilitaba al final de una cadena
de esperas anidadas y si un eslabón fallaba, el estado quedaba muerto **para siempre**. Y *parecía*
funcionar con el ratón porque los botones eran de otra escena que seguía viva.

**Cómo se cierra.** Que lo que debe pasar junto **pase junto** (una transacción, o una función del lado
de la base), y que el estado se restaure en un `finally` y no al final del camino feliz. Si de plano no
se puede hacer atómico, entonces tiene que existir la forma de **detectar y reparar** lo que quedó a
medias.

**Cómo se comprueba.** Provocando la falla a propósito en cada paso: cortar la red, tumbar la
respuesta, recargar. Después de cada uno, **mirar los datos**: ¿quedó completo, o quedó a medias?

---

## 13 · El service worker sirviendo lo que no debe

**Qué es.** Un service worker es un intermediario que decide qué se sirve del caché. Dos formas de
morder: **servir una versión vieja** (y el equipo jura que "no se ve el cambio"), y **cachear una
respuesta privada** — que entonces se queda en el teléfono, y si otra persona usa ese teléfono, la ve.

**Cómo se ve en lo nuestro.** Pacto Roto y Romero tienen service worker y **está bien que lo tengan**:
son juegos sin cuentas y sin datos de nadie, jugables sin señal, que es justo para lo que sirve. El
cuidado entra el día que una app **con cuentas** lleve uno.

**Cómo se cierra.** Versionar el caché y **limpiar los viejos** al activar; nunca cachear respuestas de
la API con datos de una persona; y **borrar todo el caché al cerrar sesión**, que es el paso que
siempre se olvida.

**Cómo se comprueba.** Cerrar sesión, poner el teléfono en modo avión, y volver a abrir. Si todavía se
ve algo de la sesión anterior, ahí está.

---

## 14 · Datos de menores — y aquí el arreglo empieza antes

**Qué es.** No es una clase técnica: es la que **cambia el nivel de todas las demás.** Un IDOR sobre un
catálogo de productos es un bug. El mismo IDOR sobre el CURP de un niño es otra cosa por completo.

**Cómo se ve en lo nuestro.** Ligas Mazi guarda **CURP de menores** y va a guardar la cadena
padre↔menor (pendiente D). Y ojo con eso último, porque es la trampa: **vincular por CURP significa que
un campo de texto decide de quién eres responsable.** Eso no es un formulario, es **un permiso
disfrazado de dato**, y se audita **antes** de construirlo, no después.

**Cómo se cierra.** Empezando por la pregunta de Paola, que va antes que cualquier arreglo técnico:
**¿hace falta guardarlo?** El dato que no existe no se filtra. Si hace falta, entonces: se guarda lo
**mínimo**, no sale nunca en una respuesta (punto 4), no se puede **buscar** por él, no se guarda en el
teléfono de nadie (punto 9), y la vinculación la resuelve la base contestando **sí o no** — nunca
devolviendo el dato.

**Cómo se comprueba.** Intentando **buscar** por CURP desde una cuenta cualquiera, y **leyendo las
respuestas** de red de todas las pantallas que tocan un menor. El CURP no debe aparecer en ninguna.

---

## Los cinco arreglos que cierran más de una clase a la vez

Si sólo se pudieran hacer cinco cosas, éstas, en este orden — porque cada una tapa varias fichas de
arriba:

| # | El arreglo | Cierra |
|---|---|---|
| 1 | **Auditar las 21 políticas de RLS**, y por separado leer / escribir / cambiar / borrar | 1 · 3 · 4 · 14 |
| 2 | **Pedir sólo las columnas que se usan**, y que las sensibles no salgan | 4 · 14 |
| 3 | **Vendorizar `supabase-js` y `leaflet`** | 6 · y sostiene el 9 |
| 4 | **Escapar siempre al pintar** dato de usuario | 8 |
| 5 | **`UNIQUE` + botón bloqueado + operación repetible** en todo lo que crea o suma | 11 · 12 |

**Y el que no es un arreglo sino una costumbre:** dos cuentas de prueba permanentes, A y B, que no sean
de nadie real. La mitad de las comprobaciones de este archivo son *"pide lo de B con la sesión de A"*,
y sin esas dos cuentas listas, nadie las corre.
