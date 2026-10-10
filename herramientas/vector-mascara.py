#!/usr/bin/env python3
"""vector-mascara.py — un logo de UNA tinta (PNG con transparencia) a SVG por partes.

    python3 herramientas/vector-mascara.py entrada.png salida.svg [--partes partes.json] [--js salida.js]

Para qué: animar un logo en el video (alas que aletean, audífonos que laten,
el trazo que se dibuja solo) hace falta tenerlo en vectores Y separado por
partes con nombre. vectorizar.mjs saca colores; éste saca FORMAS de una sola
tinta, que es como están dibujados los logos a línea (la paloma de Radio
Divergentes).

Cómo:
  1. la transparencia se escala al doble (bicúbico) y se corta en 50 %: el
     borde sale liso, no en escalones;
  2. OpenCV encuentra los contornos con sus agujeros (RETR_CCOMP);
  3. cada contorno se suaviza a lo largo de sí mismo, se re-muestrea parejo y
     se convierte en curvas Bézier (Catmull-Rom) — eso es lo que lo hace verse
     dibujado y no pixeleado al crecer;
  4. cada pieza cae en la parte cuya zona contiene su centro (--partes:
     {"ala-izq": [x0,y0,x1,y1], ...} en pixeles de la imagen original); lo que
     no cae en ninguna va a "resto". Una zona puede llevar "pivote": [x,y],
     el punto sobre el que gira esa parte al animarla.

Sale el SVG (con un <g id> por parte, rellenos con evenodd) y, con --js, un
módulo con los trazos listos para Path2D en un <canvas>.
"""
import sys, json, math, argparse
import numpy as np, cv2
from PIL import Image

ap = argparse.ArgumentParser()
ap.add_argument('entrada'); ap.add_argument('salida')
ap.add_argument('--partes', default=None)
ap.add_argument('--js', default=None)
ap.add_argument('--escala', type=float, default=2.0)
ap.add_argument('--minarea', type=float, default=40)
ap.add_argument('--suave', type=float, default=2.2)
ap.add_argument('--paso', type=float, default=3.0)
a = ap.parse_args()

im = Image.open(a.entrada).convert('RGBA')
W, H = im.size
alfa = np.array(im)[:, :, 3].astype(np.float32)
K = a.escala
grande = cv2.resize(alfa, (int(W * K), int(H * K)), interpolation=cv2.INTER_CUBIC)
mascara = (grande >= 128).astype(np.uint8) * 255
partes = {}
if a.partes:
    partes = json.load(open(a.partes))

def suavizar(pts, s):
    """gaussiano CIRCULAR a lo largo del contorno, y re-muestreo parejo"""
    n = len(pts)
    if n < 8: return pts
    r = max(1, int(3 * s))
    k = np.exp(-0.5 * (np.arange(-r, r + 1) / s) ** 2); k /= k.sum()
    ext = np.concatenate([pts[-r:], pts, pts[:r]])
    x = np.convolve(ext[:, 0], k, 'valid'); y = np.convolve(ext[:, 1], k, 'valid')
    p = np.stack([x, y], 1)
    seg = np.sqrt(((np.roll(p, -1, 0) - p) ** 2).sum(1)); L = seg.sum()
    m = max(6, int(L / a.paso))
    cum = np.concatenate([[0], np.cumsum(seg)])
    t = np.linspace(0, L, m, endpoint=False)
    px = np.interp(t, cum, np.concatenate([p[:, 0], [p[0, 0]]]))
    py = np.interp(t, cum, np.concatenate([p[:, 1], [p[0, 1]]]))
    return np.stack([px, py], 1)

def bezier(p):
    """Catmull-Rom cerrado → curvas Bézier cúbicas, en coordenadas originales"""
    p = p / K
    n = len(p); f = lambda v: f'{v:.1f}'.rstrip('0').rstrip('.')
    d = [f'M{f(p[0][0])} {f(p[0][1])}']
    for i in range(n):
        p0, p1, p2, p3 = p[i - 1], p[i], p[(i + 1) % n], p[(i + 2) % n]
        c1 = p1 + (p2 - p0) / 6; c2 = p2 - (p3 - p1) / 6
        d.append(f'C{f(c1[0])} {f(c1[1])} {f(c2[0])} {f(c2[1])} {f(p2[0])} {f(p2[1])}')
    return ''.join(d) + 'Z'

def zona(z):
    """la zona como máscara: caja [x0,y0,x1,y1] o polígono [[x,y],...]"""
    m = np.zeros(mascara.shape, np.uint8)
    if 'poligono' in z: cv2.fillPoly(m, [np.array(z['poligono'], np.float64).dot(K).astype(np.int32)], 255)
    else:
        x0, y0, x1, y1 = z['caja']; m[int(y0 * K):int(y1 * K), int(x0 * K):int(x1 * K)] = 255
    return m

def trazarParte(mp):
    cont, jer = cv2.findContours(mp, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_NONE)
    jer = jer[0] if jer is not None else []
    out = []
    for i, c in enumerate(cont):
        if jer[i][3] != -1: continue                 # los agujeros van con su padre
        if cv2.contourArea(c) < a.minarea * K * K: continue
        trazos = [bezier(suavizar(c[:, 0, :].astype(np.float64), a.suave))]
        h = jer[i][2]
        while h != -1:
            if cv2.contourArea(cont[h]) >= a.minarea * K * K * 0.3:
                trazos.append(bezier(suavizar(cont[h][:, 0, :].astype(np.float64), a.suave)))
            h = jer[h][0]
        out.append(''.join(trazos))
    return out

# cada pixel va a UNA sola parte: la primera zona que lo contiene. Así una
# línea que une dos partes (el ala con el cable) se corta en la frontera.
grupos = {}
libre = mascara.copy()
for nombre, z in partes.items():
    mp = cv2.bitwise_and(libre, zona(z))
    libre = cv2.bitwise_and(libre, cv2.bitwise_not(mp))
    t = trazarParte(mp)
    if t: grupos[nombre] = t
resto = trazarParte(libre)
if resto: grupos['resto'] = resto

orden = list(partes.keys()) + ['resto']
svg = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}">',
       '<!-- hecho con herramientas/vector-mascara.py: una tinta, por partes, para animar -->']
datos = {'ancho': W, 'alto': H, 'partes': {}}
for nombre in orden:
    if nombre not in grupos: continue
    z = partes.get(nombre, {})
    piv = z.get('pivote') if isinstance(z, dict) else None
    svg.append(f'<g id="{nombre}" fill="currentColor" fill-rule="evenodd"' + (f' data-pivote="{piv[0]} {piv[1]}"' if piv else '') + '>')
    for d in grupos[nombre]: svg.append(f'<path d="{d}"/>')
    svg.append('</g>')
    datos['partes'][nombre] = {'trazos': grupos[nombre], 'pivote': piv}
svg.append('</svg>')
open(a.salida, 'w').write('\n'.join(svg) + '\n')
if a.js:
    open(a.js, 'w').write('/* generado por herramientas/vector-mascara.py — no se edita a mano */\nexport default ' + json.dumps(datos, ensure_ascii=False) + ';\n')
print(a.salida, {k: len(v) for k, v in grupos.items()})
