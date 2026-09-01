# Departamento de diseño

Carlos, e224: *«construyas todo un departamento de diseño»*, después de decir
—con razón— que el banco de pruebas sacó **3 en UI/UX** y que el diseño es el
apartado que falta.

Esto **no** es una carpeta de apuntes. Es la maquinaria para que lo que se
aprenda quede utilizable por la sesión siguiente, que empieza sin saber nada.

```
departamento-diseno/
├── fuentes.mjs      de dónde se lee, y POR QUÉ cada casa
├── descubrir.mjs    el traedor (curl, no fetch — ver abajo)
├── cosechar.mjs     descubrir → elegir → traer
├── cosecha.json     todo lo que existe en esas casas       (generado)
├── elegidos.json    lo que se va a leer, con cupo por casa (generado)
├── leer.mjs         preguntarle al montón: buscar y sacar pasajes
└── ojos/            mirar imágenes sin gastarme a mí
```

Lo que se aprende **no se queda aquí**: se convierte en neuronas
(`cerebro/neuronas/`) y en skills (`.claude/skills/`). Este departamento es la
cocina; el cerebro y las skills son lo que se sirve.

---

## Las tres decisiones que explican la forma

### 1 · Las URLs se descubren, no se recuerdan

Lo fácil habría sido escribir 200 URLs de memoria. Sería mentira: un modelo
inventa rutas que suenan bien y dan 404, y las que acierta son las cuatro de
siempre. Así que se piden los índices y mapas de sitio de cada casa y las URLs
salen de ahí. **Lo que no existe, no entra.**

Y esto ya cobró dos veces. La primera cosecha trajo **cero** de Smashing y
cero de A List Apart, y parecía que las fuentes estaban caídas. No lo estaban:
sus índices los arma JavaScript en el navegador, así que el HTML que llega por
`curl` no tiene ni un enlace a un artículo. Smashing se resolvió por su mapa
de sitio; A List Apart por su API de WordPress —y ahí hubo que enseñarle al
extractor a ver URLs dentro de JSON, con las barras escapadas, porque buscando
`href` no se ve ni una—.

### 2 · Cupo por casa, aunque baje el total

Descubrir trae miles. Eso no es «200 artículos que valgan la pena»: es un
montón. Y un montón con una fuente dominando **no cumple lo que se pidió** —
en la primera cosecha css-tricks solito ponía el 54 %.

Con cupo, el total baja y lo que se aprende sube: **ocho voces que se
contradicen enseñan más que una repetida trescientas veces.** Cuando dos
fuentes chocan —y chocan: la norma dice una cosa, el oficio otra— ahí hay una
neurona de decisión esperando.

Las casas están mezcladas a propósito en tres grupos que no se llevan bien:

| | Quién | Qué aporta |
|---|---|---|
| **La norma** | W3C, WCAG | Lo que hay que cumplir, con su letra |
| **El motor** | MDN, web.dev | Lo que el navegador hace de verdad |
| **El oficio** | Smashing, CSS-Tricks, A List Apart, NN/g, Practical Typography | Lo que se aprende peleándose con clientes |

Quien sólo lee la norma hace cosas correctas y feas. Quien sólo lee el oficio
hace cosas bonitas que se rompen.

### 3 · El texto ajeno no se commitea

Doscientos artículos de otros dentro del repo son dos cosas malas a la vez:
peso muerto y obra ajena publicada sin permiso. En el repo queda la **lista**
—de dónde salió cada cosa— y **lo que yo escriba a partir de leerlos**. El
texto vive en el disco de trabajo y se vuelve a traer cuando haga falta.

---

## ⚠ `fetch` de Node no sale de este contenedor

La salida a internet va por un proxy que `fetch` no atraviesa: contesta 403
«Host not in allowlist» contra sitios que `curl` trae sin problema. **Medido,
no supuesto.** Por eso todo aquí llama a `curl` y no a la API que uno
esperaría. Si algún día esto se arregla, el sitio donde cambiarlo es
`descubrir.mjs` y sólo ahí.

Y no se pide a lo bruto: hay pausa entre peticiones. Una cosecha que tumba el
sitio del que aprende no es una cosecha, es un abuso.

---

## Cómo se usa

```bash
node departamento-diseno/cosechar.mjs descubrir   # qué existe
node departamento-diseno/cosechar.mjs elegir      # qué se va a leer, con cupo
node departamento-diseno/cosechar.mjs traer       # bajarlo y dejarlo en texto

node departamento-diseno/leer.mjs casas                        # cómo quedó el reparto
node departamento-diseno/leer.mjs buscar "contraste texto chico"
node departamento-diseno/leer.mjs pasajes "layout shift" 6     # el párrafo Y su fuente
```

`pasajes` devuelve el **párrafo con su URL** y no un resumen, a propósito: una
neurona tiene que poder señalar de dónde salió. Un resumen ya es
interpretación, y la interpretación es justo lo que hay que poder revisar.

---

## Los ojos

`ojos/mirar.mjs` manda una imagen a Gemini y devuelve una descripción
**estructurada y medible** — retícula, jerarquía, paleta, profundidad,
tratamiento— en vez de un adjetivo.

Existe por una razón concreta: yo **sí** puedo mirar una imagen, y de hecho
los tres defectos que encontré el 29 de agosto salieron de capturas y no de
leer código. Lo que no puedo es mirar **cientos**: cada imagen se paga del
mismo saldo con el que pienso. Esto mueve ese gasto a un modelo aparte y me
devuelve palabras, que salen baratas.

La llave sale de `GEMINI_LLAVE` en el entorno y **nunca** de un archivo: este
repo es público y tiene escaneo de secretos, y una llave commiteada está
quemada aunque se borre en el commit siguiente — queda en el historial.
