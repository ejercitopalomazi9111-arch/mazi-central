"""armar.py · Física: el movimiento en dos dimensiones y la catapulta.

Carlos, 22 de octubre de 2026. Lo que pidió el maestro:
  - ¿Cuál es la importancia del movimiento en dos dimensiones?
  - ¿Cómo funciona una catapulta y con qué fin se inventaron? Artefactos que lo usan.
  - Imágenes del paso a paso de cómo hicieron la catapulta.
  - ¿Cómo calcularían el alcance de su catapulta con las fórmulas?

Va sobre el formato institucional (`formato-institucional.pptx`, el que mandó la
escuela): sus logos y sus formas no se tocan, se clonan sus láminas y sólo se
cambia el contenido. Las fotos del paso a paso y los planos son la evidencia del
equipo (`evidencia/`, mandada por Carlos el 22 de octubre): su catapulta es un
fundíbulo de contrapeso, no de liga.

  node escuela/fisica-catapulta/diagramas.mjs     # si cambian los dibujos
  python3 escuela/fisica-catapulta/armar.py       # → Fisica-catapulta.pptx
"""
import copy, glob, os, shutil, subprocess, sys, tempfile, zipfile
from PIL import Image
from pptx import Presentation
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.text import MSO_ANCHOR, PP_ALIGN
from pptx.oxml.ns import qn
from pptx.util import Emu, Pt

AQUI = os.path.dirname(os.path.abspath(__file__))
PLANTILLA = os.path.join(AQUI, 'formato-institucional.pptx')
SALE = os.path.join(AQUI, 'Fisica-catapulta.pptx')
SKILL = (glob.glob('/root/.claude/skills/synced/*/pptx') + [''])[0]

AZUL, NARANJA, BLANCO, ROJO, OSCURO, CLARO = '07416B', 'FF914D', 'FFFFFF', 'C8102E', '0A2E4D', 'BFD6EA'
TITULO, CUERPO = 'Nourd Heavy', 'Arial'          # el título con la letra de la plantilla
M = lambda v: Emu(int(round(v * 1_000_000)))     # medidas en millones de EMU, como la plantilla


# ── 1 · clonar las láminas de la plantilla ─────────────────────────────────
tmp = tempfile.mkdtemp()
with zipfile.ZipFile(PLANTILLA) as z: z.extractall(tmp)
def clonar(fuente):
    r = subprocess.run([sys.executable, os.path.join(SKILL, 'scripts/add_slide.py'), tmp, fuente],
                       capture_output=True, text=True, check=True)
    return r.stdout.split('Created ')[1].split(' ')[0].split('/')[-1]
clones = [clonar('slide4.xml') for _ in range(7)]
blanca = clonar('slide2.xml')
base = os.path.join(tmp, 'base.pptx')
with zipfile.ZipFile(base, 'w', zipfile.ZIP_DEFLATED) as z:
    for raiz, _, archivos in os.walk(tmp):
        for a in archivos:
            ruta = os.path.join(raiz, a)
            if ruta != base: z.write(ruta, os.path.relpath(ruta, tmp))

prs = Presentation(base)
por_nombre = {s.part.partname.split('/')[-1]: s for s in prs.slides}
# el orden, igual que el índice: portada, contenido, qué es (la 4), por qué importa (la 5),
# cuatro oscuras (la última, nuestro diseño), el paso a paso en dos blancas, tres oscuras de
# fórmulas y el cierre (la 6)
orden = (['slide1.xml', 'slide3.xml', 'slide4.xml', 'slide5.xml'] + clones[:4] + ['slide2.xml', blanca]
         + clones[4:] + ['slide6.xml'])
lista = prs.slides._sldIdLst
ids = {s.part.partname.split('/')[-1]: e for s, e in zip(prs.slides, list(lista))}
for e in list(lista): lista.remove(e)
for n in orden: lista.append(ids[n])
L = [por_nombre[n] for n in orden]


# ── 2 · ayudantes ───────────────────────────────────────────────────────────
def quitar(slide, *nombres):
    for sp in list(slide.shapes):
        if sp.name in nombres: sp._element.getparent().remove(sp._element)

