"""Pruebas de animaciones.py.  python3 fadori/presentacion/pruebas-animaciones.py"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lxml import etree
from animaciones import limpiar_lamina, huerfanas

P = 'http://schemas.openxmlformats.org/presentationml/2006/main'
A = 'http://schemas.openxmlformats.org/drawingml/2006/main'

def efecto(ctn, spid, grp='0'):
    return f'''<p:par><p:cTn id="{ctn}" presetID="10" presetClass="entr" grpId="{grp}" nodeType="clickEffect"><p:stCondLst><p:cond delay="0"/></p:stCondLst>
      <p:childTnLst><p:set><p:cBhvr><p:cTn id="{ctn}0" dur="1"/><p:tgtEl><p:spTgt spid="{spid}"/></p:tgtEl></p:cBhvr></p:set></p:childTnLst></p:cTn></p:par>'''

def clic(n, *efectos):
    return f'''<p:par><p:cTn id="{n}" fill="hold"><p:stCondLst><p:cond delay="indefinite"/></p:stCondLst><p:childTnLst>
      <p:par><p:cTn id="{n}1" fill="hold"><p:stCondLst><p:cond delay="0"/></p:stCondLst><p:childTnLst>{''.join(efectos)}</p:childTnLst></p:cTn></p:par>
    </p:childTnLst></p:cTn></p:par>'''

def lamina(formas, clics, bld):
    sps = ''.join(f'<p:sp><p:nvSpPr><p:cNvPr id="{i}" name="f{i}"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr><p:spPr/></p:sp>' for i in formas)
    return etree.fromstring(f'''<p:sld xmlns:p="{P}" xmlns:a="{A}"><p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr/>{sps}</p:spTree></p:cSld>
  <p:timing><p:tnLst><p:par><p:cTn id="1" dur="indefinite" restart="never" nodeType="tmRoot"><p:childTnLst>
    <p:seq concurrent="1" nextAc="seek"><p:cTn id="2" dur="indefinite" nodeType="mainSeq"><p:childTnLst>{''.join(clics)}</p:childTnLst></p:cTn></p:seq>
  </p:childTnLst></p:cTn></p:par></p:tnLst><p:bldLst>{''.join(f'<p:bldP spid="{s}" grpId="0"/>' for s in bld)}</p:bldLst></p:timing></p:sld>'''.encode())

bien = mal = 0
def ok(c, m):
    global bien, mal
    print(('  ✓ ' if c else '  ✗ ') + m)
    if c: bien += 1
    else: mal += 1

def cuenta(s): return sum(1 for c in s.iter(f'{{{P}}}cTn') if c.get('presetClass'))

# 1 · una buena y una huérfana en el mismo clic: se va sólo la huérfana
s = lamina([2, 3], [clic(3, efecto(4, 2), efecto(5, 9))], [2, 9])
ok(huerfanas(s) == {'9'}, 'detecta la que apunta a una forma que no existe')
ok(limpiar_lamina(s) == 1, 'quita un efecto')
ok(huerfanas(s) == set(), 'no queda ninguna huérfana')
ok(cuenta(s) == 1, 'la animación buena sigue')
ok([b.get('spid') for b in s.iter(f'{{{P}}}bldP')] == ['2'], 'bldLst se queda sólo con la buena')

# 2 · un clic que queda vacío se poda, el otro clic sigue
s = lamina([2], [clic(3, efecto(4, 2)), clic(6, efecto(7, 8))], [2, 8])
limpiar_lamina(s)
ok(cuenta(s) == 1 and not any(len(x) == 0 for x in s.iter(f'{{{P}}}childTnLst')), 'el clic vacío se poda, sin listas vacías')

# 3 · todas huérfanas: fuera el timing entero
s = lamina([2], [clic(3, efecto(4, 7))], [7])
limpiar_lamina(s)
ok(s.find(f'{{{P}}}timing') is None, 'sin animaciones que queden, se va el <p:timing>')

# 4 · una lámina sana no se toca
s = lamina([2, 3], [clic(3, efecto(4, 2), efecto(5, 3))], [2, 3])
antes = etree.tostring(s)
ok(limpiar_lamina(s) == 0 and etree.tostring(s) == antes, 'una lámina sana queda idéntica')

print(f'\n{bien} bien · {mal} mal')
sys.exit(1 if mal else 0)
