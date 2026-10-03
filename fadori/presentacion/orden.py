"""El orden que PowerPoint exige dentro del texto.

Carlos, 3 de octubre: Brigada y Acuática para editar «siguen sin jalar», ni en
el visor de Office ni en la app de PowerPoint. Ya no tenían animaciones
huérfanas (animaciones.py), pasaban el validador del skill y LibreOffice las
abría. Lo que las tumbaba lo encontró el validador de Microsoft (Open XML SDK,
`dotnet` + DocumentFormat.OpenXml): piezas en el ORDEN equivocado.

  · `<a:buNone/>` DESPUÉS de `<a:defRPr/>` en `a:pPr` — lo puso opacas.py al
    cambiar las viñetas de imagen por viñetas de letra (19 en Acuática).
  · `<a:latin>` fuera de su lugar en `a:rPr`.
  · `<a14:hiddenEffects/>` vacío: tiene que traer su `a:effectLst`.

El esquema de DrawingML es una SECUENCIA: el orden es parte de la regla, y
PowerPoint no perdona lo que LibreOffice sí.

Uso:  python3 orden.py entrada.pptx [salida.pptx]
Desde otro guion:  from orden import ordenar  (sobre el lxml de cualquier parte)
"""
import re, sys, zipfile, os, shutil, tempfile
from lxml import etree

A = 'http://schemas.openxmlformats.org/drawingml/2006/main'
A14 = 'http://schemas.microsoft.com/office/drawing/2010/main'
a = lambda t: f'{{{A}}}{t}'

# CT_TextParagraphProperties: cada renglón es un lugar; los de un mismo renglón se excluyen
PARRAFO = [['lnSpc'], ['spcBef'], ['spcAft'], ['buClrTx', 'buClr'], ['buSzTx', 'buSzPct', 'buSzPts'],
           ['buFontTx', 'buFont'], ['buNone', 'buAutoNum', 'buChar', 'buBlip'], ['tabLst'], ['defRPr'], ['extLst']]
# CT_TextCharacterProperties
LETRA = [['ln'], ['noFill', 'solidFill', 'gradFill', 'blipFill', 'pattFill', 'grpFill'], ['effectLst', 'effectDag'],
         ['highlight'], ['uLnTx', 'uLn'], ['uFillTx', 'uFill'], ['latin'], ['ea'], ['cs'], ['sym'],
         ['hlinkClick'], ['hlinkMouseOver'], ['rtl'], ['extLst']]
DONDE_PARRAFO = {'pPr', 'defPPr'} | {f'lvl{i}pPr' for i in range(1, 10)}
DONDE_LETRA = {'rPr', 'defRPr', 'endParaRPr'}


def _acomodar(el, tabla):
    """Pone los hijos en el orden de la tabla. De un mismo lugar se queda el ÚLTIMO
    (es el que escribió quien cambió la viñeta). Devuelve True si movió algo."""
    lugar = {n: i for i, fila in enumerate(tabla) for n in fila}
    hijos = list(el)
    conocidos = [h for h in hijos if isinstance(h.tag, str) and h.tag.startswith(f'{{{A}}}') and etree.QName(h).localname in lugar]
    if len(conocidos) != len([h for h in hijos if isinstance(h.tag, str)]):
        return False   # algo que no sé ordenar: no lo toco
    ultimo = {}
    for h in conocidos: ultimo[lugar[etree.QName(h).localname]] = h
    nuevo = [ultimo[k] for k in sorted(ultimo)]
    if nuevo == hijos: return False
    for h in hijos: el.remove(h)
    for h in nuevo: el.append(h)
    return True


def ordenar(raiz):
    """Arregla el orden del texto y los hiddenEffects vacíos. Devuelve cuántas piezas tocó."""
    n = 0
    for el in raiz.iter(f'{{{A}}}*'):
        nombre = etree.QName(el).localname
        if nombre in DONDE_PARRAFO and _acomodar(el, PARRAFO): n += 1
        elif nombre in DONDE_LETRA and _acomodar(el, LETRA): n += 1
    for he in raiz.iter(f'{{{A14}}}hiddenEffects'):
        if len(he) == 0:
            etree.SubElement(he, a('effectLst')); n += 1
    for hf in raiz.iter(f'{{{A14}}}hiddenFill'):
        if len(hf) == 0:
            etree.SubElement(hf, a('noFill')); n += 1
    return n


def ordenar_archivo(ent, sal=None):
    sal = sal or ent
    zin = zipfile.ZipFile(ent)
    nuevos, total = {}, 0
    for nombre in zin.namelist():
        if not re.match(r'ppt/(slides|slideLayouts|slideMasters|notesSlides)/[^/]+\.xml$', nombre): continue
        raiz = etree.fromstring(zin.read(nombre))
        k = ordenar(raiz)
        if k:
            nuevos[nombre] = etree.tostring(raiz, xml_declaration=True, encoding='UTF-8', standalone=True)
            total += k
    if nuevos:
        fd, tmp = tempfile.mkstemp(suffix='.pptx'); os.close(fd)
        with zipfile.ZipFile(tmp, 'w', zipfile.ZIP_DEFLATED) as zout:
            for i in zin.infolist():
                zout.writestr(i, nuevos.get(i.filename, zin.read(i.filename)))
        zin.close()
        shutil.move(tmp, sal)
    elif sal != ent:
        zin.close(); shutil.copy(ent, sal)
    print(f'{sal}: {total} piezas reacomodadas en {len(nuevos)} partes')
    return total


if __name__ == '__main__':
    if len(sys.argv) < 2: sys.exit(__doc__)
    ordenar_archivo(sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else None)
