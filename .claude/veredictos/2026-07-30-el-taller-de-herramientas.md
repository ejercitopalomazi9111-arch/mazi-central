# Veredicto · El taller de herramientas del sitio

**Fecha:** 30 de julio de 2026
**Quién lo trajo:** Carlos — *"en herramientas no tendremos sólo el de fuentes; necesitamos cosas a
diferentes escalas para las industrias reales, necesitamos que todo sea una sola experiencia, así que
vamos a priorizar diseño."*
**Tipo:** producto · negocio
**Skills en la mesa:** `consejo-tecnico` (la auditoría, primero) → `multi-agent` (el equipo) →
`four-judges` (los jueces), en ese orden y por instrucción de Carlos.

**La auditoría técnica que precede a esto:**
[`.claude/auditorias/2026-07-30-plan-del-sitio.md`](../auditorias/2026-07-30-plan-del-sitio.md) —
veredicto **ARREGLAR PRIMERO**. De ahí llegan tres hechos que esta mesa no puede ignorar:

1. **`tipos.mjs` no corre en el navegador.** Comprobado, no supuesto. Arreglo de dos líneas.
2. **El cronómetro de tiempos y movimientos es 🟢 y la fábrica de tipografías es 🟡.**
3. **Los datos del visitante nunca salen de su teléfono**, porque no hay servidor a dónde mandarlos.

**Veredictos previos que aplican:** [`el-sitio`](2026-07-30-el-sitio.md) (cinco secciones, congelar
alcance) y [`los-textos`](2026-07-30-los-textos.md) (la prueba manda sobre la mesa).

---

## La idea, en tres líneas

El taller deja de ser *una demo de tipografías* y pasa a ser **la sección de herramientas**: varias,
atadas a los seis servicios, para negocios reales, y todas dentro de **un solo instrumento** con los
mismos controles y la misma bandeja. Si funciona, el sitio deja de contar lo que hacemos y **se lo
presta al visitante**.

---

## 1 · El equipo

### Renata · Directora de Marca

> **El instinto es correcto y es el mejor que ha tenido este proyecto.** Una agencia de Querétaro te
> enseña un portafolio; nosotros te prestamos una herramienta que resuelve tu problema **hoy, gratis,
> sin registrarte.** Eso no es diferenciación de folleto: es una categoría distinta.
>
> Y lo de *"una sola experiencia"* es exactamente lo que separa esto de un montón de juguetes. Firmo
> lo que decidió Renée en la auditoría: **un instrumento con módulos, no cinco demos.**
>
> **Mi advertencia, y va en serio:** hay una forma de que esto nos abarate. Si regalamos cinco
> herramientas, el visitante puede concluir *"si esto lo regalan, ¿qué me van a cobrar?"*. La línea
> que lo evita tiene que estar clarísima en el texto y no la tenemos escrita:
>
> > **Regalamos la medición. Cobramos la interpretación y el arreglo.**
>
> El cronómetro te dice **dónde** se te va el tiempo. Que alguien entre a tu operación y **te lo
> quite** es el servicio. Son dos cosas y hay que decirlo en la misma pantalla, o la herramienta
> compite con nosotros mismos.

### Tomás · Director de Operación y Producto

> Números, sin opinión. **Cinco herramientas es como un sitio no se termina.**
>
> El plan tenía siete bloques. Con cinco herramientas nuevas —cada una con su lectura, sus controles,
> su exportador y sus pruebas— eso es **más trabajo que las cinco secciones juntas**. Y Nayeli ya lo
> dijo: la carcasa antes de la segunda cuesta 2 horas, la carcasa después cuesta rehacer las
> anteriores.
>
> **Mi posición: se congela la versión 1 del taller en DOS herramientas.** El cronómetro y "tu nombre
> en Mazi". Las dos son 🟢, las dos se hacen esta semana, y las dos prueban un servicio distinto. Las
> otras tres entran de una en una, cada una cuando ya haya alguien usando la anterior.
>
> Y una cosa técnica que sí es de negocio: **el `import()` dinámico de Lucía significa que agregar la
> herramienta seis no cuesta velocidad a nadie.** Eso convierte el taller en algo que puede crecer
> para siempre sin que la portada se ponga lenta. **Es la decisión más valiosa de toda la auditoría.**

