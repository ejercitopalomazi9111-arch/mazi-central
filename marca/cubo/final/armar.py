"""EL LOGO ELEGIDO (Carlos, 28 de octubre): fondo negro, «MAZI» en blanco con las letras juntas
(Space Grotesk Bold, como el 05) y el cubo oscuro con la cara de arriba morada. Las letras van
convertidas en trazos (fontTools) y juntas como en la hoja: cada una empieza donde acaba la tinta de
la anterior, encimada 3 % del tamaño de letra.
  · logo-negro.svg       el logo con su fondo negro
  · logo.svg             el mismo sin fondo (letra blanca, para fondos oscuros)
  · cubo.svg             el cubo solo
  · piezas.js            las mismas piezas para la animación (animacion.html)
Space Grotesk: SIL Open Font License (google/fonts). Corre con python3.13."""
import os, json, urllib.request
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.transformPen import TransformPen
TTF = '/tmp/claude-0/-home-user-mazi-central/617efe1d-4733-537e-8ae2-f3b050e50e7a/scratchpad/fuentes/SpaceGrotesk.ttf'
if not os.path.exists(TTF):
    os.makedirs(os.path.dirname(TTF), exist_ok=True)
    urllib.request.urlretrieve('https://raw.githubusercontent.com/google/fonts/main/ofl/spacegrotesk/SpaceGrotesk%5Bwght%5D.ttf', TTF)

COL = { 'fondo': '#0B0B0F', 'letra': '#FFFFFF', 'arriba': '#AC27FF', 'izq': '#34343D', 'der': '#52525D' }

def palabra(txt, peso, enc=.03, track=0):
    """las letras de txt juntas; sale (paths, ancho) en unidades donde la mayúscula mide 100 y la base es y = 0"""
    f = instantiateVariableFont(TTFont(TTF), {'wght': peso}); gs = f.getGlyphSet(); cmap = f.getBestCmap()
    s = 100 / f['OS/2'].sCapHeight; tam = f['head'].unitsPerEm * s; x = 0; ds = []
    for ch in txt:
        g = gs[cmap[ord(ch)]]; bp = BoundsPen(gs); g.draw(bp); x0, _, x1, _ = bp.bounds
        pen = SVGPathPen(gs); dx = x - x0 * s
        g.draw(TransformPen(pen, (s, 0, 0, -s, dx, 0))); ds.append(pen.getCommands())
        x = dx + x1 * s - tam * enc + track * tam
    return ds, x + tam * enc - track * tam

MAZI, ANCHO = palabra('MAZI', 700)
GRUPO, ANCHO_G = palabra('GRUPO', 500, enc=0, track=.42)

# ── el cubo, en la retícula isométrica de 100 × 110 (arriba 50,6 · hombros 8,30 y 92,30 · abajo 50,104)
CUBO = { 'arriba': 'M50 6 L92 30 L50 54 L8 30 Z', 'izq': 'M8 30 V80 L50 104 V54 Z', 'der': 'M92 30 V80 L50 104 V54 Z' }
# la M cubo: el cubo sin la cuña de abajo; sus patas acaban en el filo del cubo
M = { 'izq': 'M8 30 L50 54 V78 L28 61 V91.43 L8 80 Z', 'der': 'M92 30 L50 54 V78 L72 61 V91.43 L92 80 Z' }
CUNA = { 'izq': 'M28 61 L50 78 V104 L28 91.43 Z', 'der': 'M72 61 L50 78 V104 L72 91.43 Z' }      # el hueco entre las patas
def g_cubo(partes, extra=''):
    return ''.join(f'<path d="{d}" fill="{COL[k]}"/>' for k, d in partes.items()) + extra

def svg(vb, cuerpo, fondo=None):
    x, y, w, h = vb
    bg = f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="{fondo}"/>' if fondo else ''
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{x} {y} {w} {h}" width="{w * 4:.0f}" height="{h * 4:.0f}">{bg}{cuerpo}</svg>\n'

# el logo: el cubo del alto de la mayúscula, apoyado en la base, a 0.24 de mayúscula del nombre (como el 05)
k = 100 / 98                      # el cubo mide 98 de alto (6 a 104): a la altura de la mayúscula
cx = ANCHO + 24
# las cuatro letras en UN solo trazo: con un trazo por letra, donde se tocan sale una rayita de antialias
letras = f'<path fill="{COL["letra"]}" fill-rule="nonzero" d="{" ".join(MAZI)}"/>'
cubo = f'<g transform="translate({cx:.2f} {-100 - 6 * k:.2f}) scale({k:.4f})">{g_cubo(CUBO)}</g>'
ancho_total = cx + 84 * k + 8 * k
m = 40
vb = (-m, -100 - m, ancho_total + 2 * m - 8 * k, 100 + 2 * m)
open('logo-negro.svg', 'w').write(svg(vb, letras + cubo, COL['fondo']))
open('logo.svg', 'w').write(svg(vb, letras + cubo))
open('cubo.svg', 'w').write(svg((-4, 0, 108, 110), g_cubo(CUBO), COL['fondo']))
open('piezas.js', 'w').write('/* sale de armar.py: no se edita a mano */\nexport const PIEZAS = ' + json.dumps({
    'col': COL, 'mazi': MAZI, 'ancho': ANCHO, 'grupo': GRUPO, 'anchoGrupo': ANCHO_G,
    'cubo': CUBO, 'm': M, 'cuna': CUNA}, ensure_ascii=False) + ';\n')
print('✓ logo-negro.svg · logo.svg · cubo.svg · piezas.js', f'(MAZI mide {ANCHO:.1f} de ancho por 100 de alto)')
