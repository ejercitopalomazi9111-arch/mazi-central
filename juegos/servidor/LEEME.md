# Las salas de Guerra de Puercos

Lo que hace posible que dos primos jueguen desde dos casas.

## ⚠️ Lo que falta para que funcione: crear el proyecto en Cloudflare

Es **un proyecto aparte**, como el servidor de Fadori. Hay que crearlo una
sola vez:

1. En Cloudflare → Workers → conectar este repo.
2. Directorio raíz: `juegos/servidor`.
3. Nombre: `puercos` (queda en `https://puercos.palomazi9111.workers.dev`).

Si le pones otro nombre, se cambia `SERVIDOR_POR_OMISION` en
`juegos/guerra-de-puercos/index.html` y ya. Mientras no exista, el juego
avisa que el modo a distancia no está publicado y **los otros dos modos
siguen funcionando igual**.

## Por qué está separado, y no dentro del sitio

Primero se metió dentro del proyecto del sitio, para ahorrarle a Carlos tener
que crear uno a mano. **Salió caro:** los despliegues de los DOS proyectos
—`mazi-central` y `fadori`— empezaron a fallar al instante y sin registro,
justo en ese commit. Al quitarlo, verde otra vez.

O sea que un juego de cartas podía tumbar el despliegue del tablero, de
Avisos y de Reportes. Eso no se arregla entendiendo la causa exacta: **se
arregla no volviendo a mezclarlos.**

El precio de separarlo es CORS, y se paga en claro: una lista de orígenes en
`wrangler.jsonc`, sin comodines. Un `*` ahí le abriría la puerta a cualquier
página del mundo para abrir salas en nombre de alguien.

## Cómo está armado

| Pieza | Qué hace |
|---|---|
| `index.js` | Reparte códigos, enruta a la sala, revisa el origen |
| `sala.js` | Un Durable Object por sala. Ahí vive la partida |
| `motor-servidor.js` | Envoltorio de 4 líneas: el mismo `motor.js` del juego, en módulo de ES |

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

Son **dos** servidores, porque así queda en producción. Probarlos en el mismo
origen escondería justo lo que puede fallar: CORS y la lista de orígenes.

```bash
# el sitio
python3 -m http.server 8791 --bind 127.0.0.1

# el servidor de salas, desde ESTA carpeta
cd juegos/servidor && npx wrangler dev --port 8815 --local

# las pruebas, con las dos direcciones
node juegos/guerra-de-puercos/pruebas-linea.mjs http://127.0.0.1:8791 http://127.0.0.1:8815
```

⚠️ **Que no queden dos `wrangler` vivos.** El segundo no puede tomar el puerto,
se queda a medias y todo devuelve 500 — que se parece mucho a un worker roto y
no lo es. `pkill -f wrangler; pkill -f workerd`.

⚠️ **No corras `node build.mjs` a mano con un `wrangler dev` sirviendo `dist/`.**
El build borra la carpeta entera antes de rearmarla y se cae con 500.
