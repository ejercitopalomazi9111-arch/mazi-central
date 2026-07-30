# Veredicto · El branding de Grupo Mazi y las desviaciones del proceso

**Fecha:** 30 de julio de 2026
**Convocado por:** Carlos (Palomazi)
**Qué se rostiza:** la identidad de Grupo Mazi —nombre, logo, paleta— y, sobre todo, **el
proceso** con que se está construyendo.
**Skills en la mesa:** `multi-agent` (el equipo) → `four-judges` (el consejo)

---

## 0 · El brief que se les dio

### Qué es Grupo Mazi
Empresa de servicios que cobra **por comisión**, no por hora. Vende web, software, marketing,
video y fotografía, gestión de negocios, tiempos y movimientos. Su promesa: *"no lo hacemos en
corto, lo hacemos a la larga"* — no cierra chambas sueltas, entra a la operación del cliente y
se queda. Los colaboradores cobran comisión por proyecto.

### Los tres agujeros (el diagnóstico propio, `CLAUDE.md` §5)
1. Desarrolladores web **sin web propia**.
2. Marketing **sin presencia en redes**.
3. **Sin sistema para hablar con los colaboradores ni pagarles.** Marcado por Carlos como *"el
   que más sangra: así se pierde a la gente buena."*

### El modo de trabajo
- **LA REGLA:** todo lo que la empresa use, lo construimos nosotros. Conectar sí, depender no.
- **El matiz:** la regla es destino, no peaje. Si la herramienta propia no existe y construirla
  cuesta más que la chamba, se anota y se resuelve con el externo.
- Verificar viendo la pantalla, no leyendo el código. Commits frecuentes. Todo en español.
- Carlos trabaja **desde el iPhone**, manda capturas, pide varias cosas por mensaje, y corrige
  las reglas cuando salen rígidas.

### De dónde viene el nombre
"Mazi" es un alias personal de Carlos con **quince años** de historia, anterior a la empresa.
"Grupo" se le añadió porque *"Mazi solo es algo raro y no dice nada"*.

> **Dato interno, no publicable.** El origen concreto del alias es personal y Carlos lo conoce.
> **No debe aparecer en ningún artefacto público, sitio, pitch ni documento de cliente.** Los
> repos son públicos: aquí se registra únicamente que existe y que está vetado contarlo.
> Hacia afuera, la historia del nombre es la que sí es cierta y sí es contable: μαζί significa
> **"juntos"** en griego, y eso describe exactamente el modelo de comisión y de largo plazo.

### El logo
Carlos diseñó un logo hace 15 años: un ave simétrica de frente, alas abiertas, estrella de cinco
puntas al pecho, dos líneas en la cadera, y un arco mitad negro mitad blanco entre las alas.
**Perdió el archivo y el contacto de quien lo pasó a 3D.** Se reconstruyó: él generó candidatos
con IA desde su memoria, eligió, y aquí se vectorizaron. Paleta medida de su propia imagen:
violeta `#AD21ED`, hueso `#EAE5E3`, vacío `#120C1A`.

### Las desviaciones que se ponen a juicio
1. **El plan decía otra cosa.** `CLAUDE.md` §10: *"Esta semana — Grupo Mazi: la página,
   marketing, redes. Arrancar por el laboratorio de animación."* No existe una línea del sitio.
2. **El branding subió a Bloque 0 por decisión de Carlos** — eso está autorizado y documentado.
   Lo que se desvió es el **alcance dentro** del branding: de *decidir la identidad* a
   *perfeccionar los píxeles de un logo*.
3. **Una sesión entera en micro-ajustes:** grosor de barras, separación, curvatura, ángulo,
   altura, retranqueo. Unas veinte iteraciones sobre la misma pieza.
4. **Se construyó un vectorizador completo** (`herramientas/vectorizar.mjs`) que no estaba en
   ningún plan. Cumple LA REGLA y sirve para todo cliente futuro, pero fue desviación.
5. **El logo sigue "tosco"** según Carlos, y el límite ya no es el filtrado: es la resolución de
   la imagen fuente.
6. **No hay tipografía, ni bloqueo, ni kit, ni una sola aplicación.** Un logo que no está
   aplicado a nada no es todavía una identidad.
7. **Los tres agujeros siguen abiertos.** El que más sangra sigue intacto.

---

## 1 · El equipo opina

Cinco perfiles, según `multi-agent`: específicos de esta industria y este cuello de botella, no
roles genéricos de libro.

