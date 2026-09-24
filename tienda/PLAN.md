# Plan · la app de venta y reparto

> Dos apps, una base. La **primera** es para el cliente-socio que vende producto
> de barbería (gel, tijeras, máquinas, tintes, shampoos, cosas de barba). La
> **segunda** —mercancía variada: ropa, termos, vasos, tazas, accesorios— está
> tentativa y sale de la misma base. La de barbería es la que se mueve rápido,
> así que es la que se construye, y además hace de esqueleto y de currículum
> para vender la otra y para vender lo nuestro.
>
> Pedida por Carlos el 23 de septiembre de 2026.

---

## 0. La decisión que evita el defecto que él mismo reportó

Textual: *«en la de ligas hay como cuatro botones que te llevan al mismo lado,
pero en otros apartados no funcionan, pero se mueven raro, se ven feo y así»*.

Eso no se arregla con cuidado, se arregla con estructura. **Hay UNA tabla de
rutas y todo sale de ella:**

- Cada pantalla tiene **una** ruta canónica. No hay dos formas de llegar.
- **El menú lateral se genera de la tabla.** Nadie escribe un enlace a mano, así
  que no puede haber un botón que apunte a donde no existe.
- La tabla dice **qué papel** puede ver cada ruta, y el menú esconde el resto.
  No es seguridad —esa vive en el servidor— es que no se vea lo que no te toca.
- Una prueba recorre **todas** las rutas y revienta si: una lleva a 404, dos
  entradas del menú van al mismo destino, una pantalla no tiene salida, o una
  ruta existe y no está en la tabla.

Es la misma idea de la compuerta de `build.mjs`: el defecto no se evita con
disciplina, se evita haciendo que no se pueda cometer.

---

## 1. Tres apartados, como en Fadori

Lo pidió así: *«Tipo fadori con apartados en sidebar desplegable. 3 apartados:
Cliente, Repartidor, Administrativo.»* No son tres apps: es una, y lo que ves
depende de quién eres.

| Apartado | Quién lo usa | En qué aparato | Lo que le importa |
|---|---|---|---|
| **Cliente** | el barbero que se surte, o quien compra suelto | teléfono, casi siempre | ver bonito, encontrar rápido, repetir su pedido de siempre |
| **Repartidor** | quien entrega | teléfono, en la calle, con sol | a dónde voy, qué llevo, qué cobro, cuánto cambio doy |
| **Administrativo** | el dueño, quien surte y quien cobra en el local | computadora y **tableta** | inventario, punto de venta, repartidores en vivo, números |

**El punto de venta vive dentro de Administrativo, pero con su propia cara de
tableta.** Se usa de pie, con prisa y con el cliente enfrente mirando: si tarda,
se pierde la venta. Por eso no es «una pantalla más del admin» aunque esté en su
menú.

---

## 1-bis. Lo que investigué y lo que decidí

Carlos pidió que no se hiciera «a lo pendejo»: que se viera Amazon, Mercado
Libre, Rappi, DiDi, Uber, y qué hace que Temu o un casino te tengan pegado —
pero sin ser invasivo y que lo pueda usar un señor grande sin abrumarse.

### El hallazgo que manda sobre todo lo demás

**El cliente de una distribuidora de barbería casi siempre es un barbero que se
vuelve a surtir**, no alguien que pasea por la tienda. Compra lo mismo cada tanto:
su gel, sus cuchillas, su peróxido. Amazon lo resolvió con **«Volver a comprar»**
y es de sus botones más usados.

Entonces la portada **no empieza con ofertas: empieza con su pedido de siempre, a
un toque.** Eso es lo que hace volver a alguien sin trucos: que la app le ahorre
tiempo cada vez. Y encaja con lo que Carlos ya pidió aparte —saber cuándo le toca
volver a pedir— porque es el mismo dato visto desde el otro lado.

### Lo que se toma de cada una

| De | Qué se toma | Qué NO |
|---|---|---|
| **Amazon** | «Volver a comprar» arriba; recomendados por lo que compraste | la portada saturada de carruseles |
| **Mercado Libre** | buscador dominante; categorías como íconos grandes; «envío gratis» bien visible | — |
| **Rappi / DiDi** | la tira de categorías horizontal arriba; secciones verticales que se leen de corrido | la pantalla que cambia cada vez que la abres |
| **Uber** | el seguimiento: un mapa, un punto que se mueve, un tiempo estimado **y nada más** | — |
| **Temu / casinos** | la sensación de **avance y recompensa** | todo el resto (abajo) |