### Iván · Director Comercial

> Una métrica: **mensajes que entran al WhatsApp.** Y por eso voy a decir lo incómodo:
>
> **Una herramienta gratis atrae usuarios, no compradores.** Ya lo dije cuando se planeó el taller de
> tipografías: *"un visitante que se clavó cuatro minutos y se fue sin escribir no es un éxito, es
> una fuga"*. Con cinco herramientas, el riesgo se multiplica por cinco.
>
> **Pero el cronómetro es distinto, y es la diferencia que me hace firmar.** Quien lo abre **tiene
> exactamente el problema que vendemos.** Nadie mide los ciclos de su cocina por diversión: lo hace
> porque siente que se le va el tiempo y no sabe dónde. **Esa persona ya está calificada antes de
> escribirnos.**
>
> Un cronómetro no es un imán: **es un diagnóstico que se auto-administra.** Y por eso pido dos cosas
> concretas:
>
> 1. Que al **terminar una medición** —no antes— salga la salida: *"¿quieres que veamos por qué?"*
>    con el botón. En el momento en que acaba de ver su propio cuello de botella en la pantalla.
> 2. Que el archivo que exporta **traiga nuestro nombre y el WhatsApp**. Ese Excel se va a mandar por
>    correo a un socio o a un jefe. **Es publicidad que viaja sola**, y es gratis.
>
> Con eso, firmo. Sin eso, son juguetes bonitos.

### Sofía · Directora de Colaboradores y Comisiones

> Mi agujero sigue siendo el que más sangra y voy a decir dos cosas.
>
> **La primera, a favor:** las herramientas no sólo atraen clientes. **Atraen a quien construye.** Un
> programador que ve una fábrica de tipografías corriendo en el navegador entiende en diez segundos
> con quién estaría trabajando. Para reclutar por comisión —donde no puedo ofrecer sueldo fijo— eso
> vale más que cualquier texto que yo escriba en "trabaja con nosotros".
>
> **La segunda, en contra, y es la de siempre:** esto es **otra desviación**. La Fase 2 —el Panel
> Mazi, lo que le dice a un colaborador cuánto se le debe— sigue sin empezar, y el sitio acaba de
> crecer. **No pido que se detenga. Pido que quede escrito otra vez**, porque van tres veces que se
> registra y cero que se atiende, y el día que alguien bueno se vaya por no saber cuánto iba a ganar,
> nadie va a poder decir que no estaba avisado.

### Mauro · VP / Cofundador

> Firmo a Tomás en congelar y a Iván en las dos exigencias. Y pongo la condición que hace que esto
> exista en lugar de quedarse en plan:
>
> **El Bloque 1 se publica solo, y ahora con más razón.** Un taller de cinco herramientas es
> justamente el tipo de cosa que hace que un sitio nunca salga. **Portada + contacto se publican
> antes de que exista la primera herramienta.** Si el taller tarda tres semanas, el agujero #1 ya
> lleva tres semanas cerrado.
>
> Y sobre *"priorizar diseño"*, que es lo que pidió Carlos: **estoy de acuerdo y lo aprieto.**
> Priorizar diseño **no** es que se vea bonito: es que **las cinco herramientas se sientan la misma
> máquina**. Esa es la parte cara y la que no se puede agregar después. El resto es pintura y la
> pintura sí se agrega después.

---

## 2 · Mi criterio, aparte

Lo que veo trabajando con Carlos y no vería un rol: **este requisito no salió de la nada, y es la
misma corrección que ya me hizo dos veces hoy.** Le enseñé una fábrica de tipografías y su respuesta
fue *"necesitamos cosas a diferentes escalas para las industrias reales"*. Es la versión de producto
de lo que ya me dijo con los textos: **lo que le gusta a la casa no es lo que le sirve al cliente.**

