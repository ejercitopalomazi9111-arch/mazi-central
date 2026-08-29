---
name: comite-uiux
description: Revisar una interfaz con un comité de cinco especialistas —UX, UI, movimiento, accesibilidad y rendimiento— contra el curso de 140 apartados de Carlos, con preguntas que se contestan sí o no y que sí pueden reprobar. Úsala antes de entregar cualquier pantalla, cuando haya que decidir si algo está listo, cuando alguien pida un showcase o una demo, cuando el trabajo lo generó un modelo y hay que revisarlo, y al ARRANCAR un diseño para saber qué se va a exigir después. También cuando haya una duda concreta de interfaz: el índice manda directo al apartado que la contesta.
---

# El comité de UI/UX

Carlos lo pidió así, en el commit que subió el curso: *«créate un comité de
UIUX como una skill que tenga cargado el curso entero para que puedan ayudarte
y ser como un segundo cerebro tuyo»*.

Lo que hay aquí:

| Archivo | Qué es |
|---|---|
| `curso.md` | El curso íntegro. 140 apartados, 41 KB. Fuente de verdad, no se edita |
| `INDICE.md` | Los 140 con su renglón, para saltar directo |
| `SKILL.md` | Esto: el comité y cómo se corre una revisión |

---

## Por qué un comité y no una lista más

Porque **una sola cabeza aprueba su propio trabajo.** Eso no es un defecto de
carácter: quien acaba de resolver el movimiento está mirando el movimiento, y
el contraste del texto chico le queda literalmente fuera de la vista. La
revisión de uno mismo tiene un punto ciego con la forma exacta de lo que
acabas de hacer.

Cinco asientos, cinco mandatos que **se estorban a propósito**. El de movimiento
quiere más; el de rendimiento quiere menos; el de accesibilidad quiere que se
pueda apagar. Cuando dos asientos discrepan, esa discusión es el producto — no
un problema que resolver rápido.

Y la regla que hereda de `tics-de-ia`, que es de la casa:

> **Ningún diseño se aprueba con adjetivos. Se aprueba contra preguntas que se
> contestan sí o no mirando.**

«Se ve profesional» no puede reprobar a nadie. «¿La etiqueta del campo sigue
ahí después de escribir?» sí.

---

## Los cinco asientos

### 1 · UX — ¿esto para qué sirve?

Apartados de cabecera: **1, 2, 131, 132, 133, 134.**

- ¿Está escrito, en una frase, para qué existe esta pantalla? Si no, todo lo
  demás es decoración.
- ¿La persona **toca, arrastra, espera, explora**, o nada más mira?
- ¿Lo que más importa está donde se ve primero, o enterrado bajo la letra chica?
  *(Éste reprobó una entrega mía: el aviso legal y la tabla iban antes que lo
  único que la persona venía a usar.)*
- ¿Cada acción tiene respuesta? Apartado 133: **todo debe tener feedback.**
- ¿Sobra algo? Apartado 134: **todo debe tener propósito.** Lo que no lo tenga,
  fuera.

### 2 · UI — ¿esto es un sistema o son piezas sueltas?

Apartados: **3, 104, 105, 106, 107, 108, 40, 123.**

- **Los ocho estados.** Un botón no es `[ENVIAR]`: es normal, hover, foco,
  presionado, cargando, logrado, error y apagado. ¿Están los ocho, y se pueden
  **mirar con calma**? Cargando, logrado y error viven medio segundo dentro de
  una petición: si no se pueden congelar, nadie los ha revisado nunca.
- ¿Hay **tokens** de verdad, o números escritos a mano por ahí? Si el radio, la
  sombra o el color viven en dos sitios, ya se separaron.
- ¿El tema claro es **su propia paleta**, o el oscuro con los colores volteados?
  Voltear tokens sin volver a medir es como se llega a un modo claro ilegible.
- ¿Se puede cambiar el lenguaje visual entero sin tocar la estructura?
  Apartado 123: eso es lo que demuestra que el sistema está bien hecho.

### 3 · Movimiento — ¿esto significa algo?

Apartados: **4, 5, 6, 9, 41, 48, 100, 111.**

- ¿Hay **gramática**? Cinco escalones —micro, corta, media, larga, cine— y nada
  fuera de ellos. Si aparece un `0.3s` suelto, ya no hay lenguaje.
- ¿Se puede decir **exactamente** qué pasa en el cuadro 17? Apartado 6. Si la
  respuesta es «se mueve a la derecha», no está diseñado.
