"""ARMA EL LOGO COMPLETO tal como la referencia n.º 6 que mandó Carlos (28 de octubre): la paloma del
ala (ala.svg) y debajo «GRUPO» en gris y «MAZI» en negro, en Montserrat (medido: Bold para MAZI y
SemiBold para GRUPO; ver letra.mjs). Las letras van convertidas en trazos (fontTools) y cada una se
pone centrada donde está en la referencia, a la altura de la referencia. Salen:
  logo.svg            el logo entero, en el mismo lienzo y las mismas proporciones que la referencia
  logo-blanco.svg     para fondo oscuro
Montserrat: SIL Open Font License (google/fonts). Se baja sola si no está.
Corre con python3.13 (ahí están fontTools y OpenCV)."""
import os, re, subprocess, urllib.request
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.transformPen import TransformPen
TMP = '/tmp/claude-0/-home-user-mazi-central/617efe1d-4733-537e-8ae2-f3b050e50e7a/scratchpad/'
TTF = TMP + 'fuentes/Montserrat.ttf'
if not os.path.exists(TTF):
    os.makedirs(os.path.dirname(TTF), exist_ok=True)
    urllib.request.urlretrieve('https://raw.githubusercontent.com/google/fonts/main/ofl/montserrat/Montserrat%5Bwght%5D.ttf', TTF)

# colores medidos en la referencia
TINTA, GRIS = '#16181C', '#5A5A5C'
# dónde está cada letra en la referencia (caja x, y, ancho, alto, en pixeles de la captura de 1170 px)
GRUPO = [('G', 309, 1446, 60, 65), ('R', 442, 1447, 53, 62), ('U', 566, 1448, 58, 63), ('P', 697, 1447, 51, 60), ('O', 817, 1446, 68, 65)]
MAZI = [('M', 243, 1550, 157, 134), ('A', 488, 1550, 149, 134), ('Z', 720, 1550, 117, 134), ('I', 930, 1550, 30, 134)]
SIMBOLO = (134, 662)        # ala.svg está recortada de la captura en (134, 662)

def letras(fila, peso, alto_cap, base):
    f = instantiateVariableFont(TTFont(TTF), {'wght': peso})
    gs = f.getGlyphSet(); cmap = f.getBestCmap(); cap = f['OS/2'].sCapHeight
    s = alto_cap / cap; out = ''
    for ch, x, y, w, h in fila:
        g = gs[cmap[ord(ch)]]; bp = BoundsPen(gs); g.draw(bp); x0, y0, x1, y1 = bp.bounds
        cx = x + w / 2 - (x0 + x1) / 2 * s           # centrada donde está en la referencia
        pen = SVGPathPen(gs); g.draw(TransformPen(pen, (s, 0, 0, -s, cx, base)))
        out += f'<path d="{pen.getCommands()}"/>'
    return out

# MAZI: la base es el pie de las letras (1550 + 134); GRUPO: el pie de la R/U/P (sin el sobrante de G y O)
mazi = letras(MAZI, 700, 134, 1550 + 134)
grupo = letras(GRUPO, 600, 62, 1447 + 62)
ala = open('ala.svg').read()
ala_g = re.sub(r'^.*?<svg[^>]*>', '', ala, flags=re.S).replace('</svg>', '').strip()
X0, Y0, X1, Y1 = 110, 640, 1080, 1730             # el lienzo: el logo con su aire alrededor
def logo(tinta, gris, fondo=None):
    bg = f'<rect x="{X0}" y="{Y0}" width="{X1 - X0}" height="{Y1 - Y0}" fill="{fondo}"/>' if fondo else ''
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{X0} {Y0} {X1 - X0} {Y1 - Y0}" width="{X1 - X0}" height="{Y1 - Y0}">{bg}'
            f'<g transform="translate({SIMBOLO[0]} {SIMBOLO[1]})" fill="{tinta}" color="{tinta}">{ala_g}</g>'
            f'<g fill="{gris}">{grupo}</g><g fill="{tinta}">{mazi}</g></svg>\n')
open('logo.svg', 'w').write(logo(TINTA, GRIS))
open('logo-blanco.svg', 'w').write(logo('#FFFFFF', '#B9B9BC'))
print('✓ logo.svg y logo-blanco.svg')
