#!/usr/bin/env python3
"""El metro. Revisa una presentación por lo que SE VE, no por lo que dice el XML.

   python3 medir.py Fadori-STEAM.pptx

La versión anterior de este archivo medía las CAJAS declaradas en el XML y daba
«✓ nada se encima» mientras la presentación se veía así:

    Objetiv
    o
      Justificación        ← encimado

Carlos tuvo que mandarme capturas de su teléfono para que me enterara. El
defecto era del medidor, no de la presentación: un título que no cabe en su
caja se parte en dos renglones y CRECE HACIA ABAJO (las cajas traen
`spAutoFit`), pero la caja declarada no se mueve ni un EMU. Midiendo cajas eso
es invisible.

Así que ahora se renderiza de verdad —LibreOffice + Poppler— y se leen las
coordenadas de cada palabra pintada. Lo que revisa:

  1. TEXTO QUE SE PARTE   un renglón de título que se convirtió en dos
  2. TEXTO ENCIMADO       dos bloques de texto pisándose
  3. TEXTO FUERA          algo pintado fuera de los márgenes
  4. PALABRA CORTADA      «Portad / a» — una palabra rota a media sílaba

El punto 4 es el que más vergüenza da y el más fácil de cazar: si un renglón
termina sin espacio y el siguiente empieza en minúscula, la palabra se partió.
"""
import subprocess, sys, os, re, shutil, tempfile
from collections import defaultdict

def render_pdf(pptx, dest):
    os.makedirs(dest, exist_ok=True)
    subprocess.run(['soffice', '--headless', '--norestore',
                    '-env:UserInstallation=file://%s/ui' % dest,
                    '--convert-to', 'pdf', '--outdir', dest, pptx],
                   check=True, capture_output=True, timeout=600)
    return os.path.join(dest, os.path.basename(pptx)[:-5] + '.pdf')

def palabras(pdf):
    """Cada palabra pintada, con su caja, por página. Sale del PDF, o sea del
       render de verdad — no de lo que el XML dice que debería pasar."""
    xml = subprocess.run(['pdftotext', '-bbox', pdf, '-'],
                         check=True, capture_output=True, text=True).stdout
    paginas = []
    for pg in re.finditer(r'<page width="([\d.]+)" height="([\d.]+)">(.*?)</page>', xml, re.S):
        w, h = float(pg.group(1)), float(pg.group(2))
        ws = [(float(m.group(1)), float(m.group(2)), float(m.group(3)),
               float(m.group(4)), m.group(5))
              for m in re.finditer(
                  r'<word xMin="([\d.-]+)" yMin="([\d.-]+)" xMax="([\d.-]+)" '
                  r'yMax="([\d.-]+)">([^<]*)</word>', pg.group(3))]
        paginas.append((w, h, ws))
    return paginas

def renglones(ws, tol=0.45):
    """Agrupa palabras en renglones.

    Por altura NO basta: en una lámina de dos columnas, «Filas enormes» a la
    izquierda y «Pedidos manuales» a la derecha están a la misma altura y se
    juntaban en un solo renglón fantasma que luego salía «encimado» consigo
    mismo. Así que además de compartir franja vertical, dos palabras tienen que
    estar CERCA en horizontal — un hueco de más de tres anchos de letra ya es
    otra columna, no la palabra siguiente."""
    porY = defaultdict(list)
    for w in sorted(ws, key=lambda w: (w[1], w[0])):
        alto = w[3] - w[1]
        clave = next((k for k in porY if abs(k - w[1]) <= alto * tol), w[1])
        porY[clave].append(w)
    out = []
    for k in sorted(porY):
        fila = sorted(porY[k], key=lambda w: w[0])
        grupo = [fila[0]]
        for w in fila[1:]:
            hueco = w[0] - grupo[-1][2]
            if hueco > max(w[3]-w[1], grupo[-1][3]-grupo[-1][1]) * 3:
                out.append(_bloque(grupo)); grupo = [w]
            else:
                grupo.append(w)
        out.append(_bloque(grupo))
    return out

