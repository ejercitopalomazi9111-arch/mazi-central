"""base-lisa.py · la pizza de queso SIN cortes, para poder cortarla en 6, 8 o 10.

La foto de img/armar/base.webp viene cortada en 8, y los cortes no salen exacto del centro: no se
pueden borrar siguiéndolos. Lo que se hace es armar la pizza otra vez con «gajos donantes»: el
centro de las rebanadas más anchas de la foto, que no toca ningún corte, girado a su nuevo lugar.
Doce gajos de 30° que se funden queso con queso en las uniones. Como todo sale de la misma foto y
a la misma distancia del centro, la orilla y el queso siguen siendo los de verdad.

  python3 smileys/scripts/base-lisa.py      → img/armar/base-lisa.webp
"""
import os
import numpy as np
from PIL import Image

AQUI = os.path.dirname(os.path.abspath(__file__))
BASE = os.path.join(AQUI, "..", "img", "armar", "base.webp")
SALE = os.path.join(AQUI, "..", "img", "armar", "base-lisa.webp")
# rebanadas de la foto (entre cortes, en grados, x a la derecha y y hacia abajo): sólo las anchas
DONANTES = [(322, 372), (54, 105), (151, 201), (105, 151), (240, 284)]
GAJOS, MEDIO, FUNDE = 12, 15.0, 3.5          # 12 gajos de ±15°, que se funden 3.5° con el vecino

im = Image.open(BASE).convert("RGBA")
L = im.width; C = L / 2
yy, xx = np.mgrid[0:L, 0:L]
ang = np.degrees(np.arctan2(yy - C, xx - C)) % 360

suma = np.zeros((L, L, 4), np.float32); peso = np.zeros((L, L, 1), np.float32)
for k in range(GAJOS):
    destino = 7.5 + k * 360 / GAJOS
    a0, a1 = DONANTES[k % len(DONANTES)]
    origen = (a0 + a1) / 2
    # PIL gira contra las manecillas con y hacia arriba: en estas coordenadas, girar +g lleva el ángulo t a t-g
    rot = np.asarray(im.rotate(origen - destino, resample=Image.BICUBIC, center=(C, C))).astype(np.float32)
    dif = np.abs((ang - destino + 180) % 360 - 180)
    w = np.clip((MEDIO + FUNDE - dif) / (2 * FUNDE), 0, 1)[..., None]
    suma += rot * w; peso += w

out = suma / np.maximum(peso, 1e-6)
# en el centro los doce gajos se juntan en una estrellita: ahí el queso se funde (desenfocado
# fuerte que se desvanece hacia afuera), que es como se ve el centro de una pizza recién salida
from PIL import ImageFilter
r = np.hypot(xx - C, yy - C)
borroso = np.asarray(Image.fromarray(np.clip(out, 0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(20))).astype(np.float32)
w = (np.clip(1.25 - r / 100, 0, 1) ** 1.1)[..., None]
out = out * (1 - w) + borroso * w
Image.fromarray(np.clip(out, 0, 255).astype(np.uint8)).save(SALE, "WEBP", quality=86, method=6)
print("listo:", SALE)
