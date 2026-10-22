"""Recorta los ingredientes de «Ármala tú» de fotos reales y los junta en una tira por ingrediente.

  python3.13 smileys/scripts/ingredientes.py <carpeta-de-fotos>

Las fotos fuente (Unsplash y Pexels, licencia libre) NO se suben al repo: pesan y no hacen
falta. Lo que se sube es lo recortado: img/armar/<ingrediente>.webp más img/armar/piezas.json
con dónde está cada pieza en su tira. De dónde sale cada una, en FUENTES abajo.

Tres maneras de recortar:
  · circulo  un disco un poco más chico que la pieza (pepperoni, salami, jalapeño horneado)
  · rembg    se le quita el fondo a un recorte y se queda la mancha del centro
  · parche   se estampa una forma (cubo, migaja, mancha) sobre una textura (piña, carne, atún)
Todas salen ya al tamaño de un lienzo de 1040 px (la pizza mide 978 px de ancho ahí).
"""
import json, sys, math, random
from pathlib import Path
import numpy as np
from PIL import Image, ImageFilter, ImageEnhance
from scipy import ndimage as nd

FOTOS = Path(sys.argv[1] if len(sys.argv) > 1 else '/tmp/claude-0/fuentes')
AQUI = Path(__file__).resolve().parent.parent
SALIDA = AQUI / 'img' / 'armar'
_ses = None
def rembg_mascara(im):
    global _ses
    from rembg import remove, new_session
    if _ses is None: _ses = new_session('isnet-general-use')
    return np.asarray(remove(im, session=_ses, only_mask=True)).astype(float) / 255

def abrir(nombre, ancho=1600):
    im = Image.open(FOTOS / nombre).convert('RGB')
    return im.resize((ancho, round(im.height * ancho / im.width)), Image.LANCZOS) if im.width != ancho else im

def borde(rgba, oscuro=.28, brillo=.12):
    """Le da grueso a una pieza: se oscurece en la orilla y se aclara arriba a la izquierda."""
    a = np.asarray(rgba).astype(float)
    al = a[..., 3] / 255
    d = nd.distance_transform_edt(al > .5)
    w = max(3, min(al.shape) * .07)
    sombra = 1 - oscuro * np.clip(1 - d / w, 0, 1) ** 1.5
    h, wd = al.shape
    yy, xx = np.mgrid[0:h, 0:wd]
    luz = 1 + brillo * np.clip(1 - np.hypot(xx - wd * .3, yy - h * .28) / (max(h, wd) * .55), 0, 1)
    a[..., :3] = np.clip(a[..., :3] * (sombra * luz)[..., None], 0, 255)
    return Image.fromarray(a.astype(np.uint8), 'RGBA')

def recortar_alfa(rgba):
    bb = rgba.getchannel('A').point(lambda v: 255 if v > 8 else 0).getbbox()
    return rgba.crop(bb) if bb else rgba

def a_tamano(p, lado):
    p = recortar_alfa(p)
    k = lado / max(p.size)
    return p.resize((max(1, round(p.width * k)), max(1, round(p.height * k))), Image.LANCZOS)

def circulo(im, x, y, r, pluma=2.5):
    c = im.crop((x - r - 4, y - r - 4, x + r + 4, y + r + 4)).convert('RGBA')
    m = Image.new('L', c.size, 0)
    yy, xx = np.mgrid[0:c.height, 0:c.width]
    d = np.hypot(xx - (r + 4), yy - (r + 4))
    m = Image.fromarray((np.clip((r - d) / pluma + .5, 0, 1) * 255).astype(np.uint8))
    c.putalpha(m); return c

def por_rembg(im, x, y, r):
    b = int(r * 1.6)
    c = im.crop((x - b, y - b, x + b, y + b))
    m = rembg_mascara(c)
    lab, n = nd.label(m > .5)
    if n == 0: return None
    centro = lab[b, b] or (np.bincount(lab.ravel())[1:].argmax() + 1)
    k = nd.binary_dilation(lab == centro, iterations=2)
    c = c.convert('RGBA'); c.putalpha(Image.fromarray((m * k * 255).astype(np.uint8)))
    return c

def por_color(im, x, y, r, pred, pluma=1.2):
    c = im.crop((x - r, y - r, x + r, y + r))
    a = np.asarray(c).astype(float)
    m = pred(a)
    m = nd.binary_opening(m, iterations=1); m = nd.binary_fill_holes(nd.binary_closing(m, iterations=2))
    lab, n = nd.label(m)
    if n == 0: return None
    centro = lab[r, r] or (np.bincount(lab.ravel())[1:].argmax() + 1)
    k = nd.gaussian_filter((lab == centro).astype(float), pluma)
    c = c.convert('RGBA'); c.putalpha(Image.fromarray((np.clip(k * 1.6 - .3, 0, 1) * 255).astype(np.uint8)))
    return c

