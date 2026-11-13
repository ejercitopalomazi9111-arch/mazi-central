# El centro de operaciones · Urban Pest

La app de control del dueño (BRIEF §C). La pantalla y sus rutas las hizo Sylcred el 12 de
noviembre; el 13 Godines le puso **que funcione sin internet**, **datos de muestra** para probarla
de pie y **las dos compuertas** de la skill `app-de-campo`.

## Probarlo ahora, sin servidor

Abre `urban-pest/centro/?muestra`. Todo funciona de verdad (marcar hecho, cobrar, sacar insumo,
registrar revisión) sobre datos que dicen «de muestra». Nada sale del teléfono y nada es del
cliente: lo que sólo él sabe va como **FALTA** (registro de cada producto, placas).

## Cómo funciona sin internet

| Pieza | Qué hace |
|---|---|
| `sin-red.js` | Guarda en el teléfono lo que llega con señal (la réplica). Sin señal contesta desde ahí, aplica lo que el dueño hace y lo apunta en una cola que se manda en orden al volver |
| `motor.js` | **Copia exacta** de `servidor/src/centro.js`: sin señal rigen las mismas reglas (seguimiento a 15 días, garantía a $0, el inventario no queda en negativo). No se edita: se vuelve a copiar |
| `sw.js` | Guarda la página, el estilo y los íconos para que abra sin señal. Un cambio publicado se ve en la segunda apertura |
| `muestra.js` | Los datos de `?muestra` |

Arriba de la pantalla sale una franja sólo cuando hay algo que decir: «Sin internet. Ves lo
guardado el…», «2 cambios por enviar», o «No entró: … (y por qué)». Lo que el servidor rechaza al
volver la señal **nunca se pierde callado**.

## Las compuertas (las dos se vieron rojas rompiendo el código a propósito)

```
node urban-pest/centro/pruebas.mjs            # el motor sin red: 32 comprobaciones
node urban-pest/centro/pruebas-pantalla.mjs   # la pantalla con Playwright, y sin internet de verdad: 17
```

Si `pruebas.mjs` dice que `motor.js` ya no es copia exacta, es que cambiaron las reglas del
servidor: `cp urban-pest/servidor/src/centro.js urban-pest/centro/motor.js` y volver a correr.

## Lo que falta, dicho derecho

1. **Un cambio puede llegar dos veces** si la señal se cae justo después de mandarlo y antes de
   recibir la respuesta. La ventana es chica, pero en inventario duplica una salida. Cada cambio
   ya viaja con un `idem` único; falta que el servidor lo use (guardar `idem:<id>` unos días y
   contestar lo mismo si se repite). Es del servidor, de Sylcred.
2. **«Hoy» en el servidor es el día de Londres, no el de Querétaro.** `index.js` llama
   `tablero(A)`, `numeros(A)`, `estadoCita(A, b, quien)` y `listarVehiculos(A)` sin pasar la
   fecha, y el valor por omisión es `new Date().toISOString()` (UTC). Desde las 6 de la tarde el
   tablero con señal ya enseña los servicios de mañana como «de hoy» y los de hoy como atrasados.
   Sin señal este centro usa la fecha del teléfono, que es la correcta. También es del servidor.
3. **Los números del mes y lo que hizo el bot** no se pueden recalcular sin señal: se enseña lo
   último que se bajó.
4. **Chat central, cotización a mano y carpeta** son otras páginas: todavía necesitan internet.
5. **FALTA del cliente:** el registro de cada producto, las placas y los mínimos reales de su
   inventario.
