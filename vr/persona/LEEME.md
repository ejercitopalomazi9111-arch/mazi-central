# La persona simulada de Mazi VR

Carlos (26 nov): *«créate un entorno 3D donde cargues un personaje que esté probando las gafas… le he dado a 5 o 6
personas a probar esto y ni una ha podido utilizarla correctamente»*.

## Qué es

Una persona con el visor puesto, hecha de código, que usa Mazi VR **por el mismo camino que una persona de verdad**:

- **La cabeza** gira hacia lo que quiere ver (como el giroscopio).
- **Las manos** no se fingen como resultado: se fingen las **21 marcas que daría MediaPipe** si una mano real estuviera
  ahí (`manos-falsas.js`), y entran por la cámara de siempre (`vr/manos.js`): filtros, estabilizador, gestos, rayo,
  mano 3D y elegir. Lo que le falla a ella le falla igual a una persona.
- **Se comporta como persona**: apunta, mira si el botón brilla, corrige el dedo si brilla otro, pellizca con la muñeca
  quieta, lleva la herramienta encima de la maceta, deja la palma quieta para que se pose una mariposa.

## Cómo se corre

```bash
node vr/persona/recorridos.mjs todo        # o: inicio · fisica · monarca · maceta · mariposas
```

Deja una foto de cada paso en `$FOTOS` (de fábrica `/tmp/claude-0/persona`) y al final dice **qué no le salió**.

## Lo que encontró la primera noche (26 nov) y ya se arregló

| Lo que le pasaba a la gente | Por qué | Dónde |
|---|---|---|
| «Está cabrón seleccionar un botón» | después de pellizcar, al volver a apuntar con el pulgar recogido, el pellizco **no se soltaba**: el rayo se quedaba congelado en el botón anterior | `manos.js` (soltar) |
| «Apuntas con el centro de tu palma» | el rayo salía de otra punta que la que se ve | `manos.js` (`punta3d`) |
| Clics que nadie hizo | al soltar el pellizco la mano pasa por «puño» y eso era clic de agarre; y en 2D una mano abierta al frente se leía «puño» | `manos.js`, `gestos.js` |
| La mano 3D chiquita y lejos | la distancia salía de lo largo que se ve la palma; al apuntar al frente se ve corta | `manos.js` (distancia en 3D) |
| «Me saca a cada rato» | la palma abierta quieta era «Atrás» | `manos.js` (apagado) |
| La maceta «no sirve» | sus cajas para elegir estaban **detrás y arriba** de ti; y todo estaba en el piso, fuera de la vista de la cámara | `monarca/maceta.js` |
| Las mariposas no se dejan | huían de cualquier mano a 35 cm | `monarca/ecosistema.js` |

## Lo que NO prueba

- La cámara de verdad de un teléfono (luz, fondo, manos que se tapan): MediaPipe aquí recibe marcas perfectas.
- El tacto del visor de cartón, el mareo, el calor del teléfono.
- Safari del iPhone (aquí sólo hay Chromium).

Por eso sigue haciendo falta que una persona lo pruebe; la persona simulada sirve para que **lo que llegue a sus manos ya
funcione**.
