# El diseño, y contra qué se comparó

Carlos: *«necesito que te enfoques al 100 en diseño… usa alguna web famosa
como punto de comparación; cada cambio artístico que hagas corrobora tu
versión con la web seleccionada»*, y después *«hazlo más original y ahora
básate en otra web para un diseño diferente y más distintivo»*.

Este archivo es ese cotejo, en orden. Va aquí para que se pueda discutir con
números y no con impresiones.

---

# v4 · «BURBUJA» — la referencia son **las seis imágenes de Carlos**

Carlos mandó seis referencias (e502) y con eso quedó claro que la v3 iba por
el lado equivocado. **La v3 era distintiva pero austera; sus seis son
cálidas, saturadas y redondas.** Es su decisión y manda.

## Lo que comparten sus seis, contado

Ajustes de Material You · una app de eventos en menta · una de música en azul
noche con salmón · una de empleo en lima con violeta · una de salud en índigo
con coral · Headspace con sus manchas orgánicas.

| Sus referencias | La v3 que yo había hecho |
|---|---|
| Esquinas MUY redondeadas (18–28 px, y pastillas) | radio **0** |
| Color saturado en **bloques grandes** | un acento diminuto |
| Dos o tres colores fuertes conviviendo | uno solo |
| Tarjetas suaves flotando sobre color | hojas con borde de 1 px |
| Formas orgánicas | retícula milimétrica |
| Registro amable, de app de consumo | instrumento de ingeniería |

## Pero no se copia una pantalla de Dribbble

Eso sería volver a lo genérico por otro camino. El tema da la forma, y el
tema es **jabón**:

| Decisión | Por qué es de ESTE proyecto |
|---|---|
| **La espuma** — manchas orgánicas al fondo del bloque de color | En Headspace son una decisión de estilo; aquí son **burbujas**. Salen sólo donde hay color y nunca sobre el contenido, para que no se vuelvan textura |
| **Todo redondo**, hasta la probeta | Una burbuja no tiene esquinas |
| **Índigo + coral**, con menta para «esto ya se puede afirmar» | Es el par de su referencia de salud. Tres colores que trabajan, no un acento tímido |
| **Los números dejan la monoespaciada pero conservan `tabular-nums`** | La mono era de la v3 y sonaba a laboratorio. Sin ella una columna de cifras se sigue comparando de un vistazo, pero sin el registro técnico |
| **La probeta se queda** | Es lo único que no vino de ninguna referencia: es del proyecto |

## Los colores se calcularon, no se ajustaron a ojo

La compuerta de contraste reprobó el primer intento y los números decidieron:

| | Blanco encima | |
|---|---|---|
| `#FF6B3D` coral vivo | **2.83:1** | no pasa |
| `#D8461B` | 4.36:1 | no pasa |
| `#C63E15` coral hondo | **5.12:1** | pasa |

De ahí salieron **dos corales con trabajos distintos y no intercambiables**:
el vivo para rellenos grandes **con texto tinta encima** —que es exactamente
lo que hace su referencia del botón lima— y el hondo para texto y para
bloques con texto blanco.

### Y otra vez la compuerta se equivocó antes que el diseño

Reportaba **1.00:1** en el botón secundario de la portada. Ese botón es
`rgba(255,255,255,.18)` sobre índigo, y mi comprobación tomaba el primer
fondo con alfa y se quedaba con su RGB tal cual: lo medía como blanco puro
contra texto blanco. **Un blanco translúcido sobre índigo no es blanco.**
Ahora las capas se componen una sobre otra hasta llegar a un fondo opaco,
que es lo que de verdad ve el ojo.

## La regla de esquina cambió de dueño

En la v3 la compuerta exigía **radio 0** (la disciplina de Carbon). Ahora
exige **12 px o más**. La compuerta sigue el diseño vigente, no el anterior
— pero sigue siendo una regla que se puede romper sin querer y que nadie ve
hasta que la lámina se ve barata.