Y hay un hallazgo que ninguno del equipo mencionó, que es el que más me convence:

> **El cronómetro no es una herramienta que hicimos para el sitio. Es una herramienta que la empresa
> necesita de todos modos.**

`CLAUDE.md` §6 dice que hace falta **bitácora de horas** —*"lo vendemos, deberíamos tener el
mejor"*—. El cronómetro público **es la mitad de esa herramienta**, hecha primero, en su versión más
chica y con un desconocido probándola gratis. Eso no es una desviación del plan: **es la Fase 0
—herramientas propias— avanzando disfrazada de marketing.** Se construye una vez y se cobra tres
veces: como imán, como prueba, y como la herramienta interna que nos falta.

Lo mismo con el vectorizador: `PENDIENTES.md` punto 1 lo pide desde antes de que existiera este
sitio.

---

## 3 · Los jueces

### 🟢 El Creyente

**Quién lo necesita con urgencia y qué hace hoy en su lugar.** Un dueño de taller, cocina o tienda
que **siente** que se le va el tiempo y no sabe dónde. Hoy hace una de dos: nada, o el cronómetro del
teléfono y una libreta. Ninguna de las dos le da un promedio, una desviación ni un cuello de botella.

**Por qué ahora.** Porque ya tenemos lo caro: la marca, la tipografía, el logo y los textos. Lo que
falta es **una cosa que el visitante pueda usar**, y resulta que la más útil es también la más barata
de construir y la que apunta al servicio que menos gente entiende. *Tiempos y movimientos* es el
servicio que nadie sabe qué es; **una herramienta que lo hace lo explica sin explicarlo.**

**La mejor versión si todo sale bien.** Un dueño mide su línea el martes, ve en la pantalla que el
40% del ciclo se le va en un paso que creía menor, exporta el Excel, se lo manda a su socio con
nuestro nombre en la hoja, y el jueves nos escribe. **No le vendimos: se vendió solo con nuestra
herramienta.**

**La ventaja injusta.** Que las herramientas ya existen o casi. `tipos.mjs` está escrito,
`vectorizar.mjs` está escrito, la fuente está fundida. **Lo que para otra agencia sería un proyecto,
para nosotros es una carcasa alrededor de código que ya corre.**

> **La apuesta única sobre la que descansa todo:** que un dueño de negocio real **use** una
> herramienta gratis de una empresa que no conoce, en su teléfono, sin registrarse — y que al ver su
> propio problema medido, escriba.

### 🔴 El Escéptico

**Quién NO va a usar esto.** Casi todos. Un dueño de taller no anda navegando sitios de agencias, y
si llega, va a ver *"cronómetro de tiempos y movimientos"* y va a pensar que es para ingenieros. **La
herramienta buena con el nombre equivocado no la abre nadie.**

**El competidor o el atajo gratuito.** Y aquí va el golpe: **el cronómetro del teléfono ya viene
instalado.** Es gratis, ya lo tiene, y no necesita internet. Decir "el nuestro saca promedios" no
mueve a nadie que no sepa qué es una desviación estándar. **Si la única diferencia es matemática, la
perdimos.**

**El punto ciego del fundador.** Carlos dijo *"priorizar diseño"*, y el equipo entero lo entendió
como *"que se sienta una sola máquina"*. **Eso es diseño de producto y está bien.** Pero el punto
ciego es otro: **cinco herramientas bien diseñadas siguen siendo cinco cosas que nadie pidió.** No
hay un solo visitante todavía. Estamos diseñando la experiencia de un tráfico que no existe.

**La forma más rápida en que esto se muere.** Que el taller se coma las tres semanas, que el sitio se
publique en septiembre, que la Fase 2 siga sin empezar, y que un colaborador bueno se vaya en agosto
por no saber cuánto iba a cobrar. **Sofía lleva tres actas avisando lo mismo.**

