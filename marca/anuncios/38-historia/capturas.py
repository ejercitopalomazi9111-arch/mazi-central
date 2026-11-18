"""GM-1 · arma cap/ (ignorado por git) con las rondas de logos de verdad: las hojas de marca/propuestas*/salida en
900 px y 50 celdas de la ronda 5 (una letra distinta cada una). Se corre desde la raíz del repo:
    python3 -I marca/anuncios/38-historia/capturas.py"""
from PIL import Image
import glob, os
os.chdir('marca')
O = 'anuncios/38-historia/cap/'
os.makedirs(O, exist_ok=True)
for i, f in enumerate(sorted(glob.glob('propuestas*/salida/*hoja*.jpg'))):
    im = Image.open(f).convert('RGB'); im.thumbnail((900, 900)); im.save(O + f'hoja-{i:02d}.jpg', quality=82)
xs, ys, k = [20, 155, 290, 423, 557], [67, 185, 303, 421, 540], 0
for h in (1, 2):
    im = Image.open(f'propuestas5/salida/Grupo-Mazi-r5-hoja-{h}.jpg').convert('RGB')
    for y in ys:
        for x in xs:
            c = im.crop((x * 3, y * 3, (x + 128) * 3, (y + 113) * 3)); c.thumbnail((384, 340)); c.save(O + f'letra-{k:02d}.jpg', quality=85); k += 1
