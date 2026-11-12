# Efectos de sonido para los videos

Carlos pasó este flujo el 12 de noviembre en La Sala («¡Aquí tienes los efectos de sonido!»):
**Openverse** para encontrar grabaciones con licencia, **Earshot** para compararlas y medirlas,
y **Real SFX** (de Clipwing) para ponerlas en la línea de tiempo. Aquí queda **adaptado a lo que
ya tenemos**, para que el siguiente video lo use sin volver a leer el documento original.

## Lo que se comprobó desde aquí (12 nov)

| Pieza | ¿Se alcanza? | Qué hacemos |
|---|---|---|
| API de audio de Openverse (`api.openverse.org/v1/audio/`) | ✅ contesta **sin cuenta** (`?q=mouse click&license=cc0` dio 240 resultados, todos con su licencia) | Se usa para buscar. Primero CC0; CC BY sólo con el crédito puesto |
| Los archivos (`cdn.freesound.org/previews/…`) | ✅ | Se bajan a `herramientas/video/efectos/` con su ficha en `CREDITOS` |
| Earshot (`github.com/Leonxlnx/earshot`) | ❌ 403 desde este contenedor | Pendiente. No se instala nada de un tercero sin leerlo primero (`ecosistema/SEGURIDAD.md`) |
| Real SFX (`clipwing.pro/skills/real-sfx`) | ✅ la página abre | No hace falta para nuestros videos: los hacemos con código y ya sabemos el milisegundo de cada evento |

## La ventaja que tenemos: los «cues» salen solos

El documento pide sacar a mano la lista de momentos (cuándo entra una imagen, cuándo algo se
mueve, cuándo llega). **Nosotros no la adivinamos:** los anuncios y comerciales se arman por
escenas en código (`herramientas/video/`, `marca/anuncios/`), así que cada escena sabe en qué
milisegundo pasa cada cosa. La lista de cues es esa misma línea de tiempo.

## Qué sonido para qué

- **Aparece algo** → un *pop* breve.
- **Un toque en la interfaz** → un *clic* discreto.
- **Algo se desliza** → un *whoosh* corto, con el pico en la llegada.
- **Algo llega con peso** → un *impacto* suave.
- Lo decorativo que ya se entiende **no lleva sonido**, y dos acciones muy juntas se agrupan si
  pelearían con la voz.

## Cómo se mezcla

1. **La voz al frente** (Chris, la de la casa). Si un efecto tapa una palabra, se baja ese efecto,
   no se sube toda la voz.
2. **La música por debajo**, y se agacha mientras se habla, con entradas y salidas suaves.
3. **Los efectos**: los importantes se oyen; los clics secundarios, discretos.
4. **Volumen final para reels: −14 LUFS integrados y pico real máximo de −1 dBTP**, medido otra
   vez DESPUÉS de codificar el MP4. Que se entienda en mono y en la bocina del teléfono.

## Qué se entrega

- El MP4 con la mezcla final.
- Un WAV sólo con los efectos, desde 00:00 y del largo exacto del video.
- La hoja de cues (JSON o CSV): tiempo, archivo, volumen y de dónde salió.
- Los créditos y licencias de cada sonido.
- Un reporte corto: LUFS y pico medidos, y qué momentos necesitan que una persona los escuche.
