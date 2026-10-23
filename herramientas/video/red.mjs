/* LA RED DE LAS GRABACIONES. El Chromium de este contenedor no sale a internet,
   y las webs piden su letra a Google Fonts (y alguna librería a un CDN): sin
   eso se graban con la letra del sistema y el video miente. Cada archivo de
   fuera se baja UNA vez con curl (que sí pasa por el proxy) a una caché y se
   le entrega al navegador desde ahí.  */
import fs from 'fs'; import path from 'path'; import crypto from 'crypto'; import { execFileSync } from 'child_process';
const CACHE = path.join(path.dirname(new URL(import.meta.url).pathname), '.cache-red');
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';
const TIPOS = { css: 'text/css', woff2: 'font/woff2', woff: 'font/woff', ttf: 'font/ttf', js: 'application/javascript' };
export async function red(ctx){
  fs.mkdirSync(CACHE, { recursive: true });
  await ctx.route(/^https:\/\/(fonts\.googleapis\.com|fonts\.gstatic\.com|cdnjs\.cloudflare\.com|cdn\.jsdelivr\.net|unpkg\.com)\//, async (r) => {
    const url = r.request().url(), f = path.join(CACHE, crypto.createHash('sha1').update(url).digest('hex'));
    try{
      if(!fs.existsSync(f)) execFileSync('curl', ['-sfL', '-A', UA, '-o', f, url], { timeout: 30000 });
      const ext = /fonts\.googleapis/.test(url) ? 'css' : (url.split('?')[0].split('.').pop() || '');
      await r.fulfill({ path: f, contentType: TIPOS[ext] || 'application/octet-stream', headers: { 'access-control-allow-origin': '*' } });
    }catch(e){ await r.abort(); }
  });
  /* WhatsApp y llamadas: en la grabación sólo se ve el toque, no se sale de la página */
  await ctx.route(/^https:\/\/(wa\.me|api\.whatsapp\.com)\//, r => r.abort());
}
