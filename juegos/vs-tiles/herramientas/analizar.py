# analiza una canción: tempo, golpes, ataques por banda (grave, medio, agudo, voz), energía y secciones
#   python3.13 herramientas/analizar.py <audio> <salida.json> [bpm del autor]
#
# LO QUE CAMBIÓ EL 30 DE OCTUBRE (Carlos: «que caiga en lo real»). Medido con una pista de prueba de golpes
# conocidos (/tmp → sintetica.py + medir.py): la versión anterior leía 86 golpes por minuto en una de 128
# (librosa se iba a los 2/3) y su rejilla quedaba 26 ms corrida; además marcaba cada ataque 10-14 ms tarde.
# Como cartas.js pega cada nota a la rejilla, las notas caían donde no había golpe. Ahora:
#   1. se separa la batería de lo melódico (HPSS) y los ataques salen de la batería, en pasos de 6 ms;
#   2. cada ataque se fecha en su arranque (la subida), no en su pico;
#   3. el tempo se escoge entre los candidatos (y sus dobles, mitades y 2/3) por qué tan fuertes caen los
#      ataques sobre la rejilla, con preferencia por 90-180; la fase, por donde la rejilla junta más golpe;
#   4. la rejilla se reajusta cada 8 tiempos al golpe más cercano, para canciones que se mueven tantito.
import sys, json, numpy as np, librosa
ruta, sal = sys.argv[1], sys.argv[2]
bpm_autor = float(sys.argv[3]) if len(sys.argv) > 3 else None
y, sr = librosa.load(ruta, sr=22050, mono=True)
dur = len(y) / sr
hop = 128
yh, yp = librosa.effects.hpss(y, margin=2.0)
S = np.abs(librosa.stft(yp, n_fft=1024, hop_length=hop)) ** 2
f = librosa.fft_frequencies(sr=sr, n_fft=1024)
def banda(Sx, a, b):
    m = (f >= a) & (f < b); e = np.log1p(Sx[m].sum(0) * 1e3); d = np.maximum(0, np.diff(e, prepend=e[0])); return d / (d.max() + 1e-9)
grave, medio, agudo = banda(S, 30, 160), banda(S, 160, 2500), banda(S, 2500, 11000)
Sh = np.abs(librosa.stft(yh, n_fft=1024, hop_length=hop)) ** 2
voz = banda(Sh, 300, 3400)
fps = sr / hop

# 1 · los ataques de la batería, fechados en su arranque
env = librosa.onset.onset_strength(y=yp, sr=sr, hop_length=hop, lag=1, max_size=3)
envn = env / (env.max() + 1e-9)
picos = librosa.onset.onset_detect(onset_envelope=env, sr=sr, hop_length=hop, backtrack=False, delta=0.05, wait=int(.05 * fps))
def arranque(p):
    # se camina hacia atrás desde el pico mientras la envolvente siga bajando; el arranque es la mitad de la subida
    i = p
    while i > 0 and p - i < int(.04 * fps) and env[i - 1] < env[i]: i -= 1
    lo, hi = env[i], env[p]; obj = lo + (hi - lo) * .5
    j = i
    while j < p and env[j] < obj: j += 1
    return j
ataques = []
for p in picos:
    j = arranque(p); t = j / fps - .5 / fps
    # de qué es el golpe: el centro de la energía NUEVA en ese instante (lo que subió respecto a un momento antes).
    # Bombo abajo de 250 Hz, tarola hasta 3.5 kHz, platillos arriba. Comparar los flujos de cada banda ya
    # normalizados engañaba: un platillo salía «grave» porque su banda grave casi vacía se estiraba al máximo
    sube = np.maximum(0, S[:, min(p + 1, S.shape[1] - 1)] - S[:, max(0, j - 2)])
    cen = float((sube * f).sum() / (sube.sum() + 1e-12))
    b = 0 if cen < 250 else 1 if cen < 3500 else 2
    ataques.append([round(float(max(0, t)), 3), round(float(envn[p]), 3), b])
# y la voz o la melodía, donde la batería calla: entran como banda 3 (sólo las fuertes)
envh = librosa.onset.onset_strength(y=yh, sr=sr, hop_length=hop)
envhn = envh / (envh.max() + 1e-9)
for p in librosa.onset.onset_detect(onset_envelope=envh, sr=sr, hop_length=hop, delta=0.12, wait=int(.12 * fps)):
    t = p / fps
    if envhn[p] > .35 and all(abs(t - a[0]) > .06 for a in ataques[max(0, len(ataques) - 400):]):
        ataques.append([round(float(t), 3), round(float(envhn[p]) * .8, 3), 3])
ataques.sort(key=lambda a: a[0])

