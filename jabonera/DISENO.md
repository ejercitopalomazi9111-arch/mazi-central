# El diseño, y contra qué se comparó

Carlos: *«necesito que te enfoques al 100 en diseño, básate en Fadori, en
Ligas Mazi, en el menú de Guerra de Puercos, debes evitar listas de botones
con cuadros de texto, reparte bien cada cosa en la pantalla… y usa alguna web
famosa como punto de comparación; cada cambio artístico que hagas corrobora
tu versión con la web seleccionada por ti».*

Esto es ese cotejo. Va aquí para que se pueda discutir con números y no con
impresiones.

---

## El punto de comparación: **stripe.com**

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

## Lo que Carlos mandó quitar, y con qué se sustituyó

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

## Lo que NO se copió, y por qué

- **La paleta de Stripe.** Su morado es suyo. Aquí el campo es petróleo —agua
  y jabón— con un solo acento ámbar.
- **Su densidad de escritorio.** Stripe se diseña para una pantalla grande;
  esto se usa **de pie en un baño, con una mano**. Por eso la barra de
  acciones va abajo, todo lo tocable mide 48 px y los campos van a 16 px
  —por debajo de eso iOS hace zoom solo al tocarlos.
- **Su animación.** Aquí no hay ninguna librería y el movimiento es un
  `translateY` de 4 px al cambiar de pestaña. `backdrop-filter` está
  descartado a propósito: obliga a recomponer en cada fotograma de scroll.
