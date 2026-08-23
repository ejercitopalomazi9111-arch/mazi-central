#!/usr/bin/env python3
"""Recorta las capturas a lo que se tiene que ver desde la última banca.

Las capturas salen de la app completa: traen barra de navegación, pestañas,
notas al pie y párrafos de ayuda en letra de 8 píxeles. Metidas enteras en una
lámina, la parte que importa queda del tamaño de una uña y todo lo demás es una
mancha gris. En pantalla de computadora se ve bien; proyectada, no se lee nada.

Así que cada una se recorta a UNA cosa: el pedido, el turno, las cifras, el
logo. Los recortes son porcentajes de la imagen, no píxeles, para que si
mañana se vuelven a sacar las capturas en otro teléfono siga cuadrando.

    python3 recortar.py    →  recortes/*.png
"""
import os
from PIL import Image

# archivo: (izquierda, arriba, derecha, abajo) en fracción de la imagen · qué queda
RECORTES = {
    '05-mostrador.png':      ((.09, .195, .91, .62), 'el pedido de Beto, con sus dos platillos y el botón'),
    '06-medidor.png':        ((.00, .01, .99, .385), 'las ocho cifras del día, que es la medición'),
    '01-cortinilla.png':     ((.06, .30, .94, .70), 'la hamburguesa y el logotipo, que es de lo que habla la lámina'),
    '03-mi-turno.png':       ((.03, .07, .97, .545), 'el número de turno grande'),
    '02-menu.png':           ((.03, .07, .97, .765), 'la pregunta y el plato del día'),
    '04-pantalla-turnos.png':((.00, .00, 1.0, 1.0), 'ya se lee entera: números enormes sobre negro'),
}

os.makedirs('recortes', exist_ok=True)
for arch, (caja, porque) in RECORTES.items():
    im = Image.open(arch)
    w, h = im.size
    x0, y0, x1, y1 = caja
    rec = im.crop((int(w*x0), int(h*y0), int(w*x1), int(h*y1)))
    sal = os.path.join('recortes', arch)
    rec.save(sal)
    print('%-24s %s → %s   (%s)' % (arch, '%dx%d' % (w, h),
                                    '%dx%d' % rec.size, porque))
