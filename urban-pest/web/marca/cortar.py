"""Corta el logo de Urban Pest Control en capas para la apertura de la página.

  python3 urban-pest/web/marca/cortar.py

Cada pixel del logo va a UNA sola capa, con su color y su transparencia originales: juntas, las capas
son EXACTAMENTE el logo (el guion lo comprueba: diferencia 0). Así la animación puede separar las
piezas, moverlas y deformarlas, y lo que queda al final es el logo de verdad, no un dibujo nuestro.
Capas: globo (azul), sol (la mitad naranja y su estela), personita (blanca), chorro (el chorro que
sale de la mano), urban, pest, control.
"""
from pathlib import Path
import json
import numpy as np
from PIL import Image
AQUI = Path(__file__).resolve().parent
a = np.array(Image.open(AQUI / 'original.png').convert('RGBA'))
H, W = a.shape[:2]
r, g, b, al = [a[..., i].astype(int) for i in range(4)]
op = al > 0
yy, xx = np.mgrid[0:H, 0:W]
marca = yy < 270
azul = op & marca & (b > r + 20)
calido = op & marca & (r > b + 40)
claro = op & marca & ~azul & ~calido
chorro = claro & (xx >= 278)
personita = claro & ~chorro
texto = op & ~marca
control = texto & (yy >= 360)
pest = texto & ~control & (r > b + 30)
urban = texto & ~control & ~pest
capas = {'globo': azul, 'sol': calido, 'personita': personita, 'chorro': chorro, 'urban': urban, 'pest': pest, 'control': control}
suma = sum(m.astype(int) for m in capas.values())
assert (suma[op] == 1).all() and (suma[~op] == 0).all(), 'un pixel quedó en dos capas o en ninguna'
cajas = {}
junto = np.zeros_like(a)
for n, m in capas.items():
    c = np.zeros_like(a); c[m] = a[m]; junto[m] = a[m]
    Image.fromarray(c).save(AQUI / f'{n}.webp', 'WEBP', lossless=True, exact=True, quality=100, method=6)
    ys, xs = np.where(m); cajas[n] = [int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1]
# comprobar contra lo guardado (lo que de verdad va a cargar la página)
de_vuelta = np.zeros_like(a, dtype=int)
for n in capas:
    c = np.array(Image.open(AQUI / f'{n}.webp').convert('RGBA')).astype(int)
    m = c[..., 3] > 0; de_vuelta[m] = c[m]
vis = a[..., 3] > 0  # lo invisible (transparencia 0) no tiene color que comparar
dif = max(np.abs(de_vuelta - a.astype(int))[vis].max(), np.abs(de_vuelta[..., 3] - a[..., 3].astype(int)).max())
(AQUI / 'capas.json').write_text(json.dumps({'ancho': W, 'alto': H, 'cajas': cajas}, indent=1))
print('capas:', ', '.join(f'{n} {int(m.sum())} px' for n, m in capas.items()))
print('diferencia máxima contra el original:', dif)
assert dif == 0
