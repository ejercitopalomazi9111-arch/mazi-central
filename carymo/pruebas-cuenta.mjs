/* CARYMO de punta a punta, como una persona sin la llave de La Sala: crea su cuenta, arma un plan, lo comparte,
   y otra persona (otro teléfono) lo agrega con el link. El servidor es el DE VERDAD (index.js + sala.js +
   comunidad.js con SQLite), corriendo en Node; sólo la IA es de mentiras.
   node carymo/pruebas-cuenta.mjs            (FOTOS=carpeta para capturas) */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import worker from '../sala/servidor/index.js';
import { Sala } from '../sala/servidor/sala.js';
import { manejar, ESQUEMA } from '../sala/servidor/comunidad.js';

const raiz = fileURLToPath(new URL('..', import.meta.url));
let f = 0, n = 0; const ok = (c, t) => { n++; console.log((c ? '  ✓ ' : '  ✗ ') + t); if(!c) f++; };

/* el servidor: la sala GRUPAZ y la comunidad, de verdad */
function ctx(){ const d = new Map(); return { storage: {
  async get(k){ if(Array.isArray(k)) return new Map(k.filter((x) => d.has(x)).map((x) => [x, structuredClone(d.get(x))])); const v = d.get(k); return v === undefined ? undefined : structuredClone(v); },
  async put(o, v){ if(typeof o === 'string'){ d.set(o, structuredClone(v)); return; } for(const k in o) d.set(k, structuredClone(o[k])); },
  async delete(k){ for(const x of [].concat(k)) d.delete(x); return true; }, async list({ prefix = '' } = {}){ return new Map([...d].filter(([k]) => k.startsWith(prefix)).sort()); },
  async deleteAll(){ d.clear(); }, async setAlarm(){}, async getAlarm(){ return null; } }, blockConcurrencyWhile: (fn) => fn(), waitUntil: () => {} }; }
const sala = new Sala(ctx(), { ESPERA_MS: 250, LLAVES: 'carlos:MAESTRA' });
const db = new DatabaseSync(':memory:'); db.exec(ESQUEMA); const q = (sql, ...v) => db.prepare(sql).all(...v);
const comunidad = { idFromName: () => 'inkwell', get: () => ({ fetch: (req) => manejar(q, req) }) };
let pedidosIA = 0;
/* la IA de mentiras: contesta un plan y una lección */
const iaFalsa = async (req) => {
  pedidosIA++;
  const c = await req.json();
  const plan = { titulo: 'Examen de Química', unidades: [{ titulo: 'Enlaces', temas: [{ titulo: 'Enlace iónico', resumen: 'Transferencia de electrones' }] }] };
  const leccion = { leccion: { titulo: 'Enlace iónico', ideas: [{ titulo: 'Qué es', texto: 'Un átomo le da electrones a otro.', icono: 'zap' }], dato: 'La sal de mesa es iónica.' },
    preguntas: [{ tipo: 'opcion', pregunta: '¿Qué pasa en un enlace iónico?', opciones: ['Se transfieren electrones', 'Se comparten', 'Nada', 'Se destruyen'], correcta: 0, porque: 'Uno da y otro recibe.' }] };
  return Response.json({ bien: true, motor: 'groq', texto: JSON.stringify(/PLANES DE ESTUDIO/.test(c.sistema) ? plan : leccion) });
};
const env = { COMUNIDAD: comunidad, ORIGENES: '', SALA: { idFromName: () => 'GRUPAZ', get: () => ({ fetch: async (req) => {
  const u = new URL(req.url);
  if(/ia-texto$/.test(u.pathname)) return iaFalsa(req);
  return sala.fetch(req);
} }) } };
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webp': 'image/webp', '.png': 'image/png', '.woff2': 'font/woff2', '.mp3': 'audio/mpeg', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json' };
const srv = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  if(url.pathname.startsWith('/api/')){
    const cuerpo = await new Promise((ok) => { const t = []; req.on('data', (x) => t.push(x)); req.on('end', () => ok(Buffer.concat(t))); });
    const r = await worker.fetch(new Request('http://sala.x' + req.url, { method: req.method, headers: req.headers, body: ['GET', 'HEAD'].includes(req.method) ? undefined : cuerpo }), env, { waitUntil(){} });
    res.writeHead(r.status, Object.fromEntries(r.headers)); res.end(Buffer.from(await r.arrayBuffer())); return;
  }
  let ruta = path.join(raiz, decodeURIComponent(url.pathname)); if(ruta.endsWith('/')) ruta += 'index.html';
  fs.readFile(ruta, (e, d) => { if(e){ res.writeHead(404); res.end(); return; } res.writeHead(200, { 'content-type': MIME[path.extname(ruta)] || 'application/octet-stream' }); res.end(d); });
});
await new Promise((ok) => srv.listen(0, '127.0.0.1', ok));
const base = `http://127.0.0.1:${srv.address().port}`;
env.ORIGENES = base;

const b = await chromium.launch();
const foto = async (pg, nombre) => { if(process.env.FOTOS) await pg.screenshot({ path: `${process.env.FOTOS}/${nombre}.png` }); };
async function telefono(){
  const c = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: process.env.FOTOS ? 2 : 1 });
  const pg = await c.newPage(); pg.errores = []; pg.on('pageerror', (e) => pg.errores.push(e.message));
  return pg;
}