### Mauro · VP / Cofundador
*Coordina a los directores y traduce lo que Carlos decide en ejecución. Su métrica: cuántos de
los tres agujeros se cerraron este mes.*

> Este mes cerramos cero agujeros y tenemos un logo bonito. Y no voy a decir que el logo no
> importaba: importaba, y Carlos lo subió a Bloque 0 con razón — sin identidad no se puede hacer
> ni el sitio ni las redes ni una firma de correo. Pero **la identidad se declaró terminada en el
> momento equivocado**. Se cerró la paleta y la marca en la primera hora; las siete siguientes
> fueron acabado, no decisión.
>
> Mi criterio: hay una diferencia entre *bloqueante* y *pendiente*. El símbolo era bloqueante. La
> textura del borde de una pluma no bloquea nada. Nos quedamos trabajando en lo segundo con la
> energía de lo primero.

### Renata · Directora de Marca y Marketing
*Marca de una empresa de servicios B2B chica que compite contra freelancers baratos y agencias
grandes. Su métrica: que un desconocido entienda qué vendemos en cinco segundos.*

> El logo **está bien**. No es genérico, no parece plantilla, tiene un símbolo con historia real y
> una paleta que no se parece a la de nadie en el sector — todos van azul corporativo o naranja
> "startup". El violeta es un activo. Y que la lectura cambie según el fondo es una decisión de
> diseñador, no un accidente; me gusta.
>
> Ahora lo que no está bien, y es lo que más me preocupa: **no tenemos marca, tenemos un símbolo.**
> Una marca es el símbolo *más* la tipografía, el bloqueo, cómo se comporta en un fondo de foto,
> qué se hace cuando no cabe, el tono de voz y una frase que la gente repita. De eso tenemos: el
> símbolo y una paleta. El 20%.
>
> Y una cosa dura: llevamos horas discutiendo un detalle que **el cliente no va a ver nunca**. Ese
> borde de pluma se aprecia al 400% de zoom. En una tarjeta de presentación, en el favicon, en el
> avatar de WhatsApp Business, es invisible. Estamos optimizando para un espectador que no existe.
>
> Mi criterio: **congelar el símbolo como v1 y pasar a la tipografía.** El logo sin palabra no se
> puede poner en un correo, y el correo es el primer punto de contacto con un cliente.

### Iván · Director Comercial
*Cierra proyectos de comisión con negocios locales de Querétaro. Su métrica: propuestas enviadas
y cerradas por mes.*

> A mí que no me hablen de plumas. Yo necesito **algo que mandar**. Hoy si un prospecto me dice
> "mándame info", yo no tengo qué mandarle. No hay sitio, no hay una página, no hay un PDF, no
> hay ni una firma de correo con el logo.
>
> El logo me sirve, sí, pero me sirve **aplicado**. Dame el logo en PNG cuadrado para el perfil de
> WhatsApp Business y ya gané algo hoy. Eso son diez minutos y todavía no existe.
>
> Y les digo lo que sí me da miedo del branding: **no tenemos clientes que presumir.** ICAMP no es
> cliente. Ligas Mazi es nuestro. Así que la marca va a tener que cargar sola con toda la
> credibilidad, y para eso el logo no alcanza: necesito el sitio con el laboratorio de animación,
> porque eso **es** la prueba de que sabemos hacer lo que vendemos.
>
> Mi criterio: el logo ya está suficientemente bueno. Lo que me falta no es calidad de logo, es
> **superficie donde ponerlo**.

### Sofía · Directora de Colaboradores y Comisiones
*Administra a los colaboradores que cobran por comisión. Su métrica: cero colaboradores que se
van por no saber cuándo ni cuánto cobran.*

> Voy a decir lo incómodo. Mientras pulíamos el logo, **el agujero que Carlos mismo marcó como el
> que más sangra sigue exactamente igual.** Nadie sabe cuánto va a ganar ni cuándo. Ese es el
> problema que pierde gente buena, y la gente buena no se va porque el logo esté tosco.
>
> Y hay una relación directa con el branding que nadie ha dicho: **la marca hacia adentro también
> es marca.** Un colaborador que no sabe cuándo le pagan no cree en la empresa, y un colaborador
> que no cree no la recomienda ni la defiende. El branding interno de Grupo Mazi hoy es una
> promesa verbal.
>
> Mi criterio: no me opongo al logo. Me opongo a que el Panel Mazi siga siendo Fase 2 mientras la
> Fase 1 se estira.

