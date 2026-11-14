import json, math, numpy as np, cv2
def simp(p, eps):
    a = np.array(p, np.float32).reshape(-1, 1, 2)
    return [tuple(map(float, q)) for q in cv2.approxPolyDP(a, eps, True)[:, 0, :]]
d = json.load(open('facetas-base.json'))
F = {c['id']: [(x, y + 15) for x, y in c['pts']] for c in d['caras']}   # a coords del recorte
X0 = 565.0
def esp(p): return [(2*X0 - x, y) for x, y in p][::-1]
def cerrar_punta(p, lado, L=80):
    """Las plumas que corta la captura: se alargan sus dos orillas y rematan en punta."""
    n = len(p); borde = [i for i in range(n) if p[i][0] < 4]
    if not borde: return p
    # rotar para que los del borde queden juntos al final
    k = next(i for i in range(n) if i in borde and (i - 1) % n not in borde)
    q = p[k:] + p[:k]
    m = sum(1 for v in q if v[0] < 4)
    A, Ap = np.array(q[0]), np.array(q[-1])           # Ap = vecino de antes del borde
    B, Bn = np.array(q[m - 1]), np.array(q[m % n])    # Bn = vecino de después
    da = (A - Ap) / np.linalg.norm(A - Ap); db = (B - Bn) / np.linalg.norm(B - Bn)
    A2, B2 = A + da * L, B + db * L
    # ¿se cruzan antes? entonces la punta es el cruce
    M = np.array([da, -db]).T
    try:
        t = np.linalg.solve(M, B - A)
        if 0 < t[0] < L * 1.6 and 0 < t[1] < L * 1.6:
            return [tuple(A + da * t[0])] + q[m:]
    except np.linalg.LinAlgError: pass
    d = (da + db); d /= np.linalg.norm(d)
    punta = (A2 + B2) / 2 + d * 0.6 * np.linalg.norm(A2 - B2)
    return [tuple(A2), tuple(punta), tuple(B2)] + q[m:]
IZQ = [5, 9, 13, 14, 16, 18]          # ala izquierda (se refleja)
COLA = [79, 81, 82]                   # cola izquierda (se refleja)
ORN = [22, 44, 47]                    # rombos de la izquierda
piezas = []
def pon(p, clase, extra=''): piezas.append((p, clase, extra))
for i in IZQ:
    p = cerrar_punta(simp(F[i], 3.2), 'izq'); pon(p, 'ala', i)
    if i != 5: pon(esp(p), 'ala', i)
# la banda del brazo derecho es la suya (el cuerpo no es simétrico): se cierra su punta reflejándola
pon(esp(cerrar_punta(esp(simp(F[4], 3.2)), 'izq')), 'ala', 4)
for i in COLA:
    p = simp(F[i], 3.0); pon(p, 'cola', i); pon(esp(p), 'cola', i)
for i in ORN: pon(F[i], 'orn', i); pon(esp(F[i]), 'orn', i)
pon(F[76], 'linea', 76); pon(esp(F[76]), 'linea', 76)
pon(F[75], 'orn', 75)
pon(simp(F[6], 2.2), 'cuerpo', 6); pon(simp(F[7], 2.2), 'mejilla', 7)
for i in [32, 28, 46, 31, 54, 56, 55]: pon(simp(F[i], 2.4), 'M', i)
for i in [36, 37]: pon(simp(F[i], 2.4), 'A', i)
pon(F[53], 'orn', 53)
for i in [29, 30, 58]: pon(simp(F[i], 2.4), 'Z', i)
for i in [27, 42, 41, 68]: pon(simp(F[i], 2.4), 'I', i)
json.dump([{'pts': [list(map(lambda v: round(v, 1), q)) for q in p], 'clase': c, 'id': e} for p, c, e in piezas], open('piezas.json', 'w'))
print(len(piezas), 'piezas')
