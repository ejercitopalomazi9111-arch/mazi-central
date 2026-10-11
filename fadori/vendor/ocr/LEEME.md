# Lector de texto (OCR) · vendorizado

Para revisar que el nombre de la credencial sea el de la cuenta, en el propio
teléfono (nada sale del aparato).

| Archivo | De dónde | Licencia |
|---|---|---|
| `tesseract.min.js`, `worker.min.js` | tesseract.js 7.0.0 (npm) | Apache 2.0 |
| `tesseract-core-relaxedsimd-lstm.wasm.js`, `tesseract-core-simd-lstm.wasm.js`, `tesseract-core-lstm.wasm.js` | tesseract.js-core 7.0.0 (npm) | Apache 2.0 |
| `spa.traineddata.gz` | @tesseract.js-data/spa 1.0.0, `4.0.0_best_int` (modelo de Tesseract en español) | Apache 2.0 |

El teléfono escoge sola la versión más rápida que aguante (relaxed SIMD, SIMD o la normal).