def forma(tipo, lado, rnd):
    """Máscara de una forma para estampar sobre una textura."""
    n = lado * 2
    yy, xx = np.mgrid[0:n, 0:n] - n / 2
    t = np.arctan2(yy, xx); d = np.hypot(xx, yy)
    ondas = sum(math.sin(0) for _ in range(0))
    if tipo in ('tira', 'luna'):
        g = rnd.uniform(0, math.pi)
        u = xx * math.cos(g) + yy * math.sin(g); v = -xx * math.sin(g) + yy * math.cos(g)
        R = lado * (1.6 if tipo == 'tira' else 1.1)          # el arco: centro fuera de la pieza
        dist = np.hypot(u, v + R)
        grueso = lado * (.15 if tipo == 'tira' else .3)
        largo = np.abs(np.arctan2(u, v + R)) < (lado * .85 / R)
        m = (np.abs(dist - R) < grueso * (1 - (np.abs(np.arctan2(u, v + R)) / (lado * .85 / R)) ** 4 * (.9 if tipo == 'luna' else .3))) & largo
    elif tipo == 'cubo':
        g = rnd.uniform(0, math.pi)
        u = xx * math.cos(g) + yy * math.sin(g); v = -xx * math.sin(g) + yy * math.cos(g)
        a, b = lado * rnd.uniform(.42, .5), lado * rnd.uniform(.36, .46)
        q = np.maximum(np.abs(u) - a + lado * .12, 0) ** 2 + np.maximum(np.abs(v) - b + lado * .12, 0) ** 2
        m = np.sqrt(q) < lado * .12
    else:
        r = lado * (.5 if tipo == 'mancha' else .42)
        amp = .1 if tipo == 'mancha' else .16
        rr = r * (1 + amp * (np.sin(t * rnd.randint(2, 3) + rnd.uniform(0, 6)) * .6 + np.sin(t * rnd.randint(3, 5) + rnd.uniform(0, 6)) * .3 + np.sin(t * rnd.randint(7, 11) + rnd.uniform(0, 6)) * .15))
        m = d < rr
    m = nd.gaussian_filter(m.astype(float), 1.1)
    return Image.fromarray((m * 255).astype(np.uint8))

def parche(im, x, y, tipo, lado, rnd):
    c = im.crop((x - lado, y - lado, x + lado, y + lado)).convert('RGBA')
    c.putalpha(forma(tipo, lado, rnd)); return c

def tono(p, sat=1.0, brillo=1.0, mezcla=None):
    rgb = p.convert('RGB')
    if sat != 1: rgb = ImageEnhance.Color(rgb).enhance(sat)
    if brillo != 1: rgb = ImageEnhance.Brightness(rgb).enhance(brillo)
    if mezcla:   # empuja hacia un color (para pastor y chilorio, que salen de otra carne)
        col, k = mezcla
        a = np.asarray(rgb).astype(float); lum = a.mean(-1, keepdims=True) / 128
        a = a * (1 - k) + np.array(col)[None, None, :] * lum * k
        rgb = Image.fromarray(np.clip(a, 0, 255).astype(np.uint8))
    rgb.putalpha(p.getchannel('A')); return rgb

PEP = 'pepperoni-arriba.jpg'      # Unsplash 1628840042765 · pepperoni, jamón y salchicha horneados
SUP = 'pizza-suprema.jpg'         # Pexels 803290 · salami, jalapeño, elote y champiñón horneados
BASE = 'pizza-queso.jpg'          # Unsplash 1732223229355 · la base de queso

def rojo(a):
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    return (r > 120) & (r > g * 1.5) & (r > b * 1.35)
def cafe(a):   # la salchicha desmoronada: más oscura que el queso y menos roja que el pepperoni
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    return (a.mean(-1) < 135) & (g > r * .42) & (r < 200)
def verde(a):
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    return (g > r * 1.08) & (g > b * 1.1) & (g > 70)

