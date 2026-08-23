#!/usr/bin/env python3
"""El metro. Revisa un .pptx sin abrirlo.

LibreOffice está roto en este contenedor, así que no hay forma de ver la
presentación renderizada. Esto es lo segundo mejor: leer las coordenadas que
de verdad quedaron dentro del archivo y buscar los dos defectos que sí se
pueden medir sin ojos —

  1. algo que se sale del lienzo
  2. una foto encimada sobre un cuadro de texto

No sustituye ver el archivo. Pero ya cazó un traslape real (el cuerpo de
"¿Cómo funciona?" heredaba 15.49" de ancho y se montaba sobre tres capturas),
así que se queda.

    python3 medir.py Fadori-STEAM.pptx
"""
import sys, zipfile
from defusedxml import minidom

EMU = 914400          # unidades de Office por pulgada
COLA = EMU // 100     # 0.01" de tolerancia: el redondeo de Office no es defecto

def caja(sp):
    off = sp.getElementsByTagName('a:off'); ext = sp.getElementsByTagName('a:ext')
    if not off or not ext: return None
    return (int(off[0].getAttribute('x')),  int(off[0].getAttribute('y')),
            int(ext[0].getAttribute('cx')), int(ext[0].getAttribute('cy')))

def texto(sp):
    return ''.join(t.firstChild.nodeValue for t in sp.getElementsByTagName('a:t')
                   if t.firstChild).strip()

def medir(ruta, plantilla=None):
    z = zipfile.ZipFile(ruta)
    pres = minidom.parseString(z.read('ppt/presentation.xml'))
    tam = pres.getElementsByTagName('p:sldSz')[0]
    W, H = int(tam.getAttribute('cx')), int(tam.getAttribute('cy'))

    rels = minidom.parseString(z.read('ppt/_rels/presentation.xml.rels'))
    mapa = {r.getAttribute('Id'): r.getAttribute('Target')
            for r in rels.getElementsByTagName('Relationship')}
    orden = [mapa[s.getAttribute('r:id')].split('/')[-1]
             for s in pres.getElementsByTagName('p:sldId')]

    # La decoración de la plantilla se sale del lienzo A PROPÓSITO: así se
    # hacen los sangrados. Si la lámina viene de la plantilla, no es defecto.
    heredadas = set()
    if plantilla:
        zp = zipfile.ZipFile(plantilla)
        for n in zp.namelist():
            if n.startswith('ppt/slides/slide'):
                d = minidom.parseString(zp.read(n))
                for sp in d.getElementsByTagName('p:spTree')[0].childNodes:
                    if sp.nodeName not in ('p:sp','p:pic','p:grpSp','p:graphicFrame'): continue
                    c = caja(sp)
                    if c: heredadas.add(c)

    print(f'lienzo {W/EMU:.2f}" × {H/EMU:.2f}"   ·   {len(orden)} láminas')
    fallas = 0
    for i, arch in enumerate(orden, 1):
        d = minidom.parseString(z.read('ppt/slides/' + arch))
        piezas = []
        for sp in d.getElementsByTagName('p:spTree')[0].childNodes:
            if sp.nodeName not in ('p:sp','p:pic','p:grpSp','p:graphicFrame'): continue
            c = caja(sp)
            if not c: continue
            nom = sp.getElementsByTagName('p:cNvPr')[0].getAttribute('name')
            piezas.append((nom, c, texto(sp), sp.nodeName))

        quejas = []
        for nom, (x, y, cx, cy), _, _ in piezas:
            if (x, y, cx, cy) in heredadas: continue     # es de la escuela
            if x < -COLA or y < -COLA or x+cx > W+COLA or y+cy > H+COLA:
                quejas.append(f'«{nom}» se sale del lienzo')

        # sólo interesa foto contra texto: dos cajas de texto vacías encimadas
        # son decoración, no defecto
        vivas = [p for p in piezas
                 if p[3] == 'p:pic' or (p[3] == 'p:sp' and p[2])]
        for a in range(len(vivas)):
            for b in range(a+1, len(vivas)):
                A, B = vivas[a], vivas[b]
                if A[3] == B[3] == 'p:sp': continue
                if A[1] in heredadas and B[1] in heredadas: continue
                ax, ay, aw, ah = A[1]; bx, by, bw, bh = B[1]
                ox = min(ax+aw, bx+bw) - max(ax, bx)
                oy = min(ay+ah, by+bh) - max(ay, by)
                if ox > COLA and oy > COLA:
                    quejas.append(f'«{A[0]}» encimada con «{B[0]}» '
                                  f'({ox/EMU:.2f}×{oy/EMU:.2f}")')

        if quejas:
            fallas += len(quejas)
            print(f'  {i:2d} {arch}')
            for q in quejas: print(f'       ⚠ {q}')

    print('✓ nada se sale y nada se encima' if not fallas
          else f'✗ {fallas} cosa(s) que revisar')
    return 0 if not fallas else 1

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print(__doc__); sys.exit(2)
    sys.exit(medir(sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else None))
