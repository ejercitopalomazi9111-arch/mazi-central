"""La letra nueva de Grupo Mazi, del DIBUJO de la artista a una fuente de verdad (.ttf, .woff2, .css y prueba).

    python3.13 -I marca/tipografia-2026/fundir.py

Entra `dibujo-original.jpg`: la hoja completa que mandó Carlos el 18 nov (letras, números, signos, operaciones,
monedas e íconos). La primera hoja, sólo con letras y de lado, se guarda como `dibujo-1-letras.jpg`.
Cada pieza viene dibujada sólo con su contorno, así que:
  1. se separan los trazos (lo oscuro);
  2. se engordan 2 px para cerrar los huequitos del trazo a mano y se rellena desde la orilla: lo que el relleno
     no alcanza es pieza (su interior y su contorno); luego se adelgaza lo mismo que se engordó;
  3. cada renglón se parte en letras por los huecos de columnas vacías, en el orden de la hoja;
  4. cada letra se vuelve contornos (con sus huecos), se simplifica y entra a la fuente.
La escala sale del alto de las mayúsculas del primer renglón; cada renglón tiene su propia línea de base.
Las minúsculas escriben las mismas mayúsculas (la hoja sólo trae mayúsculas). Á É Í Ó Ú llevan encima el acento
que dibujó la artista (´) y la Ü dos de sus estrellas. Los íconos (palomita, tache, flechas, reproducir, pausa, borrar)
van en sus caracteres de Unicode; el bote de basura, que no tiene, en el U+E000 (zona privada).
"""
from pathlib import Path
import json
import numpy as np
import cv2
from PIL import Image
from fontTools.fontBuilder import FontBuilder
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.ttLib import TTFont

AQUI = Path(__file__).resolve().parent
NOMBRE, FAMILIA = 'mazi-2026', 'Mazi 2026'
FILAS = [
    'ABCDEFGHI',
    'JKLMNÑOPQR',
    'STUVWXYZ',
    '0123456789',
    ['!', '?', '¡', '¿', '.', ',', ';', ':', '…', '“', '”', '‘', '’'],
    ['(', ')', '[', ']', '{', '}', '/', '\\', '|', '@', '#', '%'],
    ['+', '−', '×', '÷', '=', '≠', '<', '>', '≤', '≥'],
    ['&', '*', '$', '€', '¥', '¢', '°', '´', '^', '~', '¬', '⌐'],
    ['✓', '✗', '←', '→', '↑', '↓', '▶', '⏸', '⧄', '\ue000'],
]

# 1 · enderezar y separar el trazo
g = np.array(Image.open(AQUI / 'dibujo-original.jpg').convert('L'))
tinta = (g < 150).astype(np.uint8)
# 2 · cerrar huequitos, rellenar desde fuera, regresar al grosor
K = np.ones((3, 3), np.uint8)
gordo = cv2.dilate(tinta, K, iterations=2)
# Cada zona blanca cerrada es o el INTERIOR de una pieza o un HUECO de la letra (el de la O, los de la B). Se decide
# como un mapa: lo que toca el fondo es pieza; lo que sólo toca piezas es hueco; lo que vive dentro de un hueco (la
# estrella de la O) vuelve a ser pieza. O sea: distancia al fondo en saltos de una línea; non = pieza, par = hueco.
# Antes se rellenaba todo lo que el fondo no alcanzaba, y la B, la O, el 8 y el bote salían macizos.
blanco = (1 - gordo).astype(np.uint8)
nz, zonas = cv2.connectedComponents(blanco, connectivity=4)
fondo = zonas[0, 0]
SALTO = 7                                              # una línea de trazo engordada, más un poco
st = cv2.connectedComponentsWithStats(blanco, connectivity=4)[2]
vecinos = {z: set() for z in range(1, nz)}
H_, W_ = zonas.shape
for z in range(1, nz):
    if z == fondo:
        continue
    x, y, w_, h_ = st[z, 0], st[z, 1], st[z, 2], st[z, 3]
    x0, y0, x1, y1 = max(0, x - SALTO), max(0, y - SALTO), min(W_, x + w_ + SALTO), min(H_, y + h_ + SALTO)
    sub = zonas[y0:y1, x0:x1]
    m = cv2.dilate((sub == z).astype(np.uint8), np.ones((2 * SALTO + 1, 2 * SALTO + 1), np.uint8))
    for v in np.unique(sub[m > 0]):
        if v and v != z:
            vecinos[z].add(int(v)); vecinos.setdefault(int(v), set()).add(z)
dist = {fondo: 0}; cola = [fondo]
while cola:
    z = cola.pop(0)
    for v in vecinos.get(z, ()):
        if v not in dist:
            dist[v] = dist[z] + 1; cola.append(v)
solido = gordo.copy()
for z in range(1, nz):
    if z == fondo:
        continue
    chico = st[z, 4] < 30                                  # rendijas que deja el trazo: son tinta
    if chico or dist.get(z, 1) % 2 == 1:
        solido[zonas == z] = 1
