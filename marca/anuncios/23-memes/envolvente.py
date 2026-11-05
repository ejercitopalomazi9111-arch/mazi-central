"""LA ENVOLVENTE DE LA VOZ: qué tan fuerte suena cada renglón cuadro por cuadro (30 por segundo), de 0 a 1.
Con eso la cabeza del que habla rebota con cada sílaba y los brazos suben al hablar, como en los videos de
Garry's Mod. python3 marca/anuncios/23-memes/envolvente.py <carpeta del meme>"""
import sys, os, json, subprocess, array
d = sys.argv[1]; vz = os.path.join(d, 'voz'); env = {}
for f in sorted(os.listdir(vz)):
  if not f.endswith('.mp3'): continue
  raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', os.path.join(vz, f), '-ac', '1', '-ar', '12000', '-f', 's16le', '-'], capture_output=True, check=True).stdout
  a = array.array('h'); a.frombytes(raw); paso = 400; v = []
  for i in range(0, len(a), paso):
    seg = a[i:i + paso]; v.append((sum(x * x for x in seg) / max(1, len(seg))) ** .5)
  m = max(v) or 1; env[f[:-4]] = [round(min(1, x / m * 1.15), 3) for x in v]
json.dump(env, open(os.path.join(vz, 'env.json'), 'w')); print('✓', d, len(env), 'renglones')
