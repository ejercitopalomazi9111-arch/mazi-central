# Geraldmed · 4 anuncios (4 de noviembre)

Pedido de Carlos: *«4 videos publicitarios para GERALDMED, somos paramédicos y tenemos el servicio de
cubrir eventos con pie tierra, ambulancia de urgencias básicas, etc. Todos nuestros elementos son
seleccionados con especial cuidado para el éxito de su evento… usa imágenes de la web si es necesario
pero no muestres otros logos.»*

| Anuncio | De qué va | Música |
|---|---|---|
| `18-geraldmed-tu-evento` | El general: pie tierra, ambulancia y elementos elegidos | «Inspired» |
| `19-geraldmed-pie-tierra` | El personal a pie entre la gente | «Rising Game» |
| `20-geraldmed-ambulancia` | La ambulancia de urgencias básicas en el evento | «Heroic Age» |
| `21-geraldmed-elegidos` | El equipo, elegido con cuidado | «Lasting Hope» |

- **Sólo dice lo que Carlos dijo.** Nada de certificaciones, horarios ni tiempos de llegada inventados.
- **Teléfonos:** 442 394 2306 y 427 108 0226, leídos de la espalda de su playera. Si cambian, se
  cambian en `escena.js` (`CEL`).
- **Voz:** Piper (`es_MX-claude-high`); Chris no tenía saldo. Con saldo se cambia `voces` en cada
  `guion.json` y se corre `node marca/anuncios/voces.mjs <carpeta>`.
- **Logos ajenos:** borrados en `preparar.py` (patrocinadores del torneo, letrero del club, la gorra, el
  coche del fondo). Las fotos de la web se escogieron sin marcas a la vista.

## Créditos (van en la descripción de cada post)

> Música: Kevin MacLeod (incompetech.com), CC BY 4.0 — «Inspired», «Rising Game», «Heroic Age», «Lasting Hope».
> Fotos de apoyo: Unsplash (licencia Unsplash), lista en `web/FUENTES.txt`.

## Armar

```
python3 marca/anuncios/geraldmed/preparar.py <carpeta con las fotos originales>
node marca/anuncios/voces.mjs marca/anuncios/geraldmed/<anuncio>
node herramientas/video/armar.mjs marca/anuncios/geraldmed/<anuncio>/index.html marca/anuncios/salida/<anuncio>.mp4
```
