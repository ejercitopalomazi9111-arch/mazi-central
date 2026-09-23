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

## 1. Los cuatro rostros de la misma app

No son cuatro apps: es una, y lo que ves depende de quién eres.

| Rostro | Quién lo usa | En qué aparato | Lo que le importa |
|---|---|---|---|
| **Tienda** | el cliente final | teléfono, casi siempre | ver bonito, encontrar rápido, pagar sin fricción |
| **Mostrador** | quien cobra en el local | **tableta**, a veces teléfono | cobrar en segundos, con una mano, sin errores |
| **Ruta** | el repartidor | teléfono, en la calle, con sol | a dónde voy, qué llevo, qué cobro |
| **Admin** | el dueño y quien surte | computadora y tableta | inventario, precios, campañas, conversaciones, números |

**El mostrador es lo más importante y lo que más se descuida.** Se usa de pie,
con prisa, con el cliente enfrente mirando. Si tarda, se pierde la venta. Por eso
tiene su propio rostro y no es «una pantalla del admin».

---

## 2. El flujo, pantalla por pantalla

### Al abrir

```
Presentación (logo + animación, ~1.2 s, se salta al toque)
   └─→ la app, ya adentro
```

**Sin muro de sesión.** Dicho por Carlos: *«No vamos a poner peros como en la de
Ligas Mazi para la sesión. Eso se puede hacer cuando vas a comprar.»* Se navega y
se llena el carrito como anónimo; la identidad se pide **en el momento de pagar**
y nunca antes. El carrito del anónimo se conserva al identificarse — perderlo ahí
es donde se cae la venta.

### Tienda · el cliente

```
/                      portada — destacados, categorías, buscador
/c/<categoría>         categoría (y subcategoría)
/p/<producto>          ficha: fotos, precio, existencias, descripción
/buscar?q=             resultados
/carrito               carrito
/pagar                 ← el primer punto donde se pide identidad
/pedidos               mis pedidos
/pedido/<id>           seguimiento: en qué va y por dónde viene
/cuenta                datos, direcciones, métodos
```

### Mostrador · el punto de venta

```
/m                     cobrar: buscar o escanear, carrito, cobrar
/m/turno               abrir y cerrar caja, cuadre de efectivo
/m/devolucion          devolución y cancelación
```

Aquí entra **la venta en físico y en efectivo**: se cobra en el mostrador y el
inventario baja igual que si fuera en línea. Y para la venta que se hizo **fuera**
del sistema, el ajuste rápido está en `/a/inventario`.

### Ruta · el repartidor

```
/r                     hoy: cuántas entregas, cuánto camino, la primera parada
/r/ruta                el orden ya resuelto, con mapa
/r/parada/<id>         qué entrega, cuántas piezas, evidencia, cobro si aplica
/r/historial           lo de días pasados
```

### Admin

```
/a                     tablero: ventas de hoy, lo que se está acabando, avisos
/a/inventario          existencias, ajuste rápido
/a/producto/<id>       editar
/a/producto/nuevo      alta
/a/importar            el Excel/PDF/Word → productos (§4)
/a/categorias          crear, renombrar, reordenar
/a/pedidos             todos los pedidos
/a/repartos            armar y asignar rutas
/a/descuentos          promociones, cupones, campañas
/a/redes               calendario, cola de publicaciones, qué hora conviene
/a/conversaciones      bandeja única: WhatsApp, Instagram, Messenger
/a/clientes            ficha y cada-cuándo vuelve a pedir (§5)
/a/reportes            números
/a/ajustes             todo lo configurable
```

### La regla de las salidas

Ninguna pantalla es un callejón. Cada una tiene arriba **de dónde vienes** y, si
está vacía, **qué hacer** con un botón que lleva a la acción que la llena. Un
inventario vacío no dice «sin resultados»: dice «sube tu Excel» y abre
`/a/importar`.

---

## 3. Que no haya que escribir código para operarlo

Carlos: *«tiene que tener un soporte absoluto para que todo se pueda hacer sin
tener que estar escribiendo más código»*. Eso significa que **nada de lo que
cambia con el negocio vive en el código**:

| Lo que va a cambiar | Dónde se cambia | Cuánto tarda |
|---|---|---|
| categorías y su orden | `/a/categorias` | segundos |
| campos de un producto | `/a/ajustes` → plantillas de producto | un minuto |
| precios, descuentos, cupones | `/a/descuentos` | segundos |
| textos de la tienda | `/a/ajustes` | segundos |
| logo, colores, tipografía | `/a/ajustes` → identidad | un minuto |
| qué contesta el bot | `/a/ajustes` → guion del bot | minutos |
| zonas y costos de envío | `/a/ajustes` | un minuto |