def fuentes():
    pep = abrir(PEP); sup = abrir(SUP); rnd = random.Random(7)
    S = {}
    S['pepperoni'] = [tono(circulo(pep, x, y, r), .85) for x, y, r in
        [(893, 240, 52), (1328, 580, 55), (1165, 680, 55), (636, 447, 52), (413, 555, 55), (268, 585, 50),
         (430, 855, 52), (1040, 990, 52), (522, 1105, 52), (655, 1330, 50), (275, 1065, 52), (1355, 862, 52)]]
    S['jamon'] = [tono(parche(pep, x, y, 'mancha', l, rnd), .8, 1.04) for x, y, l in
        [(1155, 855, 62), (205, 695, 62), (712, 1030, 62), (1040, 600, 55), (630, 800, 52), (210, 930, 55)]]
    migas = [(628, 228), (395, 330), (840, 445), (478, 565), (660, 600), (427, 722), (290, 742), (820, 670),
             (1048, 540), (1137, 505), (1268, 632), (1075, 712), (545, 855), (305, 880), (655, 915), (450, 1035),
             (612, 1080), (225, 1075), (1043, 1110), (1268, 1025), (898, 1045), (728, 1150)]
    crudas = [p for p in (por_color(pep, x, y, 30, cafe) for x, y in migas) if p and np.asarray(p.getchannel('A'))[[0, -1], :].max() < 60]
    S['chorizo'] = [tono(p, 1.25, .92, ((150, 40, 20), .35)) for p in crudas]

    S['salchicha'] = [tono(circulo(sup, x, y, r), .9, 1.05) for x, y, r in [(930, 1060, 46), (510, 1232, 60), (728, 1330, 52)]]
    jr = abrir('jalapeno-4.jpg')
    m = verde(np.asarray(jr).astype(float)); m = nd.binary_fill_holes(nd.binary_closing(nd.binary_opening(m, iterations=2), iterations=2))
    lab, n = nd.label(m); S['jalapeno'] = []
    for i, sl in enumerate(nd.find_objects(lab)):
        k = lab[sl] == i + 1; h, w = k.shape
        if not (6000 < k.sum() < 60000) or not (.7 < h / w < 1.4) or k.sum() / (h * w) < .6: continue   # sólo las rodajas redondas
        c = jr.crop((sl[1].start, sl[0].start, sl[1].stop, sl[0].stop)).convert('RGBA')
        c.putalpha(Image.fromarray((nd.gaussian_filter(k.astype(float), 1.2) * 255).astype(np.uint8)))
        S['jalapeno'].append(tono(c, .95, .92))
    S['pimiento'] = [tono(parche(jr, x, y, 'tira', 70, rnd), 1.4, 2.3) for x, y in [(1400, 140), (1450, 200), (1380, 230), (1480, 120), (1420, 180)]]
    elo = abrir('elote-12.jpg'); re_ = random.Random(4)
    S['elote'] = [parche(elo, re_.randint(300, 1300), re_.randint(330, 650), 'mancha', 16, re_) for _ in range(10)]
    ch = abrir('champinon-3.jpg').crop((780, 380, 1590, 900))      # la rebanada de enfrente
    m = rembg_mascara(ch); lab, n = nd.label(m > .5)
    k = lab == (np.bincount(lab.ravel())[1:].argmax() + 1)
    k &= np.mgrid[0:k.shape[0], 0:k.shape[1]][1] > 25                 # fuera las de atrás
    ch = ch.convert('RGBA'); ch.putalpha(Image.fromarray((m * nd.binary_dilation(k, iterations=2) * 255).astype(np.uint8)))
    espejo = ch.transpose(Image.FLIP_LEFT_RIGHT)
    S['champinon'] = [ch, espejo, tono(ch, 1.1, .9, ((150, 110, 60), .15)), tono(espejo, 1.0, 1.05)]

    jit = None
    jit = abrir('jitomate-7.jpg'); jit4 = abrir('jitomate-4.jpg')
    S['jitomate'] = [p for p in (por_rembg(jit, 820, 800, 280), por_rembg(jit4, 790, 800, 230)) if p]
    ceb = abrir('cebolla-1.jpg')
    m = rembg_mascara(ceb); lab, n = nd.label(m > .5)
    anillos = []
    for i, sl in enumerate(nd.find_objects(lab)):
        k = lab[sl] == i + 1
        if k.sum() < 3000: continue
        c = ceb.crop((sl[1].start, sl[0].start, sl[1].stop, sl[0].stop)).convert('RGBA')
        c.putalpha(Image.fromarray((m[sl] * nd.binary_dilation(k, iterations=2) * 255).astype(np.uint8)))
        # sólo los aros: lo que tiene hueco en medio
        if (nd.binary_fill_holes(k).sum() - k.sum()) / k.sum() > .15: anillos.append(c)
    S['cebolla'] = anillos
    jr = abrir('jalapeno-4.jpg')
    agu = abrir('aguacate-7.jpg')
    def aguac(a):
        r, g, b = a[..., 0], a[..., 1], a[..., 2]
        return (g > b * 1.25) & (g > 120) & (r > 90)
    m = aguac(np.asarray(agu.crop((480, 270, 1140, 890))).astype(float))
    m = nd.binary_opening(m, iterations=3); lab, n = nd.label(m)
    tajadas = []
    base_c = agu.crop((480, 270, 1140, 890))
    for i, sl in enumerate(nd.find_objects(lab)):
        k = lab[sl] == i + 1
        if k.sum() < 4000: continue
        c = base_c.crop((sl[1].start, sl[0].start, sl[1].stop, sl[0].stop)).convert('RGBA')
        c.putalpha(Image.fromarray((nd.gaussian_filter(k.astype(float), 1.2) * 255).astype(np.uint8)))
        tajadas.append(c)
    ra2 = random.Random(2)
    S['aguacate'] = []
    for x, y in [(700, 560), (760, 640), (650, 700), (820, 560), (720, 480)]:
        p = parche(agu, x, y, 'luna', 70, ra2)
        a = np.asarray(p).astype(float); al = a[..., 3] / 255
        d = nd.distance_transform_edt(al > .5)
        piel = (d < 4) & (al > .3)
        a[piel, :3] = a[piel, :3] * .35 + np.array([40, 70, 25]) * .65
        S['aguacate'].append(Image.fromarray(a.astype(np.uint8), 'RGBA'))
    cil = abrir('cilantro-1.jpg')
    hoja = por_rembg(cil, 760, 460, 330)
    S['cilantro'] = [hoja] if hoja else []

    pina = abrir('pina-8.jpg'); rp = random.Random(3)
    S['pina'] = [p for p in (parche(pina, rp.randint(150, 1450), rp.randint(150, 900), 'cubo', 62, rp) for _ in range(14)) if np.asarray(p.convert('L')).mean() > 95][:8]
    atun = abrir('atun-3.jpg'); ra = random.Random(5)
    S['atun'] = [tono(parche(atun, ra.randint(480, 1150), ra.randint(420, 680), 'migaja', 46, ra), .85, 1.08) for _ in range(8)]
    chil = abrir('chilorio-2.jpg'); rc = random.Random(9)
    S['chilorio'] = [tono(parche(atun, rc.randint(480, 1150), rc.randint(420, 680), 'migaja', 46, rc), 1.5, .62, ((110, 25, 10), .55)) for _ in range(8)]
    S['pastor'] = [tono(parche(chil, rc.randint(150, 950), rc.randint(1400, 1700), 'cubo', 40, rc), 1.6, 1.0, ((200, 70, 25), .55)) for _ in range(10)]
    base = abrir(BASE, 2400); rq = random.Random(11)
    S['queso'] = []
    return S

