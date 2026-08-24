# El cartel de Fadori

`cartel-fadori.png` · **2480 × 3508** = A4 vertical a 300 dpi.
Se imprime para pegarlo en la cafetería y se manda por WhatsApp tal cual.

```bash
node armar.mjs     # → cartel-fadori.png
node probar.mjs    # lee los QR del PNG final con un decodificador de verdad
```

## Qué lleva

La marca, el lema, y los **dos códigos**: uno abre la app y otro lleva a la
página que enseña cómo dejarla en la pantalla de inicio (iPhone y Android por
separado). Abajo va la dirección escrita, por si alguien no trae cámara.

## Todo es de la casa

Sin Canva, sin plantillas de nadie, sin generadores de QR en línea. Los códigos
salen de `../qr/armar.mjs`, que corre en nuestra máquina; el logo es
`../marca/logo-fadori.png`; el papel, el naranja y las tarjetas son el sistema
visual de la app; y el render lo hace nuestro propio navegador.

## Dos cosas que se aprendieron encuadrando el logo

1. **El logo no se toca — se encuadra.** Su letra es café, hecha para fondo
   claro, así que sobre el naranja no se lee. Por eso va sobre tarjeta crema,
   que además es cómo funciona la app: papel flotando sobre el color de la casa.
   Recolorearlo o redibujarlo no es opción; una marca que cambia no es marca.

2. **Cuidado al medir dónde está el dibujo dentro del archivo.** El PNG trae
   ~32 000 píxeles con alfa = 1 — invisibles a la vista pero contados por
   cualquier «caja del dibujo». Medido así parecía ocupar 1032 × 934 cuando de
   verdad ocupa **797 × 579**, y con esa medida mala la tarjeta salía con un
   hueco enorme abajo. Hay que medir con umbral (alfa > 8).

## Por qué existe `probar.mjs`

Un QR puede verse perfecto y no escanear: quedó chico, sin margen o con poco
contraste. Eso no se ve mirando el cartel. Así que se lee el PNG **final** con
`zbarimg` —el mismo trabajo que hace la cámara del alumno— y se comprueba que
cada código lleva a donde dice, que no son el mismo pegado dos veces, y que
mide más de 3 cm impreso.

Y las dos direcciones se probaron en vivo: responden 200. Un cartel que manda a
doscientos alumnos a un 404 es peor que no tener cartel.
