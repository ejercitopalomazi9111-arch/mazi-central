# Bungee · SIL Open Font License 1.1

Diseñada por David Jonathan Ross (djr.com). Licencia **OFL 1.1**, que permite
empotrarla en un documento — que es exactamente lo que hacemos aquí.

Los dos archivos son los subconjuntos **latin** y **latin-ext** que sirve Google
Fonts (v17), bajados el 9 de septiembre de 2026. Pesan 14.3 KB y 10.7 KB.

## Por qué están aquí y no se piden por `<link>`

Porque una tipografía pedida a un servidor ajeno **no es una decisión de diseño,
es una apuesta**: si el visitante tiene la red lenta, Google bloqueado, o
simplemente mientras baja el archivo, el titular se pinta con la letra de
repuesto. Y la letra de repuesto no se parece: el logo del cliente se ve de
Star Wars y el titular de al lado se ve de plantilla.

Se midió: en un navegador sin salida a internet, `--display` caía hasta
`system-ui` porque `Arial Black` tampoco existe ahí.

Empotrada pesa 25 KB y **no puede fallar**.
