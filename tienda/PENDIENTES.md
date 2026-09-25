# Lo que sólo Carlos puede dar

Carlos pidió (24 de septiembre): *«continúa con la app y no me esperes para nada; si hay algo que
me necesite, espera a que yo me reporte y pregunte qué onda»*. Esta es esa lista. Cada renglón dice
qué hace la app **mientras tanto**, para que nada se detenga por él.

| Qué falta | Para qué | Mientras tanto |
|---|---|---|
| **Nombre y marca del cliente** (logo, color) | la presentación, el menú, los tickets | «Surtido» provisional, color vino. Se cambia en Ajustes sin tocar código |
| **Catálogo real del cliente** (Excel, PDF o fotos) | reemplazar la muestra | 552 productos reales de Odara, con franja que dice que son muestra |
| **Llave de un modelo de IA** en los secretos de Supabase del proyecto `tienda` | el bot, el importador que acomoda solo, los consejos | reglas que ya funcionan sin modelo. Las llaves de Gemini y Groq que puso en Cloudflare **no alcanzan aquí**: son otra caja |
| **Número para el bot de WhatsApp** y dónde correrlo | que el bot conteste por WhatsApp | el simulador dentro de la app |
| **Cuenta de pasarela de pago** (Mercado Pago u otra) | cobrar con tarjeta desde la app | pago al recibir y transferencia |
| **Dónde hospedar el optimizador de rutas** (VROOM + OSRM) | rutas óptimas con calles reales | optimizador dentro del navegador, suficiente para ~30 paradas |
| **Permiso de Gobernación** para sorteos, y fecha del aviso a PROFECO | activar el sorteo del mes | el sorteo existe y la base **no deja** activarlo sin permiso |

## Preguntas que surgieron construyendo

_(se agregan aquí conforme salgan; ninguna detiene el trabajo)_

- **La migración 0009 está escrita y SIN aplicar.** Guardaría en el servidor el historial de
  importaciones y el archivo original. Al aplicarla se quedó esperando un permiso que nadie
  puede dar desde el teléfono. **La app no depende de ella:** el importador guarda con lo
  que ya está permitido, en tandas que entran completas o no entran, y deshace igual. Lo
  único que se pierde sin ella: el historial de importaciones vive en el teléfono donde se
  importó, no en todos.

- **La migración 0010 (envío dentro del total) está escrita y sin aplicar**, por lo mismo.
  Mientras, el envío va anotado en el pedido y la app lo suma al cobrar (`totalConEnvio`).
  Lo único que no cuadra sin ella: el cobro que registra el repartidor guarda el total sin
  el envío, así que el corte de caja del repartidor sale corto por lo que costó el envío.

- **Los avisos de «te toca surtirte» se calculan en el teléfono, no en el servidor.** La tabla
  `avisos_recompra` existe desde 0001 pero nadie la llena: una función que la llenara sola
  pide otra migración, y las migraciones se quedan esperando permiso. El cálculo
  (`nucleo/recompra.js`, 46 pruebas) es el mismo en los dos lados y cada aviso dice en qué se
  basa. Lo único que se pierde: nadie le avisa al cliente con la app cerrada.

- **Notificaciones con la app cerrada (Web Push)** necesitan un par de llaves VAPID como
  secreto de Supabase y una función que mande. Hasta entonces, el aviso de recompra sale en
  la portada del cliente, en «Mi cuenta», en el tablero del dueño y en Clientes, con el
  WhatsApp ya escrito para que el dueño lo mande él. En iPhone, además, hay que instalar la
  app en la pantalla de inicio (iOS 16.4 o más nuevo).

- **La cuenta del cliente vive en su teléfono.** No tiene contraseña: nace con el primer
  pedido. Si cambia de teléfono, empieza una cuenta nueva (la tienda sí conserva sus
  pedidos). Para reconocerlo por su WhatsApp hace falta mandar un código por SMS o WhatsApp,
  y eso pide un proveedor de mensajes. «Mi cuenta» lo dice tal cual.

- **La migración 0011 (devoluciones) está escrita y sin aplicar.** Hoy las devoluciones ya
  funcionan, pero **sólo desde la cuenta del admin**: regresa las piezas al inventario con una
  nota que lleva el reembolso, y el corte de caja lo lee de ahí y lo descuenta. Con 0011: la
  cajera también puede devolver, el servidor pone el precio, y dos devoluciones del mismo ticket
  al mismo tiempo no pueden pasar de lo vendido.

- **El bot ya piensa, pero todavía no habla por WhatsApp.** El cerebro (precios, existencias,
  envío, pedido, pasar a persona) está hecho y probado, y se prueba desde Conversaciones. Para
  conectarlo falta un **número dedicado** y **dónde correr el transporte** (un servicio chico que
  siempre esté prendido). Mientras tanto, lo que más le ayuda es llenar en Ajustes el horario, la
  dirección, el envío y las formas de pago: cada dato que falta es una pregunta que el bot le pasa
  a una persona.

