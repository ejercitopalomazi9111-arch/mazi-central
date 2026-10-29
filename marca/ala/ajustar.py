"""LA PALOMA DEL ALA EN CURVAS LIMPIAS. Toma el contorno de la referencia (ref.png) a 8×, lo parte en
sus esquinas, y a cada tramo le ajusta lo mínimo que lo describe: una recta si se aparta menos de
TOL, y si no, curvas Bézier por mínimos cuadrados (el método de Schneider, Graphics Gems 1990) con
un error máximo de ERR px de la referencia. El temblor de la captura mide menos que eso y se queda
fuera; la forma no. Los tres círculos van aparte, medidos y perfectos.
  python3.13 ajustar.py [ERR] [TOL]      → ala.svg y la medida contra la referencia"""
import cv2, numpy as np, subprocess, sys
from scipy.ndimage import gaussian_filter1d
E = 8
ERR = float(sys.argv[1]) if len(sys.argv) > 1 else 1.2
TOL = float(sys.argv[2]) if len(sys.argv) > 2 else 1.4
ESQ = float(sys.argv[3]) if len(sys.argv) > 3 else 150
SIG = float(sys.argv[4]) if len(sys.argv) > 4 else 5      # suavizado previo de cada tramo, en px de la referencia
TMP = '/tmp/claude-0/-home-user-mazi-central/617efe1d-4733-537e-8ae2-f3b050e50e7a/scratchpad/'
ref = cv2.imread('ref.png', 0); H, W = ref.shape
grande = cv2.GaussianBlur(cv2.resize(ref, (W * E, H * E), interpolation=cv2.INTER_LANCZOS4), (0, 0), 3)
M = (grande < 128).astype(np.uint8)
ARO = [((870.8, 276.4), 16.75, 36.75), ((882.4, 426.8), 15.0, 34.25), ((825.0, 560.7), 15.25, 34.0)]
# los círculos se quitan del contorno (van perfectos aparte); de cada uno se deja sólo el «tallo» de la
# línea que llega, metido 4 px en el aro, para que la unión no deje rendija ni rebaba
yy, xx = np.mgrid[0:H * E, 0:W * E]
for (cx, cy), ri, ro in ARO:
    r = np.hypot(xx - cx * E, yy - cy * E) / E; a = np.arctan2(yy - cy * E, xx - cx * E)
    fuera = (r > ro + 4) & (r < ro + 9) & (M > 0)
    ang = np.angle(np.exp(1j * a[fuera]).mean()); medio = min(0.6, np.abs(np.angle(np.exp(1j * (a[fuera] - ang)))).max())
    tallo = (r >= ro - 4) & (np.abs(np.angle(np.exp(1j * (a - ang)))) <= medio * 0.9)
    M[(r < ro + 1.5) & ~tallo] = 0
del yy, xx

def angulos(p, k):
    n = len(p); a = p[(np.arange(n) - k) % n] - p; b = p[(np.arange(n) + k) % n] - p
    cos = (a * b).sum(1) / (np.linalg.norm(a, axis=1) * np.linalg.norm(b, axis=1) + 1e-9)
    return np.degrees(np.arccos(np.clip(cos, -1, 1)))
def esquinas(p, k):
    ang = angulos(p, k); n = len(p)
    return [i for i in range(n) if ang[i] < ESQ and ang[i] == min(ang[(i + j) % n] for j in range(-k, k + 1))]

