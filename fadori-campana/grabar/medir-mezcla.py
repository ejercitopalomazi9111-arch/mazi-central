"""CUÁNTO SOBRESALE LA VOZ en la mezcla del comercial.

Carlos, 15 de octubre: «la música y efectos suelen estar más fuertes que la voz».
Lee las tres pistas que deja `MEDIR=1 SOLOAUDIO=1 node grabar/comercial.mjs`
(salida/mezcla/voz.wav, efectos.wav, musica.wav) y, en cada tramo donde habla
la voz, compara su nivel con el de la cama (música + efectos sumados).

    python3 fadori-campana/grabar/medir-mezcla.py [mínimo_dB=12]

Sale con error si en algún tramo la voz no le saca el mínimo a la cama."""
import sys, os
import numpy as np
from scipy.io import wavfile

D = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'salida', 'mezcla')
MIN = float(sys.argv[1]) if len(sys.argv) > 1 else 12.0

def leer(n):
    sr, x = wavfile.read(os.path.join(D, n + '.wav'))
    x = x.astype(np.float64)
    if x.dtype.kind != 'f' or np.abs(x).max() > 2: x /= 32768.0
    return sr, x.mean(axis=1) if x.ndim > 1 else x

sr, voz = leer('voz'); _, fx = leer('efectos'); _, mus = leer('musica')
n = min(len(voz), len(fx), len(mus)); voz, cama = voz[:n], fx[:n] + mus[:n]
db = lambda x: 20 * np.log10(np.sqrt(np.mean(x ** 2)) + 1e-9)

# ventanas de 50 ms; la voz «habla» donde pasa de −40 dBFS
v = sr // 20; k = n // v
rv = np.array([db(voz[i * v:(i + 1) * v]) for i in range(k)])
rc = np.array([db(cama[i * v:(i + 1) * v]) for i in range(k)])
habla = rv > -40
# tramos seguidos de habla (frases), separados por más de 0.4 s de silencio
tramos, ini, hueco = [], None, 0
for i, h in enumerate(habla):
    if h:
        if ini is None: ini = i
        hueco = 0; fin = i
    elif ini is not None:
        hueco += 1
        if hueco > 8: tramos.append((ini, fin)); ini = None
if ini is not None: tramos.append((ini, fin))

malos = 0
print(f'{"tramo":>13}  voz   cama  diferencia')
for a, b in tramos:
    sv = voz[a * v:(b + 1) * v]; sc = cama[a * v:(b + 1) * v]
    d = db(sv) - db(sc)
    ok = d >= MIN; malos += not ok
    print(f'{a * v / sr:5.1f}–{(b + 1) * v / sr:5.1f} s  {db(sv):5.1f} {db(sc):5.1f}  {d:+5.1f} dB {"✓" if ok else "✗"}')
print(f'\n{"✓" if not malos else "✗"} {len(tramos) - malos} de {len(tramos)} frases con la voz {MIN:.0f} dB o más arriba de la música y los efectos')
sys.exit(1 if malos else 0)
