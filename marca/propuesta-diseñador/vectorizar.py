"""LA PROPUESTA DEL DISEÑADOR, EN VECTOR (Carlos, 29 de octubre: «vectoriza y maybe hazlo un poco más
género neutro»). Del boceto (boceto-original.jpg, líneas finas en un JPG de 949 px) saca:
  · fiel.svg    — el boceto tal cual, limpio: todas las líneas, con el grosor parejo.
  · neutra.svg  — la misma paloma, estrella y cola, con la línea un poco más firme, y las letras
                  rehechas en Cinzel (SIL OFL) sin los rizos de la M y de la I.
  · simplificada.svg — lo mismo, más simple (Carlos: «maybe simplificado un poco»): las mismas líneas
                  sin las plumas cortas de adentro, letras sólidas y estrellas limpias. (Se probó rellenar
                  las siluetas: la cabeza se volvía un bloque y las plumas parecían grietas.)
  · icono.svg   — para que se vea en chico: la A, la estrella y dos alas lisas (en tinta y en blanco
                  sobre morado oscuro, icono-oscuro.svg).
Corre con python3.13 (OpenCV y fontTools) y potrace:  python3.13 marca/propuesta-diseñador/vectorizar.py"""
import cv2, numpy as np, subprocess, re, os
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.varLib.instancer import instantiateVariableFont

AQUI = os.path.dirname(os.path.abspath(__file__))
K = 4                                                                  # se traza a 4 veces el tamaño
g = cv2.imread(os.path.join(AQUI, 'boceto-original.jpg'), 0).astype(np.float32)
H0, W0 = g.shape
# el fondo no es parejo (abajo se oscurece): se divide entre el fondo estimado
fondo = cv2.GaussianBlur(cv2.dilate(g, np.ones((15, 15))), (0, 0), 25)
n = np.clip(g / np.maximum(fondo, 1) * 255, 0, 255)
# las letras del boceto son de lápiz claro y la paloma y la cola de tinta: cada pieza conectada de la
# franja de las letras (y 505-748) se clasifica por qué tan oscuro es su centro
core = cv2.erode(n, np.ones((3, 3)))
y0, y1 = 505, 748
banda = (n < 228).astype(np.uint8); banda[:y0] = 0; banda[y1:] = 0
c, et, st, _ = cv2.connectedComponentsWithStats(banda, 8)
claras = np.zeros(c, bool)
for i in range(1, c):
    px = et == i
    claras[i] = np.mean(core[px] < 120) <= .25
letras_viejas = claras[et].astype(np.uint8)
grande = lambda m: cv2.resize(m, None, fx=K, fy=K, interpolation=cv2.INTER_NEAREST)
n = cv2.resize(n, None, fx=K, fy=K, interpolation=cv2.INTER_CUBIC)
linea = (n < 228).astype(np.uint8)
# lo que se deja: piezas de más de unos cuantos pixeles (el polvito del JPG fuera)
def limpia(m, minimo=60 * K):
    c, et, st, _ = cv2.connectedComponentsWithStats(m, 8)
    keep = np.zeros(c, bool); keep[1:] = st[1:, cv2.CC_STAT_AREA] >= minimo
    return keep[et].astype(np.uint8)
def engrosa(m, r):
    return cv2.dilate(m, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * r + 1, 2 * r + 1))) if r else m
sin_letras = limpia(linea & (1 - engrosa(grande(letras_viejas), 2 * K)))

def trazar(m, nombre):
    pbm = os.path.join(AQUI, nombre + '.pbm')
    cv2.imwrite(pbm.replace('.pbm', '.png'), (1 - m) * 255)
    subprocess.run(['convert', pbm.replace('.pbm', '.png'), pbm], check=True)
    svg = subprocess.run(['potrace', pbm, '-s', '-o', '-', '-t', str(8 * K), '-a', '1.1', '-O', '0.6', '--flat'], capture_output=True, text=True, check=True).stdout
    os.remove(pbm); os.remove(pbm.replace('.pbm', '.png'))
    d = ' '.join(re.findall(r' d="([^"]+)"', svg))
    t = re.search(r'<g transform="([^"]+)"', svg).group(1)
    return d, t

TINTA = '#17121D'
ancho, alto = W0 * K, H0 * K
def lienzo(cuerpo, titulo):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {ancho} {alto}" width="{W0}" height="{H0}">\n'
            f'<title>{titulo}</title>\n{cuerpo}\n</svg>\n')