console.log('Ana, sin la llave de La Sala');
const ana = await telefono();
await ana.goto(`${base}/carymo/?servidor=${encodeURIComponent(base)}`, { waitUntil: 'load' });
await ana.waitForSelector('#cajaLlave');
ok(/Crea tu cuenta gratis/.test(await ana.textContent('#cajaLlave')) && !/pega aquí/i.test(await ana.textContent('body')), 'ya no le pide la llave de La Sala: le ofrece crear su cuenta');
await foto(ana, '01-sin-cuenta');
await ana.click('#cajaLlave [data-cuenta="crear"]');
await ana.fill('#cNombre', 'Ana'); await ana.fill('#cUsuario', 'ana_q'); await ana.fill('#cClave', 'corta');
await ana.click('#cListo');
ok(await ana.isVisible('#cError') && /8 caracteres/.test(await ana.textContent('#cError')), 'una contraseña corta se avisa ahí mismo, sin regañar');
await ana.fill('#cClave', 'contrasena-segura');
await ana.click('#cListo');
await ana.waitForSelector('#codRec');
const rec = (await ana.textContent('#codRec')).replace(/\s/g, '');
ok(/^[A-Z0-9]{12}$/.test(rec), 'al crearla le da su código de recuperación (una sola vez)');
await foto(ana, '02-codigo');
await ana.click('#bYaRec');
ok(!(await ana.$('#cajaLlave')), 'con su cuenta, ya no sale el aviso');
ok(await ana.evaluate(() => !localStorage.getItem('salaLlave') && !!localStorage.getItem('carymo.token')), 'en su teléfono hay token de CARYMO y NINGUNA llave de La Sala');

console.log('Arma un plan con la IA (por la puerta de CARYMO)');
await ana.click('#bCrear');
await ana.click('[data-mat]'); await ana.click('[data-sig]');
await ana.click('[data-dias="7"]'); await ana.click('[data-sig]');
await ana.fill('#temaTxt', 'Enlace iónico'); await ana.press('#temaTxt', 'Enter');
await ana.click('[data-sig]');
await ana.waitForSelector('.camino', { timeout: 15000 });
ok(pedidosIA >= 1, 'la IA le armó el plan con su cuenta, sin llave');
await ana.waitForTimeout(1600);
const enServidor = await (await sala.fetch(new Request('https://interno/carymo/estudio', { headers: { 'X-Carymo-Usuario': 'ana_q' } }))).json();
ok(enServidor.planes.length === 1, 'y su plan quedó guardado en su cuenta');

console.log('Lo comparte');
await ana.click('#bMenuPlan'); await ana.click('[data-m="compartir"]');
await ana.waitForSelector('.codigo-rec.grande');
const codigo = (await ana.textContent('.codigo-rec.grande')).trim();
ok(/^[A-HJ-NP-Z2-9]{6}$/.test(codigo), `le sale un código de 6 letras para su grupo (${codigo})`);
await foto(ana, '03-compartir');

console.log('Beto lo agrega con el link, desde otro teléfono');
const beto = await telefono();
const iaAntes = pedidosIA;
await beto.goto(`${base}/carymo/?servidor=${encodeURIComponent(base)}&plan=${codigo}`, { waitUntil: 'load' });
await beto.waitForSelector('#fCuenta', { timeout: 6000 });
ok(true, 'sin cuenta, el link le pide crear una primero');
await beto.fill('#cNombre', 'Beto'); await beto.fill('#cUsuario', 'beto_q'); await beto.fill('#cClave', 'otra-contrasena');
await beto.click('#cListo'); await beto.waitForSelector('#bYaRec'); await beto.click('#bYaRec');
await beto.waitForSelector('.camino', { timeout: 8000 });
ok(/Química/.test(await beto.textContent('#planNombre')), 'y en cuanto entra, se le agrega el plan que le mandaron');
ok(pedidosIA === iaAntes, 'sin gastar IA');
await foto(beto, '04-beto');
const deBeto = await beto.evaluate(() => Object.values(window.__estudio.estado().planes)[0]);
ok(deBeto && Object.keys(deBeto.progreso || {}).length === 0 && Object.keys(deBeto.contenido || {}).length >= 0, 'empieza en cero: el avance de Ana no se le pasa');

console.log('Y con el código escrito a mano');
await beto.click('#bMenuPlan'); await beto.click('[data-m="anadir"]');
await beto.fill('#cCodPlan', codigo.toLowerCase()); await beto.click('#bTraer');
await beto.waitForTimeout(800);
ok(Object.keys(await beto.evaluate(() => window.__estudio.estado().planes)).length === 2, 'con las 6 letras (aunque sea en minúsculas) también se agrega');
await beto.click('#bMenuPlan'); await beto.click('[data-m="anadir"]');
await beto.fill('#cCodPlan', 'cualquier cosa'); await beto.click('#bTraer');
ok(await beto.isVisible('#cErrPlan'), 'algo que no es link ni código se avisa');

ok(!ana.errores.length && !beto.errores.length, 'cero errores' + ((ana.errores[0] || beto.errores[0]) ? ': ' + (ana.errores[0] || beto.errores[0]) : ''));
console.log(`\n${n - f} pasan · ${f} fallan`);
await b.close(); srv.close(); process.exit(f ? 1 : 0);