solido = cv2.erode(solido, K, iterations=1)
# basura: manchitas sueltas de menos de 30 px
n, et, est, _ = cv2.connectedComponentsWithStats(solido, 8)
for i in range(1, n):
    if est[i, cv2.CC_STAT_AREA] < 30:
        solido[et == i] = 0
Image.fromarray((1 - solido) * 255).save(AQUI / 'limpio.png')

# 3 · renglones por los huecos de filas vacías, y letras por los de columnas vacías
def tramos(perfil, hueco):
    on = np.where(perfil > 0)[0]
    if not len(on):
        return []
    out, a = [], on[0]
    for p, q in zip(on[:-1], on[1:]):
        if q - p > hueco:
            out.append((a, p + 1)); a = q
    out.append((a, on[-1] + 1))
    return out
renglones = tramos(solido.sum(1), 6)
assert len(renglones) == len(FILAS), f'se esperaban {len(FILAS)} renglones y salieron {len(renglones)}: {renglones}'
glifos = {}
for (y0, y1), fila in zip(renglones, FILAS):
    banda = solido[y0:y1]
    letras = tramos(banda.sum(0), 6)
    if len(letras) != len(fila):
        # dos piezas de la misma letra separadas: se juntan los huecos más chicos hasta cuadrar
        while len(letras) > len(fila):
            gaps = [letras[i + 1][0] - letras[i][1] for i in range(len(letras) - 1)]
            k = int(np.argmin(gaps)); letras[k:k + 2] = [(letras[k][0], letras[k + 1][1])]
    assert len(letras) == len(fila), f'renglón {fila}: {len(letras)} letras'
    for (x0, x1), ch in zip(letras, fila):
        sub = banda[:, x0:x1]
        ys = np.where(sub.sum(1) > 0)[0]
        glifos[ch] = {'x0': int(x0), 'x1': int(x1), 'y0': int(y0 + ys[0]), 'y1': int(y0 + ys[-1] + 1), 'fila': fila if isinstance(fila, str) else ''.join(fila)}

# medidas: alto de mayúscula = mediana del primer renglón; base de cada renglón
alto_mayus = float(np.median([glifos[c]['y1'] - glifos[c]['y0'] for c in 'ABCDEFGHI']))
UPM, CAP = 1000, 700
esc = CAP / alto_mayus
def base_de(fila):
    if fila[0] == '!':
        return glifos['.']['y1']                      # el punto se sienta en la base
    if fila[0] in '(+✓':
        cen = np.median([(glifos[c]['y0'] + glifos[c]['y1']) / 2 for c in fila])
        return cen + alto_mayus / 2                   # paréntesis, operaciones e íconos: centrados en la mayúscula
    if fila[0] == '&':
        return float(np.median([glifos[c]['y1'] for c in '&$€¥¢']))
    return float(np.median([glifos[c]['y1'] for c in fila]))
bases = {f if isinstance(f, str) else ''.join(f): base_de(f) for f in FILAS}

# 4 · contornos con sus huecos → unidades de la fuente
LADO = 60          # aire a cada lado
def contornos(ch):
    G = glifos[ch]; base = bases[G['fila']]
    pad = 4
    sub = solido[G['y0'] - pad:G['y1'] + pad, G['x0'] - pad:G['x1'] + pad].copy()
    cs, jer = cv2.findContours(sub, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_NONE)
    out = []
    for c, j in zip(cs, jer[0]):
        c = cv2.approxPolyDP(c, 1.2, True)[:, 0, :].astype(float)
        if len(c) < 3 or abs(cv2.contourArea(c.astype(np.float32))) < 25:
            continue
        x = (c[:, 0] + G['x0'] - pad - G['x0']) * esc + LADO
        y = (base - (c[:, 1] + G['y0'] - pad)) * esc
        pts = list(zip(np.round(x).astype(int).tolist(), np.round(y).astype(int).tolist()))
        hueco = j[3] != -1
        area = sum(pts[i][0] * pts[i - 1][1] - pts[i - 1][0] * pts[i][1] for i in range(len(pts))) / 2
        # TrueType: lo macizo gira en el sentido del reloj (área negativa con y hacia arriba), los huecos al revés
        if (not hueco and area > 0) or (hueco and area < 0):
            pts.reverse()
        out.append(pts)
    ancho = int(round((G['x1'] - G['x0']) * esc)) + 2 * LADO
    return out, ancho

nombres = {'.notdef': '.notdef', ' ': 'space'}
def gname(ch):
    return 'uni%04X' % ord(ch)
orden = ['.notdef', 'space']
dibujos, anchos, cmap = {}, {}, {}
def vacio(ancho):
    p = TTGlyphPen(None); return p.glyph(), ancho