> **La falla fatal:** *que estemos construyendo herramientas porque sabemos construir herramientas, y
> no porque alguien las haya pedido.* Es el mismo error de Torre Infinita, con mejor ropa: una obra
> impresionante que no le resolvió nada a nadie que pagara. Si de aquí a que se publique nadie
> externo ha dicho *"eso me serviría"*, entonces esto es un hobby caro con logo.

### 💰 El Inversionista

**¿Hay prueba de que esto trae dinero?** **No. Cero.** Ni una persona ajena ha visto el concepto. Lo
único que hay es que a seis de nosotros nos gusta, que es el dato que no vale nada — el mismo
señalamiento que hice con los textos.

**Cuándo llega el primer peso.** El taller **no cobra**. Lo que cobra es el mensaje de WhatsApp. Y de
las herramientas propuestas, **una sola tiene línea directa a un servicio que se factura**: el
cronómetro → *tiempos y movimientos*. Las otras cuatro son marca. **Eso no las hace malas; las hace
segundas.**

Un estudio de tiempos y movimientos para un negocio chico se cotiza en **$8,000–30,000 MXN**. Si el
cronómetro trae **un** cliente en tres meses, ya pagó todo el taller con creces. Ése es el número que
importa, no las visitas.

**La prueba más barata que demuestra demanda esta semana.** Y es tan barata que da vergüenza no
haberla corrido antes de esta junta:

> **Carlos le manda un mensaje a tres dueños de negocio que ya conozca** —un taller, una cocina, una
> tienda— con una sola pregunta:
>
> *"¿Si te doy gratis una cosa en el teléfono que mida cuánto tarda cada paso de tu operación y te
> diga dónde se te va el tiempo, la usarías?"*
>
> No hace falta construir nada. **Diez minutos y tres mensajes.**
>
> - **Dos de tres dicen que sí** → se construye el cronómetro primero, como decidió la auditoría.
> - **Menos de dos** → el cronómetro baja al tercer lugar y el taller arranca con *"tu nombre en
>   Mazi"*, que es imán puro y no pretende resolverle la vida a nadie.

**¿Pondría mi propio dinero? SÍ**, y con una condición: **dos herramientas, no cinco.** El costo real
aquí no es programar: es el tiempo de Carlos, que es el único recurso escaso de esta empresa. Dos
herramientas es una apuesta de una semana. Cinco es una de un mes, sobre una hipótesis sin probar.
**El número que me haría cambiar de opinión: si la prueba de los tres mensajes sale 0 de 3, no
construyo el cronómetro.**

### ⚖️ El Juez

# VEREDICTO: `CONSTRUIR`, con alcance congelado en **dos**

Escuché a los cinco y a los tres. Falla así:

**Por qué CONSTRUIR y no ARREGLAR PRIMERO.** Porque el Escéptico tiene razón en el diagnóstico y se
equivoca en la conclusión. Es cierto que nadie pidió esto. **También es cierto que nadie pidió el
sitio, ni la tipografía, ni el logo**, y ninguna empresa nueva construye su cara pública por
encargo. La diferencia con Torre Infinita —su mejor argumento— es real y es esta: **Torre Infinita no
apuntaba a ningún servicio que vendiéramos; el cronómetro *es* uno de los seis.** Eso no es
decoración: es el producto con otra ropa.

**Por qué no CONSTRUIR completo.** Porque Tomás y el Inversionista coinciden desde lados opuestos, y
cuando el de operación y el del dinero coinciden, se les hace caso. **Cinco herramientas es una
apuesta de un mes sobre una hipótesis sin probar.**

### Lo que rechazo, y de mis propios jueces

- **Al Escéptico, su falla fatal, a medias.** *"Nadie lo pidió"* sería fatal si costara un mes.
  Congelado en dos, cuesta una semana y **la mitad ya está escrita.** Una apuesta de una semana sobre
  una idea que además nos deja una herramienta interna que nos falta no es un hobby caro: es barata.
- **A Renata, nada.** Su línea —*regalamos la medición, cobramos el arreglo*— es la mejor frase de
  esta junta y **entra al texto del sitio tal cual.**
