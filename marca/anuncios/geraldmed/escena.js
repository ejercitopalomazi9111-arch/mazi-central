/* LOS ANUNCIOS DE GERALDMED (Carlos, 4 nov: «4 videos publicitarios para GERALDMED, somos paramédicos…
   cubrir eventos con pie tierra, ambulancia de urgencias básicas… no muestres otros logos»).
   Cada anuncio es una lista de tomas (fotos con movimiento lento de cámara) y de títulos, amarrados a los
   renglones del guion; esto los pinta. Fotos: las de Carlos ya sin logos ajenos (preparar.py) y unas de
   Unsplash (web/FUENTES.txt). Colores y letra, los de su camioneta: azul marino, menta y blanco.
     node herramientas/video/armar.mjs marca/anuncios/geraldmed/<anuncio>/index.html marca/anuncios/salida/<anuncio>.mp4 */
import { W, H, tramo, suave, sale, entra, mezcla, vida, resorte, guion, sonidosVoz, subtitulos, grano } from '../motor.js';
const $ = (s) => document.querySelector(s);
const cargar = async (src) => { const i = new Image(); i.src = src; await i.decode(); return i; };
export const CEL = { telefonos: ['442 394 2306', '427 108 0226'] };

export async function anuncio({ tomas, titulos, musica, cierre = 'Atención médica de emergencia', remate = 'Cotiza la cobertura de tu evento' }){
  const G = await guion('.'), L = (id) => G.de(id), ult = G.lineas.at(-1);
  const FIN = ult.t1 + 3.2, fx = (n) => `../../../../herramientas/video/efectos/${n}.wav`;
  const T0 = (id) => typeof id === 'number' ? id : L(id).t0;
  /* cuándo empieza cada toma: el renglón que la abre, un poco antes; acaba donde empieza la siguiente */
  const ts = tomas.map((k, i) => ({ ...k, a: Math.max(0, T0(k.desde) + (k.antes ?? -.25)) }));
  ts.forEach((k, i) => { k.b = i < ts.length - 1 ? ts[i + 1].a + .45 : ult.t0 + .2; });
  const fotos = {}; await Promise.all([...new Set(ts.map(k => k.foto))].map(async f => { fotos[f] = await cargar(f.includes('/') ? f : `../fotos/${f}.jpg`); }));
  const estrella = await cargar('../marca/estrella.png'), pulso = await cargar('../marca/pulso.png');
  await document.fonts.load('italic 900 120px "Exo 2"'); await document.fonts.load('800 60px "Inter Tight"');

  window.VIDEO = { w: W, h: H, fps: 30, dur: FIN, musica: { archivo: `/tmp/claude-0/musica/${musica}.mp3`, desde: 0, vol: .28, entrada: .3, fin: 2.2 },
    sonidos: [...sonidosVoz(G, 1.15), ...ts.slice(1).map(k => [fx('whoosh'), k.a - .1, .3]), [fx('subida'), ult.t0 + .1, .4]] };

  const cv = $('#foto'), x = cv.getContext('2d'), c2 = $('#c2').getContext('2d');
  const sub = subtitulos($('#subs'), G), gr = grano($('#grano'), .05);
  const poner = (el, html) => { if(el.dataset.h !== html){ el.innerHTML = html; el.dataset.h = html; } };
  const tits = titulos.map((z, i) => ({ ...z, a: T0(z.desde) - .15, b: titulos[i + 1] ? T0(titulos[i + 1].desde) - .2 : ult.t0 - .1 }));

  /* una foto que llena la pantalla, con su encuadre (cx, cy en 0-1 de la foto; z = acercamiento) */
  const dibuja = (img, cx, cy, z, alfa) => {
    const e = Math.max(W / img.width, H / img.height) * z, w = img.width * e, h = img.height * e;
    const px = Math.min(0, Math.max(W - w, W / 2 - cx * w)), py = Math.min(0, Math.max(H - h, H / 2 - cy * h));
    x.globalAlpha = alfa; x.drawImage(img, px, py, w, h); x.globalAlpha = 1;
  };
  /* la camioneta (una tira ancha): va como banda sobre el azul, cruzando despacio */
  const banda = (img, u, alfa) => {
    const w = 1900, h = w * img.height / img.width, px = mezcla(60, W - w - 60, u), py = 700;
    x.globalAlpha = alfa; x.fillStyle = '#0B1630'; x.fillRect(0, 0, W, H);
    x.save(); x.shadowColor = '#000a'; x.shadowBlur = 60; x.shadowOffsetY = 30; x.drawImage(img, px, py, w, h); x.restore(); x.globalAlpha = 1;
  };

  window.pintar = async (t) => {
    x.clearRect(0, 0, W, H);
    for(const k of ts){
      if(t < k.a || t > k.b) continue;
      const u = tramo(t, k.a, k.b), alfa = k === ts[0] ? 1 : sale(tramo(t, k.a, k.a + .45)), [c0, c1] = [k.de || [.5, .5, 1.04], k.hacia || [.5, .5, 1.14]];
      if(k.tipo === 'banda') banda(fotos[k.foto], suave(u), alfa);
      else dibuja(fotos[k.foto], mezcla(c0[0], c1[0], u), mezcla(c0[1], c1[1], u), mezcla(c0[2], c1[2], u), alfa);
    }
    /* el título de cada renglón: palabras grandes que suben una por una */
    const tt = tits.find(z => t >= z.a && t < z.b);
    poner($('#titulo'), tt ? tt.html : ''); $('#titulo').style.opacity = tt ? vida(t, tt.a, tt.b, .25, .25) : 0;
    $('#titulo').style.top = (tt?.abajo ? 980 : 250) + 'px';
    if(tt) [...$('#titulo').children].forEach((s, i) => { const v = sale(tramo(t, tt.a + i * .09, tt.a + .4 + i * .09)); s.style.transform = `translateY(${(1 - v) * 70}px) skewX(-6deg)`; s.style.opacity = v; });
    $('#velo').style.opacity = 1;
    /* la línea del pulso de su logo, que se dibuja al empezar */
    c2.clearRect(0, 0, W, H);
    const ip = tramo(t, .05, .9), op = 1 - tramo(t, 1.6, 2.1);
    if(ip > 0 && op > 0){ const w = 980, h = w * pulso.height / pulso.width, y0 = 720; c2.save(); c2.globalAlpha = op; c2.beginPath(); c2.rect(50, y0 - 20, w * sale(ip), h + 40); c2.clip(); c2.drawImage(pulso, 50, y0, w, h); c2.restore(); }
    /* el cierre: azul marino, la estrella entra con resorte, el nombre y los teléfonos */
    const ac = ult.t0 - .1, uc = tramo(t, ac, ac + .5);
    $('#cierre').style.opacity = uc; $('#tapa').style.opacity = suave(uc);
    if(uc > 0){
      const r = resorte(tramo(t, ac + .1, ac + 1)), s = 560 * r;
      c2.save(); c2.translate(W / 2, 640); c2.rotate((1 - r) * -.4); c2.drawImage(estrella, -s / 2, -s / 2, s, s); c2.restore();
      [...$('#cierre').children].forEach((el, i) => { const v = sale(tramo(t, ac + .45 + i * .12, ac + .85 + i * .12)); el.style.opacity = v; el.style.transform = `translateY(${(1 - v) * 40}px)`; });
    }
    sub(t); gr(t);
  };
  poner($('#cierre'), `<div class="nom">GERALDMED</div><div class="lema">— ${cierre} —</div><div class="tel">${CEL.telefonos.map(n => `<b>${n}</b>`).join('')}</div><div class="rem">${remate}</div>`);
  await window.pintar(0); window._listo();
}
