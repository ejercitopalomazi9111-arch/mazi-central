#!/usr/bin/env python3
"""Arma fadori/iconos.js con los iconos de Lucide que usa Fadori.

Lee el Lucide que ya está vendorizado en presentaciones/vendor/ (ISC) y escribe
sólo los que se usan: así la app no carga 1,800 iconos para enseñar 80.
Para sumar uno: agrégalo a NOMBRES y corre  python3 herramientas/iconos-fadori.py
"""
import json, pathlib, sys
RAIZ = pathlib.Path(__file__).resolve().parent.parent
NOMBRES = '''utensils ticket user-round repeat coins footprints x calendar-days moon sun sun-moon triangle-alert trash
notebook-pen users school bell bell-ring bell-off volume-2 volume-x check chevron-right chevron-down plus minus
soup flame sandwich candy cup-soda popcorn layout-grid hamburger pizza drumstick croissant can-soda droplet droplets
milk coffee cookie cupcake lollipop nut wheat egg bean shrimp sprout clock chef-hat circle-check-big party-popper
copy log-out list-ordered hourglass store info circle-question-mark send sparkles hand-coins heart wallet monitor
qr-code smartphone receipt-text circle-x rotate-ccw palette shield-check map-pin bike cake-slice ice-cream-cone'''.split()
d = json.loads((RAIZ / 'presentaciones/vendor/lucide-1.48.0.json').read_text())['iconos']
faltan = [n for n in NOMBRES if n not in d]
if faltan: sys.exit('No existen en Lucide: ' + ', '.join(faltan))
out = ['/* FADORI · los iconos. Lucide (lucide.dev), licencia ISC — ver fotos/CREDITOS.md.',
'   Una sola colección, rejilla de 24 y un solo grosor: por eso se ven de una pieza,',
'   cosa que los emojis no hacen (cada teléfono los dibuja distinto). Van aquí',
'   adentro y no por CDN: la app abre igual sin red. Se arma con',
'   herramientas/iconos-fadori.py; no se edita a mano. */',
'(function(){', "'use strict';", 'const T = {']
out += ['  ' + json.dumps(n) + ': ' + json.dumps(d[n]) + ',' for n in NOMBRES]
out += ['};', '''/* ico('ticket') → el <svg> listo para pegar. aria-hidden porque el texto de
   al lado ya dice qué es; si un botón sólo trae el icono, el botón lleva su
   aria-label. */
function ico(n, clase){
  const c = T[n] || T['utensils'];
  return '<svg class="i'+(clase ? ' '+clase : '')+'" viewBox="0 0 24 24" fill="none" '+
    'stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" '+
    'aria-hidden="true" focusable="false">'+c+'</svg>';
}
window.FADORI_ICONOS = { ico, hay: (n) => !!T[n], nombres: () => Object.keys(T) };
})();''']
(RAIZ / 'fadori/iconos.js').write_text('\n'.join(out) + '\n')
print('fadori/iconos.js ·', len(NOMBRES), 'iconos')
