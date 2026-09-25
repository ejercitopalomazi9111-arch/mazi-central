#!/usr/bin/env python3
"""
LAS PIEZAS SUELTAS DE CARLOS · `python3 tienda/marca/piezas.py`
──────────────────────────────────────────────────────────────────────────
Carlos mandó, además del logo, una hoja con las piezas sueltas «para que
puedas usarlas cómodamente». Tienen algo que el logo cortado no tiene: vienen
ENTERAS. Cortada del logo, la G trae un hueco donde la tapa la D; la de la
hoja, no. Y las herramientas vienen por separado, así que pueden caer una por
una.

Pero las hizo una IA aparte: no traen la medida ni el lugar del logo. Así que
aquí se BUSCA dónde cae cada una: para cada pieza se prueban giros y tamaños,
y la posición se encuentra por correlación contra su capa del logo cortado
(marca/garaje/*.webp, de cortar.py). Lo que sale es dónde ponerla para que,
al terminar su vuelo, quede encima de la pieza real; ahí se funde con la capa
exacta y el logo final sigue siendo EL logo.

Sale: marca/garaje/pieza-*.webp y marca/garaje/piezas.json.
"""
import json, math, os
import numpy as np
from PIL import Image
from scipy.signal import fftconvolve

AQUI = os.path.dirname(os.path.abspath(__file__))
HOJA = os.path.join(AQUI, 'fuente', 'piezas-sueltas.png')
CAPAS = os.path.join(AQUI, 'garaje')

# Recuadros en la hoja (1536×1024), medidos por componentes conectados.
PIEZAS = {
# Las letras van DERECHAS (sin giro): una G girada 9° que «encaja mejor» se ve
# chueca en todo el vuelo. Las herramientas sí se giran: en el logo van ladeadas.
# `alto`: entre qué fracciones del alto del logo se busca su tamaño.
    'g':       {'caja': (30, 60, 188, 230),  'capa': 'g',            'x': None, 'giros': [0], 'alto': (0.25, 0.45)},
    'd':       {'caja': (180, 60, 318, 230), 'capa': 'd',            'x': None, 'giros': [0], 'alto': (0.25, 0.45)},
    'b':       {'caja': (314, 60, 458, 230), 'capa': 'b',            'x': None, 'giros': [0], 'alto': (0.25, 0.45)},
    'navaja':  {'caja': (500, 44, 668, 228), 'capa': 'herramientas', 'x': (0, 0.47), 'giros': range(-30, 46, 3), 'alto': (0.1, 0.26)},
    'peine':   {'caja': (720, 40, 772, 230), 'capa': 'herramientas', 'x': (0.44, 0.56), 'giros': range(-9, 10, 3), 'alto': (0.1, 0.22), 'estira': [1, 1.3, 1.6, 1.9, 2.2]},   # el del logo es más ancho
    # En el logo las tijeras son DOS mangos: uno parado (con la hoja hacia abajo)
    # y otro acostado a su derecha. La hoja de Carlos trae los dos por separado:
    # «Tijeras» y «Segmentos de tijeras».
    'tijeras': {'caja': (814, 25, 898, 236), 'capa': 'herramientas', 'x': (0.53, 0.63), 'giros': range(-30, 31, 3), 'alto': (0.1, 0.26)},
    'mango':   {'caja': (935, 68, 999, 207), 'capa': 'herramientas', 'x': (0.6, 0.78), 'giros': range(-150, 151, 4), 'alto': (0.06, 0.2)},
}

hoja = np.asarray(Image.open(HOJA).convert('RGB')).astype(float)

def pieza_rgba(caja):
    x0, y0, x1, y1 = caja
    a = hoja[y0:y1, x0:x1]
    mx = a.max(2)
    alfa = np.clip((mx - 18) / 70, 0, 1)
    with np.errstate(divide='ignore', invalid='ignore'):
        col = np.where(alfa[..., None] > 0, a / np.maximum(alfa[..., None], 1e-6), 0)
    rgba = np.dstack([np.clip(col, 0, 255), alfa * 255]).astype(np.uint8)
    # recortar al contenido
    ys, xs = np.nonzero(alfa > 0.1)
    return rgba[ys.min():ys.max() + 1, xs.min():xs.max() + 1]

