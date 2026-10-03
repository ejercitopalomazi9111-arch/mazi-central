"""Pruebas de orden.py.  python3 fadori/presentacion/pruebas-orden.py"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lxml import etree
from orden import ordenar
A = 'http://schemas.openxmlformats.org/drawingml/2006/main'
A14 = 'http://schemas.microsoft.com/office/drawing/2010/main'
bien = mal = 0
def ok(c, m):
    global bien, mal
    print(('  ✓ ' if c else '  ✗ ') + m); bien += bool(c); mal += (not c)
hijos = lambda e: [etree.QName(h).localname for h in e]
x = lambda s: etree.fromstring(f'<r xmlns:a="{A}" xmlns:a14="{A14}">{s}</r>')

r = x('<a:pPr algn="l"><a:defRPr/><a:buNone/></a:pPr>')
ok(ordenar(r) == 1 and hijos(r[0]) == ['buNone', 'defRPr'], 'la viñeta va antes de defRPr (lo de Acuática)')
r = x('<a:pPr><a:buChar char="•"/><a:buFont typeface="Arial"/><a:lnSpc/><a:buNone/></a:pPr>')
ordenar(r)
ok(hijos(r[0]) == ['lnSpc', 'buFont', 'buNone'], 'orden del esquema y una sola viñeta: la última que se escribió')
r = x('<a:rPr><a:latin typeface="Arial"/><a:solidFill/><a:effectLst/></a:rPr>')
ordenar(r)
ok(hijos(r[0]) == ['solidFill', 'effectLst', 'latin'], 'en la letra: relleno, efectos y luego latin')
r = x('<a14:hiddenEffects/>')
ordenar(r)
ok(hijos(r[0]) == ['effectLst'], 'hiddenEffects vacío recibe su effectLst')
r = x('<a:pPr><a:buNone/><a:defRPr/></a:pPr><a:rPr><a:solidFill/><a:latin/></a:rPr>')
ok(ordenar(r) == 0, 'lo que ya está en orden no se toca')
print(f'\n{bien} bien · {mal} mal'); sys.exit(1 if mal else 0)
