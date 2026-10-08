"""El cuerpo de la mosca para three.js, sacado del modelo de flybody (Vaxenburg et al. 2025, Nature;
github.com/TuragaLab/flybody, Apache 2.0): 67 piezas articuladas como en la mosca de verdad.

   python3 -P mosca/herramientas/cuerpo.py <carpeta assets de flybody> mosca/modelo [celda_mm]

Los .obj originales pesan 151 MB (millón y medio de triángulos): se aligeran juntando vértices en una
rejilla (celda de 0.02 mm por omisión) y se guardan cuantizados a int16.

Salida:
  mosca.json   el árbol de piezas: nombre, padre, posición y giro (cuaternión) respecto al padre,
               articulaciones (eje y rango) y qué mallas lleva cada pieza con su material
  mosca.bin    las mallas: por malla, vértices int16 (escala en el json) e índices uint16/uint32
Unidades: centímetros, como en el modelo (la mosca mide ~0.25 cm). Ejes de MuJoCo: x adelante,
y a la izquierda, z arriba.
"""
import sys, os, json, struct
import numpy as np
import xml.etree.ElementTree as ET

ASSETS, SAL = sys.argv[1:3]
CELDA = float(sys.argv[3]) if len(sys.argv) > 3 else 0.002   # cm
os.makedirs(SAL, exist_ok=True)
raiz = ET.parse(os.path.join(ASSETS, 'fruitfly.xml')).getroot()

def nums(s, n=None, d=None):
    if s is None: return d
    v = [float(x) for x in s.split()]
    return v

# ── materiales y mallas ──
MAT = {m.get('name'): [float(x) for x in m.get('rgba', '1 1 1 1').split()] for m in raiz.iter('material')}
esc_def = [0.1, 0.1, 0.1]
d = raiz.find('default/mesh')
if d is not None and d.get('scale'): esc_def = nums(d.get('scale'))
MALLA = {}
for m in raiz.find('asset').iter('mesh'):
    MALLA[m.get('name')] = (m.get('file'), nums(m.get('scale'), d=esc_def) or esc_def)

# ── clases por omisión (para el eje y rango de las articulaciones y el material de las geoms) ──
CLASES = {}
def leer_clases(nodo, padre):
    for c in nodo.findall('default'):
        nombre = c.get('class')
        base = {k: dict(v) for k, v in CLASES[padre].items()} if padre in CLASES else {}
        for hijo in c:
            if hijo.tag == 'default': continue
            base.setdefault(hijo.tag, {}).update(hijo.attrib)
        CLASES[nombre] = base
        leer_clases(c, nombre)
raiz_def = raiz.find('default')
CLASES['main'] = {}
for hijo in raiz_def:
    if hijo.tag != 'default': CLASES['main'].setdefault(hijo.tag, {}).update(hijo.attrib)
leer_clases(raiz_def, 'main')

def atr(el, tag, clase, k, d=None):
    if el.get(k) is not None: return el.get(k)
    return CLASES.get(clase, {}).get(tag, {}).get(k, d)

def quat_mat(q):
    w, x, y, z = q
    return np.array([[1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w)],
                     [2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w)],
                     [2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)]])

def leer_obj(f):
    vs, fs = [], []
    for linea in open(os.path.join(ASSETS, f)):
        if linea.startswith('v '): vs.append(linea.split()[1:4])
        elif linea.startswith('f '):
            idx = [int(p.split('/')[0]) - 1 for p in linea.split()[1:]]
            for k in range(1, len(idx) - 1): fs.append((idx[0], idx[k], idx[k + 1]))
    return np.array(vs, float), np.array(fs, np.int64)

def aligerar(v, f, celda):
    """Agrupa vértices por celda de rejilla; cada grupo queda en su promedio. Se van los triángulos
    que se aplastan y los repetidos."""
    q = np.floor(v / celda).astype(np.int64)
    _, inv = np.unique(q, axis=0, return_inverse=True); inv = inv.ravel()
    n = inv.max() + 1
    suma = np.zeros((n, 3)); np.add.at(suma, inv, v); cuenta = np.bincount(inv, minlength=n)[:, None]
    nv = suma / cuenta
    nf = inv[f]
    vivo = (nf[:, 0] != nf[:, 1]) & (nf[:, 1] != nf[:, 2]) & (nf[:, 0] != nf[:, 2])
    nf = nf[vivo]
    if len(nf):   # repetidos (mismos tres vértices en cualquier orden): se queda el primero, con su orientación
        _, prim = np.unique(np.sort(nf, axis=1), axis=0, return_index=True); nf = nf[np.sort(prim)]
    # vértices que ya no usa nadie, fuera
    usados = np.unique(nf); mapa = -np.ones(n, np.int64); mapa[usados] = np.arange(len(usados))
    return nv[usados], mapa[nf]

