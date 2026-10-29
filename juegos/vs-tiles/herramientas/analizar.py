# analiza una canción: tempo, golpes, ataques por banda (grave, medio, agudo), energía y secciones
import sys, json, numpy as np, librosa
ruta, sal = sys.argv[1], sys.argv[2]
y, sr = librosa.load(ruta, sr=22050, mono=True)
dur = len(y) / sr
hop = 256
tempo, beats = librosa.beat.beat_track(y=y, sr=sr, hop_length=hop, tightness=120)
bt = librosa.frames_to_time(beats, sr=sr, hop_length=hop)
S = np.abs(librosa.stft(y, n_fft=2048, hop_length=hop)) ** 2
f = librosa.fft_frequencies(sr=sr, n_fft=2048)
def banda(a, b):
    m = (f >= a) & (f < b); e = np.log1p(S[m].sum(0)); d = np.maximum(0, np.diff(e, prepend=e[0])); return d / (d.max() + 1e-9)
grave, medio, agudo = banda(30, 180), banda(180, 2500), banda(2500, 11000)
env = librosa.onset.onset_strength(y=y, sr=sr, hop_length=hop)
on = librosa.onset.onset_detect(onset_envelope=env, sr=sr, hop_length=hop, backtrack=False, delta=0.04, wait=2)
ot = librosa.frames_to_time(on, sr=sr, hop_length=hop)
envn = env / (env.max() + 1e-9)
ataques = []
for fr, t in zip(on, ot):
    g, m, a = grave[fr], medio[fr], agudo[fr]
    b = int(np.argmax([g * 1.3, m, a * 1.1]))
    ataques.append([round(float(t), 3), round(float(envn[fr]), 3), b])
rms = librosa.feature.rms(y=y, hop_length=hop)[0]
paso = int(0.5 * sr / hop)
energia = [round(float(rms[i:i + paso].mean() / (rms.max() + 1e-9)), 3) for i in range(0, len(rms), paso)]
# secciones: cortes por cambio de timbre, en golpes
chroma = librosa.feature.mfcc(y=y, sr=sr, hop_length=hop, n_mfcc=13)
sync = librosa.util.sync(chroma, beats)
k = max(4, min(10, int(dur / 18)))
lim = librosa.segment.agglomerative(sync, k)
secc = [round(float(bt[min(i, len(bt) - 1)]), 3) for i in lim]
json.dump({ 'dur': round(dur, 3), 'bpm': round(float(np.atleast_1d(tempo)[0]), 2), 'golpes': [round(float(t), 3) for t in bt], 'ataques': ataques, 'energia': energia, 'secciones': secc }, open(sal, 'w'))
print(ruta.split('/')[-1], 'bpm', round(float(np.atleast_1d(tempo)[0]), 1), 'dur', round(dur), 'golpes', len(bt), 'ataques', len(ataques), 'secc', len(secc))
