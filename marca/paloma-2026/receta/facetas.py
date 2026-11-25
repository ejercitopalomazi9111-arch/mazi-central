# Uso: python3 facetas.py entrada.png salida.json escala umbral cerrar_bordes(0/1) recorte_y_max
import cv2, numpy as np, sys, json
src, out, esc, umb, borde, ymax = sys.argv[1], sys.argv[2], float(sys.argv[3]), float(sys.argv[4]), int(sys.argv[5]), int(sys.argv[6])
im = cv2.imread(src, cv2.IMREAD_GRAYSCALE)
im = cv2.resize(im, None, fx=esc, fy=esc, interpolation=cv2.INTER_CUBIC).astype(np.float32)
bg = cv2.GaussianBlur(cv2.dilate(im, np.ones((int(15*esc),)*2)), (0,0), 25*esc)
r = im / np.maximum(bg, 1)
linea = (r < umb).astype(np.uint8)
if ymax > 0: linea[int(ymax*esc):, :] = 1
for (x0,y0,x1,y1) in [(670,1580,1120,1700),(50,1580,185,1700)]:
    linea[int(y0*esc):int(y1*esc), int(x0*esc):int(x1*esc)] = 1
linea[-2:, :] = 1
if borde:
    linea[:, :2] = 1; linea[:, -2:] = 1
k = max(2, int(round(1.5*esc)))
l2 = cv2.dilate(linea, np.ones((k,k), np.uint8))
n, lab, st, cen = cv2.connectedComponentsWithStats(1 - l2, connectivity=4)
H, W = lab.shape
fondo = set(np.unique(np.concatenate([lab[0], lab[-1]]))) | (set() if borde else set(np.unique(np.concatenate([lab[:,0], lab[:,-1]]))))
caras = []
for i in range(1, n):
    if i in fondo or st[i,4] < 50*esc*esc: continue
    m = (lab == i).astype(np.uint8)
    m = cv2.dilate(m, np.ones((k,k), np.uint8))  # devuelve el grosor que se comió la dilatación
    cs, _ = cv2.findContours(m, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    c = max(cs, key=cv2.contourArea)
    p = cv2.approxPolyDP(c, 1.6*esc, True)[:,0,:] / esc
    caras.append({'id': i, 'area': float(st[i,4]/esc/esc), 'cx': float(cen[i][0]/esc), 'cy': float(cen[i][1]/esc), 'pts': p.round(1).tolist()})
json.dump({'W': W/esc, 'H': H/esc, 'caras': caras}, open(out, 'w'))
print(len(caras), 'caras')
