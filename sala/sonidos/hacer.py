"""
LOS SONIDOS DE LAS APPS · se hacen aquí, con matemáticas, y salen como MP3 chiquitos.
──────────────────────────────────────────────────────────────────────────────────────
Carlos (12 nov) pasó el flujo de «Openverse + Real SFX + Earshot» y pidió usarlo «para editar
Y EN APPS». El flujo dice: primero grabaciones con licencia CC0; si no encajan, se GENERA un
efecto puntual y se apunta la receta. Lo que se probó desde aquí:
  · Freesound (el grueso de Openverse) contesta 403 a las descargas desde este contenedor.
  · Wikimedia Commons da 429 en cuanto se piden dos seguidas, y casi no tiene efectos cortos
    de interfaz (lo que sale con «click» o «pop» son grabaciones de pronunciación).
  · Kenney (CC0) contesta 403.
Así que estos se generan, y por eso son NUESTROS: sin licencias de nadie.

Cada sonido tiene una función (el criterio del documento):
  pop       algo aparece                 toque    un toque en la interfaz (discreto)
  whoosh    algo se desliza o se abre    golpe    algo llega con peso
  bien      respuesta correcta           mal      respuesta incorrecta (suave, no regaña)
  logro     terminaste algo              moneda   un nodo del camino se vuelve moneda
  combo     encadenaste buenas           hielo    ganaste una racha congelada
  voltear   una tarjeta da la vuelta     subir    subiste de grado
Uso: python3 sala/sonidos/hacer.py   (escribe los .mp3 junto a este archivo y mide cada uno)
"""
import numpy as np, subprocess, os, json

SR = 44100
AQUI = os.path.dirname(os.path.abspath(__file__))
rng = np.random.default_rng(9111)

def t(seg): return np.arange(int(seg * SR)) / SR
def env_ad(n, ataque, caida, curva=6.0):
    """ataque lineal corto y caída exponencial: lo que hace que un golpe suene a golpe"""
    e = np.ones(n); a = max(1, int(ataque * SR))
    e[:a] = np.linspace(0, 1, a)
    k = np.arange(n - a) / SR
    e[a:] = np.exp(-k * curva / max(caida, 1e-3))
    return e
def ruido(n): return rng.standard_normal(n)
def pasabandas(x, f0, q):
    """filtro resonante de 2 polos (biquad pasabandas), f0 puede variar en el tiempo"""
    y = np.zeros_like(x); f = np.broadcast_to(np.asarray(f0, dtype=float), x.shape)
    x1 = x2 = y1 = y2 = 0.0
    for i in range(len(x)):
        w = 2 * np.pi * f[i] / SR; al = np.sin(w) / (2 * q); c = np.cos(w)
        b0, b2, a0, a1, a2 = al, -al, 1 + al, -2 * c, 1 - al
        yi = (b0 * x[i] + b2 * x2 - a1 * y1 - a2 * y2) / a0
        x2, x1, y2, y1 = x1, x[i], y1, yi
        y[i] = yi
    return y
def pasabajos(x, fc):
    a = np.exp(-2 * np.pi * fc / SR); y = np.zeros_like(x); p = 0.0
    for i in range(len(x)): p = (1 - a) * x[i] + a * p; y[i] = p
    return y
def campana(f, dur, parciales=((1, 1), (2.76, .5), (5.4, .25), (8.93, .12)), caida=1.0):
    """síntesis modal: cada parcial con su caída (los agudos se apagan primero), como marimba o campanita"""
    tt = t(dur); s = np.zeros_like(tt)
    for r, a in parciales:
        s += a * np.sin(2 * np.pi * f * r * tt) * np.exp(-tt * (3 + r * 2.2) / caida)
    s *= env_ad(len(tt), .002, dur, 1.0)
    return s
def mezclar(*capas):
    n = max(len(c[1]) + int(c[0] * SR) for c in capas); y = np.zeros(n)
    for ini, x, g in capas:
        i = int(ini * SR); y[i:i + len(x)] += x * g
    return y
def normalizar(x, pico_db=-3.0):
    x = x - np.mean(x)
    m = np.max(np.abs(x)) or 1
    return x / m * 10 ** (pico_db / 20)
def suavizar_bordes(x, ms=3):
    n = int(ms / 1000 * SR); x = x.copy(); x[:n] *= np.linspace(0, 1, n); x[-n:] *= np.linspace(1, 0, n); return x

def toque():
    n = int(.045 * SR)
    clic = pasabandas(ruido(n), 3200, 6) * env_ad(n, .0005, .012, 5)
    cuerpo = np.sin(2 * np.pi * 1450 * t(.045)) * env_ad(n, .0005, .02, 6) * .35
    return clic + cuerpo
