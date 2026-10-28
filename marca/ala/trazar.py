"""Vectoriza la referencia del ala (la paloma de circuito n.º 6 que mandó Carlos el 28 de octubre)
y mide qué tan idéntica quedó: se pinta el SVG al tamaño de la referencia y se cuentan los pixeles
que no coinciden. Uso: python3 trazar.py [escala] [desenfoque] [umbral] [alphamax] [opttol]"""
import sys, subprocess, numpy as np
from PIL import Image, ImageFilter
TMP_SVG = '/tmp/claude-0/-home-user-mazi-central/617efe1d-4733-537e-8ae2-f3b050e50e7a/scratchpad/ala-trazo.svg'
E, B, U, A, O = (float(x) for x in (sys.argv[1:] + ['4', '2.5', '140', '1.0', '0.2'][len(sys.argv) - 1:]))
ref = Image.open('ref.png').convert('L'); W, H = ref.size
g = ref.resize((int(W * E), int(H * E)), Image.LANCZOS).filter(ImageFilter.GaussianBlur(B))
bw = g.point(lambda v: 0 if v < U else 255).convert('1'); bw.save('/tmp/claude-0/-home-user-mazi-central/617efe1d-4733-537e-8ae2-f3b050e50e7a/scratchpad/ala.pbm')
subprocess.run(['potrace', '-s', '-a', str(A), '-O', str(O), '-t', '20', '--flat', '-W', f'{W}pt', '-H', f'{H}pt',
                '/tmp/claude-0/-home-user-mazi-central/617efe1d-4733-537e-8ae2-f3b050e50e7a/scratchpad/ala.pbm', '-o', TMP_SVG], check=True)
subprocess.run(['node', 'pintar.mjs', TMP_SVG, '/tmp/claude-0/-home-user-mazi-central/617efe1d-4733-537e-8ae2-f3b050e50e7a/scratchpad/ala-r.png', str(W), str(H)], check=True)
r = np.array(Image.open('/tmp/claude-0/-home-user-mazi-central/617efe1d-4733-537e-8ae2-f3b050e50e7a/scratchpad/ala-r.png').convert('L')) < 128
o = np.array(ref) < 128
d = r ^ o
print(f'tinta ref {o.sum()} · trazo {r.sum()} · distintos {d.sum()} ({100 * d.sum() / o.sum():.2f} % de la tinta) · IoU {(r & o).sum() / (r | o).sum():.4f}')
