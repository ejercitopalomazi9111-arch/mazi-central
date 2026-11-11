"""Arma urban-pest/web/index.html desde fuente.html: le mete los íconos de Lucide (ISC) que usa la página.

  python3 urban-pest/web/armar.py

Se edita fuente.html, nunca index.html. Los íconos salen de presentaciones/vendor/lucide-1.48.0.json:
se meten sólo los que aparecen como <use href="#i-NOMBRE"/>.
"""
import json, re
from pathlib import Path
AQUI = Path(__file__).resolve().parent
LUCIDE = json.loads((AQUI.parent.parent / 'presentaciones/vendor/lucide-1.48.0.json').read_text())['iconos']
fuente = (AQUI / 'fuente.html').read_text()
usados = sorted(set(re.findall(r'href="#i-([a-z0-9-]+)"', fuente)))
faltan = [n for n in usados if n not in LUCIDE]
if faltan: raise SystemExit('Lucide no tiene: ' + ', '.join(faltan))
sprite = '<svg width="0" height="0" style="position:absolute" aria-hidden="true">' + ''.join(f'<symbol id="i-{n}" viewBox="0 0 24 24">{LUCIDE[n]}</symbol>' for n in usados) + '</svg>'
(AQUI / 'index.html').write_text(fuente.replace('<!--ICONOS-->', sprite, 1))
print(f'index.html · {len(usados)} íconos')
