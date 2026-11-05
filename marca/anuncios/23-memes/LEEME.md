# Anuncio 23 · Los memes tipo Garry's Mod

Pedido de Carlos el 5 de noviembre: *«tipo meme, de Garry's Mod… que suban y bajen los brazos con un arma
para hablar, que se les suba y baje la cabeza… y que tiren al otro a una fosa en llamas. Haz 3»*.

| | Qué pasa | Dura |
|---|---|---|
| **A · Tu humano se queja** | El humano se queja de 14 horas; el jefe lo levanta con el rayo, lo pasea sobre la fosa y lo suelta. Cae la laptop de Grupo Mazi. «Y no se queja, boludo», y el jefe gira en T. | 42 s |
| **B · El tutorial** | «Cómo despedir a tu humano en tres pasos», con carteles de PASO 1, 2, 3 y el 4: Grupo Mazi. Cierra con «Suscribite… bueno, no. Escribinos». | 46 s |
| **C · La junta** | El humano pide aumento y vacaciones; el jefe voltea la cabeza 180°, se abre una trampa bajo él, cae al fuego y la trampa se cierra sola. La compañera pregunta por su aumento: «¿Vos también?». | 28 s |

## Cómo se arman

```
python3 -m http.server 8765 --bind 127.0.0.1        # en la raíz del repo
python3 marca/anuncios/23-memes/preparar.py          # baja el fuego y los sonidos de Mixkit (una vez)
node herramientas/video/armar.mjs marca/anuncios/23-memes/a-humano/index.html marca/anuncios/salida/23-a-humano.mp4
```

`PREVIA=30` saca un cuadro cada segundo para revisar sin armar todo.

## La voz

Se pidió la de **Brian** (la del anuncio 01 «No somos una agencia más»). Hoy ElevenLabs tiene **0 créditos**,
así que el jefe va con **Piper** (`es_MX-ald-medium`, más grave) como puente. Para pasarla a Brian:
en cada `guion.json` se cambia `"Jefe": "piper:es_MX-ald-medium"` por `"Jefe": "nPczCjzI2devNBz1zQrb"`
(está guardado en `vozBrian`), se borra `voz/hechas.json`, se corre `ELEVENLABS_API_KEY=… node marca/anuncios/voces.mjs <carpeta>` y
`python3 marca/anuncios/23-memes/envolvente.py <carpeta>`, y se vuelve a armar. El plan gratis de ElevenLabs no
permite uso comercial: para publicarlos hace falta el Starter (USD 6 al mes).

## Lo que es de otros

Gente, muebles y pistolas de Kenney (CC0), cielo y pasto de Poly Haven (CC0), fuego y sonidos de Mixkit. Detalle
en `marca/anuncios/modelos/CREDITOS.md`.