# ── Schneider: ajustar Bézier cúbicas a una serie de puntos ──
def bez(c, t): t = t[:, None]; return (1-t)**3*c[0] + 3*(1-t)**2*t*c[1] + 3*(1-t)*t**2*c[2] + t**3*c[3]
def bez1(c, t): t = t[:, None]; return 3*(1-t)**2*(c[1]-c[0]) + 6*(1-t)*t*(c[2]-c[1]) + 3*t**2*(c[3]-c[2])
def bez2(c, t): t = t[:, None]; return 6*(1-t)*(c[2]-2*c[1]+c[0]) + 6*t*(c[3]-2*c[2]+c[1])
def unir(v): n = np.linalg.norm(v); return v / n if n > 1e-9 else v
def param(p): d = np.r_[0, np.cumsum(np.linalg.norm(np.diff(p, axis=0), axis=1))]; return d / d[-1]
def generar(p, u, t1, t2):
    A1 = t1[None] * (3*(1-u)**2*u)[:, None]; A2 = t2[None] * (3*(1-u)*u**2)[:, None]
    C = np.array([[(A1*A1).sum(), (A1*A2).sum()], [(A1*A2).sum(), (A2*A2).sum()]])
    tmp = p - bez(np.array([p[0], p[0], p[-1], p[-1]]), u)
    X = np.array([(A1*tmp).sum(), (A2*tmp).sum()])
    det = np.linalg.det(C); seg = np.linalg.norm(p[-1] - p[0])
    if abs(det) > 1e-12: a1, a2 = np.linalg.solve(C, X)
    else: a1 = a2 = seg / 3
    if a1 < seg * 1e-3 or a2 < seg * 1e-3: a1 = a2 = seg / 3
    return np.array([p[0], p[0] + t1 * a1, p[-1] + t2 * a2, p[-1]])
def reparam(c, p, u):
    q = bez(c, u) - p; d1 = bez1(c, u); d2 = bez2(c, u)
    num = (q * d1).sum(1); den = (d1 * d1).sum(1) + (q * d2).sum(1)
    return np.clip(u - np.where(np.abs(den) > 1e-9, num / den, 0), 0, 1)
def ajustar(p, t1, t2, err):
    if len(p) == 2:
        d = np.linalg.norm(p[1] - p[0]) / 3; return [np.array([p[0], p[0] + t1 * d, p[1] + t2 * d, p[1]])]
    u = param(p); c = generar(p, u, t1, t2)
    for _ in range(6):
        e = np.linalg.norm(bez(c, u) - p, axis=1)
        if e.max() < err: return [c]
        u = reparam(c, p, u); c = generar(p, u, t1, t2)
    e = np.linalg.norm(bez(c, u) - p, axis=1)
    if e.max() < err: return [c]
    i = int(np.clip(np.argmax(e), 2, len(p) - 3)); tc = unir(p[i - 2] - p[i + 2])
    return ajustar(p[:i + 1], t1, tc, err) + ajustar(p[i:], -tc, t2, err)

def tangente(p, ini, k):   # dirección del tramo en su extremo, con k puntos de muestra
    k = min(k, len(p) - 1)
    return unir(p[k] - p[0]) if ini else unir(p[-1 - k] - p[-1])

def circuito(x, y):
    """La zona del circuito (las tres líneas y la base): ahí las rectas son rectas. Las plumas y el
    cuello son curvas de punta a punta y no se parten en rectas aunque un tramo parezca recto."""
    return x > 640 or y > 700 or (y > 686 and x > 440) or (x > 615 and y > 490)
LMIN = 22      # una recta tiene que medir al menos esto (px de la referencia) para contarse como recta
def desvio(q):
    a, b = q[0], q[-1]; L = np.linalg.norm(b - a); e = q - a
    return (np.abs((b - a)[0] * e[:, 1] - (b - a)[1] * e[:, 0]) / L).max() if L > 0 else 0