### Enganchar sin engañar

Temu está señalado por organizaciones de consumidores precisamente por esto:
cuentas regresivas falsas, «quedan 2» que no es cierto, ruletas, juegos para que
no te vayas. Funciona, y también es por lo que la gente acaba desconfiando.

**Aquí la regla es: todo lo que engancha tiene que ser verdad.**

- **Existencias reales.** Carlos pidió que se vea cuántas quedan. Mostrarlo sirve
  justo porque el número es cierto — es la versión honesta del «quedan 2» de Temu.
- **Avance real hacia el sorteo:** «te faltan $340 este mes para entrar». Una
  barra que avanza con tus compras de verdad, no un reloj que se reinicia.
- **Ofertas con fecha de fin de verdad.** Si no se acaba, no lleva reloj.
- **Nada** de ruletas, juegos para retenerte, reproducción automática, ni
  «¿seguro que no quieres ahorrar?» para avergonzar al que dice que no.

### Que lo pueda usar un señor grande

Medido contra la investigación con adultos mayores, no a ojo:

- **Letra de cuerpo grande** —la investigación recomienda ~20 pt en teléfono— y
  que se pueda agrandar más.
- **Cada botón de al menos 48 × 48**, con 8 de separación. El mínimo de la casa
  ya era 44; aquí se sube.
- **Navegación lineal:** pocas decisiones por pantalla, y siempre se ve dónde
  estás y cómo regresar.
- **Lo que se toca se ve tocable**, con borde y forma, no adivinando.
- **Recordar dónde vas:** «llevas 3 productos · $1,240» siempre visible al
  comprar. La memoria corta es lo primero que falla con la edad.
- **Pocas fotos a la vez.** Una tarjeta, una foto, un precio, un botón. El exceso
  de imágenes es exactamente lo que Carlos no quiere.

El que sabe moverse no pierde nada con esto: los atajos existen —el buscador, el
pedido de siempre—; sólo no son obligatorios.

---

## 2. El flujo, pantalla por pantalla

### Al abrir — igual en los tres apartados

```
Presentación (logo + animación, ~1.2 s, se salta al toque)
   └─→ adentro, sin muro de sesión
```

Dicho por Carlos: *«No vamos a poner peros como en la de Ligas Mazi para la
sesión. Eso se puede hacer cuando vas a comprar.»* El cliente navega y llena el
carrito como anónimo; la identidad se pide **al pagar**. El carrito del anónimo
se conserva al identificarse — perderlo ahí es donde se cae la venta.

Repartidor y Administrativo **sí** piden sesión, pero una vez: el teléfono del
repartidor queda con su cuenta, como una app de trabajo.

### El menú lateral

Desplegable, se guarda y se saca, como en Fadori. **Se genera de la tabla de
rutas (§0)**: nadie escribe un enlace a mano. En teléfono es un cajón que sale de
la orilla; en tableta y computadora puede quedarse fijo y angosto, sólo íconos.

### Cliente

```
/                      portada — su pedido de siempre, categorías, ofertas, sorteo
/c/<categoría>         categoría
/p/<producto>          ficha: fotos, precio, CUÁNTAS QUEDAN, características,
                       descripción, «cuándo lo pediste la última vez»,
                       y recomendados abajo
/buscar?q=             resultados
/carrito               carrito, con «llevas N · $X» siempre visible
/pagar                 ← aquí se pide identidad. Pagar ahora o al recibir
/pedidos               mis pedidos, y «volver a pedir» en cada uno
/pedido/<id>           seguimiento: mapa, dónde va el repartidor, tiempo estimado
/apartados             lo apartado y lo que falta por pagar
/sorteo                el sorteo del mes y cuánto le falta para entrar
/cuenta                datos, direcciones, cuándo le toca volver a surtirse
```

**La portada, en orden de arriba a abajo** — decidido con lo del §1-bis:

1. Buscador grande.
2. **«Tu pedido de siempre»** — si ya compró antes. Un toque y va al carrito.
   Si es nuevo, en su lugar va «lo más pedido por barberías».