def caja(slide, x, y, w, h, parrafos, tam=24, color=BLANCO, negrita=False, fuente=CUERPO,
         alinear=PP_ALIGN.LEFT, ancla=MSO_ANCHOR.TOP, interlineado=1.1, espacio=8):
    """parrafos: lista de str o de listas [(texto, {'color','negrita','tam'}), …]; '• ' al inicio = viñeta."""
    tb = slide.shapes.add_textbox(M(x), M(y), M(w), M(h))
    tf = tb.text_frame; tf.word_wrap = True
    tf.margin_left = tf.margin_right = tf.margin_top = tf.margin_bottom = 0
    tf.vertical_anchor = ancla
    for i, par in enumerate(parrafos):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.alignment = alinear; p.line_spacing = interlineado; p.space_after = Pt(espacio)
        trozos = [(par, {})] if isinstance(par, str) else par
        if trozos and trozos[0][0].startswith('• '):
            trozos = [(trozos[0][0][2:], trozos[0][1])] + trozos[1:]
            pPr = p._p.get_or_add_pPr()
            pPr.set('marL', str(int(tam * 12700 * 1.1))); pPr.set('indent', str(-int(tam * 12700 * 1.1)))
            bc = pPr.makeelement(qn('a:buClr'), {}); sc = bc.makeelement(qn('a:srgbClr'), {'val': NARANJA}); bc.append(sc)
            bu = pPr.makeelement(qn('a:buChar'), {'char': '•'})
            pPr.append(bc); pPr.append(bu)
        for texto, est in trozos:
            r = p.add_run(); r.text = texto
            f = r.font; f.size = Pt(est.get('tam', tam)); f.bold = est.get('negrita', negrita)
            f.color.rgb = RGBColor.from_string(est.get('color', color)); f.name = est.get('fuente', fuente)
    return tb

def titulo(slide, texto, x=4.45, y=0.62, w=13.4, color=NARANJA, tam=50):
    return caja(slide, x, y, w, 1.0, [texto], tam=tam, color=color, negrita=True, fuente=TITULO, ancla=MSO_ANCHOR.MIDDLE)

def rect(slide, x, y, w, h, relleno=OSCURO, borde=None):
    s = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, M(x), M(y), M(w), M(h))
    s.fill.solid(); s.fill.fore_color.rgb = RGBColor.from_string(relleno)
    if borde: s.line.color.rgb = RGBColor.from_string(borde); s.line.width = Pt(2)
    else: s.line.fill.background()
    s.shadow.inherit = False
    return s

def tarjeta(slide, x, y, w, h, cabeza, cuerpo, tam=26, relleno=OSCURO, cab_color=NARANJA):
    rect(slide, x, y, w, h, relleno)
    caja(slide, x + 0.28, y + 0.24, w - 0.56, h - 0.4,
         [[(cabeza, {'negrita': True, 'color': cab_color, 'tam': tam + 4})], cuerpo], tam=tam, espacio=6)

def foto(slide, ruta, x, y, w, h):
    """La foto llena el hueco sin deformarse: se recorta lo que sobra."""
    iw, ih = Image.open(ruta).size
    pic = slide.shapes.add_picture(ruta, M(x), M(y), M(w), M(h))
    hueco, img = w / h, iw / ih
    if img > hueco:
        sobra = (1 - hueco / img) / 2; pic.crop_left = pic.crop_right = sobra
    else:
        sobra = (1 - img / hueco) / 2; pic.crop_top = pic.crop_bottom = sobra
    return pic

def diagrama(slide, nombre, x, y, w):
    ruta = os.path.join(AQUI, 'diagramas', nombre + '.png')
    iw, ih = Image.open(ruta).size
    return slide.shapes.add_picture(ruta, M(x), M(y), M(w), M(w * ih / iw))

# ── 3 · las láminas ─────────────────────────────────────────────────────────
# 1 · portada
s = L[0]
for sp in s.shapes:
    if sp.has_text_frame:
        for p in sp.text_frame.paragraphs:
            for r in p.runs:
                if '2025' in r.text: r.text = r.text.replace('2025', '2026')