TAMANO = {  # lado mayor de cada pieza, en el lienzo de 1040
 'pepperoni': 80, 'jamon': 74, 'chorizo': 40, 'pastor': 48, 'salchicha': 74, 'jalapeno': 50, 'elote': 26,
 'champinon': 80, 'jitomate': 90, 'cebolla': 64, 'aguacate': 84, 'cilantro': 60, 'pina': 60, 'atun': 52,
 'chilorio': 48, 'queso': 84, 'pimiento': 70,
}

def base():
    """La pizza de queso sola, sin tabla ni papel: img/armar/base.webp"""
    im = Image.open(FOTOS / BASE).convert('RGB')
    cx, cy, R = 1208, 1775, 858; P = R + 70        # dónde está la pizza en la foto de 2400 px
    c = im.crop((cx - P, cy - P, cx + P, cy + P)).resize((1100, 1100), Image.LANCZOS)
    m = rembg_mascara(c)
    lab, n = nd.label(m > .5); k = lab == (np.bincount(lab.ravel())[1:].argmax() + 1)
    c = c.convert('RGBA'); c.putalpha(Image.fromarray((m * nd.binary_dilation(k, iterations=2) * 255).astype(np.uint8)))
    c.save(SALIDA / 'base.webp', quality=86, method=6)
    print('base', c.size)

def armar():
    SALIDA.mkdir(parents=True, exist_ok=True)
    base()
    S = fuentes()
    SALIDA.mkdir(parents=True, exist_ok=True)
    mapa = {}
    for k, piezas in S.items():
        piezas = [p for p in piezas if p is not None]
        if not piezas: print('· sin piezas:', k); continue
        piezas = [borde(a_tamano(p, TAMANO[k] * 2)) for p in piezas]   # al doble: se ven bien en pantallas de 3x
        alto = max(p.height for p in piezas) + 4
        ancho = sum(p.width + 4 for p in piezas)
        tira = Image.new('RGBA', (ancho, alto), (0, 0, 0, 0)); x = 0; rects = []
        for p in piezas:
            tira.paste(p, (x + 2, 2), p); rects.append([x + 2, 2, p.width, p.height]); x += p.width + 4
        tira.save(SALIDA / (k + '.webp'), quality=88, method=6)
        mapa[k] = rects
        print(k, len(piezas), tira.size)
    (SALIDA / 'piezas.json').write_text(json.dumps(mapa, separators=(',', ':')))

if __name__ == '__main__':
    armar()
