"""armar.py · el video institucional de la presentación de Física (la catapulta).

Cada lámina de la presentación (renderizada a 1080p) es una escena con un zoom
lento; el paso a paso se cuenta con las fotos del equipo a pantalla completa. La
voz es voz/NN.mp3 (voz.mjs) y la música «Inspired» de Kevin MacLeod (CC BY 4.0),
que se agacha cuando habla el narrador.

  pdftoppm -png -scale-to-x 1920 -scale-to-y 1080 ../Fisica-catapulta.pdf laminas/l
  MUSICA=<Inspired.mp3> python3 escuela/fisica-catapulta/video/armar.py   → Fisica-catapulta.mp4
"""
import os, subprocess
from PIL import Image, ImageDraw, ImageFilter, ImageFont

AQUI = os.path.dirname(os.path.abspath(__file__))
EV = os.path.join(AQUI, '..', 'evidencia')
ESC = os.path.join(AQUI, 'escenas'); os.makedirs(ESC, exist_ok=True)
CLIPS = os.path.join(AQUI, 'clips'); os.makedirs(CLIPS, exist_ok=True)
SALE = os.path.join(AQUI, 'Fisica-catapulta.mp4')
MUSICA = os.environ.get('MUSICA', '/tmp/claude-0/musica/Inspired.mp3')
W, H, FPS, T = 1920, 1080, 30, 0.6                 # T = lo que dura cada fundido
AZUL, OSCURO, NARANJA, ROJO = (7, 65, 107), (10, 46, 77), (255, 145, 77), (200, 16, 46)
NEG = '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf'
REG = '/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf'
letra = lambda f, t: ImageFont.truetype(f, t)
dura = lambda f: float(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]))
lam = lambda n: os.path.join(AQUI, 'laminas', f'l-{n:02d}.png')
voz = lambda n: os.path.join(AQUI, 'voz', f'{n:02d}.mp3')


def cubrir(im, w, h):
    r = max(w / im.width, h / im.height)
    im = im.resize((round(im.width * r), round(im.height * r)), Image.LANCZOS)
    x, y = (im.width - w) // 2, (im.height - h) // 2
    return im.crop((x, y, x + w, y + h))

def caber(im, w, h):
    r = min(w / im.width, h / im.height)
    return im.resize((round(im.width * r), round(im.height * r)), Image.LANCZOS)

def renglones(d, texto, f, ancho):
    sal, linea = [], ''
    for p in texto.split():
        prueba = (linea + ' ' + p).strip()
        if d.textlength(prueba, font=f) <= ancho: linea = prueba
        else: sal.append(linea); linea = p
    return sal + [linea]

