"""EL PIETAJE DEL TRÁILER DE CARYMO: clips reales de Mixkit (licencia Mixkit: uso comercial libre, sin crédito
obligatorio; no se reparten sueltos, por eso los cuadros NO van al repo) recortados a 9:16, con color de cine
(sombras moradas, luces cálidas) y en cuadros sueltos a 30 por segundo para que la composición los pinte exactos.

    python3 carymo/trailer/preparar.py [toma …]

Los videos originales se guardan en /tmp/claude-0/clips/4k (se bajan solos si faltan)."""
import os, subprocess, sys, urllib.request, json
AQUI = os.path.dirname(os.path.abspath(__file__)); CLIPS = '/tmp/claude-0/clips/4k'; os.makedirs(CLIPS, exist_ok=True)
CINE = "eq=contrast=1.12:saturation=0.85:gamma=0.94,colorbalance=rs=-0.02:gs=-0.03:bs=0.09:rm=0.02:gm=-0.02:bm=0.03:rh=0.06:gh=0.01:bh=-0.04"
# toma: (clip, desde, dura, x del recorte 0..1 (sólo horizontales), lento: 1 normal, .6 cámara lenta)
TOMAS = {
  'gancho':    ('14669', 0.3, 4.6, .70, .75),   # la mano que levanta el teléfono
  'cielo':     ('14468', 2.0, 4.0, .50, 1),     # estrellas que corren: la luz llega al cielo
  'ella':      ('9011',  1.5, 4.5, .40, 1),     # ella estudia de noche
  'frustra':   ('28321', 4.0, 3.5, .45, 1),
  'el':        ('41656', 0.0, 5.5, .50, 1),     # él programa a oscuras (vertical)
  'codigo':    ('1728',  2.0, 2.5, .35, 1),
  'cian':      ('46634', 6.0, 2.5, .45, 1),
  'cafe':      ('1749',  0.0, 2.6, .55, 1),
  'ciudad':    ('49878', 2.0, 4.5, .50, 1),     # la ciudad a las 3 a. m. (vertical)
  'ella_tel':  ('43385', 0.5, 6.0, .64, 1),     # ella sonríe con el teléfono, luz morada
  'cama':      ('39789', 2.0, 4.5, .62, 1),
  'estrellas': ('39770', 0.0, 6.0, .50, 1),     # cielo estrellado (vertical)
  'via':       ('46101', 0.0, 6.0, .50, 1),
  'fuegos':    ('45743', 0.0, 4.8, .38, 1),
  'campus':    ('4519',  3.0, 4.5, .50, 1),
  'atardecer': ('4664',  0.0, 6.0, .55, 1),
}
CAL = ['2160', '1080', '720']
def bajar(clip):
  f = f'{CLIPS}/{clip}.mp4'
  if os.path.exists(f) and os.path.getsize(f) > 100000: return f
  for c in CAL:
    try:
      req = urllib.request.Request(f'https://assets.mixkit.co/videos/{clip}/{clip}-{c}.mp4', headers={'User-Agent': 'Mozilla/5.0', 'Referer': 'https://mixkit.co/'})
      with urllib.request.urlopen(req) as r, open(f, 'wb') as o: o.write(r.read())
      return f
    except Exception: continue
  raise SystemExit('no se pudo bajar ' + clip)
idx = json.load(open(f'{AQUI}/cuadros/indice.json')) if os.path.exists(f'{AQUI}/cuadros/indice.json') else {}
for nombre, (clip, desde, dura, x, lento) in TOMAS.items():
  if len(sys.argv) > 1 and nombre not in sys.argv[1:]: continue
  src = bajar(clip); out = f'{AQUI}/cuadros/{nombre}'; os.makedirs(out, exist_ok=True)
  for f in os.listdir(out): os.remove(f'{out}/{f}')
  w, h = map(int, subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'v', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', src], capture_output=True, text=True).stdout.strip().split(',')[:2])
  recorte = f'crop=ih*9/16:ih:(iw-ih*9/16)*{x}:0' if w > h else 'null'
  vf = f'{recorte},scale=720:1280:flags=lanczos,setpts=PTS/{lento},fps=30,{CINE},unsharp=5:5:0.4'
  subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', str(desde), '-t', str(dura * lento), '-i', src, '-vf', vf, '-q:v', '3', f'{out}/%05d.jpg'], check=True)
  idx[nombre] = len(os.listdir(out)); print('✓', nombre, idx[nombre], 'cuadros')
json.dump(idx, open(f'{AQUI}/cuadros/indice.json', 'w'), indent=1)