caja(s, 1.6, 7.32, 11.6, 1.1, [[('Física', {'color': ROJO}), (' · El movimiento en dos dimensiones y la catapulta', {'color': AZUL})]],
     tam=30, negrita=True, fuente=TITULO, alinear=PP_ALIGN.CENTER, ancla=MSO_ANCHOR.MIDDLE)

# 2 · contenido
s = L[1]
for sp in s.shapes:
    if sp.name == 'TextBox 42':
        sp.text_frame.paragraphs[0].runs[0].text = '8'
temas = ['¿Qué es el movimiento en dos dimensiones?', '¿Por qué es importante?', '¿Cómo funciona una catapulta?',
         '¿Con qué fin se inventaron?', 'Artefactos que usan el movimiento en 2D', 'Nuestra catapulta: diseño y armado',
         'Las fórmulas del tiro parabólico', 'Cómo calculamos el alcance']
alturas = [2.528, 3.332, 4.233, 5.110, 5.987, 6.864, 7.740, 8.665]
for t, y in zip(temas, alturas):
    caja(s, 7.55, y, 7.6, 0.66, [t], tam=24, color=AZUL, negrita=True, ancla=MSO_ANCHOR.MIDDLE)

# 3 · qué es
s = L[2]; quitar(s, 'TextBox 6', 'TextBox 7')
titulo(s, '¿Qué es el movimiento en dos dimensiones?', tam=44)
diagrama(s, 'trayectoria', 0.75, 2.2, 10.6)
caja(s, 11.85, 2.25, 5.9, 4.0, [
    'Es cuando algo avanza y sube o baja al mismo tiempo, como una pelota lanzada.',
    [('Se estudia en dos partes que no se estorban:', {'negrita': True, 'color': NARANJA})],
    [('• Horizontal (x): ', {'negrita': True}), ('va a velocidad constante.', {})],
    [('• Vertical (y): ', {'negrita': True}), ('la gravedad la jala a 9.81 m/s².', {})],
    'Juntas dibujan una parábola: el tiro parabólico.'], tam=26)

# 4 · por qué importa (lámina 5 de la plantilla: adornos en las esquinas)
s = L[3]
titulo(s, '¿Por qué es importante?', x=3.9)
w, h, g = 4.75, 3.35, 0.3
tarjeta(s, 3.9, 2.0, w, h, 'Deportes', 'Un tiro de básquet, un pase largo o un despeje siguen una parábola: ángulo y fuerza deciden si entra.')
tarjeta(s, 3.9 + w + g, 2.0, w, h, 'Seguridad', 'Se calcula dónde cae el chorro de una manguera de bomberos o la ayuda que se suelta desde un avión.')
tarjeta(s, 3.9, 2.0 + h + g, w, h, 'Tecnología', 'Videojuegos como Angry Birds, robots que lanzan y simuladores usan estas mismas fórmulas.')
tarjeta(s, 3.9 + w + g, 2.0 + h + g, w, h, 'Predecir', 'Nos deja saber dónde va a caer algo antes de lanzarlo, sin adivinar.')
foto(s, os.path.join(AQUI, 'fotos/basquet.jpg'), 14.15, 4.05, 3.75, 5.0)

# 5 · cómo funciona
s = L[4]; quitar(s, 'TextBox 6', 'TextBox 7')
titulo(s, '¿Cómo funciona una catapulta?')
diagrama(s, 'catapulta', 0.6, 2.15, 10.4)
caja(s, 11.3, 2.2, 6.6, 4.05, [
    [('1 Cargar. ', {'negrita': True, 'color': NARANJA}), ('Se jala el brazo; la liga se estira y guarda energía.', {})],
    [('2 Soltar. ', {'negrita': True, 'color': NARANJA}), ('La liga empuja el brazo, que gira sobre el pivote.', {})],
    [('3 Lanzar. ', {'negrita': True, 'color': NARANJA}), ('El tope frena el brazo y la bola sigue con velocidad v₀ y ángulo θ.', {})],
    [('4 Volar. ', {'negrita': True, 'color': NARANJA}), ('Desde ahí es tiro parabólico.', {})]], tam=28, espacio=14)