---

# v3 · «INSTRUMENTO» — la referencia fue **IBM Carbon** (queda como registro)

## Por qué se rehízo la v2

La v2 tenía **orden** pero no **identidad**. Teal, esquinas redondeadas y
tarjetas blancas con sombra suave es lo que se ve en cualquier producto de
software: ordenado y anónimo. Carlos lo dijo en una línea y tenía razón.

## Lo que se midió de Carbon

`carbondesignsystem.com`, bajado y contado — no descrito de memoria. Es lo
**opuesto** a Stripe, que era la referencia de la v2:

| | Stripe (v2) | **IBM Carbon (v3)** |
|---|---|---|
| Radio | 4 · 8 · 16 · 30 px | **0** — es su valor dominante |
| Pesos | 300–700, display **negro** | **100 · 300 · 400 · 600** — display **ligero**, ninguna negra |
| Escala | hasta 48 px | hasta **156 px** |
| Color | morado + pasteles | `#0f62fe` puro, grises duros `#161616 #e0e0e0 #8d8d8d`, rojo `#da1e28` |
| Sensación | producto amable | **instrumento de ingeniería** |

De esas cuatro, la que más cambia el carácter es el **peso ligero en el
display**: un titular en 300 se lee técnico; el mismo en 700 se lee
comercial. Es una decisión que casi nadie copia y por eso Carbon se reconoce.

## Pero la identidad no se copia, se saca del tema

De Carbon se toma la **estructura** —esquina viva, display ligero, retícula,
bordes en vez de sombras—. El carácter sale del propio proyecto, y por eso no
se parece a Carbon ni a nadie:

| Decisión | Por qué es de ESTE proyecto y no de otro |
|---|---|
| **Papel cuadriculado** de 4 mm dibujado en CSS | Es el sustrato real de un proyecto de ciencias. No es textura: la retícula es la misma unidad con la que se mide |
| **Todos los números en IBM Plex Mono** | Los números de un laboratorio se escriben en monoespaciada; y una columna de cifras en mono se compara de un vistazo |
| **Rojo de corrección** `#C1121F` como único acento | No es un color de marca: es el rojo del bolígrafo con el que alguien marca en una libreta lo que importa. Aparece **una vez** por pantalla |
| **La probeta graduada** en lugar de una barra de progreso | El instrumento del proyecto convertido en elemento de interfaz. Y se lee mejor: una barra dice «va por la mitad», una probeta dice **cuánto y de qué** |
| **El corte del logotipo es de PESO, no de color** | `JABO` en 300 y `NERA` en 600. En la v2 era un cambio de color, que es lo que hace todo el mundo |

## La disciplina, medida sobre lo renderizado

`pruebas-pantalla.mjs` no mira el CSS: mira **lo que el navegador pinta**.

```
✓ la escala no pasa de 8 tamaños
✓ los pesos no pasan de 5
✓ hay un tamaño de DISPLAY de 44 px o más
✓ ningún estilo en línea usa una variable de color que ya no existe
✓ todo el texto pasa el contraste mínimo contra el fondo que le toca
✓ IBM Plex Sans y Mono cargaron de verdad (no se cayó al tipo del sistema)
✓ esquina viva en todo: radio 0, que es la regla de Carbon
✓ lo primero que se ve es el campo de marca, no un formulario
✓ y CERO campos de texto en la primera pantalla
```

### Tres cosas que salieron de esas comprobaciones, y ninguna la vio el ojo

1. **Una variable de color muerta.** Al cambiar la paleta quedaron `var(--agua)`
   sueltas en estilos en línea. Una variable que no existe **no da error**: la
   propiedad se queda sin valor, y el resultado fue un chip con texto blanco
   sobre fondo transparente — ilegible — con la página cargando sin un solo
   error de JavaScript.
