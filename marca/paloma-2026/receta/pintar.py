import json, math, sys
P = json.load(open('piezas.json'))
X0, CY = 565.0, 760.0
TEMA = sys.argv[1] if len(sys.argv) > 1 else 'oscuro'
OSC = TEMA in ('oscuro', 'transparente', 'icono')
ICONO = TEMA == 'icono'
def pts(p): return ' '.join(f'{x:.1f},{y:.1f}' for x, y in p)
defs, capas = [], []
n = [0]
def grad(p, c1, c2, c3=None, centro=(X0, CY)):
    """Degradado a lo largo de la pieza: del punto más cercano al centro al más lejano."""
    n[0] += 1; gid = f'g{n[0]}'
    near = min(p, key=lambda q: math.dist(q, centro)); far = max(p, key=lambda q: math.dist(q, centro))
    st = f'<stop offset="0" stop-color="{c1}"/>' + (f'<stop offset=".55" stop-color="{c2}"/><stop offset="1" stop-color="{c3}"/>' if c3 else f'<stop offset="1" stop-color="{c2}"/>')
    defs.append(f'<linearGradient id="{gid}" gradientUnits="userSpaceOnUse" x1="{near[0]:.0f}" y1="{near[1]:.0f}" x2="{far[0]:.0f}" y2="{far[1]:.0f}">{st}</linearGradient>')
    return f'url(#{gid})'
def vgrad(y1, y2, stops):
    n[0] += 1; gid = f'g{n[0]}'
    defs.append(f'<linearGradient id="{gid}" gradientUnits="userSpaceOnUse" x1="0" y1="{y1}" x2="0" y2="{y2}">' + ''.join(f'<stop offset="{o}" stop-color="{c}"/>' for o, c in stops) + '</linearGradient>')
    return f'url(#{gid})'
VINO, MOR, CLARO, LILA, BRILLO = '#7E1735', '#AC27FF', '#C77DFF', '#E2B8FF', '#F6ECFF'
OSCURO = '#170A26'
ala_i = 0
CLAROS = {32, 28, 36, 29, 27, 42, 56}
for k, pz in enumerate(P):
    p, c = pz['pts'], pz['clase']
    if ICONO and c not in ('cuerpo', 'mejilla'): continue
    if c in ('ala', 'cola'):
        ala_i += 1
        if (ala_i // 2) % 2: f = grad(p, VINO, MOR, LILA)
        else: f = grad(p, '#4A1170', CLARO, BRILLO)
    elif c == 'cuerpo': f = vgrad(470, 1060, [(0, BRILLO), (.25, LILA), (.55, MOR), (1, VINO)])
    elif c == 'mejilla': f = BRILLO
    elif c in ('M', 'A', 'Z', 'I'):
        f = grad(p, LILA, CLARO, None, (X0, 1100)) if pz['id'] in CLAROS else grad(p, VINO, MOR, None, (X0, 1100))
    elif c == 'linea': f = grad(p, CLARO, CLARO + '00', None, (X0, 1400))
    else: f = CLARO
    capas.append(f'<polygon points="{pts(p)}" fill="{f}"/>')
# estrella
estrella = 'M563,188 Q570,318 694,340 Q570,356 563,497 Q556,356 434,340 Q556,318 563,188 Z'
rombo = 'M563,293 L585,340 L563,387 L541,340 Z'
fe = vgrad(188, 497, [(0, '#FFFFFF'), (.5, LILA), (1, CLARO)])
capas.insert(0, f'<path d="{estrella}" fill="{fe}"/><path d="{rombo}" fill="{OSCURO if OSC else "#fff"}"/><path d="M563,312 L575,340 L563,368 L551,340 Z" fill="#fff"/>')
if not ICONO:
    # GRUPO: letras de contorno ochavado
    L = 'stroke-width="11" stroke-linejoin="miter" stroke-linecap="square" fill="none"'
    col = BRILLO if OSC else VINO
    grupo = [
     'M393,1104 L381,1092 L329,1092 L317,1104 L317,1143 L329,1155 L381,1155 L393,1143 L393,1124 L360,1124',
     'M435,1155 L435,1092 L496,1092 L508,1104 L508,1112 L496,1124 L435,1124 M482,1124 L508,1155',
     'M557,1092 L557,1143 L569,1155 L603,1155 L615,1143 L615,1092',
     'M657,1155 L657,1092 L709,1092 L721,1104 L721,1112 L709,1124 L657,1124']
    capas.append(f'<g stroke="{col}" {L}>' + ''.join(f'<path d="{g}"/>' for g in grupo) + '</g>')
    # la O: rombos concéntricos
    o = lambda r: f'M802,{1125-r} L{802+r},1125 L802,{1125+r} L{802-r},1125 Z'
    capas.append(f'<path d="{o(50)} {o(36)}" fill="{CLARO}" fill-rule="evenodd"/><path d="{o(24)} {o(14)}" fill="{LILA}" fill-rule="evenodd"/><path d="{o(6)}" fill="{BRILLO}"/>')
    # líneas de arriba (cuchillas que se adelgazan hacia fuera)
    for s in (1, -1):
        x = lambda v: X0 + s * v
        capas.append(f'<polygon points="{x(-345)},1124 {x(-550)},1129 {x(-345)},1133" fill="{CLARO}"/>')

glow = ''.join(capas)
xs = [x for pz in P for x, y in pz['pts']] + [434, 694]; ys = [y for pz in P for x, y in pz['pts']] + [188]
if ICONO:
    vb = (330, 160, 470, 470)  # cuadrado alrededor de estrella y cabeza
    vb = (595 - 470, 140, 940, 940)
else:
    m = 40; vb = (min(xs) - m, min(ys) - m, max(xs) - min(xs) + 2*m, max(ys) - min(ys) + 2*m)
VB = ' '.join(f'{v:.0f}' for v in vb)
if ICONO:
    fondo = f'<rect x="{vb[0]}" y="{vb[1]}" width="{vb[2]}" height="{vb[3]}" rx="210" fill="url(#fi)"/>'
    defs.append(f'<radialGradient id="fi" cx="50%" cy="38%" r="70%"><stop offset="0" stop-color="#3A1458"/><stop offset="1" stop-color="{OSCURO}"/></radialGradient>')
else:
    fondo = f'<rect x="{vb[0]}" y="{vb[1]}" width="{vb[2]}" height="{vb[3]}" fill="{OSCURO}"/>' if TEMA == 'oscuro' else ''
filtro = '<filter id="brillo" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="14"/></filter>'
halo = f'<g filter="url(#brillo)" opacity=".55">{glow}</g>' if OSC else ''
svg = f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{VB}"><defs>{filtro}{"".join(defs)}</defs>{fondo}{halo}{glow}</svg>'
open(f'logo-{TEMA}.svg', 'w').write(svg)
