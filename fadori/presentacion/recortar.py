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
    # las del 21 de octubre, de la app rediseñada
    '05-mostrador.png':      ((.04, .12, .66, .72), 'el pedido que sigue y la fila, con quién y qué pidió'),
    '06-medidor.png':        ((.00, .01, .99, .385), 'las ocho cifras del día, que es la medición'),
    '01-cortinilla.png':     ((.06, .30, .94, .70), 'la hamburguesa y el logotipo, que es de lo que habla la lámina'),
    '03-mi-turno.png':       ((.00, .06, 1.0, .60), 'el número de turno grande y cuánto falta'),
    '02-menu.png':           ((.00, .00, 1.0, .75), 'la pregunta, el buscador y los platillos con su foto'),
    '09-credencial.png':     ((.00, .06, 1.0, .62), 'el paso de la credencial'),
    '12-cobro.png':          ((.20, .07, .80, 1.0), 'la hoja de cobro con la calculadora'),
    '13-fiados.png':         ((.04, .20, .91, .54), 'quién debe y sus botones'),
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
