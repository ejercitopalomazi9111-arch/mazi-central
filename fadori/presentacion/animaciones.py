"""Animaciones huérfanas: las que apuntan a un elemento que ya no existe.

Carlos, 3 de octubre: «la de la brigada no abre el pptx, marca un error» —
«también la acuática». Los dos pasaban el validador y LibreOffice los abría
sin quejarse. Lo que tenían: animaciones cuyo objetivo (`spid`) ya no estaba
en la lámina. PowerPoint lo trata como archivo dañado; nadie más lo nota.

De dónde salen: iphone.py deshace grupos (la animación era del grupo, que
desaparece), quita figuras invisibles y renumera ids repetidos. El Curso
principal no tenía animaciones y por eso sí abría.

Qué se hace: se quita SÓLO el efecto que apunta a la nada (y su renglón de
`bldLst`); lo que queda vacío se poda hacia arriba, y si la lámina se queda
sin animaciones se va su `p:timing` entero. Las demás animaciones siguen.

Uso:  python3 animaciones.py entrada.pptx [salida.pptx]   (sin salida: en su lugar)
Desde otro guion:  from animaciones import limpiar_lamina  (sobre el lxml de la lámina)
"""
import re, sys, zipfile, os, shutil, tempfile
from lxml import etree

P = 'http://schemas.openxmlformats.org/presentationml/2006/main'
q = lambda t: f'{{{P}}}{t}'


def huerfanas(sld):
    """Los spid que una animación pide y la lámina no tiene."""
    ids = {c.get('id') for c in sld.iter(q('cNvPr'))}
    pedidos = {e.get('spid') for e in sld.iter() if e.get('spid') is not None and e.tag in (q('spTgt'), q('bldP'), q('bldGraphic'), q('bldOleChart'), q('bldDgm'))}
    return pedidos - ids


def _vacio(par):
    """Un nodo de tiempo cuya lista de hijos quedó vacía."""
    ctn = par.find(q('cTn'))
    if ctn is None: return False
    hijos = ctn.find(q('childTnLst'))
    return hijos is not None and len(hijos) == 0


def limpiar_lamina(sld):
    """Quita las animaciones huérfanas de una lámina (elemento <p:sld>). Devuelve cuántos efectos quitó."""
    malos = huerfanas(sld)
    if not malos: return 0
    quitados = 0
    for tgt in list(sld.iter(q('spTgt'))):
        if tgt.get('spid') not in malos or tgt.getparent() is None: continue
        # el efecto es el <p:par> más cercano cuyo cTn trae presetClass; un audio o video se quita entero
        nodo, x = None, tgt.getparent()
        while x is not None and x is not sld:
            if x.tag in (q('audio'), q('video')): nodo = x; break
            if x.tag == q('par') and x.find(q('cTn')) is not None and x.find(q('cTn')).get('presetClass') is not None:
                nodo = x; break
            x = x.getparent()
        if nodo is None:   # sin efecto reconocible: el comportamiento suelto (set, anim, cmd…)
            nodo = tgt.getparent().getparent().getparent() if tgt.getparent() is not None else None
        if nodo is not None and nodo.getparent() is not None:
            nodo.getparent().remove(nodo); quitados += 1
    # podar hacia arriba lo que quedó vacío (pares de clic, secuencias)
    cambio = True
    while cambio:
        cambio = False
        for par in list(sld.iter(q('par'), q('seq'))):
            if _vacio(par) and par.getparent() is not None:
                ctn = par.find(q('cTn'))
                if ctn is not None and ctn.get('nodeType') == 'tmRoot': continue
                par.getparent().remove(par); cambio = True
    timing = sld.find(q('timing'))
    if timing is not None:
        # los renglones de bldLst cuyo efecto ya no existe
        vivos = set()
        for ctn in timing.iter(q('cTn')):
            if ctn.get('grpId') is None: continue
            for t in ctn.iter(q('spTgt')): vivos.add((t.get('spid'), ctn.get('grpId')))
        bld = timing.find(q('bldLst'))
        if bld is not None:
            for b in list(bld):
                if b.get('spid') in malos or (b.tag == q('bldP') and (b.get('spid'), b.get('grpId')) not in vivos):
                    bld.remove(b)
            if len(bld) == 0: timing.remove(bld)
        # sin efectos que queden: fuera el timing entero
        if not any(c.get('presetClass') is not None for c in timing.iter(q('cTn'))) and not list(timing.iter(q('audio'), q('video'))):
            sld.remove(timing)
    return quitados


def limpiar_archivo(ent, sal=None):
    """Repara un .pptx: reescribe sólo las láminas que cambian; lo demás va byte por byte."""
    sal = sal or ent
    zin = zipfile.ZipFile(ent)
    nuevos, total = {}, 0
    for n in zin.namelist():
        if not re.match(r'ppt/slides/slide\d+\.xml$', n): continue
        raiz = etree.fromstring(zin.read(n))
        k = limpiar_lamina(raiz)
        if k or huerfanas(raiz) != set():
            nuevos[n] = etree.tostring(raiz, xml_declaration=True, encoding='UTF-8', standalone=True)
            total += k
            print(f'  {n}: {k} efectos quitados')
    if not nuevos:
        print(f'{ent}: sin animaciones huérfanas'); return 0
    fd, tmp = tempfile.mkstemp(suffix='.pptx'); os.close(fd)
    with zipfile.ZipFile(tmp, 'w', zipfile.ZIP_DEFLATED) as zout:
        for i in zin.infolist():   # mismo orden: [Content_Types].xml primero
            zout.writestr(i, nuevos.get(i.filename, zin.read(i.filename)))
    zin.close()
    shutil.move(tmp, sal)
    print(f'{sal}: {total} efectos huérfanos quitados en {len(nuevos)} láminas')
    return total


if __name__ == '__main__':
    if len(sys.argv) < 2: sys.exit(__doc__)
    limpiar_archivo(sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else None)