### Tomás · Director de Operación y Producto
*Construye lo que se vende y mide el costo real en tiempo. Su métrica: piezas entregadas y
reutilizables.*

> Defiendo una de las desviaciones y ataco otra.
>
> **La que defiendo: el vectorizador.** No estaba en el plan, es cierto. Pero hoy Grupo Mazi tiene
> una herramienta propia que convierte cualquier imagen en vector editable con control de paleta,
> cierre morfológico, pulido iterado y supermuestreo. Eso se usa en **cada** identidad de cliente
> de aquí en adelante. Se construyó una vez y se cobra muchas — es literalmente el lema de la
> casa. Y cumple LA REGLA sin haber pagado el peaje de detener nada importante, porque lo
> importante ya estaba detenido.
>
> **La que ataco: seguir puliendo.** Aquí soy técnico y soy claro. La imagen fuente mide 1408×768
> y sus plumas vienen con el borde irregular **de origen**. El supermuestreo a 3× ya extrajo casi
> toda la información que hay. Seguir filtrando no crea información: sólo redondea hasta perder la
> forma. **Cada iteración adicional rinde menos y arriesga más.**
>
> Si Carlos quiere plumas perfectas, hay dos caminos honestos y ninguno es "ajustar otro número":
> 1. **Regenerar la fuente** — pedirle a la IA la misma imagen a mayor resolución. Barato, es un
>    prompt, y puede resolverlo todo de un golpe.
> 2. **Redibujar las plumas como geometría** encima de la silueta buena — cuñas paramétricas como
>    las de la cadera, que salen impecables porque son matemática, no trazado de píxeles. Costoso:
>    medio día bien invertido, no una hora.
>
> Mi criterio: **la opción 1 antes que la 2**, y las dos **después** del sitio.

### Lo que el equipo firma en conjunto

| | |
|---|---|
| **En qué coinciden los cinco** | El símbolo está suficientemente bueno. El problema no es su calidad, es que no está aplicado a nada. |
| **La desviación que todos condenan** | Las veinte iteraciones de micro-ajuste. Optimización para un espectador que no existe. |
| **La desviación que todos absuelven** | El vectorizador. Es activo reutilizable y cumple la regla de la casa. |
| **Lo que nadie había dicho** | La marca hacia adentro. Un colaborador que no sabe cuándo cobra no cree en la empresa. |
| **La grieta real** | No hay clientes que presumir, así que la marca carga sola con la credibilidad — y para eso el logo no alcanza: hace falta el sitio. |

---

## 2 · El consejo

### 1 · EL CREYENTE

**Quién necesita esto con urgencia y qué hace hoy en su lugar.** Carlos, para poder vender esta
semana. Hoy en su lugar hace **nada**: cuando un prospecto pide información, no hay nada que
mandar. Un negocio de servicios sin identidad no puede cobrar por comisión, porque la comisión
exige que el cliente crea que te vas a quedar — y nadie cree eso de alguien que no tiene ni logo.

**Por qué ahora.** Porque acaba de recuperar algo que llevaba quince años perdido. El archivo del
logo original no existía y el contacto tampoco; hoy existe otra vez, **en vector, editable, con
la paleta medida de su propia imagen y con el proceso documentado para reproducirlo**. Esa
ventana se abrió porque la vectorización asistida está al alcance, no porque Carlos tuviera de
repente presupuesto de estudio de diseño.

**La mejor versión si todo sale bien.** Grupo Mazi tiene una marca que no se parece a nada del
sector —violeta neón donde todos van azul— con un símbolo que carga historia real de quince años
y un significado que **sí** se puede contar: μαζί, "juntos", que es exactamente el modelo de
comisión y largo plazo. El sitio es la demo, la marca es la firma, y el laboratorio de animación
prueba en dos segundos que sabemos hacer lo que vendemos.

**La ventaja injusta.** Que la identidad no se compró: se construyó con herramienta propia, y esa
herramienta **se queda**. Grupo Mazi puede hacerle identidad completa a un cliente en horas, y
cobrarla. Ningún freelance que subcontrata diseño puede competir con eso en velocidad ni en
margen.

**La única apuesta sobre la que descansa todo:** que los clientes de Grupo Mazi compren por
**prueba de capacidad** —ver el trabajo funcionando— y no por catálogo de logos bonitos. Si eso
es cierto, la identidad es sólo la firma y el sitio es la venta. Si es falso, todo esto está al
revés.

### 2 · EL ESCÉPTICO

