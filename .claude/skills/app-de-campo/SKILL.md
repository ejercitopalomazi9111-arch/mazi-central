---
name: app-de-campo
description: Construir una app de captura en campo — inventario, consumo, bitácora, control de un insumo — que se llena de pie frente al problema, funciona sin internet, abre desde una memoria USB, exporta a Excel y se puede presentar ante un jurado. Úsala cuando pidan "un sistema para registrar/controlar X", cuando el dato lo va a capturar una persona parada con el celular en la mano, o cuando haya que entregar además un reporte formal y una presentación.
---

# App de campo

Una app de captura en campo no es un formulario web. Se llena **de pie**, con una
mano, en menos de treinta segundos, muchas veces sin señal, y después alguien
tiene que poder abrirla desde una USB en la computadora de la dirección. Casi
todo lo que muerde aquí muerde en silencio.

**Antes de escribir nada, buscar en el cerebro:** el área `apps-de-campo` tiene
13 neuronas y todas salieron de un error real de este tipo de proyecto.

```
node cerebro/cerebro.mjs buscar "lo que estés por hacer"
```

---

## El orden, y no es negociable

1. **El motor primero, sin pantalla.** Toda la aritmética en un archivo que no
   sabe que existe el DOM, con sus pruebas. Si el cálculo vive dentro de un
   componente, no se puede probar y se va a equivocar.
2. **Las trampas del dominio, escritas como comentario y como prueba.** En una
   app de consumo son cinco: unidades mezcladas, huecos entre registros, precio
   contra costo, intervalos absurdos y el reparto por día. Cada una lleva su
   prueba ANTES de que exista la pantalla.
3. **La pantalla.** Nada de lógica aquí: la pantalla llama al motor.
4. **Las dos compuertas** (abajo), y romperlas a propósito antes de creerles.
5. **Las salidas**: Excel, el informe en el formato de la casa, y el archivo
   único para la USB.
6. **La presentación**, si va a haber una.

---

## Las decisiones que ya están tomadas

| Decisión | Por qué |
|---|---|
| **Cero dependencias** | El `.xlsx` es un ZIP de XML: se escribe a mano en ~200 líneas. Una librería de Excel pesa más que toda la app |
| **`<script src>` clásicos, no módulos ES** | Los módulos no cargan desde `file://` por CORS, y el archivo tiene que abrir desde una USB. **Precio: comparten ámbito global — cada módulo va envuelto en una IIFE desde el primer día** |
| **`localStorage`, no base de datos** | Sin internet, sin cuenta, sin servidor que pagar. La llave se versiona (`proyecto.v1`) y **no se renombra nunca**: ahí vive lo que ya capturó una persona |
| **Un solo archivo HTML autocontenido** | Es lo que de verdad viaja en la USB. Se genera, no se edita, y el generador comprueba que cada módulo quedó incrustado |
| **La guarda va en el motor, no en la pantalla** | Si un error de unidades se coló una vez, la pantalla ya demostró que se equivoca |

---

## Las dos compuertas

Ninguna de las dos vale si no se ha visto **roja**. Estrenarlas rompiendo el
código a propósito es parte del trabajo, no una formalidad.

### 1 · El motor
Una prueba por trampa del dominio, y cada una con **dos casos distintos**: con
un solo producto, un solo día o un solo precio, casi ningún error de éstos
aparece.

### 2 · La pantalla, con Playwright
Camina **todas** las pestañas, **todos** los pasos del alta y **todos** los
submenús — no sólo el panel que está abierto al cargar — y en cada estado mide:

- cero errores de página y cero desbordes horizontales a 320 / 390 / 414 px
- objetivos táctiles ≥ 44 px, inputs ≥ 16 px **medidos computados**, no leídos del CSS
- disciplina de escala: cuántos tamaños de letra y cuántos pesos hay de verdad
- contraste de todo el texto **contra el fondo que le toca**, componiendo el alfa
  de cada capa hasta el primer fondo opaco
