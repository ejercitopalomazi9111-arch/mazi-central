/* EL PIETAJE: video real (cuadros sueltos a 30 por segundo, de preparar.py) pintado en un lienzo 2D, cubriendo
   el cuadro, con acercamiento, corrimiento, desenfoque y oscurecido. Cuadro exacto por tiempo: nada de <video>,
   que no se puede pedir «el cuadro del segundo 3.4» y esperar a que esté. */
const pad = (n) => String(n).padStart(5, '0');
export async function indice(dir){ return (await (await fetch(dir + 'indice.json')).json()); }
export class Pietaje {
  constructor(dir, n){ this.dir = dir; this.n = n; this.i = -1; this.img = null; }
  async en(t){ const i = Math.max(0, Math.min(this.n - 1, Math.floor(t * 30))); if(i === this.i) return; this.i = i;
    const im = new Image(); im.src = this.dir + pad(i + 1) + '.jpg'; await im.decode(); this.img = im; }
  pintar(x, { zoom = 1, dx = 0, dy = 0, alfa = 1, filtro = 'none', W = 1080, H = 1920 } = {}){
    if(!this.img || alfa <= 0) return; const im = this.img, k = Math.max(W / im.width, H / im.height) * zoom, w = im.width * k, h = im.height * k;
    x.save(); x.globalAlpha = alfa; x.filter = filtro; x.drawImage(im, (W - w) / 2 + dx, (H - h) / 2 + dy, w, h); x.restore(); }
}