**Los campos de producto son por plantilla, no fijos.** Una tijera tiene medida y
material; un shampoo tiene mililitros y tipo de cabello; una taza tiene capacidad.
Si los campos fueran columnas fijas, la segunda app —ropa, termos, tazas— exigiría
tocar código, y ahí se muere la idea de reusar la base. Así que cada categoría
declara sus campos y la ficha se dibuja con lo que haya.

---

## 4. El Excel de mil productos

Lo pidió así: llega un archivo con mil productos y fotos, se sube, y la app los
deja listos con su categoría, sus datos y su precio, en minutos en vez de a mano.

**Cómo va a funcionar, y dónde está el filo:**

1. Se sube el archivo (Excel, CSV, PDF o Word) y las fotos.
2. Se lee y se normaliza: nombres, precios, cantidades, códigos.
3. Un modelo propone **categoría y campos** de cada renglón, y **empareja cada
   foto** con su producto.
4. **Pantalla de revisión antes de guardar.** Esto no es opcional y es la parte
   que importa: lo que el modelo no supo queda marcado en amarillo arriba, y se
   corrige en lote. Mil productos mal categorizados metidos de golpe cuestan más
   trabajo que haberlos hecho a mano, y además se ven en la tienda del cliente.
5. Se guarda, y queda el archivo original y quién lo subió, por si hay que
   deshacerlo.

**Lo honesto:** no va a acertar el 100%. La promesa que sí se puede sostener es
«de mil productos, revisas cincuenta y corriges veinte» — y eso ya es la
diferencia entre una tarde y una semana. Prometer que queda perfecto solo es como
se pierde la confianza del cliente en la semana dos.

---

## 5. Saber cuándo va a volver a pedir

Cada cliente que compra seguido tiene un ritmo. Con su historial se estima cada
cuánto pide y **se avisa antes**, para que puedan surtirse o buscarlo.

- Con **una** compra no se estima nada y no se inventa.
- Con **dos** hay un intervalo, y se dice que es apenas un indicio.
- Con **tres o más** ya hay ritmo y el aviso vale.

Va en `/a/clientes` y como aviso en el tablero. **Y el aviso dice en qué se basa**
—«pide gel cada 5 semanas, van 4 y media, últimas 6 compras»— porque un aviso sin
su razón se ignora a la tercera vez.

---

## 6. Las redes y el bot

Esto es lo que Carlos pidió con más ganas y **es también donde están las paredes
que no ponemos nosotros.** Va dicho sin rodeos porque afecta lo que se le puede
prometer al cliente:

| Lo que se quiere | El estado de las cosas | Qué se hace |
|---|---|---|
| Bot que contesta en **WhatsApp** | la API de negocios de Meta **se paga por conversación** y exige verificar el negocio y aprobar las plantillas | se cablea, y **el costo lo paga el cliente a Meta**, no nosotros. Va en la cotización o es una sorpresa fea |
| Bot en **Instagram y Messenger** | se puede, pero pide cuenta de empresa, app de Meta y **revisión de permisos**, que tarda | se pide la revisión el primer día, no el último |
| Bot en **TikTok** | **no hay** vía oficial para contestar mensajes directos | se avisa antes de venderlo. Lo que sí hay es publicar y medir |
| **Publicar** solo en las redes | Instagram y Facebook sí; cada una con sus reglas y sus formatos | calendario y cola propios, y cada red por su adaptador |
| **Qué hora conviene** | sólo se sabe con datos del negocio, no en abstracto | las primeras semanas mide, después recomienda. No se inventan horas |
| Cobrar con tarjeta | los bancos no se replican (§2 del CLAUDE.md) | nuestra capa de cobro; la pasarela es plomería y es reemplazable |

**⚠️ Y una regla de oficio, no de programación:** estos nombres, precios, límites y
permisos **se verifican contra la documentación oficial el día que se cablean**.
Ya nos pasó con GLM: la guía nació desfasada. Esta tabla es una foto de hoy y hay
que volver a medirla, no creerla.

**El bot no es un menú de opciones.** Carlos fue claro: que sepa el inventario,
que conteste algo útil, que pueda vender. Entonces:

