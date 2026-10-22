"""Arma smileys/index.html desde scripts/fuente.html.

  python3 smileys/scripts/armar.py
  SMILEYS_URL=https://<sitio final>/smileys/ python3 smileys/scripts/armar.py   ← para publicar

Mete en la página, como símbolos SVG, el logo y la sonrisa trazados de la foto de la caja
(img/logo.svg, img/sonrisa.svg), y los pinceles del armador de la versión de Godines
(anterior.html, de «var ETIQUETAS» hasta el final de dibujarMia). Así la página es un solo
archivo con sus imágenes al lado, y lo trazado se cambia en un lugar.
"""
import re
from pathlib import Path

AQUI = Path(__file__).resolve().parent.parent


def simbolo(nombre, quitar_arriba=None):
    svg = (AQUI / 'img' / nombre).read_text()
    vb = re.search(r'viewBox="([^"]+)"', svg).group(1)
    g = re.search(r'(<g[^>]*>.*</g>)', svg, re.S).group(1)
    if quitar_arriba is not None:
        # potrace deja una astilla de las letras de arriba: se tira todo trazo que empieza ahí
        def filtra(m):
            y = float(m.group(2))
            return '' if y > quitar_arriba else m.group(0)
        g = re.sub(r'<path d="M(\d+) (\d+)[^"]*"/>', filtra, g, flags=re.S)
    return vb, re.sub(r'\s+', ' ', g)


def pinceles():
    vieja = (AQUI / 'anterior.html').read_text()
    ini = vieja.index('var ETIQUETAS = {')
    fin_fn = vieja.index('function dibujarMia(){')
    fin = vieja.index('\n}\n', fin_fn) + 3
    return vieja[ini:fin]


fuente = (AQUI / 'scripts' / 'fuente.html').read_text()
lvb, lg = simbolo('logo.svg')
svb, sg = simbolo('sonrisa.svg', quitar_arriba=1450)
pagina = (fuente.replace('@@LOGO_VB@@', lvb).replace('@@LOGO@@', lg)
                .replace('@@SONRISA_VB@@', svb).replace('@@SONRISA@@', sg)
                .replace('@@PINCELES@@', pinceles()))
# el <svg> que usa un símbolo necesita la misma proporción, o el navegador le da 150 px de alto
pagina = re.sub(r'<svg([^>]*)><use href="#logo"/>', lambda m: f'<svg viewBox="{lvb}"{m.group(1)}><use href="#logo"/>', pagina)
pagina = re.sub(r'<svg([^>]*)><use href="#sonrisa"/>', lambda m: f'<svg viewBox="{svb}"{m.group(1)}><use href="#sonrisa"/>', pagina)
# WhatsApp y Facebook sólo leen la imagen de compartir con la dirección COMPLETA. Al publicar en
# el sitio final: SMILEYS_URL=https://<sitio>/smileys/ python3 smileys/scripts/armar.py
import os
url = os.environ.get('SMILEYS_URL', '').strip()
if url and not url.endswith('/'):
    url += '/'
if not url:
    print('⚠ sin SMILEYS_URL: la imagen de compartir queda con dirección relativa (WhatsApp no la va a enseñar)')
pagina = pagina.replace('@@URL@@', url)
assert '@@' not in pagina, 'quedó un hueco sin llenar'
(AQUI / 'index.html').write_text(pagina)

# favicon: la sonrisa en blanco sobre el rojo de la marca
w, h = (float(x) for x in svb.split()[2:])
lado = w * 1.25
(AQUI / 'img' / 'favicon.svg').write_text(
    f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {lado:.0f} {lado:.0f}">'
    f'<rect width="{lado:.0f}" height="{lado:.0f}" rx="{lado*.22:.0f}" fill="#E3262B"/>'
    f'<g transform="translate({(lado-w)/2:.0f} {(lado-h)/2:.0f})" color="#fff">{sg}</g></svg>')
print('✓ index.html', len(pagina) // 1024, 'KB')
