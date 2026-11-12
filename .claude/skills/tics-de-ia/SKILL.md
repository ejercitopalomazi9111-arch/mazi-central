---
name: tics-de-ia
description: Juzgar un diseño con una lista concreta de tics en vez de con adjetivos, para cazar lo que "se ve de IA" antes de entregarlo. Úsala cuando haya que decidir si una pantalla está lista, cuando alguien diga que algo se ve genérico, plantillero o "de IA", cuando el trabajo lo generó un modelo y hay que revisarlo, y siempre antes de enseñarle una interfaz al cliente. También al pedir un diseño, para prohibir los tics desde el encargo.
---

# La lista de tics

Salió de un problema concreto: **«que se vea profesional» siempre sale aprobado.**

Es un criterio que no puede reprobar a nadie. Uno mira la pantalla, la pantalla está
ordenada y alineada, y el veredicto se escribe solo: *sí, se ve profesional*. Con esa
vara pasan tanto un diseño bueno como el promedio de internet, porque el promedio de
internet también está ordenado y alineado — de eso justamente está hecho.

Una lista concreta sí reprueba. «¿Tiene degradado morado-azul? ¿Todo es `rounded-lg`?
¿Los iconos de sección son emoji?» son preguntas que se contestan sí o no mirando, y que
no admiten benevolencia.

**La regla de la casa: ningún diseño se aprueba con adjetivos. Se aprueba contra la
lista.**

---

## Cómo se usa

1. Se recorre la lista y se marca cada tic presente. Sí o no, sin matices.
2. Se cuenta.
3. Se aplica el corte:

| Tics | Qué significa | Qué se hace |
|---|---|---|
| 0–2 | Tiene decisiones propias | Pulir |
| 3–5 | Se le nota la plantilla | Cambiar las que se puedan sin rehacer |
| 6+ | **Esto es el promedio de internet, no un diseño** | Rediseñar, no pulir |

El corte importa porque a los 6 tics el problema ya no es de detalles: es que nadie
escogió nada. Pulir seis tics uno por uno da un promedio de internet con las esquinas
limadas.

---

## La lista

### Color

- **Degradado morado→azul.** El de la rampa indigo/violet/purple de Tailwind, casi
  siempre de fondo del encabezado o dentro del título. Es el tic número uno y el que se
  reconoce desde el otro lado del cuarto.
- **Un solo acento saturado sobre grises neutros**, sin ningún color secundario en toda
  la pantalla. Un sistema de color de verdad tiene al menos dos colores que se sostienen.
- **Los grises son literalmente los de la librería** (`slate`, `zinc`, `gray`) sin una
  sola desviación. Los grises son lo más fácil de teñir y lo que más cambia el carácter.
- **Oscuro `#0F172A` con tarjetas `#1E293B`.** El modo oscuro por defecto de todo el
  mundo.
- **Luces borrosas de colores detrás del texto** (manchas con `filter: blur`). Si hace
  falta profundidad, una foto o una textura real del negocio.
- **Gris sobre negro que casi no se lee.** El texto secundario se saca del color
  principal con opacidad y se mide: 4.5:1 mínimo.
- **Sombra de color que brilla debajo del botón** (`box-shadow` morada o del acento). El
  botón se distingue por su color de fondo, no por un halo.

### Tipografía

- **Una sola familia** —Inter, o `system-ui`— para display y para texto corrido. Dos
  familias con papeles distintos es de las cosas más baratas que separan un diseño del
  promedio.
- **La jerarquía se hace con negritas, no con escala.** Todos los títulos miden casi lo
  mismo y se distinguen porque uno está en `bold` y otro en `semibold`.
