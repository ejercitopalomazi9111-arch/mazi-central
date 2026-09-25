#!/usr/bin/env python3
"""
LAS PIEZAS DEL LOGO · `python3 tienda/marca/cortar.py`
──────────────────────────────────────────────────────────────────────────
Corta el logo de El Garaje del Barbero en las capas que se arman en la
animación de apertura de la tienda.

Por qué se corta el LOGO COMPLETO y no las hojas de piezas sueltas que mandó
Carlos: las piezas de esas hojas son del mismo diseño pero no de la misma
medida ni en el mismo lugar (las generó una IA por separado). Si la animación
arma el logo con ellas, al final no cae en el logo de verdad. Cortando el
logo completo, cada pixel va a UNA sola capa, y cuando todas llegan a su
lugar lo que se ve es exactamente el logo, sin costuras.

Cómo:
· El fondo del logo es un disco casi negro, rgb(20,21,25). Todo lo que brilla
  encima (dorado y plata) se separa de ese fondo con alfa, y se "des-mezcla"
  para que, puesto encima de un disco del mismo color, dé el pixel original.
· Cada pixel se asigna por su lugar (radio y ángulo desde el centro) y por su
  color (la plata es la D y el subtítulo).

Sale en tienda/marca/garaje/: una capa por pieza, más `entero.webp` (todo
junto, para el final y para el brillo).
"""
import math, os
import numpy as np
from PIL import Image

AQUI = os.path.dirname(os.path.abspath(__file__))
FUENTE = os.path.join(AQUI, 'fuente', 'logo-completo.jpg')
SALIDA = os.path.join(AQUI, 'garaje')
ESCALA = 2                       # se amplía antes de cortar: orillas más suaves en retina
FONDO = np.array([20, 21, 25], float)
CX, CY = 289, 269                # centro del disco (medido: bbox 61–517 × 41–497)

im = Image.open(FUENTE).convert('RGB')
W0, H0 = im.size
im = im.resize((W0 * ESCALA, H0 * ESCALA), Image.LANCZOS)
a = np.asarray(im).astype(float)
H, W, _ = a.shape

mx, mn = a.max(2), a.min(2)
alfa = np.clip((mx - 30) / 80, 0, 1)
# Des-mezclar: c = f·α + fondo·(1−α)  →  f = (c − fondo·(1−α)) / α
with np.errstate(divide='ignore', invalid='ignore'):
    color = np.where(alfa[..., None] > 0, (a - FONDO * (1 - alfa[..., None])) / np.maximum(alfa[..., None], 1e-6), 0)
color = np.clip(color, 0, 255)

ys, xs = np.mgrid[0:H, 0:W]
x, y = xs / ESCALA, ys / ESCALA
r = np.hypot(x - CX, y - CY)
ang = np.degrees(np.arctan2(y - CY, x - CX))       # y hacia abajo: −90 es arriba
plata = ((mx - mn) < 30) & (mx > 110)

# Y lo que es MÁS OSCURO que el disco: los contornos negros que separan la G,
# la D y la B, y la sombra bajo la cinta del título. Sin esto el logo armado
# salía «lavado». Se guarda como negro con alfa. Sólo dentro del
# disco: afuera el original es negro puro y no es parte de ninguna pieza.
# Ojo: el disco del original no es parejo (arriba ~26, abajo ~16), así que
# «más oscuro que el fondo» a secas se llevaba media parte baja del disco
# pegada a la G y la B. Sólo cuenta lo de verdad negro: contornos y sombras.
OSCURO = 13
oscuro = np.clip((OSCURO - a.mean(2)) / OSCURO, 0, 1) * (alfa == 0)

capas = {
    # Las patas de «DISTRIBUIDORA…» (plata) se asoman más allá de r=212: son
    # del subtítulo, no del aro (si no, se veían antes de tiempo, sueltas).
    'aro':         (r >= 212) & ~((ang >= 12) & (ang < 165) & plata),
    # La base del peine y el aro interior bajan hasta r≈140 en el centro; a los
    # lados se sube a 155 para no llevarse la esquina de la B ni la de la G.
    'herramientas': (ang >= -135) & (ang <= -45) & (r >= np.where((ang >= -110) & (ang <= -70), 140, 155)) & (r < 212),
    'cuerda-izq':  ((ang >= 165) | (ang < -135)) & (r >= 165) & (r < 212),
    'cuerda-der':  (ang > -45) & (ang < 12) & (r >= 165) & (r < 212),
}
# El título baja hasta r≈120 en el centro; en las orillas empieza en 150,
# porque ahí abajo están las panzas de la G y la B.
banda_texto = (ang >= 12) & (ang < 165) & (r >= np.where((ang >= 55) & (ang <= 125), 118, 150)) & (r < 212)
banda_texto = banda_texto | ((ang >= 12) & (ang < 165) & (r >= 212) & plata)
capas['titulo'] = banda_texto & ~plata
capas['subtitulo'] = banda_texto & plata
resto = ~np.logical_or.reduce([capas[k] for k in capas])
capas['d'] = resto & plata
capas['g'] = resto & ~plata & (x < 300)
capas['b'] = resto & ~plata & (x >= 300)

# Cada pixel en una sola capa: si no, al llegar se doblaría el brillo en las orillas.
suma = sum(m.astype(int) for m in capas.values())
assert (suma <= 1).all(), 'dos capas se enciman'
assert (suma == 1).all(), 'un pixel sin capa'

oscuro = oscuro * (r <= 236)
os.makedirs(SALIDA, exist_ok=True)
def guardar(nombre, mascara):
    a_total = np.maximum(alfa, oscuro) * mascara
    rgb = np.where((oscuro > 0)[..., None], 0, color)
    rgba = np.dstack([rgb, a_total * 255]).round().astype(np.uint8)
    rgba[..., :3][rgba[..., 3] == 0] = 0
    Image.fromarray(rgba, 'RGBA').save(os.path.join(SALIDA, nombre + '.webp'), 'WEBP', quality=88, method=6)
for k, m in capas.items():
    guardar(k, m)
guardar('entero', np.ones((H, W), bool))
print(f'{len(capas) + 1} capas de {W}×{H} en {SALIDA}')
for f in sorted(os.listdir(SALIDA)):
    print(f'  {f:20s} {os.path.getsize(os.path.join(SALIDA, f)) // 1024:4d} KB')
