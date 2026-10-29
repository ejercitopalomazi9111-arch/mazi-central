# EL PIANO IMPOSIBLE. Partituras de dominio público (Mutopia Project, en MIDI) tocadas con un piano de concierto
# grabado de verdad (Salamander Grand Piano, Yamaha C5, CC BY 3.0) → MP3 de ~2 min para musica/ y su análisis
# para datos/. Las notas del juego NO se adivinan del audio: salen de la partitura, así que caen exactas aunque
# la mano derecha vaya a dieciséis notas por segundo. Del audio sólo se toman la energía y las secciones.
#
#   python3.13 herramientas/piano.py <carpeta con los .mid> <ruta al .sf2>
#
# «rush» es el arreglo estilo Rush E: más rápido y con cada nota doblada en octavas.
import sys, json, subprocess, os, tempfile, numpy as np, mido, librosa

MID, SF2 = sys.argv[1], sys.argv[2]
RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PIEZAS = [
  dict(id='vals-del-minuto', mid='chopin_valse_op64_no1.mid', fin=110),
  dict(id='fantasia-impromptu', mid='chopin_fantaisie-impromptu.mid', fin=125),
  dict(id='estudio-revolucionario', mid='op-10-12-wfi.mid', fin=165),
  dict(id='teclas-negras', mid='chp-10-05.mid', fin=120),
  dict(id='estudio-cascada', mid='chp-10-01.mid', fin=125),
  dict(id='marcha-turca', mid='KV331_3_RondoAllaTurca.mid', fin=125),
  dict(id='appassionata', mid='LVB_Sonate_57_3.mid', fin=130),
  dict(id='patetica', mid='pathetique-3.mid', fin=125),
  dict(id='rush-omega', mid='op-10-12-wfi.mid', fin=110, vel=1.55, rush=True),
]

def transformar(ruta, vel=1.0, rush=False):
  m = mido.MidiFile(ruta)
  for tr in m.tracks:
    nuevos = []
    for msg in tr:
      if msg.type == 'set_tempo': msg = msg.copy(tempo=max(1, int(msg.tempo / vel)))
      nuevos.append(msg)
      # Rush: cada nota también una octava arriba (y las graves, una abajo): el muro de notas del original
      if rush and msg.type in ('note_on', 'note_off'):
        for d in ((12,) if msg.note >= 60 else (-12, 12)):
          n = msg.note + d
          if 21 <= n <= 108: nuevos.append(msg.copy(note=n, time=0, velocity=min(127, int(msg.velocity * .85)) if msg.type == 'note_on' else msg.velocity))
    tr[:] = nuevos
  return m

def notas(m):
  """(segundo, nota, fuerza) de cada nota que suena, con el mapa de tempos; y la rejilla de golpes"""
  tpb = m.ticks_per_beat; eventos = []; tick = 0; tempos = [(0, 500000)]
  for msg in mido.merge_tracks(m.tracks):
    tick += msg.time
    if msg.type == 'set_tempo': tempos.append((tick, msg.tempo))
    elif msg.type == 'note_on' and msg.velocity > 0: eventos.append((tick, msg.note, msg.velocity))
  tempos.sort(key=lambda x: x[0])   # SÓLO por tick: ordenar las tuplas completas ponía el 120 de fábrica DESPUÉS del tempo real del tick 0
  def seg(t):
    s = 0.0; prev_t, prev_tempo = 0, tempos[0][1]
    for tt, tp in tempos[1:]:
      if tt >= t: break
      s += (tt - prev_t) / tpb * prev_tempo / 1e6; prev_t, prev_tempo = tt, tp
    return s + (t - prev_t) / tpb * prev_tempo / 1e6
  ns = [(seg(t), n, v) for t, n, v in eventos]
  fin = max(t for t, _, _ in eventos) if eventos else 0
  golpes = [seg(t) for t in range(0, fin + tpb, tpb)]
  return ns, golpes