- *(Nota técnica, no es para Carlos)* **Prueba intermitente:** `pruebas-rutas.mjs` falló 1 de 7
  corridas en `/a/repartidores` (el mapa) el 24 de septiembre; las otras 6 salieron 93/93. El
  motivo se imprime en el renglón SIGUIENTE al ✗; la vez que falló se filtró con `grep` y se
  perdió. La próxima: `grep -A1 "✗"`.

- **La migración 0012 (apartados con abonos) está escrita y sin aplicar.** Las tablas ya
  existen, pero nadie puede escribir en ellas hasta que se apliquen las funciones. Por eso
  «Apartados» sigue marcado «en obra» en el menú: una pantalla que no puede guardar sería
  mentir. En cuanto 0012 esté puesta, la pantalla es corta de hacer.

- **La migración 0013 (cliente en la venta de mostrador) está escrita y sin aplicar.** Ya
  funciona sin ella: la caja pone la venta a nombre de un cliente que ya existe, y esa compra
  cuenta para «le toca surtirse» y para el sorteo. Lo que falta es **dar de alta a alguien
  nuevo desde la caja**: hoy la app dice «todavía no está encendido» y que haga su cuenta en la
  tienda. 0013 también impide que una venta quede a nombre de un cliente de otro negocio.
- **La ficha del mostrador y la cuenta de la tienda no se juntan solas.** Si a Pedro lo dan de
  alta en la caja y luego abre su cuenta en la tienda, quedan dos fichas. Juntarlas por el
  número sería fácil, pero le enseñaría las compras de Pedro a cualquiera que escriba su
  número: antes hay que verificar el número con un código por WhatsApp.

- **Las cotizaciones viven en el teléfono donde se hicieron.** Si la hace el dueño en su
  celular, la caja no la ve. Para compartirlas entre teléfonos hace falta una tabla en la
  base (una migración más); mientras, se manda por WhatsApp y ahí queda también.

- **Opiniones con estrellas y preguntas públicas (como Amazon y Mercado Libre).** Hacen falta
  dos tablas en la base (otra migración) y alguien que modere: una opinión falsa o un insulto
  publicado es peor que no tener opiniones. Mientras, la ficha tiene «Pregúntanos por WhatsApp».
- **Favoritos, vistos y búsquedas viven en el teléfono del cliente.** Si cambia de teléfono no
  los lleva. Para que viajen con su cuenta hace falta guardarlos en la base (otra migración).

- **Las ofertas vencidas regresan su precio cuando el admin abre la app** (el tablero o
  Descuentos), no a la hora exacta. Para que pase a la hora exacta hace falta una tarea
  programada en el servidor.

- **Cupones** («con el código BUENFIN te hago 10 %») necesitan que el servidor aplique el
  descuento al cobrar. Las ofertas de hoy cambian el precio de todos; un cupón es para uno.

- **El segundo giro (mercancía variada) está listo como configuración**, en
  `tienda/datos/giros/variada.json`: categorías (ropa, termos, tazas, gorras, regalos) con sus
  campos, marca provisional y cómo le dicen los clientes a las cosas. Ya se probó la tienda
  completa con esa configuración y el código no cambió ni una línea. **Para que exista en la
  base** alguien con acceso al panel de Supabase corre `select sembrar_negocio('<el JSON>')`
  en el editor SQL; después se abre con `?negocio=variada` y el catálogo entra por el importador.

- **La app ya se instala y el mostrador vende sin internet.** Las ventas hechas sin red se
  guardan en el teléfono con folio provisional («L1», «L2»…) y se suben solas al volver la red.
  Dos cosas que conviene saber: la venta sin red cobra con los precios que el teléfono tenía, y
  si mientras tanto alguien compró en línea la última pieza, esa venta queda marcada en Caja
  para resolverla a mano (no se pierde). Sin red **no** se puede cerrar caja, ni hacer pedidos
  en línea, ni cobrar entregas: eso necesita al servidor.

- **El GPS del repartidor funciona con la app ABIERTA.** Probado de punta a punta el 25 de
  septiembre (`nucleo/pruebas-gps.mjs`): el punto llega a la pantalla del dueño con su
  velocidad, un hueco de señal ya no apaga el rastreo, la ruta sale ordenada y el cliente ve en
  cuánto llega. **El límite que hay que decir con todas sus letras:** una app web no puede mandar
  la ubicación con el teléfono bloqueado o mientras el repartidor está dentro de Google Maps;
  el iPhone y Android pausan la página. Mientras tanto el dueño ve el último punto con «hace
  cuánto» y un aviso de «Sin señal reciente» a los 5 minutos, y en cuanto el repartidor regresa
  a la app se manda solo. **Para rastreo con la pantalla apagada** hace falta envolver la app como
  app nativa (Capacitor con un complemento de ubicación en segundo plano) y publicarla en las
  tiendas: es trabajo aparte, con cuenta de Apple (99 dólares al año) y de Google (25 una vez).
- **La ruta optimizada no sabe de horarios ni de capacidad todavía.** Ordena por distancia (lo
  que recorre menos). Si un cliente pidió «mañana» o «en la tarde», eso se ve en la nota del
  pedido pero la ruta no lo acomoda sola; se asigna al repartidor el día que toca.