p = TTGlyphPen(None); p.moveTo((50, 0)); p.lineTo((50, 700)); p.lineTo((450, 700)); p.lineTo((450, 0)); p.closePath()
dibujos['.notdef'] = p.glyph(); anchos['.notdef'] = 500
dibujos['space'], anchos['space'] = vacio(300)[0], 300
cmap[0x20] = 'space'; cmap[0xA0] = 'space'
contornos_de = {}
for ch in glifos:
    cs, ancho = contornos(ch); contornos_de[ch] = (cs, ancho)
    pen = TTGlyphPen(None)
    for pts in cs:
        pen.moveTo(pts[0])
        for q in pts[1:]:
            pen.lineTo(q)
        pen.closePath()
    n = gname(ch); orden.append(n); dibujos[n] = pen.glyph(); anchos[n] = ancho; cmap[ord(ch)] = n
    if ch.isalpha() and ch.lower() != ch:
        cmap[ord(ch.lower())] = n                     # minúsculas = mayúsculas
# comilla recta y apóstrofo con la ’ de la artista; guion con la barra de en medio de la H… no: no está dibujado
cmap[ord("'")] = gname('’'); cmap[ord('"')] = gname('”')
# alias: el guion y las rayas con la barra del menos; las palomitas y taches «de emoji» con los de la artista
for alias, real in {'-': '−', '–': '−', '—': '−', '`': '´', '✔': '✓', '✘': '✗', '✕': '✗', '⏵': '▶', '·': '.'}.items():
    cmap[ord(alias)] = gname(real)

# acentos provisionales: la ’ encima de la vocal, centrada; la Ü con dos estrellas del «:»
def compuesto(base_ch, marcas):
    cs, ancho = contornos_de[base_ch]
    pen = TTGlyphPen(None)
    alto_base = max(y for c in cs for _, y in c)
    for pts in cs:
        pen.moveTo(pts[0]); [pen.lineTo(q) for q in pts[1:]]; pen.closePath()
    for mch, dx_rel, escala in marcas:
        mc, mw = contornos_de[mch]
        xs = [x for c in mc for x, _ in c]; ys = [y for c in mc for _, y in c]
        cx, y0 = (min(xs) + max(xs)) / 2, min(ys)
        for pts in mc:
            q = [(int(round((x - cx) * escala + ancho * dx_rel)), int(round((y - y0) * escala + alto_base + 40))) for x, y in pts]
            pen.moveTo(q[0]); [pen.lineTo(r) for r in q[1:]]; pen.closePath()
    return pen.glyph(), ancho
ACENTOS = {'Á': ('A', [('´', .5, 1)]), 'É': ('E', [('´', .5, 1)]), 'Í': ('I', [('´', .5, 1)]), 'Ó': ('O', [('´', .5, 1)]), 'Ú': ('U', [('´', .5, 1)]),
           'Ü': ('U', [('.', .36, .7), ('.', .64, .7)])}
for ch, (b, marcas) in ACENTOS.items():
    n = gname(ch); orden.append(n); dibujos[n], anchos[n] = compuesto(b, marcas); cmap[ord(ch)] = n; cmap[ord(ch.lower())] = n

fb = FontBuilder(UPM, isTTF=True)
fb.setupGlyphOrder(orden)
fb.setupCharacterMap(cmap)
fb.setupGlyf(dibujos)
glyf = fb.font['glyf']
def lsb(n):
    gl = glyf[n]
    if not gl.numberOfContours:
        return 0
    gl.recalcBounds(glyf); return gl.xMin
fb.setupHorizontalMetrics({n: (anchos[n], lsb(n)) for n in orden})
ASC, DESC = 950, -250
fb.setupHorizontalHeader(ascent=ASC, descent=DESC)
fb.setupNameTable({'familyName': FAMILIA, 'styleName': 'Regular', 'uniqueFontIdentifier': f'{FAMILIA} Regular', 'fullName': f'{FAMILIA} Regular',
                   'psName': FAMILIA.replace(' ', '') + '-Regular', 'version': 'Version 0.1', 'copyright': 'Grupo Mazi. Dibujo de la artista de Grupo Mazi, 2026.'})
fb.setupOS2(sTypoAscender=ASC, sTypoDescender=DESC, usWinAscent=ASC, usWinDescent=-DESC, sCapHeight=CAP, sxHeight=CAP, achVendID='MAZI')
fb.setupPost()
fb.font.save(AQUI / f'{NOMBRE}.ttf')
f = TTFont(AQUI / f'{NOMBRE}.ttf'); f.flavor = 'woff2'; f.save(AQUI / f'{NOMBRE}.woff2')
(AQUI / f'{NOMBRE}.css').write_text(f"@font-face{{ font-family:'{FAMILIA}'; src:url('{NOMBRE}.woff2') format('woff2'), url('{NOMBRE}.ttf') format('truetype'); font-display:swap }}\n")
(AQUI / 'glifos.json').write_text(json.dumps({'alto_mayus_px': alto_mayus, 'escala': esc, 'glifos': glifos}, ensure_ascii=False, indent=1))
print(f'{len(glifos)} dibujados + {len(ACENTOS)} con acento · mayúscula {alto_mayus:.0f} px → {CAP} unidades')