def escena_paso(n, titulo, que, fotos):
    """Una foto del equipo en grande, con el paso a la derecha."""
    base = Image.open(os.path.join(EV, fotos[0])).convert('RGB')
    fondo = cubrir(base, W, H).filter(ImageFilter.GaussianBlur(28))
    fondo = Image.blend(fondo, Image.new('RGB', (W, H), OSCURO), 0.72)
    zona_w, zona_h, x0, y0 = 1040, 920, 70, 80
    if len(fotos) == 1:
        f = caber(base, zona_w, zona_h)
        fondo.paste(f, (x0 + (zona_w - f.width) // 2, y0 + (zona_h - f.height) // 2))
    else:                                            # dos fotos lado a lado
        mitad = (zona_w - 20) // 2
        for k, nombre in enumerate(fotos):
            f = caber(Image.open(os.path.join(EV, nombre)).convert('RGB'), mitad, zona_h)
            fondo.paste(f, (x0 + k * (mitad + 20) + (mitad - f.width) // 2, y0 + (zona_h - f.height) // 2))
    d = ImageDraw.Draw(fondo)
    x = 1190
    d.text((x, 96), 'BACHILLERATO REMBRANDT · FÍSICA', font=letra(NEG, 26), fill=(191, 214, 234))
    d.ellipse((x, 300, x + 130, 430), fill=NARANJA)
    d.text((x + 65, 365), str(n), font=letra(NEG, 84), fill=AZUL, anchor='mm')
    d.text((x + 160, 345), f'Paso {n} de {len(PASOS)}', font=letra(REG, 34), fill=(191, 214, 234), anchor='lm')
    y = 480
    for r in renglones(d, titulo, letra(NEG, 66), 650):
        d.text((x, y), r, font=letra(NEG, 66), fill='white'); y += 80
    y += 20
    for r in renglones(d, que, letra(REG, 38), 650):
        d.text((x, y), r, font=letra(REG, 38), fill=(220, 232, 243)); y += 52
    d.rectangle((x, 990, x + 120, 996), fill=ROJO)    # la firma roja de la plantilla
    ruta = os.path.join(ESC, f'paso{n}.png'); fondo.save(ruta); return ruta

ARCH = os.path.join(AQUI, '..', 'equipo.txt')
_n = [x.strip() for x in open(ARCH, encoding='utf-8') if x.strip()] if os.path.exists(ARCH) else []
NOMBRES = ', '.join(_n[:-1]) + ' y ' + _n[-1] if len(_n) > 1 else ''.join(_n)

def escena_creditos():
    im = Image.new('RGB', (W, H), AZUL); d = ImageDraw.Draw(im)
    lineas = [('Física · El movimiento en dos dimensiones y la catapulta', NEG, 52, 'white'),
              ('Bachillerato Rembrandt · Instituto Tecnológico en Programación', REG, 36, (191, 214, 234)),
              ('Ciclo Agosto – Diciembre 2026', REG, 36, (191, 214, 234)),
              ('', REG, 30, 'white'),
              ('Música: «Inspired», Kevin MacLeod (incompetech.com) · CC BY 4.0', REG, 30, (191, 214, 234)),
              ('Fotos de apoyo: Unsplash y Wikipedia · Fotos del proyecto: el equipo', REG, 30, (191, 214, 234))]
    if NOMBRES: lineas.insert(3, ('Equipo: ' + NOMBRES, NEG, 34, 'white'))
    y = 330
    for t, f, tam, c in lineas:
        if t: d.text((W / 2, y), t, font=letra(f, tam), fill=c, anchor='mm')
        y += tam + 34
    d.rectangle((W / 2 - 60, 250, W / 2 + 60, 256), fill=NARANJA)
    ruta = os.path.join(ESC, 'creditos.png'); im.save(ruta); return ruta


# ── el guion: (imagen, voz o None, segundos si no hay voz) ──────────────────
PASOS = [('Planos y medidas', 'Dibujamos cada pieza con su medida.', ['01.jpg', '02.jpg']),
         ('Herramientas', 'Pegamento, engrapadora, lija y cinta métrica.', ['14-herramientas.jpg']),
         ('Piezas y pesas', 'Cortamos la melamina; las pesas son el contrapeso.', ['03.jpg']),
         ('Medir el brazo', 'Medimos y marcamos la tabla del brazo.', ['06.jpg']),
         ('Perforar', 'Los huecos para el eje y los pernos.', ['11-perforar.jpg', '07.jpg']),
         ('El pivote', 'El tubo en el poste y los pernos donde gira el brazo.', ['08.jpg', '09.jpg']),
         ('El marco', 'Unimos las tablas de la base.', ['15-mesa.jpg', '13-marco.jpg']),
         ('Revisar piezas', 'Algunas piezas de aglomerado se desmoronaron.', ['16-aglomerado.jpg', '12-piezas.jpg']),
         ('La estructura', 'La base y las patas en A, ya armadas.', ['10.jpg'])]
GUION = [(lam(1), 1, 0), (lam(2), None, 4.0), (lam(3), 2, 0), (lam(4), 3, 0), (lam(5), 4, 0), (lam(6), 5, 0),
         (lam(7), 6, 0), (lam(8), 7, 0)]
GUION += [(escena_paso(i + 1, *p), 8 + i, 0) for i, p in enumerate(PASOS)]
EQUIPO = os.path.exists(voz(17))                    # la lámina del equipo (selfie y nombres) sólo si hay voz
GUION += [(lam(12), 17, 0)] * EQUIPO + [(lam(13), 18, 0), (lam(14), 19, 0), (lam(15), 20, 0), (lam(16), 21, 0),
                                         (escena_creditos(), None, 6.0)]

ANTES, DESPUES = 0.6, 0.9                          # aire antes y después de cada frase
duraciones = [max(3.0, ANTES + dura(voz(v)) + DESPUES) if v else s for _, v, s in GUION]

# ── cada escena con su zoom lento (se agranda antes para que no tiemble) ──────
for i, ((img, _, _), d) in enumerate(zip(GUION, duraciones)):
    n = round(d * FPS)
    hacia = 'iw/2-(iw/zoom/2)', 'ih/2-(ih/zoom/2)'
    vf = (f"scale={W * 2}:{H * 2},zoompan=z='1+0.05*on/{n}':x='{hacia[0]}':y='{hacia[1]}':d={n}:s={W}x{H}:fps={FPS},"
          f"format=yuv420p")
    subprocess.run(['ffmpeg', '-y', '-v', 'error', '-loop', '1', '-i', img, '-vf', vf, '-frames:v', str(n),
                    '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', os.path.join(CLIPS, f'{i:02d}.mp4')], check=True)
    print('escena', i + 1, f'{d:.1f} s')

# ── se juntan con fundidos, y el audio: voz al frente, música agachándose ─────
ent, fil = [], []
for i in range(len(GUION)): ent += ['-i', os.path.join(CLIPS, f'{i:02d}.mp4')]
previo, acum = '[0:v]', duraciones[0]
for i in range(1, len(GUION)):
    sal = f'[v{i}]'
    fil.append(f'{previo}[{i}:v]xfade=transition=fade:duration={T}:offset={acum - T:.3f}{sal}')
    previo, acum = sal, acum + duraciones[i] - T
total = acum
inicio = [sum(duraciones[:k]) - k * T for k in range(len(GUION))]
voces = []
for k, (_, v, _) in enumerate(GUION):
    if not v: continue
    j = len(GUION) + len(voces)
    ent += ['-i', voz(v)]
    ms = round((inicio[k] + ANTES) * 1000)
    fil.append(f'[{j}:a]aformat=sample_rates=44100:channel_layouts=stereo,adelay={ms}|{ms}[a{len(voces)}]')
    voces.append(f'[a{len(voces)}]')
m = len(GUION) + len(voces)
ent += ['-i', MUSICA]
fil.append(f"{''.join(voces)}amix=inputs={len(voces)}:normalize=0,apad,atrim=0:{total:.3f},asplit=2[voz][llave]")
fil.append(f'[{m}:a]aformat=sample_rates=44100:channel_layouts=stereo,atrim=0:{total:.3f},volume=0.32,'
           f'afade=t=in:d=1.5,afade=t=out:st={total - 4:.3f}:d=4[mus]')
fil.append('[mus][llave]sidechaincompress=threshold=0.03:ratio=8:attack=40:release=500[musb]')
fil.append('[voz][musb]amix=inputs=2:normalize=0,loudnorm=I=-16:TP=-1.5:LRA=11[aud]')
subprocess.run(['ffmpeg', '-y', '-v', 'error', *ent, '-filter_complex', ';'.join(fil), '-map', previo, '-map', '[aud]',
                '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-pix_fmt', 'yuv420p', '-r', str(FPS),
                '-c:a', 'aac', '-b:a', '192k', '-ar', '44100', '-movflags', '+faststart', SALE], check=True)
print('listo:', SALE, f'{total:.1f} s')
