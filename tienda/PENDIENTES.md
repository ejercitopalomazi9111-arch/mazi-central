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
- **El tablero en vivo** necesita que la tabla `pedidos` esté en la publicación de tiempo
  real de Supabase (se activa en el panel: Database → Publications). Sin eso el tablero
  funciona igual, pero se refresca cada 30 segundos en lugar de al instante; lo dice
  arriba («Cada 30 s» o «En vivo»).