3. Categorías como íconos grandes, en una tira que se desliza.
4. «Te toca surtirte» — sólo si está cerca su fecha de siempre, y dice por qué.
5. Ofertas con fecha de fin real.
6. El sorteo del mes y su barra de avance.

Seis cosas y ya. Lo demás está a un toque en su categoría.

### Repartidor

```
/r                     hoy: entregas, camino, primera parada, turno abierto o no
/r/ruta                el orden ya resuelto y el mapa (§6)
/r/parada/<id>         qué entrega, cuántas piezas, evidencia,
                       y si es contra entrega: COBRAR y CAMBIO (§4)
/r/turno               entrada, salida, pausas — sus horas del día y la semana
/r/historial           lo de días pasados
```

### Administrativo

```
/a                     tablero en VIVO: ventas de hoy, pedidos en curso,
                       repartidores en el mapa, lo que se está acabando, avisos
/a/venta               PUNTO DE VENTA — cara de tableta (§5)
/a/inventario          existencias, ajuste rápido (la venta que se hizo fuera)
/a/producto/<id>       editar
/a/producto/nuevo      alta
/a/importar            el Excel/PDF/Word → productos (§8)
/a/categorias          crear, renombrar, reordenar
/a/pedidos             todos los pedidos y en qué paso va cada uno
/a/repartidores        altas, dónde está cada uno, ruta, velocidad (§4)
/a/turnos              horas y días trabajados por repartidor
/a/clientes            ficha, frecuencia, primera compra, cuándo vuelve (§7)
/a/descuentos          promociones y cupones
/a/apartados           los apartados abiertos y lo que deben
/a/sorteos             el sorteo, sus reglas y su permiso (§7-bis)
/a/conversaciones      el bot y sus pláticas, con «lo tomo yo» (§9)
/a/redes               calendario y cola de publicaciones
/a/reportes            números, tipo Fadori
/a/ajustes             todo lo configurable
```

### La regla de las salidas

Ninguna pantalla es un callejón. Cada una dice arriba **de dónde vienes** y, si
está vacía, **qué hacer**, con un botón que lleva a llenarla. Un inventario
vacío no dice «sin resultados»: dice «sube tu Excel» y abre `/a/importar`.

---

## 3. Todo en tiempo real

Carlos: *«Actualización en tiempo real a administrativo de procesos»*. Cada cambio
de estado de un pedido, cada venta en el mostrador, cada entrega, llega al
tablero sin recargar.

Los pasos de un pedido son **seis y sólo seis**, y los ven igual los tres
apartados:

```
recibido → preparando → en camino → entregado
                              ↘ no se pudo entregar
            ↘ cancelado
```

Un pedido no puede saltarse un paso ni regresar sin dejar quién y por qué. Es lo
que evita el clásico «¿se entregó o no?» a las nueve de la noche.

---

## 4. Los repartidores

### Cobrar y dar cambio

Carlos: *«Repartidor puede cobrar, cambio etc»*.

- En la parada, si el pedido es **contra entrega**, aparece el total grande y un
  teclado: el repartidor escribe con cuánto le pagaron y **la app dice el cambio**,
  en grande. Nadie saca cuentas en la calle con el cliente esperando.
- Botones rápidos con los billetes de verdad —$100, $200, $500, $1,000— y
  «exacto».
- Al cerrar el turno, la app dice **cuánto efectivo debe entregar** el
  repartidor: la suma de lo cobrado. El cuadre se hace solo.

### Dónde va cada uno

Carlos: *«poder seguir ubicación actual ruta velocidad etc con nombre cuenta»*.

- En `/a/repartidores` y en el tablero: cada uno en el mapa, con nombre, su ruta
  del día, en qué parada va, velocidad y hace cuánto se actualizó.
- **La ubicación se manda sólo con el turno abierto.** No es sólo lo decente: la
  ubicación de un empleado es dato personal, y seguirla fuera de su horario es
  pedir un problema. Al abrir turno lo ve y lo acepta, y el aviso de privacidad lo
  dice. Si cierra turno, deja de mandar.
- Si alguien va muy rápido, se marca — como aviso para el dueño, no como castigo
  automático.

### Horas y días