- **Degradado dentro del texto del título** (`background-clip: text`).
- **Interletraje por defecto en display grande.** Un título de 56 px sin `letter-spacing`
  negativo se ve suelto, y ése es el ajuste que nadie hace por accidente.
  ⚠ **Ojo, aquí hay dos escuelas.** La guía «Diseño sin vibecoded» (Level AI, agosto
  2026) dice lo contrario: que el titular gigante con las letras APRETADAS es el tic, y
  que el tamaño se logra con `font-size`, no apretando. Las dos tienen razón a medias:
  apretar un poco (−0.01 a −0.02 em) un título de display es oficio; apretarlo hasta que
  las letras casi se tocan (−0.04 em o más), con interlínea abajo de 1.1, es el tic.
  Se mide en la captura, no en el CSS.
- **Media frase del titular en gris** («Construimos productos *que la gente ama*» con la
  segunda mitad atenuada). Si hay énfasis, UNA palabra en el color de marca.
- **Etiquetas en mayúsculas espaciadas encima de cada sección** («NUESTRO PROCESO»,
  «TESTIMONIOS»), muchas veces en pastilla. Una vez puede ser marca; en cada sección es
  plantilla. Fue lo primero que se le quitó a la página de Urban Pest el 12 de noviembre.

### Forma

- **Un solo radio para todo**, casi siempre `rounded-lg` o `rounded-xl`: botones,
  tarjetas, avatares, campos, imágenes. Un sistema tiene radios distintos según el
  tamaño de la pieza, o de plano no tiene radio.
- **La misma sombra difusa en todo lo que flota**, tipo `shadow-lg`, sin dirección de luz
  que se sostenga en la pantalla.
- **Borde de 1 px gris claro en absolutamente todas las cajas.** Cuando todo está
  encerrado, nada destaca.
- **Tarjeta con barrita de acento a la izquierda.**
- **Borde degradado** en botones o tarjetas. Borde sólido de 1 px, o ninguno.
- **Tarjetas de vidrio esmerilado** (`backdrop-filter`) puestas porque sí, sin nada
  detrás que valga la pena ver borroso. Una barra fija sobre contenido es otra cosa.
- **Borde blanco translúcido de 1 px** (`rgba(255,255,255,.1)`) en cada tarjeta oscura.
  Se separa con un fondo sólido distinto o con aire.
- **Cuadrícula de puntos de fondo.** Textura sólo si sale del negocio.
- **Separadores que se desvanecen en las puntas.** Línea sólida de lado a lado, o espacio.

### Composición

- **Todo centrado y en una columna**: encabezado centrado, tres tarjetas, llamada a la
  acción centrada, pie. La estructura sale igual sin importar de qué sea el sitio.
- **Rejilla de tres tarjetas iguales** con icono arriba, título, y dos renglones de
  texto. Casi nunca hay exactamente tres cosas que decir.
- **El mismo espacio vertical entre todas las secciones.** El ritmo es lo que dice qué va
  junto con qué; si todo mide igual, no dice nada.

### Contenido y adornos

- **Emoji como icono de sección.** Además de tic, se ve distinto en cada aparato.
- **Iconos todos de la misma librería, mismo grosor, mismo tamaño**, incluidos los que
  deberían pesar más que los otros.
- **Texto de relleno que describe la categoría**: «Rápido», «Seguro», «Escalable»,
  «Todo lo que necesitas». Si la frase sirve igual para otro producto, no es contenido.
- **La pastilla de «✨ Nuevo»** arriba del título, a veces con un puntito que parpadea.
- **Icono metido en un cuadrito redondeado con fondo tenue** del color del acento, en
  cada tarjeta. El icono suelto, en color pleno, o sin icono.
- **Botón con flechita al final** («Empezar →»). La flecha sólo si de verdad lleva a otra
  página; el texto ya dice la acción.
- **Cifras redondas sin fuente**: «+10 mil usuarios», «99.9 % de disponibilidad».
  Si el dato no se puede sostener, además de tic es un problema.

### Movimiento

- **Todo entra con desvanecido hacia arriba al hacer scroll**, con el mismo retardo
  escalonado para todo.