2. **La prueba no llegaba al defecto.** La primera versión de esa comprobación
   sólo miraba el panel abierto, y el chip roto vivía en otra pestaña: la
   mutación de prueba **no la puso roja**. Ahora recorre las cinco pestañas y
   los tres pasos del recorrido.
3. **La compuerta mintió, y no el diseño.** El contraste daba 1.04:1 en las
   etiquetas de tipo. Resultó que mi regex para «fondo transparente»
   (`/, *0\)$/`) casaba también con **cualquier color cuyo canal azul fuera
   cero**: `rgb(138, 90, 0)` se contaba como transparente. El contraste real
   era 5.93:1. Ahora la alfa se lee del valor, no se adivina.

## IBM Plex

Autohospedada en `tipos/`, licencia **SIL Open Font License 1.1**. Va
autohospedada y no traída de un CDN porque el archivo suelto tiene que abrir
desde una memoria USB sin internet, y ahí una fuente remota es una fuente que
no carga. En `jabonera.html` viaja incrustada en base64: una `url()` relativa
apuntaría a una carpeta que no está y la página se caería al tipo del sistema
**sin decir nada**, que es la peor forma de fallar.

---

# v2 · la referencia fue **stripe.com** (queda como registro)

## Por qué se eligió Stripe

Se eligió por tres razones, y la tercera es la que lo hace útil:

1. Es famosa y es la referencia que más se cita cuando se habla de que un
   producto «se vea caro».
2. **Su problema de diseño es el mismo que el nuestro**: hacer que datos
   densos —números, tablas, pantallas de producto— se lean claros y valiosos.
   No es una web de fotos bonitas; es una web de cifras.
3. **Se puede medir de verdad.** Se bajó su hoja de estilos y se contaron sus
   valores. Lo que sigue no es una descripción de memoria.

```
curl https://stripe.com  →  sus 5 hojas de estilo (475 KB)
grep font-size / font-weight / letter-spacing / border-radius
```

## Lo que se midió, y el diagnóstico de la v1

| | **Stripe** (medido) | **Jabonera v1** (medido) |
|---|---|---|
| Tamaños de letra | **7** · 12 · 14 · 16 · 18 · 22 · 34 · 48 px | **13**, sin escala: 11, 11.5, 12, 12.5, 13, 14, 14.5, 15.5, 16, 17, 19, 22, 26 |
| Pesos | **5** · 300, 400, 500, 600, 700 | **8**, con 620, 650, 730 y 750 inventados |
| Tipo más grande | **48 px** | **26 px** |
| Tracking | negativo en display (−0.0125 a −0.031 em), **positivo** en texto chico (+0.003 em) | mezclado, sin regla |
| Radios | 4 · 8 · 16 · 30 px | 2 · 5 · 999 px |
| Color | un primario (`#635bff`) y tres acentos, sobre casi blanco | un primario, sin acento |

**Ahí estaba el problema entero, y no era el color:** sin un tamaño de
*display*, todo era interfaz y nada era producto. Un panel de administración
se ve exactamente así. Las tres referencias de la casa hacen lo contrario:

- **Fadori** abre con una pantalla naranja a sangre, el logotipo enorme y una
  bajada en versalitas espaciadas. Cero campos.
- **Ligas Mazi** abre con una foto, `LIGAS` en blanco y `MAZI` en naranja en
  tipo de display apilado, y **un** botón primario relleno.
- **Guerra de Puercos** abre con un degradado rosa, el nombre en display con
  contorno, una frase con carácter, y **cinco botones gruesos** con borde
  duro y sombra desplazada — el primero relleno en negro, los demás blancos.

Las tres coinciden en lo mismo: **una palabra grande, color a sangre, un
primario claro y ni un campo de texto en la primera pantalla.**

## Lo que se cambió, y contra qué se corroboró

