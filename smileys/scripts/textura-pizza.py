"""La textura de la pizza 3D: la foto real recortada en un círculo perfecto.

  python3 smileys/scripts/textura-pizza.py <foto> [lado]

Foto: «Pepperoni pizza 3.jpg», de Kurt Kaiser en Wikimedia Commons, dominio público (CC0):
https://commons.wikimedia.org/wiki/File:Pepperoni_pizza_3.jpg

La pizza en la foto es una elipse un poco aplastada por la perspectiva y toca el borde izquierdo:
se lleva a un círculo, lo que queda fuera se rellena con la orilla para que no haya costura al
mapearla, y se le corrige el color (la luz de la foto es amarilla y opaca).
"""
import sys
import numpy as np
from PIL import Image, ImageOps, ImageEnhance, ImageFilter

foto, lado = sys.argv[1], int(sys.argv[2]) if len(sys.argv) > 2 else 2048
im = ImageOps.exif_transpose(Image.open(foto)).convert('RGB')
W, H = im.size
# la elipse de la pizza en proporción de la foto (medida sobre la rejilla del 21 de octubre)
cx, cy, rx, ry = 241 / 500 * W, 281 / 667 * H, 234 / 500 * W, 240 / 667 * H

# muestreo: cada punto del círculo de salida toma el punto de la elipse en la foto
yy, xx = np.mgrid[0:lado, 0:lado].astype(np.float32)
u = (xx + .5) / lado * 2 - 1
v = (yy + .5) / lado * 2 - 1
r = np.sqrt(u * u + v * v)
# fuera del círculo se repite la orilla (r = 1) para que el mapeo no traiga cartón
f = np.where(r > .995, .995 / np.maximum(r, 1e-6), 1)
sx = np.clip(cx + u * f * rx, 0, W - 1)
sy = np.clip(cy + v * f * ry, 0, H - 1)
# el borde izquierdo de la foto corta la orilla: ahí se toma el lado contrario
fuera = sx < 2
sx = np.where(fuera, np.clip(cx - u * f * rx, 0, W - 1), sx)
src = np.asarray(im).astype(np.float32)
x0 = np.floor(sx).astype(int); y0 = np.floor(sy).astype(int)
x1 = np.minimum(x0 + 1, W - 1); y1 = np.minimum(y0 + 1, H - 1)
ax = (sx - x0)[..., None]; ay = (sy - y0)[..., None]
out = (src[y0, x0] * (1 - ax) * (1 - ay) + src[y0, x1] * ax * (1 - ay) +
       src[y1, x0] * (1 - ax) * ay + src[y1, x1] * ax * ay)
img = Image.fromarray(np.clip(out, 0, 255).astype(np.uint8))

# color: menos amarillo, más luz y contraste, un poco más de vida
a = np.asarray(img).astype(np.float32)
a[..., 0] *= 1.02; a[..., 1] *= 0.99; a[..., 2] *= 1.10
img = Image.fromarray(np.clip(a, 0, 255).astype(np.uint8))
img = ImageEnhance.Brightness(img).enhance(1.12)
img = ImageEnhance.Contrast(img).enhance(1.10)
img = ImageEnhance.Color(img).enhance(1.12)
if lado >= 1024:
    img = img.filter(ImageFilter.UnsharpMask(radius=1.4, percent=60, threshold=2))
salida = 'smileys/img/pizza-textura.jpg'
img.save(salida, quality=88, optimize=True, progressive=True)
print('✓', salida, img.size)