- ninguna variable CSS muerta en un estilo en línea
- que la tipografía cargó, que lo guardado persiste y que lo descargado trae
  sus bytes mágicos

---

## Lo que se entrega, además de la app

- **Excel**, una hoja por corte, con fechas como fecha de Excel y no como texto.
- **El informe en el formato de la casa** (`reportes/`): se comprueba
  importándolo de verdad, no leyendo el esquema. Lleva su apartado de **alcance
  y limitaciones** — es el que pregunta un sinodal.
- **El archivo único** para la USB.
- **La guía de la presentación**, si va a haber una: ver abajo.

---

## Si hay presentación

El generador vive en `jabonera/presentacion/armar-guia.mjs` y sirve tal cual
para otro proyecto: se cambia `guion.json`.

- **El guion es datos** (`guion.json`), no un documento. Cada lámina trae
  `pantalla` (lo que se lee), `hablado` (lo que se dice), `diseno` (cómo se ve),
  `canva` (qué buscar, con filtro de gratis) y `maqueta` (qué dibujo le toca).
- **Cada lámina se DIBUJA a 16:9** en la guía, además de describirse. Una
  composición explicada con palabras no se reproduce igual dos veces; y la guía
  dice que ante una discrepancia manda el dibujo.
- **El tope de palabras se cuenta al generar.** Si una lámina se pasa, no
  imprime nada. Igual con el desbordamiento de página y con la tipografía: tres
  compuertas, las tres probadas rompiéndolas.
- **La paleta y las tipografías se declaran una vez**, con los códigos de color
  listos para teclear, y se dice sobre qué colores el texto va oscuro. Blanco
  sobre un acento vivo casi nunca pasa el contraste.

---

---

## Conectores: lo que de verdad contesta

Comprobado llamándolos, no leyendo la lista. Un conector que aparece en el menú
y no responde cuesta más que uno que no está, porque se planea con él.

| Conector | Estado | Para qué sirve aquí |
|---|---|---|
| **Canva** | Responde, con la cuenta de la escuela conectada | Armar la presentación directamente: crear el diseño, meter las láminas y devolver el link de edición. Es la alternativa a entregar sólo la guía en PDF |
| **GitHub** (MCP) | Responde | Ramas, PR, CI. No hay `gh` en este contenedor: todo va por estas herramientas |
| **Vercel, Figma, Gamma, Notion, Drive, Gmail** | En el menú, sin comprobar en este proyecto | Comprobar antes de prometer nada con ellos |
| **Arcads, HyperFrames** | **Piden autorización** y esta sesión no puede hacer el login | Hay que pedirle a la persona que los conecte desde su cuenta |
| **Cosmos** (referencias visuales) | La red sí llega — `www.cosmos.so` da 200 y `/explore` también — pero `/search` manda a login (307) | Sin cuenta no se puede buscar. Lo rápido es pedir los links de dos o tres tableros y sacar las referencias de ahí |

**La regla:** al declarar que algo no se puede, decir **exactamente qué falla y
con qué comando**. «No tengo acceso a Cosmos» manda a todo el mundo a arreglar
lo que no era; «llego por red, pero /search me manda a login» se destraba en un
minuto.

## Lo que NO se hace

- **No se inventa un dato que no se ha medido.** Va como ejemplo, marcado como
  ejemplo, y la advertencia viaja **dentro** del archivo exportado — no sólo en
  la pantalla, porque el informe se entrega suelto.
- **No se deja un botón que no hace nada.** Una descarga está inerte dentro de
  cualquier visor incrustado; o se usa la API del visor o se avisa en la página.
- **No se renombra la llave de guardado ni el nombre del archivo** al rebautizar
  el proyecto. Se cambia lo que la gente lee y se explica en el LEEME por qué no
  coinciden.
- **No se dice «ya quedó» sin haber abierto la página.** Las pruebas de Node
  corren en otro ámbito y no ven la mitad de estos errores.
