# Escoger la estética ANTES de pedirla

Si uno no escoge, el modelo escoge — y lo que escoge es el promedio de internet. Ése es
exactamente el aspecto que Carlos llama *"se ve de IA"*.

Esta hoja es para decidir en un minuto, antes de escribir el primer prompt. **La pregunta no es
cuál está de moda: es cuál aguanta el negocio del cliente.**

> **De dónde salió y qué le agregué.** Las cuatro primeras vienen de una lista que trajo Carlos
> (`ivanvibecodes`); de esa lista **sólo se alcanzaban a leer cuatro de diez**, así que las demás
> las puse yo y están marcadas. Lo que en ningún caso venía en la lista son las columnas de
> «cuándo NO» y «en teléfono», que es donde está el criterio — un nombre de tendencia sin eso es
> un adjetivo, no una decisión.

---

## Las cuatro de la lista

### 1 · Glassmorfismo — vidrio esmerilado
Paneles translúcidos con desenfoque detrás, bordes claritos, sombras suaves.

- **Cuándo sí:** cuando hay una foto o un degradado bueno **detrás** que valga la pena dejar ver.
  Paneles flotando, barras de navegación, tarjetas encima de un video.
- **Cuándo NO:** sobre fondo plano. Sin nada detrás que se transparente, el vidrio es un
  rectángulo gris con borde — todo el costo y ninguna gracia.
- **En teléfono:** `backdrop-filter` es **caro**. Tres paneles esmerilados encimados hacen que
  el scroll se sienta pegajoso en un iPhone de hace tres años. Uno o dos, no seis.
- **La trampa:** el contraste. Texto blanco sobre vidrio sobre una foto clara se vuelve
  ilegible en cuanto la foto cambia. Va con una capa de color sólido debajo del texto.

### 2 · Neumorfismo — relieve suave
Todo del mismo color que el fondo, con dos sombras —una clara y una oscura— para que parezca
hundido o salido.

- **Cuándo sí:** paneles de control, reproductores, calculadoras. Cosas con **muchos botones
  parecidos** donde el relieve ayuda a agruparlos.
- **Cuándo NO:** casi todo lo demás, y hay que decirlo con todas sus letras: **el neumorfismo
  tiene un problema de accesibilidad de nacimiento.** Si todo es del mismo color, el contraste
  entre un botón y el fondo tiende a cero. Alguien que ve poco no distingue qué se puede tocar.
- **En teléfono:** las sombras dobles se ven sucias en pantallas con poco brillo, y a plena luz
  del sol desaparecen por completo.
- **La trampa:** se ve increíble en la captura de Dribbble y se usa mal en producto real. Si se
  usa, los elementos tocables llevan **además** otra señal: color, borde o texto.

### 3 · Claymorfismo — plastilina
Formas gordas y redondeadas, colores pastel, sombra interior suave, todo con aspecto inflado.

- **Cuándo sí:** productos para niños, educación, salud, algo que quiera sentirse amable y sin
  filo. Funciona bien con ilustración.
- **Cuándo NO:** cualquier cosa que necesite verse seria — finanzas, legal, seguridad, empresa a
  empresa. **Y ojo, éste es el que más cae en `se-ve-de-juego`:** redondez + pastel + inflado es
  literalmente el vocabulario visual de una app infantil.
- **En teléfono:** funciona bien, es de los más baratos de dibujar.
- **La trampa:** para Grupo Mazi, casi nunca. Vendemos servicios a negocios.

### 4 · Brutalismo / neobrutalismo — a la cara
Bordes negros gruesos, sombras duras sin difuminar, colores planos y saturados, tipografía
enorme, cero degradados.

- **Cuándo sí:** cuando la marca quiere sonar segura y distinta, y hay UNA cosa que decir.
  Portafolios, agencias, lanzamientos, herramientas para gente técnica.
- **Cuándo NO:** cuando hay mucho contenido. El brutalismo grita, y una página que grita
  cuarenta cosas no dice ninguna.
- **En teléfono:** de los que mejor aguantan — bordes duros y colores planos se ven nítidos en
  cualquier pantalla y no dependen de sombras finas.
- **La trampa:** es el más fácil de hacer **a medias**. Brutalismo tibio —bordes de 1px, sombras
  medio suaves— no se ve brutalista, se ve descuidado. **Se compromete o no se usa.**

---

## Las que agregué yo

Marcadas porque **no venían en la lista de Carlos** — la lista se cortaba en la cuatro.

### 5 · Oscuro con un acento
Fondo casi negro, un solo color vivo, mucho espacio, tipografía apretada.
**Es lo nuestro** (`#100A18` + `#AC27FF`). Aguanta mucho contenido sin cansar, se ve caro sin
esfuerzo y en teléfono gasta menos batería en pantalla OLED. La trampa: con dos acentos en vez
de uno, se cae en `se-ve-de-juego` en una tarde.

### 6 · Editorial / tipográfico
La tipografía **es** el diseño. Poco color, mucha jerarquía, columnas medidas.
Para cuando lo que se vende es criterio: consultoría, escritura, estudios. Barato de construir
y difícil de hacer bien — se nota inmediatamente si la escala tipográfica está mal.

### 7 · Cinemático por scroll
Video o secuencia de fotogramas que avanza con el scroll, tipo Apple.
Para producto único que se quiera enseñar girando. Ya tenemos skill (`scroll-cinema`) y su
presupuesto de peso. **Nunca secuestrar el scroll** — animación guiada sí, secuestro no.

### 8 · Bento
Cuadrícula de recuadros de distinto tamaño, cada uno con una cosa.
Excelente para "esto hace muchas cosas" sin que se sienta lista. Muy usado desde que Apple lo
volvió a poner de moda, con el riesgo de que ya se ve genérico si no se le mete nada propio.

### 9 · Degradado con grano
Degradados suaves con textura de grano encima para quitarles lo digital.
Barato, se ve caro y envejece bien. El grano es lo que evita que se vea a plantilla de 2021.

### 10 · Retro / terminal
Monoespaciada, verde sobre negro, marcos de ventana antigua.
Para herramientas de gente técnica y para producto con personalidad. **Es el que más rápido se
vuelve chiste** si no hay una razón para estar ahí.

---

## Cómo se decide, en tres preguntas

1. **¿Qué vende el cliente?** Serio y caro → oscuro con acento, editorial, brutalismo. Amable →
   claymorfismo, degradado con grano. Técnico → retro, brutalismo.
2. **¿Cuánto contenido hay?** Mucho → editorial, bento, oscuro. Poco → brutalismo, cinemático.
3. **¿Se ve primero en teléfono?** *(con Carlos, siempre sí)* → brutalismo, oscuro, bento y
   claymorfismo aguantan. Glassmorfismo y neumorfismo hay que medirlos.

**Y la que decide de verdad:** enseña una captura sin contexto y pregunta *«¿de qué es esto?»*.
Si la respuesta no se parece a lo que vende el cliente, la estética está mal escogida por muy
bonita que esté.

---

## Lo que NO es una tendencia

Escoger estética no exime de nada de esto:

- Estados de presionado y de `hover` *(la prueba del dedo)*
- `prefers-reduced-motion` respetado
- Objetivos táctiles de 44px
- Contraste que pase, medido, no de ojo

Una tendencia mal ejecutada se ve peor que ninguna. Ver
[`revision-web/reference/antes-de-lanzar.md`](../../revision-web/reference/antes-de-lanzar.md).
