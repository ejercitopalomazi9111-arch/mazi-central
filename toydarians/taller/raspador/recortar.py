#!/usr/bin/env python3
"""Quita el fondo blanco de las fotos de Funko.

Por que: las 47 de Vintage Collection vienen sobre el fondo de color del
render de Hasbro, y encima del sitio —que es casi negro— se leen como una
lamina de color. Las de Funko vienen recortadas sobre BLANCO, asi que en la
misma rejilla cada tarjeta era un rectangulo blanco encendido. No es un gusto:
es que el blanco puro a pantalla completa en un fondo #0A0A0B deslumbra en el
telefono, que es donde se ve esto.

Como: relleno por difusion DESDE EL BORDE. Nada de «todo pixel casi blanco se
borra» — eso agujerea la camiseta de Marty y el casco del Mandaloriano, que
tambien son casi blancos. Solo desaparece el blanco que esta CONECTADO con el
borde de la foto, que es justo el fondo del estudio.
"""
import pathlib, collections
from PIL import Image

DIR   = pathlib.Path('/home/user/mazi-central/toydarians/fotos')
TOL   = 18          # cuanto se aparta del blanco y sigue siendo fondo

def recortar(p):
    im = Image.open(p).convert('RGB')
    w, h = im.size
    px = im.load()
    def fondo(x, y):
        r, g, b = px[x, y]
        return r >= 255 - TOL and g >= 255 - TOL and b >= 255 - TOL
    visto = bytearray(w * h)
    cola = collections.deque()
    for x in range(w):
        for y in (0, h - 1):
            if fondo(x, y) and not visto[y*w+x]: visto[y*w+x] = 1; cola.append((x, y))
    for y in range(h):
        for x in (0, w - 1):
            if fondo(x, y) and not visto[y*w+x]: visto[y*w+x] = 1; cola.append((x, y))
    while cola:
        x, y = cola.popleft()
        for dx, dy in ((1,0), (-1,0), (0,1), (0,-1)):
            nx, ny = x + dx, y + dy
            if 0 <= nx < w and 0 <= ny < h and not visto[ny*w+nx] and fondo(nx, ny):
                visto[ny*w+nx] = 1; cola.append((nx, ny))
    quitados = sum(visto)
    if quitados < w * h * 0.04:            # no habia fondo blanco que quitar
        return 0
    alfa = Image.frombytes('L', (w, h), bytes(255 if not v else 0 for v in visto))
    fuera = im.copy(); fuera.putalpha(alfa)
    fuera.save(p, 'WEBP', quality=84, method=6)
    return quitados / (w * h)

for p in sorted(DIR.glob('fk*.webp')):
    q = recortar(p)
    print(f'{p.name:<12} fondo quitado {q*100:5.1f}%  {p.stat().st_size//1024} KB')