**Quién no va a pagar y por qué.** Ningún cliente de Grupo Mazi ha pagado un peso más por este
logo, y ninguno lo hará. El logo no es el producto. Es infraestructura interna disfrazada de
avance visible, y por eso se siente tan bien trabajar en él: **da la sensación de progreso sin el
riesgo de exponerse a un cliente.**

**El competidor o el atajo gratuito.** Cualquier freelance con Canva tiene un logo decente en una
tarde. La ventaja de Grupo Mazi no está ahí y nunca estuvo. Y el atajo que se ignoró: el logo
**ya estaba bueno hace ocho horas.** El de la sexta iteración era indistinguible del de la vigésima
para cualquier ojo que no sea el de Carlos al 400% de zoom.

**El punto ciego que el fundador tiene demasiado cerca.** Que **este logo es suyo desde hace
quince años.** No es un activo de negocio en su cabeza, es una parte de él que había perdido y
acaba de recuperar. Por eso ve la aspereza de una pluma que ningún cliente verá jamás, y por eso
"prácticamente perfecto" no bastó. Eso no es mal criterio, es apego — y el apego es exactamente
lo que hace que un fundador se quede puliendo el logo mientras el negocio no factura.

Y hay un segundo punto ciego, más caro: **Carlos escribió él mismo cuál es el agujero que más
sangra** —pagar a los colaboradores— y hoy está igual que ayer. La gente buena no se va porque el
borde de una pluma esté tosco.

**La forma más rápida en que esto se muere.** No se muere con estruendo. Se muere así: pasa otra
semana con la marca "casi lista", el sitio no arranca, un colaborador bueno se va porque no supo
cuándo cobraba, y Grupo Mazi sigue siendo una empresa con un logo excelente y cero facturación.
**El logo perfecto es el cementerio más cómodo que existe para un negocio nuevo.**

**LA FALLA FATAL:** el proceso confundió *"la marca es importante"* con *"la marca hay que
perfeccionarla ahora"*. Son cosas distintas y la segunda es falsa. Si esto es cierto —y lo es—
no se sigue construyendo branding: se congela y se pasa a lo que factura.

### 3 · EL INVERSIONISTA

**¿Hay prueba de que van a PAGAR?** No, y no la va a haber, porque **el logo no se vende.** No es
la unidad de negocio. Los números reales:

| Concepto | Número |
|---|---|
| Ingreso directo atribuible al logo | **$0** |
| Ingreso directo atribuible al logo dentro de un año | **$0** |
| Sesiones invertidas en el símbolo | 1 completa |
| Iteraciones de micro-ajuste | ~20 |
| Agujeros del diagnóstico cerrados | **0 de 3** |
| Clientes de pago hoy | **0** |
| Cosas que un prospecto puede recibir hoy si pide info | **0** |

**Dónde sí hay dinero, y es lo único que me interesa:** el **vectorizador**. Eso no es gasto, es
capacidad instalada. Identidad de marca completa para un negocio chico en Querétaro se cotiza
entre **$8,000 y $25,000 MXN**. Con esta herramienta, Grupo Mazi la produce en horas y con margen
casi puro, porque el costo marginal es tiempo de máquina. **Ese es el único retorno real de esta
sesión, y es bueno.** Se pagó con horas que no facturaban, así que el costo hundido ya está
hundido: lo que queda es explotarlo.

**Cuándo llega el primer peso.** No con el logo. Llega con **lo primero que un prospecto pueda
ver**: el sitio con el laboratorio de animación. Y llega más rápido si se cobra la identidad
como servicio, porque la herramienta ya está.

**La prueba más barata que demostraría demanda esta misma semana.** Dos horas de trabajo, cero
pesos: exportar el logo a PNG cuadrado, ponerlo en WhatsApp Business y en el correo, y **mandar
tres mensajes a tres negocios ofreciendo identidad de marca completa por $8,000**. Si uno
contesta, hay negocio y hay validación de la herramienta. Si ninguno contesta en una semana, el
problema nunca fue el logo.

**¿Pondría mi propio dinero?** **En el branding, no.** Ya está pagado y ya está suficientemente
bueno; un peso más ahí es un peso quemado. **En el vectorizador convertido en servicio que se
cobra, sí**, y hoy mismo.

**El único número que me haría cambiar de opinión:** que Carlos me muestre **un solo cliente que
se haya caído por la calidad del logo**. Uno. Si no existe, el tema está cerrado.

### 4 · EL JUEZ