def partir(seg):
    """Parte un tramo en rectas (lo que se aparta menos de TOL por al menos LMIN) y curvas (lo demás)."""
    n = len(seg); largo = np.r_[0, np.cumsum(np.linalg.norm(np.diff(seg, axis=0), axis=1))]
    piezas, i, cur = [], 0, 0
    while i < n - 1:
        j = i + 1                                     # la recta más larga que arranca en i
        paso = 8
        while j + paso < n and desvio(seg[i:j + paso + 1]) < TOL: j += paso
        while j + 1 < n and desvio(seg[i:j + 2]) < TOL: j += 1
        mx, my = seg[(i + j) // 2]
        if largo[j] - largo[i] >= LMIN and circuito(mx, my):
            if i > cur: piezas.append(('C', seg[cur:i + 1]))
            piezas.append(('L', seg[i:j + 1])); i = cur = j
        else: i += 1
    if cur < n - 1: piezas.append(('C', seg[cur:]))
    return piezas

def ajuste_recta(pts, ang=None):
    """Recta por mínimos cuadrados; con ang fijo (grados) sólo se busca dónde pasa."""
    c = pts.mean(0)
    if ang is None:
        _, _, vt = np.linalg.svd(pts - c, full_matrices=False); d = vt[0]
    else: d = np.array([np.cos(np.radians(ang)), -np.sin(np.radians(ang))])
    return c, d / np.linalg.norm(d)
def cruce(c1, d1, c2, d2):
    A = np.array([d1, -d2]).T
    if abs(np.linalg.det(A)) < 1e-6: return None
    t = np.linalg.solve(A, c2 - c1); return c1 + d1 * t[0]
def proyectar(c, d, p): return c + d * ((p - c) @ d)
SNAP = 5       # grados: una recta del circuito a menos de esto de 0°, 45°, 90° o 135° se endereza

def trazo(c):
    p = c[:, 0, :].astype(float) / E; n = len(p)
    cs = esquinas(p * E, int(5 * E))
    if len(cs) < 2: cs = [0, n // 2]
    piezas = []
    for j, i0 in enumerate(cs):
        i1 = cs[(j + 1) % len(cs)]
        seg = p[np.arange(i0, i1 + (n if i1 <= i0 else 0) + 1) % n]
        if len(seg) > 16 and SIG > 0:
            k = 8; ext = np.concatenate([2 * seg[0] - seg[1:k + 1][::-1], seg, 2 * seg[-1] - seg[-k - 1:-1][::-1]])
            sm = np.stack([gaussian_filter1d(ext[:, 0], SIG * E, mode='nearest'), gaussian_filter1d(ext[:, 1], SIG * E, mode='nearest')], 1)[k:-k]
            w = np.clip(np.minimum(np.arange(len(seg)), np.arange(len(seg))[::-1]) / (SIG * E * 1.5), 0, 1)[:, None]
            seg = seg * (1 - w) + sm * w
        piezas += [[t, q] for t, q in partir(seg[::2])]
    # 1 · rectas seguidas que en realidad son una, y las curvitas que redondean una esquina del circuito
    def dirx(q): return ajuste_recta(q)[1]
    def angulo(a, b): return np.degrees(np.arccos(min(1, abs(dirx(a) @ dirx(b)))))
    def largo(q): return np.linalg.norm(np.diff(q, axis=0), axis=1).sum()
    cambio = True
    while cambio and len(piezas) > 2:
        cambio = False
        for k in range(len(piezas)):
            N = len(piezas); a, b, cc = piezas[k], piezas[(k + 1) % N], piezas[(k + 2) % N]
            if a[0] == 'L' and b[0] == 'L' and (angulo(a[1], b[1]) < 4 or desvio(np.concatenate([a[1], b[1]])) < TOL * 2):
                a[1] = np.concatenate([a[1], b[1]]); piezas.pop((k + 1) % N); cambio = True; break
            if a[0] == 'L' and b[0] == 'C' and cc[0] == 'L' and largo(b[1]) < 30 and N > 3:
                if angulo(a[1], cc[1]) < 4: a[1] = np.concatenate([a[1], b[1], cc[1]]); quitar = [(k + 1) % N, (k + 2) % N]
                else: quitar = [(k + 1) % N]              # la esquina queda donde se cruzan las dos rectas
                for x in sorted(quitar, reverse=True): piezas.pop(x)
                cambio = True; break
    # 2 · cada recta, enderezada si casi va a 0/45/90/135
    rect = {}
    for k, (t, q) in enumerate(piezas):
        if t != 'L': continue
        c0, d0 = ajuste_recta(q); ang = np.degrees(np.arctan2(-d0[1], d0[0])) % 180
        cerca = min([0, 45, 90, 135, 180], key=lambda a: abs(a - ang))
        rect[k] = ajuste_recta(q, cerca % 180) if abs(cerca - ang) < SNAP else (c0, d0)
    # 3 · los extremos: donde se cruzan dos rectas seguidas; si no, se proyectan
    N = len(piezas); pts = [None] * N        # pts[k] = punto donde termina la pieza k (y empieza la k+1)
    for k in range(N):
        a, b = k, (k + 1) % N; fin = piezas[a][1][-1]
        if a in rect and b in rect:
            x = cruce(*rect[a], *rect[b]); pts[k] = x if x is not None and np.linalg.norm(x - fin) < 30 else fin
        elif a in rect: pts[k] = proyectar(*rect[a], fin)
        elif b in rect: pts[k] = proyectar(*rect[b], fin)
        else: pts[k] = fin
    d = f'M{pts[-1][0]:.2f} {pts[-1][1]:.2f}'
    for k, (t, q) in enumerate(piezas):
        ini, fin = pts[k - 1], pts[k]
        if t == 'L': d += f' L{fin[0]:.2f} {fin[1]:.2f}'; continue
        # los extremos se movieron a la recta de al lado: el cambio se reparte en los primeros y
        # últimos px de la curva, en vez de doblarla de golpe (eso hacía las muescas)
        q = q.copy(); arco = np.r_[0, np.cumsum(np.linalg.norm(np.diff(q, axis=0), axis=1))]
        Ls = min(10, arco[-1] / 2)
        w0 = np.clip(1 - arco / Ls, 0, 1)[:, None]; w1 = np.clip(1 - (arco[-1] - arco) / Ls, 0, 1)[:, None]
        q = q + (ini - q[0]) * w0 + (fin - q[-1]) * w1
        # la curva sigue a la recta de al lado sólo si de verdad llega pareja; si llega en ángulo, es esquina
        t1, t2 = tangente(q, True, 14), tangente(q, False, 14)
        for lado, vec, kk in ((0, t1, (k - 1) % N), (1, t2, (k + 1) % N)):
            if kk in rect:
                dr = rect[kk][1] * (1 if rect[kk][1] @ vec > 0 else -1)
                if dr @ vec > np.cos(np.radians(20)):
                    if lado == 0: t1 = dr
                    else: t2 = dr
        for z in ajustar(q, t1, t2, ERR):
            d += f' C{z[1][0]:.2f} {z[1][1]:.2f} {z[2][0]:.2f} {z[2][1]:.2f} {z[3][0]:.2f} {z[3][1]:.2f}'
    return d + ' Z'

cont, jer = cv2.findContours(M, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_NONE)
ds = [trazo(c) for c in cont if cv2.contourArea(c) > 20 * E * E]
aros = ''.join(f'<circle cx="{cx}" cy="{cy}" r="{(ri + ro) / 2:.2f}" fill="none" stroke="currentColor" stroke-width="{ro - ri:.2f}"/>' for (cx, cy), ri, ro in ARO)
svg = f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}" fill="currentColor"><path fill-rule="evenodd" d="{" ".join(ds)}"/>{aros}</svg>\n'
open('ala.svg', 'w').write(svg)
subprocess.run(['node', 'pintar.mjs', 'ala.svg', TMP + 'ala-r.png', str(W), str(H)], check=True)
r = cv2.imread(TMP + 'ala-r.png', 0) < 128; o = ref < 128
print(f'ERR {ERR} TOL {TOL} · distintos {(r ^ o).sum()} ({100 * (r ^ o).sum() / o.sum():.2f} % de la tinta) · IoU {(r & o).sum() / (r | o).sum():.4f} · rectas {svg.count(" L")} · curvas {svg.count(" C")}')