Carlos: *«Poder gestionar horas trabajadas / días»*. Entrada, salida y pausas desde
el teléfono del repartidor, y en `/a/turnos` las horas por día, semana y
quincena, exportables a Excel para la nómina.

---

## 5. El punto de venta, tipo Fadori

Carlos: *«Punto de venta con estadísticas tipo fadori»*. Fadori ya tiene mostrador
y tablero, así que no se parte de cero: se toma lo que funcionó allá.

- Buscar o **escanear** (código de barras o QR, con la cámara), carrito, cobrar.
- Efectivo con cambio automático, tarjeta, transferencia, o mixto.
- **La venta baja el inventario en el mismo lugar** que la tienda en línea.
- Abrir y cerrar caja con cuadre de efectivo.
- Las estadísticas del día a la vista: lo vendido, lo más vendido, por hora.
- Diseñado para **tableta de pie**: botones grandes, una sola columna de acción,
  nada que requiera precisión.

---

## 6. Las rutas

Carlos: *«Automatización y optimización de GPS para rutas»*.

- **El que ordena las paradas es VROOM** —abierto, se hospeda nosotros, lo
  mantienen activo, resuelve 200 entregas y 50 repartidores en menos de un
  décimo de segundo—, **sobre OSRM**, que calcula el camino por las calles con
  mapas de OpenStreetMap. Las dos corren en nuestra máquina: es stack propio, no
  un servicio que se pueda subir de precio.
- Respeta **ventanas de horario** —«la barbería abre a las 10»— y **capacidad**
  —lo que cabe en la moto—.
- El repartidor ve el orden ya resuelto y abre la navegación en su app de mapas
  de siempre con un toque. No se le enseña a usar un navegador nuevo.
- **⚠ Los mosaicos del mapa.** Los servidores públicos de OpenStreetMap **no** se
  pueden usar para una app comercial con tráfico: su política lo prohíbe. En la
  demo sí; en producción, mosaicos propios o un proveedor. Se decide cuando haya
  números de uso.

---

## 7. Las cuentas de los clientes

Carlos: *«Cuentas con frecuencia, primer compra, pagado previo o al momento»*.

Cada cliente tiene: **primera compra**, **cada cuándo compra**, **cuánto gasta
en promedio**, y si **paga antes o al recibir**.

**Saber cuándo va a volver a pedir:**

- Con **una** compra no se estima nada y no se inventa.
- Con **dos** hay un intervalo, y se dice que es apenas un indicio.
- Con **tres o más** ya hay ritmo y el aviso vale.

**El aviso dice en qué se basa** —«pide gel cada 5 semanas, van 4 y media,
últimas 6 compras»—, porque un aviso sin su razón se ignora a la tercera vez.

**Avisarle al cliente antes**, como pidió. Va primero como **notificación de la
app**, que es gratis y no tiene riesgo. Por WhatsApp se puede, pero con cuidado:
un mensaje que el negocio manda sin que el cliente escribiera primero es
exactamente lo que dispara el bloqueo del número (§9).

### Apartados

Para las barberías chicas: aparta hoy, paga en partes, recoge o se le entrega al
completar. Con fecha límite, y lo apartado **sí descuenta existencias** — si no,
se vende dos veces.

### 7-bis. Sorteos

Carlos: *«sorteos con límite de compra mensual»*.

**⚠ Esto es ley, no gusto:** en México un sorteo por compra —«participas por el
solo hecho de comprar»— **necesita permiso de la Secretaría de Gobernación**, y
además aviso a PROFECO por lo menos **3 días hábiles antes** de empezar.

Entonces la app lo opera, pero **no deja activar un sorteo sin capturar el número
de permiso.** No es desconfianza: es la misma compuerta que en el armado —que el
error no se pueda cometer por descuido—. Una multa o una clausura por un sorteo
de gel no vale lo que se ahorra en el trámite.

---

## 8. El Excel de mil productos

Lo pidió así: llega un archivo con mil productos y fotos, se sube, y la app los
deja listos con su categoría, sus datos y su precio, en minutos en vez de a mano.

1. Se sube el archivo (Excel, CSV, PDF o Word) y las fotos.
2. Se lee y se normaliza: nombres, precios, cantidades, códigos.
3. Un modelo propone **categoría y campos** de cada renglón, y **empareja cada
   foto** con su producto.