- Lee el inventario de verdad: existencias, precio y plazo, no un texto fijo.
- **Nunca inventa precio ni existencias.** Si no sabe, pasa la conversación a una
  persona. Un bot que promete lo que no hay cuesta más que no tener bot.
- Cuando se cierra la venta, **baja el inventario en el mismo lugar** que la
  tienda y el mostrador — no hay un inventario por canal, hay uno.
- **Botón de «lo tomo yo»** siempre a la vista en `/a/conversaciones`. La persona
  gana siempre.

---

## 7. El inventario es uno solo

Es la pieza que puede tirar todo lo demás, así que va dicho aparte: hay **un**
número de existencias por producto, y le pegan cinco puertas —tienda, mostrador,
bot de WhatsApp, bot de Instagram, ajuste a mano—. Dos ventas simultáneas de la
última pieza tienen que dejar a uno de los dos sin vender, no a los dos contentos.

Eso se resuelve en el servidor y **se prueba a propósito** disparando dos ventas
al mismo tiempo. Sin esa prueba, el defecto aparece el día que haya movimiento de
verdad, que es el peor día.

---

## 8. Con qué se construye

- **HTML y módulos, sin paso de armado.** Es lo que sabemos desplegar en
  Cloudflare en un empujón, es lo que mejor abre en el teléfono de Carlos, y no
  nos amarra a una versión de nada. La regla §2 del CLAUDE.md dice que React está
  bien cuando el proyecto lo pide; éste no lo pide todavía, y si lo pide se cambia
  con razón medida, no por costumbre.
- **Supabase** para datos, cuentas y tiempo real. Ya corre Ligas Mazi así: sabemos
  dónde duele.
- **Los bots y las integraciones en un worker aparte**, con su propia
  configuración, como `sala/servidor` y `juegos/servidor`. Mezclarlos con el sitio
  es como se termina publicando el código del servidor.
- **Teléfono primero**, y el mostrador diseñado para **tableta** de verdad, no
  para un teléfono estirado.
- **Códigos QR y de barras:** si hay librería abierta que corra en nuestra
  máquina, se usa y no se construye — es stack propio, no un externo. Carlos ya
  lo autorizó así.

---

## 9. El orden. Lo que se entrega primero y por qué

Cada bloque se entrega **funcionando**, no a medias. Si algo se cae, se cae el
último bloque y no el producto.

| # | Bloque | Por qué va aquí |
|---|---|---|
| **1** | La tabla de rutas, el armazón, el menú lateral y la prueba que recorre todo | es lo que impide el defecto de Ligas Mazi. Va primero o no va |
| **2** | Productos, categorías con campos por plantilla, y el admin para darlos de alta | sin producto no hay nada que ver |
| **3** | **El importador del Excel** | es lo que convierte «hay que capturar mil productos» en una tarde. Sin esto el cliente no arranca |
| **4** | La tienda: portada, categoría, ficha, buscador, carrito | ya hay algo que enseñarle al cliente y que se ve |
| **5** | **El mostrador** | es la caja: es lo que ya le da dinero desde el primer día |
| **6** | Pagar en línea | aquí entra la pasarela y depende de que el cliente abra su cuenta |
| **7** | Ruta del repartidor | tiene sentido cuando ya hay pedidos que repartir |
| **8** | Bandeja única y bot de WhatsApp | el permiso de Meta se pide en el bloque 1 y llega por aquí |
| **9** | Instagram, Messenger, publicaciones y calendario | |
| **10** | Descuentos, campañas, recompra y reportes | se afina con datos de verdad, no antes |

**Lo que se pide el primer día aunque se use en el bloque 8:** la verificación del
negocio en Meta y la cuenta de cobros. Las dos tardan y no dependen de nosotros.
Pedirlas al final es como un proyecto listo se queda un mes esperando un trámite.

---

## 10. Lo que hace falta y no lo pongo yo

1. **Las indicaciones de sus clientes**, que Carlos dijo que iba a pasar.
2. **El final de su mensaje**, que se cortó justo en el flujo de la sesión.
3. **El nombre y la marca** del cliente de barbería. Mientras no estén, aquí no
   se escribe ningún nombre: no presumimos clientes que no son clientes, y esto
   todavía no se ha entregado.
4. **Su lista de productos**, aunque sea un pedazo. Veinte renglones de verdad
   valen más que mil inventados: dicen qué campos hacen falta de verdad.
5. **Quién paga qué** de lo de Meta y de la pasarela. Va en la cotización antes de
   prometerlo.
