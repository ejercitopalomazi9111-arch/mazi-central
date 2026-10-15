#!/usr/bin/env python3
"""EFECTOS DE SONIDO hechos por código para el comercial.

Ni ElevenLabs (la llave no trae el permiso de efectos) ni los bancos libres
(Freesound da 403 desde aquí, Wikimedia 429) se pudieron usar el 15 de
octubre, así que se fabrican: son nuestros, repetibles y sin licencia de nadie.

    python3 fadori-campana/grabar/efectos.py SALIDA/
Sale un .wav por efecto: timbre, whoosh, toque, ding, golpe, subida, latido.
"""
import os, sys, wave
import numpy as np

SR = 44100
rng = np.random.default_rng(7)

def t(seg): return np.arange(int(SR * seg)) / SR

def env(n, ataque, caida):
    a = int(SR * ataque); e = np.ones(n)
    if a: e[:a] = np.linspace(0, 1, a)
    e[a:] = np.exp(-np.arange(n - a) / (SR * caida))
    return e

def pasa_bajos(x, corte):
    """filtro de un polo, con el corte que puede cambiar en el tiempo"""
    corte = np.broadcast_to(corte, x.shape)
    k = 1 - np.exp(-2 * np.pi * corte / SR)
    y = np.empty_like(x); v = 0.0
    for i in range(len(x)):
        v += k[i] * (x[i] - v); y[i] = v
    return y

def timbre():
    """timbre eléctrico de escuela: un badajo golpea la campana ~22 veces por segundo"""
    s = t(2.6)
    tono = sum(np.sin(2 * np.pi * f * s) * g for f, g in [(1180, 1), (2950, .45), (4130, .25), (590, .3)])
    golpes = (0.55 + 0.45 * np.sign(np.sin(2 * np.pi * 22 * s))) * (0.85 + .15 * np.sin(2 * np.pi * 3 * s))
    cola = np.minimum(1, s / .02) * np.where(s < 2.2, 1, np.exp(-(s - 2.2) / .12))
    return tono * golpes * cola * .35

def whoosh():
    s = t(0.9); n = rng.normal(0, 1, len(s))
    corte = 300 + 5200 * np.sin(np.pi * s / .9) ** 2
    x = pasa_bajos(n, corte) - pasa_bajos(n, corte * .25)
    return x * np.sin(np.pi * s / .9) ** 1.5 * 1.6

def toque():
    s = t(0.16)
    f = 900 * np.exp(-s * 18) + 420
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * env(len(s), .002, .035) * .6

def ding():
    s = t(1.4); x = np.zeros(len(s))
    for inicio, f in [(0, 1318.5), (0.13, 1760)]:
        m = s >= inicio; u = s[m] - inicio
        x[m] += (np.sin(2 * np.pi * f * u) + .3 * np.sin(2 * np.pi * f * 2.76 * u)) * np.exp(-u / .38) * np.minimum(1, u / .003)
    return x * .35

def golpe():
    s = t(1.6)
    f = 32 + 90 * np.exp(-s * 9)
    cuerpo = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-s / .45)
    chasquido = pasa_bajos(rng.normal(0, 1, len(s)), 1800) * np.exp(-s / .04)
    return (cuerpo * .9 + chasquido * .5) * .8

def subida():
    s = t(2.2); n = rng.normal(0, 1, len(s))
    corte = 200 + 7000 * (s / 2.2) ** 2
    ruido = pasa_bajos(n, corte) - pasa_bajos(n, corte * .3)
    tono = np.sin(2 * np.pi * np.cumsum(180 + 520 * (s / 2.2) ** 2) / SR)
    return (ruido * .9 + tono * .25) * (s / 2.2) ** 2.2 * .9

def latido():
    """el pulso que lleva el inicio, mientras se cuenta el recreo"""
    s = t(0.5)
    f = 55 + 40 * np.exp(-s * 25)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * env(len(s), .004, .09) * .9

def guardar(ruta, x):
    x = x / max(1e-9, np.abs(x).max()) * .89
    x = np.int16(x * 32767)
    with wave.open(ruta, 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(x.tobytes())

if __name__ == '__main__':
    sal = sys.argv[1] if len(sys.argv) > 1 else '.'
    os.makedirs(sal, exist_ok=True)
    for nombre, f in [('timbre', timbre), ('whoosh', whoosh), ('toque', toque), ('ding', ding), ('golpe', golpe), ('subida', subida), ('latido', latido)]:
        guardar(os.path.join(sal, nombre + '.wav'), f()); print('✓', nombre)