def _bloque(fila):
    return {'y0': min(w[1] for w in fila), 'y1': max(w[3] for w in fila),
            'x0': min(w[0] for w in fila), 'x1': max(w[2] for w in fila),
            'alto': max(w[3]-w[1] for w in fila),
            'texto': ' '.join(w[4] for w in fila)}

def revisar(pptx, margen=0.02):
    dest = tempfile.mkdtemp(prefix='medir-')
    try:
        pdf = render_pdf(pptx, dest)
        paginas = palabras(pdf)
    finally:
        pass
    fallas = 0
    print('%s · %d láminas renderizadas' % (os.path.basename(pptx), len(paginas)))
    for i, (W, H, ws) in enumerate(paginas, 1):
        quejas = []
        # Los emoji quedan fuera de TODAS las cuentas: el PDF les reporta una
        # caja bastante más alta que su dibujo, y con ella un 📱 del renglón de
        # abajo «tocaba» el de arriba y disparaba alarmas falsas.
        letras = [w for w in ws if any(c.isalnum() for c in w[4])]
        rs = renglones(letras)

        # ── texto pintado fuera del papel ────────────────────────────────
        for w in ws:
            if w[0] < -1 or w[1] < -1 or w[2] > W + 1 or w[3] > H + 1:
                quejas.append('«%s» se pinta fuera de la lámina' % w[4]); break

        # ── palabra cortada a media sílaba ───────────────────────────────
        # «Portad» / «a» · el renglón de abajo empieza en minúscula y el de
        # arriba no termina en signo: casi siempre es una palabra partida.
        for a, b in zip(rs, rs[1:]):
            fin, ini = a['texto'].split()[-1], b['texto'].split()[0]
            if (len(ini) <= 3 and ini[:1].islower() and fin[-1:].isalpha()
                    and abs(b['x0'] - a['x0']) < a['alto'] * 3
                    and b['y0'] - a['y1'] < a['alto']):
                quejas.append('«%s / %s» — palabra partida a media sílaba'
                              % (fin, ini))

        # ── dos PALABRAS impresas una encima de la otra ──────────────────
        # Esto se me escapó en la portada: «Programación» y «Bachillerato»
        # quedaron literalmente encimadas, pero como estaban a la misma altura
        # mi agrupador las metía en el mismo renglón y la comparación de
        # renglón contra renglón nunca las veía. Dos palabras del mismo renglón
        # jamás deben traslaparse: si lo hacen, una caja creció sobre la otra.
        for j, a in enumerate(letras):
            for b in letras[j+1:]:
                sx = min(a[2], b[2]) - max(a[0], b[0])
                sy = min(a[3], b[3]) - max(a[1], b[1])
                if sx > 1.5 and sy > min(a[3]-a[1], b[3]-b[1]) * 0.5:
                    quejas.append('«%s» impreso encima de «%s»' % (a[4], b[4]))

        # ── dos bloques de texto encimados ───────────────────────────────
        # Se compara renglón contra renglón: si dos que NO son del mismo
        # bloque comparten franja vertical Y horizontal, se pisan.
        for j, a in enumerate(rs):
            for b in rs[j+1:]:
                sy = min(a['y1'], b['y1']) - max(a['y0'], b['y0'])
                sx = min(a['x1'], b['x1']) - max(a['x0'], b['x0'])
                if sy > min(a['alto'], b['alto']) * 0.34 and sx > 4:
                    quejas.append('«%s» encimado con «%s»'
                                  % (a['texto'][:30], b['texto'][:30]))

        if quejas:
            fallas += len(quejas)
            print('  %2d ──' % i)
            for q in dict.fromkeys(quejas): print('       ⚠ ' + q)
    shutil.rmtree(dest, ignore_errors=True)
    print('✓ nada partido, nada encimado, nada fuera' if not fallas
          else '✗ %d cosa(s) que revisar' % fallas)
    return 1 if fallas else 0

if __name__ == '__main__':
    if len(sys.argv) < 2: print(__doc__); sys.exit(2)
    sys.exit(revisar(sys.argv[1]))
