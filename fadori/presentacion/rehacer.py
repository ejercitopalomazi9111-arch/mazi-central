#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
═══════════════════════════════════════════════════════════════════════════
 Rehace la presentación del proyecto STEAM SOBRE el formato institucional.
───────────────────────────────────────────────────────────────────────────
 El formato —el escudo Rembrandt, el DGETI, las bandas rojas y azules, los
 puntos— es inamovible. Así que no se redibuja: se parte del archivo que dio
 la escuela y sólo se cambia el CONTENIDO.

 Las diapositivas nuevas se clonan de la 8, que es la de contenido más limpia
 (título + un cuerpo), así que nacen con toda la decoración puesta. Nada de
 volver a dibujar bandas a mano y que queden a dos milímetros.

 La regla de la rúbrica manda: MÁXIMO 15 PALABRAS POR DIAPOSITIVA, contando
 el título. Al final hay un contador que avisa cuál se pasa.

 Se corre con:  python3 rehacer.py
═══════════════════════════════════════════════════════════════════════════
"""
import os, re, shutil, subprocess, sys, zipfile

AQUI = os.path.dirname(os.path.abspath(__file__))
TRAB = os.path.join(AQUI, 'trabajo')
PLANTILLA = os.path.join(AQUI, 'formato-institucional.pptx')
SALIDA = os.path.join(AQUI, 'Fadori-STEAM.pptx')
ADD = '/root/.claude/skills/synced/pptx/scripts/add_slide.py'
EMU = 914400

# ── 1 · desempacar limpio ──────────────────────────────────────────────────
shutil.rmtree(TRAB, ignore_errors=True)
os.makedirs(TRAB)
with zipfile.ZipFile(PLANTILLA) as z:
    z.extractall(TRAB)

def sl(n):
    return os.path.join(TRAB, 'ppt', 'slides', 'slide%d.xml' % n)

def leer(p):
    with open(p, encoding='utf-8') as f: return f.read()

def escribir(p, s):
    with open(p, 'w', encoding='utf-8') as f: f.write(s)

# ── 2 · clonar la 8 para cada lámina nueva ─────────────────────────────────
# La 8 (Visión) es la más limpia: decoración + título + un cuerpo. Clonarla
# es cómo las nuevas nacen ya con el formato de la escuela.
NUEVAS = ['que-es', 'como', 'enfoque', 'S', 'T', 'E', 'A', 'M', 'estado']
clon = {}
for nombre in NUEVAS:
    r = subprocess.run([sys.executable, ADD, TRAB, 'slide8.xml'],
                       capture_output=True, text=True)
    if r.returncode != 0:
        print(r.stdout, r.stderr); sys.exit(1)
    m = re.search(r'slide(\d+)\.xml', r.stdout.split('from')[0])
    clon[nombre] = int(m.group(1))
print('clonadas:', clon)

# ── 3 · las herramientas para cambiar el texto sin romper el formato ───────
def bloque(s, i, etiqueta):
    """Devuelve (ini, fin) del elemento <etiqueta> que empieza en i, contando
       anidados. Sin esto, un <p:sp> dentro de un grupo corta donde no es."""
    abre = '<%s>' % etiqueta if '<'+etiqueta+'>' in s[i:i+len(etiqueta)+2] else None
    d, p = 1, i + s[i:].index('>') + 1
    ra = re.compile(r'<%s[ >]' % re.escape(etiqueta))
    rc = re.compile(r'</%s>' % re.escape(etiqueta))
    while d > 0:
        ma, mc = ra.search(s, p), rc.search(s, p)
        if not mc: return (i, len(s))
        if ma and ma.start() < mc.start(): d += 1; p = ma.end()
        else: d -= 1; p = mc.end()
    return (i, p)

def forma(s, nombre):
    """(ini, fin) de la forma que se llama así."""
    m = re.search(r'<p:(?:sp|pic)>(?:(?!<p:(?:sp|pic)>).)*?name="%s"' % re.escape(nombre), s, re.S)
    if not m: return None
    ini = s.rindex('<p:sp>', 0, m.end()) if '<p:sp>' in s[:m.end()] else None
    j = max(s.rfind('<p:sp>', 0, m.end()), s.rfind('<p:pic>', 0, m.end()))
    et = 'p:sp' if s.startswith('<p:sp>', j) else 'p:pic'
    return bloque(s, j, et)

def poner_texto(s, nombre, lineas, tam=None, color=None, negrita=None):
    """Cambia el texto de una forma conservando su tipografía y su color.
       `lineas` es una lista: cada una es un párrafo. Un par (texto, tam) fija
       el tamaño de esa línea."""
    r = forma(s, nombre)
    if not r:
        print('  ⚠ no encontré la forma «%s»' % nombre); return s
    ini, fin = r
    cuerpo = s[ini:fin]
    mtx = re.search(r'<p:txBody>.*?</p:txBody>', cuerpo, re.S)
    if not mtx:
        print('  ⚠ «%s» no tiene texto' % nombre); return s
    tx = mtx.group(0)
    mbody = re.search(r'<a:bodyPr[^>]*(?:/>|>.*?</a:bodyPr>)', tx, re.S)
    bodyPr = mbody.group(0) if mbody else '<a:bodyPr/>'
    mlst = re.search(r'<a:lstStyle[^>]*(?:/>|>.*?</a:lstStyle>)', tx, re.S)
    lst = mlst.group(0) if mlst else '<a:lstStyle/>'
    mpPr = re.search(r'<a:pPr[^>]*(?:/>|>.*?</a:pPr>)', tx, re.S)
    pPr = mpPr.group(0) if mpPr else ''
    mrun = re.search(r'<a:r>.*?</a:r>', tx, re.S)
    if not mrun:
        print('  ⚠ «%s» no trae ninguna corrida de texto' % nombre); return s
    plantilla = mrun.group(0)

    parrafos = []
    for ln in lineas:
        t, tsz = (ln if isinstance(ln, tuple) else (ln, None))
        run = re.sub(r'<a:t>.*?</a:t>', '<a:t>' + escapar(t) + '</a:t>', plantilla, flags=re.S)
        z = tsz if tsz is not None else tam
        if z is not None:
            run = re.sub(r'sz="\d+"', 'sz="%d"' % int(z * 100), run)
            if 'sz="' not in run:
                run = run.replace('<a:rPr ', '<a:rPr sz="%d" ' % int(z*100), 1)
        if color is not None:
            run = re.sub(r'<a:srgbClr val="[0-9A-Fa-f]{6}"',
                         '<a:srgbClr val="%s"' % color, run)
        if negrita is not None:
            run = re.sub(r'\sb="[01]"', '', run)
            run = run.replace('<a:rPr ', '<a:rPr b="%d" ' % (1 if negrita else 0), 1)
        parrafos.append('<a:p>' + pPr + run + '</a:p>')

    nuevo = '<p:txBody>' + bodyPr + lst + ''.join(parrafos) + '</p:txBody>'
    return s[:ini] + cuerpo.replace(tx, nuevo) + s[fin:]

def borrar_forma(s, nombre):
    r = forma(s, nombre)
    if not r: return s
    return s[:r[0]] + s[r[1]:]

def escapar(t):
    return (t.replace('&','&amp;').replace('<','&lt;').replace('>','&gt;'))

# ── 4 · meter imágenes ─────────────────────────────────────────────────────
def medida_png(ruta):
    with open(ruta,'rb') as f: d = f.read(33)
    return int.from_bytes(d[16:20],'big'), int.from_bytes(d[20:24],'big')

_sig = [0]
def poner_imagen(n, archivo, caja):
    """Mete un PNG en la diapositiva n, encajado en `caja` = (x,y,w,h) en
       pulgadas, SIN deformarlo. Registra el medio y la relación, que es lo
       que se olvida y deja el archivo corrupto."""
    origen = os.path.join(AQUI, archivo)
    w, h = medida_png(origen)
    cx, cy, cw, ch = caja
    a = w / h
    aw, ah = cw, cw / a
    if ah > ch: ah, aw = ch, ch * a
    x, y = cx + (cw - aw) / 2, cy + (ch - ah) / 2

    _sig[0] += 1
    destino = 'image_fadori_%d.png' % _sig[0]
    shutil.copy(origen, os.path.join(TRAB, 'ppt', 'media', destino))

    rels_p = os.path.join(TRAB, 'ppt', 'slides', '_rels', 'slide%d.xml.rels' % n)
    rels = leer(rels_p)
    usados = [int(x) for x in re.findall(r'Id="rId(\d+)"', rels)]
    rid = 'rId%d' % (max(usados or [0]) + 1)
    rels = rels.replace('</Relationships>',
        '<Relationship Id="%s" Type="http://schemas.openxmlformats.org/officeDocument/'
        '2006/relationships/image" Target="../media/%s"/></Relationships>' % (rid, destino))
    escribir(rels_p, rels)

    pic = (
      '<p:pic><p:nvPicPr><p:cNvPr id="%d" name="Fadori %d"/>'
      '<p:cNvPicPr><a:picLocks noChangeAspect="1"/></p:cNvPicPr><p:nvPr/></p:nvPicPr>'
      '<p:blipFill><a:blip r:embed="%s"/><a:stretch><a:fillRect/></a:stretch></p:blipFill>'
      '<p:spPr><a:xfrm><a:off x="%d" y="%d"/><a:ext cx="%d" cy="%d"/></a:xfrm>'
      '<a:prstGeom prst="rect"><a:avLst/></a:prstGeom>'
      '<a:ln w="28575"><a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill></a:ln>'
      '</p:spPr></p:pic>'
    ) % (900 + _sig[0], _sig[0], rid,
         int(x*EMU), int(y*EMU), int(aw*EMU), int(ah*EMU))

    p = sl(n); s = leer(p)
    escribir(p, s.replace('</p:spTree>', pic + '</p:spTree>'))

# ── 5 · el contador de palabras, que es la regla de la rúbrica ────────────
def palabras_de(n, sin=()):
    """Cuenta las palabras COMO SE LEEN, que no es como están guardadas.

    Tres trampas, las tres cazadas contando de más:
      · PowerPoint parte una frase en varias corridas para pintar la primera
        letra de otro color: "B"+"achillerato" son dos <a:t> y UNA palabra.
        Por eso se pegan las corridas de cada párrafo antes de contar.
      · Los emojis no son palabras.
      · Los números sueltos de un índice tampoco: "1 Portada" es una entrada.
    """
    s = leer(sl(n))
    total = 0
    for parrafo in re.findall(r'<a:p>.*?</a:p>', s, re.S):
        txt = ''.join(re.findall(r'<a:t>([^<]*)</a:t>', parrafo))
        for quitar in sin:
            txt = txt.replace(quitar, ' ')
        txt = re.sub(r'[\U0001F000-\U0001FAFF\u2190-\u27BF\uFE0F]', ' ', txt)
        txt = re.sub(r'[·:.,;¿?¡!%−—–/]', ' ', txt)
        total += len([w for w in txt.split() if w and not re.fullmatch(r'[\d.]+', w)])
    return total

def mover(s, nombre, x, y, w, h):
    """Recoloca una forma, en pulgadas. Hace falta para dejarle lugar a las
       imágenes sin que el texto se les encime."""
    r = forma(s, nombre)
    if not r:
        print('  ⚠ no encontré «%s» para moverla' % nombre); return s
    ini, fin = r
    c = s[ini:fin]
    c = re.sub(r'<a:off x="-?\d+" y="-?\d+"/>',
               '<a:off x="%d" y="%d"/>' % (int(x*EMU), int(y*EMU)), c, count=1)
    c = re.sub(r'<a:ext cx="\d+" cy="\d+"/>',
               '<a:ext cx="%d" cy="%d"/>' % (int(w*EMU), int(h*EMU)), c, count=1)
    return s[:ini] + c + s[fin:]

def formato(s, nombre, sz=None, algn=None):
    """Cambia el tamaño de letra y la alineación de un cuadro.

    Hace falta porque las láminas nuevas heredan el formato de la lámina 8, y
    esa lámina decía «Visión» — seis letras. A 92 pt en una caja de 8.45" cabe
    «Visión»; no cabe «¿Para qué sirve Fadori?». El título se partía en dos
    renglones, crecía hacia abajo (la caja trae `spAutoFit`) y se derramaba
    encima del cuerpo. Lo mismo el cuerpo: 44.5 pt centrado en 7.6" partía una
    frase de once palabras en cinco renglones.
    """
    r = forma(s, nombre)
    if not r:
        print('  ⚠ no encontré «%s» para darle formato' % nombre); return s
    ini, fin = r
    c = s[ini:fin]
    if sz is not None:
        c = re.sub(r'(<a:(?:rPr|defRPr|endParaRPr)\b[^>]*?)\bsz="\d+"',
                   lambda m: m.group(1) + 'sz="%d"' % int(sz*100), c)
    if algn is not None:
        c = re.sub(r'(<a:pPr\b[^>]*?)\balgn="[^"]*"',
                   lambda m: m.group(1) + 'algn="%s"' % algn, c)
        # los párrafos sin `algn` heredan el centrado del diseño: se los ponemos
        c = re.sub(r'<a:pPr(?![^>]*\balgn=)', '<a:pPr algn="%s"' % algn, c)
    return s[:ini] + c + s[fin:]

def cambiar(n, pares):
    """Los pares son (fragmento tal cual está, texto nuevo). Un texto vacío
       deja el cuadro en blanco, que es como se quitan renglones sin mover el
       diseño de la lámina."""
    """Cambios puntuales de texto, conservando TODO el formato: los colores de
       dos tonos, las mayúsculas grandes, la tipografía. Es más seguro que
       reconstruir el cuadro cuando la lámina ya está diseñada."""
    p = sl(n); s = leer(p)
    for viejo, _ in pares:
        if viejo not in s:
            print('  ⚠ diapositiva %d: no encontré %r' % (n, viejo[:44]))
    # ── DE UNA SOLA PASADA ────────────────────────────────────────────────
    # Reemplazar uno por uno encadena: en el índice, "Indice"→"Objetivo" y
    # luego "Objetivo"→"Visión" dejaron DOS "Visión" y ningún "Objetivo".
    # Con una sola pasada, lo que ya se cambió no se vuelve a mirar.
    tabla = {viejo: (t(escapar(nuevo)) if nuevo else t('')) for viejo, nuevo in pares}
    patron = re.compile('|'.join(re.escape(k) for k in
                                 sorted(tabla, key=len, reverse=True)))
    s = patron.sub(lambda m: tabla[m.group(0)], s)
    escribir(p, s)

def t(x): return '<a:t>%s</a:t>' % x

# ═══ EL CONTENIDO ═════════════════════════════════════════════════════════

# 1 · Portada · el ciclo es 2026, y el apellido lleva acento
p1 = sl(1); s1 = leer(p1)
s1 = s1.replace('<a:t>Agosto  - Diciembre 2025.</a:t>', '<a:t>Agosto - Diciembre 2026.</a:t>')
s1 = s1.replace('<a:t>Carlos Gutierrez</a:t>', '<a:t>Carlos Gutiérrez</a:t>')
escribir(p1, s1)

# 2 · Portada del proyecto
cambiar(2, [
  (t('Agosto – Diciembre 2025'), 'Agosto – Diciembre 2026'),
  (t('Menú digital para '),      'Pedir sin fila.'),
  (t('la cafetería escolar — sin filas, sin esperas.'), ' Comer con calma.'),
])

# 3 · Contenido · que diga lo que de verdad trae la presentación
# El índice va en el MISMO orden en que salen las láminas. Un índice que no
# coincide con lo que sigue es peor que no tener índice.
cambiar(3, [
  (t('Introducción'), 'Proyecto'),
  (t('Indice'),       'Problema'),
  (t('Problema'),     'Descripción'),
  (t('Descripción '), 'Objetivo'),
  (t('Objetivo'),     'Misión'),
  (t('Misión '),      'Visión'),
  (t('Visión '),      'Propósitos'),
  (t('Proposito específico '), 'Enfoque'),
  (t('proposito general'),     'STEAM'),
])

# 4 · El Problema · de 27 palabras a 15
cambiar(4, [
  (t('Recreos interrumpidos por largos tiempos de espera.'), ''),
  (t('lumnos esperando hasta 20 minutos'), 'asta 20 minutos formado'),
  (t('A'), 'H'),
  (t('Errores y confusiones constantes'), ''),
])

# 5 · Descripción
cambiar(5, [
  (t('Descripcion'), 'Descripción'),
  (t('El personal recibe los pedidos organizados y listos'), ''),
  (t('Control total'), ''),
  (t('Reportes de ventas y productos más populares'), ''),
])

# 6 · Objetivo y justificación
cambiar(6, [
  (t('Una aplicación web y móvil que digitalice el proceso de pedidos de la cafetería '
     'del Bachillerato Rembrandt, reduciendo tiempos de espera en al menos 60% durante '
     'el ciclo escolar 2025.'),
   'Digitalizar los pedidos y bajar la espera 60%.'),
])

# 7 · Misión
cambiar(7, [
  (t('Facilitar pedidos'),      'Facilitar los pedidos'),
  (t('Queremos Reducir Filas'), 'Reducir las filas'),
  (t('Facilitar supervisión '), 'Facilitar la supervisión'),
])

# 8 · Visión · aquí había tres errores de ortografía
cambiar(8, [
  (t('Un sitio web/app donde tienes el menú y realizas tu pedido Después te avisara '
     'cuando este echo '),
   'Que ninguna cafetería escolar vuelva a necesitar filas.'),
])

# 9 · Propósito general · de 40 palabras a 15
cambiar(9, [
  (t('Bachillerato Rembrandt · STEAM · Agosto – Diciembre 2025'), ''),
  (t('Fadori — El futuro de la cafetería'), ''),
  (t('🎯 automatización de pedidos'), '🎯 Pedidos automatizados'),
  (t('Impacto real 🚀Filas que no desperdician tiempo valioso'), ''),
  (t('📱 App web y móvil accesible para todos'), '📱 Web y móvil'),
  (t('✨ Solucion digital '), '✨ Solución digital'),
])

# 10 · Impacto esperado
cambiar(10, [
  (t('Reducción estimada en filas'), 'Bajar la fila a la mitad'),
  (t('Proceso simplificado desde el celular'), ''),
  (t('Pedidos digitales sin confusión'), ''),
  (t('Accesible'), ''),
])

# ═══ LAS LÁMINAS NUEVAS ═══════════════════════════════════════════════════
# Todas salieron de clonar la 8, así que traen la decoración de la escuela
# puesta. Aquí sólo se les cambia el título, el cuerpo y se les pone la
# imagen de la app.
#   «TextBox 6» = el título grande · «TextBox 7» = el cuerpo

# El lienzo mide 20" de ancho. La decoración de la escuela come los primeros
# ~3.3" arriba a la izquierda y las diagonales de abajo a la derecha, así que
# el texto vive en la franja de en medio.
TIT = (1.9, 0.85, 16.2, 1.55)     # título: ancho de sobra para UN solo renglón
TIT_SZ = 62                        # 92 pt sólo cabía para «Visión»
CUERPO_SZ = 30

def lamina(n, titulo, cuerpo, imagen=None, caja=None, cuerpo_izq=False):
    p = sl(n); s = leer(p)
    s = poner_texto(s, 'TextBox 6', [titulo])
    s = poner_texto(s, 'TextBox 7', cuerpo if isinstance(cuerpo, list) else [cuerpo])
    # El título se ensancha y se achica hasta caber en un renglón. Si no, la
    # caja crece hacia abajo y se come el cuerpo — que es exactamente lo que
    # pasaba en «¿Cómo funciona?», «Objetivo» y «M · Matemáticas».
    s = mover(s, 'TextBox 6', *TIT)
    s = formato(s, 'TextBox 6', sz=TIT_SZ, algn='ctr')
    # El cuerpo va ALINEADO A LA IZQUIERDA. Centrado, cada renglón arranca en
    # un lugar distinto y una frase de once palabras se lee como un poema.
    s = formato(s, 'TextBox 7', sz=CUERPO_SZ, algn='l')
    if cuerpo_izq:
        # media lámina para el texto, media para la captura
        s = mover(s, 'TextBox 7', 1.9, 3.30, 8.10, 2.60)
    else:
        s = mover(s, 'TextBox 7', 1.9, 3.30, 16.20, 1.40)
    escribir(p, s)
    if imagen:
        poner_imagen(n, imagen, caja or (10.2, 3.1, 8.2, 6.6))

lamina(clon['que-es'], '¿Qué es Fadori?',
       'App que ordena la cafetería sin filas.',
       '02-menu.png', (11.8, 3.6, 6.2, 6.6), cuerpo_izq=True)

lamina(clon['como'], '¿Cómo funciona?',
       'Dejas tu pedido, recibes turno, vas cuando esté listo.',
       None, None, cuerpo_izq=False)
# el cuerpo se sube: si se queda donde lo dejó la lámina 8 le pasa por encima
# a las tres capturas. Medido: las fotos arrancan en 4.6", así que el renglón
# se cierra en 3.75" y quedan 0.85" de aire.
_p = sl(clon['como']); _s = leer(_p)
_s = mover(_s, 'TextBox 7', 2.66, 2.50, 15.49, 1.25)
escribir(_p, _s)
# tres pasos, tres capturas — las tres alineadas por arriba en 4.6"
poner_imagen(clon['como'], '02-menu.png',           (2.10, 4.95, 4.20, 5.80))
poner_imagen(clon['como'], '03-mi-turno.png',       (7.90, 4.95, 4.20, 5.80))
poner_imagen(clon['como'], '04-pantalla-turnos.png',(13.10, 4.96, 5.40, 3.05))

lamina(clon['enfoque'], 'Enfoque',
       'Cuantitativo y deductivo: medimos tiempos y comprobamos la hipótesis.',
       '08-grafica.png', (10.7, 4.3, 7.8, 5.2), cuerpo_izq=True)

# Una captura DISTINTA por letra. Antes «Enfoque» y «S · Ciencia» llevaban la
# misma gráfica en láminas seguidas: se leía como si nos hubiéramos quedado sin
# material. Cada caja se midió aparte porque las capturas de teléfono son altas
# y angostas y las de escritorio anchas y bajas; una sola caja para todas dejaba
# a unas nadando y a otras desbordadas.
STEAM = [
  ('S', 'Ciencia',     'Medimos la fila antes y después.',
   '06-medidor.png',   (10.7, 3.7, 7.8, 6.4)),
  ('T', 'Tecnología',  'App web, servidor propio, funciona sin internet.',
   '03-mi-turno.png',  (13.6, 3.6, 4.4, 6.6)),
  ('E', 'Ingeniería',  'La fila se ordena sola, con tope justo.',
   '05-mostrador.png', (10.7, 3.7, 7.9, 6.4)),
  ('A', 'Arte',        'Identidad propia: logo, color y tipografía.',
   '01-cortinilla.png',(13.6, 3.6, 4.4, 6.6)),
  ('M', 'Matemáticas', 'Turnos, promedios y porcentajes calculados solos.',
   '07-cifras.png',    (10.7, 4.6, 7.9, 4.6)),
]
for letra, nombre, texto, img, caja in STEAM:
    lamina(clon[letra], letra + ' · ' + nombre, texto, img, caja, cuerpo_izq=True)

lamina(clon['estado'], 'Estado actual',
       ['Terminada, publicada y en línea. Cuatro pantallas.'],
       '04-pantalla-turnos.png', (10.7, 4.3, 7.9, 5.2), cuerpo_izq=True)

# ═══ AFINAR LAS LÁMINAS ORIGINALES ═══════════════════════════════════════
# Al renderizar por fin la presentación salieron encimados en las láminas que
# YO NO HICE: «Portad/a», «Problem/a», «Filas enormes» montada sobre su propio
# pie, el nombre del instituto encima del bachillerato. Se comprobó rindiendo
# también `formato-institucional.pptx`: los defectos YA VENÍAN AHÍ.
#
# Se arreglan porque Carlos pidió exactamente eso: «deja el formato puesto pero
# lo demás acomódalo». Los logos, los escudos y las formas no se tocan; lo que
# se mueve son cuadros de texto, que es «lo demás».

def titulo_chico(n, de=9200, a=6200):
    """Baja los títulos de 92 pt a 62 pt SIN tocar los subtítulos que viven en
       el mismo cuadro (por ejemplo «Objetivo» 92 pt + «Justificación» 39 pt).
       92 pt alcanzaba para «Visión»; «¿Para qué sirve Fadori?» se partía en dos
       renglones, y como la caja trae `spAutoFit`, crecía hacia abajo y se comía
       el cuerpo."""
    p = sl(n); s = leer(p)
    escribir(p, s.replace('sz="%d"' % de, 'sz="%d"' % a))

def letra(n, cajas, sz):
    """Baja el tamaño de letra de unos cuadros concretos."""
    p = sl(n); s = leer(p)
    for nombre in cajas:
        s = formato(s, nombre, sz=sz)
    escribir(p, s)

def acomodar(n, cambios):
    """cambios: {'TextBox 7': (x, y, ancho, alto)} en pulgadas."""
    p = sl(n); s = leer(p)
    for nombre, caja in cambios.items():
        s = mover(s, nombre, *caja)
    escribir(p, s)

for n in (5, 6, 7, 8, 9, 10):          # Descripción, Objetivo, Misión, Visión,
    titulo_chico(n)                     # Propósito general, Impacto Esperado

# ── 1 · la portada ───────────────────────────────────────────────────────
# «Instituto Tecnológico en Programación» a 56 pt se partía y aterrizaba encima
# de «Bachillerato Rembrandt». Y los cinco nombres, en una columna de 3.07",
# se encimaban entre ellos y se salían por abajo.
acomodar(1, {
  'TextBox 13': (1.33, 2.50, 16.09, 1.00),   # Instituto Tecnológico
  'TextBox 12': (1.33, 3.62, 16.09, 1.00),   # Bachillerato Rembrandt
  'TextBox 10': (1.33, 4.95, 16.09, 1.60),   # Ciclo académico
  'TextBox 14': (1.33, 6.95, 16.09, 0.90),   # 3.1
  'TextBox 11': (4.60, 7.90, 12.00, 3.00),   # Integrantes + los cinco nombres
})
# Y a 56 pt «Instituto Tecnológico en Programación» se parte igual aunque la
# caja mida 16": no es la caja, es la letra. A 44 pt entra en un renglón con
# aire de sobra. Se comprobó en el render Y en las capturas del teléfono de
# Carlos, que traían el mismo encimado.
letra(1, ['TextBox 13', 'TextBox 12'], 44)
# Los nombres se corrieron a la derecha porque a la izquierda los pisaba la
# retícula de puntos rojos de la esquina.


# ── 2 · la carátula del proyecto ─────────────────────────────────────────
# El encabezado caía justo sobre la diagonal azul y roja de la esquina.
acomodar(2, { 'TextBox 10': (5.20, 0.50, 9.60, 0.95) })

# ── 3 · el índice ────────────────────────────────────────────────────────
# Las etiquetas venían en cajas de 1.16" a 26 pt: «Problema» no cabe en 1.16",
# así que se partía a media palabra. Se ensanchan todas al mismo ancho — que
# además las deja alineadas, cosa que antes tampoco estaban.
acomodar(3, { nombre: (8.56, y, 3.40, 0.55) for nombre, y in [
  ('TextBox 34', 2.69), ('TextBox 35', 3.77), ('TextBox 36', 4.73),
  ('TextBox 37', 5.68), ('TextBox 38', 6.63), ('TextBox 39', 7.59),
  ('TextBox 40', 8.54), ('TextBox 41', 9.62)] })

# ── 4 · el problema ──────────────────────────────────────────────────────
# «El Problema» se partía en dos y caía sobre «¿Qué está pasando?»; «Filas
# enormes» se partía y caía sobre «Hasta 20 minutos formado».
acomodar(4, {
  'TextBox 7':  (1.90, 1.55, 5.20, 0.80),    # El Problema
  'TextBox 8':  (1.90, 2.60, 8.00, 1.10),    # ¿Qué está pasando?
  'TextBox 9':  (1.90, 5.90, 8.00, 1.10),    # Filas enormes
  'TextBox 10': (1.90, 7.20, 8.00, 1.50),    # Hasta 20 minutos formado
  'TextBox 11': (10.23, 5.90, 8.00, 1.10),   # Pedidos manuales
})

# ── 6 · descripción ──────────────────────────────────────────────────────
acomodar(5, { 'TextBox 6': (3.90, 2.90, 12.20, 4.20) })

# ── 8 · objetivo ─────────────────────────────────────────────────────────
# «Objetivo» a 92 pt en 5.43" se partía como «Objetiv / o».
acomodar(6, { 'TextBox 7': (4.50, 0.64, 11.00, 2.54),
              'TextBox 6': (2.68, 3.60, 14.60, 3.00) })

# ── 9 · misión ───────────────────────────────────────────────────────────
acomodar(7, { 'TextBox 3': (1.90, 1.10, 16.20, 1.30),
              'TextBox 2': (1.90, 3.40, 14.28, 5.00) })

# ── 10 · visión ──────────────────────────────────────────────────────────
acomodar(8, { 'TextBox 6': (1.90, 1.10, 16.20, 1.30),
              'TextBox 7': (2.66, 3.60, 15.49, 2.60) })

# ── 11 · propósito general ───────────────────────────────────────────────
# Los tres puntos estaban regados: uno a la izquierda arriba, otro a la derecha,
# el tercero abajo a la izquierda. No era diseño, era dónde cayeron.
acomodar(9, {
  'TextBox 6':  (1.90, 0.80, 16.20, 1.30),   # el título
  'TextBox 11': (5.60, 3.80, 11.00, 0.95),   # ✨ Solución digital
  'TextBox 8':  (5.60, 5.35, 11.00, 0.95),   # 🎯 Pedidos automatizados
  'TextBox 10': (5.60, 6.90, 11.00, 0.95),   # 📱 Web y móvil
  'TextBox 7':  (3.60, 8.80, 13.00, 1.40),   # el cierre en cursiva
})
# Los tres puntos venían centrados, o sea que cada uno arrancaba en un margen
# distinto y a distinta altura: no se leían como una lista sino como tres cosas
# tiradas. Ahora comparten sangría y la misma separación (1.55") entre uno y
# otro. Los emoji los escribió el equipo; ésos se respetan.
letra(9, ['TextBox 11'], 33)          # venía a 40 pt, los otros dos a 33
acomodar(9, {})
_p = sl(9); _s = leer(_p)
for _c in ('TextBox 11', 'TextBox 8', 'TextBox 10'):
    _s = formato(_s, _c, algn='l')
escribir(_p, _s)

# ── 12 · impacto esperado ────────────────────────────────────────────────
acomodar(10, { 'TextBox 7': (4.20, 1.00, 12.40, 2.41),
               'TextBox 2': (2.86, 4.20, 14.00, 2.60) })

# ═══ EL ORDEN ═════════════════════════════════════════════════════════════
ORDEN = [1, 2, 3, 4, clon['que-es'], 5, clon['como'], 6, 7, 8, 9, 10,
         clon['enfoque'], clon['S'], clon['T'], clon['E'], clon['A'],
         clon['M'], clon['estado']]

pres_p = os.path.join(TRAB, 'ppt', 'presentation.xml')
pres = leer(pres_p)
rels = leer(os.path.join(TRAB, 'ppt', '_rels', 'presentation.xml.rels'))
# de número de diapositiva a su rId
por_slide = {}
for m in re.finditer(r'Id="(rId\d+)"[^>]*Target="slides/slide(\d+)\.xml"', rels):
    por_slide[int(m.group(2))] = m.group(1)
lista = ''.join('<p:sldId id="%d" r:id="%s"/>' % (256 + i, por_slide[n])
                for i, n in enumerate(ORDEN))
pres = re.sub(r'<p:sldIdLst>.*?</p:sldIdLst>', '<p:sldIdLst>' + lista + '</p:sldIdLst>',
              pres, flags=re.S)
escribir(pres_p, pres)

# ═══ EMPACAR ══════════════════════════════════════════════════════════════
if os.path.exists(SALIDA): os.remove(SALIDA)
subprocess.run(['zip', '-Xrq', SALIDA, '.'], cwd=TRAB, check=True)

print('\n── palabras por diapositiva (la rúbrica pide 15 como máximo) ──')
mal = 0
for i, n in enumerate(ORDEN, 1):
    NOMBRES = ['Renata Zoe', 'Brenda Natalia', 'Christopher Yuudai',
               'Marco Olvera', 'Carlos Gutiérrez']
    c = palabras_de(n, sin=NOMBRES if i == 1 else ())
    marca = ''
    if i == 1:
        marca = '  (sin contar los 5 nombres, que la rúbrica pide)'
    if c > 15:
        marca += '  ⚠ SE PASA'; mal += 1
    print('%2d · %2d palabras%s' % (i, c, marca))
print(('\n⚠ %d se pasan de 15' % mal) if mal else
      '\n✓ todas caben en 15 palabras')
print('✓', SALIDA)