| Cambio | Corroborado contra |
|---|---|
| **Escala cerrada de 7 tamaños** (12·14·16·18·22·34·52) con el salto deliberado entre 22 y 34 | Stripe: 7 tamaños, salto 22→34→48. Es lo que separa «texto» de «dato» |
| **4 pesos** (400·500·600·700), ninguno inventado | Stripe: 5 pesos estándar, ninguno raro |
| **Display a 52 px** en la portada y en la cifra principal | Stripe llega a 48. Aquí sube a 52 porque el número medido **es** el producto, y en un examen se ve de lejos |
| **Tracking: −0.035 em en display, −0.025 en título, +0.09 em en versalitas** | Stripe: negativo arriba, positivo abajo. Regla de imprenta, no gusto |
| **Radios 8 · 16 · 999** | Stripe: 4 · 8 · 16 · 30 |
| **Portada con campo de color a sangre**, palabra grande y un primario blanco | Fadori, Ligas Mazi y Puercos hacen las tres cosas |
| **Botones gruesos de 52 px con sombra dura desplazada** | El menú de Puercos, tal cual |
| **Un solo acento** (ámbar `#FFC24B`) y sólo en la cifra principal | Stripe: un primario y los acentos dosificados |
| **Bandas de fondo alternado** entre secciones | Stripe alterna fondo para marcar dónde acaba una idea |

## Lo que Carlos mandó quitar, y con qué se sustituyó (sigue vigente en la v3)

> *«evita listas de botones con cuadros de texto, reparte bien cada cosa en la
> pantalla»*

Tenía razón: la v1 era exactamente eso. Lo que hay ahora:

1. **La portada no tiene un solo campo.** Color, nombre, la cifra medida, un
   botón primario. Comprobado por la compuerta: `#p-inicio input` = 0.
2. **Registrar es un recorrido de tres pasos, no un formulario.**
   - *Paso 1* · el baño se elige en **fichas grandes con medidor**: cada una
     enseña con una barra cuánto le queda dentro al dispensador. Una lista
     que además informa deja de ser una lista.
   - *Paso 2* · el número se teclea **en tamaño de dato** (34 px) con atajos
     —Vacío · ¼ · ½ · ¾ · Lleno— calculados sobre la capacidad real de ese
     baño. Con los atajos, casi nunca hay que teclear.
   - *Paso 3* · **se enseña lo que se va a calcular ANTES de guardar.** Quien
     mide ve el resultado de su medición; eso es lo que hace que la semana
     siguiente siga midiendo.
3. **El dato es el producto.** La cifra principal va a 52 px sobre el color de
   la casa, no en una tarjetita de 26 px.

## La disciplina se comprueba sola

`pruebas-pantalla.mjs` mide **lo que se renderiza**, no lo que dice el CSS:

```
✓ la escala no pasa de 8 tamaños — usa 5: 12, 14, 16, 18, 52
✓ los pesos no pasan de 5 — usa 3: 400, 600, 700
✓ hay un tamaño de DISPLAY de 44 px o más — el mayor es 52 px
✓ lo primero que se ve es el campo de marca, no un formulario
✓ y CERO campos de texto en la primera pantalla
```

Si alguien vuelve a meter un `font-size: 13.5px` suelto, la compuerta se pone
roja. Es la única forma de que una decisión de diseño dure más de una sesión.

## Lo que NO se copió de Stripe, y por qué

- **La paleta de Stripe.** Su morado es suyo. Aquí el campo es petróleo —agua
  y jabón— con un solo acento ámbar.
- **Su densidad de escritorio.** Stripe se diseña para una pantalla grande;
  esto se usa **de pie en un baño, con una mano**. Por eso la barra de
  acciones va abajo, todo lo tocable mide 48 px y los campos van a 16 px
  —por debajo de eso iOS hace zoom solo al tocarlos.
- **Su animación.** Aquí no hay ninguna librería y el movimiento es un
  `translateY` de 4 px al cambiar de pestaña. `backdrop-filter` está
  descartado a propósito: obliga a recomponer en cada fotograma de scroll.
