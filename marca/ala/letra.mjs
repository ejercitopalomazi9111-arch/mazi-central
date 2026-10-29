/* ¿Con qué letra está escrito «GRUPO MAZI» en la referencia? Escribe la palabra con cada candidata,
   la ajusta al alto y al ancho de la referencia (tamaño y espaciado) y cuenta los pixeles que coinciden.
   node letra.mjs mazi|grupo */
import { createRequire } from 'module'; import fs from 'fs';
const require = createRequire('/opt/node22/lib/node_modules/'); const { chromium } = require('playwright');
import { red } from '../../herramientas/video/red.mjs';
const palabra = process.argv[2] || 'mazi', TXT = palabra.toUpperCase();
const CAND = (process.env.CAND || 'Montserrat:500,600,700,800|Poppins:500,600,700|Raleway:600,700,800|Lato:700,900|Nunito Sans:700,800|Figtree:600,700|Plus Jakarta Sans:600,700|Manrope:600,700|Urbanist:600,700|Outfit:500,600|Lexend:500,600|Red Hat Display:600,700|Mulish:700,800|Josefin Sans:600,700|Questrial:400|Jost:500,600|Gotham:700|Hanken Grotesk:600,700|Sora:600|Albert Sans:600,700|Work Sans:600,700|Kumbh Sans:600,700|League Spartan:500,600|Archivo:600,700|Inter:600,700')
  .split('|').map(x => { const [f, w] = x.split(':'); return w.split(',').map(p => [f, +p]); }).flat();
const br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const ctx = await br.newContext(); await red(ctx); const pg = await ctx.newPage();
const fams = [...new Set(CAND.map(c => c[0]))];
await pg.setContent(`<html><head>${fams.map(f => `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=${f.replace(/ /g, '+')}:wght@400;500;600;700;800;900&display=block">`).join('')}</head><body></body></html>`, { waitUntil: 'networkidle' });
const ref = 'data:image/png;base64,' + fs.readFileSync(`ref-${palabra}.png`).toString('base64');
const res = await pg.evaluate(async ({ ref, CAND, TXT }) => {
  for(const [f, w] of CAND) await document.fonts.load(`${w} 100px "${f}"`, TXT);
  const im = new Image(); im.src = ref; await im.decode();
  const W = im.width, H = im.height, c = new OffscreenCanvas(W, H), x = c.getContext('2d', { willReadFrequently: true });
  x.drawImage(im, 0, 0); const R = x.getImageData(0, 0, W, H).data; const umbral = TXT === 'GRUPO' ? 170 : 128;
  const bbox = (d) => { let a = 1e9, b = 1e9, cc = -1, e = -1; for(let i = 0; i < W * H; i++) if(d[i]) { const px = i % W, py = (i / W) | 0; a = Math.min(a, px); b = Math.min(b, py); cc = Math.max(cc, px); e = Math.max(e, py); } return [a, b, cc, e]; };
  const r = new Uint8Array(W * H); for(let i = 0; i < W * H; i++) r[i] = R[i * 4] < umbral ? 1 : 0;
  const [rx0, ry0, rx1, ry1] = bbox(r);
  const pintar = (f, w, fs, ls) => { const k = new OffscreenCanvas(W * 2, H * 2), y = k.getContext('2d', { willReadFrequently: true });
    y.fillStyle = '#fff'; y.fillRect(0, 0, W * 2, H * 2); y.fillStyle = '#000'; y.font = `${w} ${fs}px "${f}"`; y.letterSpacing = ls + 'px'; y.textBaseline = 'alphabetic'; y.fillText(TXT, 10, H * 1.5); return [k, y]; };
  const medir = (f, w, fs, ls) => { const [k, y] = pintar(f, w, fs, ls); const d = y.getImageData(0, 0, W * 2, H * 2).data; let a = 1e9, b = 1e9, cc = -1, e = -1;
    for(let i = 0; i < W * H * 4; i++) if(d[i * 4] < 128) { const px = i % (W * 2), py = (i / (W * 2)) | 0; a = Math.min(a, px); b = Math.min(b, py); cc = Math.max(cc, px); e = Math.max(e, py); } return [a, b, cc, e, k]; };
  const out = [];
  for(const [f, w] of CAND){
    if(!document.fonts.check(`${w} 100px "${f}"`, TXT)) { out.push([f, w, -1]); continue; }
    let [a, b, cc, e] = medir(f, w, 100, 0); const fs = 100 * (ry1 - ry0) / (e - b);
    let [a1, , c1] = medir(f, w, fs, 0); const ls = ((rx1 - rx0) - (c1 - a1)) / (TXT.length - 1);
    const [a2, b2, c2, e2, k] = medir(f, w, fs, ls);
    const z = new OffscreenCanvas(W, H), zy = z.getContext('2d', { willReadFrequently: true }); zy.fillStyle = '#fff'; zy.fillRect(0, 0, W, H);
    zy.drawImage(k, a2, b2, c2 - a2 + 1, e2 - b2 + 1, rx0, ry0, rx1 - rx0 + 1, ry1 - ry0 + 1);
    const d = zy.getImageData(0, 0, W, H).data; let I = 0, U = 0;
    for(let i = 0; i < W * H; i++){ const p = d[i * 4] < 128, q = r[i] === 1; if(p && q) I++; if(p || q) U++; }
    out.push([f, w, +(I / U).toFixed(4), +fs.toFixed(1), +ls.toFixed(1)]);
  }
  return out;
}, { ref, CAND, TXT });
res.sort((a, b) => b[2] - a[2]); for(const r of res.slice(0, 12)) console.log(r.join(' · ')); console.log('no cargaron:', res.filter(r => r[2] < 0).map(r => r[0]).join(', '));
await br.close();