4. **Pantalla de revisión antes de guardar.** Lo que el modelo no supo queda
   marcado arriba, y se corrige en lote. Mil productos mal categorizados metidos
   de golpe cuestan más que haberlos hecho a mano, y además se ven en la tienda.
5. Se guarda con el archivo original y quién lo subió, por si hay que deshacer.

**Lo honesto:** no acierta el 100%. Lo que sí se sostiene: «de mil, revisas
cincuenta y corriges veinte» — una tarde en vez de una semana.

**Ya hay con qué probarlo, y es el caso difícil.** El catálogo de muestra (§11)
trae **66 tipos** para 698 productos, con «SHAMPOOS», «Shampoo» y «SHAMPOO» como
tres tipos distintos. Si el importador deja eso en ocho categorías limpias, sirve.

**Códigos de barras y QR:** se generan desde la ficha del producto e imprimen en
hoja de etiquetas. Con librería abierta que corre en nuestra máquina — es stack
propio, no se paga, y Carlos ya lo autorizó así.

---

## 9. El bot de WhatsApp

Carlos: *«tú resuélvelo sin hacer ningún trámite por ahora no pasa de comprar un
número y dárselo solo al bot»*.

**Se hace así, y su idea del número aparte es justo la que lo hace seguro.**

- Un **número dedicado sólo al bot**, nunca el de ventas del cliente.
- Se conecta con una librería que habla con WhatsApp Web (Baileys o similar).
  Es **no oficial** y va contra los términos de WhatsApp: **el número puede ser
  bloqueado** en cualquier momento. Los reportes van de días a meses, sin patrón.
  Por eso el número aparte: si lo tiran, se pierde un número de $100, no la línea
  de ventas del cliente.
- **Lo que menos riesgo da es contestar, no escribir primero.** WhatsApp se fija
  en qué tanto le contestan a uno, en si le escribe a desconocidos y en si el
  ritmo parece de robot. Un bot que **sólo responde** a quien le escribió es el
  perfil de menos riesgo. Mandarle mensajes a toda la lista de clientes es el de
  más.
- **⚠ Y ojo con los paquetes «anti-bloqueo».** En abril de 2026 se confirmó que
  uno de ellos, con 56 mil descargas, **robaba las sesiones y los mensajes**. Aquí
  no se instala nada de eso: se usa la librería principal, fijada a una versión
  revisada.
- Corre en un proceso aparte que no se apaga —no puede vivir en los workers de
  Cloudflare, necesita conexión permanente—.

**Se construye detrás de un adaptador** (regla §2 del CLAUDE.md: conectar sí,
depender no). El día que convenga pasar a la vía oficial de Meta, se cambia el
adaptador y el bot sigue igual. Ni una línea de lo demás se entera.

**Lo que el bot hace:**

- Lee el inventario de verdad: existencias, precio y plazo, no un texto fijo.
- **Nunca inventa precio ni existencias.** Si no sabe, pasa con una persona.
- Cuando cierra una venta, **baja el inventario en el mismo lugar** que la
  tienda y el mostrador.
- **«Lo tomo yo»** siempre a la vista en `/a/conversaciones`. La persona gana.

**Instagram, Messenger y TikTok van después.** Sin trámite no hay vía estable
para ninguna, y TikTok ni siquiera tiene una oficial para contestar mensajes.
Primero WhatsApp, que es donde se vende en México; lo demás, cuando WhatsApp
jale.

---

## 10. El inventario es uno solo

Hay **un** número de existencias por producto y le pegan cinco puertas —tienda,
punto de venta, repartidor, bot, ajuste a mano—. Dos ventas simultáneas de la
última pieza tienen que dejar a uno sin vender, no a los dos contentos.

Eso se resuelve en el servidor y **se prueba a propósito** disparando dos ventas
al mismo tiempo. Sin esa prueba el defecto aparece el día que haya movimiento de
verdad, que es el peor día.

---

## 11. El catálogo de muestra

Carlos: *«Los productos por ahora vas a usar los de otra App similar para poder
hacer los efectos la visibilidad etc basándonos en productos reales»*.

**Fuente: Odara Professional** (`odara.mx`), distribuidora mexicana de barbería y
salón. Es la que más se parece a lo que vende el cliente: máquinas, shampoos,
tintes, barbería y corte, peróxidos. Su catálogo está público en el formato
estándar de su tienda, así que se bajó limpio.