caja(s, 0.75, 8.55, 12.0, 0.9, [[('Energía elástica (la liga)  →  energía de movimiento (la bola)', {'negrita': True})]],
     tam=30, color=CLARO, ancla=MSO_ANCHOR.MIDDLE)

# 6 · para qué se inventaron
s = L[5]; quitar(s, 'TextBox 6', 'TextBox 7')
titulo(s, '¿Con qué fin se inventaron?')
caja(s, 0.85, 2.15, 11.8, 7.8, [
    [('Hacia el año 399 a.C. ', {'negrita': True, 'color': NARANJA}),
     ('los ingenieros de Dionisio I, en Siracusa (Grecia antigua), hicieron las primeras catapultas.', {})],
    [('Su fin era la guerra: ', {'negrita': True, 'color': NARANJA}),
     ('en los asedios lanzaban piedras y flechas desde lejos y por encima de las murallas, fuera del alcance del enemigo.', {})],
    [('Fueron mejorando: ', {'negrita': True, 'color': NARANJA}),
     ('la balista (una ballesta gigante), el onagro romano (cuerdas torcidas) y el trebuchet medieval, que usa un contrapeso.', {})],
    [('Hoy ', {'negrita': True, 'color': NARANJA}),
     ('ya no son armas: sirven para enseñar física, en concursos escolares y en recreaciones históricas.', {})]],
    tam=30, espacio=20)
foto(s, os.path.join(AQUI, 'fotos/trebuchet.jpg'), 13.1, 2.15, 4.5, 3.75)
caja(s, 13.1, 5.95, 4.5, 0.4, ['Réplica de un trebuchet'], tam=16, color=CLARO, alinear=PP_ALIGN.CENTER)

# 7 · artefactos
s = L[6]; quitar(s, 'TextBox 6', 'TextBox 7')
titulo(s, 'Artefactos que usan el movimiento en 2D', tam=44)
cosas = [('Trebuchet', 'Un contrapeso cae y hace girar el brazo que lanza.'),
         ('Balista', 'Una ballesta gigante: la flecha vuela en parábola.'),
         ('Cañón y mortero', 'La bala sale con un ángulo y dibuja una parábola.'),
         ('Lanzapelotas', 'Las de tenis y béisbol ajustan ángulo y velocidad.'),
         ('Aspersores y fuentes', 'El chorro de agua es una parábola: el ángulo decide hasta dónde moja.'),
         ('Fuegos artificiales', 'Se lanzan con ángulo y tiempo calculados para estallar arriba.')]