def ataques_de(ns, desde, hasta):
  """las notas que caen juntas (30 ms) son UN ataque; su fuerza, la del acorde; su banda, por dónde suena"""
  ns = sorted((t - desde, n, v) for t, n, v in ns if desde <= t < hasta)
  grupos = []
  for t, n, v in ns:
    if grupos and t - grupos[-1][0] < .03: grupos[-1][1].append((n, v))
    else: grupos.append([t, [(n, v)]])
  sal = []
  for t, g in grupos:
    vel = max(v for _, v in g) / 127; fuerza = vel * .7 + min(.45, .1 * len(g))
    graves = min(n for n, _ in g); agudas = max(n for n, _ in g)
    banda = 0 if graves < 48 and len(g) >= 2 else 2 if agudas >= 76 else 1
    sal.append([t, fuerza, banda])
  mx = max((a[1] for a in sal), default=1)
  return [[round(t, 3), round(f / mx, 3), b] for t, f, b in sal]

def sh(*a): subprocess.run(a, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

for P in PIEZAS:
  m = transformar(os.path.join(MID, P['mid']), P.get('vel', 1.0), P.get('rush', False))
  ns, golpes = notas(m)
  with tempfile.TemporaryDirectory() as tmp:
    mid, wav, mp3 = os.path.join(tmp, 'a.mid'), os.path.join(tmp, 'a.wav'), os.path.join(RAIZ, 'musica', P['id'] + '.mp3')
    m.save(mid)
    sh('fluidsynth', '-ni', '-q', '-g', '0.6', '-r', '44100', '-o', 'synth.reverb.active=1', '-o', 'synth.reverb.room-size=0.55', '-o', 'synth.reverb.level=0.3', '-F', wav, SF2, mid)
    desde = max(0.0, min(t for t, _, _ in ns) - .4)
    total = float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', wav], capture_output=True, text=True).stdout)
    hasta = min(P['fin'], total - desde); fade = 3.0 if hasta < total - desde - 1 else .5
    sh('ffmpeg', '-y', '-v', 'error', '-ss', f'{desde:.3f}', '-t', f'{hasta:.3f}', '-i', wav, '-af', f'afade=t=out:st={hasta - fade:.3f}:d={fade},loudnorm=I=-14:TP=-1.5:LRA=11', '-ar', '44100', '-c:a', 'libmp3lame', '-b:a', '160k', mp3)
  # energía y secciones del audio (como las demás canciones); ataques y golpes, de la partitura
  y, sr = librosa.load(mp3, sr=22050, mono=True); dur = len(y) / sr; hop = 256
  rms = librosa.feature.rms(y=y, hop_length=hop)[0]; paso = int(.5 * sr / hop)
  energia = [round(float(rms[i:i + paso].mean() / (rms.max() + 1e-9)), 3) for i in range(0, len(rms), paso)]
  gs = [round(g - desde, 3) for g in golpes if desde <= g < desde + dur - .2]
  # si la partitura va en golpes muy lentos (un vals en blancas con puntillo) o muy rápidos, se lleva a 80-180
  bpm = 60 / float(np.median(np.diff(gs)))
  while bpm < 80: gs = sorted(gs + [round((a + b) / 2, 3) for a, b in zip(gs, gs[1:])]); bpm *= 2
  while bpm > 180: gs = gs[::2]; bpm /= 2
  mf = librosa.feature.mfcc(y=y, sr=sr, hop_length=hop, n_mfcc=13)
  bfr = librosa.time_to_frames(gs, sr=sr, hop_length=hop); sync = librosa.util.sync(mf, bfr)
  k = max(4, min(10, int(dur / 18))); lim = librosa.segment.agglomerative(sync, k)
  secc = [round(float(gs[min(i, len(gs) - 1)]), 3) for i in lim]
  at = ataques_de(ns, desde, desde + dur - .3)
  json.dump(dict(dur=round(dur, 3), bpm=round(bpm, 2), golpes=gs, ataques=at, energia=energia, secciones=secc), open(os.path.join(RAIZ, 'datos', P['id'] + '.json'), 'w'))
  print(f"{P['id']:24} {dur:6.1f} s  bpm {bpm:6.1f}  ataques {len(at):5}  ({len(at) / dur:4.1f}/s)  {os.path.getsize(mp3) / 1e6:.1f} MB")
