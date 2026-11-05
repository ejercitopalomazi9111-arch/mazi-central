"""EL PIETAJE DEL ANUNCIO 22: clips de barbería de Mixkit (licencia Mixkit: uso comercial libre, sin crédito
obligatorio) recortados a 9:16, con el color de la casa (sombras moradas, piel cálida) y en cuadros sueltos a
30 por segundo para que la composición los pinte exactos. Los cuadros no van al repo (pesan cientos de MB):
se vuelven a sacar con

    python3 marca/anuncios/22-barberias/preparar.py

Los videos originales se guardan en /tmp/claude-0/clips/4k (se bajan solos si faltan)."""
import os, subprocess, sys, urllib.request
AQUI = os.path.dirname(os.path.abspath(__file__)); CLIPS = '/tmp/claude-0/clips/4k'; os.makedirs(CLIPS, exist_ok=True)
COLOR = "eq=contrast=1.1:saturation=0.82:gamma=0.96,colorbalance=rs=0.02:gs=-0.03:bs=0.07:rm=0.01:gm=-0.02:bm=0.02:rh=0.03:bh=-0.02"
# toma: (clip, calidad, desde, dura, x del recorte 0..1 (sólo horizontales), lento: 1 = normal, 0.6 = cámara lenta)
TOMAS = {
  'silla':    ('43236', '2160', 1.0, 4.5, .30, .7),
  'nuca':     ('40127', '1080', 0.3, 4.0, .5, .8),
  'guantes':  ('43242', '1080', 1.0, 5.0, .5, .8),
  'peine':    ('43232', '2160', 3.0, 4.0, .55, .75),
  'navaja':   ('361',   '2160', 5.5, 4.0, .40, .8),
  'cara':     ('40126', '1080', 2.0, 4.0, .5, .8),
  'tijeras':  ('43231', '2160', 1.0, 4.0, .50, .8),
  'cliente':  ('43222', '2160', 2.0, 4.0, .62, .8),
}
def bajar(clip, cal):
  f = f'{CLIPS}/{clip}.mp4'
  if os.path.exists(f) and os.path.getsize(f) > 100000: return f
  req = urllib.request.Request(f'https://assets.mixkit.co/videos/{clip}/{clip}-{cal}.mp4', headers={'User-Agent': 'Mozilla/5.0', 'Referer': 'https://mixkit.co/'})
  with urllib.request.urlopen(req) as r, open(f, 'wb') as o: o.write(r.read())
  return f
for nombre, (clip, cal, desde, dura, x, lento) in TOMAS.items():
  if len(sys.argv) > 1 and nombre not in sys.argv[1:]: continue
  src = bajar(clip, cal); out = f'{AQUI}/cuadros/{nombre}'; os.makedirs(out, exist_ok=True)
  for v in os.listdir(out): os.remove(f'{out}/{v}')
  vert = cal == '1080'
  recorte = 'scale=1080:1920:flags=lanczos' if vert else f'crop=ih*9/16:ih:(iw-ih*9/16)*{x}:0,scale=1080:1920:flags=lanczos'
  lenteo = f',setpts={1 / lento:.4f}*PTS,minterpolate=fps=30:mi_mode=mci:mc_mode=aobmc:vsbmc=1' if lento < 1 else ',fps=30'
  vf = recorte + lenteo + ',' + COLOR
  subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', str(desde), '-t', str(dura), '-i', src, '-vf', vf, '-q:v', '3', f'{out}/%05d.jpg'], check=True)
  print('✓', nombre, len(os.listdir(out)), 'cuadros')
# el índice: cuántos cuadros trae cada toma (la composición lo lee para no pedir cuadros que no existen)
import json
idx = {n: len([f for f in os.listdir(f'{AQUI}/cuadros/{n}') if f.endswith('.jpg')]) for n in TOMAS if os.path.isdir(f'{AQUI}/cuadros/{n}')}
json.dump(idx, open(f'{AQUI}/cuadros/indice.json', 'w')); print(idx)
