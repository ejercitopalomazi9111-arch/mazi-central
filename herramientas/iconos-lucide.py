#!/usr/bin/env python3
"""Arma el iconos.js de cada app con los iconos de Lucide que usa.

Lee el Lucide que ya está vendorizado en presentaciones/vendor/ (ISC) y escribe
sólo los que se usan: así la app no carga 1,800 iconos para enseñar 80.
Para sumar uno: agrégalo a la lista de su app y corre
    python3 herramientas/iconos-lucide.py            (todas)
    python3 herramientas/iconos-lucide.py podcast    (una)
"""
import json, pathlib, sys
RAIZ = pathlib.Path(__file__).resolve().parent.parent
APPS = {
  'fadori': '''utensils ticket user-round repeat coins footprints x calendar-days moon sun sun-moon triangle-alert trash
notebook-pen users school bell bell-ring bell-off volume-2 volume-x check chevron-right chevron-down plus minus
soup flame sandwich candy cup-soda popcorn layout-grid hamburger pizza drumstick croissant can-soda droplet droplets
milk coffee cookie cupcake lollipop nut wheat egg bean shrimp sprout clock chef-hat circle-check-big party-popper
copy log-out list-ordered hourglass store info circle-question-mark send sparkles hand-coins heart wallet monitor
qr-code smartphone receipt-text circle-x rotate-ccw palette shield-check map-pin bike cake-slice ice-cream-cone
camera hash eye eye-off maximize minimize play pause settings tv film megaphone hand pointer upload arrow-up arrow-down skip-forward radio mic'''.split(),
  'podcast': '''mic mic-off upload play pause square circle scissors wand-sparkles music download share-2 image trash
arrow-up arrow-down sliders-horizontal sparkles refresh-cw volume-2 audio-lines audio-waveform x check chevron-down
chevron-right clock mic-vocal radio headphones list-ordered lightbulb info circle-alert loader-circle shuffle disc-3
guitar newspaper coffee zap palette type hash school video camera film clapperboard user-plus rectangle-horizontal rectangle-vertical eye crop maximize monitor smartphone captions sun switch-camera pencil undo-2 flag scroll-text skip-back skip-forward users megaphone'''.split(),
}
d = json.loads((RAIZ / 'presentaciones/vendor/lucide-1.48.0.json').read_text())['iconos']
def armar(app, NOMBRES):
  faltan = [n for n in NOMBRES if n not in d]
  if faltan: sys.exit(app + ': no existen en Lucide: ' + ', '.join(faltan))
  out = ['/* ' + app.upper() + ' · los iconos. Lucide (lucide.dev), licencia ISC.',
  '   Una sola colección, rejilla de 24 y un solo grosor: por eso se ven de una pieza,',
  '   cosa que los emojis no hacen (cada teléfono los dibuja distinto). Van aquí',
  '   adentro y no por CDN: la app abre igual sin red. Se arma con',
  '   herramientas/iconos-lucide.py; no se edita a mano. */',
  '(function(){', "'use strict';", 'const T = {']
  out += ['  ' + json.dumps(n) + ': ' + json.dumps(d[n]) + ',' for n in NOMBRES]
  out += ['};', '''/* ico('ticket') → el <svg> listo para pegar. aria-hidden porque el texto de
   al lado ya dice qué es; si un botón sólo trae el icono, el botón lleva su
   aria-label. */
function ico(n, clase){
  const c = T[n] || T[Object.keys(T)[0]];
  return '<svg class="i'+(clase ? ' '+clase : '')+'" viewBox="0 0 24 24" fill="none" '+
    'stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" '+
    'aria-hidden="true" focusable="false">'+c+'</svg>';
}
window.FADORI_ICONOS = window.ICONOS = { ico, hay: (n) => !!T[n], nombres: () => Object.keys(T) };
})();''']
  (RAIZ / app / 'iconos.js').write_text('\n'.join(out) + '\n')
  print(app + '/iconos.js ·', len(NOMBRES), 'iconos')

for app in (sys.argv[1:] or APPS.keys()): armar(app, APPS[app])
