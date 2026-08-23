# La presentación del proyecto STEAM

`Fadori-STEAM.pptx` · 20 diapositivas · Bachillerato Rembrandt.

## Cómo se rehace

```bash
npm install          # una vez
node armar.mjs       # → Fadori-STEAM.pptx
```

Las capturas (`01`–`08`) salen de la app de verdad, no son maquetas. Si la app cambia, se
vuelven a sacar y se corre `armar.mjs` otra vez.

## La regla que manda

**Máximo 15 palabras por diapositiva**, contando el título. Está en la rúbrica, y al final de
`armar.mjs` hay un contador que las cuenta y avisa cuál se pasa. **Ya cazó dos.** Si no se
cuentan solas, se pasan solas.

## Qué cubre, contra la rúbrica

| Lo que pide la rúbrica | Dónde está |
|---|---|
| Integrantes en la primera página | 1 · ⚠️ **faltan los nombres** |
| Índice | 2 |
| Proyecto-problema, nombre y descripción | 3, 4 |
| Justificar en base a la problemática | 5 |
| Misión · Visión | 8 · 9 |
| Propósito general · específico | 10 · 11 |
| Enfoque (cualitativo / cuantitativo / deductivo) | 12 |
| Imágenes y su relación con cada apartado de STEAM | 13 a 17, una por letra |
| ¿Qué? ¿Por qué? ¿Cómo? ¿Para qué? | 4 · 5 · 6 · 7 |
| Estado actual | 18 |
| Ortografía | revisada, con acentos |

## `vista.mjs`

LibreOffice no corre en el contenedor donde se construyó esto (falla hasta con un `.txt`), así
que `vista.mjs` desempaca el `.pptx` **ya generado** y lo dibuja en HTML para poder revisarlo.
No es una maqueta de la intención: sale de las coordenadas que de verdad quedaron en el archivo.
Con LibreOffice a la mano, mejor eso.