- ¿Se anima **sólo `transform` y `opacity`**? Animar `width`, `top` o `filter`
  en scroll es como se llega a los tirones.
- ¿Se anima **opacidad sobre texto**? Nunca. Un texto a media transición no
  cumple contraste en ningún instante de esa transición.
- Si se suelta el scroll a media animación, ¿se queda en un estado que se ve
  bien, o a medias?
- ¿Todo se apaga con `prefers-reduced-motion` **sin perder información**?

### 4 · Accesibilidad — ¿esto funciona para quien no es como tú?

Apartados: **56, 70, 110, 111.**

- ¿Se recorre entero **con teclado**, y se ve dónde está el foco?
- Al cerrar un modal, ¿el foco **vuelve** al botón que lo abrió? Es lo que casi
  nadie hace y lo que deja perdido a quien navega con teclado.
- ¿Los objetivos táctiles llegan a 44 px? ¿Los campos son de 16 px, para que
  iOS no haga zoom?
- **El contraste se calcula, no se mira.** Es el punto donde más veces me he
  equivocado a ojo: un violeta de marca daba 4.20:1 y se veía perfecto.
- ¿Lo que se dibuja en un lienzo está **también escrito**? Si no, para quien no
  lo ve, no existe.
- ¿Un `<div>` haciendo de botón? Fuera.

### 5 · Rendimiento — ¿esto qué cuesta?

Apartados: **94, 95, 121.**

- ¿**Un solo** ciclo de animación, compartido? Cada pieza con su
  `requestAnimationFrame` suma trabajo por fotograma.
- ¿Se **detiene** lo que no está a la vista?
- ¿`backdrop-filter`? Obliga a recomponer en cada fotograma de scroll. Fue la
  causa **medida** de que un sitio de este grupo fuera a tirones. Se finge con
  capas y degradados.
- ¿Cuántas dependencias entraron? ¿Se podía con setenta líneas propias?
- ¿`devicePixelRatio` topado en los lienzos?
- Apartado 95: **no sobrecargar.** Si todo se mueve, nada destaca.

---

## Cómo se corre una revisión

1. **Se nombra el propósito** en una frase. Sin eso el comité no sesiona.
2. **Cada asiento recorre sus preguntas** y responde sí o no. Sin matices.
3. **Se juntan los «no».** Cada uno es un hallazgo con su apartado al lado.
4. **Se separan en dos montones**: los que una máquina puede comprobar y los
   que no.
5. **Los del primer montón se convierten en prueba.** No en nota: en prueba.
6. Se aplica el corte:

| «No» | Qué significa | Qué se hace |
|---|---|---|
| 0 | Está | Se entrega |
| 1–2 | Le falta un rato | Se arregla y se vuelve a pasar |
| 3–5 | No está listo | No se enseña todavía |
| 6+ | Es un borrador | Se rehace la parte que falla, no se parcha |

---

## La parte que hace que esto sirva de verdad

**Un hallazgo que se puede medir se escribe como prueba, no como nota.** Una
nota se olvida a la tercera sesión; una prueba se pone roja sola.

De los cinco asientos, éstos ya son código que corre en
`laboratorio/pruebas.mjs` y se pueden copiar:

- **Contraste calculado** con la fórmula de WCAG contra el fondo *real* —
  subiendo por los ancestros y mezclando los semitransparentes—, en los dos
  temas. Encontró cuatro colores reprobados que a ojo se ven bien.
- **La gramática vigilada**: recorre todas las duraciones que el navegador
  terminó aplicando y reprueba cualquiera que no sea un token.
- **Un solo ciclo**, medido envolviendo `requestAnimationFrame` y mirando el
  máximo simultáneo mientras algo se anima.
- **Texto pintado que se encima**, con `Range`, no con la caja del elemento.
- **Nada recortado**: `scrollWidth` contra `clientWidth` en todo lo que tenga
  overflow.
- **Movimiento reducido** y **sin JavaScript** como pasadas propias.

> Y la lección que las paga todas: **una prueba que nunca se ha visto fallar no
> es una prueba, es una esperanza.** Cada una de ésas se probó rompiendo el
> código a propósito para verla en rojo. Dos de ellas pasaban con el defecto
> puesto y hubo que reescribirlas — y una tercera reprobaba seis parejas de
> color que estaban bien, porque el defecto estaba en mi instrumento y no en la
> página.

---

## Cuándo NO conviene abrir el comité

Cuando el encargo es cambiar una cadena de texto, un teléfono o un dato. Cinco
asientos discutiendo una corrección de una línea es teatro, y el teatro le
cuesta tiempo a quien está esperando.