- **Todo lo clicable sube 2 px y crece 1.02 al pasar el ratón**, sin distinguir entre lo
  principal y lo secundario.

---

## Lo que sí se hace en vez de eso

Marcar tics no diseña nada. La lista dice qué quitar; esto dice con qué llenar el hueco.

1. **Escoger la estética antes de pedirla** — es de lo primero que dice `frontend-design`,
   y es la causa raíz de casi toda esta lista: si uno no escoge, el modelo escoge, y lo
   que escoge es el promedio.
2. **Una decisión que cueste.** Un diseño se separa del promedio por al menos una cosa a
   la que no se llega por accidente: una tipografía con carácter, un color fuera de la
   rampa obvia, una retícula que no es de tres columnas, un movimiento que sale de la
   marca. Una basta; ninguna, no.
3. **Que la forma venga de algo real** — la papelería del cliente, su letrero, su
   producto. Es la diferencia entre un diseño que es de alguien y uno que es de nadie.
4. **Cuatro decisiones por escrito ANTES de generar** (de «Diseño sin vibecoded»):
   de qué es y para quién, con UNA acción que debe hacer el visitante; un color de marca
   con su hex y de dónde sale (el uniforme, el producto, el letrero); dos fuentes con
   papeles distintos; y **el elemento firma**, la única cosa por la que alguien se acordaría
   de la página. Si no hay firma, hay plantilla.

### La revisión en un renglón

Antes de entregar, se busca en el CSS lo que delata la mitad de la lista. Cada línea que
salga se justifica o se quita:

```bash
grep -nE "linear-gradient\([^)]*,[^)]*,|filter:\s*blur|background-clip:\s*text|backdrop-filter|box-shadow:[^;]*(rgba?\((1[0-9]{2}|2[0-9]{2}),|#[89a-f][0-9a-f]{2}[0-9a-f]{0,3}[^0-9a-f])|rgba\(255,\s*255,\s*255,\s*\.?0?\.1\)|letter-spacing:\s*-0?\.0[4-9]|text-transform:\s*uppercase" archivo.html
```

---

## Dos advertencias

**Los tics caducan.** Cada uno de éstos fue, en su momento, una idea fresca que alguien
tuvo y funcionó. Se volvió tic cuando lo copió todo el mundo. Esta lista hay que
revisarla cada tanto: quitar lo que ya nadie hace y meter lo que empezó a salir en todo.
Una lista de tics que no se actualiza reprueba diseños por razones viejas.

**Un tic solo no condena.** Un degradado morado puede estar perfectamente escogido para
un cliente cuya marca es morada. Lo que condena es la acumulación, porque la acumulación
es la prueba de que no hubo elecciones — sólo defaults.

---

## De dónde salió

De revisar un panel que una sesión entregó como terminado. Con «¿se ve profesional?» el
panel pasaba: estaba ordenado, alineado y sin errores. Con la lista sacó ocho tics de un
jalón, y con eso el diagnóstico dejó de ser una opinión y pasó a ser una cuenta. Se
rediseñó en vez de pulirse, que es lo que el corte de arriba manda.

**12 de noviembre:** se le sumaron los que faltaban de la guía «Diseño sin vibecoded» de
Juan David Sierra (Level AI, agosto 2026), que trae 20: luces borrosas, gris sin
contraste, sombra de color, media frase en gris, etiquetas en mayúsculas, borde
degradado, vidrio, borde translúcido, puntos, separadores que se desvanecen, icono en
cuadrito y flechita en el botón, más las cuatro decisiones previas y la revisión con
`grep`. Se dejó anotado dónde contradice a esta lista en vez de escoger un ganador a ciegas.

Va como skill aparte porque el método —juzgar con lista, no con adjetivos— sirve para más
cosas que el diseño. Si se prefiere, la lista cabe dentro de `frontend-design` y el
método dentro de `revision-web`; se decide allá.
