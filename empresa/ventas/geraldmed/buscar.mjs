/* buscar.mjs — prospectos para GERALDMED (paramédicos para eventos) desde Google Maps, en Querétaro.
 * node empresa/ventas/geraldmed/buscar.mjs SALIDA.jsonl
 * Por cada búsqueda baja la lista de lugares y luego abre cada uno para leer teléfono, dirección y página.
 * Los datos de negocios van a /tmp o a clientes/ (ignorado por git): son de Maps, no se publican. */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { appendFileSync, existsSync, readFileSync } from 'node:fs';

const SALIDA = process.argv[2] || '/tmp/claude-0/gm/geraldmed.jsonl';
export const BUSQUEDAS = [
  ['salón de eventos', 'Salones y jardines'], ['jardín para eventos', 'Salones y jardines'], ['salón de fiestas infantiles', 'Salones y jardines'],
  ['hacienda para bodas', 'Salones y jardines'], ['quinta para eventos', 'Salones y jardines'], ['terraza para eventos', 'Salones y jardines'],
  ['organizador de eventos', 'Organizadores'], ['wedding planner', 'Organizadores'], ['banquetes', 'Organizadores'], ['producción de eventos', 'Organizadores'],
  ['renta de mobiliario para eventos', 'Organizadores'], ['agencia de eventos corporativos', 'Organizadores'],
  ['centro de convenciones', 'Foros y espectáculos'], ['auditorio', 'Foros y espectáculos'], ['foro de conciertos', 'Foros y espectáculos'],
  ['bar con música en vivo', 'Foros y espectáculos'], ['antro', 'Foros y espectáculos'], ['palenque', 'Foros y espectáculos'], ['lienzo charro', 'Foros y espectáculos'],
  ['unidad deportiva', 'Deporte'], ['liga de futbol', 'Deporte'], ['club deportivo', 'Deporte'], ['academia de futbol', 'Deporte'],
  ['gimnasio crossfit', 'Deporte'], ['gimnasio de box', 'Deporte'], ['club de corredores', 'Deporte'], ['escuela de natación', 'Deporte'], ['arena deportiva', 'Deporte'],
  ['colegio privado', 'Escuelas'], ['universidad', 'Escuelas'], ['preparatoria privada', 'Escuelas'],
  ['parque industrial', 'Empresas (cursos)'], ['empresa constructora', 'Empresas (cursos)'], ['empresa de transporte de carga', 'Empresas (cursos)'], ['seguridad privada', 'Empresas (cursos)'],
  ['balneario', 'Turismo y recreación'], ['parque de diversiones', 'Turismo y recreación'], ['campamento', 'Turismo y recreación'], ['centro comercial', 'Turismo y recreación'],
];
const ZONAS = ['Querétaro', 'Corregidora Querétaro', 'El Marqués Querétaro'];

/* lo ya buscado no se repite si se reinicia a la mitad */
const HECHAS = SALIDA + '.hechas';
const hechas = new Set(existsSync(HECHAS) ? readFileSync(HECHAS, 'utf8').split('\n').filter(Boolean) : []);
const vistos = new Set(existsSync(SALIDA) ? readFileSync(SALIDA, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l).id) : []);
const b = await chromium.launch({ proxy: { server: process.env.HTTPS_PROXY }, args: ['--lang=es-MX'] });
const ctx = await b.newContext({ locale: 'es-MX', userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36', viewport: { width: 1280, height: 900 } });
await ctx.route(/\.(png|jpg|jpeg|webp|gif|woff2?)(\?|$)/, (r) => r.abort());
const p = await ctx.newPage(), ficha = await ctx.newPage();
const idDe = (u) => (u.match(/!1s(0x[0-9a-f]+:0x[0-9a-f]+)/) || [])[1];
let n = 0;
for(const [q, giro] of BUSQUEDAS) for(const zona of ZONAS){
  if(hechas.has(q + '|' + zona)) continue;
  try{
    await p.goto(`https://www.google.com/maps/search/${encodeURIComponent(q + ' en ' + zona)}?hl=es`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await p.waitForSelector('div[role="feed"]', { timeout: 15000 }).catch(() => {});
    for(let k = 0; k < 8; k++){ await p.evaluate(() => { const f = document.querySelector('div[role="feed"]'); if(f) f.scrollTop = f.scrollHeight; }); await p.waitForTimeout(1300); }
    const lugares = await p.$$eval('a[href*="/maps/place/"]', (xs) => xs.map((a) => ({ url: a.href, nombre: a.getAttribute('aria-label') || '' })));
    for(const l of lugares){
      const id = idDe(l.url); if(!id || vistos.has(id)) continue; vistos.add(id);
      try{
        await ficha.goto(l.url + (l.url.includes('?') ? '&' : '?') + 'hl=es', { waitUntil: 'domcontentloaded', timeout: 45000 });
        await ficha.waitForSelector('h1', { timeout: 12000 });
        await ficha.waitForTimeout(900);
        const d = await ficha.evaluate(() => {
          const t = (s) => document.querySelector(s)?.getAttribute('aria-label') || '';
          const tel = document.querySelector('[data-item-id^="phone:tel:"]')?.getAttribute('data-item-id')?.replace('phone:tel:', '') || '';
          const web = document.querySelector('a[data-item-id="authority"]')?.href || '';
          const dir = (t('[data-item-id="address"]') || '').replace(/^Dirección:\s*/, '');
          const cat = document.querySelector('button[jsaction*="category"]')?.textContent || '';
          const est = document.querySelector('div.F7nice span[aria-hidden="true"]')?.textContent || '';
          const res = (document.querySelector('div.F7nice span[aria-label*="reseña"]')?.getAttribute('aria-label') || '').replace(/\D/g, '');
          return { nombre: document.querySelector('h1')?.textContent || '', tel, web, dir, cat, est, res: +res || 0 };
        });
        const fila = { id, busqueda: q, zona, giro, nombre: d.nombre || l.nombre, categoria: d.cat, estrellas: d.est, resenas: d.res, telefono: d.tel, web: d.web, direccion: d.dir, mapa: l.url.split('?')[0] };
        appendFileSync(SALIDA, JSON.stringify(fila) + '\n'); n++;
      }catch(e){ /* un lugar que no abre no detiene la búsqueda */ }
    }
    appendFileSync(HECHAS, q + '|' + zona + '\n');
    console.log(new Date().toISOString().slice(11, 19), q, '·', zona, '·', lugares.length, 'en la lista ·', n, 'guardados');
  }catch(e){ console.log('falló', q, zona, e.message.slice(0, 80)); }
}
await b.close();
console.log('LISTO', n);