def alfa_de(im):
    return np.asarray(im.getchannel('A')).astype(float) / 255

ESC = 0.5    # se busca a media resolución de las capas (577×535): basta y es 4× más rápido
import sys
solo = set(sys.argv[1:])             # `piezas.py tijeras` recalcula sólo ésa
ruta_json = os.path.join(CAPAS, 'piezas.json')
salida = json.load(open(ruta_json)) if solo and os.path.exists(ruta_json) else {}
# El peine se mide A MANO: la búsqueda se queda con el lomo (lo único macizo;
# los dientes son rayitas) y lo pone angosto. Medido sobre el logo de 577×535:
# x 275–304, y 54–119.
A_MANO = {'peine': {'x': 47.66, 'y': 10.09, 'w': 5.03, 'h': 12.15, 'giro': 0, 'iou': None}}
for nombre, p in PIEZAS.items():
    if solo and nombre not in solo: continue
    if nombre in A_MANO:
        Image.fromarray(pieza_rgba(p['caja']), 'RGBA').save(os.path.join(CAPAS, f'pieza-{nombre}.webp'), 'WEBP', quality=90, method=6)
        salida[nombre] = A_MANO[nombre]; print(f'{nombre:8s} a mano · {salida[nombre]}'); continue
    rgba = pieza_rgba(p['caja'])
    Image.fromarray(rgba, 'RGBA').save(os.path.join(CAPAS, f'pieza-{nombre}.webp'), 'WEBP', quality=90, method=6)
    capa = Image.open(os.path.join(CAPAS, p['capa'] + '.webp'))
    W, H = capa.size
    L = alfa_de(capa.resize((int(W * ESC), int(H * ESC)), Image.BILINEAR))
    if p['x']:
        a, b = p['x']; cols = np.arange(L.shape[1]) / L.shape[1]
        L = L * ((cols >= a) & (cols <= b))[None, :]
    pieza = Image.fromarray(rgba, 'RGBA')
    mejor = (-1, None)
    base_h = rgba.shape[0]
    for giro, estira in [(g, e) for g in p['giros'] for e in p.get('estira', [1])]:
        base_p = pieza.resize((max(1, int(pieza.width * estira)), pieza.height), Image.BILINEAR) if estira != 1 else pieza
        rot = base_p.rotate(giro, resample=Image.BILINEAR, expand=True)
        for alto in np.arange(p['alto'][0], p['alto'][1], 0.008) * L.shape[0]:
            k = alto / base_h
            w, h = max(4, int(rot.width * k)), max(4, int(rot.height * k))
            if w >= L.shape[1] or h >= L.shape[0]: continue
            A = alfa_de(rot.resize((w, h), Image.BILINEAR))
            c = fftconvolve(L, A[::-1, ::-1], mode='valid')
            s = fftconvolve(L, np.ones_like(A), mode='valid')
            iou = c / (A.sum() + s - c + 1e-6)
            j = np.unravel_index(np.argmax(iou), iou.shape)
            if iou[j] > mejor[0]: mejor = (float(iou[j]), (giro, k, j, rot.width, rot.height, w, h, estira))
    iou, (giro, k, (y, x), rw, rh, w, h, estira) = mejor
    # La caja de la pieza SIN girar, centrada donde quedó la girada (así se pinta en CSS con rotate()).
    cx, cy = (x + w / 2) / L.shape[1], (y + h / 2) / L.shape[0]
    pw, ph = rgba.shape[1] * estira * k / L.shape[1], rgba.shape[0] * k / L.shape[0]
    salida[nombre] = {'x': round(float(cx - pw / 2) * 100, 3), 'y': round(float(cy - ph / 2) * 100, 3), 'w': round(float(pw) * 100, 3), 'h': round(float(ph) * 100, 3), 'giro': -int(giro), 'iou': round(float(iou), 3)}
    print(f'{nombre:8s} iou {iou:.2f} · giro {-giro:4d}° · {salida[nombre]}')

json.dump(salida, open(os.path.join(CAPAS, 'piezas.json'), 'w'), indent=1)
