"""LA INSIGNIA DE RADIO DIVERGENTES, compuesta (no dibujada por un modelo).

El logo que ganó (octubre de 2026) llegó como una captura de 218 px. Aquí se
rehace en vector con sus mismas piezas —disco vino, aro crema, aro rojo, el
micrófono con su rejilla, las ondas a los lados, RADIO arriba, DIVERGENTES
abajo y PODCAST al pie— para que se vea nítido en la tele, en papel y en video.
Las letras salen de Montserrat (OFL, en fuente/) convertidas a trazos, así que
el SVG no depende de ninguna letra instalada.

    python3 podcast/marca/insignia.py      → radio-divergentes.svg y radio-divergentes-blanca.svg
"""
import math, os
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen

AQUI = os.path.dirname(os.path.abspath(__file__))
VINO, VINO2, ROJO, CREMA, SOMBRA = '#2C0F14', '#1C070B', '#8E2438', '#EDE2DA', '#BFAEA9'
C = 500  # centro del lienzo de 1000


class Letra:
    def __init__(self, archivo):
        self.f = TTFont(os.path.join(AQUI, 'fuente', archivo))
        self.gs = self.f.getGlyphSet()
        self.cmap = self.f.getBestCmap()
        self.upm = self.f['head'].unitsPerEm
        self.cap = self.f['OS/2'].sCapHeight or 700

    def avance(self, ch, alto):
        return self.gs[self.cmap[ord(ch)]].width * alto / self.cap

    def trazo(self, ch, alto, matriz):
        """el contorno de una letra con la altura de mayúscula `alto`, ya acomodada por `matriz`"""
        s = alto / self.cap
        pen = SVGPathPen(self.gs)
        a, b, c, d, e, f = matriz
        # glifo: x→x*s, y→-y*s (la letra va hacia arriba), luego la matriz del lugar
        m = (a * s, b * s, -c * s, -d * s, e, f)
        self.gs[self.cmap[ord(ch)]].draw(TransformPen(pen, m))
        return pen.getCommands()


def rot(gr):
    r = math.radians(gr)
    return math.cos(r), math.sin(r)


def en_arco(letra, texto, alto, radio, abajo=False, aire=0.0, centro=(C, C)):
    """texto curvo: arriba se lee por fuera, abajo con la cabeza hacia el centro"""
    cx, cy = centro
    anchos = [letra.avance(ch, alto) for ch in texto]
    hueco = aire * alto
    medio = radio + (-alto / 2 if abajo else alto / 2)  # se mide a media letra
    total = sum(anchos) + hueco * (len(texto) - 1)
    s, rutas = -total / 2, []
    for ch, w in zip(texto, anchos):
        ang = math.degrees((s + w / 2) / medio)
        s += w + hueco
        if ch == ' ':
            continue
        if abajo:
            co, si = rot(-ang)
            ox, oy = cx + math.sin(math.radians(ang)) * radio, cy + math.cos(math.radians(ang)) * radio
        else:
            co, si = rot(ang)
            ox, oy = cx + math.sin(math.radians(ang)) * radio, cy - math.cos(math.radians(ang)) * radio
        # la letra se centra en su avance: x local = -w/2
        a, b, c, d = co, si, -si, co
        e = ox + a * (-w / 2)
        f = oy + b * (-w / 2)
        rutas.append(letra.trazo(ch, alto, (a, b, c, d, e, f)))
    return rutas


def arco(r, de, a, centro):
    cx, cy = centro
    p = lambda g: (cx + r * math.cos(math.radians(g)), cy + r * math.sin(math.radians(g)))
    (x1, y1), (x2, y2) = p(de), p(a)
    grande = 1 if (a - de) % 360 > 180 else 0
    return f'M{x1:.1f} {y1:.1f}A{r} {r} 0 {grande} 1 {x2:.1f} {y2:.1f}'


def insignia(fondo=True):
    fuerte, media = Letra('montserrat-latin-700-normal.woff'), Letra('montserrat-latin-600-normal.woff')
    o = []
    if fondo:
        o.append(f'<circle cx="{C}" cy="{C}" r="478" fill="{VINO}"/>')
        o.append(f'<circle cx="{C}" cy="{C}" r="300" fill="{VINO2}" opacity=".55"/>')
    o.append(f'<circle cx="{C}" cy="{C}" r="462" fill="none" stroke="{CREMA}" stroke-width="12"/>')
    o.append(f'<circle cx="{C}" cy="{C}" r="436" fill="none" stroke="{ROJO}" stroke-width="5"/>')
    o.append(f'<circle cx="{C}" cy="{C}" r="296" fill="none" stroke="{ROJO}" stroke-width="5"/>')

    # ondas que salen del micrófono
    mic = (C, 455)
    for r, op in ((178, .9), (212, .55), (246, .3)):
        for de, a in ((152, 208), (-28, 28)):
            o.append(f'<path d="{arco(r, de, a, mic)}" fill="none" stroke="{CREMA}" stroke-width="5" stroke-linecap="round" opacity="{op}"/>')

    # las barras de sonido, iguales a los dos lados
    altos = [44, 92, 150, 196, 128, 176, 104, 58]
    for i, h in enumerate(altos):
        dx = 362 - i * 25
        for x in (C - dx, C + dx):
            o.append(f'<rect x="{x - 7}" y="{462 - h / 2:.0f}" width="14" height="{h}" rx="7" fill="{CREMA}"/>')

    # el micrófono
    mx, my = C, 455
    o.append(f'<g transform="translate({mx} {my})">')
    o.append(f'<rect x="-92" y="-250" width="184" height="300" rx="92" fill="{VINO2}"/>')  # despeja las barras
    o.append(f'<rect x="-78" y="-238" width="156" height="276" rx="78" fill="{CREMA}"/>')
    o.append(f'<path d="M30 -226 A78 78 0 0 1 66 -170 L66 -10 A78 78 0 0 1 30 26 A60 60 0 0 0 52 -16 L52 -168 A60 60 0 0 0 30 -226Z" fill="{SOMBRA}"/>')
    for k in range(5):
        y = -150 + k * 30
        o.append(f'<rect x="-62" y="{y}" width="96" height="11" rx="5.5" fill="{VINO}"/>')
        o.append(f'<circle cx="-52" cy="{y + 5.5}" r="3" fill="{CREMA}"/>')
    o.append(f'<path d="M-118 -70 V0 A118 118 0 0 0 118 0 V-70" fill="none" stroke="{CREMA}" stroke-width="18" stroke-linecap="round"/>')
    o.append(f'<path d="M0 118 V172 M-74 178 H74" fill="none" stroke="{CREMA}" stroke-width="18" stroke-linecap="round"/>')
    o.append('</g>')

    # las letras
    for d in en_arco(fuerte, 'RADIO', 62, 330, aire=.28):
        o.append(f'<path d="{d}" fill="{CREMA}"/>')
    for d in en_arco(fuerte, 'DIVERGENTES', 56, 382, abajo=True, aire=.06):
        o.append(f'<path d="{d}" fill="{CREMA}"/>')
    for d in en_arco(media, 'PODCAST', 23, 424, abajo=True, aire=.55):
        o.append(f'<path d="{d}" fill="{CREMA}"/>')
    return '\n'.join(o)


def svg(fondo=True):
    return ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000" width="1000" height="1000">\n'
            '<title>Radio Divergentes · podcast</title>\n' + insignia(fondo) + '\n</svg>\n')


if __name__ == '__main__':
    with open(os.path.join(AQUI, 'radio-divergentes.svg'), 'w') as f:
        f.write(svg(True))
    print('listo: radio-divergentes.svg')
