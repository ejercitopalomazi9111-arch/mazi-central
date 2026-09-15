# J5 Data · dos propuestas de rediseño

Estos archivos son **material de paso**: se generan aquí y se publican en
`BigTigerMX/j5data`, que es el repo del cliente. El enlace que se entrega
sale de ahí, nunca de este repo.

    propuesta-a/   «Sala»     — oscura, sala de control, WebGL con tejido
                                spine-leaf y un switch de 48 puertos girable
    propuesta-b/   «Espectro» — clara, editorial, WebGL con un haz de 14
                                fibras y la maqueta isométrica de una sala
    fuentes/       las tipografías, auto-hospedadas (Archivo, IBM Plex Sans,
                   Fraunces, Public Sans, JetBrains Mono · sólo el latino)
    vendor/        three.js r128 (UMD), compartido por las dos

Las dos leen las fotos de `../assets/img/` y enlazan `../casos.html`, que ya
existen en el repo del cliente. No se toca nada de lo que ya está publicado:
cada propuesta cuelga de su propia subcarpeta.

Comprobado en Chromium a 390 / 768 / 1440 px: sin desbordamiento horizontal,
un solo `<h1>`, cero errores de consola, cero peticiones fallidas, las cuatro
fotos cargan y las dos escenas WebGL pintan.
