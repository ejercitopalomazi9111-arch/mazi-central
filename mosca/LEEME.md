# Tres moscas · cerebro real

Proyecto personal de Carlos (8 de octubre de 2026), por diversión. Tres moscas de la fruta en una arena 3D.
Cada una tiene **el cerebro completo de una mosca real**, neurona por neurona, y reacciona a lo que le pongas:
depredadores, comida, olores, calor, viento, ruido, imágenes y videos.

## Qué es de verdad

| Pieza | De dónde sale |
|---|---|
| Las 138,639 neuronas y sus 15,091,983 conexiones | **FlyWire v783**, el mapa completo del cerebro de una mosca hembra (Dorkenwald et al. 2024, *Nature*; CC-BY 4.0) |
| Qué tipo es cada neurona | Schlegel et al. 2024 (*Nature*), `flyconnectome/flywire_annotations` |
| Cómo se comporta cada neurona | El modelo «integra y dispara» de Shiu et al. 2024 (*Nature*): las mismas constantes de membrana, sinapsis, retraso y periodo refractario |
| El cuerpo, sus 67 piezas y la postura de pie | **flybody** (Vaxenburg et al. 2025, *Nature*; Apache 2.0), el modelo 3D de Janelia y DeepMind |
| Araña | «Low poly spider» de cptx032, OpenGameArt (CC-BY 3.0) |
| Pájaro y gato | Kenney, *Cube Pets* (CC0) |

Lo que sí sale del cableado, sin que nadie se lo enseñara:

- **El azúcar en la trompa enciende MN9**, la neurona que la saca para comer, y **lo amargo la frena**.
  Es el resultado central de Shiu et al. y aquí se repite (`pruebas-cerebro.mjs`).
- **Una sombra que crece en el ojo enciende la fibra gigante** (DNp01) y las moscas despegan en
  100-300 ms. Es el reflejo de escape que se estudia en el laboratorio con un disco negro que crece.

## Qué es nuestro (y por qué)

No se esconde nada: todo lo que no viene del conectoma está aquí y en el código.

1. **Cómo se traduce el mundo a sentidos.** Qué tanto crece algo en el ojo → qué tan fuerte disparan LC4
   y LPLC2; cuánto olor llega a cada antena → los receptores de ese glomérulo; las patas en la gota →
   las neuronas del gusto. Está en `mundo.js`, función `sentir`.
2. **Qué neuronas se leen como cada conducta.** Escape = fibra gigante y sus vecinas de despegue; reversa
   = MDN; adelante = P9 (DNp09); giro = DNa01/DNa02; acicalarse = DNg12; comer = MN9; alas = DNg02.
   Está en `herramientas/preparar.py`.
3. **El paseo de fondo.** El modelo no tiene actividad propia: sin estímulos, el cerebro está en silencio.
   Para que las moscas no se queden congeladas, caminan al azar. Se marca como «explorando (no sale del
   conectoma)».
4. **La física.** El vuelo de escape y la caminata son animación, no simulación de músculos.
5. **Tres arreglos al modelo**, porque con los datos v783 el cerebro se «encendía» entero con cualquier olor
   (en el modelo original igual: ellos no probaron olores):
   - el neurotransmisor (si una neurona excita o inhibe) se decide **por tipo de célula**, con el de la
     literatura cuando existe; los moduladores (dopamina, serotonina, octopamina) no dan corriente rápida;
   - las interneuronas locales **excitadoras** del lóbulo antenal no tienen salida química (en la mosca
     actúan sobre todo por uniones eléctricas, que este modelo no tiene), y no hay excitación entre
     neuronas del mismo tipo;
   - un **cansancio** lento: cada spike sube el umbral 0.05 mV y se va en un segundo.
   Con eso, ningún sentido deja al cerebro encendido para siempre (`pruebas-cerebro.mjs`).
6. **El paso de tiempo**: 0.5 ms en vez de 0.1 (las ecuaciones se integran exactas entre pasos), y una
   neurona con menos de 0.3 mV de voltaje se da por quieta. Es lo que deja correr tres cerebros a la vez.

## Cómo corre

- `trabajador.js` corre los cerebros en segundo plano. Si la página está «aislada» (cabeceras COOP/COEP,
  puestas en `_headers`), cada mosca va en su propio núcleo y los tres leen el **mismo** conectoma en
  memoria compartida. Si no, los tres van en un solo trabajador, uno tras otro.
- El mundo va **al paso del cerebro**: si el cerebro no alcanza el tiempo real, todo va en cámara lenta, y
  arriba dice a qué velocidad.
- La primera vez se bajan 31 MB (el conectoma comprimido).

## Para rehacer los datos

```
python3 -P mosca/herramientas/preparar.py <Drosophila_brain_model> <Supplemental_file1_neuron_annotations.tsv> mosca/datos
python3 -P mosca/herramientas/cuerpo.py <flybody/fruitfly/assets> mosca/modelo
node mosca/pruebas-cerebro.mjs
node mosca/pruebas-pantalla.mjs        # necesita el sitio armado (node build.mjs)
```
