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