- **698 productos**, 697 con foto, precios reales en pesos de $49 a $4,930.
- **118 con precio de oferta** y **39 agotados** — los dos estados que hay que
  diseñar y que un catálogo inventado nunca trae.
- Marcas de verdad: Babyliss Pro, L'Oréal Professionnel, Alfaparf, Wahl…

**Qué se guardó y qué no.** Sólo hechos: nombre, marca, tipo, precio,
variantes y la **dirección** de cada foto. Las descripciones **no**: son texto de
Odara y este repo es público. Las fotos **no se copian**: se ven desde su
dirección original.

**Y no se publica para afuera.** Son marcas y fotos de terceros. Queda en el
taller para que Carlos y Luis lo prueben, con `noindex`, y **se reemplaza por el
catálogo del cliente** en cuanto lo haya.

---

## 12. Que no haya que escribir código para operarlo

Carlos: *«tiene que tener un soporte absoluto para que todo se pueda hacer sin
tener que estar escribiendo más código»*. **Nada de lo que cambia con el negocio
vive en el código:**

| Lo que va a cambiar | Dónde se cambia |
|---|---|
| categorías y su orden | `/a/categorias` |
| campos de un producto | `/a/ajustes` → plantillas por categoría |
| precios, descuentos, cupones | `/a/descuentos` |
| textos, logo, colores | `/a/ajustes` → identidad |
| qué contesta el bot | `/a/ajustes` → guion del bot |
| zonas y costos de envío | `/a/ajustes` |
| reglas del sorteo | `/a/sorteos` |

**Los campos de producto son por plantilla, no fijos.** Una tijera tiene medida
y material; un shampoo, mililitros; una taza, capacidad. Si fueran columnas
fijas, la segunda app —ropa, termos, tazas— exigiría tocar código, y ahí se muere
la idea de reusar la base.

---

## 13. Con qué se construye

- **HTML y módulos, sin paso de armado.** Se despliega en Cloudflare en un
  empujón, abre bien en el teléfono de Carlos y no nos amarra a una versión de
  nada. Si el proyecto pide React algún día, se cambia con razón medida.
- **Supabase** para datos, cuentas y tiempo real. Ya corre Ligas Mazi así.
- **Servidores aparte** para lo que no es pantalla: el del bot (proceso que no se
  apaga) y el de rutas (VROOM + OSRM). Mezclarlos con el sitio es como se termina
  publicando el código del servidor.
- **Teléfono primero**; el punto de venta, para **tableta** de verdad.

---

## 14. El orden

Cada bloque se entrega **funcionando**. Si algo se cae, se cae el último bloque y
no el producto.

| # | Bloque | Por qué va aquí |
|---|---|---|
| **1** | Tabla de rutas, armazón, menú lateral, presentación, y la prueba que recorre todo — **con el catálogo de muestra ya pintado** | impide el defecto de Ligas Mazi, y Carlos ve algo real desde el primer día |
| **2** | Ficha, categoría, buscador y carrito del cliente | la tienda se puede enseñar |
| **3** | Admin de productos y categorías con plantillas | ya se opera sin código |
| **4** | El importador del Excel | convierte mil productos en una tarde |
| **5** | Punto de venta | es la caja: da dinero desde el día uno |
| **6** | Pedidos, sus seis pasos y el tablero en vivo | |
| **7** | Repartidor: parada, cobro y cambio, turnos | |
| **8** | Rutas con VROOM y seguimiento en el mapa | |
| **9** | Cuentas, frecuencia y avisos de recompra | se afina con pedidos de verdad |
| **10** | Bot de WhatsApp | |
| **11** | Apartados, sorteos, descuentos | el sorteo, sólo con permiso capturado |
| **12** | Redes y reportes | |

---

## 15. Lo que hace falta y no lo pongo yo

1. **El nombre y la marca** del cliente de barbería. Mientras no estén, no se
   escribe ningún nombre: no presumimos clientes que no son clientes.
2. **Su catálogo**, aunque sea un pedazo, para reemplazar el de muestra.
3. **Si ya tienen permiso de Gobernación** para el sorteo, o si hay que tramitarlo.
4. **Un número para el bot**, cuando lleguemos al bloque 10.