def pop():
    tt = t(.11)
    f = 1100 * np.exp(-tt * 28) + 260                     # la burbuja: el tono cae rapidísimo
    fase = 2 * np.pi * np.cumsum(f) / SR
    s = np.sin(fase) * env_ad(len(tt), .001, .07, 5)
    chas = pasabandas(ruido(len(tt)), 2500, 3) * env_ad(len(tt), .0003, .006, 6) * .5
    return s + chas
def whoosh():
    tt = t(.42)
    f = 500 + 2600 * np.sin(np.pi * np.clip(tt / .42, 0, 1)) ** 1.5   # sube y baja: el pico al llegar
    x = pasabandas(ruido(len(tt)), f, 1.4)
    e = np.sin(np.pi * np.clip(tt / .42, 0, 1)) ** 2.2
    e = np.concatenate([e[:int(.62 * len(e))], e[int(.62 * len(e)):] * np.linspace(1, .4, len(e) - int(.62 * len(e)))])
    return x * e
def golpe():
    tt = t(.32)
    f = 120 * np.exp(-tt * 9) + 55
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * env_ad(len(tt), .002, .22, 5)
    tierra = pasabajos(ruido(len(tt)), 900) * env_ad(len(tt), .001, .05, 5) * 1.6
    return s + tierra
def bien():
    return mezclar((0, campana(1046.5, .45), 1), (.075, campana(1318.5, .6), 1.05))
def mal():
    a = campana(329.6, .32, ((1, 1), (2.0, .25), (3.0, .08)), caida=.7)
    b = campana(261.6, .42, ((1, 1), (2.0, .25), (3.0, .08)), caida=.8)
    return pasabajos(mezclar((0, a, .9), (.11, b, 1)), 1800)
def logro():
    notas = [523.25, 659.25, 783.99, 1046.5]
    capas = [(i * .085, campana(f, .9 if i == 3 else .5), .9 + i * .05) for i, f in enumerate(notas)]
    brillo = campana(2093, 1.0, ((1, 1), (2.4, .3)), caida=1.4)
    return mezclar(*capas, (.34, brillo, .28))
def moneda():
    return mezclar((0, campana(987.8, .12, ((1, 1), (3, .3), (5, .1))), .9), (.07, campana(1318.5, .55, ((1, 1), (3, .35), (5, .12)), caida=1.2), 1))
def combo():
    notas = [1318.5, 1568, 2093]
    return mezclar(*[(i * .05, campana(f, .35, ((1, 1), (2.76, .4)), caida=.8), .7 + i * .12) for i, f in enumerate(notas)])
def hielo():
    parc = ((1, 1), (2.32, .6), (4.25, .45), (6.63, .3), (9.38, .2))     # inarmónicos: suena a cristal
    capas = [(k * .06, campana(f, 1.5, parc, caida=2.2), g) for k, (f, g) in enumerate([(1760, .8), (2217, .6), (2637, .5), (3520, .35)])]
    aire = pasabandas(ruido(int(1.2 * SR)), 6000, 2) * env_ad(int(1.2 * SR), .3, .9, 4) * .08
    return mezclar(*capas, (0, aire, 1))
def voltear():
    tt = t(.16)
    f = 1800 + 3200 * (tt / .16)
    x = pasabandas(ruido(len(tt)), f, 2.2) * (np.sin(np.pi * tt / .16) ** 1.4)
    return x
def subir():
    notas = [523.25, 659.25, 783.99, 1046.5, 1318.5]
    capas = [(i * .07, campana(f, .55), .85 + i * .04) for i, f in enumerate(notas)]
    return mezclar(*capas, (.0, whoosh() * .25, 1))

SONIDOS = { 'toque': (toque, -9), 'pop': (pop, -6), 'whoosh': (whoosh, -8), 'golpe': (golpe, -5), 'bien': (bien, -4), 'mal': (mal, -6),
            'logro': (logro, -3), 'moneda': (moneda, -5), 'combo': (combo, -6), 'hielo': (hielo, -5), 'voltear': (voltear, -10), 'subir': (subir, -3) }

if __name__ == '__main__':
    receta = {}
    for nombre, (fn, pico) in SONIDOS.items():
        x = suavizar_bordes(normalizar(fn(), pico))
        crudo = (np.clip(x, -1, 1) * 32767).astype('<i2').tobytes()
        sal = os.path.join(AQUI, nombre + '.mp3')
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 's16le', '-ar', str(SR), '-ac', '1', '-i', '-', '-c:a', 'libmp3lame', '-b:a', '80k', sal], input=crudo, check=True)
        receta[nombre] = { 'dur_ms': round(len(x) / SR * 1000), 'pico_dbfs': pico, 'bytes': os.path.getsize(sal), 'receta': fn.__doc__ or fn.__name__ }
        print(f"{nombre:8s} {len(x)/SR*1000:6.0f} ms  pico {pico:3d} dBFS  {os.path.getsize(sal)/1024:5.1f} KB")
    json.dump(receta, open(os.path.join(AQUI, 'recetas.json'), 'w'), ensure_ascii=False, indent=1)