# 1 · fiel: todas las líneas del boceto, con un pixel más de grosor para que no se rompan al achicar
# el lápiz claro de las letras se corta en tramos: un cierre chico une los huequitos sin juntar líneas vecinas
d, t = trazar(limpia(engrosa(cv2.morphologyEx(linea, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3 * K, 3 * K))), 1)), 'fiel')
open(os.path.join(AQUI, 'fiel.svg'), 'w').write(lienzo(f'<g transform="{t}" fill="{TINTA}"><path d="{d}"/></g>', 'Propuesta del diseñador · vector fiel'))

# 2 · neutra: la línea más firme (parejo, sin trazos de pluma) y letras clásicas sin rizos
d, t = trazar(limpia(engrosa(sin_letras, 3)), 'neutra')
f = instantiateVariableFont(TTFont('/tmp/claude-0/-home-user-mazi-central/617efe1d-4733-537e-8ae2-f3b050e50e7a/scratchpad/fuentes/Cinzel.ttf'), {'wght': 700})
gs, cmap = f.getGlyphSet(), f.getBestCmap()
cap = f['OS/2'].sCapHeight
# las letras ocupan lo mismo que en el boceto: de x 150 a 800 y de y 520 a 700 (alto de mayúscula 180)
alto_m = 150 * K; k = alto_m / cap; ancho_letras = sum(gs[cmap[ord(ch)]].width for ch in 'MAZI') * k
esp = 14 * K; total = ancho_letras + esp * 3
x = (ancho - total) / 2; base = 690 * K
letras = []; centros = []
for ch in 'MAZI':
    gl = gs[cmap[ord(ch)]]; p = SVGPathPen(gs); gl.draw(TransformPen(p, (k, 0, 0, -k, x, base)))
    letras.append(p.getCommands()); centros.append(x + gl.width * k / 2); x += gl.width * k + esp
# una estrella de cuatro puntas, como la de arriba, entre la A y la cola
def estrella(cx, cy, r, fino):
    pts = []
    for i in range(8):
        a = i * np.pi / 4 - np.pi / 2; rr = r if i % 2 == 0 else r * fino
        pts.append(f'{cx + np.cos(a) * rr:.1f},{cy + np.sin(a) * rr:.1f}')
    return 'M' + ' L'.join(pts) + 'Z'
cuerpo = (f'<g transform="{t}" fill="{TINTA}"><path d="{d}"/></g>\n'
          f'<g fill="#FFFFFF" stroke="{TINTA}" stroke-width="{8 * K}" stroke-linejoin="round" paint-order="stroke">' +
          ''.join(f'<path d="{l}"/>' for l in letras) + '</g>\n'
          f'<path d="{estrella(centros[1], base - alto_m * .17, 28 * K, .17)}" fill="{TINTA}"/>')
open(os.path.join(AQUI, 'neutra.svg'), 'w').write(lienzo(cuerpo, 'Propuesta del diseñador · versión neutra'))

# 3 · simplificada: siluetas rellenas. El cuerpo no tiene línea de abajo en el boceto: se cierra
base_s = sin_letras.copy()   # con un pecho redondo, no una raya: con la raya quedaba un bloque
cv2.ellipse(base_s, (527 * K, 452 * K), (79 * K, 40 * K), 0, 0, 180, 1, 3 * K)
cerrada = cv2.morphologyEx(base_s, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (24 * K + 1, 24 * K + 1)))
ff = cerrada * 255; cv2.floodFill(ff, np.zeros((alto + 2, ancho + 2), np.uint8), (0, 0), 128)
sil = (ff != 128).astype(np.uint8)
# la estrella del boceto tiembla: se quita y va una limpia (es la pieza de x 416-525, y 141-337)
sil[135 * K:345 * K, 410 * K:530 * K] = 0
# las plumas: las líneas que quedan ADENTRO de la silueta, más delgadas, se vuelven blancas
dentro_s = cv2.erode(sil, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (12 * K + 1, 12 * K + 1)))
plumas = cv2.erode(sin_letras, np.ones((K, K), np.uint8)) & dentro_s
# simplificar es quitar: de las líneas de adentro se van las cortas; el contorno y las largas se quedan
cortas = plumas & (1 - limpia(plumas, 1400 * K))
cortas[:, 425 * K:645 * K] = 0                                         # el cuerpo, la cabeza y el ojo no se tocan: sólo plumas de las alas y la cola
tinta_s = limpia(engrosa(sin_letras & (1 - engrosa(cortas, K)), 3), 300 * K)
tinta_s[135 * K:345 * K, 410 * K:530 * K] = 0                          # la estrella va limpia aparte
d3, t3 = trazar(tinta_s, 'simple')
def estrella2(cx, cy, rv, rh, fino):
    pts = []
    for i in range(8):
        a = i * np.pi / 4 - np.pi / 2; r = (rv if i % 4 == 0 else rh) if i % 2 == 0 else min(rv, rh) * fino
        pts.append(f'{cx + np.cos(a) * r:.1f},{cy + np.sin(a) * r:.1f}')
    return 'M' + ' L'.join(pts) + 'Z'