w, h, g = 3.95, 3.55, 0.25
for i, (a, b) in enumerate(cosas):
    tarjeta(s, 0.75 + (i % 3) * (w + g), 2.15 + (i // 3) * (h + g), w, h, a, b, tam=25)
foto(s, os.path.join(AQUI, 'fotos/fuegos.jpg'), 13.55, 2.15, 4.1, 3.9)

# 8 · la nuestra: un fundíbulo (trebuchet), con sus planos
EV = lambda n: os.path.join(AQUI, 'evidencia', n)
s = L[7]; quitar(s, 'TextBox 6', 'TextBox 7')
titulo(s, 'La nuestra: un fundíbulo (trebuchet)', tam=44)
foto(s, EV('01.jpg'), 0.75, 2.15, 3.2, 6.6)
foto(s, EV('02.jpg'), 4.15, 2.15, 3.2, 6.6)
caja(s, 0.75, 8.85, 6.6, 0.5, ['Nuestros planos, con cada pieza y sus medidas'], tam=18, color=CLARO, alinear=PP_ALIGN.CENTER)
caja(s, 7.85, 2.15, 5.3, 7.4, [
    [('En vez de liga usa un ', {}), ('contrapeso', {'negrita': True, 'color': NARANJA}), (': unas pesas que caen.', {})],
    [('Al caer, el ', {}), ('brazo corto', {'negrita': True, 'color': NARANJA}), (' baja y el ', {}), ('brazo largo', {'negrita': True, 'color': NARANJA}),
     (' sube con fuerza y lanza el proyectil.', {})],
    [('Un ', {}), ('gatillo', {'negrita': True, 'color': NARANJA}), (' detiene el brazo hasta el disparo.', {})],
    [('La estructura en A sostiene el ', {}), ('eje', {'negrita': True, 'color': NARANJA}), (' donde gira el brazo.', {})],
    [('Energía potencial del contrapeso (m·g·h) → energía de movimiento del proyectil', {'negrita': True, 'color': CLARO})]],
    tam=25, espacio=16)
foto(s, EV('05-recorte.jpg'), 13.45, 2.15, 4.2, 3.12)
caja(s, 13.45, 5.35, 4.2, 0.5, ['Referencia: un fundíbulo real (Wikipedia)'], tam=16, color=CLARO, alinear=PP_ALIGN.CENTER)

# 9 y 10 · paso a paso, con sus fotos (las dos blancas de la plantilla, con el escudo)
PASOS = [('Planos y medidas', 'Dibujamos cada pieza con su medida.', ['02.jpg']),
         ('Piezas y pesas', 'Cortamos la melamina; las pesas son el contrapeso.', ['03.jpg']),
         ('Medir el brazo', 'Medimos y marcamos la tabla del brazo.', ['06.jpg']),
         ('Perforar el eje', 'El hueco por donde pasa el tubo del eje.', ['07.jpg']),
         ('El pivote', 'El tubo en el poste y los pernos donde gira.', ['08.jpg', '09.jpg']),
         ('La estructura', 'La base y las patas en A, ya armadas.', ['10.jpg'])]
w, hf, g = 3.3, 4.85, 0.3
for hoja in range(2):
    s = L[8 + hoja]
    titulo(s, f'Paso a paso ({hoja + 1} de 2)', x=5.2, y=1.85, w=7.9, color=AZUL, tam=36)
    for k in range(3):
        n = hoja * 3 + k; nombre, que, fotos = PASOS[n]
        x = 2.75 + k * (w + g); y = 2.95
        if len(fotos) == 1:
            foto(s, EV(fotos[0]), x, y, w, hf)
        else:                                    # una arriba y la de cerca abajo
            foto(s, EV(fotos[0]), x, y, w, hf * 0.6 - 0.05)
            foto(s, EV(fotos[1]), x, y + hf * 0.6 + 0.05, w, hf * 0.4 - 0.05)
        caja(s, x, y + hf + 0.12, w, 1.6, [[(f'{n + 1} · ', {'color': ROJO}), (nombre, {})],
                                           [(que, {'negrita': False, 'tam': 18, 'color': '3A5A78'})]],
             tam=24, color=AZUL, negrita=True, alinear=PP_ALIGN.CENTER, espacio=4)

# 11 · descomponer la velocidad
s = L[10]; quitar(s, 'TextBox 6', 'TextBox 7')
titulo(s, 'Las fórmulas: partir la velocidad en dos', tam=44)
diagrama(s, 'vectores', 0.6, 2.05, 9.0)
caja(s, 9.9, 2.25, 7.9, 3.9, [
    'La bola sale con velocidad v₀ y ángulo θ. Esa velocidad se parte en:',
    [('vₓ = v₀ · cos θ', {'negrita': True, 'color': '4FA3E0', 'tam': 36}), ('   lo que avanza', {})],
    [('vᵧ = v₀ · sen θ', {'negrita': True, 'color': NARANJA, 'tam': 36}), ('   lo que sube', {})],
    'Cada parte se trabaja por separado.'], tam=28, espacio=16)
rect(s, 0.75, 7.25, 12.3, 2.6, OSCURO)
caja(s, 1.05, 7.42, 11.8, 2.3, [
    [('¿Dónde está la bola en el tiempo t?', {'negrita': True, 'color': NARANJA})],
    [('x = vₓ · t', {'negrita': True, 'tam': 32}), ('        avanza parejo', {'color': CLARO})],
    [('y = vᵧ · t − ½ · g · t²', {'negrita': True, 'tam': 32}), ('        la gravedad la regresa  (g = 9.81 m/s²)', {'color': CLARO})]],
    tam=24, espacio=4)

# 12 · el alcance
s = L[11]; quitar(s, 'TextBox 6', 'TextBox 7')
titulo(s, 'El alcance: hasta dónde llega')
formulas = [('Tiempo de vuelo', 't = 2 · v₀ · sen θ / g', 'cuánto dura en el aire'),
            ('Altura máxima', 'H = (v₀ · sen θ)² / 2g', 'lo más alto que sube'),
            ('Alcance', 'R = v₀² · sen(2θ) / g', 'hasta dónde llega')]
for i, (a, f, b) in enumerate(formulas):
    y = 2.15 + i * 2.5
    rect(s, 0.75, y, 7.6, 2.25, NARANJA if i == 2 else OSCURO)
    caja(s, 1.05, y + 0.2, 7.0, 1.9, [[(a, {'negrita': True, 'color': AZUL if i == 2 else NARANJA})],
                                       [(f, {'negrita': True, 'tam': 38, 'color': AZUL if i == 2 else BLANCO})],
                                       [(b, {'color': AZUL if i == 2 else CLARO})]], tam=26, espacio=4)
diagrama(s, 'angulos', 8.85, 2.0, 8.6)
caja(s, 8.85, 6.6, 4.45, 3.2, [
    'sen(2θ) vale lo más (1) cuando θ = 45°.',
    [('Por eso 45° es el ángulo que llega más lejos.', {'negrita': True, 'color': NARANJA})]], tam=26, espacio=10)

# 11 · cómo lo calculamos con nuestra catapulta
s = L[12]; quitar(s, 'TextBox 6', 'TextBox 7')
titulo(s, 'Cómo calculamos el alcance de la nuestra', tam=42)
caja(s, 0.85, 2.15, 9.2, 7.8, [
    [('1 Ángulo θ. ', {'negrita': True, 'color': NARANJA}), ('Es la dirección con la que sale el proyectil. Se mide en el video del tiro, en cámara lenta, con un transportador sobre la pantalla.', {})],
    [('2 Tiempo de vuelo t. ', {'negrita': True, 'color': NARANJA}), ('Se graba el tiro en cámara lenta y se cuenta del disparo al golpe en el piso.', {})],
    [('3 Velocidad de salida. ', {'negrita': True, 'color': NARANJA}), ('v₀ = g · t / (2 · sen θ)', {'negrita': True})],
    [('4 Alcance. ', {'negrita': True, 'color': NARANJA}), ('R = v₀² · sen(2θ) / g', {'negrita': True})],
    [('5 Comprobar. ', {'negrita': True, 'color': NARANJA}), ('Se mide con cinta métrica dónde cayó y se compara con R.', {})]],
    tam=26, espacio=14)
rect(s, 10.4, 2.15, 7.25, 3.35, OSCURO, borde=NARANJA)
caja(s, 10.7, 2.35, 6.7, 3.7, [
    [('Ejemplo con números de prueba', {'negrita': True, 'color': NARANJA})],
    'θ = 45°   ·   t = 0.60 s',
    'v₀ = 9.81 × 0.60 / (2 × 0.707) = 4.16 m/s',
    [('R = 4.16² × sen 90° / 9.81 = ', {}), ('1.77 m', {'negrita': True, 'color': NARANJA, 'tam': 34})]], tam=26, espacio=14)
caja(s, 10.4, 5.7, 2.9, 3.2, ['Supone que sale y cae a la misma altura, sin contar el aire.'], tam=20, color=CLARO)

# 12 · conclusión (la 6 de la plantilla)
s = L[13]
titulo(s, 'Conclusión', x=6.3, y=0.9, w=6.0, tam=54)
caja(s, 4.6, 3.0, 7.9, 5.4, [
    '• El movimiento en dos dimensiones se entiende partiéndolo en dos: lo horizontal va parejo y lo vertical lo cambia la gravedad.',
    '• Una catapulta convierte energía guardada (una liga o, en la nuestra, un contrapeso) en un tiro parabólico.',
    '• Con el ángulo y el tiempo de vuelo podemos calcular el alcance antes de lanzar.'], tam=28, espacio=18)
caja(s, 4.6, 8.55, 7.8, 0.9, ['¡Gracias!'], tam=44, color=NARANJA, negrita=True, fuente=TITULO)

prs.save(SALE)
shutil.rmtree(tmp)

# cuántas láminas y si hay texto vacío
print('listo:', SALE, '·', len(prs.slides._sldIdLst), 'láminas')
