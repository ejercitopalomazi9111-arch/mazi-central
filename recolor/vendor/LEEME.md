# Lo que vive aquí

| Archivo | Qué es | De dónde | Licencia |
|---|---|---|---|
| `selfie_multiclass_256x256.tflite` | Modelo «selfie multiclass» de MediaPipe: dice por pixel si es fondo, cabello, piel del cuerpo, piel de la cara, ropa u otra cosa | `storage.googleapis.com/mediapipe-models/image_segmenter/selfie_multiclass_256x256/float32/latest/` (bajado el 1 de octubre de 2026) | Apache 2.0 — lo dice su ficha oficial (*Model Card Multiclass Segmentation*, 10 de mayo de 2023). Texto en `LICENCIA-apache-2.0.txt` |

El motor que lo corre (`vision_bundle.mjs` y el `.wasm`) no se copia: es el mismo
que usa el quitafondos, en `../../presentaciones/vendor/mediapipe/`.
Corre dentro del teléfono; la foto no sale a ningún lado (regla §2: conectar
sí, depender no — aquí ni siquiera se conecta).
