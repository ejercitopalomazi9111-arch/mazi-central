# -*- coding: utf-8 -*-
"""
DEJAR LAS IMÁGENES EN PESO DE WEB

    python3 moka/taller/optimizar.py

⚠ EL RECORTE SALE A TAMAÑO DE ORIGINAL Y ESO NO SE PUBLICA. Las cuatro piezas
recortadas pesan 5.2 MB: en un teléfono con datos eso es la página entera
gastada en una foto que se ve a 700 px. Aquí se reduce cada una al tamaño en el
que DE VERDAD se enseña —el doble del tamaño de pantalla, para pantallas
densas— y se guarda en WebP.

Se conserva el PNG de origen en `taller/origen/` porque el recorte cuesta
minutos de proceso: rehacer el ajuste de tamaño es barato, rehacer el recorte
no.
"""
import os, json
from PIL import Image

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
IMG  = os.path.join(BASE, 'img')

# archivo → ancho máximo al que se enseña, en píxeles CSS. Se guarda al doble.
ANCHOS = { 'despiece.png':560, 'jarra.png':420, 'embudo.png':200, 'caldera.png':340,
           'montada.png':560, 'perfil.png':420, 'accion.jpg':900 }

salida = {}
for nom, ancho in ANCHOS.items():
    ruta = os.path.join(IMG, nom)
    if not os.path.exists(ruta): print('falta', nom); continue
    im = Image.open(ruta)
    antes = os.path.getsize(ruta)
    destino = ancho * 2
    if im.width > destino:
        im = im.resize((destino, round(im.height * destino / im.width)), Image.LANCZOS)
    nuevo = os.path.splitext(nom)[0] + '.webp'
    im.save(os.path.join(IMG, nuevo), 'WEBP', quality=84, method=6)
    os.remove(ruta)
    despues = os.path.getsize(os.path.join(IMG, nuevo))
    salida[nuevo] = { 'ancho':im.width, 'alto':im.height }
    print(f'  {nuevo:16} {im.width:4}×{im.height:<4} {antes//1024:5} KB → {despues//1024:4} KB')

json.dump(salida, open(os.path.join(IMG,'medidas.json'),'w'), ensure_ascii=False, indent=1)
print('total publicado ·', sum(os.path.getsize(os.path.join(IMG,f))
                               for f in os.listdir(IMG) if f.endswith('.webp'))//1024, 'KB')