cuerpo3 = (f'<g transform="{t3}" fill="{TINTA}"><path d="{d3}"/></g>\n'
           f'<path d="{estrella2(470 * K, 240 * K, 98 * K, 56 * K, .13)}" fill="{TINTA}"/>\n'
           f'<g fill="{TINTA}">' + ''.join(f'<path d="{l}"/>' for l in letras) + '</g>\n'
           f'<path d="{estrella(centros[1], base - alto_m * .17, 28 * K, .17)}" fill="{TINTA}"/>')
open(os.path.join(AQUI, 'simplificada.svg'), 'w').write(lienzo(cuerpo3, 'Propuesta del diseñador · simplificada'))

# 4 · icono: la A sólida, la estrella encima y dos alas lisas (la silueta del ala del boceto, sin plumas
# y suavizada), en un cuadro
c_, et_, st_, _ = cv2.connectedComponentsWithStats(sil, 8)
alas = (et_ == np.argmax(np.where(np.arange(c_) == 0, 0, st_[:, cv2.CC_STAT_AREA]))).astype(np.uint8)
izq = alas.copy(); izq[:, 452 * K:] = 0                                 # sólo el ala izquierda; la derecha es su espejo
izq = (cv2.GaussianBlur(izq.astype(np.float32), (0, 0), 13 * K) > .5).astype(np.uint8)   # lisa: en chico no se leen las plumas
ys, xs = np.nonzero(izq); x0, x1, y0a, y1a = xs.min(), xs.max(), ys.min(), ys.max()
izq = izq[y0a:y1a + 1, x0:x1 + 1]
L = 1000                                                               # el icono vive en un cuadro de 1000
gA = gs[cmap[ord('A')]]; kA = 560 / cap
pa = SVGPathPen(gs); wA = gA.width * kA; gA.draw(TransformPen(pa, (kA, 0, 0, -kA, (L - wA) / 2, 800)))
esc = 430 / izq.shape[1]                                               # cada ala, 430 de ancho
ala_png = cv2.resize(izq, None, fx=esc, fy=esc, interpolation=cv2.INTER_AREA)
lienzo_i = np.zeros((L, L), np.uint8)
hA = ala_png.shape[0]; ya = 230
xi = 500 - 120 - ala_png.shape[1]                                      # el ala sale de detrás de la A
lienzo_i[ya:ya + hA, max(0, xi + 60):xi + 60 + ala_png.shape[1]] |= ala_png[:, max(0, -(xi + 60)):]
lienzo_i[:, 395:605] = 0                                             # que el ala no se asome dentro de la A
lienzo_i |= lienzo_i[:, ::-1]
pbm_png = os.path.join(AQUI, 'ala.png'); cv2.imwrite(pbm_png, (1 - lienzo_i) * 255)
subprocess.run(['convert', pbm_png, pbm_png.replace('.png', '.pbm')], check=True)
svg_a = subprocess.run(['potrace', pbm_png.replace('.png', '.pbm'), '-s', '-o', '-', '-t', '20', '-a', '1.3', '--flat'], capture_output=True, text=True, check=True).stdout
os.remove(pbm_png); os.remove(pbm_png.replace('.png', '.pbm'))
da = ' '.join(re.findall(r' d="([^"]+)"', svg_a)); ta = re.search(r'<g transform="([^"]+)"', svg_a).group(1)
def icono(fondo, tinta, nombre, titulo):
    cuerpo = ((f'<rect width="{L}" height="{L}" rx="{L * .22:.0f}" fill="{fondo}"/>\n' if fondo else '') +
              f'<g transform="{ta}" fill="{tinta}"><path d="{da}"/></g>\n'
              f'<path d="{pa.getCommands()}" fill="{tinta}" stroke="{fondo or "#FFFFFF"}" stroke-width="22" paint-order="stroke"/>\n'
              f'<path d="{estrella2(L / 2, 150, 120, 66, .13)}" fill="{tinta}"/>')
    open(os.path.join(AQUI, nombre), 'w').write(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {L} {L}" width="512" height="512">\n<title>{titulo}</title>\n{cuerpo}\n</svg>\n')
icono(None, TINTA, 'icono.svg', 'Propuesta del diseñador · ícono')
icono('#170A26', '#F4EEF2', 'icono-oscuro.svg', 'Propuesta del diseñador · ícono en oscuro')
print('✓ fiel, neutra, simplificada e icono')