He leído el brief, al equipo y a los tres.

Empiezo por lo que los tres reconocen y no se va a discutir: **el símbolo está bien y está
terminado.** El Creyente tiene razón en que recuperar un logo de quince años en vector editable
es un logro real y en que la paleta es un activo diferencial. El Escéptico tiene razón en que
estaba igual de bien hace muchas iteraciones. El Inversionista tiene razón en que no genera un
peso. Las tres cosas son verdad a la vez.

También reconozco lo que el equipo firmó y el consejo confirmó: **el vectorizador se absuelve.**
Fue desviación y fue la mejor decisión de la sesión. Es la única pieza de todo esto que puede
facturar.

Pero el veredicto no es sobre el logo. Es sobre el **proceso**, que es lo que Carlos puso a
juicio. Y ahí la falla fatal del Escéptico se sostiene: se confundió *importante* con *urgente
de perfeccionar*. El síntoma más claro no es el tiempo gastado — es que hoy no existe **una sola
superficie** donde el logo esté puesto. Un símbolo sin aplicación no es identidad, es un dibujo.

**VEREDICTO: ARREGLAR PRIMERO.**

No es CONSTRUIR porque construir más branding del mismo tipo es exactamente el error. No es MATAR
porque la marca no está mal: está incompleta por el lado equivocado. Se arregla el proceso, no la
pieza.

**El riesgo más grande, en una línea:** que el logo perfecto se convierta en el lugar cómodo
donde el negocio se queda quieto mientras el agujero que Carlos mismo señaló como el que más
sangra sigue abierto.

**El cambio exacto que lo convierte en CONSTRUIR:**

1. **Congelar el símbolo hoy como v1.** Con acta. No se vuelve a abrir hasta que exista al menos
   una aplicación real en la calle. Si algún día se retoma, se hace por la vía de Tomás
   —regenerar la fuente a mayor resolución— y no ajustando otro número.
2. **Terminar la marca por donde falta, no por donde sobra:** la tipografía y el bloqueo. Sin
   palabra, el logo no puede ir en un correo, y el correo es el primer contacto con un cliente.
   Eso es una sesión, no ocho.
3. **Exportar los archivos de uso diario** —PNG cuadrado, favicon, avatar— y **ponerlos hoy** en
   WhatsApp Business y en el correo. Es la única forma de que la marca deje de ser un archivo.
4. **Volver al plan que Carlos escribió:** el sitio, arrancando por el laboratorio de animación,
   que no depende del video, ni del dominio, ni de nada de nadie.

**LA PRUEBA DE 10 MINUTOS, antes de escribir una sola línea de código:**

Exportar el logo a PNG cuadrado. Ponerlo como foto de perfil de WhatsApp Business y en la firma
del correo. Abrirlo en el iPhone y mirarlo al tamaño real en que la gente lo va a ver.

**Si a ese tamaño la aspereza de las plumas no se distingue —y no se va a distinguir— el debate
está cerrado por evidencia y no por opinión, y el símbolo queda aprobado como v1.**

Diez minutos. Y si resulta que sí se ve, entonces el consejo se equivocó y hay una razón real
para volver, con la vía de Tomás y no con otro número.

---

## Lo decidido

| # | Decisión | Estado |
|---|---|---|
| 1 | El símbolo se congela como **v1**. No se reabre hasta que haya una aplicación real publicada. | propuesto al fundador |
| 2 | Si se reabre: **regenerar la fuente a mayor resolución** primero. Nunca otro micro-ajuste. | vía técnica acordada |
| 3 | Lo que sigue del branding es **tipografía y bloqueo**, no acabado del símbolo. | siguiente entrega |
| 4 | **Exportar y aplicar hoy**: PNG cuadrado, favicon, avatar, firma de correo. | 10 minutos |
| 5 | El **vectorizador** se absuelve y se convierte en servicio cobrable ($8–25k MXN por identidad). | activo nuevo |
| 6 | Se vuelve al plan: **el sitio, arrancando por el laboratorio de animación**. | Fase 1 |
| 7 | La prueba de 10 minutos **manda sobre la opinión del consejo**. | Carlos la corre |
| 8 | El origen del alias **no se cuenta nunca en público**. Hacia afuera: μαζί, "juntos". | permanente |

**El veredicto es consejo, no orden.** Si Carlos lo oye y reafirma que quiere el logo perfecto
antes de todo lo demás, se construye y punto — pero ahora ya sabe qué está cambiando por qué.
