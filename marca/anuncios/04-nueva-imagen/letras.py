"""Saca de Space Grotesk Bold (SIL OFL) el contorno de cada letra como ruta SVG, en unidades de 100
de alto de mayúscula, para extruirlas en 3D en el anuncio 04. Corre con python3.13 (fontTools).
  python3.13 marca/anuncios/04-nueva-imagen/letras.py"""
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.varLib.instancer import instantiateVariableFont
import json, os
TTF = '/tmp/claude-0/-home-user-mazi-central/617efe1d-4733-537e-8ae2-f3b050e50e7a/scratchpad/fuentes/SpaceGrotesk.ttf'
f = instantiateVariableFont(TTFont(TTF), {'wght': 700})
cap = f['OS/2'].sCapHeight; k = 100 / cap
gs = f.getGlyphSet(); cmap = f.getBestCmap()
out = {}
for ch in 'ABCDEFGHIJKLMNÑOPQRSTUVWXYZabcdefghijklmnñopqrstuvwxyz0123456789¿?¡!&@#$%':
    n = cmap.get(ord(ch))
    if not n: continue
    p = SVGPathPen(gs); gs[n].draw(TransformPen(p, (k, 0, 0, -k, 0, 0)))
    out[ch] = { 'd': p.getCommands(), 'w': round(gs[n].width * k, 2) }
dst = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'letras.js')
open(dst, 'w').write('/* sale de letras.py: Space Grotesk Bold (SIL Open Font License), 100 = alto de mayúscula */\nexport const LETRAS = ' + json.dumps(out, ensure_ascii=False) + ';\n')
print(len(out), 'letras →', dst, os.path.getsize(dst))