PIEZAS, MALLAS, bloques = [], [], []
desp = 0
def visitar(cuerpo, padre, clase):
    global desp
    clase = cuerpo.get('childclass', clase)
    nombre = cuerpo.get('name')
    pieza = {'nombre': nombre, 'padre': padre,
             'pos': nums(cuerpo.get('pos'), d=[0, 0, 0]) or [0, 0, 0],
             'quat': nums(cuerpo.get('quat'), d=[1, 0, 0, 0]) or [1, 0, 0, 0],
             'art': [], 'mallas': []}
    for j in cuerpo.findall('joint'):
        c = j.get('class', clase)
        eje = nums(atr(j, 'joint', c, 'axis'), d=[0, 0, 1]) or [0, 0, 1]
        rango = nums(atr(j, 'joint', c, 'range'), d=None)
        reposo = float(atr(j, 'joint', c, 'springref', '0'))   # la postura de pie (qpos_spring en flybody)
        pieza['art'].append({'nombre': j.get('name'), 'eje': eje, 'rango': rango, 'reposo': reposo})
    for g in cuerpo.findall('geom'):
        c = g.get('class', clase)
        if not g.get('mesh') or 'collision' in (g.get('class') or '') or g.get('type', 'mesh') != 'mesh': continue
        if (atr(g, 'geom', c, 'group') or '1') not in ('1', '2'): continue
        archivo, esc = MALLA[g.get('mesh')]
        v, f = leer_obj(archivo)
        v = v * np.array(esc)
        R = quat_mat(nums(g.get('quat'), d=[1, 0, 0, 0]) or [1, 0, 0, 0]); t = np.array(nums(g.get('pos'), d=[0, 0, 0]) or [0, 0, 0])
        v = v @ R.T + t
        celda = CELDA * (0.5 if any(k in g.get('mesh') for k in ('antenna', 'tarsus', 'claw', 'haltere', 'arista')) else 1)
        nv, nf = aligerar(v, f, celda)
        if len(nf) == 0: continue
        lo, hi = nv.min(0), nv.max(0); s = np.maximum(hi - lo, 1e-9) / 65534
        qv = np.round((nv - lo) / s - 32767).astype('<i2')
        idx = nf.astype('<u4' if nv.shape[0] > 65535 else '<u2').ravel()
        mat = atr(g, 'geom', c, 'material', 'body')
        MALLAS.append({'pieza': nombre, 'nombre': g.get('mesh'), 'material': mat, 'rgba': MAT.get(mat, [1, 1, 1, 1]),
                       'v': int(nv.shape[0]), 'f': int(nf.shape[0]), 'lo': lo.tolist(), 's': s.tolist(),
                       'idx32': nv.shape[0] > 65535, 'desp': desp})
        b = qv.tobytes() + idx.tobytes(); b += b'\0' * ((-len(b)) % 4)
        bloques.append(b); desp += len(b)
        pieza['mallas'].append(len(MALLAS) - 1)
    PIEZAS.append(pieza)
    for hijo in cuerpo.findall('body'): visitar(hijo, nombre, clase)

for c in raiz.find('worldbody').findall('body'): visitar(c, None, 'main')
open(os.path.join(SAL, 'mosca.bin'), 'wb').write(b''.join(bloques))
json.dump({'fuente': 'flybody (Vaxenburg et al. 2025, Apache 2.0) · github.com/TuragaLab/flybody',
           'unidades': 'cm', 'piezas': PIEZAS, 'mallas': MALLAS}, open(os.path.join(SAL, 'mosca.json'), 'w'),
          ensure_ascii=False, separators=(',', ':'))
print(f'{len(PIEZAS)} piezas · {len(MALLAS)} mallas · {sum(m["f"] for m in MALLAS)} triángulos · {desp / 1e6:.2f} MB')
