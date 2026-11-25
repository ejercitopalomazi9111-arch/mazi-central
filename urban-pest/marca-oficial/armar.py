"""Del logo vector del cliente (logo-vector.pdf, Illustrator 2015; llegó por Carlos el 18 nov) salen:
  logo.svg                  el logo entero en vector, recortado a su caja
  ../web/img/logo.webp      el horizontal (símbolo + letras) a 2240×480, para fondos claros: el pie de la
                            página, la cotización y la carpeta. Antes salía de una imagen de 512 px y se veía borroso.
Es el MISMO dibujo, sólo reacomodado de vertical a horizontal, como ya estaba el anterior.
    python3 -I urban-pest/marca-oficial/armar.py"""
from pathlib import Path
import subprocess, tempfile
import numpy as np
from PIL import Image
AQUI = Path(__file__).resolve().parent
PDF = AQUI / 'logo-vector.pdf'
tmp = Path(tempfile.mkdtemp())
subprocess.run(['pdftocairo', '-png', '-r', '600', '-transp', '-singlefile', str(PDF), str(tmp / 'alta')], check=True)
subprocess.run(['pdftocairo', '-svg', str(PDF), str(tmp / 'logo.svg')], check=True)
im = Image.open(tmp / 'alta.png').convert('RGBA')
a = np.array(im)[..., 3]
ys, xs = np.where(a > 0)
# el SVG, recortado a la caja del dibujo (600 ppp → puntos: /600*72)
k = 72 / 600
x0, y0, x1, y1 = xs.min() * k, ys.min() * k, (xs.max() + 1) * k, (ys.max() + 1) * k
svg = (tmp / 'logo.svg').read_text()
import re
svg = re.sub(r'width="[^"]+pt" height="[^"]+pt" viewBox="[^"]+"', f'width="{x1 - x0:.1f}pt" height="{y1 - y0:.1f}pt" viewBox="{x0:.2f} {y0:.2f} {x1 - x0:.2f} {y1 - y0:.2f}"', svg, count=1)
(AQUI / 'logo.svg').write_text(svg)
# el símbolo y las letras: el renglón vacío más grande entre los dos parte la imagen
filas = np.where((a > 0).any(axis=1))[0]
saltos = np.diff(filas)
corte = filas[np.argmax(saltos)] + saltos.max() // 2
def caja(img):
    b = np.array(img)[..., 3]; yy, xx = np.where(b > 0)
    return img.crop((xx.min(), yy.min(), xx.max() + 1, yy.max() + 1))
simbolo = caja(im.crop((0, 0, im.width, corte)))
letras = caja(im.crop((0, corte, im.width, im.height)))
W, H, M = 2240, 480, 6
s = simbolo.resize((round(simbolo.width * (H - 2 * M) / simbolo.height), H - 2 * M), Image.LANCZOS)
hueco = 56
alto_letras = round(H * .64)
l = letras.resize((round(letras.width * alto_letras / letras.height), alto_letras), Image.LANCZOS)
if s.width + hueco + l.width > W - 2 * M:
    f = (W - 2 * M - s.width - hueco) / l.width
    l = l.resize((round(l.width * f), round(l.height * f)), Image.LANCZOS)
lienzo = Image.new('RGBA', (W, H), (0, 0, 0, 0))
x = (W - (s.width + hueco + l.width)) // 2
lienzo.alpha_composite(s, (x, M))
lienzo.alpha_composite(l, (x + s.width + hueco, (H - l.height) // 2))
lienzo.save(AQUI.parent / 'web' / 'img' / 'logo.webp', 'WEBP', quality=92, method=6)
print('símbolo', simbolo.size, 'letras', letras.size, '→ logo.webp', lienzo.size, 'contenido', s.width + hueco + l.width)