- **A Iván, nada, y subrayo lo suyo:** el archivo exportado con nuestro nombre es lo más rentable que
  se dijo hoy y cuesta diez minutos.

### Lo que se construye

| | Qué | Por qué ésa |
|---|---|---|
| **1ª** | **Cronómetro de tiempos y movimientos** | Es 🟢 · **es uno de los seis servicios** · el que lo abre ya está calificado · y **es la mitad de la bitácora de horas que la empresa necesita de todos modos** |
| **2ª** | **Tu nombre en Mazi** | Es 🟢 · es el imán más compartible · y prueba la tipografía sin depender de que `tipos.mjs` corra en el navegador |
| — | *La fábrica completa, el redimensionador, el vectorizador* | **Después, de una en una**, y sólo cuando haya alguien usando la anterior |

**El riesgo más grande, en una línea:** que "priorizar diseño" se entienda como *pulir* y no como
*que se sienta una sola máquina* — y que el sitio se publique en septiembre mientras la Fase 2 sigue
sin empezar y Sofía lleva cuatro actas avisando lo mismo.

**La prueba de 10 minutos, antes de escribir una línea de código:**

> **Tres mensajes de WhatsApp**, a tres dueños de negocio que Carlos ya conozca:
> *"¿Si te doy gratis una cosa en el teléfono que mida cuánto tarda cada paso de tu operación y te
> diga dónde se te va el tiempo, la usarías?"*
>
> **2 de 3 → el cronómetro va primero.** **Menos de 2 → arranca "tu nombre en Mazi"** y el cronómetro
> baja.

Y como en las tres actas anteriores: **la prueba manda sobre esta mesa.** Ocho de nosotros creemos
que el cronómetro es la buena. Tres dueños de negocio lo saben.

**Lo que NO espera a la prueba, y arranca ya:** **el Bloque 1.** Portada, contacto y armazón no
dependen de esta decisión ni de nadie. Mauro tiene razón: si el taller tarda tres semanas, el agujero
#1 ya lleva tres semanas cerrado.

---

## Qué pasó después

- [ ] **La prueba de 10 minutos** · tres mensajes de Carlos · resultado: \_\_ de 3
- [ ] Bloque 1 publicado (no espera a nada)
- [ ] `tipos.mjs` dual — condición: `rocco-tipos.mjs` imprime `OK`
- [ ] Herramienta 1 · según la prueba
- [ ] Herramienta 2
- [ ] **Contrato de herramienta** — antes de la segunda, no de la primera (Nadia sobre Verónica)
- [ ] ⚠️ **Registrada por cuarta vez:** la Fase 2 (Panel Mazi) sigue sin empezar — Sofía

---

## Lo decidido, en tabla

| # | Decisión | De quién salió |
|---|---|---|
| 1 | El taller es **un instrumento con módulos**, no cinco demos | Renée (auditoría), firmado por Renata |
| 2 | **Alcance congelado en dos herramientas** para la v1 | Tomás + el Inversionista, fallado por el Juez |
| 3 | **Cronómetro primero** — es 🟢 y es uno de los seis servicios | Nadia (auditoría), sostenido por el Juez |
| 4 | *"Regalamos la medición, cobramos la interpretación y el arreglo"* **entra al texto** | Renata |
| 5 | La salida a WhatsApp aparece **al terminar la medición**, no antes | Iván |
| 6 | El archivo exportado **lleva nuestro nombre y el WhatsApp** | Iván |
| 7 | *"Nada de esto sale de tu teléfono"* **en pantalla** — es LA REGLA dicha al cliente | Paola (auditoría) |
| 8 | Cada herramienta **prueba un servicio**, o no va | Ximena (auditoría) |
| 9 | El **Bloque 1 se publica antes** de que exista la primera herramienta | Mauro |
| 10 | La prueba de los tres mensajes **manda sobre esta mesa** | el Inversionista |
| 11 | La Fase 2 sigue sin empezar, y van **cuatro** actas registrándolo | Sofía |
