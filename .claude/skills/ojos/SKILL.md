---
name: ojos
description: Mirar imágenes de verdad —capturas, referencias, maquetas, fotos de pantalla que manda alguien— y sacar de ellas una descripción medible que sirva para reconstruirlas en código: retícula, jerarquía tipográfica, paleta, profundidad, tratamiento de imagen. Úsala antes de copiar un estilo, al revisar una pantalla propia, cuando alguien diga «se ve mal» sin decir qué, cuando haya que estudiar muchas referencias sin gastarse el saldo mirándolas una por una, y siempre antes de dar por terminada una interfaz. También cuando el código se vea perfecto y algo siga sin cuadrar.
---

# Los ojos

Carlos, e224: *«trata de usar gemini para poder ver más imágenes gastando uso
para eso, créate una skill y una herramienta»*.

---

## La regla que justifica todo lo demás

**Mira la pantalla. El código no te va a decir que está mal.**

No es un consejo bonito. El 29 de agosto encontré tres defectos en un día y
los tres salieron de una captura, ninguno de leer código:

| Defecto | Qué decía el código | Qué decía la captura |
|---|---|---|
| Icono de estado vacío | `<svg viewBox="0 0 24 24">` — impecable | Un icono de **544×544 px**, media pantalla |
| Botón de consola en teléfono | Un botón fijo, normal | Tapaba justo el primer texto que alguien lee |
| Leyenda de figuras | Cada celda con su glifo | Las quince dibujaban **el mismo** |

Y hay un cuarto caso que enseña más que los tres: la prueba de **desbordes**
tampoco cazó el icono de 544 px. Se estiraba hasta el ancho de su caja y ni un
píxel más, así que técnicamente no se desbordaba. **«No se sale de la caja» y
«mide lo que debe medir» son dos preguntas distintas.**

---

## Por qué la herramienta existe si yo ya puedo ver

Porque puedo ver **una**, no **cientos**. Cada imagen que miro se paga del
mismo saldo con el que pienso, y una tarde de referencias se lo come entero.
`ojos/mirar.mjs` manda la imagen a Gemini y devuelve **palabras**, que salen
baratas de leer.

O sea: la herramienta es para el **volumen** —estudiar cuarenta referencias—,
y mis propios ojos para el **juicio** —decidir si lo mío está bien—. Delegar
el juicio a otro modelo es delegar justo la parte que me pidieron aprender.

```bash
GEMINI_LLAVE=… node departamento-diseno/ojos/mirar.mjs referencia.png
GEMINI_LLAVE=… node departamento-diseno/ojos/mirar.mjs https://…/captura.jpg "¿de dónde sale la sensación de caro?"
```

Sin llave, la herramienta dice exactamente cómo conseguirla y dónde ponerla.
**Nunca en un archivo**: el repo es público y tiene escaneo de secretos, y una
llave commiteada queda en el historial aunque se borre después.

---

## Cómo se mira una pantalla, en orden

El orden importa: mirando al revés, un detalle bonito tapa un problema de
estructura.

1. **Entrecerrando los ojos.** ¿Cuántos bloques hay? Si no se distinguen tres
   pesos distintos —lo que manda, lo que acompaña, lo que se puede ignorar—,
   la jerarquía no existe por mucho que el tipo sea bonito.
2. **Los bordes de la pantalla.** ¿Hay algo pegado, cortado, o con menos aire
   que sus vecinos? Los márgenes desiguales son el defecto que más veces se ve
   y menos veces se nombra.
3. **Lo que flota.** Botones fijos, avisos, barras. ¿Encima de qué caen? Un
   elemento fijo **siempre** tapa algo; la pregunta es si tapa algo que
   importa.
4. **Los tamaños de verdad, medidos.** No «se ve grande»: `getBoundingClientRect()`
   y un número. Así salió lo de los 544 px.
5. **Los estados que nadie pinta.** El que se pinta al cargar es el que todos
   revisan. Vacío, error, sin conexión, cargando y con datos: **los cinco.**
   Un estado que nadie pinta es un estado que nadie mide.
6. **Los dos temas y los dos anchos.** Claro y oscuro, teléfono y escritorio.
   Cuatro capturas, no una.

---

## Qué se le pide a la descripción

Que sirva para **reconstruir**, no para admirar. La herramienta ya lo pide
así, y si se pregunta a mano conviene lo mismo:

- retícula y ritmo (columnas, márgenes, aire entre bloques);
- jerarquía tipográfica en **relaciones**, no en pixeles sueltos («el titular
  pesa cuatro veces el cuerpo» vale más que «72 px»);
- paleta: cuántos colores de verdad, cuál manda, dónde está el acento;
- profundidad: sombras difusas o duras, desplazadas o centradas, capas;
- qué la hace verse **cara** o **barata**, y por qué;
- un detalle que un principiante no habría puesto.

Y una regla para el que describe: **si algo no se distingue, se dice.** Una
descripción que rellena huecos con lo que suele haber es peor que una corta,
porque no se nota que está inventando.

---

## Cuándo NO usar esto

- Para decidir si tu propio trabajo está bien: eso lo miras tú. Ver es la
  parte del oficio que se estaba pidiendo aprender.
- Para «mejorar» una captura sin haberla mirado antes: la herramienta describe
  lo que hay, no adivina lo que falta.
- Con fotos de personas identificables sin permiso, y **nunca** con menores.
  En este grupo eso ya está escrito en otro repo y no cambia porque cambie la
  herramienta.
