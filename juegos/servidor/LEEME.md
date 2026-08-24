# Las salas de Guerra de Puercos

Lo que hace posible que dos primos jueguen desde dos casas.

## Cómo está armado

| Pieza | Qué hace |
|---|---|
| `worker.js` (en la raíz) | Mira si la ruta es `/api/puercos/…`. Si no, no hace nada |
| `juegos/servidor/sala.js` | Un Durable Object por sala. Ahí vive la partida |
| `juegos/servidor/motor-servidor.js` | Envoltorio de 4 líneas: el mismo `motor.js` del juego, en módulo de ES |

**El servidor manda.** La partida vive en el Durable Object, no en los
teléfonos, y usa **las mismas reglas** que la pantalla — literalmente el mismo
`motor.js`, no una copia. Si tuviera copia propia, tarde o temprano una de las
dos se quedaría atrás y las 61 pruebas del motor valdrían para la mitad.

De eso salen las dos cosas que importan:

1. **No se puede hacer trampa.** El teléfono manda *ids* de cartas, no cartas.
   Los valores se buscan en la mano que tiene el servidor. Un id que no es tuyo
   no aparece y se rechaza.
2. **Nadie ve la mano del otro.** A cada quien se le manda **sólo su vista**:
   sus cartas, y del rival nada más los PV y **cuántas** cartas trae. La mano
   del rival no sale del servidor, así que no está en la página del otro ni
   aunque la abra y la lea.

## Lo que NO tiene, dicho sin adornos

**No hay cuentas ni contraseñas.** Quien sepa el código de 4 letras puede
entrar a esa sala mientras haya lugar — son dos lugares y el tercero rebota.
Para un juego de cartas entre primos está bien, pero es un código de sala, no
una contraseña.

Lo que sí está protegido es la mano de cada quien, que es lo único que
rompería el juego.

Las salas se olvidan solas a la media hora sin que nadie hable.

## Correrlo en local

```bash
npx wrangler dev --port 8803 --local
node juegos/guerra-de-puercos/pruebas-linea.mjs http://127.0.0.1:8803
```

⚠️ **No corras `node build.mjs` a mano con `wrangler dev` arriba.** El build
borra `dist/` entera antes de rearmarla, y wrangler la está sirviendo: se cae
con 500 y parece que rompiste el worker. Wrangler ya corre el build él solo
cuando hace falta. Si necesitas reconstruir, reinicia wrangler.

⚠️ **Que no queden dos wrangler vivos.** El segundo no puede tomar el puerto,
se queda a medias y todas las rutas con archivo devuelven 500 — que se parece
mucho a un worker roto y no lo es. `pkill -f wrangler; pkill -f workerd`.

## Por qué el worker va en el proyecto que ya existía

Un proyecto nuevo de Cloudflare hay que crearlo a mano, y eso lo tendría que
hacer Carlos. Así el juego se publica con el mismo empujón de siempre. Y al
estar en el mismo dominio no hay CORS, o sea que no hay lista de orígenes que
se quede vieja.

**Los archivos van primero.** Cloudflare busca el archivo en `dist/` y sólo si
no existe llega al worker. Eso significa que este worker **no puede tumbar el
sitio**: para la portada, `/avisos/` o `/reportes/` nunca se le pregunta.