# 2 · el tempo: candidatos y sus parientes, escogidos por cuánto golpe cae en la rejilla
# el pulso lo marcan el bombo y la tarola, no los platillos: si pesaran igual, la rejilla se va medio tiempo
# corrida a los platillos de contratiempo (pasó en la pista de prueba a 95)
PESO_BANDA = {0: 1.0, 1: .7, 2: .2}
fuerte = np.array([a[0] for a in ataques if a[1] > .25 and a[2] != 3]); peso = np.array([a[1] * PESO_BANDA[a[2]] for a in ataques if a[1] > .25 and a[2] != 3])
def puntaje(bpm):
    """qué tan bien explica una rejilla a los golpes: cuánto del golpe fuerte cae en ella (recall) y cuántas de sus
    líneas tienen golpe (precisión). El doble del tempo deja líneas vacías y la mitad deja golpes fuera: sólo el
    tempo real saca las dos altas. Contar sólo «cuánto golpe cae» premiaba 1.5× (pista de prueba a 95 → 142)."""
    P = 60 / bpm; mejor = (-1, 0)
    lineas_t = np.arange(0, dur, P)
    for fase in np.arange(0, P, .004):
        d = (fuerte - fase) / P; d = np.abs(d - np.round(d)) * P
        cae = np.exp(-(d / .02) ** 2)
        recall = np.sum(peso * cae) / (np.sum(peso) + 1e-9)
        # precisión: de las líneas donde hay música (entre el primer y el último golpe fuerte), cuántas tienen uno
        L = lineas_t + fase; L = L[(L > fuerte.min() - .1) & (L < fuerte.max() + .1)] if len(fuerte) else L
        if len(L) == 0: continue
        # cada línea vale lo que pesa el golpe que tiene cerca: una línea con sólo platillo cuenta poco, así el doble
        # del tempo (que pone líneas en los contratiempos de platillo) no gana
        k = np.searchsorted(fuerte, L); ki = np.clip(k - 1, 0, len(fuerte) - 1); kd = np.clip(k, 0, len(fuerte) - 1)
        pi = np.where(np.abs(L - fuerte[ki]) < .03, peso[ki], 0); pd = np.where(np.abs(fuerte[kd] - L) < .03, peso[kd], 0)
        prec = np.mean(np.maximum(pi, pd)) / (np.percentile(peso, 90) + 1e-9)
        s = 2 * recall * prec / (recall + prec + 1e-9)
        if s > mejor[0]: mejor = (s, fase)
    return mejor
if bpm_autor: cands = [bpm_autor]
else:
    base = float(np.atleast_1d(librosa.feature.tempo(onset_envelope=env, sr=sr, hop_length=hop, aggregate=np.median))[0])
    cands = sorted({round(c, 2) for b0 in [base] for c in [b0, b0 * 2, b0 / 2, b0 * 1.5, b0 * 2 / 3, b0 * 4 / 3, b0 * .75] if 70 <= c <= 200})
mejores = []
for c in cands:
    # afina el tempo alrededor del candidato (±1.5 %) porque la estimación inicial es gruesa
    for bpm in np.linspace(c * .985, c * 1.015, 13) if not bpm_autor else [c]:
        s, fase = puntaje(bpm)
        prior = np.exp(-.5 * (np.log2(bpm / 128) / .8) ** 2)
        mejores.append((s * prior, bpm, fase))
_, bpm, fase = max(mejores)
P = 60 / bpm
golpes = list(np.arange(fase, dur, P))
# 3 · la rejilla se reacomoda cada 8 tiempos al golpe más cercano (sin pasarse de 25 ms)
afinados = []
for i in range(0, len(golpes), 8):
    trozo = np.array(golpes[i:i + 8]); cerca = []
    for t in trozo:
        if len(fuerte) == 0: break
        k = np.argmin(np.abs(fuerte - t)); dlt = fuerte[k] - t
        if abs(dlt) < .025: cerca.append(dlt)
    corr = float(np.median(cerca)) if len(cerca) >= 3 else 0
    afinados += list(trozo + corr)
golpes = afinados

rms = librosa.feature.rms(y=y, hop_length=512)[0]
paso = int(0.5 * sr / 512)
energia = [round(float(rms[i:i + paso].mean() / (rms.max() + 1e-9)), 3) for i in range(0, len(rms), paso)]
# secciones: cortes por cambio de timbre, en golpes
mf = librosa.feature.mfcc(y=y, sr=sr, hop_length=512, n_mfcc=13)
bfr = librosa.time_to_frames(golpes, sr=sr, hop_length=512)
bfr = bfr[bfr < mf.shape[1]]
sync = librosa.util.sync(mf, bfr)
k = max(4, min(10, int(dur / 18)))
lim = librosa.segment.agglomerative(sync, k)
secc = [round(float(golpes[min(max(0, i - 1), len(golpes) - 1)]), 3) for i in lim]
json.dump({ 'dur': round(dur, 3), 'bpm': round(float(bpm), 2), 'golpes': [round(float(t), 3) for t in golpes], 'ataques': ataques, 'energia': energia, 'secciones': secc }, open(sal, 'w'))
print(ruta.split('/')[-1], 'bpm', round(float(bpm), 1), 'dur', round(dur), 'golpes', len(golpes), 'ataques', len(ataques), 'secc', len(secc))
